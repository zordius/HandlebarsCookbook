// configs
var out_dir = 'generated/';
var in_dir = 'templates/';
var data_dir = 'bookdata/';
var partial_dir = 'partials/';

// required libs
var fs = require('fs');
var handlebars = require('handlebars');

fs.readdirSync(partial_dir).forEach(function (fn) {
    handlebars.registerPartial(fn, fs.readFileSync(partial_dir + fn, 'utf8'));
});

if (!fs.existsSync(out_dir)) {
    fs.mkdirSync(out_dir);
}

fs.readdirSync(in_dir).forEach(function (fn) {
    fs.writeFileSync(out_dir + fn, handlebars.compile(fs.readFileSync(in_dir + fn, 'utf8'))({
        filename: fn
    }));
});

console.log('done!');
