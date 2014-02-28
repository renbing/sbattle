function Message(){
    this.users = {}; /* uid : {
                            kingdom:0   // 国家最后拉取数据
                            alliance:0  // 联盟最后拉取数据
                        }*/

    this.alliance = {};
}

Message.prototype = {

    getUser : function(uid) {
        var user = this.users[uid];
        if( !user ) {
            user = {
                'kingdom' : 0,
                'alliance' : 0,
             };
            this.users[uid] = user;
        }

        return user;
    },

    getAllianceMessage : function(alliance) {
        var allianceMessage = this.alliance[alliance];
        if( !allianceMessage ) {
            allianceMessage = {
                'user': {},
                'im':[],
            };
            this.alliance[alliance] = allianceMessage;
        }

        return allianceMessage;
    },

    allianceTalk : function(alliance, uid, name, content) {
        var im = [uid, name, content];
        var allianceMessage = this.getAllianceMessage(alliance);
        var ims = allianceMessage.im;
        ims.push(im);
        if(ims.length >= 200 ) {
            ims.splice(0, 100);
        }

        for( var sid in allianceMessage.user ) {
            gGame.allianceTalk(sid, allianceMessage.user[sid], im);
        }
    },
    
    enterAllianceTalk : function(alliance, uid, sid) {
        var allianceMessage = this.getAllianceMessage(alliance);
        if( !allianceMessage.user[sid] ) {
            allianceMessage.user[sid] = {};
        }
        allianceMessage.user[sid][uid] = 1;
    },

    leaveAllianceTalk : function(alliance, uid, sid) {
        var allianceMessage = this.getAllianceMessage(alliance);
        delete allianceMessage.user[sid][uid];
    },
}

exports.get = function(req, resp, onHandled) {
    do {
        resp.data.messages = gMessage.getMessage(req.uid, req.args.all);

        var prisonUpdate = gMessage.getPrisonUpdate(req.uid);
        if( prisonUpdate ) {
            resp.data.prison = prisonUpdate;
        }

        if( req.args.league ) {
            resp.data.leaguetalks = gMessage.getLeaguetalk(req.uid, req.args.league); 
        }

        resp.data.ims = gMessage.getIM(req.uid);
        resp.data.headlines = gMessage.getHeadline(req.uid);
    } while(false);

    onHandled();
}

exports.im = function(req, resp, onHandled) {
    do {
        if( req.args.name && req.args.content ) {
            gMessage.addIM(req.uid, req.args.name, req.args.content, req.args.gentry);
        }

    } while(false);

    onHandled();
}

exports.headline = function(req, resp, onHandled) {
    do {
        if( req.args.name && req.args.content ) {
            gMessage.addHeadline(req.uid, req.args.name, req.args.content, req.args.gentry);
        }
    } while(false);

    onHandled();
}

exports.leaguetalk = function(req, resp, onHandled) {
    do {
        if( !req.args.league ) {
            resp.code = 1; resp.desc = 'invalid'; break;
        }
        
        if( req.args.name && req.args.content ) {
            gMessage.addLeaguetalk(req.uid, req.args.name, req.args.content, req.args.league, req.args.gentry);
        }
    } while(false);

    onHandled();
}

exports.chat = function(req, resp, onHandled) {
    do {
        var userInfo = gUserInfo.getUser(req.args.uid);
        if( userInfo ) {
            var message = {
                'type': 'chat', 
                'uid': req.uid,
                'name': gUserInfo.getUser(req.uid).name,
                'time': common.getTime(),
                'content': req.args.content,
                'gentry':  req.args.gentry,
            };
            gMessage.addMessage(req.args.uid, message);
        }
        
    } while(false);

    onHandled();
}

exports.Message = Message;
