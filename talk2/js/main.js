/*jslint browser:true, nomen:true*/
/*global requirejs*/
requirejs(['pouchdb-4.0.2.min'], function (Pouchdb) {
    'use strict';
    var db = new Pouchdb('zone_pcs'),
        remoteDb = new Pouchdb('https://zone.mekton.nl/p/zone_pcs'),
        settings = {},
        sync, // handler for the replication
        displayPc,
        saveSettings,
        getPrevious,
        startSync;

    // **********************************************************
    // ** Display Data
    // **********************************************************
    // Display Player information
    displayPc = function (doc) {
        console.log('displayPC', doc);
    };

    // **********************************************************
    // **  Database interaction
    // **********************************************************
    // save settings locally
    saveSettings = function () {
        db.put(settings).then(function (response) {
            console.log('saving local response', response);
        }).catch(function (err) {
            console.error('Error saveSettings', err);
        });
    };

    // Get settings from previous session
    getPrevious = function () {
        db.get('_local/previous').then(function (doc) {
            settings = doc;
            return db.get(settings.pcId);
        }).then(function (pcDoc) {
            displayPc(pcDoc);
        }).catch(function (err) {
            console.error('Error getPrevious', err);
            if (!settings._id) {
                settings = {
                    _id: '_local/previous'
                };
                db.put(settings).catch(function () {
                    console.error('error saving empty settings', err);
                });
            }
        });
    };

    // **********************************************************
    // **  Database replication
    // **********************************************************
    // Synchronise (master-master replication)
    startSync = function () {
        sync = db.sync(remoteDb, {
            live: true,
            retry: true
        }).on('change', function (change) {
            console.log('change', {dt: new Date().toISOString(), change: change});
        }).on('paused', function (info) {
            console.log('paused', {dt: new Date().toISOString(), info: info});
        }).on('active', function (info) {
            console.log('active', {dt: new Date().toISOString(), info: info});
        }).on('error', function (err) {
            console.error('Error in Sync (retry is true)', err);
        }).on('completed', function (info) {
            console.log('Sync completed, was replication cancelled?', info);
        });
    };

    // **********************************************************
    // **  MAIN
    // **********************************************************
    getPrevious();
    startSync();
});
