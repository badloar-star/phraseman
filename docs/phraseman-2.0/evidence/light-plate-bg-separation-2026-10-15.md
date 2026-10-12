# Светлая тема: низ плашки «Тени» отделён от фона (ΔL* ≥ 3) — «было → стало» (15.10, журнал п.69)

Правка: `constants/liquidGlassSurfaceRoles.ts` (`separatedFromBackground`: низ плашки `plateFillTo` затемняется в сторону текста темы шагом 2 % ровно до разницы светлоты L* ≥ 3 с КАЖДЫМ из тонов фона bgTop/bg/bgBottom; оттенок сохраняется) и `components/home/v2/homePlate.ts` (Главная, светлое: тень плашек ×1,35 по альфе; заливка 50 % и «Сегодня» без фона не тронуты — приказ владельца). Изменились только строки ниже (поле `plateFillTo`); в тёмной теме и у остальных токенов изменений нет. Строк: 97.

| Тема | Оформление | Интенсивность | Было | Стало |
|---|---|---|---|---|
| graphite | светлое | 0 | #EDEFF2 | #E0E2E5 |
| graphite | светлое | 0.25 | #EDEFF2 | #E0E2E5 |
| graphite | светлое | 0.5 | #EDEFF2 | #E0E2E5 |
| graphite | светлое | 0.75 | #EBEEF2 | #DEE1E5 |
| graphite | светлое | 1 | #E8EDF1 | #DBE0E4 |
| polar | светлое | 0 | #EBF0F4 | #DEE3E7 |
| polar | светлое | 0.25 | #EBF0F4 | #DEE3E7 |
| polar | светлое | 0.5 | #EBF0F4 | #DEE3E7 |
| polar | светлое | 0.75 | #E7EFF5 | #DAE2E8 |
| polar | светлое | 1 | #E3EDF5 | #D7E0E8 |
| slate | светлое | 0 | #EBEFF7 | #DEE2EA |
| slate | светлое | 0.25 | #EBEFF7 | #DEE2EA |
| slate | светлое | 0.5 | #EBEFF7 | #DEE2EA |
| slate | светлое | 0.75 | #E7EEF9 | #DAE1EC |
| slate | светлое | 1 | #E3EDFB | #D2DCEA |
| ink | светлое | 0 | #EEEFF3 | #E1E2E6 |
| ink | светлое | 0.25 | #EEEFF3 | #E1E2E6 |
| ink | светлое | 0.5 | #EEEFF3 | #E1E2E6 |
| ink | светлое | 0.75 | #ECEDF4 | #DFE0E7 |
| ink | светлое | 1 | #EAEBF5 | #DDDEE8 |
| lavender | светлое | 0 | #F1EEF6 | #E4E1E9 |
| lavender | светлое | 0.25 | #F1EEF6 | #E4E1E9 |
| lavender | светлое | 0.5 | #F1EEF6 | #E4E1E9 |
| lavender | светлое | 0.75 | #F1EBF7 | #E4DEEA |
| lavender | светлое | 1 | #F0E8F8 | #DFD7E7 |
| iris | светлое | 0 | #F2EEF1 | #E5E1E4 |
| iris | светлое | 0.25 | #F2EEF1 | #E5E1E4 |
| iris | светлое | 0.5 | #F2EEF1 | #E5E1E4 |
| iris | светлое | 0.75 | #F2EBF1 | #E5DEE4 |
| iris | светлое | 1 | #F2E8F0 | #E5DBE3 |
| rose | светлое | 0 | #F3EEEE | #E6E1E1 |
| rose | светлое | 0.25 | #F3EEEE | #E6E1E1 |
| rose | светлое | 0.5 | #F3EEEE | #E6E1E1 |
| rose | светлое | 0.75 | #F3EBEB | #E6DEDE |
| rose | светлое | 1 | #F3E8E8 | #E6DBDB |
| terracotta | светлое | 0 | #F6EDEA | #E9E0DD |
| terracotta | светлое | 0.25 | #F6EDEA | #E9E0DD |
| terracotta | светлое | 0.5 | #F6EDEA | #E9E0DD |
| terracotta | светлое | 0.75 | #F8EAE7 | #EBDDDA |
| terracotta | светлое | 1 | #F9E6E2 | #ECD9D6 |
| taupe | светлое | 0 | #F3EEEB | #E6E1DE |
| taupe | светлое | 0.25 | #F3EEEB | #E6E1DE |
| taupe | светлое | 0.5 | #F3EEEB | #E6E1DE |
| taupe | светлое | 0.75 | #F3ECE7 | #E6DFDA |
| taupe | светлое | 1 | #F3EAE3 | #E6DDD7 |
| olive | светлое | 0 | #F3EFE9 | #E6E2DC |
| olive | светлое | 0.25 | #F3EFE9 | #E6E2DC |
| olive | светлое | 0.5 | #F3EFE9 | #E6E2DC |
| olive | светлое | 0.75 | #F3EDE3 | #E6E0D6 |
| olive | светлое | 1 | #F3EADD | #E6DDD1 |
| sage | светлое | 0 | #E9F2ED | #DCE5E0 |
| sage | светлое | 0.25 | #E9F2ED | #DCE5E0 |
| sage | светлое | 0.5 | #E9F2ED | #DCE5E0 |
| sage | светлое | 0.75 | #E4F2EA | #D7E5DD |
| sage | светлое | 1 | #DFF1E6 | #D3E4D9 |
| eucalyptus | светлое | 0 | #E9F1F0 | #DCE4E3 |
| eucalyptus | светлое | 0.25 | #E9F1F0 | #DCE4E3 |
| eucalyptus | светлое | 0.5 | #E9F1F0 | #DCE4E3 |
| eucalyptus | светлое | 0.75 | #E3F1EF | #D6E4E2 |
| eucalyptus | светлое | 1 | #DDF1EE | #D1E4E1 |
| marine | светлое | 0 | #E9F1F3 | #DCE4E6 |
| marine | светлое | 0.25 | #E9F1F3 | #DCE4E6 |
| marine | светлое | 0.5 | #E9F1F3 | #DCE4E6 |
| marine | светлое | 0.75 | #E4F0F3 | #D7E3E6 |
| marine | светлое | 1 | #DFEFF3 | #D3E2E6 |
| grad_aurora | светлое | 0 | #F5F5F6 | #ECECED |
| grad_aurora | светлое | 0.25 | #F5F5F6 | #E3E3E4 |
| grad_aurora | светлое | 0.5 | #F5F5F6 | #DEDEDF |
| grad_iris | светлое | 0 | #F5F5F6 | #ECECED |
| grad_iris | светлое | 0.25 | #F5F5F6 | #E7E7E8 |
| grad_iris | светлое | 0.5 | #F5F5F6 | #DEDEDF |
| grad_magma | светлое | 0 | #F5F5F6 | #ECECED |
| grad_magma | светлое | 0.25 | #F5F5F6 | #E3E3E4 |
| grad_magma | светлое | 0.5 | #F5F5F6 | #DEDEDF |
| grad_magma | светлое | 0.75 | #F5F5F6 | #D5D5D6 |
| grad_midnight | светлое | 0 | #F5F5F6 | #ECECED |
| grad_midnight | светлое | 0.25 | #F5F5F6 | #E3E3E4 |
| grad_midnight | светлое | 0.5 | #F5F5F6 | #DEDEDF |
| grad_champagne | светлое | 0 | #F5F5F6 | #ECECED |
| grad_champagne | светлое | 0.25 | #F5F5F6 | #E7E7E8 |
| grad_champagne | светлое | 0.5 | #F5F5F6 | #E3E3E4 |
| grad_champagne | светлое | 0.75 | #F5F5F6 | #DEDEDF |
| grad_jade | светлое | 0 | #F5F5F6 | #ECECED |
| grad_jade | светлое | 0.25 | #F5F5F6 | #E3E3E4 |
| grad_orchid | светлое | 0 | #F5F5F6 | #ECECED |
| grad_orchid | светлое | 0.25 | #F5F5F6 | #E3E3E4 |
| grad_ice | светлое | 0 | #F5F5F6 | #ECECED |
| grad_ice | светлое | 0.25 | #F5F5F6 | #E7E7E8 |
| grad_ice | светлое | 0.5 | #F5F5F6 | #E3E3E4 |
| grad_ice | светлое | 0.75 | #F5F5F6 | #DEDEDF |
| grad_ice | светлое | 1 | #F5F5F6 | #DADADB |
| grad_coral | светлое | 0 | #F5F5F6 | #ECECED |
| grad_coral | светлое | 0.25 | #F5F5F6 | #E7E7E8 |
| grad_coral | светлое | 0.5 | #F5F5F6 | #DEDEDF |
| grad_lilac | светлое | 0 | #F5F5F6 | #ECECED |
| grad_lilac | светлое | 0.25 | #F5F5F6 | #E7E7E8 |
| grad_lilac | светлое | 0.5 | #F5F5F6 | #E3E3E4 |

