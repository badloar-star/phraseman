# UI-SPEC: Раздел «ИИ-диалоги» (Wave 2)

> Дата: 2026-06-08. Извлечено 5 агентами из реального кода + **верифицировано вручную** (см. поправки ниже).
> Требование владельца: дизайн брать СТРОГО из реальных экранов (меню уроков / экран урока / trainer-сессия / словарь / теория). Параметры списывать 1:1, не вводить новые. Прежний HTML-макет (`ai_dialogue_ui_mockup_2026-06-08.html`) — ТОЛЬКО схема расположения блоков, НЕ источник стилей.

## ⚠️ ПОПРАВКИ ПОСЛЕ ВЕРИФИКАЦИИ КОДА (приоритет над всем ниже)

Проверено по `app/(tabs)/lessons.tsx`, `app/trainer_phrases_session.tsx`, `app/lesson1.tsx`, `components/ThemeContext.tsx`, `hooks/use-audio.ts`:

1. **`ds` НЕ существует.** Реальная деструктуризация везде: `const { theme: t, f, themeMode } = useTheme();` — поля `ds` НЕТ. Радиусы/отступы в коде — **прямые числа** (`borderRadius: 16`, `14`, `10`, `2`), часто с веткой `isCompassTheme ? X : Y`. Игнорировать любые упоминания `ds.radius.*` / `ds.spacing.*` — писать числами как в оригинале.
2. **`useTheme()` → `{ theme: t, f, themeMode }`** (подтверждено: lessons.tsx:221, trainer:91/250/343, lesson1:1268).
3. **`import ScreenGradient from '../components/ScreenGradient'`** — default import, путь `../components/` из `app/` (lesson1:26, trainer:22).
4. **`useAudio()` → `{ speak, stop }`**, `speak(text: string, rate?: number, opts?)` (use-audio.ts:74,95,145). Авто-нормализация языка встроена.
5. **Импорты для переиспользования (точные пути из `app/`):**
   - `import EnergyBar from '../../components/EnergyBar';` (из таба) / `'../components/EnergyBar'` (из app/)
   - `import { hapticTap } from '../../hooks/use-haptics';` / `'../hooks/use-haptics'`
   - `AddToFlashcard` из `'../components/AddToFlashcard'`
6. **Compass-тема ветвится явно** почти в каждом стиле: `isCompassTheme ? COMPASS_RICH.* : t.*` и радиус `isCompassTheme ? 9/10/8 : 16/14/10`. При копировании фрагментов — сохранять эту ветку, не выкидывать.

---

## 1. Дизайн-токены (canonical)

Источник: `constants/theme.ts`, `components/ThemeContext.tsx`, `components/ScreenGradient.tsx`. Все цвета — через `const { theme: t, f, themeMode } = useTheme()`. **Не хардкодить**, кроме явных исключений.

### Цвета (тема DARK — референс)
| Токен | Hex | Назначение |
|---|---|---|
| `t.bgPrimary` | `#07100A` | фон экрана (под градиентом) |
| `t.bgCard` | `#152019` | карточки, кнопки, тайлы |
| `t.bgSurface` | `#1D2D23` | прогресс-трек, disabled-фон |
| `t.textPrimary` | `#F0F7F2` | основной текст |
| `t.textSecond` | `#58CC89` | акцентный текст, иконки кнопок |
| `t.textMuted` | `#8AB49A` | вторичный текст, переводы |
| `t.correct` / `t.correctBg` | `#47C870` / `rgba(71,200,112,0.16)` | верный/выбранный |
| `t.wrong` / `t.wrongBg` | `#F05454` / `rgba(240,84,84,0.12)` | неверный |
| `t.accent` | `#47C870` | акцент |
| `t.gold` | `#FFC800` | очки/score |
| `t.border` | `rgba(255,255,255,0.07)` | бордеры (0.5px) |

