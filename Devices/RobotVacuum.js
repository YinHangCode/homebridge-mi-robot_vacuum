require('./Base');

const inherits = require('util').inherits;
const miio = require('miio');

var Accessory, PlatformAccessory, Service, Characteristic, UUIDGen;

RobotVacuum = function(platform, config) {
    this.init(platform, config);
    
    Accessory = platform.Accessory;
    PlatformAccessory = platform.PlatformAccessory;
    Service = platform.Service;
    Characteristic = platform.Characteristic;
    UUIDGen = platform.UUIDGen;
    
    this.device = new miio.Device({
        address: this.config['ip'],
        token: this.config['token']
    });

    this.platform.log.debug("ip: " + this.device.address);this.platform.log.debug("token: " + this.device.packet.token);
    this.accessories = {};
    if(!this.config['robotVacuumDisable'] && this.config['robotVacuumName'] && this.config['robotVacuumName'] != "") {
        this.accessories['fanAccessory'] = new RobotVacuumFanAccessory(this);
    }
    var accessoriesArr = this.obj2array(this.accessories);
    
    this.platform.log.debug("[MiRobotVacuumPlatform][DEBUG]Initializing " + this.config["type"] + " device: " + this.config["ip"] + ", accessories size: " + accessoriesArr.length);
    
    return accessoriesArr;
}
inherits(RobotVacuum, Base);

RobotVacuumFanAccessory = function(dThis) {
    this.device = dThis.device;
    this.name = dThis.config['robotVacuumName'];
    this.platform = dThis.platform;
}

