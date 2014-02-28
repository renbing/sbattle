/*
    Game服务器  
    Debug模式: node game.js debugger 
    Game模式:  node game.js serverId(1-GameCount)
*/

global.clone    = require('clone');
global.http     = require('http');
global.util     = require('util');
global.common   = require('./common.js');

var WebSocket   = require('ws');
var server  = require('./server.js');

global.config   = require(require('fs').existsSync('../config.js') ? '../config.js' : './config.js');
global.Player   = require('./logic/player.js').Player;
global.gCode    = require('./code.js');

// 数据库,缓存
global.gDBUser = null;
global.gCache = null;

global.gPlayers = null;
global.gServerStartTime = common.getTime();

global.gGameId = (process.argv[2] || 1);
global.gServerId = config.GameGroupId * 100 + gGameId;

// 连接至Gateway,World
global.gGateway = null;
global.gWorld = null;

(function main(){
    // Debug 模式
    var isDebug = false;
    if( process.argv.indexOf('debugger') > 0 ) {
        isDebug = true;
    }

    server.loadCache(function(cache){
        global.gCache = cache;
        INFO('redis connected');
    });

    server.loadConf();
    server.loadDB(function(db){
        // 启动Game服务器

        INFO('mongodb connected');
        global.gDBUser = db.collection('user');

        var PlayerManager   = require('./logic/player.js').PlayerManager;
        global.gPlayers = new PlayerManager();
        
        if( isDebug ) {
            require('./debug.js').Debug();
            return;
        }

        connectGatewayWorld();
        startGame();

    }, 5);
})();

function startGame() {
    var serverName = 'game' + gServerId;
    var port = config.GameListen + gGameId;
    var logic = require('./logic/');

    var wserver = server.startSockServer(serverName, port, '0.0.0.0', function(query, res, resp){
        var resp = {
            'code': gCode.OK, 
            'mod': query.mod, 
            'act': query.act, 
            'args': query.args,
            'data': {}
        };

        do {
            if( isNaN(query.uid) ) {
                resp.code = gCode.ERROR; resp.desc = 'no uid'; break;
            }else if( !query.mod ) {
                resp.code = gCode.ERROR; resp.desc = 'no mod'; break;
            }else if( !query.act ) {
                resp.code = gCode.ERROR; resp.desc = 'no act'; break;
            }else if( !query.args ) {
                resp.code = gCode.ERROR; resp.desc = 'no args'; break;
            }

            query.uid = parseInt(query.uid);

            if( !query.auth_key || !query.auth_time ) {
                resp.code = gCode.ERROR; resp.desc = 'no auth_key, auth_time'; break;
            }

            if( !common.verifyAuth(util.format('%d-%d', query.uid, gServerId), query.auth_key, query.auth_time) ) {
                resp.code = gCode.ERROR; resp.desc = 'auth fail'; break;
            }
            
            if( isNaN(query.auth_time) || parseInt(query.auth_time) < gServerStartTime ) {
                resp.code = gCode.ERROR; resp.desc = 'auth timeout'; break;
            }

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
            if( (query.mod == 'user' && query.act == 'login') && gPlayers.gmLogin(query.uid) ) {
                resp.code = gCode.GM_LOGIN; break;
            }

        }while(false);

        if( resp.code != 0 ) {
            onSockHandled(res, resp);
            return;
        }
        
        if( query.mod == 'user' && query.act == 'login' ) {
            // 登录
            gPlayers.load(query.uid, function(player, oldPlayer){
                if( player ) {
                    if( query.gmkey ) {
                        player.gmkey = query.gmkey;
                        INFO('gm login:' + query.uid);
                    }else{
                        INFO('player login:' + query.uid);
                    }

                    gPlayers.login(res, player, oldPlayer);
                    handleGameReq(logicHandler, player, query, resp);
                }else{
                    resp.code = gCode.ERROR; resp.desc = 'not login';
                    onSockHandled(res, resp);
                }
            });
        }else{
            var player = gPlayers.get(query.uid);
            if( player ) {
                handleGameReq(logicHandler, player, query, resp);
            }else{
                resp.code = gCode.ERROR; resp.desc = 'not login';
                onSockHandled(res, resp);
            }
        }
    }, function(callback) {
        // 退出处理
        var forceSave = true;
        var loader = new common.Loader(callback);
        loader.addLoad('empty');    // 防止没有需要Load的时候不结束
        
        // 保存用户数据
        var players = gPlayers.players;
        for(var uid in players ) {
            var player = players[uid];
            loader.addLoad(player.uid);

            player.save(forceSave, function(){
                loader.onLoad(this.uid);
            }.bind(player));
        }
        
        loader.onLoad('empty');
    }, function(res){
        gPlayers.logout(res);
    });
}

