// firebase-messaging-sw.js — Service Worker فایربیس
// FIX #1: بررسی try-catch برای مقداردهی اولیه
// FIX #2: fallback برای icon

importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-messaging-compat.js');

var firebaseConfig = {
    apiKey: "AIzaSyBMytFNG9rPdBonl1n6NPEBNoM9fgNmQn8",
    authDomain: "tivan-shop.firebaseapp.com",
    projectId: "tivan-shop",
    storageBucket: "tivan-shop.firebasestorage.app",
    messagingSenderId: "267212800801",
    appId: "1:267212800801:web:348c00b2ee4d98d8237460"
};

// FIX #1: جلوگیری از خطای "app already exists"
try {
    firebase.initializeApp(firebaseConfig);
} catch (e) {
    // اگر قبلاً مقداردهی شده، آن را دریافت می‌کنیم
    firebase.app();
}

var messaging = firebase.messaging();

// FIX #2: مدیریت نوتیفیکیشن پس‌زمینه با مدیریت خطای کامل
messaging.onBackgroundMessage(function(payload) {
    console.log('[SW] پیام پس‌زمینه دریافت شد:', payload);

    if (!payload.notification) return;

    var title = payload.notification.title || 'فروشگاه تیوان';
    var options = {
        body: payload.notification.body || '',
        icon: payload.notification.icon || '/logo-192.png',
        badge: '/logo-32.png',
        // FIX #3: data برای مدیریت کلیک روی نوتیفیکیشن
        data: payload.data || {}
    };

    self.registration.showNotification(title, options);
});

// FIX #3: مدیریت کلیک روی نوتیفیکیشن — باز کردن سایت
self.addEventListener('notificationclick', function(event) {
    event.notification.close();
    var url = (event.notification.data && event.notification.data.url) || '/';
    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
            for (var i = 0; i < clientList.length; i++) {
                var client = clientList[i];
                if (client.url === url && 'focus' in client) return client.focus();
            }
            if (clients.openWindow) return clients.openWindow(url);
        })
    );
});
