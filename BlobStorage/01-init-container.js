var config = require('./config');
var colors = require('colors');

var azureStorage = require('azure-storage');
var azureBlobStorage = azureStorage.createBlobService(config.accountName, config.accountKey);

console.info('delete container if exists'.white);

var interval = null;

azureBlobStorage.deleteContainerIfExists(config.containerNameLog, function(error, result, response) {
    if (error) {
		console.error(JSON.stringify(error).red);
	} else {
		if (result) {
			console.info('container was deleted'.yellow);
			interval = setInterval(function() {
    			createContainer();
			}, 5000);
		} else {
			console.info('container not found'.yellow);
			createContainer();
		}
	}
});

function createContainer() {
	console.info('create container if no exists'.white);
	
	azureBlobStorage.createContainerIfNotExists(config.containerNameLog, function(error, result, response) {
		if (error) {
			console.error(JSON.stringify(error).red);
		} else {
			if (!!interval) {
				clearInterval(interval);
			}
			if (result) {
				console.info('container was created'.yellow);
			} else {
				console.error('some maagic shit happent'.red);
			}
		}
	});
}