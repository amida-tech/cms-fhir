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
    var temp = memo.factory.demographic(value, null, null, list[index]["source"]);
    memo.patient = _.find(temp, function(val) {
        return val.resource.resourceType === "Patient";
    });
    _.forEach(temp,
        function(val, key) {
            memo.bundle.entry.push(val);
        }
    );
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
    _.forEach(memo.factory.familyMedicalHistory(value, memo.patient),
        function(val, key) {
            memo.bundle.entry.push(val);
        }
    );
};

mapper["drugs"] = function(memo, value, index, list) {
    _.forEach(memo.factory.drugs(value, memo.patient, null, list[index]["source"]),
        function(val, key) {
            memo.bundle.entry.push(val);
        }
    );
};

mapper["providers"] = function(memo, value, index, list) {
    _.forEach(memo.factory.providers(value, memo.patient),
        function(val, key) {
            memo.bundle.entry.push(val);
        }
    );
};

mapper["preventive services"] = function(memo, value, index, list) {
    //TODO - do we want to compress it in a single order?
    _.forEach(memo.factory.preventiveServices(value, memo.patient, null, list[index]["source"]),
        function(val, key) {
            memo.bundle.entry.push(val);
        }
    );
};

mapper["pharmacies"] = function(memo, value, index, list) {
    _.forEach(memo.factory.pharmacies(value, memo.patient),
        function(val, key) {
            memo.bundle.entry.push(val);
        }
    );
};

mapper["plans"] = function(memo, value, index, list) {
    _.forEach(memo.factory.pansInsuranceSubsidy(value, memo.patient, null, list[index]["source"]),
        function(val, key) {
            memo.bundle.entry.push(val);
        }
    );
};

mapper["employer subsidy"] = function(memo, value, index, list) {
    _.forEach(memo.factory.pansInsuranceSubsidy(value, memo.patient, null, list[index]["source"]),
        function(val, key) {
            memo.bundle.entry.push(val);
        }
    );
};

mapper["primary insurance"] = function(memo, value, index, list) {
    _.forEach(memo.factory.pansInsuranceSubsidy(value, memo.patient, null, list[index]["source"]),
        function(val, key) {
            memo.bundle.entry.push(val);
        }
    );
};

mapper["other insurance"] = function(memo, value, index, list) {
    _.forEach(memo.factory.pansInsuranceSubsidy(value, memo.patient, null, list[index]["source"]),
        function(val, key) {
            memo.bundle.entry.push(val);
        }
    );
};

mapper["claim summary"] = function(memo, value, index, list) {
    _.forEach(memo.factory.claims(value, memo.patient, list[index]["claim number"], list[index]["source"], memo.bundle),
        function(val, key) {
            memo.bundle.entry.push(val);
        }
    );
};

mapper["claim"] = function(memo, value, index, list) {
    _.forEach(memo.factory.claims(value, memo.patient, list[index]["claim number"], list[index]["source"], memo.bundle),
        function(val, key) {
            memo.bundle.entry.push(val);
        }
    );
};

mapper["empty"] = function(memo, value, index, list) {

};

module.exports.IntObjToFhirStream = IntObjToFhirStream;

/**
 * Attempt to convert date/datetime from US format to a standard yyyy-mm-dd/yyyy-mm-ddZHH:mm
 */
