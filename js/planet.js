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