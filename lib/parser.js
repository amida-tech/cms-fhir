//main file for CMS parser.

//var cmsObjConverter = require('./cmsObjConverter');
var streamToIntObj = require('./cmsTxtToIntObj').streamToIntObj;

module.exports = {
    "CmsFile2Object": require('./cmsTxtToIntObj').CmsFile2Object
};
