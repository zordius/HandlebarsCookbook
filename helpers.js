var fs = require('fs');
var handlebars = require('handlebars');

var helpers = {
    isStringThenOutput: function (cx, options) {
        if (typeof cx !== 'string') {
            return;
        }
        if (options.hash.tag) {
            return new handlebars.SafeString('<' + options.hash.tag + '>' + cx + '</' + options.hash.tag + '>');
        }
        return cx;
    },
    addOne: function (I) {
        return I + 1;
    },
    book_writer: function (data, options) {
        data.forEach(function (D, I) {
            if (I > 0) {
                D.page_prev = data[I - 1];
            }
            if (data[I + 1] !== undefined) {
                D.page_next = data[I + 1];
            }
            fs.writeFileSync(data.configs.out_dir + D.pagename + '.html', options.fn(D));
        });
    },
    section_builder: function (cx, options) {
        if (typeof cx !== 'object') {
            return cx ? '<p>' + cx + '</p>' : '';
        }
        var sections = Object.keys(cx).reduce(function (ret, S) {
            var data = handlebars.createFrame(options.data);
            data.section = S;
            data.sectionNumber = (ret.length + 1) + '. ';
            var R = options.fn(cx, {data: data});
            if (R != '') {
                ret.push(R);
            }
            return ret;
        }.bind(this), []);
        if (options.hash.column) {
            return '<div class="row">' + sections.map(function (S) {
                return '<div class="col-md-' + ((sections.length > 2) ? '4' : '6') + '">' + S + '</div>';
            }).join('') + '</div>';
        }
        return sections.join('');
    },
    main_section: function (options) {
        switch (options.data.section) {
        case 'page_prev':
        case 'page_next':
        case 'title':
        case 'description':
        case 'pagename':
            return '';
        default:
            return options.fn(this);
        }
    },
    code_type: function (options) {
        if (this.file) {
            return this.file.match(/\.(.+)$/)[1];
        }
        if (options.data.section) {
            switch (options.data.section) {
            case 'handlebars.js':
            case 'mustache':
            case 'nodejs':
            case 'JavaScript':
                return 'js';
            case 'lightncandy':
                return 'php';
            default:
                return options.data.section;
            }
        }
    },
    remove_last_cr: function (txt) {
        return txt.replace(/\n+$/, '');
    }
};

module.exports = helpers;
