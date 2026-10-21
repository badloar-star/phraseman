# Заголовок экрана отключённых разговоров с ИИ — 9 языков (Переводчик → 5 · ВХОД)

Governance-ID: TG-3371923419EA
Status: Ready for 5 · ВХОД
Место: `app/ai_dialog_consent_gate.tsx:117` (заголовок по центру, ниже кнопка «Включить»). Код правит 5 · ВХОД.

```
ru: 'Включите разговоры с ИИ', uk: 'Увімкни розмови з ШІ', en: 'Turn on AI conversations', es: 'Activa las conversaciones con IA', 'pt-BR': 'Ative as conversas com IA', vi: 'Bật trò chuyện với AI', id: 'Nyalakan percakapan dengan AI', tr: 'Yapay zeka sohbetlerini aç', pl: 'Włącz rozmowy z AI'
```

- ru — дословно от владельца. «Включите» — на «вы», остальной экран на «ты»; вариант без разнобоя: «Включи разговоры с ИИ» (на решение владельца).
- Остальные 8 языков — на «ты», как тело экрана.
- «Разговоры» вместо «диалогов»: тело экрана и подпись кнопки для экранного диктора пока говорят «диалоги» — если меняется везде, переведу и их.
- tr «zeka» без циркумфлекса — как в соседних строках файла.

## Scope / Architecture / Security and privacy
Только текст. Без логики. Данные не затрагиваются.

## Technical debt
- Не проверено носителями.

## Verification
5 · ВХОД после вставки — `babel.parseSync` файла.

## Rollback
Удалить файл.
