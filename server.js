var http = require('http');
var shoe = require('shoe');
var ecstatic = require('ecstatic')(__dirname + '/static');
var dnode = require('dnode');

var server = http.createServer(ecstatic);
server.listen(9202);

var level;
var playerspeed = 100;
var bulletspeed = 200;

var matchInProgress = false;
var countingDown = false;

var mex = function(ary, prop) {
  var min = 0;
  
  ary.sort(function (a, b) {
    return a[prop] - b[prop];
  });

  for (var i = 0; i < ary.length; i++) {
    if (ary[i][prop] == min) {
      min++;
    }
  }

  return min;
};

var getByProp = function(target, ary, prop) {
  for (var i = 0; i < ary.length; i++) {
    if (ary[i][prop] == target) {
      return ary[i];
    }
  }
}

var generateLevel = function() {

  var width = 40,
      height = 40;

  var level = [];
  for (var i = 0; i < height; i++) {
    level[i] = [];
    for (var j = 0; j < width; j++) {
      if (i == 0 || i == height-1 || j == 0 || j == width-1) {
        level[i][j] = 1;
      } else {
        level[i][j] = Math.random() < 0.5 ? 1 : 0
      }
    }
  }

  // adapted from jeremykun.wordpress.com
  var applyAutomaton = function(cells, width, height, bornList, surviveList, numIterations) {
   var newCells = (function(){
    var cells = [];
    for (var i = 0; i < height; i++) {
      cells[i] = [];
      for (var j = 0; j < width; j++) {
        cells[i][j] = 0;
      }
    }
    return cells;
   })();
   var cellSize = 1;

   while (numIterations-- > 0) {
      for (var cellRow = 0; cellRow < height; cellRow += cellSize) {
         for (var cellCol = 0; cellCol < width; cellCol += cellSize) {
            var liveCondition;

            if (cellRow == 0 || cellRow >= height-cellSize || cellCol == 0 || cellCol >= width-cellSize) {
               liveCondition = true;
            } else {
               var nbhd = 0;

               nbhd += cells[cellRow-cellSize][cellCol-cellSize];
               nbhd += cells[cellRow-cellSize][cellCol];
               nbhd += cells[cellRow-cellSize][cellCol+cellSize];
               nbhd += cells[cellRow][cellCol-cellSize];
               nbhd += cells[cellRow][cellCol+cellSize];
               nbhd += cells[cellRow+cellSize][cellCol-cellSize];
               nbhd += cells[cellRow+cellSize][cellCol];
               nbhd += cells[cellRow+cellSize][cellCol+cellSize];

               // apply B678/S345678
               var currentState = cells[cellRow][cellCol];
               var liveCondition = 
                  (currentState == 0 && bornList.indexOf(nbhd) > -1)|| 
                  (currentState == 1 && surviveList.indexOf(nbhd) > -1); 
            }

            for (var i = 0; i < cellSize; i++) {
               for (var j = 0; j < cellSize; j++) {
                  newCells[cellRow + i][cellCol + j] = liveCondition ? 1 : 0;
               }
            }
         }
      }
   }
   
   // "deep copy"
   for (var i = 0; i < height; i++) {
      for (var j = 0; j < width; j++) {
         cells[i][j] = newCells[i][j];
      }
   }
  } // end generateautomaton, this indenting is retarded

  applyAutomaton(level, width, height, [6,7,8], [3,4,5,6,7,8], 20)
  applyAutomaton(level, width, height, [5,6,7,8], [5,6,7,8], 5)

  return level;
}

// persistent throughout round
var clients = []; // unique id for each player present.
var redTeam = []; // ids of players on the red team.
var bluTeam = []; // ids of players on the blu team.

// bombs appear under lamps. every contiguous area

var items = [];