function normaliseDateTime(value) {
    if (_.isDate(value)) return value;

    // 'Shamnic' style heuristics
    var denormDate = /(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2})\:(\d{1,2})\s+(AM|PM)){0,1}/i;
    var partNormDate = /(\d{4})-(\d{1,2})-(\d{1,2})(?:\s+(\d{1,2})\:(\d{1,2})\s+(AM|PM)){0,1}/i;

    var denorm = denormDate.exec(value);
    var align = function(value) {
        if (value && value.length === 1) {
            return '0' + value;
        } else {
            return value;
        }
    }

    if (denorm && !denorm[4]) { //Denormalized date only '31/12/2001'
        //Switch to yyyy-mm-dd
        return denorm[3] + '-' + align(denorm[1]) + '-' + align(denorm[2]);
    }

    if (denorm) { //Denormalized date and time '31/12/2001 3:30 PM'
        //Switch to yyyy-mm-ddZHH:mm
        return denorm[3] + '-' + align(denorm[1]) + '-' + align(denorm[2]) + 'Z' + ((denorm[6] === 'AM') ? denorm[4] : ((partNorm[4] === '12') ? '12' : (parseInt(partNorm[4]) + 12).toString())) + ':' + denorm[5];
    }

    var partNorm = partNormDate.exec(value);

    if (partNorm && !partNorm[4]) { //Normalized date '2001-12-31'
        return value; // Do nothing
    }

    if (partNorm) { // Normalized date and denorm time '2001-12-31 3:30 PM'
        return partNorm[1] + '-' + align(partNorm[2]) + '-' + align(partNorm[3]) + 'Z' + ((partNorm[6] === 'AM') ? partNorm[4] : ((partNorm[4] === '12') ? '12' : (parseInt(partNorm[4]) + 12).toString())) + ':' + partNorm[5];
    }

    //WTF? Passthrough.
    return value;
}

/**
 * Trying to extract dispense information. TODO - It based on a few test cases, may not work in a general case
 */
function normalizeDispense(value) {
    var tokens = value.split(' ');
    if (tokens.length === 4 && tokens[1] === 'Every') {
        return {
            "quantity": {
                "value": tokens[0]
            },
            "expectedSupplyDuration": {
                "low": {
                    "value": tokens[3]
                }
            }
        };
    } else {
        return {
            "expectedSupplyDuration": {
                "low": {
                    "units": value
                }
            }
        };
    }
}


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
 * Creates empty bundle
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

