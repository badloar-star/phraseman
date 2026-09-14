# Phraseman: полный аудит сайта, админки, приложения и готовности к SOC 2

Дата среза: 11 сентября 2026 года  
Статус: архитектурный, UX, security и delivery readiness audit; не является заключением CPA, пентестом или юридической консультацией.

## Итог для владельца

Phraseman имеет сильную техническую базу, но пока не готов заявлять SOC 2 readiness и тем более проходить Type II. Причина не в одной уязвимости: технические контроли развиваются быстрее, чем управленческие контроли и доказательства их регулярной работы.

### Обновление локальной программы (2026-09-11)

После исходного среза в репозитории добавлены machine-checkable foundation artifacts: system context/service catalog, domain contracts, risk register, Security+Availability control matrix, access/vendor governance, dependency register/reachability evidence, privacy data inventory, technical-debt register, change-gate selector, test metrics baseline, website report-only header/CWV/accessibility contracts, admin command registry, critical journey/SLO baseline, incident/BCP/DR templates and native accessibility matrix. Это локальные доказательства дизайна и readiness-подготовки, а не operating effectiveness: production deploy, CPA approval, named owners, device runs, tabletop, restore test и два чистых evidence cycles ещё не выполнены.

| Область | Оценка | Короткий вывод |
|---|---:|---|
| Публичный сайт | B | Хорошая семантика и ясный путь к продукту; не хватает измеримого performance/security baseline |
| Рабочая админка | C | Сильные локальные предохранители, но 51,516 строк в одном HTML создают большой blast radius |
| Мобильное приложение | C+ | Очень широкая функциональность и много контрактных тестов; границы и общий release confidence фрагментированы |
| Secure delivery | B- | Есть typecheck, тесты, secret scanning и доменные guards; ownership и supply-chain governance не оформлены |
| Operations / SOC 2 evidence | D+ | Есть логи и incident-derived guards, но не найден единый реестр контролей, рисков, access reviews, IR/BCP/DR и vendor evidence |

Подтверждённых P0 в рамках этого аудита нет. Есть пять P1-направлений: triage известных dependency advisories; формальная модель контролей и доказательств; декомпозиция админского монолита без смены live surface; управляемый CI/release contract; response/recovery и vendor/access governance.

## Что такое SOC 2

SOC 2 — это независимое attestation-исследование контролей сервисной организации, релевантных безопасности, доступности, целостности обработки, конфиденциальности и/или приватности. Security является базовой категорией; остальные выбираются по обещаниям продукта и рискам. AICPA отдельно публикует Trust Services Criteria и Description Criteria.[1][2]

Практически Type I отвечает, спроектированы ли и существуют ли контроли на выбранную дату; Type II дополнительно требует доказать их операционную эффективность за период. Поэтому «у нас есть Firebase Rules и тесты» недостаточно: нужны владельцы контролей, периодичность, неизменяемые доказательства, выборки access review, incident exercises, vendor reviews и подтверждение исправления исключений.

Рекомендуемый scope для Phraseman: Security обязательно; Availability — из-за обучения, покупок и облачной синхронизации; Confidentiality — из-за пользовательских и операционных данных; Privacy — после отдельного gap assessment, особенно учитывая возрастные/consent данные и голосовые функции. Processing Integrity разумно включать, когда operation journal, entitlement и учебный прогресс будут полностью описаны и доказуемы.

## Метод и границы

Проверено:

- живой `https://knowlyapps.com/` через браузерное accessibility tree и HTTP headers;
- публичное состояние `https://phraseman-ea0b3.web.app/legacy.html#control-panel` без входа и без действий;
- локальная архитектура `app/`, `components/`, `modules/`, `functions/src/`, `knowly-www/`, `admin/v2/`;
- Firebase hosting configuration, GitHub Actions, проектные guards, consent/deletion/audit-log evidence и архитектурные документы;
- стандарты AICPA TSC, NIST SSDF/CSF, OWASP ASVS/MASVS, WCAG 2.2 и Core Web Vitals.[1][3][4][5][6][7]

Не проверено и не следует считать PASS:

- авторизованные админские операции и production Firestore data;
- runtime journey мобильного приложения на физических Android/iOS устройствах;
- внешний пентест, SAST/DAST с эксплуатацией, облачные IAM/backup настройки и billable vendor consoles;
- реальные RTO/RPO, восстановление из backup и 30–90-дневная операционная выборка;
- юридическая полнота privacy/retention документов во всех юрисдикциях.

## Карта подтверждённых сильных сторон

### Сайт

- Живая главная имеет skip-link «К содержанию», landmark навигации, один H1 и последовательные H2/H3.
- CTA и информационная архитектура понятны: приложение, тест уровня, журнал, подарок, поддержка, download.
- У изображений есть содержательные alt-тексты; FAQ использует кнопки с состоянием expanded/collapsed.
- Есть privacy, terms, data deletion и cookie settings в основном footer.
- Статический delivery уменьшает attack surface и operational complexity.

