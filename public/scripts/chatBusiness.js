let lastMessageTimestamp = null;

const clientName = document.getElementById('clientParam').value;

async function fetchMessages() {
	const response = await fetch('/messagesBusiness/' + clientName);
	const { senderMessages, receiverMessages } = await response.json();
	const messagesDiv = document.getElementById('messages');

	const allMessages = [...senderMessages, ...receiverMessages];
	allMessages.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

	// Check if there are new messages
	const latestMessage = allMessages[allMessages.length - 1];
	if (latestMessage && new Date(latestMessage.createdAt) > new Date(lastMessageTimestamp)) {
		messagesDiv.innerHTML = '';

		allMessages.forEach(msg => {
			const messageWrapper = document.createElement('div');
			messageWrapper.classList.add('message-wrapper');

			const messageElement = document.createElement('div');
			messageElement.classList.add('message');

			// if (msg.receiver === receiverIdentifier) {
			// 	messageElement.classList.add('sent');
			// } else {
			// 	messageElement.classList.add('received');
			// }

			// Format the timestamp
			const date = new Date(msg.createdAt);
			const formattedTimestamp = date.toLocaleString('en-CA', {
				month: 'short',
				day: 'numeric',
				hour: 'numeric',
				minute: 'numeric',
				hour12: true
			});

			messageElement.innerHTML = `
				<div class='msgText'>${msg.text}</div>
			`;
			const timestampElement = document.createElement('div');
			timestampElement.classList.add('timestamp');
			timestampElement.innerText = formattedTimestamp;
			if (msg.receiver === receiverIdentifier) {
				messageElement.classList.add('sent');
				timestampElement.classList.add('sent');
			} else {
				messageElement.classList.add('received');
				timestampElement.classList.add('received');
			}
			messageWrapper.appendChild(messageElement);
			messageWrapper.appendChild(timestampElement);
			messagesDiv.appendChild(messageWrapper);
		});

		// Update the timestamp of the latest message
		lastMessageTimestamp = latestMessage.createdAt;

		// Scroll to the bottom
		messagesDiv.scrollTop = messagesDiv.scrollHeight;

		// Mark incoming messages as read
		await markMessagesAsRead();
	}
}

async function markMessagesAsRead() {
	await fetch('/messagesBusiness/markRead/'+clientName, {
		method: 'PUT',
		headers: {
			'Content-Type': 'application/json',
		}
	});
}

document.getElementById('messageForm').addEventListener('submit', async (e) => {
	e.preventDefault();
	const input = document.getElementById('messageInput');
	const text = input.value;
	input.value = '';

	await fetch('/messagesBusiness/' + clientName, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
		},
		body: JSON.stringify({ text }),
	});

	fetchMessages();
});

// Poll for new messages every 5 seconds
setInterval(fetchMessages, 5000);

fetchMessages();