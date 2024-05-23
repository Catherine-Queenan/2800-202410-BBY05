async function fetchMessages() {
	const response = await fetch('/messages');
	const { senderMessages, receiverMessages } = await response.json();
	const messagesDiv = document.getElementById('messages');
	messagesDiv.innerHTML = '';

	const allMessages = [...senderMessages, ...receiverMessages];
	allMessages.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

	allMessages.forEach(msg => {
		const messageElement = document.createElement('div');
		messageElement.classList.add('message');
		messageElement.innerHTML = `
			<p>${msg.text}</p>
		`;
		messagesDiv.appendChild(messageElement);
	});
}

document.getElementById('messageForm').addEventListener('submit', async (e) => {
	e.preventDefault();
	const input = document.getElementById('messageInput');
	const text = input.value;
	input.value = '';

	await fetch('/messages', {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
		},
		body: JSON.stringify({ text }),
	});

	fetchMessages();
});

fetchMessages();