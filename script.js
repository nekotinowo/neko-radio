const HOST = ["https://", "radiorecord.", "hostingradio.ru/"].join("");
const stations = [
    { name: "Record Chill-Out", category: "chill", tag: "AMBIENT // DOWNTEMPO", desc: "Глубокий эмбиент и расслабляющая электроника.", url: HOST + "chil96.aacp", colors: ["rgba(5, 150, 105, 0.45)", "rgba(8, 145, 178, 0.4)", "rgba(101, 163, 13, 0.35)"] },
    { name: "Record Lo-Fi", category: "chill", tag: "LO-FI // BEATS", desc: "Ламповый бит и спокойный чиллхоп для кодинга.", url: HOST + "lofi96.aacp", colors: ["rgba(2, 132, 199, 0.45)", "rgba(13, 148, 136, 0.4)", "rgba(79, 70, 229, 0.35)"] },
    { name: "Record Deep", category: "chill", tag: "DEEP HOUSE", desc: "Стильный ночной дип-хаус.", url: HOST + "deep96.aacp", colors: ["rgba(67, 56, 202, 0.45)", "rgba(3, 105, 161, 0.4)", "rgba(109, 40, 217, 0.35)"] },
    { name: "Pirate Station", category: "dnb", tag: "DRUM & BASS // LEGEND", desc: "Главный драм-н-бэйс канал Пиратской Станции.", url: HOST + "ps96.aacp", colors: ["rgba(153, 27, 27, 0.45)", "rgba(126, 34, 206, 0.4)", "rgba(217, 119, 6, 0.35)"] },
    { name: "Record Liquid Funk", category: "dnb", tag: "LIQUID D'N'B", desc: "Мелодичный драм-н-бэйс с мягким басом.", url: HOST + "liquidfunk96.aacp", colors: ["rgba(37, 99, 235, 0.45)", "rgba(124, 58, 237, 0.4)", "rgba(6, 182, 212, 0.35)"] },
    { name: "Record Neurofunk", category: "dnb", tag: "NEUROFUNK // BASS", desc: "Техничный нейрофанк с мощным саб-басом.", url: HOST + "neurofunk96.aacp", colors: ["rgba(190, 18, 60, 0.45)", "rgba(109, 40, 217, 0.4)", "rgba(220, 38, 38, 0.35)"] },
    { name: "Record Jungle", category: "dnb", tag: "JUNGLE // BREAKBEAT", desc: "Олдскульный джангл и скоростные брейки.", url: HOST + "jungle96.aacp", colors: ["rgba(21, 128, 61, 0.45)", "rgba(202, 138, 4, 0.4)", "rgba(15, 118, 110, 0.35)"] },
    { name: "Record Synthwave", category: "synth", tag: "RETROWAVE // 80s", desc: "Неоновые трассы 80-х и аналоговые синтезаторы.", url: HOST + "synth96.aacp", colors: ["rgba(192, 38, 211, 0.45)", "rgba(79, 70, 229, 0.4)", "rgba(236, 72, 153, 0.35)"] },
    { name: "Record Phonk", category: "synth", tag: "DRIFT PHONK // 808", desc: "Перегруженный 808-й бас и ночной дрифт-фонк.", url: HOST + "phonk96.aacp", colors: ["rgba(159, 18, 57, 0.45)", "rgba(88, 28, 135, 0.4)", "rgba(30, 27, 75, 0.45)"] },
    { name: "Record Trancemission", category: "club", tag: "UPLIFTING TRANCE", desc: "Эйфорический транс и космические мелодии.", url: HOST + "tm96.aacp", colors: ["rgba(29, 78, 216, 0.45)", "rgba(6, 182, 212, 0.4)", "rgba(124, 58, 237, 0.35)"] },
    { name: "Radio Record Main", category: "club", tag: "DANCE MAIN", desc: "Главный танцевальный эфир страны 24/7.", url: HOST + "rr_main96.aacp", colors: ["rgba(225, 29, 72, 0.45)", "rgba(234, 88, 12, 0.4)", "rgba(124, 58, 237, 0.35)"] }
];

let currentIdx = Number(localStorage.getItem('neko_idx')) || 0;
if (currentIdx >= stations.length) currentIdx = 0;
let favorites = JSON.parse(localStorage.getItem('neko_favs') || '[]');
let targetVolume = Number(localStorage.getItem('neko_vol')) || 0.8;

let currentFilter = "all", searchQuery = "", isPlaying = false, fadeAnimId = null;
let sleepMinutes = 0, sleepTimeout = null;

