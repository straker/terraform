//------------------------------------------------------------
// Utilities
//------------------------------------------------------------

/**
 * Get the current time.
 */
function timestamp() {
  return window.performance && window.performance.now ? window.performance.now() : new Date().getTime();
}

/**
 * convert degrees to radians
 */
function degToRad(deg) {
  return deg * toRad;
}

/**
 * Get the x,y coordinate of a point along a circle
 */
function getPointAlongCircle(x, y, r, angle) {
  var rad = degToRad(angle);
  return {
    x: x + r * cos(rad),
    y: y + r * sin(rad)
  }
}

/**
 * Easing equations from http://gizma.com/easing/
 */
function easeInOutQuad(t, b, c, d) {
  t /= d/2;
  if (t < 1) return c/2*t*t + b;
  t--;
  return -c/2 * (t*(t-2) - 1) + b;
}

function easeOutQuad(t, b, c, d) {
  t /= d;
  return -c * t*(t-2) + b;
}


function easeOutExpo(t, b, c, d) {
  return c * ( -Math.pow( 2, -10 * t/d ) + 1 ) + b;
};

/**
 * Normalize an angle between 0 and 359
 */
function normalizeAngle(angle) {
  var newAngle = angle;
  while (newAngle <= 0) newAngle += circle;
  while (newAngle > circle) newAngle -= circle;
  return newAngle % circle;
}

/**
 * Get a random decimal between two values.
 */
function rand(min, max) {
  return random() * (max - min) + min;
}

/**
 * Get which level a radius belongs to.
 */
function getLevel(radius) {
  var level;
  for (var i = 0; i < NUM_RINGS; i++) {
    level = levels[i]
    if (radius <= level.rTop && radius > level.rBottom) {
      return i;
    }
  }
}

/**
 * Get a random integer between two values.
 */
function randomIntFromInterval(min,max) {
  return Math.floor(random()*(max-min+1)+min);
}

/**
 * Calculate the distance between two points.
 */
function calcDist(x, y) {
  return Math.sqrt(x * x + y * y);
}

/**
 * Get a random value from nD6 dice roll.
 */
function dSix(num) {
  var value = 0;
  while (num--) {
    value += randomIntFromInterval(1, 6);
  }

  return value;
}

/**
 * Remove an item from an array without using splice as to not cause a garbage collection.
 */
function removeFromArray(array, index) {
  var i, len;
  for (i = index, len = array.length-1; i < len; i++) {
    array[i] = array[i+1];
  }

  array.length = len;
}

/**
 * Capitalize the first letter of a string.
 */
function capitaliseFirstLetter(string) {
  return string.charAt(0).toUpperCase() + string.slice(1);
}

/**
 * Hide a dom element.
 */
function hide(dom) {
  dom.style.display = 'none';
}

/**
 * Show a dom element.
 */
function show(dom) {
  dom.style.display = 'block';
}

/**
 * Convert milliseconds to minutes
 */
function msToMinutes(duration) {
  return parseInt((duration/(1E3*60))%60);
}

/**
 * Convert milliseconds to mm:ss format.
 */
function msToTime(duration) {
  var seconds = parseInt((duration/1E3)%60);
  var minutes = msToMinutes(duration);

  minutes = (minutes < 10) ? '0' + minutes : minutes;
  seconds = (seconds < 10) ? '0' + seconds : seconds;

  return minutes + ':' + seconds;
}