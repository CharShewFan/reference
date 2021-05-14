const events = require('../controllers/events.controller');
const authenticate = require('../middleware/authenticate');

module.exports = function (app) {
    const baseUrl = app.rootUrl + '/events';

    app.route(baseUrl)
        .get(events.search)
        .post(authenticate.loginRequired, events.create);

    app.route(baseUrl + '/categories')
        .get(events.getCategories);

    app.route(baseUrl + '/:id')
        .get(events.viewDetails)
        .patch(authenticate.loginRequired, events.modify)
        .delete(authenticate.loginRequired, events.delete);
};
