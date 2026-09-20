"""Кадрирование 9:16 ПО ЛИЦУ, а не по центру кадра.

зачем: первая версия делала scale+crop по центру. В интервью герой сидит
справа, и центральная обрезка резала его пополам — владелец справедливо назвал
это халтурой 20.09.2026. Здесь мы ищем лицо и ведём рамку за ним.

Как устроено:
  1. Проходим отрезок с шагом (не каждый кадр — это дорого и не нужно).
  2. В каждой пробе ищем лицо каскадом Хаара из OpenCV.
  3. Берём медиану найденных позиций — устойчиво к единичным ложным срабатываниям.
  4. Сглаживаем и отдаём ОДНУ константную рамку на отрезок.

Почему константная рамка, а не слежение покадрово: у говорящей головы в
интервью лицо почти не двигается, а дрожащая рамка выглядит дёшево и заметна
сильнее, чем небольшое смещение. Если лицо реально уезжает — считаем рамку
отдельно для каждого отрезка, и этого достаточно.
"""
from __future__ import annotations

import statistics
from pathlib import Path

TAG = "[CLIPPER][framing]"


def _load_detector():
    """Каскад Хаара едет вместе с OpenCV — отдельных весов качать не нужно."""
    try:
        import cv2
    except ImportError as exc:
        print(f"{TAG} РАННИЙ ВЫХОД: нет opencv ({exc}). pip install opencv-python-headless")
        return None, None
    base = Path(cv2.data.haarcascades)
    path = base / "haarcascade_frontalface_default.xml"
    if not path.exists():
        print(f"{TAG} РАННИЙ ВЫХОД: нет файла каскада {path}")
        return None, None
    detector = cv2.CascadeClassifier(str(path))
    if detector.empty():
        print(f"{TAG} РАННИЙ ВЫХОД: каскад не загрузился из {path}")
        return None, None
    return cv2, detector


def find_face_box(video: Path, start: float, end: float,
                  samples: int = 9) -> tuple[float | None, float | None, float, int]:
    """Возвращает (центр X, центр Y, высота лица — всё в долях кадра, число проб).

    зачем не только X: кадрируя лишь по горизонтали, мы ставили лицо в
    геометрический центр рамки — макушка уезжала за верх кадра (поймано
    20.09.2026 на готовом ролике). Нужен и вертикальный центр, и размер
    лица, чтобы оставить воздух над головой.
    """
    cv2, detector = _load_detector()
    if detector is None:
        return None, None, 0.0, 0

    cap = cv2.VideoCapture(str(video))
    if not cap.isOpened():
        print(f"{TAG} РАННИЙ ВЫХОД: OpenCV не открыл {video.name}")
        return None, None, 0.0, 0

    width = cap.get(cv2.CAP_PROP_FRAME_WIDTH) or 0
    height = cap.get(cv2.CAP_PROP_FRAME_HEIGHT) or 0
    if width <= 0 or height <= 0:
        print(f"{TAG} РАННИЙ ВЫХОД: размер кадра {width}x{height} — файл битый?")
        cap.release()
        return None, None, 0.0, 0

    span = max(0.1, end - start)
    step = span / max(1, samples - 1)
    xs: list[float] = []
    ys: list[float] = []
    hs: list[float] = []
    checked = 0

    for i in range(samples):
        ts = start + i * step
        cap.set(cv2.CAP_PROP_POS_MSEC, ts * 1000.0)
        ok, frame = cap.read()
        if not ok:
            print(f"{TAG} проба {i + 1}/{samples} на {ts:.1f}с: кадр не прочитался")
            continue
        checked += 1
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        gray = cv2.equalizeHist(gray)  # ровнее работает на тёмных интервью
        faces = detector.detectMultiScale(gray, scaleFactor=1.12, minNeighbors=6,
                                          minSize=(90, 90))
        if len(faces) == 0:
            continue
        # зачем самое крупное: на общем плане в кадр попадают лица на фоне,
        # но говорит тот, кто ближе к камере.
        x, y, w, fh = max(faces, key=lambda f: f[2] * f[3])
        xs.append((x + w / 2.0) / width)
        ys.append((y + fh / 2.0) / height)
        hs.append(fh / height)

    cap.release()

    if not xs:
        print(f"{TAG} лицо не найдено ни в одной из {checked} проб "
              f"на отрезке {start:.1f}..{end:.1f}с")
        return None, None, 0.0, 0

    cx = statistics.median(xs)
    cy = statistics.median(ys)
    fh = statistics.median(hs)
    spread = max(xs) - min(xs)
    print(f"{TAG} лицо найдено в {len(xs)} из {checked} проб · "
          f"центр x={cx:.3f} y={cy:.3f} · высота лица={fh:.3f} · разброс={spread:.3f}")
    return cx, cy, fh, len(xs)


