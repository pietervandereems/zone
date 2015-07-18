/*jslint browser:true*/
/*global define:true*/
define(['pouchdb-3.6.0.min'], function (Pouchdb) {
    'use strict';
    var db = new Pouchdb('zone'),
        remote = new Pouchdb('https://zone.mekton.nl/db/zone'),
        body = document.querySelector('body'),
        updateEnv;

    body.addEventListener('click', function (ev) {
        if (ev.target.nodeName.toLowerCase() === 'button') {
            ev.target.nextSibling.classList.toggle('off');
        }
    });

    updateEnv = function () {
        var ul = document.createElement('ul'),
            addEnv,
            orderEnv;

        orderEnv = function (a, b) {
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

        addEnv = function (docs) {
            docs.rows.sort(orderEnv).forEach(function (item) {
                var li,
                    div,
                    info = '';
                if (item.doc.type !== 'environment') {
                    return;
                }
                li = document.createElement('li');
                div = document.createElement('div');
                div.classList.add('off');

                if (item.doc.info) {
                    info = item.doc.info.gm || '';
                }
                li.innerHTML = item.doc.name + ' <span>(' + info +  ')</span> <button type="button" "data-id="' + item.doc._id + '">&gt</button>';
                li.appendChild(div);
                ul.appendChild(li);
            });
        };

        db.allDocs({include_docs: true})
            .then(addEnv, function (err) {
                console.error('Error retrieving all docs', err);
            });

        body.innerHTML = '';
        body.appendChild(ul);
    };

    remote.replicate.to(db, {
        live: true,
        filter: 'zone/environment',
        retry: true,
        include_docs: false
    })
        .on('error', function (err) {
            console.error('Error replicating from zone', err);
        })
        .on('paused', function () {
            updateEnv();
        })
        .on('complete', function () { // will be called when the replication is cancelled
            updateEnv();
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
