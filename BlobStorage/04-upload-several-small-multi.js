var config = require('./config');
var colors = require('colors');
var uuid = require('uuid');

var fs = require('fs');
var byline = require('byline');

var azureStorage = require('azure-storage');
var azureBlobStorage = azureStorage.createBlobService(config.accountName, config.accountKey);

var logsProperties = {
	fileNamePattern: 'log{0}.txt',
	linesPerBlock: 100,
	logsDates: {
		start: new Date(2015, 0, 1),
		end: new Date(2015, 0, 31)
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

var files = [];
var stats = [];

var dateCurrent = logsProperties.logsDates.start;
while(dateCurrent <= logsProperties.logsDates.end) {
	console.info(dateCurrent.toDateString().white);
	
	var date = dateCurrent.getFullYear() + '-' + dateCurrent.getMonth() + '-' + dateCurrent.getDate();
	var fileName = logsProperties.fileNamePattern.replace('{0}', date);
	files.push(fileName);
	
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
	
	stats.push(fs.statSync(fileName));
	
	dateCurrent.setDate(dateCurrent.getDate() + 1);
}

var timeStart = new Date();
var timeFinish = null;

var options = {
	parallelOperationThreadCount: 1
};

var uploadInfo = [];
var totalUploaded = 0;

while(files.length > 0) {
	var fileName = files.pop();
	
	var stream = fs.createReadStream(fileName);
	stream = byline.createStream(stream);
	
	var blobInfo = {
		fileName: fileName,
		blocks: [],
		totalBlocks: null
	};
	
	var totalBlocks = 0;
	stream.on('readable', function() {
		var lines = [];
		var line;
		while (null !== (line = stream.read())) {
			lines.push(line);
			if (lines.length == logsProperties.linesPerBlock) {
				totalBlocks++;
				var blockId = uuid.v1();
				blobInfo.blocks.push(blockId);
				uploadBlock(fileName, blockId, lines);
				lines = [];
			}
		}
		if (lines.length > 0) {
			totalBlocks++;
			var blockId = uuid.v1();
			blobInfo.blocks.push(blockId);
			uploadBlock(fileName, blockId, lines);
		}
	});
	
	blobInfo.totalBlocks = totalBlocks;
	
	uploadInfo[fileName] = blobInfo;
}

function uploadBlock(blobName, blockId, lines) {
	var name = blobName;
	var id = blockId;
	
	azureBlobStorage.createBlockFromText(id, config.containerNameLog, name, lines.join('\n'), options, function(error, response) {
		if (!!error) {
			console.error(JSON.stringify(error).red);
			process.exit();
		}
		
		var blobInfo = uploadInfo[name];
		blobInfo.totalBlocks--;
		
		if (blobInfo.totalBlocks == 0) {
			azureBlobStorage.commitBlocks(config.containerNameLog, name, blobInfo.blocks, options, function(error, response) {
				if (!!error) {
					console.error(JSON.stringify(error).red);
					process.exit();
				}
				
				totalUploaded++;
				if (totalUploaded == uploadInfo.length) {
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
	});
}