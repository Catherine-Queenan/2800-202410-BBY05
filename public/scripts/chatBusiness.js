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
			const messageElement = document.createElement('div');
			messageElement.classList.add('message');
			messageElement.innerHTML = `
				<p>${msg.text}</p>
			`;
			messagesDiv.appendChild(messageElement);
		});

		// Update the timestamp of the latest message
		lastMessageTimestamp = latestMessage.createdAt;
	}
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

// Poll for new messages every 3 seconds
setInterval(fetchMessages, 3000);

fetchMessages();