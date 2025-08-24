const bpmElement = document.getElementById("bpm");
const beatsElement = document.getElementById("beats");
const energyElement = document.getElementById("energy");
const beatCircle = document.getElementById("beatCircle");
const visualizerCanvas = document.getElementById("visualizer");
const ctx = visualizerCanvas.getContext("2d");

const audioFileInput = document.getElementById("audioFile");
const playBtn = document.querySelector(".play");
const pauseBtn = document.querySelector(".pause");
const stopBtn = document.querySelector(".stop");

let audioContext, source, analyser, dataArray, bufferLength;
let isPlaying = false;
let beatsDetected = 0;
let energyHistory = [];
const historySize = 43; // ~1 sec window for moving average

function setupAudio(file) {
  audioContext = new (window.AudioContext || window.webkitAudioContext)();
  analyser = audioContext.createAnalyser();
  analyser.fftSize = 256;
  bufferLength = analyser.frequencyBinCount;
  dataArray = new Uint8Array(bufferLength);

  const reader = new FileReader();
  reader.onload = async (e) => {
    const buffer = await audioContext.decodeAudioData(e.target.result);
    source = audioContext.createBufferSource();
    source.buffer = buffer;
    source.connect(analyser);
    analyser.connect(audioContext.destination);
    source.start();
    isPlaying = true;
    drawVisualizer();
    detectBeats();
  };
  reader.readAsArrayBuffer(file);
}

// 🎵 Equalizer Drawing
function drawVisualizer() {
  if (!isPlaying) return;
  analyser.getByteFrequencyData(dataArray);

  ctx.clearRect(0, 0, visualizerCanvas.width, visualizerCanvas.height);
  let barWidth = (visualizerCanvas.width / bufferLength) * 2.5;
  let x = 0;

  for (let i = 0; i < bufferLength; i++) {
    let barHeight = dataArray[i];
    let hue = (barHeight * 1.5 + performance.now() / 20) % 360; // changes over time
    ctx.fillStyle = `hsl(${hue}, 100%, 50%)`; // RGB effect using HSL
    ctx.fillRect(x, visualizerCanvas.height - barHeight, barWidth, barHeight);
    x += barWidth + 1;
}

  requestAnimationFrame(drawVisualizer);
}

// 🎵 Beat Detection
function detectBeats() {
  if (!isPlaying) return;
  analyser.getByteFrequencyData(dataArray);

  let energy = dataArray.reduce((a, b) => a + b, 0) / bufferLength;
  let energyPercent = (energy / 255 * 100).toFixed(1);
  let lastBeatTime = 0;
  let beatIntervals = [];
  energyHistory.push(energy);
  if (energyHistory.length > historySize) energyHistory.shift();

  let avgEnergy = energyHistory.reduce((a, b) => a + b, 0) / energyHistory.length;

  if (energy > avgEnergy * 1.3) {
    beatsDetected++;
    let now = performance.now();
    if (lastBeatTime === 0) {
      let interval = (now - lastBeatTime) / 1000; // seconds
      beatIntervals.push(interval);

      // Keep only last 10 intervals for smoothing
      if (beatIntervals.length > 10) beatIntervals.shift();

      // Average interval → BPM
      let avgInterval = beatIntervals.reduce((a, b) => a + b, 0) / beatIntervals.length;
      let bpm = 60 / avgInterval;
      bpmElement.textContent = bpm.toFixed(1);
    }
    lastBeatTime = now;
    beatCircle.style.background = "red";
    beatCircle.style.transform = "scale(1.2)";
    setTimeout(() => {
      beatCircle.style.background = "darkred";
      beatCircle.style.transform = "scale(1)";
    }, 150);
  }

  energyElement.textContent = energyPercent + "%";
  beatsElement.textContent = beatsDetected;

  requestAnimationFrame(detectBeats);
}

// 🎵 Controls
playBtn.addEventListener("click", () => {
  if (audioFileInput.files.length > 0 && !isPlaying) {
    setupAudio(audioFileInput.files[0]);
  }
});

pauseBtn.addEventListener("click", () => {
  if (audioContext && audioContext.state === "running") {
    audioContext.suspend();
    isPlaying = false;
  }
});

stopBtn.addEventListener("click", () => {
  if (source) {
    source.stop();
    isPlaying = false;
    beatsDetected = 0;
    bpmElement.textContent = "0";
    beatsElement.textContent = "0";
    energyElement.textContent = "0.0%";
    ctx.clearRect(0, 0, visualizerCanvas.width, visualizerCanvas.height);
  }
});
