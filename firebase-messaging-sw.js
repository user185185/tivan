// firebase-messaging-sw.js — Service Worker اختصاصی فروشگاه تیوان

// ====================================================================
// ترفند هوشمندانه: شنود پیام در سطح شبکه برای تزریق آیکون و حذف نوتیفیکیشن تکراری
// ====================================================================
self.addEventListener('push', function(event) {
    if (!event.data) return;

    try {
        var payload = event.data.json();
        console.log('[SW Native] پیام خام دریافت شد:', payload);

        var title = '';
        var body = '';
        var imageUrl = '';
        var customData = {};

        // استخراج اطلاعات نوتیفیکیشن بر اساس ساختارهای مختلف فایربیس
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

        // اگر پیامی از پنل فایربیس آمده باشد که عنوان یا متن دارد
        if (title || body) {
            // مهم‌ترین خط: جلوی فایربیس را می‌گیریم تا نسخه بدون لوگو را خودکار نشان ندهد و دوتایی نشود
            event.stopImmediatePropagation();

            var options = {
                body: body || '',
                icon: '/logo-192.png', // اجبار کردن نمایش لوگوی تیوان
                badge: '/logo-32.png', // آیکون کوچک نوار وضعیت گوشی‌ها
                data: customData,
                vibrate: [100, 50, 100]
            };

            // اگر در پنل فایربیس عکس بزرگ (Notification image) ست کرده بودید
            if (imageUrl) {
                options.image = imageUrl;
            }

            event.waitUntil(
                self.registration.showNotification(title || 'فروشگاه تیوان', options)
            );
        }
    } catch (e) {
        console.error('[SW Native] خطا در پردازش و تزریق آیکون:', e);
    }
});

// ====================================================================
// لود کردن کتابخانه‌های استاندارد فایربیس
// ====================================================================
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

// این بخش کماکان برای پیام‌های فقط دیتا (Data-only) که در آینده ممکن است از بک‌اِند بفرستید فعال می‌ماند
messaging.onBackgroundMessage(function(payload) {
    console.log('[SW Firebase] پیام پس‌زمینه دریافت شد (فقط دیتای خالص):', payload);
});

// ====================================================================
// مدیریت هوشمند کلیک روی نوتیفیکیشن و باز کردن سایت
// ====================================================================
self.addEventListener('notificationclick', function(event) {
    event.notification.close();
    
    var url = '/'; // آدرس پیش‌فرض صفحه اصلی سایت
    
    // پیدا کردن لینک مقصد (اگر در بخش Custom data پنل کلید url یا link گذاشته باشید)
    if (event.notification.data) {
        if (event.notification.data.url) {
            url = event.notification.data.url;
        } else if (event.notification.data.link) {
            url = event.notification.data.link;
        }
    }
    
    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
            // اگر تب سایت از قبل باز است، روی همان فوکوس کن
            for (var i = 0; i < clientList.length; i++) {
                var client = clientList[i];
                if (client.url === url && 'focus' in client) return client.focus();
            }
            // در غیر این صورت یک تب جدید باز کن
            if (clients.openWindow) return clients.openWindow(url);
        })
    );
});
