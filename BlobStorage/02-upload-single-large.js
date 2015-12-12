var config = require('./config');
var colors = require('colors');
var uuid = require('uuid');

var fs = require('fs');

var azureStorage = require('azure-storage');
var azureBlobStorage = azureStorage.createBlobService(config.accountName, config.accountKey);

var logsProperties = {
	fileName: 'log.txt',
	logsDates: {
		start: new Date(2015, 0, 1),
		end: new Date(2015, 11, 31)
	},
	logsPerDay: {
		min: 5000,
		max: 5000
	},
	logsCategories: ['critical', 'error', 'warning', 'info'],
	getRandomInt: function(min, max) {
		return Math.floor(Math.random() * (max - min + 1) + min);
	},
	getRandomLogCategory: function() {
		var i = logsProperties.getRandomInt(0, logsProperties.logsCategories.length - 1);
		return logsProperties.logsCategories[i];
	}
};

fs.unlink(logsProperties.fileName);

var dateCurrent = logsProperties.logsDates.start;
while(dateCurrent <= logsProperties.logsDates.end) {
	console.info(dateCurrent.toDateString().white);
	
	var logsCount = logsProperties.getRandomInt(logsProperties.logsPerDay.min, logsProperties.logsPerDay.max);

	for (var i = 0; i < logsCount; i++) {
		var logString = 
			'EventId: ' + uuid.v1() + '; ' +
			'Date: ' + dateCurrent.getFullYear() + '-' + dateCurrent.getMonth() + '-' + dateCurrent.getDate() + '; ' +
			'Category: ' + logsProperties.getRandomLogCategory() + ';' +
			'\n';
		
		fs.appendFileSync(logsProperties.fileName, logString);
	}
	
	dateCurrent.setDate(dateCurrent.getDate() + 1);
}

var timeStart = new Date();
var timeFinish = null;

var options = {
	parallelOperationThreadCount: 1
};

var summary = azureBlobStorage.createBlockBlobFromLocalFile(config.containerNameLog, logsProperties.fileName, logsProperties.fileName, options, function(error, result) {
	if (error) {
		throw error;
		process.exit();
	}
	
	timeFinish = new Date();
	
	var diff = timeFinish.getTime() - timeStart.getTime();
	var stat = fs.statSync(logsProperties.fileName);
	var sizeInMBytes = stat.size / 1024 / 1024;
	var avg = diff / sizeInMBytes;
	
	console.info('Mbytes uploaded:  ' + sizeInMBytes.toString().red);
	console.info('total time in ms: ' + diff.toString().red);
	console.info('avg ms per Mbyte: ' + avg.toString().red);
	console.info('avg speed:        ' + summary.getAverageSpeed());
});
