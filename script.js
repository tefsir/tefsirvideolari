// CSV dosyasını okuma fonksiyonu
async function loadCSV(filePath) {
    const response = await fetch(filePath);
    const text = await response.text();
    return Papa.parse(text, {
        header: true,
        skipEmptyLines: true,
        delimiter: ";"
    }).data;
}

// URL'deki parametreleri alma fonksiyonu
function getUrlParameter(name) {
    name = name.replace(/[\[]/, '\\[').replace(/[\]]/, '\\]');
    var regex = new RegExp('[\\?&]' + name + '=([^&#]*)');
    var results = regex.exec(location.search);
    return results === null ? '' : decodeURIComponent(results[1].replace(/\+/g, ' '));
}

let allData = [];
let currentPlayingVideoElement = null;

// Hardcoded Sure Ayet Sayıları (adjusted for common Turkish spellings without special diacritics)
const sureAyetSayilari = {
    "Fatiha": 7, "Bakara": 286, "Ali İmran": 200, "Nisa": 176, "Maide": 120,
    "En'am": 165, "A'raf": 206, "Enfal": 75, "Tevbe": 129, "Yunus": 109,
    "Hud": 123, "Yusuf": 111, "Ra'd": 43, "Ibrahim": 52, "Hicr": 99,
    "Nahl": 128, "Isra": 111, "Kehf": 110, "Meryem": 98, "Taha": 135,
    "Enbiya": 112, "Hac": 78, "Mu'minun": 118, "Nur": 64, "Furkan": 77,
    "Suara": 227, "Neml": 93, "Kasas": 88, "Ankebut": 69, "Rum": 60,
    "Lokman": 34, "Secde": 30, "Ahzab": 73, "Sebe": 54, "Fatir": 45,
    "Yasin": 83, "Saffat": 182, "Sad": 88, "Zumer": 75, "Mu'min": 85,
    "Fussilet": 54, "Sura": 53, "Zuhruf": 89, "Duhan": 59, "Casiye": 37,
    "Ahkaf": 35, "Muhammed": 38, "Fetih": 29, "Hucurat": 18, "Kaf": 45,
    "Zariyat": 60, "Tur": 49, "Necm": 62, "Kamer": 55, "Rahman": 78,
    "Vakia": 96, "Hadid": 29, "Mucadele": 22, "Hasr": 24, "Mumtehine": 13,
    "Saff": 14, "Cum'a": 11, "Munafikun": 11, "Tegabun": 18, "Talak": 12,
    "Tahrim": 12, "Mulk": 30, "Kalem": 52, "Hakka": 52, "Mearic": 44,
    "Nuh": 28, "Cinn": 28, "Muzzemmil": 20, "Muddessir": 56, "Kiyamet": 40,
    "Insan": 31, "Murselat": 50, "Nebe": 40, "Naziat": 46, "Abese": 42,
    "Tekvir": 29, "Infitar": 19, "Mutaffifin": 36, "Insikak": 25, "Buruc": 22,
    "Tarik": 17, "Ala": 19, "Gasiye": 26, "Fecr": 30, "Beled": 20,
    "Sems": 15, "Leyl": 21, "Duha": 11, "Insirah": 8, "Tin": 8,
    "Alak": 19, "Kadr": 5, "Beyyine": 8, "Zilzal": 8, "Adiyat": 11,
    "Kari'a": 11, "Tekasur": 8, "Asr": 3, "Humeze": 9, "Fil": 5,
    "Kureys": 4, "Ma'un": 7, "Kevser": 3, "Kafirun": 6, "Nasr": 3,
    "Tebbet": 5, "Ikhlas": 4, "Felak": 5, "Nas": 6
};


// Helper objects for pre-processed data
let sureInfo = {}; // Stores ayet_sayisi, mufessir_count, total_video_count for each sure
let mufessirSureVideoCounts = {}; // Stores video count for each mufessir per sure

