var config = require('./config');
var colors = require('colors');

var azureStorage = require('azure-storage');
var azureTableStorage = azureStorage.createTableService(config.accountName, config.accountKey);

var timeStart = new Date();
var timeFinish = null;
var recordsSelected = 0;
var queriesCountData = 0;
var queriesCountPartition = 0;
var partitionsCount = 0;

function getPartition(partitionId, continuationToken) {
	queriesCountData++;
	
	var filter = azureStorage.TableQuery.stringFilter('PartitionKey', azureStorage.TableUtilities.QueryComparisons.EQUAL, partitionId);
	var query = new azureStorage.TableQuery().where(filter);
	azureTableStorage.queryEntities(config.tableNameLog, query, continuationToken, function(error, result) {
		if (!!error) {
			console.error(error.toString().red);
		} else {
			recordsSelected += result.entries.length;
			
			if (!!result.continuationToken) {
				var partitionKey = result.entries[0].PartitionKey._;
				getPartition(partitionKey, result.continuationToken);
			} else {
				partitionsCount--;
			}
			
			if (partitionsCount == 0) {
				timeFinish = new Date();
		
				var diff = timeFinish.getTime() - timeStart.getTime();
				var avg = diff / recordsSelected;
				
				console.info('time start:              ' + timeStart.toISOString().red);
				console.info('time finish:             ' + timeFinish.toISOString().red);
				console.info('records selected:        ' + recordsSelected.toString().red);
				console.info('queries count partition: ' + queriesCountPartition.toString().red);
				console.info('queries count data:      ' + queriesCountData.toString().red);
				console.info('total time in ms:        ' + diff.toString().red);
				console.info('avg ms per record:       ' + avg.toString().red);
			}
		}
	});
}

function getNextPartition(currentPartitionId, callback) {
	var query = new azureStorage.TableQuery().top(1).select('PartitionKey');
	queriesCountPartition++;
	
	if (!!currentPartitionId) {
		var filter = azureStorage.TableQuery.stringFilter('PartitionKey', azureStorage.TableUtilities.QueryComparisons.GREATER_THAN, currentPartitionId);
		query = query.where(filter);
	}
	
	azureTableStorage.queryEntities(config.tableNameLog, query, null, function(error, result) {
		if (!!error) {
			console.error(error.toString().red);
		} else {
			if (result.entries.length > 0) {
				partitionsCount++;
				
				var partitionKey = result.entries[0].PartitionKey._;
				callback(partitionKey);
			} else {
				callback(null);
			}
		}
	});
}

function getAllMulti(currentPartitionId) {	
	getNextPartition(currentPartitionId, function(nextPartitionId) {
		if (!!nextPartitionId) {
			getPartition(nextPartitionId, null);
			getAllMulti(nextPartitionId);
		}
	});
}

getAllMulti('2015-11-25');