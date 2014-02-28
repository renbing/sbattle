var crypto  = require('crypto');
var http    = require('http');

Array.prototype.sum = function() {
    var total = 0;
    for(var i=0; i<this.length; i++) {
        if( !isNaN(this[i]) ) {
            total += +this[i];
        }
    }

    return total;
}

Array.prototype.remove = function(item) {
    var index = this.indexOf(item);

    if( index >= 0){
        this.splice(index, 1);
    }
}

String.prototype.startWith = function(prefix) {
    if( !prefix || !this.length || this[0] != prefix[0] ) return false;
    return (this.substr(0, prefix.length) == prefix);
}

String.prototype.endWith = function(suffix) {
    if( !suffix || !this.length || suffix.length > this.length) return false;
    return (this.substr(this.length - suffix.length) == suffix);
}

String.prototype.format = function() {
    var args = arguments;
    return this.replace(/\{(\d+)\}/g, function(m,i){
        return args[i];
    });
}

String.prototype.capWord = function() {
    return this.substr(0,1).toUpperCase() + this.substr(1);
}

Date.prototype.format = function(fmt)   {
    var o = {   
        'M+' : this.getMonth()+1,                 //月份   
        'd+' : this.getDate(),                    //日   
        'h+' : this.getHours(),                   //小时   
        'm+' : this.getMinutes(),                 //分   
        's+' : this.getSeconds(),                 //秒   
        'q+' : Math.floor((this.getMonth()+3)/3), //季度   
        'S'  : this.getMilliseconds()             //毫秒   
    };   
    if(/(y+)/.test(fmt)) {
        fmt=fmt.replace(RegExp.$1, (this.getFullYear()+'').substr(4 - RegExp.$1.length));   
    }
    for(var k in o) {
        if(new RegExp('('+ k +')').test(fmt)) {
            fmt = fmt.replace(RegExp.$1, (RegExp.$1.length==1) ? 
                    (o[k]) : (('00'+ o[k]).substr((''+ o[k]).length)));   
        }
    }
    return fmt;   
} 

global.List = function(obj) {
    this.obj = obj;
    this.next = null;
}

global.LOG = function(content) {
/*
    var args = Array.prototype.slice.call(arguments);
    args.splice(0, 0, (new Date()).format('[yyyy-MM-dd hh:mm:ss] INFO: '));
    console.log.apply(console, args);
*/
    console.log((new Date()).format('[yyyy-MM-dd hh:mm:ss] '), content);
};

global.ERROR = function(content) {
    console.error((new Date()).format('[yyyy-MM-dd hh:mm:ss] ERROR '), content);
};
global.INFO = function(content) {
    console.error((new Date()).format('[yyyy-MM-dd hh:mm:ss] INFO '), content);
};

function getTime() {
    return Math.round(+(new Date()) / 1000);
}

function getDate() {
    var now = new Date();
    return now.getFullYear() * 10000 + (now.getMonth()+1) * 100 + now.getDate();
}

function getDateString() {
    // 返回当前日期的字符串,eg:"2013-01-01"
    return (new Date).format('yyyy-MM-dd');
}

function getDayPassed(date1) {
    // 获取当前时间距离date1经过的天数[date1, now], date1(秒|2013-01-01|2013-01-01 00:00:00)
    // now >= date1
    if( isNaN(date1) ) {
        if( date1.length > 10 ) {
            date1 = date1.substr(0, 10);
        }
        date1 = new Date(date1 + ' 00:00:00');
    }else{
        date1 = new Date(date1 * 1000);
    }

    date1.setHours(0);
    date1.setMinutes(0);
    date1.setSeconds(0);

    return Math.ceil((new Date() - date1)/1000/86400);
}

function getDayDiff(date1,date2) {
    // 返回两个日期"2013-01-01"00时00秒之间的天数
    var dateTime1 = Math.floor(Date.parse(date1));
    var dateTime2 = Math.floor(Date.parse(date2));
    return Math.floor(Math.abs((dateTime2 -dateTime1)/1000/60/60/24));
}

