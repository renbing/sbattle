exports.gm = function(player, req, resp, onHandled) {
    do{
        if( player.getGMLevel() != 2 ) {
            resp.code = 1; resp.desc = 'not super gm login'; break;
        }

        var method = req.args.method;
        var user = player.user;
        var uid = player.uid;

        if( method == 'status' ) {
            if( !user.status.hasOwnProperty(req.args.type) ||
                (isNaN(req.args.change) && isNaN(req.args.target))) {
                resp.code = 1; resp.desc = 'type num not support'; break;
            }else {
                var type = req.args.type;
                var num = 0;
                if( !isNaN(req.args.change) && req.args.change.length > 0 ) {
                    num = +req.args.change;
                }else{
                    var target = +req.args.target;
                    num = target - user.status[type];
                }

                if( user.status[type] + num < 0 || user.status[type] + num > 200000000 ) {
                    resp.code = 1; resp.desc = 'too big or small'; break;
                }
                
                var nowNum = user.status[type] + num;
                if( type == 'xp' ) {
                    player.addXp(num);
                }else if( type == 'level' ) {
                    if( !gConfLevel[nowNum] ) {
                        resp.code = 1; resp.desc = 'invalid level'; break;
                    } 

                    user.status.xp = gConfLevel[nowNum - 1].Xp;
                    player.markDirty('status.xp');
                }                

                user.status[type] = nowNum;

                player.markDirty('status.'+type);
            }
        }else if( method == 'get' ) {
            resp.data = player.user;
        }else{
            resp.code = 1; resp.desc = 'method not support'; break;
        }

    }while(false);
    onHandled();
}