/** TODO - Overcomplicated. Refactor. */
Factory.prototype.claims = function(cms, patient, claimNumber, source, bundle) {
    var self = this;
    var result = [];

    var practitioner = {
        "resource": {
            "resourceType": "Practitioner"
        }
    };

    var practitioner1 = {
        "resource": {
            "resourceType": "Practitioner"
        }
    };

    var claim = {
        "resource": {
            "resourceType": "Claim",
            "identifier": {
                "value": null
            },
            "diagnosis": [],
            "item": []
        }
    };

    var paymentReconciliation;
    
    paymentReconciliation = _.find( bundle.entry, function(val) { 
        return val.resource.resourceType === 'PaymentReconciliation' 
            && val.resource.identifier.value === claimNumber;
         });
    
    if(!paymentReconciliation) {
        paymentReconciliation = {
            "resource": {
                "resourceType": "PaymentReconciliation",
                "identifier": {
                    "type": [],
                    "value": null
                },
                "detail": [],
            }
        };
        result.push(paymentReconciliation);
    }
    
    if ( !paymentReconciliation.resource.organization && source && source !== '') {
        var org;
        org =  _.find( bundle.entry, function(val) { 
        return val.resource.resourceType === 'Organization' 
            && val.resource.identifier.value === source;
         });
         if(!org) {
            org = {
                "resource": {
                    "resourceType": "Organization",
                    "id": "Organization/" + (this.serial++).toString(),
                    "name": source
                }
            };
            result.push(org);
         }
         
        paymentReconciliation.resource.organization = {
            "reference": org.resource.id
        };
    }

    var claimResponse = {
        "resource": {
            "resourceType": "ClaimResponse",
            "item": [{
                "adjudication": [{}]
            }]
        }
    };

    var medication = {
        "resource": {
            "resourceType": "Medication",
            "id": null,
            "code": null
        }
    };

    var medicationDispense = {
        "resource": {
            "resourceType": "MedicationDispense",
            "medicationReference": {
                "reference": null
            }
        }
    };

    var lineNumber;
    var modifier = function(value, idx) {
        var tmp = value.split(" - ");
        if (!claim.resource.item[idx]) {
            claim.resource.item[idx] = {};
        }
        if (!claim.resource.item[idx].modifier) {
            claim.resource.item[idx].modifier = [];
        }
        if (tmp.length === 2) {
            return {
                "item": [{
                    "modifier": [{
                        "code": tmp[idx],
                        "display": tmp[1]
                    }]
                }]
            };

        } else {
            return {
                "item": [{
                    "modifier": [{
                        "display": value
                    }]
                }]
            };
        }
    };

    var fixAmount = function(value) {
        if (value) {
            if (value === "* Not Available *") {
                return "";
            }
            return value.replace("$", "");
        }
        return value;
    }

    var diagSequence = 1;
    var itemSequence = 1;
    var paymentReconciliationMapper = {

        //Claim summary
        "claim number": function(value) {
            return {
                "identifier": {
                    "value": value
                }
            };
        },
        "provider": function(value) {
            practitioner.resource["id"] = "Practitioner/" + (self.serial++).toString();
            practitioner.resource["name"] = [{
                "text": value
            }];
            if (!_.include(result, practitioner)) {
                result.push(practitioner);
            }
            return {
                "requestProvider": {
                    "reference": practitioner.resource["id"]
                }
            };
        },
        "provider billing address": function(value) {
            practitioner.resource["address"] = [{
                "text": value
            }];
            return {};
        },
        "service start date": function(value) {
            return (value === '') ? {} : {
                "period": {
                    "start": normaliseDateTime(value)
                }
            };
        },
        "service end date": function(value) {
            return (value === '') ? {} : {
                "period": {
                    "end": normaliseDateTime(value)
                }
            };
        },
        "amount charged": function(value) {
            if (value !== "* Not Available *") {
                paymentReconciliation.resource["detail"].push({
                    "type": "charged",
                    "amount": fixAmount(value)
                });
            }
            return {};
        },
        "medicare approved": function(value) {
            if (value !== "* Not Available *") {
                paymentReconciliation.resource["detail"].push({
                    "type": "approved",
                    "amount": fixAmount(value)
                });
            }
            return {};
        },
        "provider paid": function(value) {
            if (value !== "* Not Available *") {
                paymentReconciliation.resource["detail"].push({
                    "type": "providerPaid",
                    "amount": fixAmount(value)
                });
            }
            return {};
        },
        "you may be billed": function(value) {
            if (value !== "* Not Available *") {
                paymentReconciliation.resource["detail"].push({
                    "type": "youMayBeBilled",
                    "amount": fixAmount(value)
                });
            }
            return {};
        },
        "claim type": function(value) {
            var organization = {
                "resource": {
                    "resourceType": "Organization",
                    "id": "Organization/" + (self.serial++).toString(),
                    "name": value
                }
            };
            result.push[organization];
            return {
                "organization": {
                    "reference": organization.resource.id
                }
            };
        },

        "line number": function(value) {
            lineNumber = parseInt(value) - 1;
            return {};
        },
        "date of service from": function(value) {
            return (value === '') ? {} : {
                "period": {
                    "start": normaliseDateTime(value)
                }
            };
        },
        "date of service to": function(value) {
            return (value === '') ? {} : {
                "period": {
                    "end": normaliseDateTime(value)
                }
            };
        },

        "claim service date": function(value) {
            return (value === '') ? {} : {
                "period": {
                    "start": normaliseDateTime(value)
                }
            };
        },
        "pharmacy / service provider": function(value) {
            return {
                "identifier": {
                    "value": value
                }
            };
        },
        "pharmacy name": function(value) {
            practitioner.resource["id"] = "Practitioner/" + (self.serial++).toString();
            practitioner.resource["name"] = [{
                "text": value
            }];
            practitioner.resource["address"] = [{
                "text": value
            }];
            if (!_.include(result, practitioner)) {
                result.push(practitioner);
            }
            return {
                "requestProvider": {
                    "reference": practitioner.resource["id"]
                }
            };
            return {};
        },
        "drug code": function(value) {
            if (!_.include(result, medication)) {
                medication.resource.id = "Medication/" + (self.serial++).toString(),
                    result.push(medication);
                if (!_.include(result, medicationDispense)) {
                    medicationDispense.resource.medicationReference["reference"] = medication.resource.id;
                    result.push(medicationDispense);
                }
            }
            medication.resource.code = _.extend(medication.resource.code, {
                "coding": [{
                    "code": value
                }]
            });

            return {};

        },
        "drug name": function(value) {
            if (!_.include(result, medication)) {
                medication.resource.id = "Medication/" + (self.serial++).toString(),
                    result.push(medication);
                if (!_.include(result, medicationDispense)) {
                    medicationDispense.resource.medicationReference["reference"] = medication.resource.id;
                    result.push(medicationDispense);
                }
            }
            medication.resource.code = _.extend(medication.resource.code, {
                "text": value
            });

            return {};

        },
        "fill number": function(value) {
            if (!_.include(result, medicationDispense)) {
                result.push(medicationDispense);
            }

            medicationDispense.resource.type = {
                "coding": [{
                    "system": "http://hl7.org/fhir/v3/ActCode",
                    "code": (value === 0) ? "FF" : "RF",
                    "display": value
                }]
            };
            return {};
        },
        "days' supply": function(value) {
            if (!_.include(result, medicationDispense)) {
                result.push(medicationDispense);
            }

            medicationDispense.resource.daysSupply = {
                "value": value
            };
            return {};
        },
        "prescriber identifer": function(value) {
            if (!_.include(result, practitioner1)) {
                practitioner1.resource["id"] = "Practitioner/" + (self.serial++).toString(),
                    medicationDispense.resource["dispenser"] = {
                        "reference": practitioner1.resource.id
                    };
                result.push(practitioner1);
            }
            practitioner1.resource["identifier"] = {
                "value": value
            };
            return {};
        },
        "prescriber name": function(value) {
            if (!_.include(result, practitioner1)) {
                practitioner1.resource["id"] = "Practitioner/" + (self.serial++).toString(),
                    medicationDispense.resource["dispenser"] = {
                        "reference": practitioner1.resource.id
                    };
                result.push(practitioner1);
            }
            practitioner1.resource["name"] = [{
                "text": value
            }];
            return {};
        }
    };

    var claimMapper = {
        "diagnosis code 1": function(value) {
            claim.resource["diagnosis"].push({
                "sequence": (diagSequence++).toString(),
                "diagnosis": value
            });
            return {};
        },
        "diagnosis code 2": function(value) {
            claim.resource["diagnosis"].push({
                "sequence": (diagSequence++).toString(),
                "diagnosis": value
            });
            return {};
        },
        "diagnosis code 3": function(value) {
            claim.resource["diagnosis"].push({
                "sequence": (diagSequence++).toString(),
                "diagnosis": value
            });
            return {};
        },
        "diagnosis code 4": function(value) {
            claim.resource["diagnosis"].push({
                "sequence": (diagSequence++).toString(),
                "diagnosis": value
            });
            return {};
        },

        "procedure code/description": function(value) {
            var tmp = value.split(" - ");
            if (tmp.length === 2) {
                claim.resource["diagnosis"].push({
                    "sequence": (diagSequence++).toString(),
                    "diagnosis": {
                        "code": tmp[0],
                        "display": tmp[1]
                    }
                });
            } else {
                claim.resource["diagnosis"].push({
                    "sequence": (diagSequence++).toString(),
                    "diagnosis": {
                        "display": value
                    }
                });
            }
            return {};
        },
        "modifier 1/description": function(value) {
            return modifier(value, 0);
        },
        "modifier 2/description": function(value) {
            return modifier(value, 1);
        },
        "modifier 3/description": function(value) {
            return modifier(value, 2);
        },
        "modifier 4/description": function(value) {
            return modifier(value, 3);
        },
        "quantity billed/units": function(value) {
            return {
                "item": [{
                    "detail": [{
                        "quantity": {
                            "value": value
                        }
                    }]
                }]
            };
        },
        "submitted amount/charges": function(value) {
            if (value === "* Not Available *")
                return {
                    "item": [{
                        "detail": [{
                            "net": value
                        }]
                    }]
                };
        },
        "allowed amount": function(value) {
            if (value !== "* Not Available *") {
                if (!claimResponse.resource.request) {
                    claimResponse.resource.request = {
                        "reference": claim.resource.id
                    };
                }
                claimResponse.resource.item[0]["adjudication"].push({
                    "code": {
                        "code": "allowedAmount"
                    },
                    "amount": value
                });
            }
            return {};
        },
        "non-covered": function(value) {
            if (value !== "* Not Available *") {
                if (!claimResponse.resource.request) {
                    claimResponse.resource.request = {
                        "reference": claim.resource.id
                    };
                }
                claimResponse.resource.item[0]["adjudication"].push({
                    "code": {
                        "code": "nonCovered"
                    },
                    "amount": value
                });
            }
            return {};
        },
        "place of service/description": function(value) {
            if (value !== "") {
                var tmp = value.split(" - ");
                var location = {
                    "resource": {
                        "resourceType": "Location",
                        "id": "Location/" + (self.serial++).toString(),
                        "physicalType": (tmp.length == 2) ? {
                            "code": tmp[0],
                            "display": tmp[1]
                        } : {
                            "display": value
                        }
                    }

                };
                result.push(location);

                return {
                    "facility": {
                        "reference": location.resource.id
                    }
                };
            }
            return {};
        },
        "type of service/description": function(value) {
            if (value !== "") {
                var tmp = value.split(" - ");
                return {
                    "item": [{
                        "service": [(tmp.length == 2) ? {
                            "code": tmp[0],
                            "display": tmp[1]
                        } : {
                            "display": value
                        }]
                    }]
                };

            };
            return {};
        },
        "rendering provider no": function(value) {
            practitioner.resource.identifier = {
                "value": value
            };
            if (!_.include(result, practitioner)) result.push(practitioner);
        },
        "rendering provider npi": function(value) {
            practitioner.resource.identifier = {
                "value": value
            };
            if (!_.include(result, practitioner)) result.push(practitioner);
        },
    };

    _.forOwn(cms, function(value, key, object) {
        if (paymentReconciliationMapper[key]) {
            paymentReconciliation.resource = _.merge(paymentReconciliation.resource, paymentReconciliationMapper[key](value));
        }
    });

    _.forOwn(cms, function(value, key, object) {
        if (claimMapper[key]) {
            claim.resource = _.merge(claim.resource, claimMapper[key](value));
        }
    });

    if (claim.resource.diagnosis.length > 0) {
        claim.resource.identifier.value = claimNumber;
        result.push(claim);
    }

    if (claimResponse.resource.request) {
        result.push(claimResponse);
    }

    return result;
};


