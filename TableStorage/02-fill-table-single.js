var config = require('./config');
var colors = require('colors');
var uuid = require('uuid');

var azureStorage = require('azure-storage');
var azureTableStorage = azureStorage.createTableService(config.accountName, config.accountKey);
var generator = azureStorage.TableUtilities.entityGenerator;

var logsProperties = {
	logsDates: {
		start: new Date(2015, 0, 1),
		end: new Date(2015, 0, 10)
	},
	logsPerDay: {
		min: 50,
		max: 50
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

var timeStart = new Date();
var timeFinish = null;
var recordsTotal = 0;
var recordsInserted = 0;

var dateCurrent = logsProperties.logsDates.start;
while(dateCurrent <= logsProperties.logsDates.end) {
	console.info(dateCurrent.toDateString().white);
	
	var logsCount = logsProperties.getRandomInt(logsProperties.logsPerDay.min, logsProperties.logsPerDay.max);
	recordsTotal += logsCount;

	for (var i = 0; i < logsCount; i++) {
		var pk = dateCurrent.getFullYear() + '-' + dateCurrent.getMonth() + '-' + dateCurrent.getDate();
		var rk = uuid.v1();
		var category = logsProperties.getRandomLogCategory();
		
		var entity = {
			PartitionKey: generator.String(pk),
			RowKey: generator.String(rk),
			LogCategory: generator.String(category)
		};
		
		azureTableStorage.insertEntity(config.tableNameLog, entity, processInsert);
	}
	
	dateCurrent.setDate(dateCurrent.getDate() + 1);
}

function processInsert() {
	recordsInserted++;
	if (recordsInserted == recordsTotal) {
		timeFinish = new Date();
		
		var diff = timeFinish.getTime() - timeStart.getTime();
		var avg = diff / recordsInserted;
		
		console.info('time start:        ' + timeStart.toISOString().red);
		console.info('time finish:       ' + timeFinish.toISOString().red);
		console.info('records inserted:  ' + recordsInserted.toString().red);
		console.info('total time in ms:  ' + diff.toString().red);
		console.info('avg ms per record: ' + avg.toString().red);
	}
}