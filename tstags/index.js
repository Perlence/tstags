/// <reference path="typings/tsd.d.ts" />
var fs = require('fs');
var path = require('path');
var docopt = require('docopt');
var glob = require('glob');
var _ = require('lodash');
var ts = require('typescript');
var pkg = require('../package.json');
var USAGE = "" + pkg.name + " v" + pkg.version + "\n\nUsage: tstags [options] [FILE]...\n\nOptions:\n  -h, --help          show this help message and exit\n  -v, --version       show version and exit\n  -f, --file [-]      write output to specified file. If file is \"-\", output is written to standard out\n  -R, --recursive     recurse into directories in the file list [default: false]\n  --fields <fields>   include selected extension fields\n  --list-kinds        list supported languages\n  --sort              sort tags [default: false]\n  --target <version>  targeting language version [default: ES6]\n  --tag-relative      file paths should be relative to the directory containing the tag file [default: false]\n";
var fields = {};
fields[124 /* Property */] = ['p', 'property'];
fields[125 /* Method */] = ['m', 'method'];
fields[126 /* Constructor */] = ['m', 'method'];
fields[127 /* GetAccessor */] = ['m', 'method'];
fields[128 /* SetAccessor */] = ['m', 'method'];
fields[183 /* VariableDeclaration */] = ['v', 'variable'];
fields[184 /* FunctionDeclaration */] = ['f', 'function'];
fields[185 /* ClassDeclaration */] = ['C', 'class'];
fields[186 /* InterfaceDeclaration */] = ['i', 'interface'];
fields[187 /* TypeAliasDeclaration */] = ['t', 'typealias'];
fields[188 /* EnumDeclaration */] = ['e', 'enum'];
fields[189 /* ModuleDeclaration */] = ['M', 'module'];
fields[191 /* ImportDeclaration */] = ['I', 'import'];
var kinds = _.uniq(_.map(_.values(fields), function (value) { return value.join('  '); }));
kinds.push('c  const');
var scriptTargets = {
    ES3: 0 /* ES3 */,
    ES5: 1 /* ES5 */,
    ES6: 2 /* ES6 */,
    Latest: 2 /* Latest */
};
var Tags = (function () {
    function Tags(options) {
        options = options || {};
        this.sort = options.sort || false;
        this.entries = [];
    }
    Tags.prototype.headers = function () {
        var sorted = this.sort ? '1' : '0';
        return [
            { header: '_TAG_FILE_FORMAT', value: '2', help: 'extended format; --format=1 will not append ;" to lines' },
            { header: '_TAG_FILE_SORTED', value: sorted, help: '0=unsorted, 1=sorted, 2=foldcase' },
            { header: '_TAG_PROGRAM_AUTHOR', value: 'Sviatoslav Abakumov', help: 'dust.harvesting@gmail.com' },
            { header: '_TAG_PROGRAM_NAME', value: 'tstags' },
            { header: '_TAG_PROGRAM_URL', value: 'https://github.com/Perlence/tstags' },
            { header: '_TAG_PROGRAM_VERSION', value: '0.1' },
        ];
    };
    Tags.prototype.toString = function () {
        return this.writeHeaders().concat(this.writeEntries()).join('\n');
    };
    Tags.prototype.writeHeaders = function () {
        return this.headers().map(function (header) { return ("!" + header.header + "\t" + header.value + "\t" + (header.help || '')); });
    };
    Tags.prototype.writeEntries = function () {
        var sorted = this.entries;
        if (this.sort)
            sorted = _.sortBy(this.entries, 'name');
        return sorted.map(function (entry) { return ("" + entry.name + "\t" + entry.file + "\t" + entry.address + ";\"\t" + entry.field + "\tline:" + entry.line); });
    };
    return Tags;
})();
function main() {
    var args = docopt.docopt(USAGE, { version: pkg.version });
    if (args['--version']) {
        console.log(pkg.version);
        process.exit(0);
    }
    if (args['--list-kinds']) {
        console.log(kinds.join('\n'));
        process.exit(0);
    }
    // List of files must be given.
    if (!args['FILE'].length) {
        console.log(USAGE);
        process.exit(1);
    }
    var names = args['FILE'];
    var filenames;
    if (args['--recursive']) {
        // Get all *.ts files recursively in given directories.
        filenames = _(names).map(function (dir) { return glob.sync(path.join(dir, '**', '*.ts')); }).flatten().value();
    }
    else {
        filenames = names;
    }
    var languageVersion = scriptTargets[args['--target']];
    if (languageVersion == null) {
        console.error('Unsupported language version: ' + args['--target']);
        process.exit(1);
    }
    var tags = new Tags({ sort: args['--sort'] });
    filenames.forEach(function (filename) {
        var text = fs.readFileSync(filename);
        var source = ts.createSourceFile(filename, text.toString(), languageVersion, '0');
        makeTags(tags, source, {
            languageVersion: languageVersion,
            fields: args['--fields'],
            tagRelative: args['--tag-relative']
        });
    });
    if (!tags.entries.length)
        process.exit(0);
    if (args['--file'] === '-') {
        console.log(tags.toString());
    }
    else {
        var filename = args['--file'] || 'tags';
        fs.writeFileSync(filename, tags.toString());
    }
}
exports.main = main;
function makeTags(tags, source, options) {
    // options = options || {}
    var scanner = ts.createScanner(options.languageVersion, true, source.text);
    var lines = splitLines(source.text);
    makeTag(source, undefined);
    function makeTag(node, parent) {
        var entry = {};
        var newParent = parent;
        switch (node.kind) {
            case 126 /* Constructor */:
                entry.name = 'constructor';
                break;
            case 189 /* ModuleDeclaration */:
            case 185 /* ClassDeclaration */:
            case 186 /* InterfaceDeclaration */:
                newParent = node;
                break;
            case 183 /* VariableDeclaration */:
                if (node.type != null && node.type.kind == 136 /* TypeLiteral */)
                    newParent = node;
                if (node.flags & 4096 /* Const */)
                    entry.field = 'c';
                break;
        }
        var field = fields[node.kind];
        if (field != null && (options.fields == null || options.fields.indexOf(field[0]) >= 0)) {
            entry.field = entry.field || field[0];
            entry.name = entry.name || node.name.text;
            // Prepend module name to all first-level declarations and
            // prepend class/interface name only to methods and
            // properties.
            if (parent != null && (parent.kind == 189 /* ModuleDeclaration */ || node.kind != 183 /* VariableDeclaration */))
                entry.name = parent.name.text + '#' + entry.name;
            entry.file = (options.tagRelative == true ? source.filename : path.resolve(source.filename));
            var firstLine = extractLine(source.text, node.pos, node.end);
            entry.address = "/^" + firstLine.text + "$/";
            entry.line = firstLine.line;
            tags.entries.push(entry);
        }
        ts.forEachChild(node, function (node) { return makeTag(node, newParent); });
    }
    function extractLine(text, pos, end) {
        scanner.setTextPos(pos);
        scanner.scan();
        var tokenPos = scanner.getTokenPos();
        var line = ts.positionToLineAndCharacter(text, tokenPos).line;
        return {
            line: line,
            text: escapeStringRegexp(lines[line - 1])
        };
    }
}
var matchOperatorsRe = /[\/^$]/g;
function escapeStringRegexp(str) {
    return str.replace(matchOperatorsRe, '\\$&');
}
var endingsRe = /(?:\r\n|\r|\n)/;
function splitLines(str) {
    return str.split(endingsRe);
}
if (require.main === module)
    main();
