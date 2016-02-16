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

var console_log = function (O) {
    return O;
};

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

    phptojs: function (code) {
        return code.replace(/\$/g, '').replace(/ \. /g, ' + ').replace(/LightnCandy\\SafeString/, 'Handlebars.SafeString');
    },

    code_for_helper: function (helper, type) {
        if (!helper) {
            return '';
        }

        switch (type) {
        case 'lightncandy':
            return 'array(\n' + Object.keys(helper).map(function (K) {
                return Number.isInteger(parseInt(K)) ? ("'" + helper[K] + "'") : ('  ' + helpers.escapeString(K, type) + ' => ' + helper[K]);
            }).join(',') + ')';
        default:
            return '{\n' + Object.keys(helper).map(function (K) {
                return '  ' + helpers.escapeString(K, type) + ': ' + helpers.phptojs(helper[K]);
            }).join(',') + '}';
        }
    },

    code_for_excode: function (excode, type) {
        return excode || '';
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

    code_for_partial: function (partial, type) {
        var par = (partial && partial[type]) ? partial[type] : partial;

        if (!par) {
            return '';
        }

        switch (type) {
        case 'lightncandy':
            par = Object.keys(par).map(function (K) {
                return helpers.escapeString(K, type) + ' => ' + helpers.escapeString(par[K], type);
            });
            return par.length ? 'array(\n    ' + par.join(',\n') + '\n  )' : '';
        case 'handlebars.js':
        case 'mustache':
            return JSON.stringify(par, undefined, defaultSP);
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

    code_for_compile: function (type, opt, par, hlp, norender) {
        var EX = [];
        switch (type) {
        case 'lightncandy':
            if (opt) {
                EX.push('"flags" => ' + opt);
            }
            if (par) {
                EX.push('"partials" => ' + par);
            }
            if (hlp) {
                EX.push('"helpers" => ' + hlp);
            }
            EX = EX.length ? (', array(\n  ' + EX.join(',\n') + '\n)') : '';
            return '$php = LightnCandy::compile($template' + EX + ');' + (norender ? '': '\n$render = LightnCandy::prepare($php);');
        case 'handlebars.js':
            if (hlp) {
                EX.push('Handlebars.registerHelper(' + hlp + ');\n');
            }
            return EX.join('') + (norender ? '' : 'var render = ') + 'Handlebars.compile(template);';
        case 'mustache':
            return '';
        }
        console.warn('unknown code type in code_for_compile():' + type);
        return '';
    },

    hbonly: function (options) {
        return this.hbonly ? ['lightncandy', 'handlebars.js'] : options.data.samples;
    },

    code_for_render: function (type, opt, par) {
        var EX = [];
        switch (type) {
        case 'lightncandy':
            return 'echo $render($data);';
        case 'handlebars.js':
            if (par) {
                EX.push(' partials: ' + par);
            }
            EX = EX.length ? (', {\n' + EX.join(',\n') + '}') : '';
            return 'console.log(render(data' + EX + '));';
        case 'mustache':
            return 'console.log(Mustache.render(template, data' + (par ? (', ' + par) : '') + '));';
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
                return spp + helpers.escapeString(K, 'lightncandy') + ' => ' + helpers.php_array(V, spp);
            }).join(',\n') + '\n' + sp + ')';
        }

        if (typeof D === 'string') {
            return helpers.escapeString(D, 'lightncandy');
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

    result_for_code: function (code, type, fail, log) {
        var result;
        var H;
        if (type === 'php') {
            if (process.env.NODE_DEV !== 'development') {
                code = 'error_reporting(E_ERROR | E_PARSE);\n' + code;
                code = 'if (function_exists("xdebug_disable")) {xdebug_disable();}\n' + code;
            }
            fs.writeFileSync(tmp_file, '<?php ' + code + '\n?>');
            result = exec('php ' + tmp_file + (log ? '' : ' 2>/dev/null'), {silent: true});
            if (log) {
                result.code = 99999;
            }
            fs.unlinkSync(tmp_file);
        } else {
            try {
                result = {
                    code: 0,
                    output: eval(code.replace(/console\.log/g, 'console_log').replace(/require\('handlebars'\);/, 'require(\'handlebars\').create();'))
                };
            } catch (E) {
                result = {
                    code: 1,
                    output: E.message
                };
            }
        }
        if (result.code && (fail === undefined)) {
            console.warn('## Bad result when execute code:\n' + code + '\n');
            console.warn(result);
        }
        return result;
    },

    result_class: function (options) {
        if (options.data.result.code > 0) {
            return 'error';
        }

        if (options.data.standard && (options.data.result.output !== options.data.standard.result.output)) {
            if (!options.hash.different) {
                console.warn('!!Render result is not same with standard.\n!Standard:\n' + options.data.standard.result.output + '\n!Result:\n' + options.data.result.output + '\n');
            }
            return 'different';
        }

        return 'result';
    },

    escapeString: function (str, type) {
        return (type == 'lightncandy') ? ('"' + helpers.doubleQuote(str) + '"') : ("'" + helpers.singleQuote(str) + "'");
    },

    doubleQuote: function (str) {
        return (str && str.replace) ? str.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n') : str;
    },

    singleQuote: function (str) {
        return (str && str.replace) ? str.replace(/\\/g, '\\\\').replace(/'/g, '\\\'').replace(/\n/g, '\\n') : str;
    },

    data_for_render: function (cx, options) {
        var type = options.hash.type || cx.type || 'handlebars.js';
        var input = options.hash.data || cx.data;
        var opt = options.hash.option || cx.option;
        var par = options.hash.partial || cx.partial;
        var showcode = options.hash.showcode || cx.showcode;
        var norender = options.hash.compileerror || cx.compileerror || showcode;
        var data = helpers.code_for_data(input, type);
        var Option = helpers.code_for_option(opt, type);
        var Helper = helpers.code_for_helper(options.hash.helper || cx.helper, type);
        var Partial = helpers.code_for_partial(par, type);
        var fail = options.fail || cx.fail || norender;
        var errlog = options.errorlog || cx.errorlog;

        var ret = {
            type: type,
            template: options.hash.template || cx.template,
            codeData: data[1],
            codeType: data[0],
            codeRequire: helpers.code_for_require(type),
            codeSetData: helpers.code_for_set('data', type) + data[1] + ';',
            codeExtra: helpers.code_for_excode(options.hash.excode || cx.excode, type),
            codeCompile: helpers.code_for_compile(type, Option, Partial, Helper, norender),
            codeRender: helpers.code_for_render(type, Option, Partial),
            codePartial: Partial
        };

        ret.codeSetTemplate = helpers.code_for_set('template', type) + helpers.escapeString(ret.template, type) + ";",

        ret.code = [
            ret.codeRequire,
            ret.codeSetTemplate,
            ret.codeExtra,
            ret.codeCompile,
            norender ? '' : ret.codeSetData,
            norender ? '' : ret.codeRender,
            showcode ? 'echo $php' : ''
        ].join('\n');

        if (typeof fail === 'object') {
            fail = fail[type];
        }

        ret.result = helpers.result_for_code(ret.code, ret.codeType, fail, errlog);

        return ret;
    },

    render: function (options) {
        var data = handlebars.createFrame(options.data);

        if (data.standard && data.standard.type === (this.type || options.hash.type)) {
            Object.assign(data, data.standard);
        } else {
            Object.assign(data, helpers.data_for_render(this, options));
        }

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

        if (typeof cx === 'function') {
            cx = cx.apply(this, [options]);
        }

        code = code + helpers.remove_dupe_cr(cx);

        if (options.hash.collapse) {
            classes.push('collapse');
        }

        className = classes.length ? (' class="' + classes.join(' ') + '"') : '';

        if (options.hash.result !== undefined) {
            result = helpers.result_for_code(code, options.hash.type);

            if ((result.code === 0) && (result.output !== '')) {
                result = options.fn(result.output);
            } else {
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
                D.opt_name = T[1];
            }
            if (D.hbonly) {
                D.title = 'Handlebars: ' + D.title;
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
                return '<div class="col-md-' + ((sections.length < 5) ? 12/sections.length : '3') + '">' + S + '</div>';
            }).join('') + '</div>';
        }
        return sections.join('');
    },

    main_section: function (options) {
        switch (options.data.section) {
        case 'title':
        case 'description':
        case 'pagename':
        case 'ref':
        case 'opt_name':
            return '';
        default:
            return options.fn(this);
        }
    },

    eq: function (a, b) {
        return (a === b);
    },

    or: function () {
        var arg = Array.prototype.slice.call(arguments, 0, -1);

        for (var I in arg) {
            if (arg[I]) {
                return arg[I];
            }
        }
    },

    match: function (regexp, string) {
        return (new RegExp(regexp)).test(string);
    },

    set: function (name, value, options) {
        var data = handlebars.createFrame(options.data);

        data[name] = value;

        return options.fn(this, {data: data});
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
