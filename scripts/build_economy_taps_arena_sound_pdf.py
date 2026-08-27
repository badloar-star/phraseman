#!/usr/bin/env python3
"""Build the economy / taps / arena sound prompt book as a deterministic PDF.

зачем: владелец просит тот же формат книги промптов, что и
build_ui_sound_families_pdf.py, но по новому документу (энергия, сердечки,
руны, нажатия, Арена). Источник правды — САМ MARKDOWN
docs/sound/SOUND_PROMPTS_ECONOMY_TAPS_ARENA.md, а не копия текста в коде:
иначе правка документа молча разойдётся с PDF, и владелец сгенерирует звук
по устаревшему промпту. Парсер строгий — при любом расхождении структуры
падает, а не печатает половину книги.
"""

from __future__ import annotations

import argparse
import re
from dataclasses import dataclass
from pathlib import Path

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
SOURCE = ROOT / "docs" / "sound" / "SOUND_PROMPTS_ECONOMY_TAPS_ARENA.md"
OUTPUT = ROOT / "output" / "pdf" / "phraseman_sound_economy_taps_arena_2026-08-27.pdf"

# Палитра взята из build_ui_sound_families_pdf.py — книги должны выглядеть
# как две части одной серии, а не как два разных документа.
INK = colors.HexColor("#111111")
MUTED = colors.HexColor("#6F6F6B")
RULE = colors.HexColor("#E5E2DA")
PAPER = colors.HexColor("#FFFFFF")
SOFT = colors.HexColor("#F7F5EF")
ACCENT = colors.HexColor("#D9A321")
ACCENT_SOFT = colors.HexColor("#F7EAC5")
ACCENT_DARK = colors.HexColor("#8C6500")

EXPECTED_SECTIONS = 5
EXPECTED_SOUNDS = 29
EXPECTED_PROMPTS = 87


@dataclass(frozen=True)
class Moment:
    sound_id: str
    duration: str
    volume: str
    screen: str
    trigger: str
    prompts: tuple[str, str, str]

    @property
    def stable_id(self) -> str:
        return re.sub(r"_v\d+$", "", self.sound_id)


@dataclass(frozen=True)
class Section:
    number: int
    title: str
    subtitle: str
    moments: tuple[Moment, ...]


# ──────────────────────────── разбор markdown ────────────────────────────

RE_SECTION = re.compile(r"^# (\d+)\.\s+(.+?)\s*$")
RE_SOUND = re.compile(r"^### `([a-z0-9_]+)`\s+—\s+([^,]+),\s+громкость\s+([0-9.]+)\s*$")
RE_PROMPT = re.compile(r"^\*\*([ABC])\.\*\*\s+(.+?)\s*$")
RE_SCREEN = re.compile(r"^\*\*Экран:\*\*\s+(.+?)\s+·\s+Момент:\s+(.+?)\s*$")


def strip_md(value: str) -> str:
    """Снять инлайновую разметку markdown — в PDF она печаталась бы как есть."""
    value = re.sub(r"\*\*(.+?)\*\*", r"\1", value)
    value = value.replace("`", "")
    return value.strip()


