const { guid } = require('../utils/uuid');

module.exports = function ({ usersList }) {

    function loginPost(req, res) {
        if (!req.body.name || req.body.name.length < 3) {
            res.json({ success: false, message: 'Name must be atleast 3 characters long!' });
        }

        if (usersList[req.body.name]) {
            res.json({ success: false, message: 'Name is already taken!' });
        }

        let user = { name: req.body.name, id: guid(), image: './images/profile-pic.png' };
        usersList.loginUser(user);
        res.json({ success: true, user });
    }

    return {
        loginPost
    };
};