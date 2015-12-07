var fs = require('fs');

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
    section_builder: function (options) {
        return Object.keys(this).reduce(function (ret, S) {
            switch (S) {
            case 'title':
            case 'description':
            case 'pagename':
                break;
            default:
                ret += options.fn(S);
            }
            return ret;
        }.bind(this), '');
    }
};

module.exports = helpers;
