const GAME_QUERIES = [
    { game: "p5", label: "PERSONA 5 OST", q: 'title:("Persona 5" AND ("Soundtrack" OR "OST")) AND mediatype:audio' },
    { game: "p4", label: "PERSONA 4 OST", q: 'title:("Persona 4" AND ("Soundtrack" OR "OST")) AND mediatype:audio' },
    { game: "p3", label: "PERSONA 3 OST", q: 'title:("Persona 3" AND ("Soundtrack" OR "OST")) AND mediatype:audio' }
];

const GAME_THEMES = {
    all: {
        blobs: ["rgba(225, 29, 72, 0.5)", "rgba(37, 99, 235, 0.5)", "rgba(234, 179, 8, 0.35)"],
        tagColor: "#fda4af", tagBg: "rgba(225, 29, 72, 0.2)", tagBorder: "rgba(225, 29, 72, 0.45)",
        grad: "linear-gradient(90deg, #f43f5e, #3b82f6)", waveColor: "rgba(251, 113, 133, 0.55)"
    },
    p5: {
        blobs: ["rgba(225, 29, 72, 0.6)", "rgba(159, 18, 57, 0.5)", "rgba(244, 63, 94, 0.4)"],
        tagColor: "#fda4af", tagBg: "rgba(225, 29, 72, 0.25)", tagBorder: "rgba(225, 29, 72, 0.6)",
        grad: "linear-gradient(90deg, #e11d48, #fb7185)", waveColor: "rgba(244, 63, 94, 0.6)"
    },
    p4: {
        blobs: ["rgba(234, 179, 8, 0.52)", "rgba(202, 138, 4, 0.45)", "rgba(245, 158, 11, 0.38)"],
        tagColor: "#fde047", tagBg: "rgba(234, 179, 8, 0.22)", tagBorder: "rgba(234, 179, 8, 0.55)",
        grad: "linear-gradient(90deg, #eab308, #facc15)", waveColor: "rgba(250, 204, 21, 0.6)"
    },
    p3: {
        blobs: ["rgba(37, 99, 235, 0.6)", "rgba(29, 78, 216, 0.5)", "rgba(6, 182, 212, 0.42)"],
        tagColor: "#93c5fd", tagBg: "rgba(37, 99, 235, 0.25)", tagBorder: "rgba(37, 99, 235, 0.6)",
        grad: "linear-gradient(90deg, #2563eb, #38bdf8)", waveColor: "rgba(56, 189, 248, 0.6)"
    }
};

let allTracks = [], filteredTracks = [], currentIdx = 0;
let isPlaying = false, isShuffle = true, currentGame = "all", searchQuery = "";
let targetVolume = Number(localStorage.getItem('neko_vol')) || 0.8;
let currentWaveColor = GAME_THEMES.all.waveColor;

const audio = document.getElementById('audioStream');
const playBtn = document.getElementById('playBtn');
const iconPlay = document.getElementById('iconPlay');
const iconPause = document.getElementById('iconPause');
const statusBadge = document.getElementById('statusBadge');
const liveDot = document.getElementById('liveDot');
const volumeSlider = document.getElementById('volumeSlider');
const shuffleBtn = document.getElementById('shuffleBtn');
const progressBar = document.getElementById('progressBar');
const progressFill = document.getElementById('progressFill');

audio.volume = targetVolume;
volumeSlider.value = targetVolume;

function applyGameTheme(gameKey) {
    const t = GAME_THEMES[gameKey] || GAME_THEMES.all;
    document.querySelector('.blob-1').style.background = `radial-gradient(circle, ${t.blobs} 0%, transparent 70%)`;
    document.querySelector('.blob-2').style.background = `radial-gradient(circle, ${t.blobs} 0%, transparent 70%)`;
    document.querySelector('.blob-3').style.background = `radial-gradient(circle, ${t.blobs} 0%, transparent 70%)`;
    const tag = document.getElementById('gameTag');
    tag.style.color = t.tagColor;
    tag.style.background = t.tagBg;
    tag.style.borderColor = t.tagBorder;
    document.documentElement.style.setProperty('--p-accent-bg', t.tagBg);
    document.documentElement.style.setProperty('--p-accent-border', t.tagBorder);
    document.documentElement.style.setProperty('--p-grad', t.grad);
    currentWaveColor = t.waveColor;
}

