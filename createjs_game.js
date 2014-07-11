var stage;
var towerContainer;
var enemyContainer;
var topContainer;
var canvas;
var width;
var height;
var game;
var backImage = new createjs.Bitmap("assets/back2.jpg");

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
	game = new Game(width, height);

	var towerBitmaps = {};
	towerBitmaps[HealerTower] = new createjs.Bitmap("assets/healer.png");
	towerBitmaps[Tower] = new createjs.Bitmap("assets/turret.png");
	towerBitmaps[ShotgunTower] = new createjs.Bitmap("assets/shotgun.png");
	towerBitmaps[BeamTower] = new createjs.Bitmap("assets/BeamTower.png");

	function createBeamShape(e, outerColor, innerColor){
		var beamShape = new createjs.Shape();
		beamShape.graphics.beginLinearGradientFill([outerColor, innerColor, innerColor, outerColor],
			[0, 0.4, 0.6, 1], -e.beamWidth / 2, 0, e.beamWidth / 2, 0)
			.drawRect(-e.beamWidth / 2, 0, e.beamWidth, -e.beamLength);
		return beamShape;
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
				tiptexts[1].text = "Damage: " + Math.round(this.damage);
				tiptexts[2].text = "Health: " + Math.ceil(this.health) + "/" + this.maxHealth();
				tiptexts[3].text = "Level: " + this.level;
				tiptexts[4].text = "XP: " + Math.ceil(this.xp) + "/" + this.maxXp();
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
	};
	var enemyExplosions = {
		Enemy: 1,
		Enemy2: 5,
		Enemy3: 2,
		Enemy4: 5,
		BeamEnemy: 10,
		MissileEnemy: 10,
	};

	game.addEnemyEvent = function(e){
		var graph = new createjs.Container();
		var bm = enemyBitmaps[e.constructor.name].clone();
		var bounds = bm.getBounds();
		bm.x = -(bounds.width) / 2;
		bm.y = -(bounds.height) / 2;
		graph.addChild(bm);
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
		}
		e.onDelete = function(){
			enemyContainer.removeChild(graph);
			var effectCount = enemyExplosions[this.constructor.name];
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
					effectContainer.removeChild(event.target);
				});
				effectContainer.addChild(sprite);
			}
		}
	}

	var missileBitmap = new createjs.Bitmap("assets/Missile.png");

	game.addBulletEvent = function(b){
		var shape = null
		if(b instanceof Missile){
			shape = new createjs.Container();
			var bm = missileBitmap.clone();
			var bounds = bm.getBounds();
			bm.x = -(bounds.width) / 2;
			bm.y = -(bounds.height) / 2;
			shape.addChild(bm);
			var trail = new createjs.Shape();
			trail.graphics.beginStroke("#7f7f7f").setStrokeStyle(2);
			effectContainer.addChild(trail);
		}
		else{
			shape = new createjs.Shape();
			shape.graphics.beginFill(b.team == 0 ? "#ff0000" : "#ffff00").drawRect(-5, -2, 5, 2);
		}
		effectContainer.addChild(shape);
		b.onUpdate = function(dt){
			shape.x = this.x;
			shape.y = this.y;
			shape.rotation = (b instanceof Missile ? this.angle + Math.PI / 2 : this.angle) * 360 / 2 / Math.PI;

			// Update missile smoke trails
			if(b instanceof Missile && Math.floor(game.global_time / 0.2) !== Math.floor((game.global_time + dt) / 0.2))
				trail.graphics.lineTo(this.x, this.y);
		}
		b.onDelete = function(){
			effectContainer.removeChild(shape);

			// Make missile smoke trails disappear over time
			if(trail !== undefined)
				trail.on("tick", function(evt){
					trail.alpha -= 0.05;
					if(trail.alpha <= 0)
						effectContainer.removeChild(trail);
				});

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

	stage = new createjs.Stage("scratch");
	stage.enableMouseOver();
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
		function(evt){ evt.currentTarget.text = "Score: " + game.score; },
		function(evt){ evt.currentTarget.text = "Credit: " + game.credit; },
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
			buyTip.texts[1].text = "Cost: " + classType.prototype.cost();
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
	game.update(frameTime, function(){});
	stage.update();
}

/// Customized container for buy buttons
function SelectStageButton(level, text){
	createjs.Container.call(this);
	var buttonFrame = new createjs.Shape();
	buttonFrame.graphics.beginFill("#0f0f0f").beginStroke("#ffffff").drawRect(0, 0, 240, 50);
	buttonFrame.alpha = 0.5;
	this.addChild(buttonFrame);
	var mouseOverFrame = new createjs.Shape();
	mouseOverFrame.graphics.beginFill("#3f3f3f").beginStroke("#ffffff").drawRect(0, 0, 240, 50);
	mouseOverFrame.alpha = 0.5;
	mouseOverFrame.visible = false;
	this.addChild(mouseOverFrame);
	this.buttonText = new createjs.Text(text, "bold 24px Helvetica", "#ffffff");
	this.buttonText.x = 5;
	this.buttonText.y = 5;
//		this.buttonImage.hitArea = buyButtonFrame;
	this.addChild(this.buttonText);
	this.scoreText = new createjs.Text("High score: ???", "bold 12px Helvetica", "#ffffff");
	this.scoreText.x = 5;
	this.scoreText.y = 30;
//		this.buttonImage.hitArea = buyButtonFrame;
	this.addChild(this.scoreText);

	this.on("click", function(evt){
		if(!game.isGameOver() && !game.stageClear)
			return;
		game.startStage(level);
		showMenu.menu.visible = false;
	});
	this.on("mouseover", function(evt){
		mouseOverFrame.visible = true;
	});
	this.on("mouseout", function(evt){
		mouseOverFrame.visible = false;
	});

	this.updateHighScores = function(){
		this.scoreText.text = "High score: " + game.highScores[level];
	}
	this.updateHighScores();
}
SelectStageButton.prototype = new createjs.Container();

function showMenu(){

	if(showMenu.menu === undefined){
		showMenu.menu = new createjs.Container();
		var label = new createjs.Text("SELECT DIFFICULTY", "bold 12px Helvetica", "#ffffff");
		label.x = (width - label.getBounds().width) / 2;
		label.y = 5;
		showMenu.menu.addChild(label);
		showMenu.buttons = [];
		var captions = ["0 - Basic", "1 - Normal", "2 - Medium", "3 - Hard", "4 - Very Hard", "5 - Extremely Hard", "10 - Insane"];
		for(var i = 0; i < captions.length; i++){
			var str = captions[i].split(" ")[0];
			var but = new SelectStageButton(parseInt(str), captions[i]);
			but.x = (width - 240) / 2;
			but.y = 20 + i * 50;
			showMenu.menu.addChild(but);
			showMenu.buttons.push(but);
		}
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
	if(event.keyCode == 80){
		togglePause();
	}
}
