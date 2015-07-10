'use strict';

var Transform = require("stream").Transform;
var util = require("util");
var split = require('split');
var _ = require("underscore");

util.inherits(CmsParserStream, Transform); // inherit Transform

function CmsParserStream() {
    Transform.call(this, {
        "objectMode": true
    }); // invoke Transform's constructor, expected result is object
    this.rows = [];
    this.stack = [];
    this.stateStack = [NONE];
    this.rowCount = 1;
    this.emptyRows = 0;
    this.error = null;
    this.serial = 1;
}

/**
 * @Function _transform
 * Define standart Transform Stream's function _transform
 * @param (String) line - input line
 * @param (String) encoding - encoding (not used now)
 * @param cb - callback to notify that we are done with a row
 */
CmsParserStream.prototype._transform = function(line, encoding, cb) {

    if (line) {
        line = line.trim();
    }

    //Ignore the rest of input in case of error
    if (!this.error) {
        //Don't propagate empty rows, just count
        if ('' === line) {
            ++this.emptyRows;
        } else {
            //console.log(this.stateStack);
			//Get the state from the top of the stack
            var m = matchers[_.last(this.stateStack)];
            var i;
            var len = m.length;
			//Iterate over possible matches and execute proc if found
            for (i = 0; i < len; i++) {
                var matcher = m[i];
                var match = matcher.pattern.exec(line);
                if (match) {
                    matcher.proc(this, match);
                    break;
                }
            }
            if (!match) { // Found something strange, can't digest
                this.error = {
                    error: 'parser error',
                    rowNum: this.rowCount,
                    row: line,
                    partialResult: this.stack[0],
                    stateStack: this.stateStack
                };
            }
            this.emptyRows = 0;
        }
        ++this.rowCount;
    }
    cb();
};

/**
 * @Function _flush
 * Define standart Transform Stream's function _flush
 * Normally in should push parsed result (or error) to a pipe
 * @param cb - callback to notify that we are done
 */
CmsParserStream.prototype._flush = function(cb) {
    if (this.error) {
        this.push(this.error);
    } else {
        this.push(this.stack[0]); // EOF, push result to output
    }
    cb(); // Notify done
};

/**
 * @Function push2top
 * Utility function to support parsing
 * @param (String) name - name of property to be attached to an object on top of stack and moved to top of stack
 * @param (Integer) newState - put a new state on a top of state stack
 * @param (Object) extend - optional value(s) for object to be attached
 */
CmsParserStream.prototype.push2top = function(name, newState, extend) {
    var top = _.last(this.stack);
    var meta = top[name] = (extend) ? _.extend({}, extend) : {};
    this.stack.push(meta);
    this.stateStack.push(newState);
};

/**
 * @Function push2top
 * Utility function to support parsing
 * @param (Integer) newState - value on top of state stack will be replaced to it
 */
CmsParserStream.prototype.move2state = function(newState) {
    this.stateStack.pop();
    this.stateStack.push(newState);
};


//TODO : remove
function streamToIntObj(istream, done, error) {
    var ps = new CmsParserStream();
    istream /*.pipe(split())*/ .pipe(ps).on('finish', function() {
        done(ps.rows);
    }).on('error', function(e) {
        if (error) error(e);
    });
}


/** "Constants" */
var serial = 0;
var NONE = serial++;
var SECTION_START = serial++;
var META_HEADER = serial++;
var META_BODY = serial++;
var SECTION_HEADER = serial++;
var SECTION_BODY = serial++;
var SECTION_BODY_ARRAY = serial++;

