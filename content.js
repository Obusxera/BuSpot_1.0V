/*!
 * BuSpot_1.0V - Custom Theme, Dock & Wallpaper untuk SPOT UPI
 * Dibuat oleh OBUSXERA
 * Lisensi: MIT (lihat LICENSE). Bukan produk resmi UPI.
 */
(function() {
    
    /* =========================================================
       1. FITUR CUSTOM WALLPAPER (IndexedDB - mendukung foto 4K)
       Sebelumnya memakai localStorage (batas ~5 MB) sehingga foto 4K gagal.
       ========================================================= */
    const wpBtn = document.createElement('button');
    wpBtn.id = 'custom-bg-btn';
    wpBtn.innerHTML = '📷 WALLPAPER';

    const resetBtn = document.createElement('button');
    resetBtn.id = 'custom-bg-reset';
    resetBtn.innerHTML = '✖';
    resetBtn.title = 'Hapus Wallpaper';

    const inputFile = document.createElement('input');
    inputFile.type = 'file';
    inputFile.accept = 'image/*';
    inputFile.style.display = 'none';

    document.body.appendChild(wpBtn);
    document.body.appendChild(resetBtn);
    document.body.appendChild(inputFile);

    // ---- helper IndexedDB ----
    const DB_NAME = 'spot_ext_db';
    const STORE = 'kv';
    const BG_KEY = 'custom_bg';

    function idbOpen() {
        return new Promise((resolve, reject) => {
            const req = indexedDB.open(DB_NAME, 1);
            req.onupgradeneeded = () => req.result.createObjectStore(STORE);
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => reject(req.error);
        });
    }
    async function idbGet(key) {
        const db = await idbOpen();
        return new Promise((resolve, reject) => {
            const q = db.transaction(STORE, 'readonly').objectStore(STORE).get(key);
            q.onsuccess = () => resolve(q.result);
            q.onerror = () => reject(q.error);
        });
    }
    async function idbSet(key, value) {
        const db = await idbOpen();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(STORE, 'readwrite');
            tx.objectStore(STORE).put(value, key);
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error);
            tx.onabort = () => reject(tx.error);
        });
    }
    async function idbDel(key) {
        const db = await idbOpen();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(STORE, 'readwrite');
            tx.objectStore(STORE).delete(key);
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error);
        });
    }

    // ---- terapkan wallpaper ----
    let currentBlobUrl = null;

    function applyBackgroundUrl(url) {
        document.documentElement.style.setProperty('--custom-bg', `url("${url}")`);
        document.body.classList.add('has-custom-bg');
        resetBtn.style.display = 'block';
    }

    function applyBackgroundBlob(blob) {
        if (currentBlobUrl) URL.revokeObjectURL(currentBlobUrl);
        currentBlobUrl = URL.createObjectURL(blob);
        applyBackgroundUrl(currentBlobUrl);
    }

    // Muat wallpaper tersimpan
    idbGet(BG_KEY).then(blob => {
        if (blob) {
            applyBackgroundBlob(blob);
        } else {
            // Kompatibilitas: wallpaper lama dari versi sebelumnya (localStorage)
            const legacy = localStorage.getItem('spot_custom_bg');
            if (legacy) applyBackgroundUrl(legacy);
        }
    }).catch(err => console.error('Gagal memuat wallpaper:', err));

    wpBtn.addEventListener('click', () => inputFile.click());

    async function saveWallpaper(blob) {
        try {
            await idbSet(BG_KEY, blob);
            localStorage.removeItem('spot_custom_bg');  // bersihkan data lama
            applyBackgroundBlob(blob);
        } catch (err) {
            console.error('Gagal menyimpan wallpaper:', err);
            alert('Wallpaper gagal disimpan. Coba gambar yang lebih kecil atau cek penyimpanan browser.');
        }
    }

    inputFile.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        inputFile.value = '';            // supaya file yang sama bisa dipilih lagi
        if (!file) return;
        const result = await openCropper(file);   // Blob hasil crop, atau null jika batal
        if (result) saveWallpaper(result);
    });

    /* ---------- CROPPER ---------- */
    const CROP_MAX_SIDE = 3840;   // sisi terpanjang hasil crop (batas 4K)
    const CROP_MIN = 40;          // ukuran minimum kotak crop (px)

    function openCropper(file) {
        return new Promise((resolve) => {
            const imgUrl = URL.createObjectURL(file);

            const RATIOS = [
                { label: 'Sesuai layar', value: window.innerWidth / window.innerHeight },
                { label: '16:9', value: 16 / 9 },
                { label: '4:3', value: 4 / 3 },
                { label: '1:1', value: 1 },
                { label: 'Bebas', value: null }
            ];

            const overlay = document.createElement('div');
            overlay.id = 'crop-overlay';
            overlay.innerHTML = `
                <div id="crop-modal">
                    <div class="cr-head">
                        <h3>Atur Wallpaper</h3>
                        <p>Geser kotak atau tarik sudutnya untuk memilih bagian gambar yang dipakai.</p>
                    </div>
                    <div class="cr-ratios"></div>
                    <div class="cr-stage-wrap">
                        <div class="cr-stage">
                            <img class="cr-img" alt="" draggable="false">
                            <div class="cr-box">
                                <span class="cr-h nw" data-h="nw"></span>
                                <span class="cr-h ne" data-h="ne"></span>
                                <span class="cr-h sw" data-h="sw"></span>
                                <span class="cr-h se" data-h="se"></span>
                            </div>
                        </div>
                    </div>
                    <div class="cr-foot">
                        <button class="cr-btn cr-ghost" data-act="full">Pakai Gambar Penuh</button>
                        <span class="cr-spacer"></span>
                        <button class="cr-btn cr-ghost" data-act="cancel">Batal</button>
                        <button class="cr-btn cr-primary" data-act="ok">Terapkan</button>
                    </div>
                </div>`;
            document.body.appendChild(overlay);

            const img = overlay.querySelector('.cr-img');
            const stage = overlay.querySelector('.cr-stage');
            const box = overlay.querySelector('.cr-box');
            const ratioWrap = overlay.querySelector('.cr-ratios');

            let dw = 0, dh = 0;                 // ukuran gambar yang ditampilkan
            let ratio = RATIOS[0].value;        // default: sesuai layar
            let b = { x: 0, y: 0, w: 0, h: 0 }; // kotak crop (koordinat tampilan)

            function draw() {
                box.style.left = b.x + 'px';
                box.style.top = b.y + 'px';
                box.style.width = b.w + 'px';
                box.style.height = b.h + 'px';
            }

            function fitBox() {
                let w = dw * 0.9, h = dh * 0.9;
                if (ratio) {
                    w = Math.min(dw * 0.9, dh * 0.9 * ratio);
                    h = w / ratio;
                }
                b = { x: (dw - w) / 2, y: (dh - h) / 2, w, h };
                draw();
            }

            // tombol rasio
            RATIOS.forEach((r, i) => {
                const btn = document.createElement('button');
                btn.className = 'cr-ratio' + (i === 0 ? ' active' : '');
                btn.textContent = r.label;
                btn.addEventListener('click', () => {
                    ratioWrap.querySelectorAll('.cr-ratio').forEach(x => x.classList.remove('active'));
                    btn.classList.add('active');
                    ratio = r.value;
                    fitBox();
                });
                ratioWrap.appendChild(btn);
            });

            img.addEventListener('load', () => {
                dw = img.clientWidth;
                dh = img.clientHeight;
                fitBox();
            });
            img.addEventListener('error', () => {
                alert('Gambar tidak dapat dibuka. Gunakan format JPG, PNG, atau WebP.');
                close(null);
            });
            img.src = imgUrl;

            // ----- drag & resize -----
            let drag = null;
            box.addEventListener('pointerdown', (ev) => {
                ev.preventDefault();
                const h = ev.target.dataset ? ev.target.dataset.h : null;
                const rect = stage.getBoundingClientRect();
                drag = { mode: h ? 'resize' : 'move', h, sx: ev.clientX, sy: ev.clientY, rect, start: { ...b } };
                box.setPointerCapture(ev.pointerId);
            });

            box.addEventListener('pointermove', (ev) => {
                if (!drag) return;
                const s = drag.start;

                if (drag.mode === 'move') {
                    b.x = Math.min(Math.max(0, s.x + ev.clientX - drag.sx), dw - s.w);
                    b.y = Math.min(Math.max(0, s.y + ev.clientY - drag.sy), dh - s.h);
                    draw();
                    return;
                }

                const px = Math.min(Math.max(0, ev.clientX - drag.rect.left), dw);
                const py = Math.min(Math.max(0, ev.clientY - drag.rect.top), dh);
                const west = drag.h.includes('w'), north = drag.h.includes('n');
                const ax = west ? s.x + s.w : s.x;        // titik jangkar (sudut seberang)
                const ay = north ? s.y + s.h : s.y;
                const dirX = west ? -1 : 1, dirY = north ? -1 : 1;
                const maxW = dirX > 0 ? dw - ax : ax;
                const maxH = dirY > 0 ? dh - ay : ay;

                let w = Math.max(CROP_MIN, (px - ax) * dirX);
                let h = Math.max(CROP_MIN, (py - ay) * dirY);

                if (ratio) {
                    w = Math.max(w, h * ratio);
                    w = Math.min(w, maxW, maxH * ratio);
                    h = w / ratio;
                } else {
                    w = Math.min(w, maxW);
                    h = Math.min(h, maxH);
                }

                b = { x: dirX > 0 ? ax : ax - w, y: dirY > 0 ? ay : ay - h, w, h };
                draw();
            });

            const endDrag = () => { drag = null; };
            box.addEventListener('pointerup', endDrag);
            box.addEventListener('pointercancel', endDrag);

            // ----- hasil crop -----
            function cropToBlob() {
                const scale = img.naturalWidth / dw;
                let sw = Math.round(b.w * scale), sh = Math.round(b.h * scale);
                const sx = Math.round(b.x * scale), sy = Math.round(b.y * scale);

                let outW = sw, outH = sh;
                const longest = Math.max(outW, outH);
                if (longest > CROP_MAX_SIDE) {
                    const k = CROP_MAX_SIDE / longest;
                    outW = Math.round(outW * k);
                    outH = Math.round(outH * k);
                }

                const canvas = document.createElement('canvas');
                canvas.width = outW;
                canvas.height = outH;
                canvas.getContext('2d').drawImage(img, sx, sy, sw, sh, 0, 0, outW, outH);
                canvas.toBlob((blob) => close(blob || file), 'image/jpeg', 0.92);
            }

            function onKey(ev) { if (ev.key === 'Escape') close(null); }
            document.addEventListener('keydown', onKey);

            function close(result) {
                document.removeEventListener('keydown', onKey);
                overlay.remove();
                URL.revokeObjectURL(imgUrl);
                resolve(result);
            }

            overlay.addEventListener('click', (ev) => {
                const act = ev.target.dataset && ev.target.dataset.act;
                if (act === 'cancel') close(null);
                else if (act === 'full') close(file);
                else if (act === 'ok') cropToBlob();
            });
        });
    }

    resetBtn.addEventListener('click', async () => {
        try { await idbDel(BG_KEY); } catch (err) { console.error(err); }
        localStorage.removeItem('spot_custom_bg');
        if (currentBlobUrl) { URL.revokeObjectURL(currentBlobUrl); currentBlobUrl = null; }
        document.documentElement.style.removeProperty('--custom-bg');
        document.body.classList.remove('has-custom-bg');
        resetBtn.style.display = 'none';
        inputFile.value = '';
    });


    /* =========================================================
       2. FITUR CUSTOM THEME (UI MODERN + CYBERPUNK)
       ========================================================= */
    const themeBtn = document.createElement('button');
    themeBtn.id = 'custom-theme-btn';
    themeBtn.innerHTML = '🎨 TEMA';
    document.body.appendChild(themeBtn);

    const modalHTML = `
        <div id="theme-modal-overlay">
            <div id="theme-modal-modern">
                <div class="tm-header">
                    <h2>Pilih Tema</h2>
                    <p>Sesuaikan tampilan aplikasi sesuai dengan kenyamanan aktivitas Anda sehari-hari.</p>
                </div>
                <div class="tm-grid">
                    <div class="tm-card tm-light" data-theme="theme-terang">
                        <div class="tm-radio"></div>
                        <div class="tm-card-content">
                            <div class="tm-icon">☀️</div>
                            <div class="tm-text"><h4>Tema Terang</h4><span>(Light Mode)</span></div>
                        </div>
                        <div class="tm-preview"><div class="tm-p-side"></div><div class="tm-p-main"><div class="tm-p-top"></div><div class="tm-p-bot"><div class="tm-p-b1"></div><div class="tm-p-b2"></div></div></div></div>
                    </div>
                    <div class="tm-card tm-dark" data-theme="theme-gelap">
                        <div class="tm-radio"></div>
                        <div class="tm-card-content">
                            <div class="tm-icon">🌙</div>
                            <div class="tm-text"><h4>Tema Gelap</h4><span>(Dark Mode)</span></div>
                        </div>
                        <div class="tm-preview"><div class="tm-p-side"></div><div class="tm-p-main"><div class="tm-p-top"></div><div class="tm-p-bot"><div class="tm-p-b1"></div><div class="tm-p-b2"></div></div></div></div>
                    </div>
                    <div class="tm-card tm-warm" data-theme="theme-hangat">
                        <div class="tm-radio"></div>
                        <div class="tm-card-content">
                            <div class="tm-icon">☕</div>
                            <div class="tm-text"><h4>Tema Hangat</h4><span>(Warm Earth)</span></div>
                        </div>
                        <div class="tm-preview"><div class="tm-p-side"></div><div class="tm-p-main"><div class="tm-p-top"></div><div class="tm-p-bot"><div class="tm-p-b1"></div><div class="tm-p-b2"></div></div></div></div>
                    </div>
                    <div class="tm-card tm-classic" data-theme="theme-klasik">
                        <div class="tm-radio"></div>
                        <div class="tm-card-content">
                            <div class="tm-icon">🖌️</div>
                            <div class="tm-text"><h4>Tema Klasik</h4><span>(Classic Slate)</span></div>
                        </div>
                        <div class="tm-preview"><div class="tm-p-side"></div><div class="tm-p-main"><div class="tm-p-top"></div><div class="tm-p-bot"><div class="tm-p-b1"></div><div class="tm-p-b2"></div></div></div></div>
                    </div>
                    <!-- KARTU TEMA CYBERPUNK TAMBAHAN -->
                    <div class="tm-card tm-cyberpunk" data-theme="theme-cyberpunk">
                        <div class="tm-radio"></div>
                        <div class="tm-card-content">
                            <div class="tm-icon">🤖</div>
                            <div class="tm-text"><h4>Tema Cyberpunk</h4><span>(Neon Red & Blue)</span></div>
                        </div>
                        <div class="tm-preview"><div class="tm-p-side"></div><div class="tm-p-main"><div class="tm-p-top"></div><div class="tm-p-bot"><div class="tm-p-b1"></div><div class="tm-p-b2"></div></div></div></div>
                    </div>
                </div>
                <div class="tm-footer">
                    <button id="btn-ok-theme">Terapkan Tema</button>
                    <button id="btn-cancel-theme">Batal</button>
                </div>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHTML);

    const modalOverlay = document.getElementById('theme-modal-overlay');
    const btnCancelTheme = document.getElementById('btn-cancel-theme');
    const btnOkTheme = document.getElementById('btn-ok-theme');
    const themeOptions = document.querySelectorAll('.tm-card');

    // Ditambahkan 'theme-cyberpunk' ke dalam array agar tidak error
    const validThemes = ['theme-terang', 'theme-gelap', 'theme-hangat', 'theme-klasik', 'theme-cyberpunk'];
    let currentSelectedTheme = localStorage.getItem('spot_theme');
    
    // Default kita atur ke Cyberpunk
    if (!currentSelectedTheme || !validThemes.includes(currentSelectedTheme)) {
        currentSelectedTheme = 'theme-cyberpunk';
        localStorage.setItem('spot_theme', currentSelectedTheme);
    }
    
    let tempSelectedTheme = currentSelectedTheme;

    function applyThemeToBody(themeClass) {
        document.body.classList.remove('theme-terang', 'theme-gelap', 'theme-hangat', 'theme-klasik', 'theme-cyberpunk');
        document.body.classList.add(themeClass);
    }
    
    applyThemeToBody(currentSelectedTheme);

    themeBtn.addEventListener('click', () => {
        tempSelectedTheme = currentSelectedTheme; 
        updateModalSelection(tempSelectedTheme);
        modalOverlay.style.display = 'flex'; 
    });

    themeOptions.forEach(option => {
        option.addEventListener('click', function() {
            tempSelectedTheme = this.getAttribute('data-theme');
            updateModalSelection(tempSelectedTheme);
        });
    });

    function updateModalSelection(themeClass) {
        themeOptions.forEach(opt => opt.classList.remove('selected'));
        const targetElement = document.querySelector(`.tm-card[data-theme="${themeClass}"]`);
        if (targetElement) {
            targetElement.classList.add('selected');
        }
    }

    btnCancelTheme.addEventListener('click', () => { 
        modalOverlay.style.display = 'none'; 
    });

    btnOkTheme.addEventListener('click', () => {
        currentSelectedTheme = tempSelectedTheme;
        localStorage.setItem('spot_theme', currentSelectedTheme); 
        applyThemeToBody(currentSelectedTheme); 
        modalOverlay.style.display = 'none'; 
    });


    /* =========================================================
       3. REDESAIN HALAMAN DETAIL MATA KULIAH (TAGGING ELEMEN)
       Mendeteksi bar/banner biru-cyan bawaan SPOT lewat warna & ukuran,
       lalu memberi class agar bisa di-style sesuai tema di style.css
       ========================================================= */
    const SKIP = '.sidebar, .left-aside, header, .navbar, .topbar, #theme-modal-overlay, #spot-dock, #spot-brand, #spot-sb-menu, #crop-overlay, table';

    function isBlueish(cssColor) {
        const m = cssColor.match(/rgba?\(([^)]+)\)/);
        if (!m) return false;
        const p = m[1].split(',').map(parseFloat);
        if (p.length === 4 && p[3] < 0.9) return false;
        const r = p[0] / 255, g = p[1] / 255, b = p[2] / 255;
        const max = Math.max(r, g, b), min = Math.min(r, g, b);
        const l = (max + min) / 2;
        if (max === min) return false;
        const d = max - min;
        const s = d / (1 - Math.abs(2 * l - 1));
        let h;
        if (max === r) h = ((g - b) / d) % 6;
        else if (max === g) h = (b - r) / d + 2;
        else h = (r - g) / d + 4;
        h = (h * 60 + 360) % 360;
        return h >= 180 && h <= 215 && s > 0.7 && l >= 0.3 && l <= 0.55;
    }

    function addClass(el, cls) {
        if (!el.classList.contains(cls)) el.classList.add(cls);
    }

    function isOpaque(cssColor) {
        const m = cssColor.match(/rgba?\(([^)]+)\)/);
        if (!m) return false;
        const p = m[1].split(',').map(parseFloat);
        return !(p.length === 4 && p[3] < 0.9);
    }

    const TAGGED = ['spot-hero', 'spot-bar', 'spot-chip', 'spot-panel', 'spot-meta'];
    const NO_PANEL_TAGS = ['SELECT', 'INPUT', 'TEXTAREA', 'BUTTON', 'A', 'OPTION', 'TABLE', 'TR', 'TD', 'TH',
                           'THEAD', 'TBODY', 'FOOTER', 'LI', 'UL', 'IMG', 'BLOCKQUOTE'];
    const NO_PANEL_SEL = '.alert, .well, .callout, .nav-tabs, .nav-tabs *, .select2-container, .select2-container *, ' +
                         '.select2-dropdown, .select2-dropdown *, .modal-backdrop, [class*="btn"]';

    function tagDetailPage() {
        const root = document.querySelector('#page-wrapper') || document.body;
        const pageBg = getComputedStyle(root).backgroundColor;

        // 1) Chip "Waktu Akses" (dulu, supaya tidak ikut jadi panel)
        root.querySelectorAll('span, div, small, label, p, .label, .badge').forEach(el => {
            if (el.children.length > 0 || el.closest(SKIP)) return;
            const txt = el.textContent.trim();
            if (!/^Waktu Akses/i.test(txt)) return;
            let node = el;
            for (let i = 0; i < 3 && node && node !== root; i++) {
                addClass(node, 'spot-meta');
                const par = node.parentElement;
                if (!par || par.textContent.trim() !== txt) break;
                node = par;
            }
        });

        // 2) Banner / bar / chip biru-cyan, dan panel berlatar solid lainnya
        root.querySelectorAll('*').forEach(el => {
            if (el.closest(SKIP)) return;
            if (TAGGED.some(c => el.classList.contains(c))) return;
            if (el.parentElement && el.parentElement.closest('.spot-hero, .spot-bar, .spot-panel')) return;
            const rect = el.getBoundingClientRect();
            if (rect.width === 0 || rect.height === 0) return;
            const bg = getComputedStyle(el).backgroundColor;

            if (isBlueish(bg)) {
                if (rect.width >= 300 && rect.height >= 100) addClass(el, 'spot-hero');
                else if (rect.width >= 300) addClass(el, 'spot-bar');
                else addClass(el, 'spot-chip');
                return;
            }

            if (!isOpaque(bg) || bg === pageBg) return;
            if (rect.width < 200 || rect.height < 40) return;
            if (NO_PANEL_TAGS.includes(el.tagName)) return;
            if (el.matches(NO_PANEL_SEL)) return;
            addClass(el, 'spot-panel');
        });

        // 3) Selang-seling warna untuk tema Cyberpunk (merah / cyan)
        document.querySelectorAll('.spot-bar').forEach((el, i) => {
            const want = i % 2 === 0 ? 'spot-bar-odd' : 'spot-bar-even';
            const other = i % 2 === 0 ? 'spot-bar-even' : 'spot-bar-odd';
            if (el.classList.contains(other)) el.classList.remove(other);
            addClass(el, want);
        });
    }

    let tagTimer = null;
    function scheduleTag() {
        clearTimeout(tagTimer);
        tagTimer = setTimeout(tagDetailPage, 150);
    }
    tagDetailPage();
    new MutationObserver((muts) => {
        const outside = muts.some(m => {
            const n = m.target.nodeType === 1 ? m.target : m.target.parentElement;
            return !(n && n.closest && n.closest('#spot-dock'));
        });
        if (outside) scheduleTag();
    }).observe(document.body, {
        childList: true, subtree: true, attributes: true, attributeFilter: ['class', 'style']
    });



    /* =========================================================
       4. DOCK ALA macOS
       Menu sidebar kiri dipindah menjadi Dock di bawah layar.
       Sidebar dideteksi otomatis lewat posisi/ukuran (bukan nama class).
       ========================================================= */
    (function initDock() {
        const COLORS = [
            ['#ff9a5a', '#ee5a24'], ['#5fb3ff', '#2f6df6'], ['#5be39a', '#12a05c'],
            ['#d38bff', '#8e44ad'], ['#ffd45a', '#e1a100'], ['#ff7a9a', '#d6336c']
        ];
        const EMOJI_RULES = [
            [/tugas|assignment/i, '📝'], [/nilai|grade/i, '📊'], [/jadwal|schedule/i, '📅'],
            [/forum|diskusi/i, '💬'], [/materi|modul/i, '📖'], [/kuliah|course/i, '📚'],
            [/profil|profile/i, '👤'], [/ujian|kuis|quiz/i, '🧪']
        ];
        const ICON = (typeof SPOT_ICONS !== 'undefined') ? SPOT_ICONS : {};
        const pickEmoji = (t) => { for (const [re, e] of EMOJI_RULES) if (re.test(t)) return e; return '📄'; };

        if (localStorage.getItem('spot_classic') === '1') document.body.classList.add('spot-classic');

        function isSmallLeftBlock(el) {
            const r = el.getBoundingClientRect();
            return r.width >= 120 && r.width <= window.innerWidth * 0.45 && r.left <= 10 &&
                !el.querySelector('table, #page-wrapper, main, header');
        }

        function findSidebar() {
            // a) dari class yang umum dipakai
            const bySel = document.querySelectorAll('.left-aside, .sidebar, .navbar-static-side, #sidebar, aside');
            for (const el of bySel) {
                if (isSmallLeftBlock(el) && el.querySelector('a[href]')) return el;
            }
            // b) dari link di sisi kiri: naik ke pembungkus terluar yang masih "kecil & di kiri"
            const anchors = Array.from(document.querySelectorAll('a[href]')).filter(a => {
                const r = a.getBoundingClientRect();
                return a.textContent.trim() && r.left < window.innerWidth * 0.3 && r.top > 60 && r.width > 0 &&
                    !a.closest('header, .navbar, .topbar, #spot-dock, #theme-modal-overlay, #crop-overlay');
            });
            for (const a of anchors) {
                let el = a.parentElement, best = null;
                while (el && el !== document.body && el !== document.documentElement) {
                    const r = el.getBoundingClientRect();
                    if (r.width > window.innerWidth * 0.45 || el.querySelector('table, #page-wrapper, main, header')) break;
                    best = el;
                    el = el.parentElement;
                }
                if (best && isSmallLeftBlock(best)) return best;
            }
            return null;
        }

        function collectAccount() {
            const clean = (t) => (t || '').replace(/\s+/g, ' ').trim();
            const nav = document.querySelector('nav.navbar') || document;
            const out = { semesters: [], lang: null, logout: null, current: '' };
            const toggle = nav.querySelector('a.dropdown-toggle');
            if (toggle) out.current = clean(toggle.textContent);
            const seen = new Set();
            nav.querySelectorAll('a[href]').forEach(a => {
                const href = a.href, label = clean(a.textContent);
                if (/\/histori\//i.test(href)) {
                    if (label && !seen.has(href)) {
                        seen.add(href);
                        out.semesters.push({ label, href, active: label === out.current });
                    }
                } else if (/\/language\//i.test(href)) {
                    if (!out.lang) out.lang = { label: label || 'Bahasa', href };
                } else if (/logout/i.test(href)) {
                    if (!out.logout) out.logout = { href };
                }
            });
            return out;
        }

        function elt(tag, cls, text) {
            const e = document.createElement(tag);
            if (cls) e.className = cls;
            if (text != null) e.textContent = text;
            return e;
        }

        function buildAccountMenu(info, acc, initials) {
            const menu = elt('div', 'sb-menu');
            menu.id = 'spot-sb-menu';
            menu.setAttribute('role', 'menu');

            const head = elt('div', 'sb-head');
            const who = elt('div', 'sb-who');
            who.append(elt('strong', null, info[0] || ''), elt('span', null, info[1] || ''));
            head.append(elt('div', 'sb-avatar', initials || '👤'), who);
            menu.appendChild(head);

            const row = (icon, text, href, extra) => {
                const a = elt('a', 'sb-row' + (extra ? ' ' + extra : ''));
                a.href = href;
                a.append(elt('span', 'sb-ic', icon), elt('span', 'sb-tx', text));
                return a;
            };

            if (acc.semesters.length) {
                menu.appendChild(elt('div', 'sb-sec', 'History Semester'));
                acc.semesters.forEach(sm => {
                    const r = row('📅', sm.label, sm.href, sm.active ? 'active' : '');
                    if (sm.active) r.appendChild(elt('span', 'sb-dot', '●'));
                    menu.appendChild(r);
                });
                menu.appendChild(elt('div', 'sb-sepline'));
            }
            if (acc.lang) menu.appendChild(row('🌐', 'Bahasa: ' + acc.lang.label, acc.lang.href));
            if (acc.logout) menu.appendChild(row('⏻', 'Logout', acc.logout.href, 'sb-danger'));

            document.body.appendChild(menu);
            return menu;
        }

        function findListBoxes() {
            const all = Array.from(document.querySelectorAll('.white-box')).filter(b => {
                if (!b.querySelector('table')) return false;
                const t = b.querySelector('.box-title, h4, h3');
                return t && /^\s*daftar\b/i.test(t.textContent);
            });
            return all.filter(b => !all.some(o => o !== b && o.contains(b)));   // ambil yang terluar
        }

        function makeItem(o) {
            const el = document.createElement(o.href ? 'a' : (o.static ? 'div' : 'button'));
            el.className = 'dk-item' + (o.cls ? ' ' + o.cls : '') + (o.active ? ' active' : '');
            if (o.href) el.href = o.href;
            else if (!o.static) el.type = 'button';
            const [c1, c2] = o.color || COLORS[0];
            el.style.setProperty('--c1', c1);
            el.style.setProperty('--c2', c2);

            const tile = document.createElement('span');
            tile.className = 'dk-tile';
            if (o.img) {
                const im = document.createElement('img');
                im.src = o.img;
                im.alt = '';
                im.draggable = false;
                im.className = 'dk-img' + (o.mono ? ' dk-mono' : '');
                tile.appendChild(im);
                if (o.light) tile.classList.add('dk-tile-light');
            } else if (o.iconNode) {
                const ic = o.iconNode.cloneNode(true);
                ic.classList.add('dk-icon');
                tile.appendChild(ic);
            } else {
                tile.textContent = o.emoji || '📄';
            }
            const tip = document.createElement('span');
            tip.className = 'dk-tip';
            tip.textContent = o.label;

            el.append(tile, tip);
            if (o.onClick) el.addEventListener('click', (e) => { e.preventDefault(); o.onClick(); });
            return el;
        }

        function fixShift(sideWidth) {
            const anchor = document.querySelector('#page-wrapper') || document.querySelector('table') ||
                           document.querySelector('.panel, .card, .box');
            if (!anchor) return;
            const near = (v) => Math.abs(parseFloat(v) - sideWidth) <= 40;
            let el = anchor;
            while (el && el !== document.documentElement) {
                const cs = getComputedStyle(el);
                if (near(cs.marginLeft)) el.classList.add('spot-shift-m');
                if (near(cs.paddingLeft)) el.classList.add('spot-shift-p');
                if ((cs.position === 'absolute' || cs.position === 'fixed') && near(cs.left)) el.classList.add('spot-shift-l');
                el = el.parentElement;
            }
        }

        function buildDock(side) {
            // kumpulkan menu dari sidebar
            const seen = new Set();
            const menu = [];
            side.querySelectorAll('a[href]').forEach(a => {
                const href = a.getAttribute('href') || '';
                const label = a.textContent.replace(/\s+/g, ' ').trim();
                if (!label || !href || href === '#' || /^javascript:/i.test(href)) return;
                const key = a.href + '|' + label;
                if (seen.has(key)) return;
                seen.add(key);
                menu.push({ a, label });
            });
            if (!menu.length) return false;

            // nama & NIM (teks sidebar yang bukan menu)
            const linkTexts = menu.map(m => m.label.toLowerCase());
            const info = (side.innerText || side.textContent || '').split('\n')
                .map(s => s.replace(/\s+/g, ' ').trim())
                .filter(s => s && s.length <= 60 && !linkTexts.includes(s.toLowerCase()))
                .slice(0, 2);

            const sideWidth = side.getBoundingClientRect().width;
            const dock = document.createElement('div');
            dock.id = 'spot-dock';

            let accMenu = null, accItem = null;
            function closeAccountMenu() {
                if (accMenu) accMenu.classList.remove('show');
                if (accItem) accItem.classList.remove('open');
            }
            function toggleAccountMenu() {
                if (!accMenu || !accItem) return;
                const willOpen = !accMenu.classList.contains('show');
                closeAccountMenu();
                if (!willOpen) return;
                closeAllLists();
                const dr = dock.getBoundingClientRect();
                accMenu.classList.add('show');
                const w = accMenu.offsetWidth || 290;
                const left = dr.left + accItem.offsetLeft;
                accMenu.style.left = Math.max(10, Math.min(left, window.innerWidth - w - 10)) + 'px';
                accMenu.style.bottom = (window.innerHeight - dr.top + 12) + 'px';
                accItem.classList.add('open');
            }
            document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeAccountMenu(); });
            document.addEventListener('mousedown', (e) => {
                if (!accMenu || !accMenu.classList.contains('show')) return;
                const t = e.target;
                if (accMenu.contains(t) || (accItem && accItem.contains(t))) return;
                closeAccountMenu();
            });

            if (info.length) {
                const initials = info[0].split(' ').filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase();
                const acc = collectAccount();
                const hasMenu = acc.semesters.length || acc.lang || acc.logout;
                accItem = makeItem({
                    cls: 'dk-profile', label: info.join(' · '),
                    emoji: initials || '👤', color: ['#8e9aaf', '#4a5568'],
                    static: !hasMenu,
                    onClick: hasMenu ? toggleAccountMenu : null
                });
                if (hasMenu) accMenu = buildAccountMenu(info, acc, initials);
                dock.appendChild(accItem);
                const sep0 = document.createElement('span'); sep0.className = 'dk-sep'; dock.appendChild(sep0);
            }

            // ---- daftar (mis. "Daftar Mata Kuliah") disembunyikan, muncul sebagai panel dari Dock ----
            const listBoxes = findListBoxes();
            listBoxes.forEach(b => b.classList.add('spot-list-box'));
            const itemOf = new Map();

            function setOpen(box, open) {
                box.classList.toggle('spot-list-open', open);
                const it = itemOf.get(box);
                if (it) it.classList.toggle('open', open);
                if (open) setTimeout(() => window.dispatchEvent(new Event('resize')), 30); // agar tablesaw menghitung ulang kolom
            }
            function closeAllLists() { listBoxes.forEach(b => setOpen(b, false)); }
            function toggleList(box) {
                closeAccountMenu();
                if (document.body.classList.contains('spot-classic')) {   // mode klasik: daftar tampil biasa
                    box.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    return;
                }
                const willOpen = !box.classList.contains('spot-list-open');
                listBoxes.forEach(b => setOpen(b, false));
                if (willOpen) setOpen(box, true);
            }
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape') listBoxes.forEach(b => setOpen(b, false));
            });
            document.addEventListener('mousedown', (e) => {
                if (e.target.closest && e.target.closest('#spot-dock')) return;
                listBoxes.forEach(b => {
                    if (b.classList.contains('spot-list-open') && !b.contains(e.target)) setOpen(b, false);
                });
            });

            let boundBox = null;
            menu.forEach((m, i) => {
                let active = false;
                try { active = new URL(m.a.href, location.href).pathname === location.pathname; } catch (e) {}
                const iconNode = m.a.querySelector('i, svg, img, .glyphicon, [class*="fa-"]');
                const box = (!boundBox && active && listBoxes.length) ? listBoxes[0] : null;
                if (box) boundBox = box;
                const base = { label: m.label, active, iconNode, emoji: pickEmoji(m.label), color: COLORS[i % COLORS.length] };
                const it = makeItem(box ? Object.assign(base, { onClick: () => toggleList(box) })
                                        : Object.assign(base, { href: m.a.href }));
                if (box) itemOf.set(box, it);
                dock.appendChild(it);
            });

            // daftar lain yang belum punya tombol (mis. di halaman mata kuliah)
            listBoxes.forEach((box, i) => {
                if (box === boundBox) return;
                const t = box.querySelector('.box-title, h4, h3');
                const title = (t ? t.textContent : 'Daftar').replace(/\s+/g, ' ').trim();
                const emoji = pickEmoji(title) === '📄' ? '📋' : pickEmoji(title);
                const it = makeItem({ label: title, emoji, color: COLORS[(i + 2) % COLORS.length], onClick: () => toggleList(box) });
                itemOf.set(box, it);
                dock.appendChild(it);
            });

            const sep = document.createElement('span'); sep.className = 'dk-sep'; dock.appendChild(sep);

            dock.appendChild(makeItem({ label: 'Wallpaper', emoji: '📷', img: ICON.wallpaper, light: true, color: COLORS[1], onClick: () => wpBtn.click() }));
            dock.appendChild(makeItem({ label: 'Tema', emoji: '🎨', img: ICON.tema, mono: true, color: COLORS[3], onClick: () => themeBtn.click() }));
            dock.appendChild(makeItem({ label: 'Hapus Wallpaper', emoji: '🗑️', img: ICON.hapus, mono: true, color: COLORS[5], cls: 'dk-reset', onClick: () => resetBtn.click() }));
            dock.appendChild(makeItem({
                label: 'Tampilan Klasik / Dock', emoji: '🗂️', color: ['#9aa5b1', '#52606d'],
                onClick: () => {
                    const on = document.body.classList.toggle('spot-classic');
                    localStorage.setItem('spot_classic', on ? '1' : '0');
                }
            }));

            // efek membesar saat kursor mendekat (seperti Dock macOS)
            const items = Array.from(dock.querySelectorAll('.dk-item'));
            dock.addEventListener('mousemove', (e) => {
                const dr = dock.getBoundingClientRect();
                items.forEach(it => {
                    const center = dr.left + it.offsetLeft + it.offsetWidth / 2;
                    const d = Math.abs(e.clientX - center);
                    const s = 1 + 0.55 * Math.max(0, 1 - d / 110);
                    it.style.setProperty('--s', s.toFixed(3));
                });
            });
            dock.addEventListener('mouseleave', () => items.forEach(it => it.style.setProperty('--s', 1)));

            // terapkan
            fixShift(sideWidth);
            side.classList.add('spot-side-hidden');
            document.body.appendChild(dock);
            document.body.classList.add('spot-dock-on');
            return true;
        }

        let attempts = 0;
        function tryInit() {
            if (document.getElementById('spot-dock')) return;
            const side = findSidebar();
            if (side && buildDock(side)) return;
            if (++attempts < 5) setTimeout(tryInit, 400);
            else console.warn('[SPOT Dock] Sidebar tidak ditemukan, dock tidak diaktifkan.');
        }
        tryInit();
    })();


    /* =========================================================
       5. WORDMARK "BuSpot" (kecil, kanan bawah)
       Gambar PNG transparan (font DotGothic16 + logo UPI sebagai huruf "o").
       ========================================================= */
    (function initBrand() {
        if (document.getElementById('spot-brand')) return;
        if (typeof SPOT_ICONS === 'undefined' || !SPOT_ICONS.brand) return;
        const box = document.createElement('div');
        box.id = 'spot-brand';
        const img = document.createElement('img');
        img.src = SPOT_ICONS.brand;
        img.alt = 'BuSpot';
        img.draggable = false;
        box.appendChild(img);
        document.body.appendChild(box);
    })();

})();