def parse_source(path: Path) -> tuple[list[Section], dict[str, str]]:
    if not path.exists():
        raise FileNotFoundError(f"нет исходного документа: {path}")
    lines = path.read_text(encoding="utf-8").splitlines()

    sections: list[Section] = []
    cur_section: dict | None = None
    cur_moment: dict | None = None
    subtitle_buf: list[str] = []
    in_subtitle = False

    def close_moment() -> None:
        nonlocal cur_moment
        if cur_moment is None:
            return
        got = cur_moment["prompts"]
        missing = [v for v in "ABC" if v not in got]
        if missing:
            raise ValueError(f"{cur_moment['sound_id']}: нет промптов {missing}")
        cur_section["moments"].append(Moment(
            sound_id=cur_moment["sound_id"],
            duration=cur_moment["duration"],
            volume=cur_moment["volume"],
            screen=cur_moment["screen"],
            trigger=cur_moment["trigger"],
            prompts=(got["A"], got["B"], got["C"]),
        ))
        cur_moment = None

    def close_section() -> None:
        nonlocal cur_section
        if cur_section is None:
            return
        close_moment()
        sections.append(Section(
            number=cur_section["number"],
            title=cur_section["title"],
            subtitle=cur_section["subtitle"],
            moments=tuple(cur_section["moments"]),
        ))
        cur_section = None

    for raw in lines:
        line = raw.rstrip()

        m = RE_SECTION.match(line)
        if m:
            close_section()
            cur_section = {
                "number": int(m.group(1)),
                "title": strip_md(m.group(2)),
                "subtitle": "",
                "moments": [],
            }
            subtitle_buf = []
            in_subtitle = True
            continue

        if cur_section is None:
            continue

        m = RE_SOUND.match(line)
        if m:
            if in_subtitle:
                cur_section["subtitle"] = strip_md(" ".join(subtitle_buf)).strip()
                in_subtitle = False
            close_moment()
            cur_moment = {
                "sound_id": m.group(1),
                "duration": m.group(2).strip(),
                "volume": m.group(3).strip(),
                "screen": "",
                "trigger": "",
                "prompts": {},
            }
            continue

        # Подзаголовок раздела — абзац «Инструменты раздела…» до первого звука.
        if in_subtitle:
            if line.startswith("###") or line.startswith("---"):
                cur_section["subtitle"] = strip_md(" ".join(subtitle_buf)).strip()
                in_subtitle = False
            elif line.strip() and not line.startswith(">") and not line.startswith("|"):
                subtitle_buf.append(line.strip())
            continue

        if cur_moment is None:
            continue

        m = RE_SCREEN.match(line)
        if m:
            cur_moment["screen"] = strip_md(m.group(1))
            cur_moment["trigger"] = strip_md(m.group(2))
            continue

        m = RE_PROMPT.match(line)
        if m:
            cur_moment["prompts"][m.group(1)] = strip_md(m.group(2))
            continue

    close_section()

    # Числа шапки берём из самого документа, чтобы PDF и markdown не разошлись.
    text = path.read_text(encoding="utf-8")
    facts: dict[str, str] = {}
    for key, pattern in (
        ("registry", r"\| Событий в реестре `SOUND_EVENTS` \| (\d+) \|"),
        ("stubs", r"\| Из них \*\*без звукового файла\*\* \(заглушка `null`\) \| \*\*(\d+)\*\*"),
        ("arena_stubs", r"\*\*(\d+) ключей с `source: null`\*\*"),
        ("taps", r"тактильных нажатий в приложении: \*\*(\d+)\*\*"),
    ):
        found = re.search(pattern, text)
        if not found:
            raise ValueError(f"не найдено число '{key}' в документе — шапка PDF разойдётся с markdown")
        facts[key] = found.group(1)
    return sections, facts


def validate(sections: list[Section], facts: dict[str, str]) -> None:
    moments = [m for s in sections for m in s.moments]
    prompts = [p for m in moments for p in m.prompts]
    if len(sections) != EXPECTED_SECTIONS:
        raise ValueError(f"ожидалось {EXPECTED_SECTIONS} разделов, получено {len(sections)}")
    if len(moments) != EXPECTED_SOUNDS:
        raise ValueError(f"ожидалось {EXPECTED_SOUNDS} звуков, получено {len(moments)}")
    if len(prompts) != EXPECTED_PROMPTS:
        raise ValueError(f"ожидалось {EXPECTED_PROMPTS} промптов, получено {len(prompts)}")
    ids = [m.sound_id for m in moments]
    if len(set(ids)) != len(ids):
        dupes = {i for i in ids if ids.count(i) > 1}
        raise ValueError(f"дубли имён звуков: {sorted(dupes)}")
    for m in moments:
        if not m.screen or not m.trigger:
            raise ValueError(f"{m.sound_id}: нет строки «Экран/Момент»")
        for prompt in m.prompts:
            if not prompt.startswith(m.stable_id + " —") and not prompt.startswith(m.stable_id + " -"):
                raise ValueError(f"{m.sound_id}: промпт должен начинаться с {m.stable_id}")
    print(f"PASS: {len(sections)} разделов, {len(moments)} звуков, {len(prompts)} промптов")


# ──────────────────────────── оформление ────────────────────────────

def sanitise(value: str) -> str:
    return (
        value.replace("\u2014", "-")
        .replace("\u2013", "-")
        .replace("\u2011", "-")
        .replace("\u2212", "-")
        .replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
    )


