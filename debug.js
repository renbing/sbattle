var logic = require('./logic');

exports.Debug = function() {
    var uid = require('./config.js').DebugUID;

    query = {mod: 'user',act: 'login', args:{'name':'', 'headpic':'', 'openid':'', 'openkey':'', 'user':'{}'}};

    query.uid = uid;
    query.seq = 1;

    var resp = {code:0, desc:'', data:{}};
    var logicHandler = logic[query.mod][query.act];
    gPlayers.load(query.uid, function(player){
        logicHandler(player, query, resp, function(){
            console.log(JSON.stringify(resp));
            player.save(true, function(){
                process.exit(1);
            });
        });
    });
}