# зачем размытый фон, а не обрезка: при крупном плане (лицо занимает 28-44%
# высоты исходника) рамка 9:16, ВЫРЕЗАННАЯ из кадра, физически не вмещает
# голову с воздухом ПЛЮС место под текст — арифметика даёт 99% высоты.
# Две попытки с crop провалились 20.09.2026, вторая оказалась хуже первой:
# уменьшение рамки УВЕЛИЧИВАЕТ картинку после scale. Поэтому берём кадр
# целиком, ставим в верхнюю часть, пустоту заливаем размытой копией кадра.
SRC_CROP_RATIO = 1.5    # из 16:9 берём кусок 1.5:1 — убираем лишний воздух по бокам
# зачем 0.70, а не 0.62: при 0.62 под героем оставалось большое тёмное поле —
# в паузе туда ложится текст, но в ЖИВОМ видео это читалось как дыра
# (видно на кадре 20.09.2026). Трём строкам разбора хватает и 30% высоты.
PLATE_SHARE = 0.70      # какую долю высоты ролика занимает герой
EYE_TARGET = 0.28       # куда ставим глаза по высоте готового ролика
FACE_EYE_OFFSET = 0.18  # глаза выше центра лица на эту долю ВЫСОТЫ ЛИЦА


def _even(value: float) -> int:
    """yuv420p требует чётных размеров у КАЖДОГО слоя, иначе ffmpeg падает."""
    return int(round(value / 2.0)) * 2


