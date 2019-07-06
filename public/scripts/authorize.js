const authorize = (function () {
    let user;
    let onLogin;

    function login(container) {
        let form = document.createElement('form');
        form.addEventListener('submit', loginHandler);
        form.classList.add('login-wrapper');
        let header = document.createElement('h2');
        header.textContent = 'Login';
        form.appendChild(header);

        form.appendChild(createField('Name:', 'name', 'text'));

        let btnLogin = document.createElement('button');
        btnLogin.textContent = 'Login';
        btnLogin.classList.add('btn-dark');
        let actionWrapper = document.createElement('div');
        actionWrapper.classList.add('action-wrapper');
        actionWrapper.appendChild(btnLogin);

        form.appendChild(actionWrapper);
        container.appendChild(form);
    }

    function createField(title, fieldName, fieldType) {
        let label = document.createElement('label');
        let name = document.createElement('span');
        name.classList.add('label-text');
        name.textContent = title;
        label.appendChild(name);

        let input = document.createElement('input');
        input.classList.add('input-dark');
        input.name = fieldName || '';
        input.type = fieldType || 'text';
        label.appendChild(input);

        return label;
    }

    function loginHandler(ev) {
        let formData = new FormData(ev.target);
        fetch('/account/login', {
            method: 'POST',
            body: formData,
            credentials: 'include'
        }).then(res => {
            if (res.status >= 200 && res.status < 300) {
                if (res.headers.get('Content-Type') && res.headers.get('Content-Type').indexOf('application/json') > -1) {
                    return res.json();
                }

                return res.text();
            } else {
                return Promise.reject(res.text());
            }
        }).then(res => {
            if (res.success) {
                user = res.user;
                if (onLogin || typeof onLogin === 'function') {
                    onLogin(user);
                }
            }
        });


        ev.preventDefault();
        return false;
    }

    return {
        login,
        setOnLogin: (callback) => onLogin = callback,
        getUserInfo: () => user
    };
})();