<div align="center">
    <a href="https://github.com/Hypfer/Valetudo"><img src="https://github.com/Hypfer/Valetudo/blob/master/assets/logo/valetudo_logo_with_name.svg" width="800" alt="valetudo"></a>
    <p align="center"><h2>I can't belive it's not Valetudo</h2></p>
</div>
This is a simple companion service for valetudo which does all the heavy lifting.

Since both CPU and Memory are limited on the robot, PNG generation for third-party components has been moved here.

Just run this via `npm start` on a host with enough resources. There's also a dockerfile.

To override the configuration inside the docker container, map it to `/app/config.json`. It looks like this:

```
{
        "mqtt" : {
            "identifier": "rockrobo",
            "topicPrefix": "valetudo",
            "autoconfPrefix": "homeassistant",
            "broker_url": "mqtt://user:pass@foobar.example",
            "caPath": "",
            "mapSettings": {
                "drawPath": true,
                "drawCharger": true,
                "drawRobot": true,
                "border": 2,
                "scale": 4
            },
            "mapDataTopic": "valetudo/rockrobo/map_data",
            "minMillisecondsBetweenMapUpdates": 10000,
            "publishMapImage": true
        },
        "webserver": {
            "enabled": false,
            "port": 3000
        }
}
```

### FHEM, ioBroker, etc
If you set `webserver.enabled` to `true`, the map PNG will be available at `http://host:port/api/map/image`
