# Механический проход Дизайна 05.11 (без правок)

Поиск по app/ и components/ (*.tsx), без dev/preview и без строк с пометками shadow-ok/theme-exempt/guard-ok.

## Толстые рамки (>=1.5/2) вне админки
```
app/mistake_detail.tsx:422:  statSep: { paddingLeft: 16, borderLeftWidth: 0 },
components/CleanOnboarding.tsx:5578:    borderWidth: 1.5,
components/CleanOnboarding.tsx:5653:    borderWidth: 1.5,
components/CleanOnboarding.tsx:5768:    borderWidth: 1.5,
components/CleanOnboarding.tsx:5956:    borderWidth: 2,
components/CleanOnboarding.tsx:6090:    borderLeftWidth: 6,
components/CleanOnboarding.tsx:6091:    borderRightWidth: 6,
components/CleanOnboarding.tsx:6386:    borderWidth: 1.5,
components/lesson_help_theory_data.tsx:122:      style={{ backgroundColor: c.cardBg, borderRadius: 10, borderWidth: 0, borderColor: c.border, borderLeftWidth: 1, borderLeftColor: `${c.roleVerb}99`, pa
components/lesson_help_theory_ui.tsx:142:    <View style={{ marginLeft: 8, marginBottom: 7, paddingLeft: 10, borderLeftWidth: 1, borderLeftColor: `${c.accent}66` }}>
components/lesson_help_theory_ui.tsx:218:                <View key={i} style={{ width: colW, paddingHorizontal: 10, paddingVertical: 11, borderRightWidth: i < numCols - 1 ? 0.5 : 0, borderRightColor: 
components/lesson_help_theory_ui.tsx:227:                  <View key={ci} style={{ width: colW, paddingHorizontal: 10, paddingVertical: 11, borderRightWidth: ci < row.length - 1 ? 0.5 : 0, borderRight
components/PremiumCard.tsx:80:    borderLeftWidth:   0,
components/PremiumCard.tsx:81:    borderRightWidth:  0,
components/premium_celebration/CelebrationSceneViews.tsx:680:  orbRipple: { position: 'absolute', width: 170, height: 170, borderRadius: 85, borderWidth: 1.5 },
components/ui/PrimaryButton.tsx:65:          borderLeftWidth: 0,
components/ui/PrimaryButton.tsx:66:          borderRightWidth: 0,
```

## Цветовые литералы по файлам
```
     64 app/learning-v2/session/[id].tsx
     33 components/CleanOnboarding.tsx
     26 app/learning_v2_session_intro_check.tsx
     10 components/ExamResultPreviewAdminModal.tsx
      3 components/packs/CommunityPackScene.tsx
      3 components/onboarding/ApprovedWelcome.tsx
      2 components/packs/CommunityScene.tsx
      2 components/learning-v2-lab/kimi/primitives.tsx
      1 components/packs/CommunityPackCheckScene.tsx
      1 components/learning-v2-lab/ModeDemoPlayer.tsx
      1 components/dev/DevHubSheet.tsx
      1 app/_layout.tsx
```

adjustsFontSizeToFit: живых использований нет, только комментарии-запреты.
