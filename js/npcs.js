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
                    div,
                    info = '';
                if (item.doc.type !== 'npc') {
                    return;
                }
                skills = Object.create(Skills);
                li = document.createElement('li');
                div = document.createElement('div');
                div.classList.add('off');
                skills.element = div;
                skills.doc = item.doc;
                skills.show();

                if (item.doc.gm) {
                    info = item.doc.gm.info || '';
                }
                li.innerHTML = item.doc.name + ' <span>(' + info +  ')</span> <button type="button" "data-id="' + item.doc._id + '">&gt</button>';
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
        .on('complete', function () { // will also be called on a replicator.cancel()
            updateNpcs();
        });

});
