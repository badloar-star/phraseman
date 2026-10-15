# Task packet: «не DELE/SIELE» на экране итогового экзамена любого курса — нейтральная формулировка (9 языков)

Governance-ID: TG-7BA67E698933
Status: In progress
Owner: сессия «Специалист по переводам» (координатор 15.10, находка Сверки на /exam английского курса)
Related epic/enabler: R07 — языки курса не смешиваются

## Outcome

Описание итогового экзамена (`app/exam.tsx`, ExamHero) не называет испанские экзамены DELE/SIELE в английском (и любом другом) курсе:
нейтрально «это проверка внутри приложения, а не официальный экзамен» на 9 языках интерфейса.

## Scope

In scope: `app/exam.tsx` — одна строка `message` (9 языков). Проверено: других видимых упоминаний DELE/SIELE/Goethe/CILS/IELTS/TOEFL
нет; DELF есть только в программе французского курса (`app/french_lesson_curriculum.ts`) — там уместно.
Out of scope: программы курсов.

## Architecture

No architecture change: замена текста.

## Security and privacy

Не применимо.

## Technical debt

- Одно описание экзамена на все курсы — Accept temporarily: если владелец захочет называть экзамен своего языка (DELF/Goethe/CILS/IELTS),
  нужен текст по языку обучения; владелец — Ядро, после выпуска.

## Verification

Тесты экзамена и сторожа i18n через slot.sh.

## Rollback

`git revert` коммита.
