const Users = require('../models/users.model');
const Images = require('../models/images.model');
const tools = require('../services/tools');

exports.getProfileImage = async function (req, res) {
    try {
        const filename = await Users.getProfileImageFilename(req.params.id);
        if (filename == null) {
            res.statusMessage = 'Not Found';
            res.status(404).send();
        } else {
            const imageDetails = await Images.retrieveImage(filename);
            if (imageDetails == null) {
                res.statusMessage = 'Not Found';
                res.status(404).send();
            } else {
                res.statusMessage = 'OK';
                res.status(200).contentType(imageDetails.mimeType).send(imageDetails.image);
            }
        }
    } catch (err) {
        if (!err.hasBeenLogged) console.error(err);
        res.statusMessage = 'Internal Server Error';
        res.status(500).send();
    }
};

exports.setProfileImage = async function (req, res) {
    const image = req.body;
    const userId = req.params.id;

    const user = await Users.findById(req.params.id);
    if (!user) {
        res.statusMessage = 'Not Found';
        res.status(404).send();
        return;
    }

    // Check that the authenticated user isn't trying to change anyone else's image
    if (userId !== req.authenticatedUserId) {
        res.statusMessage = 'Forbidden';
        res.status(403).send();
        return;
    }

    // Find the file extension for this image
    const mimeType = req.header('Content-Type');
    const fileExt = tools.getImageExtension(mimeType);
    if (fileExt === null) {
        res.statusMessage = 'Bad Request: image must be image/jpeg, image/png, image/gif type, but it was: ' + mimeType;
        res.status(400).send();
        return;
    }

    if (req.body.length === undefined) {
        res.statusMessage = 'Bad request: empty image';
        res.status(400).send();
        return;
    }

    try {
        const existingImage = await Users.getProfileImageFilename(userId);
        if (existingImage) {
            await Images.deleteImage(existingImage);
        }

        const filename = await Images.storeImage(image, fileExt);
        await Users.setProfileImageFilename(userId, filename);
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

exports.deleteProfileImage = async function (req, res) {
    const userId = req.params.id;

    const user = await Users.findById(req.params.id);
    if (!user) {
        res.statusMessage = 'Not Found';
        res.status(404).send();
        return;
    }

    // Check that the authenticated user isn't trying to delete anyone else's image
    if (userId !== req.authenticatedUserId) {
        res.statusMessage = 'Forbidden';
        res.status(403).send();
    } else {
        try {
            const imageFilename = await Users.getProfileImageFilename(userId);
            if (imageFilename == null) {
                res.statusMessage = 'Not Found';
                res.status(404).send();
            } else {
                await Promise.all([
                    Images.deleteImage(imageFilename),
                    Users.setProfileImageFilename(userId, null)
                ]);
                res.statusMessage = 'OK';
                res.status(200).send();
            }
        } catch (err) {
            if (!err.hasBeenLogged) console.error(err);
            res.statusMessage = 'Internal Server Error';
            res.status(500).send();
        }
    }
};