function connectGatewayWorld() {
    // 连接Gateway,World

    var gatewayHandler = require('./logic/gateway.js');
    var worldHandler = require('./logic/world.js');

    global.gGateway = new WebSocket(util.format('ws://%s:%d/', config.GatewayHost, config.GatewayGameListen));
    gGateway.on('open', function(){
        var addr = util.format('ws://%s:%d/', config.GameHost, config.GameListen + gGameId);
        onSockHandled(gGateway, {act:'connect', args:{id: gServerId, addr:addr}});
    });

    gGateway.on('close', function(){
        INFO(util.format('game%d to gateway close', gGameId));
        process.kill(process.pid, 'SIGINT');
    });

    gGateway.on('message', function(message){
        var query = {};
        try{
            query = JSON.parse(message);
        }catch(e){
            ERROR('gateway2game '+message);
        }
        var handler = gatewayHandler[query.act];
        if( !handler) {
            ERROR('gateway2game act ' + query.act);
        }else{
            handler(query);
        }
    });

    gGateway.on('error', function(err){
        ERROR('game2gateway ' + err);
        if( err && err.code == 'ECONNREFUSED' ) {
            process.exit(-1); 
        }
    });
    
    global.gWorld = new WebSocket(util.format('ws://%s:%d/', config.WorldHost, config.WorldListen));
    gWorld.on('open', function(){
        onSockHandled(gWorld, {mod:'game', act:'connect', args:{id: gServerId}});
    });

    gWorld.on('close', function(){
        INFO(util.format('game%d to world close', gGameId));
        process.kill(process.pid, 'SIGINT');
    });

    gWorld.on('message', function(message){
        var query = {};
        try{
            query = JSON.parse(message);
        }catch(e){
            ERROR('world2game '+message);
        }

        var handler = worldHandler[query.act];
        if( !handler ) {
            ERROR('world2game act ' + query.act);
        }else{
            handler(query);
        }
    });

    gWorld.on('error', function(err){
        ERROR('game2world ' + err);
        if( err && err.code == 'ECONNREFUSED' ) {
            process.exit(-1); 
        }
    });

    /* 心跳
    setInterval(function(){
        onSockHandled(gGateway, {act:'heartbeat'});
    }, 1000*5);
    */
}

function handleGameReq(logicHandler, player, query, resp) {
    if( player.saveError ) {
        gPlayers.unload(player.uid);
        resp.code = gCode.ERROR; resp.desc = 'last save error';
        onSockHandled(player.sock, resp);
    }else if( player.lock ) {
        resp.code = gCode.ERROR; resp.desc = 'lock';
    }else{
        var now = common.getTime();
        var time = +new Date();

        player.lastActive = now;
        player.lock = true;

        logicHandler(player, query, resp, function(){
            player.lock = false;
            if( resp.code != 0 ) {
                player.cleanDirty();
            }else{
                var forceSave = false;
                if( query.mod == 'gm' ) {
                    forceSave = true;
                }

                player.save(forceSave);
            }

            resp.data.sync_time = now;

            var useGzip = false;
            onSockHandled(player.sock, resp, useGzip, query, time);
        });
    }
};
