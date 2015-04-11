/*jslint couch:true, node:true, nomen: true*/
var convert,
    argv, // will contain nonnom later
    db; // Local variables

// Set cli options with nomnom
argv = require('nomnom')
    .help('Convert skill field to talk skill structure')
    .options({
        "server": {
            abbr: "s",
            required: true,
            help: "Server to deploy to"
        },
        "database": {
            abbr: "d",
            required: true,
            help: "Database(s) to deploy to, use multiple if needed"
        }
    })
    .parse();


convert = function (db) {
    "use strict";
    db.view('local/namesPcNpc', {include_docs: true}, function (err, result) {
        if (err) {
            console.error('Error with view', err);
            return;
        }
        if (!Array.isArray(result.rows) || result.rows.length === 0) {
            console.error('View returned no rows', result);
            return;
        }
        result.rows.forEach(function (row) {
            var skilllist = {},
                doc = row.doc;
            if (typeof doc.skills === "object") {
                Object.keys(doc.skills).forEach(function (stat) {
                    skilllist[stat] = [];
                    Object.keys(doc.skills[stat]).forEach(function (skill) {
                        skilllist[stat].push({
                            name: skill,
                            level: doc.skills[stat][skill],
                            ip: 0
                        });
                    });
                });
                doc.skills = skilllist;
                db.save(doc._id, doc._rev, doc, function (err) {
                    if (err) {
                        console.error('Error saving doc', {doc: doc, err: err});
                    } else {
                        console.log('Saved', doc.name);
                    }
                });
            }
        });
    });
};

// ** Main **
// Open connection to the database
(function () {
    "use strict";
    var cradle = require("cradle"),
        url = require("url"),
        options = {
            cache: true
        },
        auth,
        conn,
        db;
    conn = url.parse(argv.server, true, true);
    if (conn.auth) {
        auth = conn.auth.split(":");
        options.auth = {
            username: auth[0],
            password: auth[1]
        };
    }
    if (!conn.port) {
        if (conn.protocol === "http:") {
            conn.port = 80;
        } else if (conn.protocol === "https:") {
            conn.port = 443;
        } else {
            console.error("Unknown protocol and no port given", conn.protocol);
            process.exit(2);
        }
    }
    console.log("cradle", conn);
    db = new (cradle.Connection)(conn.protocol + "//" + conn.hostname, conn.port, options).database(argv.database);
    convert(db);
}());
