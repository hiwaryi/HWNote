var recordButton = document.getElementsByClassName('record')[0];
var addNotebookButton = document.getElementsByClassName('addNotebook')[0];
var notebooksDiv = document.getElementsByClassName('notebooks')[0];
var recordStat;
var curNotebook;

notebooksDiv.addEventListener('click', function(e){
    var clicked = e.target.id;
    console.log(clicked);

    if(curNotebook != clicked){
        curNotebook = clicked;
        chrome.runtime.sendMessage({ type : 'changeNotebook', content : clicked});
        boldCurNotebook();
    }
});

function setButtonText(){
    console.log("set");
    if(recordStat == true)
        recordButton.innerHTML = "Recording..";
    else
        recordButton.innerHTML = "Not recording..";
};

function boldCurNotebook(){
    var strong = document.createElement('strong');
    var target = document.querySelector(".notebookName#" + curNotebook);

    strong.innerHTML = target.outerHTML;
    target.parentNode.replaceChild(strong, target);
}

function showNotebookList(notebookList){
    for(var i = 0; i < notebookList.length; i++){
        var html = document.createElement('a');
        html.className = "notebookName";
        html.id = notebookList[i];
        html.innerText = notebookList[i];

        notebooksDiv.appendChild(html);
        notebooksDiv.insertAdjacentHTML('beforeend', "<br>");
    }

    boldCurNotebook();
}

// reflect current record stat to button
chrome.runtime.sendMessage({ type : "getRecordStat" }, function(response){
    console.log("Message Responsed : getRecordStat");

    recordStat = response.recordStat;
    curNotebook = response.curNotebook;

    setButtonText();
    showNotebookList(response.notebookList);
});

recordButton.addEventListener('click', function(){
    console.log("button clicked!");

    recordStat = recordStat ^ true;
    setButtonText();

    chrome.runtime.sendMessage({ type : "setRecordStat", content : recordStat });
});

addNotebookButton.addEventListener('click', function(){
    var notebookName = prompt("Please input new notebook's name : ");

    chrome.runtime.sendMessage({ type : 'newNotebook', content : notebookName });
});