RobotVacuumFanAccessory.prototype.getServices = function() {
    var that = this;
    var services = [];

    var infoService = new Service.AccessoryInformation();
    infoService
        .setCharacteristic(Characteristic.Manufacturer, "XiaoMi")
        .setCharacteristic(Characteristic.Model, "ZhiMi Fan")
        .setCharacteristic(Characteristic.SerialNumber, "Undefined");
    services.push(infoService);

    var fanService = new Service.Fan(this.name);
    var nameCharacteristic = fanService.getCharacteristic(Characteristic.Name);
    var onCharacteristic = fanService.getCharacteristic(Characteristic.On);
    var rotationSpeedCharacteristic = fanService.addCharacteristic(Characteristic.RotationSpeed);
//    var rotationDirectionCharacteristic = fanService.addCharacteristic(Characteristic.RotationDirection);
    
    onCharacteristic
        .on('get', function(callback) {
            that.device.call("get_status", [], {retries: 3}).then(result => {
                that.platform.log.debug("[MiRobotVacuumPlatform][DEBUG]RobotVacuumFanAccessory - On - getOn: " + JSON.stringify(result[0]));
                callback(null, result[0]['state'] === 8 ? false : true);
            }).catch(function(err) {
                that.platform.log.error("[MiRobotVacuumPlatform][ERROR]RobotVacuumFanAccessory - On - getOn Error: " + err);
                callback(err);
            });
        }.bind(this))
        .on('set', function(value, callback) {
            that.platform.log.debug("[MiRobotVacuumPlatform][DEBUG]RobotVacuumFanAccessory - On - setOn: " + value);
            that.device.call(value ? "app_start" : "app_pause", []).then(result => {
                that.platform.log.debug("[MiRobotVacuumPlatform][DEBUG]RobotVacuumFanAccessory - On - setOn Result: " + result);
                if(result === 0) {
                    if(value) {
                        callback(null);
                    } else {
                        that.device.call("app_charge", []).then(result => {
                            that.platform.log.debug("[MiRobotVacuumPlatform][DEBUG]RobotVacuumFanAccessory - On - setOn Result: " + result);
                            if(result === 0) {
                                callback(null);
                            } else {
                                callback(new Error(result));
                            }
                        }).catch(function(err) {
                            that.platform.log.error("[MiRobotVacuumPlatform][ERROR]RobotVacuumFanAccessory - On - setOn Error: " + err);
                            callback(err);
                        });
                    }
                } else {
                    callback("result: " + result);
                }
            }).catch(function(err) {
                that.platform.log.error("[MiRobotVacuumPlatform][ERROR]RobotVacuumFanAccessory - On - setOn Error: " + err);
                callback(err);
            });
        }.bind(this));
    rotationSpeedCharacteristic
        .on('get', function(callback) {
            that.device.call("get_status", []).then(result => {
                that.platform.log.debug("[MiRobotVacuumPlatform][DEBUG]RobotVacuumFanAccessory - RotationSpeed - getRotationSpeed: " + JSON.stringify(result[0]));
                var fan_power = result[0]['fan_power'];
                var nowValue = rotationSpeedCharacteristic.value;
                if(fan_power == 38) {
                    if(nowValue > 0 && nowValue <= 25) {
                        callback(null, nowValue);
                    } else {
                        callback(null, 25);
                    }
                } else if(fan_power == 60) {
                    if(nowValue > 25 && nowValue <= 50) {
                        callback(null, nowValue);
                    } else {
                        callback(null, 50);
                    }
                } else if(fan_power == 77) {
                    if(nowValue > 50 && nowValue <= 75) {
                        callback(null, nowValue);
                    } else {
                        callback(null, 75);
                    }
                } else if(fan_power == 90) {
                    if(nowValue > 75 && nowValue <= 100) {
                        callback(null, nowValue);
                    } else {
                        callback(null, 100);
                    }
                } else {
                    callback(fan_power);
                }
            }).catch(function(err) {
                that.platform.log.error("[MiRobotVacuumPlatform][ERROR]RobotVacuumFanAccessory - RotationSpeed - getRotationSpeed Error: " + err);
                callback(err);
            });
        }.bind(this))
        .on('set', function(value, callback) {
            if(value <= 0) {
                callback(null);
            } else {
                var nowLevel = that.getLevelBySpeed(rotationSpeedCharacteristic.value);
                var valueLevel = that.getLevelBySpeed(value);
                that.platform.log.debug("[MiRobotVacuumPlatform][DEBUG]RobotVacuumFanAccessory - RotationSpeed - setRotationSpeed: " + value + ", valueLevel: " + valueLevel + ", nowValue: " + rotationSpeedCharacteristic.value + ", nowLevel: " + nowLevel);
                if(nowLevel == valueLevel) {
                    callback(null);
                } else {
                    that.device.call("set_custom_mode", [valueLevel]).then(result => {
                        that.platform.log.debug("[MiRobotVacuumPlatform][DEBUG]RobotVacuumFanAccessory - RotationSpeed - setRotationSpeed Result: " + result);
                        if(result === 0) {
                            callback(null);
                        } else {
                            callback(new Error(result));
                        }
                    }).catch(function(err) {
                        that.platform.log.error("[MiRobotVacuumPlatform][ERROR]RobotVacuumFanAccessory - RotationSpeed - setRotationSpeed Error: " + err);
                        callback(err);
                    });
                }
            }
        }.bind(this));
    services.push(fanService);

    var batteryService = new Service.BatteryService();
    var batLowCharacteristic = batteryService.getCharacteristic(Characteristic.StatusLowBattery);
    var batLevelCharacteristic = batteryService.getCharacteristic(Characteristic.BatteryLevel);
    batLevelCharacteristic
        .on('get', function(callback) {
            that.device.call("get_status", []).then(result => {
                that.platform.log.debug("[MiRobotVacuumPlatform][DEBUG]RobotVacuumFanAccessory - Battery - getLevel: " + JSON.stringify(result[0]));
                var battery = result[0]['battery'];
                batLowCharacteristic.updateValue(battery < 20 ? Characteristic.StatusLowBattery.BATTERY_LEVEL_LOW : Characteristic.StatusLowBattery.BATTERY_LEVEL_NORMAL);
                callback(null, battery);
            }).catch(function(err) {
                that.platform.log.error("[MiRobotVacuumPlatform][ERROR]RobotVacuumFanAccessory - Battery - getLevel Error: " + err);
                callback(err);
            });
        }.bind(this));
    var batChargingStateCharacteristic = batteryService.getCharacteristic(Characteristic.ChargingState);
    batChargingStateCharacteristic
        .on('get', function(callback) {
            that.device.call("get_status", []).then(result => {
                that.platform.log.debug("[MiRobotVacuumPlatform][DEBUG]RobotVacuumFanAccessory - Battery - getChargingState: " + JSON.stringify(result[0]));
                callback(null, result[0]['state'] === 8 ? Characteristic.ChargingState.CHARGING : Characteristic.ChargingState.NOT_CHARGING);
            }).catch(function(err) {
                that.platform.log.error("[MiRobotVacuumPlatform][ERROR]RobotVacuumFanAccessory - Battery - getChargingState Error: " + err);
                callback(err);
            });
        }.bind(this));
    services.push(batteryService);

    return services;
}

RobotVacuumFanAccessory.prototype.getLevelBySpeed = function(speed) {
    if(speed > 0 && speed <= 25) {
        return 38;
    } else if(speed > 25 && speed <= 50) {
        return 60;
    } else if (speed > 50 && speed <= 75) {
        return 77;
    } else if (speed > 75 && speed <= 100) {
        return 90;
    } else {
        return 60;
    }
}
