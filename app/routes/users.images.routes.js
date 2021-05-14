const usersImages = require('../controllers/users.images.controller');
const authenticate = require('../middleware/authenticate');

module.exports = function (app) {
    app.route(app.rootUrl + '/users/:id/image')
        .get(usersImages.getProfileImage)
        .put(authenticate.loginRequired, usersImages.setProfileImage)
        .delete(authenticate.loginRequired, usersImages.deleteProfileImage);
};
