var config = require('./config');
var colors = require('colors');

var azureStorage = require('azure-storage');
var azureTableStorage = azureStorage.createTableService(config.accountName, config.accountKey);

var timeStart = new Date();
var timeFinish = null;
var recordsSelected = 0;
var queriesCount = 0;

var partitionId = '2015-0-1';

function getPartition() {
	var filter = azureStorage.TableQuery.stringFilter('PartitionKey', azureStorage.TableUtilities.QueryComparisons.EQUAL, partitionId);
	var query = new azureStorage.TableQuery().where(filter);
	azureTableStorage.queryEntities(config.tableNameLog, query, null, queryEntitiesCallback);
}

function queryEntitiesCallback(error, result) {
	if (!error) {
		recordsSelected += result.entries.length;
		queriesCount++;
		
		if (!!result.continuationToken) {
			var filter = azureStorage.TableQuery.stringFilter('PartitionKey', azureStorage.TableUtilities.QueryComparisons.EQUAL, partitionId);
			var query = new azureStorage.TableQuery().where(filter);
			azureTableStorage.queryEntities(config.tableNameLog, query, result.continuationToken, queryEntitiesCallback);
		} else {
			timeFinish = new Date();
		
			var diff = timeFinish.getTime() - timeStart.getTime();
			var avg = diff / recordsSelected;
			
			console.info('time start:        ' + timeStart.toISOString().red);
			console.info('time finish:       ' + timeFinish.toISOString().red);
			console.info('records selected:  ' + recordsSelected.toString().red);
			console.info('queries count:     ' + queriesCount.toString().red);
			console.info('total time in ms:  ' + diff.toString().red);
			console.info('avg ms per record: ' + avg.toString().red);
		}
	} else {
		console.error(error.toString().red);
	}
}

getPartition();