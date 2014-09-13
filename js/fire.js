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