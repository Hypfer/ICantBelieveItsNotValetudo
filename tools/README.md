A simple python script to get maps from Valetudo MQTT output.

## Dependencies

python libraries :
* [PIL/Pillow](https://pypi.org/project/Pillow/)
* [paho mqtt](https://pypi.org/project/paho-mqtt/)

On a debian-like system, you can install them this way :
```
apt install python-pil
pip install paho-mqtt
```

## Usage
```
usage: mqtt2img.py [-h] [-o OUTPUT] [-t TOPIC] host name

positional arguments:
  host                  mqtt server (ie: valetudo broker_url)
  name                  mqtt id (ie: valetudo identifier)

optional arguments:
  -h, --help            show this help message and exit
  -o OUTPUT, --output OUTPUT
                        output image file (default: map.png)
  -t TOPIC, --topic TOPIC
                        topicPrefix (default: valetudo)
```

Gather parameters from Valetudo *mqtt* section of `/mnt/data/valetudo/config.json` :
* *host* should be the same as *broker_url*
* *name* should be the same as *identifier*
* if different from *valetudo*, *topic* should be the same as *topicPrefix*

Example :
```
$ ./mqtt2img.py 192.168.0.125 micob
$ file map.png
map.png: PNG image data, 736 x 1092, 8-bit/color RGB, non-interlaced
```
