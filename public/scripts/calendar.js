document.addEventListener('DOMContentLoaded', function () {
	var calendarEl = document.getElementById('calendar');
	var calendar = new FullCalendar.Calendar(calendarEl, {
		timeZone: 'local',
		initialView: 'dayGridMonth',
		headerToolbar: {
			left: 'dayGridMonth, timeGridWeek, timeGridDay',
			center: 'title',
			right: 'prev,next today'
		},
		events: '/events',
		eventClick: function(info) {
			// var modDate = document.getElementById("calModDate");
			modDate.innerText = info.view.title;

			// var modBod = document.getElementById("calModBod");
			var modTitle = info.event.title;
			var modStart = formatDate(info.event.start);
			var modEnd = formatDate(info.event.end);
			var modalBody = `
			<input type="text" readonly class="form-control-plaintext" name="calModTitle" value="${modTitle}">
			<input type="text" readonly class="form-control-plaintext" name="calModStart" value="${modStart}">
			<input type="text" readonly class="form-control-plaintext" name="calModEnd" value="${modEnd}">
			</div>

			<div class="modal-footer">
				<button class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
				<button formaction="/removeEvent" class="btn btn-danger">Delete</button>
				<button formaction="/updateEvent" class="btn btn-success">Save changes</button>
			</div>
			`;
			modBod.innerHTML = modalBody;
			modal.show();
		},
		dateClick: function(info) {
			modDate.innerText = info.view.title;
			var selectedDate = formatDate(info.date);
			var modalBody = `
			Add a new session for ${selectedDate}
			<input type="text" class=form-control name="calModTitle" label="Title of session">
			</div>

			<div class="modal-footer">
				<button class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
				<button formaction="/addEvent" class="btn btn-success">Add Session</button>
			</div>
			`;
			modBod.innerHTML = modalBody;
			modal.show();
		}
	});
	calendar.render();
});

const modal = new bootstrap.Modal(document.getElementById("calendarModal"));
const modDate = document.getElementById("calModDate");
const modBod = document.getElementById("calModBod");
// modal.addEventListener("shown.bs.modal", () => {
// 	myInput.focus();
// });

function formatDate(date) {
	var year = date.getFullYear();
	var month = ('0' + (date.getMonth() + 1)).slice(-2);
	var day = ('0' + date.getDate()).slice(-2);
	var hours = ('0' + date.getHours()).slice(-2);
	var minutes = ('0' + date.getMinutes()).slice(-2);
	var seconds = ('0' + date.getSeconds()).slice(-2);
	return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
}