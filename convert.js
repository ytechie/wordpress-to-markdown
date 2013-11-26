var xml2js = require('xml2js');
var fs = require('fs');
var util = require('util');
var toMarkdown = require('to-markdown');
var http = require('http');

processExport();

function processExport() {
	var parser = new xml2js.Parser();
	fs.readFile('export.xml', function(err, data) {
		if(err) {
			console.log('Error: ' + err);
		}

	    parser.parseString(data, function (err, result) {
	    	if(err) {
	    		console.log('Error parsing xml: ' + err);
	    	}
	    	console.log('Parsed XML');
	        //console.log(util.inspect(result.rss.channel));

	        var posts = result.rss.channel[0].item;

			
			fs.mkdir('out', function() {
		        for(var i = 0; i < posts.length; i++) {
	        		processPost(posts[i]);
		        	//console.log(util.inspect(posts[i]));
		        }
			});
	    });
	});
}

function processPost(post) {
	console.log('Processing Post');

	var postTitle = post.title;
	console.log('Post title: ' + postTitle);
	var postDate = new Date(post.pubDate);
	console.log('Post Date: ' + postDate);
	var postData = post['content:encoded'][0];
	console.log('Post length: ' + postData.length + ' bytes');
	var slug = post['wp:post_name'];
	console.log('Post slug: ' + slug);

	//Merge categories and tags into tags
	var categories = [];
	for(var i = 0; i < post.category.length; i++) {
		var cat = post.category[i]['_'];
		if(cat != "Uncategorized")
			categories.push(cat);
		//console.log('CATEGORY: ' + util.inspect(post.category[i]['_']));
	}

	var fullPath = 'out\\' + postDate.getFullYear() + '\\' + getPaddedMonthNumber(postDate.getMonth() + 1) + '\\' + slug;

	fs.mkdir('out\\' + postDate.getFullYear(), function() {
		fs.mkdir('out\\' + postDate.getFullYear() + '\\' + getPaddedMonthNumber(postDate.getMonth() + 1), function() {
			fs.mkdir(fullPath, function() {
				//Find all images
				var patt = new RegExp("(?:src=\"(.*?)\")", "gi");
				
				var m;
				var matches = [];
				while((m = patt.exec(postData)) !== null) {
					matches.push(m[1]);
					//console.log("Found: " + m[1]);
				}


				if(matches != null && matches.length > 0) {
					for(var i = 0; i < matches.length; i++) {
						//console.log('Post image found: ' + matches[i])

						var url = matches[i];
						var urlParts = matches[i].split('/');
						var imageName = urlParts[urlParts.length - 1];

						var filePath = fullPath + '\\' + imageName;

						downloadFile(url, filePath);

						//Make the image name local relative in the markdown
						postData = postData.replace(url, imageName);
						//console.log('Replacing ' + url + ' with ' + imageName);
					}
				}

				var markdown = toMarkdown.toMarkdown(postData);

				//Fix characters that markdown doesn't like
				// smart single quotes and apostrophe
    			markdown = markdown.replace(/[\u2018|\u2019|\u201A]/g, "\'");
    			// smart double quotes
    			markdown = markdown.replace(/&quot;/g, "\"");
    			markdown = markdown.replace(/[\u201C|\u201D|\u201E]/g, "\"");
				// ellipsis
				markdown = markdown.replace(/\u2026/g, "...");
				// dashes
				markdown = markdown.replace(/[\u2013|\u2014]/g, "-");
				// circumflex
				markdown = markdown.replace(/\u02C6/g, "^");
				// open angle bracket
				markdown = markdown.replace(/\u2039/g, "<");
				markdown = markdown.replace(/&lt;/g, "<");
				// close angle bracket
				markdown = markdown.replace(/\u203A/g, ">");
				markdown = markdown.replace(/&gt;/g, ">");
				// spaces
				markdown = markdown.replace(/[\u02DC|\u00A0]/g, " ");
				// ampersand
				markdown = markdown.replace(/&amp;/g, "&");

				var header = "";
				header += "---\n";
				header += "layout: post\n";
				header += "title: " + postTitle + "\n";
				header += "date: " + postDate.getFullYear() + '-' + getPaddedMonthNumber(postDate.getMonth() + 1) + '-' + getPaddedDayNumber(postDate.getDate()) + "\n";
				if(categories.length > 0)
					header += "tags: " + JSON.stringify(categories) + '\n';
				header += "---\n";
				header += "\n";

				fs.writeFile(fullPath + '\\index.html.md', header + markdown, function(err) {

				});
			});
		});		
	});
}

function downloadFile(url, path) {
	//console.log("Downloading " + url + " to " + path);

	var file = fs.createWriteStream(path).on('open', function() {
		var request = http.get(url, function(response) {
			//console.log("Response code: " + response.statusCode);
			response.pipe(file);
		}).on('error', function(err) {

		});
	}).on('error', function(err) {

	});
}

function getPaddedMonthNumber(month) {
	if(month < 10)
		return "0" + month;
	else
		return month;
}

function getPaddedDayNumber(day) {
	if(day < 10)
		return "0" + day;
	else
		return day;
}