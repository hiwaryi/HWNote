// TODO: deal with various type of articles

var highlights = new Object();
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
        if(nodes[i] == node){
            return i;
        }
    }
}

function genQuery(node){
    var tagName = node.tagName,
        result = [],
        textIdx = getTextNodeIdx(node);

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

function serialize(){
    var result = new Object();

    for(var key in highlights){
        if(key){
            var ranges = highlights[key],
                queries = [];

            for(var i = 0; i < ranges.length; i++){
                var range = ranges[i];

                queries.push({
                    startContainer: genQuery(range.startContainer),
                    startOffset: range.startOffset,
                    endContainer: genQuery(range.endContainer),
                    endOffset: range.endOffset
                });
            }

            result[key] = queries;
        }
    }

    return result;
}

function markHighlight(id){
    var highlight = highlights[id];
    var sel = window.getSelection();
    sel.removeAllRanges();

    for(var i = 0; i < highlight.length; i++){
        var span = document.createElement('span');
        span.className = "highlight";
        span.id = "h" + id;
        span.addEventListener('click', removeHighlight);
        highlight[i].surroundContents(span);
    }

    console.log("Marked highlight : ", id);
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

        // debugger;
        var content = serialize();
        console.log(content);
        chrome.runtime.sendMessage({ type : 'updateHighlight', content : content });

        console.log("Highlight sent!");
        markHighlight(id);
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
                    tmp.setStartBefore(nodes[i]);
                }
                if(!end){
                    tmp.setEndAfter(nodes[i]);
                }
                highlights[id].push(tmp);

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

function genRange(string){
    var _highlight = JSON.parse(string);

    var range = new Range(),
        startContainer = document.querySelector(ranges[i].startContainer.query).childNodes[ranges[i].startContainer.textIdx],
        startOffset = ranges[i].startOffset,
        endContainer = document.querySelector(ranges[i].endContainer.query).childNodes[ranges[i].endContainer.textIdx],
        endOffset = ranges[i].endOffset;

    range.setStart(startContainer, startOffset);
    range.setEnd(endContainer, endOffset);

    markHighlight(range);
}

function restoreHighlight(serializedHighlight){
    console.log(serializedHighlight);
    var _highlights = JSON.parse(serializedHighlight);
    console.log(_highlights);

    for(var key in _highlights){
        if(key){
            var ranges = _highlights[key];
            highlights[key] = []

            for(var i = 0; i < ranges.length; i++){
                var range = new Range(),
                    startContainer = document.querySelector(ranges[i].startContainer.query).childNodes[ranges[i].startContainer.textIdx],
                    startOffset = ranges[i].startOffset,
                    endContainer = document.querySelector(ranges[i].endContainer.query).childNodes[ranges[i].endContainer.textIdx],
                    endOffset = ranges[i].endOffset;

                range.setStart(startContainer, startOffset);
                range.setEnd(endContainer, endOffset);
                highlights[key].push(range);
            }
        }

        markHighlight(key);
    }
}

function removeHighlight(e){
    var id = e.target.id;
    var targets = document.querySelectorAll(".highlight#" + id);

    for(var i = 0; i < targets.length; i++){
        var target = targets[i];
        var pn = target.parentNode;

        while(target.firstChild){
            pn.insertBefore(target.firstChild, target);
        }
        pn.removeChild(target);
    }
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
