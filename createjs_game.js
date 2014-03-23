var stage;
var towerContainer;
var enemyContainer;
var canvas;
var width;
var height;
var game;

var explosionSpriteTemplate;
var hitSpriteTemplate;
var pauseText;
var boughtTower = null;

function init(){
	canvas = document.getElementById("scratch");
	width = parseInt(canvas.style.width);
	height = parseInt(canvas.style.height);
	game = new Game(width, height);
	game.addTowerEvent = function(t){
		var graph = new createjs.Container();

		var text = new createjs.Text(t.id.toString(), "bold 16px Helvetica", "#ff0000");
		text.textAlign = "center";
//		text.x = -5;
		text.y = -10;

		var shape = new createjs.Container();
		var activeShape = new createjs.Shape();
		activeShape.graphics.beginStroke("#00ffff").drawCircle(0, 0, 12);
		activeShape.visible = false;
		shape.addChild(activeShape);
		var hitShape = new createjs.Shape();
		hitShape.graphics.beginFill("#ffffff").drawCircle(10, 10, 10);
		var bm = new createjs.Bitmap("assets/turret.png");
		bm.x = -10;
		bm.y = -10;
		bm.hitArea = hitShape;
		shape.addChild(bm);

		var tip = new createjs.Container();
		var tipshape = new createjs.Shape();
		tipshape.graphics.beginFill("#111").beginStroke("#fff").drawRect(-40, 15, 80, 20).endStroke();
		tip.visible = false;
		var tiptext = new createjs.Text("kills: 0", "10px Helvetica", "#ffffff");
		tiptext.textAlign = "center";
		tiptext.y = 13;
		var tiptext2 = new createjs.Text("damage: 0", "10px Helvetica", "#ffffff");
		tiptext2.y = 23;
		tiptext2.textAlign = "center";
		tip.addChild(tipshape);
		tip.addChild(tiptext);
		tip.addChild(tiptext2);

		graph.addChild(shape);
		graph.addChild(text);
		graph.addChild(tip);
		towerContainer.addChild(graph);
		graph.addEventListener("mouseover", function(event){
			tip.visible = true;
			activeShape.visible = true;
		});
		graph.addEventListener("mouseout", function(event){
			tip.visible = false;
			activeShape.visible = false;
		});
		graph.on("pressmove", function(evt){
			game.moving = true;
			graph.x = evt.stageX;
			graph.y = evt.stageY;
		});
		graph.on("pressup", function(evt){
			t.x = graph.x;
			t.y = graph.y;
			game.moving = false;
		});
		t.onUpdate = function(dt){
			shape.rotation = this.angle * 360 / 2 / Math.PI + 90;
			graph.x = this.x;
			graph.y = this.y;
			if(tip.visible){
				tiptext.text = "Kills: " + this.kills;
				tiptext2.text = "Damage: " + this.damage;
			}
		}
	}
	game.addEnemyEvent = function(e){
		var shape = new createjs.Shape();
		shape.graphics.beginFill("#ff0000").beginStroke("#00ffff").drawCircle(0, 0, 7.5);
		enemyContainer.addChild(shape);
		e.onUpdate = function(dt){
			shape.x = this.x;
			shape.y = this.y;
		}
		e.onDelete = function(){
			enemyContainer.removeChild(shape);
			var sprite = explosionSpriteTemplate.clone();
			sprite.x = this.x;
			sprite.y = this.y;
			// Start playing explosion animation
			sprite.gotoAndPlay("explosion");
			// Make the effect disappear when it finishes playing
			sprite.addEventListener("animationend", function(event){
				event.target.stop();
				stage.removeChild(event.target);
			});
			stage.addChild(sprite);
		}
	}
	game.addBulletEvent = function(b){
		var shape = new createjs.Shape();
		shape.graphics.beginFill("#ff0000").drawRect(-5, -2, 5, 2);
		stage.addChild(shape);
		b.onUpdate = function(dt){
			shape.x = this.x;
			shape.y = this.y;
			shape.rotation = this.angle  * 360 / 2 / Math.PI;
		}
		b.onDelete = function(){
			stage.removeChild(shape);
			var sprite = hitSpriteTemplate.clone();
			sprite.x = this.x;
			sprite.y = this.y;
			// Start playing hit animation
			sprite.gotoAndPlay("explosion");
			// Make the effect disappear when it finishes playing
			sprite.addEventListener("animationend", function(event){
				event.target.stop();
				stage.removeChild(event.target);
			});
			stage.addChild(sprite);
		}
	}
	stage = new createjs.Stage("scratch");
	stage.enableMouseOver();

	towerContainer = new createjs.Container();
	stage.addChild(towerContainer);

	enemyContainer = new createjs.Container();
	stage.addChild(enemyContainer);

	pauseText = new createjs.Text("PAUSED", "Bold 40px Arial", "#ff7f7f");
	pauseText.visible = false;
	pauseText.x = (width - pauseText.getBounds().width) / 2;
	pauseText.y = (height - pauseText.getBounds().height) / 2;
	stage.addChild(pauseText);

	var buyButton = new createjs.Container();
	var buyButtonFrame = new createjs.Shape();
	buyButtonFrame.graphics.beginFill("#0f0f0f").beginStroke("#ffffff").drawRect(0, 0, 30, 30);
	buyButton.addChild(buyButtonFrame);
	var buyButtonImage = new createjs.Bitmap("assets/turret.png");
	buyButtonImage.x = 5;
	buyButtonImage.y = 5;
	buyButtonImage.hitArea = buyButtonFrame;
	buyButton.addChild(buyButtonImage);
	buyButton.x = width - 40;
	buyButton.y = 10;
	buyButton.on("pressmove", function(evt){
		if(boughtTower == null){
			boughtTower = new Tower(game, buyButton.x, buyButton.y);
			game.towers.push(boughtTower);
			game.addTowerEvent(boughtTower);
		}
		game.moving = true;
		boughtTower.x = evt.stageX;
		boughtTower.y = evt.stageY;
		boughtTower.onUpdate(0);
	});
	buyButton.on("pressup", function(evt){
		game.moving = false;
		boughtTower = null;
	});
	stage.addChild(buyButton);


	// create spritesheet for explosion (Enemy death).
	var explosionSpriteSheet = new createjs.SpriteSheet({
		images: ["assets/explode2.png"],
		frames: {width: 32, height: 32, regX: 16, regY: 16},
		animations: {
			explosion: [0, 6, null, 0.5],
		}
	});

	// create a Sprite instance to display and play back the sprite sheet:
	explosionSpriteTemplate = new createjs.Sprite(explosionSpriteSheet);

	// create spritesheet for Bullet hit effect.
	var hitSpriteSheet = new createjs.SpriteSheet({
		images: ["assets/explode.png"],
		frames: {width: 16, height: 16, regX: 8, regY: 8},
		animations: {
			explosion: [0, 6],
		}
	});

	// create a Sprite instance to display and play back the sprite sheet:
	hitSpriteTemplate = new createjs.Sprite(hitSpriteSheet);

	createjs.Ticker.addEventListener("tick", tick);
}

function tick(event){
	game.update(0.1, function(){});
	stage.update();
}

function reset(){
	if(confirm("Are you sure to reset progress?")){
		localStorage.clear();
		init();
	}
}

function save(){
	return game.serialize();
}

function load(state){
	towerContainer.removeAllChildren();
	game.deserialize(state);
}

function togglePause(){
	if(game.moving)
		return;
	game.pause = !game.pause;
	pauseText.visible = game.pause;
	if(game.pause)
		stage.setChildIndex(pauseText, stage.getNumChildren()-1);
}

document.onkeydown = function(event){
	if(event.keyCode == 80){
		togglePause();
	}
}
