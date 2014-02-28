var fs = require('fs');
var Iconv = require('iconv').Iconv;

var spliter = '\t';

function parseDate(strDate){
    // 2013:8:7:14:0:0
    if( typeof(strDate) != 'string' ) {
        return 0;
    }

    var segs = strDate.split(':'); 
    if( 6 == segs.length ) {
        // 获取活动开始和结束的时间(秒)
        var date = new Date(segs[0],+segs[1]-1,segs[2],segs[3],segs[4],segs[5]);
        return Math.floor(date.getTime()/1000); 
    }else{
        ERROR('parseDate invalid date:'+strDate);
    }

    return 0;
}

function CommonCSV(name, indexs) {
    var converter = new Iconv('GBK', 'UTF8');
    var rawData = converter.convert(fs.readFileSync(name)).toString();

    indexs = indexs || [];

    var rows = rawData.split('\n');
    var columns = rows[1].split(spliter);
    for(var j=0; j<columns.length; j++ ) {
        columns[j] = columns[j].trim();
    }

    for( var i=2; i<rows.length; i++ ) {
        if( rows[i].trim().length == 0 ) {
            continue;
        }
        var cols = rows[i].split(spliter);
        if( cols.length != columns.length ){
            ERROR('invalid csv ' + name + ' at line: ' + i);
            continue;
        }

        var obj = {};
        for(var j=0; j<cols.length; j++ ) {
            var column = columns[j];
            var value = cols[j].trim();
            if( /^Award\d*$/.test(column) || /^Award_\d*$/.test(column) ) {
                // 单个奖励
                var segs = value.split(':');
                if( 2 == segs.length ){
                    value = segs[0].split('.');
                    value.push(+segs[1]);
                }else{
                    value = null;
                }
            }else if( /^Awards\d*$/.test(column) || /^Awards_\d*$/.test(column) ) {
                // 多个奖励
                var awards = [];
                var strAwards = value.split('|');
                strAwards.forEach(function(strAward){
                    var segs = strAward.split(':');
                    if( 2 == segs.length ){
                        var award = segs[0].split('.');
                        award.push(+segs[1]);
                        awards.push(award);
                    }
                });

                value = awards;
            }

            if( !isNaN(value) ) {
                value = +value;
            }
            obj[column] = value;
        }
        var data = this;
        for( var k=0; k<indexs.length-1; k++ ) {
            var index = indexs[k];
            if( !(obj[index] in data) ) {
                data[obj[index]] = {}; 
            }
            data = data[obj[index]];
        }

        var lastIndex = indexs[indexs.length-1];
        data[obj[lastIndex]] = obj;

    }
}

function GlobalCSV(name) {
    var rawData = fs.readFileSync(name, 'utf8');

    var rows = rawData.split('\n');
    for( var i=2; i<rows.length; i++ ) {
        if( rows[i].trim().length == 0 ) {
            continue;
        }
        var cols = rows[i].split(spliter);
        if( cols.length != 3 ) {
            ERROR('invalid global csv ' + name + ' at ' + i);
            continue;
        }
        var key = cols[1];
        var value = cols[2].trim();

        if( !isNaN(value) ) {
            value = +value;
        }
        
        // 装备初始宝石配置 gid1:gid2
        if( key.endWith('GemSlot') ) {
            value = value.split(':');
            for( var j=0; j<value.length; j++ ) {
                value[j] = +value[j];
            }
        }

        this[key] = value;
    }
}

exports.CommonCSV = CommonCSV;
exports.GlobalCSV = GlobalCSV;
exports.parseDate = parseDate;
