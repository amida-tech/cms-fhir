/// <reference path="../typings/node/node.d.ts"/>
/// <reference path="../typings/mocha/mocha.d.ts"/>
"use strict";

var expect = require('chai').expect;
var fs = require('fs');
var split = require('split');

var bbcms = require("../index");
var bbm = require('blue-button-model');

describe('parser.js', function() {
    it('CMS parser test', function(done) {
        var istream = fs.createReadStream(__dirname + '/fixtures/sample.txt', 'ascii');

        expect(istream).to.exist;

        //convert string into JSON
        //var result = bbcms.parseText(txtfile);
        /*var result = bbcms.test(istream.pipe(split()), function(result) {
            expect(result).to.exist;
            console.log(result[0]);
            done();
        }, function(e) { 
            console.log(e);
            done(e);
        } );*/

        istream.pipe(split()).pipe(new bbcms.CmsFile2Object())
            .on('data', function(data) {
                console.log(JSON.stringify(data, null, '    '));
            })
            .on('finish', function() {
                done();
            })
            .on('error', function(error) {
                done(error);
            });

        /*var valid = bbm.validator.validateDocumentModel(result);

        if (!valid) {
            console.log("Errors: \n", JSON.stringify(bbm.validator.getLastError(), null, 4));
        }

        expect(valid).to.be.true;
        */

    });

    it('CMS parser/converter test', function(done) {
        var istream = fs.createReadStream(__dirname + '/fixtures/sample.txt', 'ascii');

        expect(istream).to.exist;

        //convert string into JSON
        //var result = bbcms.parseText(txtfile);
        /*var result = bbcms.test(istream.pipe(split()), function(result) {
            expect(result).to.exist;
            console.log(result[0]);
            done();
        }, function(e) { 
            console.log(e);
            done(e);
        } );*/

        istream.pipe(split())
        .pipe(new bbcms.CmsFile2Object())
        .pipe(new bbcms.IntObjToFhirStream())
            .on('data', function(data) {
                console.log(JSON.stringify(data, null, '    '));
            })
            .on('finish', function() {
                done();
            })
            .on('error', function(error) {
                done(error);
            });

        /*var valid = bbm.validator.validateDocumentModel(result);

        if (!valid) {
            console.log("Errors: \n", JSON.stringify(bbm.validator.getLastError(), null, 4));
        }

        expect(valid).to.be.true;
        */

    });

    /*    it('Extra line breaks before sections', function (done) {
            var txtfile = fs.readFileSync(__dirname + '/fixtures/sample-extra.txt', 'utf-8');

            expect(txtfile).to.exist;

            //convert string into JSON
            var result = bbcms.parseText(txtfile);
            expect(result).to.exist;

            var valid = bbm.validator.validateDocumentModel(result);

            if (!valid) {
                console.log("Errors: \n", JSON.stringify(bbm.validator.getLastError(), null, 4));
            }

            expect(valid).to.be.true;

            done();
        });
    */
});