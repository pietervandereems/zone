/*global PouchDB*/
/*jslint browser:true*/
(function () {
    'use strict';
    var db = new PouchDB('zone'),
        characters = {},
        elements,
        initialReplicationDone = false,
        refreshContent;

    refreshContent = function (character) {
        db.get(characters[character].docId, function (err, doc) {
            if (err) {
                console.error('Error getting character doc', {character: character, docId: characters[character].docId, error: err});
                return;
            }
            characters[character].node.innerHTML = doc.blog;
        });
    };

    // ** Determine characters **

    document.addEventListener('readystatechange', function () {
        if (document.readyState === 'interactive') {                // Only get all characters after the dom is ready
            elements = document.querySelectorAll('[data-character]');
            Object.keys(elements).forEach(function (item) {
                var elm = elements[item];
                characters[elm.dataset.character] = {
                    node: elm
                };
                db.query({
                    map: function (doc, emit) {
                        emit(doc.name);
                    },
                    reduce: false
                }, {
                    key: elm.dataset.character
                }, function (err, response) {
                    if (err) {
                        console.error('Error querying database for character', elm.dataset.character, err);
                        return;
                    }
                    characters[elm.dataset.character].docId = response.rows[0].id;
                    refreshContent(elm.dataset.character);
                });
            });
        }
    });


    // *
    // ** Database
    // *


    // ** Start replications **
    db.replicate.from('https://zone.mekton.nl/db/zone', {live: true, filter: 'zone/characters', retry: true})
        .on('error', function (err) {
            console.error('Error replicating from zone', err);
        })
        .on('paused', function (err) {
            if (err) {
                console.error('Error replicating from zone (paused)', err);
                return;
            }
            initialReplicationDone = true;
        })
        .on('change', function (info) {
            console.log('change from', info, arguments);
        });
    db.replicate.to('https://zone.mekton.nl/db/zone', {live: true})
        .on('error', function (err) {
            console.error('Error replicating to zone', err);
        });
}());
