// analytics.js - ارسال گزارش کلیک‌ها به گوگل آنالیتیکس
// FIX #1: بررسی وجود عناصر قبل از addEventListener
// FIX #2: استفاده از event delegation برای .phone-link و .open-map-trigger (کارایی بیشتر)

document.addEventListener('DOMContentLoaded', function() {
    'use strict';

    function trackEvent(eventName) {
        if (typeof gtag === 'function') {
            gtag('event', eventName);
        }
    }

    // FIX #2: Event delegation برای شماره‌ها (به جای loop روی هر عنصر)
    document.body.addEventListener('click', function(e) {
        var phoneLink = e.target.closest('.phone-link');
        if (phoneLink) { trackEvent('phone_click'); return; }

        var mapTrigger = e.target.closest('.open-map-trigger');
        if (mapTrigger) { trackEvent('location_click'); return; }
    });

    // اینستاگرام
    var instaLink = document.querySelector('.instagram-link');
    if (instaLink) {
        instaLink.addEventListener('click', function() { trackEvent('insta_click'); });
    }

    // باشگاه مشتریان
    var clubBtn = document.getElementById('openClubBtn');
    if (clubBtn) {
        clubBtn.addEventListener('click', function() { trackEvent('club_click'); });
    }

    // فرم همکاری
    var coopBtn = document.getElementById('openCoopBtn');
    if (coopBtn) {
        coopBtn.addEventListener('click', function() { trackEvent('form_open'); });
    }

    // گالری
    var galleryBtn = document.getElementById('openGalleryBtn');
    if (galleryBtn) {
        galleryBtn.addEventListener('click', function() { trackEvent('gallery_click'); });
    }
});
