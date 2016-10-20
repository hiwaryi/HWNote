var recordButton = document.getElementsByClassName('record')[0];
var addNotebookButton = document.getElementsByClassName('addNotebook')[0];
var notebooksDiv = document.getElementsByClassName('notebooks')[0];
var notesDiv = document.getElementsByClassName('notes')[0];
var detailDiv = document.getElementsByClassName('detail')[0];
var curNotebookSpan = document.getElementsByClassName('curNotebookTitle')[0];
var recordStat = false;
var curNotebook;
var req = window.indexedDB.open('HWNote');

req.onerror = function(e){
    console.log("DB error : ", e);
}
req.onsuccess = function(e){
    console.log("DB Success");
    db = req.result;
    init();
}

//
// Functions
//

function boldCurNotebook(){
    var strong = document.createElement('strong');
    var target = document.querySelector(".notebookName#" + curNotebook.replace(/ /g, "_"));

    target.innerHTML = "<strong>" + target.innerText + "</strong>";
}

function showNotebookList(){
    var notebookList = db.objectStoreNames;

    for(var i = 0; i < notebookList.length; i++){
        var a = document.createElement('a');
        a.className = "mdl-navigation__link notebookName";
        a.id = notebookList[i].replace(/ /g, "_");
        a.innerText = notebookList[i];

        notebooksDiv.insertAdjacentElement('beforeend', a);
    }

    boldCurNotebook();
}

function showNotes(){
    var index = db.transaction(curNotebook).objectStore(curNotebook).index('time'),
        idx = 0;

    index.openCursor(null, "prev").onsuccess = function(e){
        var cursor = e.target.result;

        if(cursor && idx++ < 10){
            var ul = document.createElement('ul');
            ul.className = "mdl-list__item";

            // title
            var span = document.createElement('span');
            span.className = "mdl-list__item-primary-content note";
            span.id = idx;
            span.innerHTML = cursor.value.title.replace("&lt;", "<").replace("&gt;", ">");
            if(cursor.value.title.length > 30){
                span.innerHTML = cursor.value.title.substring(0, 30) + "...";
            }

            // draw star
            var a = document.createElement('a');
            a.className = "mdl-list__item-secondary-action";
            a.href = "#";
            var star = document.createElement('i');
            star.className = "material-icons";
            star.innerText = cursor.value.favorite ? "star" : "star_border";
            star.addEventListener('click', function(e){
                if(e.target.innerText == "star"){
                    e.target.innerText = "star_border";
                    chrome.runtime.sendMessage({ type : "updateValue", target : "favorite", content : false, url : cursor.value.url });
                }
                else{
                    e.target.innerText = "star";
                    chrome.runtime.sendMessage({ type : "updateValue", target : "favorite", content : true, url : cursor.value.url });
                }
            });
            a.appendChild(star);

            ul.appendChild(span);
            ul.appendChild(a);
            notesDiv.insertAdjacentElement('afterbegin', ul);

            cursor.continue();
        }
    };
}

//
// Event listeners
//
recordButton.addEventListener('click', function(){
    recordStat = recordStat != true;

    console.log("Record Stat : ", recordStat);

    chrome.runtime.sendMessage({ type : "setRecordStat", content : recordStat });
});

addNotebookButton.addEventListener('click', function(){
    var notebookName = prompt("Please input new notebook's name : ");
    if(notebookName){
        chrome.runtime.sendMessage({ type : 'newNotebook', content : notebookName }, function(e){
            location.reload();
        });
    }
});

notebooksDiv.addEventListener('click', function(e){
    var clicked = e.target.id;
    console.log(clicked);

    if(curNotebook != clicked){
        boldCurNotebook();
        curNotebook = clicked;
        chrome.runtime.sendMessage({ type : 'changeNotebook', content : clicked}, function(e){
            location.reload();
        });
    }
});

detailDiv.addEventListener('click', function(e){
    chrome.tabs.create({ 'url' : chrome.extension.getURL('detail.html')});
});


//
// Initializer
//
function init(){
    chrome.runtime.sendMessage({ type: 'init' }, function(response){
        curNotebook = response.curNotebook;
        if(response.recordStat){
            recordButton.click();
        }

        curNotebookSpan.innerText = curNotebook;

        showNotebookList();
        showNotes();
    });
}
