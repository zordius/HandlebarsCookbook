var fs = require('fs');
var handlebars = require('handlebars');
var Prism = require('prismjs');
var exec = require('shelljs').exec;

require('prismjs/components/prism-javascript');
require('prismjs/components/prism-php');
require('prismjs/components/prism-handlebars');

var helpers = {
    code: function (cx, options) {
        var copy = options.hash.copy ? 'copy_for_' + options.hash.copy.replace(/\./, '_') : null;
        var code = '';
        var tmp_file = 'tmp_file_exec';
        var result = '';

        if (options.hash.use !== undefined) {
            switch (options.data.section) {
            case 'lightncandy':
                code = 'require \'./vendor/autoload.php\';\nuse LightnCandy\\LightnCandy;';
                break;
            case 'handlebars.js':
                code = 'var Handlebars = require(\'handlebars\');';
                break;
            case 'mustache':
                code = 'var Mustache = require(\'mustache\');';
                break;
            }
            code = code + options.hash.use;
        }

        code = code + helpers.remove_dupe_cr(cx);

        if (options.hash.result !== undefined) {
            switch (options.hash.type) {
            case 'php':
                fs.writeFileSync(tmp_file, '<?php\n' + code + '\n?>');
                result = exec('php ' + tmp_file, {silent: true});
                break;
            default:
                fs.writeFileSync(tmp_file, code);
                result = exec('node ' + tmp_file, {silent: true});
            }
            if ((result.code === 0) && (result.output !== '')) {
                result = '<h4>Output</h4><pre class="result">' + result.output + '</pre>';
            } else {
                console.warn('Bad result when execute code:\n' + code);
                console.warn(result);
                result = '';
            }
            fs.unlink(tmp_file);
        }

        return '<pre><code class="language-' + options.hash.type + '">' + Prism.highlight(code, Prism.languages[options.hash.type], options.hash.type) + '</code></pre>' + (copy ? '<textarea class="copy" id="' + copy + '">' + code + '</textarea><button class="btn btn-primary center-block" data-clipboard-target="#' + copy + '">Copy to clipboard</button>' : '') + result;
    },
    isStringThenOutput: function (cx, options) {
        if (typeof cx !== 'string') {
            return;
        }
        if (options.hash.tag) {
            return '<' + options.hash.tag + '>' + cx + '</' + options.hash.tag + '>';
        }
        return cx;
    },
    addOne: function (I) {
        return I + 1;
    },
    collect: function (cx, key, options) {
        if (typeof cx != 'object') {
            return;
        }
        return Object.keys(cx).reduce(function (O, K, I) {
            var V = cx[K];
            if (V && V[key]) {
                if (!options.hash.ignore || (options.hash.ignore[I] === undefined)) {
                    if (options.hash.key) {
                        V[key][options.hash.key] = K;
                    }
                    if (options.hash.comment && V[options.hash.comment]) {
                        O.push('\n// ' + V[options.hash.comment]);
                    }
                    O.push(V[key]);
                }
            }
            return O;
        }, []);
    },
    join: function (cx, sep) {
        return (cx && cx.join) ? cx.join(sep) : '';
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
            var R = options.fn(cx, {data: data});
            if (R != '') {
                ret.push(R);
            }
            return ret;
        }.bind(this), []);
        if (options.hash.column && sections.length > 1) {
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
    quicksample: function (options) {
        var samples = ['lightncandy', 'handlebars.js', 'mustache'];

        if (options.data.section === 'quicksample') {
            var data = handlebars.createFrame(options.data);
            data.samples = samples;
            return options.fn(this, {data: data});
        } else {
            return options.inverse(this);
        }
    },
    code_type: function (options) {
        if (this.file) {
            switch (this.file.match(/\.(.+)$/)[1]) {
            default:
                return 'js';
            }
        }
        if (options.data.section) {
            switch (options.data.section) {
            case 'template':
                return 'handlebars';
            case 'mustache':
            case 'handlebars.js':
            case 'nodejs':
            case 'JavaScript':
                return 'js';
            case 'php':
            case 'lightncandy':
                return 'php';
            default:
                return 'js';
            }
        }
    },
    remove_dupe_cr: function (txt) {
        return (txt && txt.replace) ? txt.replace(/\n+$/, '').replace(/\n{3,10}/g, '\n\n') : '';
    }
};

module.exports = helpers;
