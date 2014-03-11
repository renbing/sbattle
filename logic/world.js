exports.game = {
    connect : function(req) {
        INFO('connected to world'); 
    },
};

exports.user = {
    login : function(req, resp) {
    },
};

exports.alliance = {
    talk_push : function(req) {
        var users = req.args.users;
        var im = req.args.im;

        for( var uid in users ) {
            if( uid == req.args.uid ) continue;

            var player = gPlayers.get(uid);
            if( !player ) continue;
           
            var resp = {code:0, desc:'', data:{im:im}};
            onSockHandled(player.sock, resp);
        }
    },
};

