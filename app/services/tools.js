const humps = require('humps');

// To and from camel case
exports.toCamelCase = function (object) {
    return humps.camelizeKeys(object);
};

exports.toUnderscoreCase = function (object) {
    return humps.decamelizeKeys(object);
};

// Unstringifying numbers and booleans
exports.unstringifyObject = function (object) {
    let unstringified = {};
    for (const [key, value] of Object.entries(object)) {
        if (Array.isArray(value)) {
            unstringified[key.trim()] = value.map( el => { 
                return isNumberString(el) ? parseFloat(el) :
                           isBooleanString(el) ? parseBoolean(el) :
                               el.trim();
            });
        } else {
            unstringified[key.trim()] =
                isNumberString(value) ? parseFloat(value) :
                    isBooleanString(value) ? parseBoolean(value) :
                        value.trim();
        }
    }
    return unstringified;
};

/**
 * Determines if two numbers are equal, regardless of whether they are in string form or not.
 * @returns {boolean} true if they are equal, false otherwise.
 */
exports.equalNumbers = function (n1, n2) {
    if (isNumberString(n1)) n1 = parseFloat(n1);
    if (isNumberString(n2)) n2 = parseFloat(n2);
    return n1 === n2;
};

function isNumberString(str) {
    if (typeof str !== 'string') return false;
    return !isNaN(str) && !isNaN(parseFloat(str))
}

function isBooleanString(str) {
    if (typeof str !== 'string') return false;
    return str.toLowerCase() === 'true' || str.toLowerCase() === 'false';
}

function parseBoolean(str) {
    switch (str.toLowerCase()) {
        case 'true':
            return true;
        case 'false':
            return false;
        default:
            throw Error('Given string does not hold a boolean value.');
    }
}

// Convert between mimetypes/file extensions
exports.getImageMimetype = function (filename) {
    if (filename.endsWith('.jpeg') || filename.endsWith('.jpg')) return 'image/jpeg';
    if (filename.endsWith('.png')) return 'image/png';
    if (filename.endsWith('.gif')) return 'image/gif';
    return 'application/octet-stream';
};

exports.getImageExtension = function (mimeType) {
    switch (mimeType) {
        case 'image/jpeg':
            return '.jpeg';
        case 'image/png':
            return '.png';
        case 'image/gif':
            return '.gif';
        default:
            return null;
    }
};

exports.isInThePast = function (date) {
    if (date === null) return false;
    if (typeof date === 'string') {
        date = Date.parse(date);
    }
    return date < Date.now();
};
