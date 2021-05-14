const attendees = require('../controllers/attendees.controller');
const authenticate = require('../middleware/authenticate');

module.exports = function (app) {
    app.route(app.rootUrl + '/events/:id/attendees')
        .get(attendees.viewAttendees)
        .post(authenticate.loginRequired, attendees.addAttendee)
        .delete(authenticate.loginRequired, attendees.removeAttendee);
    app.route(app.rootUrl + '/events/:eventId/attendees/:userId')
        .patch(authenticate.loginRequired, attendees.changeAttendeeStatus);
};
