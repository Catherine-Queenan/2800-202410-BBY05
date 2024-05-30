// Displays the previously hidden calendar
const calendarShow = document.getElementById('calendar');
calendarShow.classList.add('whiteBackground', 'rounded');
calendarShow.classList.remove('d-none');

document.addEventListener('DOMContentLoaded', function () {
	var calendarEl = document.getElementById('calendar');
	var calendar = new FullCalendar.Calendar(calendarEl, {
		timeZone: 'local',
		initialView: 'listWeek',
		headerToolbar: {
			left: 'title',
			right: 'prev,next today'
		},
		events: '/events',
		eventColor: '#FFA05C',
		eventClick: function(info) {
			// Modal header
			modViewTitle.innerText = "Session booked for " + info.event.start.toLocaleDateString("en-CA");

			// Original Event values
			let modTitle = info.event.title;
			let modStartOrig = info.event.start;
			let modEndOrig = info.event.end;

			// Fields to edit
			let modStartHH = info.event.start.toLocaleString([], {hour:"2-digit", hour12:false}).padStart(2, '0');
			let modStartMM = info.event.start.toLocaleString([], {minute:"2-digit"}).padStart(2, '0');
			let modEndHH = info.event.end.toLocaleString([], {hour:"2-digit", hour12:false}).padStart(2, '0');
			let modEndMM = info.event.end.toLocaleString([], {minute:"2-digit"}).padStart(2, '0');

			let eventPassed = false; // If Event has passed

			// This will fill the modal with the event info
			let modalBody = `
			<div class="mb-3">
				<label for="calModTitle" class="form-label h5 modal-heading">Session Title</label>
				<input type="text" class="form-control d-none" name="calOrSess" value="session">
				<input type="text" class="form-control d-none" name="calModEventID" id="calModEventID">
				<input type="text" class="form-control d-none" name="eventPassed" id="eventPassed" value=${eventPassed}>
				<input type="text" class="form-control d-none" name="calModDate" value="${info.event.start.toLocaleDateString("en-CA")}">
				<input type="text" class="form-control d-none" name="calModTitleOrig" id="calModTitleOrig" value="${modTitle}">
				<input type="text" class="form-control d-none" name="calModStartOrig" id="calModStartOrig" value="${formatDate(modStartOrig)}">
				<input type="text" class="form-control d-none" name="calModEndOrig" id="calModEndOrig" value="${formatDate(modEndOrig)}">
				<input type="text" class="form-control auto-resize text-center" disabled name="calModTitle" id="calModTitle" value="${modTitle}">
			</div>

			<div class="mb-3">
				<label for="calModEmail" class="form-label h5 modal-heading">Client</label>
				<input type="text" class="form-control-plaintext d-none" name="calModEmailOrig" id="calModEmailOrig">
				<select class="form-select" disabled name="calModEmail" id="calModEmail">
					<option selected id="selectedClient"></option>
				<select>
			</div>

			<div class="mb-3">
				<label for="calModStart" class="form-label h5 modal-heading">Start Time</label>
				<div class="input-group" id="calModStart">
					<select class="form-select" disabled name="calModStartHH" id="calModStartHH">
						<option selected>${modStartHH}</option>
						<option value="00">0</option><option value="01">1</option><option value="02">2</option><option value="03">3</option>
						<option value="04">4</option><option value="05">5</option><option value="06">6</option><option value="07">7</option>
						<option value="08">8</option><option value="09">9</option><option value="10">10</option><option value="11">11</option>
						<option value="12">12</option><option value="13">13</option><option value="14">14</option><option value="15">15</option>
						<option value="16">16</option><option value="17">17</option><option value="18">18</option><option value="19">19</option>
						<option value="20">20</option><option value="21">21</option><option value="22">22</option><option value="23">23</option>
					</select>
					<span class="input-group-text">:</span>
					<select class="form-select" disabled name="calModStartMM" id="calModStartMM">
						<option selected>${modStartMM}</option>
						<option value="00">00</option>
						<option value="15">15</option>
						<option value="30">30</option>
						<option value="45">45</option>
					</select>
				</div>
			</div>
			<div class="mb-3">
				<label for="calModEnd" class="form-label h5 modal-heading">End Time</label>
				<div class="input-group" id="calModEnd">
					<select class="form-select" disabled name="calModEndHH" id="calModEndHH">
						<option selected>${modEndHH}</option>
						<option value="00">0</option><option value="01">1</option><option value="02">2</option><option value="03">3</option>
						<option value="04">4</option><option value="05">5</option><option value="06">6</option><option value="07">7</option>
						<option value="08">8</option><option value="09">9</option><option value="10">10</option><option value="11">11</option>
						<option value="12">12</option><option value="13">13</option><option value="14">14</option><option value="15">15</option>
						<option value="16">16</option><option value="17">17</option><option value="18">18</option><option value="19">19</option>
						<option value="20">20</option><option value="21">21</option><option value="22">22</option><option value="23">23</option>
					</select>
					<span class="input-group-text">:</span>
					<select class="form-select" disabled name="calModEndMM" id="calModEndMM">
						<option selected>${modEndMM}</option>
						<option value="00">00</option>
						<option value="15">15</option>
						<option value="30">30</option>
						<option value="45">45</option>
					</select>
				</div>
			</div>

			<div class="mb-3">
				<label for="calModInfo" class="form-label h5 modal-heading">Info</label>
				<div class="input-group">
					<input type="text" class="form-control d-none" name="calModInfoOrig" id="calModInfoOrig">
					<textarea class="form-control auto-resize text-center" disabled name="calModInfo" id="calModInfo"></textarea>
				</div>
			</div>
				
			<div class="mb-3 d-none" id="notesDiv">
				<label for="calModNotes" class="form-label h5 modal-heading">Post Session Notes</label>
				<div class="input-group">
					<input type="text" class="form-control d-none" name="calModNotesOrig" id="calModNotesOrig">
					<textarea class="form-control auto-resize text-center" disabled name="calModNotes" id="calModNotes"></textarea>
				</div>
			</div>

			<div class="modal-footer">
				<div class="row" style="width: 100%;">
					<button type="button" class="btn btn-danger mb-3" data-bs-dismiss="modal">Cancel</button>
					<button type="button" id="calModEdit" class="btn btn-secondary mb-3">Edit</button>
					<button formaction="/removeEvent" id="deleteButton" class="btn btn-danger mb-3 d-none">Delete</button>
					<button formaction="/updateEvent" id="saveButton" class="btn btn-primary mb-3 d-none">Save changes</button>
				</div>
			</div>
			`;

			// Add the above HTML into the modal
			modBod.innerHTML = modalBody;

			async function getClients() {
				try {
					let res = await axios.post('/getClients');
					let clients = res.data;

					let emails = document.getElementById('calModEmail');
					if (clients && clients.length > 0) {
						for (let i = 0; i < clients.length; i++) {
							let clientItem = document.createElement('option');
							clientItem.innerText = clients[i].email;
							emails.appendChild(clientItem);
						}
					}
				} catch (error) {
					console.error(error);
				}
			}
			getClients();

			// The following code is to check if this session has already passed
			const notesDiv = document.getElementById("notesDiv");

			function checkDate() {
				const today = new Date();
				const thisEndDate = new Date(modEndOrig);
				if (today > thisEndDate) {
					eventPassed = true;
					const eventPassedDiv = document.getElementById('eventPassed');
					eventPassedDiv.value = true;
					notesDiv.classList.remove('d-none');
				}
			}
			checkDate();

			// Containing all above buttons and input fields in variables
			let editButton = document.getElementById("calModEdit");
			let deleteButton = document.getElementById("deleteButton");
			let saveButton = document.getElementById("saveButton");
			let calModTitleEdit = document.getElementById("calModTitle");
			let calModEmailEdit = document.getElementById("calModEmail");
			let calModStartHHEdit = document.getElementById("calModStartHH");
			let calModStartMMEdit = document.getElementById("calModStartMM");
			let calModEndHHEdit = document.getElementById("calModEndHH");
			let calModEndMMEdit = document.getElementById("calModEndMM");
			let calModInfoEdit = document.getElementById("calModInfo");
			let calModNotesEdit = document.getElementById("calModNotes");

			editButton.addEventListener("click", onEditClick, false);

			// Enables editing
			function onEditClick() {
				if (!eventPassed) {
					calModTitleEdit.removeAttribute("disabled");
					calModEmailEdit.removeAttribute("disabled");
					calModStartHHEdit.removeAttribute("disabled");
					calModStartMMEdit.removeAttribute("disabled");
					calModEndHHEdit.removeAttribute("disabled");
					calModEndMMEdit.removeAttribute("disabled");
					calModInfoEdit.removeAttribute("disabled");
					deleteButton.classList.remove("d-none");					
				} else {
					calModNotesEdit.removeAttribute("disabled");
				}
				editButton.classList.add("d-none");
				saveButton.classList.remove("d-none");
				validateForm();
			}

			// This function checks the form and disables the save button if end time < start time
			// And if all fields besides Info are empty
			function validateForm() {
				const title = calModTitleEdit.value.trim();
				const email = calModEmailEdit.value;
				const startHH = parseInt(calModStartHHEdit.value, 10);
				const startMM = parseInt(calModStartMMEdit.value, 10);
				const endHH = parseInt(calModEndHHEdit.value, 10);
				const endMM = parseInt(calModEndMMEdit.value, 10);

				const startTime = startHH * 60 + startMM;
				const endTime = endHH * 60 + endMM;

				const isTitleValid = title !== '';
				const isEmailValid = email !== '';
				const isTimeValid = endTime > startTime;

				saveButton.disabled = !(isTitleValid && isEmailValid && isTimeValid);
			}

			// Event listeners for the above function
			calModTitleEdit.addEventListener('input', validateForm, false);
			calModEmailEdit.addEventListener('change', validateForm, false);
			calModStartHHEdit.addEventListener('change', validateForm, false);
			calModStartMMEdit.addEventListener('change', validateForm, false);
			calModEndHHEdit.addEventListener('change', validateForm, false);
			calModEndMMEdit.addEventListener('change', validateForm, false);

			validateForm();

			// Getting extra info from database
			let titleOrig = document.getElementById('calModTitle').value;
			let startOrig = document.getElementById('calModStartOrig').value;
			let endOrig = document.getElementById('calModEndOrig').value;

			let thisEvent, eventID, eventEmail, eventInfo, eventNotes;
			function getThisEvent() {

				$.ajax({
					url: '/getThisEvent',
					type: 'POST',
					contentType: 'application/json',
					data: JSON.stringify({
						title: titleOrig,
						start: startOrig,
						end: endOrig
					}),
					success: function(res) {
						thisEvent = res;
						eventID = thisEvent[0]._id;
						eventEmail = thisEvent[0].client;
						eventInfo = thisEvent[0].info;
						eventNotes = thisEvent[0].notes;
						// From database
						let modEventID = document.getElementById('calModEventID');
						let modEmailOrig = document.getElementById('calModEmailOrig');
						let modEmail = document.getElementById('selectedClient');
						let modInfoOrig = document.getElementById('calModInfoOrig');
						let modInfo = document.getElementById('calModInfo');
						let modNotesOrig = document.getElementById('calModNotesOrig');
						let modNotes = document.getElementById('calModNotes');

						modEventID.setAttribute('value', eventID);
						modEmailOrig.setAttribute('value', eventEmail);
						modEmail.setAttribute('value', eventEmail);
						modEmail.innerText = eventEmail;
						modInfoOrig.setAttribute('value', eventInfo);
						modInfo.innerText = eventInfo;
						modNotesOrig.setAttribute('value', eventNotes);
						modNotes.innerText = eventNotes;
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

	// Code for client filter
	const filter = document.getElementById('clientFilter');

	async function getFilterClients() {
		try {
			let res = await axios.post('/getClients');
			let clients = res.data;

			if (clients && clients.length > 0) {
				for (let i = 0; i < clients.length; i++) {
					let clientItem = document.createElement('option');
					clientItem.innerText = clients[i].email;
					filter.appendChild(clientItem);
				}
			}
		} catch (error) {
			console.error(error);
		}
	}
	getFilterClients();

	filter.addEventListener('change', filterClients, false);

	async function filterClients() {
		let filteredEvents;
		let selectedClient = filter.value;
		if (selectedClient == '') {
			try {
				let res = await axios.get('/events');
				filteredEvents = res.data;
				const eventSource = calendar.getEventSources();
				eventSource[0].remove();
				calendar.addEventSource(filteredEvents);
				calendar.render();
			} catch (error) {
				console.error(error);
			}
		} else {
			try {
				let res = await axios.post('/filteredEvents', {data: selectedClient});
				filteredEvents = res.data;
				const eventSource = calendar.getEventSources();
				eventSource[0].remove();
				calendar.addEventSource(filteredEvents);
				calendar.render();
			} catch (error) {
				console.error(error);
			}
		}
	}
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
