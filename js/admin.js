/* ============================================================================
   ALRAYYAN — Admin panel (redesign)
   Firebase Auth + Firestore. All user-supplied values rendered via textContent
   (XSS-safe). Bilingual EN/AR, dark/light theme, live bookings + cookie logs.
   ========================================================================== */
(function () {
  'use strict';

  /* ---------- safe DOM helper -------------------------------------------- */
  function el(tag, props, kids) {
    var n = document.createElement(tag);
    if (props) for (var k in props) {
      if (k === 'class') n.className = props[k];
      else if (k === 'text') n.textContent = props[k];      // XSS-safe
      else if (k.slice(0, 2) === 'on' && typeof props[k] === 'function') n.addEventListener(k.slice(2), props[k]);
      else if (props[k] != null) n.setAttribute(k, props[k]);
    }
    (kids || []).forEach(function (c) { if (c != null) n.appendChild(typeof c === 'string' ? document.createTextNode(c) : c); });
    return n;
  }
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  /* ---------- i18n -------------------------------------------------------- */
  var I18N = {
    en: {
      loginSub: 'Sign in to manage bookings & content', lblEmail: 'Email', lblPass: 'Password', signIn: 'Sign In →',
      viewSite: '← View public site', viewSite2: 'View Site', signOut: 'Sign Out',
      navDash: 'Dashboard', navBookings: 'Bookings', navCookies: 'Cookie Logs', navAvail: 'Availability', navBiz: 'Businesses',
      kpiPending: 'Pending Bookings', kpiUnits: 'Available Units', kpiCookies: 'Cookie Acceptances', kpiTotal: 'Total Bookings',
      recentBookings: 'Recent Bookings', bookingsTitle: 'Visit Booking Requests', fAll: 'All statuses',
      cookiesTitle: 'Cookie Consent Log', cookiesSub: 'Every consent decision made on the public site — accepted, rejected or customized. Records are never overwritten.',
      availTitle: 'Availability Toggles', availSub: 'Switch each unit on/off, or take a whole floor offline. Changes publish to the public site.',
      floorStatus: 'Floor Status', floorOffNote: 'Floor is off — hidden from availability, space pages and its own page.',
      floorForcedNote: 'Forced visible on the homepage only — every unit size is off, so it still won’t appear as bookable on space pages or its own page.',
      floorModeAuto: 'Auto', floorModeForced: 'Forced on', floorModeOff: 'Off',
      bizTitle: 'Alrayyan Businesses', bizSub: 'Enable or disable a venture — disabled businesses are hidden from the public site.',
      colWhen: 'When', colRef: 'Ref', colName: 'Name', colEmail: 'Email', colPhone: 'Phone', colSpace: 'Space', colDate: 'Date',
      colStatus: 'Status', colActions: 'Actions', colLang: 'Lang', colDevice: 'Device', colBrowser: 'Browser', colPath: 'Path',
      colBiz: 'Business', colBizStatus: 'Status',
      colConsentId: 'Consent ID', colVisitorUuid: 'Visitor UUID', colCategories: 'Categories', colOS: 'OS', colPolicyVer: 'Policy Ver.',
      kpiCkVisitors: 'Total Visitors', kpiCkAccepted: 'Accepted', kpiCkRejected: 'Rejected', kpiCkCustomized: 'Customized', kpiCkRate: 'Acceptance Rate',
      statusAccepted: 'Accepted', statusRejected: 'Rejected', statusCustomized: 'Customized',
      fAllVersions: 'All policy versions', exportCsv: 'Export CSV', exportExcel: 'Export Excel', exportJson: 'Export JSON',
      prevPage: '← Prev', nextPage: 'Next →',
      noBookings: 'No bookings yet.', noCookies: 'No cookie consent records yet.',
      accept: 'Accept', reject: 'Decline', reset: 'Reset', del: 'Delete', enable: 'Enable', disable: 'Disable',
      active: 'Active', inactive: 'Disabled'
    },
    ar: {
      loginSub: 'سجّل الدخول لإدارة الحجوزات والمحتوى', lblEmail: 'البريد الإلكتروني', lblPass: 'كلمة المرور', signIn: 'تسجيل الدخول →',
      viewSite: '← عرض الموقع', viewSite2: 'عرض الموقع', signOut: 'تسجيل الخروج',
      navDash: 'لوحة التحكم', navBookings: 'الحجوزات', navCookies: 'سجل الكوكيز', navAvail: 'التوفر', navBiz: 'الأعمال',
      kpiPending: 'حجوزات معلقة', kpiUnits: 'وحدات متاحة', kpiCookies: 'موافقات الكوكيز', kpiTotal: 'إجمالي الحجوزات',
      recentBookings: 'أحدث الحجوزات', bookingsTitle: 'طلبات حجز الزيارة', fAll: 'كل الحالات',
      cookiesTitle: 'سجل موافقات الكوكيز', cookiesSub: 'كل قرار موافقة على الموقع العام — قبول أو رفض أو تخصيص. لا يُعاد كتابة السجلات أبداً.',
      availTitle: 'مفاتيح التوفر', availSub: 'فعّل أو أوقف كل وحدة، أو أوقف الطابق بأكمله. تُنشر التغييرات على الموقع العام.',
      floorStatus: 'حالة الطابق', floorOffNote: 'الطابق متوقف — مخفي من التوفر وصفحات المساحات وصفحته الخاصة.',
      floorForcedNote: 'ظاهر إجبارياً في الصفحة الرئيسية فقط — كل الوحدات متوقفة، لذلك لن يظهر كوحدة قابلة للحجز في صفحات المساحات أو صفحته الخاصة.',
      floorModeAuto: 'تلقائي', floorModeForced: 'مفعّل إجبارياً', floorModeOff: 'متوقف',
      bizTitle: 'أعمال الريان', bizSub: 'فعّل أو عطّل أي عمل — الأعمال المعطّلة تُخفى عن الموقع العام.',
      colWhen: 'الوقت', colRef: 'المرجع', colName: 'الاسم', colEmail: 'البريد', colPhone: 'الهاتف', colSpace: 'المساحة', colDate: 'التاريخ',
      colStatus: 'الحالة', colActions: 'إجراءات', colLang: 'اللغة', colDevice: 'الجهاز', colBrowser: 'المتصفح', colPath: 'المسار',
      colBiz: 'العمل', colBizStatus: 'الحالة',
      colConsentId: 'رقم الموافقة', colVisitorUuid: 'معرّف الزائر', colCategories: 'الفئات', colOS: 'نظام التشغيل', colPolicyVer: 'إصدار السياسة',
      kpiCkVisitors: 'إجمالي الزوار', kpiCkAccepted: 'قبلوا', kpiCkRejected: 'رفضوا', kpiCkCustomized: 'خصّصوا', kpiCkRate: 'نسبة القبول',
      statusAccepted: 'مقبول', statusRejected: 'مرفوض', statusCustomized: 'مخصّص',
      fAllVersions: 'كل إصدارات السياسة', exportCsv: 'تصدير CSV', exportExcel: 'تصدير Excel', exportJson: 'تصدير JSON',
      prevPage: '→ السابق', nextPage: 'التالي ←',
      noBookings: 'لا توجد حجوزات بعد.', noCookies: 'لا توجد سجلات موافقة بعد.',
      accept: 'قبول', reject: 'رفض', reset: 'إعادة', del: 'حذف', enable: 'تفعيل', disable: 'تعطيل',
      active: 'مفعّل', inactive: 'معطّل'
    }
  };
  var lang = 'en';
  try { lang = localStorage.getItem('arg_lang') || 'en'; } catch (e) {}
  function t(k) { return (I18N[lang] && I18N[lang][k]) || I18N.en[k] || k; }

  function applyLang() {
    var dict = I18N[lang];
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    $$('[data-i18n]').forEach(function (n) { var k = n.getAttribute('data-i18n'); if (dict[k]) n.textContent = dict[k]; });
    $$('.lang button').forEach(function (b) { b.classList.toggle('active', b.getAttribute('data-lang') === lang); });
    render();
  }

  /* ---------- theme ------------------------------------------------------- */
  function initTheme() { var th = 'dark'; try { th = localStorage.getItem('arg_theme') || 'dark'; } catch (e) {} document.documentElement.setAttribute('data-theme', th); }
  function toggleTheme() { var nx = document.documentElement.getAttribute('data-theme') === 'light' ? 'dark' : 'light'; document.documentElement.setAttribute('data-theme', nx); try { localStorage.setItem('arg_theme', nx); } catch (e) {} }

  /* ---------- toast ------------------------------------------------------- */
  var toastT = null;
  function toast(msg, err) {
    var box = $('#admToast'); box.textContent = msg; box.className = 'adm-toast show' + (err ? ' err' : '');
    clearTimeout(toastT); toastT = setTimeout(function () { box.className = 'adm-toast'; }, 3200);
  }

  /* ---------- Availability model (mirrors public site) ------------------- */
  var AVAIL_FLOORS = [
    { id: 'b1', label: 'B1 Floor', sub: 'Underground · Exception', sizes: [{ k: '1000', label: '1,000 m² Full' }] },
    { id: 'g', label: 'G Floor', sub: 'Retail Shops', sizes: [{ k: 'shop1', label: 'Shop 1 (25 m²)' }, { k: 'shop2', label: 'Shop 2 (25 m²)' }, { k: 'shop3', label: 'Shop 3 (25 m²)' }] },
    { id: '1', label: '1st Floor', sub: 'Office · Fully occupied', sizes: [{ k: '80', label: '80 m²' }, { k: '160', label: '160 m²' }, { k: '240', label: '240 m²' }, { k: '400', label: '400 m² Full' }] },
    { id: '2', label: '2nd Floor', sub: 'Office · Fully occupied', sizes: [{ k: '80', label: '80 m²' }, { k: '160', label: '160 m²' }, { k: '240', label: '240 m²' }, { k: '400', label: '400 m² Full' }] },
    { id: '3', label: '3rd Floor', sub: 'Office', sizes: [{ k: '80', label: '80 m²' }, { k: '160', label: '160 m²' }, { k: '240', label: '240 m²' }, { k: '400', label: '400 m² Full' }] },
    { id: '4', label: '4th Floor', sub: 'Office', sizes: [{ k: '80', label: '80 m²' }, { k: '160', label: '160 m²' }, { k: '240', label: '240 m²' }, { k: '400', label: '400 m² Full' }] },
    { id: '5', label: '5th Floor', sub: 'Office', sizes: [{ k: '80', label: '80 m²' }, { k: '160', label: '160 m²' }, { k: '240', label: '240 m²' }, { k: '400', label: '400 m² Full' }] },
    { id: '6', label: '6th Floor', sub: 'Office', sizes: [{ k: '80', label: '80 m²' }, { k: '160', label: '160 m²' }, { k: '240', label: '240 m²' }, { k: '400', label: '400 m² Full' }] },
    { id: '7', label: '7th Floor', sub: 'Office', sizes: [{ k: '80', label: '80 m²' }, { k: '160', label: '160 m²' }, { k: '240', label: '240 m²' }, { k: '400', label: '400 m² Full' }] },
    { id: '8', label: '8th Floor', sub: 'Office · Fully occupied', sizes: [{ k: '80', label: '80 m²' }, { k: '160', label: '160 m²' }, { k: '240', label: '240 m²' }, { k: '400', label: '400 m² Full' }] },
    { id: '9-outdoor', label: '9th Floor', sub: 'Outdoor Terrace', sizes: [{ k: '240', label: '240 m² Outdoor' }] },
    { id: '9-indoor', label: '9th Floor', sub: 'Indoor Space', sizes: [{ k: '160', label: '160 m² Indoor' }] }
  ];

  // Businesses — id/order matches the public redesign's VENTURES array and
  // the original site's admin (Fashion=1, Arts=2, Lands=3) so the
  // settings/biz_status keys stay compatible either way.
  var BIZ = [
    { id: 1, name: 'Alrayyan Fashion' },
    { id: 2, name: 'Alrayyan Arts' },
    { id: 3, name: 'Alrayyan Lands' }
  ];

  /* ---------- state ------------------------------------------------------- */
  var bookings = [], cookies = [], availability = {}, bizStatus = {}, floorStatus = {};
  var bkStatus = '', bkName = '';
  var ckStatus = '', ckVersion = '', ckSearch = '', ckPage = 1;
  var CK_PAGE_SIZE = 20;
  var current = 'dashboard';
  var unsub = [];

  /* ---------- Auth -------------------------------------------------------- */
  function initAuth() {
    var auth = window.auth || (window.firebase && firebase.auth ? firebase.auth() : null);
    if (!auth) { setTimeout(initAuth, 200); return; }

    $('#loginForm').addEventListener('submit', function (e) {
      e.preventDefault();
      var email = $('#loginEmail').value.trim(), pass = $('#loginPass').value;
      $('#loginError').textContent = '';
      if (!email || !pass) return;
      auth.signInWithEmailAndPassword(email, pass).catch(function (err) {
        $('#loginPass').value = '';
        var code = err && err.code;
        $('#loginError').textContent = (code === 'auth/wrong-password' || code === 'auth/user-not-found' || code === 'auth/invalid-credential')
          ? 'Invalid credentials. Please try again.' : (err && err.message) || 'Sign-in failed.';
      });
    });
    $('#logoutBtn').addEventListener('click', function () { auth.signOut(); });

    auth.onAuthStateChanged(function (user) {
      if (user) { showAdmin(user); } else { showLogin(); }
    });
  }
  function showLogin() {
    unsub.forEach(function (u) { try { u(); } catch (e) {} }); unsub = [];
    $('#adminScreen').hidden = true; $('#loginScreen').style.display = '';
  }
  function showAdmin(user) {
    $('#loginScreen').style.display = 'none'; $('#adminScreen').hidden = false;
    $('#admUser').textContent = (user.email || 'admin').split('@')[0];
    subscribe();
  }

  /* ---------- Firestore listeners ---------------------------------------- */
  function subscribe() {
    if (!window.db) { setTimeout(subscribe, 200); return; }
    unsub.push(window.db.collection('bookings').orderBy('created_at', 'desc').limit(100)
      .onSnapshot(function (s) { bookings = s.docs.map(function (d) { return Object.assign({ id: d.id }, d.data()); }); render(); },
        function (e) { console.warn('[bookings]', e && e.code); }));
    // Cookie logs — try ordered, fall back to unordered if index missing.
    startCookies(true);
    unsub.push(window.db.doc('settings/availability')
      .onSnapshot(function (d) { availability = d.exists ? (d.data() || {}) : {}; render(); },
        function (e) { console.warn('[availability]', e && e.code); }));
    unsub.push(window.db.doc('settings/biz_status')
      .onSnapshot(function (d) { bizStatus = d.exists ? (d.data() || {}) : {}; render(); },
        function (e) { console.warn('[biz_status]', e && e.code); }));
    unsub.push(window.db.doc('settings/floor_status')
      .onSnapshot(function (d) { floorStatus = d.exists ? (d.data() || {}) : {}; render(); },
        function (e) { console.warn('[floor_status]', e && e.code); }));
  }
  function startCookies(ordered) {
    var q = window.db.collection('cookie_acceptances').limit(300);
    if (ordered) q = q.orderBy('accepted_at', 'desc');
    var u = q.onSnapshot(function (s) {
      cookies = s.docs.map(function (d) { return Object.assign({ id: d.id }, d.data()); });
      cookies.sort(function (a, b) { return ts(b.accepted_at) - ts(a.accepted_at); });
      render();
    }, function (e) {
      if (ordered) { startCookies(false); } else { console.warn('[cookies]', e && e.code); }
    });
    unsub.push(u);
  }
  function ts(v) { return v && v.toMillis ? v.toMillis() : 0; }
  function fmtTs(v) { if (!v || !v.toDate) return '—'; var d = v.toDate(); return d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); }

  /* ---------- Actions ----------------------------------------------------- */
  function setStatus(id, status) {
    if (status === 'confirmed' && !confirm('Accept this visit? A confirmation email will be sent to the visitor.')) return;
    if (status === 'rejected' && !confirm('Decline this visit request?')) return;
    window.db.collection('bookings').doc(String(id)).update({
      status: status, status_changed_at: firebase.firestore.FieldValue.serverTimestamp(), status_changed_by: 'admin'
    }).then(function () { toast('Booking ' + status + ' — email queued'); })
      .catch(function (e) { toast('Update failed', true); console.warn(e); });
  }
  function delBooking(id) {
    if (!confirm('Delete this booking permanently?')) return;
    window.db.collection('bookings').doc(String(id)).delete()
      .then(function () { toast('Booking deleted'); }).catch(function () { toast('Delete failed', true); });
  }
  function flipAvail(key, on) {
    var patch = {}; patch[key] = on;
    window.db.doc('settings/availability').set(patch, { merge: true })
      .then(function () { toast('Availability updated'); }).catch(function () { toast('Update failed', true); });
  }
  // Three real states, cycled by each click: unset ("Auto" — homepage
  // listing follows real per-size occupancy) -> 'active' (forced to list
  // on the homepage even fully occupied) -> 'inactive' (hidden everywhere)
  // -> back to unset. Kept as three distinct states, not a plain on/off,
  // because "auto" and "forced on" look identical on the public site right
  // up until a floor sells out — that ambiguity is what caused floors 1/2/8
  // to silently stay hidden while floor 3 didn't.
  function nextFloorState(cur) { return cur === undefined ? 'active' : (cur === 'active' ? 'inactive' : undefined); }
  function toggleFloor(id) {
    var key = 'floor_' + id;
    var next = nextFloorState(floorStatus[key]);
    var patch = {}; patch[key] = next === undefined ? firebase.firestore.FieldValue.delete() : next;
    window.db.doc('settings/floor_status').set(patch, { merge: true })
      .then(function () { toast('Floor status: ' + (next || 'auto')); })
      .catch(function () { toast('Update failed', true); });
  }
  function toggleBiz(id) {
    var key = 'biz_status_' + id;
    var next = bizStatus[key] === 'active' ? 'inactive' : 'active';
    var patch = {}; patch[key] = next;
    window.db.doc('settings/biz_status').set(patch, { merge: true })
      .then(function () { toast('Business ' + next); }).catch(function () { toast('Update failed', true); });
  }

  /* ---------- Render ------------------------------------------------------ */
  function render() {
    if ($('#adminScreen').hidden) return;
    renderKpis(); renderDash(); renderBookings(); renderCookies(); renderAvail(); renderBiz(); renderBadges();
  }
  function availCount() { var n = 0; Object.keys(availability).forEach(function (k) { if (availability[k]) n++; }); return n; }
  function renderKpis() {
    var pending = bookings.filter(function (b) { return (b.status || 'pending') === 'pending'; }).length;
    $('#kpiPending').textContent = pending;
    $('#kpiUnits').textContent = availCount();
    $('#kpiCookies').textContent = cookies.length;
    $('#kpiTotal').textContent = bookings.length;
  }
  function renderBadges() {
    var pending = bookings.filter(function (b) { return (b.status || 'pending') === 'pending'; }).length;
    var bp = $('#badgePending'); bp.textContent = pending; bp.hidden = !pending;
    var bc = $('#badgeCookies'); bc.textContent = cookies.length; bc.hidden = !cookies.length;
  }
  function headRow(keys) { return el('tr', {}, keys.map(function (k) { return el('th', { text: t(k) }); })); }
  function statusCell(s) { s = s || 'pending'; return el('td', {}, [el('span', { class: 'adm-status ' + s, text: s })]); }

  function renderDash() {
    var tbl = $('#dashTable'); tbl.textContent = '';
    tbl.appendChild(el('thead', {}, [headRow(['colRef', 'colName', 'colPhone', 'colSpace', 'colDate', 'colStatus'])]));
    var rows = bookings.slice(0, 6);
    var body = el('tbody');
    if (!rows.length) { body.appendChild(el('tr', {}, [el('td', { class: 'adm-empty', colspan: '6', text: t('noBookings') })])); }
    rows.forEach(function (b) {
      body.appendChild(el('tr', {}, [
        el('td', { class: 'ref', text: b.ref || '—' }),
        el('td', { class: 'em', text: b.visitor_name || b.name || '—' }),
        el('td', { class: 'muted', text: b.phone || '—' }),
        el('td', { class: 'muted', text: b.floor_preference || b.office || '—' }),
        el('td', { class: 'muted', text: b.preferred_date || '—' }),
        statusCell(b.status)
      ]));
    });
    tbl.appendChild(body);
  }

  function renderBookings() {
    var list = bookings.slice();
    if (bkStatus) list = list.filter(function (b) { return (b.status || 'pending') === bkStatus; });
    if (bkName) list = list.filter(function (b) { return ((b.visitor_name || b.name || '') + ' ' + (b.company || '')).toLowerCase().indexOf(bkName) > -1; });
    var tbl = $('#bookingsTable'); tbl.textContent = '';
    tbl.appendChild(el('thead', {}, [headRow(['colRef', 'colName', 'colEmail', 'colPhone', 'colSpace', 'colDate', 'colStatus', 'colActions'])]));
    var body = el('tbody');
    if (!list.length) { body.appendChild(el('tr', {}, [el('td', { class: 'adm-empty', colspan: '8', text: t('noBookings') })])); tbl.appendChild(body); return; }
    list.forEach(function (b) {
      var status = b.status || 'pending';
      var acts = [];
      if (status === 'pending') {
        acts.push(el('button', { class: 'ok', text: t('accept'), onclick: function () { setStatus(b.id, 'confirmed'); } }));
        acts.push(el('button', { class: 'no', text: t('reject'), onclick: function () { setStatus(b.id, 'rejected'); } }));
      } else {
        acts.push(el('button', { text: t('reset'), onclick: function () { setStatus(b.id, 'pending'); } }));
      }
      acts.push(el('button', { class: 'no', text: t('del'), onclick: function () { delBooking(b.id); } }));
      body.appendChild(el('tr', {}, [
        el('td', { class: 'ref', text: b.ref || '—' }),
        el('td', { class: 'em', text: b.visitor_name || b.name || '—' }),
        el('td', { class: 'muted', text: b.email || '—' }),
        el('td', { class: 'muted', text: b.phone || '—' }),
        el('td', { class: 'muted', text: b.floor_preference || b.office || '—' }),
        el('td', { class: 'muted', text: (b.preferred_date || '—') + (b.preferred_time ? ' · ' + b.preferred_time : '') }),
        statusCell(status),
        el('td', {}, [el('div', { class: 'adm-act' }, acts)])
      ]));
    });
    tbl.appendChild(body);
  }

  // Legacy pre-categories docs have no `status` field at all — they were
  // written by the old accept-only banner, so treat them as 'accepted'.
  function ckStatusOf(c) { return c.status || 'accepted'; }
  function ckVersionOf(c) { return c.policy_version || '—'; }

  function filteredCookies() {
    var list = cookies;
    if (ckStatus) list = list.filter(function (c) { return ckStatusOf(c) === ckStatus; });
    if (ckVersion) list = list.filter(function (c) { return ckVersionOf(c) === ckVersion; });
    if (ckSearch) list = list.filter(function (c) {
      return ((c.visitor_id || '') + ' ' + (c.id || '')).toLowerCase().indexOf(ckSearch) > -1;
    });
    return list;
  }

  function renderCookieStats() {
    var total = cookies.length;
    var visitors = {}; cookies.forEach(function (c) { if (c.visitor_id) visitors[c.visitor_id] = true; });
    var accepted = cookies.filter(function (c) { return ckStatusOf(c) === 'accepted'; }).length;
    var rejected = cookies.filter(function (c) { return ckStatusOf(c) === 'rejected'; }).length;
    var customized = cookies.filter(function (c) { return ckStatusOf(c) === 'customized'; }).length;
    var rate = total ? Math.round((accepted / total) * 100) : 0;
    if ($('#ckTotalVisitors')) $('#ckTotalVisitors').textContent = Object.keys(visitors).length;
    if ($('#ckAccepted')) $('#ckAccepted').textContent = accepted;
    if ($('#ckRejected')) $('#ckRejected').textContent = rejected;
    if ($('#ckCustomized')) $('#ckCustomized').textContent = customized;
    if ($('#ckRate')) $('#ckRate').textContent = rate + '%';
  }

  // Version filter options are built from whatever versions actually appear
  // in the data — no versions to hardcode/maintain by hand.
  function renderCookieVersionOptions() {
    var sel = $('#ckFilterVersion'); if (!sel) return;
    var versions = {}; cookies.forEach(function (c) { if (c.policy_version) versions[c.policy_version] = true; });
    var current = sel.value;
    sel.textContent = '';
    sel.appendChild(el('option', { value: '', text: t('fAllVersions') }));
    Object.keys(versions).sort().forEach(function (v) { sel.appendChild(el('option', { value: v, text: v })); });
    sel.value = versions[current] ? current : '';
  }

  function categoryChips(c) {
    var cats = c.categories || {};
    var defs = [['necessary', 'N'], ['analytics', 'A'], ['marketing', 'M'], ['preferences', 'P']];
    return el('div', { class: 'adm-cats' }, defs.map(function (d) {
      var on = d[0] === 'necessary' ? true : !!cats[d[0]];
      return el('span', { class: 'adm-cat-chip' + (on ? ' on' : ''), title: d[0], text: d[1] });
    }));
  }

  function renderCookies() {
    renderCookieVersionOptions();
    renderCookieStats();

    var list = filteredCookies();
    var pageCount = Math.max(1, Math.ceil(list.length / CK_PAGE_SIZE));
    if (ckPage > pageCount) ckPage = pageCount;
    var pageItems = list.slice((ckPage - 1) * CK_PAGE_SIZE, ckPage * CK_PAGE_SIZE);

    var tbl = $('#cookiesTable'); tbl.textContent = '';
    tbl.appendChild(el('thead', {}, [headRow(['colWhen', 'colConsentId', 'colVisitorUuid', 'colStatus', 'colCategories', 'colDevice', 'colBrowser', 'colOS', 'colPolicyVer'])]));
    var body = el('tbody');
    if (!list.length) { body.appendChild(el('tr', {}, [el('td', { class: 'adm-empty', colspan: '9', text: t('noCookies') })])); tbl.appendChild(body); renderCookiePagination(0, 1); return; }
    pageItems.forEach(function (c) {
      var status = ckStatusOf(c);
      body.appendChild(el('tr', {}, [
        el('td', { class: 'muted', text: fmtTs(c.accepted_at) }),
        el('td', { class: 'ref', text: (c.id || '').slice(0, 10) }),
        el('td', { class: 'ref', text: (c.visitor_id || '—').slice(0, 18) }),
        el('td', {}, [el('span', { class: 'adm-status ' + status, text: t('status' + status.charAt(0).toUpperCase() + status.slice(1)) })]),
        el('td', {}, [categoryChips(c)]),
        el('td', { class: 'muted', text: c.device || '—' }),
        el('td', { class: 'muted', text: c.browser || '—' }),
        el('td', { class: 'muted', text: c.os || '—' }),
        el('td', { class: 'muted', text: ckVersionOf(c) })
      ]));
    });
    tbl.appendChild(body);
    renderCookiePagination(list.length, pageCount);
  }

  function renderCookiePagination(total, pageCount) {
    var box = $('#ckPagination'); if (!box) return;
    box.textContent = '';
    if (!total) return;
    var prev = el('button', { text: t('prevPage'), onclick: function () { if (ckPage > 1) { ckPage--; renderCookies(); } } });
    prev.disabled = ckPage <= 1;
    var next = el('button', { text: t('nextPage'), onclick: function () { if (ckPage < pageCount) { ckPage++; renderCookies(); } } });
    next.disabled = ckPage >= pageCount;
    box.appendChild(prev);
    box.appendChild(el('span', { text: ckPage + ' / ' + pageCount + ' (' + total + ')' }));
    box.appendChild(next);
  }

  /* ---------- Cookie consent export --------------------------------------- */
  function ckExportRows() {
    return filteredCookies().map(function (c) {
      var cats = c.categories || {};
      return {
        consent_id: c.id || '', visitor_uuid: c.visitor_id || '', status: ckStatusOf(c),
        analytics: !!cats.analytics, marketing: !!cats.marketing, preferences: !!cats.preferences,
        policy_version: ckVersionOf(c), device: c.device || '', browser: c.browser || '', os: c.os || '',
        lang: c.lang || '', referrer: c.referrer || '', path: c.path || '', url: c.url || '',
        user_agent: c.user_agent || '', timestamp: fmtTs(c.accepted_at)
      };
    });
  }
  function csvCell(v) {
    var s = String(v == null ? '' : v);
    return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  }
  function downloadBlob(content, mime, filename) {
    var blob = new Blob([content], { type: mime });
    var url = URL.createObjectURL(blob);
    var a = el('a', { href: url, download: filename });
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  }
  function exportCookiesCsv() {
    var rows = ckExportRows(); if (!rows.length) { toast('Nothing to export', true); return; }
    var cols = Object.keys(rows[0]);
    var lines = [cols.join(',')].concat(rows.map(function (r) { return cols.map(function (k) { return csvCell(r[k]); }).join(','); }));
    downloadBlob('﻿' + lines.join('\r\n'), 'text/csv;charset=utf-8;', 'cookie-consent-log.csv');
  }
  function exportCookiesExcel() {
    // Dependency-free "Excel" export: a real HTML <table> served with the
    // Excel MIME type. Excel opens this natively as a worksheet — no xlsx
    // library needed for a static-site admin panel.
    var rows = ckExportRows(); if (!rows.length) { toast('Nothing to export', true); return; }
    var cols = Object.keys(rows[0]);
    var head = '<tr>' + cols.map(function (k) { return '<th>' + k + '</th>'; }).join('') + '</tr>';
    var body = rows.map(function (r) {
      return '<tr>' + cols.map(function (k) {
        var v = String(r[k] == null ? '' : r[k]).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        return '<td>' + v + '</td>';
      }).join('') + '</tr>';
    }).join('');
    var html = '<html><head><meta charset="UTF-8"></head><body><table>' + head + body + '</table></body></html>';
    downloadBlob(html, 'application/vnd.ms-excel;charset=utf-8;', 'cookie-consent-log.xls');
  }
  function exportCookiesJson() {
    var rows = ckExportRows(); if (!rows.length) { toast('Nothing to export', true); return; }
    downloadBlob(JSON.stringify(rows, null, 2), 'application/json;charset=utf-8;', 'cookie-consent-log.json');
  }

  function renderAvail() {
    var grid = $('#availGrid'); grid.textContent = '';
    AVAIL_FLOORS.forEach(function (fl) {
      var override = floorStatus['floor_' + fl.id]; // 'active' | 'inactive' | undefined ("auto")
      var floorOn = override !== 'inactive';
      // Click cycles auto -> forced on -> off -> auto; the live Firestore
      // listener re-renders with the real state, so this doesn't guess.
      var modeCls = override === 'active' ? 'forced' : (override === 'inactive' ? 'off' : 'auto');
      var modeLbl = override === 'active' ? t('floorModeForced') : (override === 'inactive' ? t('floorModeOff') : t('floorModeAuto'));
      var floorSw = el('button', { class: 'adm-switch' + (floorOn ? ' on' : ''), 'aria-label': t('floorStatus') + ' — ' + fl.label + ' (' + modeLbl + ')' });
      floorSw.addEventListener('click', function () { toggleFloor(fl.id); });
      var floorToggle = el('div', { class: 'adm-toggle adm-toggle--master' }, [
        el('span', { class: 'adm-toggle__l', text: t('floorStatus') }),
        el('span', { class: 'adm-status floor-' + modeCls, text: modeLbl }),
        floorSw
      ]);

      var anySizeOn = false;
      var toggles = fl.sizes.map(function (sz) {
        var key = fl.id + '_' + sz.k, on = !!availability[key];
        if (on) anySizeOn = true;
        var sw = el('button', { class: 'adm-switch' + (on ? ' on' : ''), 'aria-label': sz.label });
        sw.addEventListener('click', function () { var now = !sw.classList.contains('on'); sw.classList.toggle('on', now); flipAvail(key, now); });
        return el('div', { class: 'adm-toggle' }, [el('span', { class: 'adm-toggle__l', text: sz.label }), sw]);
      });
      var card = el('div', { class: 'adm-avail__card' + (floorOn ? '' : ' adm-avail__card--off') }, [
        el('div', { class: 'adm-avail__name', text: fl.label }),
        el('div', { class: 'adm-avail__sub', text: fl.sub }),
        floorToggle
      ].concat(toggles));
      if (!floorOn) card.appendChild(el('div', { class: 'adm-avail__note', text: t('floorOffNote') }));
      else if (override === 'active' && !anySizeOn) card.appendChild(el('div', { class: 'adm-avail__note', text: t('floorForcedNote') }));
      grid.appendChild(card);
    });
  }

  function renderBiz() {
    var tbl = $('#bizTable'); if (!tbl) return;
    tbl.textContent = '';
    tbl.appendChild(el('thead', {}, [headRow(['colBiz', 'colBizStatus', 'colActions'])]));
    var body = el('tbody');
    BIZ.forEach(function (b) {
      var status = bizStatus['biz_status_' + b.id] === 'inactive' ? 'inactive' : 'active';
      body.appendChild(el('tr', {}, [
        el('td', { class: 'em', text: b.name }),
        el('td', {}, [el('span', { class: 'adm-status ' + (status === 'active' ? 'confirmed' : 'rejected'), text: t(status) })]),
        el('td', {}, [el('div', { class: 'adm-act' }, [
          el('button', { class: status === 'active' ? 'no' : 'ok', text: t(status === 'active' ? 'disable' : 'enable'), onclick: function () { toggleBiz(b.id); } })
        ])])
      ]));
    });
    tbl.appendChild(body);
  }

  /* ---------- Navigation -------------------------------------------------- */
  function showPanel(name) {
    current = name;
    $$('.adm-panel').forEach(function (p) { p.classList.toggle('active', p.id === 'panel-' + name); });
    $$('.adm-nav__item[data-panel]').forEach(function (n) { n.classList.toggle('active', n.getAttribute('data-panel') === name); });
    var titleKey = { dashboard: 'navDash', bookings: 'navBookings', cookies: 'navCookies', availability: 'navAvail', businesses: 'navBiz' }[name];
    $('#admTitle').textContent = t(titleKey);
    closeSidebar();
  }
  function openSidebar() { $('#admSidebar').classList.add('open'); $('#admScrim').classList.add('show'); }
  function closeSidebar() { $('#admSidebar').classList.remove('open'); $('#admScrim').classList.remove('show'); }

  /* ---------- Boot -------------------------------------------------------- */
  document.addEventListener('DOMContentLoaded', function () {
    initTheme();
    applyLang();
    initAuth();

    $('#themeBtn').addEventListener('click', toggleTheme);
    $$('.lang button').forEach(function (b) { b.addEventListener('click', function () { lang = b.getAttribute('data-lang'); try { localStorage.setItem('arg_lang', lang); } catch (e) {} applyLang(); showPanel(current); }); });
    $$('.adm-nav__item[data-panel]').forEach(function (n) { n.addEventListener('click', function () { showPanel(n.getAttribute('data-panel')); }); });
    $('#admHamb').addEventListener('click', openSidebar);
    $('#admScrim').addEventListener('click', closeSidebar);
    $('#bkFilterStatus').addEventListener('change', function () { bkStatus = this.value; renderBookings(); });
    $('#bkFilterName').addEventListener('input', function () { bkName = this.value.toLowerCase().trim(); renderBookings(); });
    $('#ckFilterStatus').addEventListener('change', function () { ckStatus = this.value; ckPage = 1; renderCookies(); });
    $('#ckFilterVersion').addEventListener('change', function () { ckVersion = this.value; ckPage = 1; renderCookies(); });
    $('#ckSearch').addEventListener('input', function () { ckSearch = this.value.toLowerCase().trim(); ckPage = 1; renderCookies(); });
    $('#ckExportCsv').addEventListener('click', exportCookiesCsv);
    $('#ckExportExcel').addEventListener('click', exportCookiesExcel);
    $('#ckExportJson').addEventListener('click', exportCookiesJson);
  });
})();
