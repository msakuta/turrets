#!/usr/bin/python

"""
game-glut.py

A Python port of turrets
"""

import sys, numbers, gc, time, json
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

# Utility 2D matrix functions
def matvp(m,v):
	""" Matrix Vector product """
	return [m[0] * v[0] + m[1] * v[1], m[2] * v[0] + m[3] * v[1]]

def mattvp(m,v):
	""" Matrix Transpose Vector product """
	return [m[0] * v[0] + m[2] * v[1], m[1] * v[0] + m[3] * v[1]]



def approach(src, dst, delta, wrap):
	""" Approach src to dst by delta, optionally wrapping around wrap """
	if src < dst:
		if dst - src < delta:
			return dst
		elif wrap and wrap / 2 < dst - src:
			ret = src - delta - floor((src - delta) / wrap) * wrap
			return src < ret and (dst if ret < dst else ret)
		return src + delta
	else:
		if src - dst < delta:
			return dst
		elif wrap and wrap / 2 < src - dst:
			ret = src + delta - floor((src + delta) / wrap) * wrap
			return ret < src and dst if dst < ret else ret
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

def gettex(path, params = {}):
	img = Image.open(path)
	tex = glGenTextures(1)
	glBindTexture(GL_TEXTURE_2D, tex)
	glTexImage2D(GL_TEXTURE_2D, 0, GL_RGBA, img.size[0], img.size[1],
	        0, GL_RGBA, GL_UNSIGNED_BYTE, img.convert("RGBA").tostring())
	glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_MIN_FILTER, GL_LINEAR)
	glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_MAG_FILTER, GL_LINEAR)
	print "Image loaded: path: %s, tex: %d, size: %s" % (path, tex, img.size)
	params["tex"] = tex
	params["size"] = img.size
#	img.show()
	return tex

class Entity(object):
	game = None
	pos = vec2(0,0)
	velo = vec2(0,0)
	angle = 0
	xp = 0
	level = 1
	team = 0
	radius = 10

	def __init__(self,game,x,y):
		self.game = game
		self.x = x
		self.y = y
		self.health = self.maxHealth

	def _set_pos(self,v): self.x=v[0], self.y=v[1]
		
	def _getMaxHealth(self):
		return 10

	pos = property(lambda self: vec2(self.x, self.y), _set_pos, None)
	
	nextXp = property(lambda self: ceil(1.5 ** self.level * 100));
	maxHealth = property(_getMaxHealth)

	def getRot(self,angle):
		return [cos(angle), sin(angle), -sin(angle), cos(angle)]

	def measureDistance(self, other):
		return sqrt((self.x - other.x) * (self.x - other.x) + (self.y - other.y) * (self.y - other.y))

	def receiveDamage(self,damage):
		if 0 < self.health and self.health - damage <= 0:
			self.onDeath()
		self.health -= damage
		return self.health < 0

	def onKill(self,e): pass

	onUpdate = lambda self,dt: dt
	onDeath = lambda self: None
	onDelete = lambda self: None

	def draw(self):
		texParams = self.getTexture()
		glBindTexture(GL_TEXTURE_2D, texParams["tex"])
		glPushMatrix()
		glTranslated(self.x, self.y, 0)
		glEnable(GL_TEXTURE_2D)
		glEnable(GL_ALPHA_TEST)
		glRotated(self.angle * 180 / pi - 90, 0, 0, 1)
		glColor3f(1,1,1)
		glScaled(texParams["size"][0],texParams["size"][1],1)
		glBegin(GL_QUADS)
		glTexCoord2d(0,1); glVertex2d(-0.5, -0.5)
		glTexCoord2d(1,1); glVertex2d( 0.5, -0.5)
		glTexCoord2d(1,0); glVertex2d( 0.5,  0.5)
		glTexCoord2d(0,0); glVertex2d(-0.5,  0.5)
		glEnd()
		glPopMatrix()