/* Parse logic */
function sectionBody(cps, match, dataFieldName, body, bodyArray) {
    var top = _.last(cps.stack);
    if (cps.emptyRows >= 2) {
        if (cps.stateStack[cps.stateStack.length - 1] == (body || SECTION_BODY)) {
            var empty = {};
            if (cps.stateStack[cps.stateStack.length - 2] == (bodyArray || SECTION_BODY_ARRAY)) {
                cps.stack.pop();
                cps.stateStack.pop();
                top = cps.stack[cps.stack.length - 1];

                top.push(empty);
                cps.stack.push(empty);
                cps.stateStack.push((body || SECTION_BODY));

            } else {
                var tmp = [empty];
                top[(dataFieldName || "data")] = tmp;
                cps.stack.push(tmp);
                cps.stateStack.push((bodyArray || SECTION_BODY_ARRAY));
                cps.stack.push(empty);
                cps.stateStack.push((body || SECTION_BODY));
            }
            top = empty;
        }
        cps.serial = 1;
    }

    var field = match[1].toLowerCase();
    var orig = field;
    if (top.hasOwnProperty(orig) || (cps.serial != 1)) {
        field = orig + ' ' + (cps.serial);
        while (top.hasOwnProperty(field)) {
            field = orig + ' ' + (++cps.serial);
        }
    }
    top[field] = match[2];

};

/*
 Array matchers contains arrays of objects in a format
  { 
  	pattern: <regexp>,
	proc: functon( cps, match)
  }
  patern used for matching input string
  proc is a function which will be called in match detected
  Array matchers indexed by state - NONE, SECTION_START, etc...
*/
var matchers = [];

matchers[NONE] = [{
    pattern: /^-+$/,
    proc: function(cps, match) {
        cps.stack.push({}); // initialize with empty object
        cps.move2state(SECTION_START);
    }
}];

matchers[SECTION_START] = [{
    pattern: /^MYMEDICARE.GOV PERSONAL HEALTH INFORMATION$/,
    proc: function(cps, match) {
        // Meta. Shift state
        cps.push2top("meta", META_HEADER);
    }
}, {
    pattern: /^Claim Summary$/,
    proc: function(cps, match) {
        cps.push2top(match[0].toLowerCase(), SECTION_HEADER);
    }
}, {
    pattern: /^Claim Lines for Claim Number:\s*(.*)$/,
    proc: function(cps, match) {
        cps.push2top(match[0].toLowerCase(), SECTION_HEADER, {
            "claim number": match[1]
        });
    }
}, {
    pattern: /^([^-]+)$/,
    proc: function(cps, match) {
        cps.push2top(match[1].toLowerCase(), SECTION_HEADER);
    }
}, {
    pattern: /^(-+)$/,
    proc: function(cps, match) {
        cps.push2top("empty", SECTION_HEADER);
        cps.move2state(SECTION_BODY);
    }
}];

matchers[META_HEADER] = [{
    pattern: /^-+$/,
    proc: function(cps, match) {
        cps.move2state(META_BODY);
    }
}];

matchers[META_BODY] = [{
    pattern: /^\*{10}CONFIDENTIAL\*{11}$/,
    proc: function(cps, match) {}
}, {
    pattern: /^[^\(]+\(([^\)]+)\).*$/,
    proc: function(cps, match) {
        var top = _.last(cps.stack);
        top["type"] = "cms";
        top["version"] = match[1];
    }
}, {
    pattern: /^(\d{1,2}\/\d{1,2}\/\d{2,4} \d{1,2}:\d{1,2} (?:AM|PM))$/,
    proc: function(cps, match) {
        var top = _.last(cps.stack);
        top["timestamp"] = match[1];
    }
}, {
    pattern: /^-+$/,
    proc: function(cps, match) {
        cps.stack.pop();
        cps.stateStack.pop();
        cps.move2state(SECTION_START); // Section started immediately
    }
}];

matchers[SECTION_HEADER] = [{
    pattern: /^-+$/,
    proc: function(cps, match) {
        if (cps.emptyRows == 3) {
            cps.move2state(SECTION_HEADER); // Strange case, reset to header
        } else {
            cps.move2state(SECTION_BODY);
        }
    }
}];

matchers[SECTION_BODY] = [{
        pattern: /^([^:]+):\s*(.*)$/,
        proc: sectionBody
    }, {
        pattern: /^-+$/,
        proc: function(cps, match) {
            cps.stack.pop();
            cps.stateStack.pop();

            if (_.last(cps.stateStack) == SECTION_BODY_ARRAY) {
                cps.stack.pop();
                cps.stateStack.pop();

                cps.stack.pop();
                cps.stateStack.pop();
            }
            cps.move2state(SECTION_START);
        }
    }

];

module.exports.streamToIntObj = streamToIntObj;
module.exports.CmsFile2Object = CmsParserStream;