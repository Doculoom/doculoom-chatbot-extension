document.getElementById('send-btn').addEventListener('click', function() {
    const inputField = document.getElementById('chat-input');
    const chatBox = document.getElementById('chat-box');
    const userText = inputField.value;

    if (userText) {
        const userMsg = document.createElement('div');
        userMsg.textContent = userText;
        chatBox.appendChild(userMsg);
        inputField.value = ''; 

        
    }
});
