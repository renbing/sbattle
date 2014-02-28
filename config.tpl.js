exports.GatewayId = 1;                  // 网关Id
exports.GatewayListen = 7001;           // 网关端口 7000+网关Id
exports.GatewayGameListen = 6001;       // 网关游戏端口 6000+网关Id
exports.GatewayHost = '192.168.1.127';  // 网关IP

exports.GameGroupId = 1;                // 游戏服务器组编号
exports.GameHost = '192.168.1.127';     // 游戏服务器外网IP
exports.GameListen = 8000;              // 游戏服务器启始端口
exports.GameCount = 3;                  // 游戏服务器数量

exports.WorldHost = '192.168.1.127';    // 世界服务器内网IP
exports.WorldListen = 9001;             // 世界服务器端口

// 数据库配置
exports.MongodbName = 'renbing';

// for mongodb standalone or master-slave
exports.MongodbHost = 'localhost';
exports.MongodbPort = 27017;

// for mongodb replica-set
exports.MongodbSets = [
    ['localhost', 1711],
    ['localhost', 1712],
    ['localhost', 1713]
];

exports.RedisHost   = 'localhost';
exports.RedisPort   = 6379;
exports.RedisId     = 0;

// Debug,GMAuth,GatewayAuth,Pay
exports.GMAuth = 'hexx';        // 可以修改玩家数据的GM
exports.GMLoginAuth = 'hexx';   // 只能登录玩家的GM
exports.DebugUID = 7;