Factory.prototype.pansInsuranceSubsidy = function(cms, patient, empty, source) {

    var self = this;
    var result = [];

    var organization = {
        "resource": {
            "resourceType": "Organization",
            "id": ""
        }
    };

    var pisMapper = {
        "contract id/plan id": function(value) {
            var groupPlan = value.split('/');

            return (groupPlan.length === 2) ? {
                "group": groupPlan[0],
                "plan": groupPlan[1]
            } : {
                "plan": value
            };
        },
        "plan period": function(value) {
            var period = value.split(' - ');
            if (period.length === 2) {
                return (period[1] === 'current') ? {
                    "period": {
                        "start": normaliseDateTime(period[0])
                    }
                } : {
                    "period": {
                        "start": normaliseDateTime(period[0]),
                        "end": normaliseDateTime(period[1])
                    }
                };
            } else {
                return {
                    "period": {
                        "start": normaliseDateTime(period[0])
                    }
                };
            };
        },
        "plan name": function(value) {
            organization.resource["name"] = value;
            return {};
        },
        "plan address": function(value) {
            organization.resource["address"] = [{
                "text": value
            }];
            return {};
        },
        "plan type": function(value) {
            var tmp = value.split(' - ');
            if (tmp.length === 2) {
                return {
                    "type": [{
                        "code": tmp[0],
                        "display": tmp[1]
                    }]
                };
            } else {
                return {
                    "type": [{
                        "code": value
                    }]
                };
            }
        },

        "employer plan": function(value) {
            return {
                "plan": value
            }
        },
        "employer subsidy start date": function(value) {
            return {
                "period": {
                    "start": normaliseDateTime(value)
                }
            };
        },
        "employer subsidy end date": function(value) {
            return {
                "period": {
                    "end": normaliseDateTime(value)
                }
            };
        },

        "msp type": function(value) {
            return (value === '') ? {} : {
                "type": [{
                    "code": value
                }]
            };
        },
        "policy number": function(value) {
            return {
                "subscriberId": {
                    "value": value
                }
            };
        },
        "insurer name": function(value) {
            organization.resource["name"] = value;
            return {};
        },
        "insurer address": function(value) {
            organization.resource["address"] = [{
                "text": value
            }];
            return {};
        },
        "effective date": function(value) {
            return {
                "period": {
                    "start": normaliseDateTime(value)
                }
            };
        },
        "termination date": function(value) {
            return {
                "period": {
                    "end": normaliseDateTime(value)
                }
            };
        }
    };

    var pis = {
        "resource": {
            "resourceType": "Coverage"
        }
    };

    _.forOwn(cms, function(value, key, object) {
        if (pisMapper[key]) {
            pis.resource = _.merge(pis.resource, pisMapper[key](value));
        }
    });

    if (organization.resource.name || organization.resource.address) {
        organization.resource["id"] = "Organization/" + (self.serial++).toString();
        pis.resource["issuer"] = {
            "reference": organization.resource["id"]
        };
        result.push(organization);
    }
    result.push(pis);

    return result;
};

