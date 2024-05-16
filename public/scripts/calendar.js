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
		events: '/events',
		eventClick: function(info) {
			// var modDate = document.getElementById("calModDate");
			modViewTitle.innerText = "Session booked for " + info.event.start.toLocaleDateString("en-CA");

			// var modBod = document.getElementById("calModBod");
			var modTitle = info.event.title;
			var modStartOrig = info.event.start;
			var modStartHH = info.event.start.toLocaleString([], {hour:"2-digit", hour12:false}).padStart(2, '0');
			var modStartMM = info.event.start.toLocaleString([], {minute:"2-digit"}).padStart(2, '0');
			var modEndOrig = info.event.end;
			var modEndHH = info.event.end.toLocaleString([], {hour:"2-digit", hour12:false}).padStart(2, '0');
			var modEndMM = info.event.start.toLocaleString([], {minute:"2-digit"}).padStart(2, '0');
			var modalBody = `
			<label for="calModTitle" class="form-label">Session Title</label>
			<input type="text" class="form-control-plaintext d-none" name="calModDate" value="${info.event.start.toLocaleDateString("en-CA")}">
			<input type="text" class="form-control-plaintext d-none" name="calModTitleOrig" value="${modTitle}">
			<input type="text" class="form-control-plaintext d-none" name="calModStartOrig" value="${formatDate(modStartOrig)}">
			<input type="text" class="form-control-plaintext d-none" name="calModEndOrig" value="${formatDate(modEndOrig)}">
			<input type="text" class="form-control-plaintext" name="calModTitle" id="calModTitle" value="${modTitle}">
			<div class="mb-3">
				<label for="calModStart" class="form-label">Start Time</label>
				<div class="input-group" id="calModStart">
					<select class="form-select" disabled name="calModStartHH" id="calModStartHH">
						<option selected>${modStartHH}</option>
						<option value="00">0</option>
						<option value="01">1</option>
						<option value="02">2</option>
						<option value="03">3</option>
						<option value="04">4</option>
						<option value="05">5</option>
						<option value="06">6</option>
						<option value="07">7</option>
						<option value="08">8</option>
						<option value="09">9</option>
						<option value="10">10</option>
						<option value="11">11</option>
						<option value="12">12</option>
						<option value="13">13</option>
						<option value="14">14</option>
						<option value="15">15</option>
						<option value="16">16</option>
						<option value="17">17</option>
						<option value="18">18</option>
						<option value="19">19</option>
						<option value="20">20</option>
						<option value="21">21</option>
						<option value="22">22</option>
						<option value="23">23</option>
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
						<option value="00">0</option>
						<option value="01">1</option>
						<option value="02">2</option>
						<option value="03">3</option>
						<option value="04">4</option>
						<option value="05">5</option>
						<option value="06">6</option>
						<option value="07">7</option>
						<option value="08">8</option>
						<option value="09">9</option>
						<option value="10">10</option>
						<option value="11">11</option>
						<option value="12">12</option>
						<option value="13">13</option>
						<option value="14">14</option>
						<option value="15">15</option>
						<option value="16">16</option>
						<option value="17">17</option>
						<option value="18">18</option>
						<option value="19">19</option>
						<option value="20">20</option>
						<option value="21">21</option>
						<option value="22">22</option>
						<option value="23">23</option>
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

			<div class="modal-footer">
				<button type="button" class="btn btn-danger" data-bs-dismiss="modal">Cancel</button>
				<button type="button" id="calModEdit" class="btn btn-secondary">Edit</button>
				<button formaction="/removeEvent" id="deleteButton" disabled class="btn btn-danger">Delete</button>
				<button formaction="/updateEvent" id="saveButton" disabled class="btn btn-success">Save changes</button>
			`;
			modBod.innerHTML = modalBody;
			modal.show();

			var editButton = document.getElementById("calModEdit");
			var deleteButton = document.getElementById("deleteButton");
			var saveButton = document.getElementById("saveButton");
			var calModTitleEdit = document.getElementById("calModTitle");
			var calModStartHHEdit = document.getElementById("calModStartHH");
			var calModStartMMEdit = document.getElementById("calModStartMM");
			var calModEndHHEdit = document.getElementById("calModEndHH");
			var calModEndMMEdit = document.getElementById("calModEndMM");

			editButton.addEventListener("click", onEditClick, false);

			function onEditClick() {
				modal.show();
				calModTitleEdit.classList.remove("form-control-plaintext");
				calModTitleEdit.classList.add("form-control");

				calModStartHHEdit.removeAttribute("disabled");
				calModStartMMEdit.removeAttribute("disabled");
				calModEndHHEdit.removeAttribute("disabled");
				calModEndMMEdit.removeAttribute("disabled");
				deleteButton.removeAttribute("disabled");
				saveButton.removeAttribute("disabled");
			}

		},
		dateClick: function(info) {
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
						<option selected>00</option>
						<option value="01">1</option>
						<option value="02">2</option>
						<option value="03">3</option>
						<option value="04">4</option>
						<option value="05">5</option>
						<option value="06">6</option>
						<option value="07">7</option>
						<option value="08">8</option>
						<option value="09">9</option>
						<option value="10">10</option>
						<option value="11">11</option>
						<option value="12">12</option>
						<option value="13">13</option>
						<option value="14">14</option>
						<option value="15">15</option>
						<option value="16">16</option>
						<option value="17">17</option>
						<option value="18">18</option>
						<option value="19">19</option>
						<option value="20">20</option>
						<option value="21">21</option>
						<option value="22">22</option>
						<option value="23">23</option>
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
				<div class=input-group id="calModEnd">
					<select class=form-select name="calModEndHH">
						<option selected>00</option>
						<option value="01">1</option>
						<option value="02">2</option>
						<option value="03">3</option>
						<option value="04">4</option>
						<option value="05">5</option>
						<option value="06">6</option>
						<option value="07">7</option>
						<option value="08">8</option>
						<option value="09">9</option>
						<option value="10">10</option>
						<option value="11">11</option>
						<option value="12">12</option>
						<option value="13">13</option>
						<option value="14">14</option>
						<option value="15">15</option>
						<option value="16">16</option>
						<option value="17">17</option>
						<option value="18">18</option>
						<option value="19">19</option>
						<option value="20">20</option>
						<option value="21">21</option>
						<option value="22">22</option>
						<option value="23">23</option>
					</select>
					<span class="input-group-text">:</span>
					<select class=form-select name="calModEndMM">
						<option selected>00</option>
						<option value="15">15</option>
						<option value="30">30</option>
						<option value="45">45</option>
					</select>
					<span class="input-group-text">:00</span>
				</div>
			</div>

			</div>

			<div class="modal-footer">
				<button type="button" class="btn btn-danger" data-bs-dismiss="modal">Cancel</button>
				<button formaction="/addEvent" class="btn btn-success">Add Session</button>
			`;
			modBod.innerHTML = modalBody;
			modal.show();
		}
	});
	calendar.render();
});

const modal = new bootstrap.Modal(document.getElementById("calendarModal"));
const modViewTitle = document.getElementById("calModViewTitle");
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