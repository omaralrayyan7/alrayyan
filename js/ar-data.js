// Alrayyan data layer — Firestore-backed with an in-memory cache so existing
// synchronous render code in mgmt-panel.html keeps working. Call ArData.init() once
// per page; it sets up onSnapshot listeners that keep the cache fresh.
(function(){
  if (typeof firebase === 'undefined' || !window.db){
    console.error('[ArData] firebase-config.js must load first');
    return;
  }
  const db = window.db;

  const cache = {
    offices: [],
    floors: [],
    floor_details: {},   // keyed by key field
    bookings: [],
    businesses: [],
    lands: [],
    products: [],
    site_content: {},    // keyed by `key` field
    availability: {},    // { 'b1_1000': true, ... }
    pricing: {}          // { 'Full Floor': {price, show} }
  };

  const listeners = {};          // per-collection subscribers
  const initialized = {};        // which collections have first snapshot

  function notify(collection){
    (listeners[collection] || []).forEach(fn => { try{ fn(cache[collection]); }catch(e){console.error(e);} });
  }

  function subscribe(collection, cb){
    if (!listeners[collection]) listeners[collection] = [];
    listeners[collection].push(cb);
    if (initialized[collection]) cb(cache[collection]);
  }

  function onCollection(name, orderField){
    let q = db.collection(name);
    if (orderField) q = q.orderBy(orderField);
    return q.onSnapshot(snap => {
      const rows = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      cache[name] = rows;
      initialized[name] = true;
      notify(name);
    }, err => console.error('[ArData]', name, err));
  }

  function onKeyedCollection(name, docKey){
    // Collections where each doc's id is a natural key (floor_details: '3','4',etc.)
    return db.collection(name).onSnapshot(snap => {
      const map = {};
      snap.docs.forEach(d => { map[d.id] = { id:d.id, ...d.data() }; });
      cache[name] = map;
      initialized[name] = true;
      notify(name);
    }, err => console.error('[ArData]', name, err));
  }

  function onSingleton(docPath, cacheKey){
    // Single doc (availability, pricing, site_content)
    return db.doc(docPath).onSnapshot(doc => {
      cache[cacheKey] = doc.exists ? (doc.data() || {}) : {};
      initialized[cacheKey] = true;
      notify(cacheKey);
    }, err => console.error('[ArData]', docPath, err));
  }

  let started = false;
  function init(){
    if (started) return;
    started = true;
    // NOTE: The public site reads published content from `site_content` and
    // `settings/*` (below). The admin panel persists offices/floors/floor_details/
    // lands/products/etc. into `admin_state/*`, NOT into their own top-level
    // collections. Those collections have no Firestore read rule and are never
    // populated, so subscribing to them only produced `permission-denied`
    // console errors on every public page load. They are intentionally omitted.
    onSingleton('site_content/main', 'site_content');
    onSingleton('settings/availability', 'availability');
    onSingleton('settings/pricing', 'pricing');
  }

  // ── Synchronous getters (from cache) ───────────────────────────────────────
  const get = {
    offices:       () => cache.offices,
    floors:        () => cache.floors,
    floorDetails:  () => cache.floor_details,
    bookings:      () => cache.bookings,
    businesses:    () => cache.businesses,
    lands:         () => cache.lands,
    products:      () => cache.products,
    siteContent:   () => cache.site_content,
    availability:  () => cache.availability,
    pricing:       () => cache.pricing
  };

  // ── Writes ─────────────────────────────────────────────────────────────────
  function setAvailability(state){
    return db.doc('settings/availability').set(state, { merge: false });
  }
  function flipAvailability(key, value){
    const patch = {}; patch[key] = !!value;
    return db.doc('settings/availability').set(patch, { merge: true });
  }
  function setPricing(state){
    return db.doc('settings/pricing').set(state, { merge: false });
  }
  function setSiteContent(obj){
    return db.doc('site_content/main').set(obj, { merge: true });
  }

  function addBooking(data){
    const rec = {
      ...data,
      status: data.status || 'pending',
      created_at: firebase.firestore.FieldValue.serverTimestamp()
    };
    return db.collection('bookings').add(rec);
  }
  function updateBooking(id, patch){ return db.collection('bookings').doc(id).update(patch); }
  function deleteBooking(id){ return db.collection('bookings').doc(id).delete(); }

  function addVisitor(data){
    const rec = { ...data, created_at: firebase.firestore.FieldValue.serverTimestamp() };
    return db.collection('visitors').add(rec);
  }

  // Offices / floors / businesses / lands / products — generic CRUD
  function addDoc(col, data){
    return db.collection(col).add({ ...data, created_at: firebase.firestore.FieldValue.serverTimestamp() });
  }
  function updateDoc(col, id, patch){ return db.collection(col).doc(id).update(patch); }
  function setDoc(col, id, data){ return db.collection(col).doc(id).set(data, { merge: true }); }
  function deleteDoc(col, id){ return db.collection(col).doc(id).delete(); }

  // ── WhatsApp notification for bookings ────────────────────────────────────
  function buildWhatsAppLink(booking){
    const num = (window.ADMIN_WHATSAPP || '').replace(/[^0-9]/g,'');
    const lines = [
      '*New Visit Booking — Alrayyan Group*',
      `Name: ${booking.visitor_name || ''}`,
      `Phone: ${booking.phone || ''}`,
      booking.email ? `Email: ${booking.email}` : null,
      booking.company ? `Company: ${booking.company}` : null,
      `Floor / Office: ${booking.floor_preference || booking.office || '—'}`,
      `Date: ${booking.preferred_date || '—'}  Time: ${booking.preferred_time || 'Any'}`,
      booking.purpose ? `Purpose: ${booking.purpose}` : null,
      booking.notes ? `Notes: ${booking.notes}` : null
    ].filter(Boolean);
    const msg = encodeURIComponent(lines.join('\n'));
    return `https://wa.me/${num}?text=${msg}`;
  }
  function notifyWhatsApp(booking){
    // Disabled: admin is notified via Cloud Function email instead of opening
    // a WhatsApp tab on the visitor's device. Kept as a no-op so existing
    // callers (office-detail / floor-detail / land-detail / index) continue
    // to work without edits. Re-enable here if you want the old behavior.
    return;
  }

  window.ArData = {
    init, subscribe, cache, get,
    setAvailability, flipAvailability, setPricing, setSiteContent,
    addBooking, updateBooking, deleteBooking,
    addVisitor,
    addDoc, updateDoc, setDoc, deleteDoc,
    buildWhatsAppLink, notifyWhatsApp
  };
})();
