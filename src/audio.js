// Web Audio API Ambient Sound Synthesizer
let audioCtx = null;
let waveNode = null;
let binauralNode = null;
let noiseNode = null;

function initAudioContext() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
}

// 1. Synthesize Calming Ocean Waves using Pink Noise and low frequency modulation
function startOceanWaves() {
  initAudioContext();
  if (waveNode) return;

  // Create pink-ish noise buffer
  const bufferSize = 4 * audioCtx.sampleRate;
  const noiseBuffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
  const output = noiseBuffer.getChannelData(0);
  
  let b0 = 0.0, b1 = 0.0, b2 = 0.0, b3 = 0.0, b4 = 0.0, b5 = 0.0, b6 = 0.0;
  for (let i = 0; i < bufferSize; i++) {
    const white = Math.random() * 2 - 1;
    // Pink noise filter approximation
    b0 = 0.99886 * b0 + white * 0.0555179;
    b1 = 0.99332 * b1 + white * 0.0750759;
    b2 = 0.96900 * b2 + white * 0.1538520;
    b3 = 0.86650 * b3 + white * 0.3104856;
    b4 = 0.55000 * b4 + white * 0.5329522;
    b5 = -0.7616 * b5 - white * 0.0168980;
    output[i] = b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362;
    output[i] *= 0.11; // scaling
    b6 = white * 0.115926;
  }

  const noiseSource = audioCtx.createBufferSource();
  noiseSource.buffer = noiseBuffer;
  noiseSource.loop = true;

  // Filter to make it sound muffled/underwater
  const filter = audioCtx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 400;

  // Modulate volume using a LFO (Low Frequency Oscillator) to simulate wave sweeps
  const gainNode = audioCtx.createGain();
  gainNode.gain.value = 0.05;

  const lfo = audioCtx.createOscillator();
  lfo.frequency.value = 0.12; // 8-second wave cycles

  const lfoGain = audioCtx.createGain();
  lfoGain.gain.value = 0.15; // modulation depth

  lfo.connect(lfoGain);
  lfoGain.connect(gainNode.gain);

  noiseSource.connect(filter);
  filter.connect(gainNode);
  gainNode.connect(audioCtx.destination);

  noiseSource.start(0);
  lfo.start(0);

  waveNode = { noiseSource, lfo, gainNode };
}

function stopOceanWaves() {
  if (waveNode) {
    try {
      waveNode.noiseSource.stop();
      waveNode.lfo.stop();
    } catch(e){}
    waveNode = null;
  }
}

// 2. Synthesize Binaural Alpha Beats (detuned sine waves at 200Hz and 208Hz to drive 8Hz calm)
function startBinauralBeats() {
  initAudioContext();
  if (binauralNode) return;

  const oscLeft = audioCtx.createOscillator();
  const oscRight = audioCtx.createOscillator();
  
  oscLeft.type = 'sine';
  oscLeft.frequency.value = 200; // Left ear carrier
  
  oscRight.type = 'sine';
  oscRight.frequency.value = 208; // Right ear (creates 8Hz alpha delta)

  const merger = audioCtx.createChannelMerger(2);
  const gainNode = audioCtx.createGain();
  gainNode.gain.value = 0.08; // quiet background hum

  oscLeft.connect(merger, 0, 0);
  oscRight.connect(merger, 0, 1);
  merger.connect(gainNode);
  gainNode.connect(audioCtx.destination);

  oscLeft.start(0);
  oscRight.start(0);

  binauralNode = { oscLeft, oscRight, gainNode };
}

function stopBinauralBeats() {
  if (binauralNode) {
    try {
      binauralNode.oscLeft.stop();
      binauralNode.oscRight.stop();
    } catch(e){}
    binauralNode = null;
  }
}

// 3. Synthesize Constant Focus Brown/Pink Noise
function startFocusNoise() {
  initAudioContext();
  if (noiseNode) return;

  const bufferSize = 2 * audioCtx.sampleRate;
  const noiseBuffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
  const output = noiseBuffer.getChannelData(0);
  
  // Brown noise algorithm (accummulated random walks)
  let lastOut = 0.0;
  for (let i = 0; i < bufferSize; i++) {
    const white = Math.random() * 2 - 1;
    output[i] = (lastOut + (0.02 * white)) / 1.02;
    lastOut = output[i];
    output[i] *= 3.5; // amplification
  }

  const source = audioCtx.createBufferSource();
  source.buffer = noiseBuffer;
  source.loop = true;

  const gainNode = audioCtx.createGain();
  gainNode.gain.value = 0.12;

  source.connect(gainNode);
  gainNode.connect(audioCtx.destination);
  source.start(0);

  noiseNode = { source, gainNode };
}

function stopFocusNoise() {
  if (noiseNode) {
    try {
      noiseNode.source.stop();
    } catch(e){}
    noiseNode = null;
  }
}

export const AudioEngine = {
  toggleOcean: (active) => active ? startOceanWaves() : stopOceanWaves(),
  toggleBinaural: (active) => active ? startBinauralBeats() : stopBinauralBeats(),
  toggleNoise: (active) => active ? startFocusNoise() : stopFocusNoise(),
  stopAll: () => {
    stopOceanWaves();
    stopBinauralBeats();
    stopFocusNoise();
  }
};