### Разрешённые хардкоды (есть в оригинале)
`#4A9EFF` (primary CHECK-кнопка), `#40C080` (progress fill), `#4A90E2` (scroll thumb), `COMPASS_RICH.champagne #F2C48D` (compass progress). Больше новых hex — НЕ вводить. Цвет категории сценария — брать из существующих `LESSON_LEVEL_PALETTES` / `PALETTE_CORAL`.

### Радиусы (прямыми числами, как в коде)
карточка/тайл `12` · translation/check-кнопка `16` · option-кнопка `14` · result/table `10` · progress-bar `2` · back-кнопка меню `18` · back-пилюля сессии `20` · иконочный круг `36`. Compass-ветка: `9/10/8`.

### Отступы (числами)
xs `4` · sm `8` · md `12` · lg `16` · xl `24`. Хедер: `paddingVertical:12, paddingHorizontal:14/16`. ScrollView: `paddingBottom:40` (меню) / `padding:16` (сессия).

### Типографика (`f.*`, Inter)
`f.h1:22, f.h2:18, f.h3:16, f.body:14, f.bodyLg:16, f.sub:14, f.caption:13, f.label:12, f.numLg:28, f.numMd:20`.
Веса: header title `700`, секция `800`, option `700`, button(check) `800`, tile/label `600`, score `700`, CEFR `900`.
**50+:** `lineHeight = Math.round(f.body * 1.55)`, `maxFontSizeMultiplier` 1.0–1.2.

### Тени
`getVolumetricShadow(themeMode, t, level)` / `getCardShadow(themeMode, t.glow)` / `compassShadow(level)` — готовые функции, не вручную.

---

## 2. Обёртка экрана (КАЖДЫЙ ИИ-экран)

```jsx
<ScreenGradient>
  <SafeAreaView style={{ flex: 1 }}>
    {/* Header */}
    {/* ScrollView */}
  </SafeAreaView>
</ScreenGradient>
```
`ScreenGradient` — тема-зависимый, без пропов. На планшетах — `ContentWrap`. **Не вкладывать ScreenGradient в ScreenGradient.**

---

## 3. ИИ-меню (вход) — копия МЕНЮ УРОКОВ (`app/(tabs)/lessons.tsx`)

### Хедер (дословно lessons.tsx:453-462)
```jsx
<View style={{ flexDirection:'row', alignItems:'center', paddingVertical:12, paddingHorizontal:14, paddingBottom:6 }}>
  <TouchableOpacity style={{ width:36, height:36, borderRadius:18, backgroundColor:t.bgCard, borderWidth:0.5, borderColor:t.border, justifyContent:'center', alignItems:'center', marginRight:12, flexShrink:0 }} onPress={()=>{ hapticTap(); router.back(); }}>
    <Ionicons name="chevron-back" size={20} color={t.textPrimary}/>
  </TouchableOpacity>
  <View style={{ flex:1, minWidth:0, justifyContent:'center' }}>
    <Text style={{ color:t.textPrimary, fontSize:f.numMd, fontWeight:'700' }} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>ИИ-диалоги</Text>
  </View>
  <View style={{ flexShrink:0 }}><EnergyBar size={30}/></View>
</View>
```

### Заголовок группы (как CEFR header, lessons.tsx:483-506)
Круг 34×34 r17 `backgroundColor:headerWash, borderColor:headerAccent`, буква категории `f.label/900`; рядом название `f.body/800`. Паддинги `paddingHorizontal:18, paddingTop:18, paddingBottom:7, gap:10`.

