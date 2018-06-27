const sinon = require('sinon');
var args = require('../src/args.js');

exports.setTestConfig = function() {
  var newConfig = args.getConfig();

  //Add some test values
  newConfig[1].locale = 'en-US';
  newConfig[1].pathDatabase = './test/test-resources/test-database.db';

  var stubConfig = sinon.stub(args, 'getConfig');
  stubConfig.returns([newConfig[0], newConfig[1]]);
}
