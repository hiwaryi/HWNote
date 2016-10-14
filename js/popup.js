var recordButton = document.getElementsByClassName('record')[0];
var addNotebookButton = document.getElementsByClassName('addNotebook')[0];
var notebooksDiv = document.getElementsByClassName('notebooks')[0];
var notesDiv = document.getElementsByClassName('notes')[0];
var recordStat;
var curNotebook;

//
// Functions
//
function showRecordStat(){
    chrome.runtime.sendMessage({ type : "getRecordStat" }, function(response){
        recordStat = response;
        console.log("Record stat : ", recordStat);

        if(recordStat == true)
            recordButton.innerHTML = "Recording..";
        else
            recordButton.innerHTML = "Not recording..";
    });
};

function boldCurNotebook(){
    var strong = document.createElement('strong');
    var target = document.querySelector(".notebookName#" + curNotebook);

    strong.innerHTML = target.outerHTML;
    target.parentNode.replaceChild(strong, target);
}

function showNotebookList(){
    chrome.runtime.sendMessage({ type : "getNotebookList" }, function(response){
        var notebookList = response.notebookList;
        curNotebook = response.curNotebook;

        for(var i = 0; i < notebookList.length; i++){
            var html = document.createElement('a');
            html.className = "notebookName";
            html.id = notebookList[i];
            html.innerText = notebookList[i];

            notebooksDiv.appendChild(html);
            notebooksDiv.insertAdjacentHTML('beforeend', "<br>");
        }

        boldCurNotebook();
    });
}

function showNotes(){
    chrome.runtime.sendMessage({ type : "getNotes" });
    chrome.runtime.onMessage.addListener(function(request, sender, sendResponse){
        if(request.type == "sendNotes"){
            var notes = request.content;

            for(var i = 0; i < notes.length; i++){
                var html = document.createElement('a');
                html.className = "note";
                html.id = i;
                html.innerText = notes[i];

                notesDiv.appendChild(html);
                notesDiv.insertAdjacentHTML('beforeend', "<br>");
            }
        }

        chrome.runtime.onMessage.removeListener(this);
    })
}

//
// Event listeners
//
recordButton.addEventListener('click', function(){
    console.log("button clicked!");

    recordStat = recordStat ^ true;
    showRecordStat();

    chrome.runtime.sendMessage({ type : "setRecordStat", content : recordStat });
});

addNotebookButton.addEventListener('click', function(){
    var notebookName = prompt("Please input new notebook's name : ");

    chrome.runtime.sendMessage({ type : 'newNotebook', content : notebookName });
});

notebooksDiv.addEventListener('click', function(e){
    var clicked = e.target.id;
    console.log(clicked);

    if(curNotebook != clicked){
        curNotebook = clicked;
        chrome.runtime.sendMessage({ type : 'changeNotebook', content : clicked});
        boldCurNotebook();
    }
});


//
// Initializer
//
function init(){
    showRecordStat();
    showNotebookList();
    showNotes();
}
init();
