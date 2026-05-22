// Firebase app init (compat mode — loaded via CDN scripts in each HTML page).
// Exposes window.db (Firestore) and window.firebaseReady (Promise).
(function(){
  const firebaseConfig = {
    apiKey: "AIzaSyDDeEmpHVZ4HgnH3vJlexHTnvNoNGeu07k",
    authDomain: "alrayyan-group.firebaseapp.com",
    projectId: "alrayyan-group",
    storageBucket: "alrayyan-group.firebasestorage.app",
    messagingSenderId: "514669588220",
    appId: "1:514669588220:web:fd6aa308c0730770b23179",
    measurementId: "G-5ZPZZFLM6H"
  };
  if (typeof firebase === 'undefined'){
    console.error('[alrayyan] Firebase SDK not loaded. Check CDN script tags.');
    return;
  }
  if (!firebase.apps.length){
    firebase.initializeApp(firebaseConfig);
  }
  window.db = firebase.firestore();
  if (typeof firebase.auth === 'function') {
    window.auth = firebase.auth();
  }

  // Admin WhatsApp notification number. Format: full international number without +, dashes, or spaces.
  window.ADMIN_WHATSAPP = '962799880066';
})();