class Tower(Entity):
	idGen = 0
	target = None
	rotateSpeed = pi / 10. # Radians per frame
	stickiness = 1

	def __init__(self,game,x,y):
		Entity.__init__(self,game,x,y)
		self.angle = 0
		self.health = self.maxHealth
		self.target = None
		self.id = Tower.idGen
		Tower.idGen += 1
		self.cooldown = 4
		self.kills = 0
		self.damage = 0
		print "init " + str(self.id)

	maxHealth = property(lambda self: ceil(1.2 ** self.level * 10))

	@staticmethod
	def cost():
		return ceil(1.5 ** len(game.towers) * 100)

	def getShootTolerance(self):
		return self.rotateSpeed

	@staticmethod
	def dispName():
		return "Machine Gun";
	
	def serialize(self):
		v = self
		return dict(
			className = v.__class__.__name__	,
			kills = v.kills,
			damage = v.damage,
			x = v.x,
			y = v.y,
			angle = v.angle,
			health = v.health,
			level = v.level,
			xp = v.xp
		)

	def deserialize(self,data):
		self.angle = data["angle"]
		self.kills = data["kills"]
		self.damage = data["damage"]
		self.health = data["health"]
		if "level" in data: self.level = data["level"]
		if "xp" in data: self.xp = data["xp"]

	def shoot(self):
		spd = 100
		mat = [cos(self.angle), sin(self.angle), -sin(self.angle), cos(self.angle)]
		for i in [-1,1]:
			ofs = mattvp(mat, [0, i * 5])
			b = Bullet(self.game, self.x + ofs[0], self.y + ofs[1], spd * mat[0], spd * mat[1], self.angle, self)
			b.damage = pow(1.2, self.level)
			self.game.addBullet(b)
		self.cooldown = self.getCooldownTime()

	def getCooldownTime(self):
		return 4

	def getDPS(self,frameTime):
		return 2 * 1.2 ** self.level / self.getCooldownTime() / frameTime
	
	def getRange(self):
		return None

	def update(self,dt):
		enemies = self.game.enemies
		nearest = None
		nearestDist = 1e6

		# If this tower is sticky, tolerate before switching target
		if self.target != None:
			nearestDist = self.measureDistance(self.target) / self.stickiness
		for e in enemies:
			dist = self.measureDistance(e)
			if dist < nearestDist:
				nearestDist = dist
				nearest = e

		if nearest != None:
			self.target = nearest
			#print "targetted " + str(self.target)
		if self.target != None and self.target.health <= 0:
			self.target = None

		if self.target != None:
			desiredAngle = atan2(self.target.y - self.y, self.target.x - self.x)
			self.angle = rapproach(self.angle, desiredAngle, self.rotateSpeed)
			dangle = self.angle - desiredAngle
			dangle -= floor(dangle / (pi * 2)) * pi * 2
			if dangle < self.getShootTolerance() and self.cooldown <= 0:
				self.shoot()
			#print self.angle

		if 0 < self.cooldown:
			self.cooldown -= 1

		self.onUpdate(dt)

		return True

	def gainXp(self,xp):
		self.xp += xp;
		while self.nextXp <= self.xp:
			self.level += 1
			self.health = self.maxHealth # Fully recover

	tex = None
	texParams = {}
	def getTexture(self):
		# Load on first use
		if Tower.tex == None:
			Tower.tex = gettex("assets/turret.png", Tower.texParams)
		return Tower.texParams
			
	def onKill(self,e):
		if e.team != 0:
			self.game.score += e.maxHealth
			self.game.credit += e.credit
		self.kills += 1
		self.gainXp(e.maxHealth)

	def onDeath(self):
		global explo2Tex
		self.game.removeTower(self)
		self.game.effects.append(SpriteEffect(self.x, self.y, explo2Tex))

class ShotgunTower(Tower):
	""" Tower with a shotgun, which shoots spreading bullets """

	@staticmethod
	def dispName(): return "Shotgun"

	@staticmethod
	def cost(): return ceil(1.5 ** len(game.towers) * 150)

	def shoot(self):
		spd = 100
		bullets = int(floor(5 + self.level / 2))
		for i in range(-bullets, bullets+1):
			angle = self.angle + i * pi / 40.
			mat = self.getRot(angle)
			ofs = mattvp(mat, [0, i * 5])
			b = Bullet(self.game, self.x, self.y, spd * mat[0], spd * mat[1], angle, self)
			b.damage = 1.2 ** self.level
			self.game.addBullet(b)
		self.cooldown = self.getCooldownTime()

	def getCooldownTime(self):
		return 20

	def getDPS(self,frameTime):
		return floor(5 + self.level / 2) * (1.2 ** self.level) / self.getCooldownTime() / frameTime

	tex = None
	texParams = {}
	def getTexture(self):
		# Load on first use
		if ShotgunTower.tex == None:
			ShotgunTower.tex = gettex("assets/shotgun.png", ShotgunTower.texParams)
		return ShotgunTower.texParams


class HealerTower(Tower):
	""" Tower with capability to heal nearby towers """

	def __init__(self,game,x,y):
		Tower.__init__(self,game,x,y)

	@staticmethod
	def dispName(): return "Healer"

	@staticmethod
	def cost():
		return ceil(1.5 ** len(game.towers) * 200)

	healAmount = property(lambda self: 1 + 0.1 * self.level)

	def shoot(self):
		if self.target != None and self.target.health < self.target.maxHealth:
			self.target.health = min(self.target.maxHealth, self.target.health + self.healAmount)
			self.damage += self.healAmount
			self.game.onHeal(self.target, self)
			self.gainXp(3 * self.healAmount) # Healer has less opprtunity to gain experience than offensive towers, so gain high exp on healing
			self.cooldown = ceil(4 + 320 / (10 + self.level))

	def getDPS(self,frameTime):
		return -self.healAmount / ceil(4 + 320 / (10 + self.level)) / frameTime

	def update(self,dt):
		towers = self.game.towers
		damaged = None
		heaviestDamage = 0
		# Find the most damaged tower in the game
		for t in towers:
			# Do not allow healing itself and those out of range
			if t == self or self.getRange() < t.measureDistance(self):
				continue
			damage = 1 - t.health / t.maxHealth
			if heaviestDamage < damage:
				heaviestDamage = damage
				damaged = t
		self.target = damaged

		if self.target != None:
			desiredAngle = atan2(self.target.y - self.y, self.target.x - self.x)
			self.angle = rapproach(self.angle, desiredAngle, pi / 10.)
			if self.cooldown <= 0 and abs(self.angle - desiredAngle) < pi / 10.:
				self.shoot()

		if 0 < self.cooldown:
			self.cooldown -= 1

		self.onUpdate(dt)

		return True;

	tex = None
	texParams = {}
	def getTexture(self):
		# Load on first use
		if HealerTower.tex == None:
			HealerTower.tex = gettex("assets/healer.png", HealerTower.texParams)
		return HealerTower.texParams

	def getRange(self):
		return ceil((self.level + 10) * 5)

