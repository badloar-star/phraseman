# Для Codex: незакоммиченная правка ломает сборку серверных функций (11.10, 16:40, координатор)

`modules/learning-v2/content/factory_native/factory_native_course_v1.ts` (рабочее дерево, не закоммичено, HEAD b86fc6957 собирается):

```
factory_native_course_v1.ts(527,34): error TS2352: Conversion of type 'Readonly<{ [k: string]: Map<number, string>; }>'
to type 'Readonly<Record<"id"|"es"|"ru"|"en"|"uk"|"pt-BR"|"vi"|"tr"|"pl", ReadonlyMap<number, string>>>' ...
```

Последствие: `firebase deploy --only functions:default:*` падает на predeploy (functions компилирует ../modules), поэтому выкладка любых серверных исправлений из общего дерева заблокирована. Ждут выкладки: spireFinalizeCron, spireZoneWarningCron (4f26e0482).

Просьба: довести файл до компилируемого состояния и закоммитить вместе с манифестом/auxiliary одним коммитом (как договорено), или вернуть промежуточное состояние, которое компилируется.