Factory.prototype.pharmacies = function(cms, patient) {
    var self = this;
    var result = [];

    var healthcareServiceMapper = {
        "pharmacy name": function(value) {
            return {
                "serviceName": value
            };
        },
        "pharmacy phone": function(value) {
            return {
                "telecom": [{
                    "use": "work",
                    "system": "phone",
                    "value": value
                }]
            };
        },
    };

    var healthcareService = {
        "resource": {
            "resourceType": "HealthcareService"
        }
    };

    _.forOwn(cms, function(value, key, object) {
        if (healthcareServiceMapper[key]) {
            healthcareService.resource = _.merge(healthcareService.resource, healthcareServiceMapper[key](value));
        }
    });

    result.push(healthcareService);

    return result;
};

Factory.prototype.providers = function(cms, patient) {
    var self = this;
    var result = [];

    var practitionerMapper = {
        "provider name": function(value) {
            return {
                "name": [{
                    "text": value
                }]
            };
        },
        "provider address": function(value) {
            return {
                "address": [{
                    "text": value
                }]
            };
        },
        "type": function(value) {
            return {
                "practitionerRole": [{
                    "role": {
                        "code": {
                            "text": value
                        }
                    }
                }]
            };
        },
        "specialty": function(value) {
            return {
                "practitionerRole": [{
                    "specialty": [{
                        "code": {
                            "text": value
                        }
                    }]
                }]
            };
        },

    };

    var practitionerBase = {
        "resource": {
            "resourceType": "Practitioner"
        }
    };

    var practitioner = _.extend({}, practitionerBase);

    result.push(practitioner);

    _.forOwn(cms, function(value, key, object) {
        var match = /(.+)( \d+)/;
        var matches = match.exec(key);
        if (matches) {
            var position = parseInt(matches[2]);
            if (!result[position]) {
                result[position] = _.extend({}, practitionerBase);
            }
            key = matches[1];
            practitioner = result[position];
        }
        if (practitionerMapper[key]) {
            practitioner.resource = _.merge(practitioner.resource, practitionerMapper[key](value));
        }
    });

    return result;
};

