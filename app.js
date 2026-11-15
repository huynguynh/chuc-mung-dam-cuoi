/* =========================================================
   Configuration — Edit easily here
   ========================================================= */
const CONFIG = {
  weddingDateIso: '2026-11-28T09:00:00+07:00',
  localMusicPath: './music.mp3',
  defaultMusicUrl: 'https://youtu.be/z7mnyJtlShw?si=rAKDhoZel6cSJ1CK',
  musicDurationLimitSec: 120,
};

const STORAGE_KEYS = {
  hearts: 'tv_wedding_hearts_v1',
  wishes: 'tv_wedding_wishes_v1',
  musicUrl: 'tv_wedding_music_url_v1',
};

const BONUS_WISHES = [
  'Chúc chị Thu Trang & anh Long Vũ trăm năm hạnh phúc, ngày nào cũng ngọt như trà sữa full topping!',
  'Chúc hai anh chị sớm sinh quý tử, khỏe mạnh ngoan ngoãn để cậu nuôi Huy sớm có cháu cưng bế mỏi tay!',
  'Chúc anh Vũ mãi giữ phong độ “nghe lời vợ là thượng sách”, gia đình nhỏ lúc nào cũng ấm êm tiếng cười.',
  'Từ hôm nay có thêm người cùng Huy chiều chị Trang rồi — chúc hai anh chị vạn sự bình an, tình yêu viên mãn!',
  'Chúc đôi uyên ương đầu bạc răng long, tiền vào như nước, hạnh phúc đong đầy từ 28/11/2026 đến mãi về sau!',
  'Chúc anh chị thuận vợ thuận chồng, tát biển Đông cũng cạn — nhưng nhớ chừa cho em Huy một bát cơm ngon mỗi dịp cuối tuần ghé chơi nhé!',
];

const DEFAULT_GUESTBOOK = [
  {
    author: 'Em Huy',
    message: 'Chúc chị Thu Trang và anh Long Vũ trăm năm hạnh phúc, sớm sinh quý tử cho em bế cháu nha! 💖',
    time: 'Chính chủ gửi',
  },
  {
    author: 'Cậu nuôi Huy (Tương lai)',
    message: 'Đặt gạch trước slot dạy cháu chơi game và dẫn đi ăn vặt. Hai anh chị cứ việc hạnh phúc, mọi chuyện cứ để cậu nuôi lo!',
    time: 'Ưu tiên đặc biệt',
  },
];

/* =========================================================
   Utilities
   ========================================================= */
const $ = (selector) => document.querySelector(selector);
const pad2 = (num) => String(Math.max(0, Math.floor(num))).padStart(2, '0');
const formatDuration = (sec) => {
  if (!Number.isFinite(sec) || sec < 0) return '00:00';
  const total = Math.floor(sec);
  return `${pad2(Math.floor(total / 60))}:${pad2(total % 60)}`;
};
const prefersReducedMotion = () =>
  window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const storage = {
  get(key) {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  set(key, value) {
    try {
      localStorage.setItem(key, value);
    } catch {
      // Ignore storage errors in restricted contexts
    }
  },
};

function extractYouTubeId(url) {
  if (!url) return null;
  const trimmed = url.trim();
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) return trimmed;
  try {
    const parsed = new URL(trimmed);
    const host = parsed.hostname.replace(/^www\./, '');
    if (host === 'youtu.be') {
      return parsed.pathname.slice(1, 12) || null;
    }
    if (host.includes('youtube.com')) {
      if (parsed.searchParams.get('v')) return parsed.searchParams.get('v');
      const parts = parsed.pathname.split('/').filter(Boolean);
      const markerIdx = parts.findIndex((p) => p === 'embed' || p === 'shorts' || p === 'live');
      if (markerIdx !== -1 && parts[markerIdx + 1]) {
        return parts[markerIdx + 1].slice(0, 11);
      }
    }
  } catch {
    return null;
  }
  return null;
}

function playCelebrationChime() {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      const start = ctx.currentTime + idx * 0.08;
      gain.gain.setValueAtTime(0.001, start);
      gain.gain.exponentialRampToValueAtTime(0.08, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.65);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + 0.7);
    });
  } catch {
    // AudioContext optional
  }
}

/* =========================================================
   Canvas Particle & Fireworks System
   ========================================================= */
