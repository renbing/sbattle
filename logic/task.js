exports.daily_task_refresh = function(player, req, resp, onHandled) {
    var user = player.user;
    do {
        var now = common.getTime();
        var dailyTask = user.daily_task;
        if( task.time < now ) {
            resp.code = 1;resp.desc = 'time not reach'; break;
        }else if( req.args.cash ) {
            if( !player.costResource({'cash': gConfGlobal.DailyTaskRefreshCost}) {
                resp.code = 1;resp.desc = 'not enough cash'; break;
            }
        }

        player.refreshDailyTask();
        resp.data.task = dailyTask;

    }while(false);

    onHandled();
}

exports.daily_task_start = function(player, req, resp, onHandled) {
    var user = player.user;
    do {
        var dailyTask = user.daily_task;
        var taskPos = dailyTask.list.indexOf(req.args.id);
        if( taskPos < 0 ) {
            resp.code = 1;resp.desc = ''; break;
        }
        
        dailyTask.doing = req.args.id;
        dailyTask.time = common.getTime();

        player.markDirty('daily_task.doing');
        player.markDirty('daily_task.time');
    }while(false);

    onHandled();
}

exports.daily_task_reward = function(player, req, resp, onHandled) {
    var user = player.user;
    do {
        var dailyTask = user.daily_task;
        if( !dailyTask || dailyTask.time < common.getTime ) {
            resp.code = 1;resp.desc = ''; break;
        }

        var taskPos = dailyTask.list.indexOf(dailyTask.doing);
        if( taskPos > 0 ) {
            dailyTask.list.splice(taskPos, 1);
        }
        dailyTask.time = 0;

        var taskReward = gConfDailyTask[dailyTask.doing];
        resp.data.awards = player.addAwards(taskReward);

        player.markDirty('daily_task');
    }while(false);

    onHandled();
}

exports.alliance_task_refresh = function(player, req, resp, onHandled) {
    var user = player.user;
    do {
    }while(false);

    onHandled();
}

exports.alliance_task_reward = function(player, req, resp, onHandled) {
    var user = player.user;
    do {
    }while(false);

    onHandled();
}