function formatTime(sec) {
    if (!sec || isNaN(sec)) return "0:00";
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
}

function shortenTitle(title, maxLen = 48) {
    const clean = String(title || '').replace(/\s+/g, ' ').trim();
    if (clean.length <= maxLen) return clean;
    const cut = clean.slice(0, maxLen);
    const lastSpace = cut.lastIndexOf(' ');
    const base = lastSpace > Math.floor(maxLen * 0.6) ? cut.slice(0, lastSpace) : cut;
    return base.replace(/[,\s._\-:;]+$/, '') + '…';
}

async function loadPersonaCatalog() {
    statusBadge.textContent = "SEARCHING OST...";
    const loaded = [];
    const seenUrls = new Set();
    const ARCHIVE_HOST = ["https://", "archive.", "org/"].join("");
    const PER_GAME_LIMIT = 150;
    const TRACK_LIMIT = PER_GAME_LIMIT * GAME_QUERIES.length;

    for (const src of GAME_QUERIES) {
        if (loaded.length >= TRACK_LIMIT) break;
        let gameCount = 0;
        try {
            const searchUrl = `${ARCHIVE_HOST}advancedsearch.php?q=${encodeURIComponent(src.q)}&fl[]=identifier&sort[]=downloads+desc&rows=15&output=json`;
            const sRes = await fetch(searchUrl);
            const sData = await sRes.json();
            const docs = (sData.response && sData.response.docs) || [];

            for (const doc of docs) {
                if (loaded.length >= TRACK_LIMIT || gameCount >= PER_GAME_LIMIT) break;
                const mRes = await fetch(`${ARCHIVE_HOST}metadata/${doc.identifier}`);
                const mData = await mRes.json();
                if (!mData || !mData.files) continue;

                const mp3s = mData.files.filter(f => f.name && f.name.toLowerCase().endsWith('.mp3'));
                if (mp3s.length > 0) {
                    mp3s.forEach(file => {
                        if (loaded.length >= TRACK_LIMIT || gameCount >= PER_GAME_LIMIT) return;
                        const url = `${ARCHIVE_HOST}download/${doc.identifier}/${encodeURIComponent(file.name)}`;
                        if (seenUrls.has(url)) return;
                        seenUrls.add(url);

                        const cleanName = (file.title || file.name)
                            .replace(/\.mp3$/i, '')
                            .replace(/^\d+[\s._-]+/, '')
                            .replace(/_/g, ' ');
                        loaded.push({
                            title: shortenTitle(cleanName),
                            game: src.game,
                            label: src.label,
                            url
                        });
                        gameCount++;
                    });
                }
            }
        } catch (e) {
            console.warn("Archive error:", src.game, e);
        }
    }

    if (loaded.length === 0) {
        statusBadge.textContent = "NO CONNECTION";
        document.getElementById('trackTitle').textContent = "Archive.org недоступен";
        document.getElementById('albumDesc').textContent = "Провайдер блокирует соединение с сервером архива. Включите VPN или загрузите свои MP3.";
        return;
    }

    allTracks = loaded;
    allTracks.sort((a, b) => a.title.localeCompare(b.title, 'ru', { sensitivity: 'base' }));
    applyFilters();
    selectTrack(0, false);
    statusBadge.textContent = `READY // ${allTracks.length} TRACKS`;
}

function applyFilters() {
    filteredTracks = allTracks.filter(t => {
        const matchGame = currentGame === "all" || t.game === currentGame;
        const matchQuery = t.title.toLowerCase().includes(searchQuery);
        return matchGame && matchQuery;
    });
    document.getElementById('trackCount').textContent = `${filteredTracks.length} TRACKS`;
    renderTracks();
}

