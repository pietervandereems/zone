/*global define*/
/*jslint browser:true*/
define([], function () {
    'use strict';
    var toBeDisplayed,
        showSkills,
        display;

    // **************************************************************************************************
    // Internal
    // **************************************************************************************************
    // Display the element, needed because we may need to wait until the dom is ready to display.
    display = function (elements) {
        var self = this;
        if (!elements) {
            return;
        }
        if (this.elm) {
            this.elm.innerHTML = '';
            elements.forEach(function (element) {
                self.elm.appendChild(element);
            });
        } else {
            toBeDisplayed = elements;
        }
    };

    // **************************************************************************************************
    // External
    // **************************************************************************************************
    // Show/update the talk inside the set element.
    showSkills = function (really) {
        var elements = [],
            skills = this.doc.skills,
            stats = this.doc.stats,
            doc = this.doc,
            order;
        if (!really) {
            return;
        }

        order = function (a, b) {
            if (a.name < b.name) {
                return -1;
            }
            if (a.name > b.name) {
                return 1;
            }
            return 0;
        };

        Object.keys(stats).sort().forEach(function (stat) {
            var ul = document.createElement('ul'),
                li = document.createElement('li'),
                ulSkill = document.createElement('ul');
            li.setAttribute('data-stat', stat);
            li.setAttribute('data-statvalue', doc.stats[stat]);
            li.innerHTML = stat + ' <span>(' + doc.stats[stat] + ')</span>';
            li.innerHTML += ' <button data-type="addSkill">+</button>';
            if (skills[stat]) {
                skills[stat].sort(order).forEach(function (skill) {
                    var liSkill = document.createElement('li');
                    liSkill.setAttribute('data-skill', skill.name);
                    liSkill.innerHTML = skill.name + ': ' + skill.level + ' <span>(' + (skill.level + doc.stats[stat])  + ')</span>';
                    liSkill.innerHTML += ' <label>ip: <input type="number" value=' + skill.ip  + ' min=0 max=100></input></label>';
                    ulSkill.appendChild(liSkill);
                });
            }
            li.appendChild(ulSkill);
            ul.appendChild(li);
            elements.push(ul);
        });
        display.call(this, elements);
    };

    return {
        show: showSkills,
        set element (e) {
            this.elm = e;
            display(toBeDisplayed);
        }
    };
});