function isDayDiffContinue(day1,day2) {
    // 判断day1 和 day2 是否连续 day1 eg:20130101整数
    var date1 = day1.toString();   
    var date2 = day2.toString();
    date1 = date1.slice(0, 4) + '-' + date1.slice(4, 6) + '-' + date1.slice(6);
    date2 = date2.slice(0, 4) + '-' + date2.slice(4, 6) + '-' + date2.slice(6);

    var dateTime1 = Math.floor(Date.parse(date1));
    var dateTime2 = Math.floor(Date.parse(date2));
    
    return ( Math.floor(Math.abs((dateTime2 -dateTime1)/1000/60/60/24)) <= 1 ) ? 1 : 0;
}

function wRand(weights) {
    var total = 0;
    for( var key in weights ) {
        total += weights[key];
    }

    var rand = Math.random() * total;
    var offset = 0;
    for( var key in weights ) {
        offset += weights[key];
        if( rand <= offset ) {
            return key;
        }
    }

    return null;
}

// [from, to]
function randRange(from, to) {
    return from + Math.floor(Math.random() * (to - from + 1));  
}

function randArray(arr) {
    return arr[randRange(0, arr.length-1)];
}

var authKey = 'Keep it simple stupid';
function genAuth(uid){
    var now = getTime();
    var md5 = crypto.createHmac('sha1', authKey);
    var rawKey = uid + '-' + now;

    var key = md5.update(rawKey).digest('base64').substring(0, 10);
    return {'key':key, 'time':now};
}

function verifyAuth(uid, key, time) {
    var now = getTime();
    var md5 = crypto.createHmac('sha1', authKey);
    var rawKey = uid + '-' + time;

    if( key != md5.update(rawKey).digest('base64').substring(0, 10) ) {
        return false;
    }

    if( now < time || (now - time) >= 7202 ) {
        return false;
    }

    return true;
}

function verifyGatewayAuth(openid, key) {
    var md5 = crypto.createHmac('sha1', authKey);
    return key == md5.update(openid, 'utf8').digest('base64').substring(0, 10);
}

function verifyWordFilter(content, key) {
    var md5 = crypto.createHmac('sha1', authKey);
    return key == md5.update(content, 'utf8').digest('base64').substring(0, 10);
}

function httpGet(url, callback, json){
    http.get(url, function(res){
        var chunks = [];
        res.on('data', function(chunk){
            chunks.push(chunk);
        });

        res.on('end', function(){
            var data = Buffer.concat(chunks).toString();
            if( json ) {
                try{
                    data = JSON.parse(data);
                }catch(e){
                    data = null;
                }
            }
            callback && callback(data);
        });
    }).on('error', function(e){
        if( json ) {
            callback && callback(null);
        }else{
            callback && callback('error');
        }
    });
}

function Loader(onAllLoad){
    this.tasks = [];
    this.onAllLoad = onAllLoad;
}

Loader.prototype = {
    addLoad : function(task){
        this.tasks.push(task);
    },

    onLoad : function(task){
        var index = this.tasks.indexOf(task);
        if( index >= 0 ) {
            this.tasks.splice(index, 1);
            if( this.tasks.length == 0 ) {
                this.onAllLoad && this.onAllLoad();
            }
        }
    },
};

exports.getTime = getTime;
exports.getDate = getDate;
exports.wRand = wRand;
exports.randRange = randRange;
exports.randArray = randArray;

exports.defaultHeaders = {
    'Content-Type': 'text/plain;charset=utf-8', 
    'Connection': 'close'
};
exports.gzipHeaders = {
    'Content-Type': 'text/plain;charset=utf-8', 
    'Connection': 'close',
    'Content-Encoding': 'gzip'
};
exports.htmlHeaders = {
    'Content-Type': 'text/html;charset=utf-8',
    'Connection': 'close'
};
exports.defaultCrossDomain = '<cross-domain-policy><allow-access-from domain="*" secure="true" /></cross-domain-policy>';

exports.authKey = authKey;
exports.genAuth = genAuth;
exports.verifyAuth = verifyAuth;
exports.verifyGatewayAuth = verifyGatewayAuth;
exports.verifyWordFilter = verifyWordFilter;
exports.httpGet = httpGet;
exports.getDateString = getDateString;
exports.getDayDiff = getDayDiff;
exports.Loader = Loader;
exports.isDayDiffContinue = isDayDiffContinue;
exports.getDayPassed = getDayPassed;
