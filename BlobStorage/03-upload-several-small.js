var config = require('./config');
var colors = require('colors');
var uuid = require('uuid');

var fs = require('fs');

var azureStorage = require('azure-storage');
var azureBlobStorage = azureStorage.createBlobService(config.accountName, config.accountKey);

var logsProperties = {
	fileNamePattern: 'log{0}.txt',
	logsDates: {
		start: new Date(2015, 0, 1),
		end: new Date(2015, 11, 31)
	},
	logsPerDay: {
		min: 500,
		max: 500
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

var files = [];
var stats = [];

var dateCurrent = logsProperties.logsDates.start;
while(dateCurrent <= logsProperties.logsDates.end) {
	console.info(dateCurrent.toDateString().white);
	
	var date = dateCurrent.getFullYear() + '-' + dateCurrent.getMonth() + '-' + dateCurrent.getDate();
	var fileName = logsProperties.fileNamePattern.replace('{0}', date);
	files.push(fileName);
	stats.push(fs.statSync(logsProperties.fileName));
	
	fs.unlink(fileName);
	
	var logsCount = logsProperties.getRandomInt(logsProperties.logsPerDay.min, logsProperties.logsPerDay.max);

	for (var i = 0; i < logsCount; i++) {
		var logString = 
			'EventId: ' + uuid.v1() + '; ' +
			'Date: ' + date + '; ' +
			'Category: ' + logsProperties.getRandomLogCategory() + ';' +
			'\n';
		
		fs.appendFileSync(fileName, logString);
	}
	
	dateCurrent.setDate(dateCurrent.getDate() + 1);
}

var timeStart = new Date();
var timeFinish = null;
var totalUploaded = 0;

var options = {
	parallelOperationThreadCount: 1
};

while(files.length > 0) {
	var fileName = files.pop();
	azureBlobStorage.createBlockBlobFromLocalFile(config.containerNameLog, fileName, fileName, options, function(error, result) {
		if (error) {
			throw error;
			process.exit();
		}
		
		totalUploaded++;
		if (totalUploaded == stats.length) {
			timeFinish = new Date();
			
			var diff = timeFinish.getTime() - timeStart.getTime();
			
			var sizeInMBytes = 0;
			stats.forEach(function(stat) {
				sizeInMBytes += stat.size;
			});
			sizeInMBytes = sizeInMBytes / 1024 / 1024;
			
			var avg = diff / sizeInMBytes;
			
			console.info('total files uploaded:  ' + stats.length.toString().red);
			console.info('total Mbytes uploaded: ' + sizeInMBytes.toString().red);
			console.info('total time in ms:      ' + diff.toString().red);
			console.info('avg ms per Mbyte:      ' + avg.toString().red);
		}
	});
}