const Events = require('../models/events.model');
const Images = require('../models/images.model');
const tools = require('../services/tools');

exports.getImage = async function (req, res) {
    try {
        const filename = await Events.getImageFilename(req.params.id);
        if (filename == null) {
            res.statusMessage = 'Not Found';
            res.status(404).send();
        } else {
            const imageDetails = await Images.retrieveImage(filename);
            res.statusMessage = 'OK';
            res.status(200).contentType(imageDetails.mimeType).send(imageDetails.image);
        }
    } catch (err) {
        if (!err.hasBeenLogged) console.error(err);
        res.statusMessage = 'Internal Server Error';
        res.status(500).send();
    }
};

exports.setImage = async function (req, res) {
    const image = req.body;
    const eventId = req.params.id;

    const event = await Events.viewDetails(eventId);
    if (!event) {
        res.statusMessage = 'Not Found';
        res.status(404).send();
        return;
    }

    // Check that the authenticated user isn't trying to change anyone else's petition's photo
    if (!tools.equalNumbers(event.organizerId, req.authenticatedUserId)) {
        res.statusMessage = 'Forbidden';
        res.status(403).send();
        return;
    }

    // Find the file extension for this photo
    const mimeType = req.header('Content-Type');
    const fileExt = tools.getImageExtension(mimeType);
    if (fileExt === null) {
        res.statusMessage = 'Bad Request: photo must be image/jpeg, image/png, image/gif type, but it was: ' + mimeType;
        res.status(400).send();
        return;
    }

    if (req.body.length === undefined) {
        res.statusMessage = 'Bad request: empty image';
        res.status(400).send();
        return;
    }

    try {
        const existingImage = await Events.getImageFilename(eventId);
        if (existingImage) {
            await Images.deleteImage(existingImage);
        }

        const filename = await Images.storeImage(image, fileExt);
        await Events.setImageFilename(eventId, filename);
        if (existingImage) {
            res.statusMessage = 'OK';
            res.status(200).send();
        } else {
            res.statusMessage = 'Created';
            res.status(201).send();
        }
    } catch (err) {
        if (!err.hasBeenLogged) console.error(err);
        res.statusMessage = 'Internal Server Error';
        res.status(500).send();
    }
};



