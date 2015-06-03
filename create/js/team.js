/*global define*/
/*jslint browser:true, nomen:true*/
define([], function () {
    'use strict';

    var doc,
        queue = [],
        localDb,
        init,
        paused,
        save;

    paused = function () {
        if (!doc) {
            localDb.get('team')
                .then(function (result) {
                    doc = result;
                    console.log('retrieved', doc);
                    queue.forEach(function (msg) {
                        save(msg.author, msg.text, msg.timestamp);
                    });
                    queue = [];
                }, function (err) {
                    console.error('Error retrieving team doc from local', err);
                });
        }
    };

    save = function (author, text, timestamp) {
        var msg = {
                timestamp: timestamp || new Date().toISOString(),
                author: author,
                text: text
            };

        if (!doc) {
            queue.push(msg);
            return;
        }
        doc.talk.push(msg);
        localDb.put(doc)
            .catch(function (err) {
                console.error('Error saving team doc locally', err);
            });
    };

    init = function (local, remote) {
        localDb = local;

        // teamtalk
        local.replicate.from(remote, {
            live: true,
            doc_ids: ['team'],
            retry: true,
            include_docs: true
        })
            .on('error', function (err) {
                console.error('Error replicating team from zone', err);
            })
            .on('paused', function (err) {
                if (err) {
                    console.error('Error replicating team from zone (paused)', err);
                }
                paused();
            })
            .on('change', function (changed) {
                doc = changed.docs[0];
            });
        local.replicate.to(remote, {live: true})
            .on('error', function (err) {
                console.error('Error replicating team to zone', err);
            })
            .on('change', function (changed) {
                doc = changed.docs[0];
            });
    };

    return function (local, remote) {
        console.log({local: local, remote: remote});
        init(local, remote);

        return {
            save: save
        };
    };
});
