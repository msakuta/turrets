
// Remember global object reference for deserialization.
// The variable "window" should be the same thing in a browser,
// but we could write this script independent of running environment.
var global = this;

function vecslen(v){
	return v[0] * v[0] + v[1] * v[1];
}

function veclen(v){
	return Math.sqrt(vecslen(v));
}

function vecnorm(v){
	var len = veclen(v);
	return [v[0] / len, v[1] / len];
}

function vecscale(v,s){
	return [v[0] * s, v[1] * s];
}

function vecadd(v1,v2){
	return [v1[0] + v2[0], v1[1] + v2[1]];
}

function vecsub(v1,v2){
	return [v1[0] - v2[0], v1[1] - v2[1]];
}

function vecdot(v1,v2){
	return v1[0] * v2[0] + v1[1] * v2[1];
}

// Utility 2D matrix functions
function matvp(m,v){ // Matrix Vector product
	return [m[0] * v[0] + m[1] * v[1], m[2] * v[0] + m[3] * v[1]];
}
function mattvp(m,v){ // Matrix Transpose Vector product
	return [m[0] * v[0] + m[2] * v[1], m[1] * v[0] + m[3] * v[1]];
}

/// Custom inheritance function that prevents the super class's constructor
/// from being called on inehritance.
/// Also assigns constructor property of the subclass properly.
function inherit(subclass,base){
	// If the browser or ECMAScript supports Object.create, use it
	// (but don't remember to redirect constructor pointer to subclass)
	if(Object.create){
		subclass.prototype = Object.create(base.prototype);
	}
	else{
		var sub = function(){};
		sub.prototype = base.prototype;
		subclass.prototype = new sub;
	}
	subclass.prototype.constructor = subclass;
}


/// Unsigned modulo
function umodulo(v, period){
	return v - Math.floor(v / period) * period;
}

/// Approach src to dst by delta, optionally wrapping around wrap
function approach(src, dst, delta, wrap){
	if(src < dst){
		if(dst - src < delta)
			return dst;
		else if(wrap && wrap / 2 < dst - src){
			var ret = src - delta - Math.floor((src - delta) / wrap) * wrap/*fmod(src - delta + wrap, wrap)*/;
			return src < ret && ret < dst ? dst : ret;
		}
		return src + delta;
	}
	else{
		if(src - dst < delta)
			return dst;
		else if(wrap && wrap / 2 < src - dst){
			var ret = src + delta - Math.floor((src + delta) / wrap) * wrap/*fmod(src + delta, wrap)*/;
			return ret < src && dst < ret ? dst : ret;
		}
		else return src - delta;
	}
}

/// Rotation approach
function rapproach(src, dst, delta){
	return approach(src + Math.PI, dst + Math.PI, delta, Math.PI * 2) - Math.PI;
}

/// Matrix Vector Product
function matvp(m,v){
	return [m[0] * v[0] + m[1] * v[1], m[2] * v[0] + m[3] * v[1]];
}

/// Matrix Transpose Vector Product
function mattvp(m,v){
	return [m[0] * v[0] + m[2] * v[1], m[1] * v[0] + m[3] * v[1]];
}

// Base class definition of in-game objects.
function Entity(game,x,y){
	this.game = game;
	this.x = x;
	this.y = y;
	this.vx = 0;
	this.vy = 0;
	this.health = 10;
	this.xp = 0;
	this.level = 1;
	this.team = 0;
	this.radius = 10;
}
Entity.prototype.onKill = function(){};

Entity.prototype.maxHealth = function(){return 10;}

Entity.prototype.getRot = function(angle){
	return [Math.cos(angle), Math.sin(angle), -Math.sin(angle), Math.cos(angle)];
}

Entity.prototype.getDPS = function(frameTime){
	return null;
}

Entity.prototype.measureDistance = function(other){
	return Math.sqrt((this.x - other.x) * (this.x - other.x) + (this.y - other.y) * (this.y - other.y));
}


function Tower(game,x,y){
	Entity.call(this,game,x,y);
	this.angle = 0;
	this.health = 10;
	this.target = null;
	this.id = Tower.prototype.idGen++;
	this.cooldown = 4;
	this.kills = 0;
	this.damage = 0;
}
inherit(Tower, Entity); // Subclass

Tower.prototype.maxHealth = function(){
	return Math.ceil(Math.pow(1.2, this.level) * 10);
};

Tower.prototype.rotateSpeed = Math.PI / 10.; // Radians per frame
Tower.prototype.getShootTolerance = function(){return this.rotateSpeed;}

Tower.prototype.dispName = function(){
	return "Machine Gun";
}

Tower.prototype.serialize = function(){
	var v = this;
	return {
		className: v.constructor.name,
		kills: v.kills,
		damage: v.damage,
		x: v.x,
		y: v.y,
		angle: v.angle,
		health: v.health,
		level: v.level,
		xp: v.xp
	};
}

Tower.prototype.deserialize = function(data){
	this.angle = data.angle;
	this.kills = data.kills;
	this.damage = data.damage;
	this.health = data.health;
	if("level" in data) this.level = data.level;
	if("xp" in data) this.xp = data.xp;
}

