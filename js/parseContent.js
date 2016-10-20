// TODO: deal with various type of articles

var highlights = new Object();
var texts = new Object();
var curNotebook;

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

function markHighlight(id){
    var highlight = highlights[id];
    var sel = window.getSelection();
    sel.removeAllRanges();
    var text = [];

    for(var i = 0; i < highlight.length; i++){
        var range = genRange(highlight[i]);
        var span = document.createElement('span');
        span.className = "HWhighlight";
        span.id = "h" + id;
        span.addEventListener('click', removeHighlight);
        range.surroundContents(span);

        text.push(span.innerText);
    }

    texts[id] = text.join("");

    chrome.runtime.sendMessage({ type : 'updateValue', target : 'texts', content : texts})
    console.log("Marked highlight : ", texts[id]);
}

function getHighlight(){
    var sel = window.getSelection();

    if(sel.type == 'Range'){
        console.log("User selected something!");

        var id = Object.keys(highlights).length ? Number(Object.keys(highlights)[Object.keys(highlights).length - 1]) + 1 : 0;
        highlights[id] = [];

        for(var i = 0; i < sel.rangeCount; i++){
            saveHighlight(sel.getRangeAt(i), id);
        }

        markHighlight(id);

        chrome.runtime.sendMessage({ type : 'updateValue', target : "highlight", content : JSON.stringify(highlights)});
        console.log("Highlight sent!");
    }
}

function saveHighlight(sel, id, node, started){
    node = node || document.body;
    started = started || false;
    var nodes = node.childNodes;

    // debugger;

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
            markHighlight(key);
        }
    }
}

function removeHighlight(e){
    var id = e.target.id;
    var targets = document.querySelectorAll(".HWhighlight#" + id);

    for(var i = 0; i < targets.length; i++){
        var target = targets[i];
        var pn = target.parentNode;

        while(target.firstChild){
            pn.insertBefore(target.firstChild, target);
        }
        pn.removeChild(target);
    }

    console.log("before delete : ", highlights);
    delete highlights[Number(id.split("h")[1])];
    delete texts[Number(id.split("h")[1])];
    console.log("after delete : ", highlights);
    chrome.runtime.sendMessage({ type : 'updateValue', target : "highlight", content : JSON.stringify(highlights)});
    chrome.runtime.sendMessage({ type : 'updateValue', target : "highlight", content : texts });
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
        restoreHighlight(request.content);
    }
})

document.addEventListener('mouseup', getHighlight);
