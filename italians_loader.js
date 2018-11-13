// italians_fetcher.js

var cheerio = require('cheerio')
  , request = require('request')
  , fs = require('fs');

// mysql connection : https://github.com/felixge/node-mysql


var _ = require('../common/lib/underscore-min.js');
var utils = require('../common/lib/utils.js');

var _tmp_body_name = 'body.html';
var _connection_db;
var _errorInsert = [];
var THREAD_WILKOMMEN = '263';
var THREAD_DISCVARIE = '80';
var _force_update = false;

var _settings = {
    '263': { source_id: 3, last_page: -1 },
    '80': { source_id: 1, last_page: -1 }
};

exports.set_db_conection = function (conn) {
    _connection_db = conn;
    _errorInsert = [];
    // TODO: read _settings from db
}

exports.save_page_ix = function (page_ix, threadid, cb_end) {
    getRemoteBody(page_ix, threadid, function (body) {
        console.log('Body fetch OK');
        var fname = get_fname_on_page_ix(page_ix, threadid);
        console.log('Now save the body into the file (no db process)', fname);
        fs.writeFile(fname, body, function (err) {
            if (!err) {
                console.log("Saved ok");
                cb_end();
            } else {
                console.log("Save error %s", err);
            }
        });
    });
}

exports.check_page_ix = function (page_ix, threadid) {
    getRemoteBody(page_ix, threadid, function (body) {
        console.log('Body fetch OK');
        console.log("Process body in order to save it in db");
        processBody(body, page_ix, threadid);
    });
}

exports.processFileIx = function (ix, threadId, cb_end) {
    console.log("Request processing file ix %d on thread id %s", ix, threadId);
    var fname = get_fname_on_page_ix(ix, threadId);
    processFile(fname, ix, threadId, cb_end);
}

exports.CheckErrorInsert = function () {
    console.log("Errors on insert ", _errorInsert.length);
    _.each(_errorInsert, function (item) {
        console.log("Error post ", item.page_ix);
    });
}

exports.GetThreadIdWilkommen = function () { return THREAD_WILKOMMEN; }
exports.GetThreadIdDiscVarie = function () { return THREAD_DISCVARIE; }

var get_fname_on_page_ix = function (page_ix, threadid) {
    if (threadid == THREAD_DISCVARIE) {
        return "data_down/forumDisc/" + page_ix + "_" + _tmp_body_name;
    } else if (threadid == THREAD_WILKOMMEN) {
        return "data_down/forumWill/" + page_ix + "_" + _tmp_body_name;
    }
}

var getRemoteBody = function (page_ix, threadid, cb_body) {
    var url = 'http://www.italiansonline.net/forum3.php?sezione=27&thread=' + threadid;
    if (page_ix > 1) {
        url = url + '&pagina=' + page_ix;
    }
    var threadName = "Discussioni Varie";
    if (threadid === THREAD_WILKOMMEN) { threadName = "Willkommen in Wien"; }
    console.log('request remote page ix %d, thread id %s, url %s', page_ix, threadName, url);
    request({
        encoding: 'binary',
        uri: url
    }, function (err, response, body) {
        if (!err) {
            cb_body(body);
        } else {
            console.log("Error ", err);
        }
    });
}

var processFile = function (fname, page_ix, threadid, cb_end) {
    console.log("Process file %s", fname);
    fs.readFile(fname, 'utf-8', function (err, data) {
        if (err) throw err;
        //console.log(data);
        processBody(data, page_ix, threadid, cb_end);
    });
}

