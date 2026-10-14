'use strict';

const select = (selector) => document.querySelector(selector);
const selectAll = (selector) => [...document.querySelectorAll(selector)];
const toast = select('#toast');
let toastTimer;
function notify(message) {
  if (!toast) return;
  clearTimeout(toastTimer);
  toast.textContent = message;
  toast.classList.add('visible');
  toastTimer = setTimeout(() => toast.classList.remove('visible'), 3000);
}

const menuToggle = select('.menu-toggle');
const mobileMenu = select('#mobile-menu');
function closeMenu() {
  if (!menuToggle || !mobileMenu) return;
  mobileMenu.hidden = true;
  menuToggle.setAttribute('aria-expanded', 'false');
  menuToggle.setAttribute('aria-label', '목차 열기');
}
menuToggle?.addEventListener('click', () => {
  const opening = mobileMenu.hidden;
  mobileMenu.hidden = !opening;
  menuToggle.setAttribute('aria-expanded', String(opening));
  menuToggle.setAttribute('aria-label', opening ? '목차 닫기' : '목차 열기');
});
mobileMenu?.addEventListener('click', (event) => {
  if (event.target.closest('a')) closeMenu();
});
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') closeMenu();
});
document.addEventListener('click', (event) => {
  if (mobileMenu && !mobileMenu.hidden && !event.target.closest('.site-header')) closeMenu();
});
const desktopQuery = matchMedia('(min-width:951px)');
desktopQuery.addEventListener('change', (event) => { if (event.matches) closeMenu(); });

const progressBar = select('.reading-progress span');
let scrollQueued = false;
function updateReadingProgress() {
  const maxScroll = document.documentElement.scrollHeight - innerHeight;
  const progress = maxScroll > 0 ? Math.max(0, Math.min(1, scrollY / maxScroll)) : 0;
  if (progressBar) progressBar.style.transform = `scaleX(${progress})`;
  scrollQueued = false;
}
addEventListener('scroll', () => {
  if (!scrollQueued) { scrollQueued = true; requestAnimationFrame(updateReadingProgress); }
}, { passive: true });
addEventListener('resize', updateReadingProgress);
selectAll('details').forEach((details) => details.addEventListener('toggle', updateReadingProgress));
updateReadingProgress();
const navLinks = selectAll('.desktop-nav a[href^="#"]');
if (navLinks.length) {
  const navObserver = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      navLinks.forEach((link) => {
        if (link.hash === `#${entry.target.id}`) link.setAttribute('aria-current', 'location');
        else link.removeAttribute('aria-current');
      });
    }
  }, { rootMargin: '-15% 0px -65% 0px', threshold: 0 });
  ['world', 'hari', 'past'].forEach((id) => {
    const section = document.getElementById(id);
    if (section) navObserver.observe(section);
  });
}

const soundButton = select('.sound-toggle');
let audioContext;
let rainSource;
let rainGain;
let soundPlaying = false;
let soundBusy = false;
async function createRainSound() {
  const AudioContextConstructor = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextConstructor) throw new Error('Web Audio unavailable');
  audioContext = new AudioContextConstructor();
  await audioContext.resume();
  const response = await fetch('gentle-rain.wav');
  if (!response.ok) throw new Error('Rain recording unavailable');
  const recording = await audioContext.decodeAudioData(await response.arrayBuffer());
  rainSource = audioContext.createBufferSource();
  rainSource.buffer = recording;
  rainSource.loop = true;
  rainGain = audioContext.createGain();
  rainGain.gain.value = 0;
  rainSource.connect(rainGain).connect(audioContext.destination);
  rainSource.start();
}
soundButton?.addEventListener('click', async () => {
  if (soundBusy) return;
  soundBusy = true;
  try {
    if (!audioContext) await createRainSound();
    if (!soundPlaying) {
      await audioContext.resume();
      rainGain.gain.cancelScheduledValues(audioContext.currentTime);
      rainGain.gain.setTargetAtTime(.5, audioContext.currentTime, .5);
    } else {
      rainGain.gain.cancelScheduledValues(audioContext.currentTime);
      rainGain.gain.setTargetAtTime(0, audioContext.currentTime, .12);
    }
    soundPlaying = !soundPlaying;
    soundButton.setAttribute('aria-pressed', String(soundPlaying));
    soundButton.setAttribute('aria-label', soundPlaying ? '빗소리 끄기' : '빗소리 켜기');
  } catch {
    if (audioContext) await audioContext.close().catch(() => {});
    audioContext = null;
    rainSource = null;
    rainGain = null;
    notify('빗소리를 불러오지 못했어요. 다시 눌러 주세요.');
  }
  finally { soundBusy = false; }
});
addEventListener('pagehide', () => { if (audioContext) audioContext.suspend(); });
addEventListener('pageshow', () => {
  if (audioContext && rainGain) {
    soundPlaying = false;
    rainGain.gain.value = 0;
    soundButton.setAttribute('aria-pressed', 'false');
    soundButton.setAttribute('aria-label', '빗소리 켜기');
  }
});

const rainCanvas = select('#rain-canvas');
if (rainCanvas) {
  const context = rainCanvas.getContext('2d');
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const hero = select('.hero');
  let width = 0;
  let height = 0;
  let drops = [];
  let heroVisible = false;
  let frameId = 0;
  let previousFrame = 0;
  function resizeRain() {
    width = hero.clientWidth;
    height = hero.clientHeight;
    const ratio = Math.min(devicePixelRatio || 1, 1.5);
    rainCanvas.width = Math.round(width * ratio);
    rainCanvas.height = Math.round(height * ratio);
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    drops = Array.from({ length: width < 760 ? 54 : 105 }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      length: 6 + Math.random() * 24,
      speed: 120 + Math.random() * 240,
      opacity: .1 + Math.random() * .22
    }));
  }
  function paintRain(now) {
    frameId = 0;
    if (reducedMotion.matches || !heroVisible || document.hidden) return;
    const delta = previousFrame ? Math.min((now - previousFrame) / 1000, .05) : .016;
    previousFrame = now;
    context.clearRect(0, 0, width, height);
    context.lineWidth = .7;
    for (const drop of drops) {
      drop.y += drop.speed * delta;
      drop.x -= drop.speed * delta * .045;
      if (drop.y > height + 30) { drop.y = -30; drop.x = Math.random() * width; }
      context.strokeStyle = `rgba(205,222,233,${drop.opacity})`;
      context.beginPath();
      context.moveTo(drop.x, drop.y);
      context.lineTo(drop.x - 1.4, drop.y + drop.length);
      context.stroke();
    }
    frameId = requestAnimationFrame(paintRain);
  }
  function startRain() {
    if (!frameId && heroVisible && !reducedMotion.matches && !document.hidden) {
      previousFrame = 0;
      frameId = requestAnimationFrame(paintRain);
    }
  }
  resizeRain();
  addEventListener('resize', resizeRain);
  new IntersectionObserver(([entry]) => { heroVisible = entry.isIntersecting; startRain(); }).observe(hero);
  reducedMotion.addEventListener('change', startRain);
  document.addEventListener('visibilitychange', startRain);
}

