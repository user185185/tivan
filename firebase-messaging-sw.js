// firebase-messaging-sw.js — نسخه کاملاً بهینه‌شده فروشگاه تیوان

// ۱. مجبور کردن مرورگر به فعال‌سازی فوری و بدون معطلی نسخه جدید
self.addEventListener('install', function(event) {
    self.skipWaiting(); // سرویس‌ورکر قبلی را فوراً متوقف می‌کند
});

self.addEventListener('activate', function(event) {
    event.waitUntil(clients.claim()); // کنترل تمام تب‌ها را فوراً به دست می‌گیرد
});

// ۲. شنود و قاپیدن پیام در شبکه قبل از فعال شدن خودکار فایربیس
self.addEventListener('push', function(event) {
    if (!event.data) return;

    try {
        var payload = event.data.json();
        console.log('[SW Native] پیام دریافت شد:', payload);

        var title = '';
        var body = '';
        var imageUrl = '';
        var customData = {};

        // استخراج اطلاعات نوتیفیکیشن از ساختارهای مختلف فایربیس
        if (payload.notification) {
            title = payload.notification.title;
            body = payload.notification.body;
            imageUrl = payload.notification.image || '';
            customData = payload.data || {};
        } else if (payload.data && payload.data.FCM_MSG) {
            var fcmMsg = typeof payload.data.FCM_MSG === 'string' ? JSON.parse(payload.data.FCM_MSG) : payload.data.FCM_MSG;
            if (fcmMsg.notification) {
                title = fcmMsg.notification.title;
                body = fcmMsg.notification.body;
                imageUrl = fcmMsg.notification.image || '';
                customData = fcmMsg.data || {};
            }
        }

        if (title || body) {
            // جلوگیری از اجرای کد داخلی فایربیس برای حذف نوتیفیکیشن تکراری (بدون لوگو)
            event.stopImmediatePropagation();

            var options = {
                body: body || '',
                icon: '/logo-192.png', // تزریق قطعی لوگوی تیوان
                badge: '/logo-32.png', // آیکون کوچک نوار وضعیت
                data: customData,
                vibrate: [100, 50, 100]
            };

            if (imageUrl) {
                options.image = imageUrl;
            }

            event.waitUntil(
                self.registration.showNotification(title || 'فروشگاه تیوان', options)
            );
        }
    } catch (e) {
        console.error('[SW] خطا در پردازش پیام:', e);
    }
});

// ۳. لود کردن کتابخانه‌های فایربیس برای حفظ ارتباط فرانت‌اند
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

try {
    firebase.initializeApp(firebaseConfig);
} catch (e) {
    firebase.app();
}

var messaging = firebase.messaging();

messaging.onBackgroundMessage(function(payload) {
    // این بخش برای مسیج‌های دیتای خالص رزرو می‌ماند
});

// ۴. مدیریت کلیک روی نوتیفیکیشن
self.addEventListener('notificationclick', function(event) {
    event.notification.close();
    var url = '/';
    
    if (event.notification.data) {
        if (event.notification.data.url) {
            url = event.notification.data.url;
        } else if (event.notification.data.link) {
            url = event.notification.data.link;
        }
    }
    
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
