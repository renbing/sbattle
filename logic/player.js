function Player(uid) {
    this.uid = uid;

    this.user = null;                   // 玩家数据模型

    this.dirty = {};                    // 本次操作脏数据
    this.allDirty = {};                 // 累计的脏数据
    this.saveCount = 0;                 // 数据库存盘计数
    this.saveError = false;             // 是否出现数据库写入错误

    this.lastActive = common.getTime(); // 上次活跃时间
    this.lock = false;                  // 并发锁
    this.sock = null;                   // 网络连接
    this.gmkey = null;                  // gm密钥
}

Player.create = function(uid) {
    var initUser = {
        '_id' : uid,
        'ai' : 1,               // 自增长ID,用于编号系统
        'active_time' : 0,      // 活跃时长(lastActivie - createTime)
        'info' : {              // 基本信息
            'un':'',            // 玩家姓名
            'headpic':'',       // 玩家头像
            'version':'',       // 上次登录客户端版本
            'yellow':0,         // 黄钻等级
            'blue':0,           // 蓝砖等级
            'yellow_year':0,    // 年费黄钻
            'blue_year':0,      // 年费蓝钻
            'platform':'',      // 平台 qzone,pengyou,3366
            'create': common.getTime(),  // 用户创建时间
            'via':'',           // 来源 qq_task, gdt, default
            'invited':'',       // 邀请者
        },

        'status' : {            // 基础数据
            'xp':0,             // 经验
            'level':1,          // 等级
            'gold':100000,      // 银两
            'cash':0,           // 元宝
            'vip':0,            // VIP等级
            'food':8000,        // 粮草
            'honor':6000,       // 荣誉
            'soul':0,           // 将魂
            'fight_force':0,    // 战斗力
        }
    };

    return initUser;
}

Player.prototype = {
    init : function(fields, callback) {
        if( fields && (typeof(fields) == 'object') && Object.keys(fields).length > 0 ){
            // 加载玩家部分数据
            fields['ai'] = 1;
        }

        var player = this;

        // 读取玩家数据
        gDBUser.findOne({_id : player.uid}, fields, function(err, doc){
            if( !doc) {
                if( err ) {
                    callback && callback(false);
                }else{
                    //创建新用户
                    player.user = Player.create(player.uid);
                    player.cleanDirty();

                    gDBUser.insert(player.user, function(err, result){
                        if( err ) {
                            callback && callback(false);
                        }else{
                            callback && callback(true);
                        }
                    });
                }
            }else {
                player.user = doc;
                callback && callback(true);
            }
        });
    },

    save : function(force, callback) {
        // 合并写入
        var haveDirty = false;
        for( var key in this.dirty ) {
            haveDirty = true;
            this.allDirty[key] = this.dirty[key];
        }

        this.dirty = {};

        if( haveDirty ) {
            this.saveCount += 1;
        }
        
        if( (!force && this.saveCount < 10) || (Object.keys(this.allDirty).length == 0) ) {
            // 10次数据库操作必写入
            callback && callback(true);
            return;
        }

        var updates = {$set: {'active_time': this.lastActive-this.user.info.create}, $unset: {}};
        var arrangedDirty = this.arrangeDirty(this.allDirty);
        for( var item in arrangedDirty ) {
            var remove = arrangedDirty[item];
            if( remove ) {
                updates['$unset'][item] = 1;
            }else{
                var obj = this.user;
                var args = item.split(".");
                var ok = true;
                for(var i=0; i<args.length; i++ ) {
                    if( typeof(obj) != 'object' ) {
                        // 未找到
                        ok = false;
                        break;
                    }
                    obj = obj[args[i]];
                }

                if( ok && obj != undefined && obj != NaN && obj != null ) {
                    updates['$set'][item] = obj;
                }else{
                    ERROR('invalid save: '+item);
                }
            }
        }

        this.allDirty = {};
        this.saveCount = 0;

        gDBUser.update({_id : this.uid}, updates, function(err, result) {
            if( err ) {
                ERROR(util.format('%d SAVE %j %j', this.uid, updates, err));
                this.saveError = true;
                callback && callback(false);
            }else {
                LOG(util.format('%d SAVE %j', this.uid, updates));
                callback && callback(true);
            }
        }.bind(this));
    },

    saveAll : function(){
        gDBUser.save(this.user, function(err, result){
        });
    },

    nextId : function() {
        this.user.ai += 1;
        this.markDirty('ai');
        return this.user.ai;
    },

    arrangeDirty : function(dirty) {
        var arrangedDirty = {};

        for( var item in dirty ) {
            var dirtyType = dirty[item];
            
            var needRemove = [];
            var addNew = true;
            var levels = item.split('.');
            for( var eitem in arrangedDirty ) {
                var elevels = eitem.split('.');
                if( elevels.length == levels.length ) continue;
                var minLen = Math.min(elevels.length, levels.length);
                    
                var isTree = true;
                for( var i=0; i<minLen; i++ ) {
                    if( elevels[i] != levels[i] ) {
                        isTree = false;
                        break;
                    }
                }

                if( !isTree ) continue;

                if( elevels.length < levels.length ) {
                    // 更低级别的变更,抛弃
                    addNew = false;
                    break;
                }else{
                    // 更高级别的变更
                    needRemove.push(eitem);
                }
            }
            
            needRemove.forEach(function(removeItem){
                delete arrangedDirty[removeItem];
            });

            if( addNew ) {
                arrangedDirty[item] = dirtyType;
            }
        }
        return arrangedDirty;
    },
    
    // 标志需要写入的变更数据名 a.b格式
    markDirty : function(item) {
        this.dirty[item] = 0;
    },

    markDelete : function(item) {
        this.dirty[item] = 1;
    },

    cleanDirty : function() {
        this.dirty = {};
    },


    getGMLevel : function() {
        // 0: 非GM
        // 1: 只能登录
        // 2: 可以操作gm命令

        if( this.gmkey == config.GMLoginAuth ) {
            return 1;
        }else if( this.gmkey == config.GMAuth ) {
            return 2;
        }

        return 0;
    },
}

