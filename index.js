// Consts
const PLUGIN_NAME = "gulp-iDOM";

var htmlparser = require("htmlparser2");
var through = require("through2");
var gutil = require("gulp-util");

var PluginError = gutil.PluginError;

var result = [];
var currentTag = null;
var exceptions = ["pre", "script"];
var duty = ["evaluate"];
var breakLine = /(\r\n|\n|\r)/gm;
var formatLevel = 1;

var options = { // todo move to external options
    template: {
        evaluate: /<%([\s\S]+?)%>/g,
        interpolate: /<%=([\s\S]+?)%>/g,
        escape: /<%-([\s\S]+?)%>/g
    },
    parameterName: "data"
};

var MAP = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
};

function escapeHTML(s) {
    return s.replace(/[&<>]/g, function (c) {
        return MAP[c];
    });
}

function flushParser() {
    result.length = 0;
    currentTag = null;
}

function insertTabs(number) {
    for (var i = 0, tabs = "\n"; i < number; i++) {
        tabs += "\t";
    }
    return tabs;
}

function warpInFunc(name, string) {
    return "function " + name + "(" + options.parameterName + "){" + string + "\n}";
}

function extractFileName(path) {
    var name = path.split("/");
    name = name[name.length - 1];

    return name.split(".")[0];
}

function decodeTemplates(string, openTag, closeTag) {
    var regex = new RegExp(openTag + '(.*?)' + closeTag, 'g');
    var prefix = true;
    var suffix = true;

    var result = string.replace(regex, function (match, p1, index, string) {
        if (index !== 0)
            p1 = "\'+" + p1;
        else
            prefix = false;

        if ((string.length - (index + match.length)) > 0)
            p1 += "+\'";
        else
            suffix = false;

        return p1;
    });

    return (prefix ? '\'' : '') + result + (suffix ? '\'' : '');
}

function encodeTemplates(string) {
    return string
        .replace(options.template.interpolate, function (match, p1) {
            return "{%" + p1 + "%}"; // todo move to constant
        })
        .replace(options.template.escape, function (match, p1) {
            return "{%" + escapeHTML(p1) + "%}";
        })
        .replace(options.template.evaluate, function (match, p1) {
            return "<evaluate>" + p1 + "</evaluate>";
        });
}

function writeLine(command, line, noEscape) {
    var attribs = "";

    if (line.length === 0) // don't write empty string or array
        return;

    if (typeof line === "string") {
        if (noEscape)
            attribs = line;
        else
            attribs = "'" + line.replace("'", "\\'") + "'";

    } else { // create formatted string from array
        for (var i = 0; i < line.length; i++) {
            if (i > 0) // add comma between parameters
                attribs += ", ";

            attribs += line[i];
        }
    }

    result.push(insertTabs(formatLevel) + command + "(" + attribs + ");");
}

function write(string, noEscape) {
    result.push(noEscape ? string: string.replace(/[\r\t\n]/g, " "));
}

var parser = new htmlparser.Parser({ // todo new?
    onopentag: function (name, attribs) {
        var args = ["'" + name + "'"];

        if (duty.indexOf(name) === -1) {
            for (var key in attribs) {
                if (attribs.hasOwnProperty(key)) {
                    if (args.length === 1) {
                        args.push(null);
                        args.push(null);
                    }

                    args.push("'" + key + "'");
                    args.push(decodeTemplates(attribs[key], '{%', '%}'));
                }
            }

            writeLine("elementOpen", args);
        } else {
            write(insertTabs(formatLevel), true);
        }

        currentTag = name;
        formatLevel++;
    },
    ontext: function (text) {
        if (duty.indexOf(currentTag) !== -1) {
            write(text);
        } else if (exceptions.indexOf(currentTag) === -1) {
            writeLine("text", decodeTemplates(text.replace(breakLine, "").trim(), '{%', '%}'), true);
        } else { // save format (break lines) for exception tags
            var lines = text.split(breakLine), line;
            for (var i = 0; i < lines.length; i++) {
                line = lines[i];

                if (breakLine.exec(line))
                    writeLine("text", "String.fromCharCode(10)", true); // todo change to constant
                else if (line.length > 0)
                    writeLine("text", decodeTemplates(line, '{%', '%}'), true);
            }
        }
    },
    onclosetag: function (tagname) {
        formatLevel--;
        if (duty.indexOf(tagname) === -1)
            writeLine("elementClose", tagname);
    }
}, {decodeEntities: true});

// Plugin level function(dealing with files)
function gulpCompiler() {

    // Creating a stream through which each file will pass
    return through.obj(function (file, enc, cb) {
        var buffer, content;

        if (file.isNull()) {
            // return empty file
            return cb(null, file);
        }
        if (file.isBuffer()) {
            //get file content as string
            buffer = new Buffer(file.contents);
            content = buffer.toString();

            // parse content
            parser.write(encodeTemplates(content));
            parser.end();

            // wrap parse result in function
            content = warpInFunc(extractFileName(file.path), result.join(""));
            file.contents = new Buffer(content, "utf-8");

            // clear parser
            flushParser();
        }
        if (file.isStream()) {
            throw new PluginError(PLUGIN_NAME, "Sorry, stream mode not supported");
        }

        cb(null, file);
    });
}

module.exports = gulpCompiler;