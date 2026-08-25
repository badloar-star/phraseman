#!/usr/bin/env python3
"""Build the Phraseman UI sound-family prompt book as a deterministic PDF."""

from __future__ import annotations

import argparse
import re
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (
    BaseDocTemplate,
    CondPageBreak,
    Frame,
    KeepTogether,
    PageBreak,
    PageTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
)


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "output" / "pdf" / "phraseman_ui_sound_families_2026-08-25.pdf"

INK = colors.HexColor("#111111")
MUTED = colors.HexColor("#6F6F6B")
RULE = colors.HexColor("#E5E2DA")
PAPER = colors.HexColor("#FFFFFF")
SOFT = colors.HexColor("#F7F5EF")
ACCENT = colors.HexColor("#D9A321")
ACCENT_SOFT = colors.HexColor("#F7EAC5")
ACCENT_DARK = colors.HexColor("#8C6500")


@dataclass(frozen=True)
class Moment:
    sound_id: str
    title: str
    trigger: str
    duration: str
    volume: str
    prompts: tuple[str, str, str]

    @property
    def stable_id(self) -> str:
        return re.sub(r"_v\d+$", "", self.sound_id)


@dataclass(frozen=True)
class Family:
    number: int
    title: str
    subtitle: str
    moments: tuple[Moment, ...]


def moment(
    sound_id: str,
    title: str,
    trigger: str,
    duration: str,
    volume: str,
    a: str,
    b: str,
    c: str,
) -> Moment:
    return Moment(sound_id, title, trigger, duration, volume, (a, b, c))


