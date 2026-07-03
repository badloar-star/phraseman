# Топ хелперов (Top Helpers) — интеграция в занятые файлы

Готовый код лежит в **новых/свободных** файлах (см. ниже). Этот документ — вставки
в файлы, которые **заняты другой сессией** (их я не трогал, чтобы не создавать
конфликт мержа). Вставь эти куски, когда файлы освободятся.

## Что уже сделано (свободные/новые файлы, коммитить как есть)

| Файл | Что |
|---|---|
| `functions/src/report_replies.ts` | `adminReplyToReport` пишет проекцию `top_helpers/{uid}` в той же транзакции, что и счётчик (путь «Ответить всем (ИИ)» из админки). |
| `scripts/reply_to_reports.mjs` | То же — для основного пути (LLM-сессия + replies.json). Оба пути наполняют борд. |
| `app/firestore_top_helpers.ts` | Клиент борда: топ-10, кэш + кулдаун 3 ч, чтение описания/флага из `remote_config/app`. |
| `app/top_helpers.tsx` | Экран борда (UI как в лиге: аватары, короны, карточка `PlayerProfileModal`). |

Индекс Firestore **не нужен**: `orderBy('confirmed','desc')` по одному полю
индексируется автоматически.

---

## 1. `firestore.rules` — публичное чтение борда (занят + mojibake)

Добавить рядом с `match /leaderboard/{userId}` (~строка 1099):

```
    // ── Топ хелперов ─────────────────────────────────────────────────────────
    // Публичная проекция рейтинга помощников. Пишет ТОЛЬКО Cloud Function /
    // reply_to_reports.mjs (Admin SDK); клиент только читает (как leaderboard).
    match /top_helpers/{userId} {
      allow read: if request.auth != null;
      allow write: if false;
    }
```

> ⚠️ Файл сейчас с CRLF/UTF-8-повреждениями от другой сессии — вставляй аккуратно,
> проверь кодировку строки перед сохранением.

---

## 2. `app/(tabs)/settings.tsx` — вход в раздел (занят)

В секции «Сообщество и помощь» (~строка 1288), рядом с пунктом Help Board, добавь
строку-переход. Виден только когда борд включён в пульте.

Импорты (вверху файла):
```ts
import { loadTopHelpers } from '../firestore_top_helpers';
```

Состояние (в компоненте настроек, рядом с другими флагами видимости):
```ts
const [topHelpersEnabled, setTopHelpersEnabled] = useState(true);
useEffect(() => {
  let alive = true;
  loadTopHelpers(Date.now())
    .then((s) => { if (alive) setTopHelpersEnabled(s.enabled); })
    .catch(() => {});
  return () => { alive = false; };
}, []);
```

Пункт меню (там же, где остальные `SettingsRow`/`SettingsLink` этой секции — подставь
твой компонент строки настроек):
```tsx
{topHelpersEnabled && (
  <SettingsRow
    icon="ribbon-outline"
    label={L('Топ хелперов', 'Топ хелперів', 'Top Helpers', 'Top Helpers', 'Top Helpers', 'Top Helpers', 'Top Helpers', 'Top Helpers')}
    onPress={() => router.push('/top_helpers')}
  />
)}
```
(имя пропсов `SettingsRow`/`icon`/`label` — под твой существующий компонент строки.)

---

## 3. `admin/index.html` — раздел «🏆 Топ хелперов» (занят + активно правится)

Раздел `copyAllFilteredReports` сейчас в диффе другой сессии — НЕ трогаю. Инструкция
для LLM уже содержит `"shards": <1 если подтвердилось>`, а серверная часть
автоматически заносит это в борд, так что менять инструкцию не обязательно
(опционально можно добавить строку: «подтверждённые (shards≥1) автоматически
идут в борд Топ хелперов»).

### 3a. Вкладка (навигация)
В `ADMIN_TAB_KEYS` (~строка 13484) добавить `'helpers-board'`.
Рядом с кнопкой вкладки Help Board:
```html
<div class="tab" onclick="switchTab('helpers-board')">🏆 Топ хелперов</div>
```

### 3b. Секция (тело вкладки) — вставить рядом с `id="tab-help-board"`:
```html
<div id="tab-helpers-board" class="reports-tab">
  <h2 style="margin:4px 0 10px">🏆 Топ хелперов</h2>

  <!-- Описание борда (remote_config/app.texts.top_helpers_description) -->
  <div style="margin-bottom:12px">
    <label style="display:block;font-size:12px;color:#9ca3af;margin-bottom:4px">Описание борда (видно юзерам, без OTA):</label>
    <textarea id="hb-desc" rows="3" style="width:100%;max-width:720px;box-sizing:border-box"></textarea>
    <div style="margin-top:6px">
      <button onclick="saveHelpersDescription()">💾 Сохранить описание</button>
      <label style="margin-left:16px"><input type="checkbox" id="hb-enabled" onchange="saveControlPanelBool('top_helpers_enabled', this.checked)"/> Раздел включён (виден в приложении)</label>
    </div>
  </div>

  <div class="reports-toolbar" style="margin-bottom:8px">
    <button onclick="loadHelpersBoard(true)">🔄 Обновить список</button>
    <input type="text" id="hb-search" placeholder="UID или имя" oninput="renderHelpersBoard()" style="margin-left:8px"/>
    <span id="hb-count" style="margin-left:8px;color:#9ca3af"></span>
  </div>

  <div class="table-wrap">
    <table>
      <thead><tr><th>#</th><th>Имя</th><th>UID</th><th>Подтверждено</th><th>Статус</th><th>Действия</th></tr></thead>
      <tbody id="hb-body"></tbody>
    </table>
  </div>
</div>
```

