var request = require('request');
var moment = require('moment');
var loginData = require('./loginData');
var cheerio = require('cheerio');
var html = require('html-json');
var request = request.defaults({jar: true, followAllRedirects: true});

console.log("Login as " + loginData().user);
loginRedirection();

function loginRedirection() {
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
    formData.ctl00$ctl37$g_ec207ccd_5ede_48e9_83d9_a00a34ae4230$ctl00$tbUsername = loginData().user;
    formData.ctl00$ctl37$g_ec207ccd_5ede_48e9_83d9_a00a34ae4230$ctl00$tbPassword = loginData().password;
    request.post({url:loginURL, form: formData}, function(err, res, body) {
      if (err)
        throw err;
        var data = parsePostemobile(body);
        console.log(data);
        reloadData();
    });
  });
}

function reloadData() {
  startTime = new Date();
  request.head("https://www.postemobile.it/areapersonale/privati/Pagine/PM13/ReloadPersonalData.aspx?MSISDN=3337632778&RELOAD=2", function(error, res, body){
    if (error)
      throw err;
    request("https://www.postemobile.it/areapersonale/privati/Pagine/PM13/ReloadPersonalData.aspx?MSISDN=3337632778&RELOAD=3", function(error, res, body){
      if (error)
        throw err;
      var data = parseReloadPostemobile(body);
      console.log(data);

    })
  });
}

function parseReloadPostemobile(data){
  data="";
  return data;
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
        return $el.find("td").eq(3).html();
      },
      'total' : function($el) {
        return $el.find("td").eq(2).html();
      }
    }
  });

  var interval = {};
  interval.title = "Giorni";
  console.log(deadline);
  deadline = moment(deadline, "DD/MM/YYYY");
  interval.deadline = deadline.format();
  //console.log(interval.deadline.format());
  interval.startdate = deadline.add(30, "d").format();
  interval.days = "30";
  result.interval = interval;
  return result;
}