Tower.prototype.update = function(dt){
	var enemies = this.game.enemies;
	var nearest = null;
	var nearestDist = 1e6;

	// If this tower is sticky, tolerate before switching target
	if(this.stickiness !== undefined && this.target !== null)
		nearestDist = this.measureDistance(this.target) / this.stickiness;
	for(var i = 0; i < enemies.length; i++){
		var e = enemies[i];
		var dist = Math.sqrt((this.x - e.x) * (this.x - e.x) + (this.y - e.y) * (this.y - e.y));
		if(dist < nearestDist){
			nearestDist = dist;
			nearest = e;
		}
	}
	if(nearest != null)
		this.target = nearest;
	if(this.target != null && this.target.health <= 0)
		this.target = null;

	if(this.target != null){
		var desiredAngle = Math.atan2(this.target.y - this.y, this.target.x - this.x);
		this.angle = rapproach(this.angle, desiredAngle, this.rotateSpeed);
		if(Math.abs(this.angle - desiredAngle) % (Math.PI * 2) < this.getShootTolerance() && this.cooldown <= 0)
			this.shoot();
	}

	if(0 < this.cooldown)
		this.cooldown--;

	this.onUpdate(dt);

	return true;
}

Tower.prototype.shoot = function(){
	var spd = 100;
	var mat = [Math.cos(this.angle), Math.sin(this.angle), -Math.sin(this.angle), Math.cos(this.angle)];
	for(var i = -1; i <= 1; i += 2){
		var ofs = mattvp(mat, [0, i * 5]);
		var b = new Bullet(this.game, this.x + ofs[0], this.y + ofs[1], spd * mat[0], spd * mat[1], this.angle, this);
		b.damage = Math.pow(1.2, this.level);
		this.game.addBullet(b);
	}
	this.cooldown = this.getCooldownTime();
}

Tower.prototype.getCooldownTime = function(){
	return 4;
}

Tower.prototype.getDPS = function(frameTime){
	return 2 * Math.pow(1.2, this.level) / this.getCooldownTime() / frameTime;
}

Tower.prototype.maxXp = function(){
	return Math.ceil(Math.pow(1.5, this.level) * 100);
}

Tower.prototype.onKill = function(e){
	if(e.team != 0){
		this.game.score += e.maxHealth();
		this.game.credit += e.credit;
	}
	this.kills++;
	this.gainXp(e.maxHealth());
}

Tower.prototype.gainXp = function(xp){
	this.xp += xp;
	while(this.maxXp() <= this.xp){
		this.level++;
		this.health = this.maxHealth(); // Fully recover
	}
}

Tower.prototype.receiveDamage = function(dmg){
	this.health -= dmg;
	if(this.health <= 0){
		var ind = this.game.towers.indexOf(this);
		this.game.towers.splice(ind, 1);
		this.onDelete();
		return true;
	}
	return false;
}

Tower.prototype.idGen = 0;

Tower.prototype.cost = function(){
	return Math.ceil(Math.pow(1.5, game.towers.length) * 100);
}

Entity.prototype.getPos = function(){
	return new Array(this.x, this.y);
}

Tower.prototype.print = function(){
	return "(" + this.x + ", " + this.y + ")";
}

Tower.prototype.getRange = function(){
	return 0; // 0 means infinite range
}

Tower.prototype.onUpdate = function(dt){
}

Tower.prototype.onDelete = function(){
}


/// Tower with a shotgun, which shoots spreading bullets
function ShotgunTower(game,x,y){
	Tower.call(this,game,x,y);
}
inherit(ShotgunTower, Tower); // Subclass

ShotgunTower.prototype.dispName = function(){
	return "Shotgun";
}

ShotgunTower.prototype.cost = function(){
	return Math.ceil(Math.pow(1.5, game.towers.length) * 150);
}

ShotgunTower.prototype.shoot = function(){
	var spd = 100;
	var bullets = Math.floor(5 + this.level / 2);
	for(var i = -bullets; i <= bullets; i++){
		var angle = this.angle + i * Math.PI / 40.;
		var mat = [Math.cos(angle), Math.sin(angle), -Math.sin(angle), Math.cos(angle)];
		var ofs = mattvp(mat, [0, i * 5]);
		var b = new Bullet(this.game, this.x, this.y, spd * mat[0], spd * mat[1], angle, this);
		b.damage = Math.pow(1.2, this.level);
		this.game.addBullet(b);
	}
	this.cooldown = this.getCooldownTime();
}

ShotgunTower.prototype.getCooldownTime = function(){
	return 20;
}

ShotgunTower.prototype.getDPS = function(frameTime){
	return Math.floor(5 + this.level / 2) * Math.pow(1.2, this.level) / this.getCooldownTime() / frameTime;
}


/// Tower with capability to heal nearby towers
function HealerTower(game,x,y){
	Tower.call(this,game,x,y);
}
inherit(HealerTower, Tower); // Subclass

HealerTower.prototype.dispName = function(){
	return "Healer";
}

HealerTower.prototype.cost = function(){
	return Math.ceil(Math.pow(1.5, game.towers.length) * 200);
}

HealerTower.prototype.healAmount = function(){
	return 1 + 0.1 * this.level;
}

HealerTower.prototype.shoot = function(){
	if(this.target != null && this.target.health < this.target.maxHealth()){
		this.target.health = Math.min(this.target.maxHealth(), this.target.health + this.healAmount());
		this.damage += this.healAmount();
		this.game.onHeal(this.target, this);
		this.gainXp(3 * this.healAmount()); // Healer has less opprtunity to gain experience than offensive towers, so gain high exp on healing
		this.cooldown = Math.ceil(4 + 320 / (10 + this.level));
	}
}

HealerTower.prototype.getDPS = function(frameTime){
	return -this.healAmount() / Math.ceil(4 + 320 / (10 + this.level)) / frameTime;
}

