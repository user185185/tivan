// ارسال گزارش کلیک‌ها به گوگل آنالیتیکس
document.addEventListener('DOMContentLoaded', function() {
    
    // تابع کمکی برای ارسال ایمن اطلاعات
    function trackEvent(eventName) {
        if (typeof gtag === 'function') {
            gtag('event', eventName);
            console.log('گزارش کلیک ثبت شد: ' + eventName);
        }
    }

    // ۱. کلیک روی شماره تماس‌ها (برای تمامی شعب)
    const phoneLinks = document.querySelectorAll('.phone-link');
    phoneLinks.forEach(link => {
        link.addEventListener('click', () => trackEvent('phone_click'));
    });

    // ۲. کلیک روی مسیریابی‌ها (برای تمامی شعب)
    const mapTriggers = document.querySelectorAll('.open-map-trigger');
    mapTriggers.forEach(trigger => {
        trigger.addEventListener('click', () => trackEvent('location_click'));
    });

    // ۳. کلیک روی اینستاگرام
    const instaLink = document.querySelector('.instagram-link');
    if (instaLink) instaLink.addEventListener('click', () => trackEvent('insta_click'));

    // ۴. کلیک روی دکمه باشگاه مشتریان
    const clubBtn = document.getElementById('openClubBtn');
    if (clubBtn) clubBtn.addEventListener('click', () => trackEvent('club_click'));

    // ۵. کلیک روی دکمه فرم همکاری
    const coopBtn = document.getElementById('openCoopBtn');
    if (coopBtn) coopBtn.addEventListener('click', () => trackEvent('form_open'));

    // ۶. کلیک روی دکمه گالری تصاویر
    const galleryBtn = document.getElementById('openGalleryBtn');
    if (galleryBtn) galleryBtn.addEventListener('click', () => trackEvent('gallery_click'));
});
