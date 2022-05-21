<div align="center">
    <a href="https://github.com/Hypfer/Valetudo">
        <img src="https://github.com/Hypfer/Valetudo/blob/master/assets/logo/valetudo_logo_with_name.svg" width="800" alt="valetudo">
    </a>
    <p align="center"><h2>I can't believe it's not Valetudo</h2></p>
</div>

This is a simple map generation companion service for
[Valetudo](https://github.com/Hypfer/Valetudo), which does all the heavy
lifting.
Since both CPU and memory are limited on the robot, PNG generation for
third-party components has been moved here. The service receives raw map
data from the robot via MQTT, renders a map and publishes the resulting
PNG image via MQTT.

Please note that in most setups, ICBINV will **not** be required.<br/>
Furthermore, note that this service is only maintained on a very basic level.

## Installation

*I can't believe it's not Valetudo* is built with JavaScript and requires
Node.js and npm to run.

Installation is easy: Clone this repository and run `npm install` to
install dependencies. Then run `npm start` to start the service.
If you prefer running services in containers, this repository includes
a dockerfile for you.

## Configuration

To configure *I can't believe it's not Valetudo*, create a file called
`config.json` in the working directory. You can also run `npm start` to
automatically create a default configuration file. If you are running in
docker, map the configuration file to `/app/config.json` .

## Integration with FHEM, ioBroker, openHAB etc
If you set `webserver.enabled` to `true`, the map PNG will be available
at `http://host:port/api/map/image` so you can display a map with any
home automation software that allows fetching images from a URL.
The map will also be available as base64-encoded string at 
`http://host:port/api/map/base64`.
By default, the image data is published via MQTT to `mqtt.topicPrefix/mqtt.identifier/MapData/map`, if `mqtt.publishAsBase64` is set to `true`, the image data is published as base64-encoded string (a.e. for openHAB).
