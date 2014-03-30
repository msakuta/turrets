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
var deleteShape;

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
		var bm = new createjs.Bitmap(t instanceof ShotgunTower ? "assets/shotgun.png" : "assets/turret.png");
		bm.x = -10;
		bm.y = -10;
		bm.hitArea = hitShape;
		shape.addChild(bm);

		var healthBar = new createjs.Container();
		var healthBarGreen = new createjs.Shape();
		healthBarGreen.graphics.beginFill("#0f0").drawRect(-10, -20, 20, 5);
		healthBar.addChild(healthBarGreen);
		healthBar.currentValue = t.health;
		var tip = new createjs.Container();
		var tipshape = new createjs.Shape();
		tipshape.graphics.beginFill("#111").beginStroke("#fff").drawRect(-40, 15, 80, 50).endStroke();
		tip.visible = false;
		var tiptext = new createjs.Text("kills: 0", "10px Helvetica", "#ffffff");
		tiptext.x = -38;
		tiptext.y = 13;
		var tiptext2 = new createjs.Text("damage: 0", "10px Helvetica", "#ffffff");
		tiptext2.x = -38;
		tiptext2.y = 23;
		var tiptext3 = new createjs.Text("", "10px Helvetica", "#ffffff");
		tiptext3.x = -38;
		tiptext3.y = 33;
		var tiptext4 = new createjs.Text("", "10px Helvetica", "#ffffff");
		tiptext4.x = -38;
		tiptext4.y = 43;
		var tiptext5 = new createjs.Text("", "10px Helvetica", "#ffffff");
		tiptext5.x = -38;
		tiptext5.y = 53;
		tip.addChild(healthBar);
		tip.addChild(tipshape);
		tip.addChild(tiptext);
		tip.addChild(tiptext2);
		tip.addChild(tiptext3);
		tip.addChild(tiptext4);
		tip.addChild(tiptext5);

		graph.addChild(shape);
		graph.addChild(text);
		graph.addChild(tip);

		// Bind the hit shape indicator to the Tower object.
		t.hitShape = new createjs.Shape();
		t.hitShape.graphics.beginStroke("#ff0000").drawCircle(0, 0, t.radius);
		t.hitShape.visible = false;
		graph.addChild(t.hitShape);

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
			t.x = graph.x = evt.stageX;
			t.y = graph.y = evt.stageY;
			beginHit(t);
		});
		graph.on("pressup", function(evt){
			t.x = graph.x;
			t.y = graph.y;
			game.separateTower(t);
			game.moving = false;
			var localPoint = deleteShape.globalToLocal(graph.x, graph.y);
			if(deleteShape.hitTest(localPoint.x, localPoint.y)){
				game.removeTower(t);
			}
			endHit();
		});
		t.onUpdate = function(dt){
			shape.rotation = this.angle * 360 / 2 / Math.PI + 90;
			graph.x = this.x;
			graph.y = this.y;
			if(tip.visible){
				tiptext.text = "Kills: " + this.kills;
				tiptext2.text = "Damage: " + Math.round(this.damage);
				tiptext3.text = "Health: " + this.health + "/" + this.maxHealth();
				tiptext4.text = "Level: " + this.level;
				tiptext5.text = "XP: " + this.xp + "/" + this.maxXp();
				if(healthBar.currentValue != t.health){
					healthBar.currentValue = t.health;
					healthBar.removeAllChildren();
					var healthBarRed = new createjs.Shape();
					healthBarRed.graphics.beginFill("#ff0000").drawRect(-10, -20, 20, 5);
					healthBar.addChild(healthBarRed);
					healthBarGreen = new createjs.Shape();
					healthBarGreen.graphics.beginFill("#0f0").drawRect(-10, -20, 20 * t.health / t.maxHealth(), 5);
					healthBar.addChild(healthBarGreen);
				}
			}
		}
		t.onDelete = function(){
			towerContainer.removeChild(graph);
		}
	}
	game.addEnemyEvent = function(e){
		var shape = new createjs.Shape();
		shape.graphics.beginFill("#ff0000").beginStroke("#00ffff").drawCircle(0, 0, e.radius);
		enemyContainer.addChild(shape);
		e.onUpdate = function(dt){
			shape.x = this.x;
			shape.y = this.y;
		}
		e.onDelete = function(){
			enemyContainer.removeChild(shape);
			var effectCount = e instanceof Enemy2 ? 5 : 1;
			for(var i = 0; i < effectCount; i++){
				var sprite = explosionSpriteTemplate.clone();
				sprite.x = this.x;
				sprite.y = this.y;
				if(1 < effectCount){
					sprite.x += (game.rng.next() + game.rng.next() - 0.5) * e.radius;
					sprite.y += (game.rng.next() + game.rng.next() - 0.5) * e.radius;
				}
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
	}
	game.addBulletEvent = function(b){
		var shape = new createjs.Shape();
		shape.graphics.beginFill(b.team == 0 ? "#ff0000" : "#ffff00").drawRect(-5, -2, 5, 2);
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

	var gameOverText = new createjs.Text("GAME OVER", "Bold 40px Arial", "#ff3f7f");
	gameOverText.visible = false;
	gameOverText.x = (width - gameOverText.getBounds().width) / 2;
	gameOverText.y = (height - gameOverText.getBounds().height) / 2;
	gameOverText.on("tick", function(evt){
		gameOverText.visible = game.isGameOver();
	});
	stage.addChild(gameOverText);

	var overlay = new createjs.Container();

	var overlayTip = new createjs.Container();

	var statusPanel = new createjs.Container();
	var statusPanelFrame = new createjs.Shape();
	statusPanelFrame.graphics.beginFill("#0f0f0f").beginStroke("#ffffff").drawRect(0, 0, 80, 30);
	statusPanelFrame.alpha = 0.5;
	statusPanel.addChild(statusPanelFrame);
	var statusText = new createjs.Text("Score: " + game.score, "10px Helvetica", "#ffffff");
	statusText.y = 0;
	statusText.x = 5;
	statusText.on("tick", function(evt){
		statusText.text = "Score: " + game.score;
	});
	statusPanel.addChild(statusText);
	var statusText2 = new createjs.Text("Credit: " + game.credit, "10px Helvetica", "#ffffff");
	statusText2.y = 10;
	statusText2.x = 5;
	statusText2.on("tick", function(evt){
		statusText2.text = "Credit: " + game.credit;
	});
	statusPanel.addChild(statusText2);
	statusPanel.x = 5;
	statusPanel.y = 5;
	overlay.addChild(statusPanel);

	/// Class for showing buy button tip
	function BuyTip(classType){
		createjs.Container.call(this);
		var buyTipFrame = new createjs.Shape();
		buyTipFrame.graphics.beginFill("#0f0f0f").beginStroke("#ffffff").drawRect(0, 0, 100, 35);
		this.addChild(buyTipFrame);
		var buyTipText = new createjs.Text(classType.prototype.dispName(), "10px Helvetica", "#ffffff");
		buyTipText.y = 0;
		buyTipText.x = 5;
		this.addChild(buyTipText);
		var buyTipText2 = new createjs.Text("Cost: " + Tower.prototype.cost(), "10px Helvetica", "#ffffff");
		buyTipText2.y = 10;
		buyTipText2.x = 5;
		buyTipText2.on("tick", function(evt){
			buyTipText2.text = "Cost: " + classType.prototype.cost();
		});
		this.addChild(buyTipText2);
		var buyTipText3 = new createjs.Text("Drag & Drop to buy", "10px Helvetica", "#ffff00");
		buyTipText3.y = 20;
		buyTipText3.x = 5;
		this.addChild(buyTipText3);
		this.visible = false;
	}
	BuyTip.prototype = new createjs.Container();

	/// Customized container for buy buttons
	function BuyButton(classType,imagePath){
		createjs.Container.call(this);
		var buyButtonFrame = new createjs.Shape();
		buyButtonFrame.graphics.beginFill("#0f0f0f").beginStroke("#ffffff").drawRect(0, 0, 30, 30);
		buyButtonFrame.alpha = 0.5;
		this.addChild(buyButtonFrame);
		this.buttonImage = new createjs.Bitmap(imagePath);
		this.buttonImage.x = 5;
		this.buttonImage.y = 5;
		this.buttonImage.hitArea = buyButtonFrame;
		this.addChild(this.buttonImage);

		var buyTip = new BuyTip(classType);
		overlayTip.addChild(buyTip);

		this.on("pressmove", function(evt){
			if(game.isGameOver())
				return;
			if(boughtTower == null){
				var cost = classType.prototype.cost();
				if(game.credit < cost)
					return;
				boughtTower = new classType(game, buyButton.x, buyButton.y);
				game.towers.push(boughtTower);
				game.addTowerEvent(boughtTower);
				game.credit -= cost;
			}
			game.moving = true;
			boughtTower.x = evt.stageX;
			boughtTower.y = evt.stageY;
			boughtTower.onUpdate(0);
			beginHit(boughtTower);
		});
		this.on("pressup", function(evt){
			game.moving = false;
			if(boughtTower != null){
				game.separateTower(boughtTower);
				boughtTower = null;
			}
			endHit();
		});
		this.on("mouseover", function(evt){
			buyTip.visible = true;
			buyTip.x = this.x - 100;
			buyTip.y = this.y + 20;
		});
		this.on("mouseout", function(evt){
			buyTip.visible = false;
		});
	}
	BuyButton.prototype = new createjs.Container();

	var buyButton = new BuyButton(Tower, "assets/turret.png");
	buyButton.x = width - 40;
	buyButton.y = 10;
	buyButton.on("tick", function(evt){
		buyButton.buttonImage.alpha = game.credit < Tower.prototype.cost() ? 0.25 : 1.;
	});
	overlay.addChild(buyButton);

	var buyShotgunButton = new BuyButton(ShotgunTower, "assets/shotgun.png");
	buyShotgunButton.x = width - 40;
	buyShotgunButton.y = 40;
	buyButton.on("tick", function(evt){
		buyShotgunButton.buttonImage.alpha = game.credit < ShotgunTower.prototype.cost() ? 0.25 : 1.;
	});
	overlay.addChild(buyShotgunButton);

	var buyShotgunTip = new BuyTip(ShotgunTower);
	buyShotgunTip.x = width - 100;
	buyShotgunTip.y = 65;
	overlay.addChild(buyShotgunTip);

	var deleteButton = new createjs.Container();
	deleteShape = new createjs.Shape();
	deleteShape.graphics.beginFill("#0f0f0f").beginStroke("#ffffff").drawRect(0, 0, 30, 30);
	deleteButton.addChild(deleteShape);
	var deleteButtonImage = new createjs.Bitmap("assets/trashcan.png");
	deleteButtonImage.x = 5;
	deleteButtonImage.y = 5;
	deleteButtonImage.hitArea = deleteShape;
	deleteButton.addChild(deleteButtonImage);
	deleteButton.x = width - 40;
	deleteButton.y = height - 40;
	overlay.addChild(deleteButton);

	stage.addChild(overlay);

	stage.addChild(overlayTip);


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


	// The last hit Tower object kept tracked to hide hit shape
	var lastHit = null;
	// A set of functions local to this function scope.
	// They are used to highlight intersecting towers when the player tries to
	// place another tower on it.
	// beginHit() should be called in "pressmove" event handler.
	function beginHit(t){
		if(lastHit){
			lastHit.hitShape.visible = false;
			lastHit = null;
		}
		var hit = game.hitTest(t);
		if(hit != null){
			hit.hitShape.visible = true;
			lastHit = hit;
		}
	}
	// endHit() should be called in "pressup" event handler.
	function endHit(){
		if(lastHit){
			lastHit.hitShape.visible = false;
			lastHit = null;
		}
	}
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
