<div align="center">
    <a href="https://github.com/Hypfer/Valetudo">
        <img src="https://github.com/Hypfer/Valetudo/blob/master/assets/logo/valetudo_logo_with_name.svg" width="800" alt="valetudo">
    </a>
    <p align="center"><h2>I can't belive it's not Valetudo</h2></p>
</div>

This is a simple map generation companion service for
[Valetudo](https://github.com/Hypfer/Valetudo) which does all the heavy
lifting.
Since both CPU and Memory are limited on the robot, PNG generation for
third-party components has been moved here. The service receives raw map
data from the robot via MQTT, renders a map and publishes the resulting
PNG image via MQTT and/or makes it available via a built-in web server.

Since I have no use for this service, this is only maintained on a very basic level.

Feel free to open PRs with improvements.

## Installation

*I can't belive it's not Valetudo* is built with JavaScript and requires
Node.js and npm to run.

Installation is easy: Clone this repository and run `npm install` to
install dependencies. Then run `npm start` to start the service.
If you prefer running services in containers, this repository includes
a dockerfile for you.

## Configuration
To configure *I can't belive it's not Valetudo*, create a file called
`config.json` in the working directory. You can also run `npm start` to
automatically create a default configuration file. If you are running in
docker, map the configuration file to `/app/config.json`.

A basic example configuration would look like this:

```json
{
    "mapSettings": {
        "drawPath": true,
        "drawCharger": true,
        "drawRobot": true,
        "scale": 4
    },
    "mqtt" : {
        "identifier": "rockrobo",
        "topicPrefix": "valetudo",
        "autoconfPrefix": "homeassistant",
        "broker_url": "mqtt://user:pass@foobar.example",
        "caPath": "",
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

## Integration with FHEM, ioBroker, etc
If you set `webserver.enabled` to `true`, the map PNG will be available
at `http://host:port/api/map/image` so you can display a map with any
home automation software that allows fetching images from a URL.
By default, the image data is published via MQTT to the topic set in
`mqtt.mapDataTopic`.

## Advanced Map Configuration
The appearance of the map is configured by the `mapSettings`
object. The default settings already produce a nice map, but you can 
use these advanced settings to further customize the map for better
integration into your home automation.

### Cropping
The map data received from the robot may contain lots of empty pixels
surrounding the area of interest.
To avoid huge margins in the output image, the raw data is auto-cropped.

If you don't want that you can either disable it with `autoCrop: false` or define a custom crop region:

The crop region is defined by the top left corner (`crop_x1` and
`crop_y1`) and the bottom right corner (`crop_x2` and `crop_y2`)
coordinates of a rectangle.
A `200px x 100px` crop region with the top left corner at
`(50px, 50px)` may thus be defined as (other settings omitted for
brevity):

```json
{
    "mapSettings": {
        "crop_x1": 50,
        "crop_y1": 50,
        "crop_x2": 250,
        "crop_y2": 150
    },
    "mqtt" : {
    },
    "webserver": {
    }
}
```

### Scaling
Since the map data has a resolution of approximately 5 cm per pixel, the
resulting images have a relatively low resolution. The map is therefore
scaled up by a factor of 4 by default. The scaling factor can be
configured by setting `mapSettings.scale` to the desired value.

To avoid blurred edges, the scaling is done with nearest-neighbor
interpolation.

### Rotating
Rotating the map can be achieved by setting the `mapSettings.rotate` to the desired value.

### Colors
The map is rendered using a blueish color map by default. The colors
of the floor, hard and weak obstacles as well as the robot's path can
be set via the `mapSettings.colors` object, e.g. (other settings
omitted for brevity):

```json
{
    "mapSettings": {
        "colors": {
            "floor": "transparent",
            "obstacle_weak": "rgba(0,0,0,0.1)",
            "obstacle_strong": "hsl(120, 20%, 50%)",
            "path": "#333333"
        }
    },
    "mqtt" : {
    },
    "webserver": {
    }
}
```

All valid
[CSS color values](https://developer.mozilla.org/en-US/docs/Web/CSS/color_value)
are accepted.

#### New Map Colors
You can now set colors for the new Valetudo Maps too - however - only hex values are supported. If you need to set the opacity you can do so using [8 digit hex code](https://gist.github.com/lopspower/03fb1cc0ac9f32ef38f4).
Since new Valetudo maps are using segments, new field in config has been added (other settings omitted for brevity):
```json
{
    "mapSettings": {
        "colors": {
            "floor": "#0000FF",
            "obstacle_strong": "#33333380",
            "segments": ["#000000", "FF0000", "00FF00", "0000FF"],
            "path": "#FFFFFF"
        }
    },
    "mqtt" : {
    },
    "webserver": {
    }
}
``` 

### Overlay and Underlay Images
The map can be further customized by adding overlay and underlay images.
This could be a floor plan showing the real walls or some fancy
background image. The images have to be in BMP, GIF, JPEG, PNG or TIFF
format and can be scaled as well as positioned relatively to the map.
A simple example for a background image would be (other settings omitted
for brevity):

```json
{
    "mapSettings": {
        "underlay_path": "/absolute/path/to/background_image.png",
        "underlay_scale": 1,
        "underlay_x": 0,
        "underlay_y": 0
    },
    "mqtt" : {
    },
    "webserver": {
    }
}
```

And, similarly for a overlay image (other settings omitted for brevity): 

```json
{
    "mapSettings": {
        "overlay_path": "/absolute/path/to/overlay_image.png",
        "overlay_scale": 1,
        "overlay_x": 0,
        "overlay_y": 0
    },
    "mqtt" : {
    },
    "webserver": {
    }
}
```

You probably have to try out various scaling and positioning values
before you find a good match between a floor plan and the map generated
by the robot.

**Note:** Overlay and underlay images are applied *after* rendering and
scaling the map data.