HealerTower.prototype.update = function(dt){
	var towers = this.game.towers;
	var damaged = null;
	var heaviestDamage = 0;
	// Find the most damaged tower in the game
	for(var i = 0; i < towers.length; i++){
		var t = towers[i];
		// Do not allow healing itself and those out of range
		if(t == this || this.getRange() < t.measureDistance(this))
			continue;
		var damage = 1 - t.health / t.maxHealth();
		if(heaviestDamage < damage){
			heaviestDamage = damage;
			damaged = t;
		}
	}
	this.target = damaged;

	if(this.target != null){
		var desiredAngle = Math.atan2(this.target.y - this.y, this.target.x - this.x);
		this.angle = rapproach(this.angle, desiredAngle, Math.PI / 10.);
		if(this.cooldown <= 0 && Math.abs(this.angle - desiredAngle) < Math.PI / 10.)
			this.shoot();
	}

	if(0 < this.cooldown)
		this.cooldown--;

	this.onUpdate(dt);

	return true;
}

HealerTower.prototype.getRange = function(){
	return Math.ceil((this.level + 10) * 5);
}

/// Tower with a shotgun, which shoots spreading bullets
function BeamTower(game,x,y){
	Tower.call(this,game,x,y);
	this.radius = 18;
	this.cooldown = 15;
	this.shootPhase = 0;
}
inherit(BeamTower, Tower); // Subclass

BeamTower.prototype.rotateSpeed = Math.PI / 30.;
BeamTower.prototype.stickiness = 3;
BeamTower.prototype.beamLength = 400;
BeamTower.prototype.beamWidth = 8;

BeamTower.prototype.maxHealth = function(){
	return Math.ceil(Math.pow(1.2, this.level) * 25);
}

BeamTower.prototype.maxXp = function(){
	return Math.ceil(Math.pow(1.5, this.level-1) * 500);
}

BeamTower.prototype.dispName = function(){
	return "BeamTower";
}

BeamTower.prototype.cost = function(){
	return Math.ceil(Math.pow(1.5, game.towers.length) * 350);
}

BeamTower.prototype.getDamage = function(){
	return 5 * Math.pow(1.2, this.level);
}

BeamTower.prototype.shoot = function(){
	if(this.target !== null && this.cooldown === 0){
		this.shootPhase = 45;
		this.cooldown = 90;
	}
}

BeamTower.prototype.getDPS = function(frameTime){
	return this.getDamage() * 45 / 90 / frameTime;
}

BeamTower.prototype.update = function(dt){
	if(!Tower.prototype.update.call(this, dt))
		return false;
	if(0 < this.shootPhase){
		this.shootBeam(dt);
		this.shootPhase--;
	}
	return true;
}

BeamTower.prototype.shootBeam = function(dt){
	var enemies = this instanceof BeamTower ? this.game.enemies : this.game.towers;
	var angle = this.angle;
	var mat = this.getRot(angle);
	// The beam penetrates through all enemies (good against crowd)
	for(var j = 0; j < enemies.length; j++){
		var e = enemies[j];
		// Distance of the target from the beam axis
		var dotx = (e.x - this.x) * mat[2] + (e.y - this.y) * mat[3];
		// Position of the target along the beam axis
		var doty = (e.x - this.x) * mat[0] + (e.y - this.y) * mat[1];
		// Check intersection of the beam with the target
		if(Math.abs(dotx) < e.radius + 10 && 0 <= doty && doty < this.beamLength + e.radius){
			this.damage += this.getDamage();
			this.game.onBeamHit(e.x, e.y);
			if(e.receiveDamage(this.getDamage())){
				this.onKill(e);
			}
		}
	}
}


function Bullet(game,x,y,vx,vy,angle,owner){
	this.game = game;
	this.x = x;
	this.y = y;
	this.vx = vx;
	this.vy = vy;
	this.angle = angle;
	this.owner = owner;
	this.team = owner.team;
	this.damage = 1;
	this.vanished = false;
}

Bullet.prototype.update = function(dt){
	this.x += this.vx * dt;
	this.y += this.vy * dt;
	var enemies = this.team == 0 ? this.game.enemies : this.game.towers;
	for(var i = 0; i < enemies.length; i++){
		var e = enemies[i];
		if((e.x - this.x) * (e.x - this.x) + (e.y - this.y) * (e.y - this.y) < e.radius * e.radius){
			this.owner.damage += this.damage;
			if(e.receiveDamage(this.damage)){
				this.owner.onKill(e);
			}
			return 0;
		}
	}
	this.onUpdate(dt);
	if(0 < this.x && this.x < this.game.width && 0 < this.y && this.y < this.game.height)
		return 1;
	else{
		// Hitting edge won't trigger bullet hit effect
		this.vanished = true;
		return 0;
	}
}

/// Tower with a shotgun, which shoots spreading bullets
function MissileTower(game,x,y){
	Tower.call(this,game,x,y);
	this.radius = 18;
	this.cooldown = 15;
	this.shootPhase = 0;
}
inherit(MissileTower, Tower); // Subclass

MissileTower.prototype.rotateSpeed = Math.PI / 30.;
MissileTower.prototype.getShootTolerance = function(){return Math.PI;}
MissileTower.prototype.stickiness = 3;

MissileTower.prototype.maxHealth = function(){
	return Math.ceil(Math.pow(1.2, this.level) * 25);
}

MissileTower.prototype.maxXp = function(){
	return Math.ceil(Math.pow(1.5, this.level-1) * 500);
}

MissileTower.prototype.dispName = function(){
	return "MissileTower";
}

MissileTower.prototype.cost = function(){
	return Math.ceil(Math.pow(1.5, game.towers.length) * 350);
}

MissileTower.prototype.getDamage = function(){
	return 30 * Math.pow(1.2, this.level);
}

MissileTower.prototype.getCooldownTime = function(){
	return 30;
}

