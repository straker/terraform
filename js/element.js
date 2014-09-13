//------------------------------------------------------------
// Element
//------------------------------------------------------------
function Element(distance, angle, type) {
  var element = this;

  var index = round(rand(0, 3));

  element.distance = distance;
  element.angle = angle;
  element.type = type || elementTypes[index];
  element.color = elementColors[element.type];
  element.dx = (difficulty === 'easy' ? -1 : -1.25);

  // spawn the correct element type
  var point = getPointAlongCircle(planetX, planetY, element.distance, 0);
  switch (element.type) {
    case 'water':
      element.effect = new Water(point.x, point.y, element.dx, osCtx);
      break;
    case 'earth':
      element.effect = new Earth(point.x, point.y, element.dx, osCtx);
      break;
    case 'air':
      element.effect = new Air(point.x, point.y, element.dx, osCtx);
      break;
    case 'fire':
      element.effect = new Fire(point.x, point.y, element.dx, osCtx);
      break;
  }

  /**
   * Update the element.
   */
  element.update = function() {
    element.distance += element.dx;

    if (element.effect) {
      element.effect.update();
    }
  }

  /**
   * Draw the element.
   */
  element.draw = function() {
    osCtx.save();

    osCtx.translate(planetX, planetY);
    osCtx.rotate((element.angle + (theta / 2)) * toRad);
    osCtx.translate(-planetX, -planetY);
    element.effect.draw();

    osCtx.restore();
  }
}

/**
 * Update all elements.
 */
function updateElements() {
  var i = 0;
  while (i < elements.length) {
    var element = elements[i];
    var elementDistance = element.distance;

    element.update();

    // element is close enough to the planet to cause a reaction
    if (elementDistance <= planetRadius) {

      // ensure that the angle is a multiple of theta
      var elementAngle = element.angle;
      var angle = normalizeAngle(elementAngle - planet.angle);
      angle = round(angle / theta) * theta % circle

      var level = getLevel(elementDistance);

      if (elementDistance < 0) {
        removeFromArray(elements, i);
      }

      if (level === undefined) continue;

      var tile = tiles[level][angle];
      var tileType = tile.type;

      // empty title
      if (tileType === 'planet') {
        tile.changeType(element.type);
      }
      // reaction tile
      else {
        var reaction = reactions[element.type][tileType];
        var point = getPointAlongCircle(planetX, planetY, elementDistance, elementAngle);

        switch(reaction) {
          // remove the element from the tile
          case 'destroy':
            tile.changeType('planet');
            break;
          // spawn 2 elements on each side of the tile and 1 below
          case 'enhance':
            elements.push(new Element(planet.radius, normalizeAngle(element.angle+theta), tileType));
            elements.push(new Element(planet.radius, normalizeAngle(element.angle-theta), tileType));
            elements.push(new Element(levels[level].rBottom, normalizeAngle(element.angle), tileType));
            break;
          // spawn 1 element below the tile
          case 'push':
            elements.push(new Element(levels[level].rBottom, normalizeAngle(element.angle), tileType));
            break;
        }
      }

      removeFromArray(elements, i);
    }
    else {
      i++;
    }
  }
}

/**
 * Draw all the elements.
 */
function drawElements() {
  for (i = 0; i < elements.length; i++) {
    elements[i].draw();
  }
}

/**
 * Spawn a new element into play.
 */
function spawnElement(t) {
  var radius = 320;
  var angle = theta*randomIntFromInterval(0, NUM_TILES-1);
  var r = random();
  var type;

  // get the type based on its odds
  for (var i = 0; i < 4; i++) {
    if (r <= elementOdds[i]) {
      type = elementTypes[i];
      break;
    }
  }

  drawElementType(type, radius, angle);
  elements.push(new Element(radius, angle, type));
}

/**
 * Draw the element type when an element spawns.
 */
function drawElementType(type, radius, angle) {
  var point = getPointAlongCircle(planetX, planetY, radius-TILE_HEIGHT, angle + (theta / 2));
  texts.push(new Text(type, point.x, point.y, 0, -2, elementTextColors[type]));
}