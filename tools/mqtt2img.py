#!/usr/bin/env python
# -*- coding: utf-8 -*-
from __future__ import division
import json, argparse, os

from PIL import Image, ImageDraw
import paho.mqtt.subscribe as subscribe

def json2img (data):
	"""
		Create vacuum image map from valetudo json data

		:param data: json map data from valetudo mqtt
		:return: the map as an image
		:rtype: Image from PIL

	"""
	size= ( data['image']['dimensions']['width'], data['image']['dimensions']['height'])
	left=data['image']['position']['left']
	top=data['image']['position']['top']
	#print (size)

	img = Image.new('RGBA', size)

	# draw floor & obstacles
	draw = ImageDraw.Draw(img)
	draw.point([ (x,y) for x,y in data['image']['pixels']["floor"] ],           fill=(  0, 118, 255))
	draw.point([ (x,y) for x,y in data['image']['pixels']["obstacle_weak"] ],   fill=(102, 153, 255))
	draw.point([ (x,y) for x,y in data['image']['pixels']["obstacle_strong"] ], fill=( 82, 174, 255))
	del draw

	# scale
	resized = img.resize ( (size[0]*4, size[1]*4) )

	# draw path
	draw = ImageDraw.Draw(resized)
	draw.line([ ((x//50-left)*4,(y//50-top)*4) for x,y in data['path']["points"] ], fill=(255,255,255))
	del draw

	# add charger & vacuum
	path = os.path.dirname(os.path.realpath(__file__))
	if "charger" in data:
		with Image.open("%s/img/charger.png"%(path)).convert('RGBA') as charger:
			x = (data['charger'][0] // 50 - left) * 4
			y = (data['charger'][1] // 50 - top) * 4
			resized.paste ( charger, (x,y), charger )
	with Image.open("%s/img/robot.png"%(path)).convert('RGBA') as robot:
		x = (data['robot'][0] // 50 - left) * 4
		y = (data['robot'][1] // 50 - top) * 4
		resized.paste ( robot.rotate (-data['path']['current_angle']-90), (x,y), robot )

	# crop to the map only
	box = resized.getbbox()
	cropped = resized.crop(box)

	# replace alpha channel by solid color
	bg = Image.new("RGBA", cropped.size, 'lightgrey')
	return Image.alpha_composite(bg, cropped).convert('RGB')

if __name__ == "__main__":
	parser = argparse.ArgumentParser(formatter_class=argparse.ArgumentDefaultsHelpFormatter)
	parser.add_argument("host", help="mqtt server (ie: valetudo broker_url)")
	parser.add_argument("name", help="mqtt id (ie: valetudo identifier)")
	parser.add_argument("-o", "--output", help="output image file", default="map.png")
	parser.add_argument("-t", "--topic", help="topicPrefix", default="valetudo")
	parser.add_argument("-p", "--password", help="MQTT password")
	parser.add_argument("-u", "--user", help="MQTT username")
	args = parser.parse_args()
	
	auth = None
	if args.user:
		auth = {"username": args.user}
		if args.password:
			auth["password"] = args.password

	message = subscribe.simple("%s/%s/map_data" % (args.topic, args.name), hostname=args.host, auth=auth)
	data = json.JSONDecoder().decode(message.payload.decode("utf-8"))

	img = json2img (data)
	img.save(args.output)

