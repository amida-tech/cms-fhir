# cms-fhir
Blue Button CMS to FHIR Parser

Generate FHIR JSON data from CMS files. 

[![NPM](https://nodei.co/npm/cms-fhir.png)](https://nodei.co/npm/cms-fhir/)

[![Build Status](https://travis-ci.org/amida-tech/cms-fhir.svg)](https://travis-ci.org/amida-tech/cms-fhir) [![Coverage Status](https://coveralls.io/repos/amida-tech/cms-fhir/badge.svg?branch=master&service=github)](https://coveralls.io/github/amida-tech/cms-fhir?branch=master) [![Dependency Status](https://david-dm.org/amida-tech/cms-fhir.svg)](https://david-dm.org/amida-tech/cms-fhir)

This library provides the following functionality
- Parse CMS document
- Generate set of resources conformant to [FHIR DSTU2](http://www.hl7.org/fhir/index.html) 

Usage example:

``` javascript
var split = require('split');
var bbcms = require("cms-fhir");

//open input stream
var istream = fs.createReadStream(__dirname + '/fixtures/sample.txt', 'ascii');

//convert the stream into FHIR model
        istream.pipe(split()) // split into the rows
            .pipe(new bbcms.CmsFile2Object()) // convert into intermediate object format
            // convetr to a fhir bundle, remove a parameter if you don't want a transaction bundle
            .pipe(new bbcms.IntObjToFhirStream("http://localhost:8080/fhir/base")) 
            .on('data', function (data) {
                console.log(JSON.stringify(data, null, '    '));
            })
            .on('finish', function () {
                done();
            })
            .on('error', function (error) {
                done(error);
            });
```
getting:

``` javascript
{
  "resourceType": "Bundle",
  "type": "transaction",
  "id": "0",
  "meta": {
    "lastUpdated": "2015-07-17T20:26:52.499Z"
  },
  "entry": [
    {
      "resource": {
        "resourceType": "Patient",
        "id": "Patient/6831d156-f663-4d09-9f9f-ebc7dafa7059",
        "name": [
          {
            "use": "usual",
            "text": "JOHN DOE"
          }
        ],
        "birthDate": "1910-01-01",
        "address": [
          {
            "line": [
              "123 ANY ROAD",
              ""
            ],
            "city": "ANYTOWN",
            "state": "VA",
            "postalCode": "00001"
          }
        ],
        "telecom": [
          {
            "system": "phone",
            "value": "123-456-7890"
          },
          {
            "system": "email",
            "value": "JOHNDOE@example.com"
          }
        ],
        "contact": [
          {
            "name": [
              {
                "use": "usual",
                "text": "JANE DOE"
              }
            ],
            "address": [
              {
                "use": "Home",
                "line": [
                  "123 AnyWhere St",
                  ""
                ],
                "city": "AnyWhere",
                "state": "DC",
                "postalCode": "00002-1111"
              }
            ],
            "relationship": [
              {
                "coding": [
                  {
                    "system": "http://hl7.org/fhir/ValueSet/patient-contact-relationship",
                    "code": "Other"
                  }
                ],
                "text": "Other"
              }
            ],
            "telecom": [
              {
                "use": "home",
                "system": "phone",
                "value": "123-456-7890"
              },
              {
                "use": "work",
                "system": "phone",
                "value": "000-001-0001"
              },
              {
                "use": "mobile",
                "system": "phone",
                "value": "000-001-0002"
              },
              {
                "system": "email",
                "value": "JANEDOE@example.com"
              }
            ]
          },
          {
            "name": [
              {
                "use": "usual",
                "text": "STEVE DOE"
              }
            ],
            "address": [
              {
                "use": "",
                "line": [
                  "123 AnyWhere Rd",
                  ""
                ],
                "city": "AnyWhere",
                "state": "VA",
                "postalCode": "00001"
              }
            ],
...
      },
      "transaction": {
        "method": "POST",
        "url": "Practitioner"
      },
      "base": "http://localhost:8080/fhir/base"
    }
  ],
  "base": "http://localhost:8080/fhir/base"
}
```

## Example app

Example app is <a href="https://github.com/amida-tech/cms-fhir/blob/master/app.js">here</a>

## License

Licensed under [Apache 2.0](./LICENSE).
