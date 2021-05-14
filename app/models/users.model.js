const db = require('../../config/db');
const errors = require('../services/errors');
const passwords = require('../services/passwords');
const tools = require('../services/tools');
const randtoken = require('rand-token');

exports.create = async function (user) {
    const createSQL = 'INSERT INTO `user` (`first_name`, `last_name`, `email`, `password`) VALUES (?, ?, ?, ?)';

    const userData = [user.firstName, user.lastName, user.email, await passwords.hash(user.password)];

    try {
        const result = await db.getPool().query(createSQL, userData);
        return result[0].insertId;
    } catch (err) {
        errors.logSqlError(err);
        throw err;
    }
};

exports.findByEmail = async function (email) {
    const findSQL = 'SELECT * FROM `user` WHERE `email` = ?';

    try {
        const result = await db.getPool().query(findSQL, [email]);
        const rows = result[0];
        return rows.length < 1 ? null : tools.toCamelCase(rows[0]);
    } catch (err) {
        errors.logSqlError(err);
        return null;
    }
};

exports.login = async function (userId) {
    const loginSQL = 'UPDATE `user` SET `auth_token` = ? WHERE `id` = ?';
    const token = randtoken.generate(32);

    try {
        await db.getPool().query(loginSQL, [token, userId]);
        return {userId, token}
    } catch (err) {
        errors.logSqlError(err);
        throw err;
    }
};

exports.logout = async function (userId) {
    const logoutSQL = 'UPDATE `user` SET `auth_token` = NULL WHERE `id` = ?';

    try {
        await db.getPool().query(logoutSQL, userId);
    } catch (err) {
        errors.logSqlError(err);
        throw err;
    }
};

exports.findById = async function (id, isCurrentUser = false) {
    const viewSQL = 'SELECT * FROM `user` WHERE `id` = ?';

    try {
        const result = await db.getPool().query(viewSQL, id);
        const rows = result[0];
        if (rows.length < 1) {
            return null;
        } else {
            const foundUser = tools.toCamelCase(rows[0]);
            let userData = {
                firstName: foundUser.firstName,
                lastName: foundUser.lastName,
            };
            if (isCurrentUser) {
                userData.email = foundUser.email;
            }
            return userData;
        }
    } catch (err) {
        errors.logSqlError(err);
        return null;
    }
};

exports.modify = async function (userId, modification) {
    const updateSQL = 'UPDATE `user` SET ? WHERE `id` = ?';

    // Hash the new password if it has been changed
    if (modification.password) {
        modification.password = await passwords.hash(modification.password);
    }

    try {
        await db.getPool().query(updateSQL, [tools.toUnderscoreCase(modification), userId]);
    } catch (err) {
        errors.logSqlError(err);
        throw err;
    }
};

exports.getProfileImageFilename = async function (userId) {
    const selectSQL = 'SELECT `image_filename` FROM `user` WHERE `id` = ?';

    try {
        const result = await db.getPool().query(selectSQL, userId);
        const rows = result[0]
        if (rows.length) {
            return tools.toCamelCase(rows[0]).imageFilename;
        }
    } catch (err) {
        errors.logSqlError(err);
    }

    return null;
};

exports.setProfileImageFilename = async function (userId, imageFilename) {
    const updateSQL = 'UPDATE `user` SET `image_filename` = ? WHERE `id` = ?';

    try {
        const result = await db.getPool().query(updateSQL, [imageFilename, userId]);
        if (result[0].changedRows !== 1) {
            throw Error('Should be exactly one user whose profile image was modified.');
        }
    } catch (err) {
        errors.logSqlError(err);
        throw err;
    }
};
