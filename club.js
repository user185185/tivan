// club.js - مدیریت هوشمند سیستم باشگاه مشتریان و محدودیت پله‌ای ارسال پیامک
document.addEventListener('DOMContentLoaded', function() {
    
    var openClubBtn = document.getElementById('openClubBtn');
    var clubOverlay = document.getElementById('clubModalOverlay');
    var closeClubBtn = document.getElementById('closeClubModalBtn');
    var submitPhoneBtn = document.getElementById('submitPhoneBtn');
    var clientPhoneInput = document.getElementById('clientPhone');
    var otpSection = document.getElementById('otpSection');
    var formFeedback = document.getElementById('formFeedback');
    var timerDisplay = document.getElementById('timerDisplay');

    var otpInputs = [
        document.getElementById('otp1'),
        document.getElementById('otp2'),
        document.getElementById('otp3'),
        document.getElementById('otp4'),
        document.getElementById('otp5')
    ];

    var currentStep = 1; 
    var currentToken = '';
    var currentExpires = '';
    var verifiedPhone = '';
    var arvanWorkerUrl = 'https://tivansms.tiva1shop-kh8xv.arvanedge.ir';
    var timerInterval = null;
    var remainingSeconds = 0;
    var isVerifying = false;

    // تبدیل اعداد فارسی به انگلیسی
    function toEnglishDigits(str) {
        var persianDigits = [/۰/g, /۱/g, /۲/g, /۳/g, /۴/g, /۵/g, /۶/g, /۷/g, /۸/g, /۹/g];
        var arabicDigits = [/٠/g, /١/g, /٢/g, /٣/g, /٤/g, /٥/g, /٦/g, /٧/g, /٨/g, /٩/g];
        for (var i = 0; i < 10; i++) {
            str = str.replace(persianDigits[i], i).replace(arabicDigits[i], i);
        }
        return str;
    }

    // کنترل وضعیت محرومیت‌های ۱ ساعته، ۳ ساعته و ۲۴ ساعته بر اساس دستگاه و شماره
    function checkBlockStatus() {
        var blockedUntil = localStorage.getItem('club_blocked_until');
        if (blockedUntil) {
            var timeLeft = parseInt(blockedUntil) - Date.now();
            if (timeLeft > 0) {
                var minutesLeft = Math.ceil(timeLeft / (1000 * 60));
                var hoursLeft = Math.ceil(minutesLeft / 60);
                
                var msg = '';
                if (minutesLeft > 60) {
                    msg = '⚠️ شما به دلیل تلاش‌های ناموفق مکرر، تا ' + hoursLeft + ' ساعت آینده از دریافت کد محروم هستید.';
                } else {
                    msg = '⚠️ شما به دلیل تلاش‌های ناموفق مکرر، تا ' + minutesLeft + ' دقیقه آینده از دریافت کد محروم هستید.';
                }

                formFeedback.className = 'form-feedback error';
                formFeedback.innerText = msg;
                submitPhoneBtn.disabled = true;
                clientPhoneInput.disabled = true;
                otpSection.style.display = 'none';
                return true;
            } else {
                localStorage.removeItem('club_blocked_until');
            }
        }
        return false;
    }

    // حرکت اتوماتیک بین فیلدهای کد ۵ رقمی
    otpInputs.forEach(function(input, index) {
        input.addEventListener('input', function(e) {
            var value = toEnglishDigits(e.target.value);
            e.target.value = value;

            if (!/^\d$/.test(value) && value !== '') {
                e.target.value = '';
                return;
            }
            if (value && index < otpInputs.length - 1) {
                otpInputs[index + 1].focus();
            }
            checkAndSubmitOTP();
        });

        input.addEventListener('keydown', function(e) {
            if (e.key === 'Backspace' && this.value === '' && index > 0) {
                otpInputs[index - 1].focus();
            }
        });
    });

    function checkAndSubmitOTP() {
        var otp = '';
        otpInputs.forEach(function(input) { otp += input.value; });
        if (otp.length === 5 && !isVerifying) {
            submitOTP(otp);
        }
    }

    // تایید کد و ثبت نهایی در دیتابیس ورکر
    function submitOTP(otp) {
        isVerifying = true;
        formFeedback.className = 'form-feedback loading';
        formFeedback.innerText = 'در حال تایید کد و ثبت نام... ⏳';

        var params = new URLSearchParams({
            phone: verifiedPhone,
            action: 'verify',
            otp: otp,
            token: currentToken,
            expires: currentExpires
        });

        fetch(arvanWorkerUrl + '?' + params.toString(), { method: 'GET', mode: 'cors' })
        .then(function(res) { return res.json(); })
        .then(function(data) {
            isVerifying = false;
            if (data.success === true) {
                clearInterval(timerInterval);
                formFeedback.className = 'form-feedback success';
                formFeedback.innerText = data.message || 'عضویت شما در باشگاه مشتریان تیوان با موفقیت ثبت شد. ✨';
                timerDisplay.style.display = 'none';
                
                // ریست کردن شمارنده‌های اسپم بعد از عضویت موفقیت‌آمیز
                localStorage.removeItem('club_attempts');
                localStorage.removeItem('club_block_count');
                localStorage.removeItem('club_blocked_until');

                setTimeout(function() { 
                    clubOverlay.classList.remove('active'); 
                    resetClubForm();
                }, 3000);
            } else {
                formFeedback.className = 'form-feedback error';
                formFeedback.innerText = data.message || 'کد تایید نادرست است.';
            }
        })
        .catch(function() {
            isVerifying = false;
            formFeedback.className = 'form-feedback error';
            formFeedback.innerText = 'خطا در ارتباط با سرور. دوباره تلاش کنید.';
        });
    }

    // تایمر معکوس دقیقاً ۲ دقیقه‌ای (۱۲۰ ثانیه)
    function startTimer() {
        remainingSeconds = 120; 
        timerDisplay.style.display = 'block';
        submitPhoneBtn.textContent = 'تایید نهایی';
        submitPhoneBtn.disabled = false;
        
        updateTimerDisplay();
        
        timerInterval = setInterval(function() {
            remainingSeconds--;
            updateTimerDisplay();
            
            if (remainingSeconds <= 0) {
                clearInterval(timerInterval);
                timerDisplay.style.display = 'none';
                submitPhoneBtn.textContent = 'درخواست کد جدید';
                submitPhoneBtn.disabled = false;
                currentStep = 1;
                clientPhoneInput.disabled = false;
                otpSection.style.display = 'none';
            }
        }, 1000);
    }

    function updateTimerDisplay() {
        var minutes = Math.floor(remainingSeconds / 60);
        var seconds = remainingSeconds % 60;
        timerDisplay.innerText = 'زمان باقی مانده ' + minutes + ':' + (seconds < 10 ? '0' : '') + seconds + ' تا امکان درخواست مجدد';
    }

    function resetClubForm() {
        currentStep = 1;
        currentToken = '';
        currentExpires = '';
        verifiedPhone = '';
        isVerifying = false;
        if (timerInterval) { clearInterval(timerInterval); }
        
        formFeedback.className = 'form-feedback';
        formFeedback.innerText = '';
        clientPhoneInput.value = '';
        clientPhoneInput.disabled = false;
        otpSection.style.display = 'none';
        otpInputs.forEach(function(i) { i.value = ''; });
        submitPhoneBtn.innerText = 'دریافت کد تایید';
        submitPhoneBtn.disabled = false;
        timerDisplay.style.display = 'none';
        
        checkBlockStatus();
    }

    openClubBtn.addEventListener('click', function() {
        resetClubForm();
        clubOverlay.classList.add('active');
    });

    closeClubBtn.addEventListener('click', function() { clubOverlay.classList.remove('active'); });
    window.addEventListener('click', function(e) { if (e.target === clubOverlay) clubOverlay.classList.remove('active'); });

    // فرآیند کلیک روی دکمه اصلی دریافت کد / تایید
    submitPhoneBtn.addEventListener('click', function() {
        if (checkBlockStatus()) return;

        if (currentStep === 1) {
            var phone = toEnglishDigits(clientPhoneInput.value.trim());
            if (!/^09\d{9}$/.test(phone)) {
                formFeedback.className = 'form-feedback error';
                formFeedback.innerText = 'لطفاً یک شماره موبایل معتبر ۱۱ رقمی وارد کنید.';
                return;
            }

            // شمارش تعداد تلاش‌های ناموفق و اعمال محرومیت‌های پله‌ای
            var attempts = parseInt(localStorage.getItem('club_attempts') || '0');
            if (attempts >= 5) {
                var blockCount = parseInt(localStorage.getItem('club_block_count') || '0') + 1;
                localStorage.setItem('club_block_count', blockCount);
                
                var duration = 1 * 60 * 60 * 1000; // بار اول: ۱ ساعت محرومیت
                if (blockCount === 2) duration = 3 * 60 * 60 * 1000; // بار دوم: ۳ ساعت محرومیت
                if (blockCount >= 3) duration = 24 * 60 * 60 * 1000; // بار سوم به بعد: ۲۴ ساعت (۱ روز) محرومیت
                
                localStorage.setItem('club_blocked_until', Date.now() + duration);
                localStorage.setItem('club_attempts', '0'); 
                checkBlockStatus();
                return;
            }

            formFeedback.className = 'form-feedback loading';
            formFeedback.innerText = 'در حال بررسی اطلاعات... ⏳';
            submitPhoneBtn.disabled = true;

            fetch(arvanWorkerUrl + '?phone=' + encodeURIComponent(phone) + '&action=send', {
                method: 'GET',
                mode: 'cors'
            })
            .then(function(res) { return res.json(); })
            .then(function(data) {
                submitPhoneBtn.disabled = false;
                
                // منطق ۱: اگر از قبل ثبت بود، پیام داده و متوقف می‌شود (پیامک نمی‌رود)
                if (data.registered === true || data.alreadyRegistered === true) {
                    formFeedback.className = 'form-feedback success';
                    formFeedback.innerText = data.message || 'شماره شما قبلاً در باشگاه مشتریان ثبت شده است و فعال می‌باشد. ✨';
                    return;
                }

                // منطق ۲: اگر ثبت نبود، کد می‌رود و تایمر ۲ دقیقه‌ای راه می‌افتد
                if (data.success === true) {
                    localStorage.setItem('club_attempts', attempts + 1);

                    currentToken = data.token;
                    currentExpires = data.expires;
                    verifiedPhone = phone;
                    clientPhoneInput.disabled = true;
                    
                    startTimer();
                    currentStep = 2;
                    otpSection.style.display = 'block';
                    resetOtpInputs();
                    otpInputs[0].focus();
                    
                    formFeedback.className = 'form-feedback success';
                    formFeedback.innerText = data.message || 'کد تایید ارسال شد.';
                } else {
                    formFeedback.className = 'form-feedback error';
                    formFeedback.innerText = data.message || 'خطا در فرآیند ارسال پیامک.';
                }
            })
            .catch(function() {
                submitPhoneBtn.disabled = false;
                formFeedback.className = 'form-feedback error';
                formFeedback.innerText = 'خطا در ارتباط با سرور. لطفاً اینترنت خود را چک کنید.';
            });

        } else if (currentStep === 2) {
            var otp = '';
            otpInputs.forEach(function(input) { otp += input.value; });
            if (otp.length < 5) {
                formFeedback.className = 'form-feedback error';
                formFeedback.innerText = 'لطفاً کد تایید ۵ رقمی را کامل وارد کنید.';
                return;
            }
            submitOTP(otp);
        }
    });

    function resetOtpInputs() {
        otpInputs.forEach(function(input) { input.value = ''; });
    }
});
