var notesDiv = document.getElementsByClassName('notes')[0];
var searchBar = document.getElementsByClassName('searchBar')[0];
var notebooksDiv = document.getElementsByClassName('notebooks')[0];
var curNotebookSpan = document.getElementsByClassName('curNotebookTitle')[0];
var addNotebookButton = document.getElementsByClassName('addNotebook')[0];
var pageContentDiv = document.getElementsByClassName('page-content')[0];
var styleTag = document.getElementsByTagName('style')[0];
var dialog = document.getElementsByTagName('dialog')[0];
var db;
var curNotebook;
var req;
var toDelete;

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

function showSearchResultBar(keyword){
    var html = '<div class="mdl-grid"> <div class="mdl-cell mdl-cell--10-col mdl-cell--1-offset search"> <button class="mdl-button mdl-js-button mdl-button--icon backButton"> <i class="material-icons backIcon">arrow_back</i> </button> <span class="searchKeyword">Search : keyword</span> </div> </div>';
    var node = (new DOMParser()).parseFromString(html, "application/xml");

    var backButton = node.getElementsByClassName("backButton")[0];
    backButton.addEventListener('click', function(e){
        location.assign("");
    });

    var searchKeyword = node.getElementsByClassName("searchKeyword")[0];
    searchKeyword.innerHTML = "Keyword : " + keyword;

    notesDiv.innerHTML += node.childNodes[0].innerHTML;
}

