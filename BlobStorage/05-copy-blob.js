var config = require('./config');
var colors = require('colors');

var azureStorage = require('azure-storage');
var azureBlobStorage = azureStorage.createBlobService(config.accountName, config.accountKey);

var url = '';
var targetContainer = 'vhds';
var targetBlob = 'copy.vhd';

var options = {};

azureBlobStorage.deleteBlobIfExists(targetContainer, targetBlob, options, function(error, response) {
	if (error) {
		console.log(JSON.stringify(error).red);
		process.exit();
	}
	
	var timeStart = new Date();
	var timeFinish = null;
	
	azureBlobStorage.startCopyBlob(url, targetContainer, targetBlob, options, function(error, response) {
		if (error) {
			console.log(JSON.stringify(error).red);
			process.exit();
		}
		
		checkCopyDone();
	});
	
	function checkCopyDone() {
		azureBlobStorage.doesBlobExist(targetContainer, targetBlob, options, function(error, response) {
			if (error) {
				console.log(JSON.stringify(error).red);
				process.exit();
			}
			
			if (response) {
				timeFinish = new Date();
				
				var diff = timeFinish.getTime() - timeStart.getTime();
				var sizeInMBytes = 127000;
				var avg = diff / sizeInMBytes;
				
				console.info('Mbytes uploaded:  ' + sizeInMBytes.toString().red);
				console.info('total time in ms: ' + diff.toString().red);
				console.info('avg ms per Mbyte: ' + avg.toString().red);
			} else {
				setTimeout(checkCopyDone, 1000);
			}
		})
	}
});