MissileTower.prototype.shoot = function(){
	var spd = 100;
	var bullets = Math.floor(5 + this.level / 2);
	for(var i = -2; i <= 2; i++){
		if(i === 0)
			continue;
		var angle = this.angle + i * Math.PI * 0.05;
		var mat = this.getRot(angle);
		var pos = mattvp(mat, [-Math.abs(i) * 2 + 10, i * 6]);
		var b = new Missile(this.game, this.x + pos[0], this.y + pos[1], spd * mat[0], spd * mat[1], angle, this);
		b.damage = this.getDamage();
		b.target = this.target;
		b.speed = 100;
		b.rotateSpeed = Math.PI;
		this.game.addBullet(b);
	}
	this.cooldown = this.getCooldownTime();
}

MissileTower.prototype.getDPS = function(frameTime){
	return this.getDamage() / this.getCooldownTime() / frameTime;
}


function Bullet(game,x,y,vx,vy,angle,owner){
	this.game = game;
	this.x = x;
	this.y = y;
	this.vx = vx;
	this.vy = vy;
	this.angle = angle;
	this.owner = owner;
	this.team = owner.team;
	this.damage = 1;
	this.vanished = false;
	this.life = 5;
}

Bullet.prototype.getVelo = function(){
	return [this.vx, this.vy];
}

Bullet.prototype.setVelo = function(v){
	this.vx = v[0];
	this.vy = v[1];
}

Bullet.prototype.update = function(dt){
	this.x += this.vx * dt;
	this.y += this.vy * dt;
	var enemies = this.team == 0 ? this.game.enemies : this.game.towers;
	for(var i = 0; i < enemies.length; i++){
		var e = enemies[i];
		if(e instanceof BulletShieldEnemy){
			var delta = [e.x - this.x, e.y - this.y];
			var shieldRadius = e.getShieldRadius();
			var velo = this.getVelo();
			if(vecslen(delta) < shieldRadius * shieldRadius && 0 < vecdot(delta, velo)){
				var dir = vecnorm(delta);
				this.setVelo(vecadd(velo, vecscale(dir, -2 * vecdot(dir, velo))));
				this.angle = Math.atan2(this.vy, this.vx);
			}
		}
		if((e.x - this.x) * (e.x - this.x) + (e.y - this.y) * (e.y - this.y) < e.radius * e.radius){
			this.owner.damage += this.damage;
			if(e.receiveDamage(this.damage)){
				this.owner.onKill(e);
			}
			return 0;
		}
	}
	this.onUpdate(dt);
	// Bullets can live outside the border
	if(-this.game.width * 0.5 < this.x && this.x < 1.5 * this.game.width &&
	   -this.game.height * 0.5 < this.y && this.y < 1.5 * this.game.height &&
	   0 < this.life)
	{
		this.life -= dt;
		return 1;
	}
	else{
		// Hitting edge won't trigger bullet hit effect
		this.vanished = true;
		return 0;
	}
}

Bullet.prototype.onUpdate = function(dt){
	// Default does nothing
}

Bullet.prototype.onDelete = function(){
	// Default does nothing
}

/// \brief A guided missile
function Missile(game,x,y,vx,vy,angle,owner){
	Bullet.apply(this, arguments);
	this.life = 10;
	this.seekTime = 8;
	this.speed = 75;
	this.rotateSpeed = Math.PI * 0.5;
	this.target = null;
}
inherit(Missile, Bullet);

Missile.prototype.update = function(dt){
	if(!Bullet.prototype.update.call(this, dt))
		return false;
	if(0 < this.seekTime){
		this.seekTime--;
		return true;
	}

	// Search for target if already have none
	if(this.target === null || this.target.health <= 0){
		var enemies = this.team == 0 ? this.game.enemies : this.game.towers;
		var nearest = null;
		var nearestSDist = 300 * 300;
		var predPos = [this.x + this.speed / this.rotateSpeed * Math.cos(this.angle),
			this.y + this.speed / this.rotateSpeed * Math.sin(this.angle)];
		for(var i = 0; i < enemies.length; i++){
			var e = enemies[i];
			var dv = [e.x - predPos[0], e.y - predPos[1]];
			if(0 < e.health && dv[0] * dv[0] + dv[1] * dv[1] < nearestSDist){
				nearest = e;
				nearestSDist = dv[0] * dv[0] + dv[1] * dv[1];
			}
		}
		if(nearest !== null)
			this.target = nearest;
	}

	// Guide toward target
	if(this.target !== null && 0 < this.target.health){
		this.angle = rapproach(this.angle, Math.atan2(this.target.y - this.y, this.target.x - this.x), this.rotateSpeed * dt);
		this.vx = this.speed * Math.cos(this.angle);
		this.vy = this.speed * Math.sin(this.angle);
	}
	return true;
}

/// \brief Class representing an enemy unit.
function Enemy(game,x,y){
	Entity.apply(this, arguments);
	this.game = game;
	this.x = x;
	this.y = y;
	this.vx = 0;
	this.vy = 0;
	this.radius = 7.5;
	this.credit = Math.ceil(game.rng.next() * 5);
	this.kills = 0;
	this.damage = 0;
	this.team = 1;
	this.shootFrequency = function(){return 0.02;};
}
inherit(Enemy, Entity); // Subclass

Enemy.prototype.update = function(dt){
	this.vx += (game.width / 2 - this.x) * 0.005 + (this.game.rng.next() - 0.5) * 15;
	this.vy += (game.height / 2 - this.y) * 0.005 + (this.game.rng.next() - 0.5) * 15;
	this.vx *= 0.8;
	this.vy *= 0.8;
	this.x += this.vx * dt;
	this.y += this.vy * dt;
	if(this.game.rng.next() < this.shootFrequency()){
		var spd = 100.;
		var angle = this.game.rng.next() * Math.PI * 2.;
		var mat = [Math.cos(angle), Math.sin(angle), -Math.sin(angle), Math.cos(angle)];
		this.game.addBullet(new Bullet(this.game, this.x, this.y, spd * mat[0], spd * mat[1], angle, this));
	}
	this.onUpdate(dt);
	return true;
}

