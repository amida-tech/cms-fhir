/// <reference path="./typings/node/node.d.ts"/>
/// <reference path="./typings/mocha/mocha.d.ts"/>
"use strict";

var expect = require('chai').expect;
var fs = require('fs');
var split = require('split');

var bbcms = require("./index");
var bbm = require('blue-button-model');

var istream = fs.createReadStream(__dirname + '/test/fixtures/sample.txt', 'utf-8');

         istream.pipe(split()).pipe( new bbcms.CmsFile2Object() )
         .on('data', function (data) {
             console.log(JSON.stringify(data, null, '    '));
         })
         .on('finish', function () { process.exit();})
         .on('error', function (error) { process.exit();});
