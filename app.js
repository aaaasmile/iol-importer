// app.js
var keypress = require('keypress');

var mysql = require('mysql');
var connection = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '!pdts123',
    database: 'viennapostdb'
});

var italians_fetcher = require('./italians_loader.js');

// INFO -- start
var _initialPage = 503;
var _lastPage = 503;
var _currentPage = _initialPage;
var _currentThreadId = italians_fetcher.GetThreadIdDiscVarie();
//var _currentThreadId = italians_fetcher.GetThreadIdWilkommen();
//var _modeProcess = "ProcessIxFile"; //"ProcessIxFile"; //"SaveFileLocal";
// per scaricare il file scommenta questa lina
var _modeProcess = "SaveFileLocal";
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

connection.connect(function (err) {
    if (!err) {
        console.log("DB connected");

        italians_fetcher.set_db_conection(connection);
        processNextFetch();
        
    } else {
        console.error("DB connection error");
    }
});

keypress(process.stdin);
process.stdin.setRawMode(true);

process.stdin.on('keypress', function (ch, key) {
    console.log('got "keypress"', key);
    if (key && key.name == 'c') {

        connection.end(function (err) {
            console.log("DB connection terminated");
        });

        process.stdin.pause();
    }
});


process.stdin.resume();


