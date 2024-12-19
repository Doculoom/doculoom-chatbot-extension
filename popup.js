const sendBtn = document.getElementById('send-btn')
const inputField = document.getElementById('chat-input')
const chatBox = document.getElementById('chat-box')
const chatContainer = document.getElementById('chat-container');
const spinnerContainer = document.createElement('div');


sendBtn.onclick = async function() {
    displayMessage(inputField.value, 'Human');

    var lastCheckedURL = localStorage.getItem('lastCheckedURL');
    sendQuestionToBackend(lastCheckedURL, inputField.value)
    console.log("Recived request: " + inputField.value)
    inputField.value = '';
}

function getAllHtmlElement(){
    let allHTMLContent = document.documentElement.innerHTML;
    console.log(allHTMLContent);
    
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.wordList) {
        let wordList = request.wordList;
        console.log('Content found: ', wordList);
    }
});

document.addEventListener('DOMContentLoaded', function() {
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
        let activeTab = tabs[0];
        let activeTabUrl = activeTab.url; 
        console.log("Active tab URL:", activeTabUrl);

        if (!activeTabUrl) {
            console.error('No URL found for the active tab.');
            return;
        }
        let cleanUrl = activeTabUrl.replace(/\/\//g, '').replace(/[^a-zA-Z0-9]/g, '');
        var hashedURL = CryptoJS.SHA256(cleanUrl).toString(CryptoJS.enc.Hex);

        var lastCheckedURL = localStorage.getItem('lastCheckedURL');


        if (hashedURL === lastCheckedURL) {
            console.log('URL has not changed since the last check. Skipping');
        }else {
            localStorage.setItem('lastCheckedURL', hashedURL);
        }

        console.log('Current URL:', hashedURL); 
        checkIndex(hashedURL).then(data => {
            console.log("Data from checkIndex:", data);
        }).catch(error => {
        console.error("Error checking index:", error);
        });
    });
});

async function checkIndex(urlHash) {
    console.log("Checking index for:", urlHash);
    let data; 
    try {
        const response = await fetch(`https://e2e6-172-210-81-173.ngrok-free.app/docs/${urlHash}`);

        if(!response.ok){
            const message = "Loading Content from this Page...";
            chatBox.innerHTML += `<div class="chat-message">${message}</div>`; 
            await scrapeAndProcessContent(urlHash); 
        }

        data = await response.json(); 
        console.log("Success:", data);
        const message = "Hello, How can I assist you today?";
        chatBox.innerHTML += `<div class="chat-message">${message}</div>`; 
        return data; 

    } catch (error) {
        console.error('There was a problem checking the index or processing:', error);
        return null; 
    }
}

async function scrapeAndProcessContent(urlHash) {
     let [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    try {
        let injectionResults = await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            function: scrapeContentFromPage 
        });

       console.log('Injection results:', injectionResults);
    
        for (const frameResult of injectionResults) {
            console.log('Content found: ', frameResult.result);
            await processDoc(urlHash, frameResult.result);
        }
    } catch (error) {
        console.error('Error injecting script:', error);
    }   
}

function scrapeContentFromPage() {
function processContent(content) {
    let formattedContent = content.trim().replaceAll("  ", " ");
    return ` ${formattedContent} `;
}
function getContentFrom(node) {
    const list = [node];
    let content = "";
    const nodesToBeIgnored = ["SCRIPT", "NOSCRIPT", "STYLE"]; 
    
    for (let i = 0; i < list.length; i++) {
        const currentNode = list[i];
        if (![1,3].includes(currentNode.nodeType) || 
            nodesToBeIgnored.includes(currentNode.tagName)) {
           continue;
        }
        if (currentNode.childNodes.length === 0) {
            content += processContent(currentNode.textContent);
            continue;
        }
        content += Array.from(currentNode.childNodes).map(getContentFrom).join(" ");
    }
    return processContent(content);
};

console.log("Scraping content from page: ", getContentFrom(document.body));
return getContentFrom(document.body);

}

async function processDoc(docHash, context) {
    console.log("Processing doc:", docHash, "with context:", context);
    try {
        const response = await fetch("https://e2e6-172-210-81-173.ngrok-free.app/docs/", {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                doc_hash: docHash,
                content: context 
            })
        });

        if (!response.ok) {
            throw new Error('Network response was not ok');
        }

        const data = await response.json();
        console.log("Success:", data);
        return data;
    } catch (error) {
        console.error("Error processing document:", error);
        return null;
    }
}

window.addEventListener('unload', function() {
    chatBox.innerText = '';
  });

function displayMessage(text, sender, isProcessing = false) {
   if (isProcessing) {
    const spinnerContainer = document.createElement('div');
    spinnerContainer.classList.add('processing-spinner');
    spinnerContainer.innerHTML = `<div class="spinner"></div>`;
    spinnerContainer.style.display = "flex";
    spinnerContainer.style.alignItems = "center";
    spinnerContainer.style.justifyContent = "flex-start";
    chatBox.appendChild(spinnerContainer);
} else {
    const messageDiv = document.createElement('div');
    messageDiv.classList.add('message', sender);
    messageDiv.innerHTML = text;
    chatBox.appendChild(messageDiv);

    const spinnerContainer = document.querySelector('.processing-spinner');
    if (spinnerContainer) {
        spinnerContainer.remove();
    }

    chatBox.scrollTop = chatContainer.scrollHeight;
}
}

function sendQuestionToBackend(urlHash, question) {
    console.log("Sending question to backend:", question);

    displayMessage('', 'ChatBot', true);

    console.log(`Sending chat message for urlHash: ${urlHash} with question: ${question}`)

    fetch(`https://e2e6-172-210-81-173.ngrok-free.app/docs/${urlHash}/chat`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ question: question }),
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
    })
    .then(data => {
        console.log('Success:', data);
        console.log('Received response:', data.response)
        let formattedText = (data.response).replace(/\n/g, '<br>');
        displayMessage(formattedText, 'ChatBot', false);
    })
    .catch((error) => {
        console.error('Error:', error);
        displayMessage('Sorry, there was an error processing your request.', 'chatbot',false);
    });
}