Factory.prototype.preventiveServices = function(cms, patient, empty, source) {
    var self = this;
    var result = [];

    var diagnosticOrderMapper = {
        "description": function(value) {
            return {
                "item": [{
                    "code": {
                        "text": value
                    }
                }]
            };
        },

    };

    var diagnosticOrder = {
        "resource": {
            "resourceType": "DiagnosticOrder",
            "subject": {
                "reference": patient.resource.id
            }
        }
    };

    if (source && source !== '') {
        var org = {
            "resource": {
                "resourceType": "Organization",
                "id": "Organization/" + (this.serial++).toString()
            }
        };
        result.push(org);
        diagnosticOrder.resource.orderer = {
            "reference": org.resource.id
        };
    }

    _.forOwn(cms, function(value, key, object) {
        if (diagnosticOrderMapper[key]) {
            diagnosticOrder.resource = _.merge(diagnosticOrder.resource, diagnosticOrderMapper[key](value));
        }
    });

    result.push(diagnosticOrder);

    return result;
};


Factory.prototype.drugs = function(cms, patient, empty, source) {
    var self = this;
    var result = [];

    var medicationStatementMapper = {
        "drug name": function(value) {
            return {
                "medicationCodeableConcept": {
                    "text": value
                }
            };
        },
        "supply": function(value) {
            return {
                "dosage": [{
                    "text": value
                }]
            };
        },
        "orig drug entry": function(value) {
            return {
                "note": value
            };
        }
    };

    var medicationStatement = {
        "resource": {
            "resourceType": "MedicationStatement",
            "patient": {
                "reference": patient.resource.id
            }
        }
    };

    if (source && source !== '') {
        if (source === 'Self-Entered') {
            medicationStatement.resource.informationSource = {
                "reference": patient.resource.id
            };
        } else {
            var org = {
                "resource": {
                    "resourceType": "Organization",
                    "id": "Organization/" + (this.serial++).toString()
                }
            };
            result.push(org);
            medicationStatement.resource.informationSource = {
                "reference": org.resource.id
            };
        }
    }


    var medicationPrescriptionMapper = {
        "supply": function(value) {
            return {
                "dispense": normalizeDispense(value)
            };
        }

    };

    var medicationPrescription = {
        "resource": {
            "resourceType": "MedicationPrescription",
            "id": "MedicationPrescription/" + (self.serial++).toString(),
            "patient": {
                "reference": patient.resource.id
            }
        }
    };


    var medicationDispenseMapper = {
        "orig drug entry": function(value) {
            return {
                "substitution": {
                    "type": {
                        "text": value
                    }
                }
            };
        }

    };

    var medicationDispense = {
        "resource": {
            "resourceType": "MedicationDispense",
            "patient": {
                "reference": patient.resource.id
            },
            "authorizingPrescription": {
                "reference": medicationPrescription.resource.id
            }
        }
    };

    _.forOwn(cms, function(value, key, object) {
        if (medicationStatementMapper[key]) {
            medicationStatement.resource = _.merge(medicationStatement.resource, medicationStatementMapper[key](value));
        }
    });

    result.push(medicationStatement);


    _.forOwn(cms, function(value, key, object) {
        if (medicationPrescriptionMapper[key]) {
            medicationPrescription.resource = _.merge(medicationPrescription.resource, medicationPrescriptionMapper[key](value));
        }
    });

    result.push(medicationPrescription);

    _.forOwn(cms, function(value, key, object) {
        if (medicationDispenseMapper[key]) {
            medicationDispense.resource = _.merge(medicationDispense.resource, medicationDispenseMapper[key](value));
        }
    });

    result.push(medicationDispense);

    return result;
};

