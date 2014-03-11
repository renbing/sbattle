exports.construct = function(player, req, resp, onHandled) {
    var user = player.user;
    do {
        if( player.queueBusy('construct') ) {
            resp.code = 1;resp.desc = ''; break;
        }

        var pos = req.args.pos;
        
        var buildings = user.building;
        var building = buildings[pos];
        var bid = 0;
        var level = 0;
        if( building ) {
            // 升级
            var building = buildings[pos];
            bid = building.bid;
            level = building.level;

            if( !gConfBuilding[bid][level] ) {
                resp.code = 1;resp.desc = ''; break;
            }
        }else{
            bid = req.args.bid;
        }

        if( level >= gConfBuilding[1].level ) {
            resp.code = 1;resp.desc = ''; break;
        }

        // 判断需求
        var buildingConf = gConfBuilding[bid][level+1];
        if( !player.costResource({'oil':buildingConf.UpOil, 'iron':buildingConf.UpIron,
                                'supply':buildingConf.UpSupply, 'metal':buildingConf.UpMetal}) {
            resp.code = 1;resp.desc = ''; break;
        }

        player.queueAdd('construct', pos, buildingConf.UpTime);

    }while(false);

    onHandled();
}