FAMILIES: tuple[Family, ...] = (
    Family(1, "Контактные поверхности", "6 звуков - базовый отклик любой собственной кнопки приложения", (
        moment(
            "pm_ui_press_primary_v1", "Главная CTA", "Пользователь нажал доступную главную кнопку и действие принято.", "0.14 с", "0.16",
            "pm_ui_press_primary - premium interface contact for the main call-to-action in a language-learning app. One soft celesta key with a muted felt body and an immediate clean stop. 140 milliseconds, mono, dry, confident but extremely light, no beep, no tail.",
            "pm_ui_press_primary - warm tactile press for a large primary mobile button. A rounded harp harmonic and tiny pizzicato reinforcement land together like a polished keycap. 140 milliseconds, mono, friendly, repeatable, no arcade chirp and no reverb.",
            "pm_ui_press_primary - cinematic micro-impact for committing a primary action. A faint warm string pulse with a crystalline edge appears and vanishes at once. 140 milliseconds, mono, controlled, premium weight without drama, no sub hit and no long decay.",
        ),
        moment(
            "pm_ui_press_secondary_v1", "Вторичная кнопка", "Принята вторичная, текстовая или спокойная вспомогательная команда.", "0.12 с", "0.13",
            "pm_ui_press_secondary - minimal interface contact for a secondary action. One high muted celesta touch with nearly all attack softened. 120 milliseconds, mono, dry, quieter and thinner than the primary press, designed for constant repetition, no synthetic click.",
            "pm_ui_press_secondary - gentle warm tap for a secondary mobile button. A tiny damped harp pluck with a soft wooden body, stopping immediately. 120 milliseconds, mono, tidy and unobtrusive, no cartoon pop and no ringing tail.",
            "pm_ui_press_secondary - refined cinematic micro-contact for a supporting action. A whisper of pizzicato string and air, barely tonal, ending instantly. 120 milliseconds, mono, elegant and restrained, clearly subordinate to a primary CTA.",
        ),
        moment(
            "pm_ui_press_icon_v1", "Иконка", "Нажата компактная иконка: закрыть, меню, информация, избранное или служебное действие.", "0.10 с", "0.11",
            "pm_ui_press_icon - ultra-short premium UI contact for a compact icon button. One dry glass harmonic tick, rounded at the top and cut cleanly. 100 milliseconds, mono, very quiet, mobile-speaker safe, no metallic ping and no reverb.",
            "pm_ui_press_icon - tiny warm icon tap in a polished learning app. A muted celesta fleck with a soft felt transient. 100 milliseconds, mono, playful only in texture, never chirpy, pleasant across hundreds of uses.",
            "pm_ui_press_icon - cinematic pinpoint contact for a small icon control. A microscopic crystalline spark with a breath of air and zero tail. 100 milliseconds, mono, expensive, discreet, no bass and no trailer-style impact.",
        ),
        moment(
            "pm_ui_press_card_v1", "Карточка или строка", "Нажатие по карточке, плитке раздела или целой строке открывает подробности.", "0.16 с", "0.14",
            "pm_ui_press_card - clean interface press for opening a full card or list row. A soft low harp harmonic gives a slightly wider tactile body than a button tap, then stops. 160 milliseconds, mono, dry, calm, no page whoosh.",
            "pm_ui_press_card - warm card-contact cue for a mobile learning app. A muted pizzicato note with a light paper-like touch suggests a panel becoming active. 160 milliseconds, mono, friendly and physical, no cartoon flap.",
            "pm_ui_press_card - cinematic micro-weight for selecting a content card. A restrained string body with a faint glass edge settles immediately. 160 milliseconds, mono, premium and spacious without an audible tail or transition sweep.",
        ),
        moment(
            "pm_ui_press_chip_v1", "Чип или фильтр", "Выбран компактный чип, фильтр, тег или маленький режим.", "0.10 с", "0.11",
            "pm_ui_press_chip - precise micro cue for selecting a compact chip or filter. One dry muted pizzicato point with a softened pitch centre. 100 milliseconds, mono, near-subliminal, clean enough for rapid repeated filtering, no clicky plastic tone.",
            "pm_ui_press_chip - tiny warm chip tap. A soft celesta droplet damped the instant it sounds, with a slightly rounded wooden undertone. 100 milliseconds, mono, playful but mature, no arcade blip.",
            "pm_ui_press_chip - cinematic speck of contact for a compact filter. A faint glass grain with almost no pitch and no decay. 100 milliseconds, mono, delicate, premium, heard as texture rather than notification.",
        ),
        moment(
            "pm_ui_disabled_v2", "Недоступный элемент", "Пользователь коснулся заблокированного или временно недоступного элемента.", "0.20 с", "0.16",
            "pm_ui_disabled - soft interface cue for touching an unavailable control. One low muted string contact with no upward resolution, damped immediately. 200 milliseconds, mono, dry, inert and respectful, communicating no action without scolding, no buzzer.",
            "pm_ui_disabled - gentle inactive-button response. A low padded harp note with a closed wooden body and no lift. 200 milliseconds, mono, harmless, quiet, never comic and never punitive.",
            "pm_ui_disabled - cinematic dead contact on a locked control. A restrained low woodwind breath and muted felt thud end without resolution. 200 milliseconds, mono, controlled, kind, no alarm, no failure sting and no sub boom.",
        ),
    )),
    Family(2, "Навигация", "4 звука - направление и масштаб перехода без дублирования нажатия", (
        moment(
            "pm_nav_tab_switch_v2", "Смена главной вкладки", "Активная вкладка нижней навигации действительно изменилась.", "0.20 с", "0.13",
            "pm_nav_tab_switch - near-subliminal interface cue for switching a main app tab. One high celesta note slides a tiny step sideways in pitch and stops. 200 milliseconds, mono, dry, extremely repeatable, quieter than every semantic sound.",
            "pm_nav_tab_switch - warm navigation detent for moving between main tabs. A muted pizzicato touch followed by a tiny neighbouring note. 200 milliseconds, mono, light and friendly, no whoosh and no melody.",
            "pm_nav_tab_switch - cinematic micro-shift between adjacent app spaces. A faint glass harmonic crosses a narrow stereo-like contour while remaining mono, then vanishes. 200 milliseconds, controlled, airy, no tail.",
        ),
        moment(
            "pm_nav_forward_v1", "Переход вперёд", "Новый полноэкранный маршрут принят и начинает открываться.", "0.24 с", "0.15",
            "pm_nav_forward - precise premium interface cue for committing navigation to a new full screen. Two very soft celesta notes step upward, the second shorter. 240 milliseconds, mono, dry, directional without sounding successful or celebratory.",
            "pm_nav_forward - warm forward-step cue in a mobile learning app. A light harp pluck rises to a muted pizzicato landing. 240 milliseconds, mono, tidy and optimistic, no transition whoosh.",
            "pm_nav_forward - cinematic micro-advance between screens. A restrained string breath moves upward into a tiny crystalline point. 240 milliseconds, mono, elegant, fast decay, no sweeping air effect.",
        ),
        moment(
            "pm_nav_back_v2", "Возврат назад", "Пользователь вернулся на предыдущий полноэкранный маршрут.", "0.24 с", "0.14",
            "pm_nav_back - minimal interface cue for returning to the previous screen. Two soft celesta notes step downward, mirroring the forward cue and ending immediately. 240 milliseconds, mono, dry, directional, calm, no failure meaning.",
            "pm_nav_back - warm back-step cue for mobile navigation. A muted harp harmonic falls gently into a lower felt note. 240 milliseconds, mono, friendly and unobtrusive, no reverse whoosh.",
            "pm_nav_back - cinematic micro-retreat between screens. A faint string breath settles downward with a small glass shadow. 240 milliseconds, mono, refined, controlled decay, no dramatic suction effect.",
        ),
        moment(
            "pm_nav_reselect_v1", "Повтор активной вкладки", "Пользователь нажал уже активную вкладку или текущий пункт, маршрут не изменился.", "0.12 с", "0.10",
            "pm_nav_reselect - tiny neutral interface detent for tapping the already active destination. One dry muted celesta contact with no pitch movement. 120 milliseconds, mono, very quiet, acknowledges touch without implying navigation.",
            "pm_nav_reselect - warm stationary tab tap. A single soft pizzicato point with a closed ending and no lift. 120 milliseconds, mono, friendly, subtle, no error tone.",
            "pm_nav_reselect - cinematic fixed-position micro-contact. A faint glass grain appears without motion and stops at once. 120 milliseconds, mono, premium, deliberately flatter than a tab-change sound.",
        ),
    )),
    Family(3, "Модалки и шторки", "5 звуков - слой, направление и физическая посадка панели", (
        moment(
            "pm_layer_modal_open_v1", "Открытие модалки", "Центральное модальное окно стало активным поверх текущего экрана.", "0.34 с", "0.17",
            "pm_layer_modal_open - universal premium interface cue for a centred modal becoming active. A soft harp harmonic rises into one quiet celesta point. 340 milliseconds, mono, dry, weightless, neutral enough for confirmations, information and forms.",
            "pm_layer_modal_open - warm popup opening cue. A gentle celesta touch blooms over a muted pizzicato body, then settles. 340 milliseconds, mono, friendly and reusable, no magical flourish.",
            "pm_layer_modal_open - cinematic layer appearing above the current screen. A restrained airy string lift reaches a faint glass edge. 340 milliseconds, mono, elegant, short controlled tail, no large reveal.",
        ),
        moment(
            "pm_layer_modal_close_v1", "Закрытие модалки", "Модальное окно закрыто, нижний экран снова активен.", "0.30 с", "0.15",
            "pm_layer_modal_close - universal interface cue for a centred modal collapsing away. A soft celesta note drops into a damped harp harmonic, mirroring modal open. 300 milliseconds, mono, dry, quieter by design, clean finish.",
            "pm_layer_modal_close - warm popup dismissal cue. A muted pizzicato touch descends slightly and settles without a click. 300 milliseconds, mono, gentle and final, no negative meaning.",
            "pm_layer_modal_close - cinematic layer receding from view. A faint airy string fall with a tiny low landing. 300 milliseconds, mono, refined, controlled, no reverse swell.",
        ),
        moment(
            "pm_layer_sheet_open_v1", "Подъём нижней шторки", "Нижняя шторка начала подниматься и стала основным интерактивным слоем.", "0.38 с", "0.18",
            "pm_layer_sheet_open - tactile premium UI cue for a bottom sheet rising from the screen edge. A low muted string body glides upward into a dry celesta landing. 380 milliseconds, mono, physical, controlled, no broad whoosh.",
            "pm_layer_sheet_open - warm bottom-sheet lift. A rounded harp scrape rises gently and locks into a small pizzicato note. 380 milliseconds, mono, friendly, satisfyingly physical, no cartoon spring.",
            "pm_layer_sheet_open - cinematic panel lift from below. A restrained low-air movement climbs into a faint crystalline line. 380 milliseconds, mono, weighted but subtle, short decay and no trailer rise.",
        ),
        moment(
            "pm_layer_sheet_snap_v1", "Фиксация шторки", "Перетаскиваемая шторка встала в разрешённую позицию.", "0.24 с", "0.16",
            "pm_layer_sheet_snap - precise cue for a bottom sheet locking into a detent. One damped pizzicato note with a quiet low body lands exactly once. 240 milliseconds, mono, dry, magnetic and tactile, no bounce sequence.",
            "pm_layer_sheet_snap - warm panel detent. A muted celesta key lands over a rounded wooden resonance and stops. 240 milliseconds, mono, satisfying, compact, no cartoon snap.",
            "pm_layer_sheet_snap - cinematic magnetic lock for a settling panel. A small felt impact and faint glass overtone arrive together. 240 milliseconds, mono, premium weight, short decay, no metallic clank.",
        ),
        moment(
            "pm_layer_sheet_close_v1", "Уход нижней шторки", "Шторка полностью отпущена и уходит за нижнюю границу.", "0.32 с", "0.15",
            "pm_layer_sheet_close - tactile interface cue for a bottom sheet returning below the edge. A muted celesta note falls into a soft low string stop. 320 milliseconds, mono, dry, calm and directional, no suction whoosh.",
            "pm_layer_sheet_close - warm bottom-sheet dismissal. A short descending harp gesture lands in a padded pizzicato note. 320 milliseconds, mono, friendly, complete, no negative tone.",
            "pm_layer_sheet_close - cinematic panel sinking out of view. A restrained low-air fall with a faint warm landing. 320 milliseconds, mono, elegant, controlled tail, no dramatic drop.",
        ),
    )),
    Family(4, "Выбор и настройки", "6 звуков - изменение состояния, а не просто касание", (
        moment(
            "pm_control_option_select_v1", "Выбор варианта", "Один radio-вариант или единственный ответ стал выбранным.", "0.14 с", "0.14",
            "pm_control_option_select - precise interface cue for a single-choice option becoming selected. One dry celesta point resolves a tiny upward interval. 140 milliseconds, mono, clear but quiet, distinct from correct-answer feedback, no celebration.",
            "pm_control_option_select - warm selection cue for a radio option. A soft pizzicato touch followed by a smaller harp overtone. 140 milliseconds, mono, tactile and repeatable, no game win meaning.",
            "pm_control_option_select - cinematic micro-confirmation of a visual selection. A faint glass point gains a whisper of warm string body. 140 milliseconds, mono, elegant, short, semantically neutral.",
        ),
        moment(
            "pm_control_toggle_on_v1", "Переключатель включён", "Switch перешёл из off в on и настройка принята.", "0.22 с", "0.15",
            "pm_control_toggle_on - premium interface cue for a switch moving on. Two tiny felted celesta notes rise, with a dry mechanical detent on the second. 220 milliseconds, mono, precise, positive without reward energy, no electronic beep.",
            "pm_control_toggle_on - warm toggle-on cue. A rounded wooden click leads into a soft harp harmonic one step higher. 220 milliseconds, mono, tactile and friendly, no power-up sound.",
            "pm_control_toggle_on - cinematic micro-activation. A quiet magnetic contact opens into a faint warm shimmer. 220 milliseconds, mono, restrained, premium, no long glow.",
        ),
        moment(
            "pm_control_toggle_off_v1", "Переключатель выключен", "Switch перешёл из on в off и настройка принята.", "0.20 с", "0.13",
            "pm_control_toggle_off - premium interface cue for a switch moving off. Two muted celesta contacts step downward and close on a dry detent. 200 milliseconds, mono, calm, not negative, quieter than toggle on.",
            "pm_control_toggle_off - warm toggle-off cue. A soft wooden contact settles into a lower damped harp note. 200 milliseconds, mono, tactile, friendly, no shutdown effect.",
            "pm_control_toggle_off - cinematic micro-deactivation. A faint magnetic release and warm low grain disappear cleanly. 200 milliseconds, mono, refined, no failure meaning and no tail.",
        ),
        moment(
            "pm_control_check_v1", "Флажок или множественный выбор", "Checkbox или элемент мультивыбора изменил отметку.", "0.16 с", "0.14",
            "pm_control_check - clean interface cue for a checkbox changing state. A dry pizzicato tick gains one tiny celesta overtone as the mark appears. 160 milliseconds, mono, precise, compact, suitable for repeated multi-selection.",
            "pm_control_check - warm checkmark contact. A soft wooden pluck and small harp glint arrive together. 160 milliseconds, mono, friendly, tactile, no cash-register or achievement quality.",
            "pm_control_check - cinematic micro-mark for a selected item. A muted felt contact carries a faint glass edge and ends instantly. 160 milliseconds, mono, premium, restrained, no flourish.",
        ),
        moment(
            "pm_control_segment_v1", "Сегмент или пикер", "Выбран соседний сегмент, режим или строка пикера.", "0.18 с", "0.13",
            "pm_control_segment - precise interface detent for moving to another segment or picker value. One muted celesta note shifts a narrow interval and stops. 180 milliseconds, mono, dry, directional, built for frequent changes.",
            "pm_control_segment - warm segmented-control movement. A soft pizzicato tap followed by a neighbouring harp touch. 180 milliseconds, mono, light and tactile, no melody.",
            "pm_control_segment - cinematic micro-slide between compact modes. A faint glass harmonic moves across a tiny pitch distance with almost no tail. 180 milliseconds, mono, elegant and quiet.",
        ),
        moment(
            "pm_control_slider_commit_v1", "Фиксация слайдера", "Палец отпущен, итоговое значение слайдера принято.", "0.18 с", "0.12",
            "pm_control_slider_commit - clean interface cue for releasing a slider on its final value. A short filtered tension resolves into one dry celesta point. 180 milliseconds, mono, precise, no sound during continuous movement, no pitch sweep longer than the cue.",
            "pm_control_slider_commit - warm slider landing. A muted string bend settles into a soft wooden pluck. 180 milliseconds, mono, physical and tidy, no spring boing.",
            "pm_control_slider_commit - cinematic micro-resolution for a value control. A faint magnetic pull closes with a small glass landing. 180 milliseconds, mono, refined, controlled, no dramatic impact.",
        ),
    )),
    Family(5, "Учебные элементы", "5 звуков - плитки и ответы до смыслового вердикта", (
        moment(
            "pm_learn_answer_press_v1", "Ответ принят", "Вариант ответа зафиксирован, но correct/wrong ещё не прозвучал.", "0.12 с", "0.12",
            "pm_learn_answer_press - neutral premium interface contact for committing an answer before evaluation. One ultra-soft muted pizzicato point with no upward or downward meaning. 120 milliseconds, mono, dry, designed to disappear if verdict audio follows immediately.",
            "pm_learn_answer_press - warm answer-button contact. A tiny felted celesta touch with a rounded body and no resolution. 120 milliseconds, mono, tactile, emotionally neutral, no hint of success or failure.",
            "pm_learn_answer_press - cinematic micro-contact for an answer entering evaluation. A faint string grain and glass edge stop instantly. 120 milliseconds, mono, restrained, neutral, no suspense sting.",
        ),
        moment(
            "pm_learn_tile_pick_v1", "Плитка поднята", "Буква или слово выбрано из банка и отделилось от исходного места.", "0.12 с", "0.11",
            "pm_learn_tile_pick - tactile interface cue for lifting a letter or word tile from its bank. One dry high pizzicato touch with a tiny upward suction removed before it becomes a whoosh. 120 milliseconds, mono, light, repeatable.",
            "pm_learn_tile_pick - warm tile pickup in a word game. A soft wooden pluck with a small celesta fleck above it. 120 milliseconds, mono, playful but mature, no bubble pop.",
            "pm_learn_tile_pick - cinematic micro-lift of a learning tile. A faint felt contact rises into a microscopic glass grain. 120 milliseconds, mono, organic, quiet, no airy tail.",
        ),
        moment(
            "pm_learn_tile_place_v1", "Плитка легла в слот", "Плитка помещена в разрешённую позицию фразы или слова.", "0.15 с", "0.13",
            "pm_learn_tile_place - precise premium UI cue for a word tile landing in a valid slot. A dry muted pizzicato note with a slightly lower body than tile pickup. 150 milliseconds, mono, tactile, satisfying, no verdict meaning.",
            "pm_learn_tile_place - warm tile landing. A soft wooden keycap contact and tiny harp overtone arrive together. 150 milliseconds, mono, friendly, physical, no cartoon block sound.",
            "pm_learn_tile_place - cinematic micro-settle for a learning tile. A restrained felt impact with a faint crystalline edge decays immediately. 150 milliseconds, mono, premium, no bass hit.",
        ),
        moment(
            "pm_learn_tile_remove_v1", "Плитка возвращена", "Плитка убрана из ответа и вернулась в банк.", "0.14 с", "0.10",
            "pm_learn_tile_remove - minimal interface cue for returning a word tile to its bank. A muted pizzicato contact drops a tiny step and stops. 140 milliseconds, mono, dry, quieter than tile placement, no error meaning.",
            "pm_learn_tile_remove - warm tile-return cue. A soft wooden pluck settles into a lower harp harmonic. 140 milliseconds, mono, gentle and reversible, no failure sound.",
            "pm_learn_tile_remove - cinematic micro-withdrawal of a tile. A faint glass grain falls into a padded string stop. 140 milliseconds, mono, elegant, quiet, no reverse whoosh.",
        ),
        moment(
            "pm_learn_pair_match_v1", "Пара собрана", "Два выбранных учебных элемента образовали корректную пару механики.", "0.18 с", "0.15",
            "pm_learn_pair_match - compact premium cue for two learning pieces forming a pair. Two dry celesta points converge into one soft pizzicato landing. 180 milliseconds, mono, clear and satisfying, smaller than correct-answer audio.",
            "pm_learn_pair_match - warm matching cue. Two light harp touches answer each other and meet on a muted wooden note. 180 milliseconds, mono, playful, tidy, no reward flourish.",
            "pm_learn_pair_match - cinematic micro-convergence of two matching pieces. Two faint glass grains move together into a warm felt contact. 180 milliseconds, mono, refined, controlled, no long shimmer.",
        ),
    )),
    Family(6, "Голос и медиа", "4 звука - управление воспроизведением и записью без перекрытия речи", (
        moment(
            "pm_media_play_v1", "Старт воспроизведения", "Запущено произношение, образец голоса или аудиопревью.", "0.18 с", "0.14",
            "pm_media_play - premium interface cue for starting pronunciation or a voice preview. A soft triangular celesta onset points forward and clears before speech begins. 180 milliseconds, mono, dry, attack-first with silence at the end, no overlap with the first phoneme.",
            "pm_media_play - warm playback-start cue. A muted harp touch rises gently and ends early, leaving clean space for the voice. 180 milliseconds, mono, friendly, no media-jingle melody.",
            "pm_media_play - cinematic micro-opening for spoken audio. A faint airy string breath reaches a tiny glass point, then disappears before speech. 180 milliseconds, mono, elegant, no tail under dialogue.",
        ),
        moment(
            "pm_media_pause_v1", "Пауза воспроизведения", "Пользователь остановил текущее аудио, позиция сохранена.", "0.16 с", "0.12",
            "pm_media_pause - clean interface cue for pausing spoken playback. One muted celesta note closes into a dry felt stop. 160 milliseconds, mono, calm and neutral, no end-of-track meaning.",
            "pm_media_pause - warm playback pause. A soft harp harmonic settles downward into silence. 160 milliseconds, mono, gentle, reversible, no shutdown tone.",
            "pm_media_pause - cinematic micro-closure for paused audio. A faint string breath folds into a tiny padded contact. 160 milliseconds, mono, refined, immediate silence, no tail.",
        ),
        moment(
            "pm_voice_record_start_v1", "Запись началась", "Микрофон реально активен и пользователь может говорить.", "0.24 с", "0.18",
            "pm_voice_record_start - clear premium cue that microphone capture is now active. Two short muted celesta tones rise to a firm dry point, then leave silence for speech. 240 milliseconds, mono, unmistakable but gentle, no alarm beep.",
            "pm_voice_record_start - warm recording-ready cue. A soft wooden pulse and light harp lift confirm the live microphone, ending before the learner speaks. 240 milliseconds, mono, friendly, no countdown voice.",
            "pm_voice_record_start - cinematic micro-activation of a recording channel. A restrained low breath opens into a clear glass point and cuts cleanly. 240 milliseconds, mono, confident, no sci-fi radio sound.",
        ),
        moment(
            "pm_voice_record_stop_v1", "Запись остановлена", "Микрофон закрылся, реплика зафиксирована и ушла на обработку.", "0.22 с", "0.16",
            "pm_voice_record_stop - clear premium cue that microphone capture has ended and the utterance is committed. Two muted celesta notes settle downward into a dry stop. 220 milliseconds, mono, reassuring, no failure implication.",
            "pm_voice_record_stop - warm recording-close cue. A soft harp touch lands on a rounded wooden contact, signalling safe capture. 220 milliseconds, mono, friendly, complete, no send swoosh.",
            "pm_voice_record_stop - cinematic micro-closure of a voice channel. A faint glass edge folds into a warm padded note and ends. 220 milliseconds, mono, refined, controlled, no radio click or long tail.",
        ),
    )),
    Family(7, "Жесты и физика", "4 звука - порог намерения, подъём, посадка и подтверждённый свайп", (
        moment(
            "pm_gesture_long_press_v1", "Удержание активировано", "Палец прошёл порог long press и открылось удерживаемое действие.", "0.22 с", "0.15",
            "pm_gesture_long_press - premium interface cue for reaching a long-press threshold. A quiet sustained felt tone tightens for 140 milliseconds and resolves into one dry celesta point. 220 milliseconds total, mono, precise, no warning buzz.",
            "pm_gesture_long_press - warm hold-confirmation cue. A muted harp tone gathers gently and locks with a soft wooden detent. 220 milliseconds, mono, tactile, satisfying, no vibration imitation.",
            "pm_gesture_long_press - cinematic micro-tension resolving when a held gesture activates. A faint string pressure narrows into a small glass contact. 220 milliseconds, mono, controlled, premium, no suspense sting.",
        ),
        moment(
            "pm_gesture_drag_lift_v1", "Объект поднят", "Перетаскиваемый объект отделился от поверхности и следует за пальцем.", "0.16 с", "0.13",
            "pm_gesture_drag_lift - tactile premium cue for lifting a draggable object from the interface. A soft dry pizzicato contact rises by a tiny interval and releases. 160 milliseconds, mono, physical, light, no suction whoosh.",
            "pm_gesture_drag_lift - warm drag pickup. A rounded wooden pluck gains a tiny harp overtone as the object detaches. 160 milliseconds, mono, friendly, no cartoon grab sound.",
            "pm_gesture_drag_lift - cinematic micro-lift of a draggable layer. A faint felt contact rises into an airy glass grain and stops. 160 milliseconds, mono, premium, minimal tail.",
        ),
        moment(
            "pm_gesture_drag_drop_v1", "Объект принят", "Перетаскиваемый объект отпущен в допустимой конечной позиции.", "0.20 с", "0.15",
            "pm_gesture_drag_drop - tactile premium cue for a draggable object landing in an accepted destination. A muted low pizzicato body and dry celesta edge arrive together. 200 milliseconds, mono, stable, satisfying, no success fanfare.",
            "pm_gesture_drag_drop - warm accepted-drop cue. A soft wooden landing with one small harp glint settles immediately. 200 milliseconds, mono, physical and friendly, no heavy thud.",
            "pm_gesture_drag_drop - cinematic micro-landing of a moved object. A restrained felt impact carries a faint warm resonance and glass edge. 200 milliseconds, mono, premium, controlled, no bass boom.",
        ),
        moment(
            "pm_gesture_swipe_commit_v1", "Свайп подтверждён", "Свайп пересёк порог решения и соответствующее действие принято.", "0.18 с", "0.14",
            "pm_gesture_swipe_commit - precise premium cue for a swipe crossing its decision threshold. A very short filtered motion resolves into one dry celesta detent. 180 milliseconds, mono, directional and tactile, no long whoosh.",
            "pm_gesture_swipe_commit - warm committed-swipe cue. A quick muted harp brush lands on a soft pizzicato point. 180 milliseconds, mono, playful but controlled, no cartoon flick.",
            "pm_gesture_swipe_commit - cinematic micro-sweep for a confirmed gesture. A faint string air movement reaches a small glass landing and stops. 180 milliseconds, mono, elegant, short, no dramatic transition.",
        ),
    )),
)


