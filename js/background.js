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