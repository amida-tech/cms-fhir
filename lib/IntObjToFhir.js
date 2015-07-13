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

    var self = this;
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
        }, self);

        if (self.factory.baseUrl) {
            _.forEach(self.bundle.entry, function(val, key) {
                if (!val["transaction"]) {
                    val["transaction"] = {
                        "method": "POST",
                        "url": val.resource.resourceType
                    };
                }
                if (!val["base"]) {
                    val["base"] = self.factory.baseUrl;
                }
            });
        }
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
    _.forEach(memo.factory.selfReportedAllergies(value, memo.patient),
        function(val, key) {
            memo.bundle.entry.push(val);
        }
    );
};

mapper["self reported implantable device"] = function(memo, value, index, list) {
    _.forEach(memo.factory.selfReportedImplantableDevice(value, memo.patient),
        function(val, key) {
            memo.bundle.entry.push(val);
        }
    );
};

mapper["self reported immunizations"] = function(memo, value, index, list) {
    _.forEach(memo.factory.selfReportedImmunizations(value, memo.patient),
        function(val, key) {
            memo.bundle.entry.push(val);
        }
    );
};

mapper["self reported labs and tests"] = function(memo, value, index, list) {
    _.forEach(memo.factory.selfReportedLabsAndTests(value, memo.patient),
        function(val, key) {
            memo.bundle.entry.push(val);
        }
    );
};

