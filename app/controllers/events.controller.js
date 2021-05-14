const Events = require('../models/events.model');
const Images = require('../models/images.model');
const tools = require('../services/tools');
const validator = require('../services/validator');

exports.search = async function (req, res) {
    req.query = tools.unstringifyObject(req.query);
    // make sure query is a string
    if (req.query.q) {
        req.query.q = `${req.query.q}`;
    }
    // make sure categoryIds is an array
    if (req.query.categoryIds && !(req.query.categoryIds instanceof Array)) {
        req.query.categoryIds = [req.query.categoryIds];
    }
    let validation = validator.checkAgainstSchema(
        'components/schemas/EventSearchRequest',
        req.query,
        false
    );

    if (validation !== true) {
        res.statusMessage = `Bad Request: ${validation}`;
        res.status(400).send();
    } else {
        try {
            if (req.query.categoryIds) {
                const areValidCategories = await Events.areValidCategories(req.query.categoryIds);
                if (!areValidCategories) {
                    res.statusMessage = `Bad Request: one or more invalid category IDs`;
                    res.status(400).send();
                    return;
                }
            }
            const events = await Events.search(req.query);
            res.statusMessage = 'OK';
            res.status(200).json(events);
        } catch (err) {
            if (!err.hasBeenLogged) console.error(err);
            res.statusMessage = 'Internal Server Error';
            res.status(500).send();
        }
    }
};

exports.create = async function (req, res) {
    let validation = validator.checkAgainstSchema(
        'paths/~1events/post/requestBody/content/application~1json/schema',
        req.body
    );

    if (validation === true) {
        const categories = await Events.retrieveCategoryIds();

        if (!req.body.categoryIds.every( category => {
            return categories.indexOf(category) >= 0;
        })) {
            validation = 'at least one categoryId does not match any existing category';
        }

        if (tools.isInThePast(req.body.date)) {
            validation = 'event date must be in the future'
        }
    }

    if (validation !== true) {
        res.statusMessage = `Bad Request: ${validation}`;
        res.status(400).send();
    } else {
        try {
            const eventId = await Events.create(req.body, req.authenticatedUserId);
            res.statusMessage = 'Created';
            res.status(201).json({eventId});
        } catch (err) {
            if (!err.hasBeenLogged) console.error(err);
            res.statusMessage = 'Internal Server Error';
            res.status(500).send();
        }
    }
};

exports.viewDetails = async function (req, res) {
    try {
        const event = await Events.viewDetails(req.params.id);
        if (event) {
            res.statusMessage = 'OK';
            res.status(200).json(event);
        } else {
            res.statusMessage = 'Not Found';
            res.status(404).send();
        }
    } catch (err) {
        if (!err.hasBeenLogged) console.error(err);
        res.statusMessage = 'Internal Server Error';
        res.status(500).send();
    }
};

exports.modify = async function (req, res) {
    let validation = validator.checkAgainstSchema(
        'paths/~1events~1{id}/patch/requestBody/content/application~1json/schema',
        req.body);

    const event = await Events.viewDetails(req.params.id);

    if (event === null) {
        res.statusMessage = 'Not Found';
        res.status(404).send();
        return;
    }

    if (validation === true) {
        if (tools.isInThePast(req.body.date)) {
            validation = 'event date must be in the future'
        }

        if (tools.isInThePast(event.date)) {
            validation = 'cannot edit an event that has already occurred'
        }

        if (req.body.categoryIds) {
            const categories = await Events.retrieveCategoryIds();
            if (!req.body.categoryIds.every( category => {
                return categories.indexOf(category) >= 0;
            })) {
                validation = 'at least one categoryId does not match any existing category';
            }
        }
    }

    if (!tools.equalNumbers(event.organizerId, req.authenticatedUserId)) {
        res.statusMessage = 'Forbidden';
        res.status(403).send();

    } else if (validation !== true) {
        res.statusMessage = `Bad Request: ${validation}`;
        res.status(400).send();

    } else {
        try {
            await Events.modify(req.body, req.params.id);
            res.statusMessage = 'OK';
            res.status(200).send();
        } catch (err) {
            if (!err.hasBeenLogged) console.error(err);
            res.statusMessage = 'Internal Server Error';
            res.status(500).send();
        }
    }
};

exports.delete = async function (req, res) {
    const eventId = req.params.id;

    try {
        const event = await Events.viewDetails(eventId);
        if (event === null) {
            res.statusMessage = 'Event Not Found';
            res.status(404).send();

        } else if (!tools.equalNumbers(event.organizerId, req.authenticatedUserId)) {
            res.statusMessage = 'Forbidden';
            res.status(403).send();

        } else {
            const filename = await Events.getImageFilename(eventId);
            await Promise.all([
                Images.deleteImage(filename),
                Events.delete(eventId)
            ]);
            res.statusMessage = 'OK';
            res.status(200).send();
        }
    } catch (err) {
        if (!err.hasBeenLogged) console.error(err);
        res.statusMessage = 'Internal Server Error';
        res.status(500).send();
    }
};

exports.getCategories = async function (req, res) {
    try {
        const categories = await Events.getCategories();
        res.statusMessage = 'OK';
        res.status(200).json(categories);
    } catch (err) {
        if (!err.hasBeenLogged) console.error(err);
        res.statusMessage = 'Internal Server Error';
        res.status(500).send();
    }
};
