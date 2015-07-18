/*jslint browser:true, nomen:true*/
/*global requirejs*/
requirejs(['pouchdb-3.6.0.min', 'team'], function (Pouchdb, Team) {
    'use strict';
    var db = new Pouchdb('mekton'),
        talk = new Pouchdb('zone'),
        remote = new Pouchdb('https://zone.mekton.nl/db/zone'),
        team = new Team(talk, remote),
        npcMode = false,
        gameTime = new Date(),
        replicator,
        localCharacter = {},
        elements = {},
        elmDefaults = {},
        character = {},
        checkRequest,
        manifestUrl = 'https://zone.mekton.nl/manifest.webapp',
        charactaristicsToKeep = ['Lifepath', 'Traits', 'archetype', 'edge', 'gear', 'name', 'skills', 'stats', 'type'],
        updateSelection,
        updateSavedChar,
        generateStats,
        generateSkills,
        generateEdge,
        generateGear,
        generateLifepath,
        display,
        displaySkills,
        displayGear,
        displayLifepath,
        pickSkillFromCategory,
        addSkillToStat,
        setBatteryManagers,
        rnd,
//        weightedRnd,
        placeName,
        addView,
        addInstallButton,
        setMsg,
        cleanCharacter,
        startReplicator;

    // **************************************************************************************************
    // Shortcuts to interface elements
    // **************************************************************************************************
    elements.charType = document.getElementById('chartype');
    elements.stats = document.getElementById('stats');
    elements.edge = document.getElementById('edge');
    elements.skills = document.getElementById('skills');
    elements.name = document.getElementById('name');
    elements.saved = document.getElementById('saved');
    elements.save = document.getElementById('save');
    elements.generate = document.getElementById('generate');
    elements.share = document.getElementById('share');
    elements.gear = document.getElementById('gear');
    elements.install = document.getElementById('install');
    elements.consol = document.getElementById('consol');
    elements.h1 = document.querySelector('h1');
    elements.gm = document.getElementById('gm');
    elmDefaults.stats = '<p>Stats</p>';
    elmDefaults.skills = '<caption>Skills</caption>';
    elmDefaults.gear = '<caption>Gear</caption>';

    // **************************************************************************************************
    // Extend
    // **************************************************************************************************
    String.prototype.capitalize = function () {
        return this.charAt(0).toUpperCase() + this.slice(1);
    };

    // **************************************************************************************************
    // Helper functions
    // **************************************************************************************************

    pickSkillFromCategory = function (category) {
        var skills = Object.keys(category);
        return skills[Math.floor(Math.random() * skills.length)];
    };

    addSkillToStat = function (skill, stat) {
        var skillValue = character.skills[stat][skill].level || 0,
            statValue = character.stats[stat] || 0;
        return parseInt(skillValue, 10) + parseInt(statValue, 10);
    };

    rnd = function (min, max) {
        if (max === undefined || max === null) {
            max = min;
            min = 0;
        }
        return Math.floor(Math.random() * (max - min)) + min;
    };

//    weightedRnd = function (list, weights) { // examples list = ["skill1", "skill2"], weights = [1,4]
//        var rand,
//            totalWeight,
//            nr,
//            i,
//            l,
//            sum = 0;
//        rand = function (max) {
//            return (Math.random() * max).toFixed(2);
//        };
//        totalWeight = weights.reduce(function (prev, cur) {
//            return prev + cur;
//        });
//        nr = rand(totalWeight);
//        for (i = 0, l = weights.length; i <= l; i += 1) {
//            sum += weights[i];
//            if (nr <= sum) {
//                return list[i];
//            }
//        }
//    };

    placeName = function (text) {
        if (elements.name.value) {
            return text.replace('{character}', elements.name.value);
        }
        return text;
    };

    setMsg = function (msg) {
        elements.consol.innerHTML = msg;
        window.setTimeout(function () {
            elements.consol.innerHTML = '';
        }, 5000);
    };

    cleanCharacter = function () {
        Object.keys(character).forEach(function (charactaristic) {
            if (charactaristicsToKeep.indexOf(charactaristic) === -1) {
                delete character[charactaristic];
            }
        });
    };

    // **************************************************************************************************
    // Generate character stuff
    // **************************************************************************************************
    generateLifepath = function (start, elmTable, type) {
        var doc,
            follow,
            addPer;
        addPer = function (from) {
            return function (item) {
                character[type][from].text += ', ' + item[rnd(item.length)];
            };
        };
        follow = function (from) {
            var i;
            if (!Array.isArray(doc[from])) {
                return;
            }
            character[type][from] = doc[from][rnd(doc[from].length)];
            if (character[type][from].times && character[type][from].per) {
                character[type][from].text += '<br/>';
                for (i = 0; i < character[type][from].times; i += 1) {
                    character[type][from].per.forEach(addPer(from));
                    character[type][from].text += '<br/>';
                }
            }
            if (character[type][from].next) {
                follow(character[type][from].next);
            }
        };
        if (!type) {
            type = start;
        }
        db.query('local/typesWithName', {reduce: false, key: 'lifepath', include_docs: true}, function (err, list) {
            if (err || !Array.isArray(list.rows) || list.rows.length === 0) {
                return;
            }
            doc = list.rows[0].doc;
            if (!doc[start]) {
                return;
            }
            character[type] = {};
            follow(start);
            displayLifepath(elmTable, type);
        });
    };
    generateSkills = function (doc) {
        var addToSkillList,
            findSkill,
            findStatOfSkill;
        if (!Array.isArray(doc.starting_skills)) {
            return;
        }
        findSkill = function (stat, skill) {
            var i;
            for (i = stat.length - 1; i >= 0; i -= 1) {
                if (stat[i].name === skill) {
                    return (stat[i]);
                }
            }
            return false;
        };
        // Add the skill to the internal skilllist.
        addToSkillList = function (skill, value, stat, unique) {
            var foundSkill;
            stat = stat.toLowerCase();
            value = parseInt(value, 10);
            character.skills[stat] = character.skills[stat] || [];

            foundSkill = findSkill(character.skills[stat], skill);
            if (unique && foundSkill) { // Skill must be unique
                return false;
            }
            if (foundSkill) {
                foundSkill.level += value;
            } else {
                character.skills[stat].push({
                    name: skill,
                    level: value,
                    ip: 0
                });
            }
            return true;
        };
        // Determine the stat the skill belongs to
        findStatOfSkill = function (skillDoc, skill) {
            var statList = Object.keys(skillDoc.Stats),
                i;
            if (skill.substr(0, 7) === 'Expert:') { // Group all expert subskill under the expert skill
                skill = 'Expert';
            }
            for (i = statList.length - 1; i >= 0; i -= 1) {
                if (skillDoc.Stats[statList[i]].indexOf(skill) > -1) {
                    return statList[i];
                }
            }
            return "unkown";
        };
        // Gather all available skills, so we know where to place everything and can choose a skill from a category if needed.
        db.query('local/typesWithName', {reduce: false, key: 'skills', include_docs: true}, function (err, list) {
            var skillDoc;
            if (err || !Array.isArray(list.rows) || list.rows.length === 0) {
                return;
            }
            character.skills = {};
            skillDoc = list.rows[0].doc;
            // Loop through characters starting skills.
            doc.starting_skills.forEach(function (skillObj) {
                var skillList = Object.keys(skillObj),
                    skill,
                    level,
                    randSkill,
                    skillAdded;
                if (skillList.length > 1) {
                    skill = skillList[Math.floor(Math.random() * skillList.length)];
                } else {
                    skill = skillList[0];
                }
                level = skillObj[skill];
                if (skillDoc.Categories[skill]) { // Skill is a generic skill from a category, choose a unique one from that category
                    do {
                        randSkill = pickSkillFromCategory(skillDoc.Categories[skill]);
                        skillAdded = addToSkillList(randSkill, level, skillDoc.Categories[skill][randSkill], true);
                    } while (!skillAdded);
                } else { // Skill is a specfic skill
                    addToSkillList(skill, level, findStatOfSkill(skillDoc, skill));
                }
            });
            // All character skill proccessed. Now list them in the skills table
            displaySkills();
        });
    };
    // Get the archetype edge
    generateEdge = function (doc) {
        var edges;
        character.edge = {};
        edges = Object.keys(doc.edge);
        edges.forEach(function (edge) {
            character.edge[edge] = doc.edge[edge];
        });
    };
    // Randomly determine character stats based on archetype.
    generateStats = function (doc) {
        var stats;
        character.stats = {};
        if (Array.isArray(doc.role_stats) && doc.role_stats.length > 0) {
            stats = Object.keys(doc.role_stats[0]);
            stats.forEach(function (stat) {
                if (stat === 'nr') {
                    return;
                }
                stat = stat.toLowerCase();
                character.stats[stat] = parseInt(doc.role_stats[Math.floor(Math.random() * 10)][stat], 10);
            });
        }
    };
    // Get the gear
    generateGear = function (doc) {
        var pickStuff;
        pickStuff = function (objectList) {
            var stuff = {},
                stuffList,
                gear,
                type;
            do {
                stuff = stuff[gear] || objectList;
                stuffList = Object.keys(stuff);
                if (stuffList.length > 1) {
                    gear = stuffList[Math.floor(Math.random() * stuffList.length)];
                } else {
                    gear = stuffList[0];
                }
                type = type || gear;
            } while (typeof stuff[gear] === 'object');
            return {
                type: type,
                gear: gear,
                value: stuff[gear]
            };
        };
        character.gear = {};
        if (Array.isArray(doc.starting_gear) && doc.starting_gear.length > 0) {
            db.query('local/typesWithName', {reduce: false, key: 'gear', include_docs: true}, function (err, list) {
                var gearDoc,
                    gearDocList,
                    g;
                if (err || !Array.isArray(list.rows) || list.rows.length === 0) {
                    return;
                }
                gearDoc = list.rows[0].doc;
                gearDocList = Object.keys(gearDoc);
                doc.starting_gear.forEach(function (stuffObj) {
                    var gear,
                        gearValue,
                        type,
                        gearList,
                        gearSubList,
                        item,
                        choosenGear;
                    choosenGear = pickStuff(stuffObj);
                    gear = choosenGear.gear;
                    gearValue = choosenGear.value;
                    type = choosenGear.type;
                    if (gearDoc[type]) {
                        character.gear[type] = character.gear[type] || [];
                        if (Array.isArray(gearDoc[type])) {
                            character.gear[type].push({
                                gear: gearDoc[type][Math.floor(Math.random() * gearDoc[type].length)],
                                value: gearValue
                            });
                            return;
                        }
                        if (typeof gearDoc[type] === "object") {
                            if (gearDoc[type][gear]) {
                                character.gear[type].push({
                                    gear: gearDoc[type][gear][Math.floor(Math.random() * gearDoc[type][gear].length)],
                                    value: gearValue
                                });
                                return;
                            }
                            gearList = Object.keys(gearDoc[type]);
                            gearSubList = gearList[Math.floor(Math.random() * gearList.length)];
                            character.gear[type].push({
                                gear: gearDoc[type][gearSubList][Math.floor(Math.random() * gearDoc[type][gearSubList].length)],
                                value: gearValue
                            });
                            return;
                        }
                        character.gear[gearDoc[type]].push({
                            gear: gearDoc[type],
                            value: gearValue
                        });
                        return;
                    }
                    for (g = gearDocList.length - 1; g >= 0; g -= 1) {
                        item = gearDocList[g];
                        if (item !== 'type' && item.substr(0, 1) !== '_') {
                            if (typeof item === 'object') {
                                if (item[gear]) {
                                    character.gear[item] = character.gear[item] || [];
                                    character.gear[item] = {
                                        gear: item[gear][Math.floor(Math.random() * item[gear].length)],
                                        value: gearValue
                                    };
                                    return;
                                }
                            }
                        }
                    }
                    character.gear.Misc = character.gear.Misc || [];
                    character.gear.Misc.push({
                        gear: gear,
                        value: gearValue
                    });
                });
                displayGear();
            });
        }
    };

    // **************************************************************************************************
    // Display Character
    // **************************************************************************************************

    // Display all characteristics that are available synchronously
    display = function () {
        var edges,
            stats,
            elmStatsInner = '';
        // Edges
        edges = Object.keys(character.edge);
        elements.edge.innerHTML = '';
        edges.forEach(function (edge) {
            elements.edge.innerHTML += '<p><strong>' + edge + '</strong>: ' + character.edge[edge] + '</p>';
        });

        // Stats
        stats = Object.keys(character.stats);

        elmStatsInner =  elmDefaults.stats + '<ul>';
        stats.forEach(function (stat) {
            elmStatsInner += '<li data-value="' + character.stats[stat] + '">' + stat.capitalize() + '</li>';
        });
        elements.stats.innerHTML = elmStatsInner + '</ul>';

        // GM
        elements.gm.innerHTML = '';
        if (npcMode && character.gm) {
            Object.keys(character.gm).forEach(function (item) {
                elements.gm.innerHTML += '<p><strong>' + item + '</strong>: ' + character.gm[item] + '</p>';
            });
        }
    };
    // Skilllist needs to be retrieved asynchronously so a seperate function to display those.
    displaySkills = function () {
        var stats;
        stats = Object.keys(character.skills).sort();
        elements.skills.innerHTML = elmDefaults.skills;
        stats.forEach(function (stat) {
            var row = elements.skills.insertRow(),
                rowInner = '',
                skills;
            rowInner += '<td>' + stat.capitalize() + '</td><td><ul>';
            skills = Object.keys(character.skills[stat]);
            skills.forEach(function (skill) {
                rowInner += '<li data-value="' + addSkillToStat(skill, stat) + '">' + character.skills[stat][skill].name + ": " + character.skills[stat][skill].level + '</li>';
            });
            row.innerHTML = rowInner + '</ul></td>';
        });
    };
    // Display Lifepath from the lifepath document
    displayLifepath = function (element, type) {
        var periods,
            table = '';
        element.innerHTML = '';
        if (!character[type]) {
            return;
        }
        periods = Object.keys(character[type]);
        periods.reverse();
        table += '<caption>' + type.capitalize() + '</caption>';
        periods.forEach(function (period) {
            table += '<tr><td>' + period + '</td><td>' + placeName(character[type][period].text) + '</td></tr>';
        });
        if (element.nodeName !== 'TABLE') {
            table = '<table>' + table + '</table>';
        }
        element.innerHTML = table;
    };
    // Gear need to be retrieved asynchronously so a seperate function to display those.
    displayGear = function () {
        var gearType;
        elements.gear.innerHTML = elmDefaults.gear;
        if (!character.gear) {
            return;
        }
        gearType = Object.keys(character.gear);
        gearType.forEach(function (gear) {
            var row = elements.gear.insertRow(),
                rowInner = '';
            rowInner += '<td>' + gear + '</td><td><ul>';
            character.gear[gear].forEach(function (stuff) {
                rowInner += '<li data-value="' + stuff.value + '">' + stuff.gear + '</li>';
            });
            row.innerHTML = rowInner + '</ul></td>';
        });

    };
    // **************************************************************************************************
    // Event Listeners, for user interaction
    // **************************************************************************************************
    // A new archetype is selected
    elements.charType.addEventListener('change', function (event) {
        db.get(event.target.value, function (err, doc) {
            if (err) {
                console.error('Error archetype doc retrieval', err);
                return;
            }
            generateEdge(doc);
            generateStats(doc);
            generateSkills(doc);
            generateLifepath('Hair Color', document.getElementById('traits'), 'Traits');
            generateLifepath('Money', document.getElementById('lifepath'), 'Lifepath');
            generateGear(doc);
            display();
        });
    });

    // The 'save this archetype' is clicked
    elements.save.addEventListener('click', function (event) {
        event.preventDefault();
        if (localCharacter.name && localCharacter.id && localCharacter.name === elements.name.value) {
            if (window.confirm('Overwrite existing character? (name is the same)')) {
                character.archetype = elements.charType.value;
                db.put(character, character._id, character._rev, function (err) {
                    if (err) {
                        console.error('Error overwriting character', err);
                        return;
                    }
                    return;
                });
            }
        } else {
            cleanCharacter();
            character.name = elements.name.value;
            character.archetype = elements.charType.value;
            character.type = npcMode ? 'npc' : 'pc';
            db.post(character, function (err, result) {
                if (err) {
                    console.error('Error saving new character', err);
                    return;
                }
                if (result && result.ok) {
                    localCharacter.id = result.id;
                    localCharacter.rev = result.rev;
                    localCharacter.name = character.name;
                    localCharacter.archetype = character.archetype;
                }
            });
        }
    });

    // A saved character is selected
    elements.saved.addEventListener('change', function (event) {
        if (event.target.value === '') {
            return;
        }
        db.get(event.target.value, function (err, doc) {
            var opts,
                index;
            if (err) {
                console.error('Error character doc retrieval', err);
                return;
            }
            localCharacter = {
                id: doc._id,
                name: doc.name,
                archetype: doc.archetype || ''
            };
            // If possible, set archetype selector to saved archetype
            if (localCharacter.archetype) {
                opts = elements.charType.options;
                for (index = opts.length - 1; index >= 0; index -= 1) {
                    if (opts[index].value === localCharacter.archetype) {
                        elements.charType.selectedIndex = index;
                    }
                }
            }
            // set values
            elements.name.value = doc.name;
            character = doc;
            // display character
            display();
            displaySkills();
            displayGear();
            displayLifepath(document.getElementById('traits'), 'Traits');
            displayLifepath(document.getElementById('lifepath'), 'Lifepath');
        });
    });

    // npc switch
    elements.h1.addEventListener('dblclick', function () {
        var elems = document.querySelectorAll('.notavailable');
        npcMode = true;
        Object.keys(elems).forEach(function (key) {
            elems[key].classList.remove('notavailable');
        });
        elements.h1.innerHTML = 'Create NPC - Zone';
        updateSavedChar();
    });

    // Generate a name
    elements.generate.addEventListener('click', function (ev) {
        var xhr = new XMLHttpRequest();

        ev.preventDefault();

        xhr.addEventListener('load', function () {
            var elm,
                plains;
            elm = document.createElement('div');
            elm.innerHTML = this.responseText;
            plains = elm.querySelectorAll('.plain');
            elements.name.value = plains[0].innerHTML + ' ' + plains[1].innerHTML;
        });
        xhr.open('GET', '/names/');
        xhr.send();
    });

    // Share a name with the team talk
    elements.share.addEventListener('click', function (ev) {
        var ocTime = new Date();
        ev.preventDefault();
        gameTime.setHours(ocTime.getHours());
        gameTime.setMinutes(ocTime.getMinutes());
        gameTime.setSeconds(ocTime.getSeconds());
        gameTime.setMilliseconds(ocTime.getMilliseconds());
        team.save('gm', 'npc: ' + elements.name.value, gameTime.toISOString());
    });

    // **************************************************************************************************
    // Update
    // **************************************************************************************************
    // Fill the archetype selection element.
    updateSelection = function () {
        db.query('local/typesWithName', {reduce: false, key: 'archetype'}, function (err, list) {
            var options = '<option>Archetype...</option>';
            if (err) {
                console.error('Error retrieving typesWithName', err);
                return;
            }
            elements.charType.innerHTML = '';
            if (Array.isArray(list.rows)) {
                list.rows.forEach(function (archetype) {
                    var selected = '';
                    if (localCharacter.archetype === archetype) {
                        selected = 'selected';
                    }
                    options += '<option value="' + archetype.id  + '" ' + selected + '>' + archetype.value.name + '</option>';
                });
                elements.charType.innerHTML = options;
            }
        });
    };

    // Fill saved characters selector
    updateSavedChar = function () {
        var view = 'local/names';
        if (npcMode) {
            view = 'local/namesPcNpc';
        }
        db.query(view, function (err, list) {
            var options = '';
            if (err) {
                if (err.status && err.message && err.status === 404) {
                    addView('local', updateSavedChar);
                } else {
                    console.error('Error getting view ', view, err);
                }
                return;
            }
            elements.saved.innerHTML = '';
            if (Array.isArray(list.rows) && list.rows.length > 0) {
                list.rows.forEach(function (name) {
                    var selected = '';
                    if (localCharacter.id && localCharacter.id === name.id) {
                        selected = 'selected';
                    }
                    options += '<option value="' + name.id  + '" ' + selected + '>' + name.key + '</option>';
                });
                elements.saved.innerHTML = '<option value="">Names...</option>' + options;
            }
        });
    };

    // **************************************************************************************************
    // Firefox install app
    // **************************************************************************************************
    if (window.navigator.mozApps) { // only when mozApps is available

        // Enable install button and listen to it's click events.
        addInstallButton = function () {
            elements.install.style.display = 'block';
            elements.install.addEventListener('click', function () {
                var request = window.navigator.mozApps.install(manifestUrl);
                request.onsuccess = function () {
                    console.log('App installed', this.result);
                    elements.install.style.display = 'none';
                };
                request.onerror = function () {
                    console.error('App is not installed', this.error);
                };
            });
        };
        // check if we are already installed
        checkRequest = window.navigator.mozApps.checkInstalled(manifestUrl);
        checkRequest.onsuccess = function () {
            if (!this.result) {
                // app is not installed, add the button;
                addInstallButton();
            }
        };
    }


    // **************************************************************************************************
    // Database
    // **************************************************************************************************

    addView = function (view, cb) {
        switch (view) {
        case 'local':
            db.put({
                '_id': '_design/local',
                'views': {
                    'names': {
                        'map': 'function(doc) { if (doc.name) {\n    emit(doc.name, 1);\n    }\n}'
                    }
                }
            }, function (err) {
                if (err) {
                    console.error('Error saving view', err);
                    return;
                }
                cb();
            });
            break;
        }
    };

    startReplicator = function () {
        // characters
        replicator = db.replicate.from(remote, {
            live: true,
            filter: 'mekton/typedDocs',
            retry: true
        })
            .on('error', function (err) {
                console.error('Error replicating from zone', err);
            })
            .on('paused', function (err) {
                if (err) {
                    console.error('Error replicating from zone (paused)', err);
                }
                updateSavedChar();
                updateSelection();
            })
            .on('change', function () {
                updateSelection();
                updateSavedChar();
            })
            .on('complete', function () { // will also be called on a replicator.cancel()
                updateSelection();
            });
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
                db.get('campaign')
                    .then(function (doc) {
                        gameTime = new Date(doc.today);
                    })
                    .catch(function (err) {
                        console.error('Error getting local campaign doc', err);
                    });
            })
            .on('change', function (changed) {
                if (Array.isArray(changed.docs)) {
                    changed.docs.forEach(function (doc) {
                        if (doc._id === 'campaign') {
                            gameTime = new Date(doc.today);
                        }
                    });
                }
            });
        db.replicate.to(remote, {live: true})
            .on('error', function (err) {
                console.error('Error replicating to zone', err);
            });
    };

    // **************************************************************************************************
    // Main
    // **************************************************************************************************
    // Start replication
    startReplicator();
    // Clear fields
    elements.name.value = '';


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

//Copyright 2014 Pieter van der Eems
//This file is part of CreateNPC
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