function initRound() {

  /*if (bluTeam.length == 0 || redTeam.length == 0) {
    return;
  }*/

  if (clients.length < 2) {
    return;
  }

  redTeam = [];
  bluTeam = [];
  for (var i = 0; i < clients.length; i++) {
    clients[i]["c"].clearPlayers();
  }

  for (var i = 0; i < clients.length; i++) {
    var c = clients[i];
    
    c["alive"] = true;
    if (c["team"] == "red") {
      redTeam.push(c["id"]);

      for (var j = 0; j < clients.length; j++) {
        clients[j]["c"].addPlayer(c["id"], "red");
      }

    } else {
      bluTeam.push(c["id"]);

      for (var j = 0; j < clients.length; j++) {
        clients[j]["c"].addPlayer(c["id"], "blu");
      }

    }
  }

  countingDown = false;

  level = generateLevel();
  items = [];
// scatter lamps and such across the level
  (function(){
    var lightLevel = [];
    for (var i = 0; i < level.length; i++) {
      lightLevel[i] = [];
      for (var j = 0; j < level[i].length; j++) {
        lightLevel[i][j] = 0;
      }
    }
    for (var i = 1; i < level.length-1; i++) {
      for (var j = 1; j < level[i].length-1; j++) {
        if (level[i][j] == 0 &&
            Math.random() > .95 &&
            lightLevel[i-1][j-1] == 0 &&
            lightLevel[i-1][j] == 0 &&
            lightLevel[i-1][j+1] == 0 &&
            lightLevel[i][j-1] == 0 &&
            lightLevel[i][j+1] == 0 &&
            lightLevel[i+1][j-1] == 0 &&
            lightLevel[i+1][j] == 0 &&
            lightLevel[i+1][j+1] == 0) {
          items.push({
            "type": "lamp",
            "row": i,
            "col": j
          });
          lightLevel[i][j] = 1;
        }
      }
    }
  })();

  // send to players, let's go
  for (var i = 0; i < clients.length; i++) {
    var cli = clients[i]["c"];
    cli.setLevel(level);
    cli.setItems(items);
    cli.addStatus("Round started. GLHF!");
  }

  matchInProgress = true;
  // spawn em in spread apart locations
  var k = 0;
  for (var i = 0; i < level.length && k < clients.length; i++) {
    for (var j = 0; j < level.length && k < clients.length; j++) {
      if (level[i][j] == 0) {
        var cli = clients[k];
        for (var s = 0; s < clients.length; s++) {
          clients[s]["c"].setPlayerPos(cli["id"], j * 50 + 25 - 16, i * 50 + 25 - 16);
        }
        k++;
        j+=2;
      }
    }
  }
  
}

var checkWin = function() {
  if (redTeam.length == 0) {
    for (var j = 0; j < clients.length; j++) {
      clients[j]["c"].addStatus("Red team eliminated. Blue team wins!");
      clients[j]["c"].addStatus("New round in 10 seconds.");
    }
  } else if (bluTeam.length == 0) {
    for (var j = 0; j < clients.length; j++) {
      clients[j]["c"].addStatus("Blu team eliminated. Red team wins!");
      clients[j]["c"].addStatus("New round in 10 seconds.");
    }
  }
  matchInProgress = false;
  if (!countingDown) {
    console.log("counting down to new match");
    countingDown = true;
    setTimeout(initRound, 10000);
  }

};

