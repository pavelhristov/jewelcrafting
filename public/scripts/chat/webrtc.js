'use strict';
// TODO: 
//  - refactor and abstract UI logic
//  - clear frozen video when videotrack has been stoped

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
    let videoSender;
    let audioSender;
    let isDescriptionSet = false;
    let config = {};
    let videoWindow;
    let isScreenSharing = false;
    let isMuted = false;

    registerSignaling();

    //-------------------------------------------------------------------------------------------------------
    // Methods

    function onError() {
        console.log(arguments);
    }

    function gotRemoteStream(ev) {
        let stream = ev.streams && ev.streams.length ? ev.streams[0] : ev.stream;
        videoWindow.remoteVideo.srcObject = stream;
    }

    /**
     * Closes the connection and cleans up ralated streams and html elements.
     * 
     * @access public
     * 
     * @param {bool} doNotEmit prevents signaling the other user to close the connection(for internal purposes when the request comes from other user)
     */
    function close(doNotEmit) {
        if (videoWindow) {
            videoWindow.destroy();
            videoWindow = undefined;
        }

        if (pc) {
            pc.close();
            pc.onicecandidate = null;
            pc.ontrack = null;
            pc = null;
        }

        if (_stream) {
            _stream.getTracks().forEach(track => track.stop());
            _stream = undefined;
        }

        videoSender = undefined;
        audioSender = undefined;
        isDescriptionSet = false;

        if (config && config.userId) {
            if (!doNotEmit) {
                socket.emit('webrtc', { type: 'close', userId: config.userId });
            }

            config = {};
        }

        if (onClose || typeof onClose === 'function') {
            onClose();
        }
    }

    function closeHandler(ev) {
        close();
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
        if (onCallStart || typeof onCallStart === 'function') {
            onCallStart(userId);
        }

        pc = new RTCPeerConnection(rtcConfig);
        pc.ontrack = gotRemoteStream;
        config.userId = userId;
        config.isVideo = isVideo;
        config.videoState = isVideo ? 'camera' : 'none';

        if (videoWindow) {
            videoWindow.destroy();
        }

        videoWindow = new VideoWindow(document.querySelector('body'));
        videoWindow.btnClose.addEventListener('click', closeHandler);
        videoWindow.btnShareScreen.addEventListener('click', shareScreenHandler);
        videoWindow.btnMute.addEventListener('click', muteHandler);
        videoWindow.btnCamera.addEventListener('click', toggleCameraHandler);

        pc.onicecandidate = function (ev) {
            if (ev.candidate && isDescriptionSet) {
                socket.emit('webrtc', { type: 'addIceCandidate', userId, candidate: ev.candidate });
            }
        };

        return navigator.mediaDevices.getUserMedia({
            audio: true,
            video: config.isVideo
        }).then(function (stream) {
            _stream = stream;
            videoWindow.localVideo.srcObject = _stream;
            let audioTrack = _stream.getAudioTracks()[0];
            audioSender = pc.addTrack(audioTrack, _stream);
            if (config.isVideo) {
                let videoTrack = _stream.getVideoTracks()[0];
                videoSender = pc.addTrack(videoTrack, _stream);
            }
        });
    }

    /**
     * Requests screen stream and replaces the camera stream
     * 
     * @access private
     * 
     * @returns {Promise} .
     */
    function shareScreen() {
        return navigator.mediaDevices.getDisplayMedia()
            .then(changeVideoTrack)
            .then(() => { config.videoState = 'screen-share'; })
            .then(callOffer);
    }

    /**
     * Requests camera stream and replaces the screen stream
     * 
     * @access private
     * 
     * @returns {Promise} .
     */
    function stopScreenSharing() {
        if (config.isVideo) {
            return navigator.mediaDevices.getUserMedia({ video: true })
                .then(changeVideoTrack)
                .then(() => { config.videoState = 'camera'; })
                .then(callOffer);
        }

        return Promise.resolve().then(() => {
            stopVideoStream();
            videoWindow.localVideo.srcObject = _stream;
            config.videoState = 'none';
        });
    }

    /**
     * Stops current video sharing (does not affect audio)
     */
    function stopVideoStream() {
        if (config.videoState && config.videoState !== 'none') {
            pc.removeTrack(videoSender);
            let currentTrack = _stream.getVideoTracks()[0];
            currentTrack.stop();
            _stream.removeTrack(currentTrack);
            videoSender = null;
        }
    }

    /**
     * Changes the current video track with the first from provided stream
     * 
     * @param {MediaSteam} stream media stream
     */
    function changeVideoTrack(stream) {
        stopVideoStream();

        let newTrack = stream.getVideoTracks()[0];
        _stream.addTrack(newTrack);
        videoSender = pc.addTrack(newTrack, _stream);

        videoWindow.localVideo.srcObject = _stream;
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

            if (data.type === 'setAnswer') {
                pc.setRemoteDescription(data.desc);
                isDescriptionSet = true;
            }

            if (data.type === 'setDescription') {
                let promise = !pc ? create(data.userId, data.isVideo) : Promise.resolve();
                promise.then(() => setRemoteDescription(data.desc));
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
        return create(userId, isVideo).then(callOffer);
    }

    /**
     * Creates and sends offer.
     * 
     * Creates an offer and sends it the other user to initialize the call or to notify change of streams.
     * 
     * @returns {Promise} .
     */
    function callOffer() {
        isDescriptionSet = false;
        return pc.createOffer({ offerToReceiveAudio: 1, offerToReceiveVideo: config.isVideo ? 1 : 0 }).then(function (desc) {
            pc.setLocalDescription(desc);
            socket.emit('webrtc', { type: 'setDescription', userId: config.userId, isVideo: config.isVideo, desc });
        }, onError);
    }

    /**
     * Sets provided offer description, generates anwer and sends it to the other user.
     * 
     * @param {Object} desc webrtc offer description 
     */
    function setRemoteDescription(desc) {
        pc.setRemoteDescription(desc);
        pc.createAnswer().then(function (desc) {
            pc.setLocalDescription(desc);
            isDescriptionSet = true;

            socket.emit('webrtc', { type: 'setAnswer', userId: config.userId, desc });
        }, onError);
    }

    //-------------------------------------------------------------------------------------------------------
    // Event handlers

    function shareScreenHandler(ev) {
        if (!isDescriptionSet) {
            return;
        }

        if (config.videoState === 'screen-share') {
            stopScreenSharing().then(() => {
                ev.target.textContent = 'share screen';
            });
        } else {
            shareScreen().then(() => {
                ev.target.textContent = 'stop sharing';
            });
        }
    }

    function muteHandler(ev) {
        if (!isDescriptionSet) {
            return;
        }

        if (isMuted) {
            _stream.getAudioTracks()[0].enabled = true;
            ev.target.textContent = 'mute mic';
            isMuted = false;
        } else {
            _stream.getAudioTracks()[0].enabled = false;
            ev.target.textContent = 'unmute mic';
            isMuted = true;
        }
    }

    function toggleCameraHandler(ev) {
        if (config.videoState === 'camera') {
            stopVideoStream();
            config.isVideo = false;
            config.videoState = 'none';
            return callOffer;
        }

        return navigator.mediaDevices.getUserMedia({ video: true })
            .then(changeVideoTrack)
            .then(() => {
                if (config.videoState === 'screen-share') { // TODO: move
                    videoWindow.btnShareScreen.textContent = 'share screen';
                }

                config.videoState = 'camera';
                config.isVideo = true;
            }).then(callOffer);
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

/**
 * Internal class for p2p object to handle UI
 * 
 * @access private
 */
class VideoWindow {
    constructor(parent) {
        this.parent = parent;
        this.currentState = 'normal';
        this.wrapper = document.createElement('div');
        this.wrapper.classList.add('video-wrapper');

        this.localVideo = document.createElement('video');
        this.localVideo.classList.add('local-video');
        this.localVideo.autoplay = true;
        this.localVideo.playsinline = true;
        this.localVideo.muted = true;
        this.wrapper.appendChild(this.localVideo);

        this.remoteVideo = document.createElement('video');
        this.remoteVideo.classList.add('remote-video');
        this.remoteVideo.autoplay = true;
        this.remoteVideo.playsinline = true;
        this.wrapper.appendChild(this.remoteVideo);

        this.videoControl = document.createElement('div');
        this.videoControl.classList.add('video-control');

        this.btnClose = this.attachButton('close');
        this.btnShareScreen = this.attachButton('share screen');
        this.btnCamera = this.attachButton('camera');
        this.btnMute = this.attachButton('mute mic');

        this.btnMinimize = this.attachButton('minimize');
        this.btnMinimize.addEventListener('click', this.setState.bind(this, 'mini'));

        this.btnFullScreen = this.attachButton('full screen');
        this.btnFullScreen.addEventListener('click', this.setState.bind(this, 'full-screen'));

        this.wrapper.appendChild(this.videoControl);
        this.parent.appendChild(this.wrapper);
    }

    attachButton(text) {
        let btn = document.createElement('button');
        btn.textContent = text;
        btn.classList.add('btn-dark');
        this.videoControl.appendChild(btn);
        return btn;
    }

    setState(state) {
        switch (this.currentState) {
            case 'mini':
                this.wrapper.classList.remove('mini');
                this.btnMinimize.textContent = 'minimize';
                break;

            case 'full-screen':
                this.wrapper.classList.remove('full-screen');
                this.btnFullScreen.textContent = 'full screen';
                break;
            default:
                break;
        }

        if (state === this.currentState) {
            this.currentState = 'normal';
            return;
        }

        switch (state) {
            case 'mini':
                this.btnMinimize.textContent = 'normal view';
                this.wrapper.classList.add('mini');
                break;
            case 'full-screen':
                this.btnFullScreen.textContent = 'normal view';
                this.wrapper.classList.add('full-screen');
                break;

            default:
                break;
        }

        this.currentState = state;
    }

    destroy() {
        this.localVideo.pause();
        this.remoteVideo.pause();
        this.parent.removeChild(this.wrapper);
    }
}


