var request = require('request');
var moment = require('moment');
var cheerio = require('cheerio');
var html = require('html-json');
var request = request.defaults({jar: true, followAllRedirects: true});

module.exports = function(loginData, callback){
	console.log("Start Login");
	if(loginData)
		loginPostemobile(loginData, callback);
	else
		console.log("No login data");
	return true;
}

function loginPostemobile(loginData, callback) {
	var loginURL = 'https://www.postemobile.it/areaprotetta/pagine/login.aspx?ReturnUrl=%2fareapersonale%2fPrivati%2f_layouts%2fAuthenticate.aspx%3fSource%3d%252Fareapersonale%252Fprivati%252FPagine%252FPM13%252FBonus%252Easpx&Source=%2Fareapersonale%2Fprivati%2FPagine%2FPM13%2FBonus%2Easpx';
	var bonusURL = "https://www.postemobile.it/areapersonale/privati/Pagine/PM13/Bonus.aspx";
	request.get(loginURL, function(err, res, body) {
		if (err)
			throw err;
		var $ = cheerio.load(body);
		var data = $("#aspnetForm").find('input');
		var form = '{'
			for(var i = 0; i < data.length; i++) {
				if (!data[i].attribs.value)
					data[i].attribs.value = "";
				form += ('"' + 
						data[i].attribs.name + '" : "' + 
						data[i].attribs.value + '"' +
						(i + 1 < data.length ? "," : ""));
			}
		form += '}';
		var formData = JSON.parse(form);
		formData.ctl00$ctl37$g_ec207ccd_5ede_48e9_83d9_a00a34ae4230$ctl00$tbUsername = loginData.user;
		formData.ctl00$ctl37$g_ec207ccd_5ede_48e9_83d9_a00a34ae4230$ctl00$tbPassword = loginData.password;
		request.post({url:loginURL, form: formData}, function(err, res, body) {
			if (err)
				throw err;
			var data = parsePostemobile(body);
			reloadData(data, callback);
		});
	});
}

function reloadData(data, callback) {
	startTime = new Date();
	request.head("https://www.postemobile.it/areapersonale/privati/Pagine/PM13/ReloadPersonalData.aspx?MSISDN=3337632778&RELOAD=2", function(error, res, body){
		if (error)
			throw err;
		request("https://www.postemobile.it/areapersonale/privati/Pagine/PM13/ReloadPersonalData.aspx?MSISDN=3337632778&RELOAD=3", function(error, res, body){
			if (error)
				throw err;
			var newData = parseReloadPostemobile(body);
			data.traffic = newData.traffic;
			data.credit = newData.credit;
			console.log(data);
			callback(data);
		})
	});
}

function parseReloadPostemobile(data){
	var result = {};
	var $ = cheerio.load(data);
	//console.log($('#bonuses_subcontent').find('span'));
	result.credit = $('#credit_subtitle').find('span').text();
	var bonuses = $('#bonuses_subcontent');
	var output = [];
	for (var i = 0; i < 3; i++) {
		var el = bonuses.find(".label_sotto").eq(i).find("span").eq(0).text();
		output[i] = {};
		output[i].total = bonuses.find(".label_sotto").eq(i).find("span").eq(1).text().replace(/[^\d]/g, "");
		output[i].remaining = bonuses.find(".max").eq(i).text().replace(/[^\d]/g, "");
		switch(el) {
			case "Voce": 
				output[i].title = "Minuti";
				break;
			case "SMS": 
				output[i].title = "Messaggi";
				break;
			case "Dati": 
				output[i].title = "Megabyte";
				break;
		}
	}
	result.traffic = output;
	return result;
}

function parsePostemobile(data) {
	var result = {};
	var deadline;
	var $ = cheerio.load(data);
	result.number = $("option").attr('value');

	function searchTitle(str){
		var title = "";
		if(str.match(/SMS/gi) !== null)
			title = "Messaggi";
		else if(str.match(/minuti/gi) !== null)
			title = "Minuti";
		else if(str.match(/MB/gi) !== null)
			title = "Megabyte";
		return title;
	}
	result.traffic = html(data).extract({
		'PARENT' : '.lu_tbl_data > tbody > tr',
		'LIST' : {
			'title' : function($el) {
				if(!deadline)
					deadline = $el.find("td").eq(4).html();
				return searchTitle($el.find("td").eq(3).html());
			},
			'remaining' : function($el) {
				return $el.find("td").eq(3).html().replace(/[^\d]/g, "");
			},
			'total' : function($el) {
				return $el.find("td").eq(2).html().replace(/[^\d]/g, "");
			}
		}
	});

	var interval = {};
	interval.title = "Giorni";
	deadline = moment(deadline, "DD/MM/YYYY");
	interval.deadline = deadline.format();
	//console.log(interval.deadline.format());
	interval.startdate = deadline.subtract(30, "d").format();
	interval.days = "30";
	result.interval = interval;
	return result;
}
