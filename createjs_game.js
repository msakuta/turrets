var stage;
var towerContainer;
var enemyContainer;
var topContainer;
var canvas;
var width;
var height;
var game;
var backImage = new createjs.Bitmap("assets/back2.jpg");
var checkedImage = new createjs.Bitmap("assets/checked.png");
var lockedImage = new createjs.Bitmap("assets/locked.png");

var explosionSpriteTemplate;
var hitSpriteTemplate;
var pauseText;
var boughtTower = null;
var deleteShape;
var frameTime = 0.1;

function init(){
	canvas = document.getElementById("scratch");
	width = parseInt(canvas.style.width);
	height = parseInt(canvas.style.height);

	stage = new createjs.Stage("scratch");
	stage.enableMouseOver();

	var progressContainer = new createjs.Container();
	var progressBarBack = new createjs.Shape();
	progressBarBack.graphics.beginFill("#f00").drawRect(0, 0, width / 2, 30);
	progressContainer.addChild(progressBarBack);
	var progressBar = new createjs.Shape();
	progressBar.graphics.beginFill("#0f0").drawRect(0, 0, width / 2, 30);
	progressBar.scaleX = 0;
	progressContainer.addChild(progressBar);
	var progressText = new createjs.Text("Loading...", "bold 24px Helvetica", "#ffffff");
	progressText.y = - 24;
	progressContainer.addChild(progressText);
	progressContainer.x = width / 4;
	progressContainer.y = (height - 30) / 2;
	stage.addChild(progressContainer);

	var queue = new createjs.LoadQueue();
	queue.on("complete", function(){
		stage.removeChild(progressContainer);
		start();
	});

	// Tower images
	queue.loadFile("assets/healer.png");
	queue.loadFile("assets/turret.png");
	queue.loadFile("assets/shotgun.png");
	queue.loadFile("assets/BeamTower.png");
	queue.loadFile("assets/MissileTower.png");
	queue.loadFile("assets/shotgun.png");

	// Enemy images
	queue.loadFile("assets/enemy.png");
	queue.loadFile("assets/boss.png");
	queue.loadFile("assets/enemy3.png");
	queue.loadFile("assets/enemy4.png");
	queue.loadFile("assets/BeamEnemy.png");
	queue.loadFile("assets/MissileEnemy.png");
	queue.loadFile("assets/BattleShip.png");
	queue.loadFile("assets/BattleShipTurret.png");
	queue.loadFile("assets/BulletShieldEnemy.png");

	// Effects
	queue.loadFile("assets/explode.png");
	queue.loadFile("assets/explode2.png");
	queue.loadFile("assets/explode_blue.png");

	// Miscellaneous
	queue.loadFile("assets/back2.jpg");
	queue.loadFile("assets/Missile.png");
	queue.loadFile("assets/trashcan.png");
	queue.loadFile("assets/checked.png");
	queue.loadFile("assets/locked.png");

	queue.on("progress", function(event) {
		progressBar.scaleX = queue.progress;
		stage.update();
	});
}

