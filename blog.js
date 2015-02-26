/*global PouchDB*/
/*jslint browser:true, nomen:true*/
(function () {
    'use strict';
    var db = new PouchDB('zone'),
        characters = {},
        elements,
        firstTimePaused = false,
        refreshContent,
        refreshAll,
        addCharacterListeners,
        saveChange,
        queryCharacter;

    queryCharacter = function (character) {
        db.query({
            map: function (doc, emit) {
                emit(doc.name);
            },
            reduce: false
        }, {
            key: character
        }, function (err, response) {
            if (err) {
                console.error('Error querying database for character', character, err);
                return;
            }
            if (Array.isArray(response.rows) && response.rows.length > 0) {
                characters[character].docId = response.rows[0].id;
                refreshContent(character);
            }
        });
    };

    refreshContent = function (character) {
        if (!characters[character].docId) {
            queryCharacter(character);
            return;
        }
        db.get(characters[character].docId, function (err, doc) {
            if (err) {
                console.error('Error getting character doc', {character: character, docId: characters[character].docId, error: err});
                return;
            }
            characters[character].node.innerHTML = doc.blog.replace('<script', 'nope');
            characters[character].doc = doc;
        });
    };

    refreshAll = function () {
        Object.keys(characters).forEach(function (key) {
            refreshContent(key);
        });
    };

    // Save changes to the database
    saveChange = function (ev) {
        var charInfo = characters[ev.target.dataset.character];
        charInfo.doc.blog = charInfo.node.innerHTML.replace('<script', 'nope');
        db.put(charInfo.doc, charInfo.docId, charInfo.doc._rev, function (err, response) {
            if (err) {
                console.error('Error saving doc', charInfo, err);
                if (err.doc && err.doc._rev) {
                    charInfo.doc._rev = err.doc._rev;
                }
                return;
            }
            if (response.rev) {
                charInfo.doc._rev = response.rev;
            }
        });
    };

    // Listen on the character fields to save changes.
    addCharacterListeners = function () {
        Object.keys(characters).forEach(function (key) {
            var character = characters[key];
            if (typeof character.node.onblur !== 'undefined') {  // try to detect if the blur event is supported, not fullproof
                character.node.addEventListener('blur', saveChange);
            } else {
                character.node.addEventListener('focusout', saveChange);
            }
        });
    };
    // ** Determine characters **

    document.addEventListener('readystatechange', function () {
        if (document.readyState === 'interactive') {                // Only get all characters after the dom is ready
            elements = document.querySelectorAll('[data-character]');
            Object.keys(elements).forEach(function (item) {
                var elm;
                if (item !== 'length') { // In FF this elements is a NodeList (not an array) in Chromium it is an array so it includes a length item
                    elm = elements[item];
                    characters[elm.dataset.character] = {
                        node: elm
                    };
                    queryCharacter(elm.dataset.character);
                }
            });
            addCharacterListeners();
        }
    });


    // *
    // ** Database
    // *

    // ** Start replications **
    db.replicate.from('https://zone.mekton.nl/db/zone', {
        live: true,
        doc_ids: [
            '01f2fd12e76c1cd8f97fa093dd000841',
            '01f2fd12e76c1cd8f97fa093dd00cb2a',
            '01f2fd12e76c1cd8f97fa093dd00cc78'
        ], // Since filter is not working at the moment, use a predetermined list of doc ids
        retry: true})
        .on('error', function (err) {
            console.error('Error replicating from zone', err);
        })
        .on('paused', function (err) {
            if (err) {
                console.error('Error replicating from zone (paused)', err);
                return;
            }
            if (!firstTimePaused) {
                firstTimePaused = true;
                refreshAll();
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
