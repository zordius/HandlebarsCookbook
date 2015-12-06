// configs
var out_dir = 'generated/';
var in_dir = 'templates/';
var partial_dir = 'partials/';

// required libs
var fs = require('fs');
var handlebars = require('handlebars');

var partials = fs.readdirSync(partial_dir).reduce(function (O, fn) {
    O[fn] = fs.readFileSync(partial_dir + fn, 'utf8');
    return O;
}, {});

