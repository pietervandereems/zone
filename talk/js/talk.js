/*global define*/
/*jslint browser:true*/
define([], function () {
    'use strict';
    var showTalk;

    // **************************************************************************************************
    // Display
    // **************************************************************************************************
    //

    showTalk = function (targetElm) {
        var ul = document.createElement('ul'),
            talk = this.doc.talk;

        talk.sort(function (a, b) {
            var dateA = new Date(a.timestamp),
                dateB = new Date(b.timestamp);
            return dateA - dateB;
        });
        talk.forEach(function (item) {
            var li = document.createElement('li');
            li.innerHTML = new Date(item.timestamp).toISOString() + ' - ' + item.text;
            ul.appendChild(li);
        });
        targetElm.innerHTML = "";
        targetElm.appendChild(ul);
    };

    return {
        show: showTalk
    };
});