### Карточка сценария (анатомия Lesson Card, lessons.tsx:796-848)
- Wrapper `Animated.View`: `marginTop:5, marginHorizontal:14, borderRadius:16`, тень как у lesson card, `transform:[{scale}]`.
- `TouchableOpacity activeOpacity={0.82}`: `height:72, borderRadius:16, overflow:'hidden'`.
- Фон `SafeLinearGradient` `colors={[darkenHex(bg,0.52), darkBg, darkenHex(bg,0.38)]}` `start={{x:0,y:0}} end={{x:1,y:0}}` — палитра из `LESSON_LEVEL_PALETTES`.
- Progress-fill (если есть) — `LinearGradient` absolute `width:'{pct}%'`.
- Контент `flex:1, justifyContent:'center', paddingHorizontal:18`. Accent-бар `height:2, opacity:isCurrent?0.78:0.45`.
- Тексты: мета `f.label/700/letterSpacing:0.8`, название `f.body/700`. Иконка справа `lock-closed`/`checkmark`/`%`.
> Если рендер карточки урока вынесен в компонент — переиспользовать его. Если инлайн — скопировать фрагмент дословно, заменив данные.

---

## 4. Экран ИИ-диалога (сессия) — копия `trainer_phrases_session.tsx` + словаря

### Хедер (trainer:468-487)
```jsx
<View style={{ flexDirection:'row', alignItems:'center', justifyContent:'space-between', paddingHorizontal:16, paddingVertical:12 }}>
  <TouchableOpacity onPress={onBack} style={{ padding:4 }}><Ionicons name="chevron-back" size={28} color={t.textPrimary}/></TouchableOpacity>
  <Text style={{ fontWeight:'700', color:t.textPrimary, fontSize:f.body }}>Диалог</Text>
  <Text style={{ color:t.textMuted, fontSize:f.caption }}>{turn+1} / {total}</Text>
</View>
```

### Progress bar (trainer:524 + 490-492)
```jsx
<View style={{ height:4, borderRadius:2, marginHorizontal:16, overflow:'hidden', backgroundColor:t.bgSurface }}>
  <View style={{ height:'100%', borderRadius:2, backgroundColor: themeMode==='compass'?COMPASS_RICH.champagne:'#40C080', width:`${progress*100}%` }}/>
</View>
```

### Реплика-карточка (translation-box trainer:144 + словарь)
```jsx
<Animated.View style={{ opacity:enterOpacity, transform:[{translateY:enterY},{scale:enterScale}] }}>
  <View style={{ backgroundColor:t.bgCard, borderRadius:16, padding:16, borderWidth:0.5, borderColor:t.border, marginBottom:10 }}>
    <TouchableOpacity onPress={()=>speak(replicaEn, undefined, { language:'en-US' })} activeOpacity={0.6}
      style={{ flexDirection:'row', alignItems:'center', gap:8 }}>
      <Text style={{ color:t.textPrimary, fontSize:f.bodyLg, fontWeight:'700', flex:1, lineHeight:Math.round(f.bodyLg*1.45) }} maxFontSizeMultiplier={1.2}>{replicaEn}</Text>
      <Ionicons name="volume-medium-outline" size={20} color={t.textSecond}/>
    </TouchableOpacity>
    {showTranslation && <Text style={{ color:t.textMuted, fontSize:f.sub, marginTop:4, lineHeight:Math.round(f.sub*1.45) }} maxFontSizeMultiplier={1.2}>{replicaRu}</Text>}
  </View>
</Animated.View>
```
Озвучка — строго `useAudio().speak`. «Я / собеседник» БЕЗ новых цветов: реплика юзера — `backgroundColor:t.bgSurface` (вместо bgCard) и/или сдвиг `alignSelf/marginLeft`. Сохранить в карточки — `AddToFlashcard` (`size:18`, props `en,ru,uk,source,sourceId`).
Анимация входа (trainer:682-710): `opacity 0→1, translateY 10→0, scale 0.985→1, duration:250, Easing.out(Easing.cubic), useNativeDriver:true`.

### Кнопки-подсказки (option-стиль, trainer:323-334)
```jsx
<TouchableOpacity onPress={()=>onPick(option)} activeOpacity={0.82}
  style={{ borderRadius:14, borderWidth:1.5, paddingVertical:14, paddingHorizontal:16, alignItems:'center', backgroundColor:t.bgCard, borderColor:t.border, marginBottom:10 }}>
  <Text style={{ color:t.textPrimary, fontSize:f.body, fontWeight:'700' }}>{option}</Text>
</TouchableOpacity>
```