var processBody = function (body, page_ix, threadid, cb_end) {
    var post, user, post_json;
    var arr_post = [];
    var lastPage = -1;

    console.log("Process body %s id %s", page_ix, threadid);
    $ = cheerio.load(body);
    //var post = $('.smalldark').text();
    $('table[cellpadding=2]').each(function (table_ix, elem) {
        post_json = undefined;
        // questa è la tabella che contiene i post con l'utente
        var line_post = $(elem).children('tr').first();
        // le info che ci servono sono nella prima riga
        //console.log("Table %d, line %s", table_ix, line_post.text());
        line_post.children('td').each(function (td_ix, td_ele) {
            post = $(td_ele).text().trim();
            if (post !== undefined && post.length > 0) {
                if (td_ix === 0) {
                    // le info sull'utente sono nella prima colonna, poi il post può essere nella prima o nella terza
                    user = processUserRaw(td_ele);
                    //console.log("User info: %s", user);
                } else if (td_ix === 1) {
                    post_json = contentPost(td_ele);
                } else if (td_ix === 3) {
                    post_json = contentPost(td_ele);
                } else {
                    //console.log("----> rej %d %s", td_ix, post);
                }
            }
        });

        if (post_json) {
            var second = $(line_post).siblings().first(); // NOTE: children get into the deeph, siblings stay on the same level
            post_json.date_post = parsePostDate($(second).text().trim());
            post_json.post_id = parsePostId(second);
            post_json.page_ix = page_ix;
            post_json.source_forum_threadid = threadid;

            //console.log("*** ID candidate: ", second.children('a').first());

            post_json.user_info = user;
            arr_post.push(post_json);
        }
    });
    console.log("Fully recognized posts %d", arr_post.length);
    //_.each(arr_post, function (item) {
    //    console.log("\nPOST \n",item);
    //});

    console.log('Last post is: ', arr_post[arr_post.length - 1]);
    console.log("Process post terminated.");

    // search the last page
    $('div[class=smalldark]').each(function (ix, elem) {
        var line_page = $(elem).children('a').last();
        //console.log("++ a : ", line_page.text());
        var text_a = line_page.text();
        if (lastPage === -1 &&
            text_a === "Fine" && line_page['0']) {
            //console.log("++ a link : ", line_page['0'].attribs.href);
            var strUrl = line_page['0'].attribs.href;
            lastPage = getLastPageFromUrl(strUrl);
            console.log("Last page recognized ", lastPage);
        }

    });

    if (lastPage !== -1 &&
        _settings[threadid].last_page !== lastPage) {
        saveLastPageInDb(_settings[threadid].source_id, lastPage);
    }

    savePostsInDb(arr_post, cb_end);
}

var getLastPageFromUrl = function (url) {
    var res = -1;
    var arr_attr = url.split("&");
    var pair_arr;
    _.each(arr_attr, function (item) {
        //console.log("+++ item ", item);
        pair_arr = item.split('=');
        if (pair_arr.length === 2) {
            if (pair_arr[0] === 'pagina') {
                res = parseInt(pair_arr[1], 10);
            }
        }
    });
    return res;
}

var checkDbConnection = function () {
    if (!_connection_db) {
        console.error("No db connection available");
        throw "Connection error";
    }
}

var saveLastPageInDb = function (source_id, lastPage) {
    checkDbConnection();

    console.log("Save last page %d for source id %d", source_id, lastPage)
    _connection_db.query('UPDATE iol_sources SET LastPage = ? WHERE Id = ?  ',
            [lastPage, source_id], function (err, resUpdate) {
                if (!err) {
                    console.log('Update OK', resUpdate.affectedRows);
                } else {
                    console.error("Update error %s", err);
                }
            });
}

var savePostsInDb = function (arr_post, cb_end) {
    checkDbConnection();

	if(arr_post.length == 0){return;}
    console.log("Start to save all post in db");
    var proc_cout = utils.proc_counter_ctor(arr_post.length, function () {
        console.log("all body posts processed");
        if (cb_end) {
            cb_end();
        }
    });

    _.each(arr_post, function (post) {
        insertOrUpdateSinglePost(post, proc_cout);
    });
}

var insertOrUpdateSinglePost = function (post, proc_cout) {
    var post_for_db;
    _connection_db.query('SELECT COUNT(*) FROM iol_posts WHERE post_id = ?', [post.post_id], function (err, results) {
        if (err) {
            console.error("Error ", err);
            proc_cout.item_done_failed();
            return;
        }
        count = results[0]['COUNT(*)'];
        //console.log('Count is %d for post_id %s', count, post.post_id);
        if (count === 0) {
            console.log('Want insert post with post_id ', post.post_id);
            post_for_db = getPostDataForDb(post);
            _connection_db.query('INSERT INTO iol_posts SET ?', post_for_db, function (err, resInsert) {
                if (!err) {
                    console.log('Insert OK', resInsert.affectedRows);
                } else {
                    console.error("Insert error %s on post", err, post);
                    _errorInsert.push(post);
                }
                proc_cout.item_done_ok();
            });
        } else {
            console.log('Post %s is already in db', post.post_id);
            if (_force_update) {
                post_for_db = getPostDataForDb(post);
                _connection_db.query('UPDATE iol_posts SET ? WHERE post_id = ?', [post_for_db, post_for_db.post_id], function (err, resUpdate) {
                    if (!err) {
                        console.log('Update OK', resUpdate.affectedRows);
                    } else {
                        console.error("Update error %s on post", err, post);
                        _errorInsert.push(post);
                    }
                    proc_cout.item_done_ok();
                });
            } else {
                proc_cout.item_done_ok();
            }
        }
    });
}

