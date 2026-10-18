# ANR холодного старта после выхода — 18.10 12:22:48, 12:25:48, 12:27:13 (эмулятор, app.phraseman, pid 3783 и далее)
Источник: `adb shell dumpsys dropbox --print data_app_anr`. Каталог /data/anr без root читается только списком (ls_data_anr.txt). Файлы: anr_2026-10-18_12-22-48.txt, anr_2026-10-18_12-25-48.txt, anr_2026-10-18_12-27-13.txt — полные трассы процесса.
Тема каждого: «Input dispatching timed out … MainActivity is not responding. Waited ~5003ms for FocusEvent(hasFocus=true)» — окно получило фокус, а главный поток не ответил 5 с.

## Что в трассе (12:22:48)
- Главный поток (tid=1, state=S, nice=-10, top-app): libc futex ← condition_variable::wait ← future<void>::get ← libhwui `RenderProxy::setStopped` ← `HardwareRenderer.setStopped` ← `ViewRootImpl.performDraw` / `performTraversals`. Главный поток ЖДЁТ поток отрисовки; кода приложения и JS в его стеке нет.
- RenderThread (state=R): `read` ← `libOpenglSystemCommon qemu_pipe_read` ← `QemuPipeStream::commitBufferAndReadFully` ← `libGLESv2_enc glCreateProgram_enc` ← `GrGLProgramBuilder::CreateProgram` ← `GrGLGpu::flushGLState`. То есть компиляция/создание графической программы (шейдера) идёт через виртуальную трубу эмулятора и занимает секунды.
- Поток JS (mqt_v_js) — в ожидании, не занят.
- CPU за 11 с вокруг ANR: приложение 158 % (60 % user + 98 % kernel), системно 83 % (kernel 44 %, irq 15 %), graphics.composer (ranchu) 20 %, surfaceflinger 8 % — машина перегружена; kernel-время высокое из-за qemu_pipe.
## Вывод для Авторизации
ANR на эмуляторе — следствие шейдера через qemu_pipe при перегрузе ПК (тот же рисунок, что в известной ловушке эмулятора), а не зависание JS и не ошибка входа. Дважды совпало с моментом после выхода: экран согласия «Почти готово» рисует тяжёлый градиентный фон/свечение и стартует поверх очистки данных. Для человека на телефоне вероятность ниже, но тяжёлый фон экрана согласия при холодном старте стоит упростить (🟡). Подтвердить на реальном устройстве.
