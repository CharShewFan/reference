const db = require('../../config/db');
const errors = require('../services/errors');
const tools = require('../services/tools');

exports.viewAttendees = async function (eventId, isOrganizer, userId) {
    let selectSql = `SELECT user_id AS attendee_id, 
                            first_name, 
                            last_name, 
                            date_of_interest, 
                            name AS status
                      FROM \`event_attendees\` A
                        LEFT JOIN \`user\` U on A.user_id = U.id
                        LEFT JOIN \`attendance_status\` S ON A.attendance_status_id = S.id
                      WHERE event_id = ? `; 
    let values = [ eventId ];
    if (!isOrganizer) {
        if (!userId) {
            selectSql += `AND \`attendance_status_id\` = 1 `;
        } else {
            selectSql += `AND (\`attendance_status_id\` = 1 OR A.user_id = ?) `;
            values.push(userId);
        }
    }
    selectSql += `ORDER BY date_of_interest`;
    try {
        const result = await db.getPool().query(selectSql, values);
        const rows = result[0];
        return tools.toCamelCase(rows);
    } catch (err) {
        errors.logSqlError(err);
        throw err;
    }
};

exports.addAttendee = async function (eventId, attendeeId, requiresAttendanceControl, organizerId) {
    const insertSQL = `INSERT INTO \`event_attendees\` (
                           user_id, 
                           event_id, 
                           date_of_interest, 
                           attendance_status_id
                       )
                       VALUES (?, ?, ?, ?)`;

    const attendeeData = [
        attendeeId, 
        eventId, 
        new Date(),
        (!requiresAttendanceControl || (organizerId === attendeeId)) ? 1 : 2
    ];
    try {
        await db.getPool().query(insertSQL, attendeeData);
    } catch (err) {
        errors.logSqlError(err);
        throw err;
    }
};

exports.removeAttendee = async function (eventId, attendeeId) {
    const deleteSql = `DELETE
                       FROM \`event_attendees\`
                       WHERE \`user_id\` = ?
                         AND \`event_id\` = ?
                         AND \`attendance_status_id\` <> 3`;
    const attendeeData = [attendeeId, eventId];
    try {
        await db.getPool().query(deleteSql, attendeeData);
    } catch (err) {
        errors.logSqlError(err);
        throw err;
    }
};

exports.changeAttendeeStatus = async function (status, eventId, attendeeId) {
    const changeSql = `UPDATE \`event_attendees\`, \`attendance_status\`
                              SET \`attendance_status_id\` = ?
                              WHERE \`event_id\` = ? AND \`user_id\` = ?`;
    let statusVal;
    switch(status) {
        case `accepted`:
            statusVal = 1;
            break;
        case `pending`:
            statusVal = 2;
            break;
        case `rejected`:
            statusVal = 3;
            break;
        default:
            throw Error(`Invalid attendee status`);
    }
    const statusData = [statusVal, eventId, attendeeId];
    console.log(statusData);
    try {
        const result = await db.getPool().query(changeSql, statusData);
        console.log(result[0]);
        if (result[0].affectedRows > 1) {
            throw Error(`Should be exactly one attendee that was modified, but it was ${result[0].changedRows}.`);
        }
    } catch (err) {
      errors.logSqlError(err);
      throw err;
    }
}