def sanitise(value: str) -> str:
    return (
        value.replace("\u2014", "-")
        .replace("\u2013", "-")
        .replace("\u2011", "-")
        .replace("\u2212", "-")
    )


def iter_moments() -> Iterable[Moment]:
    for family in FAMILIES:
        yield from family.moments


def validate_content() -> None:
    moments = list(iter_moments())
    ids = [item.sound_id for item in moments]
    prompts = [prompt for item in moments for prompt in item.prompts]
    if len(FAMILIES) != 7:
        raise ValueError(f"expected 7 families, got {len(FAMILIES)}")
    if len(moments) != 34:
        raise ValueError(f"expected 34 moments, got {len(moments)}")
    if len(set(ids)) != 34:
        raise ValueError("sound IDs must be unique")
    if len(prompts) != 102 or any(not prompt.strip() for prompt in prompts):
        raise ValueError("expected 102 non-empty prompts")
    for item in moments:
        if len(item.prompts) != 3:
            raise ValueError(f"{item.sound_id}: expected three prompts")
        for prompt in item.prompts:
            if not prompt.startswith(item.stable_id + " -"):
                raise ValueError(f"{item.sound_id}: prompt must start with {item.stable_id}")
    print("PASS: 7 families, 34 moments, 102 prompts")


def register_fonts() -> tuple[str, str, str]:
    font_dir = Path("C:/Windows/Fonts")
    regular = font_dir / "arial.ttf"
    bold = font_dir / "arialbd.ttf"
    black = font_dir / "ariblk.ttf"
    if not regular.exists() or not bold.exists():
        raise FileNotFoundError("Arial fonts are required from C:/Windows/Fonts")
    pdfmetrics.registerFont(TTFont("PMRegular", str(regular)))
    pdfmetrics.registerFont(TTFont("PMBold", str(bold)))
    if black.exists():
        pdfmetrics.registerFont(TTFont("PMBlack", str(black)))
    else:
        pdfmetrics.registerFont(TTFont("PMBlack", str(bold)))
    return "PMRegular", "PMBold", "PMBlack"


