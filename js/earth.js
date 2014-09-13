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