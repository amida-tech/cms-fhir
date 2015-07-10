'use strict';

var Transform = require("stream").Transform;
var util = require("util");
var _ = require("lodash");

util.inherits(IntObjToFhirStream, Transform); // inherit Transform

function IntObjToFhirStream(baseUrl) {
    Transform.call(this, {
        "objectMode": true
    }); // invoke Transform's constructor, expected result is object
    this.factory = new Factory(baseUrl);

    this.bundle = this.factory.bundle();
}

IntObjToFhirStream.prototype._transform = function(cms, encoding, cb) {

    console.log(JSON.stringify(cms, null, '  '));

    if (Array.isArray(cms)) {

        _.reduce(cms, function(memo, value, index, list) {
            if (value.hasOwnProperty("section header")) {
                var proc = mapper[value["section header"]];
                if (proc) {
                    proc(memo, value["data"][0], index, list);
                }
                return memo;
            }
        }, this);

        this.push(this.bundle);
    }
    cb();
};

var mapper = {};

mapper["demographic"] = function(memo, value, index, list) {
	memo.bundle.entry.push( memo.factory.demographic(value));
};

mapper["emergency contact"] = function(memo, value, index, list) {

};

mapper["self reported medical conditions"] = function(memo, value, index, list) {

};

mapper["self reported allergies"] = function(memo, value, index, list) {

};

mapper["self reported implantable device"] = function(memo, value, index, list) {

};

mapper["self reported immunizations"] = function(memo, value, index, list) {

};

mapper["self reported labs and tests"] = function(memo, value, index, list) {

};

mapper["self reported vital statistics"] = function(memo, value, index, list) {

};

mapper["family medical history"] = function(memo, value, index, list) {

};

mapper["drugs"] = function(memo, value, index, list) {

};

mapper["providers"] = function(memo, value, index, list) {

};

mapper["preventive services"] = function(memo, value, index, list) {

};

mapper["pharmacies"] = function(memo, value, index, list) {

};

mapper["plans"] = function(memo, value, index, list) {

};

mapper["employer subsidy"] = function(memo, value, index, list) {

};

mapper["primary insurance"] = function(memo, value, index, list) {

};

mapper["other insurance"] = function(memo, value, index, list) {

};

mapper["claim summary"] = function(memo, value, index, list) {

};

mapper["empty"] = function(memo, value, index, list) {

};

module.exports.IntObjToFhirStream = IntObjToFhirStream;

//Factory methods

function Factory(baseUrl) {
    this.serial = 0;
    this.baseUrl = baseUrl;
};

Factory.prototype.bundle = function() {
    var date = new Date();

    var bundle = {
        "resourceType": "Bundle",
        "type": "document",
        "id": this.serial++,
        "meta": {
            "lastUpdated": date.toISOString()
        },
        "entry": []
    };

    if (this.baseUrl) {
        bundle["type"] = "transaction";
        bundle["base"] = this.baseUrl;
    }

    return bundle;
};


Factory.prototype.demographic = function(cms) {
    var patientMapper = {
        "name": function(value) {
            return {
                "name": [{
                    "use": "usual",
                    "text": value
                }]
            };
        },
        "date of birth": function(value) {
            return {
                "birthDate": value.split("/").reverse().join("-") // TODO: EU d/m/y expected, but most probably it's american m/d/y
            };
        },
        "address line 1": function(value) {
            return {
                "address": [{
                    "line": [value]
                }]
            };
        },
        "address line 2": function(value) {
            return {
                "address": [{
                    "line": [, value]
                }]
            };
        },
        "city": function(value) {
            return {
                "address": [{
                    "city": value
                }]
            };

        },
        "state": function(value) {
            return {
                "address": [{
                    "state": value
                }]
            };

        },
        "zip": function(value) {
            return {
                "address": [{
                    "postalCode": value
                }]
            };
        },
        "phone number": function(value) {
            var tmp = {
                "telecom": []
            };
            tmp["telecom"][telecom_p++] = {
                "system": "phone",
                "value": value
                };
            return tmp;
        },
        "email": function(value) {
            var tmp = {
                "telecom": []
            };
            tmp["telecom"][telecom_p++] = {
                "system": "email",
                    "value": value
                };
            return tmp;
        }
    };

    var patient = { "resource" : {
        "resourceType": "Patient"
        //,"id": (this.serial++).toString()
    } };

    var telecom_p = 0;
    _.forOwn(cms, function(value, key, object) {
        if (patientMapper[key]) {
            patient["resource"] = _.merge(patient["resource"], patientMapper[key](value));
        }
    });

    if (this.baseUrl) {
        patient["transaction"] =  {
        "method": "POST",
        "url": "Patient"
      };
    }

    return patient;
};