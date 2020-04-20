<div align="center">
    <a href="https://github.com/rand256/valetudo"><img src="https://github.com/rand256/valetudo/blob/testing/assets/logo/valetudo_logo_with_name.svg" width="800" alt="valetudo"></a>
    <p align="center"><h2>valetudo mapper</h2><h5>ex. <em>I can't belive it's not Valetudo</em></h5></p>
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
            "broker_url": "mqtt://user:pass@example.com:port",
            "caPath": "",
            "mapDataTopic": "valetudo/rockrobo/map_data",
            "minMillisecondsBetweenMapUpdates": 10000,
            "publishMapImage": true,
            "publishMapData": false
        },
        "mapSettings": {
            "colors": {
                background: "#33a1f5",
                background2: "#046cd4",
                floor: "#56affc",
                obstacle_strong: "#a1dbff",
                path: "white",
                forbidden_marker: "red",
                forbidden_zone: "rgba(255, 0, 0, 0.38)",
                cleaned_marker: "rgba(53, 125, 46, 1.0)",
                cleaned_zone: "rgba(107, 244, 66, 0.3)",
                cleaned_block: "rgba(107, 244, 36, 0.34)"
            },
            "drawPath": true,
            "drawCharger": true,
            "drawRobot": true,
            "drawCurrentlyCleanedZones": false,
            "drawCurrentlyCleanedBlocks": false,
            "drawForbiddenZones": true,
            "drawVirtualWalls": true,
            "border": 2,
            "scale": 4,
            "gradientBackground": true,
            "autoCrop": 20,
            "crop_x1": 30,
            "crop_y1": 70,
            "crop_x2": 440,
            "crop_y2": 440
        },
        "webserver": {
            "enabled": false,
            "port": 3000
        }
}
```

Guessed crop values allow to get rid of empty spaces at the edges of the image.

### Map PNG example in HA

![map](https://user-images.githubusercontent.com/30267719/67422498-45d8f480-f5db-11e9-8f23-b1472cfb0962.png)

Static raster image looks worse than browser generated via HTML Canvas but will do when JS is unavailable.

### FHEM, ioBroker, etc
If you set `webserver.enabled` to `true`, the map PNG will be available at `http://host:port/api/map/image`

### TheLastProject/lovelace-valetudo-map-card
To make Valetudo RE compatible with `lovelace-valetudo-map-card` project, enable `publishMapData` option and
set map sensor source in HA to `topicPrefix/identifier/map_data_parsed` (i.e. `valetudo/rockrobo/map_data_parsed`).
