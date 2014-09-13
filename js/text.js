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