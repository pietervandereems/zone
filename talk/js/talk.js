/*global define*/
/*jslint browser:true*/
define(['vagueTime.min'], function (vagueTime) {
    'use strict';
    var showTalk;

    // **************************************************************************************************
    // Display
    // **************************************************************************************************
    //

    showTalk = function () {
        var ul = document.createElement('ul'),
            talk = this.doc.talk,
            now = new Date();

        talk.sort(function (a, b) {
            var dateA = new Date(a.timestamp),
                dateB = new Date(b.timestamp);
            return dateA - dateB;
        });
        talk.forEach(function (item) {
            var li = document.createElement('li'),
                vague = vagueTime({
                    from: now,
                    to: new Date(item.timestamp),
                    lang: 'nl'
                });
            li.innerHTML = vague + ' - ' + item.text;
            ul.appendChild(li);
        });
        this.element.innerHTML = "";
        this.element.appendChild(ul);
    };

    return {
        show: showTalk
    };
});
