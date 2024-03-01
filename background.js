
// TODO: This file not doing anything now
chrome.runtime.onInstalled.addListener(details => {
    
});

// chrome.runtime.onMessage.addListener(data =>  {
//     const {urlHash, question} = prefs;
//     switch (data.event) {
//         case 'sendMessage':
//             console.log("this is event")
//             if (data.event === 'sendMessage') {
//                 console.log('Received sendMessage event');
//                 console.log("prefs: ", prefs);
//                 chrome.storage.local.set(prefs);
    
//             }
//             break;
//         case 'scrapedData':
//             console.log("this is event")
//             if (data.event === 'scrapedData') {
//                 console.log('Received scrapedData event');
//                 console.log("prefs: ", prefs);
//                 chrome.storage.local.set(prefs);
    
//             }
//             break;
//         default:
//             break;
//     }

//   });







