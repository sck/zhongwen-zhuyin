/*
        Zhongwen - A Chinese-English Popup Dictionary
        Copyright (C) 2011 Christian Schiller
        https://chrome.google.com/extensions/detail/kkmlkkjojmombglmlpbpapmhcaljjkde

        ---

        Originally based on Rikaikun 0.8
        Copyright (C) 2010 Erek Speed
        http://code.google.com/p/rikaikun/

        ---

        Originally based on Rikaichan 1.07
        by Jonathan Zarate
        http://www.polarcloud.com/

        ---

        Originally based on RikaiXUL 0.4 by Todd Rudick
        http://www.rikai.com/
        http://rikaixul.mozdev.org/

        ---

        This program is free software; you can redistribute it and/or modify
        it under the terms of the GNU General Public License as published by
        the Free Software Foundation; either version 2 of the License, or
        (at your option) any later version.

        This program is distributed in the hope that it will be useful,
        but WITHOUT ANY WARRANTY; without even the implied warranty of
        MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
        GNU General Public License for more details.

        You should have received a copy of the GNU General Public License
        along with this program; if not, write to the Free Software
        Foundation, Inc., 51 Franklin St, Fifth Floor, Boston, MA  02110-1301  USA

        ---

        Please do not change or remove any of the copyrights or links to web pages
        when modifying any of the files. - Jon

 */

