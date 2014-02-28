var mods = ['user', 'gm'];

mods.forEach(function(mod){
    module.exports[mod] = require('./' + mod + '.js');
});

