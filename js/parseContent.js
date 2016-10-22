// TODO: deal with various type of articles

var highlights = new Object();
var texts = new Object();
var curNotebook;
var recordStat = false;

//
// Functions
//

function getNth(node){
    var childNodes = node.parentNode.childNodes,
        cnt = 1;

    for(var i = 0; i < childNodes.length; i++){
        if(childNodes[i] == node){
            return cnt;
        }
        else if(childNodes[i].tagName == node.tagName){
            cnt++;
        }
    }
}

function getTextNodeIdx(node){
    var nodes = node.parentNode.childNodes;

    for(var i = 0; i < nodes.length; i++){
        if(nodes[i] === node){
            return i;
        }
    }
}

function genQuery(node){
    var tagName = node.tagName,
        result = [],
        textIdx = node.nodeType == 3 ? getTextNodeIdx(node) : 0;

    while(node){
        if(node.tagName){
            var nth = getNth(node);
            var query = node.tagName;

            if(nth > 1){
                query += ':nth-of-type(' + nth + ')';
            }

            result.push(query);
        }

        node = node.parentNode;
    }

    return { query: result.reverse().join(' > ').toLowerCase(), textIdx : textIdx };
}

function serialize(range){
    return {
        startContainer: genQuery(range.startContainer),
        startOffset: range.startOffset,
        endContainer: genQuery(range.endContainer),
        endOffset: range.endOffset
    };
}

function updateSerialization(){
    var target = document.querySelectorAll(".HWhighlight"),
        id = 0,
        prevId,
        idx = Object.keys(target).reverse();

    highlights = new Object();
    texts = new Object();
    highlights[0] = [];
    texts[0] = [];
    var _texts = [];

    for(var i = 0; i < idx.length; i++){
        var val = idx[i];

        if(target.hasOwnProperty(val)){
            var curId = target[val].id.split("h")[1];
            if(prevId && curId != prevId){
                texts[id] = _texts.reverse().join("");
                id++;
                highlights[id] = [];
                texts[id] = [];
                _texts = [];
            }

            target[val].id = "h" + curId;

            var containerQuery = genQuery(target[val].parentNode),
                text = target[val].innerText,
                startOffset,
                endOffset;

            var siblings = target[val].parentNode.childNodes,
                textIdx = getTextNodeIdx(target[val]);

            // Get startOffset
            if(textIdx == 0 || siblings[textIdx - 1].nodeType != 3){
                startOffset = 0;
            }
            else{
                startOffset = siblings[textIdx - 1].length;
            }

            containerQuery.textIdx = textIdx;
            if(startOffset){
                containerQuery.textIdx--;
            }

            // Get endOffset
            endOffset = startOffset + siblings[textIdx].innerText.length;

            highlights[id].push({
                startContainer: containerQuery,
                endContainer: containerQuery,
                startOffset: startOffset,
                endOffset: endOffset
            });
            _texts.push(text);

            prevId = curId;
        }
    }

    texts[id] = _texts.reverse().join("");

    chrome.runtime.sendMessage({ type : 'updateValue', target : "highlight", content : JSON.stringify(highlights)});
    chrome.runtime.sendMessage({ type : 'updateValue', target : "texts", content : texts });
}

function markHighlight(id, reverse = false){
    var highlight = highlights[id];
    var sel = window.getSelection();
    sel.removeAllRanges();
    // var text = [];

    debugger;

    if(reverse){
        highlight.reverse();
    }

    for(var i = 0; i < highlight.length; i++){
        var range = genRange(highlight[i]);
        var span = document.createElement('span');
        span.className = "HWhighlight";
        span.id = "h" + id;
        span.addEventListener('click', removeHighlight);
        range.surroundContents(span);

        var textIdx = getTextNodeIdx(span),
            pn = span.parentNode,
            siblings = span.parentNode.childNodes;
        if(textIdx != 0 && siblings[textIdx - 1].nodeType == 3 && siblings[textIdx - 1].nodeValue == ""){
            pn.removeChild(siblings[textIdx - 1]);
            textIdx--;
        }
        if(textIdx < siblings.length - 1 && siblings[textIdx + 1].nodeType == 3 && siblings[textIdx + 1].nodeValue == ""){
            pn.removeChild(siblings[textIdx + 1]);
        }

        // text.push(span.innerText);
    }

    // texts[id] = text.join("");

    // console.log("Marked highlight : ", texts[id]);
}