class BeamTower(Tower):
	""" Tower with a beam cannon which penetrates through enemies """
	
	def __init__(self,game,x,y):
		Tower.__init__(self,game,x,y)
		self.radius = 18;
		self.cooldown = 15;
		self.shootPhase = 0;

	rotateSpeed = pi / 30.
	stickiness = 3
	beamLength = 400
	beamWidth = 8

	maxHealth = property(lambda self: ceil(1.2 ** self.level * 25))

	nextXp = property(lambda self: ceil(1.5 ** (self.level-1) * 500))

	@staticmethod
	def dispName():
		return "BeamTower"

	@staticmethod
	def cost():
		return ceil(1.5 ** len(game.towers) * 350)

	def getDamage(self):
		return 5 * 1.2 ** self.level

	def shoot(self):
		if self.target != None and self.cooldown == 0:
			self.shootPhase = 45
			self.cooldown = 90

	def getDPS(self,frameTime):
		return self.getDamage() * 45 / 90 / frameTime

	def update(self,dt):
		if not Tower.update(self, dt):
			return False
		if 0 < self.shootPhase:
			self.shootBeam(dt)
			self.shootPhase -= 1
		return True

	def shootBeam(self,dt):
		enemies = self.game.enemies if isinstance(self, BeamTower) else self.game.towers
		angle = self.angle
		mat = self.getRot(angle)
		# The beam penetrates through all enemies (good against crowd)
		for e in enemies:
			# Distance of the target from the beam axis
			dotx = (e.x - self.x) * mat[2] + (e.y - self.y) * mat[3]
			# Position of the target along the beam axis
			doty = (e.x - self.x) * mat[0] + (e.y - self.y) * mat[1]
			# Check intersection of the beam with the target
			if abs(dotx) < e.radius + 10 and 0 <= doty and doty < self.beamLength + e.radius:
				self.damage += self.getDamage()
				self.game.onBeamHit(e.x, e.y)
				if e.receiveDamage(self.getDamage()):
					self.onKill(e);

	tex = None
	texParams = {}
	def getTexture(self):
		# Load on first use
		if BeamTower.tex == None:
			BeamTower.tex = gettex("assets/BeamTower.png", BeamTower.texParams)
		return BeamTower.texParams
	
	def draw(self):
		Tower.draw(self)
		if 0 < self.shootPhase:
			glPushMatrix()
			glTranslated(self.x, self.y, 0)
			glRotated(self.angle * 180 / pi, 0, 0, 1)
			glScaled(self.beamLength, self.beamWidth * 0.5, 1)
			glDisable(GL_TEXTURE_2D)
			glDisable(GL_ALPHA_TEST)
			glEnable(GL_BLEND)
			glBegin(GL_QUAD_STRIP)
			glColor4f(1, 0.5, 1, 0)
			glVertex2d(0, -1)
			glVertex2d(1, -1)
			glColor4f(1, 0.5, 1, 1)
			glVertex2d(0, 0)
			glVertex2d(1, 0)
			glColor4f(1, 0.5, 1, 0)
			glVertex2d(0, 1)
			glVertex2d(1, 1)
			glEnd()
			glPopMatrix()

class MissileTower(Tower):
	""" Tower launching missiles """
	missileTowerTex = None
	missileTowerTexParams = {}
	def __init__(self,game,x,y):
		Tower.__init__(self,game,x,y)
		self.radius = 18
		self.cooldown = 15
		self.shootPhase = 0

	rotateSpeed = pi / 30.
	def getShootTolerance(self):
		return pi
	stickiness = 3

	def _getMaxHealth(self):
		return ceil(pow(1.2, self.level) * 25)
	
	maxHealth = property(_getMaxHealth)

	nextXp = property(lambda(self): ceil(1.5 ** (self.level-1) * 500))

	@staticmethod
	def dispName():
		return "MissileTower"

	@staticmethod
	def cost():
		return ceil(1.5 ** len(game.towers) * 350)

	def getDamage(self):
		return 30 * pow(1.2, self.level)

	def getCooldownTime(self):
		return 30

	def shoot(self):
		spd = 100
		bullets = floor(5 + self.level / 2)
		for i in [-2,-1,1,2]:
			angle = self.angle + i * pi * 0.05
			mat = self.getRot(angle)
			pos = mattvp(mat, [-abs(i) * 2 + 10, i * 6])
			b = Missile(self.game, self.x + pos[0], self.y + pos[1], spd * mat[0], spd * mat[1], angle, self)
			b.damage = self.getDamage()
			b.target = self.target
			b.speed = 100
			b.rotateSpeed = pi
			self.game.addBullet(b)
		self.cooldown = self.getCooldownTime();

	def getDPS(self,frameTime):
		return self.getDamage() / self.getCooldownTime() / frameTime

	tex = None
	texParams = {}
	def getTexture(self):
		# Load on first use
		if MissileTower.tex == None:
			MissileTower.tex = gettex("assets/MissileTower.png", MissileTower.texParams)
		return MissileTower.texParams