def register_fonts() -> tuple[str, str, str]:
    font_dir = Path("C:/Windows/Fonts")
    regular = font_dir / "arial.ttf"
    bold = font_dir / "arialbd.ttf"
    black = font_dir / "ariblk.ttf"
    if not regular.exists() or not bold.exists():
        raise FileNotFoundError("нужны шрифты Arial из C:/Windows/Fonts")
    pdfmetrics.registerFont(TTFont("PMRegular", str(regular)))
    pdfmetrics.registerFont(TTFont("PMBold", str(bold)))
    pdfmetrics.registerFont(TTFont("PMBlack", str(black if black.exists() else bold)))
    return "PMRegular", "PMBold", "PMBlack"


def make_styles(fr: str, fb: str, fk: str) -> dict[str, ParagraphStyle]:
    base = getSampleStyleSheet()
    return {
        "cover_kicker": ParagraphStyle("cover_kicker", parent=base["Normal"], fontName=fb, fontSize=7.5, leading=10, textColor=MUTED, spaceAfter=7),
        "cover_title": ParagraphStyle("cover_title", parent=base["Title"], fontName=fk, fontSize=31, leading=33, textColor=INK, spaceAfter=10),
        "cover_body": ParagraphStyle("cover_body", parent=base["BodyText"], fontName=fr, fontSize=9.4, leading=14, textColor=MUTED, spaceAfter=9),
        "h1": ParagraphStyle("h1", parent=base["Heading1"], fontName=fk, fontSize=20, leading=23, textColor=INK, spaceBefore=2, spaceAfter=8),
        "h2": ParagraphStyle("h2", parent=base["Heading2"], fontName=fk, fontSize=15, leading=18, textColor=INK, spaceBefore=4, spaceAfter=6),
        "body": ParagraphStyle("body", parent=base["BodyText"], fontName=fr, fontSize=8.2, leading=12.2, textColor=INK, spaceAfter=5),
        "metric_num": ParagraphStyle("metric_num", parent=base["Normal"], fontName=fk, fontSize=18, leading=19, textColor=ACCENT_DARK),
        "metric_label": ParagraphStyle("metric_label", parent=base["Normal"], fontName=fr, fontSize=6.6, leading=8.5, textColor=MUTED),
        "family_num": ParagraphStyle("family_num", parent=base["Normal"], fontName=fk, fontSize=7, leading=8, textColor=ACCENT_DARK, alignment=TA_CENTER),
        "family_title": ParagraphStyle("family_title", parent=base["Normal"], fontName=fk, fontSize=13, leading=15, textColor=INK),
        "family_subtitle": ParagraphStyle("family_subtitle", parent=base["Normal"], fontName=fr, fontSize=7.4, leading=10, textColor=MUTED),
        "sound_id": ParagraphStyle("sound_id", parent=base["Normal"], fontName=fb, fontSize=8.6, leading=10, textColor=INK),
        "sound_meta": ParagraphStyle("sound_meta", parent=base["Normal"], fontName=fr, fontSize=6.7, leading=8.2, textColor=MUTED, alignment=TA_LEFT),
        "trigger": ParagraphStyle("trigger", parent=base["Normal"], fontName=fr, fontSize=7.1, leading=9.5, textColor=MUTED),
        "screen": ParagraphStyle("screen", parent=base["Normal"], fontName=fr, fontSize=6.7, leading=8.6, textColor=MUTED),
        "prompt_label": ParagraphStyle("prompt_label", parent=base["Normal"], fontName=fk, fontSize=7.4, leading=9, textColor=ACCENT_DARK, alignment=TA_CENTER),
        "prompt": ParagraphStyle("prompt", parent=base["BodyText"], fontName=fr, fontSize=7.15, leading=9.6, textColor=INK),
        "table_head": ParagraphStyle("table_head", parent=base["Normal"], fontName=fb, fontSize=7.1, leading=9, textColor=INK),
        "table_body": ParagraphStyle("table_body", parent=base["Normal"], fontName=fr, fontSize=6.8, leading=8.7, textColor=INK),
        "center": ParagraphStyle("center", parent=base["Normal"], fontName=fr, fontSize=7.2, leading=10, textColor=MUTED, alignment=TA_CENTER),
    }


