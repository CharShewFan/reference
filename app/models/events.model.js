const db = require('../../config/db');
const errors = require('../services/errors');
const tools = require('../services/tools');

exports.search = async function (query) {
    const {searchSQL, values} = buildSearchSQL(query);

    try {
        let result = await db.getPool().query(searchSQL, values);
        let events = result[0];
        if (events.length && events[0].eventId !== null) {
            return events.map(event => {
                if (event.categories) {
                    event.categories = event.categories.split(",").map(
                        category => +category
                    );
                } else {
                    event.categories = [];
                }
                return tools.toCamelCase(event);
            });
        } else {
            return [];
        }
    } catch (err) {
        errors.logSqlError(err);
        throw err;
    }
};

function buildSearchSQL(query) {
	let values = [];

    let ecSearchSQL = `SELECT event_id FROM \`event_category\` `;
    if (query.hasOwnProperty("categoryIds")) {
        ecSearchSQL += (`WHERE category_id IN (${query.categoryIds.join(",")})`);
    }

    let aSearchSQL = `SELECT E.id as eventId,
                 \`date\`,
                 title,
                 capacity,
                 U.first_name as organizerFirstName,
                 U.last_name as organizerLastName,
                 (SELECT COUNT(*) FROM \`event_attendees\` WHERE attendance_status_id = 1 AND event_id = E.id) AS num_accepted_attendees
                 FROM \`event\` E
                 LEFT JOIN \`user\` U ON U.id = E.organizer_id
                 RIGHT JOIN (${ecSearchSQL}) EC ON EC.event_id = E.id `;

    // WHERE conditions
    let aConditions = [];
    if (query.hasOwnProperty("q")) {
        aConditions.push('(\`title\` LIKE ? OR \`description\` LIKE ?)');
        values.push(`%${query.q}%`);
        values.push(`%${query.q}%`);
    }
    if (query.hasOwnProperty("organizerId")) {
        aConditions.push('organizer_id = ?');
        values.push(query.organizerId);
    }
    if (aConditions.length) {
        aSearchSQL += `WHERE ${(aConditions ? aConditions.join(' AND ') : 1)}\n`;
    }
    aSearchSQL += `GROUP BY E.id `

    let searchSQL = `SELECT 
       A.eventId AS eventId,
       A.title AS title,
       A.capacity AS capacity,
       A.organizerFirstName AS organizerFirstName,
       A.organizerLastName AS organizerLastName,
       A.date,
       GROUP_CONCAT(B.category_id) AS categories,
       A.num_accepted_attendees AS num_accepted_attendees
       FROM (` + aSearchSQL + `) AS A LEFT JOIN \`event_category\` AS B ON A.eventId = B.event_id GROUP BY A.eventId `;

    // ORDER BY
    switch (query.sortBy) {
        case 'ALPHABETICAL_ASC':
            searchSQL += `ORDER BY title ASC`;
            break;
        case 'ALPHABETICAL_DESC':
            searchSQL += `ORDER BY title DESC`;
            break;
        case 'CAPACITY_ASC':
            searchSQL += `ORDER BY capacity ASC`;
            break;
        case 'CAPACITY_DESC':
            searchSQL += `ORDER BY capacity DESC`;
            break;
        case 'ATTENDEES_ASC':
            searchSQL += `ORDER BY num_accepted_attendees ASC`;
            break;
        case 'ATTENDEES_DESC':
            searchSQL += `ORDER BY num_accepted_attendees DESC`;
            break;
        case 'DATE_ASC':
            searchSQL += `ORDER BY \`date\` ASC`;
            break;
        case 'DATE_DESC':
        default:
            searchSQL += `ORDER BY \`date\` DESC`;
            break;
    }
    searchSQL += ', eventId\n';

    // LIMIT and OFFSET
    if (typeof query.count !== 'undefined') {
        searchSQL += 'LIMIT ?\n';
        values.push(parseInt(query.count));
    }
    if (typeof query.startIndex !== 'undefined') {
        if (typeof query.count === 'undefined') {
            searchSQL += 'LIMIT ?\n';
            values.push(1000000000);
        }
        searchSQL += 'OFFSET ?\n';
        values.push(parseInt(query.startIndex));
    }

    return {searchSQL: searchSQL, values: values};
}

exports.create = async function (event, userId) {
    const insertSQL = `INSERT INTO \`event\`
                       (title, description, date, fee, is_online, url, venue, capacity, requires_attendance_control, organizer_id)
                       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

    const eventData = [
        event.title,
        event.description,
        event.date,
        !event.fee ? 0.00 : event.fee,
        !event.is_online ? false : event.is_online,
        event.url,
        event.venue,
        event.capacity,
        !event.requires_attendance_control ? false : event.requires_attendance_control,
        userId
    ];

    try {
        const result = await db.getPool().query(insertSQL, eventData);
        let insertSQLCategories = `INSERT INTO \`event_category\` (event_id, category_id) VALUES `;
        let values = [];
        event.categoryIds.forEach( categoryId => {
        	values.push(`(${result[0].insertId}, ${categoryId})`);
        });
        insertSQLCategories += values.join(",");
        await db.getPool().query(insertSQLCategories);
        return result[0].insertId;
    } catch (err) {
        errors.logSqlError(err);
        throw err;
    }
};

