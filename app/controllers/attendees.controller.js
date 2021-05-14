const Attendees = require('../models/attendees.model');
const Events = require('../models/events.model');
const tools = require('../services/tools');
const validator = require('../services/validator');
const authenticate = require('../middleware/authenticate')

exports.viewAttendees = async function (req, res) {
    const eventId = req.params.id;
    const userId = await authenticate.getAuthenticatedUserId(req.header('X-Authorization'));

    try {
        const event = await Events.viewDetails(eventId);
        if (event === null) {
            res.statusMessage = 'Not Found';
            res.status(404).send();
        } else {
            let attendees;
            if (!tools.equalNumbers(event.organizerId, userId)) {
                attendees = await Attendees.viewAttendees(eventId, false, userId);
            } else {
                attendees = await Attendees.viewAttendees(eventId, true, userId);
            }
            res.statusMessage = 'OK';
            res.status(200).json(attendees);
        }
    } catch (err) {
        if (!err.hasBeenLogged) console.error(err);
        res.statusMessage = 'Internal Server Error';
        res.status(500).send();
    }
};

exports.addAttendee = async function (req, res) {
    const eventId = req.params.id;
    const attendeeId = req.authenticatedUserId;

    try {
        const event = await Events.viewDetails(eventId);
        if (event === null) {
            res.statusMessage = 'Not Found';
            res.status(404).send();
        } else {
            const existingAttendees = await Attendees.viewAttendees(eventId, true, attendeeId);

            if (existingAttendees.find(attendee => tools.equalNumbers(attendee.attendeeId, attendeeId))) {
                res.statusMessage = 'Forbidden: cannot register for an event more than once';
                res.status(403).send();
            } else if (tools.isInThePast(event.date)) {
                res.statusMessage = 'Forbidden: cannot register for an event that has closed';
                res.status(403).send();
            } else {
                await Attendees.addAttendee(eventId, attendeeId, event.requiresAttendanceControl, event.organizerId);
                res.statusMessage = 'Created';
                res.status(201).json();
            }
        }
    } catch (err) {
        if (!err.hasBeenLogged) console.error(err);
        res.statusMessage = 'Internal Server Error';
        res.status(500).send();
    }
};

exports.removeAttendee = async function (req, res) {
    const eventId = req.params.id;
    const attendeeId = req.authenticatedUserId;

    try {
        const event = await Events.viewDetails(eventId);
        if (event === null) {
            res.statusMessage = 'Not Found';
            res.status(404).send();
        } else {
            const existingAttendees = await Attendees.viewAttendees(eventId, true);
            if (!existingAttendees.find(attendee => tools.equalNumbers(attendee.attendeeId, attendeeId))) {
                res.statusMessage = 'Forbidden: cannot unregister from an event without first registering for it';
                res.status(403).send();
            } else if (tools.isInThePast(event.date)) {
                res.statusMessage = 'Forbidden: cannot register for an event that has already occurred';
                res.status(403).send();
            } else {
                await Attendees.removeAttendee(eventId, attendeeId);
                res.statusMessage = 'OK';
                res.status(200).json();
            }
        }
    } catch (err) {
        if (!err.hasBeenLogged) console.error(err);
        res.statusMessage = 'Internal Server Error';
        res.status(500).send();
    }
};

exports.changeAttendeeStatus = async function (req, res) {
    const eventId = req.params.eventId;
    const attendeeId = req.params.userId;
    const organizerId = req.authenticatedUserId;

    let validation = validator.checkAgainstSchema(
        '/components/schemas/ChangeAttendeeStatusRequest',
        req.body,
        false
    );

    const event = await Events.viewDetails(eventId);
    const existingAttendees = await Attendees.viewAttendees(eventId, true, attendeeId);

    if (event === null) {
        res.statusMessage = 'Not Found';
        res.status(404).send();
    } else if (!existingAttendees.find(attendee => tools.equalNumbers(attendee.attendeeId, attendeeId))) {
        res.statusMessage = 'Not Found';
        res.status(404).send();
    } else if (!tools.equalNumbers(event.organizerId, req.authenticatedUserId)) {
        res.statusMessage = 'Forbidden';
        res.status(403).send();
    } else if (validation !== true) {
        res.statusMessage = `Bad Request: ${validation}`;
        res.status(400).send();
    } else {
        try {
            await Attendees.changeAttendeeStatus(req.body.status, eventId, attendeeId);
            res.statusMessage = 'OK';
            res.status(200).send();
        } catch (err) {
            if (!err.hasBeenLogged) console.error(err);
            res.statusMessage = 'Internal Server Error';
            res.status(500).send();
        }
    }
};
