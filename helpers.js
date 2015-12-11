var fs = require('fs');
var handlebars = require('handlebars');
var Prism = require('prismjs');
var exec = require('shelljs').exec;
var shortid = require('shortid').generate;
var defaultSP = '  ';
var tmp_file = '.exec_tmp_file';

require('prismjs/components/prism-javascript');
require('prismjs/components/prism-php');
require('prismjs/components/prism-handlebars');

var helpers = {
    code_for_require: function (type) {
        switch (type) {
        case 'lightncandy':
            return 'require(\'./vendor/autoload.php\');\nuse LightnCandy\\LightnCandy;';
        case 'handlebars.js':
            return 'var Handlebars = require(\'handlebars\');';
        case 'mustache':
            return 'var Mustache = require(\'mustache\');';
        }
        console.warn('unknown code type in code_for_require():' + type);
        return '';
    },

    code_for_set: function (name, type) {
        switch (type) {
        case 'lightncandy':
            return '$' + name + ' = ';
        case 'handlebars.js':
        case 'mustache':
            return 'var ' + name + ' = ';
        }
        console.warn('unknown code type in code_for_set():' + type);
        return '';
    },

    code_for_option: function (option, type) {
        var opt = (option && option[type]) ? option[type] : option;

        if (! opt) {
            return '';
        }

        switch (type) {
        case 'lightncandy':
            return opt.map(function (V) {
                return 'LightnCandy::' + V;
            }).join(' | ');
        case 'handlebars.js':
        case 'mustache':
            return '';
        }
        console.warn('unknown code type in code_for_option():' + type);
        return '';
    },

    code_for_data: function (data, type) {
        switch (type) {
        case 'handlebars.js':
        case 'mustache':
            return ['js', JSON.stringify(data, undefined, defaultSP)];
        case 'lightncandy':
            return ['php', helpers.php_array(data, '')];
        default:
            console.warn('unknown code type in code_for_data():' + type);
        }
    },

    code_for_compile: function (type, opt) {
        var EX;
        switch (type) {
        case 'lightncandy':
            EX = opt ? ', array(\'flags\' => ' + opt + ')' : '';
            return '$php = LightnCandy::compile($template' + EX + ');\n$render = LightnCandy::prepare($php);';
        case 'handlebars.js':
            return 'var render = Handlebars.compile(template);';
        case 'mustache':
            return '';
        }
        console.warn('unknown code type in code_for_compile():' + type);
        return '';
    },

    code_for_render: function (type) {
        switch (type) {
        case 'lightncandy':
            return 'echo $render($data);';
        case 'handlebars.js':
            return 'console.log(render(data));';
        case 'mustache':
            return 'console.log(Mustache.render(template, data));';
        }
        console.warn('unknown code type in code_for_render():' + type);
        return '';
    },

    php_array: function (D, sp) {
        var spp = sp + defaultSP;

        if (D === null) {
            return 'NULL';
        }

        if (Array.isArray(D)) {
            return 'array(\n' + D.map(function (V) {
                return spp + helpers.php_array(V, spp);
            }).join(',\n') + '\n' + sp + ')';
        }

        if (typeof D === 'object') {
            return 'array(\n' + Object.keys(D).map(function (K) {
                var V = D[K];
                return spp + '"' + K.replace(/"/g, '\"/' + '"') + '" => ' + helpers.php_array(V, spp);
            }).join(',\n') + '\n' + sp + ')';
        }

        if (typeof D === 'string') {
            return '"' + D.replace(/\\/g, '\\\\').replace(/"/g, '\"/' + '"') + '"';
        }

        if (D === true) {
            return 'true';
        }

        if (D === false) {
            return 'false';
        }

        if (D === undefined) {
            return 'NULL';
        }

        return D;
    },

    result_for_code: function (code, type) {
        var result;
        var H;
        if (type === 'php') {
            fs.writeFileSync(tmp_file, '<?php\n' + code + '\n?>');
            result = exec('php ' + tmp_file, {silent: true});
            fs.unlink(tmp_file);
        } else {
            try {
                result = {
                    code: 0,
                    output: eval(code.replace(/console\.log\((.+)\)/, '$1'))
                };
            } catch (E) {
                result = {
                    code: E.code,
                    output: E.message
                };
            }
        }
        return result;
    },

    result_class: function (options) {
        return (options.data.result.code > 0) ? 'error' : 'result';
    },

    escapeString: function (str, type) {
        return (type == 'lightncandy') ? ('"' + helpers.doubleQuote(str) + '"') : ("'" + helpers.singleQuote(str) + "'");
    },

    doubleQuote: function (str) {
        return (str && str.replace) ? str.replace(/\\/, '\\\\').replace(/"/, '\\\"').replace(/\n/g, '\\n') : str;
    },

    singleQuote: function (str) {
        return (str && str.replace) ? str.replace(/\\/, '\\\\').replace(/'/, '\\\'').replace(/\n/g, '\\n') : str;
    },

    render: function (options) {
        var type = options.hash.type || this.type;
        var template = options.hash.template || this.template;
        var D = options.hash.data || this.data;
        var opt = options.hash.option || this.option;
        var Data = helpers.code_for_data(D, type);
        var Option = helpers.code_for_option(opt, type);
        var data = handlebars.createFrame(options.data);

        data.template = template;
        data.codeData = Data[1];
        data.codeType = Data[0];
        data.codeRequire = helpers.code_for_require(type);
        data.codeSetData = helpers.code_for_set('data', type) + Data[1] + ';';
        data.codeSetTemplate = helpers.code_for_set('template', type) + helpers.escapeString(template, type) + ";";
        data.codeCompile = helpers.code_for_compile(type, Option);
        data.codeRender = helpers.code_for_render(type);

        data.code = [
            data.codeRequire,
            data.codeSetTemplate,
            data.codeCompile,
            data.codeSetData,
            data.codeRender
        ].join('\n');

        data.result = helpers.result_for_code(data.code, data.codeType);

        return options.fn(this, {data: data});
    },

    code: function (cx, options) {
        var btn = [];
        var id = 'code_' + shortid();
        var code = '';
        var result = '';
        var type = options.hash.type;
        var classes = options.hash.class ? [options.hash.class] : [];
        var className;

        code = code + helpers.remove_dupe_cr(cx);

        if (options.hash.collapse) {
            classes.push('collapse');
        }

        className = classes.length ? (' class="' + classes.join(' ') + '"') : '';

        if (options.hash.result !== undefined) {
            result = helpers.result_for_code(code, options.hash.type);

            if ((result.code === 0) && (result.output !== '')) {
                result = '<h4>Output</h4><pre class="result">' + result.output + '</pre>';
            } else {
                console.warn('Bad result when execute code:\n' + code);
                console.warn(result);
                result = '';
            }
        }

        if (options.hash.collapse) {
            btn.push('<button class="btn" data-toggle="collapse" data-target="#pre' + id + '">Show / Hide</button>');
        }

        if (options.hash.copy) {
            btn.push('<textarea class="copy" id="' + id + '">' + code + '</textarea><button class="btn btn-primary" data-clipboard-target="#' + id + '">Copy to clipboard</button>');
        }

        return '<pre id="pre' + id + '"' + className + '><code class="language-' + type + '">' + Prism.highlight(code, Prism.languages[type], type) + '</code></pre>'
               + (btn.length ? ('<div class="text-center">' + btn.join(' ') + '</div>') : '')
               + result;
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

    str_join: function () {
        var arg = Array.prototype.slice.call(arguments);
        var options = arg.pop();

        return arg.join(options.hash.sep || '');
    },

    join: function (cx, sep) {
        return (cx && cx.join) ? cx.join(sep) : '';
    },

    book_writer: function (data, options) {
        var refs = data.reduce(function (O, V) {
            O[V.pagename] = V;
            return O;
        }, {});

        data.forEach(function (D, I) {
            var T = D.pagename.match(/LC-(.+)/);
            if (T) {
                D.title = 'LightnCandy option: ' + T[1];
            }
        });

        data.forEach(function (D, I) {
            var Data = handlebars.createFrame(options.data);

            Data.refs = refs;

            if (I > 0) {
                Data.page_prev = data[I - 1];
            }
            if (data[I + 1] !== undefined) {
                Data.page_next = data[I + 1];
            }

            console.log('>> Writing the page:' + D.pagename);
            fs.writeFileSync(options.data.configs.out_dir + D.pagename + '.html', options.fn(D, {data: Data}));
        });
    },

    section_builder: function (cx, options) {
        if (!cx) {
            return '';
        }
        if (typeof cx !== 'object') {
            return '<p>' + cx + '</p>';
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
        case 'title':
        case 'description':
        case 'pagename':
        case "ref":
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
        var T = options.hash.section || options.data.section;

        if (this.file) {
            switch (this.file.match(/\.(.+)$/)[1]) {
            default:
                return 'js';
            }
        }

        if (T) {
            switch (T) {
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
