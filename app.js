/// <reference path="./typings/node/node.d.ts"/>
/// <reference path="./typings/mocha/mocha.d.ts"/>
"use strict";

// Startup file for debugging
var fs = require('fs');
var split = require('split');
var http = require('http');
var _ = require('lodash');

var bbcms = require("./index");
//var bbm = require('blue-button-model');

var istream = fs.createReadStream(__dirname + '/test/fixtures/sample.txt', 'utf-8');

istream.pipe(split())
    .pipe(new bbcms.CmsFile2Object())
    .pipe(new bbcms.IntObjToFhirStream("test", "http://localhost:8080/fhir"))
    .on('data', function (data) {
        var bundle = JSON.stringify(data, null, '  ');
        console.log(bundle);
        var req = http.request({
                hostname: 'localhost',
                port: 8080,
                path: '/fhir/baseDstu2',
                method: 'POST',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json',
                    'Content-Length': bundle.length
                }
            },
            function (res) {
                var response = '';
                console.log('STATUS: ' + res.statusCode);
                console.log('HEADERS: ' + JSON.stringify(res.headers));
                res.setEncoding('utf8');
                res.on('data', function (chunk) {
                    console.log('BODY: ' + chunk);
                    response = response + chunk;
                });
                res.on('end', function () {
                    console.log('No more data in response.');
                    var zipped = _.zip( data.entry, JSON.parse(response).entry);
                    console.log(zipped);
                    
                    zipped.forEach(function(element) {
                        var req = http.request({
                hostname: 'localhost',
                port: 8080,
                path: '/fhir/baseDstu2/' + element[1].response.location,
                method: 'GET',
                        }, function(res) {
                            res.setEncoding('utf8');
                res.on('data', function (chunk) {
                    //console.log('BODY2: ' + chunk);
                    var resource = JSON.parse(chunk);
                    var comparator = function(l,r, propn) {
                        if(_.isNumber(l)) return;
                        if(_.isString(l)) return;
                        if(_.isBoolean(l)) return;
                        if(_.isArray(l) && _.isArray(r)) {
                            if( l.length !== r.length) {
                                console.log('!-------- Array length differ %s', propn);
                            }
                            for(var i = 0; i< l.lenght && i<r.length; i++) {
                                comparator( l[i], r[i], propn);
                            }
                        }
                        
                        for(var prop in l) {
                            if( l.hasOwnProperty(prop)) {
                                if(!r.hasOwnProperty(prop)) {
                                    console.log('!-------- Missed prop ' + prop);
                                } else {
                                    comparator(l[prop],r[prop], prop);
                                }
                            }
                        }
                    };
                    console.log( 'compare:\n %j \n %j', element[0].resource, resource);
                    comparator( element[0].resource, resource);
                });
                        } );
                        req.end();       
                    });
                    //process.exit();
                })
            });
        req.write(bundle);
        req.end();
    })
    .on('finish', function () {

    })
    .on('error', function (error) {
        //process.exit();
    });
