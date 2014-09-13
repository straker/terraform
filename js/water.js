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