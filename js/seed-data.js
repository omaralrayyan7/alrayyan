// One-shot Firestore seeder. Run via seed.html or `window.ArSeed.run()` from
// the browser console. Safe to re-run: uses set() with known doc IDs so the
// seed overwrites, not duplicates.
(function(){
  if (typeof firebase === 'undefined' || !window.db){
    console.error('[ArSeed] firebase-config.js must load first');
    return;
  }
  const db = window.db;
  const FV = firebase.firestore.FieldValue;

  // ── Availability (settings/availability) — mirrors admin.html defaults ──
  const AVAILABILITY = {
    'b1_1000': true,
    'g_shop1': true, 'g_shop2': true, 'g_shop3': true, 'g_pharmacy': true,
    '1_80': false, '1_100': false, '1_160': false, '1_240': false, '1_400': false,
    '2_80': false, '2_100': false, '2_160': false, '2_240': false, '2_400': false,
    '3_80': true,  '3_100': false, '3_160': false, '3_240': false, '3_400': false,
    '4_80': false, '4_100': false, '4_160': false, '4_240': false, '4_400': true,
    '5_80': true,  '5_100': false, '5_160': false, '5_240': false, '5_400': false,
    '6_80': false, '6_100': false, '6_160': false, '6_240': false, '6_400': true,
    '7_80': false, '7_100': false, '7_160': false, '7_240': false, '7_400': true,
    '8_80': false, '8_100': false, '8_160': false, '8_240': false, '8_400': false,
    '9-outdoor_240': true,
    '9-indoor_160': true
  };

  // ── Pricing ──
  const PRICING = {
    'Full Floor':                  { price: 'Custom Pricing',          show: true },
    'Small Spaces':                { price: 'From JOD 4,000 / mo',     show: true },
    'Open Space':                  { price: 'From JOD 7,500 / mo',     show: true },
    '9th Floor – Outdoor Terrace': { price: 'Custom Pricing',          show: true },
    '9th Floor – Indoor Space':    { price: 'Custom Pricing',          show: true },
    'Small Shops':                 { price: 'Contact for pricing',     show: true }
  };

  // ── Site content ──
  const SITE_CONTENT = {
    heroTitleEn: 'ALRAYYAN GROUP',
    heroTitleAr: 'مجموعة الريان',
    heroSubEn: 'A legacy of excellence across real estate, fashion, arts and land.',
    heroSubAr: 'إرث من التميز عبر العقارات والأزياء والفنون والأراضي.',
    aboutTitleEn: 'About Alrayyan Group',
    aboutTitleAr: 'عن مجموعة الريان',
    aboutBodyEn: 'Alrayyan Group is a diversified holding company based in Amman, Jordan, operating across premium real estate, luxury fashion, arts, and land investments.',
    aboutBodyAr: 'مجموعة الريان هي شركة قابضة متنوعة مقرها عمان، الأردن، تعمل في العقارات الفاخرة والأزياء الراقية والفنون والاستثمار في الأراضي.',
    phone: '+962 79 988 0066',
    email: 'alrayyantower@gmail.com',
    address: 'Alrayyan Tower, Queen Alia Street, Amman',
    show_pricing: true
  };

  // ── Floors (high-level floor records) ──
  const FLOORS = [
    { id:'b1', name:'B1 Floor',   name_ar:'الطابق B1',   subtitle:'Underground · Exception', subtitle_ar:'تحت الأرض · استثناء', total_size:'1,000 m²', type:'Open Space',   order:1, status:'available' },
    { id:'g',  name:'G Floor',    name_ar:'الطابق الأرضي', subtitle:'Indoor Shops + Outdoor Shop', subtitle_ar:'محلات داخلية + محل خارجي', total_size:'225 m²', type:'Small Shops',  order:2, status:'available' },
    { id:'1',  name:'1st Floor',  name_ar:'الطابق الأول',  subtitle:'Fully Occupied',          subtitle_ar:'مشغول بالكامل',      total_size:'400 m²',   type:'Office',       order:3, status:'occupied' },
    { id:'2',  name:'2nd Floor',  name_ar:'الطابق الثاني', subtitle:'Fully Occupied',          subtitle_ar:'مشغول بالكامل',      total_size:'400 m²',   type:'Office',       order:4, status:'occupied' },
    { id:'3',  name:'3rd Floor',  name_ar:'الطابق الثالث', subtitle:'Mid Level',               subtitle_ar:'طابق متوسط',         total_size:'400 m²',   type:'Office',       order:5, status:'available' },
    { id:'4',  name:'4th Floor',  name_ar:'الطابق الرابع', subtitle:'Full Floor Available',    subtitle_ar:'طابق كامل متاح',     total_size:'400 m²',   type:'Full Floor',   order:6, status:'available' },
    { id:'5',  name:'5th Floor',  name_ar:'الطابق الخامس', subtitle:'Mid Level',               subtitle_ar:'طابق متوسط',         total_size:'400 m²',   type:'Office',       order:7, status:'available' },
    { id:'6',  name:'6th Floor',  name_ar:'الطابق السادس', subtitle:'Full Floor Available',    subtitle_ar:'طابق كامل متاح',     total_size:'400 m²',   type:'Full Floor',   order:8, status:'available' },
    { id:'7',  name:'7th Floor',  name_ar:'الطابق السابع', subtitle:'Full Floor Available',    subtitle_ar:'طابق كامل متاح',     total_size:'400 m²',   type:'Full Floor',   order:9, status:'available' },
    { id:'8',  name:'8th Floor',  name_ar:'الطابق الثامن', subtitle:'Fully Occupied',          subtitle_ar:'مشغول بالكامل',      total_size:'400 m²',   type:'Office',       order:10,status:'occupied' },
    { id:'9-outdoor', name:'9th Floor', name_ar:'الطابق التاسع', subtitle:'Outdoor Terrace · Exception', subtitle_ar:'تراس خارجي · استثناء', total_size:'240 m²', type:'9th Floor – Outdoor Terrace', order:11, status:'available' },
    { id:'9-indoor',  name:'9th Floor', name_ar:'الطابق التاسع', subtitle:'Indoor Space · Exception',    subtitle_ar:'مساحة داخلية · استثناء', total_size:'160 m²', type:'9th Floor – Indoor Space',   order:12, status:'available' }
  ];

  // ── Floor units (child records) ──
  const FLOOR_UNITS = [
    { floor_id:'b1', label:'1,000 m² Full', label_ar:'1,000 م² كامل', size_key:'1000', size:'1,000 m²', status:'available' },
    { floor_id:'g',  label:'25 m² Shop',    label_ar:'محل 25 م²',     size_key:'shop1',   size:'25 m²',  status:'available' },
    { floor_id:'g',  label:'25 m² Shop',    label_ar:'محل 25 م²',     size_key:'shop2',   size:'25 m²',  status:'available' },
    { floor_id:'g',  label:'25 m² Shop',    label_ar:'محل 25 م²',     size_key:'shop3',   size:'25 m²',  status:'available' },
    { floor_id:'g',  label:'Outdoor Shop (6 doors)', label_ar:'محل خارجي (6 أبواب)', size_key:'pharmacy', size:'150 m²', status:'available' }
  ];
  ['1','2','3','4','5','6','7','8'].forEach(f => {
    FLOOR_UNITS.push({ floor_id:f, label:'80 m²',  label_ar:'80 م²',  size_key:'80',  size:'80 m²',  status: AVAILABILITY[f+'_80']?'available':'unavailable' });
    FLOOR_UNITS.push({ floor_id:f, label:'100 m²', label_ar:'100 م²', size_key:'100', size:'100 m²', status: AVAILABILITY[f+'_100']?'available':'unavailable' });
    FLOOR_UNITS.push({ floor_id:f, label:'160 m²', label_ar:'160 م²', size_key:'160', size:'160 m²', status: AVAILABILITY[f+'_160']?'available':'unavailable' });
    FLOOR_UNITS.push({ floor_id:f, label:'240 m²', label_ar:'240 م²', size_key:'240', size:'240 m²', status: AVAILABILITY[f+'_240']?'available':'unavailable' });
    FLOOR_UNITS.push({ floor_id:f, label:'400 m² Full Floor', label_ar:'400 م² طابق كامل', size_key:'400', size:'400 m²', status: AVAILABILITY[f+'_400']?'available':'unavailable' });
  });
  FLOOR_UNITS.push({ floor_id:'9-outdoor', label:'240 m² Outdoor', label_ar:'240 م² خارجي', size_key:'240', size:'240 m²', status:'available' });
  FLOOR_UNITS.push({ floor_id:'9-indoor',  label:'160 m² Indoor',  label_ar:'160 م² داخلي',  size_key:'160', size:'160 m²', status:'available' });

  // ── Floor details (for floor-detail.html) — subset used on the site ──
  const FLOOR_DETAILS = {
    'b1': {key:'b1', titleEn:'B1 Floor', titleAr:'طابق B1', size:'1,000 m²',
      overviewEn:'Expansive basement-level space ideal for storage, logistics, or large-scale operations. Exception floor with full 1,000 m² footprint.',
      overviewAr:'مساحة واسعة في الطابق السفلي مثالية للتخزين أو العمليات الكبرى. طابق استثنائي بمساحة 1000 م² بالكامل.',
      amenitiesEn:['Private entrance','Loading access','24/7 security','HVAC climate control','Dedicated parking'],
      amenitiesAr:['مدخل خاص','وصول للتحميل','أمن على مدار الساعة','تكييف متكامل','موقف مخصص'],
      price:'Custom', status:'available'},
    '3': {key:'3', titleEn:'3rd Floor – 80 m² Unit', titleAr:'الطابق الثالث – وحدة 80 م²', size:'80 m²',
      overviewEn:'Compact executive office on the 3rd floor, the last available unit on this floor.',
      overviewAr:'مكتب تنفيذي مدمج في الطابق الثالث، الوحدة الوحيدة المتاحة.',
      amenitiesEn:['High-speed fiber internet','Reception services','Meeting room access','Coffee & tea service','Cleaning included'],
      amenitiesAr:['إنترنت فائق السرعة','خدمات الاستقبال','الوصول لقاعات الاجتماعات','خدمة القهوة والشاي','التنظيف مشمول'],
      price:'JOD 4,000 / month', status:'low'},
    '4': {key:'4', titleEn:'4th Floor – Full Floor', titleAr:'الطابق الرابع – طابق كامل', size:'400 m²',
      overviewEn:'Entire 4th floor available as a 400 m² full-floor lease — ideal for mid-size enterprises.',
      overviewAr:'الطابق الرابع بالكامل متاح للإيجار كطابق كامل بمساحة 400 م².',
      amenitiesEn:['Full-floor customization','Private elevators access','Executive washrooms','Kitchenette & lounge','Dedicated reception'],
      amenitiesAr:['تخصيص كامل للطابق','وصول المصاعد الخاصة','دورات مياه تنفيذية','مطبخ صغير واستراحة','استقبال مخصص'],
      price:'Custom', status:'available'},
    '5': {key:'5', titleEn:'5th Floor – 80 m² Unit', titleAr:'الطابق الخامس – وحدة 80 م²', size:'80 m²',
      overviewEn:'Bright 80 m² executive unit on the 5th floor.',
      overviewAr:'وحدة تنفيذية مضيئة بمساحة 80 م² في الطابق الخامس.',
      amenitiesEn:['Panoramic windows','High-speed internet','Meeting room access','Premium finishes','Cleaning included'],
      amenitiesAr:['نوافذ بانورامية','إنترنت فائق السرعة','الوصول لقاعات الاجتماعات','تشطيبات فاخرة','التنظيف مشمول'],
      price:'JOD 4,400 / month', status:'available'},
    '6': {key:'6', titleEn:'6th Floor – Full Floor', titleAr:'الطابق السادس – طابق كامل', size:'400 m²',
      overviewEn:'Full 400 m² floor on level 6 — customisable corporate space with elevated views.',
      overviewAr:'طابق كامل 400 م² في المستوى السادس.',
      amenitiesEn:['Full-floor customization','Executive washrooms','Kitchenette & lounge','Dedicated reception','Private meeting rooms'],
      amenitiesAr:['تخصيص كامل للطابق','دورات مياه تنفيذية','مطبخ صغير واستراحة','استقبال مخصص','قاعات اجتماعات خاصة'],
      price:'Custom', status:'available'},
    '7': {key:'7', titleEn:'7th Floor – Full Floor', titleAr:'الطابق السابع – طابق كامل', size:'400 m²',
      overviewEn:'Premium 400 m² full floor on level 7 with commanding city views.',
      overviewAr:'طابق كامل مميز بمساحة 400 م² في المستوى السابع.',
      amenitiesEn:['Panoramic city views','Full customization','Executive office layout','Private washrooms','VIP reception'],
      amenitiesAr:['إطلالات بانورامية','تخصيص كامل','تصميم مكتب تنفيذي','دورات مياه خاصة','استقبال VIP'],
      price:'Custom', status:'available'},
    '9-outdoor': {key:'9-outdoor', titleEn:'9th Floor – Outdoor Space', titleAr:'الطابق التاسع – مساحة خارجية', size:'240 m²',
      overviewEn:'Unique 240 m² outdoor space on the 9th floor.',
      overviewAr:'مساحة خارجية فريدة بمساحة 240 م² في الطابق التاسع.',
      amenitiesEn:['Open rooftop terrace','Panoramic 360° views','Event-ready layout','Utility connections','Private access'],
      amenitiesAr:['تراس سطح مفتوح','إطلالات بانورامية 360°','تصميم جاهز للفعاليات','توصيلات مرافق','وصول خاص'],
      price:'Custom', status:'available'},
    '9-indoor': {key:'9-indoor', titleEn:'9th Floor – Indoor Space', titleAr:'الطابق التاسع – مساحة داخلية', size:'160 m²',
      overviewEn:'Intimate 160 m² indoor space on the 9th floor.',
      overviewAr:'مساحة داخلية مميزة بمساحة 160 م² في الطابق التاسع.',
      amenitiesEn:['Premium finishes','Panoramic windows','Private entrance','Climate control','High-speed internet'],
      amenitiesAr:['تشطيبات راقية','نوافذ بانورامية','مدخل خاص','تحكم بالمناخ','إنترنت فائق السرعة'],
      price:'Custom', status:'available'}
  };

  const OFFICES = [
    {id:'full-floor',   name:'Full Floor',                 price:'Custom Pricing',           avail:3, status:'available', desc:'Entire floor for one tenant. Open layout, maximum space, fully customisable.', size:'400 m²',  order:1},
    {id:'small-spaces', name:'Small Spaces',               price:'From JOD 4,000 / mo',      avail:2, status:'available', desc:'Pre-divided units within a shared floor. 80 m² or 160 m².',                     size:'80–160 m²',order:2},
    {id:'open-space',   name:'Open Space',                 price:'From JOD 7,500 / mo',      avail:1, status:'available', desc:'Large undivided open-plan space — showrooms, events, buildouts.',             size:'1,000 m²',order:3},
    {id:'9th-outdoor',  name:'9th Floor – Outdoor Terrace',price:'Custom Pricing',           avail:1, status:'available', desc:'Rooftop outdoor terrace with panoramic views.',                                 size:'240 m²',  order:4},
    {id:'9th-indoor',   name:'9th Floor – Indoor Space',   price:'Custom Pricing',           avail:1, status:'available', desc:'Premium penthouse-level indoor space.',                                         size:'160 m²',  order:5},
    {id:'small-shops',  name:'Small Shops',                price:'Contact for pricing',      avail:3, status:'available', desc:'3×3 m ground-floor retail units with street-level access.',                    size:'9 m²',    order:6}
  ];

  const BUSINESSES = [
    {id:'fashion', name:'Alrayyan Fashion', url:'fashion.html', description:'Curated luxury fashion — online store and physical boutique.', status:'active'},
    {id:'arts',    name:'Alrayyan Arts',    url:'arts.html',    description:'Gallery and creative studio celebrating Arab and global contemporary art.', status:'active'},
    {id:'lands',   name:'Alrayyan Lands',   url:'land.html',    description:"Premium land plots across Amman's most sought-after districts.", status:'active'}
  ];

  const LANDS = [
    {id:'abdoun-corner',   title:'Abdoun Corner Plot',     location:'Abdoun, Amman',   size:'1,200 m²', price:'JOD 4,800,000', desc:"Prime corner plot in Amman's most prestigious neighbourhood.", image:'', status:'available'},
    {id:'dabouq-hillside', title:'Dabouq Hillside Estate', location:'Dabouq, Amman',   size:'2,500 m²', price:'JOD 6,200,000', desc:'Expansive hillside estate with sweeping views.',                 image:'', status:'available'},
    {id:'sweifieh',        title:'Sweifieh Commercial Plot',location:'Sweifieh, Amman',size:'850 m²',   price:'JOD 3,100,000', desc:'High-visibility commercial plot on a main boulevard.',           image:'', status:'reserved'}
  ];

  const PRODUCTS = [
    {id:'silk-gown',      name:'Silk Evening Gown',   category:'Dresses',    price:'JOD 2,450', stock:8,  desc:'Handcrafted silk evening gown with signature gold embroidery.', image:''},
    {id:'cashmere-coat',  name:'Cashmere Wrap Coat',  category:'Outerwear',  price:'JOD 3,800', stock:5,  desc:'Pure cashmere wrap coat, tailored in Italy.',                   image:''},
    {id:'leather-clutch', name:'Leather Clutch',      category:'Accessories',price:'JOD 980',   stock:15, desc:'Genuine leather clutch with hand-stitched details.',            image:''},
    {id:'pearl-earrings', name:'Pearl Drop Earrings', category:'Jewelry',    price:'JOD 1,250', stock:20, desc:'South Sea pearl drop earrings set in 18K gold.',                 image:''}
  ];

  // ── Admins (client-side auth reference — real auth should be server-side) ──
  const ADMINS = [
    { id:'omar', email:'omaralrayyan7@gmail.com', name:'Omar Alrayyan', role:'owner',
      passHash:'8bb0cf6eb9b17d0f7d22b456f121257dc1254e1f01665370476383ea776df414' }
  ];

  async function run(log){
    const say = log || console.log;
    const batch = [];

    say('Seeding site_content/main…');
    await db.doc('site_content/main').set(SITE_CONTENT);
    say('Seeding settings/availability…');
    await db.doc('settings/availability').set(AVAILABILITY);
    say('Seeding settings/pricing…');
    await db.doc('settings/pricing').set(PRICING);

    say('Seeding floors…');
    for (const f of FLOORS){
      await db.collection('floors').doc(f.id).set(f);
    }

    say('Seeding floor_units…');
    // Wipe old units and reseed with deterministic IDs.
    const oldUnits = await db.collection('floor_units').get();
    const wipe = db.batch();
    oldUnits.docs.forEach(d => wipe.delete(d.ref));
    await wipe.commit();
    for (const u of FLOOR_UNITS){
      const id = `${u.floor_id}_${u.size_key}`;
      await db.collection('floor_units').doc(id).set({ ...u, updated_at: FV.serverTimestamp() });
    }

    say('Seeding floor_details…');
    for (const [key, d] of Object.entries(FLOOR_DETAILS)){
      await db.collection('floor_details').doc(key).set(d);
    }

    say('Seeding offices…');
    for (const o of OFFICES){ await db.collection('offices').doc(o.id).set(o); }

    say('Seeding businesses…');
    for (const b of BUSINESSES){ await db.collection('businesses').doc(b.id).set(b); }

    say('Seeding lands…');
    for (const l of LANDS){ await db.collection('lands').doc(l.id).set(l); }

    say('Seeding products…');
    for (const p of PRODUCTS){ await db.collection('products').doc(p.id).set(p); }

    say('Seeding admins…');
    for (const a of ADMINS){ await db.collection('admins').doc(a.id).set(a); }

    say('✓ Seed complete.');
  }

  window.ArSeed = { run, AVAILABILITY, PRICING, SITE_CONTENT, FLOORS, FLOOR_UNITS, FLOOR_DETAILS, OFFICES, BUSINESSES, LANDS, PRODUCTS, ADMINS };
})();