Factory.prototype.familyMedicalHistory = function(cms, patient) {
    var self = this;
    var result = [];

    var familyMedicalHistoryMapper = {
        "family member": function(value) {
            return {
                "relationship": {
                    "text": value
                }
            };
        },
        "type": function(value) {
            return (value && value !== '') ? {
                "relationship": {
                    "coding": {
                        "code": value
                    }
                }
            } : {};
        },
        "dob": function(value) {
            return (value && value !== '') ? {
                "bornDate": normaliseDateTime(value)
            } : {};
        },
        "dod": function(value) {
            return (value && value !== '') ? {
                "deceasedDate": normaliseDateTime(value)
            } : {};
        },
        "age": function(value) {
            return (value && value !== '') ? {
                "ageString": value
            } : {};
        },
    };

    var familyMemeberHistory = {
        "resource": {
            "resourceType": "FamilyMemberHistory",
            "patient": {
                "reference": patient.resource.id
            },
            "condition": []
        }
    };

    var typeX, descriptionX;

    _.forOwn(cms, function(value, key, object) {
        if (familyMedicalHistoryMapper[key]) {
            familyMemeberHistory.resource = _.merge(familyMemeberHistory.resource, familyMedicalHistoryMapper[key](value));
        }

        // Special processing for 'type x' and 'description'/'description x'
        if (key.indexOf("type ") >= 0) {

            typeX = parseInt(key.substring(4)) - 1;

            familyMemeberHistory.resource["condition"][typeX] = {
                "type": {
                    "text": value
                }
            };
        }
        if (key.indexOf("description") >= 0) {
            if (familyMemeberHistory.resource["condition"][typeX]["note"]) {
                familyMemeberHistory.resource["condition"][typeX]["note"] += '\n' + value;
            } else {
                familyMemeberHistory.resource["condition"][typeX]["note"] = value;
            }
        }

    });

    result.push(familyMemeberHistory);

    return result;
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
                "code": {
                    "text": value
                },

                "category": { //TODO category ignored on upload. Mistake on implementation? Move value to "code" element
                    "text": value
                }
            };
        },
        "date": function(value) {
            return {
                "effectiveDateTime": normaliseDateTime(value)
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
            "subject": {
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
                "code": {
                    "text": value
                },

                "category": { //TODO category ignored on upload. Mistake on implementation? Move value to "code" element
                    "text": value
                }
            };
        },
        "date taken": function(value) {
            return {
                "valueDateTime": normaliseDateTime(value)
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
            "subject": {
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
                "date": normaliseDateTime(value)
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
                    "performedDateTime": normaliseDateTime(value)
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
                    "onset": normaliseDateTime(value)
                }]
            };
        },
        "last episode date": function(value) {
            return {
                "lastOccurence": normaliseDateTime(value)
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
                "onsetDateTime": normaliseDateTime(value)
            };
        },
        "medical condition end date": function(value) {
            return {
                "abatementDate": normaliseDateTime(value)
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

Factory.prototype.demographic = function(cms, empty1, empty2, source) {

    var result = [];

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
                "birthDate": normaliseDateTime(value)
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
            /*"identifier": [{ // TODO - artificially generate identifier
                "use": "usual",
                "system": "urn:oid:0.1.2.3.4.5.6.7",
                "value": pid
            }]*/
        }
    };

    var telecom_p = 0;
    _.forOwn(cms, function(value, key, object) {
        if (patientMapper[key]) {
            patient["resource"] = _.merge(patient["resource"], patientMapper[key](value));
        }
    });

    result.push(patient);


    if (source && source !== '') {
        var agent;
        var agentCode;
        if (source !== 'Self-Entered') {
            agent = {
                "resource": {
                    "resourceType": "Organization",
                    "id": "Organization/" + (this.serial++).toString(),
                    "name": source
                }
            };
            result.push(agent);
            agentCode = "Organization";
        } else {
            agent = patient;
            agentCode = "Patient";
        }

        var provenance = {
            "resource": {
                "resourceType": "Provenance",
                "target": {
                    "reference": patient.resource.id
                },
                "agent": [{
                    "role": {
                        "code": "enterer",
                        "system": "http://hl7.org/fhir/ValueSet/provenance-agent-role",
                        "display": "Enterer"
                    },
                    "actor": { "reference": agent.resource.id }
                }]
            }
        };
        result.push(provenance);

    };

    return result;
};