
		
		var params      = Utils.parseQuery();
		var numMovers   = params.numObjects || 100;
		var moverSize   = params.objectSize || 200;
		var frameRate   = 30;
				
		var canvas;
		var ctx;
		var stats;
		var movers;
		var stageW;
		var stageH;
		var img;
		var buffer;
		
		
		window.onload = loadImg;
		
		
		function loadImg(){
			
			img = new Image();
			img.onload = init;
			img.src = 'raspberry.png';
			
		}
		
		
		function init(){
			
			canvas = document.getElementById("bigCanvas");
			ctx = canvas.getContext("2d");
			
			if( !canvas.getContext || !canvas.getContext("2d").putImageData ){
				
				alert( "Hi, this is just a test, please use the latest version of Chrome or Safari (Mac)." );
				return;
				
			}
			
			resize( null );
		
			movers = [];
			
			var i = numMovers;
			while ( i-- ){
				
				// create a moving object with random velocity
				var m = {};
				m.x     = Math.random() * stageW;
				m.y     = Math.random() * stageH;
				m.vX    = 10 - Math.random() * 20;
				m.vY    = 10 - Math.random() * 20;
				m.phase = i;
				movers[i] = m;
				
			}
		
			buffer = document.createElement("canvas");
			buffer.width = buffer.height = moverSize;
			buffer.getContext("2d").drawImage( img , 0 , 0 );
		
			stats = new Stats();
			document.getElementById("stats").appendChild( stats.getDisplayElement() );
			
			window.onresize = resize;
			setInterval( run , 1000 / frameRate );
		}
		
		
		function run(){
			
			ctx.clearRect( 0 , 0 , stageW , stageH );
			
			var i = numMovers;
			while ( i-- ){
				
				var m = movers[i];
				
				var nextX = m.x + m.vX;
				var nextY = m.y + m.vY;
				
				// scale image:
				var size = Math.abs( Math.sin( m.phase ) * moverSize );
				m.phase += 0.05;
				
				// simple stage bounds collision detection
				if( nextX + size > stageW ){
					nextX = stageW - size;
					m.vX *= -1;
				}
				else if( nextX < 0 ){
					nextX = 0;
					m.vX *= -1;
				}
				
				if( nextY + size > stageH ){
					nextY = stageH - size;
					m.vY *= -1;
				}
				else if( nextY < 0 ){
					nextY = 0;
					m.vY *= -1;
				}
				
				m.x = nextX;
				m.y = nextY;
				
				
				// draw the image:
				ctx.drawImage( buffer , Math.round(nextX) , Math.round(nextY) , Math.round(size) , Math.round(size) );
				//ctx.drawImage( buffer , nextX , nextY , size , size );
			}
			
			stats.tick();
		}
		
		
		function resize(e){
			
			stageW = document.documentElement.clientWidth;
			stageH = document.documentElement.clientHeight;
			canvas.width  = stageW;
			canvas.height = stageH;
			
		}
		
    
    