// Function to pre-process data for counts and info
function preprocessData() {
    sureInfo = {};
    mufessirSureVideoCounts = {};

    allData.forEach(item => {
        const sureAd = item.standart_sure_ad;
        const mufessirAd = item.mufessir;
        // Get ayetSayisi from the hardcoded object
        const ayetSayisi = sureAyetSayilari[sureAd] || 'Bilinmiyor';

        // Populate sureInfo
        if (!sureInfo[sureAd]) {
            sureInfo[sureAd] = {
                ayet_sayisi: ayetSayisi, // Use hardcoded ayet_sayisi
                mufessirs: new Set(),
                total_videos: 0
            };
        }
        sureInfo[sureAd].mufessirs.add(mufessirAd);
        sureInfo[sureAd].total_videos++;

        // Populate mufessirSureVideoCounts
        if (!mufessirSureVideoCounts[mufessirAd]) {
            mufessirSureVideoCounts[mufessirAd] = {};
        }
        if (!mufessirSureVideoCounts[mufessirAd][sureAd]) {
            mufessirSureVideoCounts[mufessirAd][sureAd] = 0;
        }
        mufessirSureVideoCounts[mufessirAd][sureAd]++;
    });

    // Convert Set to size for mufessir_count
    for (const sure in sureInfo) {
        sureInfo[sure].mufessir_count = sureInfo[sure].mufessirs.size;
        delete sureInfo[sure].mufessirs; // Remove the set as we only need the count
    }
}


// Sayfa yüklendiğinde çalışacak ana fonksiyon
document.addEventListener('DOMContentLoaded', async () => {
    // PapaParse kütüphanesini dinamik olarak yükle
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/PapaParse/5.3.0/papaparse.min.js';
    document.head.appendChild(script);

    script.onload = async () => {
        allData = await loadCSV('data.csv');
        console.log("CSV verisi yüklendi:", allData);
        preprocessData(); // Pre-process data once loaded

        if (document.getElementById('sureler-grid')) {
            renderSurelerPage();
        } else if (document.getElementById('mufessirler-grid')) {
            renderMufessirlerPage();
        } else if (document.getElementById('default-sureler-grid')) {
            renderDefaultHomePage();
        }
    };
});

