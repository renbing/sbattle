/*
    World服务器  
*/

global.clone    = require('clone');
global.http     = require('http');
global.util     = require('util');
global.common   = require('./common.js');

var WebSocket   = require('ws');
var server  = require('./server.js');

global.config   = require(require('fs').existsSync('../config.js') ? '../config.js' : './config.js');
global.gCode    = require('./code.js');

// 数据库,缓存
global.gDBUser = null;
global.gDBWorld = null;
global.gCache = null;

// World对象
global.gWorld2Game = null;
global.gMessage = null;

(function main(){

    server.loadCache(function(cache){
        global.gCache = cache;
        INFO('redis connected');
    });

    server.loadConf();
    server.loadDB(function(db){
        // 启动Game服务器

        INFO('mongodb connected');
        global.gDBUser = db.collection('user');
        global.gDBWorld = db.collection('world');

        var Message = require('./world/message.js').Message;
        global.gMessage = new Message();

        var World2Game = require('./world/game.js').World2Game;
        global.gWorld2Game = new World2Game();

        loadWorld(startWorld);

    }, 5);
})();

function startWorld() {
    var serverName = 'world';
    var port = config.WorldListen;
    var logic = require('./world/');

    var wserver = server.startSockServer(serverName, config.WorldListen, config.WorldHost, function(query, res, resp){
        var resp = {
            'uid': query.uid,
            'code': gCode.OK, 
            'mod': query.mod, 
            'act': query.act, 
            'data': {}
        };

        do {
            var logicHandler = null;
            var module = logic[query.mod];

            if( module ) {
                logicHandler = module[query.act];
            }

            if( !logicHandler ) {
                resp.code = gCode.ERROR;
                resp.desc = 'act ' + query.act + ' not support in mod ' + query.mod;
                break;
            }
            logicHandler(query, function(){
                onSockHandled(res, resp);
            }, res);
        }while(false);

        onSockHandled(res, resp);
    }, function(callback) {
        // 退出处理
        var forceSave = true;
        var loader = new common.Loader(callback);
        loader.addLoad('empty');    // 防止没有需要Load的时候不结束
        
        loader.onLoad('empty');
    }, function(res){
        gWorld2Game.close(res);
    });
}

function loadWorld(callback) {
    var loader = new common.Loader(callback);

    loader.addLoad('empty');
    loader.onLoad('empty');
}