var sock = shoe(function(stream) {
  var myId = mex(clients, "id");

  var d = dnode( function (client) {
  	
    // don't keep track of positions?
    // maybe this is insane.
    // for now just complain to people on desync.
    console.log("pushing new client");
    var newC = {};
    newC["c"] = client;
    newC["id"] = myId;
    newC["x"] = 0;
    newC["y"] = 0;
    newC["alive"] = false;

    if (redTeam.length < bluTeam.length) {
      newC["team"] = "red";
      redTeam.push(newC["id"]);
    } else {
      newC["team"] = "blu";
      bluTeam.push(newC["id"]);
    }
    clients.push(newC);
    console.log("new client pushed to team " + newC["team"]);

    /*
  	this.transform = function(s) {
      var res = s.replace(/[aeiou]/g, 'oo').toUpperCase();
      //cb(res);
      for (var i = 0; i < clients.length; i++) {
      	console.log("sending to client " + i);
      	clients[i].setText(s, res);
      }
      //client.setText(s, res);
    }
    */
    this.broadcastMsg = function(src, msg) {
      if (msg == "restart") {
        initRound();
        return;
      }
      for (var i = 0; i < clients.length; i++) {
        clients[i]["c"].addMsg(src, msg);
      }
    }

    this.moveBear = function(id, destX, destY) {
      var c = getByProp(id, clients, "id");
      c.x = destX;
      c.y = destY;
      // broadcast to everyone that this bear moved
      for (var i = 0; i < clients.length; i++) {
        console.log("sending move to client " + clients[i]["id"]);
        clients[i]["c"].setBearPos(id, destX, destY);
      }
    };

    this.takeBomb = function(r, c) {
      for (var i = 0; i < clients.length; i++) {
        clients[i]["c"].removeBomb(r,c);
      }
    };

    // once it is placed, it is for sure blowing up.
    this.putBomb = function(r, c) {
      for (var i = 0; i < clients.length; i++) {
        clients[i]["c"].placeBomb(r, c);
      }
      setTimeout(function() {
        if (r - 1 < 0 || r + 1 > 39 || c - 1 < 0 || c + 1 > 39)
          return;
        level[r-1][c-1] = 0;
        level[r-1][c] = 0;
        level[r-1][c+1] = 0;
        level[r][c-1] = 0;
        level[r][c] = 0;
        level[r][c+1] = 0;
        level[r+1][c-1] = 0;
        level[r+1][c] = 0;
        level[r+1][c+1] = 0;
      }, 3000);
    }

    this.fireBullet = function(id, x0, y0, x1, y1) {
      // dead ppl can't shoot
      if (!(getByProp(id, clients, "id")["alive"])) {
        return;
      }
      var dist = Math.sqrt((x1-x0)*(x1-x0)+(y1-y0)*(y1-y0));
      var time = dist / bulletspeed;
      console.log(time);
      var y1p = y1 + 32;
      var x1p = x1 + 83; // wtf
      // paint the bullet for everyone
      for (var i = 0; i < clients.length; i++) {
        var c = clients[i];
        c["c"].paintBullet(x0,y0,x1p,y1p,time);
      }
      setTimeout(function() {
        console.log("testing bullet at " + x1p + ", " + y1p);
        for (var i = 0; i < clients.length; i++) {
          var c = clients[i];
          if (c["id"] == id) {
            continue;
          }
          if (x1p > c.x - 16 && x1p < c.x + 16 &&
              y1p > c.y - 16 && y1p < c.y + 16) {
            console.log("bullet hit");
            c["alive"] = false;
            var killer = getByProp(id, clients, "id")["name"];
            var victim = c["name"];
            for (var j = 0; j < clients.length; j++) {
              clients[j]["c"].killPlayer(c["id"]);
              clients[j]["c"].addStatus(killer + " killed " + victim);
            }
            if (c["team"] == "red") {
              for (var z = 0; z < redTeam.length; z++) {
                if (redTeam[z] == c["id"]) {
                  redTeam.splice(z, 1);
                  break;
                }
              }
            } else {
              for (var z = 0; z < bluTeam.length; z++) {
                if (bluTeam[z] == c["id"]) {
                  bluTeam.splice(z, 1);
                  break;
                }
              }
            }

            checkWin();

            break;
          }
        }
      }, time * 1000); // need latency compensation?
    }

    this.setName = function(id, name) {
      for (var i = 0; i < clients.length; i++) {
        var c = clients[i];
        if (c["id"] == id) {
          c["name"] = name;
          return;
        }
      }
      console.log("setting the name of " + id + " to " + name);
    }

    // try to move player id from pt 0 to pt 1.
    // assumes the initial position is valid.
    // collide the line against the map and broadcast
    // the adjusted valid move command.
    this.tryMove = function(id, x0, y0, x1, y1) {
      // only do anything if they are alive
      if (!(getByProp(id, clients, "id")["alive"])) {
        return;
      }
      var m = (y1 - y0) / (x1 - x0);
      var t = {"x": x0, "y": y0}; // where we actually end up

      function f(x) {
        return m * (x - x0) + y0;
      }

      function pointOccupiesWall(x, y) {
        var row = Math.floor(y / 50);
        var col = Math.floor(x / 50);
        if (row < 0 || row >= level.length || col < 0 || col >= level[0].length) {
          return true;
        }
        return (level[row][col] == 1);
      }

      var minX = x0; 
      var maxX = x1;
      var incr = 1;
      if (x0 < x1) {
        incr = 1;
        minX = x0;
        maxX = x1;
      } else {
        incr = -1;
        minX = x1;
        maxX = x0;
      }

      for (var i = x0; i != x1; i += incr) {
        t["x"] = i;
        t["y"] = f(i);
        if (pointOccupiesWall(i, f(i))) {
          // collision course
          while (pointOccupiesWall(t["x"] - 16, t["y"] - 16) ||
                 pointOccupiesWall(t["x"] + 16, t["y"] - 16) ||
                 pointOccupiesWall(t["x"] - 16, t["y"] + 16) ||
                 pointOccupiesWall(t["x"] + 16, t["y"] + 16)) {
            i -= incr;
            t["x"] = i;
            t["y"] = f(i);
          }
          break;
        }
      }

      // backtrack until we are ok
      while (pointOccupiesWall(t["x"] - 16, t["y"] - 16) ||
             pointOccupiesWall(t["x"] + 16, t["y"] - 16) ||
             pointOccupiesWall(t["x"] - 16, t["y"] + 16) ||
             pointOccupiesWall(t["x"] + 16, t["y"] + 16)) {
        i -= incr;
        t["x"] = i;
        t["y"] = f(i);
      }

      //var dist = Math.sqrt((t.y - y0)*(t.y-y0) + (t.x-x0)*(t.x-x0));
      //var time = dist / playerspeed;

      // broadcast the move
      for (var i = 0; i < clients.length; i++) {
        console.log("sending move to client " + clients[i]["id"]);
        clients[i]["c"].movePlayer(id, x0, y0, t["x"], t["y"]);//, time);
      }

      setTimeout(function() {
        var s = getByProp(id, clients, "id");
        s["x"] = t["x"];
        s["y"] = t["y"];
        console.log("updated position to " + s["x"] + ", " + s["y"]);
      }, 100);

    }

  });

  d.on('remote', function (e) {
    
    var s = getByProp(myId, clients, "id");
    s["c"].assignId(myId);
    //s["c"].setLevel(level);
    //s["c"].setItems(items);

    console.log("tryna add playa");
    for (var i = 0; i < clients.length; i++) {
      
      // send all bears to the new kid (including himself)
      /*
      s["c"].addPlayer(
        clients[i]["id"],
        clients[i]["team"]);

      // send the new kid to all old bears
      if (clients[i]["id"] != myId) {
        clients[i]["c"].addPlayer(
          myId,
          s["team"]
        );
      } */

      if (redTeam.length == 0 || bluTeam.length == 0) {
        if (clients[i]["c"])
        clients[i]["c"].addStatus("New player joined the " + s["team"] + " team. Waiting for more players to start match.");  
      } else {
        if (clients[i]["c"])
        clients[i]["c"].addStatus("New player joined the " + s["team"] + " team. Starting match in 10 seconds.");
        if (!countingDown) {
          countingDown = true;
          setTimeout(initRound, 10000);
        }
      }
      

    }

    // dont spawnem yet
    // spawnem spawn spawnbar

    // find an empty spot.
    /*
    for (var i = 0; i < level.length; i++) {
      for (var j = 0; j < level[i].length; j++) {
        if (level[i][j] == 0) {
          s["c"].setPlayerPos(myId, j * 50 + 25, i * 50 + 25);
          break;
        }
      }
    }*/

  });

  d.on('end', function (e) {
    // disconnection
  	console.log("dropping client " + myId);
    for (var i = 0; i < clients.length; i++) {
      if (clients[i]["id"] == myId) {
        var ex = clients.splice(i, 1)[0];
        if (matchInProgress) {
          if (ex["team"] == "red") {
            for (var z = 0; z < redTeam.length; z++) {
              if (redTeam[z] == ex["id"]) {
                redTeam.splice(z, 1);
                break;
              }
            }
          } else {
            for (var z = 0; z < bluTeam.length; z++) {
              if (bluTeam[z] == ex["id"]) {
                bluTeam.splice(z, 1);
                break;
              }
            }
          }
          for (var j = 0; j < clients.length; j++) {
            clients[j]["c"].addStatus(ex["name"] + " left");
            clients[j]["c"].killPlayer(myId);
          }
          checkWin();
        }
        break;
      }
    };
    // tell all bears this guy left
    /*
    for (var i = 0; i < clients.length; i++) {
      clients[i]["c"].removeBear(myId);
    }*/
  });

  d.pipe(stream).pipe(d);
  
});

sock.install(server, '/dnode');
