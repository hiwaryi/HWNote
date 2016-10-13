var db;
var recordStat = false;
var curNote = 'test';
var req = window.indexedDB.open('HWNote');

function newNote(e){
    console.log("upgraded needed");

    db = e.target.result;
    var objStore = db.createObjectStore(curNote, { keyPath : "id", autoIncrement : true});

    objStore.createIndex("title", "title", { unique : false });
    objStore.createIndex("url", "url", { unique : false });
    objStore.createIndex("time", "time", { unique : false });
    objStore.createIndex("content", "content", { unique : false });
    objStore.createIndex("highlight", "highlight", { unique : false });
    objStore.createIndex("search", "search", { unique : false });
    objStore.createIndex("thumbnail", "thumbnail", { unique : false });
    objStore.createIndex("keyword", "keyword", { unique : false });
}

// initial setting for indexedDB
req.onerror = function(e){
    console.log("Error!", e);
}
req.onsuccess = function(e){
    console.log("success");
    db = req.result;
}
req.onupgradeneeded = newNote;

// collect site information
function checkSearchEngine(url, domain){
    var searchEngine = new Map([["search.daum.net", "&q="], ["search.naver.com", "&query="], ["google.co.kr/search", "&q="]]);

    if(searchEngine.has(domain)){
        var query = searchEngine.get(domain);
        return url.split(query)[1].split(/[\/?:#&]/)[0];
    }
    return null;
}

function checkExcludedSite(domain){
    var excludedSite = new Set(["www.daum.net", "www.naver.com", "www.google.co.kr"]);

    return excludedSite.has(domain);
}

function parseContent(){
    var content = document.getElementsByTagName('article');
    if(content)
        return content.innerText;
}

function collectData(id, info, tab){
    if(info.status == "complete"){
        var domain = tab.url.split('/')[tab.url.indexOf('//') < 0 ? 0 : 2].split(/[\/?:#&]/)[0];

        if(!checkExcludedSite(domain)){
            chrome.tabs.executeScript(tab.id, { file : "js/parseContent.js" }, function(){
                chrome.tabs.sendMessage(tab.id, { type : 'getContent' }, function(content){
                    chrome.tabs.captureVisibleTab(function(thumbnail){
                        var keyword = checkSearchEngine(tab.url, domain);
                        var Site = {
                            title : tab.title,
                            url : tab.url,
                            time : new Date(),
                            content : content,
                            highlight : null,
                            search : null,
                            thumbnail : thumbnail,
                            keyword : keyword
                        };

                        db.transaction([curNote], "readwrite").objectStore(curNote).add(Site);

                        console.log("Recorded : ", tab.title);
                        if(keyword)
                            console.log("Keyword : ", keyword);
                    });
                });
            });
        }
    }
}

chrome.runtime.onMessage.addListener(function(request, sender, sendResponse){
    switch(request.type){
        case 'setRecordStat':
            console.log("Message Received : setRecordStat");

            recordStat ^= true;
            if(request.content == true){
                chrome.tabs.onUpdated.addListener(collectData);
            }
            else if(request.content == false){
                chrome.tabs.onUpdated.removeListener(collectData);
            }
            break;

        case 'getRecordStat':
            console.log("Message Received : getRecordStat");

            sendResponse(recordStat);
            break;

        case 'newNote':
            console.log("New note! : ", request.content);

            curNote = request.content;

            db.close();
            req = window.indexedDB.open('HWNote', req.result.version + 1);
            req.onupgradeneeded = newNote;
    }
});