// Sureler sayfasını render etme fonksiyonu
function renderSurelerPage() {
    const surelerGrid = document.getElementById('sureler-grid');
    const mufessirGridForSure = document.getElementById('mufessir-grid-for-sure');
    const videoDetayDiv = document.getElementById('video-detay');
    const pageTitle = document.getElementById('page-title');

    const sureler = [];
    allData.forEach(item => {
        if (item.standart_sure_ad && !sureler.some(s => s.sure_ad === item.standart_sure_ad)) {
            sureler.push({ sure_ad: item.standart_sure_ad, sure_no: item.sure_no });
        }
    });

    sureler.sort((a, b) => parseInt(a.sure_no) - parseInt(b.sure_no));

    const selectedSure = getUrlParameter('sure');
    const selectedMufessirFromUrl = getUrlParameter('mufessir');

    if (selectedSure) {
        if (selectedMufessirFromUrl) {
            pageTitle.innerHTML = `${selectedSure} Suresi - <a href="mufessirler.html?mufessir=${encodeURIComponent(selectedMufessirFromUrl)}">${selectedMufessirFromUrl}</a> Tefsirleri`;
        } else {
            pageTitle.textContent = `${selectedSure} Suresi`;
        }
        
        surelerGrid.classList.add('hidden');
        mufessirGridForSure.classList.remove('hidden');
        videoDetayDiv.classList.add('hidden');

        const mufessirlerForSure = [];
        allData.filter(item => item.standart_sure_ad === selectedSure).forEach(video => {
            if (video.mufessir && !mufessirlerForSure.some(m => m.mufessir === video.mufessir)) {
                const thumbnailUrl = video.video_thumbnail_url || 'img/placeholder-scholar.jpg';
                mufessirlerForSure.push({
                    mufessir: video.mufessir,
                    thumbnail: thumbnailUrl
                });
            }
        });

        mufessirlerForSure.sort((a, b) => a.mufessir.localeCompare(b.mufessir, 'tr', { sensitivity: 'base' }));

        mufessirGridForSure.innerHTML = '';
        mufessirlerForSure.forEach(mufessirData => {
            const videoCount = mufessirSureVideoCounts[mufessirData.mufessir]?.[selectedSure] || 0;
            const card = document.createElement('div');
            card.classList.add('card', 'mufessir-card');
            
            card.innerHTML = `
                <img src="${mufessirData.thumbnail}" alt="${mufessirData.mufessir} thumbnail" class="mufessir-thumbnail">
                <div class="mufessir-card-info">
                    <h3>${mufessirData.mufessir}</h3>
                    <p>Video Sayısı: ${videoCount}</p>
                </div>
            `;
            card.addEventListener('click', () => {
                window.location.href = `sureler.html?sure=${encodeURIComponent(selectedSure)}&mufessir=${encodeURIComponent(mufessirData.mufessir)}`;
            });
            mufessirGridForSure.appendChild(card);
        });

        if (selectedMufessirFromUrl) {
            mufessirGridForSure.classList.add('hidden');
            videoDetayDiv.classList.remove('hidden');
            displayVideosForSureAndMufessir(selectedSure, selectedMufessirFromUrl);
        }

    } else {
        surelerGrid.classList.remove('hidden');
        mufessirGridForSure.classList.add('hidden');
        videoDetayDiv.classList.add('hidden');
        pageTitle.textContent = "Sureler";

        surelerGrid.innerHTML = '';
        sureler.forEach(sure => {
            // Ayet sayısı artık hardcoded sureAyetSayilari objesinden geliyor
            const currentSureInfo = sureInfo[sure.sure_ad] || { ayet_sayisi: 'Bilinmiyor', mufessir_count: 0, total_videos: 0 };
            const card = document.createElement('div');
            card.classList.add('card');
            card.innerHTML = `
                <h3>${sure.sure_ad}</h3>
                <p>Sure No: ${sure.sure_no}</p>
                <p>Ayet Sayısı: ${currentSureInfo.ayet_sayisi}</p>
                <p>Müfessir Sayısı: ${currentSureInfo.mufessir_count}</p>
                <p>Toplam Video: ${currentSureInfo.total_videos}</p>
            `;
            card.addEventListener('click', () => {
                window.location.href = `sureler.html?sure=${encodeURIComponent(sure.sure_ad)}`;
            });
            surelerGrid.appendChild(card);
        });
    }
}

// Belirli sure ve müfessir için videoları göster
function displayVideosForSureAndMufessir(sureAd, mufessirAd) {
    const videoPlayer = document.getElementById('video-player');
    const videoDetayBaslik = document.getElementById('video-detay-baslik');
    const ilgiliVideolarListesi = document.getElementById('ilgili-videolar-listesi');

    const videos = allData.filter(item => item.standart_sure_ad === sureAd && item.mufessir === mufessirAd);

    if (videos.length > 0) {
        playVideo(videos[0], videoPlayer, videoDetayBaslik, ilgiliVideolarListesi);

        ilgiliVideolarListesi.innerHTML = '<h3>İlgili Videolar</h3>';
        videos.forEach(video => {
            const videoItem = document.createElement('div');
            videoItem.classList.add('video-item');
            videoItem.dataset.videoId = video.youtube_video_id;
            videoItem.innerHTML = `
                <img src="${video.video_thumbnail_url}" alt="${video.video_baslik}">
                <div class="video-item-info">
                    <h4>${video.video_baslik}</h4>
                    <p>${video.mufessir}</p>
                </div>
            `;
            videoItem.addEventListener('click', () => playVideo(video, videoPlayer, videoDetayBaslik, ilgiliVideolarListesi));
            ilgiliVideolarListesi.appendChild(videoItem);
        });
        const firstVideoItem = ilgiliVideolarListesi.querySelector('.video-item');
        if (firstVideoItem) {
            firstVideoItem.classList.add('active');
            currentPlayingVideoElement = firstVideoItem;
        }

    } else {
        ilgiliVideolarListesi.innerHTML = `<p>Bu sure ve müfessir için video bulunamadı.</p>`;
        videoPlayer.src = "";
        videoDetayBaslik.textContent = "";
    }
}

