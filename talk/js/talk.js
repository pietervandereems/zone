/*global define*/
/*jslint browser:true*/
define([], function () {
    'use strict';
    var toBeDisplayed,
        showTalk,
        display;

    // **************************************************************************************************
    // Internal
    // **************************************************************************************************
    // Display the element, needed because we may need to wait until the dom is ready to display.
    display = function (element) {
        if (!element) {
            return;
        }
        if (this.elm) {
            this.elm.replaceChild(element, this.elm.querySelector('ul'));
            this.elm.appendChild(element);
        } else {
            toBeDisplayed = element;
        }
    };

    // **************************************************************************************************
    // External
    // **************************************************************************************************
    // Show/update the talk inside the set element.
    showTalk = function () {
        var ul = document.createElement('ul'),
            doc = this.doc,
            talk = doc.talk;

        talk.sort(function (a, b) {
            var dateA = new Date(a.timestamp),
                dateB = new Date(b.timestamp);
            return dateA - dateB;
        });
        talk.forEach(function (item) {
            var li = document.createElement('li');
            li.setAttribute('data-time', item.timestamp);
            li.setAttribute('data-text', item.text);
            if (item.author) { // every author in a different color
                li.setAttribute('data-author', item.author);
                li.style.color = '#' + (Math.floor(parseInt(item.author.substr(-6).split('').reverse().join(''), 16) * 0.71)).toString(16); // this calc gives me a nice spread of colors
            }
            if (doc._id !== 'team') {
                li.innerHTML = '<button type="button">&#xe602;</button>' + item.text;
            }
            ul.appendChild(li);
        });
        display.call(this, ul);
    };

    return {
        show: showTalk,
        set element (e) {
            this.elm = e;
            display(toBeDisplayed);
        }
    };
});
