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

var timeStart = new Date();
var timeFinish = null;
var recordsTotal = 0;
var recordsInserted = 0;

var dateCurrent = logsProperties.logsDates.start;
while(dateCurrent <= logsProperties.logsDates.end) {
	console.info(dateCurrent.toDateString().white);
	
	var logsCount = logsProperties.getRandomInt(logsProperties.logsPerDay.min, logsProperties.logsPerDay.max);
	recordsTotal += logsCount;
	
	var batch = new azureStorage.TableBatch();
	
	for (var i = 0; i < logsCount; i++) {
		var pk = dateCurrent.getFullYear() + '-' + dateCurrent.getMonth() + '-' + dateCurrent.getDate();
		var rk = uuid.v1();
		var category = logsProperties.getRandomLogCategory();
		
		var entity = {
			PartitionKey: generator.String(pk),
			RowKey: generator.String(rk),
			LogCategory: generator.String(category)
		};
		
		batch.insertEntity(entity);
		
		if (batch.size() == 100) {
			executeBatch(batch);
			batch = new azureStorage.TableBatch();
		}
	}
	
	executeBatch(batch);
	
	dateCurrent.setDate(dateCurrent.getDate() + 1);
}

function executeBatch(batch) {
	var size = batch.size();
	
	console.info('inserting batch of ' + size);
	azureTableStorage.executeBatch(config.tableNameLog, batch, function(error, result, response) {
		processBatch(size);
	});
}

function processBatch(size) {
	recordsInserted += size;
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