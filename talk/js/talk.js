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
            talk = this.doc.talk;

        talk.sort(function (a, b) {
            var dateA = new Date(a.timestamp),
                dateB = new Date(b.timestamp);
            return dateA - dateB;
        });
        talk.forEach(function (item) {
            var li = document.createElement('li');
            li.setAttribute('data-time', item.timestamp);
            if (item.author) {
                li.setAttribute('data-author', item.author);
            }
            li.setAttribute('data-text', item.text);
            li.innerHTML = '<button type="button">&#xe602;</button>' + item.text;
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
