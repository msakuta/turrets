var stage;
var canvas;
var width;
var height;
var game;

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
		var inactiveShape = new createjs.Shape();
		inactiveShape.graphics.beginFill("#ffffff").beginStroke("#0000ff")
			.drawRect(0, -5, 20, 10).endStroke()
			.beginStroke("#0000ff")
			.drawCircle(0, 0, 10);
		var activeShape = new createjs.Shape();
		activeShape.graphics.beginFill("#ffff00").beginStroke("#0000ff")
			.drawRect(0, -5, 20, 10).endStroke()
			.beginStroke("#0000ff")
			.drawCircle(0, 0, 10);
		activeShape.visible = false;
		shape.addChild(inactiveShape);
		shape.addChild(activeShape);

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
		stage.addChild(graph);
		graph.addEventListener("mouseover", function(event){
			tip.visible = true;
			inactiveShape.visible = false;
			activeShape.visible = true;
		});
		graph.addEventListener("mouseout", function(event){
			tip.visible = false;
			inactiveShape.visible = true;
			activeShape.visible = false;
		});
		t.onUpdate = function(dt){
			shape.rotation = this.angle * 360 / 2 / Math.PI;
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
		stage.addChild(shape);
		e.onUpdate = function(dt){
			shape.x = this.x;
			shape.y = this.y;
		}
		e.onDelete = function(){
			stage.removeChild(shape);
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
		}
	}
	stage = new createjs.Stage("scratch");
	stage.enableMouseOver();
	stage.addEventListener("click", function(event){
		game.pause = !game.pause;
	});

	createjs.Ticker.addEventListener("tick", tick);

	stage.update();
}

function tick(event){
	game.update(0.1, function(){});
	stage.update();
}
