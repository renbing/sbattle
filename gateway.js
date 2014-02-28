/*
    游戏网关: 新玩家注册,登录(获取密钥,World/Game服务器地址),登出
 */
var http        = require('http');
var fs          = require('fs');
var url         = require('url');
var util        = require('util');
var WebSocket   = require('ws');

var server      = require('./server.js');
var common      = require('./common.js');
var config      = require(fs.existsSync('../config.js') ? '../config.js' : './config.js');


global.gDBPlat = null;
global.gUsers = {};     // 所有用户登录信息
global.gGames = {};     // 可用的Game服务器 id : addr

(function main(){
    server.loadDB(function(db){
        INFO('mongodb connected');

        global.gDBPlat = db.collection('plat');

        startServer();
    }, 2);
})();

function startServer(){
    // 创建web服务器
    http.createServer(function(req, res) {
        if( req.method == 'POST' ) {
            req.connection.destroy();
            return;
        }

        var reqObj = url.parse(req.url, true);
        var query = reqObj.query || {};
        var path = reqObj.pathname;

        req.on('end', function() {
            if( path.endWith('.html') || path.endWith('.js') ) {
                var segs = path.split('/');
                handleStaticFile('web/'+segs[segs.length-1], res);
                return;
            }

            handleReq(query, res);
            if( query.act == 'login' ) {
                INFO(util.format('LOGIN: %s %s', query.openid, req.connection.remoteAddress));
            }
        });

        req.resume();
        
    }).listen(config.GatewayListen);

    // 创建sock服务器
    var wss = new WebSocket.Server({host:config.GatewayHost, port:config.GatewayGameListen});
    wss.on('connection', function(sock){
        sock.on('message', function(message){
            var req = {};
            try {
                req = JSON.parse(message); 
            }catch(e){
            }

            if( req.act == 'connect' ) {
                INFO('game enter: '+ req.args.id);
                sock._id = req.args.id;

                gGames[req.args.id] = req.args.addr;
                onSockHandled(sock, {act:'connect'});
            }else if( req.act == 'login' ) {
                gUsers[req.args.uid] = {
                    sid: req.args.sid,
                    time: common.getTime(),
                };
            }else if( req.act == 'logout' ) {
                delete gUsers[req.args.uid];
            }else{
            }
        });

        sock.on('close', function(){
            if( sock._id ) {
                INFO('game leave:' + sock._id);
                delete gGames[sock._id];
            }
        });
    });

    wss.on('error', function(err){
        ERROR('gateway->game ' + err);
    });

    
    var pidFile = 'gateway.pid';
    process.on('SIGINT', function() {
        exit();
    });

    process.on('SIGTERM', function() {
        exit();
    });

    process.on('uncaughtException', function (err) {  
        ERROR(err.stack);    
    });

    function exit() {
        INFO('gateway shutdown');
        fs.existsSync(pidFile) && fs.unlinkSync(pidFile);
        process.exit();
    }
    
    INFO('gateway start');
    fs.writeFileSync(pidFile, process.pid, 'utf8');
}

function handleReq(query, res) {
    var code = 1;
    var desc = '';
    
    if( !query.act ) {
        desc = 'no act';
    }else if( !logic[query.act] ) {
        desc = 'act ' + query.act + ' not support';
    }else{
        code = 0;
    }

    var resp = {
        'code': code, 
        'desc': desc, 
        'data':{}
    };

    if( resp.code != 0 ) {
        onHttpHandled(res, resp);
    }else {
        logic[query.act](query, res, resp);
    }
}

// -------------------处理静态文件访问---------------------------------

var staticFilePool = {};
function handleStaticFile(file, res, convertUTF8) {
    if( file in staticFilePool ) {
        sendStaticFile(file, staticFilePool[file], res, convertUTF8);
    }else {
        fs.exists(file, function(exists){
            if( exists  ) {
                fs.readFile(file, function(err, data){
                    staticFilePool[file] = data;
                    sendStaticFile(file, staticFilePool[file], res, convertUTF8);
                });
            }else {
                res.writeHead(404, common.defaultHeaders);
                res.end();
            }
        });
    }
}

function sendStaticFile(file, content, res, convertUTF8) {
    if( convertUTF8 ) {
        var converter = new Iconv('GBK', 'UTF8');
        content = converter.convert(content).toString();
    }
    if( file.endWith('html') || file.endWith('htm') ) {
        res.writeHead(200, common.htmlHeaders);
    }else{
        /*
        var expire = new Date();
        expire.setTime(expire.getTime() + 8640000*1000);
        res.setHeader('Expires', expire.toUTCString());
        res.setHeader('Cache-Control', 'max-age=8640000');
        */

        res.writeHead(200, common.defaultHeaders);
    }
    res.end(content);
}

// --------------------请求逻辑处理-----------------------------------

var logic = {};
// 登录,如果是新用户完成注册
logic.login = function(req, res, resp) {
    do {
        if( !req.openid || !req.openkey) {
            resp.code = 1; resp.desc = 'no openid or openkey'; break;
        }

        var openid = req.openid;
        if( !common.verifyGatewayAuth(openid, req.openkey) 
            && (req.openkey != config.GMAuth && req.openkey != config.GMLoginAuth)) {
            resp.code = 1; resp.desc = 'openkey verify fail'; break;
        }

    }while(false);

    if( resp.code != 0 ) {
        onHttpHandled(res, resp);
        return;
    }

    gDBPlat.findOne({_id:openid},{},function(err, result){
        if( err ) {
            // 查询错误
            resp.code = 1; resp.desc = 'find error';
            onHttpHandled(res, resp);
            return;
        }else if( result ) {
            onLogIn(req, res, resp, result.uid);
            // 老用户 
        }else{
            // 新用户
            gDBPlat.findAndModify({_id:'_userid'}, [], {$inc:{'ai':1}}, 
                                    {'new':true}, function(err, doc) {
                if( doc && !err ) {
                    var newUID = doc.ai;
                    gDBPlat.insert({_id: openid, uid: newUID, time:(new Date()).format('yyyy-MM-dd hh:mm:ss')}, 
                        function(err, result){
                        if( err ) {
                            resp.code = 1; resp.desc = 'on create';
                            onHttpHandled(res, resp);
                        }else{
                            onLogIn(req, res, resp, newUID); 
                        }
                    });
                }else{
                    resp.code = 1; resp.desc = 'generate id';
                    onHttpHandled(res, resp);
                }
            });
        }
    });
};

function onLogIn(req, res, resp, uid) {
    
    var serverId = 0;
    if( gUsers[uid] && gGames[gUsers[uid].sid] ) {
        serverId = gUsers[uid].sid;
    }else{
        var servers = Object.keys(gGames);
        if( servers.length > 0 ) {
            serverId = servers[common.randRange(0, servers.length-1)];
        }
    }
    if( serverId ) {
        var auth = common.genAuth(util.format('%d-%d', uid, serverId));

        resp.data.auth_key = auth.key;
        resp.data.auth_time = auth.time;
        resp.data.uid = uid;
        resp.data.server = gGames[serverId];
    }else{
        resp.code = 1;
        resp.desc = 'no active game';
    }
    
    onHttpHandled(res, resp);
}
