/*jslint browser:true, nomen:true*/
/*global requirejs*/
requirejs(['pouchdb-3.6.0.min'], function (Pouchdb) {
    'use strict';
    var // Internal variables
        db = new Pouchdb('zone'),
        remote = new Pouchdb('https://zone.mekton.nl/db/zone'),
        elements = {},
        weekday = ['Zo', 'Ma', 'Di', 'Wo', 'Do', 'Vr', 'Za'],
        months = ['Jan', 'Feb', 'Maart', 'April', 'Mei', 'Juni', 'Juli', 'Aug', 'Sept', 'Nov', 'Dec'],
        gameTime = new Date(),
        campaignDoc,
        // Interface elements
        // Helper functions
        // Event functions
        // Data changes
        changeDate,
        // Display functions
        showGameTime,
        // Database functions
        updateCampaign,
        campaignChanged,
        startReplicator,
        // Main functions
        start;
        // Device functions

    // **************************************************************************************************
    // Shortcuts to interface elements
    // **************************************************************************************************
    elements.today = document.getElementById('today');
    elements.prevDay = document.getElementById('prev');
    elements.nextDay = document.getElementById('next');

    // **************************************************************************************************
    // Extend
    // **************************************************************************************************
    String.prototype.capitalize = function () {
        return this.charAt(0).toUpperCase() + this.slice(1);
    };

    // **************************************************************************************************
    // Helper functions
    // **************************************************************************************************

    // **************************************************************************************************
    // Data changes functions
    // **************************************************************************************************
    changeDate = function (amount) {
        return function () {
            gameTime.setTime(gameTime.getTime() + (86400000 * amount)); // 86400000 = 1000 * 60 * 60 * 24 = miliseconds in a day
            showGameTime();
            campaignDoc.today = gameTime.toISOString();
            db.put(campaignDoc)
                .then(function (result) {
                    console.log('saved', result);
                })
                .catch(function (err) {
                    console.error('Error saving campaignDoc locally', err);
                });
        };
    };

    // **************************************************************************************************
    // Event Listeners, for user interaction
    // **************************************************************************************************
    elements.prevDay.addEventListener('click', changeDate(-1));
    elements.nextDay.addEventListener('click', changeDate(1));
    // **************************************************************************************************
    // Display functions, to display the data
    // **************************************************************************************************
    // Display the current in game time (day)
    showGameTime = function () {
        elements.today.innerHTML = weekday[gameTime.getDay()] + ' ' + gameTime.getDate() + '-' + months[gameTime.getMonth()] + '-' + gameTime.getFullYear();
    };

    // **************************************************************************************************
    // Database
    // **************************************************************************************************

    updateCampaign = function () {
        db.get('campaign')
            .then(function (doc) {
                campaignDoc = doc;
                gameTime = new Date(doc.today);
                showGameTime();
            })
            .catch(function (err) {
                console.error('Error getting campaign doc', err);
            });
    };

    campaignChanged = function (changed) {
        if (Array.isArray(changed.docs)) {
            changed.docs.forEach(function (doc) {
                if (doc._id === 'campaign') {
                    campaignDoc = doc;
                    gameTime = new Date(doc.today);
                    showGameTime();
                }
            });
        }
    };

    startReplicator = function () {
        remote.replicate.to(db, {
            live: true,
            doc_ids: ['campaign'],
            retry: true,
            include_docs: true
        })
            .on('error', function (err) {
                console.error('Error replicatingn campaign from zone', err);
            })
            .on('paused', function (err) {
                if (err) {
                    console.error('Error replicating campaing from zone (paused)', err);
                }
                updateCampaign();
            })
            .on('change', function (changed) {
                campaignChanged(changed);
            });
        db.replicate.to(remote, {live: true})
            .on('denied', function (reason) {
                console.log('denied', reason);
            })
            .on('error', function (err) {
                console.error('Error replicating to zone', err);
            });
    };

    // **************************************************************************************************
    // Main
    // **************************************************************************************************
    // Start it all up
    start = function () {
        // Start replication
        startReplicator();
    };
    // See if we have a previously selected user
    start();

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
