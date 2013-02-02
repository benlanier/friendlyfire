var domready = require('domready');
var shoe = require('shoe');
var dnode = require('dnode');

domready(function () {

    /*
	document.getElementById('inp').addEventListener('change', function (e) {
		if (document.getElementById('inp').value.length > 256) {
			document.getElementById('inp').value = document.getElementById('inp').value.substring(0,256);
		}
	});
    */



    //var result = document.getElementById('result');
    var stream = shoe('/dnode');

    var bears = [];

    var players = [];
    var myId = -1;
    var items = []; // i'm sleepy. this is actually lamps
    var bombs = []; // this is actually bombs

    var havebomb = false;

    var levPos = {x: 250, y: 250};
    var myPos = {x: 250, y: 250};

    var levelEl = document.getElementById("level");
    var crossEl = document.getElementById("crosshair");

    // functions to bind
    var fireBullet;
    var takeBomb;
    var putBomb;
    var setName;

    var sendChat;

    document.getElementById("sendChat").addEventListener("touchstart", function (e) {
        sendChat();
    });

    document.getElementById("myName").addEventListener("blur", function (e) {
        setName();
    });

    /*
    var playaEl = document.getElementById("player");
    
    document.getElementById("game").addEventListener("touchstart", function (e) {
        var dx = e.touches[0].pageX - 50 - 250;
        var dy = e.touches[0].pageY - 250;
        

        levPos.x -= dx;
        levPos.y -= dy;
        myPos.x += dx;
        myPos.y += dy;
        //console.log(myPos);
        levelEl.style["left"] = (levPos.x - 250) + "px";
        levelEl.style["top"] = (levPos.y - 250) + "px";
        playaEl.style["left"] = (myPos.x - 16) + "px";
        playaEl.style["top"] = (myPos.y - 16) + "px";
    });
    */

    /*
    var d = dnode({
    	setText: function(orig, trans) {
    		result.appendChild(document.createTextNode(orig + ' => ' + trans));
    		result.appendChild(document.createElement('br'));
    	}
    }); */

    var d = dnode({
        assignId: function(mId) {
            myId = mId;
        },
        addBear: function(bobj) {
            console.log("tryna add bear");
            /*var newb = document.createElement("div");
            newb.className = "bear";
            newb.style["left"] = (bobj["x"]-50) + "px";
            newb.style["top"] = (bobj["y"]-64) + "px";
            bears.push({id: bobj["id"], el: newb});

            try {
                document.getElementById("bears").appendChild(newb);
            } catch(e) {
                console.log("oops");
            }*/
        },
        clearPlayers: function() {
            players = [];
            items = [];
            while (levelEl.firstChild) {
                console.log("spinning?");
                //if (levelEl.firstChild.id != "levelc") {
                    levelEl.removeChild(levelEl.firstChild);
                //}
            }
            var canv = document.createElement("canvas");
            canv.id = "levelc";
            canv.width = 2000;
            canv.height = 2000;
            levelEl.appendChild(canv);
        },
        addMsg: function(src, msg) {
            var cEl = document.getElementById("chat");
            var newMsg = document.createElement("div");
            newMsg.className = "chatMsg";
            newMsg.innerHTML = "<b>" + src + "</b>: " + msg;
            cEl.insertBefore(newMsg, cEl.firstChild);
        },
        addStatus: function(msg) {
            var cEl = document.getElementById("chat");
            var newMsg = document.createElement("div");
            newMsg.className = "statusMsg";
            newMsg.innerHTML = msg;
            cEl.insertBefore(newMsg, cEl.firstChild);
        },
        addPlayer: function(id, team) {
            console.log("addin playa " + team);
            var newb = document.createElement("img");
            newb.className = "player";
            newb.style["position"] = "absolute";
            newb.style["left"] = "0px";
            newb.style["top"] = "0px";
            newb.style["visibility"] = "visible";
            //if (team == "red") {
            //    newb.src = "//placehold.it/32/ff0000";
            //} else if (team == "blu") {
            //    newb.src = "//placehold.it/32/0000ff";
            //} else {
                newb.src = "//placehold.it/32";
            //}
            if (id != myId) {
                newb.addEventListener("touchstart", function (e) {
                    crossEl.style["visibility"] = "visible";
                    var ecks = (e.touches[0].pageX - 32 - 50);
                    var why = (e.touches[0].pageY - 32);
                    crossEl.style["left"] = ecks + "px";
                    crossEl.style["top"] = why + "px";
                    // fire a bullet, tell the server we are firing.
                    if (fireBullet) {
                        fireBullet(myId, myPos.x, myPos.y,
                            myPos.x + (ecks - 300),
                            myPos.y + (why - 250)
                            );
                    }
                    e.stopPropagation();
                });
                newb.addEventListener("touchend", function (e) {
                    crossEl.style["visibility"] = "hidden";
                    e.stopPropagation();
                });
            } else {
                // the player character
                setName();
                document.getElementById("mybomb").addEventListener("touchstart", function (e) {
                    e.stopPropagation();
                    putBomb(Math.floor(myPos.y / 50), Math.floor(myPos.x / 50));
                    havebomb = false;
                    document.getElementById("mybomb").style["visibility"] = "hidden";
                });
            }
            players.push({"id": id, "team": team, "el": newb});
            console.log(newb);
            document.getElementById("level").appendChild(newb);//, document.getElementById("levelc"));
            console.log("done addin playa");
        },
        killPlayer: function(id) {
            for (var i = 0; i < players.length; i++) {
                if (players[i]["id"] == id) {
                    var e = players[i]["el"];
                    e.style["visibility"] = "hidden";
                    break;
                }
            }
        },
        movePlayer: function(id, x0, y0, x1, y1) { //, duration) {
            // server already made this into a valid move, just draw things.
            for (var i = 0; i < players.length; i++) {
                if (players[i]["id"] == id) {
                    var e = players[i]["el"];
                    //e.style["-webkit-transition-duration"] = duration + "s";
                    e.style["left"] = (x1 - 16) + "px";
                    e.style["top"] = (y1 - 16) + "px";

                    var shine = false;
                    for (var j = 0; j < items.length; j++) {
                        if (items[j]["type"] != "lamp") continue;
                        var y = items[j]["row"] * 50;
                        var x = items[j]["col"] * 50;
                        if (Math.sqrt((x1-x)*(x1-x)+(y1-y)*(y1-y)) < 50) {
                            e.src = players[i]["team"] == "red" ?
                                    "//placehold.it/32/ff0000" :
                                    "//placehold.it/32/0000ff";
                            shine = true;
                            break;
                        }
                    }
                    if (!shine) {
                        e.src = "//placehold.it/32";
                    }

                    if (id == myId) {
                        myPos.x = x1;
                        myPos.y = y1;
                        //levelEl.style["-webkit-transition-duration"] = duration + "s";
                        levelEl.style["left"] = (250 - myPos.x) + "px";
                        levelEl.style["top"] = (250 - myPos.y) + "px";
                    }
                }
            }
        },
        placeBomb: function(r, c) {
            var bomEl = document.createElement("div");
            bomEl.className = "bomblit";
            bomEl.style["left"] = (c * 50 + 25 - 8) + "px";
            bomEl.style["top"] = (r * 50 + 25 - 12) + "px";
            levelEl.appendChild(bomEl);
            var blastEl = document.createElement("div");
            blastEl.className = "blast";
            blastEl.style["left"] = (c * 50 + 25 - 46) + "px";
            blastEl.style["top"] = (r * 50 + 25 - 46) + "px";
            var rye = r;
            var car = c;
            setTimeout(function(e) {
                levelEl.removeChild(bomEl);
                console.log("booming at " + (car * 50 + 25 - 46) + ", " + (rye * 50 + 25 - 46));
                levelEl.appendChild(blastEl);
                setTimeout(function (f) {
                    levelEl.removeChild(blastEl);
                }, 200);
                if (rye - 1 < 0 || rye + 1 > 39 || car - 1 < 0 || car + 1 > 39)
                  return;
                var c = document.getElementById("levelc").getContext("2d");
                c.fillStyle = "#333333";
                c.fillRect((car-1)*50, (rye-1)*50, 150, 150);
            }, 3000);
        },
        paintBullet: function(x0,y0,x1,y1,duration) {
            var bullEl = document.createElement("div");
            bullEl.className = "bullet";
            bullEl.style["left"] = x0 + "px";
            bullEl.style["top"] = y0 + "px";
            document.getElementById("level").appendChild(bullEl);
            console.log(duration);
            setTimeout(function() {
                bullEl.style["-webkit-transition-duration"] = duration+"s";
                bullEl.style["left"] = (x1 - 9) + "px";
                bullEl.style["top"] = (y1 - 9) + "px";
            }, 50);
            
            setTimeout(function(){
                document.getElementById("level").removeChild(bullEl);
            }, duration * 1000);
        },
        setPlayerPos: function(id, x, y) {
            // server knows all, no questions asked.
            if (id == myId) { // mypos is sent to server on tryMove
                myPos.x = x;
                myPos.y = y;
                levelEl.style["left"] = (250 - myPos.x) + "px";
                levelEl.style["top"] = (250 - myPos.y) + "px";
            }
            for (var i = 0; i < players.length; i++) {
                if (players[i]["id"] == id) {
                    var e = players[i]["el"];
                    e.style["left"] = (x - 16) + "px";
                    e.style["top"] = (y - 16) + "px";
                }
            }
            console.log("moved " + id + " to " + e.style["left"] + ", " + e.style["top"]);
        },
        removeBear: function(bid) {
            for (var i = 0; i < bears.length; i++) {
                if (bears[i]["id"] == bid) {
                    document.getElementById("bears").removeChild(bears[i]["el"]);
                    bears.splice(i,1);
                    break;
                }
            }
        },
        setBearPos: function(bid, destX, destY) {
            for (var i = 0; i < bears.length; i++) {
                if (bears[i]["id"] == bid) {
                    var e = bears[i]["el"];
                    if (parseInt(e.style["left"].substring(0,e.style["left"].length-2)) > destX) {
                        e.style["-webkit-transform"] = "rotateY(180deg)";
                    } else {
                        e.style["-webkit-transform"] = "rotateY(0deg)";
                    }
                    e.style["left"] = (destX-50) + "px";
                    e.style["top"] = (destY-64) + "px";
                }
            }
        },
        setItems: function(ary) {
            // deep copy? idk enough about how dnode works
            for (var i = 0; i < ary.length; i++) {
                var o = {
                    "type": ary[i]["type"],
                    "row": ary[i]["row"],
                    "col": ary[i]["col"]
                };
                var el = document.createElement("div");
                el.className = "lamp";
                el.style["top"] = (ary[i]["row"] * 50 + 25 - 70) + "px";
                el.style["left"] = (ary[i]["col"] * 50 + 25 - 60) + "px";
                levelEl.appendChild(el);
                items.push({
                    "type": ary[i]["type"], 
                    "el": el,
                    "row": ary[i]["row"],
                    "col": ary[i]["col"]
                });
                var b = document.createElement("div");
                b.className = "bomb";
                b.style["top"] = (ary[i]["row"] * 50 + 25 - 12) + "px";
                b.style["left"] = (ary[i]["col"] * 50 + 25 - 8) + "px";
                var bo = {
                    "type": "bomb",
                    "el": b,
                    "row": ary[i]["row"],
                    "col": ary[i]["col"]
                };
                bombs.push(bo);
                b.addEventListener("touchstart", function (e) {
                    if (havebomb) return;
                    setTimeout(function() {

                        for (var j = 0; j < bombs.length; j++) {
                            var bm = bombs[j];
                            if (bm["row"] == Math.floor(myPos.y / 50) &&
                                bm["col"] == Math.floor(myPos.x / 50)) {
                                //console.log("got bomb");
                                havebomb = true;
                                takeBomb(bm["row"], bm["col"]);
                                document.getElementById("mybomb").style["visibility"] = "visible";
                                break;
                            }
                        }

                    }, 1000);
                });
                levelEl.appendChild(b);
                //console.log(ary[i]);
            }
        },
        removeBomb: function(r, c) {
            for (var i = 0; i < bombs.length; i++) {
                var b = bombs[i];
                if (b["row"] == r && b["col"] == c) {
                    bombs.splice(i, 1);
                    levelEl.removeChild(b["el"]);
                    return;
                }
            }
        },
        setLevel: function(l) {
            var string = "";
            var c = document.getElementById("levelc").getContext("2d");
            c.fillStyle = "#000000";
            for (var i = 0; i < l.length; i++) {
                for (var j = 0; j < l[i].length; j++) {
                    string += l[i][j] == 1 ? "@" : " ";
                    if (l[i][j] == 1) {
                        c.fillStyle = "black";
                    } else {
                        c.fillStyle = "#333333";
                    }
                    c.fillRect(j * 50, i * 50, 50, 50);
                }
                string += "\n";
            }
            console.log(string);
        }
    });

    d.on('remote', function (remote) {
        console.log("ready for server");
        /*
        document.addEventListener('click', function (e) {
            remote.moveBear(myId, e.pageX, e.pageY);
        });*/
        document.getElementById("game").addEventListener("touchstart", function (e) {
            // -50 because touches don't have offsetX or offsetY,
            // so i have to subtract the dom element's left margin
            var dx = e.touches[0].pageX - 50 - 250;
            var dy = e.touches[0].pageY - 250;
            remote.tryMove(myId, myPos.x, myPos.y, myPos.x + dx, myPos.y + dy);
        });

        fireBullet = function(id, x0, y0, x1, y1) {
            remote.fireBullet(id, x0, y0, x1, y1);
        };

        takeBomb = function(r, c) {
            remote.takeBomb(r,c);
        };

        putBomb = function(r, c) {
            remote.putBomb(r,c);
        };

        sendChat = function() {
            remote.broadcastMsg(
                document.getElementById("myName").value,
                document.getElementById("myChat").value
            );
            document.getElementById("myChat").value = "";
        };

        setName = function() {
            remote.setName(myId, document.getElementById("myName").value);
        };

    	/*document.getElementById('go').addEventListener('click', function (e) {
    		var st = document.getElementById('inp').value;
    		if (st.length <= 256) {
    			remote.transform(st);
    		}
    	});*/
        console.log("finished ready for server");
    });

    d.on('end', function() {
    	document.body.appendChild(document.createTextNode("server died"));
    });

    d.pipe(stream).pipe(d);
});