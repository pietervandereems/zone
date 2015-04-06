/*global define*/
/*jslint browser:true*/
define([], function () {
    'use strict';
    var showTalk,
        display;

    // **************************************************************************************************
    // Internal
    // **************************************************************************************************
    // Display the element, needed because we may need to wait until the dom is ready to display.
    display = function (elm) {
        if (this.element) {
            this.element.innerHTML = this.preset || '';
            this.element.appendChild(elm);
        } else {
            window.setTimeout(function () {
                display(elm);
            }, 200);
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
            li.innerHTML = item.text;
            ul.appendChild(li);
        });
        display(ul);
    };

    return {
        show: showTalk
    };
});
