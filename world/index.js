var mods = ['game'];

mods.forEach(function(mod){
    module.exports[mod] = require('./' + mod + '.js');
});