function showNotes(keyword){
    var index = db.transaction([curNotebook]).objectStore(curNotebook).index('time');
    var idx = 0;
    var notes = [];

    if(keyword){
        showSearchResultBar(keyword);
    }

    index.openCursor(null, "prev").onsuccess = function(e){
        var cursor = e.target.result;
        idx++;

        if(cursor && (keyword || idx <= 10)){
            if(keyword){
                if(cursor.value.title.indexOf(keyword) != -1 ||
                    cursor.value.url.indexOf(keyword) != -1 ||
                    (cursor.value.content && cursor.value.content.indexOf(keyword) != -1) ||
                    (cursor.value.keyword && cursor.value.keyword.indexOf(keyword) != -1)){
                        notes.push(cursor.value);
                }
            }
            else{
                notes.push(cursor.value);
            }
            cursor.continue();
        }
        else{
            for(var i = 0; i < notes.length; i++){
                var html = '<div class="mdl-grid"> <div class="mdl-cell mdl-cell--10-col mdl-cell--1-offset mdl-shadow--2dp"> <div class="mdl-grid mdl-grid--no-spacing"> <div class="mdl-cell mdl-cell--3-col thumbnail"> </div> <div class="mdl-cell mdl-cell--9-col"> <div class="mdl-card mdl-cell--12-col"> <div class="mdl-card__supporting-text"> <h4 class="title">Title</h4> <h6 class="date">2016-10-19 09:12</h6><br/> <div class="contents">Dolore ex deserunt aute ugiat aute nulla ea sunt aliqua nisi cupidatat eu. Nostrud in laboris labore nisi amet do dolor eu fugiat consectetur elit cillum esse. Pariatur occaecat nisi laboris tempor laboris eiusmod qui id Lorem esse commodo in. Exercitation aute dolore deserunt culpa consequat elit labore incididunt elit anim.</div> </div> <div class="mdl-card__menu"> <button class="mdl-button mdl-button--icon mdl-js-button mdl-js-ripple-effect"> <i class="material-icons favorite">star_border</i> </button> <button class="mdl-button mdl-button--icon mdl-js-button mdl-js-ripple-effect highlight"> <i class="material-icons">highlight</i> </button> <button class="mdl-button mdl-button--icon mdl-js-button mdl-js-ripple-effect delete"> <i class="material-icons">delete</i> </button> </div> <div class="bottom"> Keyword : <span class="keyword"></span> | visited : <span class="visited"></span> </div> </div> </div> </div> </div> </div>'
                var node = (new DOMParser()).parseFromString(html, "application/xml");

                // naming card and thumbnail
                var card = node.getElementsByClassName("mdl-shadow--2dp")[0];
                card.className += " note" + notes[i].id;
                var thumbnail = node.getElementsByClassName("thumbnail")[0];
                thumbnail.className += notes[i].id;

                // definition of thumbnail
                var styleDef = document.createTextNode(".thumbnail" + notes[i].id + "{ width:100%; position:relative; background:url(" + notes[i].thumbnail + ")no-repeat; background-size:cover; background-position:center}");
                styleTag.appendChild(styleDef);

                // favorite
                var star = node.getElementsByClassName("favorite")[0];
                star.className += notes[i].id;
                star.innerHTML = notes[i].favorite ? "star" : "star_border";

                // highlight
                var highlight = node.getElementsByClassName('highlight')[0];
                highlight.className += notes[i].id;

                // delete
                var del = node.getElementsByClassName('delete')[0];
                del.className += notes[i].id;

                // setting contents
                node.childNodes[0].getElementsByClassName('title')[0].innerHTML = '<a href="' + notes[i].url + '" target="_blank">' + notes[i].title + '</a>';
                node.childNodes[0].getElementsByClassName('date')[0].innerHTML = notes[i].time;
                node.childNodes[0].getElementsByClassName('keyword')[0].innerHTML = notes[i].keyword ? notes[i].keyword : "none";
                node.childNodes[0].getElementsByClassName('visited')[0].innerHTML = notes[i].visited;


                // notesDiv.appendChild(node.childNodes[0]);
                notesDiv.innerHTML += node.childNodes[0].innerHTML;

                if(!notes[i].highlight){
                    highlight = document.getElementsByClassName('highlight' + notes[i].id)[0];
                    highlight.outerHTML = "<button disabled" + highlight.outerHTML.substring(7);
                }
            }

            // Event Listeners
            for(var i = 0; i < notes.length; i++){
                // favorite
                var favorite = document.getElementsByClassName('favorite' + notes[i].id)[0];
                favorite.parentNode.addEventListener('click', function(e){
                    var favorite = e.target.parentNode.childNodes[1];
                    var id = favorite.classList[1].split("favorite")[1];

                    for(var i = 0; i < notes.length; i++){
                        if(id == notes[i].id) break;
                    }

                    if(favorite.innerText == "star"){
                        favorite.innerText = "star_border";
                        chrome.runtime.sendMessage({ type : "updateValue", target : "favorite", content : false, url : notes[i].url });
                    }
                    else{
                        favorite.innerText = "star";
                        chrome.runtime.sendMessage({ type : "updateValue", target : "favorite", content : true, url : notes[i].url });
                    }
                });

                // highlight
                var highlight = document.getElementsByClassName('highlight' + notes[i].id)[0];
                if(notes[i].highlight){
                    highlight.addEventListener('click', function(e){
                        alert('click!');

                        // TODO: show dialog
                    });
                }

                // delete
                var del = document.getElementsByClassName('delete' + notes[i].id)[0];
                del.addEventListener('click', function(e){
                    var del = e.target.parentNode;
                    var id = del.classList[4].split("delete")[1];

                    toDelete = id;
                    dialog.showModal();
                });
            }

            var backButton = document.getElementsByClassName("backButton")[0];
            backButton.addEventListener('click', function(e){
                location.assign(chrome.extension.getURL('detail.html'));
            });
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
    if(e.keyCode == 13 && searchBar.value){
        var url = "?search=" + searchBar.value;
        location.replace(url);
    }
});

dialog.querySelector('.ok').addEventListener('click', function(e){
    chrome.runtime.sendMessage({ type : 'deleteObject', url : toDelete }, function(e){
        location.reload();
    });
});

dialog.querySelector('.cancel').addEventListener('click', function(e){
    toDelete = null;
    dialog.close();
})

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

        chrome.runtime.sendMessage({ type : 'init' }, function(response){
            curNotebook = response.curNotebook;

            curNotebookSpan.innerText = curNotebook;

            var keyword = location.search.replace("?search=", "");
            showNotes(keyword);
            showNotebookList();
        });
    }
}
init();
