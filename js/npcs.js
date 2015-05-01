/*jslint browser:true*/
/*global define:true*/
define(['pouchdb-3.4.0.min', 'skills'], function (Pouchdb, Skills) {
    'use strict';
    var db = new Pouchdb('zone'),
        remote = new Pouchdb('https://zone.mekton.nl/db/zone'),
        updateNpcs;

    updateNpcs = function () {
        var ul = document.createElement('ul');
        db.allDocs({include_docs: true})
            .then(function (docs) {
                console.log(docs);
            }, function (err) {
                console.error('Error retrieving all docs', err);
            });
        document.querySelector('body').appendChild(ul);
    };

    remote.replicate.to(db, {
        live: false,
        filter: 'filters/npcs',
        retry: true,
        include_docs: false
    })
        .on('error', function (err) {
            console.error('Error replicating from zone', err);
        })
        .on('paused', function (err) {
            if (err) {
                console.error('Error replicating from zone (paused)', err);
            }
            updateNpcs();
        })
        .on('change', function () {
            updateNpcs();
        })
        .on('complete', function () { // will also be called on a replicator.cancel()
            console.log('complete');
        });

});