def compose_filter(src_w: int, src_h: int, out_w: int, out_h: int,
                   center_x: float | None, center_y: float | None = None,
                   face_h: float = 0.0, blur_bg: bool = True) -> str:
    """Вертикальный кадр: резкий герой сверху + размытый фон из того же кадра.

    Координаты лица нужны для двух вещей:
      - не срезать голову сбоку (герой сидит на 0.58-0.68 ширины);
      - держать глаза на одной высоте во всех отрезках, иначе на склейках
        голова прыгает (в исходнике лицо стоит на 0.33 и на 0.43 — разброс
        в 10% кадра виден как рывок).
    """
    # --- плашка героя ---
    plate_h = _even(out_h * PLATE_SHARE)
    crop_w = _even(min(src_w, src_h * SRC_CROP_RATIO))
    crop_h = _even(src_h)
    plate_w = _even(crop_w * plate_h / crop_h)

    if center_x is None:
        cx = src_w / 2.0
        print(f"{TAG} ВНИМАНИЕ: лица нет — беру центр кадра, "
              f"герой может оказаться сбоку")
    else:
        cx = center_x * src_w

    # зачем сужаем вырезку: при crop_w=1620 сдвиг упирался в край исходника
    # (нужно 499 px, доступно 300) — лицо оставалось справа, слева висела
    # пустая стена. Владелец 20.09.2026: «он не в центре». Берём ровно столько,
    # сколько позволяет ПОЛНОСТЬЮ отцентрировать лицо, но не уже половины кадра.
    max_half = min(cx, src_w - cx)            # сколько есть по бокам от лица
    fit_w = _even(min(crop_w, max_half * 2))
    if fit_w < crop_w:
        min_w = _even(src_w * 0.5)
        fit_w = max(fit_w, min_w)
        print(f"{TAG} вырезка сужена {crop_w} -> {fit_w}, чтобы лицо встало по центру")
    crop_w = fit_w
    plate_w = _even(crop_w * plate_h / crop_h)

    left = _even(max(0.0, min(cx - crop_w / 2.0, src_w - crop_w)))
    face_in_plate = (cx - left) / crop_w
    if face_in_plate > 0.62 or face_in_plate < 0.38:
        print(f"{TAG} ВНИМАНИЕ: лицо на {face_in_plate:.2f} ширины вырезки — "
              f"исходник не даёт сдвинуть дальше")

    # --- позиция плашки по вертикали: глаза на EYE_TARGET ---
    if center_y is None:
        overlay_y = _even(out_h * 0.06)
        print(f"{TAG} вертикаль: лица нет — плашка от y={overlay_y}")
    else:
        eye_in_plate = center_y - FACE_EYE_OFFSET * face_h
        overlay_y = _even(out_h * EYE_TARGET - eye_in_plate * plate_h)
        # зажим: плашка не должна улететь за верх или оголить низ
        overlay_y = _even(max(-plate_h * 0.05,
                              min(overlay_y, out_h - plate_h * 0.95)))
        print(f"{TAG} вертикаль: глаза на {eye_in_plate:.3f} плашки -> "
              f"плашка от y={overlay_y}, глаза окажутся на "
              f"{(overlay_y + eye_in_plate * plate_h) / out_h:.3f} ролика")

    # зачем не геометрический центр: плашка шире экрана, и центрирование «по
    # середине» оставляло лицо сбоку. Ставим так, чтобы ЛИЦО попало на середину
    # ролика, и только потом зажимаем, чтобы не оголить края.
    face_px_in_plate = (cx - left) / crop_w * plate_w
    overlay_x = _even(out_w / 2.0 - face_px_in_plate)
    overlay_x = _even(max(min(overlay_x, 0), out_w - plate_w))
    face_on_screen = (overlay_x + face_px_in_plate) / out_w
    print(f"{TAG} горизонталь: лицо окажется на {face_on_screen:.3f} ширины ролика "
          f"(плашка {plate_w} от x={overlay_x})")
    text_top = (overlay_y + plate_h) / out_h
    print(f"{TAG} плашка {plate_w}x{plate_h} в ({overlay_x},{overlay_y}) · "
          f"под текст свободно с {text_top:.2f} высоты")

    # --- фон ---
    # зачем переключатель: владелец 20.09.2026 потребовал убрать размытые поля
    # сверху и снизу совсем. Полностью без полей нельзя — при крупном плане
    # (лицо 28-44% высоты) рамка 9:16, вырезанная из кадра, не вмещает голову
    # с воздухом; две попытки обрезки уже провалились. Поэтому «без блюра»
    # означает сплошной чёрный, а не отсутствие полей.
    if blur_bg:
        # размываем 136x240 вместо 1080x1920 — в десятки раз дешевле, а глазом
        # неотличимо: блюр всё равно убивает мелкие детали.
        # noise против бандинга: гладкий градиент + h264 дают ступеньки.
        bg = (f"[0:v]scale={out_w}:{out_h}:force_original_aspect_ratio=increase,"
              f"crop={out_w}:{out_h},scale=136:240,boxblur=6:2,"
              f"scale={out_w}:{out_h}:flags=bilinear,"
              f"eq=brightness=-0.16:saturation=0.55,"
              f"noise=alls=4:allf=t+u[bg]")
        print(f"{TAG} фон: размытая копия кадра")
    else:
        # зачем через scale+drawbox, а не crop: попытка вырезать 1080x1920 из
        # кадра с force_original_aspect_ratio=decrease давала кадр МЕНЬШЕ
        # нужного, и ffmpeg падал с -22 Invalid argument (20.09.2026).
        # Растягиваем кадр до нужного размера и заливаем его чёрным целиком —
        # длительность потока при этом сохраняется.
        bg = (f"[0:v]scale={out_w}:{out_h}:force_original_aspect_ratio=increase,"
              f"crop={out_w}:{out_h},"
              f"drawbox=x=0:y=0:w=iw:h=ih:color=black:t=fill[bg]")
        print(f"{TAG} фон: сплошной чёрный (блюр отключён)")
    fg = (f"[0:v]crop={crop_w}:{crop_h}:{left}:0,"
          f"scale={plate_w}:{plate_h}:flags=lanczos[fg]")
    # зачем БЕЗ растушёвки стыка: пробовал две тёмные полосы по границам
    # плашки (20.09.2026) — стало хуже. drawbox рисует во всю ширину РОЛИКА,
    # а плашка шире экрана и уходит за края, поэтому полосы легли посреди
    # картинки: серая черта под свитером и вторая у горизонта. Голый стык
    # спокойнее, чем ложная линия поперёк кадра.
    over = f"[bg][fg]overlay=x={overlay_x}:y={overlay_y}:shortest=1,setsar=1"
    return f"{bg};{fg};{over}"


