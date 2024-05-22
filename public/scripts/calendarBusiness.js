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

			// This will fill the modal with the event info
			let modalBody = `
			<div class="mb-3">
				<label for="calModTitle" class="form-label">Session Title</label>
				<input type="text" class="form-control-plaintext d-none" name="calModEventID" id="calModEventID">
				<input type="text" class="form-control-plaintext d-none" name="calModDate" value="${info.event.start.toLocaleDateString("en-CA")}">
				<input type="text" class="form-control-plaintext d-none" name="calModTitleOrig" id="calModTitleOrig" value="${modTitle}">
				<input type="text" class="form-control-plaintext d-none" name="calModStartOrig" id="calModStartOrig" value="${formatDate(modStartOrig)}">
				<input type="text" class="form-control-plaintext d-none" name="calModEndOrig" id="calModEndOrig" value="${formatDate(modEndOrig)}">
				<input type="text" class="form-control-plaintext" name="calModTitle" id="calModTitle" value="${modTitle}">
			</div>

			<div class="mb-3">
				<label for="calModEmail" class="form-label">Client</label>
				<input type="text" class="form-control-plaintext d-none" name="calModEmailOrig" id="calModEmailOrig">
				<select class="form-select" disabled name="calModEmail" id="calModEmail">
					<option selected id="selectedClient"></option>
				<select>
			</div>

			<div class="mb-3">
				<label for="calModStart" class="form-label">Start Time</label>
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
					<span class="input-group-text">:00</span>
				</div>
			</div>
			<div class="mb-3">
				<label for="calModEnd" class="form-label">End Time</label>
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
					<span class="input-group-text">:00</span>
				</div>
			</div>

			<div class="mb-3">
				<label for="calModInfo" class="form-label">Info</label>
				<div class="input-group">
					<input type="text" class="form-control-plaintext d-none" name="calModInfoOrig" id="calModInfoOrig">
					<textarea class="form-control-plaintext" name="calModInfo" id="calModInfo"></textarea>
				</div>
			</div>
				
			</div>

			<div class="modal-footer">
				<div class="row">
					<button type="button" class="btn btn-danger mb-3" data-bs-dismiss="modal">Cancel</button>
					<button type="button" id="calModEdit" class="btn btn-secondary mb-3">Edit</button>
					<button formaction="/removeEvent" id="deleteButton" disabled class="btn btn-danger mb-3">Delete</button>
					<button formaction="/updateEvent" id="saveButton" disabled class="btn btn-primary mb-3">Save changes</button>
				</div>
			</div>
			`;

			// Add the above HTML into the modal
			modBod.innerHTML = modalBody;

			async function getClients() {
				try {
					let res = await axios.post('/getClients');
					let clients = res.data;
					console.log("clients: " + clients);

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

			editButton.addEventListener("click", onEditClick, false);

			// Enables editing
			function onEditClick() {
				modal.show();
				calModTitleEdit.classList.remove("form-control-plaintext");
				calModTitleEdit.classList.add("form-control");
				calModEmailEdit.removeAttribute("disabled");
				calModStartHHEdit.removeAttribute("disabled");
				calModStartMMEdit.removeAttribute("disabled");
				calModEndHHEdit.removeAttribute("disabled");
				calModEndMMEdit.removeAttribute("disabled");
				calModInfoEdit.classList.remove("form-control-plaintext");
				calModInfoEdit.classList.add("form-control");
				deleteButton.removeAttribute("disabled");
				saveButton.removeAttribute("disabled");
			}

			// Getting extra info from database
			let titleOrig = document.getElementById('calModTitle').value;
			let startOrig = document.getElementById('calModStartOrig').value;
			let endOrig = document.getElementById('calModEndOrig').value;

			console.log(titleOrig);
			console.log(startOrig);
			console.log(endOrig);

			let thisEvent, eventID, eventEmail, eventInfo;
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
						console.log("This Event: ", thisEvent);
						eventID = thisEvent[0]._id;
						eventEmail = thisEvent[0].client;
						eventInfo = thisEvent[0].info;
						console.log('id', eventID);
						console.log('email', eventEmail);
						console.log('info', eventInfo);
						// From database
						let modEventID = document.getElementById('calModEventID');
						let modEmailOrig = document.getElementById('calModEmailOrig');
						let modEmail = document.getElementById('selectedClient');
						let modInfoOrig = document.getElementById('calModInfoOrig');
						let modInfo = document.getElementById('calModInfo');

						modEventID.setAttribute('value', eventID);
						modEmailOrig.setAttribute('value', eventEmail);
						modEmail.setAttribute('value', eventEmail);
						modEmail.innerText = eventEmail;
						modInfoOrig.setAttribute('value', eventInfo);
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
			modViewTitle.innerText = 'Add a session for '+info.date.toLocaleDateString("en-CA");
			var selectedDate = info.date.toLocaleDateString("en-CA");
			var modalBody = `
			<label for="calModTitle" class="form-label">Title of session</label>
			<input type="text" class="form-control" name="calModTitle" id="calModTitle">
			<input type="text" class="form-control-plaintext d-none" name="calModDate" value="${selectedDate}">
			<div class="mb-3">
				<label for="calModStart" class="form-label">Start Time</label>
				<div class="input-group" id="calModStart">
					<select class="form-select" name="calModStartHH">
						<option selected>00</option><option value="01">1</option><option value="02">2</option><option value="03">3</option>
						<option value="04">4</option><option value="05">5</option><option value="06">6</option><option value="07">7</option>
						<option value="08">8</option><option value="09">9</option><option value="10">10</option><option value="11">11</option>
						<option value="12">12</option><option value="13">13</option><option value="14">14</option><option value="15">15</option>
						<option value="16">16</option><option value="17">17</option><option value="18">18</option><option value="19">19</option>
						<option value="20">20</option><option value="21">21</option><option value="22">22</option><option value="23">23</option>
					</select>
					<span class="input-group-text">:</span>
					<select class="form-select" name="calModStartMM">
						<option selected>00</option>
						<option value="15">15</option>
						<option value="30">30</option>
						<option value="45">45</option>
					</select>
					<span class="input-group-text">:00</span>
				</div>		
			</div>

			<div class="mb-3">
				<label for="calModEnd" class="form-label">End Time</label>
				<div class="input-group" id="calModEnd">
					<select class="form-select" name="calModEndHH">
						<option selected>00</option><option value="01">1</option><option value="02">2</option><option value="03">3</option>
						<option value="04">4</option><option value="05">5</option><option value="06">6</option><option value="07">7</option>
						<option value="08">8</option><option value="09">9</option><option value="10">10</option><option value="11">11</option>
						<option value="12">12</option><option value="13">13</option><option value="14">14</option><option value="15">15</option>
						<option value="16">16</option><option value="17">17</option><option value="18">18</option><option value="19">19</option>
						<option value="20">20</option><option value="21">21</option><option value="22">22</option><option value="23">23</option>
					</select>
					<span class="input-group-text">:</span>
					<select class="form-select" name="calModEndMM">
						<option selected>00</option>
						<option value="15">15</option>
						<option value="30">30</option>
						<option value="45">45</option>
					</select>
					<span class="input-group-text">:00</span>
				</div>
			</div>

			<div class="mb-3">
				<label for="calModClient" class="form-label">Client</label>
				<div class="input-group">
					<select class="form-select" id="calModClient" name="calModClient">
					</select>
				</div>
			</div>

			<div class="mb-3">
				<label for="calModInfo" class="form-label">Info</label>
				<div class="input-group">
					<textarea class="form-control" name="calModInfo" id="calModInfo"></textarea>
				</div>
			</div>

			<div class="modal-footer align-items-center">
				<button type="button" class="btn btn-danger" data-bs-dismiss="modal">Cancel</button>
				<button formaction="/addEvent" class="btn btn-primary">Add Session</button>
			</div>
			`;
			modBod.innerHTML = modalBody;

			async function getClients() {
				try {
					let res = await axios.post('/getClients');
					let clients = res.data;
					console.log("clients: " + clients);

					let modClient = document.getElementById('calModClient');
					if (clients && clients.length > 0) {
						for (let i = 0; i < clients.length; i++) {
							let clientItem = document.createElement('option');
							clientItem.innerText = clients[i].email;
							modClient.appendChild(clientItem);
						}
					}
				} catch (error) {
					console.error(error);
				}
			}
			getClients();

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