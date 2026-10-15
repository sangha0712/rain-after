'use strict';

const select = (selector) => document.querySelector(selector);
const selectAll = (selector) => [...document.querySelectorAll(selector)];

// A restored or long-open page checks the current deployment before staying stale.
const loadedSiteVersion = select('meta[name="site-version"]')?.content;
let versionCheckPending = false;
let lastVersionCheck = 0;
async function checkSiteVersion(force = false) {
  if (!loadedSiteVersion || document.visibilityState === 'hidden' || versionCheckPending ||
      (!force && Date.now() - lastVersionCheck < 30000)) return;
  versionCheckPending = true;
  lastVersionCheck = Date.now();
  try {
    const response = await fetch('site-version.json', { cache: 'no-store' });
    if (!response.ok) return;
    const { version } = await response.json();
    if (!/^[a-f0-9]{16}$/.test(version) || version === loadedSiteVersion) return;
    const destination = new URL(location.href);
    // A second mismatch means the network is inconsistent; avoid a reload loop.
    if (destination.searchParams.get('v') === version) return;
    destination.searchParams.set('v', version);
    location.replace(destination.href);
  } catch {
    // Keep the current page usable when the visitor is offline.
  } finally {
    versionCheckPending = false;
  }
}
addEventListener('pageshow', () => checkSiteVersion(true));
addEventListener('online', () => checkSiteVersion(true));
document.addEventListener('visibilitychange', () => checkSiteVersion());
setInterval(checkSiteVersion, 60000);

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

// Keep the rainy setting still while the page content slides between sections.
const pageMotion = matchMedia('(prefers-reduced-motion: reduce)');
const pageSurfaces = selectAll('main, .site-footer');
let pageAnimations = [];
let pendingPage = null;
function clearPageMotion() {
  const previousAnimations = pageAnimations;
  pageAnimations = [];
  previousAnimations.forEach((animation) => animation.cancel());
  document.documentElement.classList.remove('page-transition-active');
  document.body.classList.remove('page-transition-leaving');
}
function canAnimatePage() {
  return !pageMotion.matches && pageSurfaces.length > 0 &&
    typeof pageSurfaces[0].animate === 'function';
}
function enterPage() {
  pendingPage = null;
  clearPageMotion();
  if (document.body.classList.contains('entry-locked') || !canAnimatePage()) return;
  document.documentElement.classList.add('page-transition-active');
  const animations = pageSurfaces.map((surface) => surface.animate([
    { opacity: 0, transform: 'translate3d(22px, 0, 0)' },
    { opacity: 1, transform: 'translate3d(0, 0, 0)' }
  ], { duration: 460, easing: 'cubic-bezier(.22, 1, .36, 1)' }));
  pageAnimations = animations;
  Promise.all(animations.map((animation) => animation.finished.catch(() => {}))).then(() => {
    if (pageAnimations !== animations) return;
    clearPageMotion();
  });
}
function pagePath(pathname) {
  return pathname.replace(/\/index(?:\.html)?\/?$/, '/')
    .replace(/\.html$/, '').replace(/\/$/, '') || '/';
}
document.addEventListener('hari-entry-accepted', enterPage);
document.addEventListener('click', (event) => {
  if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey ||
      event.shiftKey || event.altKey) return;
  const link = event.target.closest('a[href]');
  if (!link || link.hasAttribute('download') || (link.target && link.target !== '_self')) return;
  const destination = new URL(link.href, location.href);
  if (destination.origin !== location.origin || !/^https?:$/.test(destination.protocol)) return;
  if (!/(?:\/(?:index|hari|world|images|webtoon)(?:\.html)?|\/)\/?$/.test(destination.pathname)) return;
  if (pagePath(destination.pathname) === pagePath(location.pathname) &&
      destination.search === location.search) return;
  if (document.body.classList.contains('entry-locked') || !canAnimatePage()) return;
  event.preventDefault();
  if (pendingPage) return;
  pendingPage = destination.href;
  closeMenu();
  const currentFrames = pageSurfaces.map((surface) => {
    const style = getComputedStyle(surface);
    return { opacity: style.opacity, transform: style.transform };
  });
  clearPageMotion();
  document.documentElement.classList.add('page-transition-active');
  document.body.classList.add('page-transition-leaving');
  const animations = pageSurfaces.map((surface, index) => surface.animate([
    currentFrames[index],
    { opacity: 0, transform: 'translate3d(-18px, 0, 0)' }
  ], { duration: 220, easing: 'cubic-bezier(.4, 0, .6, 1)', fill: 'forwards' }));
  pageAnimations = animations;
  Promise.all(animations.map((animation) => animation.finished.catch(() => {}))).then(() => {
    if (pageAnimations === animations && pendingPage) location.assign(pendingPage);
  });
});
addEventListener('pagehide', () => { pendingPage = null; clearPageMotion(); });
addEventListener('pageshow', (event) => { if (event.persisted) enterPage(); });
pageMotion.addEventListener('change', () => {
  if (!pageMotion.matches) return;
  const destination = pendingPage;
  pendingPage = null;
  clearPageMotion();
  if (destination) location.assign(destination);
});

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
    notify('빗소리 불러오기 실패. 버튼을 다시 누르면 재시도.');
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