def make_styles(font_regular: str, font_bold: str, font_black: str) -> dict[str, ParagraphStyle]:
    base = getSampleStyleSheet()
    return {
        "cover_kicker": ParagraphStyle("cover_kicker", parent=base["Normal"], fontName=font_bold, fontSize=7.5, leading=10, textColor=MUTED, spaceAfter=7, uppercase=True),
        "cover_title": ParagraphStyle("cover_title", parent=base["Title"], fontName=font_black, fontSize=31, leading=31, textColor=INK, spaceAfter=10),
        "cover_body": ParagraphStyle("cover_body", parent=base["BodyText"], fontName=font_regular, fontSize=9.4, leading=14, textColor=MUTED, spaceAfter=9),
        "h1": ParagraphStyle("h1", parent=base["Heading1"], fontName=font_black, fontSize=20, leading=23, textColor=INK, spaceBefore=2, spaceAfter=8),
        "h2": ParagraphStyle("h2", parent=base["Heading2"], fontName=font_black, fontSize=15, leading=18, textColor=INK, spaceBefore=4, spaceAfter=6),
        "body": ParagraphStyle("body", parent=base["BodyText"], fontName=font_regular, fontSize=8.2, leading=12.2, textColor=INK, spaceAfter=5),
        "small": ParagraphStyle("small", parent=base["BodyText"], fontName=font_regular, fontSize=7.1, leading=10, textColor=MUTED),
        "metric_num": ParagraphStyle("metric_num", parent=base["Normal"], fontName=font_black, fontSize=18, leading=19, textColor=ACCENT_DARK),
        "metric_label": ParagraphStyle("metric_label", parent=base["Normal"], fontName=font_regular, fontSize=6.6, leading=8.5, textColor=MUTED),
        "family_num": ParagraphStyle("family_num", parent=base["Normal"], fontName=font_black, fontSize=7, leading=8, textColor=ACCENT_DARK, alignment=TA_CENTER),
        "family_title": ParagraphStyle("family_title", parent=base["Normal"], fontName=font_black, fontSize=13, leading=15, textColor=INK),
        "family_subtitle": ParagraphStyle("family_subtitle", parent=base["Normal"], fontName=font_regular, fontSize=7.4, leading=10, textColor=MUTED),
        "sound_id": ParagraphStyle("sound_id", parent=base["Normal"], fontName=font_bold, fontSize=8.6, leading=10, textColor=INK),
        "sound_meta": ParagraphStyle("sound_meta", parent=base["Normal"], fontName=font_regular, fontSize=6.7, leading=8.2, textColor=MUTED, alignment=TA_LEFT),
        "trigger": ParagraphStyle("trigger", parent=base["Normal"], fontName=font_regular, fontSize=7.1, leading=9.5, textColor=MUTED),
        "prompt_label": ParagraphStyle("prompt_label", parent=base["Normal"], fontName=font_black, fontSize=7.4, leading=9, textColor=ACCENT_DARK, alignment=TA_CENTER),
        "prompt": ParagraphStyle("prompt", parent=base["BodyText"], fontName=font_regular, fontSize=7.15, leading=9.6, textColor=INK),
        "table_head": ParagraphStyle("table_head", parent=base["Normal"], fontName=font_bold, fontSize=7.1, leading=9, textColor=INK),
        "table_body": ParagraphStyle("table_body", parent=base["Normal"], fontName=font_regular, fontSize=6.8, leading=8.7, textColor=INK),
        "center": ParagraphStyle("center", parent=base["Normal"], fontName=font_regular, fontSize=7.2, leading=10, textColor=MUTED, alignment=TA_CENTER),
    }