## Побочное: приглушённый текст (mutedText) в светлом

Его цвет подбирается по тонам плашки (≥ 4,5), поэтому затемнённый низ плашки чуть сдвинул его в 34 комбинациях (читаемость сохранена, тесты `theme_muted_text_aa` зелёные).

| Тема | Интенсивность | Было | Стало |
|---|---|---|---|
| graphite | 0 | #616569 | #5C6064 |
| graphite | 0.25 | #616569 | #5C6064 |
| graphite | 0.5 | #616569 | #5C6064 |
| ink | 0 | #63646B | #5E5F67 |
| ink | 0.25 | #63646B | #5E5F67 |
| ink | 0.5 | #63646B | #5E5F67 |
| eucalyptus | 0 | #596866 | #556361 |
| eucalyptus | 0.25 | #596866 | #556361 |
| eucalyptus | 0.5 | #596866 | #556361 |
| marine | 0 | #5A676A | #566266 |
| marine | 0.25 | #5A676A | #566266 |
| marine | 0.5 | #5A676A | #566266 |
| grad_aurora | 0.25 | #696970 | #606066 |
| grad_aurora | 0.5 | #65656B | #606066 |
| grad_iris | 0.25 | #696970 | #65656B |
| grad_iris | 0.5 | #696970 | #606066 |
| grad_magma | 0.25 | #696970 | #606066 |
| grad_magma | 0.5 | #65656B | #606066 |
| grad_magma | 0.75 | #606066 | #5B5B62 |
| grad_midnight | 0.25 | #696970 | #606066 |
| grad_midnight | 0.5 | #65656B | #606066 |
| grad_champagne | 0.25 | #696970 | #65656B |
| grad_champagne | 0.5 | #696970 | #606066 |
| grad_champagne | 0.75 | #65656B | #606066 |
| grad_jade | 0.25 | #696970 | #606066 |
| grad_orchid | 0.25 | #696970 | #606066 |
| grad_ice | 0.25 | #696970 | #65656B |
| grad_ice | 0.5 | #696970 | #606066 |
| grad_ice | 0.75 | #65656B | #606066 |
| grad_ice | 1 | #65656B | #5B5B62 |
| grad_coral | 0.25 | #696970 | #65656B |
| grad_coral | 0.5 | #65656B | #606066 |
| grad_lilac | 0.25 | #696970 | #65656B |
| grad_lilac | 0.5 | #696970 | #606066 |
