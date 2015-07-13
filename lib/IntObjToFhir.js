'use strict';

var Transform = require("stream").Transform;
var util = require("util");
var _ = require("lodash");
var guid = require("node-uuid");

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
                    _.forEach(value["data"], function(val, key) {
                        proc(memo, val, index, list);
                    });
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
    memo.patient = memo.factory.demographic(value);
    memo.bundle.entry.push(memo.patient);
};

mapper["emergency contact"] = function(memo, value, index, list) {
    memo.factory.emergencyContact(value, memo.patient);
};

mapper["self reported medical conditions"] = function(memo, value, index, list) {
    memo.bundle.entry.push(memo.factory.selfReportedMedicalConditions(value, memo.patient));
};

mapper["self reported allergies"] = function(memo, value, index, list) {
    memo.bundle.entry.push(memo.factory.selfReportedAllergies(value, memo.patient));
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
        "id": (this.serial++).toString(),
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


Factory.prototype.selfReportedAllergies = function(cms, patient) {
    var selfReportedAllergiesMapper = {
        "allergy name": function(value) {
            return {
                "substance": {
                    "text": value
                }
            };
        },
        "type": function(value) {
            return {
                "category": value
            };
        },
        "reaction": function(value) {
            return {
                "event": [{
                    "manifestation": [{
                        /*"coding": {
                            "system" : "http://hl7.org/fhir/ValueSet/manifestation-codes",
                            "code" : value
                        },*/
                        "text": value
                    }]
                }]
            };
        },
        "severity": function(value) {
            return {
                "code": {
                    "text": value
                }
            };
        },
        "diagnosed": function(value) {
            return {
                "status": value
            };
        },
        "treatment": function(value) { //????
            return {
                "code": {
                    "text": value
                }
            };
        },
        "first episode date": function(value) {
            return {
                "event": [{
                    "onset": (_.isDate(value)) ? value.toISOString() : value.split("/").reverse().join("-") // TODO: EU d/m/y expected, but most probably it's american m/d/y
                }]
            };
        },
        "last episode date": function(value) {
            return {
                "lastOccurence": (_.isDate(value)) ? value.toISOString() : value.split("/").reverse().join("-") // TODO: EU d/m/y expected, but most probably it's american m/d/y
            };
        },
        "last treatment date": function(value) {
            return {}; //??????
        },
        "comments": function(value) {
            return {
                "comment": value
            };
        }
    };

    var allergyIntolerance = {
        "resource": {
            "resourceType": "AllergyIntolerance",
            "patient": {
                //"reference": "#" + patient.resource.id
                "reference": patient.resource.id
            },
            "recorder": {
                //"reference": "#" + patient.resource.id
                "reference": patient.resource.id
            }
        }
    };
    _.forOwn(cms, function(value, key, object) {
        if (selfReportedAllergiesMapper[key]) {
            allergyIntolerance.resource = _.merge(allergyIntolerance.resource, selfReportedAllergiesMapper[key](value));
        }
    });

    if (this.baseUrl) {
        allergyIntolerance["transaction"] = {
            "method": "POST",
            "url": "AllergyIntolerance"
        };
        allergyIntolerance["base"] = this.baseUrl;
    }

    return allergyIntolerance;
};

Factory.prototype.selfReportedMedicalConditions = function(cms, patient) {
    var selfReportedMedicalConditionsMapper = {
        "condition name": function(value) {
            return {
                "code": {
                    "text": value
                }
            };
        },
        "medical condition start date": function(value) {
            return {
                "onsetDateTime": (_.isDate(value)) ? value.toISOString() : value.split("/").reverse().join("-") // TODO: EU d/m/y expected, but most probably it's american m/d/y
            };
        },
        "medical condition end date": function(value) {
            return {
                "abatementDate": (_.isDate(value)) ? value.toISOString() : value.split("/").reverse().join("-") // TODO: EU d/m/y expected, but most probably it's american m/d/y
            };
        }
    };

    var condition = {
        "resource": {
            "resourceType": "Condition",
            "patient": {
                //"reference": "#" + patient.resource.id
                "reference": patient.resource.id
            }
        }
    };
    _.forOwn(cms, function(value, key, object) {
        if (selfReportedMedicalConditionsMapper[key]) {
            condition.resource = _.merge(condition.resource, selfReportedMedicalConditionsMapper[key](value));
        }
    });

    if (this.baseUrl) {
        condition["transaction"] = {
            "method": "POST",
            "url": "Condition"
        };
        condition["base"] = this.baseUrl;
    }

    return condition;
};

Factory.prototype.emergencyContact = function(cms, patient) {
    var emergencyContactMapper = {
        "contact name": function(value) {
            return {
                "name": [{
                    "use": "usual",
                    "text": value
                }]
            };
        },
        "address type": function(value) {
            return {
                "address": [{
                    "use": value
                }]
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
        "relationship": function(value) {
            return {
                "relationship": [{
                    "coding": [{
                        "system": "http://hl7.org/fhir/ValueSet/patient-contact-relationship",
                        "code": value
                    }],
                    "text": value
                }]
            };
        },
        "home phone": function(value) {
            var tmp = {
                "telecom": []
            };
            tmp["telecom"][telecom_p++] = {
                "use": "home",
                "system": "phone",
                "value": value
            };
            return tmp;
        },
        "work phone": function(value) {
            var tmp = {
                "telecom": []
            };
            tmp["telecom"][telecom_p++] = {
                "use": "work",
                "system": "phone",
                "value": value
            };
            return tmp;
        },
        "mobile phone": function(value) {
            var tmp = {
                "telecom": []
            };
            tmp["telecom"][telecom_p++] = {
                "use": "mobile",
                "system": "phone",
                "value": value
            };
            return tmp;
        },
        "email address": function(value) {
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
    var contact = {};
    var telecom_p = 0;

    _.forOwn(cms, function(value, key, object) {
        if (emergencyContactMapper[key]) {
            contact = _.merge(contact, emergencyContactMapper[key](value));
        }
    });

    if (!patient.resource.contact) {
        patient.resource.contact = [];
    }
    patient.resource.contact.push(contact);
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

    var pid = guid.v4();
    var patient = {
        "resource": {
            "resourceType": "Patient",
            "id": "Patient/" + pid,
            "identifier": [{ // TODO - artificially generate identifier
                "use": "usual",
                "system": "urn:oid:0.1.2.3.4.5.6.7",
                "value": pid
            }]
        }
    };

    var telecom_p = 0;
    _.forOwn(cms, function(value, key, object) {
        if (patientMapper[key]) {
            patient["resource"] = _.merge(patient["resource"], patientMapper[key](value));
        }
    });

    if (this.baseUrl) {
        patient["transaction"] = {
            "method": "POST",
            "url": "Patient"
                /*"url": "Patient/" + pid,*/
                ,
            "ifNoneExist": "Patient?identifier=Patient/" + pid
        };
        patient["base"] = this.baseUrl;
    }

    return patient;
};