var zhongwenContent = {

    altView: 0,

    lastFound: null,

    keysDown: [],

    // Hack because SelEnd can't be sent in messages
    lastSelEnd:  [],
    // Hack because ro was coming out always 0 for some reason.
    lastRo: 0,

    //Adds the listeners and stuff.
    enableTab: function() {
        if (window.zhongwen == null) {
            window.zhongwen = {};
            window.addEventListener('mousemove', this.onMouseMove, false);
            window.addEventListener('keydown', this.onKeyDown, true);
            window.addEventListener('keyup', this.onKeyUp, true);
        }
    },

    //Removes the listeners and stuff
    disableTab: function() {
        if(window.zhongwen) {
            var e;
            window.removeEventListener('mousemove', this.onMouseMove, false);
            window.removeEventListener('keydown', this.onKeyDown, true);
            window.removeEventListener('keyup', this.onKeyUp, true);

            e = document.getElementById('zhongwen-css');
            if (e) e.parentNode.removeChild(e);
            e = document.getElementById('zhongwen-window');
            if (e) e.parentNode.removeChild(e);

            this.clearHi();
            delete window.zhongwen;
        }
    },

    getContentType: function(tDoc) {
        var m = tDoc.getElementsByTagName('meta');
        for(var i in m) {
            if(m[i].httpEquiv == 'Content-Type') {
                var con = m[i].content;
                con = con.split(';');
                return con[0];
            }
        }
        return null;
    },

    showPopup: function(text, elem, x, y, looseWidth) {
        var topdoc = window.document;

        if ((isNaN(x)) || (isNaN(y))) x = y = 0;

        var popup = topdoc.getElementById('zhongwen-window');

        if (!popup) {
            var css = topdoc.createElementNS('http://www.w3.org/1999/xhtml', 'link');
            css.setAttribute('rel', 'stylesheet');
            css.setAttribute('type', 'text/css');
            var cssdoc = window.zhongwen.config.css;
            css.setAttribute('href', chrome.extension.getURL('css/popup-' +
                cssdoc + '.css'));
            css.setAttribute('id', 'zhongwen-css');
            topdoc.getElementsByTagName('head')[0].appendChild(css);

            popup = topdoc.createElementNS('http://www.w3.org/1999/xhtml', 'div');
            popup.setAttribute('id', 'zhongwen-window');
            topdoc.documentElement.appendChild(popup);

            popup.addEventListener('dblclick',
                function (ev) {
                    zhongwenContent.hidePopup();
                    ev.stopPropagation();
                }, true);
        }

        popup.style.width = 'auto';
        popup.style.height = 'auto';
        popup.style.maxWidth = (looseWidth ? '' : '600px');

        if (zhongwenContent.getContentType(topdoc) == 'text/plain') {
            var df = document.createDocumentFragment();
            df.appendChild(document.createElementNS('http://www.w3.org/1999/xhtml', 'span'));
            df.firstChild.innerHTML = text;

            while (popup.firstChild) {
                popup.removeChild(popup.firstChild);
            }
            popup.appendChild(df.firstChild);
        }
        else {
            popup.innerHTML = text;
        }

        if (elem) {
            popup.style.top = '-1000px';
            popup.style.left = '0px';
            popup.style.display = '';

            var pW = popup.offsetWidth;
            var pH = popup.offsetHeight;

            // guess!
            if (pW <= 0) pW = 200;
            if (pH <= 0) {
                pH = 0;
                var j = 0;
                while ((j = text.indexOf('<br/>', j)) != -1) {
                    j += 5;
                    pH += 22;
                }
                pH += 25;
            }

            if (this.altView == 1) {
                x = window.scrollX;
                y = window.scrollY;
            }
            else if (this.altView == 2) {
                x = (window.innerWidth - (pW + 20)) + window.scrollX;
                y = (window.innerHeight - (pH + 20)) + window.scrollY;
            }
            // This probably doesn't actually work
            else if (elem instanceof window.HTMLOptionElement) {
                // these things are always on z-top, so go sideways

                x = 0;
                y = 0;

                var p = elem;
                while (p) {
                    x += p.offsetLeft;
                    y += p.offsetTop;
                    p = p.offsetParent;
                }
                if (elem.offsetTop > elem.parentNode.clientHeight) y -= elem.offsetTop;

                if ((x + popup.offsetWidth) > window.innerWidth) {
                    // too much to the right, go left
                    x -= popup.offsetWidth + 5;
                    if (x < 0) x = 0;
                }
                else {
                    // use SELECT's width
                    x += elem.parentNode.offsetWidth + 5;
                }
            }
            else {
                // go left if necessary
                if ((x + pW) > (window.innerWidth - 20)) {
                    x = (window.innerWidth - pW) - 20;
                    if (x < 0) x = 0;
                }

                // below the mouse
                var v = 25;

                // go up if necessary
                if ((y + v + pH) > window.innerHeight) {
                    var t = y - pH - 30;
                    if (t >= 0) y = t;
                }
                else y += v;

                x += window.scrollX;
                y += window.scrollY;
            }
        }
        else {
            x += window.scrollX;
            y += window.scrollY;
        }

        popup.style.left = x + 'px';
        popup.style.top = y + 'px';
        popup.style.display = '';
    },

    hidePopup: function() {
        var popup = document.getElementById('zhongwen-window');
        if (popup) {
            popup.style.display = 'none';
            popup.innerHTML = '';
        }
    },

    isVisible: function() {
        var popup = document.getElementById('zhongwen-window');
        return (popup) && (popup.style.display != 'none');
    },

    clearHi: function() {
        var tdata = window.zhongwen;
        if ((!tdata) || (!tdata.prevSelView)) return;
        if (tdata.prevSelView.closed) {
            tdata.prevSelView = null;
            return;
        }

        var sel = tdata.prevSelView.getSelection();
        if ((sel.isCollapsed) || (tdata.selText == sel.toString())) {
            sel.removeAllRanges();
        }
        tdata.prevSelView = null;
        tdata.selText = null;
    },

    onKeyDown: function(ev) {
        zhongwenContent._onKeyDown(ev)
    },
    _onKeyDown: function(ev) {
        /*
        console.log("keyCode=" + ev.keyCode +
            ' charCode=' + ev.charCode +
            ' detail=' + ev.detail +
            ' altKey=' + ev.altKey);
        */

        if (ev.ctrlKey) {
            return;
        }
        if (this.keysDown[ev.keyCode]) {
            return;
        }

        // console.log('window.getSelection() = ' + window.getSelection());

        if (!this.isVisible()) {
            if (window.getSelection() && !(window.getSelection().toString().length > 0)) {
                return;
            }
        }

        var i;

        switch (ev.keyCode) {
            case 27:        // esc
                this.hidePopup();
                break;
            case 65:        // a
                this.altView = (this.altView + 1) % 3;
                this.show(ev.currentTarget.zhongwen);
                break;
            //case 67:        // c
            //    // console.log("lastFound=" + this.lastFound);
            //    this.copyToClipboard(this.getTexts());
            //    break;
            case 66:        // b
                var ofs = ev.currentTarget.zhongwen.uofs;
                var tdata = ev.currentTarget.zhongwen;
                for (i = 0; i < 10; i++) {
                    tdata.uofs = --ofs;
                    var ret = this.show(tdata, true);
                    if (ret == 0) {
                        break;
                    } else if (ret == 2) {
                        tdata.prevRangeNode = this.findPreviousTextNode(tdata.prevRangeNode.parentNode, tdata.prevRangeNode);
                        tdata.prevRangeOfs = 0;
                        ofs = tdata.prevRangeNode.data.length;
                    }
                }
                break;
            case 77:        // m
                ev.currentTarget.zhongwen.uofsNext = 1;
            // falls through
            case 78:        // n
                tdata = ev.currentTarget.zhongwen;
                for (i = 0; i < 10; i++) {
                    tdata.uofs += tdata.uofsNext;
                    var ret = this.show(tdata);
                    if (ret == 0) {
                        break;
                    } else if (ret == 2) {
                        tdata.prevRangeNode = this.findNextTextNode(tdata.prevRangeNode.parentNode, tdata.prevRangeNode);
                        tdata.prevRangeOfs = 0;
                        tdata.uofs = 0;
                        tdata.uofsNext = 0;
                    }
                }
                break;
            case 83:        // s
                if (this.isVisible()) {
                    // console.log('s pressed, opening tab ...');

                    // http://www.skritter.com/vocab/api/add?from=Chrome&lang=zh&word=浏览&trad=瀏 覽&rdng=liú lǎn&defn=to skim over; to browse
                
                    var skritter = 'http://www.skritter.com/vocab/api/add?from=Zhongwen&siteref=Zhongwen&lang=zh&word=' +
                    encodeURIComponent(this.lastFound[0][0]) +
                    '&trad=' + encodeURIComponent(this.lastFound[0][1]) +
                    '&rdng=' + encodeURIComponent(this.lastFound[0][4]) +
                    '&defn=' + encodeURIComponent(this.lastFound[0][3]);

                    // console.log('url=' + skritter);

                    chrome.extension.sendRequest({
                        type: 'open',
                        url: skritter
                    });
                }
                break;
            case 88:        // x
                this.altView = 0;
                ev.currentTarget.zhongwen.popY -= 20;
                this.show(ev.currentTarget.zhongwen);
                break;
            case 89:        // y
                this.altView = 0;
                ev.currentTarget.zhongwen.popY += 20;
                this.show(ev.currentTarget.zhongwen);
                break;

            case 49:     // 1
                if (ev.altKey) {
                    var sel = encodeURIComponent(
                        window.getSelection().toString());

                    // http://www.nciku.com/search/all/%E4%B8%AD
                    var nciku = 'http://www.nciku.com/search/all/' + sel;

                    // console.log('url=' + nciku);

                    chrome.extension.sendRequest({
                        type: 'open',
                        url: nciku
                    });
                }
                break;
            case 50:     // 2
                if (ev.altKey) {
                    sel = encodeURIComponent(
                        window.getSelection().toString());

                    // http://www.yellowbridge.com/chinese/wordsearch.php?searchMode=C&word=%E4%B8%AD
                    var yellow = 'http://www.yellowbridge.com/chinese/wordsearch.php?searchMode=C&word=' + sel;

                    chrome.extension.sendRequest({
                        type: 'open',
                        url: yellow
                    });
                }
                break;
            case 51:     // 3
                if (ev.altKey) {
                    sel = encodeURIComponent(
                        window.getSelection().toString());

                    // http://dict.cn/%E7%BF%BB%E8%AF%91
                    var dictcn = 'http://dict.cn/' + sel;

                    chrome.extension.sendRequest({
                        type: 'open',
                        url: dictcn
                    });
                }
                break;
            case 52:     // 4
                if (ev.altKey) {
                    sel = encodeURIComponent(
                        window.getSelection().toString());

                    // http://www.iciba.com/%E4%B8%AD%E9%A4%90
                    var iciba = 'http://www.iciba.com/' + sel;

                    chrome.extension.sendRequest({
                        type: 'open',
                        url: iciba
                    });
                }
                break;
            case 53:     // 4
                if (ev.altKey) {
                    sel = encodeURIComponent(
                        window.getSelection().toString());

                    // http://www.mdbg.net/chindict/chindict.php?page=worddict&wdrst=0&wdqb=%E6%B0%B4
                    var mdbg = 'http://www.mdbg.net/chindict/chindict.php?page=worddict&wdrst=0&wdqb=' + sel;

                    chrome.extension.sendRequest({
                        type: 'open',
                        url: mdbg
                    });
                }
                break;
            default:
                return;
        }

        if (ev.keyCode != 83 && (ev.keyCode < 49 || 57 < ev.keyCode)) {
            // don't do this for opening a new Skritter or dictionary tab,
            // because onKeyUp won't be called
            this.keysDown[ev.keyCode] = 1;
        }

    },

    //    getText: function(i) {
    //        var text = this.lastFound[i];
    //        return text.join('\t');
    //    },

    getTexts: function() {
        var result = '';
        for (var i = 0; i < this.lastFound.length; i++) {
            result += this.lastFound[i].slice(0, -1).join('\t');
            result += '\n';
        }
        return result;
    },

    onKeyUp: function(ev) {
        if (zhongwenContent.keysDown[ev.keyCode]) zhongwenContent.keysDown[ev.keyCode] = 0;
    },

    unicodeInfo: function(c) {
        var hex = '0123456789ABCDEF';
        var u = c.charCodeAt(0);
        return c + ' U' + hex[(u >>> 12) & 15] + hex[(u >>> 8) & 15] + hex[(u >>> 4) & 15] + hex[u & 15];
    },

    // Gets text from a node
    // returns a string
    // node: a node
    // selEnd: the selection end object will be changed as a side effect
    // maxLength: the maximum length of returned string
    // xpathExpr: an XPath expression, which evaluates to text nodes, will be evaluated
    // relative to "node" argument
    getInlineText: function (node, selEndList, maxLength) {
        var endIndex;

        if (node.nodeName == '#text') {
            endIndex = Math.min(maxLength, node.data.length);
            selEndList.push({
                node: node,
                offset: endIndex
            });
            return node.data.substring(0, endIndex);
        } else {
            return '';
        }
    },

    getTextFromRange: function (rangeParent, offset, selEndList, maxLength) {
        var text = '';
        var endIndex;

        if (rangeParent.nodeType != Node.TEXT_NODE) {
            return '';
        }

        endIndex = Math.min(rangeParent.data.length, offset + maxLength);
        text += rangeParent.data.substring(offset, endIndex);
        selEndList.push( {
            node: rangeParent,
            offset: endIndex
        } );

        var nextNode = rangeParent;
        while (((nextNode = this.findNextTextNode(nextNode)) != null) && (text.length < maxLength)) {
            text += this.getInlineText(nextNode, selEndList, maxLength - text.length);
        }

        return text;
    },

    show: function(tdata, backwards) {

        var rp = tdata.prevRangeNode;
        var ro = tdata.prevRangeOfs + tdata.uofs;
        var u;

        tdata.uofsNext = 1;

        if (!rp) {
            this.clearHi();
            this.hidePopup();
            return 1;
        }

        if ((ro < 0) || (ro >= rp.data.length)) {
            this.clearHi();
            this.hidePopup();
            return 2;
        }

        // if we have '   XYZ', where whitespace is compressed, X never seems to get selected
        while (((u = rp.data.charCodeAt(ro)) == 32) || (u == 9) || (u == 10) || (u == 13)) {
            if (!backwards) {
                ++ro;
            } else {
                --ro;
            }
            if (ro < 0 || rp.data.length <= ro) {
                this.clearHi();
                this.hidePopup();
                return 2;
            }
        }

        if ((isNaN(u)) ||
            ((u != 0x25CB) &&
                ((u < 0x3400) || (u > 0x9FFF)) &&
                ((u < 0xF900) || (u > 0xFAFF)) &&
                ((u < 0xFF21) || (u > 0xFF3A)) &&
                ((u < 0xFF41) || (u > 0xFF5A)))) {
            this.clearHi();
            this.hidePopup();
            return 3;
        }

        //selection end data
        var selEndList = [];
        var text = this.getTextFromRange(rp, ro, selEndList, 30 /*maxlength*/);

        lastSelEnd = selEndList;
        lastRo = ro;
        chrome.extension.sendRequest({
            "type": "search",
            "text": text
        },
        zhongwenContent.processEntry);

        return 0;

    },

    processEntry: function(e) {

        var tdata = window.zhongwen;

        var ro = lastRo;

        var selEndList = lastSelEnd;

        if (!e) {
            zhongwenContent.hidePopup();
            zhongwenContent.clearHi();
            return -1;
        }

        if (!e.matchLen) e.matchLen = 1;
        tdata.uofsNext = e.matchLen;
        tdata.uofs = (ro - tdata.prevRangeOfs);

        var rp = tdata.prevRangeNode;
        // don't try to highlight form elements
        if (!('form' in tdata.prevTarget)) {
            var doc = rp.ownerDocument;
            if (!doc) {
                zhongwenContent.clearHi();
                zhongwenContent.hidePopup();
                return 0;
            }
            zhongwenContent.highlightMatch(doc, rp, ro, e.matchLen, selEndList, tdata);
            tdata.prevSelView = doc.defaultView;
        }

        zhongwenContent.processHtml(zhongwenContent.makeHtml(e, window.zhongwen.config.tonecolors != 'no'));
    },

    processHtml: function(html) {
        var tdata = window.zhongwen;
        zhongwenContent.showPopup(html, tdata.prevTarget, tdata.popX, tdata.popY, false);
        return 1;
    },

    debugObject: function(name, obj) {
        var debugstr = name + '=\n';
        for (var prop in obj) {
            if (obj.hasOwnProperty(prop)) {
                debugstr = debugstr + " " + prop + "=" + obj[prop] + "\n";
            }
        }
        console.log(debugstr);
    },

    highlightMatch: function (doc, rp, ro, matchLen, selEndList, tdata) {
        if (selEndList == undefined || selEndList.length === 0) return;

        var selEnd;
        var offset = matchLen + ro;

        for (var i = 0, len = selEndList.length; i < len; i++) {
            selEnd = selEndList[i]
            if (offset <= selEnd.offset) break;
            offset -= selEnd.offset;
        }

        var range = doc.createRange();
        range.setStart(rp, ro);
        range.setEnd(selEnd.node, offset);

        var sel = doc.defaultView.getSelection();
        if ((!sel.isCollapsed) && (tdata.selText != sel.toString()))
            return;
        sel.removeAllRanges();
        sel.addRange(range);
        tdata.selText = sel.toString();
    },

    getFirstTextChild: function(node) {
        var nodeIterator = document.createNodeIterator(node, NodeFilter.SHOW_TEXT, null);
        return nodeIterator.nextNode();
    },

    onMouseMove:
    function(ev) {
        zhongwenContent._onMouseMove(ev);
    },
    _onMouseMove: function(ev) {
        var tdata = window.zhongwen;        // per-tab data

        if (tdata.clientX && tdata.clientY) {
            if (ev.clientX == tdata.clientX && ev.clientY == tdata.clientY) {
                return;
            }
        }
        tdata.clientX = ev.clientX;
        tdata.clientY = ev.clientY;

        var range = document.caretRangeFromPoint(ev.clientX, ev.clientY);
        var rp = range.startContainer;
        var ro = range.startOffset;

        /*
        console.log( "ro: " + ro +
            " rp: " +  rp.nodeName +
            " data: " + (rp.data ? rp.data : "") +
            " target: " + ev.target.nodeName +
            " parentNode: " + rp.parentNode.nodeName);
        */
       
        if (ev.target == tdata.prevTarget) {
            if ((rp == tdata.prevRangeNode) && (ro == tdata.prevRangeOfs)) return;
        }

        if (tdata.timer) {
            clearTimeout(tdata.timer);
            tdata.timer = null;
        }

        if((rp.data) && ro == rp.data.length) {
            rp = this.findNextTextNode(rp.parentNode, rp);
            ro = 0;
        }
        
        // The case where the text before div is empty.
        if(rp && rp.parentNode != ev.target) {
            rp = zhongwenContent.findNextTextNode(rp.parentNode, rp);
            ro=0;
        }

        // Otherwise, we're off in nowhere land and we should go home.
        else if(!(rp) || ((rp.parentNode != ev.target))){
            rp = null;
            ro = -1;

        }

        tdata.prevTarget = ev.target;
        tdata.prevRangeNode = rp;
        tdata.prevRangeOfs = ro;
        tdata.uofs = 0;
        this.uofsNext = 1;

        if ((rp) && (rp.data) && (ro < rp.data.length)) {
            tdata.popX = ev.clientX;
            tdata.popY = ev.clientY;
            tdata.timer = setTimeout(
                function() {
                    zhongwenContent.show(tdata);
                }, 50);
            return;
        }

        // Don't close just because we moved from a valid popup slightly over
        // to a place with nothing.
        var dx = tdata.popX - ev.clientX;
        var dy = tdata.popY - ev.clientY;
        var distance = Math.sqrt(dx * dx + dy * dy);
        if (distance > 4) {
            this.clearHi();
            this.hidePopup();
        }
    },

    findNextTextNode : function(root, previous) {
        if (root == null) {
            return null;
        }
        var nodeIterator = document.createNodeIterator(root, NodeFilter.SHOW_TEXT, null);
        var node = nodeIterator.nextNode();
        while (node != previous) {
            node = nodeIterator.nextNode();
            if (node == null) {
                return null;
            }
        }
        var result = nodeIterator.nextNode();
        if (result != null) {
            return result;
        } else {
            return this.findNextTextNode(root.parentNode, previous);
        }
    },

    findPreviousTextNode : function(root, previous) {
        if (root == null) {
            return null;
        }
        var nodeIterator = document.createNodeIterator(root, NodeFilter.SHOW_TEXT, null);
        var node = nodeIterator.nextNode();
        while (node != previous) {
            node = nodeIterator.nextNode();
            if (node == null) {
                return null;
            }
        }
        nodeIterator.previousNode();
        var result = nodeIterator.previousNode();
        if (result != null) {
            return result;
        } else {
            return this.findPreviousTextNode(root.parentNode, previous);
        }
    },

    copyToClipboard : function(data) {
        chrome.extension.sendRequest({
            "type": "copy",
            "data": data
        });

        this.showPopup("Copied to clipboard");
    },

    makeHtml: function(entry, showToneColors) {

        var e;
        var html = '';
        var texts = [];

        if (entry == null) return '';

        for (var i = 0; i < entry.data.length; ++i) {
            e = entry.data[i][0].match(/^([^\s]+?)\s+([^\s]+?)\s+(?:\[(.*?)\])?\s*\/(.+)\//);
            if (!e) continue;

            // Hanzi

            var hanziClass = 'w-hanzi';
            if (window.zhongwen.config.fontSize == 'small') {
                hanziClass += '-small';
            }
            html += '<span class="' + hanziClass + '">' + e[2] + '</span>&nbsp;';
            if (e[1] != e[2]) {
                html += '<span class="' + hanziClass + '">' + e[1] + '</span>&nbsp;';
            }

            // Pinyin

            var pinyinClass = 'w-pinyin';
            if (window.zhongwen.config.fontSize == 'small') {
                pinyinClass += '-small';
            }
            var p = this.pinyin(e[3], showToneColors, pinyinClass);
            html += p[0];

            var p = this.zhuyin(e[3], "");
            html += "&nbsp;&nbsp;" + p[0];

            // Definition

            var defClass = 'w-def';
            if (window.zhongwen.config.fontSize == 'small') {
                defClass += '-small';
            }
            var translation = e[4].replace(/\//g, '; ');
            html += '<br><span class="' + defClass + '">' + translation + '</span><br>';

            texts[i] = [e[2], e[1], p[1], translation, e[3]];
        }
        if (entry.more) {
            html += '&hellip;<br/>';
        }

        this.lastFound = texts;

        return html;
    },

    tones : {
        1 : '&#772;',
        2 : '&#769;',
        3: '&#780;',
        4: '&#768;',
        5: ''
    },

    utones : {
        1 : '\u0304',
        2 : '\u0301',
        3 : '\u030C',
        4 : '\u0300',
        5: ''
    },

    parse: function(s) {
        var m = s.match(/([^AEIOU:aeiou:]*)([AEIOUaeiou:]+)([^aeiou:]*)([1-5])/);
        return m;
    },

    tonify: function(vowels, tone) {
        var html = '';
        var text = '';

        if (vowels == 'ou') {
            html = 'o' + this.tones[tone] + 'u';
            text = 'o' + this.utones[tone] + 'u'
        } else {
            var tonified = false;
            for (var i = 0; i < vowels.length; i++) {
                var c = vowels.charAt(i);
                html += c;
                text += c;
                if (c == 'a' || c == 'e') {
                    html += this.tones[tone];
                    text += this.utones[tone];
                    tonified = true;
                } else if ((i == vowels.length - 1) && !tonified) {
                    html += this.tones[tone];
                    text += this.utones[tone];
                    tonified = true;
                }
            }
            html = html.replace(/u:/, '&uuml;');
            text = text.replace(/u:/, '\u00FC');
        }

        return [html, text];
    },
    zhuyinInitials: {
      b: "ㄅ", p: "ㄆ", m: "ㄇ", f: "ㄈ", d: "ㄉ", t: "ㄊ", n: "ㄋ", l: "ㄌ",
      g: "ㄍ", k: "ㄎ", h: "ㄏ", j: "ㄐ", q: "ㄑ", x: "ㄒ",
      zh: "ㄓ", zhi: "ㄓ", ch: "ㄔ", chi: "ㄔ",  sh: "ㄕ", shi: "ㄕ", 
      ri: "ㄖ", r: "ㄖ", z: "ㄗ", c:"ㄘ", ci:"ㄘ", s:"ㄙ", w: "ㄨ", 
      wu: "ㄨ", xu: "ㄒㄩ", que: "ㄑㄩㄝ", xio: "ㄒㄩ", xue: "ㄒㄩㄝ", 
      yo: "ㄩ", qu: "ㄑㄩ"
    },
    zhuyinMedials: {
      i: "ㄧ", yi: "ㄧ", y: "ㄧ", u: "ㄨ", wu: "ㄨ", "ü": "ㄩ", yu: "ㄩ",
      ie: "ㄧㄝ", ye: "ㄧㄝ", "üe": "ㄩㄝ"
    },
    zhuyinFinals: { a: "ㄚ", o: "ㄛ",  e: "ㄜ",  ue: "ㄝ", 
      ai: "ㄞ", ei: "ㄟ", i: "ㄟ", ao: "ㄠ", ou: "ㄡ", u: "ㄡ", an:"ㄢ", 
      n: "ㄣ", en: "ㄣ", ang: "ㄤ", eng: "ㄥ", ng: "ㄥ", er: "ㄦ", 
      ong: "ㄨㄥ"
    },
    zhuyinTones: ["", "ˊ", "ˇ", "ˋ", "˙"],
    zhOk: function(s, d) {
      if (d[s] != undefined) { this.html += d[s]; return s.length }
      return 0;
    },
    zhuyin: function(words, zhuYinClass) {
      this.html = '';
      var a = words.split(/\s/);
      for (var i = 0; i < a.length; i++) {
        var w = a[i].toLowerCase(); var l = w.length
        if (i > 0) {
          this.html += '&nbsp;'
        }
        var tone = w[l - 1] - 1
        l -= 1
        var c = 0;
        c += this.zhOk(w[0] + w[1] + w[2], this.zhuyinInitials) ||
            this.zhOk(w[0] + w[1], this.zhuyinInitials) ||
            this.zhOk(w[0], this.zhuyinInitials)
        c += this.zhOk(w.substr(c, 2), this.zhuyinMedials) ||
          this.zhOk(w.substr(c, 1), this.zhuyinMedials)
        this.zhOk(w.substr(c, l - c), this.zhuyinFinals)
        this.html += this.zhuyinTones[tone]
      }
      return [this.html, ""]
    },

    pinyin: function(words, showToneColors, pinyinClass) {
        var text = '';
        var html = ''
        var a = words.split(/\s/);
        for (var i = 0; i < a.length; i++) {
            var word = a[i];
            if (i > 0) {
                html += '&nbsp;';
                text += ' ';
            }
            if (word == 'r5') {
                if (showToneColors) {
                    html += '<span class="' + pinyinClass + ' tone5">r</span>';
                } else {
                    html += '<span class="' + pinyinClass + '">r</span>';
                }
                text += 'r';
                continue;
            }
            if (word == 'xx5') {
                if (showToneColors) {
                    html += '<span class="' + pinyinClass + ' tone5">??</span>';
                } else {
                    html += '<span class="' + pinyinClass + '">??</span>';
                }
                text += '??';
                continue;
            }
            var m = this.parse(word);
            if (showToneColors) {
                html += '<span class="' + pinyinClass + ' tone' + m[4] + '">';
            } else {
                html += '<span class="' + pinyinClass + '">';
            }
            var t = this.tonify(m[2], m[4]);
            html += m[1] + t[0] + m[3];
            html += '</span>';
            text += m[1] + t[1] + m[3];
        }
        return [html, text]
    }
}

//Event Listeners
chrome.extension.onRequest.addListener(
    function(request, sender, sendResponse) {
        switch(request.type) {
            case 'enable':
                zhongwenContent.enableTab();
                window.zhongwen.config = request.config;
                // console.log("enable");
                break;
            case 'disable':
                zhongwenContent.disableTab();
                // console.log("disable");
                break;
            case 'showPopup':
                // console.log("showPopup");
                zhongwenContent.showPopup(request.text);
                break;
            default:
        // console.log(request);
        }
    }
    );

// When a page first loads, checks to see if it should enable script
chrome.extension.sendRequest({
    "type": "enable?"
});
