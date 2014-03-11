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
            gWorld2Game.allianceTalk(sid, allianceMessage.user[sid], im, uid);
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


exports.Message = Message;
