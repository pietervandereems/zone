/*jslint browser:true*/
/*global define:true*/
define(['pouchdb-3.4.0.min', 'skills'], function (Pouchdb, Skills) {
    'use strict';
    var db = new Pouchdb('zone'),
        remote = new Pouchdb('https://zone.mekton.nl/db/zone'),
        body = document.querySelector('body'),
        updateNpcs;

    body.addEventListener('click', function (ev) {
        if (ev.target.nodeName.toLowerCase() === 'button') {
            ev.target.nextSibling.classList.toggle('off');
        }
    });

    updateNpcs = function () {
        var ul = document.createElement('ul'),
            addNpcs;

        addNpcs = function (docs) {
            docs.rows.forEach(function (item) {
                var skills,
                    li,
                    div;
                if (item.doc.type !== 'npc') {
                    return;
                }
                skills = Object.create(Skills);
                li = document.createElement('li');
                div = document.createElement('div');
                skills.element = div;
                skills.show();

                skills.doc = item.doc;
                li.innerHTML = '<button type="button" class="off" data-id="' + item.doc.id + '">' + item.doc.name + '</button>';
                li.appendChild(div);
                ul.appendChild(li);
            });
        };

        db.allDocs({include_docs: true})
            .then(addNpcs, function (err) {
                console.error('Error retrieving all docs', err);
            });

        body.innerHTML = '';
        body.appendChild(ul);
    };

    remote.replicate.to(db, {
        live: false,
        filter: 'zone/npcs',
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
