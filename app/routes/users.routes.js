const users = require('../controllers/users.controller');
const authenticate = require('../middleware/authenticate');

module.exports = function(app) {
    const baseUrl = app.rootUrl + '/users';

    app.route(baseUrl + '/register')
        .post(users.create);

    app.route(baseUrl + '/login')
        .post(users.login);

    app.route(baseUrl + '/logout')
        .post(authenticate.loginRequired, users.logout);

    app.route(baseUrl + '/:id')
        .get(authenticate.setAuthenticatedUser, users.view)
        .patch(authenticate.loginRequired, users.change);
};
