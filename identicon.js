/**
 * Identicon.js 2.0
 * http://github.com/stewartlord/identicon.js
 *
 * Requires PNGLib
 * http://www.xarg.org/download/pnglib.js
 *
 * Copyright 2016, Stewart Lord
 * Released under the BSD license
 * http://www.opensource.org/licenses/bsd-license.php
 */

(function() {
    var PNGlib = window.PNGlib;

    var Identicon = function(hash, options){
        this.defaults = {
            background: [240, 240, 240, 255],
            hash:       this.createHashFromString((new Date()).toISOString()),
            margin:     0.08,
            size:       64,
            format:     'png'
        };

        this.options     = typeof(options) === 'object' ? options : this.defaults;

        // backward compatibility with old constructor (hash, size, margin)
        if (arguments[1] && typeof(arguments[1]) === 'number') { this.options.size   = arguments[1]; }
        if (arguments[2])                                      { this.options.margin = arguments[2]; }

        this.hash        = hash                    || this.defaults.hash;
        this.background  = this.options.background || this.defaults.background;
        this.foreground  = this.options.foreground;
        this.margin      = this.options.margin     || this.defaults.margin;
        this.size        = this.options.size       || this.defaults.size;
        this.format      = this.options.format     || this.defaults.format;
    };

    Identicon.prototype = {
        background: null,
        foreground: null,
        hash:       null,
        margin:     null,
        size:       null,
        format:     null,

        render: function(){
            var hash       = this.hash,
                size       = this.size,
                baseMargin = Math.floor(size * this.margin),
                cell       = Math.floor((size - (baseMargin * 2)) / 5),
                margin     = Math.floor((size - cell * 5) / 2),
                image      = this.isSvg() ? new Svg(size, this.background) : new PNGlib(size, size, 256);

            var bg = image.color(this.background[0], this.background[1], this.background[2], this.background[3]),
                fg;

            if (this.foreground) {
                fg = image.color(this.foreground[0], this.foreground[1], this.foreground[2]);
            } else {
                // foreground is last 7 chars as hue at 50% saturation, 70% brightness
                var rgb = this.hsl2rgb(parseInt(hash.substr(-7), 16) / 0xfffffff, 0.5, 0.7);
                fg      = image.color(rgb[0] * 255, rgb[1] * 255, rgb[2] * 255);
            }

            // the first 15 characters of the hash control the pixels (even/odd)
            // they are drawn down the middle first, then mirrored outwards
            var i, color;
            for (i = 0; i < 15; i++) {
                color = parseInt(hash.charAt(i), 16) % 2 ? bg : fg;
                if (i < 5) {
                    this.rectangle(2 * cell + margin, i * cell + margin, cell, cell, color, image);
                } else if (i < 10) {
                    this.rectangle(1 * cell + margin, (i - 5) * cell + margin, cell, cell, color, image);
                    this.rectangle(3 * cell + margin, (i - 5) * cell + margin, cell, cell, color, image);
                } else if (i < 15) {
                    this.rectangle(0 * cell + margin, (i - 10) * cell + margin, cell, cell, color, image);
                    this.rectangle(4 * cell + margin, (i - 10) * cell + margin, cell, cell, color, image);
                }
            }

            return image;
        },

        rectangle: function(x, y, w, h, color, image){
            if (this.isSvg()) {
                image.rectangles.push({x: x, y: y, w: w, h: h, color: color});
            } else {
                var i, j;
                for (i = x; i < x + w; i++) {
                    for (j = y; j < y + h; j++) {
                        image.buffer[image.index(i, j)] = color;
                    }
                }
            }
        },

        // adapted from: https://gist.github.com/aemkei/1325937
        hsl2rgb: function(h, s, b){
            h *= 6;
            s = [
                b += s *= b < .5 ? b : 1 - b,
                b - h % 1 * s * 2,
                b -= s *= 2,
                b,
                b + h % 1 * s,
                b + s
            ];

            return[
                s[ ~~h    % 6 ],  // red
                s[ (h|16) % 6 ],  // green
                s[ (h|8)  % 6 ]   // blue
            ];
        },

        toString: function(){
            return this.render().getBase64();
        },

        // Creates a consistent-length hash from a string
        createHashFromString: function(str){
            var hash = '0', salt = 'identicon', i, chr, len;

            if (!str) {
                return hash;
            }

            str += salt + str; // Better randomization for short inputs.

            for (i = 0, len = str.length; i < len; i++) {
                chr   = str.charCodeAt(i);
                hash  = ((hash << 5) - hash) + chr;
                hash |= 0; // Convert to 32bit integer
            }
            return hash.toString();
        },

        isSvg: function(){
            return this.format.match(/svg/i)
        }
    };

    var Svg = function(size, background){
        this.size       = size;
        this.background = this.color.apply(this, background);
        this.rectangles = [];
    };

    Svg.prototype = {
        size:       null,
        background: null,
        rectangles: null,

        color: function(r, g, b, a){
            return [r, g, b, a ? a/255 : 1].map(Math.round);
        },

        getBase64: function(){
            var i, rect, xml;

            xml = '<svg xmlns="http://www.w3.org/2000/svg"'
                + ' width="' + this.size + '" height="' + this.size + '"'
                + ' style="background-color: rgba(' + this.background.join(',') + ');"'
                + '>';

            for (i = 0; i < this.rectangles.length; i++) {
                rect = this.rectangles[i];
                if (rect.color.join(',') == this.background.join(',')) continue;
                xml += '<rect '
                    + ' x="' + rect.x + '"'
                    + ' y="' + rect.y + '"'
                    + ' width="' + rect.w + '"'
                    + ' height="' + rect.h + '"'
                    + ' style="fill: rgba(' + rect.color.join(',') + ');"'
                    + '/>';
            }

            xml += '</svg>';

            return btoa(xml);
        }
    };

    window.Identicon = Identicon;

})();