class SoundBookDoc(BaseDocTemplate):
    def __init__(self, filename: str, styles: dict[str, ParagraphStyle]) -> None:
        super().__init__(
            filename,
            pagesize=A4,
            leftMargin=18 * mm,
            rightMargin=18 * mm,
            topMargin=18 * mm,
            bottomMargin=16 * mm,
            title="Phraseman - семейства звуков интерфейса",
            author="Phraseman",
            subject="34 UI sound moments and 102 Adobe Firefly prompts",
        )
        self.styles = styles
        frame = Frame(self.leftMargin, self.bottomMargin, self.width, self.height, id="normal")
        self.addPageTemplates(PageTemplate(id="all", frames=[frame], onPage=self._draw_page))

    def _draw_page(self, canvas, doc) -> None:  # type: ignore[no-untyped-def]
        canvas.saveState()
        width, height = A4
        canvas.setStrokeColor(RULE)
        canvas.setLineWidth(0.4)
        canvas.line(18 * mm, height - 11 * mm, width - 18 * mm, height - 11 * mm)
        canvas.setFont("PMRegular", 6.5)
        canvas.setFillColor(MUTED)
        canvas.drawString(18 * mm, height - 8.2 * mm, "АУДИТ ОЗВУЧКИ - 25 АВГУСТА 2026")
        canvas.drawRightString(width - 18 * mm, height - 8.2 * mm, "Семейства звуков Phraseman")
        canvas.line(18 * mm, 10 * mm, width - 18 * mm, 10 * mm)
        canvas.drawString(18 * mm, 6.7 * mm, "Phraseman - UI sound families")
        canvas.drawRightString(width - 18 * mm, 6.7 * mm, f"{doc.page}")
        canvas.restoreState()


