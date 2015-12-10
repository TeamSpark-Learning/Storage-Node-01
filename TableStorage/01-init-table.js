var config = require('./config');
var colors = require('colors');

var azureStorage = require('azure-storage');
var azureTableStorage = azureStorage.createTableService(config.accountName, config.accountKey);

console.info('delete table if exists'.white);

var interval = null;

azureTableStorage.deleteTableIfExists(config.tableNameLog, function(error, result, response) {
    if (error) {
		console.error(JSON.stringify(error).red);
	} else {
		if (result) {
			console.info('table was deleted'.yellow);
			interval = setInterval(function() {
    			createTable();
			}, 5000);
		} else {
			console.info('table not found'.yellow);
			createTable();
		}
	}
});

function createTable() {
	console.info('create table if no exists'.white);
	
	azureTableStorage.createTableIfNotExists(config.tableNameLog, function(error, result, response) {
		if (error) {
			console.error(JSON.stringify(error).red);
		} else {
			if (!!interval) {
				clearInterval(interval);
			}
			if (result) {
				console.info('table was created'.yellow);
			} else {
				console.error('some maagic shit happent'.red);
			}
		}
	});
}