mapper["self reported vital statistics"] = function(memo, value, index, list) {
    _.forEach(memo.factory.selfReportedVitalStatistics(value, memo.patient),
        function(val, key) {
            memo.bundle.entry.push(val);
        }
    );
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

function normaliseDateTime(val) {
    return '2000-12-30T01:01'; //TODO Implement this
}

//Factory methods

/**
 * @class
 * @param {string} [baseUrl] - creates entites for transaction bundle
 */
function Factory(baseUrl) {
    this.serial = 0;
    this.baseUrl = baseUrl;
};

/**
 * @function
 * Creates emty bundle
 */
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


/**
 * @function
 * Generates Observation and may generrate Practitioner, DiagnosticReport and DiagnosticOrder
 * @param cms - input stream
 * @param patient - patient record in FHIR format
 */
Factory.prototype.selfReportedVitalStatistics = function(cms, patient) {

    var self = this;
    var result = [];
    
    var selfReportedLabsAndTestsMapper = {
        "vital statistic type": function(value) {
            return {
                "category": {
                    "text": value
                }
            };
        },
        "date": function(value) {
            return {
                "effectiveDateTime": (_.isDate(value)) ? value.toISOString() : value.split("/").reverse().join("-") // TODO: EU d/m/y expected, but most probably it's american m/d/y
            };
        },
        "time": function(value) {
            return {
                "effectiveDateTime": normaliseDateTime(observation.resource["effectiveDateTime"] + " " + value)
            };
        },
        "reading": function(value) {
            return {
                "valueString": value
            };
        },
        "comments": function(value) {
            return {
                "comments": value
            };
        }
    };

    var observation = {
        "resource": {
            "resourceType": "Observation",
            "patient": {
                "reference": patient.resource.id
            },
            "status": "registered",
            "performer": [{
                "reference": patient.resource.id
            }],
        }
    };

    _.forOwn(cms, function(value, key, object) {
        if (selfReportedLabsAndTestsMapper[key]) {
            observation.resource = _.merge(observation.resource, selfReportedLabsAndTestsMapper[key](value));
        }
    });    
    
    result.push(observation);
    
    return result;
};

/**
 * @function
 * Generates Observation and may generrate Practitioner, DiagnosticReport and DiagnosticOrder
 * @param cms - input stream
 * @param patient - patient record in FHIR format
 */
Factory.prototype.selfReportedLabsAndTests = function(cms, patient) {

    var self = this;
    var result = [];

    var diagnosticReportBase = {
        "resource": {
            "resourceType": "DiagnosticReport",
            "subject": {
                "reference": patient.resource.id
            },
            /* //Fields supposed to be required
                        "code": {
                            "text": "-"
                        },
                        "status": "final",
                        "issued": (new Date()).toISOString()*/
        }
    };

    var diagnosticOrdertBase = {
        "resource": {
            "resourceType": "DiagnosticOrder",
            "subject": {
                "reference": patient.resource.id
            }
        }
    };


    var administeredByBase = {
        "resource": {
            "resourceType": "Practitioner",
            "name": []
        }
    };

    var requestedByBase = {
        "resource": {
            "resourceType": "Practitioner",
            "name": []
        }
    };


    var diagnosticOrderMapper = {
        "requesting doctor": function(value) {
            if (value === "") {
                return {};
            }

            var providederId = "Practitioner/" + (self.serial++).toString();
            requestedByBase["resource"]["name"].push({
                "text": value
            });
            requestedByBase["resource"]["id"] = providederId;
            return {
                "orderer": {
                    "reference": providederId
                }
            };
        },
        "reason test/lab requested": function(value) {
            return {
                "clinicalNotes": value
            };
        }
    };

    _.forOwn(cms, function(value, key, object) {
        if (diagnosticOrderMapper[key]) {
            diagnosticOrdertBase.resource = _.merge(diagnosticOrdertBase.resource, diagnosticOrderMapper[key](value));
        }
    });

    if (diagnosticOrdertBase.resource.hasOwnProperty("clinicalNotes") || diagnosticOrdertBase.resource.hasOwnProperty("orderer")) {

        diagnosticOrdertBase.resource.id = "DiagnosticOrder/" + (self.serial++).toString();

        if (diagnosticOrdertBase.resource.hasOwnProperty("orderer")) {
            result.push(requestedByBase);
        }
        result.push(diagnosticOrdertBase);

        if (this.baseUrl) {
            diagnosticOrdertBase["transaction"] = {
                "method": "POST",
                "url": "DiagnosticOrder"
            };
            diagnosticOrdertBase["base"] = this.baseUrl;
        }
    } else {
        diagnosticOrdertBase = null;
    }

    var diagnosticReportMapper = {
        "administered by": function(value) {
            if (value === "") {
                return {};
            }

            var providederId = "Practitioner/" + (self.serial++).toString();
            administeredByBase["resource"]["name"].push({
                "text": value
            });
            administeredByBase["resource"]["id"] = providederId;
            return {
                "performer": {
                    "reference": providederId
                }
            };
        },
        "results": function(value) {
            return {
                "conclusion": value
            };
        }
    };

    _.forOwn(cms, function(value, key, object) {
        if (diagnosticReportMapper[key]) {
            diagnosticReportBase.resource = _.merge(diagnosticReportBase.resource, diagnosticReportMapper[key](value));
        }
    });

    if (diagnosticReportBase.resource.hasOwnProperty("conclusion") || diagnosticReportBase.resource.performer.length > 0) {
        if (this.baseUrl) {
            diagnosticReportBase["transaction"] = {
                "method": "POST",
                "url": "DiagnosticReport"
            };
            diagnosticReportBase["base"] = this.baseUrl;
            if (administeredByBase.resource.name.length > 0) {
                result.push(administeredByBase);
            }

            if (diagnosticOrdertBase) {
                diagnosticReportBase.resource["requestDetail"] = {
                    "reference": diagnosticOrdertBase.resource.id
                };
            }

            result.push(diagnosticReportBase);
        }
    } else {
        diagnosticReportBase = null;
    }


    var selfReportedLabsAndTestsMapper = {
        "test/lab type": function(value) {
            return {
                "category": {
                    "text": value
                }
            };
        },
        "date taken": function(value) {
            return {
                "valueDateTime": (_.isDate(value)) ? value.toISOString() : value.split("/").reverse().join("-") // TODO: EU d/m/y expected, but most probably it's american m/d/y
            };
        },
        "comments": function(value) {
            return {
                "comments": value
            };
        }
    };

    var observation = {
        "resource": {
            "resourceType": "Observation",
            "id": "Observation/" + (self.serial++).toString(),
            "patient": {
                "reference": patient.resource.id
            },
            "status": "registered",
            /*"code": {  //Suppose to be a required field
                "text": "-"
            },*/
            "performer": [{
                "reference": patient.resource.id
            }],
        }
    };

    _.forOwn(cms, function(value, key, object) {
        if (selfReportedLabsAndTestsMapper[key]) {
            observation.resource = _.merge(observation.resource, selfReportedLabsAndTestsMapper[key](value));
        }
    });

    if (diagnosticOrdertBase) {
        diagnosticOrdertBase.resource["supportingInformation"] = [{
            "reference": observation.resource.id
        }];
    }

    result.unshift(observation);

    return result;

};

/**
 * @function
 * Generates Immunization, Location
 * @param cms - input stream
 * @param patient - patient record in FHIR format
 */
Factory.prototype.selfReportedImmunizations = function(cms, patient) {

    var result = [];

    var locationMapper = {
        "were you vaccinated in the us": function(value) {
            return (value === "Yes") ? {
                "address": [{
                    "country": "US"
                }]
            } : {};
        }
    };

    var location = {
        "resource": {
            "resourceType": "Location"
        }
    };

    _.forOwn(cms, function(value, key, object) {
        if (locationMapper[key]) {
            location.resource = _.merge(location.resource, locationMapper[key](value));
        }
    });

    if (location.resource.hasOwnProperty("address")) {
        location.resource.id = "Location/" + (this.serial++).toString();
        if (this.baseUrl) {
            location["transaction"] = {
                "method": "POST",
                "url": "Location"

            };
            location["base"] = this.baseUrl;
        }
        result.push(location);
    } else {
        location = null; //Drop it
    }

    var immunizationMapper = {
        "immunization name": function(value) {
            return {
                "vaccineType": {
                    "text": value
                }
            };
        },
        "date administered": function(value) {
            return {
                "date": (_.isDate(value)) ? value.toISOString() : value.split("/").reverse().join("-") //TODO: EU d/m/y expected, but most probably it's american m/d/y         
            };
        },
        "method": function(value) {
            return {
                "route": {
                    "text": value
                }
            };
        },
        //"were you vaccinated in the us": function(value) { }, //processed in Location
        "comments": function(value) {
            return {};
        }, //TODO - move to extension? 
        "booster 1 date": function(value) {
            return (value === "") ? {} : {
                "vaccinationProtocol": [{
                    "doseSequence": 1,
                }]
            };
        },
        "booster 2 date": function(value) {
            return (value === "") ? {} : {
                "vaccinationProtocol": [{
                    "doseSequence": 2,
                }]
            };
        },
        "booster 3 date": function(value) {
            return (value === "") ? {} : {
                "vaccinationProtocol": [{
                    "doseSequence": 3,
                }]
            };
        }
    };

    var immunization = {
        "resource": {
            "resourceType": "Immunization",
            "patient": {
                "reference": patient.resource.id
            },
            "reported": "true" //TODO check/set if it's actually self-reported
        }
    };

    _.forOwn(cms, function(value, key, object) {
        if (immunizationMapper[key]) {
            immunization.resource = _.merge(immunization.resource, immunizationMapper[key](value));
        }
    });

    if (this.baseUrl) {
        immunization["transaction"] = {
            "method": "POST",
            "url": "Immunization"

        };
        immunization["base"] = this.baseUrl;
    }

    if (location) {
        immunization.resource["location"] = {
            "reference": location.resource.id
        };
    }
    result.push(immunization);

    return result;
};

/**
 * @Function
 * Generates 2 entities - Device and Procedure
 */
Factory.prototype.selfReportedImplantableDevice = function(cms, patient) {

    var deviceID = "Device/" + (this.serial++).toString();

    var deviceMapper = {
        "device name": function(value) {
            return {
                "device": {
                    "text": value
                }
            };
        },
    };

    var device = {
        "resource": {
            "resourceType": "Device",
            "id": deviceID,
            "patient": {
                "reference": patient.resource.id
            }
        }
    };

    _.forOwn(cms, function(value, key, object) {
        if (deviceMapper[key]) {
            device.resource = _.merge(device.resource, deviceMapper[key](value));
        }
    });

    if (this.baseUrl) {
        device["transaction"] = {
            "method": "POST",
            "url": "Device"

        };
        device["base"] = this.baseUrl;
    }


    var procedureMapper = {
        "device name": function(value) {
            return {
                "device": [{
                    "action": {
                        "text": value
                    },
                    "manupulated": {
                        "reference": deviceID
                    }
                }]
            };
        },
        "date implanted": function(value) {
            return {
                "device": [{
                    "performedDateTime": (_.isDate(value)) ? value.toISOString() : value.split("/").reverse().join("-") // TODO: EU d/m/y expected, but most probably it's american m/d/y
                }]
            };
        }
    };

    var procedure = {
        "resource": {
            "resourceType": "Procedure",
            "patient": {
                //"reference": "#" + patient.resource.id
                "reference": patient.resource.id
            },
            "status": "completed"
        }
    };

    _.forOwn(cms, function(value, key, object) {
        if (procedureMapper[key]) {
            procedure.resource = _.merge(procedure.resource, procedureMapper[key](value));
        }
    });

    if (this.baseUrl) {
        procedure["transaction"] = {
            "method": "POST",
            "url": "Procedure"
        };
        procedure["base"] = this.baseUrl;
    }

    return [device, procedure];
};

Factory.prototype.selfReportedAllergies = function(cms, patient) {

    var riskAssessmentMapper = {
        "treatment": function(value) {
            return {
                "mitigation": value
            };
        },
    };

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
            return {}; // TODO no mapping in a base document. Need to fix it somehow. USe extensions?
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

    // Generate a second item in a set
    var riskAccessmentBase = {};
    _.forOwn(cms, function(value, key, object) {
        if (riskAssessmentMapper[key]) {
            riskAccessmentBase = _.merge(riskAccessmentBase, riskAssessmentMapper[key](value));
        }
    });

    if (riskAccessmentBase.hasOwnProperty("mitigation")) {
        var riskAccessment = {
            "resource": {
                "resourceType": "RiskAssessment",
                "subject": {
                    "reference": patient.resource.id
                }
            }
        };
        riskAccessment.resource = _.merge(riskAccessment.resource, riskAccessmentBase);
        if (this.baseUrl) {
            riskAccessment["transaction"] = {
                "method": "POST",
                "url": "RiskAssessment"
            };
            riskAccessment["base"] = this.baseUrl;
        }
        return [allergyIntolerance, riskAccessment];
    }

    return [allergyIntolerance];
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