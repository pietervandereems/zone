/*jslint browser:true, nomen:true*/
/*global requirejs*/
requirejs(['pouchdb-master.min'], function (Pouchdb) {
    'use strict';
    var db = new Pouchdb('zone'),
        remote = new Pouchdb('https://zone.mekton.nl/db/zone'),
        replicator,
        elements = {},
        manifestUrl = 'https://zone.mekton.nl/manifest.webapp',
        userId = '01f2fd12e76c1cd8f97fa093dd00cc78',
        setMsg,
        setBatteryManagers,
        startReplicator,
        showTalk;

    // **************************************************************************************************
    // Shortcuts to interface elements
    // **************************************************************************************************

    elements.consol = document.getElementById('consol');
    elements.charac = document.getElementById('characteristics');
    elements.team = document.getElementById('teamtalk');
    elements.prive = document.getElementById('privatetalk');

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
    // **************************************************************************************************
    // Display
    // **************************************************************************************************
    //

    showTalk = function (targetElm, talk) {
        var ul = document.createElement('ul');

        talk.sort(function (a, b) {
            return a.timestamp - b.timestamp;
        });
        talk.forEach(function (item) {
            var li = document.createElement('li');
            li.innerHTML = new Date(item.timestamp).toISOString() + ' - ' + item.text;
            ul.appendChild(li);
        });
        targetElm.innerHTML = "";
        targetElm.appendChild(ul);
    };

    // **************************************************************************************************
    // Event Listeners, for user interaction
    // **************************************************************************************************


    // **************************************************************************************************
    // Database
    // **************************************************************************************************

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
            })
            .on('change', function (changed) {
                console.log('changed', changed);
                if (Array.isArray(changed.docs)) {
                    changed.docs.forEach(function (doc) {
                        if (doc._id === userId) {
                            showTalk(elements.prive, doc.talk);
                        }
                        if (doc.id === 'team') {
                            showTalk(elements.team, doc.talk);
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
