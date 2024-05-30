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
				<input type="text" class="form-control auto-resize text-center" disabled name="calModTitle" id="calModTitle" value="${modTitle}">
			</div>

			<div class="mb-3">
				<label for="calModTrainer" class="form-label h3 modal-heading">Trainer</label>
				<input type="text" class="form-control auto-resize text-center" disabled name="calModTrainer" id="calModTrainer">
			</div>

			<div class="mb-3">
				<label for="calModStart" class="form-label h3 modal-heading">Start Time</label>
				<input type="text" class="form-control auto-resize text-center" disabled name="calModStart" id="calModStart" value="${modStartTime}">
			</div>

			<div class="mb-3">
				<label for="calModEnd" class="form-label h3 modal-heading">End Time</label>
				<input type="text" class="form-control auto-resize text-center" disabled name="calModEnd" id="calModEnd" value="${modEndTime}">
			</div>

			<div class="mb-3">
				<label for="calModInfo" class="form-label h3 modal-heading">Info</label>
				<div class="input-group">
					<textarea class="form-control auto-resize text-center" disabled name="calModInfo" id="calModInfo"></textarea>
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
		},
		dateClick: function(info) {

			// Modal header
			modViewTitle.innerText = 'Request a session for '+info.date.toLocaleDateString("en-CA");
			var selectedDate = info.date.toLocaleDateString("en-CA");
			var modalBody = `
			<div class="mb-3">
				<label for="calModTitle" class="form-label h5 modal-heading">Session Title</label>
				<input type="text" class="form-control auto-resize" name="calModTitle" id="calModTitle">
				<input type="text" class="form-control-plaintext d-none" name="calModDate" value="${selectedDate}">
			</div>

			<div class="mb-3">
				<label for="calModStart" class="form-label h5 modal-heading">Start Time</label>
				<div class="input-group" id="calModStart">
					<select class="form-select" name="calModStartHH" id="calModStartHH">
						<option selected>00</option><option value="01">1</option><option value="02">2</option><option value="03">3</option>
						<option value="04">4</option><option value="05">5</option><option value="06">6</option><option value="07">7</option>
						<option value="08">8</option><option value="09">9</option><option value="10">10</option><option value="11">11</option>
						<option value="12">12</option><option value="13">13</option><option value="14">14</option><option value="15">15</option>
						<option value="16">16</option><option value="17">17</option><option value="18">18</option><option value="19">19</option>
						<option value="20">20</option><option value="21">21</option><option value="22">22</option><option value="23">23</option>
					</select>
					<span class="input-group-text whiteBackground">:</span>
					<select class="form-select" name="calModStartMM" id="calModStartMM">
						<option selected>00</option>
						<option value="15">15</option>
						<option value="30">30</option>
						<option value="45">45</option>
					</select>
				</div>		
			</div>

			<div class="mb-3">
				<label for="calModEnd" class="form-label h5 modal-heading">End Time</label>
				<div class="input-group" id="calModEnd">
					<select class="form-select" name="calModEndHH" id="calModEndHH">
						<option selected>00</option><option value="01">1</option><option value="02">2</option><option value="03">3</option>
						<option value="04">4</option><option value="05">5</option><option value="06">6</option><option value="07">7</option>
						<option value="08">8</option><option value="09">9</option><option value="10">10</option><option value="11">11</option>
						<option value="12">12</option><option value="13">13</option><option value="14">14</option><option value="15">15</option>
						<option value="16">16</option><option value="17">17</option><option value="18">18</option><option value="19">19</option>
						<option value="20">20</option><option value="21">21</option><option value="22">22</option><option value="23">23</option>
					</select>
					<span class="input-group-text whiteBackground">:</span>
					<select class="form-select" name="calModEndMM" id="calModEndMM">
						<option selected>00</option>
						<option value="15">15</option>
						<option value="30">30</option>
						<option value="45">45</option>
					</select>
				</div>
			</div>

			<div class="mb-3">
				<label for="calModTrainerPlaceholder" class="form-label h5 modal-heading">Trainer</label>
				<div class="input-group">
					<input type="text" class="form-control text-center d-none" id="calModTrainer" name="calModTrainer">
					<input type="text" class="form-control auto-resize text-center" disabled id="calModTrainerPlaceholder" name="calModTrainerPlaceholder">
				</div>
			</div>

			<div class="mb-3">
				<label for="calModInfo" class="form-label h5 modal-heading">Info</label>
				<div class="input-group">
					<textarea class="form-control auto-resize" name="calModInfo" id="calModInfo"></textarea>
				</div>
			</div>

			<div class="modal-footer">
				<button type="button" class="btn btn-danger" data-bs-dismiss="modal">Cancel</button>
				<button formaction="/requestEvent" class="btn btn-primary" id="reqButton">Request Session</button>
			</div>
			`;
			modBod.innerHTML = modalBody;

			async function getTrainer() {
				try {
					let res = await axios.post('/getTrainer');
					let trainer = res.data;
					
					let modTrainer = document.getElementById("calModTrainer");
					let modTrainerPlaceholder = document.getElementById("calModTrainerPlaceholder");
					if (trainer) {
						modTrainer.value = trainer;
						modTrainerPlaceholder.value = trainer;
					}
				} catch (error) {
					console.error(error);
				}
			}
			getTrainer();

			const titleInput = document.getElementById('calModTitle');
			const trainerInput = document.getElementById('calModTrainer');
			const startHHSelect = document.getElementById('calModStartHH');
			const startMMSelect = document.getElementById('calModStartMM');
			const endHHSelect = document.getElementById('calModEndHH');
			const endMMSelect = document.getElementById('calModEndMM');
			const reqButton = document.getElementById('reqButton');

			function validateForm() {
				const title = titleInput.value.trim();
				const trainer = trainerInput.value.trim();
				const startHH = parseInt(startHHSelect.value, 10);
				const startMM = parseInt(startMMSelect.value, 10);
				const endHH = parseInt(endHHSelect.value, 10);
				const endMM = parseInt(endMMSelect.value, 10);
		
				const startTime = startHH * 60 + startMM;
				const endTime = endHH * 60 + endMM;
		
				const isTitleValid = title !== '';
				const isTrainerValid = trainer !== '';
				const isTimeValid = endTime > startTime;
		
				reqButton.disabled = !(isTitleValid && isTrainerValid && isTimeValid);
			}

			// Event listeners for form validation
			titleInput.addEventListener('input', validateForm);
			startHHSelect.addEventListener('change', validateForm);
			startMMSelect.addEventListener('change', validateForm);
			endHHSelect.addEventListener('change', validateForm);
			endMMSelect.addEventListener('change', validateForm);

			// Initial validation check
			validateForm();

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