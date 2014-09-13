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