def p(text: str, style: ParagraphStyle) -> Paragraph:
    return Paragraph(sanitise(text), style)


def metric_grid(styles: dict[str, ParagraphStyle]) -> Table:
    cells = [
        ("1 442", "обработчика onPress"),
        ("34", "момента озвучивания"),
        ("102", "готовых промпта"),
        ("7", "звуковых семейств"),
        ("119", "модальных экземпляров"),
        ("134", "смысловых событий уже в реестре"),
    ]
    data = []
    for row in range(2):
        data.append([
            [p(cells[row * 3 + col][0], styles["metric_num"]), p(cells[row * 3 + col][1], styles["metric_label"])]
            for col in range(3)
        ])
    table = Table(data, colWidths=[55 * mm] * 3, rowHeights=[20 * mm] * 2)
    table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), SOFT),
        ("BOX", (0, 0), (-1, -1), 0.5, RULE),
        ("INNERGRID", (0, 0), (-1, -1), 0.5, RULE),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("LEFTPADDING", (0, 0), (-1, -1), 8),
        ("RIGHTPADDING", (0, 0), (-1, -1), 8),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
    ]))
    return table


def family_banner(family: Family, styles: dict[str, ParagraphStyle]) -> Table:
    badge = Table([[p(str(family.number), styles["family_num"])]], colWidths=[9 * mm], rowHeights=[9 * mm])
    badge.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), ACCENT_SOFT),
        ("BOX", (0, 0), (-1, -1), 0.5, ACCENT),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
    ]))
    table = Table([[badge, [p(family.title, styles["family_title"]), p(family.subtitle, styles["family_subtitle"])]]], colWidths=[12 * mm, 153 * mm])
    table.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("LEFTPADDING", (0, 0), (-1, -1), 0),
        ("RIGHTPADDING", (0, 0), (-1, -1), 5),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ("LINEBELOW", (0, 0), (-1, -1), 0.8, RULE),
    ]))
    return table


