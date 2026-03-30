$token = "8381169948:AAE4ANE4fdV2ULCeujiZDdSRIlSdi39gAb4"
$id = "374480287"
$msg = "Claude: Работа завершена. Можно проверять!"

Invoke-RestMethod -Uri "https://api.telegram.org/bot$token/sendMessage?chat_id=$id&text=$msg"