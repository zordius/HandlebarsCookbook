require('object.assign').shim();

// configs
var configs = {
    out_dir: 'generated/',
    data_dir: 'bookdata/',
    partial_dir: 'partials/'
};

// required libs
var fs = require('fs');
var handlebars = require('handlebars');
var yaml = require('js-yaml');

// all book data
var data = fs.readdirSync(configs.data_dir).map(function (fn) {
    return Object.assign(yaml.load(fs.readFileSync(configs.data_dir + fn, 'utf8'), {filename: fn}), {pagename: fn.replace(/.yaml/, '')});
});

fs.readdirSync(configs.partial_dir).forEach(function (fn) {
    handlebars.registerPartial(fn, fs.readFileSync(configs.partial_dir + fn, 'utf8'));
});

if (!fs.existsSync(configs.out_dir)) {
    fs.mkdirSync(configs.out_dir);
}

handlebars.compile('{{#book_writer .}}{{> template}}{{/book_writer}}')(Object.assign(data, {configs: configs}), {
    helpers: require('./helpers'),
});

console.log('done!');
