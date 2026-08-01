/* ============================================================================
   ALRAYYAN — Floor detail (redesign)
   Data-driven, bilingual (EN/AR), XSS-safe DOM building, responsive slider.
   ========================================================================== */
(function () {
  'use strict';

  var IMG = 'images/';

  /* ---------- safe DOM helper -------------------------------------------- */
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

  /* ---------- Floor content (source of truth) ---------------------------- */
  var FLOORS = {
    'b1': {
      name: { en: 'B1 Floor', ar: 'الطابق B1' },
      sizeLbl: { en: '1,000 m² · Full Floor', ar: '1,000 م² · طابق كامل' },
      desc: {
        en: '<p>The B1 floor is a spacious 1,000 m² underground level, fully licensed for sports-club use. Its large open area also suits a celebration hall or event space for gatherings, corporate meetings and private functions.</p><p>Its generous size and flexible layout make it one of the most versatile spaces in the tower — ready to be configured to match your vision.</p>',
        ar: '<p>طابق B1 مساحة واسعة تحت الأرض بمساحة 1,000 م²، مرخّصة بالكامل لاستخدامها ناديًا رياضيًا. تصلح مساحته المفتوحة أيضًا لقاعة أفراح أو مناسبات وللاجتماعات الخاصة والمؤسسية.</p><p>يجعله حجمه الكبير وتخطيطه المرن أحد أكثر المساحات تنوعًا في البرج — جاهز لتهيئته وفق رؤيتك.</p>'
      },
      specs: [
        { k: { en: 'Size', ar: 'المساحة' }, v: '1,000 m²' },
        { k: { en: 'Capacity', ar: 'السعة' }, v: { en: '120 – 250 persons', ar: '120 – 250 شخصاً' } },
        { k: { en: 'Level', ar: 'المستوى' }, v: { en: 'Basement (B1)', ar: 'القبو (B1)' } },
        { k: { en: 'Lease', ar: 'الإيجار' }, v: { en: 'Annual', ar: 'سنوي' } },
        { k: { en: 'Handover', ar: 'التسليم' }, v: { en: 'Same day', ar: 'نفس اليوم' } },
        { k: { en: 'Status', ar: 'الحالة' }, v: { en: 'Available', ar: 'متاح' } }
      ]
    },
    '1': {
      name: { en: '1st Floor', ar: 'الطابق الأول' },
      sizeLbl: { en: 'Fully Occupied', ar: 'مؤجّر بالكامل' },
      desc: {
        en: '<p>The 1st floor is currently fully leased and not available. Like the tower\'s other office floors, it offers flexible options from 80 m² up to the full 400 m² once a unit is freed up.</p><p>Contact our leasing team to be notified as soon as space opens up on this floor.</p>',
        ar: '<p>الطابق الأول مؤجّر بالكامل حالياً وغير متاح. كباقي طوابق البرج المكتبية، يوفر خيارات مرنة من 80 م² حتى 400 م² كاملة عند توفر وحدة.</p><p>تواصل مع فريق التأجير لدينا لإعلامك فور توفر مساحة في هذا الطابق.</p>'
      },
      specs: [
        { k: { en: 'Size', ar: 'المساحة' }, v: { en: '80 – 400 m²', ar: '80 – 400 م²' } },
        { k: { en: 'Capacity', ar: 'السعة' }, v: { en: '8 – 60 persons', ar: '8 – 60 شخصاً' } },
        { k: { en: 'Level', ar: 'المستوى' }, v: { en: 'Floors 1 – 8', ar: 'الطوابق 1 – 8' } },
        { k: { en: 'Lease', ar: 'الإيجار' }, v: { en: 'Annual', ar: 'سنوي' } },
        { k: { en: 'Handover', ar: 'التسليم' }, v: { en: 'Same day', ar: 'نفس اليوم' } },
        { k: { en: 'Status', ar: 'الحالة' }, v: { en: 'Fully occupied', ar: 'مؤجّر بالكامل' } }
      ]
    },
    '2': {
      name: { en: '2nd Floor', ar: 'الطابق الثاني' },
      sizeLbl: { en: 'Fully Occupied', ar: 'مؤجّر بالكامل' },
      desc: {
        en: '<p>The 2nd floor is currently fully leased and not available. Like the tower\'s other office floors, it offers flexible options from 80 m² up to the full 400 m² once a unit is freed up.</p><p>Contact our leasing team to be notified as soon as space opens up on this floor.</p>',
        ar: '<p>الطابق الثاني مؤجّر بالكامل حالياً وغير متاح. كباقي طوابق البرج المكتبية، يوفر خيارات مرنة من 80 م² حتى 400 م² كاملة عند توفر وحدة.</p><p>تواصل مع فريق التأجير لدينا لإعلامك فور توفر مساحة في هذا الطابق.</p>'
      },
      specs: [
        { k: { en: 'Size', ar: 'المساحة' }, v: { en: '80 – 400 m²', ar: '80 – 400 م²' } },
        { k: { en: 'Capacity', ar: 'السعة' }, v: { en: '8 – 60 persons', ar: '8 – 60 شخصاً' } },
        { k: { en: 'Level', ar: 'المستوى' }, v: { en: 'Floors 1 – 8', ar: 'الطوابق 1 – 8' } },
        { k: { en: 'Lease', ar: 'الإيجار' }, v: { en: 'Annual', ar: 'سنوي' } },
        { k: { en: 'Handover', ar: 'التسليم' }, v: { en: 'Same day', ar: 'نفس اليوم' } },
        { k: { en: 'Status', ar: 'الحالة' }, v: { en: 'Fully occupied', ar: 'مؤجّر بالكامل' } }
      ]
    },
    '3': {
      name: { en: '3rd Floor', ar: 'الطابق الثالث' },
      sizeLbl: { en: '80 m² Unit · 1 Available', ar: 'وحدة 80 م² · 1 متاح' },
      desc: {
        en: '<p>The 3rd floor offers small office spaces with an available 80 m² unit — ideal for small teams or individual businesses wanting a professional workspace without a large footprint.</p><p>A practical, well-located unit: clean, ready, and sized to keep your overheads lean while your business grows.</p>',
        ar: '<p>يوفر الطابق الثالث مساحات مكتبية صغيرة بوحدة متاحة بمساحة 80 م² — مثالية للفرق الصغيرة أو الأعمال الفردية الباحثة عن مساحة مهنية دون التزام بمساحة كبيرة.</p><p>وحدة عملية بموقع مميز: نظيفة وجاهزة، بحجم يُبقي تكاليفك منخفضة بينما تنمو أعمالك.</p>'
      },
      specs: [
        { k: { en: 'Size', ar: 'المساحة' }, v: '80 m²' },
        { k: { en: 'Capacity', ar: 'السعة' }, v: { en: '8 – 10 persons', ar: '8 – 10 أشخاص' } },
        { k: { en: 'Level', ar: 'المستوى' }, v: { en: 'Floors 1 – 8', ar: 'الطوابق 1 – 8' } },
        { k: { en: 'Lease', ar: 'الإيجار' }, v: { en: 'Annual', ar: 'سنوي' } },
        { k: { en: 'Handover', ar: 'التسليم' }, v: { en: 'Same day', ar: 'نفس اليوم' } },
        { k: { en: 'Status', ar: 'الحالة' }, v: { en: 'Last unit', ar: 'آخر وحدة' } }
      ]
    },
    '4': {
      name: { en: '4th Floor', ar: 'الطابق الرابع' },
      sizeLbl: { en: '400 m² · Full Floor', ar: '400 م² · طابق كامل' },
      desc: {
        en: '<p>The 4th floor is a fully open space with flexible options from <strong>80 m² up to the full 400 m²</strong>. Whether a small startup or a growing company, lease exactly the space you need and expand as you grow.</p><p>The open layout gives complete freedom to design and configure — from private offices to collaborative work environments.</p>',
        ar: '<p>الطابق الرابع مساحة مفتوحة بالكامل بخيارات مرنة من <strong>80 م² حتى 400 م² كاملة</strong>. سواء كنت شركة ناشئة أو مؤسسة متنامية، استأجر المساحة التي تحتاجها وتوسّع بحسب نموّك.</p><p>يمنحك التخطيط المفتوح حرية كاملة في التصميم والتهيئة — من مكاتب خاصة إلى بيئات عمل تشاركية.</p>'
      },
      specs: [
        { k: { en: 'Size', ar: 'المساحة' }, v: '400 m²' },
        { k: { en: 'Capacity', ar: 'السعة' }, v: { en: '40 – 60 persons', ar: '40 – 60 شخصاً' } },
        { k: { en: 'Level', ar: 'المستوى' }, v: { en: 'Floors 1 – 8', ar: 'الطوابق 1 – 8' } },
        { k: { en: 'Lease', ar: 'الإيجار' }, v: { en: 'Annual', ar: 'سنوي' } },
        { k: { en: 'Handover', ar: 'التسليم' }, v: { en: 'Same day', ar: 'نفس اليوم' } },
        { k: { en: 'Status', ar: 'الحالة' }, v: { en: 'Available', ar: 'متاح' } }
      ]
    },
    '5': {
      name: { en: '5th Floor', ar: 'الطابق الخامس' },
      sizeLbl: { en: '80 m² Unit · 1 Available', ar: 'وحدة 80 م² · 1 متاح' },
      desc: {
        en: '<p>The 5th floor offers a well-proportioned 80 m² office unit — ideal for small firms, consultancies, or any team that needs room to work comfortably without taking a full floor.</p><p>Well-finished and ready to move in: the right balance of size, quality and value at a mid-level position in the tower.</p>',
        ar: '<p>يوفر الطابق الخامس وحدة مكتبية متناسقة بمساحة 80 م² — مثالية للشركات الصغيرة أو مكاتب الاستشارات أو أي فريق يحتاج مساحة للعمل بارتياح دون استئجار طابق كامل.</p><p>مشطّبة بعناية وجاهزة للانتقال: توازن مثالي بين الحجم والجودة والقيمة في موقع متوسط من البرج.</p>'
      },
      specs: [
        { k: { en: 'Size', ar: 'المساحة' }, v: '80 m²' },
        { k: { en: 'Capacity', ar: 'السعة' }, v: { en: '8 – 12 persons', ar: '8 – 12 شخصاً' } },
        { k: { en: 'Level', ar: 'المستوى' }, v: { en: 'Floors 1 – 8', ar: 'الطوابق 1 – 8' } },
        { k: { en: 'Lease', ar: 'الإيجار' }, v: { en: 'Annual', ar: 'سنوي' } },
        { k: { en: 'Handover', ar: 'التسليم' }, v: { en: 'Same day', ar: 'نفس اليوم' } },
        { k: { en: 'Status', ar: 'الحالة' }, v: { en: 'Available', ar: 'متاح' } }
      ]
    },
    '6': {
      name: { en: '6th Floor', ar: 'الطابق السادس' },
      sizeLbl: { en: '400 m² · Full Floor', ar: '400 م² · طابق كامل' },
      desc: {
        en: '<p>The 6th floor is a fully open space with flexible sizes from <strong>80 m² up to 400 m²</strong>. High-floor positioning brings excellent natural light and wide views, while the adaptable layout lets you configure the space to your exact requirements.</p><p>Whether a single office or a full floor, the 6th floor can be shaped to fit — the right amount of space at the right cost.</p>',
        ar: '<p>الطابق السادس مساحة مفتوحة بالكامل بأحجام مرنة من <strong>80 م² حتى 400 م²</strong>. يوفر الموقع المرتفع إضاءة طبيعية ممتازة وإطلالات واسعة، فيما يتيح التخطيط المرن تهيئة المساحة وفق متطلباتك.</p><p>سواء احتجت مكتبًا واحدًا أو طابقًا كاملاً، يمكن تشكيل الطابق السادس ليناسبك — المساحة المناسبة بالتكلفة المناسبة.</p>'
      },
      specs: [
        { k: { en: 'Size', ar: 'المساحة' }, v: '400 m²' },
        { k: { en: 'Capacity', ar: 'السعة' }, v: { en: '40 – 60 persons', ar: '40 – 60 شخصاً' } },
        { k: { en: 'Level', ar: 'المستوى' }, v: { en: 'Floors 1 – 8', ar: 'الطوابق 1 – 8' } },
        { k: { en: 'Lease', ar: 'الإيجار' }, v: { en: 'Annual', ar: 'سنوي' } },
        { k: { en: 'Handover', ar: 'التسليم' }, v: { en: 'Same day', ar: 'نفس اليوم' } },
        { k: { en: 'Status', ar: 'الحالة' }, v: { en: 'Available', ar: 'متاح' } }
      ]
    },
    '7': {
      name: { en: '7th Floor', ar: 'الطابق السابع' },
      sizeLbl: { en: '400 m² · Full Floor', ar: '400 م² · طابق كامل' },
      desc: {
        en: '<p>The 7th floor offers a premium open space from <strong>80 m² up to the full 400 m²</strong>. Positioned high in the tower, it is ideal for companies seeking a commanding presence with unobstructed views and a fully adaptable layout.</p><p>Take a single office or the entire floor — the open plan gives you full control to design a workspace that reflects your business.</p>',
        ar: '<p>يوفر الطابق السابع مساحة مفتوحة فاخرة من <strong>80 م² حتى 400 م² كاملة</strong>. يقع في الجزء العلوي من البرج، وهو مثالي للشركات الباحثة عن حضور مميز مع إطلالات واسعة وتخطيط قابل للتكيف.</p><p>احجز مكتبًا واحدًا أو الطابق بأكمله — يمنحك التصميم المفتوح حرية كاملة في إنشاء بيئة عمل تعكس هوية مؤسستك.</p>'
      },
      specs: [
        { k: { en: 'Size', ar: 'المساحة' }, v: '400 m²' },
        { k: { en: 'Capacity', ar: 'السعة' }, v: { en: '40 – 60 persons', ar: '40 – 60 شخصاً' } },
        { k: { en: 'Level', ar: 'المستوى' }, v: { en: 'Floors 1 – 8', ar: 'الطوابق 1 – 8' } },
        { k: { en: 'Lease', ar: 'الإيجار' }, v: { en: 'Annual', ar: 'سنوي' } },
        { k: { en: 'Handover', ar: 'التسليم' }, v: { en: 'Same day', ar: 'نفس اليوم' } },
        { k: { en: 'Status', ar: 'الحالة' }, v: { en: 'Available', ar: 'متاح' } }
      ]
    },
    '8': {
      name: { en: '8th Floor', ar: 'الطابق الثامن' },
      sizeLbl: { en: 'Fully Occupied', ar: 'مؤجّر بالكامل' },
      desc: {
        en: '<p>The 8th floor is currently fully leased and not available. Like the tower\'s other office floors, it offers flexible options from 80 m² up to the full 400 m² once a unit is freed up.</p><p>Contact our leasing team to be notified as soon as space opens up on this floor.</p>',
        ar: '<p>الطابق الثامن مؤجّر بالكامل حالياً وغير متاح. كباقي طوابق البرج المكتبية، يوفر خيارات مرنة من 80 م² حتى 400 م² كاملة عند توفر وحدة.</p><p>تواصل مع فريق التأجير لدينا لإعلامك فور توفر مساحة في هذا الطابق.</p>'
      },
      specs: [
        { k: { en: 'Size', ar: 'المساحة' }, v: { en: '80 – 400 m²', ar: '80 – 400 م²' } },
        { k: { en: 'Capacity', ar: 'السعة' }, v: { en: '8 – 60 persons', ar: '8 – 60 شخصاً' } },
        { k: { en: 'Level', ar: 'المستوى' }, v: { en: 'Floors 1 – 8', ar: 'الطوابق 1 – 8' } },
        { k: { en: 'Lease', ar: 'الإيجار' }, v: { en: 'Annual', ar: 'سنوي' } },
        { k: { en: 'Handover', ar: 'التسليم' }, v: { en: 'Same day', ar: 'نفس اليوم' } },
        { k: { en: 'Status', ar: 'الحالة' }, v: { en: 'Fully occupied', ar: 'مؤجّر بالكامل' } }
      ]
    },
    '9-outdoor': {
      name: { en: '9th Floor — Outdoor Terrace', ar: 'الطابق التاسع — التراس الخارجي' },
      sizeLbl: { en: '300 m² · Outdoor Terrace', ar: '300 م² · تراس خارجي' },
      desc: {
        en: '<p>The 9th-floor outdoor terrace is a stunning panoramic space ideal for a rooftop restaurant or coffee house. Sweeping city views and open skies make it the perfect setting for an outdoor dining experience or a signature café concept.</p><p>A rare venue at the top of the tower — one that turns an ordinary visit into something truly memorable.</p>',
        ar: '<p>التراس الخارجي في الطابق التاسع مساحة بانورامية رائعة مثالية لمطعم أو مقهى على السطح. تجعل إطلالاته الواسعة وسماؤه المفتوحة منه الإطار المثالي لتجربة طعام في الهواء الطلق أو مفهوم مقهى مميز.</p><p>مكان استثنائي على قمة البرج — يحوّل الزيارة العادية إلى تجربة لا تُنسى.</p>'
      },
      specs: [
        { k: { en: 'Size', ar: 'المساحة' }, v: '300 m²' },
        { k: { en: 'Capacity', ar: 'السعة' }, v: { en: 'Up to 160 guests', ar: 'حتى 160 ضيفاً' } },
        { k: { en: 'Level', ar: 'المستوى' }, v: { en: '9th (Outdoor)', ar: 'التاسع (خارجي)' } },
        { k: { en: 'Lease', ar: 'الإيجار' }, v: { en: 'Annual', ar: 'سنوي' } },
        { k: { en: 'Handover', ar: 'التسليم' }, v: { en: 'Same day', ar: 'نفس اليوم' } },
        { k: { en: 'Status', ar: 'الحالة' }, v: { en: 'Available', ar: 'متاح' } }
      ]
    },
    '9-indoor': {
      name: { en: '9th Floor — Indoor Space', ar: 'الطابق التاسع — المساحة الداخلية' },
      sizeLbl: { en: '100 m² · Indoor Space', ar: '100 م² · مساحة داخلية' },
      desc: {
        en: '<p>The 9th-floor indoor space is a licensed, climate-controlled area perfectly suited to a restaurant or premium dining concept. Adjacent to the outdoor terrace, it offers high-end finishes for an upscale food-and-beverage operation.</p><p>Run it as a standalone restaurant or pair it with the terrace — this space delivers the quality and ambience a premium concept deserves.</p>',
        ar: '<p>المساحة الداخلية في الطابق التاسع مساحة مرخّصة ومكيّفة مناسبة تمامًا لمطعم أو مفهوم طعام راقٍ. بجوار التراس الخارجي، توفر تشطيبات فاخرة لأي نشاط في مجال الأغذية والمشروبات.</p><p>أدرها مطعمًا مستقلاً أو ادمجها مع التراس — تقدم هذه المساحة الجودة والأجواء التي يستحقها أي مفهوم راقٍ.</p>'
      },
      specs: [
        { k: { en: 'Size', ar: 'المساحة' }, v: '100 m²' },
        { k: { en: 'Capacity', ar: 'السعة' }, v: { en: 'Up to 60 guests', ar: 'حتى 60 ضيفاً' } },
        { k: { en: 'Level', ar: 'المستوى' }, v: { en: '9th (Indoor)', ar: 'التاسع (داخلي)' } },
        { k: { en: 'Lease', ar: 'الإيجار' }, v: { en: 'Annual', ar: 'سنوي' } },
        { k: { en: 'Handover', ar: 'التسليم' }, v: { en: 'Same day', ar: 'نفس اليوم' } },
        { k: { en: 'Status', ar: 'الحالة' }, v: { en: 'Available', ar: 'متاح' } }
      ]
    },
    // Combined 9th-floor entry (outdoor terrace + indoor space) — used by the
    // single merged "Currently Available" row; the Office Rental Solutions
    // cards keep the two 9th-floor types as separate pages (unchanged).
    '9': {
      name: { en: '9th Floor — Outdoor Terrace & Indoor Space', ar: 'الطابق التاسع — التراس الخارجي والمساحة الداخلية' },
      sizeLbl: { en: '400 m² · Outdoor + Indoor', ar: '400 م² · خارجي + داخلي' },
      desc: {
        en: '<p>The 9th floor combines a 300 m² panoramic outdoor terrace with a 100 m² licensed, climate-controlled indoor space — together forming the tower\'s most striking venue. Sweeping city views outside meet high-end, upscale finishes inside.</p><p>Lease the terrace, the indoor space, or both together as one 400 m² destination for a rooftop restaurant, café or premium dining concept.</p>',
        ar: '<p>يجمع الطابق التاسع بين تراس خارجي بانورامي بمساحة 300 م² ومساحة داخلية مرخّصة ومكيّفة بمساحة 100 م² — ليشكّلا معًا أبرز واجهة في البرج. إطلالات المدينة الواسعة في الخارج تلتقي بتشطيبات فاخرة راقية في الداخل.</p><p>استأجر التراس أو المساحة الداخلية أو كليهما معًا كوجهة واحدة بمساحة 400 م² لمطعم أو مقهى أو مفهوم طعام راقٍ على السطح.</p>'
      },
      specs: [
        { k: { en: 'Size', ar: 'المساحة' }, v: { en: '400 m² (300 outdoor + 100 indoor)', ar: '400 م² (300 خارجي + 100 داخلي)' } },
        { k: { en: 'Capacity', ar: 'السعة' }, v: { en: 'Up to 220 guests combined', ar: 'حتى 220 ضيفاً مجتمعين' } },
        { k: { en: 'Level', ar: 'المستوى' }, v: { en: '9th (Outdoor + Indoor)', ar: 'التاسع (خارجي وداخلي)' } },
        { k: { en: 'Lease', ar: 'الإيجار' }, v: { en: 'Annual', ar: 'سنوي' } },
        { k: { en: 'Handover', ar: 'التسليم' }, v: { en: 'Same day', ar: 'نفس اليوم' } },
        { k: { en: 'Status', ar: 'الحالة' }, v: { en: 'Available', ar: 'متاح' } }
      ]
    },
    'g': {
      name: { en: 'Ground Floor — Retail Shops', ar: 'الطابق الأرضي — محلات تجارية' },
      sizeLbl: { en: '3 × 25 m² Shops', ar: '3 × 25 م² محلات' },
      desc: {
        en: '<p>The ground floor hosts commercial shops in a mix of sizes, each with its own street-level entrance and a dedicated reception office anchoring the tower\'s main entrance. Inside and out, the floor offers excellent visibility and direct foot traffic.</p><p>A prime commercial level at the heart of the tower — the right address for any retail or service business looking to make an impression.</p>',
        ar: '<p>يضم الطابق الأرضي محلات تجارية بمساحات متنوعة، لكل منها مدخل مستقل على مستوى الشارع ومكتب استقبال مخصص يشكّل المدخل الرئيسي للبرج. داخليًا وخارجيًا، يوفر الطابق رؤية ممتازة وحركة مرور مباشرة.</p><p>طابق تجاري متميز في قلب البرج — العنوان المناسب لأي نشاط تجاري أو خدمي يريد إحداث انطباع أول لا يُنسى.</p>'
      },
      specs: [
        { k: { en: 'Size', ar: 'المساحة' }, v: { en: '25 m² / shop', ar: '25 م² / محل' } },
        { k: { en: 'Capacity', ar: 'السعة' }, v: { en: '2 – 3 staff', ar: '2 – 3 موظفين' } },
        { k: { en: 'Level', ar: 'المستوى' }, v: { en: 'Ground', ar: 'أرضي' } },
        { k: { en: 'Lease', ar: 'الإيجار' }, v: { en: 'Annual', ar: 'سنوي' } },
        { k: { en: 'Handover', ar: 'التسليم' }, v: { en: 'Same day', ar: 'نفس اليوم' } },
        { k: { en: 'Status', ar: 'الحالة' }, v: { en: 'Available', ar: 'متاح' } }
      ]
    }
  };

  // Image inventory (exact on-disk counts).
  var REAL = { 'b1': 3, '3': 1, '4': 7, '5': 3, '6': 7, '7': 6, '9-outdoor': 6, '9-indoor': 3, 'g': 3 };
  var IMAG = { 'b1': 4, '3': 1, '4': 6, '5': 2, '6': 5, '7': 5, '9-outdoor': 4, '9-indoor': 3, 'g': 3 };
  var LABEL = { 'b1': 'b1-floor', '3': '3rd-floor', '4': '4th-floor', '5': '5th-floor', '6': '6th-floor', '7': '7th-floor', '9-outdoor': '9th-floor-outdoor', '9-indoor': '9th-floor-indoor', 'g': 'g-floor' };
  // Floors whose real photos are NOT named "{id}-real-img-{i}" get an explicit list.
  var REAL_CUSTOM = { 'g': ['g-indoor-real-img-1', 'g-real-img-2', 'g-real-img-3'] };

  var AMENITIES = {
    en: ['Electricity & water connections', 'Fire-safety systems', '24/7 building security', 'Direct elevator access', 'Listed in the building directory', 'Underground parking — 1 spot / 100 m²', 'Emergency exit', 'Private waste-disposal per floor', 'High-speed internet ready'],
    ar: ['توصيلات كهرباء وماء', 'أنظمة سلامة من الحرائق', 'أمن على مدار الساعة', 'وصول مباشر بالمصعد', 'إدراج في دليل المبنى', 'مواقف تحت الأرض — موقف لكل 100 م²', 'مخرج طوارئ', 'وحدة نفايات خاصة لكل طابق', 'إنترنت عالي السرعة جاهز']
  };

  /* ---------- i18n (static labels) --------------------------------------- */
  var I18N = {
    ar: {
      navAbout: 'من نحن', navSpaces: 'المساحات', navAvail: 'المتاح', navVentures: 'أعمالنا', navContact: 'اتصل بنا',
      backToFloors: '← كل الطوابق', bcHome: 'الرئيسية', bcAvail: 'الطوابق المتاحة', heroEye: 'تفاصيل الطابق',
      ovEye: 'نظرة عامة', ovTitleA: 'عن هذه', ovTitleB: 'المساحة',
      glEye: 'داخل الطابق', glTitle: 'لمحة من الداخل',
      rnEye: 'تصوّر', rnTitleA: 'صور', rnTitleB: 'تخيلية للطابق',
      amEye: 'ما هو مشمول', amTitleA: 'المرافق', amTitleB: 'والميزات',
      fuEye: 'الموقع', fuTitleA: 'ابحث', fuTitleB: 'عنا',
      locAddr: 'برج الريان، شارع الملكة علياء، عمّان', locGo: 'انقر للفتح في خرائط جوجل →',
      bkHead: 'اطلب زيارة', bkSub: 'يؤكّد فريقنا خلال 24 ساعة',
      lblFirst: 'الاسم الأول *', lblLast: 'اسم العائلة', lblPhone: 'الهاتف / واتساب *', lblEmail: 'البريد *',
      lblDate: 'التاريخ المفضّل', lblTime: 'الوقت المفضّل', lblNotes: 'ملاحظات', phNotes: 'أي أسئلة أو متطلبات…',
      btnConfirm: 'تأكيد الزيارة →', bkNote: 'مجاناً · بدون التزام · سبت–خميس 9ص–6م',
      sxTitle: 'تم طلب الزيارة!', sxBody: 'سيتصل بك فريقنا خلال 24 ساعة لتأكيد موعدك.',
      qcCall: 'اتصل', qcWA: 'واتساب', qcIG: 'إنستغرام'
    }
  };

  /* ---------- Responsive slider factory ---------------------------------- */
  // Builds a fully responsive slider: arrows, dots, thumbnails, autoplay
  // (pause on hover), touch-swipe and keyboard. Track is forced LTR so it
  // slides correctly even on RTL pages.
  function makeSlider(mount, images, opts) {
    opts = opts || {};
    mount.textContent = '';
    if (!images.length) {
      mount.appendChild(el('div', { class: 'slider' }, [
        el('div', { class: 'slider__viewport' }, [
          el('div', { class: 'slider__track' }, [
            el('div', { class: 'slider__slide' }, [el('div', { class: 'ph', text: opts.emptyText || 'Images coming soon' })])
          ])
        ])
      ]));
      return;
    }

    var idx = 0, timer = null;
    var slider = el('div', { class: 'slider' });
    var viewport = el('div', { class: 'slider__viewport' });
    var track = el('div', { class: 'slider__track' });
    images.forEach(function (src, i) {
      track.appendChild(el('div', { class: 'slider__slide' }, [
        el('img', { src: src, alt: (opts.alt || 'Photo') + ' ' + (i + 1), loading: i === 0 ? 'eager' : 'lazy', decoding: 'async' })
      ]));
    });
    viewport.appendChild(track);
    slider.appendChild(viewport);

    var counter = el('div', { class: 'slider__counter' });
    slider.appendChild(counter);

    var dotsWrap = el('div', { class: 'slider__dots' });
    var dots = images.map(function (_, i) {
      return el('button', { class: 'slider__dot' + (i === 0 ? ' active' : ''), 'aria-label': 'Slide ' + (i + 1), onclick: function () { go(i); } });
    });
    dots.forEach(function (d) { dotsWrap.appendChild(d); });

    var thumbsWrap = el('div', { class: 'slider__thumbs' });
    var thumbs = images.map(function (src, i) {
      return el('button', { class: 'slider__thumb' + (i === 0 ? ' active' : ''), onclick: function () { go(i); } }, [
        el('img', { src: src, alt: '', loading: 'lazy' })
      ]);
    });
    thumbs.forEach(function (t) { thumbsWrap.appendChild(t); });

    // No scrollIntoView here — it previously yanked the whole page's scroll
    // position to keep the thumbnail strip in view, which felt like an
    // unwanted jump. The strip has its own horizontal overflow scroll, so
    // visitors can scrub it manually; clicking a thumb only updates state.
    function update() {
      track.style.transform = 'translateX(-' + (idx * 100) + '%)';
      counter.textContent = (idx + 1) + ' / ' + images.length;
      dots.forEach(function (d, i) { d.classList.toggle('active', i === idx); });
      thumbs.forEach(function (t, i) { t.classList.toggle('active', i === idx); });
    }
    function go(i) { idx = (i + images.length) % images.length; update(); }
    function next() { go(idx + 1); }
    function prev() { go(idx - 1); }

    if (images.length > 1) {
      slider.appendChild(el('button', { class: 'slider__arrow slider__arrow--prev', 'aria-label': 'Previous', onclick: prev }, ['‹']));
      slider.appendChild(el('button', { class: 'slider__arrow slider__arrow--next', 'aria-label': 'Next', onclick: next }, ['›']));
      slider.appendChild(dotsWrap);
      if (images.length > 2) slider.appendChild(thumbsWrap);

      // autoplay
      function start() { stop(); timer = setInterval(next, 5500); }
      function stop() { if (timer) { clearInterval(timer); timer = null; } }
      slider.addEventListener('mouseenter', stop);
      slider.addEventListener('mouseleave', start);
      start();

      // touch swipe
      var x0 = null;
      viewport.addEventListener('touchstart', function (e) { x0 = e.touches[0].clientX; stop(); }, { passive: true });
      viewport.addEventListener('touchend', function (e) {
        if (x0 == null) return;
        var dx = e.changedTouches[0].clientX - x0;
        if (Math.abs(dx) > 40) { dx < 0 ? next() : prev(); }
        x0 = null; start();
      });
      // keyboard
      slider.tabIndex = 0;
      slider.addEventListener('keydown', function (e) {
        if (e.key === 'ArrowRight') { next(); } else if (e.key === 'ArrowLeft') { prev(); }
      });
    }

    mount.appendChild(slider);
    update();
  }

  /* ---------- Full-width cinematic "glimpse" slider ---------------------- */
  // Caption overlay + dots + subtle arrows, autoplay/swipe/keyboard. LTR track.
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

  /* ---------- Render floor ----------------------------------------------- */
  var params = new URLSearchParams(location.search);
  var floorId = params.get('floor');
  if (!FLOORS[floorId]) floorId = 'b1';
  var fl = FLOORS[floorId];
  var lang = 'en';
  try { lang = localStorage.getItem('arg_lang') || 'en'; } catch (e) {}

  // Combined 9th floor has no folder of its own — its photos live under
  // floor-9-outdoor/ and floor-9-indoor/, so it pulls from both.
  function subFloorRealImages(id) {
    var base = IMG + 'floors/floor-' + id + '/real/';
    if (REAL_CUSTOM[id]) return REAL_CUSTOM[id].map(function (n) { return base + n + '.webp'; });
    var out = [], n = REAL[id] || 0;
    for (var i = 1; i <= n; i++) out.push(base + id + '-real-img-' + i + '.webp');
    return out;
  }
  function subFloorImagImages(id) {
    var out = [], n = IMAG[id] || 0, label = LABEL[id];
    for (var i = 1; i <= n; i++) out.push(IMG + 'floors/floor-' + id + '/imaginary/' + label + '-imaginary-img-' + i + '.webp');
    return out;
  }
  function realImages() {
    if (floorId === '9') return subFloorRealImages('9-outdoor').concat(subFloorRealImages('9-indoor'));
    return subFloorRealImages(floorId);
  }
  function imagImages() {
    if (floorId === '9') return subFloorImagImages('9-outdoor').concat(subFloorImagImages('9-indoor'));
    return subFloorImagImages(floorId);
  }

  function renderFloor() {
    var L = lang;
    document.title = fl.name[L] + ' — Alrayyan Tower';
    $('#bcName').textContent = fl.name[L];
    $('#flTitle').textContent = fl.name[L];
    $('#flSize').textContent = fl.sizeLbl[L];

    // hero banner (combined 9th floor reuses the outdoor terrace banner —
    // there is no dedicated combined-floor banner image on disk)
    var bannerFloorId = floorId === '9' ? '9-outdoor' : floorId;
    var img = $('#flHeroImg');
    img.src = IMG + 'floors/floor-' + bannerFloorId + '/banner/' + LABEL[bannerFloorId] + '-banner.webp';
    img.alt = fl.name[L];

    // overview (trusted constant HTML — our own copy)
    $('#overviewDesc').innerHTML = fl.desc[L];

    // specs (safe)
    var specs = $('#specs'); specs.textContent = '';
    fl.specs.forEach(function (s) {
      var v = typeof s.v === 'object' ? s.v[L] : s.v;
      var k = typeof s.k === 'object' ? s.k[L] : s.k;
      specs.appendChild(el('div', { class: 'spec' }, [
        el('div', { class: 'spec__k', text: k }),
        el('div', { class: 'spec__v sm', text: v })
      ]));
    });

    // amenities (safe)
    var am = $('#amenities'); am.textContent = '';
    AMENITIES[L].forEach(function (a) { am.appendChild(el('div', { class: 'amenity', text: a })); });

    // sliders
    var real = realImages(), imag = imagImages();
    var realItems = real.map(function (src) { return { img: src, cap: fl.name[L] }; });
    makeGlimpse($('#glimpseSlider'), realItems);
    if (imag.length) { $('#rendersBlock').style.display = ''; makeSlider($('#rendersSlider'), imag, { alt: fl.name.en + ' concept' }); }
    else { $('#rendersBlock').style.display = 'none'; }
    if (!real.length) $('#glimpseBlock').style.display = 'none'; else $('#glimpseBlock').style.display = '';
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
    renderFloor();
  }

  /* ---------- Nav + booking ---------------------------------------------- */
  function initNav() {
    var nav = $('#nav'), burger = $('#burger'), mobile = $('#navMobile');
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
      var bfEmail = $('#bf-email').value.trim();
      if (!$('#bf-fname').value.trim()) { $('#bf-fname').focus(); return; }
      if (!$('#bf-phone').value.trim()) { $('#bf-phone').focus(); return; }
      if (!bfEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(bfEmail)) { $('#bf-email').focus(); return; }
      var ref = 'ARG-' + Date.now().toString(36).toUpperCase().slice(-6);
      // Admin panel renders these with textContent (XSS-safe) — see js/admin.js.
      if (window.db) {
        window.db.collection('bookings').add({
          ref: ref,
          visitor_name: ($('#bf-fname').value.trim() + ' ' + $('#bf-lname').value.trim()).trim(),
          phone: $('#bf-phone').value.trim(),
          email: bfEmail,
          floor_preference: fl.name.en,
          preferred_date: $('#bf-date').value,
          preferred_time: $('#bf-time').value,
          notes: $('#bf-notes').value.trim(),
          source: 'redesign_floor',
          status: 'pending',
          created_at: firebase.firestore.FieldValue.serverTimestamp()
        }).catch(function (e2) { console.warn('[booking] write failed', e2 && e2.code); });
      }
      $('#visitRef').textContent = ref;                 // safe
      form.style.display = 'none';
      $('#bookSuccess').classList.add('show');
    });
  }

  /* ---------- Floor status (admin can take a whole floor offline) --------- */
  // A floor page is only reachable if it actually has something to book.
  // Unlike the homepage's "Fully Occupied" listing, Floor Status 'active'
  // does NOT force this page open on a floor with nothing available — only
  // 'inactive' is an override, blocking the page even if a size is on.
  // Combined 9th floor page is reachable as long as either its outdoor or
  // indoor half still has an available size.
  // `availLoaded` is false when settings/availability has never been seeded —
  // in that case we don't know real occupancy, so fail open instead of
  // treating "no data" the same as "everything off".
  function floorActive(fs, avail, availLoaded, id) {
    if (fs['floor_' + id] === 'inactive') return false;
    if (id === '9') return floorActive(fs, avail, availLoaded, '9-outdoor') || floorActive(fs, avail, availLoaded, '9-indoor');
    if (!availLoaded) return true;
    var prefix = id + '_';
    return Object.keys(avail).some(function (k) { return k.indexOf(prefix) === 0 && avail[k]; });
  }
  // Someone can always type ?floor=3 directly, bypassing the availability
  // list/space pills — so this page must independently refuse to render a
  // floor the admin disabled, not just rely on being unlinked elsewhere.
  function checkFloorStatus(cb) {
    if (!window.db) { cb(); return; }
    Promise.all([
      window.db.doc('settings/floor_status').get(),
      window.db.doc('settings/availability').get()
    ]).then(function (docs) {
      var fs = docs[0].exists ? (docs[0].data() || {}) : {};
      var avail = docs[1].exists ? (docs[1].data() || {}) : {};
      var availLoaded = docs[1].exists;
      if (!floorActive(fs, avail, availLoaded, floorId)) { window.location.replace('/'); return; }
      cb();
    }).catch(function () { cb(); }); // offline/error: fail open rather than blank the page
  }

  /* ---------- Boot -------------------------------------------------------- */
  // Every floor link is a fresh navigation (?floor=<id> query param), so the
  // page must always land at the top rather than restore a prior scroll
  // position from history/bfcache.
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  document.addEventListener('DOMContentLoaded', function () {
    window.scrollTo(0, 0);
    $('#year').textContent = new Date().getFullYear();
    initTheme();
    snapshotEN();
    checkFloorStatus(function () {
      initNav();
      initBooking();
      setLang(lang);   // also calls renderFloor()
    });
  });
})();
