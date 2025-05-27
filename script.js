// CSV dosyasını okuma fonksiyonu
async function loadCSV(filePath) {
    try {
        const response = await fetch(filePath);
        if (!response.ok) throw new Error(`HTTP hatası: ${response.status}`);
        const text = await response.text();
        const parsed = Papa.parse(text, {
            header: true,
            skipEmptyLines: true,
            delimiter: ";"
        });
        if (!parsed.data || parsed.data.length === 0) {
            throw new Error("CSV verisi boş veya geçersiz.");
        }
        console.log("CSV sütunları:", parsed.meta.fields);
        console.log("CSV verisi:", parsed.data);
        return parsed.data;
    } catch (error) {
        console.error("CSV yükleme hatası:", error);
        const contentArea = document.getElementById('content-area');
        if (contentArea) {
            contentArea.innerHTML = `<p style="color: red;">Hata: Veri yüklenemedi. Lütfen daha sonra tekrar deneyin.</p>`;
        }
        throw error;
    }
}

// URL'deki parametreleri alma fonksiyonu
function getUrlParameter(name) {
    name = name.replace(/[\[]/, '\\[').replace(/[\]]/, '\\]');
    var regex = new RegExp('[\\?&]' + name + '=([^&#]*)');
    var results = regex.exec(location.search);
    var value = results === null ? '' : decodeURIComponent(results[1].replace(/\+/g, ' '));
    // Parametreyi doğrula
    if (value.length > 100 || /[<>"'{}]/.test(value)) {
        console.warn(`Geçersiz URL parametresi: ${name}=${value}`);
        return '';
    }
    return value;
}

// XSS önleme için HTML kaçırma (escaping) yardımcı fonksiyonu
function escapeHTML(str) {
    if (typeof str !== 'string') {
        if (str === null || str === undefined) {
            return '';
        }
        str = String(str);
    }
    var div = document.createElement('div');
    div.appendChild(document.createTextNode(str));
    return div.innerHTML;
}

let allData = [];
let currentPlayingVideoElement = null;
let cachedSureler = []; // Yeni: Sureler için önbellek
let cachedMufessirler = []; // Yeni: Müfessirler için önbellek

// Hardcoded Sure Metadata (ayet_sayisi, Arabic name, Turkish meaning)
const sureMetadata = {
    "Fatiha": { ayet: 7, arabic: "الفاتحة", meaning: "Açılış" },
    "Bakara": { ayet: 286, arabic: "البقرة", meaning: "İnek" },
    "Ali İmran": { ayet: 200, arabic: "آل عمران", meaning: "İmran Ailesi" },
    "Nisa": { ayet: 176, arabic: "النساء", meaning: "Kadınlar" },
    "Maide": { ayet: 120, arabic: "المائدة", meaning: "Sofra" },
    "Enam": { ayet: 165, arabic: "الأنعام", meaning: "En'am (Hayvanlar)" },
    "Araf": { ayet: 206, arabic: "الأعراف", meaning: "A'raf (Surlar)" },
    "Enfal": { ayet: 75, arabic: "الأنفال", meaning: "Ganimetler" },
    "Tevbe": { ayet: 129, arabic: "التوبة", meaning: "Tevbe (Tövbe)" },
    "Yunus": { ayet: 109, arabic: "يونس", meaning: "Yunus" },
    "Hud": { ayet: 123, arabic: "هود", meaning: "Hud" },
    "Yusuf": { ayet: 111, arabic: "يوسف", meaning: "Yusuf" },
    "Rad": { ayet: 43, arabic: "الرعد", meaning: "Gök Gürültüsü" },
    "İbrahim": { ayet: 52, arabic: "إبراهيم", meaning: "İbrahim" },
    "Hicr": { ayet: 99, arabic: "الحجر", meaning: "Hicr (Taşlı Bölge)" },
    "Nahl": { ayet: 128, arabic: "النحل", meaning: "Arı" },
    "İsra": { ayet: 111, arabic: "الإسراء", meaning: "İsra (Gece Yürüyüşü)" },
    "Kehf": { ayet: 110, arabic: "الكهف", meaning: "Kehf (Mağara)" },
    "Meryem": { ayet: 98, arabic: "مريم", meaning: "Meryem" },
    "TaHa": { ayet: 135, arabic: "طه", meaning: "Ta-Ha" },
    "Enbiya": { ayet: 112, arabic: "الأنبياء", meaning: "Peygamberler" },
    "Hac": { ayet: 78, arabic: "الحج", meaning: "Hac" },
    "Müminun": { ayet: 118, arabic: "المؤمنون", meaning: "Mü'minler" },
    "Nur": { ayet: 64, arabic: "النور", meaning: "Nur (Işık)" },
    "Furkan": { ayet: 77, arabic: "الفرقان", meaning: "Furkan (İyi ile Kötüyü Ayıran)" },
    "Şuara": { ayet: 227, arabic: "الشعراء", meaning: "Şuara (Şairler)" },
    "Neml": { ayet: 93, arabic: "النمل", meaning: "Neml (Karınca)" },
    "Kasas": { ayet: 88, arabic: "القصص", meaning: "Kasas (Kıssalar)" },
    "Ankebut": { ayet: 69, arabic: "العنكبوت", meaning: "Ankebut (Örümcek)" },
    "Rum": { ayet: 60, arabic: "الروم", meaning: "Rum (Bizanslılar)" },
    "Lokman": { ayet: 34, arabic: "لقمان", meaning: "Lokman" },
    "Secde": { ayet: 30, arabic: "السجدة", meaning: "Secde" },
    "Ahzab": { ayet: 73, arabic: "الأحزاب", meaning: "Ahzab (Birleşik Kuvvetler)" },
    "Sebe": { ayet: 54, arabic: "سبأ", meaning: "Sebe" },
    "Fatır": { ayet: 45, arabic: "فاطر", meaning: "Fatır (Yaratıcı)" },
    "Yasin": { ayet: 83, arabic: "يس", meaning: "Ya-Sin" },
    "Saffat": { ayet: 182, arabic: "الصافات", meaning: "Saffat (Saf Saf Duranlar)" },
    "Sad": { ayet: 88, arabic: "ص", meaning: "Sad" },
    "Zümer": { ayet: 75, arabic: "الزمر", meaning: "Zümer (Gruplar)" },
    "Mümin": { ayet: 85, arabic: "غافر", meaning: "Mü'min (İnanan)" }, // Gafir olarak da bilinir
    "Fussilet": { ayet: 54, arabic: "فصلت", meaning: "Fussilet (Açıkça Anlatılmış)" },
    "Şura": { ayet: 53, arabic: "الشورى", meaning: "Şura (Danışma)" },
    "Zuhruf": { ayet: 89, arabic: "الزخرف", meaning: "Zuhruf (Altın Süsler)" },
    "Duhan": { ayet: 59, arabic: "الدخان", meaning: "Duhan (Duman)" },
    "Casiye": { ayet: 37, arabic: "الجاثية", meaning: "Casiye (Diz Çöken)" },
    "Ahkaf": { ayet: 35, arabic: "الأحقاف", meaning: "Ahkaf (Kum Tepeleri)" },
    "Muhammed": { ayet: 38, arabic: "محمد", meaning: "Muhammed" },
    "Fetih": { ayet: 29, arabic: "الفتح", meaning: "Fetih (Zafer)" },
    "Hucurat": { ayet: 18, arabic: "الحجرات", meaning: "Hucurat (Odalar)" },
    "Kaf": { ayet: 45, arabic: "ق", meaning: "Kaf" },
    "Zariyat": { ayet: 60, arabic: "الذاريات", meaning: "Zariyat (Tozutanlar)" },
    "Tur": { ayet: 49, arabic: "الطور", meaning: "Tur (Dağ)" },
    "Necm": { ayet: 62, arabic: "النجم", meaning: "Necm (Yıldız)" },
    "Kamer": { ayet: 55, arabic: "القمر", meaning: "Kamer (Ay)" },
    "Rahman": { ayet: 78, arabic: "الرحمن", meaning: "Rahman (Rahmet Eden)" },
    "Vakıa": { ayet: 96, arabic: "الواقعة", meaning: "Vakıa (Kıyamet)" },
    "Hadid": { ayet: 29, arabic: "الحديد", meaning: "Hadid (Demir)" },
    "Mücadele": { ayet: 22, arabic: "المجادلة", meaning: "Mücadele (Münakaşa)" },
    "Haşr": { ayet: 24, arabic: "الحشر", meaning: "Haşr (Toplanma)" },
    "Mümtehine": { ayet: 13, arabic: "الممتحنة", meaning: "Mümtehine (İmtihan Edilen Kadın)" },
    "Saf": { ayet: 14, arabic: "الصف", meaning: "Saff (Sıra)" },
    "Cuma": { ayet: 11, arabic: "الجمعة", meaning: "Cuma" },
    "Münafikun": { ayet: 11, arabic: "المنافقون", meaning: "Münafikun (Münafıklar)" },
    "Teğabun": { ayet: 18, arabic: "التغابن", meaning: "Teğabun (Aldanma)" },
    "Talak": { ayet: 12, arabic: "الطلاق", meaning: "Talak (Boşanma)" },
    "Tahrim": { ayet: 12, arabic: "التحريم", meaning: "Tahrim (Haram Kılma)" },
    "Mülk": { ayet: 30, arabic: "الملك", meaning: "Mülk (Egemenlik)" },
    "Kalem": { ayet: 52, arabic: "القلم", meaning: "Kalem" },
    "Hakka": { ayet: 52, arabic: "الحاقة", meaning: "Hakka (Gerçek)" },
    "Mearic": { ayet: 44, arabic: "المعارج", meaning: "Mearic (Yükselme Dereceleri)" },
    "Nuh": { ayet: 28, arabic: "نوح", meaning: "Nuh" },
    "Cin": { ayet: 28, arabic: "الجن", meaning: "Cinn (Cinler)" },
    "Müzzemmil": { ayet: 20, arabic: "المزمل", meaning: "Müzzemmil (Örtünüp Bürünen)" },
    "Müddessir": { ayet: 56, arabic: "المدثر", meaning: "Bürünüp Sarınan" },
    "Kıyamet": { ayet: 40, arabic: "القيامة", meaning: "Kıyamet" },
    "İnsan": { ayet: 31, arabic: "الإنسان", meaning: "İnsan" },
    "Mürselat": { ayet: 50, arabic: "المرسلات", meaning: "Mürselat (Gönderilenler)" },
    "Nebe": { ayet: 40, arabic: "النبأ", meaning: "Nebe (Haber)" },
    "Naziat": { ayet: 46, arabic: "النازعات", meaning: "Naziat (Söküp Alanlar)" },
    "Abese": { ayet: 42, arabic: "عبس", meaning: "Abese (Yüz Ekşitti)" },
    "Tekvir": { ayet: 29, arabic: "التكوير", meaning: "Tekvir (Dürüp Bükme)" },
    "İnfitar": { ayet: 19, arabic: "الإنفطار", meaning: "Yarılma" },
    "Mutaffifin": { ayet: 36, arabic: "المطففين", meaning: "Ölçüde ve Tartıda Hile Yapanlar" },
    "İnşikak": { ayet: 25, arabic: "الإنشقاق", meaning: "Yarılma" },
    "Buruc": { ayet: 22, arabic: "البروج", meaning: "Burçlar" },
    "Tarık": { ayet: 17, arabic: "الطارق", meaning: "Gece Gelen" },
    "Ala": { ayet: 19, arabic: "الأعلى", meaning: "En Yüce" },
    "Gaşiye": { ayet: 26, arabic: "الغاشية", meaning: "Her Şeyi Kaplayan" },
    "Fecr": { ayet: 30, arabic: "الفجر", meaning: "Şafak" },
    "Beled": { ayet: 20, arabic: "البلد", meaning: "Şehir" },
    "Şems": { ayet: 15, arabic: "الشمس", meaning: "Güneş" },
    "Leyl": { ayet: 21, arabic: "الليل", meaning: "Gece" },
    "Duha": { ayet: 11, arabic: "الضحى", meaning: "Kuşluk Vakti" },
    "İnşirah": { ayet: 8, arabic: "الشرح", meaning: "Ferahlama" }, // Şerh olarak da bilinir
    "Tin": { ayet: 8, arabic: "التين", meaning: "İncir" },
    "Alak": { ayet: 19, arabic: "العلق", meaning: "Kan Pıhtısı" },
    "Kadir": { ayet: 5, arabic: "القدر", meaning: "Kadir Gecesi" },
    "Beyyine": { ayet: 8, arabic: "البينة", meaning: "Apaçık Delil" },
    "Zilzal": { ayet: 8, arabic: "الزلزلة", meaning: "Deprem" },
    "Adiyat": { ayet: 11, arabic: "العاديات", meaning: "Koşan Atlar" },
    "Karia": { ayet: 11, arabic: "القارعة", meaning: "Kapı Çalan Kıyamet" },
    "Tekasür": { ayet: 8, arabic: "التكاثر", meaning: "Çoğalma Yarışı" },
    "Asr": { ayet: 3, arabic: "العصر", meaning: "İkindi Vakti" },
    "Hümeze": { ayet: 9, arabic: "الهمزة", meaning: "Kusur Arayan" },
    "Fil": { ayet: 5, arabic: "الفيل", meaning: "Fil" },
    "Kureyş": { ayet: 4, arabic: "قريش", meaning: "Kureyş" },
    "Maun": { ayet: 7, arabic: "الماعون", meaning: "Yardım" },
    "Kevser": { ayet: 3, arabic: "الكوثر", meaning: "Kevser (Cennette Bir Nehir)" },
    "Kafirun": { ayet: 6, arabic: "الكافرون", meaning: "Kafirler" },
    "Nasr": { ayet: 3, arabic: "النصر", meaning: "Yardım" },
    "Tebbet": { ayet: 5, arabic: "المسد", meaning: "Kurusun (Leheb)" }, // Mesed olarak da bilinir
    "İhlas": { ayet: 4, arabic: "الإخلاص", meaning: "Samimiyet (İhlas)" },
    "Felak": { ayet: 5, arabic: "الفلق", meaning: "Sabahın Aydınlığı" },
    "Nas": { ayet: 6, arabic: "الناس", meaning: "İnsanlar" }
};

// Helper objects for pre-processed data
let sureInfo = {};
let mufessirSureVideoCounts = {};

// Function to pre-process data for counts and info
function preprocessData() {
    sureInfo = {};
    mufessirSureVideoCounts = {};
    cachedSureler = [];
    cachedMufessirler = [];

    allData.forEach(item => {
        const sureAd = item.standart_sure_ad;
        const mufessirAd = item.mufessir;
        const sureMeta = sureMetadata[sureAd];
        const ayetSayisi = sureMeta ? sureMeta.ayet : 'Bilinmiyor';
        const arabicName = sureMeta ? sureMeta.arabic : 'Bilinmiyor';
        const meaningTr = sureMeta ? sureMeta.meaning : 'Bilinmiyor';

        // Sure listesi önbellekleme
        if (sureAd && !cachedSureler.some(s => s.sure_ad === sureAd)) {
            cachedSureler.push({ sure_ad: sureAd, sure_no: item.sure_no });
        }

        // Müfessir listesi önbellekleme
        if (mufessirAd && !cachedMufessirler.some(m => m.mufessir === mufessirAd)) {
            cachedMufessirler.push({
                mufessir: mufessirAd,
                thumbnail: item.video_thumbnail_url || 'img/placeholder-scholar.jpg'
            });
        }

        // Populate sureInfo
        if (!sureInfo[sureAd]) {
            sureInfo[sureAd] = {
                ayet_sayisi: ayetSayisi,
                mufessirs: new Set(),
                total_videos: 0,
                arabic_name: arabicName,
                meaning_tr: meaningTr
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

    // Önbellekleri sırala
    cachedSureler.sort((a, b) => parseInt(a.sure_no) - parseInt(b.sure_no));
    cachedMufessirler.sort((a, b) => a.mufessir.localeCompare(b.mufessir, 'tr', { sensitivity: 'base' }));

    // Convert Set to size for mufessir_count
    for (const sure in sureInfo) {
        sureInfo[sure].mufessir_count = sureInfo[sure].mufessirs.size;
        delete sureInfo[sure].mufessirs;
    }
}

// Sureler sayfasını render etme fonksiyonu
function renderSurelerPage() {
    const surelerGrid = document.getElementById('sureler-grid');
    const mufessirGridForSure = document.getElementById('mufessir-grid-for-sure');
    const videoDetayDiv = document.getElementById('video-detay');
    const pageTitle = document.getElementById('page-title');

    if (!surelerGrid || !mufessirGridForSure || !videoDetayDiv || !pageTitle) {
        console.error("Sureler sayfası için gerekli HTML elementleri bulunamadı.");
        return;
    }

    const selectedSure = getUrlParameter('sure');
    const selectedMufessirFromUrl = getUrlParameter('mufessir');

    if (selectedSure) {
        if (selectedMufessirFromUrl) {
            pageTitle.innerHTML = `${escapeHTML(selectedSure)} Suresi - <a href="mufessirler.html?mufessir=${encodeURIComponent(selectedMufessirFromUrl)}" rel="noopener noreferrer">${escapeHTML(selectedMufessirFromUrl)}</a> Tefsirleri`;
        } else {
            pageTitle.textContent = `${escapeHTML(selectedSure)} Suresi`;
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

        mufessirGridForSure.innerHTML = mufessirlerForSure.map(mufessirData => {
            const videoCount = mufessirSureVideoCounts[mufessirData.mufessir]?.[selectedSure] || 0;
            return `
                <div class="card mufessir-card" onclick="window.location.href='sureler.html?sure=${encodeURIComponent(selectedSure)}&mufessir=${encodeURIComponent(mufessirData.mufessir)}'">
                    <img src="${escapeHTML(mufessirData.thumbnail)}" alt="${escapeHTML(mufessirData.mufessir)} thumbnail" class="mufessir-thumbnail">
                    <div class="mufessir-card-info">
                        <h3>${escapeHTML(mufessirData.mufessir)}</h3>
                        <p>Video Sayısı: ${escapeHTML(videoCount)}</p>
                    </div>
                </div>
            `;
        }).join('');

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

        surelerGrid.innerHTML = cachedSureler.map(sure => {
            const currentSureInfo = sureInfo[sure.sure_ad] || { ayet_sayisi: 'Bilinmiyor', mufessir_count: 0, total_videos: 0, arabic_name: 'Bilinmiyor', meaning_tr: 'Bilinmiyor' };
            return `
                <a href="sureler.html?sure=${encodeURIComponent(sure.sure_ad)}" class="surah-item-link" rel="noopener noreferrer">
                    <div class="surah-card-content">
                        <div class="surah-card-left">
                            <div class="surah-number-circle">${escapeHTML(sure.sure_no)}</div>
                            <div class="surah-name-container">
                                <span class="surah-name-latin">${escapeHTML(sure.sure_ad)}</span>
                                <span class="surah-meaning">${escapeHTML(currentSureInfo.meaning_tr)}</span>
                            </div>
                        </div>
                        <div class="surah-card-right">
                            <span class="surah-name-arabic">${escapeHTML(currentSureInfo.arabic_name)}</span>
                            <span class="surah-ayahs">${escapeHTML(currentSureInfo.ayet_sayisi)} Ayet</span>
                        </div>
                    </div>
                    <div style="padding: 0 20px 10px; font-size: 0.85em; color: #666;">
                        Müfessir Sayısı: ${escapeHTML(currentSureInfo.mufessir_count)} | Toplam Video: ${escapeHTML(currentSureInfo.total_videos)}
                    </div>
                </a>
            `;
        }).join('');
    }
}

// Belirli sure ve müfessir için videoları göster
function displayVideosForSureAndMufessir(sureAd, mufessirAd) {
    const videoPlayer = document.getElementById('video-player');
    const videoDetayBaslik = document.getElementById('video-detay-baslik');
    const ilgiliVideolarListesi = document.getElementById('ilgili-videolar-listesi');
    const videoDetayAciklama = document.getElementById('video-detay-aciklama');
    const tagsContainerId = 'video-tags-sureler';

    if (!videoPlayer || !videoDetayBaslik || !ilgiliVideolarListesi || !videoDetayAciklama) {
        console.error("Video detay sayfası için gerekli HTML elementleri bulunamadı.");
        return;
    }

    const videos = allData.filter(item => item.standart_sure_ad === sureAd && item.mufessir === mufessirAd);

    if (videos.length > 0) {
        playVideo(videos[0], videoPlayer, videoDetayBaslik, ilgiliVideolarListesi, videoDetayAciklama, tagsContainerId);

        ilgiliVideolarListesi.innerHTML = '<h3>İlgili Videolar</h3>' + videos.map(video => `
            <div class="video-item" data-video-id="${video.youtube_video_id}">
                <img src="${escapeHTML(video.video_thumbnail_url || 'img/placeholder-video.jpg')}" alt="${escapeHTML(video.video_baslik)}">
                <div class="video-item-info">
                    <h4>${escapeHTML(video.video_baslik)}</h4>
                    <p>${escapeHTML(video.mufessir)}</p>
                </div>
            </div>
        `).join('');

        const videoItems = ilgiliVideolarListesi.querySelectorAll('.video-item');
        videoItems.forEach(item => {
            item.addEventListener('click', () => {
                const videoId = item.dataset.videoId;
                const video = videos.find(v => v.youtube_video_id === videoId);
                if (video) {
                    playVideo(video, videoPlayer, videoDetayBaslik, ilgiliVideolarListesi, videoDetayAciklama, tagsContainerId);
                }
            });
        });

        const firstVideoItem = ilgiliVideolarListesi.querySelector(`.video-item[data-video-id="${videos[0].youtube_video_id}"]`);
        if (firstVideoItem) {
            firstVideoItem.classList.add('active');
            currentPlayingVideoElement = firstVideoItem;
        }
    } else {
        ilgiliVideolarListesi.innerHTML = `<p>Bu sure ve müfessir için video bulunamadı.</p>`;
        videoPlayer.src = '';
        videoDetayBaslik.textContent = 'Video Bulunamadı';
        videoDetayAciklama.textContent = 'Açıklama bulunamadı.';
        const tagsContainer = document.getElementById(tagsContainerId);
        if (tagsContainer) tagsContainer.innerHTML = '';
    }
}

// Video oynatma fonksiyonu
function playVideo(videoData, playerElement, titleElement, videoListContainer, descriptionElement, tagsContainerId) {
    if (currentPlayingVideoElement) {
        currentPlayingVideoElement.classList.remove('active');
    }

    const youtubeIdRegex = /^[a-zA-Z0-9_-]{11}$/;
    const videoId = videoData.youtube_video_id?.trim();
    if (!videoId || !youtubeIdRegex.test(videoId)) {
        console.error('Geçersiz YouTube Video ID:', videoData);
        if (titleElement) titleElement.textContent = 'Hata: Video yüklenemedi (Geçersiz ID)';
        if (playerElement) playerElement.src = '';
        if (descriptionElement) descriptionElement.textContent = 'Açıklama bulunamadı.';
        const tagsContainerOnError = document.getElementById(tagsContainerId);
        if (tagsContainerOnError) tagsContainerOnError.innerHTML = '';
        return;
    }

    const embedSrc = `https://www.youtube.com/embed/${videoId}?rel=0&controls=1&autoplay=0`;

    try {
        if (playerElement) {
            playerElement.src = embedSrc;

            if (titleElement) titleElement.textContent = escapeHTML(videoData.video_baslik || 'Video Başlığı Bulunamadı');
            if (descriptionElement) {
                descriptionElement.textContent = videoData.video_aciklama || 'Açıklama bulunamadı.'; // innerHTML yerine textContent
            }

            const tagsContainer = document.getElementById(tagsContainerId);
            if (tagsContainer) {
                tagsContainer.innerHTML = '';

                if (videoData.mufessir) {
                    const mufessirTag = document.createElement('a');
                    mufessirTag.href = `mufessirler.html?mufessir=${encodeURIComponent(videoData.mufessir)}`;
                    mufessirTag.rel = 'noopener noreferrer';
                    mufessirTag.classList.add('video-tag', 'mufessir-tag');
                    mufessirTag.textContent = escapeHTML(videoData.mufessir);
                    tagsContainer.appendChild(mufessirTag);
                }

                if (videoData.standart_sure_ad && videoData.sure_no) {
                    const sureTag = document.createElement('a');
                    sureTag.href = `sureler.html?sure=${encodeURIComponent(videoData.standart_sure_ad)}`;
                    sureTag.rel = 'noopener noreferrer';
                    sureTag.classList.add('video-tag', 'sure-tag');
                    sureTag.textContent = `${escapeHTML(videoData.sure_no)}. ${escapeHTML(videoData.standart_sure_ad)} Suresi`;
                    tagsContainer.appendChild(sureTag);
                }
            }

            if (videoListContainer) {
                const playingVideoItem = videoListContainer.querySelector(`[data-video-id="${videoId}"]`);
                if (playingVideoItem) {
                    playingVideoItem.classList.add('active');
                    currentPlayingVideoElement = playingVideoItem;
                }
            }

            playerElement.onerror = (e) => {
                console.error(`Video iframe yükleme hatası: ${videoId}`, e);
                if (titleElement) titleElement.textContent = 'Hata: Video oynatılamıyor';
                if (descriptionElement) descriptionElement.textContent = 'Açıklama bulunamadı.';
                if (tagsContainer) tagsContainer.innerHTML = '';

                const errorMessage = document.createElement('div');
                errorMessage.style.color = 'red';
                errorMessage.style.marginTop = '10px';
                errorMessage.textContent = 'Video yüklenemedi. Lütfen bağlantıyı kontrol edin.';
                playerElement.parentElement.appendChild(errorMessage);

                const fallbackLink = document.createElement('a');
                fallbackLink.href = `https://www.youtube.com/watch?v=${videoId}`;
                fallbackLink.textContent = "Videoyu YouTube'da İzle";
                fallbackLink.target = "_blank";
                fallbackLink.rel = 'noopener noreferrer';
                fallbackLink.style.display = 'block';
                fallbackLink.style.marginTop = '10px';
                playerElement.parentElement.appendChild(fallbackLink);
            };
        } else {
            console.error("Player element (iframe) bulunamadı.");
            if (titleElement) titleElement.textContent = 'Hata: Video oynatıcı elementi bulunamadı.';
            if (descriptionElement) descriptionElement.textContent = 'Açıklama bulunamadı.';
            const tagsContainerOnError = document.getElementById(tagsContainerId);
            if (tagsContainerOnError) tagsContainerOnError.innerHTML = '';
        }
    } catch (error) {
        console.error('Video oynatma sırasında genel bir hata oluştu:', error);
        if (titleElement) titleElement.textContent = 'Hata: Video yüklenemedi (Genel Hata)';
        if (playerElement) playerElement.src = '';
        if (descriptionElement) descriptionElement.textContent = 'Açıklama bulunamadı.';
        const tagsContainerOnError = document.getElementById(tagsContainerId);
        if (tagsContainerOnError) tagsContainerOnError.innerHTML = '';
    }
}

// Ana sayfa için varsayılan sureler listesi
function renderDefaultHomePage() {
    const defaultSurelerGrid = document.getElementById('default-sureler-grid');
    if (!defaultSurelerGrid) {
        console.warn("Ana sayfa sure grid elementi ('default-sureler-grid') bulunamadı.");
        return;
    }
    renderSurelerInHome();
    const sureBtn = document.getElementById('show-sureler');
    const mufessirBtn = document.getElementById('show-mufessirler');
    if (sureBtn && mufessirBtn) {
        sureBtn.classList.add('active');
        mufessirBtn.classList.remove('active');
    }
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

    const selectedMufessir = getUrlParameter('mufessir');
    const selectedSureFromUrl = getUrlParameter('sure');

    if (selectedMufessir) {
        if (selectedSureFromUrl) {
            pageTitle.innerHTML = `<a href="mufessirler.html?mufessir=${encodeURIComponent(selectedMufessir)}" rel="noopener noreferrer">${escapeHTML(selectedMufessir)}</a> - ${escapeHTML(selectedSureFromUrl)} Suresi Tefsirleri`;
        } else {
            pageTitle.innerHTML = `<a href="mufessirler.html?mufessir=${encodeURIComponent(selectedMufessir)}" rel="noopener noreferrer">${escapeHTML(selectedMufessir)}</a> Tefsirleri`;
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

        sureGridForMufessir.innerHTML = surelerForMufessir.map(sure => {
            const videoCount = mufessirSureVideoCounts[selectedMufessir]?.[sure.standart_sure_ad] || 0;
            const currentSureInfo = sureInfo[sure.standart_sure_ad] || { ayet_sayisi: 'Bilinmiyor', arabic_name: 'Bilinmiyor', meaning_tr: 'Bilinmiyor' };
            return `
                <a href="mufessirler.html?mufessir=${encodeURIComponent(selectedMufessir)}&sure=${encodeURIComponent(sure.standart_sure_ad)}" class="surah-item-link" rel="noopener noreferrer">
                    <div class="surah-card-content">
                        <div class="surah-card-left">
                            <div class="surah-number-circle">${escapeHTML(sure.sure_no)}</div>
                            <div class="surah-name-container">
                                <span class="surah-name-latin">${escapeHTML(sure.standart_sure_ad)}</span>
                                <span class="surah-meaning">${escapeHTML(currentSureInfo.meaning_tr)}</span>
                            </div>
                        </div>
                        <div class="surah-card-right">
                            <span class="surah-name-arabic">${escapeHTML(currentSureInfo.arabic_name)}</span>
                            <span class="surah-ayahs">${escapeHTML(currentSureInfo.ayet_sayisi)} Ayet</span>
                        </div>
                    </div>
                    <div style="padding: 0 20px 10px; font-size: 0.85em; color: #666;">
                        Video Sayısı: ${escapeHTML(videoCount)}
                    </div>
                </a>
            `;
        }).join('');

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

        mufessirlerGrid.innerHTML = cachedMufessirler.map(mufessirData => {
            const totalMufessirVideos = Object.values(mufessirSureVideoCounts[mufessirData.mufessir] || {}).reduce((sum, count) => sum + count, 0);
            return `
                <div class="card mufessir-card" onclick="window.location.href='mufessirler.html?mufessir=${encodeURIComponent(mufessirData.mufessir)}'">
                    <img src="${escapeHTML(mufessirData.thumbnail)}" class="mufessir-thumbnail" alt="${escapeHTML(mufessirData.mufessir)}">
                    <div class="mufessir-card-info">
                        <h3>${escapeHTML(mufessirData.mufessir)}</h3>
                        <p>Toplam Video: ${escapeHTML(totalMufessirVideos)}</p>
                    </div>
                </div>
            `;
        }).join('');
    }
}

// Belirli müfessir ve sure için videoları göster
function displayVideosForMufessirAndSure(mufessirAd, sureAd) {
    const mufessirVideoPlayer = document.getElementById('mufessir-video-player');
    const mufessirVideoDetayBaslik = document.getElementById('mufessir-video-detay-baslik');
    const mufessirIlgiliVideolarListesi = document.getElementById('mufessir-ilgili-videolar-listesi');
    const mufessirVideoDetayAciklama = document.getElementById('mufessir-video-detay-aciklama');
    const tagsContainerId = 'video-tags-mufessirler';

    if (!mufessirVideoPlayer || !mufessirVideoDetayBaslik || !mufessirIlgiliVideolarListesi || !mufessirVideoDetayAciklama) {
        console.error("Müfessir video detay sayfası için gerekli HTML elementleri bulunamadı.");
        return;
    }

    const videos = allData.filter(item => item.mufessir === mufessirAd && item.standart_sure_ad === sureAd);

    if (videos.length > 0) {
        playVideo(videos[0], mufessirVideoPlayer, mufessirVideoDetayBaslik, mufessirIlgiliVideolarListesi, mufessirVideoDetayAciklama, tagsContainerId);

        mufessirIlgiliVideolarListesi.innerHTML = '<h3>İlgili Videolar</h3>' + videos.map(video => `
            <div class="video-item" data-video-id="${video.youtube_video_id}">
                <img src="${escapeHTML(video.video_thumbnail_url || 'img/placeholder-video.jpg')}" alt="${escapeHTML(video.video_baslik)}">
                <div class="video-item-info">
                    <h4>${escapeHTML(video.video_baslik)}</h4>
                    <p>${escapeHTML(video.mufessir)}</p>
                </div>
            </div>
        `).join('');

        const videoItems = mufessirIlgiliVideolarListesi.querySelectorAll('.video-item');
        videoItems.forEach(item => {
            item.addEventListener('click', () => {
                const videoId = item.dataset.videoId;
                const video = videos.find(v => v.youtube_video_id === videoId);
                if (video) {
                    playVideo(video, mufessirVideoPlayer, mufessirVideoDetayBaslik, mufessirIlgiliVideolarListesi, mufessirVideoDetayAciklama, tagsContainerId);
                }
            });
        });

        const firstVideoItem = mufessirIlgiliVideolarListesi.querySelector(`.video-item[data-video-id="${videos[0].youtube_video_id}"]`);
        if (firstVideoItem) {
            firstVideoItem.classList.add('active');
            currentPlayingVideoElement = firstVideoItem;
        }
    } else {
        mufessirIlgiliVideolarListesi.innerHTML = `<p>Bu müfessir ve sure için video bulunamadı.</p>`;
        mufessirVideoPlayer.src = '';
        mufessirVideoDetayBaslik.textContent = 'Video Bulunamadı';
        mufessirVideoDetayAciklama.textContent = 'Açıklama bulunamadı.';
        const tagsContainer = document.getElementById(tagsContainerId);
        if (tagsContainer) tagsContainer.innerHTML = '';
    }
}

// Ana sayfa için sureler listesi
function renderSurelerInHome() {
    const grid = document.getElementById('default-sureler-grid');
    if (!grid) {
        console.warn("Ana sayfa sure grid elementi ('default-sureler-grid') bulunamadı.");
        return;
    }
    grid.innerHTML = '';
    grid.classList.remove('hidden');
    const mufessirGrid = document.getElementById('default-mufessirler-grid');
    if (mufessirGrid) mufessirGrid.classList.add('hidden');

    grid.innerHTML = cachedSureler.map(sure => {
        const currentSureInfo = sureInfo[sure.sure_ad] || { ayet_sayisi: 'Bilinmiyor', mufessir_count: 0, total_videos: 0, arabic_name: 'Bilinmiyor', meaning_tr: 'Bilinmiyor' };
        return `
            <a href="sureler.html?sure=${encodeURIComponent(sure.sure_ad)}" class="surah-item-link" rel="noopener noreferrer">
                <div class="surah-card-content">
                    <div class="surah-card-left">
                        <div class="surah-number-circle">${escapeHTML(sure.sure_no)}</div>
                        <div class="surah-name-container">
                            <span class="surah-name-latin">${escapeHTML(sure.sure_ad)}</span>
                            <span class="surah-meaning">${escapeHTML(currentSureInfo.meaning_tr)}</span>
                        </div>
                    </div>
                    <div class="surah-card-right">
                        <span class="surah-name-arabic">${escapeHTML(currentSureInfo.arabic_name)}</span>
                        <span class="surah-ayahs">${escapeHTML(currentSureInfo.ayet_sayisi)} Ayet</span>
                    </div>
                </div>
                <div style="padding: 0 20px 10px; font-size: 0.85em; color: #666;">
                    Müfessir Sayısı: ${escapeHTML(currentSureInfo.mufessir_count)} | Toplam Video: ${escapeHTML(currentSureInfo.total_videos)}
                </div>
            </a>
        `;
    }).join('');
}

// Ana sayfa için müfessirler listesi
function renderMufessirlerInHome() {
    const grid = document.getElementById('default-mufessirler-grid');
    if (!grid) {
        console.warn("Ana sayfa müfessir grid elementi ('default-mufessirler-grid') bulunamadı.");
        return;
    }
    grid.innerHTML = '';
    grid.classList.remove('hidden');
    const surelerGrid = document.getElementById('default-sureler-grid');
    if (surelerGrid) surelerGrid.classList.add('hidden');

    grid.innerHTML = cachedMufessirler.map(mufessirData => {
        const totalMufessirVideos = Object.values(mufessirSureVideoCounts[mufessirData.mufessir] || {}).reduce((sum, count) => sum + count, 0);
        return `
            <div class="card mufessir-card" onclick="window.location.href='mufessirler.html?mufessir=${encodeURIComponent(mufessirData.mufessir)}'">
                <img src="${escapeHTML(mufessirData.thumbnail)}" class="mufessir-thumbnail" alt="${escapeHTML(mufessirData.mufessir)}">
                <div class="mufessir-card-info">
                    <h3>${escapeHTML(mufessirData.mufessir)}</h3>
                    <p>Toplam Video: ${escapeHTML(totalMufessirVideos)}</p>
                </div>
            </div>
        `;
    }).join('');
}

// Sayfa yüklendiğinde çalışacak ana fonksiyon
document.addEventListener('DOMContentLoaded', async () => {
    const sureBtn = document.getElementById('show-sureler');
    const mufessirBtn = document.getElementById('show-mufessirler');

    if (sureBtn && mufessirBtn) {
        sureBtn.addEventListener('click', (e) => {
            e.preventDefault();
            if (typeof renderSurelerInHome === 'function') {
                renderSurelerInHome();
            } else {
                console.error("renderSurelerInHome fonksiyonu tanımlı değil.");
                const grid = document.getElementById('default-sureler-grid');
                if (grid) grid.innerHTML = `<p style="color: red;">Hata: Sureler yüklenemedi.</p>`;
            }
            sureBtn.classList.add('active');
            mufessirBtn.classList.remove('active');
        });

        mufessirBtn.addEventListener('click', (e) => {
            e.preventDefault();
            if (typeof renderMufessirlerInHome === 'function') {
                renderMufessirlerInHome();
            } else {
                console.error("renderMufessirlerInHome fonksiyonu tanımlı değil.");
                const grid = document.getElementById('default-mufessirler-grid');
                if (grid) grid.innerHTML = `<p style="color: red;">Hata: Müfessirler yüklenemedi.</p>`;
            }
            mufessirBtn.classList.add('active');
            sureBtn.classList.remove('active');
        });
    }

    const scriptTag = document.createElement('script');
    scriptTag.src = 'https://cdnjs.cloudflare.com/ajax/libs/PapaParse/5.3.0/papaparse.min.js';
    document.head.appendChild(scriptTag);

    scriptTag.onload = async () => {
        try {
            allData = await loadCSV('data.csv');
            console.log("CSV verisi yüklendi:", allData);
            if (!allData || allData.length === 0) {
                console.error("CSV verisi yüklenemedi veya boş.");
                return;
            }
            preprocessData();

            if (document.getElementById('sureler-grid')) {
                renderSurelerPage();
            } else if (document.getElementById('mufessirler-grid')) {
                renderMufessirlerPage();
            } else if (document.getElementById('default-sureler-grid')) {
                renderDefaultHomePage();
            }
        } catch (error) {
            console.error("Veri yükleme veya işleme hatası:", error);
        }
    };
    scriptTag.onerror = () => {
        console.error("PapaParse kütüphanesi yüklenemedi.");
        const contentArea = document.getElementById('content-area');
        if (contentArea) {
            contentArea.innerHTML = `<p style="color: red;">Hata: Kütüphane yüklenemedi.</p>`;
        }
    };
});