function renderTracks() {
    const list = document.getElementById('tracksList');
    list.innerHTML = filteredTracks.map((t, idx) => `
        <button class="channel-card ${idx === currentIdx ? 'active' : ''}" onclick="selectTrack(${idx}, true)">
            <div>
                <div class="channel-name">${t.title}</div>
                <div class="channel-meta">${t.label}</div>
            </div>
            ${idx === currentIdx && isPlaying ? '<div class="eq-bars"><span></span><span></span><span></span></div>' : ''}
        </button>`).join('');
}

function selectTrack(idx, autoPlay = true) {
    if (!filteredTracks.length) return;
    currentIdx = idx;
    const track = filteredTracks[idx];
    document.getElementById('trackTitle').textContent = track.title;
    document.getElementById('gameTag').textContent = track.label;
    document.getElementById('albumDesc').textContent = "Atlus Sound Team — Shoji Meguro & Lyn";
    applyGameTheme(track.game);
    progressFill.style.width = "0%";
    renderTracks();

    audio.pause();
    audio.src = track.url;
    audio.load();
    if (autoPlay) playAudio();
}

function playAudio() {
    statusBadge.textContent = "BUFFERING...";
    audio.play().then(() => {
        isPlaying = true;
        iconPlay.classList.add('hidden');
        iconPause.classList.remove('hidden');
        statusBadge.textContent = "PLAYING // OST";
        liveDot.classList.add('live');
        renderTracks();
    }).catch(() => {
        statusBadge.textContent = "SKIPPING...";
        nextTrack();
    });
}

function pauseAudio() {
    audio.pause();
    isPlaying = false;
    iconPlay.classList.remove('hidden');
    iconPause.classList.add('hidden');
    statusBadge.textContent = "PAUSED";
    liveDot.classList.remove('live');
    renderTracks();
}

function nextTrack() {
    if (!filteredTracks.length) return;
    const next = isShuffle
        ? Math.floor(Math.random() * filteredTracks.length)
        : (currentIdx + 1) % filteredTracks.length;
    selectTrack(next, true);
}

function prevTrack() {
    if (!filteredTracks.length) return;
    const prev = (currentIdx - 1 + filteredTracks.length) % filteredTracks.length;
    selectTrack(prev, true);
}

playBtn.addEventListener('click', () => {
    if (!filteredTracks.length) return;
    isPlaying ? pauseAudio() : playAudio();
});

document.getElementById('nextBtn').addEventListener('click', nextTrack);
document.getElementById('prevBtn').addEventListener('click', prevTrack);
audio.addEventListener('ended', nextTrack);

audio.addEventListener('timeupdate', () => {
    document.getElementById('curTime').textContent = formatTime(audio.currentTime);
    document.getElementById('durTime').textContent = formatTime(audio.duration);
    if (audio.duration) {
        progressFill.style.width = `${(audio.currentTime / audio.duration) * 100}%`;
    }
});

progressBar.addEventListener('click', (e) => {
    if (!audio.duration) return;
    const rect = progressBar.getBoundingClientRect();
    audio.currentTime = ((e.clientX - rect.left) / rect.width) * audio.duration;
});

shuffleBtn.addEventListener('click', () => {
    isShuffle = !isShuffle;
    shuffleBtn.textContent = isShuffle ? "🔀 Shuffle: Вкл" : "🔁 По порядку";
    shuffleBtn.classList.toggle('active', isShuffle);
});

volumeSlider.addEventListener('input', e => {
    targetVolume = parseFloat(e.target.value);
    audio.volume = targetVolume;
    localStorage.setItem('neko_vol', targetVolume);
});

document.getElementById('muteBtn').addEventListener('click', () => {
    audio.volume = audio.volume > 0 ? 0 : targetVolume;
    volumeSlider.value = audio.volume;
});

