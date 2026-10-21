# Task packet: возврат из фона по кэшу — сброс кэша Plus, если слушатель Plus не на связи

Governance-ID: TG-B3155DDEC852
Status: Готово
Owner: 5 · ВХОД И АККАУНТ (🟡 11 · Ревизора к 586248557, через координатора)

## Outcome

После 586248557 возврат из фона при свежем восстановлении облака (< 6 ч) делает только лёгкий reload без
invalidatePremiumCache(): доступ Plus приносит слушатель access_projection. Если слушатель в этот момент в повторе
(ошибка, сеть), свежий Plus появился бы только после его переподключения. Теперь в ветке «кэш», если слушатель не на
связи, кэш премиума сбрасывается (как в сетевой ветке), и лёгкий reload пересчитывает доступ.

## Scope

- components/PremiumContext.tsx: `premiumListenerLiveRef` — true после живого снапшота access_projection, false при
  старте/ошибке/очистке подписки; в ветке cache журнал [READ-TTL] с listenerState и invalidatePremiumCache() при
  'not_live'.

## Architecture

Флаг — ref без ре-рендеров. Облако (restoreFromCloud) в ветке кэша по-прежнему не читается.

## Security and privacy

Новых данных нет.

## Technical debt

Сброс кэша при отключённом слушателе может стоить одного пересчёта доступа через RevenueCat/облачную проверку премиума
на возврате — это редкая ветка (слушатель в повторе), а не каждый возврат.

## Verification

Тесты PremiumContext/возврата из фона через светофор; разбор .tsx сборщиком.

## Rollback

`git revert <hash>`.
