'use strict';
// TODO: 
//  - audio only calls
//  - refactor and abstract UI logic

/**
 * @typedef {Object} PeerToPeer
 * @property {number} x - The X Coordinate
 * @property {number} y - The Y Coordinate
 */

/**
 * Creates object to handle Peer-To-Peer audio and video calls.
 * 
 * @param {Object} socket SocketIO socket or another object for communication with server supporting the same standart for 'on' and 'emit' methods
 * @param {Function} [onCallStart] Callback function that will be called when call starts. Id of calling/called user will be provided as first argument. 
 * @param {Function} [onClose] Callback function that will be called when call is closed.   
 * @param {RTCConfiguration} [webrtcConfig] RTCPeerConnection configuration. If not specified public stun and turn servers will be used.
 * @returns {PeerToPeer} object 
 */
function p2p(socket, onCallStart, onClose, webrtcConfig) {
    // https://gist.github.com/sagivo/3a4b2f2c7ac6e1b5267c2f1f59ac6c6b list of open stun/turn servers
    const rtcConfig = webrtcConfig || {
        iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            {
                urls: 'turn:numb.viagenie.ca',
                credential: 'muazkh',
                username: 'webrtc@live.com'
            }
        ]
    };

    let pc;
    let _stream;
    let isDescriptionSet = false;
    let config = {};

    registerSignaling();
    
    //-------------------------------------------------------------------------------------------------------
    // Methods

    function onError() {
        console.log(arguments);
    }

    function gotRemoteStream(ev) {
        setupVideoElement(ev.streams && ev.streams.length ? ev.streams[0] : ev.stream, 'remote-video');
    }

    /**
     * Closes the connection and cleans up ralated streams and html elements.
     * 
     * @access public
     * 
     * @param {bool} doNotEmit prevents signaling the other user to close the connection(for internal purposes when the request comes from other user)
     */
    function close(doNotEmit) {
        let wrapper = document.querySelector('.video-wrapper');
        if (wrapper) {
            wrapper.querySelector('.remote-video').srcObject = null;
            wrapper.querySelector('.local-video').srcObject = null;
            wrapper.parentElement.removeChild(wrapper);
        }

        if (pc) {
            pc.close();
            pc.onicecandidate = null;
            pc.ontrack = null;
            pc = null;
        }

        if (_stream) {
            _stream.getTracks().forEach(track => track.stop());
        }

        if (config && config.userId) {
            if (!doNotEmit) {
                socket.emit('webrtc', { type: 'close', userId: config.userId });
            }

            config = {};
        }

        if(onClose || typeof onClose === 'function'){
            onClose();
        }
    }

    /**
     * Setups RTCPeerConnection with specified user and initializes audio (and video) stream.
     * 
     * Setups the core behaviour of RTCPeerConnection, initializes the video wrapper and requests media streams from the browser. 
     * Once the returned {Promise} is resolved the signaling can begin. 
     * 
     * @access private
     * 
     * @param {string} userId unique identifier for user, will be used during signaling
     * @param {bool} isVideo specifies whether the call will include video or only audio
     * @returns {Promise} Promise that handles initialization of audio (and video) stream
     */
    function create(userId, isVideo) {
        if(onCallStart || typeof onCallStart === 'function'){
            onCallStart(userId);
        }

        pc = new RTCPeerConnection(rtcConfig);
        pc.ontrack = gotRemoteStream;
        config.userId = userId;
        config.isVideo = isVideo;

        createVideoWrapper();

        pc.onicecandidate = function (ev) {
            if (ev.candidate && isDescriptionSet) {
                socket.emit('webrtc', { type: 'addIceCandidate', userId, candidate: ev.candidate });
            }
        };

        return navigator.mediaDevices.getUserMedia({
            audio: true,
            video: isVideo
        }).then(function (stream) {
            _stream = stream;
            setupVideoElement(stream, 'local-video').muted = true;
            stream.getTracks().forEach(track => pc.addTrack(track, stream));
        });
    }

    /**
     * Registers the signaling for RTCPeerConnection
     * 
     * @access private
     */
    function registerSignaling() {
        socket.on('webrtc', function (data) {
            if (data.type === 'addIceCandidate') {
                pc.addIceCandidate(data.candidate);
            }

            if (data.type === 'setRemoteAnswer') {
                pc.setRemoteDescription(data.desc);
                isDescriptionSet = true;
                setupCallControlElement();
            }

            if (data.type === 'setRemoteDescription') {
                create(data.userId, data.isVideo).then(function () {
                    pc.setRemoteDescription(data.desc);
                    pc.createAnswer().then(function (desc) {
                        pc.setLocalDescription(desc);
                        isDescriptionSet = true;
                        setupCallControlElement();

                        socket.emit('webrtc', { type: 'setRemoteAnswer', userId: config.userId, desc });
                    }, onError);
                });
            }

            if (data.type === 'close') {
                close(true);
            }
        });
    }

    /**
     * Starts voice or video call with specified user.
     * 
     * @access public
     * 
     * @param {string} userId unique identifier for user, will be used during signaling
     * @param {bool} isVideo specifies whether the call will include video or only audio
     * @returns {Promise} resolves when the signaling has begin.
     */
    function startCall(userId, isVideo) {
        return create(userId, isVideo).then(function () {
            return pc.createOffer({ offerToReceiveAudio: 1, offerToReceiveVideo: config.isVideo ? 1 : 0 }).then(function (desc) {
                pc.setLocalDescription(desc);
                socket.emit('webrtc', { type: 'setRemoteDescription', userId: config.userId, isVideo: config.isVideo, desc });
            }, onError);
        });
    }

    //-------------------------------------------------------------------------------------------------------
    // UI logic
    function createVideoWrapper() {
        let videoWrapper = document.createElement('div');
        videoWrapper.classList += 'video-wrapper';
        document.querySelector('body').appendChild(videoWrapper);
    }

    /**
     * Initializes video element with provided stream and attaches it to the video wrapper.
     * 
     * @access private
     * 
     * @param {MediaStream} stream media stream to display
     * @param {string} cssClass css class to separate video elements ('remote-video', 'local-video')
     * @returns {HTMLElement} video element attached to the video wrapper and attached with the provided stream.
     */
    function setupVideoElement(stream, cssClass) {
        let wrapper = document.querySelector('.video-wrapper');
        let video = wrapper.querySelector(`.${cssClass}`);
        if (!video) {
            video = document.createElement('video');
            video.classList += cssClass;
            video.autoplay = true;
            video.playsinline = true;
            wrapper.appendChild(video);
        }

        video.srcObject = stream;
        return video;
    }

    function setupCallControlElement() {
        let wrapper = document.querySelector('.video-wrapper');
        let callControl = wrapper.querySelector('.call-control');
        if (!callControl) {
            callControl = document.createElement('div');
            callControl.classList += 'call-control';
            let btnClose = document.createElement('btn');
            btnClose.textContent = 'close call';
            btnClose.addEventListener('click', () => { close(); console.log('closing call'); });
            callControl.appendChild(btnClose);
            wrapper.appendChild(callControl);
        }
    }
    //-------------------------------------------------------------------------------------------------------

    return {
        startCall,
        /**
         * Closes the currect peer-to-peer call.
         * @returns {void} .
         */
        close: () => close()
    };
}