function start(){
	game = new Game(width, height);

	var towerBitmaps = {};
	towerBitmaps[HealerTower] = new createjs.Bitmap("assets/healer.png");
	towerBitmaps[Tower] = new createjs.Bitmap("assets/turret.png");
	towerBitmaps[ShotgunTower] = new createjs.Bitmap("assets/shotgun.png");
	towerBitmaps[BeamTower] = new createjs.Bitmap("assets/BeamTower.png");
	towerBitmaps[MissileTower] = new createjs.Bitmap("assets/MissileTower.png");

	function createBeamShape(e, outerColor, innerColor){
		var beamShape = new createjs.Shape();
		beamShape.graphics.beginLinearGradientFill([outerColor, innerColor, innerColor, outerColor],
			[0, 0.4, 0.6, 1], -e.beamWidth / 2, 0, e.beamWidth / 2, 0)
			.drawRect(-e.beamWidth / 2, 0, e.beamWidth, -e.beamLength);
		return beamShape;
	}

	function formatVal(v, digits){
		if(1e6 * Math.pow(10, digits - 1) < v)
			return Math.round(v / 1e6) + "M";
		else if(1e3 * Math.pow(10, digits - 1) < v)
			return Math.round(v / 1e3) + "k";
		else
			return Math.round(v);
	}

	game.addTowerEvent = function(t){
		var graph = new createjs.Container();

		var text = new createjs.Text(t.id.toString(), "bold 16px Helvetica", "#ff0000");
		text.textAlign = "center";
//		text.x = -5;
		text.y = -10;

		var shape = new createjs.Container();
		var activeShape = new createjs.Shape();
		activeShape.graphics.beginStroke("#00ffff").drawCircle(0, 0, t.radius);
		activeShape.visible = false;
		shape.addChild(activeShape);
		var bm = towerBitmaps[t.constructor].clone();
		var bounds = bm.getBounds();
		bm.x = -bounds.width / 2;
		bm.y = -bounds.height / 2;
		var hitShape = new createjs.Shape();
		hitShape.graphics.beginFill("#ffffff").drawCircle(t.radius, t.radius, t.radius);
		bm.hitArea = hitShape;
		shape.addChild(bm);

		var healthBar = new createjs.Container();
		var healthBarGreen = new createjs.Shape();
		healthBarGreen.graphics.beginFill("#0f0").drawRect(-10, -20, 20, 5);
		healthBar.addChild(healthBarGreen);
		healthBar.currentValue = t.health;
		var tip = new createjs.Container();
		var tipshape = new createjs.Shape();
		var tiplines = 7;
		tipshape.graphics.beginFill("#111").beginStroke("#fff").drawRect(-40, 12, 90, tiplines * 10 + 2).endStroke();
		tip.visible = false;
		var tipRange = new createjs.Shape();
		tip.addChild(tipRange);
		tip.addChild(healthBar);
		tip.addChild(tipshape);
		var tiptexts = [];
		for(var i = 0; i < tiplines; i++){
			var tiptext = new createjs.Text("kills: 0", "10px Helvetica", "#ffffff");
			tiptext.x = -38;
			tiptext.y = 13 + i * 10;
			tiptexts.push(tiptext);
			tip.addChild(tiptext);
		}

		graph.addChild(shape);
		graph.addChild(text);
		overlayTip.addChild(tip);

		// Bind the hit shape indicator to the Tower object.
		t.hitShape = new createjs.Shape();
		t.hitShape.graphics.beginStroke("#ff0000").drawCircle(0, 0, t.radius);
		t.hitShape.visible = false;
		graph.addChild(t.hitShape);

		towerContainer.addChild(graph);

		graph.addEventListener("mouseover", function(event){
			// If we're buying a Tower, do not show tip on it
			if(boughtTower == null)
				tip.visible = true;
			tip.x = graph.x;
			tip.y = graph.y;

			// Show range circle.  It may change during the tower's lifetime, so we update it.
			var range = t.getRange();
			if(range == 0)
				tipRange.visible = false;
			else{
				tipRange.visible = true;
				tipRange.graphics.clear();
				tipRange.graphics.beginStroke("#00ffff").drawCircle(0, 0, t.getRange());
			}

			activeShape.visible = true;
		});
		graph.addEventListener("mouseout", function(event){
			tip.visible = false;
			activeShape.visible = false;
		});
		graph.on("pressmove", function(evt){
			game.moving = true;
			t.x = tip.x = graph.x = evt.stageX;
			t.y = tip.y = graph.y = evt.stageY;
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
		var beamShape = null;
		t.onUpdate = function(dt){
			shape.rotation = this.angle * 360 / 2 / Math.PI + 90;
			graph.x = this.x;
			graph.y = this.y;
			if(tip.visible){
				tiptexts[0].text = "Kills: " + this.kills;
				tiptexts[1].text = "Damage: " + formatVal(this.damage, 3);
				tiptexts[2].text = "Health: " + Math.ceil(this.health) + "/" + this.maxHealth();
				tiptexts[3].text = "Level: " + this.level;
				tiptexts[4].text = "XP: " + formatVal(this.xp, 3) + "/" + formatVal(this.maxXp(), 3);
				tiptexts[5].text = "Range: " + (this.getRange() ? this.getRange() : "none");
				tiptexts[6].text = "DPS: " + (Math.ceil(this.getDPS(frameTime) * 10) / 10 || "none");
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
			if(t instanceof BeamTower && 0 < t.shootPhase){
				if(beamShape === null){
					beamShape = createBeamShape(t, "#3f1f3f", "#ff7fff");
					shape.addChild(beamShape);
				}
				beamShape.visible = true;
			}
			else if(beamShape !== null)
				beamShape.visible = false;
		}
		t.onDelete = function(){
			towerContainer.removeChild(graph);
			overlayTip.removeChild(tip);
		}
	}

	var enemyBitmaps = {
		Enemy: new createjs.Bitmap("assets/enemy.png"),
		Enemy2: new createjs.Bitmap("assets/boss.png"),
		Enemy3: new createjs.Bitmap("assets/enemy3.png"),
		Enemy4: new createjs.Bitmap("assets/enemy4.png"),
		BeamEnemy: new createjs.Bitmap("assets/BeamEnemy.png"),
		MissileEnemy: new createjs.Bitmap("assets/MissileEnemy.png"),
		BattleShipEnemy: new createjs.Bitmap("assets/BattleShip.png"),
		BattleShipTurret: new createjs.Bitmap("assets/BattleShipTurret.png"),
		BulletShieldEnemy: new createjs.Bitmap("assets/BulletShieldEnemy.png"),
	};
	var enemyExplosions = {
		Enemy: 1,
		Enemy2: 5,
		Enemy3: 2,
		Enemy4: 5,
		BeamEnemy: 10,
		MissileEnemy: 10,
		BattleShipEnemy: 20,
		BulletShieldEnemy: 5,
	};

	game.addEnemyEvent = function(e){
		var graph = new createjs.Container();
		var bm = enemyBitmaps[e.constructor.name].clone();
		var bounds = bm.getBounds();
		bm.x = -(bounds.width) / 2;
		bm.y = -(bounds.height) / 2;
		graph.addChild(bm);
		if(e instanceof BattleShipEnemy){
			for(var i = 0; i < e.turrets.length; i++){
				var tc = new createjs.Container();
				var tbm = enemyBitmaps[e.turrets[i].constructor.name].clone();
				tbm.x = -tbm.getBounds().width / 2;
				tbm.y = -tbm.getBounds().height / 2;
				tc.addChild(tbm);
				graph.addChild(tc);
				e.turrets[i].graphic = tc;
			}
		}
		if(e instanceof BulletShieldEnemy){
			// Draw shield range
			var shieldShape = new createjs.Shape();
			shieldShape.graphics.beginStroke("#007f7f")
				.drawCircle(0, 0, e.getShieldRadius());
			graph.addChild(shieldShape);
		}
		enemyContainer.addChild(graph);
		var beamShape = null;
		e.onUpdate = function(dt){
			graph.x = this.x;
			graph.y = this.y;
			graph.rotation = this.angle * 360 / 2 / Math.PI + 90;
			if(e instanceof BeamEnemy && 0 < e.shootPhase){
				if(beamShape === null){
					beamShape = createBeamShape(e, "#001f3f", "#007fff");
					graph.addChild(beamShape);
				}
				beamShape.visible = true;
			}
			else if(beamShape !== null)
				beamShape.visible = false;
			if(e instanceof BattleShipEnemy){
				for(var i = 0; i < e.turrets.length; i++){
					var tbm = e.turrets[i].graphic;
					tbm.rotation = e.turrets[i].angle * 360 / 2 / Math.PI;
					tbm.x = e.turrets[i].y;
					tbm.y = -e.turrets[i].x;
				}
			}
		}
		e.onDelete = function(){
			enemyContainer.removeChild(graph);
			var effectCount = enemyExplosions[this.constructor.name];
			for(var i = 0; i < effectCount; i++){
				var sprite = explosionSpriteTemplate.clone();
				sprite.x = this.x;
				sprite.y = this.y;
				if(1 < effectCount){
					sprite.x += (game.rng.next() + game.rng.next() - 1) * e.radius;
					sprite.y += (game.rng.next() + game.rng.next() - 1) * e.radius;
				}
				// Start playing explosion animation
				sprite.gotoAndPlay("explosion");
				// Make the effect disappear when it finishes playing
				sprite.addEventListener("animationend", function(event){
					event.target.stop();
					effectContainer.removeChild(event.target);
				});
				effectContainer.addChild(sprite);
			}
		}
	}

	var missileBitmap = new createjs.Bitmap("assets/Missile.png");

	game.addBulletEvent = function(b){
		var shape = null;
		if(b instanceof Missile){
			shape = new createjs.Container();
			var bm = missileBitmap.clone();
			var bounds = bm.getBounds();
			bm.x = -(bounds.width) / 2;
			bm.y = -(bounds.height) / 2;
			shape.addChild(bm);
			var trail;
			var trailCounter = 0;
			var trailPos = [b.x, b.y];
			var beginTrail = function(){
				trail = new createjs.Shape();
				trail.graphics.beginStroke(b.owner instanceof Tower ? "#7f3f7f" : "#7f7f7f")
					.setStrokeStyle(2).mt(trailPos[0], trailPos[1]);
				effectContainer.addChild(trail);
				trailCounter = 0;
			}
			beginTrail();
		}
		else{
			shape = new createjs.Shape();
			shape.graphics.beginFill(b.team == 0 ? "#ff0000" : "#ffff00").drawRect(-5, -2, 5, 2);
		}
		effectContainer.addChild(shape);

		// Local function to make missile smoke trails disappear over time
		var endTrail = function(){
			if(trail !== undefined)
				trail.on("tick", function(evt){
					evt.currentTarget.alpha -= 0.05;
					if(evt.currentTarget.alpha <= 0)
						effectContainer.removeChild(evt.currentTarget);
				});
		}

		b.onUpdate = function(dt){
			shape.x = this.x;
			shape.y = this.y;
			shape.rotation = (b instanceof Missile ? this.angle + Math.PI / 2 : this.angle) * 360 / 2 / Math.PI;

			// Update missile smoke trails
			if(b instanceof Missile && Math.floor(game.global_time / 0.2) !== Math.floor((game.global_time + dt) / 0.2)){
				if(10 < trailCounter++){
					endTrail();
					beginTrail();
				}
				trail.graphics.lineTo(this.x, this.y);
				trailPos = [this.x, this.y];
			}
		}
		b.onDelete = function(){
			effectContainer.removeChild(shape);

			endTrail();

			if(this.vanished)
				return;
			var sprite = (b instanceof Missile ? explosionSpriteTemplate : hitSpriteTemplate).clone();
			sprite.x = this.x;
			sprite.y = this.y;
			// Start playing hit animation
			sprite.gotoAndPlay("explosion");
			// Make the effect disappear when it finishes playing
			sprite.addEventListener("animationend", function(event){
				event.target.stop();
				effectContainer.removeChild(event.target);
			});
			effectContainer.addChild(sprite);
		}
	}

	// Heal effects on both healer and healee.
	game.onHeal = function(e, healer){
		// The effect on the healed tower
		var sprite = new createjs.Shape();
		sprite.graphics.beginFill("#00ff77")
			.mt(-10, -3).lt(-3, -3).lt(-3, -10).lt(3, -10).lt(3, -3)
			.lt(10, -3).lt(10, 3).lt(3, 3).lt(3, 10).lt(-3, 10).lt(-3, 3).lt(-10, 3).ef();
		sprite.alpha = 1;
		sprite.x = e.x;
		sprite.y = e.y;
		sprite.on("tick", function(e){
			sprite.alpha -= 0.05;
			sprite.y -= 1;
			if(sprite.alpha <= 0)
				effectContainer.removeChild(sprite);
		});
		effectContainer.addChild(sprite);

		// The effect on the healer tower
		var healerEffect = new createjs.Shape();
		healerEffect.graphics.beginFill("#00ff77").drawCircle(0, 0, 5);
		healerEffect.x = healer.x;
		healerEffect.y = healer.y;
		healerEffect.alpha = 0.5;
		healerEffect.on("tick", function(e){
			healerEffect.alpha -= 0.05;
			if(healerEffect.alpha <= 0)
				effectContainer.removeChild(healerEffect);
			else{
				// Gradually scale up
				healerEffect.scaleX += 0.2;
				healerEffect.scaleY += 0.2;
			}
		});
		effectContainer.addChild(healerEffect);

		var healBeam = new createjs.Shape();
		healBeam.graphics.beginStroke("#00ff77").setStrokeStyle(2).mt(healer.x, healer.y).lt(e.x, e.y);
		healBeam.on("tick", function(e){
			healBeam.alpha -= 0.05;
			if(healBeam.alpha <= 0)
				effectContainer.removeChild(healBeam);
		});
		effectContainer.addChild(healBeam);
	}

	game.onBeamHit = function(x,y){
		if(game.rng.nexti() % 3 !== 0)
			return;
		var sprite = beamHitSpriteTemplate.clone();
		sprite.x = x;
		sprite.y = y;
		sprite.x += (game.rng.next() + game.rng.next() - 1.) * 10;
		sprite.y += (game.rng.next() + game.rng.next() - 1.) * 10;
		// Start playing explosion animation
		sprite.gotoAndPlay("explosion");
		// Make the effect disappear when it finishes playing
		sprite.addEventListener("animationend", function(event){
			event.target.stop();
			effectContainer.removeChild(event.target);
		});
		effectContainer.addChild(sprite);
	}

	stage.addChild(backImage);

	towerContainer = new createjs.Container();
	stage.addChild(towerContainer);

	enemyContainer = new createjs.Container();
	stage.addChild(enemyContainer);

	var effectContainer = new createjs.Container();
	stage.addChild(effectContainer);

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
	var textDefs = [
		function(evt){ evt.currentTarget.text = "Score: " + formatVal(game.score, 5); },
		function(evt){ evt.currentTarget.text = "Credit: " + formatVal(game.credit, 5); },
		function(evt){ evt.currentTarget.text = "Stage: " + game.stage; },
	];
	for(var j = 0; j < textDefs.length; j++){
		var statusText = new createjs.Text("", "10px Helvetica", "#ffffff");
		statusText.y = j * 10;
		statusText.x = 5;
		statusText.on("tick", textDefs[j]);
		statusPanel.addChild(statusText);
	}
	statusPanel.x = 5;
	statusPanel.y = 5;
	overlay.addChild(statusPanel);

	/// Class for showing buy button tip
	function TextTip(texts,width){
		createjs.Container.call(this);
		var buyTipFrame = new createjs.Shape();
		buyTipFrame.graphics.beginFill("#0f0f0f").beginStroke("#ffffff").drawRect(0, 0, width == undefined ? 100 : width, texts.length * 10 + 5);
		this.addChild(buyTipFrame);
		this.texts = [];
		for(var i = 0; i < texts.length; i++){
			var caption = typeof(texts[i]) == "string" ? texts[i] : texts[i].text;
			var color = typeof(texts[i]) == "string" ? "#ffffff" : texts[i].color;
			var text = new createjs.Text(caption, "10px Helvetica", color);
			text.x = 5;
			text.y = i * 10;
			this.texts.push(text);
			this.addChild(text);
		}
		this.visible = false;
	}
	TextTip.prototype = new createjs.Container();

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
		this.buttonImage.scaleX = 20 / this.buttonImage.getBounds().width;
		this.buttonImage.scaleY = 20 / this.buttonImage.getBounds().height;
		this.addChild(this.buttonImage);

		var buyTip = new TextTip([classType.prototype.dispName(), "", {text: "Drag & Drop to buy", color: "#ffff00"}]);
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
			buyTip.y = this.y;
		});
		this.on("mouseout", function(evt){
			buyTip.visible = false;
		});
		this.on("tick", function(evt){
			buyTip.texts[1].text = "Cost: " + formatVal(classType.prototype.cost(), 5);
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

	var buyHealerButton = new BuyButton(HealerTower, "assets/healer.png");
	buyHealerButton.x = width - 40;
	buyHealerButton.y = 70;
	buyHealerButton.on("tick", function(evt){
		buyHealerButton.buttonImage.alpha = game.credit < HealerTower.prototype.cost() ? 0.25 : 1.;
	});
	overlay.addChild(buyHealerButton);

	var buyBeamButton = new BuyButton(BeamTower, "assets/BeamTower.png");
	buyBeamButton.x = width - 40;
	buyBeamButton.y = 100;
	buyBeamButton.on("tick", function(evt){
		buyBeamButton.buttonImage.alpha = game.credit < BeamTower.prototype.cost() ? 0.25 : 1.;
	});
	overlay.addChild(buyBeamButton);

	var buyMissileButton = new BuyButton(MissileTower, "assets/MissileTower.png");
	buyMissileButton.x = width - 40;
	buyMissileButton.y = 130;
	buyMissileButton.on("tick", function(evt){
		buyMissileButton.buttonImage.alpha = game.credit < MissileTower.prototype.cost() ? 0.25 : 1.;
	});
	overlay.addChild(buyMissileButton);

	var deleteButton = new createjs.Container();
	deleteShape = new createjs.Shape();
	deleteShape.graphics.beginFill("#0f0f0f").beginStroke("#ffffff").drawRect(0, 0, 30, 30);
	deleteShape.alpha = 0.5;
	deleteButton.addChild(deleteShape);
	var deleteButtonImage = new createjs.Bitmap("assets/trashcan.png");
	deleteButtonImage.x = 5;
	deleteButtonImage.y = 5;
	deleteButtonImage.hitArea = deleteShape;
	deleteButton.addChild(deleteButtonImage);
	deleteButton.x = width - 40;
	deleteButton.y = height - 40;
	overlay.addChild(deleteButton);
	deleteButton.on("mouseover", function(evt){
		deleteButtonTip.visible = true;
	});
	deleteButton.on("mouseout", function(evt){
		deleteButtonTip.visible = false;
	});
	var deleteButtonTip = new TextTip([{text: "Drag & Drop a tower", color: "#ffff00"}, {text: "here to delete", color: "#ffff00"}], 110);
	deleteButtonTip.x = deleteButton.x - 110;
	deleteButtonTip.y = deleteButton.y;
	overlayTip.addChild(deleteButtonTip);

	stage.addChild(overlay);

	stage.addChild(overlayTip);

	var stageProgressBack = new createjs.Shape();
	stageProgressBack.graphics.beginFill("#7f0000").beginStroke("#ffffff").drawRect(0, 0, width, 5);
	stageProgressBack.x = 0;
	stageProgressBack.y = height - 5;
	stage.addChild(stageProgressBack);
	var stageProgress = new createjs.Shape();
	stageProgress.graphics.beginFill("#7fff7f").beginStroke("#ffffff").drawRect(0, 0, width, 5);
	stageProgress.x = 0;
	stageProgress.y = height - 5;
	stageProgress.on("tick", function(evt){
		stageProgress.scaleX = game.getStageProgress();
	});
	stage.addChild(stageProgress);

	topContainer = new createjs.Container();
	stage.addChild(topContainer);


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

	// create spritesheet for Bullet hit effect.
	var beamHitSpriteSheet = new createjs.SpriteSheet({
		images: ["assets/explode_blue.png"],
		frames: {width: 16, height: 16, regX: 8, regY: 8},
		animations: {
			explosion: [0, 6],
		}
	});

	// create a Sprite instance to display and play back the sprite sheet:
	beamHitSpriteTemplate = new createjs.Sprite(beamHitSpriteSheet);

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

	showMenu();
}

function tick(event){
	if(game)
		game.update(frameTime, function(){});
	stage.update();
}

/// Customized container for buy buttons
function SelectStageButton(level, text){
	createjs.Container.call(this);
	var buttonFrame = new createjs.Shape();
	buttonFrame.graphics.beginFill("#0f0f0f").beginStroke("#ffffff").drawRect(0, 0, 300, 45);
	buttonFrame.alpha = 0.5;
	this.addChild(buttonFrame);
	var mouseOverFrame = new createjs.Shape();
	mouseOverFrame.graphics.beginFill("#3f3f3f").beginStroke("#ffffff").drawRect(0, 0, 300, 45);
	mouseOverFrame.alpha = 0.5;
	mouseOverFrame.visible = false;
	this.addChild(mouseOverFrame);
	this.checkIcon = checkedImage.clone();
	this.checkIcon.x = 5;
	this.checkIcon.y = 5;
	this.addChild(this.checkIcon);
	this.lockedIcon = lockedImage.clone();
	this.lockedIcon.x = 5;
	this.lockedIcon.y = 5;
	this.addChild(this.lockedIcon);
	this.buttonText = new createjs.Text(text, "bold 24px Helvetica", "#ffffff");
	this.buttonText.x = 37;
	this.buttonText.y = 5;
//		this.buttonImage.hitArea = buyButtonFrame;
	this.addChild(this.buttonText);
	this.scoreText = new createjs.Text("High score: ???", "bold 12px Helvetica", "#ffffff");
	this.scoreText.x = 37;
	this.scoreText.y = 30;
//		this.buttonImage.hitArea = buyButtonFrame;
	this.addChild(this.scoreText);

	this.on("click", function(evt){
		if(!game.isGameOver() && !game.stageClear || this.lockedIcon.visible)
			return;
		game.startStage(level);
		showMenu.menu.visible = false;
	});
	this.on("mouseover", function(evt){
		if(!this.lockedIcon.visible)
			mouseOverFrame.visible = true;
	});
	this.on("mouseout", function(evt){
		mouseOverFrame.visible = false;
	});

	this.updateHighScores = function(){
		this.scoreText.text = "High score: " + game.highScores[level];
		this.checkIcon.visible = game.highScores[level];
		this.lockedIcon.visible = !game.highScores[level] && 1 < level && !game.highScores[level-1];
		this.buttonText.color = this.checkIcon.visible ? "#9fffbf" : this.lockedIcon.visible ? "#7f7f7f" : "#ffffff";
	}
	this.updateHighScores();
}
SelectStageButton.prototype = new createjs.Container();

function showMenu(){
	var pageSize = 6;
	showMenu.curPageIdx = 0;

	function updatePages(){
		for(var i = 0; i < showMenu.pages.length; i++)
			showMenu.pages[i].visible = i === showMenu.curPageIdx;
		// Base 1
		pagePosLabel.text = (showMenu.curPageIdx + 1) + " / " + showMenu.pages.length;
	}

	if(showMenu.menu === undefined){
		showMenu.menu = new createjs.Container();

		// Add the screen first
		var menuBack = new createjs.Shape();
		menuBack.graphics.f("#000000").dr(0, 0, width, height);
		menuBack.alpha = 0.75;
		menuBack.on("mousedown", function(evt){}); // Capture event to prevent effects on background
		showMenu.menu.addChild(menuBack);

		// Add a label telling player to select a difficulty
		var label = new createjs.Text("SELECT DIFFICULTY", "bold 24px Helvetica", "#ffffff");
		label.x = (width - label.getBounds().width) / 2;
		label.y = 15;
		showMenu.menu.addChild(label);

		// Add a label indicating page location
		var pagePosLabel = new createjs.Text("1 / 1", "bold 24px Helvetica", "#ffffff");
		pagePosLabel.x = (width - pagePosLabel.getBounds().width) / 2;
		pagePosLabel.y = height - 45;
		showMenu.menu.addChild(pagePosLabel);

		// Add page navigation button to go back
		var prevButton = new createjs.Shape();
		prevButton.graphics.beginFill("#3f3f3f").beginStroke("#ffffff")
			.drawRect(0, 0, 30, 30)
			.beginStroke("#ffffff").mt(25, 5).lt(25,25).lt(5,15).cp();
		prevButton.x = width / 2 - 75;
		prevButton.y = height - 50;
		prevButton.on("click", function(evt){
			if(0 < showMenu.curPageIdx){
				showMenu.curPageIdx--;
				updatePages();
			}
		});
		showMenu.menu.addChild(prevButton);

		// Add page navigation button to go forward
		var nextButton = new createjs.Shape();
		nextButton.graphics.beginFill("#3f3f3f").beginStroke("#ffffff")
			.drawRect(0, 0, 30, 30)
			.beginStroke("#ffffff").mt(5, 5).lt(5,25).lt(25,15).cp();
		nextButton.on("click", function(evt){
			if(showMenu.curPageIdx < showMenu.pages.length-1){
				showMenu.curPageIdx++;
				updatePages();
			}
		});
		nextButton.x = width / 2 + 45;
		nextButton.y = height - 50;
		showMenu.menu.addChild(nextButton);

		showMenu.buttons = [];
		showMenu.pages = [];
		var captions = [
			"0 - Basic", "1 - Normal", "2 - Medium", "3 - Hard", "4 - Very Hard", "5 - Extremely Hard",
			"6 - Extraordinary Hard", "7 - Veteran", "8 - Elite", "9 - Don't Try This", "10 - Insane",
			"11 - Ultimate", "12 - Astronomic", "-1 - Endurance mode"];
		for(var i = 0; i < captions.length; i++){
			var pageIdx = Math.floor(i / pageSize);
			if(showMenu.pages[pageIdx] === undefined){
				var page = new createjs.Container();
				showMenu.menu.addChild(page);
				showMenu.pages[pageIdx] = page;
			}
			var str = captions[i].split(" ")[0];
			var but = new SelectStageButton(parseInt(str), captions[i]);
			but.x = (width - 300) / 2;
			but.y = 45 + i % pageSize * 45;
			showMenu.pages[pageIdx].addChild(but);
			showMenu.buttons.push(but);
		}
		updatePages();
		topContainer.addChild(showMenu.menu);
	}

	showMenu.menu.visible = true;

	game.onStageClear = function(){
		showMenu.menu.visible = true;
		for(var i = 0; i < showMenu.buttons.length; i++){
			showMenu.buttons[i].updateHighScores();
		}
	}

	game.onInit = function(){
		game.onStageClear();
	}
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
	if(event.keyCode == 80){ // 'p'
		togglePause();
	}
}
