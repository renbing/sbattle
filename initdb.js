var mongodb = require('mongodb');
var common  = require('./common.js');
var server  = require('./server.js');

var worldItems = {};

(function main(){
    server.loadDB(function(db){
        db.createCollection('plat', {}, function(err, result){
            var gDBPlat = db.collection('plat');
            gDBPlat.insert({_id:'_userid', 'ai':100000000}, 
                function(err, result){
            });
        });

        db.createCollection('user', {}, function(err, result){
        });

        
        db.createCollection('world', {}, function(err, result){
            global.gDBWorld = db.collection('world');
        });

        db.createCollection('pay', {}, function(err, result){
        });

        db.createCollection('analysis', {}, function(err, result){
            /*
            if( !err ) {
                db.ensureIndex('analysis', {uid:1, action:1, c1:1, c2:1}, 
                    function(err, result){});
            }
            */
        });

        setTimeout(function(){
            var cursor = db.collection('world').find({},{_id:1});
            cursor.each(function(err, item) {
                if( cursor.isClosed() ) {
                    if( Object.keys(worldItems).length > 0 ) {
                        console.log('error');
                        process.exit(-1);
                    }else{
                        process.exit(0);
                    }
                }else{
                    if( !item ) return;
                    delete worldItems[item._id];
                }
            });
        }, 3000);

    });
})();