def prompt_row(label: str, prompt: str, styles: dict[str, ParagraphStyle]) -> Table:
    table = Table([[p(label, styles["prompt_label"]), p(prompt, styles["prompt"])]], colWidths=[22 * mm, 143 * mm])
    table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (0, 0), ACCENT_SOFT),
        ("BACKGROUND", (1, 0), (1, 0), PAPER),
        ("BOX", (0, 0), (-1, -1), 0.45, RULE),
        ("LINEAFTER", (0, 0), (0, 0), 0.45, RULE),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ("RIGHTPADDING", (0, 0), (-1, -1), 6),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
    ]))
    return table


def moment_block(item: Moment, styles: dict[str, ParagraphStyle]) -> KeepTogether:
    header = Table([
        [p(item.sound_id, styles["sound_id"]), p(f"{item.duration}  /  громкость {item.volume}", styles["sound_meta"])],
        [p(item.title, styles["table_head"]), p("Момент: " + item.trigger, styles["trigger"])],
    ], colWidths=[55 * mm, 110 * mm])
    header.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), SOFT),
        ("BOX", (0, 0), (-1, -1), 0.5, RULE),
        ("LINEBELOW", (0, 0), (-1, 0), 0.5, RULE),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ("RIGHTPADDING", (0, 0), (-1, -1), 6),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
    ]))
    return KeepTogether([
        Spacer(1, 3 * mm),
        header,
        Spacer(1, 1.5 * mm),
        prompt_row("A<br/><font size='5.2'>ИНТЕРФЕЙС</font>", item.prompts[0], styles),
        Spacer(1, 1.1 * mm),
        prompt_row("B<br/><font size='5.2'>ИГРОВОЙ</font>", item.prompts[1], styles),
        Spacer(1, 1.1 * mm),
        prompt_row("C<br/><font size='5.2'>КИНО</font>", item.prompts[2], styles),
    ])


def overview_table(styles: dict[str, ParagraphStyle]) -> Table:
    data = [[p("#", styles["table_head"]), p("Семейство", styles["table_head"]), p("Роль", styles["table_head"]), p("Звуков", styles["table_head"])]]
    roles = (
        "Базовый отклик кнопок, карточек, иконок и chip",
        "Направление между полноценными экранами",
        "Физика модалок и нижних шторок",
        "Изменение выбранного значения или состояния",
        "Плитки и ответы до correct/wrong вердикта",
        "Воспроизведение и запись без перекрытия речи",
        "Порог удержания, drag-and-drop и committed swipe",
    )
    for family, role in zip(FAMILIES, roles):
        data.append([
            p(str(family.number), styles["table_body"]),
            p(family.title, styles["table_body"]),
            p(role, styles["table_body"]),
            p(str(len(family.moments)), styles["table_body"]),
        ])
    table = Table(data, colWidths=[9 * mm, 45 * mm, 94 * mm, 17 * mm], repeatRows=1)
    table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), ACCENT_SOFT),
        ("BOX", (0, 0), (-1, -1), 0.5, RULE),
        ("INNERGRID", (0, 0), (-1, -1), 0.4, RULE),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 5),
        ("RIGHTPADDING", (0, 0), (-1, -1), 5),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
    ]))
    return table