### Админка

- Публичная поверхность fail-closed: до проверки сессии основной Google sign-in disabled, доступна явная смена аккаунта.
- Live response имеет HSTS, `nosniff`, `SAMEORIGIN`, `no-referrer`, `no-store`, CSP с `object-src 'none'`, `base-uri 'self'`, `form-action 'self'`.
- Админские writes защищены custom claim; проектные guards блокируют известные классы регрессий, включая случайное включение App Check до готовности ключа.
- Есть audit logging, alerts, idempotency/fingerprint checks и отдельные owner contracts.
- `ADMIN_UI_BIBLE.md` уже задаёт сильную модель: один экран — одна задача, progressive disclosure, preview-before-publish, rollback center, accessible/responsive states.

### Приложение и backend

- Домены содержат явные правила для identity, account deletion, consent, money/economy, leagues и Learning V2.
- Есть secret scan в pre-commit и CI, gitleaks по истории, TypeScript typecheck, app/functions test jobs и многочисленные regression guards.
- Account deletion имеет staged/recoverable flow, diagnosis, identity closure и rate limits; consent хранится как отдельное состояние.
- Economy constitution фиксирует client authority, idempotency и запрет orphan debit — зрелый пример нормативной архитектуры.
- Incident-derived guards превращают повторяющиеся ошибки в машинно-проверяемые контракты.

## Основные разрывы и риски

### P1 — production dependency tree содержит critical/high advisories

Rule ID: REACT-SUPPLY-001  
Severity: High до завершения reachability triage  
Location: root `package-lock.json` dependency tree и `functions/package-lock.json` dependency tree.

Evidence: read-only `npm audit --omit=dev --json` на дату среза сообщил в корне 42 advisory: 2 critical, 17 high, 22 moderate, 1 low. Critical transitive packages: `shell-quote`, `websocket-driver`; high includes direct `expo` и transitive Expo/Metro/build packages. Для Functions: 16 advisory — 4 high и 12 moderate; high включает прямые `mailparser` и `nodemailer`, а также transitive `html-to-text` и `deepmerge-ts`. Audit сообщает доступные fixes, но часть корневых рекомендаций ведёт к major Expo upgrade.

Impact: реальный риск зависит от того, попадает ли уязвимый код в production runtime и достижим ли опасный path. Build/CLI-only exposure ниже server-reachable exposure, но статус `dependencies.prod` и прямые Functions packages требуют немедленного разбора, а не автоматического `npm audit fix --force`.

Fix: отдельным critical-domain task packet построить dependency path/reachability matrix, сначала обновить Functions mail chain совместимо и прогнать email parsing/sending contract tests; Expo upgrade планировать как release/migration с native regression matrix. Запретить force-upgrade без rollback evidence.

Mitigation: ограничить обработку входящего mail, лимиты размера/времени, минимальные cloud permissions и network exposure; добавить scheduled audit/Dependabot с SLA.

False-positive notes: advisory count не доказывает exploitability. Закрывать finding можно только доказанным unreachable path, удалением dependency или версией без advisory с пройденными gates.

### P1 — нет управляемой SOC 2 control system

Evidence: не найден канонический control matrix, единый risk register, formal access-review cadence, vendor register, incident response plan, BCP/DR plan с RTO/RPO и evidence calendar. Существуют отдельные сильные контроли, но они не собраны в систему «критерий → контроль → владелец → периодичность → доказательство → исключение».

Impact: аудитор не сможет проверить operating effectiveness; команда не видит просроченные контроли; incident knowledge остаётся в кодовых комментариях и guards.

Recommendation: запустить Epic GRC-1 из PRD, выбрать Security + Availability как первый audit scope, провести readiness assessment с лицензированной CPA firm до начала observation window.

### P1 — админка является сверхкрупной change domain

Evidence: единственная live surface `admin/v2/legacy.html` содержит около 51,516 строк и 3.2 млн символов. Это одновременно HTML, CSS, UI state, integration и операционные действия.

Impact: локальная правка имеет широкий blast radius; ownership и focused testing затруднены; CSP вынуждена разрешать `'unsafe-inline'` для script/style; code review теряет контекст.

Recommendation: сохранить `legacy.html` как единственную публикуемую оболочку, но извлекать только уже подключённые модули в `admin/v2/scripts/` через strangler-подход. Первые seams: auth/session shell, shared dialog/state primitives, read models, mutation command layer. Каждый slice — совместимый, с contract test и без восстановления удалённой white V2 admin.

### P1 — CI доказывает много, но не формирует единый release contract

