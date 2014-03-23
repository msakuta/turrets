
function Tower(game,x,y){
	this.game = game;
	this.x = x;
	this.y = y;
	this.angle = 0;
	this.target = null;
	this.id = Tower.prototype.idGen++;
	this.cooldown = 4;
	this.kills = 0;
	this.damage = 0;
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
			var b = new Bullet(this.game, this.x + ofs[0], this.y + ofs[1], spd * mat[0], spd * mat[1], this.angle, this);
			this.game.bullets.push(b);
		}
		this.cooldown = 4;
	}

	if(0 < this.cooldown)
		this.cooldown--;

	return true;
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

Tower.prototype.getPos = function(){
	return new Array(this.x, this.y);
}

Tower.prototype.print = function(){
	return "(" + this.x + ", " + this.y + ")";
}

Tower.prototype.measureDistance = function(other){
	return Math.sqrt((this.x - other.x) * (this.x - other.x) + (this.y - other.y) * (this.y - other.y));
}


function Bullet(game,x,y,vx,vy,angle,owner){
	this.game = game;
	this.x = x;
	this.y = y;
	this.vx = vx;
	this.vy = vy;
	this.angle = angle;
	this.owner = owner;
}

Bullet.prototype.update = function(dt){
	this.x += this.vx * dt;
	this.y += this.vy * dt;
	var enemies = this.game.enemies;
	for(var i = 0; i < enemies.length; i++){
		var e = enemies[i];
		if((e.x - this.x) * (e.x - this.x) + (e.y - this.y) * (e.y - this.y) < 10 * 10){
			this.owner.damage++;
			if(e.damage(1))
				this.owner.kills++;
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
	this.vx = 0;
	this.vy = 0;
	this.health = 10;
}

Enemy.prototype.update = function(dt){
	this.vx += (game.width / 2 - this.x) * 0.005 + (this.game.rng.next() - 0.5) * 15;
	this.vy += (game.height / 2 - this.y) * 0.005 + (this.game.rng.next() - 0.5) * 15;
	this.vx *= 0.8;
	this.vy *= 0.8;
	this.x += this.vx * dt;
	this.y += this.vy * dt;
	this.onUpdate(dt);
	return true;
}

Enemy.prototype.damage = function(dmg){
	this.health -= dmg;
	if(this.health <= 0){
		var ind = this.game.enemies.indexOf(this);
		this.game.enemies.splice(ind, 1);
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

Enemy.prototype.onDelete = function(dt){
	// Default does nothing
}




function GetCookie( name )
{
    var result = null;

    var cookieName = name + '=';
    var allcookies = document.cookie;

    var position = allcookies.indexOf( cookieName );
    if( position != -1 )
    {
        var startIndex = position + cookieName.length;

        var endIndex = allcookies.indexOf( ';', startIndex );
        if( endIndex == -1 )
        {
            endIndex = allcookies.length;
        }

        result = decodeURIComponent(
            allcookies.substring( startIndex, endIndex ) );
    }

    return result;
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
	for(var i = 0; i < n; i++){
		this.towers[i] = new Tower(this, rng.next() * width * 0.2 + width * 0.40, rng.next() * height * 0.2 + height * 0.4);
		var kills = GetCookie("tower" + i + ".kills");
		if(kills != null)
			this.towers[i].kills = parseInt(kills);
		var damage = GetCookie("tower" + i + ".damage");
		if(damage != null)
			this.towers[i].damage = parseInt(damage);
	}
	this.pause = false;
	this.mouseX = 0;
	this.mouseY = 0;
	this.cookie_time = 0;
}

Game.prototype.global_time = 0;

Game.prototype.update = function(dt){
	if(this.pause)
		return;

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

	if(this.cookie_time + 10. < Game.prototype.global_time){
		for(var i = 0; i < this.towers.length; i++){
			var v = this.towers[i];
			document.cookie = "tower" + i + ".kills=" + v.kills;
			document.cookie = "tower" + i + ".damage=" + v.damage;
		}
		this.cookie_time += 10.;
	}

//	invokes++;
	Game.prototype.global_time += dt;
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
