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