class SoundBookDoc(BaseDocTemplate):
    def __init__(self, filename: str) -> None:
        super().__init__(
            filename,
            pagesize=A4,
            leftMargin=18 * mm,
            rightMargin=18 * mm,
            topMargin=18 * mm,
            bottomMargin=16 * mm,
            title="Phraseman - экономика, нажатия и Арена",
            author="Phraseman",
            subject="29 sound moments and 87 Adobe Firefly prompts",
        )
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
        canvas.drawString(18 * mm, height - 8.2 * mm, "АУДИТ ОЗВУЧКИ - 27 АВГУСТА 2026")
        canvas.drawRightString(width - 18 * mm, height - 8.2 * mm, "Экономика, нажатия и Арена")
        canvas.line(18 * mm, 10 * mm, width - 18 * mm, 10 * mm)
        canvas.drawString(18 * mm, 6.7 * mm, "Phraseman - Королевская академия")
        canvas.drawRightString(width - 18 * mm, 6.7 * mm, f"{doc.page}")
        canvas.restoreState()


def p(text: str, style: ParagraphStyle) -> Paragraph:
    return Paragraph(sanitise(text), style)


def raw_p(text: str, style: ParagraphStyle) -> Paragraph:
    """Абзац с уже подготовленной разметкой (<br/>, <font>) — без экранирования."""
    return Paragraph(text, style)


def metric_grid(sections: list[Section], facts: dict[str, str], styles) -> Table:
    total = sum(len(s.moments) for s in sections)
    cells = [
        (facts["registry"], "событий в реестре SOUND_EVENTS"),
        (facts["stubs"], "из них без звукового файла"),
        (facts["taps"], "точек касания в приложении"),
        (str(total), "звуков в этой книге"),
        (str(total * 3), "готовых промптов"),
        (str(len(sections)), "разделов озвучки"),
    ]
    data = []
    for row in range(2):
        data.append([
            [p(cells[row * 3 + col][0], styles["metric_num"]), p(cells[row * 3 + col][1], styles["metric_label"])]
            for col in range(3)
        ])
    table = Table(data, colWidths=[58 * mm] * 3, rowHeights=[20 * mm] * 2)
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


def section_banner(section: Section, styles) -> Table:
    badge = Table([[p(str(section.number), styles["family_num"])]], colWidths=[9 * mm], rowHeights=[9 * mm])
    badge.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), ACCENT_SOFT),
        ("BOX", (0, 0), (-1, -1), 0.5, ACCENT),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
    ]))
    body = [p(section.title, styles["family_title"])]
    if section.subtitle:
        body.append(p(section.subtitle, styles["family_subtitle"]))
    table = Table([[badge, body]], colWidths=[12 * mm, 162 * mm])
    table.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("LEFTPADDING", (0, 0), (-1, -1), 0),
        ("RIGHTPADDING", (0, 0), (-1, -1), 5),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ("LINEBELOW", (0, 0), (-1, -1), 0.8, RULE),
    ]))
    return table


def prompt_row(label: str, prompt: str, styles) -> Table:
    table = Table([[raw_p(label, styles["prompt_label"]), p(prompt, styles["prompt"])]], colWidths=[22 * mm, 152 * mm])
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


def moment_block(item: Moment, styles) -> KeepTogether:
    header = Table([
        [p(item.sound_id, styles["sound_id"]), p(f"{item.duration}  /  громкость {item.volume}", styles["sound_meta"])],
        [p(item.screen, styles["screen"]), p("Момент: " + item.trigger, styles["trigger"])],
    ], colWidths=[62 * mm, 112 * mm])
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


def overview_table(sections: list[Section], styles) -> Table:
    roles = {
        1: "Изъятие ресурса: вниз по высоте, коротко, без блеска",
        2: "Три сердечка звучат по-разному - слышно приближение к краю",
        3: "Последовательность: отрыв, полёт, приземление, тики, финал",
        4: "734 точки касания - жёсткие рамки громкости и длительности",
        5: "Единственное место, где разрешён барабан",
    }
    data = [[
        p("#", styles["table_head"]),
        p("Раздел", styles["table_head"]),
        p("Роль", styles["table_head"]),
        p("Звуков", styles["table_head"]),
    ]]
    for s in sections:
        data.append([
            p(str(s.number), styles["table_body"]),
            p(s.title, styles["table_body"]),
            p(roles.get(s.number, ""), styles["table_body"]),
            p(str(len(s.moments)), styles["table_body"]),
        ])
    total = sum(len(s.moments) for s in sections)
    data.append([
        p("", styles["table_head"]),
        p("Всего", styles["table_head"]),
        p(f"{total * 3} промптов", styles["table_head"]),
        p(str(total), styles["table_head"]),
    ])
    table = Table(data, colWidths=[10 * mm, 52 * mm, 92 * mm, 20 * mm])
    table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), SOFT),
        ("BACKGROUND", (0, -1), (-1, -1), ACCENT_SOFT),
        ("BOX", (0, 0), (-1, -1), 0.5, RULE),
        ("INNERGRID", (0, 0), (-1, -1), 0.4, RULE),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ("RIGHTPADDING", (0, 0), (-1, -1), 6),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
    ]))
    return table