### Action-кнопка «Отправить» (check-стиль, trainer:213-238)
```jsx
<TouchableOpacity onPress={onSend} disabled={!isReady} activeOpacity={0.82}
  style={{ borderRadius:16, paddingVertical:14, alignItems:'center', marginTop:8, backgroundColor:isReady?'#4A9EFF':t.bgSurface, opacity:isReady?1:0.4 }}>
  <Text style={{ color:'#fff', fontWeight:'800', fontSize:f.body }}>Отправить</Text>
</TouchableOpacity>
```

---

## 5. Экран разбора — копия `lesson_complete` / session_report + теории (`lesson_help.tsx`)

Обёртка как §2. Score через `t.gold` (`★{score}`, weight 700). Блоки разбора — как блоки теории:
- Удачно → Tip-блок: `backgroundColor:t.successBg, borderRadius:10, padding:14, borderWidth:1, borderColor:t.success+'66', marginVertical:9, flexRow gap:10`, иконка `bulb-outline` 18.
- Ошибка → Warn-блок: `t.warningBg, borderRadius:10, padding:14, borderColor:t.warning+'66'`, иконка `warning-outline` 18.
- «Как лучше сказать» — Example-блок: `marginLeft:8, paddingLeft:10, borderLeftWidth:2, borderLeftColor:t.accent+'66'`, EN `f.body/800/primary` + перевод `f.sub/muted`, озвучка `useAudio().speak`.
- Текст: `lineHeight:Math.round(f.body*1.55)`, `maxFontSizeMultiplier:1.2`.
Кнопки финала: primary `#4A9EFF` (check-стиль) + вторичная `bgCard`+border (`borderRadius:14, paddingVertical:13, borderWidth:1, flexRow gap:8`, иконка 18 `t.textSecond`, текст `f.bodyLg/600`).

---

## 6. Чек-лист соответствия (review-гейт перед merge)

- [ ] Обёртка = `ScreenGradient`→`SafeAreaView flex:1`, нет голого View с фоном.
- [ ] Деструктуризация ровно `{ theme:t, f, themeMode }` — НИКАКОГО `ds`.
- [ ] Цвета из `t.*`; хардкод только `#4A9EFF`/`#40C080`/`#4A90E2`/`COMPASS_RICH.champagne`.
- [ ] Шрифт только Inter через `f.*`, никаких сырых `fontSize`.
- [ ] Радиусы из набора {2,10,12,14,16,18,20,36}, compass-ветка `9/10/8`.
- [ ] Хедер меню = lessons.tsx:453-462 дословно; хедер сессии = trainer:468-487.
- [ ] Progress-bar height 4, r2, bgSurface track, fill `#40C080`/champagne.
- [ ] Озвучка = `useAudio().speak`, иконка `volume-medium-outline` 20 `t.textSecond`.
- [ ] `lineHeight ≥ ×1.45–1.55` + `maxFontSizeMultiplier` 1.0–1.2 на текстах.
- [ ] Тени через готовые функции. Gold/Compass без отдельных хардкод-веток (через `themeMode`/`isCompassTheme` как в оригинале).
- [ ] `EnergyBar`/`AddToFlashcard`/`hapticTap`/`useAudio` переиспользованы, не переписаны.

## 7. Что НЕ делать
❌ Новые hex / новые радиусы вне набора / новые компоненты-обёртки. ❌ Отклонения от токенов «ради красоты». ❌ Смешивать два стиля хедера на одном экране. ❌ Тени/градиенты вручную. ❌ HTML-макет как источник стилей (только схема расположения). ❌ ScreenGradient в ScreenGradient. ❌ Платный/серверный speech (только on-device TTS через useAudio).
