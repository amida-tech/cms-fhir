/// <reference path="../typings/node/node.d.ts"/>
/// <reference path="../typings/mocha/mocha.d.ts"/>
"use strict";

var expect = require('chai').expect;
var fs = require('fs');
var split = require('split');

var bbcms = require("../index");

describe('CMS parser/converter test', function () {
    it('sample.txt input file', function (done) {
        var istream = fs.createReadStream(__dirname + '/fixtures/sample.txt', 'ascii');

        expect(istream).to.exist;

        istream.pipe(split()).pipe(new bbcms.CmsFile2Object())
            .on('data', function (data) {
                //console.log(JSON.stringify(data, null, '    '));
            })
            .on('finish', function () {
                done();
            })
            .on('error', function (error) {
                done(error);
            });

    });


    it('CMS parser/converter test', function (done) {
        var istream = fs.createReadStream(__dirname + '/fixtures/sample.txt', 'ascii');

        expect(istream).to.exist;

        istream.pipe(split())
            .pipe(new bbcms.CmsFile2Object())
            .pipe(new bbcms.IntObjToFhirStream("http://localhost:8080/fhir"))
            .on('data', function (data) {
                if( (data instanceof Error)) {
                    done( new Error('Error expected'));
                }
                fs.writeFile(__dirname + '/fixtures/sample.json',JSON.stringify(data, null, '    '));
                //console.log(JSON.stringify(data, null, '    '));
            })
            .on('finish', function () {
                done();
            })
            .on('error', function (error) {
                //done(error);
            });

    });
    
    it('buggy input', function (done) {
        var istream = fs.createReadStream(__dirname + '/test-parser-cms.js', 'ascii');

        expect(istream).to.exist;

        istream.pipe(split())
            .pipe(new bbcms.CmsFile2Object())
            .pipe(new bbcms.IntObjToFhirStream())
            .on('data', function (data) {
                    if( !(data instanceof Error)) {
                    done( new Error('Error expected'));
                }
            })
            .on('finish', function () {
                done();
            })
            .on('error', function (error) {
                done(error);
            });

    });

});
