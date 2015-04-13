/*jslint browser:true, nomen:true*/
/*global requirejs*/
requirejs(['pouchdb-master.min', 'talk', 'skills'], function (Pouchdb, Talk, Skills) {
    'use strict';
    var // Internal variables
        db = new Pouchdb('zone'),
        remote = new Pouchdb('https://zone.mekton.nl/db/zone'),
        replicator,
        elements = {},
        manifestUrl = 'https://zone.mekton.nl/manifest.webapp',
        users = {
        },
        talks = {
            user: Object.create(Talk),
            team: Object.create(Talk)
        },
        skills = Object.create(Skills),
        // Interface elements
        setElements,
        // Helper functions
        setMsg,
        revSeq,
        // Event functions
        addOnEnter,
        // Database functions
        updateTalks,
        updateUsers,
        processChanges,
        startReplicator,
        // Device functions
        setBatteryManagers;

    // **************************************************************************************************
    // Shortcuts to interface elements
    // **************************************************************************************************

    setElements = function () {
        elements.consol = document.getElementById('consol');
        elements.skills = document.getElementById('skills');
        elements.team = document.querySelector('[data-talk="team"]');
        elements.prive = document.querySelector('[data-talk="private"]');
        elements.user = document.querySelector('#topbar>select');
        // Tell talk which element is it's home
        talks.user.element = elements.prive;
        talks.team.element = elements.team;
        // Tell skills which element is it's home
        skills.element = elements.skills;
    };

    if (!document.getElementById('consol') ||
            !document.querySelector('[data-talk="team"]') ||
            !document.querySelector('[data-talk="private"]')) {
        document.addEventListener("DOMContentLoaded", function () {
            setElements();
        });
    } else {
        setElements();
    }

    // **************************************************************************************************
    // Extend
    // **************************************************************************************************
    String.prototype.capitalize = function () {
        return this.charAt(0).toUpperCase() + this.slice(1);
    };

    // **************************************************************************************************
    // Helper functions
    // **************************************************************************************************

    setMsg = function (msg) {
        elements.consol.innerHTML = msg;
        window.setTimeout(function () {
            elements.consol.innerHTML = '';
        }, 5000);
    };

    revSeq = function (rev) {
        return parseInt(rev.substr(0, rev.indexOf('-')), 10);
    };

    // **************************************************************************************************
    // Event Listeners, for user interaction
    // **************************************************************************************************
    // Save text when enter has been pressed
    addOnEnter = function (ev) {
        var doc;
        if ((ev.key && ev.key === 'Enter') ||
                (ev.keyIndentifier && ev.keyIdentifier === 'Enter') ||
                (ev.keyCode && ev.keyCode === 13)
                ) {
            switch (ev.target.parentElement.dataset.talk) {
            case 'private':
                doc = talks.user.doc;
                break;
            case 'team':
                doc = talks.team.doc;
                break;
            }
            doc.talk.push({
                timestamp: new Date().toISOString(),
                text: ev.target.value,
                author: talks.user.id
            });
            db.put(doc)
                .then(function () {
                    ev.target.value = '';
                })
                .catch(function (err) {
                    console.error('Error saving doc', err);
                });
        }
    };

    // enable addOnEnter on both input elements
    elements.team.querySelector('input').addEventListener('keypress', addOnEnter);
    elements.prive.querySelector('input').addEventListener('keypress', addOnEnter);

    // Change the talks when another user is selected.
    elements.user.addEventListener('change', function (ev) {
        talks.user.id = ev.target.value;
        updateTalks();
    });

    // React to clicks with the private talk (to copy private message to team talk)
    elements.prive.querySelector('ul').addEventListener('click', function (ev) {
        var teamTalk = talks.team.doc.talk,
            msgElm = ev.target.parentElement;
        ev.preventDefault();
        if (ev.target.nodeName.toLowerCase() === 'button') {
            teamTalk.push({
                timestamp: msgElm.dataset.time,
                author: msgElm.dataset.author,
                text: msgElm.dataset.text
            });
            db.put(talks.team.doc)
                .catch(function (err) {
                    console.error('Error saving team doc', err);
                });
        }
    });

    // Shrink section when button pressed
    document.querySelector('body').addEventListener('click', function (ev) {
        if (ev.target.dataset.type && ev.target.dataset.type === 'shrink') {
            ev.target.parentElement.querySelector('ul').classList.toggle('off');
        }
    });

    // **************************************************************************************************
    // Database
    // **************************************************************************************************

    updateTalks = function () {
        Object.keys(talks).forEach(function (item) {
            if (!talks[item].doc || !talks[item].doc._id || (talks[item].doc._id !== talks.user.id || talks[item].doc._id !== 'team')) { // no need to get doc if already available
                db.get(talks[item].id)
                    .then(function (doc) {
                        if (!talks[item].doc || !talks[item].doc._rev ||
                                !(revSeq(talks[item].doc._rev) < revSeq(doc._rev)) ||
                                (talks[item].doc._id !== talks.user.id || talks[item].doc._id !== 'team')) { // in the mean time we might have already gotten a newer of the same document, in that case, only update if we got something newer
                            talks[item].doc = doc;
                            if (talks[item].doc._id !== 'team') {
                                skills.doc = doc;
                                skills.show();
                            }
                            talks[item].show();
                        }
                    })
                    .catch(function (err) {
                        console.error('Error getting', item, 'with id', talks[item].id, ', err', err);
                    });
            }
        });
    };

    updateUsers = function () {
        db.allDocs({include_docs: true})
            .then(function (docs) {
                var changed = false,
                    list = '';
                if (Array.isArray(docs.rows)) {
                    docs.rows.forEach(function (result) {
                        var doc = result.doc;
                        if (doc.type !== 'pc') {
                            return;
                        }
                        if (!users[doc._id]) {
                            users[doc._id] = {
                                id: doc._id,
                                rev: doc._rev,
                                name: doc.name
                            };
                            changed = true;
                        }
                    });
                }
                if (changed) {
                    Object.keys(users).forEach(function (userId) {
                        var selected = '';
                        if (userId === talks.user.id) {
                            selected = ' selected="selected" ';
                        }
                        list += '<option value="' + userId + '"' + selected + '>' + users[userId].name + '</option>';
                    });
                    elements.user.innerHTML = list;
                }
            })
            .catch(function (err) {
                console.error('Error getting al local docs', err);
            });
    };

    processChanges = function (changed) {
        if (Array.isArray(changed.docs)) {
            changed.docs.forEach(function (doc) {
                if (doc._id === talks.user.id) {
                    talks.user.doc = doc;
                    skills.doc = doc;
                    talks.user.show();
                    skills.show();
                }
                if (doc._id === 'team') {
                    talks.team.doc = doc;
                    talks.team.show();
                }
            });
        }
    };

    startReplicator = function () {
        replicator = remote.replicate.to('zone', {
            live: true,
            filter: 'talk/talkers',
            retry: true,
            include_docs: true
        })
            .on('error', function (err) {
                console.error('Error replicating from zone', err);
            })
            .on('paused', function (err) {
                if (err) {
                    console.error('Error replicating from zone (paused)', err);
                }
                updateTalks();
                updateUsers();
            })
            .on('change', function (changed) {
                processChanges(changed);
            })
            .on('complete', function () { // will also be called on a replicator.cancel()
                console.log('complete');
            });
        db.replicate.to('https://zone.mekton.nl/db/zone', {live: true})
            .on('error', function (err) {
                console.error('Error replicating to zone', err);
            })
            .on('change', function (changed) {
                processChanges(changed);
            });
    };

    // **************************************************************************************************
    // Main
    // **************************************************************************************************
    // Tell talk which document it is linked to
    talks.user.id = '01f2fd12e76c1cd8f97fa093dd00dd2a';
    talks.team.id = 'team';
    // Start replication
    startReplicator();

    // **************************************************************************************************
    // Offline usage, this is last to ensure everything is defined first
    // **************************************************************************************************
    setBatteryManagers = function (battery) {
        var levelListener,
            fullMode,
            lowMode;

        fullMode = function () {
            battery.addEventListener('levelchange', levelListener);
            if (!replicator || replicator.cancelled) {
                startReplicator();
                setMsg('We have power again, starting replication archetypes');
            }
        };
        lowMode = function () {
            if (!replicator.cancelled) {
                replicator.cancel();
            }
            battery.removeEventListener('levelchange', levelListener);
            setMsg('Low battery, halting replication archetypes');
        };
        levelListener = function () {
            if (!battery.charging && battery.level < 0.18) { // battery at 17% or less
                lowMode();
            }
        };

        battery.addEventListener('chargingchange', function () {
            if (battery.charging) {
                fullMode();
            }
        });

        // ** Main **
        if (battery.charging || battery.level >= 0.18) {
            fullMode();
        } else {
            lowMode();
        }
    };

    if (navigator.battery) { // Old battery api
        setBatteryManagers(navigator.battery);
    }

    if (navigator.getBattery) { // new battery api
        navigator.getBattery()
            .then(function (battery) {
                setBatteryManagers(battery);
            });
    }
});

//Copyright 2015 Pieter van der Eems
//This file is part of Zone
//CreateNPC is free software: you can redistribute it and/or modify
//it under the terms of the Affero GNU General Public License as published by
//the Free Software Foundation, either version 3 of the License, or
//(at your option) any later version.
//CreateNPC is distributed in the hope that it will be useful,
//but WITHOUT ANY WARRANTY; without even the implied warranty of
//MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
//Affero GNU General Public License for more details.
//You should have received a copy of the Affero GNU General Public License
//along with CreateNPC. If not, see <http://www.gnu.org/licenses/>.