Enemy.prototype.receiveDamage = function(dmg){
	this.health -= dmg;
	if(this.health <= 0){
		var ind = this.game.enemies.indexOf(this);
		this.game.enemies.splice(ind, 1);
		this.onDelete();
		return true;
	}
	return false;
}

Enemy.prototype.calcPos = function(){
	var pos = new Array(2);
	pos[0] = this.x;
	pos[1] = this.y;
	return pos;
}

Enemy.prototype.onUpdate = function(dt){
	// Default does nothing
}

Enemy.prototype.onDelete = function(){
	// Default does nothing
}

/// \brief Tier 2 enemy with higher health and credit
function Enemy2(game,x,y){
	Enemy.apply(this, arguments);
	this.maxHealth = function(){return 150;}
	this.health = this.maxHealth();
	this.radius = 15;
	this.credit = Math.ceil(game.rng.next() * 150);
	this.shootFrequency = function(){return 0.2;};
}
inherit(Enemy2, Enemy);


/// \brief Enemy with agility and evasive movements
function Enemy3(game,x,y){
	Enemy.apply(this, arguments);
	this.maxHealth = function(){return 50;}
	this.health = this.maxHealth();
	this.radius = 10;
	this.credit = Math.ceil(game.rng.next() * 150);
	this.shootFrequency = function(){return 0.2;};
	this.angle = 0;
}
inherit(Enemy3, Enemy);

Enemy3.prototype.shoot = function(dt){
	var spd = 100.;
	var angle = this.angle + this.game.rng.next() * Math.PI * 0.2;
	var mat = [Math.cos(angle), Math.sin(angle), -Math.sin(angle), Math.cos(angle)];
	this.game.addBullet(new Bullet(this.game, this.x, this.y, spd * mat[0], spd * mat[1], angle, this));
}

Enemy3.prototype.update = function(dt){

	if(this.target === undefined && this.game.towers.length !== 0){
		this.target = this.game.towers[this.game.rng.nexti() % this.game.towers.length];
		var vec = this.target.getPos();
//		var veclen = Math.sqrt(vec[0] * vec[0] + vec[1] * vec[1]);
//		vec[0] /= veclen;
//		vec[1] /= veclen;
		this.vx = vec[1] * 0.1;
		this.vy = -vec[0] * 0.1;
	}

	if(this.target !== undefined){
		this.vx += (this.target.x - this.x) * 0.1 * dt;
		this.vy += (this.target.y - this.y) * 0.1 * dt;
		this.angle = rapproach(this.angle, Math.atan2(this.target.y - this.y, this.target.x - this.x), Math.PI * 0.1);
	}
	else{
		this.vx += (-this.x) * 0.1 * dt;
		this.vy += (-this.y) * 0.1 * dt;
	}

	this.x += this.vx * dt;
	this.y += this.vy * dt;

	if(this.game.rng.next() < this.shootFrequency()){
		this.shoot();
	}
	this.onUpdate(dt);
	return true;
}


/// \brief Tier 4 enemy with higher health and credit
function Enemy4(game,x,y){
	Enemy.apply(this, arguments);
	this.maxHealth = function(){return 500;}
	this.health = this.maxHealth();
	this.radius = 16;
	this.credit = Math.ceil(game.rng.next() * 500);
	this.angle = 0;
	this.target = null;
	this.cooldown = 15;
}
inherit(Enemy4, Enemy);

Enemy4.prototype.rotateSpeed = Math.PI * 0.1;

Enemy4.prototype.shoot = function(dt){
	var spd = 100.;
	var angle = this.angle + (this.game.rng.next() - 0.5) * Math.PI * 0.05;
	var mat = this.getRot(angle);
	for(var i = -1; i <= 1; i += 2){
		var pos = mattvp(mat, [0, i * 6]);
		this.game.addBullet(new Bullet(this.game, this.x + pos[0], this.y + pos[1],
			spd * mat[0], spd * mat[1], angle, this));
	}
	this.cooldown = 15;
}

Enemy4.prototype.update = function(dt){

	if(this.target === null && this.game.towers.length !== 0){
		this.target = this.game.towers[this.game.rng.nexti() % this.game.towers.length];
	}

	if(this.target !== null && 0 < this.target.health){
		var dv = [this.target.x - this.x, this.target.y - this.y];
		var dvlen = Math.sqrt(dv[0] * dv[0] + dv[1] * dv[1]);
		if(0 < dvlen){
			dv[0] /= dvlen;
			dv[1] /= dvlen;
			var rspeed = dv[0] * this.vx + dv[1] * this.vy;
			// Make the ship stop at distance of 100 from target
			dvlen -= 10 * rspeed + 100;
			this.vx += (dv[0] * dvlen) * 0.1 * dt;
			this.vy += (dv[1] * dvlen) * 0.1 * dt;
			this.angle = rapproach(this.angle, Math.atan2(this.target.y - this.y, this.target.x - this.x), this.rotateSpeed);
		}
	}
	else{
		this.target = null;
		this.vx *= 0.9;
		this.vy *= 0.9;
	}

	this.x += this.vx * dt;
	this.y += this.vy * dt;

	if(0 < this.cooldown)
		this.cooldown--;

	if(this.target !== null && this.cooldown === 0){
		this.shoot();
	}
	this.onUpdate(dt);
	return true;
}