function PlayerManager(){
    this.players = {};
    this.actions = {};
}

PlayerManager.prototype = {
    get : function(uid) {
        var player = this.players[uid];
        return player;
    },

    load : function(uid, callback) {
        var player = this.players[uid];
        if( player ) {
            player.save(true, function(){
                this._load(uid, callback);
            }.bind(this));
        }else{
            this._load(uid, callback);
        }
    },

    _load : function(uid, callback) {
        var player = new Player(uid);
        player.init({}, function(succ){
            if( succ ) {
                var oldPlayer = this.players[uid];
                this.players[uid] = player;
                callback && callback(player, oldPlayer);
            }else{
                callback && callback(null);
            }
        }.bind(this));
    },

    unload : function(uid){
        var player = this.players[uid];
        if( !player ) return;

        player.save(true);
        delete this.players[uid];
    },

    login : function(sock, player, oldPlayer) {
        player.sock = sock;
        sock._player = player.uid;

        if( oldPlayer && oldPlayer.sock != player.sock ) {
            // 踢掉之前登录的连接
            var resp = {'code':gCode.RE_LOGIN};
            if( player.getGMLevel() ) {
                resp.code = gCode.GM_LOGIN;
                INFO('gm kick:' + player.uid);
            }else{
                INFO('relogin kick:' + player.uid);
            }
            onSockHandled(oldPlayer.sock, resp);
            oldPlayer.sock.close();
        }

        onSockHandled(gGateway, {act:'login', args:{uid: player.uid, sid:gServerId}});
    },

    logout : function(sock) {
        var player = this.players[sock._player];
        if(!player) return;

        if( player.getGMLevel() ) {
            INFO('gm logout:' + player.uid);
        }else{
            INFO('player logout:' + player.uid);
        }
        this.unload(player.uid);
        onSockHandled(gGateway, {act:'logout', args:{uid: player.uid}});
    },

    gmLogin : function(uid) {
        // 尝试登录, GM登录的时候不能登录
        var player = this.players[uid];
        if( player && player.getGMLevel() ) {
            return true;
        }

        return false;
    },

};

exports.Player = Player;
exports.PlayerManager = PlayerManager;
