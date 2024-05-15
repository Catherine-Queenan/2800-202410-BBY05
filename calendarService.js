const { google } = require('googleapis');
require('dotenv').config();

// Configuration for super secret stuff
const CREDENTIALS = JSON.parse(process.env.CREDENTIALS);
const SCOPES = 'https://www.googleapis.com/auth/calendar';
const calendarId = process.env.CALENDAR_ID;
const calendar = google.calendar({version: "v3"});
const auth = new google.auth.JWT(
    CREDENTIALS.client_email,
    null,
    CREDENTIALS.private_key,
    SCOPES
);
//End of super secret stuff

// Helper function to get date-time string for calendar
const dateTimeForCalendar = () => {
    const date = new Date();
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const hour = date.getHours().toString().padStart(2, '0');
    const minute = date.getMinutes().toString().padStart(2, '0');
    const newDateTime = `${year}-${month}-${day}T${hour}:${minute}:00`;

    const event = new Date(newDateTime);
    const startDate = event;
    const endDate = new Date(startDate.getTime() + 60 * 60 * 1000); // Adds 1 hour to the start date

    return {
        start: startDate.toISOString(),
        end: endDate.toISOString()
    };
};

// Function to insert a new event
async function insertEvent(eventDetails) {
    const { summary, description } = eventDetails;
    const dateTime = dateTimeForCalendar();

    const event = {
        summary,
        description,
        start: {
            dateTime: dateTime.start,
            timeZone: 'America/Vancouver'
        },
        end: {
            dateTime: dateTime.end,
            timeZone: 'America/Vancouver'
        }
    };

    try {
        const response = await calendar.events.insert({
            auth,
            calendarId,
            resource: event
        });
        return response.status === 200;
    } catch (error) {
        console.error(`Error at insertEvent --> ${error}`);
        return false;
    }
};

// Function to get all events between two dates
async function getEvents(dateTimeStart, dateTimeEnd) {
    try {
        const response = await calendar.events.list({
            auth,
            calendarId,
            timeMin: dateTimeStart,
            timeMax: dateTimeEnd,
            timeZone: 'America/Vancouver',
            singleEvents: true,
            orderBy: 'startTime'
        });
        return response.data.items;
    } catch (error) {
        console.error(`Error at getEvents --> ${error}`);
        return [];
    }
};

// Function to delete an event
async function deleteEvent(eventId) {
    try {
        const response = await calendar.events.delete({
            auth,
            calendarId,
            eventId
        });
        return response.data === '';
    } catch (error) {
        console.error(`Error at deleteEvent --> ${error}`);
        return false;
    }
};

module.exports = {
    insertEvent,
    getEvents,
    deleteEvent
};
