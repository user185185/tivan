<?php
header("Content-Type: application/json; charset=UTF-8");

// 🔴 تنظیمات اختصاصی پنل فراز اس‌ام‌اس خود را اینجا وارد کنید:
define('FARAZ_API_KEY', 'YOUR_API_KEY_HERE'); // کلید وب‌سرویس شما
define('PHONEBOOK_ID', 12345); // آی‌دی دفترچه تلفن ساخته شده در پنل شما

// دریافت اطلاعات ارسالی از سمت مرورگر
$requestPayload = file_get_contents("php://input");
$data = json_decode($requestPayload, true);

if (!isset($data['phone']) || empty($data['phone'])) {
    echo json_encode(["success" => false, "message" => "شماره موبایل ارسال نشده است."]);
    exit;
}

$clientPhone = trim($data['phone']);

// آماده‌سازی آرایه داده‌ها برای ارسال به متد Add New Contact فراز اس‌ام‌اس
$postData = [
    "phone_book_id" => PHONEBOOK_ID,
    "number"        => $clientPhone,
    "first_name"    => "مشتری",
    "last_name"     => "باشگاه"
];

// اتصال به API رسمی فراز اس‌ام‌اس (IPPANEL v1)
$ch = curl_init("https://api2.ippanel.com/ws/v1/phone_book_data");
curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_POST           => true,
    CURLOPT_POSTFIELDS     => json_encode($postData),
    CURLOPT_HTTPHEADER     => [
        "Authorization: AccessKey " . FARAZ_API_KEY,
        "Content-Type: application/json"
    ],
    CURLOPT_TIMEOUT        => 10
]);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

// بررسی خروجی سرور فراز اس‌ام‌اس
if ($httpCode === 201 || $httpCode === 200) {
    echo json_encode(["success" => true, "message" => "موفقیت‌آمیز"]);
} else {
    // در صورت بروز خطا، پاسخ فراز اس‌ام‌اس برای بررسی بیشتر بازگردانده می‌شود
    $resData = json_decode($response, true);
    $errorMsg = isset($resData['message']) ? $resData['message'] : 'خطای ناآشنا در سرور پیامک';
    echo json_encode(["success" => false, "message" => "خطای پنل: " . $errorMsg]);
}
?>