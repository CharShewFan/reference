const eventsImages = require('../controllers/events.images.controller');
const authenticate = require('../middleware/authenticate');

module.exports = function (app) {
    app.route(app.rootUrl + '/events/:id/image')
        .get(eventsImages.getImage)
        .put(authenticate.loginRequired, eventsImages.setImage);
};
