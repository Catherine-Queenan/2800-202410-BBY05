document.addEventListener('DOMContentLoaded', function () {
	var calendarEl = document.getElementById('calendar');
	var calendar = new FullCalendar.Calendar(calendarEl, {
		timeZone: 'local',
		initialView: 'dayGridMonth',
		headerToolbar: {
			left: 'dayGridMonth,timeGridWeek,timeGridDay,listWeek',
			center: 'title',
			right: 'prev,next today'
		},
		// windowResize: function(arg) {
		// 	alert(arg.view.type + this.style.width);
		// },
		height: 'auto',
		events: '/events'
	});
	calendar.render();
});