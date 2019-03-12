(function() {
	var timeouts = [];
	var messageName = "zero-timeout-message";

	function setZeroTimeout(fn) {
		timeouts.push(fn);
		window.postMessage(messageName, "*");
	}

	function handleMessage(event) {
		if (event.source == window && event.data == messageName) {
			event.stopPropagation();
			if (timeouts.length > 0) {
				var fn = timeouts.shift();
				fn();
			}
		}
	}

	window.addEventListener("message", handleMessage, true);

	window.setZeroTimeout = setZeroTimeout;
})();

var Neuvol;
var game;
var FPS = 60;
var maxScore=0;

var images = {};

var speed = function(fps){
	FPS = parseInt(fps);
}

var loadImages = function(sources, callback){
	var nb = 0;
	var loaded = 0;
	var imgs = {};
	for(var i in sources){
		nb++;
		imgs[i] = new Image();
		imgs[i].src = sources[i];
		imgs[i].onload = function(){
			loaded++;
			if(loaded == nb){
				callback(imgs);
			}
		}
	}
}

var Bird = function(json){
	this.x = 80;
	this.y = 250;
	this.width = 34;
	this.height = 24;

	this.alive = true;
	this.gravity = 0;
	this.velocity = 0.3;
	this.jump = -4;

	this.init(json);
}

Bird.prototype.init = function(json){
	for(var i in json){
		this[i] = json[i];
	}
}

Bird.prototype.flap = function(sig,noise){
	//this.gravity = this.jump;
	this.gravity=sig*0.01 + noise;
}

Bird.prototype.update = function(){
	//this.gravity += this.velocity;
	this.y += this.gravity;
}


Bird.prototype.isDead = function(height, setpoints,connections){
	if(this.y >= height || this.y + this.height <= 0){
		return true;
	}

	set_index=0;
	if(setpoints.length>1){
		for(var i in setpoints){
			if(this.x <= setpoints[i].x + setpoints[0].width && this.x >= setpoints[i].x){
				set_index=i;
				break;
			}
		}
	}
	
	var s=1;
	var thisset=0;
	if(setpoints.length==2){
		if(setpoints[0].x<setpoints[1].x){
			s = (setpoints[1].y-setpoints[0].y) >=0 ? 1:-1;
		}
		else{
			s = (setpoints[0].y-setpoints[1].y) >=0 ? 1:-1;
		}
	}
	
	if(
	(this.x >= setpoints[set_index].x + 0.08 * setpoints[set_index].width &&
	this.x <= setpoints[set_index].x + setpoints[set_index].width &&
	Math.abs(this.y-setpoints[set_index].y) > 10) || 
	(s && this.x < setpoints[set_index].x + 0.08 * setpoints[set_index].width &&
		this.x >= setpoints[set_index].x &&
			(setpoints[set_index].y - this.y) * -s > 20 
	)
	
	){
		return true;
	}
	
}

var setpoint=function(json){
	this.x = 0;
	this.y = 0;
	this.width = 320;
	this.height = 2;
	this.speed = 1;

	this.init(json);
}
setpoint.prototype.init = function(json){
	for(var i in json){
		this[i] = json[i];
	}
}

setpoint.prototype.update = function(){
	this.x -= this.speed;
	
}

setpoint.prototype.isOut = function(){
	if(this.x + this.width < 0){
		return true;
	}
}
var Game = function(){
	
	this.birds = [];
	this.setpoints = [];
	this.connections = [];
	this.score = 0;
	this.canvas = document.querySelector("#flappy");
	this.ctx = this.canvas.getContext("2d");
	this.tabl = document.querySelector("#flappy2")
	this.ctx1 = this.tabl.getContext("2d");
	this.high=true
	this.width = this.canvas.width;
	this.height = this.canvas.height;

	this.spawnInterval = 90;
	this.interval = 0;
	this.gen = [];
	this.alives = 0;
	this.generation = 0;
	this.backgroundSpeed = 0.5;
	this.backgroundx = 0;
	this.maxScore = 0;
}

