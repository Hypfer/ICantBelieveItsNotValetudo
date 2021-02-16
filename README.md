<div align="center">
    <a href="https://github.com/Hypfer/Valetudo">
        <img src="https://github.com/Hypfer/Valetudo/blob/master/assets/logo/valetudo_logo_with_name.svg" width="800" alt="valetudo">
    </a>
    <p align="center"><h2>I can't belive it's not Valetudo</h2></p>
</div>

This is a simple map generation companion service for
[Valetudo](https://github.com/Hypfer/Valetudo) which does all the heavy
lifting.
Since both CPU and memory are limited on the robot, PNG generation for
third-party components has been moved here. The service receives raw map
data from the robot via MQTT, renders a map and publishes the resulting
PNG image via MQTT.

## Changes from upstream

Compared to [upstream](https://github.com/Hypfer/ICantBelieveItsNotValetudo/), this fork:

* greatly optimizes the algorithm generating the map
  + On the same hardware, with a scale factor of 2, it can compute the map in *~400ms* versus *~14000ms* (**~35x speedup**).
* avoids unnecessary computations, caching full maps and map layers
* supports map compression
* supports base-64 encoded maps
* removes support for old binary maps, supporting Valetudo 2021.01.1+ only
* removes the webserver
* removes support for overlay/underlay images
* removes support for manual cropping.

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
docker, map the configuration file to `/app/config.json` .

A basic example configuration would look like this:

``` json
{
    "mapSettings": {
        "drawPath": true,
        "drawCharger": true,
        "drawRobot": true,
        "scale": 2
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
    }
}
```

## Advanced Map Configuration

The appearance of the map is configured by the `mapSettings`

object. The default settings already produce a nice map, but you can 
use these advanced settings to further customize the map for better
integration into your home automation.

### Scaling

Since the map data has a resolution of approximately 5 cm per pixel, the
resulting images have a relatively low resolution. The map is therefore
scaled up by a factor of 2 by default. The scaling factor can be
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

``` json
{
    "mapSettings": {
        "colors": {
            "floor": "transparent",
            "obstacle": "hsl(120, 20%, 50%)",
            "path": "#333333"
        }
    },
    "mqtt" : {
    }
}
```

All valid
[CSS color values](https://developer.mozilla.org/en-US/docs/Web/CSS/color_value)
are accepted.

#### New Map Colors

You can now set colors for the new Valetudo Maps too - however - only hex values are supported. If you need to set the opacity you can do so using [8 digit hex code](https://gist.github.com/lopspower/03fb1cc0ac9f32ef38f4).
Since new Valetudo maps are using segments, new field in config has been added (other settings omitted for brevity):

``` json
{

    "mapSettings": {
        "colors": {
            "floor": "#0000FF",
            "obstacle": "#33333380",
            "segments": ["#000000", "FF0000", "00FF00", "0000FF"],
            "path": "#FFFFFF"
        }
    },
    "mqtt" : {
    }

}
```
