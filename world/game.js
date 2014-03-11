function World2Game() {
    this.games = {};    // 连接的Game id->sock
}

World2Game.prototype = {
    connect: function(sid, sock) {
        if( this.games[sid] ) {
            this.games[sid].close();
        }
        this.games[sid] = sock;
        sock._id = sid;
        INFO('game enter:'+sid);
    },

    close: function(sock) {
        if( sock._id ) {
            delete this.games[sock._id];
            INFO('game leave:'+sock._id);
        }
    },

    allianceTalk : function(sid, users, im, uid) {
        var sock = this.games[sid];
        if( !sock ) return;

        var req = {
            mod: 'alliance',
            act: 'talk_push',
            args: {
                users: users,
                im: im,
                uid: uid
            },
        };
        
        onSockHandled(sock, req);
    },
}

exports.connect = function(query, onHandled, sock) {
    gWorld2Game.connect(query.args.id, sock);
}

exports.login = function(query, onHandled) {
    resp.ims = gMessage.enterAllianceTalk('test', query.uid); 
    onHandled();
}

exports.logout = function(query, onHandled) {
    gMessage.leaveAllianceTalk('test', query.uid);
}

exports.World2Game = World2Game;
