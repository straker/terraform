//------------------------------------------------------------
// Beat detection - Taken from sontant-x-live
// http://nicolas-van.github.io/sonant-x-live/
//------------------------------------------------------------

/*
HOW SONANTX WORKS:
p - sequencer column listed in order from left to right. Holds an array of numbers 1-n where n is the number of different variation patterns for that sequencer column. Each number corresponds to an index of array `n` which determines the pattern from that measure.
c - array of patterns for each p
n - array of notes for each beat. index of n corresponds to a value in p.

TODO: copy sonant-x-live code for getting the currently playing sequence to light up their led - turn this into beat detection.

startFollower - sets the timeout for updateFollower every 16 miliseconds
updateFollower - sets sequencer and pattern hover to visually show where in the song it is
redrawPlayerGfx - draws the lit led when a note is played
*/

/**
 * Cross browser audio support.
 */
window.audioCtx = (function() {
  return window.AudioContext ||
         window.webkitAudioContext;
})();

var audioContext = new audioCtx();

function getSamplesSinceNote (t, chan) {
  var nFloat = t * 44100 / song.rowLen;
  var n = nFloat | 0;
  var seqPos0 = n / 32 | 0;
  var patPos0 = n % 32;
  for (var k = 0; k < 32; ++k)
  {
    var seqPos = seqPos0;
    var patPos = patPos0 - k;
    while (patPos < 0)
    {
      --seqPos;
      if (seqPos < 0) return -1;
      patPos += 32;
    }
    var pat = song.songData[chan].p[seqPos] - 1;
    if (pat >= 0 && song.songData[chan].c[pat].n[patPos] > 0)
    {
      return (k + (nFloat - n)) * song.rowLen;
    }
  }
  return -1;
};

/**
 * Update the position of the audio timer.
 */
function updateAudio() {
  if (!songLoaded || !gameStarted || gamePaused) return;

  time = backgroundAudio.currentTime;

  // the audio gets a small delay at the end, so we'll cut the audio short
  if (time >= 77.4) {
    backgroundAudio.currentTime = 1;
    timeSinceLastBeat = 0;
    newBeat = true;
  }
}

/**
 * Get the beat strength and trigger a new beat.
 */
function drawAudio() {
  if (time === 0) return;

  for (var i = 1; i < 2; i++) {
    if (song.songData[i]) {
      // Get envelope profile for this channel
      var env_a = song.songData[i].env_attack,
          env_r = song.songData[i].env_sustain + song.songData[i].env_release,
          env_tot = env_a + env_r;
      if (env_tot < 10000) {
        env_tot = 10000;
        env_r = env_tot - env_a;
      }

      // Get number of samples since last new note
      var numSamp = getSamplesSinceNote(time, i);
      if (numSamp >= 0 && numSamp < env_tot) {
        // Calculate current envelope (same method as the synth, except sustain)
        if (numSamp < env_a) {
          beatStrength = numSamp / env_a;
        }
        else {
          beatStrength = 1 - (numSamp - env_a) / env_r;
        }

        // only allow newBeats after a threshold
        if (beatStrength > 0.8 && newBeat && time - timeSinceLastBeat > beatThreshold) {
          timeSinceLastBeat = time;
          newBeat = false;
          if (songLoaded && gameStarted && !gamePaused) {
            spawnElement();
          }
        }
        else {
          newBeat = true;
        }
      }
    }
  }
}

// create song
var songGen = new sonantx.MusicGenerator(song);

songGen.createAudio(function(audio) {
  songLoaded = true;
  backgroundAudio = audio;

  // wait for lag to end from loading the audio
  setTimeout(function() {
    game.audioLoaded();
  }, 500);
}, onProgress);


var current = 0;
var lastCurrent = 0;
var max;

/**
 * Update the progress percentage when loading the audio.
 */
function onProgress(c, m) {
  // console.log(c / m);
  current = c;
  max = m;
}

/**
 * Erase the effectsCtx black fill to show progress of audio loading.
 */
progress = setInterval(function () {
  effectsCtx.save();

  if (lastCurrent < current) {
    var start = degToRad(-90);
    var angle = degToRad(lastCurrent / max * circle) + start;
    lastCurrent+=.05;
  }

  effectsCtx.moveTo(planetX, planetY);
  effectsCtx.arc(planetX, planetY, 200, start, angle);
  effectsCtx.clip();
  effectsCtx.clearRect(100,100,400,400);

  effectsCtx.restore();
}, delta);