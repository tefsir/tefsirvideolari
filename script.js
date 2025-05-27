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

// XSS önleme için HTML kaçırma (escaping) yardımcı fonksiyonu
function escapeHTML(str) {
    if (typeof str !== 'string') { // Gelen değerin string olup olmadığını kontrol et
        if (str === null || str === undefined) {
            return ''; // Null veya undefined ise boş string döndür
        }
        str = String(str); // Değilse string'e çevir
    }
    var div = document.createElement('div');
    div.appendChild(document.createTextNode(str));
    return div.innerHTML;
}

let allData = [];
let currentPlayingVideoElement = null;

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
let sureInfo = {}; // Stores ayet_sayisi, mufessir_count, total_video_count, arabic_name, meaning_tr for each sure
let mufessirSureVideoCounts = {}; // Stores video count for each mufessir per sure

// Function to pre-process data for counts and info
function preprocessData() {
    sureInfo = {};
    mufessirSureVideoCounts = {};

    allData.forEach(item => {
        const sureAd = item.standart_sure_ad;
        const mufessirAd = item.mufessir;
        const sureMeta = sureMetadata[sureAd];
        const ayetSayisi = sureMeta ? sureMeta.ayet : 'Bilinmiyor';
        const arabicName = sureMeta ? sureMeta.arabic : 'Bilinmiyor';
        const meaningTr = sureMeta ? sureMeta.meaning : 'Bilinmiyor';

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

    // Convert Set to size for mufessir_count
    for (const sure in sureInfo) {
        sureInfo[sure].mufessir_count = sureInfo[sure].mufessirs.size;
        delete sureInfo[sure].mufessirs; // Remove the set as we only need the count
    }
}

// Sayfa yüklendiğinde çalışacak ana fonksiyon
document.addEventListener('DOMContentLoaded', async () => {
    // PapaParse kütüphanesini dinamik olarak yükle
    const scriptTag = document.createElement('script');
    scriptTag.src = 'https://cdnjs.cloudflare.com/ajax/libs/PapaParse/5.3.0/papaparse.min.js';
    document.head.appendChild(scriptTag);

    scriptTag.onload = async () => {
        try {
            allData = await loadCSV('data.csv');
            console.log("CSV verisi yüklendi:", allData);
            if (!allData || allData.length === 0) {
                console.error("CSV verisi yüklenemedi veya boş.");
                // Kullanıcıya bilgi verilebilir.
                return;
            }
            preprocessData(); // Pre-process data once loaded

            if (document.getElementById('sureler-grid')) {
                renderSurelerPage();
            } else if (document.getElementById('mufessirler-grid')) {
                renderMufessirlerPage();
            } else if (document.getElementById('default-sureler-grid')) {
                renderDefaultHomePage();
                 // Ana sayfada varsayılan olarak Sureler sekmesinin aktif olması için
                const showSurelerButton = document.getElementById('show-sureler');
                if (showSurelerButton) {
                    showSurelerButton.click();
                }
            }
        } catch (error) {
            console.error("Veri yükleme veya işleme hatası:", error);
            // Kullanıcıya genel bir hata mesajı gösterilebilir.
        }
    };
    scriptTag.onerror = () => {
        console.error("PapaParse kütüphanesi yüklenemedi.");
        // Kullanıcıya bilgi verilebilir.
    };
});


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
            pageTitle.innerHTML = `${escapeHTML(selectedSure)} Suresi - <a href="mufessirler.html?mufessir=${encodeURIComponent(selectedMufessirFromUrl)}">${escapeHTML(selectedMufessirFromUrl)}</a> Tefsirleri`;
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

        mufessirGridForSure.innerHTML = '';
        mufessirlerForSure.forEach(mufessirData => {
            const videoCount = mufessirSureVideoCounts[mufessirData.mufessir]?.[selectedSure] || 0;
            const card = document.createElement('div');
            card.classList.add('card', 'mufessir-card');
            
            card.innerHTML = `
                <img src="${escapeHTML(mufessirData.thumbnail)}" alt="${escapeHTML(mufessirData.mufessir)} thumbnail" class="mufessir-thumbnail">
                <div class="mufessir-card-info">
                    <h3>${escapeHTML(mufessirData.mufessir)}</h3>
                    <p>Video Sayısı: ${escapeHTML(videoCount)}</p>
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
            const currentSureInfo = sureInfo[sure.sure_ad] || { ayet_sayisi: 'Bilinmiyor', mufessir_count: 0, total_videos: 0, arabic_name: 'Bilinmiyor', meaning_tr: 'Bilinmiyor' };

            const cardLink = document.createElement('a');
            cardLink.href = `sureler.html?sure=${encodeURIComponent(sure.sure_ad)}`;
            cardLink.classList.add('surah-item-link');

            cardLink.innerHTML = `
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
            `;
            surelerGrid.appendChild(cardLink);
        });
    }
}

// Belirli sure ve müfessir için videoları göster
function displayVideosForSureAndMufessir(sureAd, mufessirAd) {
    const videoPlayer = document.getElementById('video-player');
    const videoDetayBaslik = document.getElementById('video-detay-baslik');
    const videoDetayMufessir = document.getElementById('video-detay-mufessir'); // Müfessir adı için element
    const ilgiliVideolarListesi = document.getElementById('ilgili-videolar-listesi');

    if (!videoPlayer || !videoDetayBaslik || !ilgiliVideolarListesi || !videoDetayMufessir) {
        console.error("Video detay sayfası için gerekli HTML elementleri bulunamadı.");
        return;
    }

    const videos = allData.filter(item => item.standart_sure_ad === sureAd && item.mufessir === mufessirAd);

    if (videos.length > 0) {
        // İlk videoyu oynat
        playVideo(videos[0], videoPlayer, videoDetayBaslik, ilgiliVideolarListesi, videoDetayMufessir);

        // İlgili videolar listesini oluştur
        ilgiliVideolarListesi.innerHTML = '<h3>İlgili Videolar</h3>';
        videos.forEach(video => {
            const videoItem = document.createElement('div');
            videoItem.classList.add('video-item');
            videoItem.dataset.videoId = video.youtube_video_id; // Video ID'sini data attribute olarak ata
            videoItem.innerHTML = `
                <img src="${escapeHTML(video.video_thumbnail_url || 'img/placeholder-video.jpg')}" alt="${escapeHTML(video.video_baslik)}">
                <div class="video-item-info">
                    <h4>${escapeHTML(video.video_baslik)}</h4>
                    <p>${escapeHTML(video.mufessir)}</p>
                </div>
            `;
            videoItem.addEventListener('click', () => playVideo(video, videoPlayer, videoDetayBaslik, ilgiliVideolarListesi, videoDetayMufessir));
            ilgiliVideolarListesi.appendChild(videoItem);
        });

        // İlk videoyu aktif olarak işaretle
        const firstVideoItem = ilgiliVideolarListesi.querySelector(`.video-item[data-video-id="${videos[0].youtube_video_id}"]`);
        if (firstVideoItem) {
            firstVideoItem.classList.add('active');
            currentPlayingVideoElement = firstVideoItem;
        }
    } else {
        ilgiliVideolarListesi.innerHTML = `<p>Bu sure ve müfessir için video bulunamadı.</p>`;
        videoPlayer.src = '';
        videoDetayBaslik.textContent = 'Video Bulunamadı';
        videoDetayMufessir.textContent = '';
    }
}

// Video oynatma fonksiyonu (genel kullanım için)
function playVideo(videoData, playerElement, titleElement, videoListContainer, mufessirNameElement) {
    if (currentPlayingVideoElement) {
        currentPlayingVideoElement.classList.remove('active');
    }

    const videoId = videoData.youtube_video_id?.trim();
    if (!videoId) {
        console.error('Geçersiz YouTube Video ID:', videoData);
        if (titleElement) titleElement.textContent = 'Hata: Video yüklenemedi (ID eksik)';
        if (playerElement) playerElement.src = '';
        if (mufessirNameElement) mufessirNameElement.textContent = '';
        return;
    }

    // DOĞRU YouTube embed URL'si
    const embedSrc = `https://www.youtube.com/embed/${videoId}?enablejsapi=1&origin=${encodeURIComponent(window.location.origin)}&rel=0&controls=1&autoplay=0`;

    try {
        if (playerElement) {
            playerElement.src = ''; // Önce temizle
            setTimeout(() => { // Tarayıcının src değişimini algılaması için kısa bir gecikme
                playerElement.src = embedSrc;
                console.log(`Iframe src atandı: ${embedSrc}`);
            }, 50); // 50ms yeterli olabilir

            if (titleElement) titleElement.textContent = escapeHTML(videoData.video_baslik || 'Video Başlığı Bulunamadı');
            // if (mufessirNameElement) mufessirNameElement.textContent = escapeHTML(videoData.mufessir || '');


            if (videoListContainer) {
                const playingVideoItem = videoListContainer.querySelector(`[data-video-id="${videoId}"]`);
                if (playingVideoItem) {
                    playingVideoItem.classList.add('active');
                    currentPlayingVideoElement = playingVideoItem;
                }
            }

            playerElement.onload = () => {
                console.log(`Video iframe yüklendi (iframe onload): ${videoId}`);
            };
            playerElement.onerror = (e) => {
                console.error(`Video iframe yükleme hatası (iframe onerror): ${videoId}`, e);
                if (titleElement) titleElement.textContent = 'Hata: Video oynatılamıyor';
                if (mufessirNameElement) mufessirNameElement.textContent = '';
                const fallbackLink = document.createElement('a');
                // DOĞRU fallback URL'si
                fallbackLink.href = `https://www.youtube.com/watch?v=${videoId}`;
                fallbackLink.textContent = "Videoyu YouTube'da İzle";
                fallbackLink.target = "_blank";
                fallbackLink.style.display = 'block';
                fallbackLink.style.marginTop = '10px';
                
                // titleElement'ın içeriğini temizleyip sadece linki ekleyebiliriz veya altına ekleyebiliriz.
                // Örnek: Başlığın altına ekleme
                if (titleElement) {
                    const errorMsg = document.createElement('p');
                    errorMsg.textContent = 'Video oynatılamadı.';
                    const currentTitle = titleElement.textContent;
                    titleElement.innerHTML = ''; // Önceki içeriği temizle
                    titleElement.appendChild(document.createTextNode(currentTitle + " - "));
                    const errorSpan = document.createElement('span');
                    errorSpan.style.color = 'red';
                    errorSpan.textContent = 'Oynatılamıyor.';
                    titleElement.appendChild(errorSpan);
                    titleElement.appendChild(fallbackLink);
                }
            };
        } else {
            console.error("Player element (iframe) bulunamadı.");
            if (titleElement) titleElement.textContent = 'Hata: Video oynatıcı elementi bulunamadı.';
        }
    } catch (error) {
        console.error('Video oynatma sırasında genel bir hata oluştu (catch):', error);
        if (titleElement) titleElement.textContent = 'Hata: Video yüklenemedi (Genel Hata)';
        if (mufessirNameElement) mufessirNameElement.textContent = '';
        if (playerElement) playerElement.src = '';
    }
}


// Ana sayfa için varsayılan sureler listesi
function renderDefaultHomePage() {
    const defaultSurelerGrid = document.getElementById('default-sureler-grid');
    if (!defaultSurelerGrid) {
        console.warn("Ana sayfa sure grid elementi ('default-sureler-grid') bulunamadı.");
        return;
    }
    // Fonksiyon çağrıldığında renderSurelerInHome'u çağır
    renderSurelerInHome();
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
            pageTitle.innerHTML = `<a href="mufessirler.html?mufessir=${encodeURIComponent(selectedMufessir)}">${escapeHTML(selectedMufessir)}</a> - ${escapeHTML(selectedSureFromUrl)} Suresi Tefsirleri`;
        } else {
            pageTitle.innerHTML = `<a href="mufessirler.html?mufessir=${encodeURIComponent(selectedMufessir)}">${escapeHTML(selectedMufessir)}</a> Tefsirleri`;
        }
        
        mufessirlerGrid.classList.add('hidden');
        sureGridForMufessir.classList.remove('hidden');
        mufessirVideoDetayDiv.classList.add('hidden');

        const surelerForMufessir = [];
        allData.filter(item => item.mufessir === selectedMufessir).forEach(video => {
            if (video.standart_sure_ad && !surelerForMufessir.some(s => s.standart_sure_ad === video.standart_sure_ad)) {
                surelerForMufessir.push({
                    standart_sure_ad: video.standart_sure_ad,
                    sure_no: video.sure_no // sure_no'yu da alalım sıralama için
                });
            }
        });
        surelerForMufessir.sort((a, b) => parseInt(a.sure_no) - parseInt(b.sure_no));

        sureGridForMufessir.innerHTML = '';
        surelerForMufessir.forEach(sure => {
            const videoCount = mufessirSureVideoCounts[selectedMufessir]?.[sure.standart_sure_ad] || 0;
            const currentSureInfo = sureInfo[sure.standart_sure_ad] || { ayet_sayisi: 'Bilinmiyor', arabic_name: 'Bilinmiyor', meaning_tr: 'Bilinmiyor' };

            const cardLink = document.createElement('a');
            // Linki doğru video detay sayfasına yönlendir
            cardLink.href = `mufessirler.html?mufessir=${encodeURIComponent(selectedMufessir)}&sure=${encodeURIComponent(sure.standart_sure_ad)}`;
            cardLink.classList.add('surah-item-link'); // Sureler için kullanılan stil kullanılabilir

            cardLink.innerHTML = `
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
            `;
            // Eski tıklama olayını kaldırıyoruz çünkü artık 'a' tag'i ile yönlendirme yapılıyor.
            // card.addEventListener('click', () => {
            //     window.location.href = `mufessirler.html?mufessir=${encodeURIComponent(selectedMufessir)}&sure=${encodeURIComponent(sure.standart_sure_ad)}`;
            // });
            sureGridForMufessir.appendChild(cardLink);
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
                <img src="${escapeHTML(mufessirData.thumbnail)}" class="mufessir-thumbnail" alt="${escapeHTML(mufessirData.mufessir)}">
                <div class="mufessir-card-info">
                    <h3>${escapeHTML(mufessirData.mufessir)}</h3>
                    <p>Toplam Video: ${escapeHTML(totalMufessirVideos)}</p>
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
    const mufessirVideoDetayMufessir = document.getElementById('mufessir-video-detay-mufessir'); // Müfessir adı için
    const mufessirIlgiliVideolarListesi = document.getElementById('mufessir-ilgili-videolar-listesi');

    if (!mufessirVideoPlayer || !mufessirVideoDetayBaslik || !mufessirIlgiliVideolarListesi || !mufessirVideoDetayMufessir) {
        console.error("Müfessir video detay sayfası için gerekli HTML elementleri bulunamadı.");
        return;
    }

    const videos = allData.filter(item => item.mufessir === mufessirAd && item.standart_sure_ad === sureAd);

    if (videos.length > 0) {
        playVideo(videos[0], mufessirVideoPlayer, mufessirVideoDetayBaslik, mufessirIlgiliVideolarListesi, mufessirVideoDetayMufessir);

        mufessirIlgiliVideolarListesi.innerHTML = '<h3>İlgili Videolar</h3>'; // Başlığı önce temizleyip ekle
        videos.forEach(video => {
            const videoItem = document.createElement('div');
            videoItem.classList.add('video-item');
            videoItem.dataset.videoId = video.youtube_video_id; // Video ID'sini data attribute olarak ata
            videoItem.innerHTML = `
                <img src="${escapeHTML(video.video_thumbnail_url || 'img/placeholder-video.jpg')}" alt="${escapeHTML(video.video_baslik)}">
                <div class="video-item-info">
                    <h4>${escapeHTML(video.video_baslik)}</h4>
                    <p>${escapeHTML(video.mufessir)}</p> 
                </div>
            `;
            videoItem.addEventListener('click', () => playVideo(video, mufessirVideoPlayer, mufessirVideoDetayBaslik, mufessirIlgiliVideolarListesi, mufessirVideoDetayMufessir));
            mufessirIlgiliVideolarListesi.appendChild(videoItem);
        });
        // İlk videoyu aktif olarak işaretle
        const firstVideoItem = mufessirIlgiliVideolarListesi.querySelector(`.video-item[data-video-id="${videos[0].youtube_video_id}"]`);
        if (firstVideoItem) {
            firstVideoItem.classList.add('active');
            currentPlayingVideoElement = firstVideoItem;
        }

    } else {
        mufessirIlgiliVideolarListesi.innerHTML = `<p>Bu müfessir ve sure için video bulunamadı.</p>`;
        mufessirVideoPlayer.src = "";
        mufessirVideoDetayBaslik.textContent = "Video Bulunamadı";
        mufessirVideoDetayMufessir.textContent = "";
    }
}


function renderSurelerInHome() {
    const grid = document.getElementById('default-sureler-grid');
    if (!grid) {
        console.warn("Ana sayfa sure grid elementi ('default-sureler-grid') bulunamadı.");
        return;
    }
    grid.innerHTML = ''; // Temizle
    grid.classList.remove('hidden');
    const mufessirGrid = document.getElementById('default-mufessirler-grid');
    if (mufessirGrid) mufessirGrid.classList.add('hidden');


    const sureler = [];
    allData.forEach(item => {
        if (item.standart_sure_ad && item.sure_no && !sureler.some(s => s.sure_ad === item.standart_sure_ad)) {
            sureler.push({ sure_ad: item.standart_sure_ad, sure_no: item.sure_no });
        }
    });

    sureler.sort((a, b) => parseInt(a.sure_no) - parseInt(b.sure_no));

    sureler.forEach(sure => {
        const currentSureInfo = sureInfo[sure.sure_ad] || { ayet_sayisi: 'Bilinmiyor', mufessir_count: 0, total_videos: 0, arabic_name: 'Bilinmiyor', meaning_tr: 'Bilinmiyor' };

        const cardLink = document.createElement('a');
        cardLink.href = `sureler.html?sure=${encodeURIComponent(sure.sure_ad)}`;
        cardLink.classList.add('surah-item-link');

        cardLink.innerHTML = `
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
        `;
        grid.appendChild(cardLink);
    });
}

function renderMufessirlerInHome() {
    const grid = document.getElementById('default-mufessirler-grid');
     if (!grid) {
        console.warn("Ana sayfa müfessir grid elementi ('default-mufessirler-grid') bulunamadı.");
        return;
    }
    grid.innerHTML = ''; // Temizle
    grid.classList.remove('hidden');
    const surelerGrid = document.getElementById('default-sureler-grid');
    if (surelerGrid) surelerGrid.classList.add('hidden');


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
        const card = document.createElement('div'); // Div olarak kalabilir, tıklama olayı ekleniyor
        card.classList.add('card', 'mufessir-card'); // Stil sınıfları
        card.style.cursor = 'pointer'; // Tıklanabilir olduğunu belirtmek için

        card.innerHTML = `
            <img src="${escapeHTML(mufessirData.thumbnail)}" class="mufessir-thumbnail" alt="${escapeHTML(mufessirData.mufessir)}">
            <div class="mufessir-card-info">
                <h3>${escapeHTML(mufessirData.mufessir)}</h3>
                <p>Toplam Video: ${escapeHTML(totalMufessirVideos)}</p>
            </div>
        `;
        card.addEventListener('click', () => { // Tıklama olayı
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
        sureBtn.addEventListener('click', (e) => {
            e.preventDefault(); // Eğer 'a' tag ise varsayılan davranışı engelle
            if (typeof renderSurelerInHome === 'function') { // Fonksiyonun tanımlı olup olmadığını kontrol et
                 renderSurelerInHome();
            }
            sureBtn.classList.add('active');
            mufessirBtn.classList.remove('active');
        });

        mufessirBtn.addEventListener('click', (e) => {
            e.preventDefault(); // Eğer 'a' tag ise varsayılan davranışı engelle
            if (typeof renderMufessirlerInHome === 'function') { // Fonksiyonun tanımlı olup olmadığını kontrol et
                renderMufessirlerInHome();
            }
            mufessirBtn.classList.add('active');
            sureBtn.classList.remove('active');
        });

        // Sayfa ilk yüklendiğinde Sureler'i göster ve butonu aktif yap
        // Bu kısım PapaParse yüklenmesinden sonra çağrılan renderDefaultHomePage içine taşındı.
        // setTimeout(() => document.getElementById('show-sureler')?.click(), 500);
    }
});