Evidence: `source-quality.yml` запускает полный typecheck, один app Jest worker и functions Jest. Комментарий workflow фиксирует около 137 suites с shared module/global state и heap 8 GB. Наряду с core gates существует много веточно-специфичных English-test workflow с историческими ref conditions и transport repair logic.

Impact: высокая стоимость feedback, риск flakiness/state coupling, сложнее ответить «какой набор проверок обязателен для каждого типа изменения».

Recommendation: ввести change classification matrix и composable release gates: universal fast checks, domain contract pack, security/privacy pack, deployment smoke. Сначала измерить длительность и flaky rate; потом дробить shared-state suite, не параллелить её вслепую.

### P1 — response/recovery не доказаны как операционный процесс

Evidence: код содержит alerts и многочисленные incident comments/guards, но в канонических документах не найден единый severity model, on-call/owner tree, communication templates, tabletop cadence, tested restore evidence, RTO/RPO.

Impact: техническое обнаружение не гарантирует управляемое реагирование и восстановление; это прямой пробел Availability/Security.

Recommendation: один IR runbook, один BCP/DR plan, quarterly tabletop, annual restore test, evidence retention и post-incident control update.

### P2 — публичный сайт не имеет security-header baseline

Evidence: live home возвращает HSTS, но не возвращает CSP, `X-Content-Type-Options`, `Referrer-Policy` и `Permissions-Policy`. Для статической страницы это defense-in-depth gap, а не доказанная эксплуатация.

Recommendation: добавить report-only CSP, собрать нарушения, затем enforce; добавить `nosniff`, строгий referrer и минимальный permissions policy. Не ломать analytics, locale preferences, downloads или embeds.

### P2 — legacy DOM sinks требуют dataflow inventory

Rule ID: JS-XSS-001 / JS-CSP-002  
Severity: Medium (эксплуатируемый путь не подтверждён)  
Location: `admin/v2/legacy.html` (многочисленные `innerHTML`, например около lines 16,844–17,284 и далее), `knowly-www/assets/ds.js:79`, `knowly-www/assets/start.js:168`.

Evidence: admin и website используют HTML-string rendering; в просмотренных динамических admin error/value paths применяется `escapeHtml`, а site i18n берёт значения из встроенного `window.I18N`. Apple callback передаёт query/hash в custom scheme, но `app/auth_provider.ts:1646–1648` сравнивает OAuth state до принятия результата.

Impact: большой объём ручного escaping затрудняет доказательство полноты и ослабляет возможность строгого CSP; будущая правка может соединить untrusted source с sink.

Fix: сгенерировать source→sink registry, заменить text-only случаи на `textContent`, централизовать допустимый rich HTML, затем включать CSP/Trusted Types через report-only ratchet.

Mitigation: сохранить server-side authorization, текущие escape utilities и запрет `unsafe-eval`; каждую новую sink правку покрывать dataflow test.

False-positive notes: `innerHTML` с константой или корректно escaped структурой сам по себе не является XSS. Пентест/dataflow review нужен для повышения severity.

### P2 — нет измеримого performance budget

Evidence: сайт использует статическую выдачу и lazy images, но не найден канонический RUM/CWV SLO. Google определяет good thresholds на 75-м перцентиле: LCP ≤ 2.5 s, INP ≤ 200 ms, CLS ≤ 0.1.[7]

Recommendation: завести production RUM отдельно для mobile/desktop и key routes; CI budget использовать как ранний сигнал, а не замену field data.

### P2 — governance репозитория неполна

Evidence: нет `CODEOWNERS`, `SECURITY.md`, `CONTRIBUTING.md` и Dependabot config. Это не означает отсутствия реальных владельцев или ручного dependency review, но доказательство не репозиторно и не повторяемо.

Recommendation: добавить ownership по trust boundaries, private vulnerability intake, supported versions, dependency update cadence и exception process.

### P2 — архитектурная карта отстаёт от масштаба продукта

Evidence: `docs/ARCHITECTURE.md` описывает лишь Flashcards, Settings и Home orchestration, тогда как приложение и backend содержат тысячи исходных файлов и много критичных доменов.

Recommendation: не писать энциклопедию. Создать C4-lite system/context + container map, затем отдельные короткие domain contracts только для identity, learning, economy, purchases, voice/AI, admin commands, telemetry и release.

### P2 — UX audit не закрывает реальные mobile/admin journeys

Evidence: публичная семантика сайта хорошая; admin login accessibility tree читаемый. Но authenticated admin и нативные flows не прогнаны keyboard/screen reader/device matrix.

Recommendation: WCAG 2.2 AA для web/admin; для React Native — VoiceOver/TalkBack, Dynamic Type/font scaling, 44–48 pt touch targets, focus order, reduced motion, error recovery и offline/retry journeys. WCAG 2.2 — действующая W3C Recommendation; mobile app дополнительно проверять по OWASP MASVS.[5][6]

