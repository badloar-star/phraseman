# Вес production-бандла (Эмулятор, HEAD 149acb1f9) — для СЛЕДУЮЩЕЙ обновы (приоритет №1 владельца)
- Hermes bundle: **109,8 МиБ**; source map 97 МиБ; ассеты всего 1,4 МБ (30 файлов) — тяжёлое именно JS.
- Исходники в бандле: 57,5 МБ / 6111 файлов: app 22,8, modules 16,5, components 9,0, node_modules 8,3 (86 % — наш код/данные).
- ТОП-10: learning-v2 factory_native_manifest_v1.generated.ts 8,31 МБ; …_manifest_es 1,36; …_catalog 0,87; lesson_help_theory_data.tsx 0,82; lesson_data_1_8_phrases_es.gen.ts 0,81; revenuecat mappings 0,59; lesson_data_25_32.ts 0,58; lesson_intro_screens_en_17_32.ts 0,54; lesson_data_9_16_phrases_es.gen.ts 0,51; idioms_data.ts 0,47.
- Вывод: данные курсов и сгенерированные манифесты V2 лежат в бандле как TS → парсинг при холодном старте и вес. Дешёвая правка: вынести в JSON/ассеты/облако с ленивой подгрузкой по языку курса (не require на старте). Оговорка: доли ориентировочные (размер исходников, не байткода).
- Отчёты: C:/Temp/claude/prod_export/bundle_weight_report*.txt