const audio = document.getElementById('audioStream');
const playBtn = document.getElementById('playBtn');
const iconPlay = document.getElementById('iconPlay');
const iconPause = document.getElementById('iconPause');
const statusBadge = document.getElementById('statusBadge');
const liveDot = document.getElementById('liveDot');
const volumeSlider = document.getElementById('volumeSlider');
const favCurrentBtn = document.getElementById('favCurrentBtn');
const sleepBtn = document.getElementById('sleepBtn');
const shareBtn = document.getElementById('shareBtn');

volumeSlider.value = targetVolume;

function fadeVolume(toVol, ms = 400, cb = null) {
    if (fadeAnimId) cancelAnimationFrame(fadeAnimId);
    const startVol = audio.volume, startTime = performance.now();
    function step(now) {
        const p = Math.min((now - startTime) / ms, 1);
        audio.volume = Math.max(0, Math.min(1, startVol + (toVol - startVol) * (1 - Math.pow(1 - p, 2))));
        p < 1 ? (fadeAnimId = requestAnimationFrame(step)) : (fadeAnimId = null, cb && cb());
    }
    fadeAnimId = requestAnimationFrame(step);
}

function updateUIStation(idx) {
    const st = stations[idx];
    document.getElementById('stationTitle').textContent = st.name;
    document.getElementById('stationTag').textContent = st.tag;
    document.getElementById('stationDesc').textContent = st.desc;
    document.querySelector('.blob-1').style.background = `radial-gradient(circle, ${st.colors} 0%, transparent 70%)`;
    document.querySelector('.blob-2').style.background = `radial-gradient(circle, ${st.colors} 0%, transparent 70%)`;
    document.querySelector('.blob-3').style.background = `radial-gradient(circle, ${st.colors} 0%, transparent 70%)`;

    const isFav = favorites.includes(st.name);
    favCurrentBtn.textContent = isFav ? '♥' : '♡';
    favCurrentBtn.classList.toggle('is-fav', isFav);

    if ('mediaSession' in navigator) {
        navigator.mediaSession.metadata = new MediaMetadata({ title: st.name, artist: 'NEKO.FM // ' + st.tag });
    }
}

function renderChannels() {
    const filtered = stations.map((s, i) => ({ ...s, i })).filter(s => {
        const matchCat = currentFilter === "all" || (currentFilter === "fav" ? favorites.includes(s.name) : s.category === currentFilter);
        const matchSearch = s.name.toLowerCase().includes(searchQuery) || s.tag.toLowerCase().includes(searchQuery);
        return matchCat && matchSearch;
    });
    document.getElementById('channelCount').textContent = `${filtered.length} STATIONS`;
    document.getElementById('channelsList').innerHTML = filtered.map(s => `
        <button class="channel-card ${s.i === currentIdx ? 'active' : ''}" onclick="selectStation(${s.i})">
            <div>
                <div class="channel-name">${favorites.includes(s.name) ? '♥ ' : ''}${s.name}</div>
                <div class="channel-meta">${s.tag}</div>
            </div>
            ${s.i === currentIdx && isPlaying ? '<div class="eq-bars"><span></span><span></span><span></span></div>' : ''}
        </button>`).join('');
}

function selectStation(idx) {
    if (idx === currentIdx && isPlaying) return;
    currentIdx = idx;
    localStorage.setItem('neko_idx', idx);
    updateUIStation(idx);
    renderChannels();

    const run = () => { audio.pause(); audio.src = stations[idx].url; audio.load(); playAudio(); };
    isPlaying && audio.volume > 0.05 ? fadeVolume(0, 250, run) : run();
}

function playAudio() {
    statusBadge.textContent = "CONNECTING...";
    audio.volume = 0;
    audio.play().then(() => {
        isPlaying = true;
        iconPlay.classList.add('hidden');
        iconPause.classList.remove('hidden');
        statusBadge.textContent = "ON AIR // LIVE";
        liveDot.classList.add('live');
        renderChannels();
        fadeVolume(targetVolume, 500);
    }).catch(() => {
        isPlaying = false;
        statusBadge.textContent = "STREAM ERROR";
        liveDot.classList.remove('live');
    });
}

function pauseAudio() {
    statusBadge.textContent = "PAUSING...";
    fadeVolume(0, 400, () => {
        audio.pause();
        isPlaying = false;
        iconPlay.classList.remove('hidden');
        iconPause.classList.add('hidden');
        statusBadge.textContent = "PAUSED";
        liveDot.classList.remove('live');
        renderChannels();
    });
}

playBtn.addEventListener('click', () => {
    if (!audio.src || audio.src === window.location.href) { audio.src = stations[currentIdx].url; audio.load(); }
    isPlaying ? pauseAudio() : playAudio();
});

