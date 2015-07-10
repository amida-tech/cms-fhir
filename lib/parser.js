//main file for CMS parser.

//var cmsObjConverter = require('./cmsObjConverter');
var streamToIntObj = require('./cmsTxtToIntObj').streamToIntObj;

//parses CMS BB text format into BB JSON

function parseCMS(fileString) {
    var intObj = txtToIntObj(fileString);

    //var result = cmsObjConverter.convertToBBModel(intObj);

    return result;

}

module.exports = {
    "parseCMS": parseCMS,
    "test": streamToIntObj,
    "CmsFile2Object": require('./cmsTxtToIntObj').CmsFile2Object
};
