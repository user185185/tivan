// club.js - مدیریت هوشمند سیستم باشگاه مشتریان
// اصلاحات: محافظت از ارسال دوتایی، اعتبارسنجی بهتر، پاکسازی تایمر

document.addEventListener('DOMContentLoaded', function() {
    'use strict';

    var openClubBtn     = document.getElementById('openClubBtn');
    var clubOverlay     = document.getElementById('clubModalOverlay');
    var closeClubBtn    = document.getElementById('closeClubModalBtn');
    var submitPhoneBtn  = document.getElementById('submitPhoneBtn');
    var clientPhoneInput = document.getElementById('clientPhone');
    var otpSection      = document.getElementById('otpSection');
    var formFeedback    = document.getElementById('formFeedback');
    var timerDisplay    = document.getElementById('timerDisplay');

    // FIX #1: بررسی وجود عناصر قبل از ادامه
    if (!openClubBtn || !clubOverlay) return;

    var otpInputs = [
        document.getElementById('otp1'),
        document.getElementById('otp2'),
        document.getElementById('otp3'),
        document.getElementById('otp4'),
        document.getElementById('otp5')
    ];

    var currentStep     = 1;
    var currentToken    = '';
    var currentExpires  = '';
    var verifiedPhone   = '';
    var arvanWorkerUrl  = 'https://tivansms.tiva1shop-kh8xv.arvanedge.ir';
    var timerInterval   = null;
    var remainingSeconds = 0;
    var isVerifying     = false;
    var isSending       = false; // FIX #2: جلوگیری از ارسال مجدد SMS

    // ==========================================
    // تبدیل اعداد فارسی/عربی به انگلیسی
    // ==========================================
    function toEnglishDigits(str) {
        if (!str) return '';
        var persian = [/۰/g,/۱/g,/۲/g,/۳/g,/۴/g,/۵/g,/۶/g,/۷/g,/۸/g,/۹/g];
        var arabic  = [/٠/g,/١/g,/٢/g,/٣/g,/٤/g,/٥/g,/٦/g,/٧/g,/٨/g,/٩/g];
        for (var i = 0; i < 10; i++) {
            str = str.replace(persian[i], i).replace(arabic[i], i);
        }
        return str;
    }

    // ==========================================
    // بررسی وضعیت محرومیت (Throttle/Block)
    // ==========================================
    function checkBlockStatus() {
        var blockedUntil = localStorage.getItem('club_blocked_until');
        if (!blockedUntil) return false;

        var timeLeft = parseInt(blockedUntil) - Date.now();
        if (timeLeft > 0) {
            var minutesLeft = Math.ceil(timeLeft / (1000 * 60));
            var msg;
            if (minutesLeft > 60) {
                msg = '⚠️ به دلیل تلاش‌های ناموفق مکرر، تا ' + Math.ceil(minutesLeft / 60) + ' ساعت آینده از دریافت کد محروم هستید.';
            } else {
                msg = '⚠️ به دلیل تلاش‌های ناموفق مکرر، تا ' + minutesLeft + ' دقیقه آینده از دریافت کد محروم هستید.';
            }
            setFeedback('error', msg);
            submitPhoneBtn.disabled = true;
            clientPhoneInput.disabled = true;
            if (otpSection) otpSection.style.display = 'none';
            return true;
        } else {
            localStorage.removeItem('club_blocked_until');
            return false;
        }
    }

    // ==========================================
    // کمکی: تنظیم پیام بازخورد
    // ==========================================
    function setFeedback(type, msg) {
        if (!formFeedback) return;
        formFeedback.className = 'form-feedback' + (type ? ' ' + type : '');
        formFeedback.textContent = msg; // FIX #3: textContent به جای innerText (امنیت XSS)
    }

    // ==========================================
    // حرکت اتوماتیک بین فیلدهای OTP
    // FIX #4: فیلتر سخت‌گیرانه — فقط یک عدد در هر باکس
    // ==========================================
    otpInputs.forEach(function(input, index) {
        if (!input) return;
        input.addEventListener('input', function(e) {
            var value = toEnglishDigits(e.target.value).replace(/\D/g, '');
            e.target.value = value.slice(-1); // فقط آخرین رقم

            if (e.target.value && index < otpInputs.length - 1) {
                otpInputs[index + 1].focus();
            }
            checkAndSubmitOTP();
        });

        input.addEventListener('keydown', function(e) {
            if (e.key === 'Backspace' && this.value === '' && index > 0) {
                otpInputs[index - 1].focus();
            }
        });

        // FIX #5: پشتیبانی از paste کد یکجا
        input.addEventListener('paste', function(e) {
            e.preventDefault();
            var pasted = toEnglishDigits((e.clipboardData || window.clipboardData).getData('text')).replace(/\D/g, '');
            if (pasted.length === 5) {
                otpInputs.forEach(function(inp, i) { if (inp) inp.value = pasted[i] || ''; });
                checkAndSubmitOTP();
            }
        });
    });

    function checkAndSubmitOTP() {
        if (isVerifying) return;
        var otp = otpInputs.reduce(function(acc, inp) { return acc + (inp ? inp.value : ''); }, '');
        if (otp.length === 5) submitOTP(otp);
    }

    // ==========================================
    // تایید OTP و ثبت نهایی
    // FIX #6: isVerifying flag محافظت از ارسال موازی
    // ==========================================
    function submitOTP(otp) {
        if (isVerifying) return;
        isVerifying = true;

        setFeedback('loading', 'در حال تایید کد و ثبت نام... ⏳');
        submitPhoneBtn.disabled = true;

        var params = new URLSearchParams({
            phone: verifiedPhone,
            action: 'verify',
            otp: otp,
            token: currentToken,
            expires: currentExpires
        });

        fetch(arvanWorkerUrl + '?' + params.toString(), { method: 'GET', mode: 'cors' })
            .then(function(res) {
                if (!res.ok) throw new Error('پاسخ سرور نامعتبر');
                return res.json();
            })
            .then(function(data) {
                isVerifying = false;
                submitPhoneBtn.disabled = false;

                if (data.success === true) {
                    clearInterval(timerInterval);
                    setFeedback('success', data.message || 'عضویت شما در باشگاه مشتریان تیوان با موفقیت ثبت شد. ✨');
                    if (timerDisplay) timerDisplay.style.display = 'none';

                    // ریست شمارنده‌های ضدهرزنامه
                    localStorage.removeItem('club_attempts');
                    localStorage.removeItem('club_block_count');
                    localStorage.removeItem('club_blocked_until');

                    setTimeout(function() {
                        clubOverlay.classList.remove('active');
                        resetClubForm();
                    }, 3000);
                } else {
                    setFeedback('error', data.message || 'کد تایید نادرست است.');
                    // FIX #7: ریست باکس‌های OTP بعد از کد اشتباه
                    otpInputs.forEach(function(inp) { if (inp) inp.value = ''; });
                    if (otpInputs[0]) otpInputs[0].focus();
                }
            })
            .catch(function() {
                isVerifying = false;
                submitPhoneBtn.disabled = false;
                setFeedback('error', 'خطا در ارتباط با سرور. دوباره تلاش کنید.');
            });
    }

    // ==========================================
    // تایمر معکوس ۱۲۰ ثانیه
    // ==========================================
    function startTimer() {
        remainingSeconds = 120;
        if (timerDisplay) timerDisplay.style.display = 'block';
        submitPhoneBtn.textContent = 'تایید نهایی';
        submitPhoneBtn.disabled = false;
        updateTimerDisplay();

        if (timerInterval) clearInterval(timerInterval); // FIX #8: جلوگیری از تایمر موازی
        timerInterval = setInterval(function() {
            remainingSeconds--;
            updateTimerDisplay();
            if (remainingSeconds <= 0) {
                clearInterval(timerInterval);
                timerInterval = null;
                if (timerDisplay) timerDisplay.style.display = 'none';
                submitPhoneBtn.textContent = 'درخواست کد جدید';
                submitPhoneBtn.disabled = false;
                currentStep = 1;
                clientPhoneInput.disabled = false;
                if (otpSection) otpSection.style.display = 'none';
            }
        }, 1000);
    }

    function updateTimerDisplay() {
        if (!timerDisplay) return;
        var minutes = Math.floor(remainingSeconds / 60);
        var seconds = remainingSeconds % 60;
        timerDisplay.textContent = 'زمان باقی مانده ' + minutes + ':' + (seconds < 10 ? '0' : '') + seconds + ' تا امکان درخواست مجدد';
    }

    // ==========================================
    // ریست کامل فرم
    // ==========================================
    function resetClubForm() {
        currentStep = 1;
        currentToken = '';
        currentExpires = '';
        verifiedPhone = '';
        isVerifying = false;
        isSending = false;
        if (timerInterval) { clearInterval(timerInterval); timerInterval = null; }

        setFeedback('', '');
        clientPhoneInput.value = '';
        clientPhoneInput.disabled = false;
        if (otpSection) otpSection.style.display = 'none';
        otpInputs.forEach(function(inp) { if (inp) inp.value = ''; });
        submitPhoneBtn.textContent = 'دریافت کد تایید';
        submitPhoneBtn.disabled = false;
        if (timerDisplay) timerDisplay.style.display = 'none';
        checkBlockStatus();
    }

    // ==========================================
    // رویدادهای باز/بسته شدن مودال
    // ==========================================
    openClubBtn.addEventListener('click', function() {
        resetClubForm();
        clubOverlay.classList.add('active');
    });

    closeClubBtn.addEventListener('click', function() {
        clubOverlay.classList.remove('active');
    });

    // FIX #9: حذف listener اضافی window.click — این در index.html مدیریت می‌شود

    // ==========================================
    // رویداد دکمه اصلی (دریافت کد / تایید)
    // ==========================================
    submitPhoneBtn.addEventListener('click', function() {
        if (checkBlockStatus()) return;

        if (currentStep === 1) {
            if (isSending) return; // FIX #2: جلوگیری از ارسال مجدد

            var phone = toEnglishDigits(clientPhoneInput.value.trim());
            if (!/^09\d{9}$/.test(phone)) {
                setFeedback('error', 'لطفاً یک شماره موبایل معتبر ۱۱ رقمی وارد کنید.');
                return;
            }

            // کنترل محدودیت پله‌ای
            var attempts = parseInt(localStorage.getItem('club_attempts') || '0');
            if (attempts >= 3) {
                var blockCount = parseInt(localStorage.getItem('club_block_count') || '0') + 1;
                localStorage.setItem('club_block_count', blockCount);
                var duration = 10 * 60 * 1000;
                if (blockCount === 2) duration = 60 * 60 * 1000;
                if (blockCount >= 3) duration = 24 * 60 * 60 * 1000;
                localStorage.setItem('club_blocked_until', Date.now() + duration);
                localStorage.setItem('club_attempts', '0');
                checkBlockStatus();
                return;
            }

            isSending = true;
            setFeedback('loading', 'در حال بررسی اطلاعات... ⏳');
            submitPhoneBtn.disabled = true;

            fetch(arvanWorkerUrl + '?phone=' + encodeURIComponent(phone) + '&action=send', {
                method: 'GET',
                mode: 'cors'
            })
                .then(function(res) {
                    if (!res.ok) throw new Error('پاسخ سرور نامعتبر');
                    return res.json();
                })
                .then(function(data) {
                    isSending = false;
                    submitPhoneBtn.disabled = false;

                    if (data.success === false && data.alreadyRegistered === true) {
                        setFeedback('error', data.message || 'این شماره از قبل در باشگاه مشتریان موجود است.');
                        return;
                    }
                    if (data.success === false) {
                        setFeedback('error', data.message || 'خطا در فرآیند ارسال پیامک.');
                        return;
                    }
                    if (data.success === true) {
                        localStorage.setItem('club_attempts', attempts + 1);
                        currentToken = data.token;
                        currentExpires = data.expires;
                        verifiedPhone = phone;
                        clientPhoneInput.disabled = true;
                        startTimer();
                        currentStep = 2;
                        if (otpSection) otpSection.style.display = 'block';
                        otpInputs.forEach(function(inp) { if (inp) inp.value = ''; });
                        if (otpInputs[0]) otpInputs[0].focus();
                        setFeedback('success', data.message || 'کد تایید ارسال شد.');
                    }
                })
                .catch(function() {
                    isSending = false;
                    submitPhoneBtn.disabled = false;
                    setFeedback('error', 'خطا در ارتباط با سرور. لطفاً اینترنت خود را چک کنید.');
                });

        } else if (currentStep === 2) {
            var otp = otpInputs.reduce(function(acc, inp) { return acc + (inp ? inp.value : ''); }, '');
            if (otp.length < 5) {
                setFeedback('error', 'لطفاً کد تایید ۵ رقمی را کامل وارد کنید.');
                return;
            }
            submitOTP(otp);
        }
    });
});
