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
            addNpcs,
            orderNpcs;

        orderNpcs = function (a, b) {
            if (!a.doc.name || !b.doc.name) {
                return 0;
            }
            if (a.doc.name.toLowerCase() < b.doc.name.toLowerCase()) {
                return -1;
            }
            if (a.doc.name.toLowerCase() > b.doc.name.toLowerCase()) {
                return 1;
            }
            return 0;
        };

        addNpcs = function (docs) {
            docs.rows.sort(orderNpcs).forEach(function (item) {
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
        live: true,
        filter: 'zone/npcs',
        retry: true,
        include_docs: false
    })
        .on('error', function (err) {
            console.error('Error replicating from zone', err);
        })
        .on('paused', function () {
            updateNpcs();
        })
        .on('complete', function () { // will be called when the replication is cancelled
            updateNpcs();
        });

});
//Copyright 2015 Pieter van der Eems
//This file is part of Zone
//Zone is free software: you can redistribute it and/or modify
//it under the terms of the Affero GNU General Public License as published by
//the Free Software Foundation, either version 3 of the License, or
//(at your option) any later version.
//Zone is distributed in the hope that it will be useful,
//but WITHOUT ANY WARRANTY; without even the implied warranty of
//MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
//Affero GNU General Public License for more details.
//You should have received a copy of the Affero GNU General Public License
//along with Zone. If not, see <http://www.gnu.org/licenses/>.
