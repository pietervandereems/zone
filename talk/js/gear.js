/*global define*/
/*jslint browser:true*/
define([], function () {
    'use strict';
    var toBeDisplayed,
        showGear,
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
    showGear = function () {
        var elements = [],
            gear = this.doc.gear,
            doc = this.doc;

        Object.keys(gear).sort().forEach(function (cat) {
            var ul = document.createElement('ul'),
                li = document.createElement('li'),
                ulGear = document.createElement('ul');
            li.setAttribute('data-gearCat', cat);
            li.innerHTML = cat;
            li.innerHTML += ' <button data-type="addGear">+</button>';
            gear[cat].forEach(function (item) {
                var liItem = document.createElement('li');
                liItem.setAttribute('data-gearItem', item.gear);
                liItem.innerHTML = item.gear + ': ' + item.value;
                liItem.innerHTML += ' <label>value: <input type="text" value="' + item.value  + '"></input></label>';
                ulGear.appendChild(liItem);
            });
            li.appendChild(ulGear);
            ul.appendChild(li);
            elements.push(ul);
        });
        display.call(this, elements);
    };

    return {
        show: showGear,
        set element (e) {
            this.elm = e;
            display(toBeDisplayed);
        }
    };
});
