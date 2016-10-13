var recordButton = document.getElementsByClassName('record')[0];
var addNoteButton = document.getElementsByClassName('addNote')[0];
var notesDiv = document.getElementsByClassName('notes')[0];
var recordStat;

function setButtonText(){
    console.log("set");
    if(recordStat == true)
        recordButton.innerHTML = "Recording..";
    else
        recordButton.innerHTML = "Not recording..";
};

// reflect current record stat to button
chrome.runtime.sendMessage({ type : "getRecordStat" }, function(response){
    console.log("Message Responsed : getRecordStat");
    console.log(response);

    recordStat = response;
    setButtonText();
});

recordButton.addEventListener('click', function(){
    console.log("button clicked!");

    recordStat = recordStat ^ true;
    setButtonText();

    chrome.runtime.sendMessage({ type : "setRecordStat", content : recordStat });
});

addNoteButton.addEventListener('click', function(){
    var noteName = prompt("Please input new note's name : ");

    chrome.runtime.sendMessage({ type : 'newNote', content : noteName });
});
