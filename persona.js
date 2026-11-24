const GAME_QUERIES = [
    { game: "p5", label: "PERSONA 5 OST", q: 'title:("Persona 5" AND ("Soundtrack" OR "OST")) AND mediatype:audio' },
    { game: "p4", label: "PERSONA 4 OST", q: 'title:("Persona 4" AND ("Soundtrack" OR "OST")) AND mediatype:audio' },
    { game: "p3", label: "PERSONA 3 OST", q: 'title:("Persona 3" AND ("Soundtrack" OR "OST")) AND mediatype:audio' }
];

let allTracks = [], filteredTracks = [], currentIdx = 0;
let isPlaying = false, isShuffle = true, currentGame = "all", searchQuery = "";
let targetVolume = Number(localStorage.getItem('neko_vol')) || 0.8;

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

function formatTime(sec) {
    if (!sec || isNaN(sec)) return "0:00";
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
}

async function loadPersonaCatalog() {
    statusBadge.textContent = "SEARCHING OST...";
    const loaded = [];
    const ARCHIVE_HOST = ["https://", "archive.", "org/"].join("");

    for (const src of GAME_QUERIES) {
        try {
            const searchUrl = `${ARCHIVE_HOST}advancedsearch.php?q=${encodeURIComponent(src.q)}&fl[]=identifier&sort[]=downloads+desc&rows=2&output=json`;
            const sRes = await fetch(searchUrl);
            const sData = await sRes.json();
            const docs = (sData.response && sData.response.docs) || [];

            for (const doc of docs) {
                const mRes = await fetch(`${ARCHIVE_HOST}metadata/${doc.identifier}`);
                const mData = await mRes.json();
                if (!mData || !mData.files) continue;

                const mp3s = mData.files.filter(f => f.name && f.name.toLowerCase().endsWith('.mp3'));
                if (mp3s.length > 0) {
                    mp3s.forEach(file => {
                        const cleanName = (file.title || file.name)
                            .replace(/\.mp3$/i, '')
                            .replace(/^\d+[\s._-]+/, '')
                            .replace(/_/g, ' ');
                        loaded.push({
                            title: cleanName,
                            game: src.game,
                            label: src.label,
                            url: `${ARCHIVE_HOST}download/${doc.identifier}/${encodeURIComponent(file.name)}`
                        });
                    });
                    break;
                }
            }
        } catch (e) {
            console.warn("Archive error:", src.game, e);
        }
    }

    if (loaded.length === 0) {
        statusBadge.textContent = "NO CONNECTION";
        document.getElementById('trackTitle').textContent = "Archive.org недоступен";
        document.getElementById('albumDesc').textContent = "Провайдер блокирует соединение с сервером архива. Включите VPN или загрузите свои MP3 в папку music/.";
        return;
    }

    allTracks = loaded;
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

    [[currentAmp, 0.015, 'rgba(255,255,255,0.9)', 2.5], [currentAmp * 0.7, 0.023, 'rgba(251,113,133,0.55)', 1.7], [currentAmp * 0.5, 0.032, 'rgba(96,165,250,0.45)', 1.4]].forEach(([amp, freq, color, lw], j) => {
        ctx.beginPath(); ctx.strokeStyle = color; ctx.lineWidth = lw;
        for (let x = 0; x <= width; x += 4) {
            const y = height / 2 + Math.sin(x * freq + phase * (j + 1) * 0.65) * amp * Math.sin((x / width) * Math.PI);
            x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        }
        ctx.stroke();
    });
    phase += isPlaying ? 0.075 : 0.015;
    requestAnimationFrame(animateWave);
}

animateWave();
loadPersonaCatalog();
