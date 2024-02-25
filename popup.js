document.getElementById('send-btn').addEventListener('click', function() {
    const inputField = document.getElementById('chat-input');
    const chatBox = document.getElementById('chat-box');
    const userText = inputField.value;

    if (userText) {
        displayMessage(userText, 'You');
        sendQuestionToBackend(userText);
        inputField.value = '';
    }
});

function displayMessage(text, sender) {
    const chatBox = document.getElementById('chat-box');
    const messageDiv = document.createElement('div');
    messageDiv.textContent = `${sender}: ${text}`;
    chatBox.appendChild(messageDiv);
}

function sendQuestionToBackend(question) {
    // TODO: Send the question to the backend
    fetch('http://localhost:5000/chat', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({question: question}),
    })
    .then(response => response.json())
    .then(data => {
        console.log('Success:', data);
        displayMessage(data.answer, 'Chatbot');
    })
    .catch((error) => {
        console.error('Error:', error);
        displayMessage('Sorry, there was an error processing your request.', 'Chatbot');
    });
}

