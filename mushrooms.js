const SPORE_QUERIES = [
    { spore: "amanita", label: "🍄 МУХОМОР // FOREST PSYTRANCE", desc: "Гипнотический ночной транc, шаманские ритмы и глубокий лесной грув.", q: '(title:("Forest Psytrance" OR "Darkpsy" OR "Shamanic" OR "Goa Trance" OR "Psytrance") OR subject:("psytrance" OR "darkpsy")) AND mediatype:audio' },
    { spore: "psilocybe", label: "✨ ПСИЛОЦИБИН // PSYBIENT & DUB", desc: "Психоделический эмбиент, космический даб и калейдоскоп звуков в духе Shpongle и Ott.", q: '(title:("Psybient" OR "Psychill" OR "Psydub" OR "Psychedelic Ambient" OR "Space Dub") OR subject:("psybient" OR "psychill")) AND mediatype:audio' },
    { spore: "chanterelle", label: "🌲 ЛИСИЧКИ // FOREST AMBIENT", desc: "Теплый лесной эмбиент, шум листвы, дождь и мягкие органические текстуры.", q: '(title:("Forest Ambient" OR "Woodland" OR "Nature Ambient" OR "Dark Ambient" OR "Organic Ambient") OR subject:("ambient" AND "nature")) AND mediatype:audio' },
    { spore: "lionsmane", label: "🧬 ЕЖОВИК // HAPPY HARDCORE & RAVE", desc: "Чистый адреналин, 170+ BPM, эйфорические рейв-синтезаторы и максимальный заряд энергии.", q: '(title:("Happy Hardcore" OR "UK Hardcore" OR "Rave Mix" OR "Hardcore Techno") AND NOT title:("SFX" OR "Sound Effects" OR "Game")) AND mediatype:audio' }
];

const SPORE_THEMES = {
    all: {
        blobs: ["rgba(16, 185, 129, 0.5)", "rgba(139, 92, 246, 0.5)", "rgba(245, 158, 11, 0.35)"],
        tagColor: "#6ee7b7", tagBg: "rgba(16, 185, 129, 0.2)", tagBorder: "rgba(16, 185, 129, 0.45)",
        grad: "linear-gradient(90deg, #10b981, #8b5cf6)", waveColor: "rgba(52, 211, 153, 0.6)"
    },
    amanita: {
        blobs: ["rgba(220, 38, 38, 0.58)", "rgba(217, 119, 6, 0.48)", "rgba(153, 27, 27, 0.4)"],
        tagColor: "#fca5a5", tagBg: "rgba(220, 38, 38, 0.24)", tagBorder: "rgba(220, 38, 38, 0.58)",
        grad: "linear-gradient(90deg, #dc2626, #f59e0b)", waveColor: "rgba(248, 113, 113, 0.6)"
    },
    psilocybe: {
        blobs: ["rgba(147, 51, 234, 0.6)", "rgba(59, 130, 246, 0.5)", "rgba(219, 39, 119, 0.42)"],
        tagColor: "#d8b4fe", tagBg: "rgba(147, 51, 234, 0.24)", tagBorder: "rgba(147, 51, 234, 0.58)",
        grad: "linear-gradient(90deg, #9333ea, #38bdf8)", waveColor: "rgba(192, 132, 252, 0.6)"
    },
    chanterelle: {
        blobs: ["rgba(245, 158, 11, 0.55)", "rgba(5, 150, 105, 0.48)", "rgba(234, 88, 12, 0.38)"],
        tagColor: "#fcd34d", tagBg: "rgba(245, 158, 11, 0.22)", tagBorder: "rgba(245, 158, 11, 0.55)",
        grad: "linear-gradient(90deg, #f59e0b, #10b981)", waveColor: "rgba(251, 191, 36, 0.6)"
    },
    lionsmane: {
        blobs: ["rgba(6, 182, 212, 0.55)", "rgba(56, 189, 248, 0.48)", "rgba(20, 184, 166, 0.4)"],
        tagColor: "#67e8f9", tagBg: "rgba(6, 182, 212, 0.22)", tagBorder: "rgba(6, 182, 212, 0.55)",
        grad: "linear-gradient(90deg, #06b6d4, #2dd4bf)", waveColor: "rgba(34, 211, 238, 0.6)"
    }
};

let allTracks = [], filteredTracks = [], currentIdx = 0;
let isPlaying = false, isShuffle = true, currentSpore = "all", searchQuery = "";
let targetVolume = Number(localStorage.getItem('neko_vol')) || 0.8;
let currentWaveColor = SPORE_THEMES.all.waveColor;

let bannedTracks = JSON.parse(localStorage.getItem('neko_banned_mushrooms') || '[]');

function banTrack(e, url) {
    e.stopPropagation(); // Чтобы трек не включался при клике на крестик
    bannedTracks.push(url);
    localStorage.setItem('neko_banned_mushrooms', JSON.stringify(bannedTracks));
    allTracks = allTracks.filter(t => t.url !== url);
    applyFilters();
    if (audio.src === url && isPlaying) nextTrack();
}


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

