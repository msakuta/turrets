#!/usr/bin/python

"""
mathlib.py

An utility library including functions and classes definition for
project turrets
"""

from math import *


# Utility 2D matrix functions
def matvp(m,v):
	""" Matrix Vector product """
	return vec2(m[0] * v[0] + m[1] * v[1], m[2] * v[0] + m[3] * v[1])

def mattvp(m,v):
	""" Matrix Transpose Vector product """
	return vec2(m[0] * v[0] + m[2] * v[1], m[1] * v[0] + m[3] * v[1])



def approach(src, dst, delta, wrap):
	""" Approach src to dst by delta, optionally wrapping around wrap """
	if src < dst:
		if dst - src < delta:
			return dst
		elif wrap and wrap / 2 < dst - src:
			ret = src - delta - floor((src - delta) / wrap) * wrap
			return dst if src < ret and ret < dst else ret
		return src + delta
	else:
		if src - dst < delta:
			return dst
		elif wrap and wrap / 2 < src - dst:
			ret = src + delta - floor((src + delta) / wrap) * wrap
			return dst if ret < src and dst < ret else ret
		else:return src - delta;

def rapproach(src, dst, delta):
	""" Rotation approach """
	return approach(src + pi, dst + pi, delta, pi * 2) - pi

class vec3(object):
	""" Basic 3-D vector implementation """
	x = 0
	y = 0
	z = 0
	def __init__(self, x=0, y=0, z=0):
		self.x = x
		self.y = y
		self.z = z
	def __neg__(self):
		return vec3(-self.x, -self.y, -self.z)
	def __add__(self, o):
		return vec3(self.x + o.x, self.y + o.y, self.z + o.z)
	def __sub__(self, o):
		return vec3(self.x - o.x, self.y - o.y, self.z - o.z)
	def __mul__(self, s):
		if not isinstance(s, numbers.Number):
			return NotImplemented
		return vec3(self.x * s, self.y * s, self.z * s)
	def __div__(self, s):
		if not isinstance(s, numbers.Number):
			return NotImplemented
		return vec3(self.x / s, self.y / s, self.z / s)
	def __repr__(self):
		return "(" + str(self.x) + "," + str(self.y) + "," + str(self.z) + ")"

	def __getitem__(self,key):
		if key == 0:
			return self.x
		elif key == 1:
			return self.y
		elif key == 2:
			return self.z
		else:
			raise RangeError

	def __setitem__(self,key,value):
		if key == 0:
			self.x = value
		elif key == 1:
			self.y = value
		elif key == 2:
			self.z = value

	def slen(self):
		return self.x ** 2 + self.y ** 2 + self.z ** 2
	def len(self):
		return sqrt(self.slen())

class vec2(object):
	""" Basic 2-D vector implementation """
	x = 0
	y = 0
	def __init__(self, x=0, y=0):
		self.x = x
		self.y = y
	def __neg__(self):
		return vec2(-self.x, -self.y)
	def __add__(self, o):
		return vec2(self.x + o.x, self.y + o.y)
	def __sub__(self, o):
		return vec2(self.x - o.x, self.y - o.y)
	def __mul__(self, s):
		if not isinstance(s, numbers.Number):
			return NotImplemented
		return vec2(self.x * s, self.y * s)
	def __div__(self, s):
		if not isinstance(s, numbers.Number):
			return NotImplemented
		return vec2(self.x / s, self.y / s)
	def __repr__(self):
		return "(" + str(self.x) + "," + str(self.y) + ")"

	def __getitem__(self,key):
		if key == 0:
			return self.x
		elif key == 1:
			return self.y
		else:
			raise RangeError

	def __setitem__(self,key,value):
		if key == 0:
			self.x = value
		elif key == 1:
			self.y = value

	def slen(self):
		return self.x ** 2 + self.y ** 2
	def len(self):
		return sqrt(self.slen())

	def toarray(self):
		return [self.x, self.y]

