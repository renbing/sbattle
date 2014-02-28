var mongodb = require('mongodb');
var redis   = require('redis');
var http    = require('http');
var util    = require('util');
var sys     = require('sys');
var fs      = require('fs');
var url     = require('url');
var qs      = require('querystring');
var zlib    = require('zlib');
var WebSocket = require('ws');

var common  = require('./common.js');
var csv     = require('./csv.js');
var config  = require(fs.existsSync('../config.js') ? '../config.js' : './config.js');

function loadConf() {
    global.gConfGlobal = new csv.GlobalCSV('conf/global.dat');
}

function loadDB(callback, poolSize) {
    poolSize = poolSize || 2;

    var mongoServer = null;
    if( config.MongodbSets ) {
        var servers = [];
        config.MongodbSets.forEach(function(serverConf){
            servers.push(new mongodb.Server(serverConf[0], serverConf[1],
                        {auto_reconnect:true, poolSize:poolSize}));
        });
        mongoServer = new mongodb.ReplSetServers(servers);
    }else{
        mongoServer = new mongodb.Server(config.MongodbHost, config.MongodbPort,
                        {auto_reconnect:true, poolSize:poolSize});
    }

    var db = new mongodb.Db(config.MongodbName, mongoServer, 
                    {'native_parser':true, 'w':1, 'wtimeout':10, 'fsync':false});
    db.open(function(err, db) {
        if( err ) {
            ERROR(err);
            process.exit(-1);
        }

        callback && callback(db);
    });
}

function loadCache(callback) {
    var client = redis.createClient(config.RedisPort, config.RedisHost);
    client.select(config.RedisId, function(err){
        if( err ) {
            ERROR(err);
            process.exit(-1);
        }
    });

    client.on('ready', function(){
        callback && callback(client);
    });

    client.on('error', function(e){
        ERROR(e);
    });
}

// 创建web服务器
function startWebServer(serverName, port, ip, handler, onExit) {
    var isExiting = false;
    var server = http.createServer(function(req, res) {
        if( isExiting ) {
            req.connection.destroy();
            return;
        }

        var body = '';
        req.on('data', function(chunk) {
            body += chunk;
            // POST请求不能超过100K
            if( body.length > 102400 ) {
                req.connection.destroy();
                return;
            }
        });

        req.on('end', function() {
            if( req.url == '/crossdomain.xml') {
                res.writeHead(200, common.defaultHeaders);
                res.end(common.defaultCrossDomain);
                return;
            }

            var rawData = '';
            if( req.method == 'POST' ) {
                rawData = body;
            }else{
                rawData = url.parse(req.url).query;
            }

            query = qs.parse(rawData);
            res._query = query;
            res._time = +(new Date());
            //res._compress = req.headers['accept-encoding'] || '';

            handleReq(query, res, handler);
        });

    });
    server.listen(port, ip);
    
    var pidFile = serverName + '.pid';
    process.on('SIGINT', beforExit);
    process.on('SIGTERM', beforExit);

    process.on('uncaughtException', function (err) {  
        ERROR(err.stack);    
    });

    function beforExit() {
        if( isExiting ) return;
        INFO(serverName + ' begin shutdown');
        isExiting = true;

        if( onExit ) {
            onExit(endExit);
        }else{
            endExit();
        }
    }

    function endExit() {
        fs.existsSync(pidFile) && fs.unlinkSync(pidFile);
        INFO(serverName + ' end shutdown');
        process.exit();
    }

    INFO(serverName + ' start');
    fs.writeFileSync(pidFile, process.pid, 'utf8');

    return server;
}

// 创建sock服务器
function startSockServer(serverName, port, ip, handler, onExit, onClose) {
    var isExiting = false;

    var wss = new WebSocket.Server({host:ip, port:port});
    wss.on('connection', function(sock){
        if( isExiting ) {
            sock.close();
            return;
        }
        sock.on('message', function(message){
            var req = {};
            try{
                req = JSON.parse(message);
            }catch(e){
                ERROR('invalid req ' + message);
            }

            handler(req, sock);
        });

        sock.on('close', function(){
            onClose && onClose(sock);
        });
    });

    wss.on('error', function(err){
        ERROR('game listen fail:'+err);
        process.exit(-1);
    });


    var pidFile = serverName + '.pid';
    process.on('SIGINT', beforExit);
    process.on('SIGTERM', beforExit);

    process.on('uncaughtException', function (err) {  
        ERROR(err.stack);    
    });

    function beforExit() {
        if( isExiting ) return;
        INFO(serverName + ' begin shutdown');
        isExiting = true;

        if( onExit ) {
            onExit(endExit);
        }else{
            endExit();
        }
    }

    function endExit() {
        fs.existsSync(pidFile) && fs.unlinkSync(pidFile);
        INFO(serverName + ' end shutdown');
        process.exit();
    }

    INFO(serverName + ' start');
    fs.writeFileSync(pidFile, process.pid, 'utf8');

    return wss;
}

global.onSockHandled = function(res, data, isCompress, query, time) {
    var strData = JSON.stringify(data)
    
    if( isCompress && !config.NotGzip && strData.length > 1024 ) {
        zlib.gzip(strData, function(err, buf){
            res.send(buf);
        });
    }else{
        res.send(strData);
    }
    
    if( query ) {
        var timeCost = +(new Date()) - time;
        LOG(util.format('%s %s %s %s %j %d %d %s', query.uid, query.mod, query.act,
                        query.seq||0, query.args, timeCost, data.code, data.desc || ''));
    }
}

global.onHttpHandled = function(res, data) {
    res.writeHead(200, common.defaultHeaders);
    res.end(JSON.stringify(data));
}

exports.loadDB = loadDB;
exports.loadCache = loadCache;
exports.loadConf = loadConf;
exports.startWebServer = startWebServer;
exports.startSockServer = startSockServer