function applySporeTheme(key) {
    const t = SPORE_THEMES[key] || SPORE_THEMES.all;
    document.querySelector('.blob-1').style.background = `radial-gradient(circle, ${t.blobs[0]} 0%, transparent 70%)`;
    document.querySelector('.blob-2').style.background = `radial-gradient(circle, ${t.blobs[1]} 0%, transparent 70%)`;
    document.querySelector('.blob-3').style.background = `radial-gradient(circle, ${t.blobs[2]} 0%, transparent 70%)`;
    const tag = document.getElementById('sporeTag');
    tag.style.color = t.tagColor;
    tag.style.background = t.tagBg;
    tag.style.borderColor = t.tagBorder;
    document.documentElement.style.setProperty('--m-accent-bg', t.tagBg);
    document.documentElement.style.setProperty('--m-accent-border', t.tagBorder);
    document.documentElement.style.setProperty('--m-grad', t.grad);
    currentWaveColor = t.waveColor;
}

function formatTime(sec) {
    if (!sec || isNaN(sec)) return "0:00";
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
}

async function loadMyceliumCatalog() {
    statusBadge.textContent = "GROWING MYCELIUM...";
    const ARCHIVE_HOST = ["https://", "archive.", "org/"].join("");
    const seenUrls = new Set();

    await Promise.all(SPORE_QUERIES.map(async (src) => {
        try {
            const searchUrl = `${ARCHIVE_HOST}advancedsearch.php?q=${encodeURIComponent(src.q)}&fl[]=identifier&sort[]=downloads+desc&rows=4&output=json`;
            const sRes = await fetch(searchUrl);
            const sData = await sRes.json();
            const docs = (sData.response && sData.response.docs) || [];

            await Promise.all(docs.map(async (doc) => {
                try {
                    const mRes = await fetch(`${ARCHIVE_HOST}metadata/${doc.identifier}`);
                    const mData = await mRes.json();
                    if (!mData || !mData.files) return;

                                        const mp3s = mData.files.filter(f => {
                        if (!f.name || !f.name.toLowerCase().endsWith('.mp3')) return false;
                        const low = f.name.toLowerCase();
                        if (low.includes('podcast') || low.includes('episode') || low.includes('interview') || low.includes('talk')) return false;
                        if (f.length && Number(f.length) > 900) return false;
                        return true;
                    }).slice(0, 10);

                    mp3s.forEach(file => {
                        const url = `${ARCHIVE_HOST}download/${doc.identifier}/${encodeURIComponent(file.name)}`;
                        if (seenUrls.has(url) || bannedTracks.includes(url)) return;
                        seenUrls.add(url);

                        const cleanName = (file.title || file.name)
                            .replace(/\.mp3$/i, '')
                            .replace(/^\d+[\s._-]+/, '')
                            .replace(/_/g, ' ');

                        allTracks.push({
                            title: cleanName,
                            spore: src.spore,
                            label: src.label,
                            desc: src.desc,
                            url
                        });
                    });

                    if (allTracks.length > 0 && !isPlaying && audio.src === "") {
                        applyFilters();
                        selectTrack(0, false);
                    } else {
                        applyFilters();
                    }
                    statusBadge.textContent = `SPORES READY // ${allTracks.length}`;
                } catch (e) {}
            }));
        } catch (e) {}
    }));

    if (allTracks.length === 0) {
        statusBadge.textContent = "ARCHIVE OFFLINE";
        document.getElementById('trackTitle').textContent = "Нет связи с грибницей";
    } else {
        allTracks.sort(() => Math.random() - 0.5);
        applyFilters();
        statusBadge.textContent = `ARCHIVE // ${allTracks.length} TRACKS`;
    }
}

function applyFilters() {
    filteredTracks = allTracks.filter(t => {
        const matchSpore = currentSpore === "all" || t.spore === currentSpore;
        const matchQuery = t.title.toLowerCase().includes(searchQuery);
        return matchSpore && matchQuery;
    });
    document.getElementById('trackCount').textContent = `${filteredTracks.length} TRACKS`;
    renderTracks();
}

function renderTracks() {
    const list = document.getElementById('tracksList');
    list.innerHTML = filteredTracks.map((t, idx) => `
        <div class="channel-card ${idx === currentIdx ? 'active' : ''}" onclick="selectTrack(${idx}, true)">
            <div style="flex:1; min-width:0; padding-right:8px;">
                <div class="channel-name" style="white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${t.title}</div>
                <div class="channel-meta">${t.label}</div>
            </div>
            <div style="display:flex; align-items:center; gap:8px;">
                ${idx === currentIdx && isPlaying ? '<div class="eq-bars"><span></span><span></span><span></span></div>' : ''}
                <span onclick="banTrack(event, '${t.url}')" title="Убрать трек" style="opacity:0.45; font-size:0.85rem; padding:4px 6px; border-radius:6px; cursor:pointer;" onmouseover="this.style.opacity=1" onmouseout="this.style.opacity=0.45">✕</span>
            </div>
        </div>`).join('');
}

function selectTrack(idx, autoPlay = true) {
    if (!filteredTracks.length) return;
    currentIdx = idx;
    const track = filteredTracks[idx];
    document.getElementById('trackTitle').textContent = track.title;
    document.getElementById('sporeTag').textContent = track.label;
    document.getElementById('sporeDesc').textContent = track.desc;
    applySporeTheme(track.spore);
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
        statusBadge.textContent = "PLAYING // MYCELIUM";
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
progressFill.style.width = ((audio.currentTime / audio.duration) * 100) + '%';
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
document.getElementById('sporeTabs').addEventListener('click', e => {
if (!e.target.classList.contains('tab-btn')) return;
document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
e.target.classList.add('active');
currentSpore = e.target.dataset.spore;
currentIdx = 0;
applySporeTheme(currentSpore);
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
ctx.stroke();
});
phase += isPlaying ? 0.075 : 0.015;
requestAnimationFrame(animateWave);
}
animateWave();
loadMyceliumCatalog();