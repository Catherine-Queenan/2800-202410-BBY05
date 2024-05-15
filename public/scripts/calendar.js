require("./index.js");
document.addEventListener('DOMContentLoaded', function () {
	var calendarEl = document.getElementById('calendar');
	var calendar = new FullCalendar.Calendar(calendarEl, {
		initialView: 'dayGridMonth'
	});
	var userEvents = getUserEvents();
	calendar.addEventSource(userEvents);
	calendar.render();
});

async function getUserEvents() {
	var userEvents = await userdb.collection('eventSource').find().project({ title: 1, start: 1, end: 1 }).toArray();
	console.log(userEvents)
	return userEvents;
}