// Video oynatma fonksiyonu (genel kullanım için)
function playVideo(videoData, playerElement, titleElement, videoListContainer) {
    if (currentPlayingVideoElement) {
        currentPlayingVideoElement.classList.remove('active');
    }

    const embedSrc = `https://www.youtube.com/embed/${videoData.youtube_video_id}`; // Corrected YouTube embed URL
    playerElement.src = embedSrc;
    titleElement.textContent = videoData.video_baslik;
    
    if (videoListContainer) {
        const playingVideoItem = videoListContainer.querySelector(`[data-video-id="${videoData.youtube_video_id}"]`);
        if (playingVideoItem) {
            playingVideoItem.classList.add('active');
            currentPlayingVideoElement = playingVideoItem;
        }
    }
}

// Ana sayfa için varsayılan sureler listesi
function renderDefaultHomePage() {
    const defaultSurelerGrid = document.getElementById('default-sureler-grid');
    
    const sureler = [];
    allData.forEach(item => {
        if (item.standart_sure_ad && !sureler.some(s => s.sure_ad === item.standart_sure_ad)) {
            sureler.push({ sure_ad: item.standart_sure_ad, sure_no: item.sure_no });
        }
    });

    sureler.sort((a, b) => parseInt(a.sure_no) - parseInt(b.sure_no));

    sureler.forEach(sure => {
        // Ayet sayısı artık hardcoded sureAyetSayilari objesinden geliyor
        const currentSureInfo = sureInfo[sure.sure_ad] || { ayet_sayisi: 'Bilinmiyor', mufessir_count: 0, total_videos: 0 };
        const card = document.createElement('div');
        card.classList.add('card');
        card.innerHTML = `
            <h3>${sure.sure_ad}</h3>
            <p>Sure No: ${sure.sure_no}</p>
            <p>Ayet Sayısı: ${currentSureInfo.ayet_sayisi}</p>
            <p>Müfessir Sayısı: ${currentSureInfo.mufessir_count}</p>
            <p>Toplam Video: ${currentSureInfo.total_videos}</p>
        `;
        card.addEventListener('click', () => {
            window.location.href = `sureler.html?sure=${encodeURIComponent(sure.sure_ad)}`;
        });
        defaultSurelerGrid.appendChild(card);
    });
}

