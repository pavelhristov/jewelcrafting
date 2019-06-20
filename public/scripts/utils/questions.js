let questions = (function () {
    let askedQuestions = {};
    let wrapper = document.createElement('div');
    wrapper.classList += 'dialog-wrapper';
    wrapper.addEventListener('click', function (ev) {
        if (!ev.target || !ev.target.classList.contains('question-btn')) {
            return;
        }

        let question = ev.target.closest('.question');
        let theme = question.getAttribute('data-theme');
        close(theme);
    });

    document.querySelector('body').appendChild(wrapper);

    function ask(theme, { header, text, duration, actions, onTimeout, isPermanent }) {
        if (askedQuestions[theme]) {
            console.warn(`question with theme ${theme} has already been asked`);
            return;
        }

        let question = document.createElement('div');
        question.setAttribute('data-theme', theme);
        question.classList += 'question';

        let _header = document.createElement('div');
        _header.textContent = header;
        question.appendChild(_header);

        let _text = document.createElement('div');
        _text.textContent = text;
        question.appendChild(_text);

        let buttons = document.createElement('div');
        for (const key in actions) {
            buttons.appendChild(createButton(actions[key].title, actions[key].handler));
        }

        question.appendChild(buttons);
        wrapper.appendChild(question);

        let result = { question };
        if (!isPermanent) {
            if (!duration || isNaN(duration)) {
                duration = 30;
            }

            result.timer = setTimeout(function () {
                wrapper.removeChild(question);
                delete askedQuestions[theme];
                onTimeout();
            }, duration * 1000);
        }

        askedQuestions[theme] = result;
    }

    function close(theme) {
        if (!askedQuestions[theme]) {
            console.warn(`there is no active question with theme ${theme}`);
            return;
        }

        wrapper.removeChild(askedQuestions[theme].question);
        if (askedQuestions[theme].timer) {
            clearTimeout(askedQuestions[theme].timer);
        }

        delete askedQuestions[theme];
    }

    function createButton(text, onClickHandler) {
        let btn = document.createElement('button');
        btn.textContent = text;
        btn.classList += 'question-btn';
        if (onClickHandler || typeof onCancel === 'function') {
            btn.addEventListener('click', onClickHandler);
        }

        return btn;
    }

    return { ask, close };
})();