exports.modify = async function (modifications, eventId) {

    if (modifications.categoryIds) {
    	const deleteCategoriesSQL = `DELETE FROM \`event_category\` WHERE event_id = ?`;
    	try {
    		await db.getPool().query(deleteCategoriesSQL, [eventId]);
            let insertSQLCategories = `INSERT INTO \`event_category\` (event_id, category_id) VALUES `;
        	let values = [];
        	modifications.categoryIds.forEach( categoryId => {
        		values.push(`(${eventId}, ${categoryId})`);
        	});
        	insertSQLCategories += values.join(",");
        	await db.getPool().query(insertSQLCategories);
    	} catch (err) {
        	errors.logSqlError(err);
        	throw err;
        }
        delete modifications.categoryIds;
    }

    const updateSQL = 'UPDATE `event` SET ? WHERE id = ?';

    try {
        await db.getPool().query(updateSQL, [tools.toUnderscoreCase(modifications), eventId]);
    } catch (err) {
        errors.logSqlError(err);
        throw err;
    }
};

exports.delete = async function (eventId) {
    const deleteCategoriesSql = `DELETE FROM \`event_category\` WHERE \`event_id\` = ?`;
    const deleteAttendeesSql = `DELETE FROM \`event_attendees\` WHERE \`event_id\` = ?`;
    const deleteSql = `DELETE
                       FROM \`event\`
                       WHERE id = ?`;
    try {
    	await db.getPool().query(deleteAttendeesSql, [eventId]);
    	await db.getPool().query(deleteCategoriesSql, [eventId]);
        const result = await db.getPool().query(deleteSql, [eventId]);
        
        if (result[0].affectedRows !== 1) {
            throw Error(`Should be exactly one petition that was deleted, but it was ${result[0].changedRows}.`);
        }
    } catch (err) {
        errors.logSqlError(err);
        throw err;
    }
};

exports.viewDetails = async function (eventId) {
    const selectSQL = `SELECT E.id,
       \`title\`,
       \`description\`,
       U.id AS \`organizer_id\`,
       U.first_name AS \`organizer_first_name\`,
       U.last_name AS \`organizer_last_name\`,
       \`attendee_count\`,
       \`capacity\`,
       \`is_online\`,
       \`url\`,
       \`venue\`,
       \`requires_attendance_control\`,
       \`fee\`,
       GROUP_CONCAT(C.id) AS categories,
       \`date\`
       FROM \`event\` E
       LEFT JOIN \`user\` U ON U.id = E.organizer_id
       LEFT JOIN \`category\` C ON C.id IN (SELECT category_id FROM \`event_category\` WHERE event_id = E.id)
       LEFT JOIN (SELECT \`event_id\`, count(\`user_id\`) as \`attendee_count\`
                         FROM \`event_attendees\` WHERE \`attendance_status_id\` = 1 GROUP BY event_id) A ON A.event_id = E.id
       WHERE E.id = ?`;

    try {
        const result = await db.getPool().query(selectSQL, [eventId]);
        let rows = result[0];
        if (rows.length && rows[0].id !== null) {
        	if (!rows[0].categories) {
        		rows[0].categories = [];
        	} else {
        		rows[0].categories = rows[0].categories.split(",").map(
                    category => +category
                );
        	}
        	return tools.toCamelCase(rows[0]);
        }
        else return null;
    } catch (err) {
        errors.logSqlError(err);
        throw err;
    }
};

exports.getCategories = async function () {
    const selectSQL = `SELECT id, name
                       FROM \`category\``;

    try {
        const result = await db.getPool().query(selectSQL);
        const categories = result[0];
        return categories.map(category => tools.toCamelCase(category));
    } catch (err) {
        errors.logSqlError(err);
        throw err;
    }
};

exports.areValidCategories = async function (categoryIds) {
    const selectSql = `SELECT count(*) AS c
                       FROM \`category\`
                       WHERE id IN (?)`;

    try {
        const result = await db.getPool().query(selectSql, [categoryIds]);
        return result[0][0].c === categoryIds.length;
    } catch (err) {
        errors.logSqlError(err);
        throw err;
    }
};

exports.retrieveCategoryIds = async function () {
    const selectSQL = `SELECT id
                       FROM \`category\``;

    try {
        const result = await db.getPool().query(selectSQL);
        return result[0].map( el => el.id );
    } catch (err) {
        errors.logSqlError(err);
        throw err;
    }
};

exports.getImageFilename = async function (eventId) {
    const selectSQL = `SELECT image_filename
                       FROM \`event\`
                       WHERE id = ?`;

    try {
        const result = await db.getPool().query(selectSQL, eventId);
        const rows = result[0];
        if (rows.length) {
            return tools.toCamelCase(rows[0]).imageFilename;
        }
    } catch (err) {
        errors.logSqlError(err);
    }

    return null;
};

exports.setImageFilename = async function (eventId, eventFilename) {
    const updateSQL = `UPDATE \`event\`
                       SET image_filename = ?
                       WHERE id = ?`;

    try {
        const result = await db.getPool().query(updateSQL, [eventFilename, eventId]);
        if (result[0].changedRows !== 1) {
            throw Error(`Should be exactly one petition\'s photo was modified, but it was ${result.changedRows}.`);
        }
    } catch (err) {
        errors.logSqlError(err);
        throw err;
    }
};