class Bullet(Entity):
	def __init__(self,game,x,y,vx,vy,angle,owner):
		self.game = game
		self.x = x
		self.y = y
		self.vx = vx
		self.vy = vy
		self.angle = angle
		self.owner = owner
		self.team = owner.team
		self.damage = 1
		self.vanished = False
		self.alive = True

	def update(self,dt):
		self.x += self.vx * dt;
		self.y += self.vy * dt;
		enemies = self.game.enemies if self.team == 0 else self.game.towers
		for e in enemies:
			if e.measureDistance(self) < e.radius:
				self.owner.damage += self.damage
				if e.receiveDamage(self.damage):
					self.owner.onKill(e)
				self.game.removeBullet(self)
				return 0
		self.onUpdate(dt);
		if 0 < self.x and self.x < self.game.width and 0 < self.y and self.y < self.game.height:
			return 1
		else:
			# Hitting edge won't trigger bullet hit effect
			self.vanished = True
			self.game.removeBullet(self)
			return 0

	def draw(self):
		glDisable(GL_TEXTURE_2D)
		glPushMatrix()
		glColor3fv([1,0,0] if self.team == 0 else [1,1,0])
		glTranslated(self.x, self.y, 0)
		glRotated(self.angle * 360 / pi / 2, 0, 0, 1)
		glScaled(16,16,1)
		glBegin(GL_QUADS)
		glVertex2d(-0.5, -0.1)
		glVertex2d( 0.5, -0.1)
		glVertex2d( 0.5,  0.1)
		glVertex2d(-0.5,  0.1)
		glEnd()
		glPopMatrix()

	def onDelete(self):
		global exploTex
		if not self.vanished:
			self.game.effects.append(SpriteEffect(self.x, self.y, exploTex))
		self.alive = False


class Missile(Bullet):
	""" A guided missile """
	tex = None
	texParams = {}

	def __init__(self,game,x,y,vx,vy,angle,owner):
		Bullet.__init__(self, game,x,y,vx,vy,angle,owner);
		self.life = 10;
		self.seekTime = 8;
		self.speed = 75;
		self.rotateSpeed = pi * 0.5;
		self.target = None;
		game.effects.append(TrailEffect(x,y,self))

	def update(self,dt):
		if not Bullet.update(self, dt):
			return False
		if 0 < self.seekTime:
			self.seekTime -= 1
			return True

		# Search for target if already have none
		if self.target == None or self.target.health <= 0:
			enemies = self.game.enemies if self.team == 0 else self.game.towers
			nearest = None
			nearestSDist = 300 * 300
			predPos = [self.x + self.speed / self.rotateSpeed * cos(self.angle),
				self.y + self.speed / self.rotateSpeed * sin(self.angle)]
			for e in enemies:
				dv = [e.x - predPos[0], e.y - predPos[1]]
				if 0 < e.health and dv[0] * dv[0] + dv[1] * dv[1] < nearestSDist:
					nearest = e
					nearestSDist = dv[0] * dv[0] + dv[1] * dv[1]
			if nearest != None:
				self.target = nearest

		# Guide toward target
		if self.target != None and 0 < self.target.health:
			self.angle = rapproach(self.angle, atan2(self.target.y - self.y, self.target.x - self.x), self.rotateSpeed * dt)
			self.vx = self.speed * cos(self.angle)
			self.vy = self.speed * sin(self.angle);
		return True

	def draw(self):
		# Load on first use
		if Missile.tex == None:
			Missile.tex = gettex("assets/Missile.png", Missile.texParams)
		glBindTexture(GL_TEXTURE_2D, Missile.tex)
		glEnable(GL_TEXTURE_2D)
		glDisable(GL_BLEND)
		glPushMatrix()
		glTranslated(self.x, self.y, 0)
		glRotated(self.angle * 180 / pi - 90, 0, 0, 1)
		glColor3f(1,1,1)
		#print Missile.tex
		glScaled(Missile.texParams["size"][0],Missile.texParams["size"][1],1)
		glBegin(GL_QUADS)
		glTexCoord2d(0,1); glVertex2d(-0.5, -0.5)
		glTexCoord2d(1,1); glVertex2d( 0.5, -0.5)
		glTexCoord2d(1,0); glVertex2d( 0.5,  0.5)
		glTexCoord2d(0,0); glVertex2d(-0.5,  0.5)
		glEnd()
		glPopMatrix()

