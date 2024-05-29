// Displays the previously hidden messagePreview Div
const messagePreview = document.getElementById('messagePreview');
messagePreview.classList.add('whiteBackground', 'p-3', 'rounded');
messagePreview.classList.remove('d-none');

messagePreview.innerHTML = `
	<h4>New Messages From: </h4>
	<ul id="msgList" style="list-style-type: none; padding: 0; margin-left: 0; margin-right: 0;"></ul>
`;

const msgList = document.getElementById('msgList');

async function fetchMessages() {
	const response = await fetch('/messagesPreview');
	const { clientMessages } = await response.json();
	if (clientMessages.length > 0) {
		for (let i = 0; i < clientMessages.length; i++) {
			const msgLi = document.createElement('li');
			msgLi.innerHTML = `
				<div>
					${clientMessages[i].email}: 
					<span class="position-absolute top-30 start-90 badge rounded-pill orangeBackground purple" font-weight:800; cursor:pointer;">
						${clientMessages[i].msgCount}
					</span>
				</div>
			`;
			msgLi.setAttribute("style", "margin-left: 0; margin-right: 0;")
			msgList.appendChild(msgLi);
		}
	}
}
fetchMessages();