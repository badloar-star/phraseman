@echo off
rem Запуск Metro-бандлера Phraseman (Expo) на порту 8081.
rem Окно остаётся открытым, пока работает Metro. Закрыть = остановить Metro.
cd /d C:\appsprojects\phraseman
npx expo start --port 8081
pause