### 3c. JS (вставить рядом с логикой Help Board / reports):
```js
  // Топ хелперов: список всех по confirmed из top_helpers, действия — награда/Plus.
  window._helpersBoard = [];

  window.loadHelpersBoard = async function(force) {
    // описание + флаг из remote_config/app
    try {
      const cfg = await getDoc(doc(db, 'remote_config', 'app'));
      const data = cfg.exists() ? (cfg.data() || {}) : {};
      const descEl = document.getElementById('hb-desc');
      if (descEl) descEl.value = (data.texts && data.texts.top_helpers_description) || '';
      const enEl = document.getElementById('hb-enabled');
      if (enEl) enEl.checked = !(data.bools && data.bools.top_helpers_enabled === false);
    } catch (_) {}
    // весь борд (без limit — админ видит всех, в отличие от топ-10 в приложении)
    const snap = await getDocs(query(collection(db, 'top_helpers'), orderBy('confirmed', 'desc')));
    window._helpersBoard = snap.docs.map(d => ({ uid: d.id, ...(d.data() || {}) }));
    renderHelpersBoard();
    showToast(`Загружено: ${window._helpersBoard.length}`);
  };

  window.renderHelpersBoard = function() {
    const q = (document.getElementById('hb-search')?.value || '').toLowerCase();
    const rows = window._helpersBoard.filter(u =>
      !q || (u.uid||'').toLowerCase().includes(q) || (u.displayName||'').toLowerCase().includes(q));
    const tbody = document.getElementById('hb-body');
    if (tbody) tbody.innerHTML = rows.map((u, i) => `
      <tr>
        <td>${i+1}</td>
        <td>${escapeHtml(u.displayName || '—')}</td>
        <td style="font-family:monospace;font-size:11px">${escapeHtml(u.uid)}</td>
        <td style="text-align:center;font-weight:700">${Number(u.confirmed||0)}</td>
        <td>${u.isPremium ? '💚 Plus' : ''}</td>
        <td>
          <button onclick="grantHelperShards('${u.uid}')">💎 Осколки</button>
          <button onclick="grantHelperPlus('${u.uid}')">💚 Plus</button>
        </td>
      </tr>`).join('');
    const c = document.getElementById('hb-count');
    if (c) c.textContent = `${rows.length} чел.`;
  };

  window.saveHelpersDescription = async function() {
    const text = document.getElementById('hb-desc')?.value || '';
    await saveControlPanelTexts({ top_helpers_description: text });
    showToast('Описание сохранено');
  };

  // Награда: осколки (простой инкремент, как editShards, но +N).
  window.grantHelperShards = async function(uid) {
    const val = await showInputModal({ title: 'Сколько осколков выдать?', defaultVal: '100' });
    if (val === null) return;
    const amt = parseInt(val); if (isNaN(amt) || amt <= 0) { showToast('Число > 0', 'err'); return; }
    const cur = await getDoc(doc(db, 'users', uid));
    const before = Number((cur.exists() ? cur.data() : {}).shards || 0);
    await updateDoc(doc(db, 'users', uid), { shards: before + amt, shards_admin_override_at: new Date().toISOString() });
    logAction('helper_grant_shards', uid, { amount: amt });
    showToast(`💎 +${amt}`);
  };

  // Plus/Pro на N месяцев (0 = бессрочно). Зеркало bulkGrantPremium с произвольным сроком.
  window.grantHelperPlus = async function(uid) {
    const val = await showInputModal({ title: 'Plus на сколько месяцев? (0 = бессрочно)', defaultVal: '1' });
    if (val === null) return;
    const months = parseInt(val); if (isNaN(months) || months < 0) { showToast('Число ≥ 0', 'err'); return; }
    const grantAt = String(Date.now());
    const until = months === 0 ? '0' : String(Date.now() + months * 30 * 24 * 60 * 60 * 1000);
    const target = await resolveAdminVipWriteTarget(uid);
    const writeUid = target.uid || uid;
    await updateDoc(doc(db, 'users', writeUid), {
      'progress.vip_active': 'true',
      'progress.vip_plan': months === 0 ? 'admin_vip' : ('admin_vip_' + months + 'm'),
      'progress.vip_from': grantAt,
      'progress.vip_until': until,
      'progress.vip_admin_override': 'true',
      'progress.vip_admin_grant_at': grantAt,
    });
    logAction('helper_grant_plus', writeUid, { months, until });
    showToast(months === 0 ? '💚 Plus бессрочно' : `💚 Plus на ${months} мес`);
  };
```

> Для наград из полного каталога (`xp_boost`, `chain_shield`, `arena_extra_5` и т.д.)
> уже есть callable `adminGrantReward` (functions/src/admin_grant.ts). Если захочешь
> выпадающий список наград — подключи его как `httpsCallable(functionsUs, 'adminGrantReward')`
> и вызывай `{ uid, type, amount, comment }`.

---

## Деплой после интеграции
1. `firebase deploy --only functions:adminReplyToReport` (проекция в CF).
2. `firebase deploy --only firestore:rules` (после вставки правила top_helpers).
3. Пересборка приложения (новый экран + вход в настройках).
4. Основной путь (LLM + `reply_to_reports.mjs`) работает сразу — скрипт уже пишет борд.