def silence_table(styles) -> Table:
    rows = [
        ("Трата энергии, полёт молнии", "EnergySpendFlightHost.tsx", "анимация 820 мс, ноль вызовов звука"),
        ("Потеря сердечка", "SessionAttemptsHud.tsx", "ноль вызовов звука"),
        ("Покупка восстановления за 25 рун", "SessionAttemptsRecoveryModal.tsx", "ноль вызовов звука"),
        ("Начисление рун, полёт", "LearningV2RuneFlight.tsx", "анимация 620 мс, ноль вызовов звука"),
        ("Нажатие по кнопке", "feedback_kit.ts", "звук убран владельцем, только вибрация"),
        ("Арена целиком", "sound_events.ts", "28 ключей с пустым источником"),
    ]
    data = [[
        p("Механика", styles["table_head"]),
        p("Файл", styles["table_head"]),
        p("Состояние", styles["table_head"]),
    ]]
    for mech, file, state in rows:
        data.append([
            p(mech, styles["table_body"]),
            p(file, styles["table_body"]),
            p(state, styles["table_body"]),
        ])
    table = Table(data, colWidths=[56 * mm, 58 * mm, 60 * mm])
    table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), SOFT),
        ("BOX", (0, 0), (-1, -1), 0.5, RULE),
        ("INNERGRID", (0, 0), (-1, -1), 0.4, RULE),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ("RIGHTPADDING", (0, 0), (-1, -1), 6),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
    ]))
    return table


