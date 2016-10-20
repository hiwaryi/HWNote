var db;
var recordStat = false;
var curNotebook;
var req = window.indexedDB.open('HWNote');
var keywords = new Object();

function newNotebook(e){
    console.log("upgraded needed");

    db = e.target.result;
    if(!curNotebook){
        curNotebook = "MyNotebook";
    }
    var objStore = db.createObjectStore(curNotebook, { keyPath : "id", autoIncrement : true});

    objStore.createIndex("title", "title", { unique : false });
    objStore.createIndex("url", "url", { unique : false });
    objStore.createIndex("time", "time", { unique : false });
    objStore.createIndex("content", "content", { unique : false });
    objStore.createIndex("highlight", "highlight", { unique : false });
    objStore.createIndex("search", "search", { unique : false });
    objStore.createIndex("thumbnail", "thumbnail", { unique : false });
    objStore.createIndex("keyword", "keyword", { unique : false });
    objStore.createIndex("favorite", "favorite", { unique : false });
    objStore.createIndex("visited", "visited", { unique : false });
}

// initial setting for indexedDB
req.onerror = function(e){
    console.log("Error!", e);
}
req.onsuccess = function(e){
    console.log("DB Success");
    db = req.result;
    curNotebook = db.objectStoreNames[0];
}
req.onupgradeneeded = newNotebook;

// collect site information
function checkSearchEngine(url, domain){
    var searchEngine = new Map([["search.daum.net", "&q="], ["search.naver.com", "&query="], ["google.co.kr/search", "&q="]]);

    if(searchEngine.has(domain)){
        var query = searchEngine.get(domain);
        return "검색어 : " + url.split(query)[1].split(/[\/?:#&]/)[0];
    }
    return null;
}

function checkExcludedSite(domain){
    var excludedSite = new Set(["www.daum.net", "www.naver.com", "www.google.co.kr"]);

    return excludedSite.has(domain);
}

function collectData(id, info, tab){
    if(info.status == "complete" && recordStat){
        var domain = tab.url.split('/')[tab.url.indexOf('//') < 0 ? 0 : 2].split(/[\/?:#&]/)[0];

        if(!checkExcludedSite(domain)){
            chrome.tabs.executeScript(tab.id, { file : "js/parseContent.js" }, function(){
                var index = db.transaction([curNotebook], "readwrite").objectStore(curNotebook).index('url'),
                    key = IDBKeyRange.only(tab.url);

                index.openCursor(key).onsuccess = function(e){
                    var cursor = e.target.result;
                    if(cursor){
                        var updateData = cursor.value;

                        updateData.time = new Date();
                        updateData.visited++;
                        cursor.update(updateData);

                        // TODO: change position. why is this here???
                        chrome.tabs.sendMessage(tab.id, { type : 'getHighlight', content : cursor.value.highlight });
                    }
                    else{
                        chrome.tabs.sendMessage(tab.id, { type : 'getContent' }, function(content){
                            chrome.tabs.captureVisibleTab(function(thumbnail){
                                var keyword;
                                if(tab.openerTabId in keywords){
                                    keyword = JSON.parse(JSON.stringify(keywords[tab.openerTabId]));
                                }

                                var title = tab.title.replace("<", "&lt;").replace(">", "&gt;");

                                var Site = {
                                    title : title,
                                    url : tab.url,
                                    time : new Date(),
                                    content : content,
                                    highlight : null,
                                    search : null,
                                    thumbnail : thumbnail,
                                    keyword : keyword,
                                    favorite : false,
                                    visited : 1
                                };

                                if(!keyword){
                                    if(keyword = checkSearchEngine(tab.url, domain)){
                                        keyword = [keyword];
                                    }
                                    else{
                                        keyword = [tab.title];
                                    }
                                }
                                else{
                                    keyword.push(tab.title);
                                }

                                keywords[tab.id] = keyword;

                                db.transaction([curNotebook], "readwrite").objectStore(curNotebook).add(Site);

                                console.log("Recorded : ", tab.title);
                                if(keyword)
                                    console.log("Keyword : ", keyword);
                            });
                        });
                    }
                }
            });
        }
    }
}

function updateValue(target, data, url){
    var index = db.transaction([curNotebook], "readwrite").objectStore(curNotebook).index('url');
    var range = IDBKeyRange.only(url);

    index.openCursor(range).onsuccess = function(e){
        var cursor = e.target.result;
        if(cursor){
            var updateData = cursor.value;

            updateData[target] = data;
            cursor.update(updateData);

            console.log(data);
        }
    }
}

function deleteObject(id){
    var request = db.transaction([curNotebook], "readwrite").objectStore(curNotebook).delete(Number(id));
    request.onsuccess = function(e){
        console.log(e);
    }
    request.onerror = function(e){
        console.log(e);
    }
}

chrome.tabs.onRemoved.addListener(function(id){
    if(id in keywords){
        delete keywords[id];
    }
});

chrome.runtime.onMessage.addListener(function(request, sender, sendResponse){
    switch(request.type){
        case 'setRecordStat':
            console.log("Message Received : setRecordStat");

            recordStat = request.content;
            if(recordStat == true){
                chrome.tabs.onUpdated.addListener(collectData);
            }
            else if(recordStat == false){
                chrome.tabs.onUpdated.removeListener(collectData);
            }
            break;

        case 'init':
            console.log(recordStat);
            sendResponse({ recordStat: recordStat, curNotebook: curNotebook });
            break;

        case 'newNotebook':
            console.log("New notebook! : ", request.content);

            curNotebook = request.content;

            db.close();
            req = window.indexedDB.open('HWNote', req.result.version + 1);
            req.onupgradeneeded = newNotebook;
            break;

        case 'changeNotebook':
            console.log("change notebook : ", request.content);
            curNotebook = request.content;
            sendResponse();
            break;

        case 'getNotes':
            var index = db.transaction([curNotebook]).objectStore(curNotebook).index('time');
            var idx = 0;
            var notes = [];

            index.openCursor(null, "prev").onsuccess = function(e){
                var cursor = e.target.result;
                idx++;

                if(cursor && idx <= 10){
                    notes.push(cursor.value.title);
                    cursor.continue();
                }
                else{
                    chrome.runtime.sendMessage({ type : 'sendNotes', content : notes });
                }
            };
            break;

        case 'getNotebookList':
            var response = {
                notebookList : Array.from(req.result.objectStoreNames),
                curNotebook : curNotebook
            };

            sendResponse(response);
            break;

        case 'updateValue':
            console.log("Update ", request.target, " : ", request.content);

            updateValue(request.target, request.content, request.url ? request.url : sender.tab.url);
            break;

        case 'deleteObject':
            console.log("Delete : ", request.url);

            deleteObject(request.url)
    }
});