document.getElementById('gameTabs').addEventListener('click', e => {
    if (!e.target.classList.contains('tab-btn')) return;
document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
e.target.classList.add('active');
currentGame = e.target.dataset.game;
currentIdx = 0;
applyGameTheme(currentGame);
applyFilters();
});
document.getElementById('searchInput').addEventListener('input', e => {
searchQuery = e.target.value.trim().toLowerCase();
currentIdx = 0;
applyFilters();
});
const canvas = document.getElementById('waveCanvas'), ctx = canvas.getContext('2d');
let phase = 0, width = 0, height = 0, currentAmp = 2;
function resizeCanvas() { width = canvas.width = canvas.offsetWidth; height = canvas.height = canvas.offsetHeight; }
window.addEventListener('resize', resizeCanvas);
resizeCanvas();
function animateWave() {
ctx.clearRect(0, 0, width, height);
const pulse = isPlaying ? (Math.sin(phase * 2.1) * 0.4 + Math.cos(phase * 3.4) * 0.25 + 0.8) : 0;
currentAmp += ((isPlaying ? (10 + pulse * 26) : 2) - currentAmp) * 0.14;
[[currentAmp, 0.015, 'rgba(255,255,255,0.9)', 2.5], [currentAmp * 0.7, 0.023, currentWaveColor, 1.7], [currentAmp * 0.5, 0.032, 'rgba(255,255,255,0.35)', 1.4]].forEach(([amp, freq, color, lw], j) => {
ctx.beginPath(); ctx.strokeStyle = color; ctx.lineWidth = lw;
for (let x = 0; x <= width; x += 4) {
const y = height / 2 + Math.sin(x * freq + phase * (j + 1) * 0.65) * amp * Math.sin((x / width) * Math.PI);
x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
}
ctx.shadowColor = color;
ctx.shadowBlur = 8;
ctx.stroke();
ctx.shadowBlur = 0;
});
phase += isPlaying ? 0.075 : 0.015;
requestAnimationFrame(animateWave);
}
animateWave();
loadPersonaCatalog();

const brandLogo = document.querySelector('.brand');
if (brandLogo) {
    brandLogo.style.cursor = 'pointer';
    brandLogo.addEventListener('click', () => {
        try {
            const AudioCtx = window.AudioContext || window.webkitAudioContext;
            const actx = new AudioCtx();
            const now = actx.currentTime;

            const osc = actx.createOscillator();
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(300, now);
            osc.frequency.exponentialRampToValueAtTime(620, now + 0.16);
            osc.frequency.exponentialRampToValueAtTime(340, now + 0.55);

            const lfo = actx.createOscillator();
            lfo.frequency.value = 6;
            const lfoGain = actx.createGain();
            lfoGain.gain.value = 14;
            lfo.connect(lfoGain);
            lfoGain.connect(osc.frequency);

            const filter = actx.createBiquadFilter();
            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(800, now);
            filter.frequency.exponentialRampToValueAtTime(1800, now + 0.1);
            filter.frequency.exponentialRampToValueAtTime(700, now + 0.5);

            const gain = actx.createGain();
            gain.gain.setValueAtTime(0.0001, now);
            gain.gain.linearRampToValueAtTime(0.3, now + 0.08);
            gain.gain.setValueAtTime(0.3, now + 0.28);
            gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.6);

            osc.connect(filter);
            filter.connect(gain);
            gain.connect(actx.destination);

            osc.start(now);
            lfo.start(now);
            osc.stop(now + 0.6);
            lfo.stop(now + 0.6);
        } catch (e) {}
        const textSpan = brandLogo.querySelector('span:last-child');
        const oldText = textSpan.textContent;
        textSpan.textContent = 'NYA! 🐾';
        brandLogo.style.transform = 'scale(1.12) rotate(-3deg)';
        brandLogo.style.transition = 'transform 0.18s ease';
        setTimeout(() => {
            textSpan.textContent = oldText;
            brandLogo.style.transform = 'scale(1) rotate(0deg)';
        }, 550);
    });
}