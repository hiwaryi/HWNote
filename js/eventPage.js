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
    objStore.createIndex("texts", "texts", { unique : false });
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

function checkExcludedSite(protocol, domain){
    var excludedSite = new Set(["www.daum.net", "www.naver.com", "www.google.co.kr"]);

    if(protocol != "http" && protocol != "https") return true;
    return excludedSite.has(domain);
}

function collectData(id, info, tab){
    console.log(info);
    if(info.status == "complete" && recordStat){
        var domain = tab.url.split('/')[tab.url.indexOf('//') < 0 ? 0 : 2].split(/[\/?:#&]/)[0],
            protocol = tab.url.split("://")[0];

        if(!checkExcludedSite(protocol, domain)){
            var index = db.transaction([curNotebook], "readwrite").objectStore(curNotebook).index('url'),
                key = IDBKeyRange.only(tab.url);

            index.openCursor(key).onsuccess = function(e){
                var cursor = e.target.result;
                if(cursor){
                    var updateData = cursor.value;

                    updateData.time = new Date();
                    updateData.visited++;
                    cursor.update(updateData);
                }
                else{
                    chrome.tabs.sendMessage(tab.id, { type : 'getContent' }, function(content){
                        chrome.tabs.captureVisibleTab(tab.windowId, function(thumbnail){
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
                                visited : 1,
                                texts : null
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

chrome.tabs.onRemoved.addListener(function(id){
    if(id in keywords){
        delete keywords[id];
    }
});

chrome.tabs.onUpdated.addListener(function(id, info, tab){
    if(info.status == "complete"){
        var index = db.transaction([curNotebook]).objectStore(curNotebook).index('url'),
            key = IDBKeyRange.only(tab.url);

        index.openCursor(key).onsuccess = function(e){
            var cursor = e.target.result;
            if(cursor){
                chrome.tabs.sendMessage(tab.id, { type: "getHighlight", content: cursor.value.highlight });
            }
        }
    }
});

chrome.runtime.onMessage.addListener(function(request, sender, sendResponse){
    switch(request.type){
        case 'setRecordStat':
            console.log("Message Received : setRecordStat");

            recordStat = request.content;
            // if(recordStat == true){
            //
            // }
            // else if(recordStat == false){
            //     chrome.tabs.onUpdated.removeListener(collectData);
            // }
            break;

        case 'init':
            console.log(recordStat);
            sendResponse({ recordStat: recordStat, curNotebook: curNotebook });
            break;

        case 'newNotebook':
            console.log("New notebook! : ", request.content);

            chrome.runtime.sendMessage({ type: "dbclose" });

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
            if(recordStat){
                console.log("Update ", request.target, " : ", request.content);

                updateValue(request.target, request.content, request.url ? request.url : sender.tab.url);
            }
            break;

        case 'delete':
            var toDelete = request.content;

            if(toDelete.type == "object"){
                var request = db.transaction([curNotebook], "readwrite").objectStore(curNotebook).delete(Number(toDelete.target));
                request.onsuccess = function(e){
                    sendResponse();
                }
                request.onerror = function(e){
                    console.log(e);
                }
            }
            else if(toDelete.type == "objstore"){
                db.close();
                req = window.indexedDB.open('HWNote', req.result.version + 1);
                req.onupgradeneeded = function(e){
                    db = e.target.result;
                    db.deleteObjectStore(toDelete.target);

                    if(!db.objectStoreNames.contains(curNotebook)){
                        curNotebook = db.objectStoreNames[0];
                    }

                    sendResponse();
                }
            }
            break;
    }
});

chrome.tabs.onUpdated.addListener(collectData);
