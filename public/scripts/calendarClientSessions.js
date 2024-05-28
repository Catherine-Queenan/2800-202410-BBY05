document.addEventListener('DOMContentLoaded', function () {
	var calendarEl = document.getElementById('calendar');
	var calendar = new FullCalendar.Calendar(calendarEl, {
		timeZone: 'local',
		initialView: 'listWeek',
		headerToolbar: {
			left: 'title',
			right: 'prev,next today'
		},
		aspectRatio: 1,
		contentHeight: 'auto',
		events: '/events',
		eventColor: '#FFA05C',
		eventClick: function(info) {
			// Modal header
			modViewTitle.innerText = "Session booked for " + info.event.start.toLocaleDateString("en-CA");

			// Event Values
			let modTitle = info.event.title;
			let modStart = formatDate(info.event.start);
			let modStartTime = info.event.start.toLocaleString([], {hour:"2-digit",hour12:false,minute:"2-digit"});
			let modEnd = formatDate(info.event.end);
			let modEndTime = info.event.end.toLocaleString([], {hour:"2-digit",hour12:false,minute:"2-digit"});

			// This will fill the modal with the event info
			let modalBody = `
			<div class="mb-3">
				<label for="calModTitle" class="form-label h3 modal-heading">Session Title</label>
				<input type="text" class="form-control text-center" disabled name="calModTitle" id="calModTitle" value="${modTitle}">
			</div>

			<div class="mb-3">
				<label for="calModTrainer" class="form-label h3 modal-heading">Trainer</label>
				<input type="text" class="form-control text-center" disabled name="calModTrainer" id="calModTrainer">
			</div>

			<div class="mb-3">
				<label for="calModStart" class="form-label h3 modal-heading">Start Time</label>
				<input type="text" class="form-control text-center" disabled name="calModStart" id="calModStart" value="${modStartTime}">
			</div>

			<div class="mb-3">
				<label for="calModEnd" class="form-label h3 modal-heading">End Time</label>
				<input type="text" class="form-control text-center" disabled name="calModEnd" id="calModEnd" value="${modEndTime}">
			</div>

			<div class="mb-3">
				<label for="calModInfo" class="form-label h3 modal-heading">Info</label>
				<div class="input-group">
					<textarea class="form-control text-center" disabled name="calModInfo" id="calModInfo"></textarea>
				</div>
			</div>

			<div class="modal-footer">
				<button type="button" class="btn btn-danger" data-bs-dismiss="modal">Close</button>
			</div>
			`;

			// Add the above HTML into the modal
			modBod.innerHTML = modalBody;

			let thisEvent, eventID, eventTrainer, eventInfo;
			function getThisEvent() {
				$.ajax({
					url: '/getThisEvent',
					type: 'POST',
					contentType: 'application/json',
					data: JSON.stringify({
						title: modTitle,
						start: modStart,
						end: modEnd
					}),
					success: function(res) {
						thisEvent = res;
						eventID = thisEvent[0]._id;
						eventTrainer = thisEvent[0].trainer;
						eventInfo = thisEvent[0].info;
						// From database
						let modTrainer = document.getElementById('calModTrainer');
						let modInfo = document.getElementById('calModInfo');

						modTrainer.setAttribute('value', eventTrainer);
						modInfo.innerText = eventInfo;
					},
					error: function(xhr, status, error) {
						console.error("Error: ", error);
					}
				});
			}
			getThisEvent();

			modal.show();
		}
	});
	calendar.render();
});

// Grabs the modal from /calendar
const modal = new bootstrap.Modal(document.getElementById("calendarModal"));
const modViewTitle = document.getElementById("calModViewTitle");
const modBod = document.getElementById("calModBod");

// This is a format that FullCalendar likes
function formatDate(date) {
	var year = date.getFullYear();
	var month = ('0' + (date.getMonth() + 1)).slice(-2);
	var day = ('0' + date.getDate()).slice(-2);
	var hours = ('0' + date.getHours()).slice(-2);
	var minutes = ('0' + date.getMinutes()).slice(-2);
	var seconds = ('0' + date.getSeconds()).slice(-2);
	return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
}