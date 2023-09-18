<div align="center">
    <a href="https://github.com/Hypfer/Valetudo">
        <img src="https://github.com/Hypfer/Valetudo/blob/master/assets/logo/valetudo_logo_with_name.svg" width="800" alt="valetudo">
    </a>
    <p align="center"><h2>I can't believe it's not Valetudo</h2></p>
</div>

ICBINV is a companion service for Valetudo that renders ValetudoMap map data to raster graphics.

Incoming ValetudoMap Data is received via MQTT.
Rendered map images are published to MQTT and can optionally also be requested via HTTP (if enabled)

Please note that this service is only maintained on a very basic level.

## Why would I need this?

If you're using Home Assistant, you probably don't as the custom valetudo lovelace map card does a much better job
than ICBINV while also being way easier to install, update and use.

If you however use FHEM, OpenHAB or similar, this might be the only way to view the map data using your home automation system.

## Installation

The recommended install method for ICBINV is to clone the repo and then use the provided Dockerfile.

With docker-compose, it would look something like this:

```
  icantbelieveitsnotvaletudo:
    build:
      context: ./ICantBelieveItsNotValetudo/
      dockerfile: Dockerfile
    container_name: "ICantBelieveItsNotValetudo"
    restart: always
    volumes:
      - /opt/docker_containers/ICantBelieveItsNotValetudo/config.json:/app/config.json
```

If you have multiple robots, simply deploy multiple instances of ICBINV.


If you don't want to use docker, you will need to install a recent nodejs version + npm installed on your host.

First, install the dependencies with `npm ci`. Then, you can start the application by running `npm run start`.

## Configuration

To configure *I can't believe it's not Valetudo*, create a file called `config.json` in the working directory.
You can also run `npm start` to automatically create a default configuration file.

If you are running in docker, map the configuration file to `/app/config.json` .

The robot has to publish the map data via mqtt - so enusre `Provide map data` is enabled on your robots mqtt config.

## Integration with FHEM, ioBroker, openHAB etc

Enabling the webserver in the configuration file will allow you to fetch the latest rendered map image via `http://host:port/api/map/image`.<br/>
The map will also be available as base64-encoded string at `http://host:port/api/map/base64`.

By default, the image data is published via MQTT to `mqtt.topicPrefix/mqtt.identifier/MapData/map` as a raw binary image.<br/>
If `mqtt.publishAsBase64` is set to `true`, the image data will instead be published as base64-encoded string, which can be useful for OpenHAB.
