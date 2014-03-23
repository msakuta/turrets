
function Tower(game,x,y){
	this.game = game;
	this.x = x;
	this.y = y;
	this.angle = 0;
	this.target = null;
	this.id = Tower.prototype.idGen++;
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

	if(this.target != null){
		this.angle = Math.atan2(this.target.y - this.y, this.target.x - this.x);
		var spd = 100;
		var b = new Bullet(this.game, this.x, this.y, spd * Math.cos(this.angle), spd * Math.sin(this.angle), this.angle);
		this.game.bullets.push(b);
	}

	return true;
}

Tower.prototype.draw = function(ctx){
	var v = this;
	ctx.beginPath();
	ctx.arc(v.x, v.y, 10, 0, Math.PI*2, false);
	ctx.stroke();
	ctx.fillText(v.id, v.x, v.y);
	ctx.translate(v.x, v.y);
	ctx.rotate(v.angle);
	ctx.strokeRect(0, -5, 20, 5);
	ctx.setTransform(1,0,0,1,0,0);
}

Tower.prototype.idGen = 0;

Tower.prototype.getPos = function(){
	return new Array(this.x, this.y);
}

Tower.prototype.print = function(){
	return "(" + this.x + ", " + this.y + ")";
}

Tower.prototype.measureDistance = function(other){
	return Math.sqrt((this.x - other.x) * (this.x - other.x) + (this.y - other.y) * (this.y - other.y));
}


function Bullet(game,x,y,vx,vy,angle){
	this.game = game;
	this.x = x;
	this.y = y;
	this.vx = vx;
	this.vy = vy;
	this.angle = angle;
}

Bullet.prototype.update = function(dt){
	this.x += this.vx * dt;
	this.y += this.vy * dt;
	var enemies = this.game.enemies;
	for(var i = 0; i < enemies.length; i++){
		var e = enemies[i];
		if((e.x - this.x) * (e.x - this.x) + (e.y - this.y) * (e.y - this.y) < 10 * 10){
			e.damage(1);
			return 0;
		}
	}
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

Bullet.prototype.onDelete = function(dt){
	// Default does nothing
}

/// \brief Class representing an enemy unit.
function Enemy(game,x,y){
	this.game = game;
	this.x = x;
	this.y = y;
	this.health = 10;
}

Enemy.prototype.update = function(dt){
	this.x += (game.width / 2 - this.x) * 0.01;
	this.y += (game.height / 2 - this.y) * 0.01;
	this.onUpdate(dt);
	return true;
}

Enemy.prototype.damage = function(dmg){
	this.health -= dmg;
	if(this.health <= 0){
		var ind = this.game.enemies.indexOf(this);
		this.game.enemies.splice(ind, 1);
	}
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

Enemy.prototype.onDelete = function(dt){
	// Default does nothing
}





function Game(width, height){
	this.width = width;
	this.height = height;
	this.rng = new Xor128(); // Create Random Number Generator
	var rng = this.rng;
	var n = 3;
	this.towers = new Array(n);
	this.bullets = [];
	this.enemies = [];
//	document.write(width + " " + height + ";");
	for(var i = 0; i < n; i++)
		this.towers[i] = new Tower(this, rng.next() * width * 0.2 + width * 0.40, rng.next() * height * 0.2 + height * 0.4);
}

Game.prototype.global_time = 0;

Game.prototype.update = function(dt){

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
		}
		else if(edge == 1){
			var e = new Enemy(this, this.width, this.height * this.rng.next());
			this.enemies.push(e);
		}
		else if(edge == 2){
			var e = new Enemy(this, this.width * this.rng.next(), 0);
			this.enemies.push(e);
		}
		else if(edge == 3){
			var e = new Enemy(this, this.width * this.rng.next(), this.height);
			this.enemies.push(e);
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
}

Game.prototype.draw = function(ctx){
	ctx.clearRect(0,0,this.width,this.height);

	ctx.font = "bold 16px Helvetica";
	ctx.textAlign = "center";
	ctx.textBaseline = "middle";

	ctx.strokeStyle = "#000";
	ctx.fillStyle = "#000";
	ctx.setTransform(1,0,0,1,0,0);
	for(var i = 0; i < this.towers.length; i++){
		var v = game.towers[i];
		v.draw(ctx);
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
}