// Müfessirler sayfasını render etme fonksiyonu
function renderMufessirlerPage() {
    const mufessirlerGrid = document.getElementById('mufessirler-grid');
    const sureGridForMufessir = document.getElementById('sure-grid-for-mufessir');
    const mufessirVideoDetayDiv = document.getElementById('mufessir-video-detay');
    const pageTitle = document.getElementById('page-title');

    if (!mufessirlerGrid || !sureGridForMufessir || !mufessirVideoDetayDiv || !pageTitle) {
        console.error("Müfessirler sayfası için gerekli HTML elementleri bulunamadı.");
        return;
    }

    const mufessirler = [];
    allData.forEach(item => {
        if (item.mufessir && !mufessirler.some(m => m.mufessir === item.mufessir)) {
            const thumbnailUrl = item.video_thumbnail_url || 'img/placeholder-scholar.jpg';
            mufessirler.push({
                mufessir: item.mufessir,
                thumbnail: thumbnailUrl
            });
        }
    });

    mufessirler.sort((a, b) => a.mufessir.localeCompare(b.mufessir, 'tr', { sensitivity: 'base' }));

    const selectedMufessir = getUrlParameter('mufessir');
    const selectedSureFromUrl = getUrlParameter('sure');

    if (selectedMufessir) {
        if (selectedSureFromUrl) {
            pageTitle.innerHTML = `<a href="mufessirler.html?mufessir=${encodeURIComponent(selectedMufessir)}">${selectedMufessir}</a> - ${selectedSureFromUrl} Suresi Tefsirleri`;
        } else {
            pageTitle.innerHTML = `<a href="mufessirler.html?mufessir=${encodeURIComponent(selectedMufessir)}">${selectedMufessir}</a> Tefsirleri`;
        }
        
        mufessirlerGrid.classList.add('hidden');
        sureGridForMufessir.classList.remove('hidden');
        mufessirVideoDetayDiv.classList.add('hidden');

        const surelerForMufessir = [];
        allData.filter(item => item.mufessir === selectedMufessir).forEach(video => {
            if (video.standart_sure_ad && !surelerForMufessir.some(s => s.standart_sure_ad === video.standart_sure_ad)) {
                surelerForMufessir.push({
                    standart_sure_ad: video.standart_sure_ad,
                    sure_no: video.sure_no
                });
            }
        });
        surelerForMufessir.sort((a, b) => parseInt(a.sure_no) - parseInt(b.sure_no));

        sureGridForMufessir.innerHTML = '';
        surelerForMufessir.forEach(sure => {
            const videoCount = mufessirSureVideoCounts[selectedMufessir]?.[sure.standart_sure_ad] || 0;
            const card = document.createElement('div');
            card.classList.add('card');
            card.innerHTML = `
                <h3>${sure.standart_sure_ad}</h3>
                <p>Sure No: ${sure.sure_no}</p>
                <p>Video Sayısı: ${videoCount}</p>
            `;
            card.addEventListener('click', () => {
                window.location.href = `mufessirler.html?mufessir=${encodeURIComponent(selectedMufessir)}&sure=${encodeURIComponent(sure.standart_sure_ad)}`;
            });
            sureGridForMufessir.appendChild(card);
        });

        if (selectedSureFromUrl) {
            sureGridForMufessir.classList.add('hidden');
            mufessirVideoDetayDiv.classList.remove('hidden');
            displayVideosForMufessirAndSure(selectedMufessir, selectedSureFromUrl);
        }

    } else {
        mufessirlerGrid.classList.remove('hidden');
        sureGridForMufessir.classList.add('hidden');
        mufessirVideoDetayDiv.classList.add('hidden');
        pageTitle.textContent = "Müfessirler";

        mufessirlerGrid.innerHTML = '';
        mufessirler.forEach(mufessirData => {
            const totalMufessirVideos = Object.values(mufessirSureVideoCounts[mufessirData.mufessir] || {}).reduce((sum, count) => sum + count, 0);
            const card = document.createElement('div');
            card.classList.add('card', 'mufessir-card');
            
            card.innerHTML = `
                <img src="${mufessirData.thumbnail}" alt="${mufessirData.mufessir}">
                <div class="mufessir-card-info">
                    <h3>${mufessirData.mufessir}</h3>
                    <p>Toplam Video: ${totalMufessirVideos}</p>
                </div>
            `;
            card.addEventListener('click', () => {
                window.location.href = `mufessirler.html?mufessir=${encodeURIComponent(mufessirData.mufessir)}`;
            });
            mufessirlerGrid.appendChild(card);
        });
    }
}

// Belirli müfessir ve sure için videoları göster
function displayVideosForMufessirAndSure(mufessirAd, sureAd) {
    const mufessirVideoPlayer = document.getElementById('mufessir-video-player');
    const mufessirVideoDetayBaslik = document.getElementById('mufessir-video-detay-baslik');
    const mufessirIlgiliVideolarListesi = document.getElementById('mufessir-ilgili-videolar-listesi');

    const videos = allData.filter(item => item.mufessir === mufessirAd && item.standart_sure_ad === sureAd);

    if (videos.length > 0) {
        playVideo(videos[0], mufessirVideoPlayer, mufessirVideoDetayBaslik, mufessirIlgiliVideolarListesi);

        mufessirIlgiliVideolarListesi.innerHTML = '<h3>İlgili Videolar</h3>';
        videos.forEach(video => {
            const videoItem = document.createElement('div');
            videoItem.classList.add('video-item');
            videoItem.dataset.videoId = video.youtube_video_id;
            videoItem.innerHTML = `
                <img src="${video.video_thumbnail_url}" alt="${video.video_baslik}">
                <div class="video-item-info">
                    <h4>${video.video_baslik}</h4>
                    <p>${video.mufessir}</p>
                </div>
            `;
            videoItem.addEventListener('click', () => playVideo(video, mufessirVideoPlayer, mufessirVideoDetayBaslik, mufessirIlgiliVideolarListesi));
            mufessirIlgiliVideolarListesi.appendChild(videoItem);
        });
        const firstVideoItem = mufessirIlgiliVideolarListesi.querySelector('.video-item');
        if (firstVideoItem) {
            firstVideoItem.classList.add('active');
            currentPlayingVideoElement = firstVideoItem;
        }

    } else {
        mufessirIlgiliVideolarListesi.innerHTML = `<p>Bu müfessir ve sure için video bulunamadı.</p>`;
        mufessirVideoPlayer.src = "";
        mufessirVideoDetayBaslik.textContent = "";
    }
}

