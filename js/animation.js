//------------------------------------------------------------
// Animation
//------------------------------------------------------------
function animate() {
  rAF = requestAnimationFrame(animate);

  now = timestamp();
  dt = now - (last || now);
  last = now;

  accumulator += dt;

  if (gameStarted && !gameEnded) {
    gameTime += dt;
  }

  while (accumulator >= delta) {
    planet.update();
    updateElements();
    updateText();
    updateAudio();

    accumulator -= delta;
  }

  osCtx.clearRect(0, 0, 600,600);
  drawAtmosphere();
  planet.draw();
  drawElements();
  effectsCtx.clearRect(0,0,600,600);
  effectsCtx.drawImage(osCanvas, 0, 0);
  effectsCtx.fillText(habitability+'%', planetX-10, planetY+8);
  drawText();
  drawAudio();
}

document.addEventListener( 'visibilitychange', onVisibilityChange, false);

/**
 *  pause the game when the window isn't visible.
 */
function onVisibilityChange() {
  if( document.hidden ){
    cancelAnimationFrame(rAF);
    rAF = null;
    last = 0;
    gamePaused = true;
    if (backgroundAudio) {
      backgroundAudio.pause();
    }
  }
  else if(gamePaused){
    gamePaused = false;

    if (gameStarted && !gameEnded) {
      rAF = requestAnimationFrame(animate);
      backgroundAudio.play();
    }
  }
}


/**
 * Clear just the numbers for the element composition.
 */
function drawHUD() {
  var tiles = 0;

  ctx.clearRect(85,0,25,100);
  ctx.save();

  var y = 20;
  for (var i = 0, len = elementTypes.length; i < len; i++) {
    var type = elementTypes[i];
    var color = elementTextColors[type];

    ctx.fillStyle = color;
    ctx.fillText(tileCount[type], 90, y);

    y+=20;

    tiles += tileCount[type];
  }

  ctx.restore();

  if (tiles === NUM_TILES*NUM_RINGS) {
    game.end();
  }
}


/**
 * Highlight the type of the tile being changed.
 */
function highlightComposition(type) {
  var str = capitaliseFirstLetter(type);
  var x = 8;
  var y;

  switch(type) {
    case 'water':
      y = 22;
      break;
    case 'earth':
      y = 42;
      break;
    case 'air':
      y = 62;
      break;
    case 'fire':
      y = 82;
      break;
  }

  texts.push(new Text(str, x, y, 0, 0, elementTextColors[type], 25));
}

/**
 * Draw the pulsing atmosphere to the beat.
 */
function drawAtmosphere() {
  // atmosphere
  atmoCtx.clearRect(0,0,600,600);
  var grad = atmoCtx.createRadialGradient(
    planetX, planetY, planetRadius,
    planetX, planetY, planetRadius+15+20*beatStrength
  );
  grad.addColorStop(0, 'rgba(25,159,229,0.8)');
  grad.addColorStop(1, 'rgba(25,159,229,0)');
  atmoCtx.fillStyle = grad;
  atmoCtx.fillRect(0,0,canvas.width,canvas.height);
}