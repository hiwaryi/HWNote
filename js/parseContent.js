// TODO: deal with various type of articles

chrome.runtime.onMessage.addListener(function(request, sender, sendResponse){
    if(request.type == "getContent")
        sendResponse(document.getElementsByTagName('article')[0].innerText);
});
