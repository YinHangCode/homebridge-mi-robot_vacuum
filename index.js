require('./Devices/MiRobotVacuum');
require('./Devices/MiRobotVacuum2');

var fs = require('fs');
var packageFile = require("./package.json");
var PlatformAccessory, Accessory, Service, Characteristic, UUIDGen;

module.exports = function(homebridge) {
    if(!isConfig(homebridge.user.configPath(), "platforms", "MiRobotVacuumPlatform")) {
        return;
    }
    
    PlatformAccessory = homebridge.platformAccessory;
    Accessory = homebridge.hap.Accessory;
    Service = homebridge.hap.Service;
    Characteristic = homebridge.hap.Characteristic;
    UUIDGen = homebridge.hap.uuid;

    homebridge.registerPlatform('homebridge-mi-robot_vacuum', 'MiRobotVacuumPlatform', MiRobotVacuumPlatform, true);
}

function isConfig(configFile, type, name) {
    var config = JSON.parse(fs.readFileSync(configFile));
    if("accessories" === type) {
        var accessories = config.accessories;
        for(var i in accessories) {
            if(accessories[i]['accessory'] === name) {
                return true;
            }
        }
    } else if("platforms" === type) {
        var platforms = config.platforms;
        for(var i in platforms) {
            if(platforms[i]['platform'] === name) {
                return true;
            }
        }
    } else {
    }
    
    return false;
}

function MiRobotVacuumPlatform(log, config, api) {
    if(null == config) {
        return;
    }
    
    this.Accessory = Accessory;
    this.PlatformAccessory = PlatformAccessory;
    this.Service = Service;
    this.Characteristic = Characteristic;
    this.UUIDGen = UUIDGen;
    
    this.log = log;
    this.config = config;

    if (api) {
        this.api = api;
    }
    
    this.log.info("[MiRobotVacuumPlatform][INFO]*******************************************************************");
    this.log.info("[MiRobotVacuumPlatform][INFO]          MiRobotVacuumPlatform v%s By YinHang", packageFile.version);
    this.log.info("[MiRobotVacuumPlatform][INFO] GitHub: https://github.com/YinHangCode/homebridge-mi-robot_vacuum ");
    this.log.info("[MiRobotVacuumPlatform][INFO]                                              QQ Group: 107927710  ");
    this.log.info("[MiRobotVacuumPlatform][INFO]*******************************************************************");
    this.log.info("[MiRobotVacuumPlatform][INFO]start success...");
}

MiRobotVacuumPlatform.prototype = {
    accessories: function(callback) {
        var myAccessories = [];

        var deviceCfgs = this.config['deviceCfgs'];
        if(deviceCfgs instanceof Array) {
            for (var i = 0; i < deviceCfgs.length; i++) {
                var deviceCfg = deviceCfgs[i];
                if(null == deviceCfg['type'] || "" == deviceCfg['type']) {
                    continue;
                }
                if(null == deviceCfg['token'] || "" == deviceCfg['token'] || null == deviceCfg['ip'] || "" == deviceCfg['ip']) {
                    continue;
                }
                
                if (deviceCfg['type'] == "MiRobotVacuum") {
                    new MiRobotVacuum(this, deviceCfg).forEach(function(accessory, index, arr){
                        myAccessories.push(accessory);
                    });
                } else if (deviceCfg['type'] == "MiRobotVacuum2") {
                    new MiRobotVacuum2(this, deviceCfg).forEach(function(accessory, index, arr){
                        myAccessories.push(accessory);
                    });
                } else {
                }
            }
            this.log.info("[MiRobotVacuumPlatform][INFO]device size: " + deviceCfgs.length + ", accessories size: " + myAccessories.length);
        }
        
        callback(myAccessories);
    }
}