function getHighlight(){
    chrome.runtime.sendMessage({ type: "init" }, function(response){
        if(response.recordStat){
            var sel = window.getSelection();

            if(sel.type == 'Range'){
                console.log("User selected something!");

                var id = Object.keys(highlights).length ? Number(Object.keys(highlights)[Object.keys(highlights).length - 1]) + 1 : 0;
                highlights[id] = [];

                for(var i = 0; i < sel.rangeCount; i++){
                    saveHighlight(sel.getRangeAt(i), id);
                }

                markHighlight(id, true);
                updateSerialization();

                // chrome.runtime.sendMessage({ type : 'updateValue', target : "highlight", content : JSON.stringify(highlights)});
                // console.log("Highlight sent!");
            }
        }
    });
}

function saveHighlight(sel, id, node, started){
    node = node || document.body;
    started = started || false;
    var nodes = node.childNodes;

    for(var i = 0; i < nodes.length; i++){
        if(nodes[i].nodeType == 3){
            var start = nodes[i] == sel.startContainer;
            var end = nodes[i] == sel.endContainer;
            if(start){
                started = true;
            }
            if(started){
                var tmp = sel.cloneRange();
                if(!start){
                    // tmp.setStartBefore(nodes[i]);
                    tmp.setStart(nodes[i], 0);
                }
                if(!end){
                    // tmp.setEndAfter(nodes[i]);
                    tmp.setEnd(nodes[i], nodes[i].length);
                }
                highlights[id].push(serialize(tmp));
                // markHighlight(id, highlights[id].length - 1, highlights[id].length);

                if(end){
                    return false;
                }
            }
        }
        else{
            started = saveHighlight(sel, id, nodes[i], started);
        }
    }

    return started;
}

function genRange(data){
    if(typeof(data) == "string"){
        data = JSON.parse(data);
    }

    var range = new Range(),
        startContainer = document.querySelector(data.startContainer.query).childNodes[data.startContainer.textIdx],
        startOffset = data.startOffset,
        endContainer = document.querySelector(data.endContainer.query).childNodes[data.endContainer.textIdx],
        endOffset = data.endOffset;

    range.setStart(startContainer, startOffset);
    range.setEnd(endContainer, endContainer.length > endOffset ? endOffset : endContainer.length);

    return range;
}

function restoreHighlight(serializedHighlight){
    highlights = JSON.parse(serializedHighlight);
    console.log("parsed : ", highlights);

    for(var key in highlights){
        if(key){
            markHighlight(key, true);
        }
    }
}

function removeHighlight(e){
    chrome.runtime.sendMessage({ type: "init" }, function(response){
        if(response.recordStat){
            var id = e.target.id;
            var targets = document.querySelectorAll(".HWhighlight#" + id);

            for(var i = 0; i < targets.length; i++){
                var target = targets[i];
                var pn = target.parentNode;

                // while(target.firstChild){
                //     pn.insertBefore(target.firstChild, target);
                // }

                var textIdx = getTextNodeIdx(target);
                if(textIdx != pn.childNodes.length - 1 && pn.childNodes[textIdx + 1].nodeType == 3){
                    var after = pn.childNodes[textIdx + 1]
                    pn.childNodes[textIdx].innerText += after.nodeValue;
                    pn.removeChild(after);
                }
                if(textIdx != 0 && pn.childNodes[textIdx - 1].nodeType == 3){
                    var before = pn.childNodes[textIdx - 1];
                    before.nodeValue += pn.childNodes[textIdx].innerText;
                    pn.removeChild(pn.childNodes[textIdx]);
                }
                else{
                    target.outerHTML = target.innerHTML;
                }
            }

            updateSerialization();

            // delete highlights[Number(id.split("h")[1])];
            // delete texts[Number(id.split("h")[1])];
            // chrome.runtime.sendMessage({ type : 'updateValue', target : "highlight", content : JSON.stringify(highlights)});
            chrome.runtime.sendMessage({ type : 'updateValue', target : "texts", content : texts });
        }
    });
}

//
// Event Listeners
//
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse){
    if(request.type == "getContent")
        sendResponse(document.getElementsByTagName('article')[0].innerText);
});
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse){
    if(request.type == "getHighlight"){
        console.log("Got highlight : ", request.content);
        if(request.content){
            restoreHighlight(request.content);
        }
    }
});

chrome.runtime.sendMessage({ type : "init" }, function(response){
    recordStat = response.recordStat;
    document.addEventListener('mouseup', getHighlight);
});
