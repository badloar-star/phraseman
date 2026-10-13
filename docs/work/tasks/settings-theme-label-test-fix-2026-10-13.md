# Починка теста settings_effective_theme_label_contract (Темы, 13.10)

Governance-ID: TG-E995D5F03285

- Outcome: тест не тянет react-native напрямую (esbuild не трансформирует его index.js); боевой код не меняется.
- Scope: только файл теста settings_effective_theme_label_contract в tests/.
- Architecture: тест остаётся чистым, RN подменяется заглушкой по образцу соседних контрактов.
- Security and privacy: данных не затрагивает.
- Technical debt: нет.
- Verification: точечный прогон теста через слот светофора.
- Rollback: git revert коммита с тестом.