Game.prototype.start = function(){
	this.interval = 0;
	this.score = 0;
	//this.noise = 0;
	this.birds = [];
	this.setpoints = [];
	this.connections = [];
	this.gen = Neuvol.nextGeneration();
	this.setpoints.push(new setpoint({x:0, y:1/2 * this.height,width:this.width, height: 0}))
	for(var i in this.gen){
		var b = new Bird({y:1/2 * this.height});
		this.birds.push(b)
	}
	this.generation++;
	this.alives = this.birds.length;
	
}
Game.prototype.noise = function(){
	//return 0 ;
	if(this.interval % 100 == 0){
		return Math.random()*10;
	}else if((this.interval+50) % 100 == 0){
		return -Math.random()*10;
	}else{
		return 0;
	}
}
Game.prototype.update = function(){
	
	this.backgroundx += this.backgroundSpeed;
	var nextHoll = this.height/2;
	var thisHoll = this.height/2;
	this.interval++;
	if (this.interval==this.width)
		this.interval=0
	//this.noise=0.1*Math.sin(this.interval);
	if(this.birds.length > 0){
		for(var i = 0; i < this.setpoints.length; i++){
			if(this.setpoints[i].x <= this.birds[0].x &&
				 this.birds[0].x <= this.setpoints[i].x + this.setpoints[i].width
			){
				nextHoll = this.setpoints[i].y;
				break;
			}
			
		}
	}
	for(var i in this.birds){
		if(this.birds[i].alive){

			var inputs = [
			this.birds[i].y ,
			nextHoll
			];
			
			var res = this.gen[i].compute(inputs);

			this.birds[i].flap(res,this.noise());
			this.birds[i].update();
			if(this.birds[i].isDead(this.height, this.setpoints, this.connections)){
				this.birds[i].alive = false;
				this.alives--;
				//console.log(this.alives);
				Neuvol.networkScore(this.gen[i], this.score);
				if(this.isItEnd()){
					this.start();
				}
			}
		}
	}


	for(var i = 0; i < this.setpoints.length; i++){
		this.setpoints[i].update();
		if(this.setpoints[i].isOut()){
			this.setpoints.splice(i, 1);
			i--;

		}
	}
	for(var i = 0; i < this.connections.length; i++){
		this.connections[i].update();
		if(this.connections[i].isOut()){
			this.connections.splice(i, 1);
			i--;
		}
	}
	
	if(this.setpoints.length < 2){
		
		var hollPosition = Math.round((Math.random() * 1/2 - 0.25) * this.height) +  1/2 * this.height;
		var lastHoll = this.setpoints[0].y
		this.setpoints.push(new setpoint({x:this.width+1, y:hollPosition, width:this.width, height:0}))
		this.connections.push(new setpoint({x:this.width+1, y:lastHoll,width:1, height:hollPosition - lastHoll}))
		/*
		if(this.high){
			this.setpoints.push(new setpoint({x:this.width+1, y:this.height/4*3, width:this.width, height:0}))
			
		}else{
			this.setpoints.push(new setpoint({x:this.width+1, y:this.height/4, width:this.width, height:0}))
		}
		//this.connections.push(new setpoint({x:this.width+1, y:lastHoll,width:1, height:this.height/4*3 - lastHoll}))
		this.high=!this.high;
		*/
	}



	this.score++;
	this.maxScore = (this.score > this.maxScore) ? this.score : this.maxScore;
	var self = this;

	if(FPS == 0){
		setZeroTimeout(function(){
			self.update();
		});
	}else{
		setTimeout(function(){
			self.update();
		}, 1000/FPS);
	}
}


Game.prototype.isItEnd = function(){
	for(var i in this.birds){
		if(this.birds[i].alive){
			return false;
		}
	}
	return true;
}

Game.prototype.display = function(){


	this.ctx1.clearRect(0,0,this.width, this.height)
	this.ctx1.font="12px Oswald, sans-serif";
	var b=3;
	this.ctx1.fillText("Birds that alive: ",10, 12)
	this.ctx1.fillText("Num |Kp    |Ki    |Kd    |",10, 24)
	for(var i in this.birds){
		
		if(this.birds[i].alive){
			var s= b-2 + " | " 
			for(var j in this.gen[i].ctl){
				s +=  Math.round(this.gen[i].ctl[j]*100)/100 + "|";
			}
			this.ctx1.fillText(s,10, b * 12)
			b++;
		}
	}
	//sHtml+="</tbody></table>"
	//tabl.innerHTML=sHtml;
	
	this.ctx.clearRect(0, 0, this.width, this.height);
	for(var i = 0; i < Math.ceil(this.width / images.background.width) + 1; i++){
		this.ctx.drawImage(images.background, i * images.background.width - Math.floor(this.backgroundx%images.background.width), 0)
	}

	for (var i in this.setpoints){
		this.ctx.drawImage(images.setpoint, this.setpoints[i].x , this.setpoints[i].y - 1/2 * images.setpoint.height, this.setpoints[i].width, images.setpoint.height);
	}
	for (var i in this.connections){
		this.ctx.drawImage(images.connect, this.connections[i].x -1/2 * images.connect.width, this.connections[i].y , images.connect.width, this.connections[i].height);
	}
	this.ctx.fillStyle = "#FFC600";
	this.ctx.strokeStyle = "#CE9E00";
	for(var i in this.birds){
		if(this.birds[i].alive){
			this.ctx.save(); 
			this.ctx.translate(this.birds[i].x + this.birds[i].width/2, this.birds[i].y + this.birds[i].height/2);
			this.ctx.rotate(Math.PI/2 * this.birds[i].gravity/20);
			this.ctx.drawImage(images.bird, -this.birds[i].width, -this.birds[i].height, this.birds[i].width, this.birds[i].height);
			this.ctx.restore();
		}
	}

	this.ctx.fillStyle = "white";
	this.ctx.font="20px Oswald, sans-serif";
	this.ctx.fillText("Score : "+ this.score, 10, 25);
	this.ctx.fillText("Max Score : "+this.maxScore, 10, 50);
	this.ctx.fillText("Generation : "+this.generation, 10, 75);
	this.ctx.fillText("Alive : "+this.alives+" / "+Neuvol.options.population, 10, 100);
	
	
	
	var self = this;
	requestAnimationFrame(function(){
		self.display();
	});
}

window.onload = function(){
	var sprites = {
		bird:"./img/bird.png",
		background:"./img/background.png",
		//pipetop:"./img/pipetop.png",
		//pipebottom:"./img/pipebottom.png",
		setpoint:"./img/setpoint.png",
		connect:"./img/connect.png"
	}

	var start = function(){
		Neuvol = new PIDevolution({
			population:50
		});
		game = new Game();
		game.start();
		game.update();
		game.display();
	}


	loadImages(sprites, function(imgs){
		images = imgs;
		start();
	})

}