def build_story(styles: dict[str, ParagraphStyle]) -> list:
    story: list = []
    story.extend([
        Spacer(1, 15 * mm),
        p("АУДИТ ИНТЕРАКТИВНОГО ЗВУКА - 25 АВГУСТА 2026", styles["cover_kicker"]),
        p("Семейства звуков<br/>интерфейса Phraseman", styles["cover_title"]),
        p("В приложении найдено 1 442 обработчика нажатий. Вместо одного одинакового клика здесь определены 34 связанных звука: от главной CTA и карточки до переключателя, плитки, записи голоса и принятого свайпа. На каждый момент подготовлено три production-ready промпта для Adobe Firefly Sounds.", styles["cover_body"]),
        Spacer(1, 4 * mm),
        metric_grid(styles),
        Spacer(1, 7 * mm),
        p("Как этим пользоваться", styles["h2"]),
        p("1. Найдите семейство и точный момент. 2. Возьмите один из трёх промптов A, B или C. 3. Сгенерируйте звук и сохраните под ID из заголовка. 4. Подключайте только один самый специфичный cue на одно пользовательское намерение.", styles["body"]),
        Table([[p("Техническая цель", styles["table_head"]), p("Моно, 48 кГц, -14 LUFS, пик -1 dBTP, тишина в начале обрезана, короткий чистый хвост. Формат m4a или mp3.", styles["table_body"])]], colWidths=[38 * mm, 127 * mm], style=[
            ("BACKGROUND", (0, 0), (-1, -1), ACCENT_SOFT),
            ("BOX", (0, 0), (-1, -1), 0.5, ACCENT),
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("LEFTPADDING", (0, 0), (-1, -1), 7),
            ("RIGHTPADDING", (0, 0), (-1, -1), 7),
            ("TOPPADDING", (0, 0), (-1, -1), 7),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
        ]),
        PageBreak(),
        p("Карта семейств", styles["h1"]),
        p("Семейство описывает физический тип действия. Смысловой результат - correct, wrong, покупка, награда, ошибка или завершение - остаётся в существующей звуковой карте и имеет более высокий приоритет.", styles["body"]),
        Spacer(1, 3 * mm),
        overview_table(styles),
        Spacer(1, 7 * mm),
        p("Правило одного намерения", styles["h2"]),
        p("Самый специфичный звук заменяет общий. Открытие модалки звучит как layer-modal-open, а не как press-primary плюс modal-open. Запуск аудио звучит как media-play, а не как icon-press плюс media-play. Немедленный correct/wrong вердикт может полностью заменить нейтральный answer-press.", styles["body"]),
        p("Приоритет: смысловой результат > voice/media > learning/gesture > layer/navigation > contact fallback. Во время речи UI-звуки приглушаются или откладываются; во время записи посторонние UI-звуки подавляются.", styles["body"]),
        Spacer(1, 4 * mm),
        p("Что намеренно молчит", styles["h2"]),
        p("Системная клавиатура, обычный scroll и инерция, непрерывное движение слайдера до отпускания, accessibility-фокус без активации, background sync, hydration, preload, автоматические redirect и dev/admin элементы.", styles["body"]),
    ])
    for index, family in enumerate(FAMILIES):
        if index == 0:
            story.append(PageBreak())
        else:
            story.append(Spacer(1, 4 * mm))
            story.append(CondPageBreak(62 * mm))
        story.append(family_banner(family, styles))
        for item in family.moments:
            story.append(moment_block(item, styles))
    story.extend([
        Spacer(1, 6 * mm),
        CondPageBreak(115 * mm),
        p("Финальные правила производства", styles["h1"]),
        p("1. Один intent - один immediate cue. 2. Результат важнее механики. 3. Частые звуки короче и тише редких. 4. Ошибка не унижает. 5. Voice и SFX не спорят за первый план. 6. Никаких длинных хвостов, ретро-бипов, casino coins, buzzer, boing или spoken words.", styles["body"]),
        Spacer(1, 4 * mm),
        p("Арбитраж", styles["h2"]),
        overview_rules_table(styles),
        Spacer(1, 7 * mm),
        p("Связь с существующей звуковой картой", styles["h2"]),
        p("Этот документ не перегенерирует correct/wrong, награды, покупки, completion, системные предупреждения или 29 Arena placeholders. Он закрывает физический слой взаимодействия и ссылается на существующие смысловые события как на верхний уровень приоритета. Pull-to-refresh также остаётся в исходной карте как pm_pull_refresh_v1.", styles["body"]),
        Spacer(1, 7 * mm),
        p("Контроль перед подключением", styles["h2"]),
        p("Проверить имя файла, длительность, громкость, отсутствие начальной тишины, читаемость на динамике телефона, отсутствие усталости после 50 повторов и отсутствие двойного звука при одном действии.", styles["body"]),
        Spacer(1, 18 * mm),
        p("34 момента - 102 промпта - 7 семейств", styles["center"]),
    ])
    return story


def overview_rules_table(styles: dict[str, ParagraphStyle]) -> Table:
    data = [
        [p("Если произошло", styles["table_head"]), p("Проиграть", styles["table_head"]), p("Подавить", styles["table_head"])],
        [p("Correct/wrong, reward, purchase, completion", styles["table_body"]), p("Существующий semantic cue", styles["table_body"]), p("Любой immediate generic cue", styles["table_body"])],
        [p("Навигация или слой открылся сразу", styles["table_body"]), p("Navigation/layer cue", styles["table_body"]), p("Contact press", styles["table_body"])],
        [p("Tile, media или gesture имеет свой момент", styles["table_body"]), p("Специализированный family cue", styles["table_body"]), p("Contact press", styles["table_body"])],
        [p("Специализированного момента нет", styles["table_body"]), p("Contact fallback по роли элемента", styles["table_body"]), p("Ничего", styles["table_body"])],
        [p("Идёт запись голоса", styles["table_body"]), p("Только record stop / системно важный cue", styles["table_body"]), p("Остальные UI sounds", styles["table_body"])],
    ]
    table = Table(data, colWidths=[60 * mm, 55 * mm, 50 * mm], repeatRows=1)
    table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), ACCENT_SOFT),
        ("BOX", (0, 0), (-1, -1), 0.5, RULE),
        ("INNERGRID", (0, 0), (-1, -1), 0.4, RULE),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 5),
        ("RIGHTPADDING", (0, 0), (-1, -1), 5),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
    ]))
    return table


def build_pdf(output: Path) -> int:
    validate_content()
    regular, bold, black = register_fonts()
    styles = make_styles(regular, bold, black)
    output.parent.mkdir(parents=True, exist_ok=True)
    doc = SoundBookDoc(str(output), styles)
    doc.build(build_story(styles))
    from pypdf import PdfReader

    pages = len(PdfReader(str(output)).pages)
    print(f"CREATED: {output}")
    print(f"SUMMARY: {pages} pages, 7 families, 34 moments, 102 prompts")
    return pages


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--validate-only", action="store_true")
    parser.add_argument("--output", type=Path, default=OUTPUT)
    args = parser.parse_args()
    validate_content()
    if not args.validate_only:
        build_pdf(args.output)


if __name__ == "__main__":
    main()