document.getElementById('nextBtn').addEventListener('click', () => selectStation((currentIdx + 1) % stations.length));
document.getElementById('prevBtn').addEventListener('click', () => selectStation((currentIdx - 1 + stations.length) % stations.length));

favCurrentBtn.addEventListener('click', () => {
    const name = stations[currentIdx].name;
    favorites = favorites.includes(name) ? favorites.filter(f => f !== name) : [...favorites, name];
    localStorage.setItem('neko_favs', JSON.stringify(favorites));
    updateUIStation(currentIdx);
    renderChannels();
});

const sleepSteps = new Array(0, 15, 30, 60);
sleepBtn.addEventListener('click', () => {
    const nextIdx = (sleepSteps.indexOf(sleepMinutes) + 1) % sleepSteps.length;
    sleepMinutes = sleepSteps[nextIdx];
    clearTimeout(sleepTimeout);
    if (sleepMinutes === 0) {
        sleepBtn.textContent = "⏱ Сон: Выкл";
        sleepBtn.classList.remove('active');
    } else {
        sleepBtn.textContent = `⏱ Сон: ${sleepMinutes}м`;
        sleepBtn.classList.add('active');
        sleepTimeout = setTimeout(() => {
            if (isPlaying) pauseAudio();
            sleepMinutes = 0;
            sleepBtn.textContent = "⏱ Сон: Выкл";
            sleepBtn.classList.remove('active');
        }, sleepMinutes * 60000);
    }
});

shareBtn.addEventListener('click', () => {
    navigator.clipboard.writeText(window.location.href).then(() => {
        const old = shareBtn.textContent;
        shareBtn.textContent = "✓ Ссылка скопирована";
        setTimeout(() => shareBtn.textContent = old, 2000);
    });
});

volumeSlider.addEventListener('input', e => {
    targetVolume = parseFloat(e.target.value);
    localStorage.setItem('neko_vol', targetVolume);
    if (isPlaying) audio.volume = targetVolume;
});

document.getElementById('muteBtn').addEventListener('click', () => {
    if (audio.volume > 0) { fadeVolume(0, 200); volumeSlider.value = 0; }
    else { targetVolume = targetVolume || 0.8; volumeSlider.value = targetVolume; if (isPlaying) fadeVolume(targetVolume, 250); }
});

document.addEventListener('keydown', e => {
    if (document.activeElement.tagName === 'INPUT') return;
    if (e.code === 'Space') { e.preventDefault(); playBtn.click(); }
if (e.code === 'ArrowRight') selectStation((currentIdx + 1) % stations.length);
if (e.code === 'ArrowLeft') selectStation((currentIdx - 1 + stations.length) % stations.length);
if (e.code === 'KeyM') document.getElementById('muteBtn').click();
});
if ('mediaSession' in navigator) {
navigator.mediaSession.setActionHandler('play', () => playBtn.click());
navigator.mediaSession.setActionHandler('pause', () => playBtn.click());
navigator.mediaSession.setActionHandler('nexttrack', () => selectStation((currentIdx + 1) % stations.length));
navigator.mediaSession.setActionHandler('previoustrack', () => selectStation((currentIdx - 1 + stations.length) % stations.length));
}
document.getElementById('genreTabs').addEventListener('click', e => {
if (!e.target.classList.contains('tab-btn')) return;
document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
e.target.classList.add('active');
currentFilter = e.target.dataset.filter;
renderChannels();
});
document.getElementById('searchInput').addEventListener('input', e => { searchQuery = e.target.value.trim().toLowerCase(); renderChannels(); });
const canvas = document.getElementById('waveCanvas'), ctx = canvas.getContext('2d');
let phase = 0, width = 0, height = 0, currentAmp = 2;
function resizeCanvas() { width = canvas.width = canvas.offsetWidth; height = canvas.height = canvas.offsetHeight; }
window.addEventListener('resize', resizeCanvas);
resizeCanvas();
function animateWave() {
ctx.clearRect(0, 0, width, height);
const volRatio = isPlaying ? (audio.volume / Math.max(0.1, targetVolume)) : 0;
const pulse = isPlaying ? (Math.sin(phase * 1.9) * 0.35 + Math.cos(phase * 3.2) * 0.25 + 0.8) : 0;
currentAmp += ((isPlaying ? (10 + pulse * 26) * volRatio : 2) - currentAmp) * 0.14;
[[currentAmp, 0.014, 'rgba(255,255,255,0.9)', 2.5], [currentAmp * 0.7, 0.022, 'rgba(196,181,253,0.5)', 1.7], [currentAmp * 0.5, 0.031, 'rgba(56,189,248,0.4)', 1.4]].forEach(([amp, freq, color, lw], j) => {
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
updateUIStation(currentIdx);
renderChannels();
animateWave();