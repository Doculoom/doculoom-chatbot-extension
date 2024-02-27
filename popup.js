const sendBtn = document.getElementById('send-btn')
const inputField = document.getElementById('chat-input')
const chatBox = document.getElementById('chat-box')


sendBtn.onclick = async function() {
    displayMessage(inputField.value, 'Human');
    sendQuestionToBackend('sora', inputField.value)
    console.log("Recived request: " + inputField.value)
    inputField.value = '';

    // TODO: Remove it later-> it is for just for testing
     //scrapeAndProcessContent();

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
        var hashedURL = CryptoJS.SHA256(cleanUrl).toString(CryptoJS.enc.Base64);

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
    try {

        const response = await fetch(`https://e2e6-172-210-81-173.ngrok-free.app/${urlHash}`);
        if (!response.ok) {
            scrapeAndProcessContent(urlHash);
        }

        const data = await response.json();
        console.log(data);
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
            function: scrapeContentFromPage, //TODO: 
        });
    
        // TODO: ADD extractArticles function
        for (const frameResult of injectionResults) {
            console.log('Content found: ', frameResult.result);
            await processDoc(urlHash, frameResult.result);
        }
    } catch (error) {
        console.error('Error injecting script:', error);
    }   
}

function scrapeContentFromPage() {
  const wordsRegEx = /[A-Z][^.!?]*[.!?]?/g;

  let wordList = document.body.innerHTML.match(wordsRegEx);
  chrome.runtime.sendMessage({ wordList: wordList });

  return wordList ? wordList : 'No words found';
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

function displayMessage(text, sender) {
    const messageDiv = document.createElement('div');
    messageDiv.textContent = `${sender}: ${text}`;
    chatBox.appendChild(messageDiv);
}

function sendQuestionToBackend(urlHash, question) {
    console.log("Sending question to backend:", question);
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
        displayMessage(data.response, 'Chatbot');
    })
    .catch((error) => {
        console.error('Error:', error);
        displayMessage('Sorry, there was an error processing your request.', 'Chatbot');
    });
}






