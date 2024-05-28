// Displays the previously hidden sessionList
const sessionListShow = document.getElementById('sessionList');
sessionListShow.classList.add('bg-light', 'py-3', 'rounded');
sessionListShow.classList.remove('d-none');

document.addEventListener('DOMContentLoaded', function () {
	var calendarEl = document.getElementById('sessionList');
	var calendar = new FullCalendar.Calendar(calendarEl, {
		timeZone: 'local',
		initialView: 'listWeek',
		headerToolbar: {
			left: 'title',
			right: 'prev,next today'
		},
		events: '/events',
		eventColor: '#FFA05C'

	});
	calendar.render();
});

// Displays the previously hidden calendar
const calendarShow = document.getElementById('calendar');
calendarShow.classList.add('bg-light', 'py-3', 'rounded');
calendarShow.classList.remove('d-none');

document.addEventListener('DOMContentLoaded', function () {
	var calendarEl = document.getElementById('calendar');
	var calendar = new FullCalendar.Calendar(calendarEl, {
		timeZone: 'local',
		initialView: 'dayGridMonth',
		headerToolbar: {
			left: 'title',
			right: 'prev,next today'
		},
		events: '/events',
		eventColor: '#FFA05C'

	});
	calendar.render();
});