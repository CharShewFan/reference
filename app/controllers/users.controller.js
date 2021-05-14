const Users = require('../models/users.model');
const passwords = require('../services/passwords');
const tools = require('../services/tools');
const validator = require('../services/validator');


function isValidEmail(email) {
    // Note: doesn't actually guarantee a valid email
    return email.includes('@');
}

exports.create = async function (req, res) {
    let validation = validator.checkAgainstSchema(
        'paths/~1users~1register/post/requestBody/content/application~1json/schema',
        req.body
    );

    // Extra validation for email address
    if (validation === true && !isValidEmail(req.body.email)) {
        validation = 'email must be a valid email address';
    }

    if (validation !== true) {
        res.statusMessage = `Bad Request: ${validation}`;
        res.status(400).send();
    } else {
        try {
            const userId = await Users.create(req.body);
            res.statusMessage = 'Created';
            res.status(201).json({userId});
        } catch (err) {
            if (err.sqlMessage && err.sqlMessage.includes('Duplicate entry')) {
                // Email was already in use
                res.statusMessage = 'Bad Request: email already in use';
                res.status(400).send();
            } else {
                if (!err.hasBeenLogged) console.error(err);
                res.status(500).send();
            }
        }
    }
};

exports.login = async function (req, res) {
    let validation = validator.checkAgainstSchema(
        'paths/~1users~1login/post/requestBody/content/application~1json/schema',
        req.body
    );

    if (validation !== true) {
        res.statusMessage = `Bad Request: ${validation}`;
        res.status(400).send();
    } else {
        try {
            const foundUser = await Users.findByEmail(req.body.email);
            if (foundUser == null) {
                // Either no user found or password check failed
                res.statusMessage = 'Bad Request: invalid email/password supplied';
                res.status(400).send();
            } else {
                const passwordCorrect = await passwords.compare(req.body.password, foundUser.password);
                if (passwordCorrect) {
                    const loginResult = await Users.login(foundUser.id);
                    res.statusMessage = 'OK';
                    res.status(200).json(loginResult);
                } else {
                    res.statusMessage = 'Bad Request: invalid email/password supplied';
                    res.status(400).send();
                }
            }
        } catch (err) {
            // Something went wrong with either password hashing or logging in
            if (!err.hasBeenLogged) console.error(err);
            res.statusMessage = 'Internal Server Error';
            res.status(500).send();
        }
    }
};

exports.logout = async function (req, res) {
    const id = req.authenticatedUserId;

    try {
        await Users.logout(id);
        res.statusMessage = 'OK';
        res.status(200).send();
    } catch (err) {
        if (!err.hasBeenLogged) console.error(err);
        res.statusMessage = 'Internal Server Error';
        res.status(500).send();
    }
};

exports.view = async function (req, res) {
    const id = req.params.id;
    const isCurrentUser = id === req.authenticatedUserId;

    const userData = await Users.findById(id, isCurrentUser);
    if (userData == null) {
        res.statusMessage = 'Not Found';
        res.status(404).send();
    } else {
        res.statusMessage = 'OK';
        res.status(200).json(userData);
    }
};

exports.change = async function (req, res) {
    // Check request body is valid
    let validation = validator.checkAgainstSchema(
        'paths/~1users~1{id}/patch/requestBody/content/application~1json/schema',
        req.body);

    // Extra validation
    const userId = req.params.id;
    if (isNaN(parseInt(userId)) || parseInt(userId) < 0) {
        validation = 'id must be an integer greater than 0';
    }

    const modification = req.body;
    if (Object.keys(modification).length === 0 ||
        (Object.keys(modification).length === 1 && Object.keys(modification)[0] === "currentPassword")) {
        validation = 'you must provide some details to update';
    }

    if (req.body.email && !isValidEmail(req.body.email)) {
        validation = 'email must be a valid email address'
    }

    const user = await Users.findById(req.params.id, true);
    const userExists = user !== null;
    if (!userExists) {
        res.statusMessage = 'Not Found';
        res.status(404).send();

    } else if (!tools.equalNumbers(userId, req.authenticatedUserId)) {
        // Check that the authenticated user isn't trying to change anyone else's details
        res.statusMessage = 'Forbidden';
        res.status(403).send();

    } else if (validation !== true) {
        res.statusMessage = `Bad Request: ${validation}`;
        res.status(400).send();

    } else {
        if (modification.password) {
            const fullUser = await Users.findByEmail(user.email);
            const passwordIncorrect = !modification.currentPassword || !(await passwords.compare(modification.currentPassword, fullUser.password));
            if (passwordIncorrect) {
                res.statusMessage = `Bad Request: incorrect password`;
                res.status(400).send();
                return;
            }
        }
        delete modification.currentPassword;
        try {
            await Users.modify(userId, modification);
            res.statusMessage = 'OK';
            res.status(200).send();
        } catch (err) {
            if (err.sqlMessage && err.sqlMessage.includes('Duplicate entry')) {
                // Email was already in use
                res.statusMessage = 'Bad Request: email already in use';
                res.status(400).send();
            } else {
                if (!err.hasBeenLogged) console.error(err);
                res.statusMessage = 'Internal Server Error';
                res.status(500).send();
            }
        }
    }
};