## Surface-by-surface backlog seed

### Website

1. Security headers rollout with report-only CSP.
2. RUM for CWV and conversion journey `landing → app/test/gift → download` with consent gating.
3. Automated link/status/canonical/schema/locale contract across primary routes.
4. Keyboard, zoom 200/400%, reduced-motion and high-contrast regression checks.
5. Content governance: owner, freshness date and claim evidence for reviews/pricing/legal copy.

### Admin

1. Map every mutation to actor, authorization, idempotency, preview, audit record and rollback.
2. Extract shared primitives and command adapters from the monolith in compatible slices.
3. Add environment badge, approval policy for high-impact changes, global alerts and rollback center per Admin UI Bible.
4. Add keyboard/focus/dialog/table responsive journey pack after authentication.
5. Replace inline script/style incrementally so CSP can eventually drop `'unsafe-inline'`.

### App and backend

1. Publish system and domain architecture map with source-of-truth/authority boundaries.
2. Establish release gate matrix per change type and deterministic evidence bundle.
3. Break shared-state tests by domain and remove hidden global coupling in measured increments.
4. Define SLOs for auth, sync, account deletion, purchases/entitlements, learning session start, voice/AI and admin commands.
5. Create privacy data inventory: category, purpose, consent, store, retention, deletion, vendor, residency and child-safety constraints.

## SOC 2 readiness matrix

| Control family | Current evidence | Readiness | Needed next |
|---|---|---:|---|
| Governance / risk | Domain constitutions and owner locks | Partial | scope, control matrix, risk register, owners, quarterly review |
| Logical access | Firebase Auth/custom claims, rules/tests | Partial | joiner/mover/leaver, MFA policy, quarterly access evidence, emergency access |
| Change management | PR CI, hooks, guards, deploy locks | Partial+ | universal change classification, approvals, release evidence retention |
| Vulnerability management | secret scanning; isolated npm audit in one workflow | Partial | full asset/dependency cadence, SLA by severity, exceptions, pentest |
| Logging/monitoring | admin audit log, alerts, Jarvis contracts | Partial+ | inventory, retention, alert ownership, response evidence, clock/immutability review |
| Incident response | incident-derived code comments/guards | Weak | formal plan, severity, contacts, tabletop and postmortem cadence |
| Availability / recovery | resilience code exists | Weak/unverified | service inventory, SLO, RTO/RPO, backup/restore tests, status comms |
| Vendor risk | Firebase/Google/RevenueCat and other integrations visible | Weak | vendor inventory, criticality, DPA/SOC review, annual reassessment |
| Privacy | consent, deletion and legal surfaces | Partial | data map, retention schedule, DSR evidence, subprocessor and child-data review |
| Security awareness / HR | not evidenced in repo | Unverified | onboarding/offboarding, training, acknowledgements, background-check policy as applicable |

Verdict: не начинать Type II observation period сейчас. Сначала закрыть foundational enablers и собрать 4–8 недель стабильных внутренних evidence runs; затем провести formal readiness с аудитором и только после устранения exceptions фиксировать observation window.

## Рекомендуемый порядок на 90 дней

- Days 0–14: утвердить system boundary, data/vendor inventory, owners, risk register, SOC 2 categories, SLO/RTO/RPO draft.
- Days 15–30: control matrix/evidence calendar, access review, IR/BCP runbooks, universal release matrix, website header/RUM baseline.
- Days 31–60: первый evidence cycle, tabletop, restore test, admin command inventory, monolith extraction slice 1, dependency/vulnerability SLA.
- Days 61–90: второй evidence cycle, close exceptions, external pentest scope, CPA readiness assessment, Type II go/no-go.

## Источники

1. AICPA & CIMA, [Trust Services Criteria (2017, revised points of focus 2022)](https://www.aicpa-cima.com/resources/download/2017-trust-services-criteria-with-revised-points-of-focus-2022).
2. AICPA & CIMA, [SOC suite and SOC 2 reporting resources](https://www.aicpa-cima.com/topic/audit-assurance/audit-and-assurance-greater-than-soc-2).
3. NIST, [Secure Software Development Framework (SSDF), SP 800-218](https://csrc.nist.gov/pubs/sp/800/218/final).
4. OWASP, [Application Security Verification Standard 5.0](https://owasp.org/www-project-application-security-verification-standard/).
5. OWASP, [Mobile Application Security Verification Standard](https://mas.owasp.org/MASVS/).
6. W3C, [Web Content Accessibility Guidelines 2.2](https://www.w3.org/TR/wcag/).
7. Google web.dev, [Web Vitals](https://web.dev/articles/vitals).
8. NIST, [Cybersecurity Framework 2.0](https://www.nist.gov/publications/nist-cybersecurity-framework-csf-20).
