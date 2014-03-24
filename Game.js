
function Tower(game,x,y){
	this.game = game;
	this.x = x;
	this.y = y;
	this.angle = 0;
	this.health = 10;
	this.maxHealth = 10;
	this.target = null;
	this.id = Tower.prototype.idGen++;
	this.cooldown = 4;
	this.kills = 0;
	this.damage = 0;
	this.team = 0;
}

Tower.prototype.serialize = function(){
	var v = this;
	return {
		kills: v.kills,
		damage: v.damage,
		x: v.x,
		y: v.y,
		angle: v.angle,
		health: v.health
	};
}

Tower.prototype.deserialize = function(data){
	this.angle = data.angle;
	this.kills = data.kills;
	this.damage = data.damage;
	this.health = data.health;
}

Tower.prototype.update = function(dt){
	var enemies = this.game.enemies;
	var nearest = null;
	var nearestDist = 1e6;
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

	if(this.cooldown <= 0 && this.target != null){
		this.angle = Math.atan2(this.target.y - this.y, this.target.x - this.x);
		var spd = 100;
		var mat = [Math.cos(this.angle), Math.sin(this.angle), -Math.sin(this.angle), Math.cos(this.angle)];
		function matvp(m,v){
			return [m[0] * v[0] + m[1] * v[1], m[2] * v[0] + m[3] * v[1]];
		}
		function mattvp(m,v){
			return [m[0] * v[0] + m[2] * v[1], m[1] * v[0] + m[3] * v[1]];
		}
		for(var i = -1; i <= 1; i += 2){
			var ofs = mattvp(mat, [0, i * 5]);
			this.game.addBullet(new Bullet(this.game, this.x + ofs[0], this.y + ofs[1], spd * mat[0], spd * mat[1], this.angle, this));
		}
		this.cooldown = 4;
	}

	if(0 < this.cooldown)
		this.cooldown--;

	this.onUpdate(dt);

	return true;
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

Tower.prototype.draw = function(ctx,mouseon){
	var v = this;

	ctx.translate(v.x, v.y);
	ctx.rotate(v.angle);
	ctx.fillStyle = "#fff";
	ctx.fillRect(0, -5, 20, 10);
	ctx.strokeStyle = "#0ff";
	ctx.strokeRect(0, -5, 20, 10);
	ctx.setTransform(1,0,0,1,0,0);

	ctx.strokeStyle = "#00f";
	ctx.fillStyle = mouseon ? "#ff0" : "#fff";
	ctx.beginPath();
	ctx.arc(v.x, v.y, 10, 0, Math.PI*2, false);
	ctx.stroke();
	ctx.fill();
	ctx.fillStyle = "#f00";
	ctx.font = "bold 16px Helvetica";
	ctx.fillText(v.id, v.x, v.y);

	if(mouseon){
		ctx.translate(v.x, v.y);
		ctx.fillStyle = "#0f0";
		ctx.fillRect(-10, -20, 20, 5);
		ctx.fillStyle = "#111";
		ctx.fillRect(-40, 15, 80, 20);
		ctx.strokeStyle = "#fff";
		ctx.strokeRect(-40, 15, 80, 20);
		ctx.font = "10px Helvetica";
		ctx.fillStyle = "#fff";
		ctx.fillText("Kills: " + this.kills, 0, 20);
		ctx.fillText("Damage: " + this.damage, 0, 30);
		ctx.setTransform(1,0,0,1,0,0);
	}
}

Tower.prototype.idGen = 0;

Tower.prototype.cost = function(){
	return Math.ceil(Math.pow(1.5, game.towers.length) * 100);
}

Tower.prototype.getPos = function(){
	return new Array(this.x, this.y);
}

Tower.prototype.print = function(){
	return "(" + this.x + ", " + this.y + ")";
}

Tower.prototype.measureDistance = function(other){
	return Math.sqrt((this.x - other.x) * (this.x - other.x) + (this.y - other.y) * (this.y - other.y));
}

Tower.prototype.onUpdate = function(dt){
}

Tower.prototype.onDelete = function(){
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
}

Bullet.prototype.update = function(dt){
	this.x += this.vx * dt;
	this.y += this.vy * dt;
	var enemies = this.team == 0 ? this.game.enemies : this.game.towers;
	for(var i = 0; i < enemies.length; i++){
		var e = enemies[i];
		if((e.x - this.x) * (e.x - this.x) + (e.y - this.y) * (e.y - this.y) < 10 * 10){
			this.owner.damage++;
			if(e.receiveDamage(1)){
				if(e.team != 0){
					this.game.score += e.maxHealth;
					this.game.credit += e.credit;
				}
				this.owner.kills++;
			}
			return 0;
		}
	}
	this.onUpdate(dt);
	return 0 < this.x && this.x < this.game.width && 0 < this.y && this.y < this.game.height;
}

Bullet.prototype.draw = function(ctx){
	var v = this;
	ctx.translate(v.x, v.y);
	ctx.rotate(v.angle);
	ctx.fillStyle = "#f00";
	ctx.fillRect(-5, -2, 5, 2);
	ctx.setTransform(1,0,0,1,0,0);
}

Bullet.prototype.onUpdate = function(dt){
	// Default does nothing
}

Bullet.prototype.onDelete = function(){
	// Default does nothing
}

/// \brief Class representing an enemy unit.
function Enemy(game,x,y){
	this.game = game;
	this.x = x;
	this.y = y;
	this.vx = 0;
	this.vy = 0;
	this.health = 10;
	this.maxHealth = 10;
	this.credit = Math.ceil(game.rng.next() * 5);
	this.kills = 0;
	this.damage = 0;
	this.team = 1;
}

Enemy.prototype.update = function(dt){
	this.vx += (game.width / 2 - this.x) * 0.005 + (this.game.rng.next() - 0.5) * 15;
	this.vy += (game.height / 2 - this.y) * 0.005 + (this.game.rng.next() - 0.5) * 15;
	this.vx *= 0.8;
	this.vy *= 0.8;
	this.x += this.vx * dt;
	this.y += this.vy * dt;
	if(this.game.rng.next() < 0.01){
		var spd = 100.;
		var angle = this.game.rng.next() * Math.PI * 2.;
		var mat = [Math.cos(angle), Math.sin(angle), -Math.sin(angle), Math.cos(angle)];
		function matvp(m,v){
			return [m[0] * v[0] + m[1] * v[1], m[2] * v[0] + m[3] * v[1]];
		}
		function mattvp(m,v){
			return [m[0] * v[0] + m[2] * v[1], m[1] * v[0] + m[3] * v[1]];
		}
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

Enemy.prototype.draw = function(ctx){
	var pos = this.calcPos();
	var inten = Math.floor(this.health * 255 / 10);
	ctx.fillStyle = "rgb(0," + inten + "," + inten + ")";
	ctx.beginPath();
	ctx.arc(pos[0], pos[1], 7.5, 0, Math.PI*2, false);
	ctx.fill();
	ctx.stroke();
}

Enemy.prototype.onUpdate = function(dt){
	// Default does nothing
}

Enemy.prototype.onDelete = function(){
	// Default does nothing
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
	this.autosave_time = 0;
	this.score = 0;
	this.credit = 0;
}

Game.prototype.global_time = 0;

Game.prototype.init = function(){
	if(typeof(Storage) !== "undefined"){
		this.deserialize(localStorage.getItem("towers"));
	}
}

Game.prototype.deserialize = function(stream){
	var data = JSON.parse(stream);
	if(data != null){
		this.score = data.score;
		this.credit = data.credit;
		this.towers = [];
		var towers = data.towers;
		for(var i = 0; i < towers.length; i++){
			var tow = towers[i];
			if(tow){
				var newTower = new Tower(this, tow.x, tow.y);
				newTower.id = i;
				newTower.deserialize(tow);
				this.towers.push(newTower);
				this.addTowerEvent(newTower);
			}
		}
	}
	else{
		var rng = this.rng;
		var n = 3;
		this.towers = new Array(n);
		for(var i = 0; i < n; i++){
			this.towers[i] = new Tower(this, rng.next() * width * 0.2 + width * 0.40, rng.next() * height * 0.2 + height * 0.4);
			this.addTowerEvent(this.towers[i]);
		}
	}
}

Game.prototype.update = function(dt, autoSaveHandler){
	if(this.pause || this.moving)
		return;

	if(this.towers.length == 0)
		this.init();

	for(var i = 0; i < this.towers.length;){
		var v = this.towers[i];
		if(!v.update(dt)){
			this.towers.splice(i, 1);
		}
		else
			i++;
	}

	if(this.enemies.length < 20){
		var edge = this.rng.nexti() % 4;
		if(edge == 0){
			var e = new Enemy(this, 0, this.height * this.rng.next());
			this.enemies.push(e);
			this.addEnemyEvent(e);
		}
		else if(edge == 1){
			var e = new Enemy(this, this.width, this.height * this.rng.next());
			this.enemies.push(e);
			this.addEnemyEvent(e);
		}
		else if(edge == 2){
			var e = new Enemy(this, this.width * this.rng.next(), 0);
			this.enemies.push(e);
			this.addEnemyEvent(e);
		}
		else if(edge == 3){
			var e = new Enemy(this, this.width * this.rng.next(), this.height);
			this.enemies.push(e);
			this.addEnemyEvent(e);
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

	if(this.autosave_time + 10. < Game.prototype.global_time){

		// Check for localStorage
		if(typeof(Storage) !== "undefined"){
			var serialData = this.serialize();
			localStorage.setItem("towers", serialData);
			autoSaveHandler(serialData);
		}

		this.autosave_time += 10.;
	}

//	invokes++;
	Game.prototype.global_time += dt;
}

Game.prototype.serialize = function(){
	var saveData = {score: this.score, credit: this.credit};
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
	this.towers.splice(ind, 1);
	tower.onDelete();
	return true;
}

Game.prototype.addBullet = function(b){
	this.bullets.push(b);
	this.addBulletEvent(b);
}

Game.prototype.draw = function(ctx){
	ctx.fillStyle = "#000";
	ctx.clearRect(0,0,this.width,this.height);

	ctx.font = "bold 16px Helvetica";
	ctx.textAlign = "center";
	ctx.textBaseline = "middle";

	ctx.setTransform(1,0,0,1,0,0);
	for(var i = 0; i < this.towers.length; i++){
		var v = game.towers[i];
		v.draw(ctx, v.x - 10 < this.mouseX && this.mouseX < v.x + 10 && v.y - 10 < this.mouseY && this.mouseY < v.y + 10);
	}

	for(var i = 0; i < this.bullets.length; i++){
		var v = game.bullets[i];
		v.draw(ctx);
	}

	ctx.strokeStyle = "#f00";
	ctx.fillStyle = "#0ff";
	for(var i = 0; i < this.enemies.length; i++){
		this.enemies[i].draw(ctx);
	}

	ctx.strokeStyle = "#fff";
	ctx.beginPath();
	ctx.moveTo(this.mouseX, 0);
	ctx.lineTo(this.mouseX, this.height);
	ctx.moveTo(0, this.mouseY);
	ctx.lineTo(this.width, this.mouseY);
	ctx.stroke();
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