function createFxEngine() {
  const canvas = $('#fxCanvas');
  if (!canvas) {
    return { burst: () => {}, grandCelebration: () => {}, finaleShow: () => {}, setMusicMood: () => {} };
  }
  const ctx = canvas.getContext('2d');
  const colors = ['#f1a6c3', '#f8c6d8', '#95c5e3', '#bedef0', '#dfc391', '#ffffff'];

  let width = 0;
  let height = 0;
  let musicActive = false;
  let musicProgress = 0;
  let nextAutoBloomAt = 0;
  const petals = [];
  const sparks = [];

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function spawnPetal(randomY = false) {
    return {
      x: Math.random() * width,
      y: randomY ? Math.random() * height : -15,
      size: 4 + Math.random() * 6,
      vx: -0.4 + Math.random() * 0.8,
      vy: 0.45 + Math.random() * 0.75,
      angle: Math.random() * Math.PI * 2,
      spin: (Math.random() - 0.5) * 0.03,
      color: colors[Math.floor(Math.random() * 4)],
      alpha: 0.35 + Math.random() * 0.4,
    };
  }

  function burst(originX = width * 0.5, originY = height * 0.45, count = 48, options = {}) {
    if (prefersReducedMotion()) return;
    const { heartsOnly = false, starBurst = false } = options;
    for (let i = 0; i < count; i += 1) {
      const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.3;
      const speed = starBurst ? 1.5 + Math.random() * 2.9 : 2.4 + Math.random() * 5.8;
      const roll = Math.random();
      sparks.push({
        x: originX,
        y: originY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - (starBurst ? 0.6 : 1.5),
        size: (starBurst ? 2.4 : 3) + Math.random() * (starBurst ? 2.8 : 4.5),
        color: colors[Math.floor(Math.random() * colors.length)],
        life: 1,
        decay: (starBurst ? 0.018 : 0.011) + Math.random() * 0.011,
        isHeart: heartsOnly ? true : !starBurst && roll > 0.68,
        isStar: starBurst ? roll > 0.25 : !heartsOnly && roll <= 0.25,
      });
    }
  }

  function drawHeart(x, y, size) {
    ctx.beginPath();
    ctx.moveTo(x, y + size * 0.3);
    ctx.bezierCurveTo(x - size, y - size * 0.5, x - size * 0.5, y - size * 1.1, x, y - size * 0.35);
    ctx.bezierCurveTo(x + size * 0.5, y - size * 1.1, x + size, y - size * 0.5, x, y + size * 0.3);
    ctx.fill();
  }

  function drawStar(x, y, size) {
    const r = size * 1.35;
    ctx.beginPath();
    ctx.moveTo(x, y - r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.quadraticCurveTo(x, y, x, y + r);
    ctx.quadraticCurveTo(x, y, x - r, y);
    ctx.quadraticCurveTo(x, y, x, y - r);
    ctx.fill();
  }

  function tick(now) {
    ctx.clearRect(0, 0, width, height);

    if (!prefersReducedMotion()) {
      // Extended gentle blooms & shimmer synced throughout the 2-minute music track
      if (musicActive) {
        if (now >= nextAutoBloomAt) {
          const x = width * (0.18 + Math.random() * 0.64);
          const y = height * (0.2 + Math.random() * 0.36);
          burst(x, y, musicProgress > 0.85 ? 34 : 22);
          nextAutoBloomAt = now + (musicProgress > 0.85 ? 4000 : 10000);
        }
        if (Math.random() < (musicProgress > 0.8 ? 0.24 : 0.1)) {
          const roll = Math.random();
          sparks.push({
            x: Math.random() * width,
            y: height + 10,
            vx: (Math.random() - 0.5) * 0.8,
            vy: -(1.1 + Math.random() * 1.4),
            size: 2.8 + Math.random() * 3.5,
            color: colors[Math.floor(Math.random() * colors.length)],
            life: 0.9,
            decay: 0.0055,
            isHeart: roll > 0.62,
            isStar: roll <= 0.38,
          });
        }
      }

      for (let i = 0; i < petals.length; i += 1) {
        const p = petals[i];
        p.x += p.vx + Math.sin(p.y * 0.015) * 0.3;
        p.y += p.vy * (musicActive ? 1.15 : 1);
        p.angle += p.spin;
        if (p.y > height + 20) Object.assign(p, spawnPetal(false));

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.angle);
        ctx.globalAlpha = p.alpha;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.ellipse(0, 0, p.size, p.size * 0.62, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }

    for (let i = sparks.length - 1; i >= 0; i -= 1) {
      const s = sparks[i];
      s.x += s.vx;
      s.y += s.vy;
      s.vy += s.vy < 0 && s.decay < 0.007 ? 0.004 : 0.09;
      s.vx *= 0.985;
      s.life -= s.decay;

      if (s.life <= 0) {
        sparks.splice(i, 1);
        continue;
      }

      ctx.save();
      ctx.globalAlpha = Math.max(0, s.life);
      ctx.fillStyle = s.color;
      if (s.isHeart) {
        drawHeart(s.x, s.y, s.size * 1.4);
      } else if (s.isStar) {
        drawStar(s.x, s.y, s.size * 0.95);
      } else {
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.size * 0.65, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    requestAnimationFrame(tick);
  }

  resize();
  window.addEventListener('resize', resize);
  for (let i = 0; i < 18; i += 1) petals.push(spawnPetal(true));
  requestAnimationFrame(tick);

  document.addEventListener(
    'pointerdown',
    (e) => {
      if (e.target instanceof Element && e.target.closest('input, textarea, select')) return;
      if (typeof e.clientX === 'number' && typeof e.clientY === 'number') {
        burst(e.clientX, e.clientY, 8, { starBurst: true });
      }
    },
    { passive: true }
  );

  return {
    burst,
    tapSparkle(x, y) {
      burst(x, y, 8, { starBurst: true });
    },
    setMusicMood(active, progress = 0) {
      if (active && !musicActive) {
        nextAutoBloomAt = performance.now() + 5000;
      }
      musicActive = active;
      musicProgress = progress;
    },
    grandCelebration() {
      burst(width * 0.3, height * 0.38, 42);
      setTimeout(() => burst(width * 0.7, height * 0.34, 42), 180);
      setTimeout(() => burst(width * 0.5, height * 0.28, 56), 360);
    },
    finaleShow() {
      const waves = [0, 320, 680, 1150, 1650, 2200];
      waves.forEach((delay, idx) => {
        setTimeout(() => {
          const x = width * (0.2 + ((idx * 0.17) % 0.65));
          const y = height * (0.22 + ((idx * 0.13) % 0.32));
          burst(x, y, 56);
        }, delay);
      });
    },
  };
}

/* =========================================================
   Countdown Timer (28/11/2026)
   ========================================================= */
function initCountdown() {
  const targetMs = new Date(CONFIG.weddingDateIso).getTime();
  const daysEl = $('#cdDays');
  const hoursEl = $('#cdHours');
  const minutesEl = $('#cdMinutes');
  const secondsEl = $('#cdSeconds');
  const statusEl = $('#countdownStatus');
  const captionEl = $('#countdownCaption');

  function update() {
    const now = Date.now();
    const diff = targetMs - now;

    if (diff > 0) {
      const totalSeconds = Math.floor(diff / 1000);
      const days = Math.floor(totalSeconds / 86400);
      const hours = Math.floor((totalSeconds % 86400) / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      const seconds = totalSeconds % 60;

      daysEl.textContent = pad2(days);
      hoursEl.textContent = pad2(hours);
      minutesEl.textContent = pad2(minutes);
      secondsEl.textContent = pad2(seconds);

      if (days === 0) {
        statusEl.textContent = '🎊 Chỉ còn vài giờ nữa là tới giờ G 28/11/2026!';
        captionEl.textContent = 'Anh Vũ ủi vest sẵn sàng chưa, sắp rước cô dâu xinh đẹp nhất về dinh rồi!';
      } else if (days === 1) {
        statusEl.textContent = '✨ Ngày mai là Đám Cưới rồi (28/11/2026)!';
        captionEl.textContent = 'Cô dâu Thu Trang nhớ ngủ sớm giữ nhan sắc 10 điểm nhé!';
      } else {
        statusEl.textContent = `⏳ Đếm ngược tới ngày vui 28/11/2026 (còn ${days} ngày)`;
        captionEl.textContent = 'Chuẩn bị tinh thần ăn cỗ linh đình và chúc phúc cho anh chị thôi!';
      }
      return;
    }

    const elapsedMs = Math.abs(diff);
    const withinWeddingDay = elapsedMs < 15 * 3600 * 1000;
    const totalSeconds = Math.floor(elapsedMs / 1000);
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    daysEl.textContent = pad2(days);
    hoursEl.textContent = pad2(hours);
    minutesEl.textContent = pad2(minutes);
    secondsEl.textContent = pad2(seconds);

    if (withinWeddingDay) {
      statusEl.textContent = '💍 HÔM NAY LÀ NGÀY TRỌNG ĐẠI 28/11/2026!';
      captionEl.textContent = 'Chúc mừng cô dâu Thu Trang & chú rể Long Vũ chính thức về chung một nhà!';
    } else {
      statusEl.textContent = '💞 Đã chính thức về chung một nhà được';
      captionEl.textContent = 'Kể từ 28/11/2026 — hành trình trăm năm hạnh phúc vẫn đang rực rỡ từng giây!';
    }
  }

  update();
  setInterval(update, 1000);
}

/* =========================================================
   Scroll Reveal
   ========================================================= */
function initReveal() {
  const nodes = document.querySelectorAll('.reveal');
  if (!('IntersectionObserver' in window)) {
    nodes.forEach((n) => n.classList.add('is-visible'));
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.12 }
  );

  nodes.forEach((n) => observer.observe(n));
}

/* =========================================================
   Interactive Wishes, Flip Cards & Guestbook
   ========================================================= */
function initInteractions(fx, music) {
  let spotlightTimer = null;

  function triggerSpotlight(targetEl) {
    if (!targetEl) return;
    document.querySelectorAll('.is-spotlight').forEach((el) => el.classList.remove('is-spotlight'));
    void targetEl.offsetWidth;
    targetEl.classList.add('is-spotlight');
    clearTimeout(spotlightTimer);
    spotlightTimer = setTimeout(() => {
      targetEl.classList.remove('is-spotlight');
    }, 1800);
  }

  // Interactive quick-guide items: scroll, spotlight target, and sparkle
  document.querySelectorAll('[data-spotlight]').forEach((item) => {
    item.addEventListener('click', () => {
      const selector = item.getAttribute('data-spotlight');
      const targetEl = selector ? $(selector) : null;
      if (targetEl) triggerSpotlight(targetEl);
      const rect = item.getBoundingClientRect();
      fx.burst(rect.left + rect.width / 2, rect.top + rect.height / 2, 14, { starBurst: true });
    });
  });

  // Guide shortcut to bottom-right music player
  $('#guideMusicShortcut')?.addEventListener('click', (e) => {
    const widget = $('#musicWidget');
    if (widget) triggerSpotlight(widget);
    const rect = e.currentTarget.getBoundingClientRect();
    fx.burst(rect.left + rect.width / 2, rect.top + rect.height / 2, 16, { starBurst: true });
    music?.tryAutoStart?.();
  });

  // Flip prophecy cards
  document.querySelectorAll('[data-flip]').forEach((card) => {
    card.setAttribute('aria-pressed', 'false');
    card.addEventListener('click', () => {
      const flipped = card.classList.toggle('is-flipped');
      card.setAttribute('aria-pressed', String(flipped));
      if (flipped) {
        const rect = card.getBoundingClientRect();
        fx.burst(rect.left + rect.width / 2, rect.top + rect.height / 2, 24);
      }
    });
  });

  // Hero fireworks button
  $('#heroFireworksBtn')?.addEventListener('click', () => {
    playCelebrationChime();
    fx.grandCelebration();
  });

  // Heart counter
  const heartCountEl = $('#heartCount');
  let hearts = Number(storage.get(STORAGE_KEYS.hearts)) || 28;
  heartCountEl.textContent = String(hearts);

  $('#sendHeartBtn')?.addEventListener('click', (e) => {
    hearts += 1;
    heartCountEl.textContent = String(hearts);
    storage.set(STORAGE_KEYS.hearts, String(hearts));
    const rect = e.currentTarget.getBoundingClientRect();
    fx.burst(rect.left + rect.width / 2, rect.top, 26, { heartsOnly: true });
  });

  // Random bonus wish button
  const bonusTextEl = $('#bonusWishText');
  let lastWishIdx = -1;

  $('#moreWishBtn')?.addEventListener('click', (e) => {
    let idx = Math.floor(Math.random() * BONUS_WISHES.length);
    if (idx === lastWishIdx && BONUS_WISHES.length > 1) {
      idx = (idx + 1) % BONUS_WISHES.length;
    }
    lastWishIdx = idx;
    bonusTextEl.textContent = BONUS_WISHES[idx];
    const rect = e.currentTarget.getBoundingClientRect();
    fx.burst(rect.left + rect.width / 2, rect.top, 22);
  });

  // Guestbook
  const wishListEl = $('#wishList');
  const wishForm = $('#wishForm');
  const authorInput = $('#wishAuthor');
  const messageInput = $('#wishMessage');

  function loadWishes() {
    try {
      const raw = storage.get(STORAGE_KEYS.wishes);
      if (!raw) return [...DEFAULT_GUESTBOOK];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) && parsed.length ? parsed : [...DEFAULT_GUESTBOOK];
    } catch {
      return [...DEFAULT_GUESTBOOK];
    }
  }

  let wishes = loadWishes();

  function renderWishes() {
    wishListEl.innerHTML = '';
    wishes.forEach((item) => {
      const li = document.createElement('li');
      li.className = 'wish-item';

      const head = document.createElement('div');
      head.className = 'wish-item-head';

      const author = document.createElement('span');
      author.className = 'wish-item-author';
      author.textContent = item.author;

      const time = document.createElement('span');
      time.className = 'wish-item-time';
      time.textContent = item.time;

      const msg = document.createElement('p');
      msg.textContent = item.message;

      head.append(author, time);
      li.append(head, msg);
      wishListEl.appendChild(li);
    });
  }

  renderWishes();

  wishForm?.addEventListener('submit', (e) => {
    e.preventDefault();
    const author = authorInput.value.trim();
    const message = messageInput.value.trim();
    if (!author || !message) return;

    const now = new Date();
    const timeLabel = `${pad2(now.getHours())}:${pad2(now.getMinutes())} · ${pad2(now.getDate())}/${pad2(now.getMonth() + 1)}`;
    wishes = [{ author, message, time: timeLabel }, ...wishes].slice(0, 30);
    storage.set(STORAGE_KEYS.wishes, JSON.stringify(wishes));
    renderWishes();

    authorInput.value = '';
    messageInput.value = '';
    fx.grandCelebration();
  });
}

/* =========================================================
   Smart Music Player ("Một Đời x Lễ Đường Mashup")
   Supports: YouTube link, ./music.mp3, local file picker, direct MP3 URL
   Syncs ambient FX to song progress & unlocks Finale Surprise on end
   ========================================================= */
function initMusicPlayer(fx, onSongEnded) {
  const audio = $('#bgAudio');
  const playBtn = $('#musicPlayBtn');
  const playIcon = $('#playStateIcon');
  const vinyl = $('#vinylDisc');
  const eqBars = $('#eqBars');
  const statusEl = $('#musicStatus');
  const remindTextEl = $('#musicRemindText');
  const progressFillEl = $('#musicProgressFill');
  const timeTextEl = $('#musicTimeText');
  const configBtn = $('#musicConfigBtn');
  const modal = $('#musicModal');
  const closeModalBtn = $('#closeMusicModal');
  const fileInput = $('#musicFileInput');
  const urlForm = $('#musicUrlForm');
  const urlInput = $('#musicUrlInput');
  const modalNote = $('#musicModalNote');
  const fallbackActions = $('#musicFallbackActions');
  const ytDockFrame = $('#ytDockFrame');
  const ytToggleSizeBtn = $('#ytToggleSizeBtn');

  let mode = 'none'; // 'audio' | 'youtube' | 'none'
  let isPlaying = false;
  let ytPlayer = null;
  let pendingYtId = null;
  let pendingAutoplay = false;
  let localObjectUrl = null;
  let currentLabel = 'Một Đời × Lễ Đường';
  let finaleTriggered = false;
  let didFadeOut = false;
  let progressTimer = null;

  function getEffectiveDuration(rawDuration) {
    const limit = CONFIG.musicDurationLimitSec || 120;
    if (!Number.isFinite(rawDuration) || rawDuration <= 0) return limit;
    return Math.min(rawDuration, limit);
  }

  function restoreVolumeIfFaded() {
    if (!didFadeOut) return;
    didFadeOut = false;
    if (mode === 'audio') {
      audio.volume = 1;
    } else if (mode === 'youtube' && ytPlayer && typeof ytPlayer.setVolume === 'function') {
      ytPlayer.setVolume(100);
    }
  }

  function completeAtCap() {
    if (finaleTriggered) return;
    handleSongCompleted();
    if (mode === 'audio') {
      audio.pause();
    } else if (mode === 'youtube' && ytPlayer && typeof ytPlayer.pauseVideo === 'function') {
      ytPlayer.pauseVideo();
    }
  }

  function updateProgress(currentSec, rawDurationSec) {
    const durationSec = getEffectiveDuration(rawDurationSec);
    const sec = Math.max(0, currentSec || 0);

    if (sec >= durationSec && isPlaying) {
      completeAtCap();
      return;
    }

    const ratio = Math.min(1, Math.max(0, sec / durationSec));
    const remaining = Math.max(0, durationSec - sec);
    progressFillEl.style.width = `${(ratio * 100).toFixed(1)}%`;
    timeTextEl.textContent = `-${formatDuration(remaining)}`;
    fx.setMusicMood(isPlaying, ratio);

    if (isPlaying && remaining <= 3 && remaining > 0) {
      didFadeOut = true;
      const fadeRatio = Math.max(0.08, remaining / 3);
      if (mode === 'audio') {
        audio.volume = fadeRatio;
      } else if (mode === 'youtube' && ytPlayer && typeof ytPlayer.setVolume === 'function') {
        ytPlayer.setVolume(Math.round(fadeRatio * 100));
      }
    } else if (didFadeOut && remaining > 3) {
      restoreVolumeIfFaded();
    }

    if (finaleTriggered) return;
    if (isPlaying) {
      if (ratio >= 0.85) {
        remindTextEl.textContent = `🎁 Sắp hết 2 phút nhạc rồi, chuẩn bị đón bất ngờ nha! (-${formatDuration(remaining)})`;
      } else if (ratio >= 0.4) {
        remindTextEl.textContent = `✨ Đang phát cùng hiệu ứng — nghe hết 2 phút nhé! (-${formatDuration(remaining)})`;
      } else {
        remindTextEl.textContent = `🎧 Nghe hết 2 phút nhạc nhé! Cuối bài có bất ngờ 🎁 (-${formatDuration(remaining)})`;
      }
    }
  }

  function startProgressPolling() {
    clearInterval(progressTimer);
    progressTimer = setInterval(() => {
      if (mode === 'youtube' && ytPlayer && typeof ytPlayer.getCurrentTime === 'function') {
        updateProgress(ytPlayer.getCurrentTime(), ytPlayer.getDuration());
      } else if (mode === 'audio' && !audio.paused) {
        updateProgress(audio.currentTime, audio.duration);
      }
    }, 500);
  }

  function stopProgressPolling() {
    clearInterval(progressTimer);
    progressTimer = null;
  }

  function setPlayingUi(playing, statusText) {
    isPlaying = playing;
    vinyl.classList.toggle('is-spinning', playing);
    eqBars?.classList.toggle('is-active', playing);
    playIcon.textContent = playing ? '❚❚' : '▶';
    if (statusText) statusEl.textContent = statusText;
    fx.setMusicMood(playing, 0);

    if (playing) {
      startProgressPolling();
    } else {
      stopProgressPolling();
    }
  }

  function handleSongCompleted() {
    if (finaleTriggered) return;
    finaleTriggered = true;
    setPlayingUi(false, 'Đã phát hết 2 phút · Bất ngờ đã mở!');
    progressFillEl.style.width = '100%';
    timeTextEl.textContent = '00:00';
    remindTextEl.textContent = '🎉 Đã mở khóa bất ngờ cuối bài hát!';
    onSongEnded();
  }

  function stopCurrent() {
    audio.pause();
    if (ytPlayer && typeof ytPlayer.pauseVideo === 'function') {
      ytPlayer.pauseVideo();
    }
    setPlayingUi(false);
  }

  function loadAudioSource(src, label, autoplay = false) {
    mode = 'audio';
    currentLabel = label;
    if (ytPlayer && typeof ytPlayer.pauseVideo === 'function') {
      ytPlayer.pauseVideo();
    }
    ytDockFrame.hidden = true;
    fallbackActions.hidden = true;
    audio.src = src;
    audio.load();
    statusEl.textContent = label;
    if (autoplay) {
      audio
        .play()
        .then(() => setPlayingUi(true, `Đang phát · ${label}`))
        .catch(() => setPlayingUi(false, `Sẵn sàng · ${label}`));
    }
  }

  function ensureYouTubeApi(videoId, autoplay = true) {
    mode = 'youtube';
    audio.pause();
    ytDockFrame.hidden = false;
    pendingAutoplay = autoplay;

    if (window.location.protocol === 'file:') {
      modalNote.textContent =
        'Lưu ý: Trình duyệt thường chặn YouTube khi mở file trực tiếp (file://). Hãy mở bằng file mo-thiep-co-nhac-youtube.command hoặc đưa lên web để YouTube phát mượt!';
      fallbackActions.hidden = false;
    } else {
      modalNote.textContent = 'Đang kết nối trình phát YouTube: Một Đời × Lễ Đường...';
    }

    const mountPlayer = () => {
      if (ytPlayer && typeof ytPlayer.loadVideoById === 'function') {
        ytPlayer.loadVideoById(videoId);
        return;
      }
      const playerVars = {
        autoplay: pendingAutoplay ? 1 : 0,
        controls: 1,
        rel: 0,
        playsinline: 1,
      };
      if (window.location.protocol.startsWith('http')) {
        playerVars.origin = window.location.origin;
      }

      ytPlayer = new window.YT.Player('ytPlayer', {
        videoId,
        playerVars,
        events: {
          onReady: (ev) => {
            modalNote.textContent = 'Đã kết nối YouTube thành công!';
            statusEl.textContent = 'Chạm ▶ hoặc video để phát nhạc (2 phút)';
            timeTextEl.textContent = `-${formatDuration(getEffectiveDuration(ev.target.getDuration?.()))}`;
            if (pendingAutoplay) ev.target.playVideo();
          },
          onStateChange: (ev) => {
            if (ev.data === window.YT.PlayerState.PLAYING) {
              fallbackActions.hidden = true;
              const current = ytPlayer?.getCurrentTime?.() || 0;
              const cap = getEffectiveDuration(ytPlayer?.getDuration?.());
              if (current < cap - 3) restoreVolumeIfFaded();
              setPlayingUi(true, 'Đang phát · Một Đời × Lễ Đường');
            } else if (ev.data === window.YT.PlayerState.PAUSED) {
              if (!finaleTriggered) setPlayingUi(false, 'Tạm dừng · Một Đời × Lễ Đường');
            } else if (ev.data === window.YT.PlayerState.ENDED) {
              handleSongCompleted();
            }
          },
          onError: () => {
            setPlayingUi(false, 'YouTube bị chặn trên file:// hoặc lỗi video');
            remindTextEl.textContent = '⚠️ Chạm ⚙ để chọn MP3 hoặc xem trên YouTube';
            modalNote.textContent =
              'Video YouTube không phát được trực tiếp từ đây (do mở từ file:// hoặc video hạn chế nhúng). Bạn chạy file mo-thiep-co-nhac-youtube.command, chọn file .mp3, hoặc dùng các nút bên dưới nhé!';
            fallbackActions.hidden = false;
          },
        },
      });
    };

    if (window.YT && window.YT.Player) {
      mountPlayer();
      return;
    }

    pendingYtId = videoId;
    window.onYouTubeIframeAPIReady = () => {
      if (pendingYtId) {
        const id = pendingYtId;
        pendingYtId = null;
        ensureYouTubeApi(id, pendingAutoplay);
      }
    };

    if (!document.querySelector('script[src="https://www.youtube.com/iframe_api"]')) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      document.head.appendChild(tag);
    }
  }

  function applyUrlSource(rawUrl, autoplay = true) {
    const url = rawUrl.trim();
    if (!url) return false;
    const ytId = extractYouTubeId(url);
    if (ytId) {
      ensureYouTubeApi(ytId, autoplay);
      return true;
    }
    loadAudioSource(url, 'Nhạc trực tuyến', autoplay);
    modalNote.textContent = 'Đã lưu link nhạc! Bấm ▶ nếu trình duyệt chưa tự phát.';
    return true;
  }

  // Audio events
  audio.addEventListener('loadedmetadata', () => {
    if (mode === 'audio') {
      timeTextEl.textContent = `-${formatDuration(getEffectiveDuration(audio.duration))}`;
    }
  });
  audio.addEventListener('play', () => setPlayingUi(true, `Đang phát · ${currentLabel}`));
  audio.addEventListener('pause', () => {
    if (mode === 'audio' && !audio.ended && !finaleTriggered) {
      setPlayingUi(false, `Tạm dừng · ${currentLabel}`);
    }
  });
  audio.addEventListener('timeupdate', () => {
    if (mode === 'audio') updateProgress(audio.currentTime, audio.duration);
  });
  audio.addEventListener('ended', handleSongCompleted);
  audio.addEventListener('error', () => {
    if (mode === 'audio' && audio.getAttribute('src') === CONFIG.localMusicPath) {
      mode = 'none';
      setPlayingUi(false, 'Chạm ⚙ để chọn MP3 / link nhạc');
    } else if (mode === 'audio') {
      setPlayingUi(false, 'Không phát được link nhạc này');
      modalNote.textContent = 'Link audio không hợp lệ hoặc bị chặn CORS. Hãy thử file MP3 từ máy!';
      fallbackActions.hidden = false;
    }
  });

  // Load saved URL or default YouTube / local music.mp3
  const savedUrl = storage.get(STORAGE_KEYS.musicUrl) || CONFIG.defaultMusicUrl;
  if (savedUrl) {
    urlInput.value = savedUrl;
    applyUrlSource(savedUrl, false);
  } else {
    loadAudioSource(CONFIG.localMusicPath, 'music.mp3', false);
  }

  ytToggleSizeBtn?.addEventListener('click', () => {
    const collapsed = ytDockFrame.classList.toggle('is-collapsed');
    ytToggleSizeBtn.textContent = collapsed ? 'Hiện' : 'Ẩn';
  });

  function togglePlay() {
    if (mode === 'none') {
      modal.hidden = false;
      modalNote.textContent =
        'Chưa có nguồn nhạc. Bạn chọn file MP3 trên máy hoặc dán link YouTube/MP3 bài Một Đời x Lễ Đường nhé!';
      return;
    }

    if (finaleTriggered) {
      replayFromStart();
      return;
    }

    if (mode === 'youtube' && ytPlayer && typeof ytPlayer.playVideo === 'function') {
      if (isPlaying) ytPlayer.pauseVideo();
      else ytPlayer.playVideo();
      return;
    }

    if (mode === 'audio') {
      if (audio.paused) {
        audio.play().catch(() => {
          modal.hidden = false;
        });
      } else {
        audio.pause();
      }
    }
  }

  function replayFromStart() {
    finaleTriggered = false;
    didFadeOut = false;
    progressFillEl.style.width = '0%';
    timeTextEl.textContent = `-${formatDuration(CONFIG.musicDurationLimitSec || 120)}`;
    if (mode === 'audio') {
      audio.volume = 1;
      audio.currentTime = 0;
      audio.play().catch(() => {});
    } else if (mode === 'youtube' && ytPlayer && typeof ytPlayer.seekTo === 'function') {
      if (typeof ytPlayer.setVolume === 'function') ytPlayer.setVolume(100);
      ytPlayer.seekTo(0, true);
      ytPlayer.playVideo();
    }
  }

  playBtn?.addEventListener('click', togglePlay);
  configBtn?.addEventListener('click', () => {
    modal.hidden = false;
  });
  closeModalBtn?.addEventListener('click', () => {
    modal.hidden = true;
  });
  modal?.addEventListener('click', (e) => {
    if (e.target === modal) modal.hidden = true;
  });

  fileInput?.addEventListener('change', (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (localObjectUrl) URL.revokeObjectURL(localObjectUrl);
    localObjectUrl = URL.createObjectURL(file);
    finaleTriggered = false;
    didFadeOut = false;
    audio.volume = 1;
    loadAudioSource(localObjectUrl, file.name.replace(/\.[^.]+$/, ''), true);
    modalNote.textContent = `Đang phát từ máy: ${file.name}`;
    modal.hidden = true;
  });

  urlForm?.addEventListener('submit', (e) => {
    e.preventDefault();
    const val = urlInput.value.trim();
    if (!val) return;
    finaleTriggered = false;
    didFadeOut = false;
    audio.volume = 1;
    storage.set(STORAGE_KEYS.musicUrl, val);
    applyUrlSource(val, true);
  });

  return {
    tryAutoStart() {
      pendingAutoplay = true;
      if (finaleTriggered) {
        replayFromStart();
        return;
      }
      if (mode === 'audio' && audio.paused && audio.readyState >= 2) {
        audio.play().catch(() => {});
      } else if (mode === 'youtube' && !isPlaying && ytPlayer && typeof ytPlayer.playVideo === 'function') {
        ytPlayer.playVideo();
      }
    },
    replayFromStart,
    stop: stopCurrent,
  };
}

/* =========================================================
   Envelope Entrance, Finale Surprise & Bootstrap
   ========================================================= */
document.addEventListener('DOMContentLoaded', () => {
  const overlay = $('#envelopeOverlay');
  const openBtn = $('#openEnvelopeBtn');
  const finaleOverlay = $('#finaleOverlay');
  const reopenFinaleBtn = $('#reopenFinaleBtn');
  const params = new URLSearchParams(window.location.search);
  const skipEnvelope = params.get('open') === '1' || params.get('finale') === '1';

  if (skipEnvelope && overlay) {
    overlay.classList.add('is-opened', 'is-instant-open');
  } else if (overlay) {
    document.documentElement.classList.add('js-reveal');
    document.body.classList.add('envelope-locked');
  }

  const fx = createFxEngine();

  function showFinaleSurprise() {
    if (!finaleOverlay) return;
    finaleOverlay.hidden = false;
    if (reopenFinaleBtn) reopenFinaleBtn.hidden = false;
    playCelebrationChime();
    fx.finaleShow();
  }

  const music = initMusicPlayer(fx, showFinaleSurprise);

  initCountdown();
  if (!skipEnvelope) initReveal();
  initInteractions(fx, music);

  $('#closeFinaleBtn')?.addEventListener('click', () => {
    finaleOverlay.hidden = true;
  });
  finaleOverlay?.addEventListener('click', (e) => {
    if (e.target === finaleOverlay) finaleOverlay.hidden = true;
  });
  $('#finaleFireworksBtn')?.addEventListener('click', () => {
    playCelebrationChime();
    fx.finaleShow();
  });
  $('#finaleReplayBtn')?.addEventListener('click', () => {
    finaleOverlay.hidden = true;
    music.replayFromStart();
  });
  reopenFinaleBtn?.addEventListener('click', showFinaleSurprise);
  $('#fallbackUnlockBtn')?.addEventListener('click', () => {
    $('#musicModal').hidden = true;
    showFinaleSurprise();
  });

  if (params.get('finale') === '1') {
    showFinaleSurprise();
  }

  function openEnvelope() {
    if (!overlay || overlay.classList.contains('is-opened')) return;
    overlay.classList.add('is-opening');
    document.body.classList.remove('envelope-locked');
    playCelebrationChime();
    fx.grandCelebration();
    music.tryAutoStart();

    setTimeout(() => {
      overlay.classList.add('is-opened');
    }, 340);
  }

  openBtn?.addEventListener('click', openEnvelope);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (!$('#musicModal').hidden) $('#musicModal').hidden = true;
      if (finaleOverlay && !finaleOverlay.hidden) finaleOverlay.hidden = true;
    }
  });
});
