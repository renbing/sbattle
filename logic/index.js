var mods = ['user', 'gm', 'task', 'building'];

mods.forEach(function(mod){
    module.exports[mod] = require('./' + mod + '.js');
});

