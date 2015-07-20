var htmlparser = require("htmlparser2");
var through = require("through2");
var gutil = require("gulp-util");
var PluginError = gutil.PluginError;

// Consts
const PLUGIN_NAME = "gulp-incremental";
const EXCEPTIONS = ["pre", "script"];
const DUTY = ["evaluate"];
const BREAK_LINE = /(\r\n|\n|\r)/gm;
const NEW_LINE = "String.fromCharCode(10)";

// variables
var _result = [];
var _currentTag = null;
var _formatLevel = 1;
var _options = {
    parameterName: "data",
    template: {
        evaluate: /<%([\s\S]+?)%>/g,
        interpolate: /<%=([\s\S]+?)%>/g,
        escape: /<%-([\s\S]+?)%>/g
    },
    escape: /[&<>]/g,
    MAP: {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    },
    helpers: {
        open: "{%",
        close: "%}"
    }
};

function escapeHTML(s) {
    return s.replace(_options.escape, function (c) {
        return _options.MAP[c];
    });
}

function flushParser() {
    _result.length = 0;
    _currentTag = null;
}

function insertTabs(number) {
    for (var i = 0, tabs = "\n"; i < number; i++) {
        tabs += "\t";
    }
    return tabs;
}

function warpInFunc(name, string) {
    return "function " + name + "(" + _options.parameterName + "){" + string + "\n}";
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
        .replace(_options.template.interpolate, function (match, p1) {
            return _options.helpers.open + p1 + _options.helpers.close;
        })
        .replace(_options.template.escape, function (match, p1) {
            return _options.helpers.open + escapeHTML(p1) + _options.helpers.close;
        })
        .replace(_options.template.evaluate, function (match, p1) {
            return "<evaluate>" + p1.trim() + "</evaluate>";
        });
}

function writeCommand(command, line, noEscape) {
    var attribs = "";

    if (line.length === 0) // don't write empty string or array
        return;

    if (typeof line === "string") {
        if (noEscape)
            attribs = line;
        else
            attribs = "'" + line.replace("'", "\\'") + "'"; // wrap attribute value

    } else { // create formatted string from array
        for (var i = 0; i < line.length; i++) {
            if (i > 0) // add comma between parameters
                attribs += ", ";

            attribs += line[i];
        }
    }

    // wrap in command
    _result.push(insertTabs(_formatLevel) + command + "(" + attribs + ");");
}

function writeLine(string, noEscape) {
    _result.push(noEscape ? string : string.replace(BREAK_LINE, " "));
}

var _handler = {
    onopentag: function (name, attribs) {
        var args = ["'" + name + "'"];

        if (DUTY.indexOf(name) === -1) {
            for (var key in attribs) {
                if (attribs.hasOwnProperty(key)) {
                    if (args.length === 1) {
                        args.push(null);
                        args.push(null);
                    }

                    args.push("'" + key + "'");
                    args.push(decodeTemplates(attribs[key], _options.helpers.open, _options.helpers.close));
                }
            }

            writeCommand("elementOpen", args);
        } else {
            writeLine(insertTabs(_formatLevel), true);
        }

        _currentTag = name;
        _formatLevel++;
    },
    ontext: function (text) {
        var line;
        if (DUTY.indexOf(_currentTag) !== -1) {
            writeLine(text);
        } else if (EXCEPTIONS.indexOf(_currentTag) === -1) {
            line = text.replace(BREAK_LINE, "").trim();
            if (line.length > 0)
                writeCommand("text", decodeTemplates(line, _options.helpers.open, _options.helpers.close), true);
        } else { // save format (break lines) for exception tags
            var lines = text.split(BREAK_LINE);
            for (var i = 0; i < lines.length; i++) {
                line = lines[i];

                if (BREAK_LINE.exec(line))
                    writeCommand("text", NEW_LINE, true);
                else
                    writeCommand("text", decodeTemplates(line, _options.helpers.open, _options.helpers.close), true);
            }
        }
    },
    onclosetag: function (tagname) {
        _formatLevel--;
        if (DUTY.indexOf(tagname) === -1)
            writeCommand("elementClose", tagname);
    }
};

// Plugin level function(dealing with files)
function gulpCompiler(newOptions) {

    // mix options
    for (var key in newOptions) {
        if (newOptions.hasOwnProperty(key))
            _options[key] = newOptions[key];
    }

    // Creating a stream through which each file will pass
    return through.obj(function (file, enc, cb) {
        var buffer, content, parser;

        if (file.isNull()) {
            // return empty file
            return cb(null, file);
        }
        if (file.isBuffer()) {
            parser = new htmlparser.Parser( _handler, {decodeEntities: true});

            //get file content as string
            buffer = new Buffer(file.contents);
            content = buffer.toString();

            // parse content
            parser.write(encodeTemplates(content));
            parser.end();

            // wrap parse result in function
            content = warpInFunc(extractFileName(file.path), _result.join(""));
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