// بارگذاری کتابخانه‌های مورد نیاز فایربیس در پس‌زمینه
importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-messaging-compat.js');

// کدهای تنظیمات شما که در مرحله اول از فایربیس گرفتید
const firebaseConfig = {
  apiKey: "AIzaSyBMytFNG9rPdBonl1n6NPEBNoM9fgNmQn8",
  authDomain: "tivan-shop.firebaseapp.com",
  projectId: "tivan-shop",
  storageBucket: "tivan-shop.firebasestorage.app",
  messagingSenderId: "267212800801",
  appId: "1:267212800801:web:348c00b2ee4d98d8237460"
};

// مقداردهی اولیه فایربیس در پس‌زمینه
firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();

// مدیریت نمایش نوتیفیکیشن هنگام بسته بودن برنامه
messaging.onBackgroundMessage((payload) => {
  console.log('پیام در پس‌زمینه دریافت شد: ', payload);
  
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: payload.notification.icon || '/logo-192.png', // آیکونی که قبلا ساختید
    badge: '/logo-32.png' // آیکون کوچک نوار وضعیت اندروید
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
