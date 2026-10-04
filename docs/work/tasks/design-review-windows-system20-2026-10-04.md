# Task packet: окна «Оценить приложение» по кадру system_20 (ReviewPromptModal + VipSurveyReviewPromptModal)

Governance-ID: TG-F42D1E0783A1
Status: In progress
Owner: сессия «2 · Дизайн» (контур 2, LANES.md); ReviewPromptModal — сирота бывшего исполнителя координатора
Related epic/enabler: гейт «приложение = макет», system.html

## Outcome

Общее окно отзыва и окно отзыва после опроса Plus выглядят как кадр system_20: шторка, кикер, заголовок,
плашка серии (у общего окна), белая кнопка магазина, тёмная капсула «Не сейчас». Тексты свои (решение
владельца 04.10: у VIP-окна — про Plus).

## Scope

In scope: `components/ReviewPromptModal.tsx`, `components/VipSurveyReviewPromptModal.tsx` — только вид.
Out of scope: логика показа (когда и кому), тексты вариантов в `app/review_utils.ts`, запись кликов VIP.

## Architecture

No architecture change: стили и разметка внутри двух окон.

## Security and privacy

Не затрагивает данные: те же вызовы магазина и отметки «оценил».

## Technical debt

- Accept temporarily: у общего окна оставлен подзаголовок (в кадре 20 его нет) — без него контекстный
  заголовок не просит отзыв; владелец — координатор, вынесено в журнал паритета.
- Accept temporarily: окно серии по сторожу остаётся центральной панелью, а не шторкой.

## Verification

Сторожа `review_prompt_*`, `typography_two_sizes_ratchet`, `admin_vip_survey_*`; склейка «макет | эмулятор».

## Rollback

`git revert` коммита.