/// \brief Tier 4 enemy with higher health and credit
function BeamEnemy(game,x,y){
	Enemy4.apply(this, arguments);
	this.maxHealth = function(){return 2500;}
	this.health = this.maxHealth();
	this.radius = 24;
	this.credit = Math.ceil(game.rng.next() * 500);
	this.angle = 0;
	this.target = null;
	this.cooldown = 15;
	this.shootPhase = 0;
}
inherit(BeamEnemy, Enemy4);

BeamEnemy.prototype.beamLength = 400;
BeamEnemy.prototype.beamWidth = 8;

BeamEnemy.prototype.getDamage = function(){return 0.2;}

BeamEnemy.prototype.update = function(dt){

	if(this.target === null && this.game.towers.length !== 0){
		this.target = this.game.towers[this.game.rng.nexti() % this.game.towers.length];
	}

	if(this.target !== null && 0 < this.target.health){
		var dv = [this.target.x - this.x, this.target.y - this.y];
		var dvlen = Math.sqrt(dv[0] * dv[0] + dv[1] * dv[1]);
		if(0 < dvlen){
			dv[0] /= dvlen;
			dv[1] /= dvlen;
			var rspeed = dv[0] * this.vx + dv[1] * this.vy;
			// Make the ship stop at distance of 100 from target
			dvlen -= 10 * rspeed + 150;
			this.vx += (dv[0] * dvlen) * 0.1 * dt;
			this.vy += (dv[1] * dvlen) * 0.1 * dt;
			this.angle = rapproach(this.angle, Math.atan2(this.target.y - this.y, this.target.x - this.x), Math.PI * 0.1);
		}
	}
	else{
		this.target = null;
		this.vx *= 0.9;
		this.vy *= 0.9;
	}

	this.x += this.vx * dt;
	this.y += this.vy * dt;

	if(0 < this.cooldown)
		this.cooldown--;

	if(this.target !== null && this.cooldown === 0){
		this.shootPhase = 30;
		this.cooldown = 90;
	}
	if(0 < this.shootPhase){
		BeamTower.prototype.shootBeam.call(this, dt);
		this.shootPhase--;
	}
	this.onUpdate(dt);
	return true;
}

/// \brief Missile launcher enemy
function MissileEnemy(game,x,y){
	Enemy4.apply(this, arguments);
	this.maxHealth = function(){return 3500;}
	this.health = this.maxHealth();
	this.radius = 24;
	this.credit = Math.ceil(game.rng.next() * 2500);
	this.angle = 0;
	this.target = null;
	this.cooldown = 30;
	this.shootPhase = 0;
}
inherit(MissileEnemy, Enemy4);

MissileEnemy.prototype.shoot = function(dt){
	var spd = 75.;
	for(var i = -2; i <= 2; i++){
		if(i == 0)
			continue;
		var angle = this.angle + i * Math.PI * 0.05;
		var mat = this.getRot(angle);
		var pos = mattvp(mat, [-Math.abs(i) * 2, i * 6]);
		var m = new Missile(this.game, this.x + pos[0], this.y + pos[1],
			spd * mat[0], spd * mat[1], angle, this)
		m.damage = 7;
		this.game.addBullet(m);
	}
	this.cooldown = 45;
}

/// \brief Missile launcher enemy
function BattleShipEnemy(game,x,y){
	Enemy.apply(this, arguments);
	this.maxHealth = function(){return 50000;}
	this.health = this.maxHealth();
	this.radius = 64;
	this.credit = Math.ceil(game.rng.next() * 12500);
	this.angle = 0;
	this.target = null;
	this.cooldown = 30;
	this.shootPhase = 0;
	function BattleShipTurret(owner, x, y){
		Entity.apply(this, arguments);
		this.owner = owner;
		this.x = x;
		this.y = y;
		this.angle = 0;
		this.team = 1;
		this.target = null;
		this.cooldown = 15;
	}
	inherit(BattleShipTurret, Entity);
	BattleShipTurret.prototype.shoot = function(dt){
		var spd = 100.;
		var angle = this.angle + (game.rng.next() - 0.5) * Math.PI * 0.05;
		var baseMat = this.owner.getRot(this.owner.angle);
		var basePos = vecadd(mattvp(baseMat, [this.x, this.y]), this.owner.getPos());
		var mat = this.getRot(angle);
		var jointAngle = this.owner.angle + this.angle;
		var jointMat = this.owner.getRot(jointAngle);
		for(var i = -1; i <= 1; i += 2){
			var pos = vecadd(mattvp(jointMat, [0, i * 6]), basePos);
			var b = new Bullet(game, pos[0], pos[1],
				spd * jointMat[0], spd * jointMat[1], jointAngle, this);
			b.damage = 5;
			game.addBullet(b);
		}
		this.cooldown = 10;
	}
	BattleShipTurret.prototype.update = function(dt){
		if(this.target === null && game.towers.length !== 0){
			this.target = game.towers[game.rng.nexti() % game.towers.length];
		}

		if(this.target !== null && 0 < this.target.health){
			var baseMat = this.owner.getRot(this.owner.angle);
			var basePos = vecadd(mattvp(baseMat, [this.x, this.y]), this.owner.getPos());
			var dv = vecsub(this.target.getPos(), basePos);
			var dvlen = Math.sqrt(dv[0] * dv[0] + dv[1] * dv[1]);
			if(0 < dvlen){
				this.angle = rapproach(this.angle, Math.atan2(dv[1], dv[0]) - this.owner.angle, Math.PI * 0.1);
			}
		}
		if(0 < this.cooldown)
			this.cooldown--;

		if(this.target !== null && this.cooldown === 0){
			this.shoot();
		}
	}
	this.turrets = [
		new BattleShipTurret(this, 40, 0),
		new BattleShipTurret(this, 15, 0),
		new BattleShipTurret(this, -35, 0),
	];
}
inherit(BattleShipEnemy, Enemy);

