/*jslint browser:true, nomen:true*/
/*global requirejs*/
requirejs(['pouchdb-master.min', 'talk'], function (Pouchdb, Talk) {
    'use strict';
    var db = new Pouchdb('zone'),
        remote = new Pouchdb('https://zone.mekton.nl/db/zone'),
        replicator,
        elements = {},
        manifestUrl = 'https://zone.mekton.nl/manifest.webapp',
        userId = '01f2fd12e76c1cd8f97fa093dd00cc78',
        talks = {
            user: Object.create(Talk),
            team: Object.create(Talk)
        },
        setElements,
        setMsg,
        revSeq,
        setBatteryManagers,
        updateTalks,
        startReplicator;

    // **************************************************************************************************
    // Shortcuts to interface elements
    // **************************************************************************************************

    setElements = function () {
        elements.consol = document.getElementById('consol');
        elements.charac = document.getElementById('characteristics');
        elements.team = document.getElementById('teamtalk');
        elements.prive = document.getElementById('privatetalk');
        // Tell talk which element is it's home
        talks.user.element = elements.prive;
        talks.team.element = elements.team;
        // And tell talk what is inside the element on startup
        talks.user.preset = elements.prive.innerHTML;
        talks.team.preset = elements.team.innerHTML;
    };

    if (!document.getElementById('consol') ||
        !document.getElementById('characteristics') ||
        !document.getElementById('teamtalk') ||
        !document.getElementById('privatetalk')) {
        document.addEventListener("DOMContentLoaded", function(event) {
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


    // **************************************************************************************************
    // Database
    // **************************************************************************************************

    updateTalks = function () {
        Object.keys(talks).forEach(function (item) {
            if (!talks[item].doc || !talks[item].doc._rev) { // no need to get doc if already available
                db.get(talks[item].id)
                    .then(function (doc) {
                        if (!talks[item].doc || !talks[item].doc._rev ||
                                !(revSeq(talks.item.doc._rev) < revSeq(doc._rev))) { // in the mean time we might have already gotten a newer of the same document, in that case, only update if we got something newer
                            talks[item].doc = doc;
                            talks[item].show();
                        }
                    })
                    .catch(function (err) {
                        console.error('Error getting', item, 'with id', talks[item].id, ', err', err);
                    });
            }
        });
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
                console.log('paused');
                updateTalks();
            })
            .on('change', function (changed) {
                if (Array.isArray(changed.docs)) {
                    changed.docs.forEach(function (doc) {
                        if (doc._id === userId) {
                            talks.user.doc = doc;
                            talks.user.show();
                        }
                        if (doc._id === 'team') {
                            talks.team.doc = doc;
                            talks.team.show();
                        }
                    });
                }
            })
            .on('complete', function () { // will also be called on a replicator.cancel()
                console.log('complete');
            });
        db.replicate.to('https://zone.mekton.nl/db/zone', {live: true})
            .on('error', function (err) {
                console.error('Error replicating to zone', err);
            });
    };

    // **************************************************************************************************
    // Main
    // **************************************************************************************************
    // Tell talk which document it is linked to
    talks.user.id = userId;
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
