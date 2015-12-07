var fs = require('fs');
var handlebars = require('handlebars');

var helpers = {
    book_writer: function (data, options) {
        data.forEach(function (D, I) {
            if (I > 0) {
                D.page_prev = data[I - 1];
            }
            if (D[I + 1] !== undefined) {
                D.page_next = data[I + 1];
            }
            fs.writeFileSync(data.configs.out_dir + D.pagename + '.html', options.fn(D));
        });
    },
    section_builder: function (cx, options) {
        var sections = Object.keys(cx).reduce(function (ret, S) {
            var data = handlebars.createFrame(options.data);
            data.section = S;
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
        case 'title':
        case 'description':
        case 'pagename':
            return '';
        default:
            return options.fn(this);
        }
    }
};

module.exports = helpers;