BattleShipEnemy.prototype.rotateSpeed = Math.PI * 0.01;

BattleShipEnemy.prototype.update = function(dt){

	if(this.target === null && this.game.towers.length !== 0){
		this.target = this.game.towers[this.game.rng.nexti() % this.game.towers.length];
	}

	if(this.target !== null && 0 < this.target.health){
		var dv = [this.target.x - this.x, this.target.y - this.y];
		var dvlen = Math.sqrt(dv[0] * dv[0] + dv[1] * dv[1]);
		if(0 < dvlen)
			this.angle = rapproach(this.angle, Math.atan2(dv[1], dv[0]) + (dvlen < 200) * Math.PI / 2, this.rotateSpeed);
		var mat = this.getRot(this.angle);
		this.vx = 5 * mat[0];
		this.vy = 5 * mat[1];
	}
	else{
		this.target = null;
		this.vx *= 0.9;
		this.vy *= 0.9;
	}

	this.x += this.vx * dt;
	this.y += this.vy * dt;

	for(var i = 0; i < this.turrets.length; i++)
		this.turrets[i].update(dt);

	this.onUpdate(dt);

	return true;
}


/// \brief Enemy with reflecting shield against bullets
function BulletShieldEnemy(game,x,y){
	Enemy4.apply(this, arguments);
	this.maxHealth = function(){return 5000;}
	this.health = this.maxHealth();
	this.radius = 32;
	this.credit = Math.ceil(game.rng.next() * 2500);
	this.angle = 0;
	this.target = null;
	this.cooldown = 30;
	this.shootPhase = 0;
}
inherit(BulletShieldEnemy, Enemy4);

BulletShieldEnemy.prototype.getShieldRadius = function(){
	return 100;
}


function Game(width, height){
	this.width = width;
	this.height = height;
	this.rng = new Xor128(); // Create Random Number Generator
	this.towers = [];
	this.bullets = [];
	this.enemies = [];
	this.pause = false;
	this.moving = false; ///< Moving something (temporary pause)
	this.mouseX = 0;
	this.mouseY = 0;
	this.score = 0;
	this.credit = 0;
	this.progress = 0;
	this.stage = null;
	this.stageClear = true;
	this.highScores = [];

	/// A flag to defer initialization of game state to enale calling logic to
	/// set event handlers on object creation in deserialization.
	this.initialized = false;
}

Game.prototype.global_time = 0;
Game.prototype.waveTime = 60;
Game.prototype.stageTime = Game.prototype.waveTime * 10;

Game.prototype.enemyTypes = [
	{type: Enemy, waves: 0, freq: function(f){return f < 20 ? (f + 2) / 20 : 1 / (f - 20 + 1);}},
	{type: Enemy2, waves: 5, freq: function(f){return f < 40 ? (f * 5000 + 10000) / 10000000 : 0.001 / (f - 40 + 1);}},
	{type: Enemy3, waves: 10, freq: function(f){return (f * 5000 + 10000) / 10000000;}},
	{type: Enemy4, waves: 20, freq: function(f){return (f * 5000 + 10000) / 10000000;}},
	{type: BeamEnemy, waves: 30, freq: function(f){return (f * 5000 + 10000) / 20000000;}},
	{type: MissileEnemy, waves: 40, freq: function(f){return (f * 5000 + 10000) / 20000000;}},
	{type: BattleShipEnemy, waves: 50, freq: function(f){return (f * 5000 + 10000) / 50000000;}},
	{type: BulletShieldEnemy, waves: 60, freq: function(f){return (f * 5000 + 10000) / 50000000;}},
];

Game.prototype.init = function(){
	if(typeof(Storage) !== "undefined"){
		this.deserialize(localStorage.getItem("towers"));
	}
	this.initialized = true;
	this.onInit();
}

Game.prototype.deserialize = function(stream){
	var data = JSON.parse(stream);
	if(data != null){
		this.highScores = data.highScores || [];
		this.credit = data.credit;
		this.towers = [];
		var towers = data.towers;
		for(var i = 0; i < towers.length; i++){
			var tow = towers[i];
			if(tow){
				if(tow.className in global){
					var classType = global[tow.className];
					var newTower = new classType(this, tow.x, tow.y);
					newTower.id = i;
					newTower.deserialize(tow);
					this.towers.push(newTower);
					this.addTowerEvent(newTower);
				}
			}
		}
	}
	else{
		var rng = this.rng;
		var n = 3;
		this.towers = new Array(n);
		this.credit = 1000;
		for(var i = 0; i < n; i++){
			this.towers[i] = new Tower(this, rng.next() * width * 0.2 + width * 0.40, rng.next() * height * 0.2 + height * 0.4);
			this.addTowerEvent(this.towers[i]);
		}
	}
}

Game.prototype.startStage = function(stage){
	this.progress = Math.abs(stage * this.stageTime);
	this.stage = stage;
	this.stageClear = false;
	this.score = 0;
	// Restore health on stage start
	for(var i = 0; i < this.towers.length; i++){
		var v = this.towers[i];
		v.health = v.maxHealth();
	}
}

Game.prototype.getStageProgress = function(){
	return (this.progress - Math.abs(this.stage * this.stageTime)) / this.stageTime;
}