class Enemy(Entity):
	""" Class representing an enemy unit. """

	def __init__(self,game,x,y):
		Entity.__init__(self, game, x, y)
		self.vx = 0
		self.vy = 0
		self.angle = pi / 2
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
			self.game.addBullet(Bullet(self.game, self.x, self.y,
										   spd * mat[0], spd * mat[1], angle, self))

		self.onUpdate(dt)
		return True

	def onDeath(self):
		global explo2Tex
		self.game.removeEnemy(self)
		self.game.effects.append(SpriteEffect(self.x, self.y, explo2Tex))

	tex = None
	texParams = {}
	def getTexture(self):
		# Load on first use
		if Enemy.tex == None:
			Enemy.tex = gettex("assets/enemy.png", Enemy.texParams)
		return Enemy.texParams

class Effect(object):
	def __init__(self,x,y):
		self.x = x
		self.y = y

	def update(self,dt):
		return False

	def draw(self):
		pass

class SpriteEffect(Effect):
	def __init__(self,x,y,tex):
		Effect.__init__(self,x,y)
		self.tex = tex
		self.frame = 0
		self.totalFrames = tex["totalFrames"]

	def update(self,dt):
		self.frame += dt * self.tex["speed"]
		return self.frame < self.totalFrames

	def draw(self):
		glBindTexture(GL_TEXTURE_2D, self.tex["tex"])
		glEnable(GL_TEXTURE_2D)
		glPushMatrix()
		glTranslated(self.x, self.y, 0)
		glScaled(self.tex["size"], self.tex["size"], 1)
		glColor3f(1,1,1)
		frame = floor(self.frame)
		unit = 1./self.totalFrames
		glBegin(GL_QUADS)
		glTexCoord2d(frame*unit,1); glVertex2d(-0.5, -0.5)
		glTexCoord2d((frame+1)*unit,1); glVertex2d( 0.5, -0.5)
		glTexCoord2d((frame+1)*unit,0); glVertex2d( 0.5,  0.5)
		glTexCoord2d(frame*unit,0); glVertex2d(-0.5,  0.5)
		glEnd()
		glPopMatrix()

class TrailEffect(Effect):
	trailLen = 50
	def __init__(self,x,y,follow):
		Effect.__init__(self,x,y)
		self.follow = follow
		self.trails = []
		self.headAge = 0

	def update(self,dt):
		if self.follow.alive:
			self.trails.append(self.follow.pos)
		else:
			self.headAge += 1
			#del self.trails[0]
			if self.trailLen < self.headAge:
				return False
		return True

	def draw(self):
		glEnable(GL_BLEND)
		glBlendFunc(GL_SRC_ALPHA, GL_ONE_MINUS_SRC_ALPHA); # Alpha blend
		glDisable(GL_TEXTURE_2D)
		glDisable(GL_ALPHA_TEST)
		glLineWidth(2)
		glEnable(GL_LINE_SMOOTH)
		glHint( GL_LINE_SMOOTH_HINT, GL_NICEST )
		glBegin(GL_LINE_STRIP)
		f = 1. - float(self.headAge) / self.trailLen
		for i in range(len(self.trails)-1,-1,-1):
			v = self.trails[i]
			#f = float(i - len(self.trails) + self.trailLen - self.headAge) / self.trailLen
			glColor4f(1, 0.5, 1, f)
			glVertex2d(v[0], v[1])
			f -= 1. / self.trailLen
			if f < 0:
				del self.trails[0:i]
				break
		glEnd()

class HealEffect(Effect):
	maxLife = 2
	life = maxLife
	tess = None
	
	def __init__(self, target, src):
		Effect.__init__(self, target.x, target.y)
		self.target = target
		self.src = src

	def update(self,dt):
		self.life -= dt
		self.y += dt * 10
		return 0 < self.life

	@staticmethod
	def MakeTess():
		HealEffect.tess = gluNewTess()
		if HealEffect.tess == None:
			print "Can't make tessellator\n"
			return
		def TessErr(error_code):
			print gluErrorString(error_code)
		tess = HealEffect.tess
		gluTessCallback(tess, GLU_TESS_BEGIN, glBegin)
		gluTessCallback(tess, GLU_TESS_END, glEnd)
		gluTessCallback(tess, GLU_TESS_ERROR, TessErr)
		gluTessCallback(tess, GLU_TESS_VERTEX, glVertex2dv)

	def draw(self):
		if HealEffect.tess == None:
			HealEffect.MakeTess()
		glDisable(GL_TEXTURE_2D)
		glDisable(GL_ALPHA_TEST)
		glEnable(GL_BLEND)

		glColor4f(0,1,0.5, self.life / self.maxLife)

		glLineWidth(2)
		glBegin(GL_LINES)
		glVertex2dv(self.target.pos.toarray())
		glVertex2dv(self.src.pos.toarray())
		glEnd()

		glPushMatrix()
		glTranslated(self.x, self.y, 0)
		points = [[-10, -3],[-3, -3],[-3, -10],[3, -10],[3, -3],
			[10, -3],[10, 3],[3, 3],[3, 10],[-3, 10],[-3, 3],[-10, 3]]
		gluTessBeginPolygon(self.tess, None)
		try:
			gluTessBeginContour(self.tess)
			try:
				for p in points:
					gluTessVertex(self.tess, p + [0], p)
			finally:
				gluTessEndContour(self.tess)
		finally:
			gluTessEndPolygon(self.tess)
		glPopMatrix()
	
		glPushMatrix()
		glColor4f(0,1,0.5, self.life / self.maxLife * 0.5)
		glTranslated(self.src.x, self.src.y, 0)
		scale = (self.maxLife - self.life) * 10
		glScaled(scale, scale, 1)
		glBegin(GL_POLYGON)
		for i in range(0,32):
			a = i*pi*2/32
			glVertex2d(cos(a), sin(a))
		glEnd()
		glPopMatrix()


