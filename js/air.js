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