var getPostDataForDb = function (post) {
    var source_id = _settings[post.source_forum_threadid].source_id;
    return {
        post_id: post.post_id,
        post_parent_id: post.parent_id,
        post_content: post.content,
        date_published: post.date_post,
        user_name: post.user_info.name,
        forum_source: source_id
    }
}

var parsePostId = function (elem) {
    var id_res = undefined;
    var res;
    var id_exp = /rispondi=(\d+)/;
    _.each(elem.children('a'), function (item) {
        //console.log("*** a id ", item.attribs);
        if (item.attribs.href) {
            res = id_exp.exec(item.attribs.href);
            if (res) {
                //console.log('*** res exec', res[1]);
                id_res = res[1];
            }
        }
    });

    return id_res;
}

var parsePostDate = function (date_time_raw) {
    var post_date = null;
    var date_time_arr = date_time_raw.split('-');
    if (date_time_arr != null && date_time_arr.length >= 2) {
        var date_raw = date_time_arr[0].trim();
        var ggmmaa_arr = date_raw.split('/');
        //console.log("** ggmmaa_arr: ", ggmmaa_arr);
        var gg = parseInt(ggmmaa_arr[0], 10);
        var mese = parseInt(ggmmaa_arr[1], 10);
        var aa = parseInt(ggmmaa_arr[2], 10);
        var time_raw = date_time_arr[1].trim().split(" ")[0].trim();
        var hhmm_arr = time_raw.split(':');
        var hh = parseInt(hhmm_arr[0], 10);
        var min = parseInt(hhmm_arr[1], 10);
        post_date = new Date(aa, mese - 1, gg, hh, min, 0, 0);
        //console.log("*** gg, mm, aa", gg, mese, aa);
        //console.log("***** date %s time %s, date obj %s", date_raw, time_raw, post_date);
    }
    return post_date;
}

var processUserRaw = function (eleUser) {
    var ret = { name: '' }, arr_shortname;
    var name = $(eleUser).children('a').first();
    if (name !== undefined) {
        arr_shortname = name.text().split(":");
        ret.name = arr_shortname[0];
        if (ret.name.length > 64) {
            arr_shortname = ret.name.split(">");
            ret.name = _.last(arr_shortname);
        }
        //console.log("*** Name is %s, original is: ", ret.name, name.text());
    }
    return ret;
}

var contentPost = function (td_ele) {
    var post, post_json;
    var num_link = $(td_ele).children('a').length;
    var res, parent_id, signature_txt;
    var parent_exp = /#(\d+)/;
    var to_be_rem = [];
    var links_to_be_repl = [];
    //console.log('*** num link **', num_link);
    _.each($(td_ele).children('a'), function (item) {
        //console.log(item.attribs);
        // searching a parent link and remove it
        if (item.attribs.href) {
            res = parent_exp.exec(item.attribs.href);
            if (res) {
                //console.log('res exec', res[1]);
                parent_id = res[1];
                to_be_rem.push(item);
            }
        }
        if (item.attribs.title) {
            // link shall be replaced with something more readable
            //console.log("LINK: ", item.attribs.title);
            links_to_be_repl.push({ tag: item, link: item.attribs.title });
        }
    });

    _.each(links_to_be_repl, function (item) {
        $(item.tag).replaceWith('"' + item.link + '":' + item.link);
    });

    _.each(to_be_rem, function (item) {
        $(item).remove(); // NOTE: $(td_ele).remove($(to_be_rem)) doesn't works
    });

    post = $(td_ele).text().trim();

    var sign_exp = /      --/;
    res = sign_exp.exec(post);
    if (res) {
        // signature is recognize in text, not in html
        //console.log("Signature ", res.index);
        signature_txt = post.substr(res.index + 9, post.length - 1).trim();
        post = post.substr(0, res.index).trim();
    }

    if (post) {
        post_json = {
            content: post,
            parent_id: parent_id, signature: signature_txt
        };
    }

    return post_json;
}