def text_zone_top(src_h: int, out_h: int, center_y: float | None,
                  face_h: float = 0.0) -> float:
    """Доля высоты, ниже которой можно класть текст, не залезая на лицо."""
    plate_h = _even(out_h * PLATE_SHARE)
    if center_y is None:
        return (_even(out_h * 0.06) + plate_h) / out_h
    eye_in_plate = center_y - FACE_EYE_OFFSET * face_h
    overlay_y = _even(out_h * EYE_TARGET - eye_in_plate * plate_h)
    overlay_y = _even(max(-plate_h * 0.05, min(overlay_y, out_h - plate_h * 0.95)))
    return (overlay_y + plate_h) / out_h


def fullframe_filter(src_w: int, src_h: int, out_w: int, out_h: int,
                     center_x: float | None) -> str:
    """Кадр 9:16 НА ВЕСЬ ЭКРАН: ни полей, ни фона, ни плашки.

    зачем отдельной функцией, а не флагом в compose_filter: там цепочка со
    ссылками [bg]/[fg] и overlay — здесь она не нужна вовсе. Одна линейная
    цепочка crop+scale, и полей не возникает ПО ПОСТРОЕНИЮ, а не потому, что
    их чем-то закрасили.

    зачем берём ВСЮ высоту исходника: прежний вывод «9:16 не вмещает голову»
    был ошибочным — он получен на рамке МЕНЬШЕ полной высоты (950px, 88%),
    что увеличивало картинку после scale и срезало макушку. На полной высоте
    (608x1080 из 1920x1080) голова помещается: замер 20.09.2026 дал макушку
    на y=43..139 при высоте кадра 1080, то есть внутри с запасом.

    Цена решения: по горизонтали остаётся 608px из 1920 — боковой план
    теряется. Это неизбежно для полноэкранной вертикали.
    """
    crop_h = _even(src_h)
    crop_w = _even(crop_h * out_w / out_h)

    if crop_w > src_w:
        # исходник уже нужного — тогда режем по высоте, поля всё равно не нужны
        crop_w = _even(src_w)
        crop_h = _even(crop_w * out_h / out_w)
        top = _even(max(0.0, (src_h - crop_h) / 2.0))
        print(f"{TAG} исходник узкий ({src_w}x{src_h}) — режу по высоте, "
              f"рамка {crop_w}x{crop_h} от y={top}")
        return (f"crop={crop_w}:{crop_h}:0:{top},"
                f"scale={out_w}:{out_h}:flags=lanczos,setsar=1")

    if center_x is None:
        cx = src_w / 2.0
        print(f"{TAG} ВНИМАНИЕ: лица нет — беру центр кадра по горизонтали")
    else:
        cx = center_x * src_w

    # зажим: рамка не должна вылезти за края исходника
    left = _even(max(0.0, min(cx - crop_w / 2.0, src_w - crop_w)))
    face_on_screen = (cx - left) / crop_w
    print(f"{TAG} полный кадр: рамка {crop_w}x{crop_h} от x={left} · "
          f"лицо окажется на {face_on_screen:.3f} ширины")
    if face_on_screen > 0.72 or face_on_screen < 0.28:
        print(f"{TAG} ВНИМАНИЕ: лицо на краю ({face_on_screen:.2f}) — "
              f"исходник не даёт сдвинуть рамку дальше")

    return (f"crop={crop_w}:{crop_h}:{left}:0,"
            f"scale={out_w}:{out_h}:flags=lanczos,setsar=1")
