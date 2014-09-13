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