function renderSurelerInHome() {
    const grid = document.getElementById('default-sureler-grid');
    grid.innerHTML = '';
    grid.classList.remove('hidden');
    document.getElementById('default-mufessirler-grid').classList.add('hidden');

    const sureler = [];
    allData.forEach(item => {
        if (item.standart_sure_ad && !sureler.some(s => s.sure_ad === item.standart_sure_ad)) {
            sureler.push({ sure_ad: item.standart_sure_ad, sure_no: item.sure_no });
        }
    });

    sureler.sort((a, b) => parseInt(a.sure_no) - parseInt(b.sure_no));

    sureler.forEach(sure => {
        // Ayet sayısı artık hardcoded sureAyetSayilari objesinden geliyor
        const currentSureInfo = sureInfo[sure.sure_ad] || { ayet_sayisi: 'Bilinmiyor', mufessir_count: 0, total_videos: 0 };
        const card = document.createElement('div');
        card.classList.add('card');
        card.innerHTML = `
            <h3>${sure.sure_ad}</h3>
            <p>Sure No: ${sure.sure_no}</p>
            <p>Ayet Sayısı: ${currentSureInfo.ayet_sayisi}</p>
            <p>Müfessir Sayısı: ${currentSureInfo.mufessir_count}</p>
            <p>Toplam Video: ${currentSureInfo.total_videos}</p>
        `;
        card.addEventListener('click', () => {
            window.location.href = `sureler.html?sure=${encodeURIComponent(sure.sure_ad)}`;
        });
        grid.appendChild(card);
    });
}

function renderMufessirlerInHome() {
    const grid = document.getElementById('default-mufessirler-grid');
    grid.innerHTML = '';
    grid.classList.remove('hidden');
    document.getElementById('default-sureler-grid').classList.add('hidden');

    const mufessirler = [];
    allData.forEach(item => {
        if (item.mufessir && !mufessirler.some(m => m.mufessir === item.mufessir)) {
            mufessirler.push({
                mufessir: item.mufessir,
                thumbnail: item.video_thumbnail_url || 'img/placeholder-scholar.jpg'
            });
        }
    });

    mufessirler.sort((a, b) => a.mufessir.localeCompare(b.mufessir, 'tr', { sensitivity: 'base' }));

    mufessirler.forEach(mufessirData => {
        const totalMufessirVideos = Object.values(mufessirSureVideoCounts[mufessirData.mufessir] || {}).reduce((sum, count) => sum + count, 0);
        const card = document.createElement('div');
        card.classList.add('card', 'mufessir-card');
        card.innerHTML = `
            <img src="${mufessirData.thumbnail}" class="mufessir-thumbnail" alt="${mufessirData.mufessir}">
            <div class="mufessir-card-info">
                <h3>${mufessirData.mufessir}</h3>
                <p>Toplam Video: ${totalMufessirVideos}</p>
            </div>
        `;
        card.addEventListener('click', () => {
            window.location.href = `mufessirler.html?mufessir=${encodeURIComponent(mufessirData.mufessir)}`;
        });
        grid.appendChild(card);
    });
}

// Butonlara tıklama olayları
document.addEventListener('DOMContentLoaded', () => {
    const sureBtn = document.getElementById('show-sureler');
    const mufessirBtn = document.getElementById('show-mufessirler');

    if (sureBtn && mufessirBtn) {
        sureBtn.addEventListener('click', () => {
            renderSurelerInHome();
            sureBtn.classList.add('active');
            mufessirBtn.classList.remove('active');
        });

        mufessirBtn.addEventListener('click', () => {
            renderMufessirlerInHome();
            mufessirBtn.classList.add('active');
            sureBtn.classList.remove('active');
        });
    }
});