def drawText(value, x,y):
	"""Draw the given text at given 2D position in window """
	glMatrixMode(GL_MODELVIEW);
	glPushMatrix();
	glLoadIdentity();
	glRasterPos2d(x, y);
	lines = 0
	for character in value:
		if character == '\n':
			lines += 1
			glRasterPos2d(x, y-(lines*12))
		else:
			glutBitmapCharacter(GLUT_BITMAP_HELVETICA_10, ord(character));
	glPopMatrix();

class Game(object):
	def __init__(self, width, height):
		self.width = width
		self.height = height
		self.rng = random(); # Create Random Number Generator
		self.towers = []
		self.bullets = []
		self.enemies = []
		self.effects = []
		self.selectedTower = None
		# A flag to defer initialization of game state to enale calling logic to
		# set event handlers on object creation in deserialization.
		self.initialized = False
		self.pause = False
		self.moving = False # Moving something (temporary pause)
		self.mouseX = 0
		self.mouseY = 0
		self.score = 0
		self.credit = 5000
		self.progress = 0
		self.stage = None
		self.stageClear = True
		self.highScores = []
		self.backTex = {}

		for i in range(3):
			tower = Tower(self, random() * 200 + 150, random() * 200 + 150)
			self.towers.append(tower)
		for i in range(2):
			tower = HealerTower(self, random() * 200 + 150, random() * 200 + 150)
			self.towers.append(tower)
		for t in self.towers:
			self.separateTower(t)

	def serialize(self):
		saveData = dict(credit = self.credit, highScores = self.highScores)
		towers = []
		for v in self.towers:
			towers.append(v.serialize())
		saveData["towers"] = towers
		return json.dumps(saveData)

	def deserialize(self,stream):
		data = json.loads(stream)
		if data != None:
			self.highScores = data["highScores"]
			self.credit = data["credit"]
			self.towers = []
			i = 0
			for tow in data["towers"]:
				if tow["className"] in globals():
					classType = globals()[tow["className"]]
					newTower = classType(self, tow["x"], tow["y"])
					newTower.id = i
					i += 1
					newTower.deserialize(tow)
					self.towers.append(newTower)
					self.addTowerEvent(newTower)
			self.bullets = []
			self.enemies = []
			self.effects = []
			self.selectedTower = None
		else:
			self.towers = []
			for i in range(3):
				tower = Tower(self, random() * 200 + 150, random() * 200 + 150)
				self.towers.append(tower)

	def update(self,dt):
		for t in self.towers:
			t.update(dt)
		for b in self.bullets:
			b.update(dt)
		for e in self.enemies:
			e.update(dt)
		for e in self.effects:
			if not e.update(dt):
				self.effects.remove(e)
		genCount = random

		""" A pseudo-random number generator distributed in Poisson distribution.
		 It uses Knuth's algorithm, which is not optimal when lambda gets
		 so high.  We probably should use an approximation. """
		def poissonRandom(lmda):
			L = exp(-lmda)
			k = 0
			p = 1
			while L < p:
				k += 1
				p *= random()
			return k - 1

		genCount = poissonRandom(0.3)

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

	def addBullet(self,b):
		self.bullets.append(b)

	def draw(self):
		if "tex" not in self.backTex:
			gettex("assets/back2.jpg", self.backTex)
		if self.backTex["tex"] != 0:
			glBindTexture(GL_TEXTURE_2D, self.backTex["tex"])
			glPushMatrix()
			glEnable(GL_TEXTURE_2D)
			glColor3f(1,1,1)
			glScaled(self.width, self.height, 1)
			glBegin(GL_QUADS)
			glTexCoord2d(0,1); glVertex2d(0, 0)
			glTexCoord2d(1,1); glVertex2d(1, 0)
			glTexCoord2d(1,0); glVertex2d(1, 1)
			glTexCoord2d(0,0); glVertex2d(0, 1)
			glEnd()
			glPopMatrix()

		for t in self.towers:
			t.draw()
		for e in self.enemies:
			e.draw()
		for b in self.bullets:
			b.draw()
		for e in self.effects:
			e.draw()
		if self.selectedTower != None:
			t = self.selectedTower
			#print "in-radius: " , t
			glPushMatrix()
			glDisable(GL_TEXTURE_2D)
			glDisable(GL_ALPHA_TEST)
			glLineWidth(1)
			glTranslated(t.x, t.y, 0)
			
			# Show hit radius
			glColor4f(0,1,1,1)
			glBegin(GL_LINE_LOOP)
			for i in range(32):
				glVertex2d(t.radius * cos(i * pi * 2 / 32), t.radius * sin(i * pi * 2 / 32))
			glEnd()
			
			# Show targeting range if available
			if t.getRange() != None:
				r = t.getRange()
				glBegin(GL_LINE_LOOP)
				for i in range(32):
					a = i * pi * 2 / 32
					glVertex2d(r * cos(a), r * sin(a))
				glEnd()

			glColor4f(0,0,0,0.5)
			for i in [([0,0,0,0.75], GL_QUADS), ([1,1,1,1], GL_LINE_LOOP)]:
				glColor4fv(i[0])
				glBegin(i[1])
				glVertex2d(-50, -10)
				glVertex2d(50, -10)
				glVertex2d(50, -100)
				glVertex2d(-50, -100)
				glEnd()
			text = "Kills: %d\n" % t.kills
			text += "Damage: %g\n" % ceil(t.damage)
			text += "Health: %g/%g\n" % (ceil(t.health), ceil(t.maxHealth))
			text += "Level: %d\n" % t.level
			text += "XP: %d/%d\n" % (t.xp, t.nextXp)
			text += "Range: %s\n" % str(t.getRange())
			text += "DPS: %g\n" % t.getDPS(1. / 60.)
			drawText(text, t.x - 45, t.y - 20)
			glPopMatrix()

		glPushMatrix()
		glDisable(GL_TEXTURE_2D)
		glDisable(GL_ALPHA_TEST)
		glLineWidth(1)
		glTranslated(20, self.height - 20, 0)
		for i in [([0,0,0,0.75], GL_QUADS), ([1,1,1,1], GL_LINE_LOOP)]:
			glColor4fv(i[0])
			glBegin(i[1])
			glVertex2d(0, 0)
			glVertex2d(80, 0)
			glVertex2d(80, -50)
			glVertex2d(0, -50)
			glEnd()
		text = "Score: %d\n" % self.score
		text += "Credit: %g\n" % self.credit
		text += "Stage: %s\n" % str(self.stage)
		drawText(text, 20, self.height - 32)
		glPopMatrix()

	def selectTower(self,pos):
		self.selectedTower = None
		for t in self.towers:
			dv = t.pos - pos
			if dv.len() < t.radius:
				self.selectedTower = t
				break

	def separateTower(self,tower):

		def ensureInStage(tower):
			if tower.x < 0:
				tower.x = 0
			elif self.width < tower.x:
				tower.x = self.width
			if tower.y < 0:
				tower.y = 0
			elif self.height < tower.y:
				tower.y = self.height

		ensureInStage(tower)

		repeats = 10 # Try repeat count before giving up resolving all intersections
		for r in range(repeats):
			moved = False
			for t in self.towers:
				if t == tower:
					continue
				dx = tower.x - t.x
				dy = tower.y - t.y
				if dx == 0 and dy == 0:
					dy = 1
				radiusSum = tower.radius + t.radius
				if dx * dx + dy * dy < radiusSum * radiusSum:
					length = sqrt(dx * dx + dy * dy)
					tower.x = t.x + dx / length * radiusSum
					tower.y = t.y + dy / length * radiusSum
					ensureInStage(tower)
					moved = True
			if not moved:
				break;

	def removeTower(self,tower):
		self.towers.remove(tower)
		tower.onDelete()
		return True

	def removeEnemy(self,e):
		self.enemies.remove(e)
		e.onDelete()
		return True

	def removeBullet(self,b):
		self.bullets.remove(b)
		b.onDelete()
		return True
	
	def addTowerEvent(self,t):
		pass

	def onHeal(self, target, src):
		self.effects.append(HealEffect(target, src))
		
	def onBeamHit(self, x, y):
		global exploBlueTex
		self.effects.append(SpriteEffect(x, y, exploBlueTex))

	def isGameOver(self):
		return len(self.towers) == 0

