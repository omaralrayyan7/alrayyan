/* ============================================================================
   ALRAYYAN — Space (office-solution) detail (redesign)
   Bilingual (EN/AR), XSS-safe DOM building, full-width glimpse slider.
   Mirrors floor.js; data is the six Office Rental Solutions.
   ========================================================================== */
(function () {
  'use strict';

  var IMG = 'images/main/';
  var IMGF = 'images/floors/';

  // "A Glimpse Inside" mixes real photos from the floor(s) that carry each
  // office-solution type (max 6, no duplicates), captioned with the floor
  // they were taken on — rather than the generic marketing shots used
  // before, which didn't represent the actual floors on offer.
  var GLIMPSE_MIX = {
    'full-floor': [
      { img: IMGF + 'floor-4/real/4-real-img-1.webp', floor: { en: '4th Floor', ar: 'الطابق الرابع' } },
      { img: IMGF + 'floor-6/real/6-real-img-1.webp', floor: { en: '6th Floor', ar: 'الطابق السادس' } },
      { img: IMGF + 'floor-7/real/7-real-img-1.webp', floor: { en: '7th Floor', ar: 'الطابق السابع' } },
      { img: IMGF + 'floor-4/real/4-real-img-2.webp', floor: { en: '4th Floor', ar: 'الطابق الرابع' } },
      { img: IMGF + 'floor-6/real/6-real-img-2.webp', floor: { en: '6th Floor', ar: 'الطابق السادس' } },
      { img: IMGF + 'floor-7/real/7-real-img-2.webp', floor: { en: '7th Floor', ar: 'الطابق السابع' } }
    ],
    'small-spaces': [
      { img: IMGF + 'floor-3/real/3-real-img-1.webp', floor: { en: '3rd Floor', ar: 'الطابق الثالث' } },
      { img: IMGF + 'floor-5/real/5-real-img-1.webp', floor: { en: '5th Floor', ar: 'الطابق الخامس' } },
      { img: IMGF + 'floor-5/real/5-real-img-2.webp', floor: { en: '5th Floor', ar: 'الطابق الخامس' } },
      { img: IMGF + 'floor-5/real/5-real-img-3.webp', floor: { en: '5th Floor', ar: 'الطابق الخامس' } }
    ],
    'open-space': [
      { img: IMGF + 'floor-b1/real/b1-real-img-1.webp', floor: { en: 'B1 Floor', ar: 'الطابق B1' } },
      { img: IMGF + 'floor-b1/real/b1-real-img-2.webp', floor: { en: 'B1 Floor', ar: 'الطابق B1' } },
      { img: IMGF + 'floor-b1/real/b1-real-img-3.webp', floor: { en: 'B1 Floor', ar: 'الطابق B1' } }
    ],
    '9th-outdoor': [
      { img: IMGF + 'floor-9-outdoor/real/9-outdoor-real-img-1.webp', floor: { en: '9th Floor Outdoor', ar: 'التراس الخارجي' } },
      { img: IMGF + 'floor-9-outdoor/real/9-outdoor-real-img-2.webp', floor: { en: '9th Floor Outdoor', ar: 'التراس الخارجي' } },
      { img: IMGF + 'floor-9-outdoor/real/9-outdoor-real-img-3.webp', floor: { en: '9th Floor Outdoor', ar: 'التراس الخارجي' } },
      { img: IMGF + 'floor-9-outdoor/real/9-outdoor-real-img-4.webp', floor: { en: '9th Floor Outdoor', ar: 'التراس الخارجي' } },
      { img: IMGF + 'floor-9-outdoor/real/9-outdoor-real-img-5.webp', floor: { en: '9th Floor Outdoor', ar: 'التراس الخارجي' } },
      { img: IMGF + 'floor-9-outdoor/real/9-outdoor-real-img-6.webp', floor: { en: '9th Floor Outdoor', ar: 'التراس الخارجي' } }
    ],
    '9th-indoor': [
      { img: IMGF + 'floor-9-indoor/real/9-indoor-real-img-1.webp', floor: { en: '9th Floor Indoor', ar: 'المساحة الداخلية' } },
      { img: IMGF + 'floor-9-indoor/real/9-indoor-real-img-2.webp', floor: { en: '9th Floor Indoor', ar: 'المساحة الداخلية' } },
      { img: IMGF + 'floor-9-indoor/real/9-indoor-real-img-3.webp', floor: { en: '9th Floor Indoor', ar: 'المساحة الداخلية' } }
    ],
    'small-shops': [
      { img: IMGF + 'floor-g/real/g-indoor-real-img-1.webp', floor: { en: 'Ground Floor', ar: 'الطابق الأرضي' } },
      { img: IMGF + 'floor-g/real/g-real-img-2.webp', floor: { en: 'Ground Floor', ar: 'الطابق الأرضي' } },
      { img: IMGF + 'floor-g/real/g-real-img-3.webp', floor: { en: 'Ground Floor', ar: 'الطابق الأرضي' } }
    ]
  };

  function el(tag, props, kids) {
    var n = document.createElement(tag);
    if (props) for (var k in props) {
      if (k === 'class') n.className = props[k];
      else if (k === 'text') n.textContent = props[k];
      else if (k === 'html') n.innerHTML = props[k];      // trusted constants only
      else if (k.slice(0, 2) === 'on' && typeof props[k] === 'function') n.addEventListener(k.slice(2), props[k]);
      else if (props[k] != null) n.setAttribute(k, props[k]);
    }
    (kids || []).forEach(function (c) { if (c != null) n.appendChild(typeof c === 'string' ? document.createTextNode(c) : c); });
    return n;
  }
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  var SPECK = { size: { en: 'Size', ar: 'المساحة' }, cap: { en: 'Capacity', ar: 'السعة' }, lvl: { en: 'Level', ar: 'المستوى' }, lease: { en: 'Lease', ar: 'الإيجار' }, setup: { en: 'Setup', ar: 'التجهيز' }, avail: { en: 'Availability', ar: 'التوفر' } };
  var ANNUAL = { en: 'Annual', ar: 'سنوي' }, SAMEDAY = { en: 'Same day', ar: 'نفس اليوم' };

  // Which floor sub-pages carry this office-solution type — rendered as
  // pill links under the hero, mirroring the current site's office-detail
  // "Available In" buttons.
  var FLOOR_LINKS = {
    'full-floor': [{ id: '4', label: { en: '4th Floor', ar: 'الطابق الرابع' } }, { id: '6', label: { en: '6th Floor', ar: 'الطابق السادس' } }, { id: '7', label: { en: '7th Floor', ar: 'الطابق السابع' } }],
    'small-spaces': [{ id: '3', label: { en: '3rd Floor', ar: 'الطابق الثالث' } }, { id: '5', label: { en: '5th Floor', ar: 'الطابق الخامس' } }],
    'open-space': [{ id: 'b1', label: { en: 'B1 Floor', ar: 'الطابق B1' } }],
    '9th-outdoor': [{ id: '9-outdoor', label: { en: '9th Floor Outdoor', ar: 'التراس الخارجي' } }],
    '9th-indoor': [{ id: '9-indoor', label: { en: '9th Floor Indoor', ar: 'المساحة الداخلية' } }],
    'small-shops': [{ id: 'g', label: { en: 'Ground Floor', ar: 'الطابق الأرضي' } }]
  };

  /* ---------- Space content (six Office Rental Solutions) ----------------- */
  var SPACES = {
    'full-floor': {
      name: { en: 'Full Floor', ar: 'طابق كامل' },
      sub: { en: 'Signature · 400 m² for a single tenant', ar: 'مميّز · 400 م² لمستأجر واحد' },
      sizeLbl: { en: '400 m² · Full Floor', ar: '400 م² · طابق كامل' },
      banner: 'full-floor-inside-banner.webp',
      gallery: ['full-floor-inside-banner.webp', 'full-floor-outside.webp'],
      desc: {
        en: '<p>Alrayyan Tower\'s full-floor offices are fully open spaces offering flexible options from 80 m² up to the entire 400 m². Whether a small startup or a growing company, you lease exactly the space you need and expand as your business grows. High-floor positioning delivers excellent natural light and wide views.</p><p>The open layout gives you complete freedom to design and configure — from private offices to collaborative work environments. Take a single office or the whole floor and shape a workspace that reflects your business.</p>',
        ar: '<p>طوابق برج الريان الكاملة مساحات مفتوحة بالكامل بخيارات مرنة من 80 م² حتى 400 م² بأكملها. سواء كنت شركة ناشئة أو مؤسسة متنامية، تستأجر المساحة التي تحتاجها وتتوسّع بحسب نموّك. يوفر الموقع المرتفع إضاءة طبيعية ممتازة وإطلالات واسعة.</p><p>يمنحك التخطيط المفتوح حرية كاملة في التصميم والتهيئة — من مكاتب خاصة إلى بيئات عمل تشاركية. احجز مكتبًا واحدًا أو الطابق بأكمله وصمّم بيئة تعكس هوية مؤسستك.</p>'
      },
      specs: [
        { k: SPECK.size, v: '400 m²' },
        { k: SPECK.cap, v: { en: '40 – 60 persons', ar: '40 – 60 شخصاً' } },
        { k: SPECK.lvl, v: { en: 'Floors 1 – 8', ar: 'الطوابق 1 – 8' } },
        { k: SPECK.lease, v: ANNUAL }, { k: SPECK.setup, v: SAMEDAY },
        { k: SPECK.avail, v: { en: '4th, 6th & 7th Floors (400 m²)', ar: 'الطوابق 4 و6 و7 (400 م²)' } }
      ]
    },
    'small-spaces': {
      name: { en: 'Small Spaces', ar: 'مساحات صغيرة' },
      sub: { en: 'Popular · 80 – 160 m² units', ar: 'شائع · وحدات 80 – 160 م²' },
      sizeLbl: { en: '80 – 160 m² · Units', ar: '80 – 160 م² · وحدات' },
      banner: 'small-spaces-inside-banner.webp',
      gallery: ['small-spaces-inside-banner.webp', 'small-spaces-outside.webp'],
      desc: {
        en: '<p>Our small office spaces are designed for compact teams or individual businesses wanting a professional workspace without a large footprint. An 80 m² unit suits small teams, while a 160 m² unit offers room for small-to-mid-sized firms and consultancies.</p><p>Practical, well-located units — clean, ready, and sized to keep your overheads lean while your business grows.</p>',
        ar: '<p>صُمّمت مساحاتنا المكتبية الصغيرة للفرق المدمجة أو الأعمال الفردية الباحثة عن مساحة مهنية دون التزام كبير. وحدة 80 م² تناسب الفرق الصغيرة، فيما توفر وحدة 160 م² مساحة للشركات الصغيرة والمتوسطة ومكاتب الاستشارات.</p><p>وحدات عملية بموقع مميز — نظيفة وجاهزة، بحجم يُبقي تكاليفك منخفضة بينما تنمو أعمالك.</p>'
      },
      specs: [
        { k: SPECK.size, v: { en: '80 – 160 m²', ar: '80 – 160 م²' } },
        { k: SPECK.cap, v: { en: '8 – 16 persons', ar: '8 – 16 شخصاً' } },
        { k: SPECK.lvl, v: { en: 'Floors 1 – 8', ar: 'الطوابق 1 – 8' } },
        { k: SPECK.lease, v: ANNUAL }, { k: SPECK.setup, v: SAMEDAY },
        { k: SPECK.avail, v: { en: '3rd Floor (80 m²), 5th Floor (80 m²)', ar: 'الطابق 3 (80 م²)، الطابق 5 (80 م²)' } }
      ]
    },
    'open-space': {
      name: { en: 'Open Space', ar: 'مساحة مفتوحة' },
      sub: { en: 'Flexible · 1,000 m² undivided', ar: 'مرن · 1,000 م² غير مقسّم' },
      sizeLbl: { en: '1,000 m² · Open Space', ar: '1,000 م² · مساحة مفتوحة' },
      banner: 'open-space-inside-banner.webp',
      gallery: ['open-space-inside-banner.webp', 'open-space-outside.webp', 'open-space.webp'],
      desc: {
        en: '<p>The B1 level is a spacious 1,000 m² open floor, fully licensed for sports-club use. Its large undivided area is equally suited to a celebration hall or event space for gatherings, corporate meetings and private functions.</p><p>The generous size and flexible layout make it one of the most versatile spaces in the tower — ready to configure to match your vision.</p>',
        ar: '<p>طابق B1 مساحة مفتوحة واسعة بمساحة 1,000 م²، مرخّصة بالكامل لاستخدامها ناديًا رياضيًا. تصلح مساحته الكبيرة غير المقسّمة أيضًا لقاعة أفراح أو مناسبات وللاجتماعات الخاصة والمؤسسية.</p><p>يجعله حجمه الكبير وتخطيطه المرن أحد أكثر المساحات تنوعًا في البرج — جاهز لتهيئته وفق رؤيتك.</p>'
      },
      specs: [
        { k: SPECK.size, v: '1,000 m²' },
        { k: SPECK.cap, v: { en: '80 – 120 persons', ar: '80 – 120 شخصاً' } },
        { k: SPECK.lvl, v: { en: 'Basement (B1)', ar: 'القبو (B1)' } },
        { k: SPECK.lease, v: ANNUAL }, { k: SPECK.setup, v: SAMEDAY },
        { k: SPECK.avail, v: { en: 'B1 Floor (1,000 m²)', ar: 'الطابق B1 (1,000 م²)' } }
      ]
    },
    '9th-outdoor': {
      name: { en: '9th Floor — Outdoor Terrace', ar: 'الطابق التاسع — التراس الخارجي' },
      sub: { en: 'Rooftop · 300 m² panoramic terrace', ar: 'سطح · تراس بانورامي 300 م²' },
      sizeLbl: { en: '300 m² · Outdoor Terrace', ar: '300 م² · تراس خارجي' },
      banner: '9th-floor-outdoor-inside-banner.webp',
      gallery: ['9th-floor-outdoor-inside-banner.webp', '9th-floor-outdoor-outside.webp'],
      desc: {
        en: '<p>The rooftop terrace is a stunning panoramic space ideal for a restaurant or coffee house. Sweeping city views and open skies make it the perfect setting for outdoor dining or a signature café concept.</p><p>A rare venue at the top of the tower — one that turns an ordinary visit into something truly memorable.</p>',
        ar: '<p>التراس الخارجي مساحة بانورامية رائعة مثالية لمطعم أو مقهى. تجعل إطلالاته الواسعة وسماؤه المفتوحة منه الإطار المثالي لتجربة طعام في الهواء الطلق أو مفهوم مقهى مميز.</p><p>مكان استثنائي على قمة البرج — يحوّل الزيارة العادية إلى تجربة لا تُنسى.</p>'
      },
      specs: [
        { k: SPECK.size, v: '300 m²' },
        { k: SPECK.cap, v: { en: 'Up to 160 guests', ar: 'حتى 160 ضيفاً' } },
        { k: SPECK.lvl, v: { en: '9th (Outdoor)', ar: 'التاسع (خارجي)' } },
        { k: SPECK.lease, v: ANNUAL }, { k: SPECK.setup, v: SAMEDAY },
        { k: SPECK.avail, v: { en: '9th Floor Outdoor Terrace', ar: 'التراس الخارجي بالطابق التاسع' } }
      ]
    },
    '9th-indoor': {
      name: { en: '9th Floor — Indoor Space', ar: 'الطابق التاسع — المساحة الداخلية' },
      sub: { en: 'Penthouse · premium indoor space', ar: 'بنتهاوس · مساحة داخلية فاخرة' },
      sizeLbl: { en: '100 m² · Indoor Space', ar: '100 م² · مساحة داخلية' },
      banner: '9th-floor-indoor-inside-banner.webp',
      gallery: ['9th-floor-indoor-inside-banner.webp', '9th-floor-indoor-outside.webp', 'roof-indoor.webp'],
      desc: {
        en: '<p>The 9th-floor indoor space is a licensed, climate-controlled area perfectly suited to a restaurant or premium dining concept. Adjacent to the outdoor terrace, it offers high-end finishes for an upscale food-and-beverage operation.</p><p>Run it as a standalone restaurant or pair it with the terrace — this space delivers the quality and ambience a premium concept deserves.</p>',
        ar: '<p>المساحة الداخلية في الطابق التاسع مساحة مرخّصة ومكيّفة مناسبة تمامًا لمطعم أو مفهوم طعام راقٍ. بجوار التراس الخارجي، توفر تشطيبات فاخرة لأي نشاط في مجال الأغذية والمشروبات.</p><p>أدرها مطعمًا مستقلاً أو ادمجها مع التراس — تقدم هذه المساحة الجودة والأجواء التي يستحقها أي مفهوم راقٍ.</p>'
      },
      specs: [
        { k: SPECK.size, v: '100 m²' },
        { k: SPECK.cap, v: { en: 'Up to 60 guests', ar: 'حتى 60 ضيفاً' } },
        { k: SPECK.lvl, v: { en: '9th (Indoor)', ar: 'التاسع (داخلي)' } },
        { k: SPECK.lease, v: ANNUAL }, { k: SPECK.setup, v: SAMEDAY },
        { k: SPECK.avail, v: { en: '9th Floor Indoor', ar: 'الطابق التاسع الداخلي' } }
      ]
    },
    'small-shops': {
      name: { en: 'Small Shops', ar: 'محلات صغيرة' },
      sub: { en: 'Retail · ground-floor units', ar: 'تجزئة · وحدات بالطابق الأرضي' },
      sizeLbl: { en: '25 m² · Retail Units', ar: '25 م² · وحدات تجارية' },
      banner: 'small-shops-inside-banner.webp',
      gallery: ['small-shops-inside-banner.webp', 'small-shops-outside.webp'],
      desc: {
        en: '<p>Compact ground-floor retail units with street-level access — ideal for cafés, boutiques or service counters. Each unit has its own entrance, high visibility and direct foot traffic at the tower\'s main entrance.</p><p>A prime commercial address at the heart of the tower for any retail or service business looking to make an impression.</p>',
        ar: '<p>وحدات تجزئة مدمجة بالطابق الأرضي مع وصول من مستوى الشارع — مثالية للمقاهي أو المتاجر أو منافذ الخدمة. لكل وحدة مدخلها الخاص ورؤية عالية وحركة مرور مباشرة عند المدخل الرئيسي للبرج.</p><p>عنوان تجاري متميز في قلب البرج لأي نشاط تجاري أو خدمي يريد إحداث انطباع.</p>'
      },
      specs: [
        { k: SPECK.size, v: { en: '25 m² / shop', ar: '25 م² / محل' } },
        { k: SPECK.cap, v: { en: '2 – 3 staff', ar: '2 – 3 موظفين' } },
        { k: SPECK.lvl, v: { en: 'Ground', ar: 'أرضي' } },
        { k: SPECK.lease, v: ANNUAL }, { k: SPECK.setup, v: SAMEDAY },
        { k: SPECK.avail, v: { en: 'G Floor (3 × 25 m² shops)', ar: 'الطابق الأرضي (3 × 25 م²)' } }
      ]
    }
  };

  // Standard building amenities (shared, bilingual).
  var AMENITIES = {
    en: ['Electricity & water connections', 'Fire-safety systems', '24/7 building security', 'Direct elevator access', 'Listed in the building directory', 'Underground parking — 1 spot / 100 m²', 'Emergency exit', 'All-inclusive service charge', 'High-speed internet ready'],
    ar: ['توصيلات كهرباء وماء', 'أنظمة سلامة من الحرائق', 'أمن على مدار الساعة', 'وصول مباشر بالمصعد', 'إدراج في دليل المبنى', 'مواقف تحت الأرض — موقف لكل 100 م²', 'مخرج طوارئ', 'بدل خدمات شامل', 'إنترنت عالي السرعة جاهز']
  };

  var I18N = {
    ar: {
      navAbout: 'من نحن', navSpaces: 'المساحات', navAvail: 'المتاح', navVentures: 'أعمالنا', navContact: 'اتصل بنا',
      backToFloors: '← كل المساحات', bcHome: 'الرئيسية', bcAvail: 'المساحات', heroEye: 'تفاصيل المساحة',
      ovEye: 'نظرة عامة', ovTitleA: 'عن هذه', ovTitleB: 'المساحة',
      glEye: 'من الداخل', glTitle: 'لمحة من الداخل',
      amEye: 'ما هو مشمول', amTitleA: 'المرافق', amTitleB: 'والميزات',
      fuEye: 'الموقع', fuTitleA: 'ابحث', fuTitleB: 'عنا',
      locAddr: 'برج الريان، شارع الملكة علياء، عمّان', locGo: 'انقر للفتح في خرائط جوجل →',
      bkHead: 'اطلب زيارة', bkSub: 'يؤكّد فريقنا خلال 24 ساعة',
      lblFirst: 'الاسم الأول *', lblLast: 'اسم العائلة', lblPhone: 'الهاتف / واتساب *', lblEmail: 'البريد',
      lblDate: 'التاريخ المفضّل', lblTime: 'الوقت المفضّل', lblNotes: 'ملاحظات', phNotes: 'أي أسئلة أو متطلبات…',
      btnConfirm: 'تأكيد الزيارة →', bkNote: 'مجاناً · بدون التزام · سبت–خميس 9ص–6م',
      sxTitle: 'تم طلب الزيارة!', sxBody: 'سيتصل بك فريقنا خلال 24 ساعة لتأكيد موعدك.',
      qcCall: 'اتصل', qcWA: 'واتساب', qcIG: 'إنستغرام',
      availIn: 'متاح في'
    }
  };

  /* ---------- Full-width cinematic "glimpse" slider ---------------------- */
  function makeGlimpse(mount, items) {
    mount.textContent = '';
    if (!items.length) { mount.appendChild(el('div', { class: 'glimpse__frame' }, [el('div', { class: 'glimpse__slide' })])); return; }
    var idx = 0, timer = null;
    var frame = el('div', { class: 'glimpse__frame' });
    var viewport = el('div', { class: 'glimpse__viewport' });
    var track = el('div', { class: 'glimpse__track' });
    items.forEach(function (g, i) {
      track.appendChild(el('figure', { class: 'glimpse__slide' }, [
        el('img', { src: g.img, alt: g.cap || '', loading: i === 0 ? 'eager' : 'lazy', decoding: 'async' }),
        g.cap ? el('figcaption', { class: 'glimpse__cap', text: g.cap }) : null
      ]));
    });
    viewport.appendChild(track);
    frame.appendChild(viewport);

    var dotsWrap = el('div', { class: 'glimpse__dots' });
    var dots = items.map(function (_, i) { return el('button', { class: 'glimpse__dot' + (i === 0 ? ' active' : ''), 'aria-label': 'Slide ' + (i + 1), onclick: function () { go(i); } }); });
    dots.forEach(function (d) { dotsWrap.appendChild(d); });

    function update() { track.style.transform = 'translateX(-' + (idx * 100) + '%)'; dots.forEach(function (d, i) { d.classList.toggle('active', i === idx); }); }
    function go(i) { idx = (i + items.length) % items.length; update(); }
    function next() { go(idx + 1); } function prev() { go(idx - 1); }

    if (items.length > 1) {
      frame.appendChild(el('button', { class: 'glimpse__arrow glimpse__arrow--prev', 'aria-label': 'Previous', onclick: prev }, ['‹']));
      frame.appendChild(el('button', { class: 'glimpse__arrow glimpse__arrow--next', 'aria-label': 'Next', onclick: next }, ['›']));
      function start() { stop(); timer = setInterval(next, 5000); }
      function stop() { if (timer) { clearInterval(timer); timer = null; } }
      frame.addEventListener('mouseenter', stop);
      frame.addEventListener('mouseleave', start);
      var x0 = null;
      viewport.addEventListener('touchstart', function (e) { x0 = e.touches[0].clientX; stop(); }, { passive: true });
      viewport.addEventListener('touchend', function (e) { if (x0 == null) return; var dx = e.changedTouches[0].clientX - x0; if (Math.abs(dx) > 40) { dx < 0 ? next() : prev(); } x0 = null; start(); });
      frame.tabIndex = 0;
      frame.addEventListener('keydown', function (e) { if (e.key === 'ArrowRight') next(); else if (e.key === 'ArrowLeft') prev(); });
      start();
    }
    mount.appendChild(frame);
    if (items.length > 1) mount.appendChild(dotsWrap);
    update();
  }

  /* ---------- Render space ------------------------------------------------ */
  var params = new URLSearchParams(location.search);
  var typeId = params.get('type');
  if (!SPACES[typeId]) typeId = 'full-floor';
  var sp = SPACES[typeId];
  var lang = 'en';
  try { lang = localStorage.getItem('arg_lang') || 'en'; } catch (e) {}

  function renderSpace() {
    var L = lang;
    document.title = sp.name[L] + ' — Alrayyan Tower';
    $('#bcName').textContent = sp.name[L];
    $('#flTitle').textContent = sp.name[L];
    $('#flSub').textContent = sp.sub[L];
    $('#flSize').textContent = sp.sizeLbl[L];

    var img = $('#flHeroImg');
    img.src = IMG + sp.banner;
    img.alt = sp.name[L];

    $('#overviewDesc').innerHTML = sp.desc[L];   // trusted constant HTML

    var specs = $('#specs'); specs.textContent = '';
    sp.specs.forEach(function (s) {
      var v = typeof s.v === 'object' ? s.v[L] : s.v;
      var k = typeof s.k === 'object' ? s.k[L] : s.k;
      specs.appendChild(el('div', { class: 'spec' }, [
        el('div', { class: 'spec__k', text: k }),
        el('div', { class: 'spec__v sm', text: v })
      ]));
    });

    var am = $('#amenities'); am.textContent = '';
    AMENITIES[L].forEach(function (a) { am.appendChild(el('div', { class: 'amenity', text: a })); });

    // "Available in" floor pills — links to the matching floor sub-page(s).
    var linksWrap = $('#flFloorLinks');
    if (linksWrap) {
      linksWrap.textContent = '';
      var links = FLOOR_LINKS[typeId] || [];
      if (links.length) {
        linksWrap.appendChild(el('span', { class: 'fl-floor-links__label', text: (I18N[L] && I18N[L].availIn) || 'Available In' }));
        links.forEach(function (lk) {
          linksWrap.appendChild(el('a', { class: 'fl-floor-pill', href: 'floor.html?floor=' + lk.id, text: lk.label[L] }));
        });
      }
    }

    var mix = GLIMPSE_MIX[typeId] || sp.gallery.map(function (f) { return { img: IMG + f, floor: sp.name }; });
    var items = mix.map(function (g) { return { img: g.img, cap: g.floor[L] }; });
    makeGlimpse($('#glimpseSlider'), items);
  }

  /* ---------- Language ---------------------------------------------------- */
  var EN = {};
  function snapshotEN() {
    $$('[data-i18n]').forEach(function (n) { EN[n.getAttribute('data-i18n')] = n.textContent; });
    $$('[data-i18n-ph]').forEach(function (n) { EN[n.getAttribute('data-i18n-ph')] = n.getAttribute('placeholder'); });
  }
  function setLang(l) {
    lang = l;
    var dict = l === 'ar' ? I18N.ar : EN;
    document.documentElement.lang = l;
    document.documentElement.dir = l === 'ar' ? 'rtl' : 'ltr';
    $$('[data-i18n]').forEach(function (n) { var k = n.getAttribute('data-i18n'); if (dict[k]) n.textContent = dict[k]; });
    $$('[data-i18n-ph]').forEach(function (n) { var k = n.getAttribute('data-i18n-ph'); if (dict[k]) n.setAttribute('placeholder', dict[k]); });
    $$('.lang button').forEach(function (b) { b.classList.toggle('active', b.getAttribute('data-lang') === l); });
    try { localStorage.setItem('arg_lang', l); } catch (e) {}
    renderSpace();
  }

  /* ---------- Nav / theme / booking -------------------------------------- */
  function initNav() {
    var nav = $('#nav'), burger = $('#burger'), mobile = $('#navMobile');
    window.addEventListener('scroll', function () {
      var h = document.documentElement;
      $('#progress').style.width = (h.scrollTop / (h.scrollHeight - h.clientHeight) * 100) + '%';
    }, { passive: true });
    burger.addEventListener('click', function () {
      var open = mobile.classList.toggle('open');
      burger.classList.toggle('open', open);
      burger.setAttribute('aria-expanded', String(open));
      nav.classList.toggle('mobile-open', open);
      document.body.style.overflow = open ? 'hidden' : '';
    });
    $$('#navMobile a').forEach(function (a) { a.addEventListener('click', function () { mobile.classList.remove('open'); burger.classList.remove('open'); nav.classList.remove('mobile-open'); document.body.style.overflow = ''; }); });
    $$('.lang button').forEach(function (b) { b.addEventListener('click', function () { setLang(b.getAttribute('data-lang')); }); });
    var tb = $('#themeBtn'); if (tb) tb.addEventListener('click', toggleTheme);
  }
  function toggleTheme() {
    var next = document.documentElement.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', next);
    try { localStorage.setItem('arg_theme', next); } catch (e) {}
  }
  function initTheme() {
    var t = 'dark';
    try { t = localStorage.getItem('arg_theme') || 'dark'; } catch (e) {}
    document.documentElement.setAttribute('data-theme', t);
  }
  function initBooking() {
    var form = $('#bookForm');
    var d = $('#bf-date'); if (d) d.min = new Date().toISOString().split('T')[0];
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!$('#bf-fname').value.trim()) { $('#bf-fname').focus(); return; }
      if (!$('#bf-phone').value.trim()) { $('#bf-phone').focus(); return; }
      var ref = 'ARG-' + Date.now().toString(36).toUpperCase().slice(-6);
      if (window.db) {
        window.db.collection('bookings').add({
          ref: ref,
          visitor_name: ($('#bf-fname').value.trim() + ' ' + $('#bf-lname').value.trim()).trim(),
          phone: $('#bf-phone').value.trim(),
          email: $('#bf-email').value.trim(),
          floor_preference: sp.name.en,
          preferred_date: $('#bf-date').value,
          preferred_time: $('#bf-time').value,
          notes: $('#bf-notes').value.trim(),
          source: 'redesign_space',
          status: 'pending',
          created_at: firebase.firestore.FieldValue.serverTimestamp()
        }).catch(function (e2) { console.warn('[booking] write failed', e2 && e2.code); });
      }
      $('#visitRef').textContent = ref;
      form.style.display = 'none';
      $('#bookSuccess').classList.add('show');
    });
  }

  /* ---------- Boot -------------------------------------------------------- */
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  document.addEventListener('DOMContentLoaded', function () {
    window.scrollTo(0, 0);
    $('#year').textContent = new Date().getFullYear();
    initTheme();
    snapshotEN();
    initNav();
    initBooking();
    setLang(lang);
  });
})();
