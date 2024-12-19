// popup.js

document.addEventListener('DOMContentLoaded', async () => {
    initializeUI();
    setupEventListeners();

    // Show a spinner message as soon as the extension is opened
    displayMessage('Web page is being processed...', 'bot', true);

    const urlHash = await getActiveTabHash();
    if (!urlHash) {
        removeSpinner();
        displayMessage('Unable to process this page.', 'bot');
        return;
    }

    // Process the URL hash to parse and send the webpage content to the backend
    await processUrlHash(urlHash);
});

function initializeUI() {
    window.chatBox = document.getElementById('chat-box');
    window.inputField = document.getElementById('chat-input');
    window.sendBtn = document.getElementById('send-btn');
}

function setupEventListeners() {
    sendBtn.addEventListener('click', () => handleSendMessage());
    inputField.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleSendMessage();
    });
}

async function handleSendMessage() {
    const message = inputField.value.trim();
    if (!message) return;

    // Clear the input field immediately after the user sends the message
    inputField.value = '';

    displayMessage(message, 'human');
    const lastCheckedURL = localStorage.getItem('lastCheckedURL');

    try {
        await sendQuestionToBackend(lastCheckedURL, message);
    } catch (error) {
        console.error('Error sending message:', error);
    }
}


async function getActiveTabHash() {
    return new Promise((resolve) => {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            const activeTab = tabs[0];
            if (activeTab?.url) {
                const cleanUrl = generateHashFromUrl(activeTab.url);
                resolve(cleanUrl);
            } else {
                console.error('No active tab URL found.');
                resolve(null);
            }
        });
    });
}

function generateHashFromUrl(url) {
    const sanitizedUrl = url.replace(/\W/g, '');
    return CryptoJS.SHA256(sanitizedUrl).toString(CryptoJS.enc.Hex);
}

async function processUrlHash(urlHash) {
    localStorage.setItem('lastCheckedURL', urlHash);

    try {
        console.log('Processing URL hash:', urlHash);
        // Scrape and process content
        await scrapeAndProcessContent(urlHash);

        // After processing the content, check if it's indexed
        const isIndexed = await checkIndex(urlHash);
        removeSpinner();

        if (isIndexed) {
            // If it's indexed, the backend should have returned a greeting
            displayMessage('What do you want to know from this webpage?', 'bot');
        } else {
            // If not indexed for some reason, prompt user anyway
            displayMessage('Page processed but not indexed yet. You can still ask questions.', 'bot');
        }
    } catch (error) {
        removeSpinner();
        console.error('Error processing URL hash:', error);
        displayMessage('There was an error processing the page.', 'bot');
    }
}

async function checkIndex(urlHash) {
    try {
        console.log('Checking if document is indexed:', urlHash);
        const response = await fetch(`http://0.0.0.0:8000/docs/${urlHash}`);
        if (response.ok) {
            const data = await response.json();
            console.log('Document indexed. Backend response:', data);
            return true;
        } else {
            console.log('Document not indexed yet.');
            return false;
        }
    } catch (error) {
        console.error('Error checking index:', error);
        return false;
    }
}

async function scrapeAndProcessContent(urlHash) {
    console.log('Scraping page content...');
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const results = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        function: extractPageContent,
    });

    for (const result of results) {
        console.log('Uploading scraped content to backend...');
        await uploadDocument(urlHash, result.result);
    }
    console.log('Content uploaded successfully.');
}

function extractPageContent() {
    const extractText = (node) => {
        if (!node || ['SCRIPT', 'NOSCRIPT', 'STYLE'].includes(node.tagName)) return '';
        if (node.nodeType === Node.TEXT_NODE) return node.textContent.trim();
        return Array.from(node.childNodes).map(extractText).join(' ');
    };

    return extractText(document.body).replace(/\s+/g, ' ');
}

async function uploadDocument(docHash, content) {
    const response = await fetch('http://0.0.0.0:8000/docs/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ doc_hash: docHash, content }),
    });

    if (!response.ok) {
        const text = await response.text();
        console.error('Failed to upload document:', text);
        throw new Error('Failed to upload document');
    }
    console.log('Document upload response was OK');
}

async function sendQuestionToBackend(urlHash, question) {
    console.log('Sending question to backend:', question);
    displayMessage('', 'bot', true);
    try {
        const response = await fetch(`http://0.0.0.0:8000/docs/${urlHash}/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ question }),
        });

        if (!response.ok) throw new Error(`HTTP error: ${response.status}`);

        const data = await response.json();
        console.log('Received answer from backend:', data);
        displayMessage(data.response.replace(/\n/g, '<br>'), 'bot');
    } catch (error) {
        console.error('Error sending question:', error);
        displayMessage('There was an error processing your request.', 'bot');
    }
}

function displayMessage(text, sender, isProcessing = false) {
    const chatBox = document.getElementById('chat-box');

    if (isProcessing) {
        // If there's already a spinner, don't add another
        if (!chatBox.querySelector('.spinner-border')) {
            const spinner = document.createElement('div');
            spinner.classList.add('spinner-border', 'text-primary', 'mb-2');
            spinner.setAttribute('role', 'status');
            spinner.innerHTML = '<span class="visually-hidden">Loading...</span>';
            chatBox.appendChild(spinner);
        }
    } else {
        removeSpinner();
        const bubble = document.createElement('div');
        bubble.classList.add('chat-bubble', sender.toLowerCase());
        bubble.innerHTML = text;
        chatBox.appendChild(bubble);
    }

    chatBox.scrollTop = chatBox.scrollHeight;
}

function removeSpinner() {
    const chatBox = document.getElementById('chat-box');
    const spinner = chatBox.querySelector('.spinner-border');
    if (spinner) spinner.remove();
}
