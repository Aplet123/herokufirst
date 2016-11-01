var express = require('express');
var app = express();

// set the port of our application
// process.env.PORT lets the port be set by Heroku
var port = process.env.PORT || 8080;

// set the view engine to ejs
app.set('view engine', 'ejs');

// make express look in the public directory for assets (css/js/img)
app.use(express.static(__dirname + '/public'));

// set the home page route
app.get('/', function(req, res) {

	// ejs render automatically looks in the views folder
	res.render('index');
});

app.listen(port, function() {
	console.log('Our app is running on http://localhost:' + port);
});
"use strict";
//jshint esversion: 6
var Discord = require("discord.js");
var bot = new Discord.Client({ bot: true });
var fs = require("fs");
var http = require("http");
var server = http.createServer((req, res) => { res.end("lol nothing here what are you looking at"); });
server.listen(8080, function(){});
//process.chdir("./Documents/Bot Stuff/BattleBot");
var token = JSON.parse(fs.readFileSync("./Token/token.json", "utf8")).token;
var movedex = JSON.parse(fs.readFileSync("./info/movedex.json", "utf8"));
var playerdex = JSON.parse(fs.readFileSync("./info/playerdex.json", "utf8"));
var typedex = JSON.parse(fs.readFileSync("./info/typedex.json", "utf8"));
var critRatio = 1 / 16;
var temp = {};
var battles = [];
var typePending = {};
var abilityPending = {};
var registering = {};
class Player {
    constructor(ability, item, xp, level, moves, typing, stats, statPointsLeft, abilityPointsLeft) {
        this.ability = ability;
        this.item = item;
        this.xp = xp;
        this.level = level;
        this.moves = moves;
        this.typing = typing;
        this.stats = stats;
        this.statPointsLeft = statPointsLeft;
        this.abilityPointsLeft = abilityPointsLeft;
    }
    get export() {
            var code = `${this.item}
${this.ability}
${this.xp}
${this.level}
${this.moves.join`/`}
${this.typing.join`/`}
${this.stats.join`/`}
${this.statPointsLeft}
${this.abilityPointsLeft}`;
		return code;
    }
    get info() {
    	var code = `Item: ${this.item}
Ability: ${this.ability}
XP: ${this.xp}
Level: ${this.level}
Moves:
${this.moves.join`\n`}
Typing: ${this.typing.join`/`}
Stat Point Spread: ${this.stats.join`/`}
Stat Points Left: ${this.statPointsLeft}
Ability Points Left: ${this.abilityPointsLeft}`;
		return code;
    }
    static import(code) {
    	var arr = code.split`\n`;
    	var imported = new this(arr[1], arr[0], Number(arr[2]), Number(arr[3]), arr[4].split`/`, arr[5].split`/`, arr[6].split`/`, arr[7], arr[8], Boolean(arr[9]));
    	return imported;
    }
    get xpToLevelUp() {
    	return Math.pow(3, this.level);
    }
    levelUp() {
    	while(this.xp > this.xpToLevelUp && this.level < 10) {
    		this.xp -= this.xpToLevelUp;
    		this.level += 1;
    	}
    }
}
class BattlePlayer extends Player {
	constructor(ability, item, xp, level, moves, typing, stats, player) {
		super(ability, item, xp, level, moves, typing, stats);
        this.player = player;
        this.stats = this.stats.map(v=>5 * this.level + 50 + 4 * v);
        this.hp = this.stats[0];
        this.typing = this.typing.map(v => new Type(typedex[v]));
    }
}
class Battle {
	constructor(channel, user1id, user2id, player1, player2) {
		this.channel = channel;
		this.user1id = user1id;
		this.user2id = user2id;
		this.player1 = player1;
		this.player2 = player2;
	}
	check(id1, id2) {
		if(this.user1id == id1 && this.user2id == id2) {
			return true;
		} else if(this.user1id == id2 && this.user2id == id1) {
			return true;
		} else {
			return false;
		}
	}
	static checkFighting(id) {
		return battles.some(v => id === v.user1id || id === v.user2id);
	}
}
class Type {
	constructor(obj) {
		this.superEffective = obj.superEffective;
		this.notVeryEffective = obj.notVeryEffective;
		this.immune = obj.immune;
	}
	damage(type) {
		if(this.superEffective.some(v => type === v)) {
			return 2;
		} else if (this.notVeryEffective.some(v => type === v)) {
			return 0.5;
		} else if (this.immune.some(v => type === v)) {
			return 0;
		} else {
			return 1;
		}
	}
}
class Move {
	constructor(obj) {
		this.name = obj.name;
		this.basePower = obj.basePower;
		this.priority = obj.priority;
		this.type = obj.type;
		this.move = obj.move;
		this.pp = obj.pp;
		this.accuracy = obj.accuracy;
		this.levelLearned = obj.levelLearned;
	}
}
bot.on("debug", console.log);
bot.on("warn", console.log);
bot.on("ready", function() {
    bot.user.setGame("battles for y'all");
});
bot.on("message", function(message) {
	var input = message.content;
	if(/^%alive$/i.test(message.content)) {
		if(message.author.id == "180813971853410305" || message.author.id == "201765854990434304") {
			message.channel.sendMessage("I am alive! Woo!");
			console.log("hello");
		} else {
			message.channel.sendMessage("boi");
			console.log(message.author.id);
		}
	} else if (/^%register$/i.test(message.content)) {
		if (message.author.id in playerdex) {
			message.reply("You are already registered!");
		} else if (message.author.id in registering) {
			message.reply("You have already started registration!");
		} else {
			message.reply("You have now started registration! Use `%setability` to set your ability! You can use `%abilities` to see a list of all abilities!");
			registering[message.author.id] = {
				ability: undefined
			};
		}
	} else if(/^%eval\s.+$/i.test(message.content)) {
		if(message.author.id == "180813971853410305" || message.author.id == "201765854990434304") {
			try {
				var res = eval(message.content.match(/%eval\s(.+)/)[1]);
				message.channel.sendMessage(res);
			} catch (err) {
				message.channel.sendMessage("Error: " + err);
			}
		} else {
			message.channel.sendMessage("boi");
			console.log(message.author.id);
		}
	} else if (/^%info$/i.test(message.content)) {
		if (message.author.id in playerdex) {
			message.reply("\n```\n" + Player.import(playerdex[message.author.id]).info + "\n```");
		} else {
			message.reply("You are not registered! Use `%register` to register!");
		}
	} else if (/^%info\s(?:(?:\d+)|(?:<@!?\d+>))$/i.test(message.content)) {
		var id = (message.content.match(/^%info\s((?:\d+)|(?:<@!?\d+>))$/i)[1]).match(/\d+/)[0];
		if (id in playerdex) {
			message.reply("\n```\n" + Player.import(playerdex[id]).info + "\n```");
		} else {
			message.reply("The user ID is not registered!");
		}
	} else if(/^%setability\s.+$/i.test(message.content)) {
		var ability = message.content.match(/^%setability\s(.+)$/i)[1];
		//if(abilitydex.some(v => v.name === ability)) {
			if(message.author.id in playerdex) {
				//if(abilitydex.filter(v => v.name === ability)[0].levelLearned <= Player.import(playerdex[message.author.id]).level) {
					var p = Player.import(playerdex[message.author.id]);
					p.ability = ability;
					playerdex[message.author.id] = p.export;
					fs.writeFileSync("./info/playerdex.json", JSON.stringify(playerdex));
					message.reply("Ability changed!");
				//} else {
					//message.reply("Level insufficient! Please level up!");
				//}
			} else if (message.author.id in registering) {
				registering[message.author.id].ability = ability;
				message.reply("Almost done registering! Now use `%settype [primary type] [optional secondary type]` to set types!");
			} else {
				message.reply("You are not registered! Use `%register` to register!");
			}
		//} else {
			//message.reply("Invalid move.");
		//}
	} else if (/^%changetype$/i.test(message.content)) {
		if(message.author.id in typePending) {
			registering[message.author.id].typing = typePending[message.author.id];
			playerdex[message.author.id] = new Player(registering[message.author.id].ability, "Nothing", 0, 0, ["Tackle"], registering[message.author.id].typing, [0, 0, 0, 0, 0, 0], 0, 1).export;
			delete registering[message.author.id];
			message.reply("You are now done registering! Have fun battling!");
		} else {
			message.reply("You are not pending type change!");
		}
	} else if(/^%settype\s.+?\s.+$/i.test(message.content)) {
		var type1 = message.content.match(/^%settype\s(.+?)\s.+$/i)[1];
		var type2 = message.content.match(/^%settype\s.+?\s(.+)$/i)[1];
		if(type1 in typedex && type2 in typedex) {
			if(message.author.id in registering) {
				if(registering[message.author.id].ability !== undefined) {
					if(type1 !== type2) {
						typePending[message.author.id] = [type1, type2];
						message.reply("Are you sure? You can only change types once! Use `%changetype` to confirm changes and `%settype` again to switch types!");
					} else {
						message.reply("Secondary type is the same as the primary type!");
					}
				} else {
					message.reply("You have not set your ability yet! Use `%setability` to set it!");
				}
			} else {
				message.reply("You have not started registration! Use `%register` to start!");
			}
		} else {
			message.reply("Invalid type!");
		}
	} else if(/^%settype\s.+$/i.test(message.content)) {
		var type = message.content.match(/^%settype\s(.+)$/i)[1];
		if(type in typedex) {
			if(message.author.id in registering) {
				if(registering[message.author.id].ability !== undefined) {
					typePending[message.author.id] = [type];
					message.reply("Are you sure? You can only change types once! Use `%changetype` to confirm changes and `%settype` again to switch types!");
				} else {
					message.reply("You have not set your ability yet! Use `%setability` to set it!");
				}
			} else {
				message.reply("You have not started registration! Use `%register` to start!");
			}
		} else {
			message.reply("Invalid type!");
		}
	} else if(/^%setmove1\s.+$/i.test(message.content)) {
		var move = message.content.match(/^%setmove1\s(.+)$/i)[1];
		if(movedex.some(v => v.name === move)) {
			if(message.author.id in playerdex) {
				if(movedex.filter(v => v.name === move)[0].levelLearned <= Player.import(playerdex[message.author.id]).level) {
					var p = Player.import(playerdex[message.author.id]);
					p.moves[0] = move;
					playerdex[message.author.id] = p.export;
					fs.writeFileSync("./info/playerdex.json", JSON.stringify(playerdex));
					message.reply("First move changed!");
				} else {
					message.reply("Level insufficient! Please level up!");
				}
			} else {
				message.reply("You are not registered! Use `%register` to register!");
			}
		} else {
			message.reply("Invalid move.");
		}
	}  else if(/^%setmove2\s.+$/i.test(message.content)) {
		var move = message.content.match(/^%setmove2\s(.+)$/i)[1];
		if(movedex.some(v => v.name === move)) {
			if(message.author.id in playerdex) {
				if(movedex.filter(v => v.name === move)[0].levelLearned <= Player.import(playerdex[message.author.id]).level) {
					var p = Player.import(playerdex[message.author.id]);
					p.moves[1] = move;
					playerdex[message.author.id] = p.export;
					fs.writeFileSync("./info/playerdex.json", JSON.stringify(playerdex));
					message.reply("Second move changed!");
				} else {
					message.reply("Level insufficient! Please level up!");
				}
			} else {
				message.reply("You are not registered! Use `%register` to register!");
			}
		} else {
			message.reply("Invalid move.");
		}
	} else if(/^%setmove3\s.+$/i.test(message.content)) {
		var move = message.content.match(/^%setmove3\s(.+)$/i)[1];
		if(movedex.some(v => v.name === move)) {
			if(message.author.id in playerdex) {
				if(movedex.filter(v => v.name === move)[0].levelLearned <= Player.import(playerdex[message.author.id]).level) {
					var p = Player.import(playerdex[message.author.id]);
					p.moves[2] = move;
					playerdex[message.author.id] = p.export;
					fs.writeFileSync("./info/playerdex.json", JSON.stringify(playerdex));
					message.reply("Third move changed!");
				} else {
					message.reply("Level insufficient! Please level up!");
				}
			} else {
				message.reply("You are not registered! Use `%register` to register!");
			}
		} else {
			message.reply("Invalid move.");
		}
	} else if(/^%setmove4\s.+$/i.test(message.content)) {
		var move = message.content.match(/^%setmove4\s(.+)$/i)[1];
		if(movedex.some(v => v.name === move)) {
			if(message.author.id in playerdex) {
				if(movedex.filter(v => v.name === move)[0].levelLearned <= Player.import(playerdex[message.author.id]).level) {
					var p = Player.import(playerdex[message.author.id]);
					p.moves[0] = move;
					playerdex[message.author.id] = p.export;
					fs.writeFileSync("./info/playerdex.json", JSON.stringify(playerdex));
					message.reply("Fourth move changed!");
				} else {
					message.reply("Level insufficient! Please level up!");
				}
			} else {
				message.reply("You are not registered! Use `%register` to register!");
			}
		} else {
			message.reply("Invalid move.");
		}
	} else if(/^%manage\s.+?\s(?:(?:\d+)|(?:<@!?\d+>))\s.+$/i.test(message.content)) {
		if(message.author.id == "180813971853410305" || message.author.id == "201765854990434304") {
			var command = message.content.match(/^%manage\s(.+)?\s(?:(?:\d+)|(?:<@!?\d+>))\s.+$/i)[1];
			var id = (message.content.match(/^%manage\s.+?\s((?:\d+)|(?:<@!?\d+>))\s.+$/i)[1]).match(/\d+/)[0];
			var param = message.content.match(/^%manage\s.+?\s(?:(?:\d+)|(?:<@!?\d+>))\s(.+)$/i)[1];
			if(/^setlevel$/i.test(command)) {
				if(0 <= Number(param) && Number(param) <= 10) {
					if(id in playerdex) {
						var p = Player.import(playerdex[id]);
						p.level = Number(param);
						p.xp = 0;
						playerdex[id] = p.export;
						fs.writeFileSync("./info/playerdex.json", JSON.stringify(playerdex));
						message.reply("Level set.");
					} else {
						message.reply("User ID not registered in playerdex.")
					}
				} else {
					message.reply("Invalid number.");
				}
			} else if(/^addxp$/i.test(command)) {
				if(!isNaN(Number(param))) {
					if(id in playerdex) {
						var p = Player.import(playerdex[id]);
						p.xp += Number(param);
						playerdex[id] = p.export;
						fs.writeFileSync("./info/playerdex.json", JSON.stringify(playerdex));
						message.reply("XP added.");
					} else {
						message.reply("User ID not registered in playerdex.")
					}
				} else {
					message.reply("Invalid number.");
				}
			} else if (/^register$/i.test(command)) {
				if(Number(param) === 1) {
					if (id in playerdex) {
						message.reply("The user is already registered.");
					} else {
						message.reply("The user is now registered.");
						playerdex[id] = new Player("Sturdy", "Nothing", 0, 0, ["Tackle"], ["Normal"], [0, 0, 0, 0, 0, 0], 0, 1).export;
						fs.writeFileSync("./info/playerdex.json", JSON.stringify(playerdex));
					}
				} else if(Number(param) === 0) {
					if (id in playerdex) {
						message.reply("The user is no longer registered.");
						delete playerdex[id];
						fs.writeFileSync("./info/playerdex.json", JSON.stringify(playerdex));
					} else {
						message.reply("The user is not registered in the first place.");
					}
				} else {
					message.reply("Invalid number.");
				}
		} else if(/^settype1$/i.test(command)) {
				if(param in typedex) {
					if(id in playerdex) {
						if(Player.import(playerdex[id]).typing[1] !== param) {
							var p = Player.import(playerdex[id]);
							p.typing[0] = param;
							playerdex[id] = p.export;
							fs.writeFileSync("./info/playerdex.json", JSON.stringify(playerdex));
							message.reply("Primary type changed.");
						} else {
							message.reply("Secondary type is the same.");
						}
					} else {
						message.reply("User ID not registered in playerdex.");
					}
				} else {
					message.reply("Invalid type.");
				}
			} else if(/^settype2$/i.test(command)) {
				if(param in typedex) {
					if(id in playerdex) {
						if(Player.import(playerdex[id]).typing[0] !== param) {
							var p = Player.import(playerdex[id]);
							p.typing[1] = param;
							playerdex[id] = p.export;
							fs.writeFileSync("./info/playerdex.json", JSON.stringify(playerdex));
							message.reply("Secondary type changed.");
						} else {
							message.reply("Primary type is the same.");
						}
					} else {
						message.reply("User ID not registered in playerdex.");
					}
				} else {
					message.reply("Invalid type.");
				}
			} else if(/^removetype2$/i.test(command)) {
					if(id in playerdex) {
						if(Number(param) === 1) {
							var p = Player.import(playerdex[id]);
							p.typing.splice(1, 1);
							playerdex[id] = p.export;
							fs.writeFileSync("./info/playerdex.json", JSON.stringify(playerdex));
							message.reply("Secondary type removed.");
						} else {
							message.reply("Invalid parameter.");
						}
					} else {
						message.reply("User ID not registered in playerdex.");
					}
			} else if(/^setmove1$/i.test(command)) {
				if(movedex.some(v => v.name === param)) {
					if(id in playerdex) {
							var p = Player.import(playerdex[id]);
							p.moves[0] = param;
							playerdex[id] = p.export;
							fs.writeFileSync("./info/playerdex.json", JSON.stringify(playerdex));
							message.reply("First move changed.");
					} else {
						message.reply("User ID not registered in playerdex.");
					}
				} else {
					message.reply("Invalid move.");
				}
			} else if(/^setmove2$/i.test(command)) {
				if(movedex.some(v => v.name === param)) {
					if(id in playerdex) {
							var p = Player.import(playerdex[id]);
							p.moves[1] = param;
							playerdex[id] = p.export;
							fs.writeFileSync("./info/playerdex.json", JSON.stringify(playerdex));
							message.reply("Second move changed.");
					} else {
						message.reply("User ID not registered in playerdex.");
					}
				} else {
					message.reply("Invalid move.");
				}
			} else if(/^setmove3$/i.test(command)) {
				if(movedex.some(v => v.name === param)) {
					if(id in playerdex) {
							var p = Player.import(playerdex[id]);
							p.moves[2] = param;
							playerdex[id] = p.export;
							fs.writeFileSync("./info/playerdex.json", JSON.stringify(playerdex));
							message.reply("Third move changed.");
					} else {
						message.reply("User ID not registered in playerdex.");
					}
				} else {
					message.reply("Invalid move.");
				}
			} else if(/^setmove4$/i.test(command)) {
				if(movedex.some(v => v.name === param)) {
					if(id in playerdex) {
							var p = Player.import(playerdex[id]);
							p.moves[3] = param;
							playerdex[id] = p.export;
							fs.writeFileSync("./info/playerdex.json", JSON.stringify(playerdex));
							message.reply("Fourth move changed.");
					} else {
						message.reply("User ID not registered in playerdex.");
					}
				} else {
					message.reply("Invalid move.");
				}
			} else {
				message.reply("Invalid command.");
			}
		} else {
			message.channel.sendMessage("boi");
			console.log(message.author.id);
		}
	}
});

bot.login(token);
