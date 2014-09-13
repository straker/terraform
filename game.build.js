(function(window, document){
//------------------------------------------------------------
// Game
//------------------------------------------------------------

/**
 * Tips for minification
 * http://alistapart.com/article/Javascript-minification-part-II
 * https://github.com/johngirvin/featherweight/blob/master/featherweight.src.js
 * 1. If a global variable/function is used twice, save it to a local variable
 * 2. Wrap in an IIFE with window and document, will minify them as well as global variables at top
 * 3. All browsers automatically add ID'd elements as JS variables (like canvas)
 * 4. Use ternaries instead of if/else
 * 5. If different objects all have same property, don't save property name as variable and access by array notation, it actually doesn't compress well
 * 6. Use just requestAnimationFrame (no need to shim)
 */
// animation variables
var gamePaused = false;
var last = 0;
var accumulator = 0;
var delta = 1E3/60;
var now;
var dt;
var rAF;

// save Math functions
var math = Math;
var PI = math.PI;
var sin = math.sin;
var cos = math.cos;
var round = math.round;
var random = math.random;
var abs = math.abs;
var e = math.E;
var phi = (1 + math.sqrt(5)) / 2;

var toRad = PI/180;
var circle = 360;

// globals
var NUM_TILES = 14;
var NUM_RINGS = 3;

var theta = circle / NUM_TILES;
var radTheta = degToRad(theta);

var canvasWidth = canvas.width;
var canvasHeight = canvas.height;

// planet variables
var planetX = canvasWidth / 2 | 0;
var planetY = canvasHeight / 2 | 0;
var planetRadius = 150;

var TILE_HEIGHT = planetRadius / NUM_RINGS | 0;

// arrays
var KEYS = [];
var tiles = [];
var levels = [];
var texts = [];

// element variables
var elements = [];
var elementTypes = ['water', 'earth', 'air', 'fire'];
var elementColors = {
  water: '#1879BD',
  earth: '#093905',
  air: '#B5630F',
  fire: '#A80000',
  planet: '#19100B'
};
var elementTextColors = {
  water: elementColors.water,
  earth: '#3C6C38',
  air: elementColors.air,
  fire: elementColors.fire
}

// water = 45%
// earth = 26%
// air = 16%
// fire = 13%
var elementOdds = [.45, .71, .87, 1];

var reactions = {
  water: {
    water: 'push',
    earth: 'enhance',
    air: '',
    fire: 'destroy'
  },
  earth: {
    water: '',
    earth: 'push',
    air: 'destroy',
    fire: 'enhance'
  },
  air: {
    water: 'destroy',
    earth: '',
    air: 'push',
    fire: 'enhance'
  },
  fire: {
    water: '',
    earth: 'destroy',
    air: '',
    fire: 'push'
  }
}

var tileCount = {
  'water': 0,
  'earth': 0,
  'air': 0,
  'fire': 0
}

// score
var habitability;
var compositions = {
  water: 21,
  earth: 13,
  air: 8,
  fire: 0
}
var modifiers = {
  water: 3,
  earth: 2,
  air: 1,
  fire: -2
}
var compositionTotal = compositions.water * modifiers.water + compositions.earth * modifiers.earth + compositions.air * modifiers.air + compositions.fire * modifiers.fire;

// game state
var gameLoading = true;
var gameStarted = false;
var gameEnded = false;
var gameTime = 0;
var difficulty;
var progress;
var instruct;
var scorePlayer;
var timeBonus;
var difficultyBonus;
var scoreFinal;
var finalScore;

var showTime;
var showTimeBonus;
var showHabitBonus;
var showDifficulty;
var showDifficultyBonus;
var counter;

// audio variables
var beatStrength = 0;
var backgroundAudio = null;
var songLoaded = false;
var newBeat = true;
var time = 0;
var timeSinceLastBeat = 0;
var beatThreshold = 1;  // reduce this for harder difficulty
var songEnded = false;
var song;

// on screen canvases
var spaceCtx = space.getContext('2d');
var atmoCtx = atmo.getContext('2d');
var planetCtx = planetBg.getContext('2d');
var ctx = canvas.getContext('2d');
var gradCtx = gradient.getContext('2d');
var effectsCtx = effects.getContext('2d');
var scoreCtx = score.getContext('2d');

// off screen canvases
var osCanvas = document.createElement('canvas');
var osCtx = osCanvas.getContext('2d');
osCanvas.width = canvasWidth;
osCanvas.height = canvasHeight;

// tile grid
var gridCanvas = document.createElement('canvas');
var gridCtx = gridCanvas.getContext('2d');
gridCanvas.width = canvasWidth;
gridCanvas.height = canvasHeight;

// tile color
var tileCanvas = document.createElement('canvas');
var tileCtx = tileCanvas.getContext('2d');
tileCanvas.width = canvasWidth;
tileCanvas.height = canvasHeight;

// tile texture
var textureCanvas = document.createElement('canvas');
var textureCtx = textureCanvas.getContext('2d');
textureCanvas.width = canvasWidth;
textureCanvas.height = canvasHeight;

// fill effects canvas for progress bar
effectsCtx.fillRect(0,0,600,600);

var game = {};

/**
 * Show the difficulty screen
 */
game.audioLoaded = function() {
  clearInterval(progress);
  hide(loadingText);
  show(menu);

  sonantx = null; // garbage collect when done since it's no longer needed
  gameLoading = false;

  effectsCtx.clearRect(0,0,600,600);
};

/**
 * Set the difficulty and start the game
 */
game.setDifficulty = function(diff) {
  hide(title);
  hide(menu);
  hide(by);
  hide(overlay);
  show(intro);
  show(restart);

  ctx.clearRect(0,0,600,600);
  spaceCtx.clearRect(0,0,600,600);
  gradCtx.clearRect(0,0,600,600);

  difficulty = diff;
  beatThreshold = (diff === 'easy' ? 2 : (diff === 'medium' ? 1 : 0.5));

  bg.draw();
  planet.draw(true);

  rAF = requestAnimationFrame(animate);

  // draw the tile types
  ctx.font = '20px Arial Black';
  effectsCtx.fillStyle = '#FFF';
  ctx.save();

  var y = 20;
  for (var i = 0, len = elementTypes.length; i < len; i++) {
    var type = elementTypes[i];
    var color = elementTextColors[type];

    ctx.fillStyle = color;
    ctx.fillText(capitaliseFirstLetter(type)+': ', 10, y);

    y+=20;
  }

  ctx.restore();

  drawHUD();

  habitability = 0

  // give player a change to see UI
  intro.style.opacity = 1;
  var t = 0;
  var ready = false;
  var set = false;
  instruct = setInterval(function() {
    t += delta;

    // give the player 8 seconds to view the instructions
    if (t >= 8E3) {
      hide(intro);
      gameStarted = true;
      clearInterval(instruct);

      planet.draw(true);

      if (!gamePaused) {
        // to keep things unique between play throughs we'll start the music off somewhere different each time
        backgroundAudio.currentTime = (random() * backgroundAudio.duration) || 0;
        backgroundAudio.play();
        texts.push(new Text('Go!', planetX-78, planetY+30, 0, 0, '#FFF', 80));
      }
    }
    // countdown
    else if (t >= 7E3 && !set) {
      texts.push(new Text('Set', planetX-78, planetY+30, 0, 0, '#FFF', 80));
      set = true;
    }
    else if (t >= 6E3) {
      intro.style.opacity -= .008;

      if (!ready) {
        texts.push(new Text('Ready', planetX-135, planetY+30, 0, 0, '#FFF', 80));
        ready = true;
      }
    }
  }, delta);
};

/**
 * End the game when the planet is fully terraformed
 */
game.end = function() {
  gameEnded = true;
  cancelAnimationFrame(rAF);
  backgroundAudio.pause();

  show(overlay);
  show(score);

  showTime = false;
  showTimeBonus = false;
  showHabitBonus = false;
  showDifficulty = false;
  showDifficultyBonus = false;
  counter = 0;
  finalScore = 0

  scoreCtx.clearRect(0,0,canvasWidth,canvasHeight);

  // player scores an extra 1000 points for every minute below 5
  timeBonus = (5 - msToMinutes(gameTime)) * 1E3;
  timeBonus = (timeBonus > 0 ? timeBonus : 0);

  // player scores 2500 for each difficulty above easy
  difficultyBonus = (difficulty === 'medium' ? 2500 : (difficulty === 'hard' ? 5E3 : 0));

  scoreFinal = (timeBonus + difficultyBonus) * habitability/100;

  // draw the score screen
  scoreCtx.font = '2.5em Arial Black';
  scoreCtx.fillStyle = '#FFF';

  scoreCtx.fillText('Planet Fully Terraformed!', 40, 50);

  scoreCtx.font = '20px Arial Black';

  scoreCtx.fillText('Time: ', 100, 150);
  scoreCtx.fillText('Habitability: ', 100, 200);
  scoreCtx.fillText('Difficulty: ', 100, 250);
  scoreCtx.fillText('Final Score: ', 100, 300);

  scoreCtx.fillRect(450,270,75,2);

  t = 0;
  // animate score screen every second
  scorePlayer = setInterval(function() {
    t += delta;

    if (t >= 1E3 && !showTime) {
      showTime = true;
      scoreCtx.fillText(msToTime(gameTime), 300, 150);
    }
    else if (t >= 2E3 && !showTimeBonus) {
      showTimeBonus = true;
      scoreCtx.fillText(timeBonus, 450, 150);
    }
    else if (t >= 3E3 && !showHabitBonus) {
      showHabitBonus = true;
      scoreCtx.fillText('x'+habitability/100, 450, 200);
    }
    else if (t >= 4E3 && !showDifficulty) {
      showDifficulty = true;
      scoreCtx.fillText(capitaliseFirstLetter(difficulty), 300, 250);
    }
    else if (t >= 5E3 && !showDifficultyBonus) {
      showDifficultyBonus = true;
      scoreCtx.fillText(difficultyBonus, 450, 250);
    }
    else if (t >= 6E3) {
      scoreCtx.clearRect(410,280,200,100);
      if (counter < 50) {
        finalScore = easeOutExpo(counter++, 0, scoreFinal, 50) | 0;
        scoreCtx.fillText(finalScore, 450, 300);
      }
      else {
        scoreCtx.fillText(scoreFinal, 450, 300);
        clearInterval(scorePlayer);
      }
    }
  }, delta);
}

/**
 * Restart the game and let the player re-pick difficulty
 */
game.restart = function() {
  cancelAnimationFrame(rAF);
  clearInterval(instruct);
  clearInterval(scorePlayer);

  backgroundAudio.pause();
  timeSinceLastBeat = 0;
  newBeat = true;

  makePlanetType('planet');

  show(overlay);
  hide(intro);
  hide(score);

  elements.length = 0;
  texts.length = 0;

  game.audioLoaded();
}


/**
 * Make the planet all of 1 element type
 */
function makePlanetType(type) {
  for (var i = 0, j = 0, k = 0; i < NUM_TILES*NUM_RINGS; i++) {
    tiles[j][theta*k++].changeType(type, true, true);

    if ((i+1) % NUM_TILES === 0) {
      j++;
      k = 0;
    }
  }

  planet.drawTextures();
  planet.draw(true);

  updateHabitability();
  drawHUD();
}





//------------------------------------------------------------
// Levels
//------------------------------------------------------------
for (var i = 0; i < NUM_RINGS; i++) {
  var prev = levels[i-1];
  var r = (prev ? prev.rBottom : planetRadius);
  var p1 = getPointAlongCircle(planetX, planetY, planetRadius, 0);
  var p2 = getPointAlongCircle(planetX, planetY, planetRadius, theta);

  levels[i] = {
    rTop: r,
    rBottom: r - TILE_HEIGHT,
    width: calcDist(p2.x - p1.x, p2.y - p1.y)
  };
}







//------------------------------------------------------------
// Input events
//------------------------------------------------------------
var keys = {};
var KEY_CODES = {
  37: 'left',
  39: 'right'
}

document.onkeydown = function(e) {
  var keyCode = (e.keyCode) ? e.keyCode : e.charCode;
  keys[ KEY_CODES[keyCode] ] = true;
};
document.onkeyup = function(e) {
  var keyCode = (e.keyCode) ? e.keyCode : e.charCode;
  keys[ KEY_CODES[keyCode] ] = false;
};






/**
 * Update the habitability score.
 */
function updateHabitability() {
  var score = 0;
  for (var i = 0, len = elementTypes.length; i < len; i++) {
    var type = elementTypes[i];
    var count = tileCount[type];
    var maxCount = compositions[type];
    var modifier = modifiers[type];
    var remainder = count - maxCount;

    // score full points for tile count up to the composition amount
    var points = math.min(count, maxCount) * modifier;

    // only score 1/3 points for every tile above the composition amount
    points += (remainder > 0 ? remainder : 0) * modifier * .3;

    score += points;
    // score += count * (count <= maxCount ? modifier : modifier * .60);
  }

  var habitable = score / compositionTotal * 100 | 0;

  // keep % above 0
  habitability = (habitable > 0 ? habitable : 0);
  texts.push(new Text('', planetX, planetY));
}

/**
 * Test function: Make the planet 100% habitable
 */
function makePlanetHabitable() {
  var counts = {water: 0, earth: 0, air: 0};
  for (var i = 0, j = 0, k = 0; i < NUM_TILES*NUM_RINGS; i++) {
    do {
      var type = elementTypes[randomIntFromInterval(0,2)];
      var count = counts[type];
    } while (count >= compositions[type])

    tiles[j][theta*k++].changeType(type);

    counts[type]++;

    if ((i+1) % NUM_TILES === 0) {
      j++;
      k = 0;
    }
  }
}

window.game = game;





//------------------------------------------------------------
// Utilities
//------------------------------------------------------------

/**
 * Get the current time.
 */
function timestamp() {
  return window.performance && window.performance.now ? window.performance.now() : new Date().getTime();
}

/**
 * convert degrees to radians
 */
function degToRad(deg) {
  return deg * toRad;
}

/**
 * Get the x,y coordinate of a point along a circle
 */
function getPointAlongCircle(x, y, r, angle) {
  var rad = degToRad(angle);
  return {
    x: x + r * cos(rad),
    y: y + r * sin(rad)
  }
}

/**
 * Easing equations from http://gizma.com/easing/
 */
function easeInOutQuad(t, b, c, d) {
  t /= d/2;
  if (t < 1) return c/2*t*t + b;
  t--;
  return -c/2 * (t*(t-2) - 1) + b;
}

function easeOutQuad(t, b, c, d) {
  t /= d;
  return -c * t*(t-2) + b;
}


function easeOutExpo(t, b, c, d) {
  return c * ( -Math.pow( 2, -10 * t/d ) + 1 ) + b;
};

/**
 * Normalize an angle between 0 and 359
 */
function normalizeAngle(angle) {
  var newAngle = angle;
  while (newAngle <= 0) newAngle += circle;
  while (newAngle > circle) newAngle -= circle;
  return newAngle % circle;
}

/**
 * Get a random decimal between two values.
 */
function rand(min, max) {
  return random() * (max - min) + min;
}

/**
 * Get which level a radius belongs to.
 */
function getLevel(radius) {
  var level;
  for (var i = 0; i < NUM_RINGS; i++) {
    level = levels[i]
    if (radius <= level.rTop && radius > level.rBottom) {
      return i;
    }
  }
}

/**
 * Get a random integer between two values.
 */
function randomIntFromInterval(min,max) {
  return Math.floor(random()*(max-min+1)+min);
}

/**
 * Calculate the distance between two points.
 */
function calcDist(x, y) {
  return Math.sqrt(x * x + y * y);
}

/**
 * Get a random value from nD6 dice roll.
 */
function dSix(num) {
  var value = 0;
  while (num--) {
    value += randomIntFromInterval(1, 6);
  }

  return value;
}

/**
 * Remove an item from an array without using splice as to not cause a garbage collection.
 */
function removeFromArray(array, index) {
  var i, len;
  for (i = index, len = array.length-1; i < len; i++) {
    array[i] = array[i+1];
  }

  array.length = len;
}

/**
 * Capitalize the first letter of a string.
 */
function capitaliseFirstLetter(string) {
  return string.charAt(0).toUpperCase() + string.slice(1);
}

/**
 * Hide a dom element.
 */
function hide(dom) {
  dom.style.display = 'none';
}

/**
 * Show a dom element.
 */
function show(dom) {
  dom.style.display = 'block';
}

/**
 * Convert milliseconds to minutes
 */
function msToMinutes(duration) {
  return parseInt((duration/(1E3*60))%60);
}

/**
 * Convert milliseconds to mm:ss format.
 */
function msToTime(duration) {
  var seconds = parseInt((duration/1E3)%60);
  var minutes = msToMinutes(duration);

  minutes = (minutes < 10) ? '0' + minutes : minutes;
  seconds = (seconds < 10) ? '0' + seconds : seconds;

  return minutes + ':' + seconds;
}





//------------------------------------------------------------
// Tiles
//------------------------------------------------------------
function Tile(x, y, angle, level) {
  var tile = this;

  tile.animations = [];

  // top left corner of tile
  tile.x = x;
  tile.y = y;
  tile.angle = angle;
  tile.level = level;
  tile.type = 'planet';

  tile.particles = [];
  tile.textures = [];

  /**
   * Draw the tile outline to a canvas.
   */
  tile.outline = function(ctx) {
    ctx.translate(planetX, planetY);
    ctx.rotate(tile.angle*toRad);
    ctx.translate(-planetX, -planetY);

    ctx.beginPath();
    ctx.moveTo(tile.x, tile.y);
    ctx.lineTo(tile.x - tile.points[tile.level][0].x, tile.y - tile.points[tile.level][0].y);
    ctx.arc(planetX, planetY, levels[tile.level].rBottom, 0, radTheta);
    ctx.moveTo(tile.x - tile.points[tile.level][1].x, tile.y - tile.points[tile.level][1].y);
    ctx.lineTo(tile.x - tile.points[tile.level][2].x, tile.y - tile.points[tile.level][2].y);
    ctx.arc(planetX, planetY, levels[tile.level].rTop, radTheta, 0, true);
    ctx.moveTo(tile.x, tile.y);
    ctx.closePath();
  }

  /**
   * Draw the tile outline to the planet canvas.
   */
  tile.drawOffscreen = function(alpha) {
    gridCtx.save();
    tile.outline(gridCtx);
    gridCtx.stroke();

    gridCtx.restore();
  };

  /**
   * Draw just the tiles color and textures to the tile canvas.
   */
  tile.draw = function() {
    if (tile.color) {
      tileCtx.save();
      tile.outline(tileCtx);

      tileCtx.fillStyle = tile.color;
      tileCtx.fill();

      tileCtx.restore();
    }
  };

  /**
   * Draw just the tiles textures to the texture canvas.
   */
  tile.drawTextures = function() {
    for (var i = 0, len = tile.textures.length; i < len; i++) {
      tile.textures[i].draw();
    }
  }

  /**
   * Change the tile's element type.
   */
  tile.changeType = function(type, noText, noTexture) {
    // tile.particles.length = 0;
    tile.animations.length = 0;

    var lightColor, darkColor;
    switch (type) {
      case 'water':
        lightColor = '#43A4BD';
        darkColor = '#084D79';
        break;
      case 'earth':
        lightColor = '#88A964';
        darkColor = '#678834';
        break;
      case 'air':
        lightColor = '#EEA22A';
        darkColor = '#9B4600';
        break;
      case 'fire':
        lightColor = '#FCFC15'
        darkColor = '#EB7723'
        break;
      case 'planet':
        lightColor = '#BE866B';
        darkColor = '#764C33';
        break;
    }

    // chance tile count
    tileCount[tile.type]--;
    tileCount[type]++;

    tile.type = type;
    tile.color = elementColors[type];
    for (var i = 0, len = tile.textures.length; i < len; i++) {
      var particle = tile.textures[i];
      particle.color = (particle.shade === 'light' ? lightColor : darkColor);
    }

    tile.draw();

    if (!noTexture) {
      planet.drawTextures();
      planet.draw(true);
    }

    if (!noText) {
      updateHabitability();

      highlightComposition(type);
      drawHUD();
    }
  };
}

Tile.prototype.points = [];





//------------------------------------------------------------
// Particle
//------------------------------------------------------------
function Particle(x, y, width, height, type, color, alpha, context, rotation) {
  var particle = this;

  particle.x = x;
  particle.y = y;
  particle.width = width;
  particle.height = height;
  particle.type = type;
  particle.color = color;
  particle.alpha = alpha;
  particle.ctx = context;

  /**
   * Draw the particle.
   */
  particle.draw = function() {
    var context = particle.ctx;
    context.save();

    if (rotation) {
      context.translate(particle.x, particle.y);
      context.rotate(rotation*toRad);
      context.translate(-particle.x, -particle.y);
    }

    context.fillStyle = particle.color;
    context.globalAlpha = particle.alpha;
    context.fillRect(particle.x, particle.y, particle.width, particle.height);

    if (particle.type === 'star') {
      var grad = context.createRadialGradient(
        particle.x, particle.y, 0,
        particle.x, particle.y, random()*5
      );
      grad.addColorStop(0, 'rgba(3,26,57,'+particle.alpha+')');
      grad.addColorStop(1, 'rgba(3,26,57,0)');
      context.fillStyle = grad;
      context.fillRect(0,0,canvas.width,canvas.height);
    }

    context.restore();
  }
}





//------------------------------------------------------------
// Text
//------------------------------------------------------------
function Text(str, x, y, dx, dy, color, size, ttl) {
  var text = this;

  text.str = str;
  text.x = x;
  text.y = y;
  text.dx = dx || 0;
  text.dy = dy || 0;
  text.color = color || '#FFF';

  text.timeToLive = ttl || 60;
  text.lifeLeft = text.timeToLive;

  var particles = [];
  var w = effectsCtx.measureText(str).width / 2 | 0;
  var h = effectsCtx.measureText(str).height / 2 | 0;

  // particle explosion
  for (var i = 0; i < 10; i++) {
    var width = random()*5;
    var height = random()*5;
    var alpha = random();
    var rotation = random()*360;
    var dx = -1 + random() * 2;
    var dy = -1 + random() * 2;
    var particle = new Particle(x+w, y, width, height, 'text', color, alpha, effectsCtx, rotation);
    particle.dx = dx;
    particle.dy = dy;

    particles.push(particle);
  }

  /**
   * Update the text.
   */
  text.update = function() {
    text.x = easeOutQuad(text.timeToLive - text.lifeLeft, text.x, text.dx, text.timeToLive);
    text.y = easeOutQuad(text.timeToLive - text.lifeLeft, text.y, text.dy, text.timeToLive);

    for (var i = 0, len = particles.length; i < len; i++) {
      var particle = particles[i];
      particle.x += particle.dx;
      particle.y += particle.dy;
    }

    text.lifeLeft--;
  };

  /**
   * Draw the text.
   */
  text.draw = function() {
    effectsCtx.save();
    effectsCtx.fillStyle = text.color;
    effectsCtx.globalAlpha = text.lifeLeft/text.timeToLive;

    if (size) {
      effectsCtx.font = size + 'px Arial Black';
    }

    effectsCtx.fillText(text.str, text.x, text.y);
    effectsCtx.restore();

    for (var i = 0, len = particles.length; i < len; i++) {
      particles[i].draw();
    }
  }
}

/**
 * Update all the texts
 */
function updateText() {
  for (var i = 0; i < texts.length;) {
    texts[i].update();

    if (texts[i].lifeLeft <= 0) {
      removeFromArray(texts, i);
    }
    else {
      i++;
    }
  }
}


/**
 * Draw all the texts
 */
effectsCtx.font = '20px Impact, Charcoal';
effectsCtx.lineWidth = .2;
function drawText() {
  effectsCtx.strokeStyle = 'white';
  for (var i = 0, len = texts.length; i < len; i++) {
    texts[i].draw();
  }
}





//------------------------------------------------------------
// Background
//------------------------------------------------------------
var bg = (function Background() {
  var background = {};

  background.stars = [];
  background.nebula = [];
  for (var i = 0; i < 4; i++) {
    background.nebula[i] = []
  }

  // stars
  for (var i = 0; i < 200; i++) {
    var x = random()*canvas.width;
    var y = random()*canvas.height;
    var width = random()*2;
    var height = random()*2;
    var alpha = random();
    background.stars.push(new Particle(x, y, width, height, 'star', 'white', alpha, spaceCtx));
  }

  // nebula
  var x = 0, y = 0, tick = 0;
  while (x < canvas.width) {
    y = 50 * sin(tick * 0.5 * PI / 30) + canvas.height/4 + x/2;
    var startY = y;
    var maxHeight = 0;

    // dark
    for (var i = 0; i < randomIntFromInterval(10,15); i++) {
      var width = random()*20;
      var height = random()*20;
      maxHeight += height;
      y += random()*20;
      background.nebula[1].push(new Particle(x, y, width, height, 'nebula', 'rgb(38,13,83)', alpha, spaceCtx));
    }
    background.nebula[0].push(new Particle(x, startY-40, 20, maxHeight+100, 'nebula', 'rgb(38,13,83)', .15, spaceCtx));

    y = startY + 40;

    // medium
    for (var i = 0; i < randomIntFromInterval(5,10); i++) {
      var width = random()*20;
      var height = random()*20;
      var alpha = random();
      y += random()*20;
      background.nebula[2].push(new Particle(x, y, width, height, 'nebula', 'rgb(57,0,78)', alpha, spaceCtx));
    }

    y = (startY + y) / 2;

    // light
    for (var i = 0; i < randomIntFromInterval(2,5); i++) {
      var width = random()*10;
      var height = random()*10;
      var alpha = random();
      y += random()*10;
      background.nebula[3].push(new Particle(x, y, width, height, 'nebula', 'rgb(192,106,219)', alpha, spaceCtx));
    }

    x += random()*10;
    tick++;
  }

  /**
   * Draw the background.
   */
  background.draw = function() {
    for (var i = 0; i < background.stars.length; i++) {
      background.stars[i].draw();
    }

    for (var i = 0; i < background.nebula.length; i++) {
      for (var j = 0; j < background.nebula[i].length; j++) {
        background.nebula[i][j].draw();
      }
    }

    background.drawPlanet();
  };

  /**
   * Draw just the planet background.
   */
  background.drawPlanet = function() {
    // atmosphere
    drawAtmosphere();

    // plant color
    planetCtx.fillStyle = 'rgb(25,16,11)';
    planetCtx.beginPath();
    planetCtx.moveTo(planetX, planetY);
    planetCtx.arc(planetX, planetY, planetRadius, 0, 2*PI);
    planetCtx.fill();

    // light gradient on planet
    var point = getPointAlongCircle(planetX, planetY, planetRadius-1, 225);
    var grad = ctx.createRadialGradient(
      point.x, point.y, 0,
      planetX, planetY, planetRadius
    );
    grad.addColorStop(0, 'rgb(221,181,155)');
    grad.addColorStop(1, 'rgb(22,13,8)');
    gradCtx.fillStyle = grad;
    gradCtx.globalAlpha = 0.5;
    gradCtx.beginPath();
    gradCtx.moveTo(planetX, planetY);
    gradCtx.arc(planetX, planetY, planetRadius, 0, 2*PI);
    gradCtx.fill();
  };

  return background;
})();

bg.drawPlanet();





//------------------------------------------------------------
// Planet
//------------------------------------------------------------
var planet = (function Planet() {
  var planet = {};

  planet.x = planetX;
  planet.y = planetY;
  planet.radius = planetRadius;
  planet.angle = 0;
  planet.speed = 4;
  planet.isMoving = false;
  planet.dir = 0;  // 1: right, -1: left
  planet.tiles = [];

  var point, tile;

  // add all the tiles
  for (var i = 0, j = 0, k = 0; i < NUM_TILES*NUM_RINGS; i++) {
    var angle = planet.angle + theta * i;

    tiles[j] = tiles[j] || {};

    if (!point) {
      point = getPointAlongCircle(planetX, planetY, levels[j].rTop, planet.angle);
    }

    tile = new Tile(point.x, point.y, angle, j);
    planet.tiles[i] = tile;
    tiles[j][theta*k++] = tile;

    if (planet.tiles.length % NUM_TILES === 0) {
      // set tile points for quick access when drawing tiles
      var bottomLeft = getPointAlongCircle(planetX, planetY, levels[j].rBottom, planet.angle);
      var topRight = getPointAlongCircle(planetX, planetY, levels[j].rTop, planet.angle + theta);
      var bottomRight = getPointAlongCircle(planetX, planetY, levels[j].rBottom, planet.angle + theta);

      var points = [
        {
          x: point.x - bottomLeft.x,
          y: point.y - bottomLeft.y
        },
        {
          x: point.x - bottomRight.x,
          y: point.y - bottomRight.y
        },
        {
          x: point.x - topRight.x,
          y: point.y - topRight.y
        }
      ];

      Tile.prototype.points[j] = points;
      point = null;

      j++;
      k = 0;
    }
  }

  // tile textures
  var radius = planetRadius;
  var angle = 135;

  // top/light texture
  while (radius > 0) {
    var point = getPointAlongCircle(planetX, planetY, radius, angle);

    // smaller textures in the center to help see the tile color
    if (radius < TILE_HEIGHT) {
      var width = random()*12;
      var height = random()*12;
    }
    else {
      var width = random()*20;
      var height = random()*20;
    }
    var rotation = random()*360;
    var alpha = random();
    var part = new Particle(point.x, point.y, width, height, 'texture', 'rgb(190,134,107)', alpha, textureCtx, rotation);
    part.shade = 'light';

    var tileAngle = normalizeAngle((angle / theta | 0) * theta);
    var tileRow = 3 - Math.ceil(radius / TILE_HEIGHT);

    tiles[tileRow][tileAngle].textures.push(part);

    // increase angle in the center
    if (radius < TILE_HEIGHT) {
      angle += 10+random()*10;
    }
    else {
      angle += random()*10;
    }

    if (angle >= 315) {
      angle = 135;
      radius -= random()*35;
    }
  }

  radius = 150;
  angle = 315;

  // bottom/dark
  while (radius > 0) {
    var point = getPointAlongCircle(planetX, planetY, radius, angle);

    // smaller textures in the center to help see the tile color
    if (radius < TILE_HEIGHT) {
      var width = random()*12;
      var height = random()*12;
    }
    else {
      var width = random()*20;
      var height = random()*20;
    }
    var rotation = random()*360;
    var alpha = random();
    var part = new Particle(point.x, point.y, width, height, 'texture', 'rgb(118,76,51)', alpha, textureCtx, rotation);
    part.shade = 'dark';

    var tileAngle = normalizeAngle((angle / theta | 0) * theta);
    var tileRow = 3 - Math.ceil(radius / TILE_HEIGHT);

    tiles[tileRow][tileAngle].textures.push(part)

    // increase angle in the center
    if (radius < TILE_HEIGHT) {
      angle = normalizeAngle(angle + 10 + random()*10);
    }
    else {
      angle = normalizeAngle(angle + random()*10);
    }

    if (angle >= 135 && angle < 315) {
      angle = 315;
      radius -= random()*35;
    }
  }

  // draw tiles to offscreen canvas
  var alphas=[0.6,0.4,0.3];
  gridCtx.strokeStyle = 'gray';
  for (var i = 0, len = planet.tiles.length; i < len; i++) {
    var alpha = i / NUM_TILES | 0;
    var tile = planet.tiles[i];
    tile.drawOffscreen(alphas[alpha]);
    tile.draw();
    tile.drawTextures();
  }

  var endAngle = 0;
  var timer = 0;
  var moveTime = 8;

  /**
   * Update planet facing.
   */
  planet.update = function() {
    if (keys.right && !planet.isMoving) {
      planet.isMoving = true;

      planet.dir = 1;
      endAngle = planet.angle + theta;
      timer = 0;
    }
    else if (keys.left && !planet.isMoving) {
      planet.isMoving = true;

      planet.dir = -1;
      endAngle = planet.angle - theta;
      timer = 0;
    }

    if (planet.isMoving) {
      planet.angle = easeInOutQuad(timer, planet.angle, planet.speed * planet.dir, moveTime);
      timer++;

      if (timer === moveTime) {
        planet.isMoving = false;
        planet.angle = endAngle;
      }

      planet.draw(true);
    }
  };

  /**
   * Draw planet and all tiles.
   */
  planet.draw = function(force) {
    if (planet.isMoving || force) {
      ctx.clearRect(150,150,300,300);

      ctx.save();

      ctx.translate(planetX, planetY);
      ctx.rotate(planet.angle*toRad);
      ctx.translate(-planetX, -planetY);

      ctx.beginPath();
      ctx.arc(planetX, planetY, planetRadius, 0, 2*PI);
      ctx.clip();

      ctx.drawImage(tileCanvas,150,150,300,300,150,150,300,300);
      ctx.drawImage(textureCanvas,150,150,300,300,150,150,300,300);

      if (gameStarted) {
        ctx.drawImage(gridCanvas,150,150,300,300,150,150,300,300);
      }

      ctx.restore();
    }
  };

  /**
   * Draw just the planet textures.
   */
  planet.drawTextures = function() {
    textureCtx.clearRect(150,150,300,300);

    for (var i = 0, len = planet.tiles.length; i < len; i++) {
      planet.tiles[i].drawTextures();
    }
  };

  return planet;
})();

planet.draw(true);





//------------------------------------------------------------
// Water Particle
//------------------------------------------------------------
function WaterParticle(x, y, originalX, originalY, dx, color, ctx, ttl, width, height, rotation) {
  var waterParticle = this;

  waterParticle.x = x;
  waterParticle.y = y;
  waterParticle.originalX = originalX;
  waterParticle.originalY = originalY;
  waterParticle.dx = dx;

  waterParticle.rotation = rotation;

  waterParticle.ctx = ctx;
  waterParticle.color = color;
  waterParticle.timeToLive = 40;
  waterParticle.lifeLeft = ttl || waterParticle.timeToLive;

  waterParticle.width = width || 3+random()*3;
  waterParticle.height = height || random()*2;
}

/**
 * Update the particle's position.
 */
WaterParticle.prototype.update = function() {
  var waterParticle = this;

  waterParticle.x -= waterParticle.dx;
  waterParticle.lifeLeft--;
}

/**
 * Draw the water particle to the screen.
 */
WaterParticle.prototype.draw = function() {
  var waterParticle = this;

  waterParticle.ctx.save();

  if (waterParticle.rotation) {
    waterParticle.ctx.translate(waterParticle.x, waterParticle.y);
    waterParticle.ctx.rotate(waterParticle.rotation*toRad);
    waterParticle.ctx.translate(-waterParticle.x, -waterParticle.y);
  }

  waterParticle.ctx.globalAlpha = waterParticle.lifeLeft/waterParticle.timeToLive;
  waterParticle.ctx.fillStyle = waterParticle.color;
  waterParticle.ctx.fillRect(waterParticle.x, waterParticle.y, waterParticle.width, waterParticle.height);
  waterParticle.ctx.restore();
}

/**
 * Reset a particle to the beginning.
 */
WaterParticle.prototype.reset = function() {
  var waterParticle = this;

  waterParticle.x = waterParticle.originalX;
  waterParticle.y = waterParticle.originalY - 15 + random() * 30;
  waterParticle.lifeLeft = waterParticle.timeToLive;
};





//------------------------------------------------------------
// Water
//------------------------------------------------------------
function Water(x, y, dx, ctx) {
  var water = this;

  water.particles = [];
  water.x = x;
  water.y = y;
  water.dx = dx || 0;

  var transX = 0;
  var startX = 0;
  var hasDrawn = false;

  // cycle the particles
  for (var i = 0; i < 30; i++) {
    var rand = random() * 40;
    var pX = x + rand;
    var pY = y - 15 + random() * 30;
    water.particles.push(new WaterParticle(pX, pY, x+40, y, 1, '#1879BD', ctx, rand));
    water.particles.push(new WaterParticle(pX, pY, x+40, y, 1, '#43A4BD', ctx, rand));
  }

  // clouds
  for (var i = 0; i < 60; i++) {
    var pX = x+40+random()*5;
    var pY = y - 20 + random() * 40;
    var width = 4 + random() * 6;
    var height = 4 + random() * 6;
    var alpha = random();
    var rotation = random()*360;
    water.particles.push(new WaterParticle(pX, pY, x+40, y, 0, 'rgb(127,129,141)', ctx, 40+random() * 40, width, height, rotation));
  }

  /**
   * Update all the water particles.
   */
  water.update = function() {
    if (hasDrawn) {
      startX = transX;
      hasDrawn = false;
    }

    transX += water.dx;

    for (var i = 0; i < water.particles.length; i++) {
      var particle = water.particles[i];
      particle.update();

      if (particle.lifeLeft <= 0) {
        particle.reset();
      }
    }
  };

  /**
   * Draw all the water particles.
   */
  water.draw = function() {
    ctx.save();

    ctx.translate(transX, 0);
    for (var i = 0; i < water.particles.length; i++) {
      water.particles[i].draw();
    }

    hasDrawn = true;

    ctx.restore();
  };
}





//------------------------------------------------------------
// Earth Particle
//------------------------------------------------------------
function EarthParticle(x, y, angle, dir, radius, color, ctx, size) {
  var earthParticle = this;

  var rad = degToRad(angle);
  var diff = Math.abs(angle - 180);

  earthParticle.centerX = x;
  earthParticle.centerY = y;
  earthParticle.x = dir * Math.cos(rad) * 10 + (diff < 20 ? 10 - diff/2 : 0);
  earthParticle.y = Math.sin(rad) * Math.pow(Math.sin(0.5 * rad), radius) * 10;

  earthParticle.ctx = ctx;
  earthParticle.color = color;
  earthParticle.size = size || 5;

  earthParticle.rotation = 0;
}

/**
 * Draw the earth particle to the screen.
 */
EarthParticle.prototype.draw = function() {
  var earthParticle = this;

  earthParticle.ctx.save();
  earthParticle.ctx.translate(earthParticle.centerX, earthParticle.centerY);
  earthParticle.ctx.fillStyle = earthParticle.color;
  earthParticle.ctx.fillRect(earthParticle.x, earthParticle.y, earthParticle.size, earthParticle.size);
  earthParticle.ctx.restore();
}





//------------------------------------------------------------
// Earth
//------------------------------------------------------------
function Earth(x, y, dx, ctx) {
  var earth = this;

  earth.particles = [];
  earth.x = x;
  earth.y = y;
  earth.dx = dx || 0;

  var transX = 0;
  var transY = 0;
  var startX = 0;
  var hasDrawn = false;
  var count = 0;

  earth.rotation = 0;

  // set the particles
  for (var i = 0; i < (15*6); i+=6) {
    earth.particles.push(new EarthParticle(x, y, 180+i*2, 1, 1.5, '#093905', ctx, 4));
    earth.particles.push(new EarthParticle(x, y, 180-i*2, 1, 1.5, '#23531F', ctx, 4));
  }
  for (var i = 0; i < (15*6); i+=5) {
    earth.particles.push(new EarthParticle(x, y, 180+i*2, 1, 6, '#093905', ctx, 4));
    earth.particles.push(new EarthParticle(x, y, 180-i*2, 1, 6, '#23531F', ctx, 4));
  }
  for (var i = 0; i < (8*5); i+=5) {
    earth.particles.push(new EarthParticle(x-10, y+1, 215+i*2, -1, 9, '#3C6C38', ctx, 1.5));
    earth.particles.push(new EarthParticle(x-10, y+1, 145-i*2, -1, 9, '#3C6C38', ctx, 1.5));
  }
  for (var i = 0; i < (6*5); i+=5) {
    earth.particles.push(new EarthParticle(x-5, y+1, 210+i*2, -1, 15, '#3C6C38', ctx, 1));
    earth.particles.push(new EarthParticle(x-5, y+1, 150-i*2, -1, 15, '#3C6C38', ctx, 1));
  }
  for (var i = 0; i < (5*5); i+=5) {
    earth.particles.push(new EarthParticle(x, y+1, 215+i*2, -1, 20, '#3C6C38', ctx, 1));
    earth.particles.push(new EarthParticle(x, y+1, 145-i*2, -1, 20, '#3C6C38', ctx, 1));
  }

  /**
   * Update all the earth particles.
   */
  earth.update = function() {
    if (hasDrawn) {
      startX = transX;
      hasDrawn = false;
    }

    transX += earth.dx;
    transY = 15 * sin(count * 0.5 * PI / 40)
    earth.rotation = 45 * sin(count++ * 0.5 * PI / 40);
  };

  /**
   * Draw all the earth particles.
   */
  earth.draw = function() {
    ctx.save();

    ctx.translate(transX, transY);

    ctx.translate(earth.x, earth.y);
    ctx.rotate((earth.rotation+90)*toRad);
    ctx.translate(-earth.x, -earth.y);

    for (var i = 0; i < earth.particles.length; i++) {
      earth.particles[i].draw();
    }

    hasDrawn = true;

    ctx.restore();
  };
}





//------------------------------------------------------------
// Air Particle
// spiral math taken from https://github.com/wigz/HTML5-Canvas-Golden-Spirals/blob/master/lib/js/legwork.spiral.js
//------------------------------------------------------------
var b = math.log(phi) / (PI / 2);

function AirParticle(x, y, originalX, originalY, dir, rotation, rotationSpeed, ctx, ll) {
  var airParticle = this;

  airParticle.x = x;
  airParticle.y = y;
  airParticle.ctx = ctx;
  airParticle.ttlBase = 40;

  airParticle.dir = dir;
  airParticle.rotation = rotation;
  airParticle.rotationSpeed = rotationSpeed;

  airParticle.width = randomIntFromInterval(1,5);
  airParticle.height = airParticle.width;

  airParticle.originalX = originalX;
  airParticle.originalY = originalY;

  airParticle.timeToLive = airParticle.ttlBase+random()*20 | 0;
  airParticle.lifeLeft = ll || airParticle.timeToLive;
}

/**
 * Update the particle's position.
 */
AirParticle.prototype.update = function() {
  var airParticle = this;

  var t = degToRad((airParticle.timeToLive - airParticle.lifeLeft) * 11);
  var z = math.pow(e, b*t);

  airParticle.x = airParticle.originalX + z * cos(t) * airParticle.dir;
  airParticle.y = airParticle.originalY + z * sin(t) * airParticle.dir;
  airParticle.rotation += airParticle.rotationSpeed;

  airParticle.lifeLeft--;
}

/**
 * Draw the air particle to the screen.
 */
AirParticle.prototype.draw = function() {
  var airParticle = this;

  airParticle.ctx.save();
  airParticle.ctx.translate(airParticle.x, airParticle.y);
  airParticle.ctx.rotate(airParticle.rotation*toRad);
  airParticle.ctx.translate(-airParticle.x, -airParticle.y);

  airParticle.ctx.fillStyle = 'rgba(255,255,255,'+airParticle.lifeLeft/airParticle.timeToLive+')';
  airParticle.ctx.fillRect(airParticle.x, airParticle.y, airParticle.width, airParticle.height);

  airParticle.ctx.restore();
}

/**
 * Reset a particle to the beginning.
 */
AirParticle.prototype.reset = function() {
  var airParticle = this;

  airParticle.x = airParticle.originalX;
  airParticle.y = airParticle.originalY;
  airParticle.timeToLive = airParticle.ttlBase+random()*20 | 0;
  airParticle.lifeLeft = airParticle.timeToLive;
};




//------------------------------------------------------------
// Air
//------------------------------------------------------------
function Air(x, y, dx, ctx) {
  var air = this;

  air.particles = [];
  air.x = x;
  air.y = y;
  air.dx = dx || 0;

  var transX = 0;
  var startX = 0;
  var hasDrawn = false;

  // cycle the particles
  for (var i = 0; i < 50; i++) {
    var step = i%40;
    var ttl = 40-step;

    var t = degToRad(ttl * 11);
    var z = math.pow(e, b*t);

    var x = air.x + z * cos(t);
    var y = air.y + z * sin(t);


    air.particles.push(new AirParticle(x, y, air.x, air.y, 1, 0, 5, ctx, ttl));
    air.particles.push(new AirParticle(x, y, air.x, air.y, -1, 0, 5, ctx, ttl));
  }

  /**
   * Update all the air particles.
   */
  air.update = function() {
    if (hasDrawn) {
      startX = transX;
      hasDrawn = false;
    }

    transX += air.dx;

    for (var i = 0; i < air.particles.length; i++) {
      var particle = air.particles[i];
      particle.update();


      if (particle.lifeLeft <= 0) {
        particle.reset();
      }
    }
  };

  /**
   * Draw all the air particles.
   */
  air.draw = function() {
    ctx.save();

    ctx.translate(transX, 0);
    for (var i = 0; i < air.particles.length; i++) {
      air.particles[i].draw();
    }

    hasDrawn = true;

    ctx.restore();
  };
}





//------------------------------------------------------------
// Fire Particle
//------------------------------------------------------------
var fireColors = ['#ffeba4', '#fbcf6e', '#f7a31d', 'rgb(99,87,87)'];
var fireColorSize = 5;

function FireParticle(x, y, originalX, ctx, ttl) {
  var fireParticle = this;

  fireParticle.x = x;
  fireParticle.dy = 0;
  fireParticle.ctx = ctx;
  fireParticle.ttlBase = 40;

  fireParticle.y = y + dSix(2) - 7;
  fireParticle.dx = 1;
  fireParticle.width = randomIntFromInterval(1,5);
  fireParticle.radius = 10;

  fireParticle.height = fireParticle.width;
  fireParticle.originalX = originalX;
  fireParticle.originalY = fireParticle.y;

  fireParticle.timeToLive = ttl||fireParticle.ttlBase;
  fireParticle.lifeLeft = fireParticle.timeToLive;
}

/**
 * Update the particle's position
 */
FireParticle.prototype.update = function() {
  var fireParticle = this;

  fireParticle.x += fireParticle.dx;
  fireParticle.y += fireParticle.dy;

  fireParticle.lifeLeft--;
}

/**
 * Draw the fire particle to the screen.
 */
FireParticle.prototype.draw = function() {
  var fireParticle = this;

  var radius = calcDist(fireParticle.originalY - fireParticle.y, fireParticle.originalX - fireParticle.x);
  var increment = fireParticle.radius / 3;
  var index = radius / increment | 0;
  var colorIndex = index < 3 ? index : 3;

  // change color based on how far from the point of origin the particle is
  if (radius < fireParticle.radius) {
    fireParticle.ctx.fillStyle = fireColors[radius / increment | 0];
  }
  else {
    fireParticle.ctx.fillStyle = 'rgba(99,87,87,'+fireParticle.lifeLeft/fireParticle.timeToLive+')';
  }

  fireParticle.ctx.fillRect(fireParticle.x, fireParticle.y, fireParticle.width, fireParticle.height);
};

/**
 * Reset a particle to the beginning.
 */
FireParticle.prototype.reset = function() {
  var fireParticle = this;

  fireParticle.x = fireParticle.originalX;
  fireParticle.y = fireParticle.originalY;
  fireParticle.timeToLive = fireParticle.ttlBase+random()*20 | 0;
  fireParticle.lifeLeft = fireParticle.timeToLive;
};





//------------------------------------------------------------
// Fire
//------------------------------------------------------------
function Fire(x, y, dx, ctx) {
  var fire = this;

  fire.particles = [];
  var numParticles = 150;

  fire.x = x;
  fire.y = y;
  fire.dx = dx || 0;
  fire.timeToLive = 100;

  var transX = 0;
  var startX = 0;
  var hasDrawn = false;

  // cycle the particles
  for (var i = 0; i < numParticles; i++) {
    var step = i%40;
    var x = fire.x*step;
    var ttl = 40-step;
    fire.particles.push(new FireParticle(x, fire.y, fire.x, ctx, ttl));
  }

  /**
   * Update all the fire particles.
   */
  fire.update = function() {
    if (hasDrawn) {
      startX = transX;
      hasDrawn = false;
    }

    transX += fire.dx;

    for (var i = 0; i < fire.particles.length; i++) {
      var particle = fire.particles[i];
      particle.update();


      if (particle.lifeLeft <= 0) {
        particle.reset();
      }
    }
  };

  /**
   * Draw all the fire particles.
   */
  fire.draw = function() {
    ctx.save();

    // ctx.clearRect(startX, -part.radius, part.dx*part.ttlBase+20, part.radius*2);
    ctx.translate(transX, 0);
    for (var i = 0; i < fire.particles.length; i++) {
      fire.particles[i].draw();
    }

    hasDrawn = true;

    ctx.restore();
  };
}





//------------------------------------------------------------
// Element
//------------------------------------------------------------
function Element(distance, angle, type) {
  var element = this;

  var index = round(rand(0, 3));

  element.distance = distance;
  element.angle = angle;
  element.type = type || elementTypes[index];
  element.color = elementColors[element.type];
  element.dx = (difficulty === 'easy' ? -1 : -1.25);

  // spawn the correct element type
  var point = getPointAlongCircle(planetX, planetY, element.distance, 0);
  switch (element.type) {
    case 'water':
      element.effect = new Water(point.x, point.y, element.dx, osCtx);
      break;
    case 'earth':
      element.effect = new Earth(point.x, point.y, element.dx, osCtx);
      break;
    case 'air':
      element.effect = new Air(point.x, point.y, element.dx, osCtx);
      break;
    case 'fire':
      element.effect = new Fire(point.x, point.y, element.dx, osCtx);
      break;
  }

  /**
   * Update the element.
   */
  element.update = function() {
    element.distance += element.dx;

    if (element.effect) {
      element.effect.update();
    }
  }

  /**
   * Draw the element.
   */
  element.draw = function() {
    osCtx.save();

    osCtx.translate(planetX, planetY);
    osCtx.rotate((element.angle + (theta / 2)) * toRad);
    osCtx.translate(-planetX, -planetY);
    element.effect.draw();

    osCtx.restore();
  }
}

/**
 * Update all elements.
 */
function updateElements() {
  var i = 0;
  while (i < elements.length) {
    var element = elements[i];
    var elementDistance = element.distance;

    element.update();

    // element is close enough to the planet to cause a reaction
    if (elementDistance <= planetRadius) {

      // ensure that the angle is a multiple of theta
      var elementAngle = element.angle;
      var angle = normalizeAngle(elementAngle - planet.angle);
      angle = round(angle / theta) * theta % circle

      var level = getLevel(elementDistance);

      if (elementDistance < 0) {
        removeFromArray(elements, i);
      }

      if (level === undefined) continue;

      var tile = tiles[level][angle];
      var tileType = tile.type;

      // empty title
      if (tileType === 'planet') {
        tile.changeType(element.type);
      }
      // reaction tile
      else {
        var reaction = reactions[element.type][tileType];
        var point = getPointAlongCircle(planetX, planetY, elementDistance, elementAngle);

        switch(reaction) {
          // remove the element from the tile
          case 'destroy':
            tile.changeType('planet');
            break;
          // spawn 2 elements on each side of the tile and 1 below
          case 'enhance':
            elements.push(new Element(planet.radius, normalizeAngle(element.angle+theta), tileType));
            elements.push(new Element(planet.radius, normalizeAngle(element.angle-theta), tileType));
            elements.push(new Element(levels[level].rBottom, normalizeAngle(element.angle), tileType));
            break;
          // spawn 1 element below the tile
          case 'push':
            elements.push(new Element(levels[level].rBottom, normalizeAngle(element.angle), tileType));
            break;
        }
      }

      removeFromArray(elements, i);
    }
    else {
      i++;
    }
  }
}

/**
 * Draw all the elements.
 */
function drawElements() {
  for (i = 0; i < elements.length; i++) {
    elements[i].draw();
  }
}

/**
 * Spawn a new element into play.
 */
function spawnElement(t) {
  var radius = 320;
  var angle = theta*randomIntFromInterval(0, NUM_TILES-1);
  var r = random();
  var type;

  // get the type based on its odds
  for (var i = 0; i < 4; i++) {
    if (r <= elementOdds[i]) {
      type = elementTypes[i];
      break;
    }
  }

  drawElementType(type, radius, angle);
  elements.push(new Element(radius, angle, type));
}

/**
 * Draw the element type when an element spawns.
 */
function drawElementType(type, radius, angle) {
  var point = getPointAlongCircle(planetX, planetY, radius-TILE_HEIGHT, angle + (theta / 2));
  texts.push(new Text(type, point.x, point.y, 0, -2, elementTextColors[type]));
}





//
// Sonant-X
//
// Copyright (c) 2014 Nicolas Vanhoren
//
// Sonant-X is a fork of js-sonant by Marcus Geelnard and Jake Taylor. It is
// still published using the same license (zlib license, see below).
//
// Copyright (c) 2011 Marcus Geelnard
// Copyright (c) 2008-2009 Jake Taylor
//
// This software is provided 'as-is', without any express or implied
// warranty. In no event will the authors be held liable for any damages
// arising from the use of this software.
//
// Permission is granted to anyone to use this software for any purpose,
// including commercial applications, and to alter it and redistribute it
// freely, subject to the following restrictions:
//
// 1. The origin of this software must not be misrepresented; you must not
//    claim that you wrote the original software. If you use this software
//    in a product, an acknowledgment in the product documentation would be
//    appreciated but is not required.
//
// 2. Altered source versions must be plainly marked as such, and must not be
//    misrepresented as being the original software.
//
// 3. This notice may not be removed or altered from any source
//    distribution.

var sonantx;
(function() {
"use strict";
sonantx = {};

var WAVE_SPS = 44100;                    // Samples per second
var WAVE_CHAN = 2;                       // Channels
var MAX_TIME = 33; // maximum time, in millis, that the generator can use consecutively

var audioCtx = null;

// Oscillators
function osc_sin(value)
{
    return Math.sin(value * 6.283184);
}

function osc_square(value)
{
    if(osc_sin(value) < 0) return -1;
    return 1;
}

function osc_saw(value)
{
    return (value % 1) - 0.5;
}

function osc_tri(value)
{
    var v2 = (value % 1) * 4;
    if(v2 < 2) return v2 - 1;
    return 3 - v2;
}

// Array of oscillator functions
var oscillators =
[
    osc_sin,
    osc_square,
    osc_saw,
    osc_tri
];

function getnotefreq(n)
{
    return 0.00390625 * Math.pow(1.059463094, n - 128);
}

function genBuffer(waveSize, callBack) {
    setTimeout(function() {
        // Create the channel work buffer
        var buf = new Uint8Array(waveSize * WAVE_CHAN * 2);
        var b = buf.length - 2;
        var iterate = function() {
            var begin = new Date();
            var count = 0;
            while(b >= 0)
            {
                buf[b] = 0;
                buf[b + 1] = 128;
                b -= 2;
                count += 1;
                if (count % 1000 === 0 && (new Date() - begin) > MAX_TIME) {
                    setTimeout(iterate, 0);
                    return;
                }
            }
            setTimeout(function() {callBack(buf);}, 0);
        };
        setTimeout(iterate, 0);
    }, 0);
}

function applyDelay(chnBuf, waveSamples, instr, rowLen, callBack) {
    var p1 = (instr.fx_delay_time * rowLen) >> 1;
    var t1 = instr.fx_delay_amt / 255;

    var n1 = 0;
    var iterate = function() {
        var beginning = new Date();
        var count = 0;
        while(n1 < waveSamples - p1)
        {
            var b1 = 4 * n1;
            var l = 4 * (n1 + p1);

            // Left channel = left + right[-p1] * t1
            var x1 = chnBuf[l] + (chnBuf[l+1] << 8) +
                (chnBuf[b1+2] + (chnBuf[b1+3] << 8) - 32768) * t1;
            chnBuf[l] = x1 & 255;
            chnBuf[l+1] = (x1 >> 8) & 255;

            // Right channel = right + left[-p1] * t1
            x1 = chnBuf[l+2] + (chnBuf[l+3] << 8) +
                (chnBuf[b1] + (chnBuf[b1+1] << 8) - 32768) * t1;
            chnBuf[l+2] = x1 & 255;
            chnBuf[l+3] = (x1 >> 8) & 255;
            ++n1;
            count += 1;
            if (count % 1000 === 0 && (new Date() - beginning) > MAX_TIME) {
                setTimeout(iterate, 0);
                return;
            }
        }
        setTimeout(callBack, 0);
    };
    setTimeout(iterate, 0);
}

sonantx.AudioGenerator = function(mixBuf) {
    this.mixBuf = mixBuf;
    this.waveSize = mixBuf.length / WAVE_CHAN / 2;
};
sonantx.AudioGenerator.prototype.getWave = function() {
    var mixBuf = this.mixBuf;
    var waveSize = this.waveSize;
    // Local variables
    var b, k, x, wave, l1, l2, s, y;

    // Turn critical object properties into local variables (performance)
    var waveBytes = waveSize * WAVE_CHAN * 2;

    // Convert to a WAVE file (in a binary string)
    l1 = waveBytes - 8;
    l2 = l1 - 36;
    wave = String.fromCharCode(82,73,70,70,
                               l1 & 255,(l1 >> 8) & 255,(l1 >> 16) & 255,(l1 >> 24) & 255,
                               87,65,86,69,102,109,116,32,16,0,0,0,1,0,2,0,
                               68,172,0,0,16,177,2,0,4,0,16,0,100,97,116,97,
                               l2 & 255,(l2 >> 8) & 255,(l2 >> 16) & 255,(l2 >> 24) & 255);
    b = 0;
    while(b < waveBytes)
    {
        // This is a GC & speed trick: don't add one char at a time - batch up
        // larger partial strings
        x = "";
        for (k = 0; k < 256 && b < waveBytes; ++k, b += 2)
        {
            // Note: We amplify and clamp here
            y = 4 * (mixBuf[b] + (mixBuf[b+1] << 8) - 32768);
            y = y < -32768 ? -32768 : (y > 32767 ? 32767 : y);
            x += String.fromCharCode(y & 255, (y >> 8) & 255);
        }
        wave += x;
    }
    return wave;
};
sonantx.AudioGenerator.prototype.getAudio = function() {
    var wave = this.getWave();
    var a = new Audio("data:audio/wav;base64," + btoa(wave));
    a.preload = "none";
    a.load();
    return a;
};
sonantx.AudioGenerator.prototype.getAudioBuffer = function(callBack) {
    if (audioCtx === null)
        audioCtx = new AudioContext();
    var mixBuf = this.mixBuf;
    var waveSize = this.waveSize;

    var waveBytes = waveSize * WAVE_CHAN * 2;
    var buffer = audioCtx.createBuffer(WAVE_CHAN, this.waveSize, WAVE_SPS); // Create Mono Source Buffer from Raw Binary
    var lchan = buffer.getChannelData(0);
    var rchan = buffer.getChannelData(1);
    var b = 0;
    var iterate = function() {
        var beginning = new Date();
        var count = 0;
        while (b < (waveBytes / 2)) {
            var y = 4 * (mixBuf[b * 4] + (mixBuf[(b * 4) + 1] << 8) - 32768);
            y = y < -32768 ? -32768 : (y > 32767 ? 32767 : y);
            lchan[b] = y / 32768;
            y = 4 * (mixBuf[(b * 4) + 2] + (mixBuf[(b * 4) + 3] << 8) - 32768);
            y = y < -32768 ? -32768 : (y > 32767 ? 32767 : y);
            rchan[b] = y / 32768;
            b += 1;
            count += 1;
            if (count % 1000 === 0 && new Date() - beginning > MAX_TIME) {
                setTimeout(iterate, 0);
                return;
            }
        }
        setTimeout(function() {callBack(buffer);}, 0);
    };
    setTimeout(iterate, 0);
};

sonantx.SoundGenerator = function(instr, rowLen) {
    this.instr = instr;
    this.rowLen = rowLen || 5605;

    this.osc_lfo = oscillators[instr.lfo_waveform];
    this.osc1 = oscillators[instr.osc1_waveform];
    this.osc2 = oscillators[instr.osc2_waveform];
    this.attack = instr.env_attack;
    this.sustain = instr.env_sustain;
    this.release = instr.env_release;
    this.panFreq = Math.pow(2, instr.fx_pan_freq - 8) / this.rowLen;
    this.lfoFreq = Math.pow(2, instr.lfo_freq - 8) / this.rowLen;
};
sonantx.SoundGenerator.prototype.genSound = function(n, chnBuf, currentpos) {
    var marker = new Date();
    var c1 = 0;
    var c2 = 0;

    // Precalculate frequencues
    var o1t = getnotefreq(n + (this.instr.osc1_oct - 8) * 12 + this.instr.osc1_det) * (1 + 0.0008 * this.instr.osc1_detune);
    var o2t = getnotefreq(n + (this.instr.osc2_oct - 8) * 12 + this.instr.osc2_det) * (1 + 0.0008 * this.instr.osc2_detune);

    // State variable init
    var q = this.instr.fx_resonance / 255;
    var low = 0;
    var band = 0;
    for (var j = this.attack + this.sustain + this.release - 1; j >= 0; --j)
    {
        var k = j + currentpos;

        // LFO
        var lfor = this.osc_lfo(k * this.lfoFreq) * this.instr.lfo_amt / 512 + 0.5;

        // Envelope
        var e = 1;
        if(j < this.attack)
            e = j / this.attack;
        else if(j >= this.attack + this.sustain)
            e -= (j - this.attack - this.sustain) / this.release;

        // Oscillator 1
        var t = o1t;
        if(this.instr.lfo_osc1_freq) t += lfor;
        if(this.instr.osc1_xenv) t *= e * e;
        c1 += t;
        var rsample = this.osc1(c1) * this.instr.osc1_vol;

        // Oscillator 2
        t = o2t;
        if(this.instr.osc2_xenv) t *= e * e;
        c2 += t;
        rsample += this.osc2(c2) * this.instr.osc2_vol;

        // Noise oscillator
        if(this.instr.noise_fader) rsample += (2*Math.random()-1) * this.instr.noise_fader * e;

        rsample *= e / 255;

        // State variable filter
        var f = this.instr.fx_freq;
        if(this.instr.lfo_fx_freq) f *= lfor;
        f = 1.5 * Math.sin(f * 3.141592 / WAVE_SPS);
        low += f * band;
        var high = q * (rsample - band) - low;
        band += f * high;
        switch(this.instr.fx_filter)
        {
            case 1: // Hipass
                rsample = high;
                break;
            case 2: // Lopass
                rsample = low;
                break;
            case 3: // Bandpass
                rsample = band;
                break;
            case 4: // Notch
                rsample = low + high;
                break;
            default:
        }

        // Panning & master volume
        t = osc_sin(k * this.panFreq) * this.instr.fx_pan_amt / 512 + 0.5;
        rsample *= 39 * this.instr.env_master;

        // Add to 16-bit channel buffer
        k = k * 4;
        if (k + 3 < chnBuf.length) {
            var x = chnBuf[k] + (chnBuf[k+1] << 8) + rsample * (1 - t);
            chnBuf[k] = x & 255;
            chnBuf[k+1] = (x >> 8) & 255;
            x = chnBuf[k+2] + (chnBuf[k+3] << 8) + rsample * t;
            chnBuf[k+2] = x & 255;
            chnBuf[k+3] = (x >> 8) & 255;
        }
    }
};
sonantx.SoundGenerator.prototype.getAudioGenerator = function(n, callBack) {
    var bufferSize = (this.attack + this.sustain + this.release - 1) + (32 * this.rowLen);
    var self = this;
    genBuffer(bufferSize, function(buffer) {
        self.genSound(n, buffer, 0);
        applyDelay(buffer, bufferSize, self.instr, self.rowLen, function() {
            callBack(new sonantx.AudioGenerator(buffer));
        });
    });
};
sonantx.SoundGenerator.prototype.createAudio = function(n, callBack) {
    this.getAudioGenerator(n, function(ag) {
        callBack(ag.getAudio());
    });
};
sonantx.SoundGenerator.prototype.createAudioBuffer = function(n, callBack) {
    this.getAudioGenerator(n, function(ag) {
        ag.getAudioBuffer(callBack);
    });
};

sonantx.MusicGenerator = function(song) {
    this.song = song;
    // Wave data configuration
    this.waveSize = WAVE_SPS * song.songLen; // Total song size (in samples)
};
sonantx.MusicGenerator.prototype.generateTrack = function (instr, mixBuf, callBack) {
    var self = this;
    genBuffer(this.waveSize, function(chnBuf) {
        // Preload/precalc some properties/expressions (for improved performance)
        var waveSamples = self.waveSize,
            waveBytes = self.waveSize * WAVE_CHAN * 2,
            rowLen = self.song.rowLen,
            endPattern = self.song.endPattern,
            soundGen = new sonantx.SoundGenerator(instr, rowLen);

        var currentpos = 0;
        var p = 0;
        var row = 0;
        var recordSounds = function() {
            var beginning = new Date();
            while (true) {
                if (row === 32) {
                    row = 0;
                    p += 1;
                    continue;
                }
                if (p === endPattern - 1) {
                    setTimeout(delay, 0);
                    return;
                }
                var cp = instr.p[p];
                if (cp) {
                    var n = instr.c[cp - 1].n[row];
                    if (n) {
                        soundGen.genSound(n, chnBuf, currentpos);
                    }
                }
                currentpos += rowLen;
                row += 1;
                if (new Date() - beginning > MAX_TIME) {
                    setTimeout(recordSounds, 0);
                    return;
                }
            }
        };

        var delay = function() {
            applyDelay(chnBuf, waveSamples, instr, rowLen, finalize);
        };

        var b2 = 0;
        var finalize = function() {
            var beginning = new Date();
            var count = 0;
            // Add to mix buffer
            while(b2 < waveBytes)
            {
                var x2 = mixBuf[b2] + (mixBuf[b2+1] << 8) + chnBuf[b2] + (chnBuf[b2+1] << 8) - 32768;
                mixBuf[b2] = x2 & 255;
                mixBuf[b2+1] = (x2 >> 8) & 255;
                b2 += 2;
                count += 1;
                if (count % 1000 === 0 && (new Date() - beginning) > MAX_TIME) {
                    setTimeout(finalize, 0);
                    return;
                }
            }
            setTimeout(callBack, 0);
        };
        setTimeout(recordSounds, 0);
    });
};
sonantx.MusicGenerator.prototype.getAudioGenerator = function(callBack, progress) {
    var self = this;
    genBuffer(this.waveSize, function(mixBuf) {
        var t = 0;
        var recu = function() {
            if (t < self.song.songData.length) {
                t += 1;
                self.generateTrack(self.song.songData[t - 1], mixBuf, recu);
                progress(t, self.song.songData.length+1);
            } else {
                callBack(new sonantx.AudioGenerator(mixBuf));
            }
        };
        recu();
    });
};
sonantx.MusicGenerator.prototype.createAudio = function(callBack, progress) {
    this.getAudioGenerator(function(ag) {
        callBack(ag.getAudio());
    }, progress);
};
sonantx.MusicGenerator.prototype.createAudioBuffer = function(callBack) {
    this.getAudioGenerator(function(ag) {
        ag.getAudioBuffer(callBack);
    });
};

})();






//------------------------------------------------------------
// Song
//------------------------------------------------------------
var song = {
    "rowLen": 2242,
    "endPattern": 49,
    "songData": [
        {
            "osc1_oct": 7,
            "osc1_det": 0,
            "osc1_detune": 0,
            "osc1_xenv": 1,
            "osc1_vol": 255,
            "osc1_waveform": 0,
            "osc2_oct": 7,
            "osc2_det": 0,
            "osc2_detune": 0,
            "osc2_xenv": 1,
            "osc2_vol": 255,
            "osc2_waveform": 0,
            "noise_fader": 0,
            "env_attack": 50,
            "env_sustain": 150,
            "env_release": 4800,
            "env_master": 200,
            "fx_filter": 2,
            "fx_freq": 600,
            "fx_resonance": 254,
            "fx_delay_time": 0,
            "fx_delay_amt": 0,
            "fx_pan_freq": 0,
            "fx_pan_amt": 0,
            "lfo_osc1_freq": 0,
            "lfo_fx_freq": 0,
            "lfo_freq": 0,
            "lfo_amt": 0,
            "lfo_waveform": 0,
            "p": [
                1,
                1,
                1,
                2,
                1,
                1,
                1,
                1,
                1,
                1,
                1,
                3,
                1,
                1,
                1,
                1,
                1,
                1,
                1,
                3,
                1,
                1,
                1,
                1,
                1,
                1,
                1,
                3,
                4,
                4,
                4,
                4,
                4,
                4,
                4,
                3,
                1,
                1,
                1,
                1,
                1,
                1,
                1,
                3,
                1,
                1,
                1,
                2
            ],
            "c": [
                {
                    "n": [
                        128,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        128,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0
                    ]
                },
                {
                    "n": [
                        128,
                        0,
                        0,
                        0,
                        0,
                        0,
                        128,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        128,
                        0,
                        0,
                        0,
                        0,
                        0,
                        128,
                        0,
                        0,
                        0
                    ]
                },
                {
                    "n": [
                        128,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        128,
                        0,
                        0,
                        0,
                        0,
                        0,
                        128,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0
                    ]
                },
                {
                    "n": [
                        128,
                        0,
                        0,
                        0,
                        0,
                        0,
                        128,
                        0,
                        0,
                        0,
                        0,
                        0,
                        128,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        128,
                        0,
                        128,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0
                    ]
                }
            ]
        },
        {
            "osc1_oct": 8,
            "osc1_det": 0,
            "osc1_detune": 0,
            "osc1_xenv": 1,
            "osc1_vol": 160,
            "osc1_waveform": 0,
            "osc2_oct": 8,
            "osc2_det": 0,
            "osc2_detune": 0,
            "osc2_xenv": 1,
            "osc2_vol": 160,
            "osc2_waveform": 0,
            "noise_fader": 210,
            "env_attack": 50,
            "env_sustain": 200,
            "env_release": 6800,
            "env_master": 160,
            "fx_filter": 4,
            "fx_freq": 11025,
            "fx_resonance": 254,
            "fx_delay_time": 6,
            "fx_delay_amt": 0,
            "fx_pan_freq": 5,
            "fx_pan_amt": 61,
            "lfo_osc1_freq": 0,
            "lfo_fx_freq": 1,
            "lfo_freq": 4,
            "lfo_amt": 0,
            "lfo_waveform": 0,
            "p": [
                1,
                1,
                1,
                2,
                1,
                1,
                1,
                1,
                1,
                1,
                1,
                2,
                1,
                1,
                1,
                1,
                1,
                1,
                1,
                2,
                1,
                1,
                1,
                1,
                1,
                1,
                1,
                2,
                4,
                4,
                4,
                4,
                4,
                4,
                4,
                2,
                1,
                1,
                1,
                1,
                1,
                1,
                1,
                1,
                1,
                1,
                1,
                1
            ],
            "c": [
                {
                    "n": [
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        128,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        128,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0
                    ]
                },
                {
                    "n": [
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        128,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        128,
                        0,
                        0,
                        0,
                        128,
                        0,
                        0,
                        0,
                        128,
                        0,
                        128,
                        0
                    ]
                },
                {
                    "n": [
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0
                    ]
                },
                {
                    "n": [
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        128,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        128,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0
                    ]
                }
            ]
        },
        {
            "osc1_oct": 6,
            "osc1_det": 0,
            "osc1_detune": 0,
            "osc1_xenv": 0,
            "osc1_vol": 255,
            "osc1_waveform": 1,
            "osc2_oct": 7,
            "osc2_det": 0,
            "osc2_detune": 0,
            "osc2_xenv": 0,
            "osc2_vol": 154,
            "osc2_waveform": 1,
            "noise_fader": 0,
            "env_attack": 197,
            "env_sustain": 88,
            "env_release": 10614,
            "env_master": 45,
            "fx_filter": 2,
            "fx_freq": 4425,
            "fx_resonance": 163,
            "fx_delay_time": 8,
            "fx_delay_amt": 119,
            "fx_pan_freq": 3,
            "fx_pan_amt": 158,
            "lfo_osc1_freq": 0,
            "lfo_fx_freq": 0,
            "lfo_freq": 0,
            "lfo_amt": 0,
            "lfo_waveform": 0,
            "p": [
                2,
                3,
                2,
                3,
                2,
                3,
                2,
                3,
                2,
                3,
                4,
                5,
                2,
                3,
                2,
                3,
                2,
                3,
                4,
                5,
                2,
                3,
                2,
                3,
                2,
                3,
                4,
                5,
                0,
                0,
                0,
                0,
                0,
                0,
                0,
                0,
                2,
                3,
                2,
                3,
                2,
                3,
                4,
                5,
                2,
                3,
                2,
                2
            ],
            "c": [
                {
                    "n": [
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        128,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        133,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0
                    ]
                },
                {
                    "n": [
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        135,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        135,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0
                    ]
                },
                {
                    "n": [
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        143,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        142,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0
                    ]
                },
                {
                    "n": [
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        133,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        133,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0
                    ]
                },
                {
                    "n": [
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        137,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        138,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0
                    ]
                }
            ]
        },
        {
            "osc1_oct": 7,
            "osc1_det": 0,
            "osc1_detune": 0,
            "osc1_xenv": 1,
            "osc1_vol": 144,
            "osc1_waveform": 3,
            "osc2_oct": 6,
            "osc2_det": 0,
            "osc2_detune": 9,
            "osc2_xenv": 1,
            "osc2_vol": 162,
            "osc2_waveform": 0,
            "noise_fader": 255,
            "env_attack": 663,
            "env_sustain": 0,
            "env_release": 1584,
            "env_master": 37,
            "fx_filter": 1,
            "fx_freq": 6531,
            "fx_resonance": 132,
            "fx_delay_time": 12,
            "fx_delay_amt": 9,
            "fx_pan_freq": 0,
            "fx_pan_amt": 0,
            "lfo_osc1_freq": 0,
            "lfo_fx_freq": 0,
            "lfo_freq": 5,
            "lfo_amt": 0,
            "lfo_waveform": 0,
            "p": [
                0,
                0,
                0,
                0,
                4,
                4,
                4,
                4,
                4,
                4,
                4,
                4,
                4,
                4,
                4,
                4,
                4,
                4,
                4,
                4,
                4,
                4,
                4,
                4,
                4,
                4,
                4,
                4,
                3,
                3,
                3,
                3,
                3,
                3,
                3,
                3,
                4,
                4,
                4,
                4,
                4,
                4,
                4,
                4,
                4,
                4,
                0,
                0
            ],
            "c": [
                {
                    "n": [
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        140,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        145,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0
                    ]
                },
                {
                    "n": [
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        147,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        152,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0
                    ]
                },
                {
                    "n": [
                        152,
                        0,
                        0,
                        0,
                        152,
                        0,
                        0,
                        0,
                        152,
                        0,
                        0,
                        0,
                        152,
                        0,
                        0,
                        0,
                        152,
                        0,
                        0,
                        0,
                        152,
                        0,
                        0,
                        0,
                        152,
                        0,
                        0,
                        0,
                        152,
                        0,
                        0,
                        0
                    ]
                },
                {
                    "n": [
                        152,
                        0,
                        152,
                        0,
                        152,
                        0,
                        0,
                        0,
                        152,
                        0,
                        152,
                        0,
                        152,
                        0,
                        0,
                        0,
                        152,
                        0,
                        152,
                        0,
                        152,
                        0,
                        0,
                        0,
                        152,
                        0,
                        152,
                        0,
                        152,
                        0,
                        0,
                        0
                    ]
                }
            ]
        },
        {
            "osc1_oct": 7,
            "osc1_det": 0,
            "osc1_detune": 0,
            "osc1_xenv": 0,
            "osc1_vol": 63,
            "osc1_waveform": 2,
            "osc2_oct": 7,
            "osc2_det": 0,
            "osc2_detune": 0,
            "osc2_xenv": 0,
            "osc2_vol": 125,
            "osc2_waveform": 0,
            "noise_fader": 0,
            "env_attack": 444,
            "env_sustain": 3706,
            "env_release": 10614,
            "env_master": 124,
            "fx_filter": 0,
            "fx_freq": 2727,
            "fx_resonance": 199,
            "fx_delay_time": 0,
            "fx_delay_amt": 125,
            "fx_pan_freq": 3,
            "fx_pan_amt": 47,
            "lfo_osc1_freq": 1,
            "lfo_fx_freq": 0,
            "lfo_freq": 14,
            "lfo_amt": 0,
            "lfo_waveform": 1,
            "p": [
                0,
                0,
                0,
                0,
                2,
                2,
                2,
                2,
                2,
                2,
                3,
                4,
                2,
                2,
                2,
                2,
                2,
                2,
                3,
                4,
                2,
                2,
                2,
                2,
                2,
                2,
                3,
                4,
                2,
                2,
                2,
                2,
                2,
                2,
                3,
                4,
                2,
                2,
                2,
                2,
                2,
                2,
                3,
                4
            ],
            "c": [
                {
                    "n": [
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        159,
                        0,
                        0,
                        0,
                        157,
                        0,
                        157,
                        0,
                        0,
                        0,
                        157,
                        0,
                        0,
                        0,
                        152,
                        0,
                        0
                    ]
                },
                {
                    "n": [
                        123,
                        0,
                        0,
                        0,
                        126,
                        0,
                        0,
                        0,
                        128,
                        0,
                        0,
                        0,
                        130,
                        0,
                        0,
                        0,
                        131,
                        0,
                        0,
                        0,
                        130,
                        0,
                        0,
                        0,
                        128,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0
                    ]
                },
                {
                    "n": [
                        130,
                        0,
                        0,
                        0,
                        131,
                        0,
                        0,
                        0,
                        128,
                        0,
                        0,
                        0,
                        126,
                        0,
                        0,
                        0,
                        125,
                        0,
                        0,
                        0,
                        123,
                        0,
                        0,
                        0,
                        121,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0
                    ]
                },
                {
                    "n": [
                        123,
                        0,
                        0,
                        0,
                        121,
                        0,
                        0,
                        0,
                        123,
                        0,
                        0,
                        0,
                        125,
                        0,
                        0,
                        0,
                        126,
                        0,
                        0,
                        0,
                        125,
                        0,
                        0,
                        0,
                        121,
                        0,
                        0,
                        0,
                        123,
                        0,
                        0,
                        0
                    ]
                }
            ]
        },
        {
            "osc1_oct": 9,
            "osc1_det": 0,
            "osc1_detune": 0,
            "osc1_xenv": 1,
            "osc1_vol": 64,
            "osc1_waveform": 1,
            "osc2_oct": 5,
            "osc2_det": 0,
            "osc2_detune": 0,
            "osc2_xenv": 0,
            "osc2_vol": 128,
            "osc2_waveform": 3,
            "noise_fader": 0,
            "env_attack": 1776,
            "env_sustain": 7105,
            "env_release": 19736,
            "env_master": 119,
            "fx_filter": 1,
            "fx_freq": 1523,
            "fx_resonance": 128,
            "fx_delay_time": 10,
            "fx_delay_amt": 39,
            "fx_pan_freq": 3,
            "fx_pan_amt": 92,
            "lfo_osc1_freq": 0,
            "lfo_fx_freq": 1,
            "lfo_freq": 2,
            "lfo_amt": 0,
            "lfo_waveform": 3,
            "p": [
                0,
                0,
                0,
                0,
                0,
                0,
                0,
                0,
                0,
                0,
                0,
                0,
                2,
                2,
                2,
                3,
                2,
                2,
                2,
                7,
                2,
                2,
                2,
                3,
                2,
                2,
                2,
                7,
                8,
                8,
                8,
                8,
                8,
                8,
                9,
                10,
                2,
                2,
                2,
                2,
                2,
                2,
                3,
                7
            ],
            "c": [
                {
                    "n": [
                        140,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        147,
                        0,
                        0,
                        0,
                        145,
                        0,
                        0,
                        0
                    ]
                },
                {
                    "n": [
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        133,
                        0,
                        0,
                        0,
                        135,
                        0,
                        0,
                        0
                    ]
                },
                {
                    "n": [
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        130,
                        0,
                        0,
                        0,
                        133,
                        0,
                        0,
                        0,
                        135,
                        0,
                        0,
                        0
                    ]
                },
                {
                    "n": [
                        145,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        145,
                        0,
                        0,
                        0,
                        147,
                        0,
                        0,
                        0
                    ]
                },
                {
                    "n": [
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0
                    ]
                },
                {
                    "n": [
                        135,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        145,
                        0,
                        0,
                        0,
                        147,
                        0,
                        0,
                        0
                    ]
                },
                {
                    "n": [
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        137,
                        0,
                        0,
                        0,
                        138,
                        0,
                        0,
                        0,
                        137,
                        0,
                        0,
                        0,
                        133,
                        0,
                        0,
                        0,
                        135,
                        0,
                        0,
                        0
                    ]
                },
                {
                    "n": [
                        135,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        145,
                        0,
                        0,
                        0,
                        147,
                        0,
                        0,
                        0
                    ]
                },
                {
                    "n": [
                        137,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        142,
                        0,
                        0,
                        0,
                        145,
                        0,
                        0,
                        0,
                        147,
                        0,
                        0,
                        0
                    ]
                },
                {
                    "n": [
                        140,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        152,
                        0,
                        0,
                        0,
                        149,
                        0,
                        0,
                        0,
                        150,
                        0,
                        0,
                        0,
                        149,
                        0,
                        0,
                        0,
                        145,
                        0,
                        0,
                        0,
                        147,
                        0,
                        0,
                        0
                    ]
                }
            ]
        },
        {
            "osc1_oct": 7,
            "osc1_det": 0,
            "osc1_detune": 0,
            "osc1_xenv": 1,
            "osc1_vol": 123,
            "osc1_waveform": 1,
            "osc2_oct": 8,
            "osc2_det": 0,
            "osc2_detune": 25,
            "osc2_xenv": 1,
            "osc2_vol": 166,
            "osc2_waveform": 0,
            "noise_fader": 0,
            "env_attack": 37768,
            "env_sustain": 19084,
            "env_release": 24610,
            "env_master": 43,
            "fx_filter": 4,
            "fx_freq": 4798,
            "fx_resonance": 167,
            "fx_delay_time": 8,
            "fx_delay_amt": 93,
            "fx_pan_freq": 6,
            "fx_pan_amt": 61,
            "lfo_osc1_freq": 0,
            "lfo_fx_freq": 1,
            "lfo_freq": 3,
            "lfo_amt": 67,
            "lfo_waveform": 0,
            "p": [
                0,
                0,
                0,
                0,
                0,
                0,
                0,
                0,
                0,
                0,
                0,
                0,
                2,
                2,
                2,
                2,
                2,
                2,
                3,
                2,
                2,
                2,
                2,
                2,
                2,
                2,
                3,
                5,
                5,
                5,
                5,
                5,
                5,
                5,
                6,
                2,
                2,
                2,
                2,
                2,
                2,
                2,
                3
            ],
            "c": [
                {
                    "n": [
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0
                    ]
                },
                {
                    "n": [
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        135,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0
                    ]
                },
                {
                    "n": [
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        137,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0
                    ]
                },
                {
                    "n": [
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0
                    ]
                },
                {
                    "n": [
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        147,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0
                    ]
                },
                {
                    "n": [
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        149,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0
                    ]
                }
            ]
        }
    ],
    "songLen": 80
};





//------------------------------------------------------------
// Beat detection - Taken from sontant-x-live
// http://nicolas-van.github.io/sonant-x-live/
//------------------------------------------------------------

/*
HOW SONANTX WORKS:
p - sequencer column listed in order from left to right. Holds an array of numbers 1-n where n is the number of different variation patterns for that sequencer column. Each number corresponds to an index of array `n` which determines the pattern from that measure.
c - array of patterns for each p
n - array of notes for each beat. index of n corresponds to a value in p.

TODO: copy sonant-x-live code for getting the currently playing sequence to light up their led - turn this into beat detection.

startFollower - sets the timeout for updateFollower every 16 miliseconds
updateFollower - sets sequencer and pattern hover to visually show where in the song it is
redrawPlayerGfx - draws the lit led when a note is played
*/

/**
 * Cross browser audio support.
 */
window.audioCtx = (function() {
  return window.AudioContext ||
         window.webkitAudioContext;
})();

var audioContext = new audioCtx();

function getSamplesSinceNote (t, chan) {
  var nFloat = t * 44100 / song.rowLen;
  var n = nFloat | 0;
  var seqPos0 = n / 32 | 0;
  var patPos0 = n % 32;
  for (var k = 0; k < 32; ++k)
  {
    var seqPos = seqPos0;
    var patPos = patPos0 - k;
    while (patPos < 0)
    {
      --seqPos;
      if (seqPos < 0) return -1;
      patPos += 32;
    }
    var pat = song.songData[chan].p[seqPos] - 1;
    if (pat >= 0 && song.songData[chan].c[pat].n[patPos] > 0)
    {
      return (k + (nFloat - n)) * song.rowLen;
    }
  }
  return -1;
};

/**
 * Update the position of the audio timer.
 */
function updateAudio() {
  if (!songLoaded || !gameStarted || gamePaused) return;

  time = backgroundAudio.currentTime;

  // the audio gets a small delay at the end, so we'll cut the audio short
  if (time >= 77.4) {
    backgroundAudio.currentTime = 1;
    timeSinceLastBeat = 0;
    newBeat = true;
  }
}

/**
 * Get the beat strength and trigger a new beat.
 */
function drawAudio() {
  if (time === 0) return;

  for (var i = 1; i < 2; i++) {
    if (song.songData[i]) {
      // Get envelope profile for this channel
      var env_a = song.songData[i].env_attack,
          env_r = song.songData[i].env_sustain + song.songData[i].env_release,
          env_tot = env_a + env_r;
      if (env_tot < 10000) {
        env_tot = 10000;
        env_r = env_tot - env_a;
      }

      // Get number of samples since last new note
      var numSamp = getSamplesSinceNote(time, i);
      if (numSamp >= 0 && numSamp < env_tot) {
        // Calculate current envelope (same method as the synth, except sustain)
        if (numSamp < env_a) {
          beatStrength = numSamp / env_a;
        }
        else {
          beatStrength = 1 - (numSamp - env_a) / env_r;
        }

        // only allow newBeats after a threshold
        if (beatStrength > 0.8 && newBeat && time - timeSinceLastBeat > beatThreshold) {
          timeSinceLastBeat = time;
          newBeat = false;
          if (songLoaded && gameStarted && !gamePaused) {
            spawnElement();
          }
        }
        else {
          newBeat = true;
        }
      }
    }
  }
}

// create song
var songGen = new sonantx.MusicGenerator(song);

songGen.createAudio(function(audio) {
  songLoaded = true;
  backgroundAudio = audio;

  // wait for lag to end from loading the audio
  setTimeout(function() {
    game.audioLoaded();
  }, 500);
}, onProgress);


var current = 0;
var lastCurrent = 0;
var max;

/**
 * Update the progress percentage when loading the audio.
 */
function onProgress(c, m) {
  // console.log(c / m);
  current = c;
  max = m;
}

/**
 * Erase the effectsCtx black fill to show progress of audio loading.
 */
progress = setInterval(function () {
  effectsCtx.save();

  if (lastCurrent < current) {
    var start = degToRad(-90);
    var angle = degToRad(lastCurrent / max * circle) + start;
    lastCurrent+=.05;
  }

  effectsCtx.moveTo(planetX, planetY);
  effectsCtx.arc(planetX, planetY, 200, start, angle);
  effectsCtx.clip();
  effectsCtx.clearRect(100,100,400,400);

  effectsCtx.restore();
}, delta);





//------------------------------------------------------------
// Animation
//------------------------------------------------------------
function animate() {
  rAF = requestAnimationFrame(animate);

  now = timestamp();
  dt = now - (last || now);
  last = now;

  accumulator += dt;

  if (gameStarted && !gameEnded) {
    gameTime += dt;
  }

  while (accumulator >= delta) {
    planet.update();
    updateElements();
    updateText();
    updateAudio();

    accumulator -= delta;
  }

  osCtx.clearRect(0, 0, 600,600);
  drawAtmosphere();
  planet.draw();
  drawElements();
  effectsCtx.clearRect(0,0,600,600);
  effectsCtx.drawImage(osCanvas, 0, 0);
  effectsCtx.fillText(habitability+'%', planetX-10, planetY+8);
  drawText();
  drawAudio();
}

document.addEventListener( 'visibilitychange', onVisibilityChange, false);

/**
 *  pause the game when the window isn't visible.
 */
function onVisibilityChange() {
  if( document.hidden ){
    cancelAnimationFrame(rAF);
    rAF = null;
    last = 0;
    gamePaused = true;
    if (backgroundAudio) {
      backgroundAudio.pause();
    }
  }
  else if(gamePaused){
    gamePaused = false;

    if (gameStarted && !gameEnded) {
      rAF = requestAnimationFrame(animate);
      backgroundAudio.play();
    }
  }
}


/**
 * Clear just the numbers for the element composition.
 */
function drawHUD() {
  var tiles = 0;

  ctx.clearRect(85,0,25,100);
  ctx.save();

  var y = 20;
  for (var i = 0, len = elementTypes.length; i < len; i++) {
    var type = elementTypes[i];
    var color = elementTextColors[type];

    ctx.fillStyle = color;
    ctx.fillText(tileCount[type], 90, y);

    y+=20;

    tiles += tileCount[type];
  }

  ctx.restore();

  if (tiles === NUM_TILES*NUM_RINGS) {
    game.end();
  }
}


/**
 * Highlight the type of the tile being changed.
 */
function highlightComposition(type) {
  var str = capitaliseFirstLetter(type);
  var x = 8;
  var y;

  switch(type) {
    case 'water':
      y = 22;
      break;
    case 'earth':
      y = 42;
      break;
    case 'air':
      y = 62;
      break;
    case 'fire':
      y = 82;
      break;
  }

  texts.push(new Text(str, x, y, 0, 0, elementTextColors[type], 25));
}

/**
 * Draw the pulsing atmosphere to the beat.
 */
function drawAtmosphere() {
  // atmosphere
  atmoCtx.clearRect(0,0,600,600);
  var grad = atmoCtx.createRadialGradient(
    planetX, planetY, planetRadius,
    planetX, planetY, planetRadius+15+20*beatStrength
  );
  grad.addColorStop(0, 'rgba(25,159,229,0.8)');
  grad.addColorStop(1, 'rgba(25,159,229,0)');
  atmoCtx.fillStyle = grad;
  atmoCtx.fillRect(0,0,canvas.width,canvas.height);
}
})(window, document)