game = Game(500, 500)

boughtTower = None

class BuyButton(object):
	""" Display element representing buy button """
	def __init__(self,classType,imagePath,x,y):
		self.classType = classType
		self.imagePath = imagePath
		self.x = x
		self.y = y
		self.tex = None
		self.texParams = {}

	def draw(self):
		glPushMatrix()
		glDisable(GL_TEXTURE_2D)
		glDisable(GL_ALPHA_TEST)
		glLineWidth(1)
		glTranslated(self.x, self.y, 0)
		glColor4f(0,0,0,0.5)
		for i in [([0,0,0,0.75], GL_QUADS), ([1,1,1,1], GL_LINE_LOOP)]:
			glColor4fv(i[0])
			glBegin(i[1])
			glVertex2d(-15, -15)
			glVertex2d(15, -15)
			glVertex2d(15, 15)
			glVertex2d(-15, 15)
			glEnd()
		# Load on first use
		if self.tex == None:
			self.tex = gettex(self.imagePath, self.texParams)
		glBindTexture(GL_TEXTURE_2D, self.tex)
		glEnable(GL_TEXTURE_2D)
		glColor4f(1,1,1, 1 if self.classType.cost() < game.credit else 0.5)
		glPushMatrix()
		glScaled(self.texParams["size"][0],self.texParams["size"][1],1)
		glBegin(GL_QUADS)
		glTexCoord2d(0,1); glVertex2d(-0.5, -0.5)
		glTexCoord2d(1,1); glVertex2d( 0.5, -0.5)
		glTexCoord2d(1,0); glVertex2d( 0.5,  0.5)
		glTexCoord2d(0,0); glVertex2d(-0.5,  0.5)
		glEnd()
		glPopMatrix()
		
		global selectedButton
		if selectedButton == self:
			glDisable(GL_TEXTURE_2D)
			glTranslated(-155, 0, 0)
			for i in [([0,0,0,0.75], GL_QUADS), ([1,1,1,1], GL_LINE_LOOP)]:
				glColor4fv(i[0])
				glBegin(i[1])
				glVertex2d(0, -30)
				glVertex2d(130, -30)
				glVertex2d(130, 15)
				glVertex2d(0, 15)
				glEnd()
			text = self.classType.dispName() + "\n"
			text += "Cost: %g\n" % self.classType.cost()
			text += "Drag & Drop to buy"
			drawText(text, self.x - 150, self.y)

		glPopMatrix()

	def hitTest(self,pos):
		return abs(pos[0] - self.x) < 15 and abs(pos[1] - self.y) < 15

	def pressmove(self,evt):
		global boughtTower, mousepos
		if game.isGameOver():
			return
		if not self.hitTest(mousepos) and boughtTower == None:
			cost = self.classType.cost()
			if game.credit < cost:
				return
			boughtTower = self.classType(game, self.x, self.y)
			game.towers.append(boughtTower)
			game.addTowerEvent(boughtTower)
			game.credit -= cost
		if boughtTower != None:
			game.moving = True
			boughtTower.x = mousepos[0]
			boughtTower.y = mousepos[1]
			boughtTower.onUpdate(0)

	def pressup(self):
		global boughtTower
		game.moving = False
		if boughtTower != None:
			game.separateTower(boughtTower)
			boughtTower = None

	def update(self,dt):
		buyTip.texts[1].text = "Cost: " + formatVal(classType.prototype.cost(), 5);

