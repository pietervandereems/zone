/*global PouchDB*/
/*jslint browser:true, nomen:true*/
(function () {
    'use strict';
    var db = new PouchDB('zone'),
        characters = {},
        elements,
        refreshContent,
        addCharacterListeners,
        saveChange;

    refreshContent = function (character) {
        db.get(characters[character].docId, function (err, doc) {
            if (err) {
                console.error('Error getting character doc', {character: character, docId: characters[character].docId, error: err});
                return;
            }
            characters[character].node.innerHTML = doc.blog.replace('<script', 'nope');
            characters[character].doc = doc;
        });
    };

    // Save changes to the database
    saveChange = function (ev) {
        var charInfo = characters[ev.target.dataset.character];
        charInfo.doc.blog = charInfo.node.innerHTML.replace('<script', 'nope');
        db.put(charInfo.doc, charInfo.docId, charInfo.doc._rev, function (err) {
            if (err) {
                console.error('Error saving doc', charInfo, err);
            }
        });
    };

    // Listen on the character fields to save changes.
    addCharacterListeners = function () {
        Object.keys(characters).forEach(function (key) {
            var character = characters[key];
            character.node.addEventListener('blur', saveChange);
            character.node.addEventListener('focusout', saveChange);
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
                    if (Array.isArray(response.rows) && response.rows.length > 0) {
                        characters[elm.dataset.character].docId = response.rows[0].id;
                        refreshContent(elm.dataset.character);
                    }
                });
            });
            addCharacterListeners();
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
        })
        .on('change', function (info) {
            if (info.ok && Array.isArray(info.docs)) {
                info.docs.forEach(function (doc) {
                    refreshContent(doc.name);
                });
            }
        });
    db.replicate.to('https://zone.mekton.nl/db/zone', {live: true})
        .on('error', function (err) {
            console.error('Error replicating to zone', err);
        });
}());