Game.prototype.update = function(dt, autoSaveHandler){
	if(this.pause || this.moving)
		return;

	if(!this.initialized)
		this.init();

	if(this.stage === null)
		dt = 0;

	for(var i = 0; i < this.towers.length;){
		var v = this.towers[i];
		if(!v.update(dt)){
			this.towers.splice(i, 1);
		}
		else
			i++;
	}

	if(this.stage === null)
		return;

	var enemyCounts = [0, 0, 0];
	for(var i = 0; i < this.enemies.length; i++){
		var e = this.enemies[i];
		for(var j = 0; j < this.enemyTypes.length; j++){
			if(e instanceof this.enemyTypes[j].type){
				enemyCounts[j]++;
				break;
			}
		}
	}

	/// A pseudo-random number generator distributed in Poisson distribution.
	/// It uses Knuth's algorithm, which is not optimal when lambda gets
	/// so high.  We probably should use an approximation.
	function poissonRandom(rng,lambda){
		var L = Math.exp(-lambda);
		var k = 0;
		var p = 1;
		do{
			k++;
			p *= rng.next();
		}while(L < p);
		return k - 1;
	}

	if((Math.abs(this.stage) + 1) * this.stageTime <= this.progress){
		if(this.stage < 0)
			this.stage--;
		else{
			if(!this.isGameOver() && !this.stageClear){
				this.stageClear = true;
				if(this.highScores[this.stage] === undefined || this.highScores[this.stage] < this.score)
					this.highScores[this.stage] = this.score;

				// Autosave: Check for localStorage
				if(typeof(Storage) !== "undefined"){
					var serialData = this.serialize();
					localStorage.setItem("towers", serialData);
					autoSaveHandler(serialData);
				}

				this.onStageClear();
			}
			return;
		}
	}

	if(0 != this.towers.length && this.progress % this.waveTime < this.waveTime / 2){
		for(var i = 0; i < this.enemyTypes.length; i++){
			if(Math.floor(this.progress / this.waveTime) < this.enemyTypes[i].waves)
				continue;
			var offset = 20 - i * 20;
			var freq = this.enemyTypes[i].freq(Math.floor(this.progress / this.waveTime));
			var genCount = poissonRandom(this.rng, freq);
			for(var j = 0; j < genCount; j++){
				var edge = this.rng.nexti() % 4;
				var x = 0;
				var y = 0;
				if(edge == 0){
					x = 0;
					y = this.height * this.rng.next();
				}
				else if(edge == 1){
					x = this.width;
					y = this.height * this.rng.next();
				}
				else if(edge == 2){
					x = this.width * this.rng.next();
					y = 0;
				}
				else if(edge == 3){
					x = this.width * this.rng.next();
					y = this.height;
				}
				var e = new this.enemyTypes[i].type(this, x, y);
				this.enemies.push(e);
				this.addEnemyEvent(e);
			}
		}
	}

	for(var i = 0; i < this.bullets.length;){
		var v = this.bullets[i];
		if(!v.update(dt)){
			v.onDelete();
			this.bullets.splice(i, 1);
		}
		else
			i++;
	}

	for(var i = 0; i < this.enemies.length;){
		var v = this.enemies[i];
		if(!v.update(dt)){
			v.onDelete();
			this.enemies.splice(i, 1);
		}
		else
			i++;
	}

//	invokes++;
	Game.prototype.global_time += dt;
	this.progress += dt;
}

Game.prototype.serialize = function(){
	var saveData = {credit: this.credit, highScores: this.highScores};
	var towers = [];
	for(var i = 0; i < this.towers.length; i++){
		var v = this.towers[i];
		towers.push(v.serialize());
	}
	saveData.towers = towers;
	return JSON.stringify(saveData);
}

Game.prototype.removeTower = function(tower){
	var ind = this.towers.indexOf(tower);
	if(ind < 0)
		return false;
	else
		this.towers.splice(ind, 1);
	tower.onDelete();
	return true;
}

Game.prototype.addBullet = function(b){
	this.bullets.push(b);
	this.addBulletEvent(b);
}

Game.prototype.isGameOver = function(){
	return this.towers.length == 0;
}

Game.prototype.hitTest = function(target){
	for(var i = 0; i < this.towers.length; i++){
		var t = this.towers[i];
		if(t == target)
			continue;
		var dx = target.x - t.x;
		var dy = target.y - t.y;
		var radiusSum = target.radius + t.radius;
		if(dx * dx + dy * dy < radiusSum * radiusSum)
			return t;
	}
	return null;
}

Game.prototype.separateTower = function(tower){
	var repeats = 10; // Try repeat count before giving up resolving all intersections
	for(var r = 0; r < repeats; r++){
		var moved = false;
		for(var i = 0; i < this.towers.length; i++){
			var t = this.towers[i];
			if(t == tower)
				continue;
			var dx = tower.x - t.x;
			var dy = tower.y - t.y;
			if(dx == 0 && dy == 0)
				dy = 1;
			var radiusSum = tower.radius + t.radius;
			if(dx * dx + dy * dy < radiusSum * radiusSum){
				var len = Math.sqrt(dx * dx + dy * dy);
				tower.x = t.x + dx / len * radiusSum;
				tower.y = t.y + dy / len * radiusSum;
				moved = true;
			}
		}
		if(!moved)
			break;
	}
}

Game.prototype.onClick = function(e){
	this.pause = !this.pause;
}

Game.prototype.mouseMove = function(e){
	var rect = e.target.getBoundingClientRect();
	this.mouseX = e.clientX - rect.left;
	this.mouseY = e.clientY - rect.top;
}

Game.prototype.addTowerEvent = function(t){
}

Game.prototype.addEnemyEvent = function(e){
}

Game.prototype.addBulletEvent = function(b){
}

Game.prototype.onHeal = function(target,healer){
}

Game.prototype.onInit = function(){
}

Game.prototype.onStageClear = function(){
}

Game.prototype.onBeamHit = function(x,y){
}