buttons = []
selectedButton = None
windowsize = [500, 500]

def init():
	global exploTex, explo2Tex, exploBlueTex
	glClearColor(0.0, 0.0, 0.0, 0.0)
	glClearDepth(1.0)
	glShadeModel(GL_SMOOTH)
	exploTex = {"tex": gettex("assets/explode.png"), "totalFrames": 8, "size": 16, "speed": 2}
	explo2Tex = {"tex": gettex("assets/explode2.png"), "totalFrames": 6, "size": 32, "speed": 1}
	exploBlueTex = {"tex": gettex("assets/explode_blue.png"), "totalFrames": 8, "size": 16, "speed": 2}
	global windowsize
	buttons.append(BuyButton(Tower, "assets/turret.png", windowsize[0] - 30, windowsize[1] - 30))
	buttons.append(BuyButton(ShotgunTower, "assets/shotgun.png", windowsize[0] - 30, windowsize[1] - 60))
	buttons.append(BuyButton(HealerTower, "assets/Healer.png", windowsize[0] - 30, windowsize[1] - 90))
	buttons.append(BuyButton(BeamTower, "assets/BeamTower.png", windowsize[0] - 30, windowsize[1] - 120))
	buttons.append(BuyButton(MissileTower, "assets/MissileTower.png", windowsize[0] - 30, windowsize[1] - 150))

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
	
	for b in buttons:
		b.draw()

	deltaTime = 2

	glFlush()

	time.sleep(1. / 60)

	glutPostRedisplay()
	#print gc.get_count(), gc.garbage, len(game.enemies), len(game.bullets), len(game.effects)

mousestate = False
mousepos = vec2(0,0)

def mouse(button, state, x, y):
	global mousestate, mousepos, selectedButton
	if state == GLUT_DOWN:
		mousestate = True
	else:
		mousestate = False
	if state == GLUT_DOWN:
		mousepos[0] = x
		mousepos[1] = windowsize[1] - y
		game.selectTower(mousepos)
		if game.selectedTower == None:
			selectedButton = None
			for b in buttons:
				if b.hitTest(mousepos):
					selectedButton = b
	elif selectedButton != None and not selectedButton.hitTest(mousepos):
		selectedButton.pressup()

def motion(x, y):
	global mousepos
	mousepos[0] = x
	mousepos[1] = windowsize[1] - y
	if mousestate:
		if selectedButton != None:
			selectedButton.pressmove({"stageX": mousepos[0], "stageY": mousepos[1]})
	if game.selectedTower == None:
		game.selectTower(mousepos)
	if game.selectedTower != None:
		t = game.selectedTower
		t.x = mousepos.x
		t.y = mousepos.y
		game.separateTower(t)

def keyboard(key, x, y):
	global dist
	if key == '+':
		dist /= 1.1
	if key == '-':
		dist *= 1.1
	if key == chr(27):
		sys.exit(0)
	if key == 's':
		f = open("pysave.json", "w")
		f.write(game.serialize())
		f.close()
	if key == 'l':
		f = open("pysave.json")
		game.deserialize(f.read())
		f.close()

def reshape (w, h):
	global windowsize
	windowsize = [w, h]
	glViewport(0, 0, w, h)
	glMatrixMode(GL_PROJECTION)
	glLoadIdentity()
	glOrtho(0, 500, 0, 500, -1, 1)
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
