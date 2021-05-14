const errors = require('../services/errors');
const tools = require('../services/tools');
const fs = require('mz/fs');
const randtoken = require('rand-token');

const imagesDirectory = './storage/images/';

exports.retrieveImage = async function (filename) {
    try {
        if (await fs.exists(imagesDirectory + filename)) {
            const image = await fs.readFile(imagesDirectory + filename);
            const mimeType = tools.getImageMimetype(filename);
            return {image, mimeType};
        } else {
            return null;
        }
    } catch (err) {
        errors.logSqlError(err);
        throw err;
    }
};

exports.storeImage = async function (image, fileExt) {
    const filename = randtoken.generate(32) + fileExt;

    try {
        await fs.writeFile(imagesDirectory + filename, image);
        return filename;
    } catch (err) {
        errors.logSqlError(err);
        fs.unlink(imagesDirectory + filename).catch(err => console.error(err));
        throw err;
    }
};


exports.deleteImage = async function (filename) {
    try {
        if (await fs.exists(imagesDirectory + filename)) {
            await fs.unlink(imagesDirectory + filename);
        }
    } catch (err) {
        errors.logSqlError(err);
        throw err;
    }
};
