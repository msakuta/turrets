#!/usr/bin/python

"""
game-glut.py

A Python port of turrets
"""

import sys, numbers, gc
from math import *
from random import *

try:
  from OpenGL.GLUT import *
  from OpenGL.GL import *
  from OpenGL.GLU import *
except:
  print '''
ERROR: PyOpenGL not installed properly.  
        '''

try:
  from PIL import Image
except:
  print '''
ERROR: PIL not installed properly.  
        '''

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

class Entity(object):
	game = None
	pos = vec2(0,0)
	velo = vec2(0,0)
	health = 10
	xp = 0
	level = 1
	team = 0
	radius = 10

	def __init__(self,game,x,y):
		self.game = game
		self.x = x
		self.y = y

class Enemy(Entity):
	""" Class representing an enemy unit. """

	onUpdate = lambda self,dt: dt

	def __init__(self,game,x,y):
		Entity.__init__(self, game, x, y)
		self.vx = 0
		self.vy = 0
		self.radius = 7.5
		self.credit = randint(0,5)
		self.kills = 0
		self.damage = 0
		self.team = 1
		self.shootFrequency = lambda: 0.02

	def update(self,dt):
		self.vx += (self.game.width / 2 - self.x) * 0.005 + (random() - 0.5) * 15;
		self.vy += (self.game.height / 2 - self.y) * 0.005 + (random() - 0.5) * 15;
		self.vx *= 0.8;
		self.vy *= 0.8;
		self.x += self.vx * dt;
		self.y += self.vy * dt;
		if random() < self.shootFrequency():
			spd = 100.
			angle = random() * pi * 2.
			mat = [cos(angle), sin(angle), -sin(angle), cos(angle)]
			#self.game.addBullet(new Bullet(self.game, self.x, self.y, spd * mat[0], spd * mat[1], angle, self))

		self.onUpdate(dt)
		return True

	def draw(self):
		global enemyTex
		glBindTexture(GL_TEXTURE_2D, enemyTex)
		glPushMatrix()
		glTranslated(self.x, self.y, 0)
		glScaled(16,16,1)
		glBegin(GL_QUADS)
		glTexCoord2d(0,1); glVertex2d(-0.5, -0.5)
		glTexCoord2d(1,1); glVertex2d( 0.5, -0.5)
		glTexCoord2d(1,0); glVertex2d( 0.5,  0.5)
		glTexCoord2d(0,0); glVertex2d(-0.5,  0.5)
		glEnd()
		glPopMatrix()

class Game(object):
	def __init__(self, width, height):
		self.width = width
		self.height = height
		self.rng = random(); # Create Random Number Generator
		self.towers = []
		self.bullets = []
		self.enemies = []
		# A flag to defer initialization of game state to enale calling logic to
		# set event handlers on object creation in deserialization.
		self.initialized = False
		"""	this.pause = false;
			this.moving = false; ///< Moving something (temporary pause)
			this.mouseX = 0;
			this.mouseY = 0;
			this.score = 0;
			this.credit = 0;
			this.progress = 0;
			this.stage = null;
			this.stageClear = true;
			this.highScores = [];
		"""

	def update(self,dt):
		for e in self.enemies:
			e.update(dt)
		genCount = 1
		for j in range(genCount):
			edge = randint(0, 3)
			x = 0
			y = 0
			if edge == 0:
				x = 0
				y = self.height * random()
			elif edge == 1:
				x = self.width
				y = self.height * random()
			elif edge == 2:
				x = self.width * random()
				y = 0
			elif edge == 3:
				x = self.width * random()
				y = self.height
			e = Enemy(self, x, y)
			self.enemies.append(e)

	def draw(self):
		for e in self.enemies:
			e.draw()

game = Game(400, 400)



def gettex(path):
	img = Image.open(path)
	data = img.getdata()
	tex = glGenTextures(1)
	glBindTexture(GL_TEXTURE_2D, tex)
	glTexImage2D(GL_TEXTURE_2D, 0, GL_RGBA, img.size[0], img.size[1],
	        0, GL_RGBA, GL_UNSIGNED_BYTE, img.tostring())
	glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_MIN_FILTER, GL_LINEAR)
	glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_MAG_FILTER, GL_LINEAR)
	print "Image loaded: " + str(img.size)
#	img.show()
	return tex

def init():
	global quadratic, enemyTex
	glClearColor(0.0, 0.0, 0.0, 0.0)
	glClearDepth(1.0)
	glShadeModel(GL_SMOOTH)
	quadratic = gluNewQuadric()
#	gluQuadricNormals(quadratic, GLU_SMOOTH)
#	gluQuadricTexture(quadratic, GL_TRUE)
#	glEnable(GL_CULL_FACE)
#	glEnable(GL_DEPTH_TEST)
	enemyTex = gettex("assets/enemy.png")


def display():
	game.update(0.1)
	glClear(GL_COLOR_BUFFER_BIT | GL_DEPTH_BUFFER_BIT)

	glLoadIdentity()

	glEnable(GL_TEXTURE_2D)
	glColor4f(1,1,1,1)
	glEnable(GL_ALPHA_TEST)
	glAlphaFunc(GL_GREATER, .5)
	glEnable(GL_BLEND)
	glBlendFunc(GL_SRC_ALPHA, GL_ONE_MINUS_SRC_ALPHA); # Alpha blend

	game.draw()

	glBegin(GL_LINES)
	glColor3f (1.0, 0.0, 0.0)
	glVertex3d(-1000, 0, 0)
	glVertex3d( 1000, 0, 0)
	glColor3f (0.0, 1.0, 0.0)
	glVertex3d(0, -1000, 0)
	glVertex3d(0,  1000, 0)
	glColor3f (0.0, 0.0, 1.0)
	glVertex3d(0, 0, -1000)
	glVertex3d(0, 0,  1000)
	glEnd()

	deltaTime = 2

	glFlush()

	glutPostRedisplay()
#	print gc.get_count(), gc.garbage

mousestate = False
mousepos = [0,0]

def mouse(button, state, x, y):
	if state:
		mousestate = True
	else:
		mousestate = False
	mousepos[0] = x
	mousepos[1] = y

def motion(x, y):
	pass
"""	global phi, theta
	theta -= mousepos[1] - y
	if theta < -90:
		theta = -90
	if 90 < theta:
		theta = 90
	mousepos[1] = y
	phi -= mousepos[0] - x
	mousepos[0] = x"""

def keyboard(key, x, y):
	global dist
	if key == '+':
		dist /= 1.1
	if key == '-':
		dist *= 1.1
	if key == chr(27):
		sys.exit(0)

def reshape (w, h):
	glViewport(0, 0, w, h)
	glMatrixMode(GL_PROJECTION)
	glLoadIdentity()
	glOrtho(0, 400, 0, 400, -1, 1)
#	glFrustum(-1.0, 1.0, -1.0, 1.0, 1.5, 5000.0)
	glMatrixMode(GL_MODELVIEW)

glutInit(sys.argv)
glutInitDisplayMode(GLUT_SINGLE | GLUT_RGB)
glutInitWindowSize(500, 500)
glutInitWindowPosition(100, 100)
glutCreateWindow('Orbit Simulator')
init()
glutDisplayFunc(display)
glutReshapeFunc(reshape)
glutMouseFunc(mouse)
glutMotionFunc(motion)
glutKeyboardFunc(keyboard)
glutMainLoop()
