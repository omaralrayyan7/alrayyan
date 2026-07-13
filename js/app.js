/* ============================================================================
   ALRAYYAN GROUP — Redesign interactions
   Vanilla JS · no dependencies · XSS-safe DOM building
   ========================================================================== */
(function () {
  'use strict';

  /* ---------- Small DOM helpers (safe by construction) -------------------- */
  // el() builds nodes with textContent (never innerHTML) so any string —
  // including data that could later come from Firestore — is inert as markup.
  function el(tag, props, children) {
    const node = document.createElement(tag);
    if (props) {
      for (const k in props) {
        if (k === 'class') node.className = props[k];
        else if (k === 'text') node.textContent = props[k];
        else if (k === 'html') node.innerHTML = props[k]; // only for our own trusted constants
        else if (k.startsWith('on') && typeof props[k] === 'function') node.addEventListener(k.slice(2), props[k]);
        else if (props[k] != null) node.setAttribute(k, props[k]);
      }
    }
    (children || []).forEach(function (c) {
      if (c == null) return;
      node.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
    });
    return node;
  }
  const $ = function (s, r) { return (r || document).querySelector(s); };
  const $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  /* ---------- Content data (bilingual; would come from Firestore in prod) - */
  const SPACES = [
    { slug: 'full-floor', tag: { en: 'Signature', ar: 'مميّز' }, title: { en: 'Full Floor', ar: 'طابق كامل' }, img: 'images/main/full-floor-outside.webp', price: { en: 'Contact for pricing', ar: 'تواصل للتسعير' }, desc: { en: 'An entire 400 m² floor. Open layout, maximum space, fully customisable — ideal for corporate headquarters.', ar: 'طابق كامل بمساحة 400 م². تخطيط مفتوح، أقصى مساحة، وقابل للتخصيص بالكامل — مثالي لمقرات الشركات.' } },
    { slug: 'small-spaces', tag: { en: 'Popular', ar: 'شائع' }, title: { en: 'Small Spaces', ar: 'مساحات صغيرة' }, img: 'images/main/small-spaces-outside.webp', price: { en: 'Contact for pricing', ar: 'تواصل للتسعير' }, desc: { en: 'Pre-divided 80–160 m² units within a shared floor, each with a private entrance and shared corridor.', ar: 'وحدات مقسّمة مسبقاً بمساحة 80–160 م² ضمن طابق مشترك، لكل منها مدخل خاص وممر مشترك.' } },
    { slug: 'open-space', tag: { en: 'Flexible', ar: 'مرن' }, title: { en: 'Open Space', ar: 'مساحة مفتوحة' }, img: 'images/main/open-space-outside.webp', price: { en: 'Contact for pricing', ar: 'تواصل للتسعير' }, desc: { en: 'A large, undivided open-plan space. Perfect for showrooms, event venues or custom build-outs on ground and basement levels.', ar: 'مساحة كبيرة مفتوحة غير مقسّمة. مثالية للمعارض وقاعات المناسبات أو التصاميم المخصصة في الطوابق الأرضية والسفلية.' } },
    { slug: '9th-outdoor', tag: { en: 'Rooftop', ar: 'سطح' }, title: { en: '9th Floor — Outdoor Terrace', ar: 'الطابق التاسع — التراس الخارجي' }, img: 'images/main/9th-floor-outdoor-outside.webp', price: { en: 'Contact for pricing', ar: 'تواصل للتسعير' }, desc: { en: 'A rooftop terrace with panoramic city views — restaurants, lounges, events or open-air offices.', ar: 'تراس على السطح بإطلالات بانورامية على المدينة — مطاعم، صالات، مناسبات، أو مكاتب في الهواء الطلق.' } },
    { slug: '9th-indoor', tag: { en: 'Penthouse', ar: 'بنتهاوس' }, title: { en: '9th Floor — Indoor Space', ar: 'الطابق التاسع — المساحة الداخلية' }, img: 'images/main/9th-floor-indoor-outside.webp', price: { en: 'Contact for pricing', ar: 'تواصل للتسعير' }, desc: { en: 'Premium penthouse-level indoor space with exclusive access — executive offices, studios or VIP lounges.', ar: 'مساحة داخلية فاخرة بمستوى البنتهاوس ووصول حصري — مكاتب تنفيذية أو استوديوهات أو صالات كبار الشخصيات.' } },
    { slug: 'small-shops', tag: { en: 'Retail', ar: 'تجزئة' }, title: { en: 'Small Shops', ar: 'محلات صغيرة' }, img: 'images/main/small-shops-outside.webp', price: { en: 'Contact for pricing', ar: 'تواصل للتسعير' }, desc: { en: 'Compact ground-floor retail units with street-level access — cafés, boutiques or service counters.', ar: 'وحدات تجزئة مدمجة بالطابق الأرضي مع وصول من مستوى الشارع — مقاهٍ أو متاجر أو منافذ خدمة.' } }
  ];

  // Source of truth: real available inventory at Alrayyan Tower.
  // `id` maps each row to its floor sub-page (floor.html?floor=<id>).
  // Each `sizes[].key` is the exact Firestore key the admin panel's
  // Availability Toggles write to (settings/availability, "<floorId>_<sizeKey>"),
  // so toggling a unit there is reflected live here — no key, no live update.
  const OFFICE_SIZES = [
    { k: '80', label: { en: '80 m²', ar: '80 م²' } },
    { k: '160', label: { en: '160 m²', ar: '160 م²' } },
    { k: '240', label: { en: '240 m²', ar: '240 م²' } },
    { k: '400', label: { en: '400 m²', ar: '400 م²' } }
  ];
  function officeSizes(floorId) {
    return OFFICE_SIZES.map(function (s) { return { key: floorId + '_' + s.k, label: s.label }; });
  }
  const AVAILABILITY = [
    { id: 'b1', floor: 'B1', title: { en: 'Open Space', ar: 'مساحة مفتوحة' }, sizes: [{ key: 'b1_1000', label: { en: '1,000 m²', ar: '1,000 م²' } }] },
    { id: 'g', floor: 'G', title: { en: 'Retail Shops', ar: 'محلات تجارية' }, sizes: [
      { key: 'g_shop1', label: { en: 'Shop 1', ar: 'محل 1' } },
      { key: 'g_shop2', label: { en: 'Shop 2', ar: 'محل 2' } },
      { key: 'g_shop3', label: { en: 'Shop 3', ar: 'محل 3' } }
    ] },
    { id: '1', floor: '1', title: { en: 'Office Unit', ar: 'وحدة مكتبية' }, sizes: officeSizes('1') },
    { id: '2', floor: '2', title: { en: 'Office Unit', ar: 'وحدة مكتبية' }, sizes: officeSizes('2') },
    { id: '3', floor: '3', title: { en: 'Office Unit', ar: 'وحدة مكتبية' }, sizes: officeSizes('3') },
    { id: '4', floor: '4', title: { en: 'Full Floor', ar: 'طابق كامل' }, sizes: officeSizes('4') },
    { id: '5', floor: '5', title: { en: 'Office Unit', ar: 'وحدة مكتبية' }, sizes: officeSizes('5') },
    { id: '6', floor: '6', title: { en: 'Full Floor', ar: 'طابق كامل' }, sizes: officeSizes('6') },
    { id: '7', floor: '7', title: { en: 'Full Floor', ar: 'طابق كامل' }, sizes: officeSizes('7') },
    { id: '8', floor: '8', title: { en: 'Office Unit', ar: 'وحدة مكتبية' }, sizes: officeSizes('8') },
    // 9th floor combined (outdoor terrace + indoor space) into one row — links
    // to the combined floor.html?floor=9 page. Office Rental Solutions cards
    // keep the two 9th-floor types separate (unchanged). Keys match the
    // admin panel's separate '9-outdoor' / '9-indoor' floor entries.
    { id: '9', floor: '9', title: { en: 'Outdoor + Indoor', ar: 'خارجي + داخلي' }, sizes: [
      { key: '9-outdoor_240', label: { en: '240 m² Outdoor', ar: '240 م² خارجي' } },
      { key: '9-indoor_160', label: { en: '160 m² Indoor', ar: '160 م² داخلي' } }
    ] }
  ];

  const FEATURES = [
    { icon: '📍', title: { en: 'Prime Location', ar: 'موقع متميز' }, desc: { en: 'Strategically positioned on Queen Alia Street, one of Amman\'s top business corridors.', ar: 'موقع استراتيجي على شارع الملكة علياء، أحد أبرز الممرات التجارية في عمّان.' } },
    { icon: '🧾', title: { en: 'All-Inclusive', ar: 'شامل الخدمات' }, desc: { en: 'Utilities, maintenance, security and cleaning bundled into one invoice — zero surprises.', ar: 'المرافق والصيانة والأمن والتنظيف ضمن فاتورة واحدة — بلا مفاجآت.' } },
    { icon: '📐', title: { en: 'Flexible Terms', ar: 'شروط مرنة' }, desc: { en: 'Monthly, quarterly or annual contracts tailored to your business timeline.', ar: 'عقود سنوية تناسب جدول أعمالك.' } },
    { icon: '🏛️', title: { en: 'Modern Design', ar: 'تصميم عصري' }, desc: { en: 'A panoramic double-glazed façade — city views, natural light, and full acoustic insulation.', ar: 'واجهة زجاجية بانورامية مزدوجة — إطلالات على المدينة، إضاءة طبيعية، وعزل صوتي كامل.' } },
    { icon: '🛡️', title: { en: '24/7 Security', ar: 'أمن على مدار الساعة' }, desc: { en: 'Dedicated on-site security and monitoring around the clock, every day.', ar: 'أمن مخصص ومراقبة على مدار الساعة كل يوم.' } },
    { icon: '🚗', title: { en: 'Ample Parking', ar: 'مواقف واسعة' }, desc: { en: 'Reserved tenant parking with generous ratios per unit, plus visitor bays.', ar: 'مواقف مخصصة للمستأجرين بنسب سخية لكل وحدة.' } }
  ];

  // biz id 1/2/3 matches the admin panel + settings/biz_status Firestore doc
  // keys ("biz_status_1" etc.) so the enable/disable toggle there is live.
  const VENTURES = [
    { id: 1, num: '01', title: { en: 'Alrayyan Fashion', ar: 'أزياء الريان' }, img: 'images/main/biz-fashion.webp', href: 'fashion.html', desc: { en: 'Curated luxury fashion — an online store and physical boutique of refined everyday and evening wear.', ar: 'أزياء فاخرة منتقاة — متجر إلكتروني وبوتيك فعلي لملابس يومية وسهرة راقية.' } },
    { id: 2, num: '02', title: { en: 'Alrayyan Arts', ar: 'فنون الريان' }, img: 'images/main/biz-arts.webp', href: 'arts.html', desc: { en: 'A gallery and creative studio celebrating Arab and global contemporary art.', ar: 'معرض واستوديو إبداعي يحتفي بالفن العربي والعالمي المعاصر.' } },
    { id: 3, num: '03', title: { en: 'Alrayyan Lands', ar: 'أراضي الريان' }, img: 'images/main/biz-land.webp', href: 'land.html', desc: { en: 'Premium land plots across Amman\'s most sought-after districts — Abdoun, Dabouq, Khalda and beyond.', ar: 'قطع أراضٍ مميزة في أرقى أحياء عمّان — عبدون ودابوق وخلدا وما بعدها.' } }
  ];

  const GALLERY = [
    { img: 'images/main/executive-hall.webp', cap: { en: 'Alrayyan Tower', ar: 'برج الريان' } },
    { img: 'images/main/7th-floor-hall.webp', cap: { en: '7th Floor Hall', ar: 'ردهة الطابق السابع' } },
    { img: 'images/main/open-space.webp', cap: { en: 'Open Plan', ar: 'مساحة مفتوحة' } },
    { img: 'images/main/partitions-offices.webp', cap: { en: 'Fitted Suites', ar: 'الطابق السادس' } },
    { img: 'images/main/roof-indoor.webp', cap: { en: '9th Floor Indoor', ar: 'الطابق التاسع الداخلي' } },
    { img: 'images/main/9th-floor-outdoor-inside-banner.webp', cap: { en: 'Rooftop Terrace', ar: 'تراس السطح' } },
    { img: 'images/main/full-space.webp', cap: { en: 'Full Floor', ar: 'طابق كامل' } },
    { img: 'images/main/front-view-office.webp', cap: { en: 'The Tower', ar: 'مكاتب خاصة' } },
    { img: 'images/main/small-spaces-inside-banner.webp', cap: { en: 'Small Spaces', ar: 'مساحات صغيرة' } }
  ];

  var currentLang = 'en';
  var bizStatus = {}; // populated from settings/biz_status via Firestore, id -> 'active'|'inactive'
  var availability = {}; // populated from settings/availability via Firestore, "<floorId>_<sizeKey>" -> boolean
  var availabilityLoaded = false; // true once settings/availability has been confirmed to exist — see isFloorActive
  var floorStatus = {}; // populated from settings/floor_status via Firestore, 'floor_<id>' -> 'active'|'inactive'
  // True once both settings/floor_status and settings/availability have
  // actually answered — gates rendering the Availability grid at all, so a
  // floor that's really occupied never flashes up as "Available" for a
  // moment before disappearing once the real data arrives.
  var floorDataResponded = false;

  // The master switch is authoritative once the admin has explicitly set it:
  // 'inactive' always hides the floor, 'active' always shows it (e.g. to
  // keep advertising a floor that's technically fully booked). Only while
  // it's untouched does the floor fall back to the real per-size data below.
  // Combined 9th-floor row is active as long as either its outdoor or indoor
  // half still has an available size (or is explicitly forced). While
  // settings/availability hasn't loaded yet (or is offline), we don't know
  // real occupancy — fail open and show the floor rather than hiding
  // everything during that window.
  function isFloorActive(id) {
    var fs = floorStatus['floor_' + id];
    if (fs === 'inactive') return false;
    if (fs === 'active') return true;
    if (id === '9') return isFloorActive('9-outdoor') || isFloorActive('9-indoor');
    if (!availabilityLoaded) return true;
    var prefix = id + '_';
    return Object.keys(availability).some(function (k) { return k.indexOf(prefix) === 0 && availability[k]; });
  }

  /* ---------- Render sections ---------------------------------------------
     Re-run on every language switch so office-type names, statuses etc.
     translate too. `isRerender` skips the scroll-triggered fade-in (the
     content is already on screen when the visitor flips languages) but the
     very first paint still gets the normal reveal-on-scroll entrance. ------ */
  function renderSpaces(isRerender) {
    const wrap = $('#spaceCards'); if (!wrap) return;
    wrap.textContent = '';
    const L = currentLang;
    const revealCls = 'card reveal' + (isRerender ? ' in' : '');
    const viewLbl = L === 'ar' ? 'عرض التفاصيل →' : 'View details →';
    SPACES.forEach(function (s, i) {
      const href = 'space.html?type=' + encodeURIComponent(s.slug);
      // The whole card is one anchor so a click anywhere on it navigates —
      // media/title/link are plain elements inside it, not separate anchors.
      const card = el('a', { class: revealCls, href: href, 'aria-label': s.title[L], 'data-d': String(i % 3) }, [
        el('div', { class: 'card__media' }, [
          el('img', { src: s.img, alt: s.title[L], loading: 'lazy' })
        ]),
        el('div', { class: 'card__body' }, [
          el('span', { class: 'card__tag', text: s.tag[L] }),
          el('h3', { text: s.title[L] }),
          el('p', { text: s.desc[L] }),
          el('div', { class: 'card__foot' }, [
            el('span', { class: 'card__price', text: s.price[L] }),
            el('span', { class: 'link-underline', text: viewLbl })
          ])
        ])
      ]);
      wrap.appendChild(card);
    });
  }

  function renderAvailability(isRerender) {
    const wrap = $('#availGrid'); if (!wrap) return;
    wrap.textContent = '';
    const L = currentLang;
    const revealCls = 'avail-row reveal' + (isRerender ? ' in' : '');
    const viewLbl = L === 'ar' ? 'عرض ←' : 'View →';
    const occupiedLbl = L === 'ar' ? 'مؤجّر بالكامل' : 'Fully Occupied';
    (floorDataResponded ? AVAILABILITY.filter(function (a) { return isFloorActive(a.id); }) : []).forEach(function (a, i) {
      const anyOn = a.sizes.some(function (sz) { return !!availability[sz.key]; });
      const sizeEls = a.sizes.map(function (sz) {
        const on = !!availability[sz.key];
        return el('span', { class: 'size-tag ' + (on ? 'size-tag--on' : 'size-tag--off'), text: sz.label[L] });
      });
      const kids = [
        el('div', { class: 'avail-row__floor', text: a.floor }),
        el('div', { class: 'avail-row__meta' }, [
          el('div', { class: 't', text: a.title[L] }),
          el('div', { class: 'avail-row__sizes' }, sizeEls)
        ]),
        el('span', { class: 'avail-row__book', text: anyOn ? viewLbl : occupiedLbl })
      ];
      // Rows with no available size at all aren't linked to the floor
      // sub-page — nothing to view, so a plain (non-clickable) div instead of <a>.
      const rowCls = revealCls + (anyOn ? '' : ' avail-row--disabled');
      const row = anyOn
        ? el('a', { class: rowCls, href: 'floor.html?floor=' + encodeURIComponent(a.id), 'data-d': String(i % 2) }, kids)
        : el('div', { class: rowCls, 'data-d': String(i % 2), 'aria-disabled': 'true' }, kids);
      wrap.appendChild(row);
    });
  }

  function renderFeatures() {
    const wrap = $('#features'); if (!wrap) return;
    wrap.textContent = '';
    const L = currentLang;
    FEATURES.forEach(function (f) {
      wrap.appendChild(el('div', { class: 'feature' }, [
        el('div', { class: 'feature__ico', text: f.icon }),
        el('h3', { text: f.title[L] }),
        el('p', { text: f.desc[L] })
      ]));
    });
  }

  function renderVentures(isRerender) {
    const wrap = $('#venturesGrid'); if (!wrap) return;
    wrap.textContent = '';
    const L = currentLang;
    const discoverLbl = L === 'ar' ? 'اكتشف →' : 'Discover →';
    VENTURES.forEach(function (v, i) {
      // Admin-disabled businesses stay visible but faded and non-interactive
      // (matches the current production site's applyBizStatus behaviour)
      // instead of disappearing entirely.
      const isDisabled = bizStatus[v.id] === 'inactive';
      const revealCls = 'venture reveal' + (isRerender ? ' in' : '') + (isDisabled ? ' venture--disabled' : '');
      wrap.appendChild(el('article', { class: revealCls, 'data-d': String(i) }, [
        el('img', { src: v.img, alt: v.title[L], loading: 'lazy' }),
        el('div', { class: 'venture__body' }, [
          el('span', { class: 'num', text: v.num }),
          el('h3', { text: v.title[L] }),
          el('p', { text: v.desc[L] }),
          el('a', { class: 'link-underline', href: v.href, text: discoverLbl })
        ])
      ]));
    });
  }

  function renderGallery() {
    const wrap = $('#glimpseHome'); if (!wrap) return;
    const L = currentLang;
    makeGlimpse(wrap, GALLERY.map(function (g) { return { img: g.img, cap: g.cap[L] }; }));
  }

  /* ---------- Hero cinematic photo slideshow ------------------------------ */
  // Crossfades through our own interior/exterior photography with a slow
  // Ken Burns zoom on each frame — replaces the old static hero image.
  function initHeroSlideshow() {
    const imgs = $$('.hero__bg-img');
    if (imgs.length < 2) return;
    let i = 0;
    setInterval(function () {
      imgs[i].classList.remove('active');
      i = (i + 1) % imgs.length;
      imgs[i].classList.add('active');
    }, 6500);
  }

  /* ---------- Business status (admin enable/disable) ---------------------- */
  function initBizStatus() {
    if (!window.db) return;
    window.db.doc('settings/biz_status').onSnapshot(function (doc) {
      const d = doc.exists ? (doc.data() || {}) : {};
      bizStatus = { 1: d.biz_status_1, 2: d.biz_status_2, 3: d.biz_status_3 };
      renderVentures(true); // live update — content is already on screen, skip reveal
    }, function (e) { console.warn('[biz_status]', e && e.code); });
  }

  /* ---------- Availability (admin panel toggles) --------------------------- */
  var _availResponded = false, _floorStatusResponded = false;
  function _checkFloorDataResponded() { if (_availResponded && _floorStatusResponded) floorDataResponded = true; }
  function initAvailability() {
    if (!window.db) { _availResponded = true; _checkFloorDataResponded(); return; }
    window.db.doc('settings/availability').onSnapshot(function (doc) {
      availability = doc.exists ? (doc.data() || {}) : {};
      availabilityLoaded = doc.exists;
      _availResponded = true; _checkFloorDataResponded();
      renderAvailability(true); // live update — content is already on screen, skip reveal
    }, function (e) { console.warn('[availability]', e && e.code); _availResponded = true; _checkFloorDataResponded(); renderAvailability(true); });
  }

  /* ---------- Floor status (admin enable/disable a whole floor) ----------- */
  function initFloorStatus() {
    if (!window.db) { _floorStatusResponded = true; _checkFloorDataResponded(); return; }
    window.db.doc('settings/floor_status').onSnapshot(function (doc) {
      floorStatus = doc.exists ? (doc.data() || {}) : {};
      _floorStatusResponded = true; _checkFloorDataResponded();
      renderAvailability(true); // live update — content is already on screen, skip reveal
    }, function (e) { console.warn('[floor_status]', e && e.code); _floorStatusResponded = true; _checkFloorDataResponded(); renderAvailability(true); });
  }

  // Full-width cinematic slider: caption overlay + dots + subtle arrows,
  // autoplay (pauses on hover), touch-swipe and keyboard. Track forced LTR.
  function makeGlimpse(mount, items) {
    mount.textContent = '';
    let idx = 0, timer = null;
    const frame = el('div', { class: 'glimpse__frame' });
    const viewport = el('div', { class: 'glimpse__viewport' });
    const track = el('div', { class: 'glimpse__track' });
    items.forEach(function (g, i) {
      track.appendChild(el('figure', { class: 'glimpse__slide' }, [
        el('img', { src: g.img, alt: g.cap || '', loading: i === 0 ? 'eager' : 'lazy', decoding: 'async' }),
        g.cap ? el('figcaption', { class: 'glimpse__cap', text: g.cap }) : null
      ]));
    });
    viewport.appendChild(track);
    frame.appendChild(viewport);

    const dotsWrap = el('div', { class: 'glimpse__dots' });
    const dots = items.map(function (_, i) {
      return el('button', { class: 'glimpse__dot' + (i === 0 ? ' active' : ''), 'aria-label': 'Slide ' + (i + 1), onclick: function () { go(i); } });
    });
    dots.forEach(function (d) { dotsWrap.appendChild(d); });

    function update() {
      track.style.transform = 'translateX(-' + (idx * 100) + '%)';
      dots.forEach(function (d, i) { d.classList.toggle('active', i === idx); });
    }
    function go(i) { idx = (i + items.length) % items.length; update(); }
    function next() { go(idx + 1); } function prev() { go(idx - 1); }

    if (items.length > 1) {
      frame.appendChild(el('button', { class: 'glimpse__arrow glimpse__arrow--prev', 'aria-label': 'Previous', onclick: prev }, ['‹']));
      frame.appendChild(el('button', { class: 'glimpse__arrow glimpse__arrow--next', 'aria-label': 'Next', onclick: next }, ['›']));
      function start() { stop(); timer = setInterval(next, 5000); }
      function stop() { if (timer) { clearInterval(timer); timer = null; } }
      frame.addEventListener('mouseenter', stop);
      frame.addEventListener('mouseleave', start);
      let x0 = null;
      viewport.addEventListener('touchstart', function (e) { x0 = e.touches[0].clientX; stop(); }, { passive: true });
      viewport.addEventListener('touchend', function (e) {
        if (x0 == null) return;
        const dx = e.changedTouches[0].clientX - x0;
        if (Math.abs(dx) > 40) { dx < 0 ? next() : prev(); }
        x0 = null; start();
      });
      frame.tabIndex = 0;
      frame.addEventListener('keydown', function (e) { if (e.key === 'ArrowRight') next(); else if (e.key === 'ArrowLeft') prev(); });
      start();
    }
    mount.appendChild(frame);
    if (items.length > 1) mount.appendChild(dotsWrap);
    update();
  }

  /* ---------- Scroll reveal ---------------------------------------------- */
  function initReveal() {
    const items = $$('.reveal');
    if (!('IntersectionObserver' in window)) { items.forEach(function (i) { i.classList.add('in'); }); return; }
    const io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
    }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });
    items.forEach(function (i) { io.observe(i); });
  }

  /* ---------- Nav behaviour ---------------------------------------------- */
  function initNav() {
    const nav = $('#nav');
    const onScroll = function () {
      nav.classList.toggle('scrolled', window.scrollY > 40);
      const h = document.documentElement;
      const p = h.scrollTop / (h.scrollHeight - h.clientHeight) * 100;
      $('#progress').style.width = p + '%';
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    const burger = $('#burger'), mobile = $('#navMobile');
    burger.addEventListener('click', function () {
      const open = mobile.classList.toggle('open');
      burger.classList.toggle('open', open);
      burger.setAttribute('aria-expanded', String(open));
      // The mobile menu's own backdrop shows through the (normally transparent
      // or on-photo) nav bar, so the brand text needs theme-aware color here
      // instead of the "always light" on-photo override — see style.css.
      nav.classList.toggle('mobile-open', open);
      document.body.style.overflow = open ? 'hidden' : '';
    });
    $$('#navMobile a').forEach(function (a) {
      a.addEventListener('click', function () { mobile.classList.remove('open'); burger.classList.remove('open'); nav.classList.remove('mobile-open'); document.body.style.overflow = ''; });
    });
  }

  /* ---------- Booking modal ---------------------------------------------- */
  let lastFocus = null;
  window.openBooking = function (space) {
    lastFocus = document.activeElement;
    $('#bkFormWrap').style.display = '';
    $('#bkSuccess').style.display = 'none';
    if (space) { const sel = $('#bk-office'); for (let i = 0; i < sel.options.length; i++) { if (sel.options[i].value.indexOf(space.split(' ·')[0]) === 0) { sel.selectedIndex = i; break; } } }
    const m = $('#booking'); m.classList.add('open');
    document.body.style.overflow = 'hidden';
    setTimeout(function () { $('#bk-fname').focus(); }, 60);
  };
  window.closeBooking = function () {
    $('#booking').classList.remove('open');
    document.body.style.overflow = '';
    if (lastFocus) lastFocus.focus();
  };

  function initBookingForm() {
    const form = $('#bkForm'); if (!form) return;
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      const fname = $('#bk-fname').value.trim();
      const phone = $('#bk-phone').value.trim();
      if (!fname) { $('#bk-fname').focus(); return; }
      if (!phone) { $('#bk-phone').focus(); return; }
      const ref = 'ARG-' + Date.now().toString(36).toUpperCase().slice(-6);

      // The admin panel renders these values with textContent / the el()
      // helper above — never string-interpolated innerHTML — to stay XSS-safe.
      const booking = {
        ref: ref,
        visitor_name: (fname + ' ' + $('#bk-lname').value.trim()).trim(),
        phone: phone,
        email: $('#bk-email').value.trim(),
        floor_preference: $('#bk-office').value,
        preferred_date: $('#bk-date').value,
        preferred_time: $('#bk-time').value,
        notes: $('#bk-notes').value.trim(),
        source: 'redesign_index',
        status: 'pending'
      };
      if (window.db) {
        booking.created_at = firebase.firestore.FieldValue.serverTimestamp();
        window.db.collection('bookings').add(booking).catch(function (e) { console.warn('[booking] write failed', e && e.code); });
      }

      $('#bkRef').textContent = ref;              // safe: textContent
      $('#bkFormWrap').style.display = 'none';
      $('#bkSuccess').style.display = 'block';
    });
  }

  /* ---------- Cookie bar -------------------------------------------------- */
  // Writes a doc to `cookie_acceptances` (read live by the admin panel) —
  // matches the Firestore rules' validCookieAccept() field/size limits.
  function logCookieAcceptance() {
    if (!window.db) return;
    let visitorId = null;
    try {
      visitorId = localStorage.getItem('arg_visitor_id');
      if (!visitorId) { visitorId = 'v_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8); localStorage.setItem('arg_visitor_id', visitorId); }
    } catch (e) {}
    const ua = navigator.userAgent || '';
    const device = /Mobi|Android/i.test(ua) ? 'Mobile' : 'Desktop';
    const browser = /Edg\//.test(ua) ? 'Edge' : /Chrome\//.test(ua) ? 'Chrome' : /Firefox\//.test(ua) ? 'Firefox' : /Safari\//.test(ua) ? 'Safari' : 'Other';
    window.db.collection('cookie_acceptances').add({
      visitor_id: (visitorId || '').slice(0, 64),
      lang: currentLang.slice(0, 10),
      device: device.slice(0, 60),
      browser: browser.slice(0, 80),
      os: (navigator.platform || '').slice(0, 60),
      timezone: (Intl.DateTimeFormat().resolvedOptions().timeZone || '').slice(0, 60),
      referrer: (document.referrer || '').slice(0, 200),
      path: (location.pathname || '').slice(0, 200),
      accepted_at: firebase.firestore.FieldValue.serverTimestamp()
    }).catch(function (e) { console.warn('[cookie log] write failed', e && e.code); });
  }
  window.acceptCookies = function () {
    try { localStorage.setItem('arg_cookie_ok', '1'); } catch (e) {}
    $('#cookie').classList.remove('show');
    logCookieAcceptance();
  };
  // Reject → visitor declines cookies and leaves the site.
  window.rejectCookies = function () {
    try { localStorage.setItem('arg_cookie_ok', 'rejected'); } catch (e) {}
    $('#cookie').classList.remove('show');
    window.open('', '_self'); window.close();
    setTimeout(function () { window.location.href = 'https://www.google.com'; }, 120);
  };
  function initCookie() {
    let ok = null;
    try { ok = localStorage.getItem('arg_cookie_ok'); } catch (e) {}
    if (!ok) setTimeout(function () { $('#cookie').classList.add('show'); }, 1400);
  }

  /* ---------- Theme (dark / light) --------------------------------------- */
  window.toggleTheme = function () {
    const next = document.documentElement.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', next);
    try { localStorage.setItem('arg_theme', next); } catch (e) {}
  };
  function initTheme() {
    let t = 'dark';
    try { t = localStorage.getItem('arg_theme') || 'dark'; } catch (e) {}
    document.documentElement.setAttribute('data-theme', t);
  }

  /* ---------- Bilingual (EN / AR) ---------------------------------------- */
  const I18N = {
    ar: {
      navAbout: 'من نحن', navSpaces: 'المساحات', navAvail: 'المتاح', navVentures: 'أعمالنا', navGallery: 'المعرض', navContact: 'اتصل بنا', navBook: 'احجز زيارة',
      heroEye: 'برج الريان، شارع الملكة علياء، عمّان، الأردن',
      heroTagline: 'حيث تلتقي المكانة بالإنتاجية',
      heroCta1: 'استكشف المساحات', heroCta2: 'احجز زيارة خاصة', scroll: 'مرّر',
      stat1: 'طوابق للإيجار', stat2: 'عاماً من الثقة', stat3: 'مساحات متاحة', stat4: 'شامل الخدمات',
      aboutEye: 'من نحن', aboutTitle: 'الوجهة الأولى في عمّان<br/>لتأجير المكاتب والمساحات',
      aboutP1: 'برج الريان مبنى تجاري راقٍ على شارع الملكة علياء، يقدّم حلول تأجير متكاملة — من المكاتب الخاصة والمساحات المفتوحة إلى المحلات والتراسات. عنوان مهني للشركات بجميع أحجامها.',
      aboutP2: 'سواء كنت شركة ناشئة تبحث عن مكتب صغير أو مؤسسة راسخة تريد طابقاً كاملاً، نوفّر الجودة والمرونة وموقعاً مرموقاً في قلب العاصمة.',
      aboutBadge: 'عاماً من الثقة', aboutCta: 'عرض المتاح', aboutLink: 'تحدّث مع فريقنا',
      spacesEye: 'محفظتنا', spacesTitle: 'حلول تأجير المكاتب', spacesSub: 'ست طرق لتأسيس عملك في برج الريان — كلٌّ مجهّز وجاهز للانتقال.',
      availEye: 'المتاح حالياً', availTitle: 'متاح الآن', availSub: 'ثماني مساحات جاهزة للإيجار اليوم. احجز جولة خاصة لأي وحدة أدناه.',
      whyEye: 'لماذا نحن', whyTitle: 'مستوى يتفوّق<br/>على البقية',
      ventEye: 'عالم الريان', ventTitle: 'أعمالنا', ventSub: 'أبعد من العقارات — ثلاث علامات تحت اسم واحد.',
      galEye: 'داخل البرج', galTitle: 'لمحة من الداخل', cardDetails: 'عرض التفاصيل →',
      mapAddr: 'برج الريان، شارع الملكة علياء، عمّان', mapGo: 'انقر للفتح في خرائط جوجل →',
      ctaEye: 'نحن جاهزون', ctaTitle: 'اعثر على عنوانك في برج الريان', ctaBtn: 'احجز زيارة',
      conEye: 'تواصل معنا', conTitle: 'لنتحدّث عن مساحتك', conSub: 'زُرنا، اتصل، أو أرسل رسالة — يردّ فريقنا خلال يوم عمل واحد.',
      conAddrK: 'العنوان', conAddrV: 'برج الريان، شارع الملكة علياء، عمّان، الأردن',
      conPhoneK: 'هاتف / واتساب', conMailK: 'البريد', conHoursK: 'ساعات العمل', conHoursV: 'السبت – الخميس · 9:00 ص – 6:00 م',
      footAbout: 'مكاتب ومساحات واستثمارات راقية في عمّان، الأردن. عنوان أعمال مرموق مبنيّ على عقدين من الثقة.',
      footExplore: 'استكشف', footVentures: 'أعمالنا', footContact: 'اتصل', footTag: 'تأجير مكاتب راقية · حيث تلتقي المكانة بالإنتاجية', footPrivacy: 'سياسة الخصوصية',
      bkEye: 'زيارة خاصة', bkTitle: 'احجز جولة', bkSub: 'أخبرنا بما تحتاجه ومتى. سنؤكّد موعدك عبر البريد.',
      bkFirst: 'الاسم الأول *', bkLast: 'اسم العائلة', bkPhone: 'هاتف / واتساب *', bkEmail: 'البريد', bkSpace: 'المساحة المطلوبة',
      bkDate: 'التاريخ المفضّل', bkTime: 'الوقت المفضّل', bkNotes: 'ملاحظات', bkSubmit: 'اطلب زيارة',
      bkNote: 'بإرسالك توافق على أن نتواصل معك بخصوص زيارتك. بلا إزعاج إطلاقاً.',
      bkDoneTitle: 'تم استلام الطلب', bkDoneSub: 'شكراً لك — سيؤكّد فريقنا زيارتك قريباً. رقمك المرجعي:', bkDoneClose: 'إغلاق',
      cookie: 'نستخدم ملفات تعريف الارتباط لتحسين تجربتك. <a href="privacy.html">اعرف المزيد</a>.', cookieBtn: 'موافق', cookieReject: 'رفض'
    }
  };
  // Snapshot the original English strings so we can toggle back.
  const EN = {};
  function snapshotEN() {
    $$('[data-i18n]').forEach(function (n) { EN[n.getAttribute('data-i18n')] = n.textContent; });
    $$('[data-i18n-html]').forEach(function (n) { EN[n.getAttribute('data-i18n-html')] = n.innerHTML; });
  }
  function setLang(lang) {
    currentLang = lang;
    const dict = lang === 'ar' ? I18N.ar : EN;
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    $$('[data-i18n]').forEach(function (n) { const k = n.getAttribute('data-i18n'); if (dict[k]) n.textContent = dict[k]; });
    $$('[data-i18n-html]').forEach(function (n) { const k = n.getAttribute('data-i18n-html'); if (dict[k]) n.innerHTML = dict[k]; });
    $$('.lang button').forEach(function (b) { b.classList.toggle('active', b.getAttribute('data-lang') === lang); });
    try { localStorage.setItem('arg_lang', lang); } catch (e) {}
    // Office types, availability rows, features and ventures are data-driven
    // (not data-i18n markup) so they need an explicit re-render to translate.
    renderSpaces(true); renderAvailability(true); renderFeatures(); renderVentures(true); renderGallery();
  }
  function initLang() {
    snapshotEN();
    $$('.lang button').forEach(function (b) { b.addEventListener('click', function () { setLang(b.getAttribute('data-lang')); }); });
    let saved = 'en'; try { saved = localStorage.getItem('arg_lang') || 'en'; } catch (e) {}
    if (saved === 'ar') setLang('ar');
  }

  /* ---------- Keyboard ---------------------------------------------------- */
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeBooking(); });

  /* ---------- Boot -------------------------------------------------------- */
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  document.addEventListener('DOMContentLoaded', function () {
    window.scrollTo(0, 0);
    $('#year').textContent = new Date().getFullYear();
    renderSpaces(); renderAvailability(); renderFeatures(); renderVentures(); renderGallery();
    initTheme(); initReveal(); initNav(); initBookingForm(); initCookie(); initLang();
    initHeroSlideshow(); initBizStatus(); initAvailability(); initFloorStatus();
  });
})();
