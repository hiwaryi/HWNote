var notesDiv = document.getElementsByClassName('notes')[0];
var searchBar = document.getElementsByClassName('searchBar')[0];
var db;
var curNotebook;
var req;

//
// Functions
//
function showNotes(){
    var index = db.transaction([curNotebook]).objectStore(curNotebook).index('time');
    var idx = 0;
    var notes = [];

    index.openCursor(null, "prev").onsuccess = function(e){
        var cursor = e.target.result;
        idx++;

        if(cursor && idx <= 10){
            notes.push(cursor.value);
            console.log(cursor.value.title);
            cursor.continue();
        }
        else{
            for(var i = 0; i < notes.length; i++){
                var wrapper = document.createElement('div');
                wrapper.class = "note";
                wrapper.id = i;

                // TODO: show other datas as well
                if(notes[i].thumbnail){
                    var image = new Image();
                    image.src = notes[i].thumbnail;
                    image.width = 200;
                    image.height = 200;
                    wrapper.appendChild(image);
                }

                notesDiv.appendChild(wrapper);
                notesDiv.insertAdjacentHTML('beforeend', notes[i].title + "<br><br>");
            }
        }
    }
}

function doSearch(keyword){
    var objStore = db.transaction([curNotebook]).objectStore(curNotebook);
    var result = [];

    objStore.openCursor().onsuccess = function(e){
        var cursor = e.target.result;
        if(cursor){
            if(cursor.value.title.indexOf(keyword) != -1 ||
                cursor.value.url.indexOf(keyword) != -1 ||
                (cursor.value.content && cursor.value.content.indexOf(keyword) != -1) ||
                (cursor.value.keyword && cursor.value.keyword.indexOf(keyword) != -1)){

                result.push(cursor.value);
            }

            cursor.continue();
        }
        else{
            console.log(result);
        }
    }
}

//
// Event Listeners
//
searchBar.addEventListener('keypress', function(e){
    if(e.keyCode == 13){
        doSearch(searchBar.value);
    }
});

//
// Init
//
function init(){
    req = window.indexedDB.open('HWNote');
    req.onerror = function(e){
        console.log("DB Error");
    }
    req.onsuccess = function(e){
        console.log("DB Success");
        db = req.result;

        chrome.runtime.sendMessage({ type : 'getCurNotebook' }, function(response){
            curNotebook = response;

            showNotes();
        });
    }
}
init();
