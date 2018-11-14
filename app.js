// app.js
var keypress = require('keypress');
const sqlite3 = require('sqlite3').verbose();


var italians_fetcher = require('./italians_loader.js');

// INFO -- start
var _initialPage = 11;
var _lastPage = 32;
//var _lastPage = 503;
var _currentPage = _initialPage;
//var _currentThreadId = italians_fetcher.GetThreadIdDiscVarie();
var _currentThreadId = italians_fetcher.GetThreadIdWilkommen();
var _modeProcess = "ProcessIxFile"; //"ProcessIxFile"; //"SaveFileLocal";
// per scaricare il file scommenta questa lina
//var _modeProcess = "SaveFileLocal";
// INFO -- end

var _fetch_end = function () {
    _currentPage += 1;
    if (_currentPage <= _lastPage) {
        processNextFetch();
    }
    else {
        if (_modeProcess == "ProcessIxFile") {
            italians_fetcher.CheckErrorInsert();
        }
        console.log("Terminated, nothing to do here");
    }
};

var processNextFetch = function () {
    switch (_modeProcess) {
        case "SaveFileLocal":
            italians_fetcher.save_page_ix(_currentPage, _currentThreadId, _fetch_end);
            break;
        case "ProcessIxFile":
            italians_fetcher.processFileIx(_currentPage, _currentThreadId, _fetch_end);
            break;
        default:
            console.error("Unknown operation mode ", _modeProcess);
            break;
    }
}


let db = new sqlite3.Database('./iolvienna.db', sqlite3.OPEN_READWRITE, (err) => {
    if (err) {
        console.error(err.message);
    }
    console.log('Connected to the iolvienna database.');
});

keypress(process.stdin);
process.stdin.setRawMode(true);

process.stdin.on('keypress', function (ch, key) {
    //console.log('got "keypress"', key);
    if (key && key.name == 'c') {
        console.log("That's all folks!");
        db.close((err) => {
            if (err) {
                console.error(err.message);
            }
            console.log('Close the database connection.');
        });
        process.stdin.pause();
    }
});


process.stdin.resume();

console.log(" ==> Starting the iol vienna fetcher, process mode is ", _modeProcess)
italians_fetcher.set_db_conection(db);
processNextFetch();