def build_story(sections: list[Section], facts: dict[str, str], styles) -> list:
    total = sum(len(s.moments) for s in sections)
    story: list = [
        Spacer(1, 15 * mm),
        p("АУДИТ ОЗВУЧКИ - 27 АВГУСТА 2026", styles["cover_kicker"]),
        raw_p("Экономика, нажатия<br/>и Арена", styles["cover_title"]),
        p(
            "Трата энергии, потеря и покупка сердечек, начисление рун сейчас происходят полностью беззвучно: "
            "в коде этих экранов ноль вызовов звука. Нажатия отключены владельцем, Арена ждёт файлов на "
            f"{facts['arena_stubs']} готовых ключах. Здесь {total} звуков и {total * 3} промптов для Adobe Firefly "
            "Sounds в системе «Королевская академия».",
            styles["cover_body"],
        ),
        Spacer(1, 4 * mm),
        metric_grid(sections, facts, styles),
        Spacer(1, 7 * mm),
        p("Как этим пользоваться", styles["h2"]),
        p(
            "1. Найдите раздел и нужный звук. 2. Возьмите один из трёх промптов A, B или C. "
            "3. Сгенерируйте в Firefly и сохраните под именем из заголовка. 4. Отдайте файлы - подключение "
            "в реестре занимает одну строку на звук.",
            styles["body"],
        ),
        Table([[
            p("Техническая цель", styles["table_head"]),
            p("Моно, 48 кГц, -14 LUFS, пик -1 dBTP, тишина в начале обрезана, короткий чистый хвост. Формат m4a или mp3.", styles["table_body"]),
        ]], colWidths=[38 * mm, 136 * mm], style=[
            ("BACKGROUND", (0, 0), (-1, -1), ACCENT_SOFT),
            ("BOX", (0, 0), (-1, -1), 0.5, ACCENT),
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("LEFTPADDING", (0, 0), (-1, -1), 7),
            ("RIGHTPADDING", (0, 0), (-1, -1), 7),
            ("TOPPADDING", (0, 0), (-1, -1), 7),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
        ]),
        PageBreak(),
        p("Что молчит сейчас", styles["h1"]),
        p(
            "Проверено по коду, а не на слух: в перечисленных файлах нет ни одного обращения к звуковому "
            "директору. Человек теряет ресурс - приложение молчит.",
            styles["body"],
        ),
        Spacer(1, 3 * mm),
        silence_table(styles),
        Spacer(1, 7 * mm),
        p("Карта разделов", styles["h2"]),
        Spacer(1, 2 * mm),
        overview_table(sections, styles),
        Spacer(1, 7 * mm),
        p("Три варианта - три разных типа подачи", styles["h2"]),
        p(
            "A - интерфейсный: минимализм и чистота, один-два источника звука, сухо, без хвоста. "
            "B - игровой: теплее и мелодичнее, живые инструменты, узнаваемая интонация. "
            "C - кинематографичный: слой воздуха и веса, физический материал - стекло, металл, дерево, дыхание.",
            styles["body"],
        ),
        p(
            "Три промпта одного звука обязаны отличаться инструментовкой и способом звукоизвлечения, а не только "
            "прилагательными. Если A, B и C дают на слух один и тот же файл - промпт написан неправильно.",
            styles["body"],
        ),
        Spacer(1, 4 * mm),
        p("Правила системы", styles["h2"]),
        p(
            "1. Звук только за смысл, не за механику. 2. Редкие события звучат богаче, частые - тише и короче. "
            "3. Ошибка не унижает. 4. Звук приложения отделён от произношения фраз. 5. Пока звучит речь - "
            "интерфейсные звуки приглушаются. 6. Наградные звуки не наслаиваются. 7. Волны громкости: заметные, "
            "тише, заметные - ухо получает передышку.",
            styles["body"],
        ),
    ]

    for index, section in enumerate(sections):
        if index == 0:
            story.append(PageBreak())
        else:
            story.append(Spacer(1, 4 * mm))
            story.append(CondPageBreak(62 * mm))
        story.append(section_banner(section, styles))
        for item in section.moments:
            story.append(moment_block(item, styles))

    story.extend([
        Spacer(1, 6 * mm),
        CondPageBreak(90 * mm),
        p("После генерации файлов", styles["h1"]),
        p(
            "Энергия, сердечки, руны и нажатия - это новые ключи в реестре SOUND_EVENTS плюс вызовы в местах "
            "из таблицы «Что молчит сейчас». Арена - 13 ключей уже существуют, у каждого меняется пустой источник "
            "на файл, больше ничего трогать не нужно.",
            styles["body"],
        ),
        Spacer(1, 3 * mm),
        p("Контроль перед подключением", styles["h2"]),
        p(
            "Проверить имя файла, длительность, громкость, отсутствие начальной тишины, читаемость на динамике "
            "телефона, отсутствие усталости после 50 повторов и отсутствие двойного звука при одном действии. "
            "Для нажатий проверка на 50 повторах обязательна: точек касания в приложении "
            f"{facts['taps']}.",
            styles["body"],
        ),
        Spacer(1, 3 * mm),
        p("Осталось на следующую редакцию", styles["h2"]),
        p(
            "15 ключей Арены второго эшелона: search_loop, opponent_answered, timeout, result_draw, combo_start, "
            "combo_up, combo_break, pair_match, pair_miss, pair_clear, star_fly, star_land, goal_complete, "
            "reward_unlock, rank_down. Старый файл docs/arena/SOUND_PROMPTS.md использовать нельзя - он написан "
            "в манере синтезаторов и выпадет из «Королевской академии».",
            styles["body"],
        ),
        Spacer(1, 16 * mm),
        p(f"{total} звуков - {total * 3} промптов - {len(sections)} разделов", styles["center"]),
    ])
    return story


def build_pdf(output: Path) -> int:
    sections, facts = parse_source(SOURCE)
    validate(sections, facts)
    register_fonts()
    styles = make_styles("PMRegular", "PMBold", "PMBlack")
    output.parent.mkdir(parents=True, exist_ok=True)
    doc = SoundBookDoc(str(output))
    doc.build(build_story(sections, facts, styles))
    total = sum(len(s.moments) for s in sections)
    try:
        from pypdf import PdfReader
        pages = len(PdfReader(str(output)).pages)
    except ImportError:
        pages = 0
    print(f"CREATED: {output}")
    print(f"SUMMARY: {pages} pages, {len(sections)} разделов, {total} звуков, {total * 3} промптов")
    return pages


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--validate-only", action="store_true")
    parser.add_argument("--output", type=Path, default=OUTPUT)
    args = parser.parse_args()
    if args.validate_only:
        sections, facts = parse_source(SOURCE)
        validate(sections, facts)
        return
    build_pdf(args.output)


if __name__ == "__main__":
    main()
