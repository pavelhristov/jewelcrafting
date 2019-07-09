
let utils = (function () {
    let charsToEscape = [
        { original: '&', escaped: '&amp;' },
        { original: '<', escaped: '&lt;' },
        { original: '>', escaped: '&gt;' },
        { original: '"', escaped: '&quot;' },
        { original: `'`, escaped: '&#39;' }
    ];

    function escapeHTML(str) {
        charsToEscape.forEach(char => {
            str = replaceAll(str, char.original, char.escaped);
        });

        return str;
    }

    // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_Expressions#Using_special_characters
    function escapeRegExp(str) {
        return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    // https://stackoverflow.com/questions/1144783/how-to-replace-all-occurrences-of-a-string-in-javascript
    function replaceAll(str, find, replace) {
        return str.replace(new RegExp(escapeRegExp(find), 'g'), replace);
    }

    return {
        replaceAll,
        escapeHTML
    };
})();