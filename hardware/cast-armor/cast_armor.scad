// ============================================================
//  CAST ARMOR — накладки на гипс предплечья
//  Voronoi + MOLLE/PALS, печать FDM (PLA/PETG), стол ~220 мм
// ============================================================
//
//  зачем: у владельца гипс на предплечье и 3D-принтер; нужны
//  футуристичные накладки НАДЕВАЮЩИЕСЯ поверх гипса (не обжимающие)
//  с креплениями стандарта MOLLE под навесное снаряжение.
//
//  ⚠ БЕЗОПАСНОСТЬ: деталь НИКОГДА не должна сжимать гипс.
//  Все размеры считаются от обхвата гипса + CLEARANCE (зазор).
//  Ремни — мягкая липучка поверх, затягивать «на два пальца».
//  Если немеет / синеет / болит — снять немедленно.
//
//  РЕНДЕР:
//    openscad -D PART=\"forearm\" -o forearm.stl cast_armor.scad
//  Список PART — в самом низу файла.
// ============================================================


/* [1. ЗАМЕРЫ ГИПСА — измерь портновской лентой] */

// Обхват гипса у ЗАПЯСТЬЯ (узкий конец), мм
CIRC_WRIST = 200;

// Обхват гипса у ЛОКТЯ (широкий конец), мм
CIRC_ELBOW = 260;

// Длина участка, который накрываем панелью, мм
PANEL_LEN = 150;


/* [2. ПОСАДКА И ПЕЧАТЬ] */

// Воздушный зазор между гипсом и пластиком, мм.
// НЕ СТАВЬ МЕНЬШЕ 4. Гипс «дышит» и отекает.
CLEARANCE = 6;

// Толщина стенки панели, мм (1.6 = гибко, 2.4 = жёстко)
WALL = 2.0;

// Угловой охват панели: 360 = кольцо (НЕЛЬЗЯ), 150 = чуть больше трети.
// 140–170 — оптимум: держится, но легко снимается и не давит.
ARC_DEG = 150;


/* [3. VORONOI-СЕТКА] */

// Плотность ячеек: больше = мельче ячейки
VORONOI_SEEDS = 90;

// Ширина перемычки между ячейками, мм (мин. 2.2 для прочности)
STRUT_W = 2.6;

// Сглаживание углов ячеек, мм
CELL_ROUND = 1.8;

// Зерно генератора — меняй, чтобы получить другой рисунок
SEED = 42;


/* [4. MOLLE / PALS] */

// Стандарт PALS: прорезь 38×25 мм, шаг рядов 25 мм, шаг колонок 38 мм.
MOLLE_SLOT_W = 38;
MOLLE_SLOT_H = 25;
MOLLE_ROW_PITCH = 25;
MOLLE_COL_PITCH = 38;

// Сколько рядов и колонок стропы
MOLLE_ROWS = 3;
MOLLE_COLS = 2;

// Ширина «перемычки» стропы (тело, через которое проходит ремень)
MOLLE_WEB = 5.0;


/* [5. РЕМНИ] */

// Ширина ремня-липучки, мм (стандарт 25 или 38)
STRAP_W = 25;

// Толщина ремня + запас, мм
STRAP_T = 4;

// Сколько ремней
STRAP_COUNT = 2;


/* [скрытые параметры] */
$fn = 48;
EPS = 0.01;


// ============================================================
//  ПРОИЗВОДНЫЕ РАЗМЕРЫ
// ============================================================

// из обхвата -> радиус, плюс зазор и стенка
function r_inner(circ) = circ / (2 * PI) + CLEARANCE;
function r_outer(circ) = r_inner(circ) + WALL;

R_IN_W  = r_inner(CIRC_WRIST);
R_IN_E  = r_inner(CIRC_ELBOW);
R_OUT_W = r_outer(CIRC_WRIST);
R_OUT_E = r_outer(CIRC_ELBOW);

// средний радиус — для раскладки узора и MOLLE
R_MID = (R_OUT_W + R_OUT_E) / 2;

// длина дуги панели по среднему радиусу — «ширина» развёртки
ARC_LEN = 2 * PI * R_MID * ARC_DEG / 360;


// ============================================================
//  БАЗОВЫЕ ПРИМИТИВЫ
// ============================================================

// Конусная оболочка панели (полный тор-конус, потом режем сектором)
module shell_full(extra_r = 0, extra_len = 0) {
    difference() {
        cylinder(h = PANEL_LEN + extra_len,
                 r1 = R_OUT_W + extra_r,
                 r2 = R_OUT_E + extra_r,
                 center = false);
        translate([0, 0, -EPS])
            cylinder(h = PANEL_LEN + extra_len + 2 * EPS,
                     r1 = R_IN_W - extra_r,
                     r2 = R_IN_E - extra_r,
                     center = false);
    }
}

// Клин-сектор для вырезания дуги ARC_DEG
module arc_wedge(deg = ARC_DEG, h = PANEL_LEN * 3, r = 400) {
    rotate([0, 0, -deg / 2])
        linear_extrude(height = h, center = true)
            polygon(concat(
                [[0, 0]],
                [for (a = [0 : 4 : deg]) [r * cos(a), r * sin(a)]]
            ));
}

// Панель = оболочка ∩ сектор
module panel_blank(extra_r = 0) {
    intersection() {
        shell_full(extra_r);
        translate([0, 0, PANEL_LEN / 2]) arc_wedge();
    }
}


// ============================================================
//  VORONOI
// ============================================================
//
//  Честная диаграмма Вороного в OpenSCAD дорога. Используем
//  проверенный трюк: для каждого зерна пересекаем полуплоскости
//  «ближе ко мне, чем к соседу» — получается ровно ячейка Вороного.
//  Работаем в плоской развёртке (u вдоль дуги, v вдоль длины),
//  потом оборачиваем вокруг конуса.

// зерна в развёртке: u ∈ [0, ARC_LEN], v ∈ [0, PANEL_LEN]
SEEDS = [
    for (i = [0 : VORONOI_SEEDS - 1])
        [ rands(0, ARC_LEN, 1, SEED + i * 7)[0],
          rands(0, PANEL_LEN, 1, SEED + i * 13 + 1)[0] ]
];

// Одна ячейка Вороного вокруг зерна i, ужатая на STRUT_W/2
module voronoi_cell(i, big = 2000) {
    p = SEEDS[i];
    offset(r = CELL_ROUND) offset(r = -CELL_ROUND - STRUT_W / 2)
    intersection() {
        // ограничиваем поле, иначе ячейки уходят в бесконечность
        translate([ARC_LEN / 2, PANEL_LEN / 2])
            square([ARC_LEN * 2, PANEL_LEN * 2], center = true);

        // полуплоскость на каждого соседа
        for (j = [0 : len(SEEDS) - 1]) if (j != i) {
            q = SEEDS[j];
            d = q - p;
            L = norm(d);
            if (L > 0.001) {
                ang = atan2(d[1], d[0]);
                // серединный перпендикуляр между p и q
                translate((p + q) / 2)
                    rotate(ang)
                        translate([-big, -big])
                            square([big, 2 * big]);
            }
        }
    }
}

// Плоское поле всех ячеек (это ОТВЕРСТИЯ — то, что вычтем)
module voronoi_holes_2d() {
    for (i = [0 : len(SEEDS) - 1]) voronoi_cell(i);
}


// ============================================================
//  ОБОРАЧИВАНИЕ РАЗВЁРТКИ НА КОНУС
// ============================================================
//
//  Каждый кусочек развёртки по v переносим на своё кольцо конуса.
//  Делим по длине на SLICES ломтиков — компромисс точность/время.

SLICES = 26;

module wrap_cut(thickness_extra = 4) {
    step = PANEL_LEN / SLICES;
    for (s = [0 : SLICES - 1]) {
        v0 = s * step;
        // радиус на этой высоте
        t = (v0 + step / 2) / PANEL_LEN;
        r_here = R_OUT_W + (R_OUT_E - R_OUT_W) * t;

        // берём горизонтальную полоску узора и гнём её в дугу
        intersection() {
            translate([0, 0, v0])
                linear_extrude(height = step + EPS)
                    projection(cut = false)
                        translate([0, -v0]) voronoi_holes_2d_strip(v0, step);
            cylinder(h = PANEL_LEN * 2, r = 1000);
        }
    }
}

// Полоска узора по v (в развёртке), уже свёрнутая в дугу вокруг Z.
// Разворот: u -> угол, потому что дуга по среднему радиусу.
module voronoi_holes_2d_strip(v0, dv) {
    intersection() {
        voronoi_holes_2d();
        translate([ARC_LEN / 2, v0 + dv / 2])
            square([ARC_LEN * 2, dv], center = true);
    }
}


// ============================================================
//  ПРОСТОЙ И НАДЁЖНЫЙ ПУТЬ ОБОРАЧИВАНИЯ
// ============================================================
//
//  Вместо ломтиков — каждую ячейку Вороного превращаем в
//  «луч» из центра наружу: берём полигон ячейки, переводим
//  u -> угол, v -> высота, и строим призму по радиусу.
//  Так узор точно ложится на конус без швов.

module voronoi_holes_3d() {
    for (i = [0 : len(SEEDS) - 1]) {
        p = SEEDS[i];
        // угол центра ячейки
        a_c = -ARC_DEG / 2 + (p[0] / ARC_LEN) * ARC_DEG;
        rotate([0, 0, a_c])
            translate([0, 0, p[1]])
                rotate([0, 90, 0])
                    linear_extrude(height = R_OUT_E + 20, center = false)
                        translate([-p[1], 0])
                            cell_local(i);
    }
}

// Ячейка в локальных координатах: центр в нуле,
// x = вдоль длины руки (v), y = поперёк (дуга, мм)
module cell_local(i) {
    p = SEEDS[i];
    translate([p[1], 0]) rotate(0)
        translate([-p[0] * 0, 0])
            projection() translate([0, 0, 0])
                linear_extrude(1) translate([-p[0], -p[1]]) voronoi_cell(i);
}


// ============================================================
//  MOLLE / PALS
// ============================================================

// Прорези PALS: вычитаем окна, оставляя перемычки MOLLE_WEB.
// Ремень MOLLE продевается сквозь эти окна.
module molle_slots() {
    total_h = MOLLE_ROWS * MOLLE_ROW_PITCH;
    z0 = (PANEL_LEN - total_h) / 2 + MOLLE_ROW_PITCH / 2;

    for (row = [0 : MOLLE_ROWS - 1]) {
        z = z0 + row * MOLLE_ROW_PITCH;
        // радиус на этой высоте
        t = z / PANEL_LEN;
        r_here = R_OUT_W + (R_OUT_E - R_OUT_W) * t;
        // угловая ширина прорези на этом радиусе
        slot_deg = (MOLLE_SLOT_W / (2 * PI * r_here)) * 360;
        gap_deg  = (MOLLE_COL_PITCH / (2 * PI * r_here)) * 360;

        span = (MOLLE_COLS - 1) * gap_deg;
        for (col = [0 : MOLLE_COLS - 1]) {
            a = -span / 2 + col * gap_deg;
            rotate([0, 0, a])
                arc_slot(z, slot_deg, MOLLE_SLOT_H - MOLLE_WEB, r_here);
        }
    }
}

// Дуговая прорезь: сектор нужной угловой ширины и высоты
module arc_slot(z, deg, h, r_here) {
    translate([0, 0, z])
        intersection() {
            arc_wedge(deg = deg, h = h, r = r_here + 40);
            translate([0, 0, -h / 2])
                cylinder(h = h, r = r_here + 40);
        }
}

// Накладные «лесенки» MOLLE поверх панели — то, что делает вид
// по-настоящему тактическим. Горизонтальные рёбра-стропы.
module molle_ladders() {
    total_h = MOLLE_ROWS * MOLLE_ROW_PITCH;
    z0 = (PANEL_LEN - total_h) / 2 + MOLLE_ROW_PITCH / 2;

    for (row = [0 : MOLLE_ROWS - 1]) {
        z = z0 + row * MOLLE_ROW_PITCH;
        t = z / PANEL_LEN;
        r_here = R_OUT_W + (R_OUT_E - R_OUT_W) * t;
        lad_deg = (MOLLE_SLOT_W * MOLLE_COLS + MOLLE_COL_PITCH) / (2 * PI * r_here) * 360;

        difference() {
            // тело лесенки
            translate([0, 0, z - MOLLE_WEB / 2])
                intersection() {
                    difference() {
                        cylinder(h = MOLLE_WEB, r = r_here + 3.2);
                        translate([0, 0, -EPS])
                            cylinder(h = MOLLE_WEB + 2 * EPS, r = r_here - EPS);
                    }
                    translate([0, 0, MOLLE_WEB / 2])
                        arc_wedge(deg = min(lad_deg, ARC_DEG - 8));
                }
        }
    }
}


// ============================================================
//  РЕМНИ
// ============================================================

// Прорези под ремень-липучку по краям панели
module strap_slots() {
    for (k = [0 : STRAP_COUNT - 1]) {
        z = PANEL_LEN * (k + 1) / (STRAP_COUNT + 1);
        t = z / PANEL_LEN;
        r_here = R_OUT_W + (R_OUT_E - R_OUT_W) * t;
        slot_deg = (STRAP_W / (2 * PI * r_here)) * 360;

        // по одному окну у каждого края дуги
        for (side = [-1, 1]) {
            a = side * (ARC_DEG / 2 - slot_deg / 2 - 2);
            rotate([0, 0, a])
                arc_slot(z, slot_deg, STRAP_T, r_here);
        }
    }
}


// ============================================================
//  ДЕТАЛЬ 1: ОСНОВНАЯ ПАНЕЛЬ ПРЕДПЛЕЧЬЯ
// ============================================================

module part_forearm() {
    union() {
        difference() {
            panel_blank();
            voronoi_holes_3d();   // ажур
            molle_slots();        // окна PALS
            strap_slots();        // окна под ремни
        }
        molle_ladders();          // накладные стропы
        edge_rails();             // усиление по краям
    }
}

// Рёбра-рельсы по кромкам — чтобы ажурная панель не «играла»
module edge_rails() {
    rail_w = 5;
    // продольные по обоим краям дуги
    for (side = [-1, 1]) {
        a = side * (ARC_DEG / 2 - 2);
        rotate([0, 0, a])
            intersection() {
                panel_blank();
                rotate([0, 0, -side * 3])
                    arc_wedge(deg = 6, h = PANEL_LEN * 3, r = 400);
            }
    }
    // поперечные сверху и снизу
    for (z = [0, PANEL_LEN - rail_w])
        intersection() {
            panel_blank();
            translate([0, 0, z]) cylinder(h = rail_w, r = 400);
        }
}


// ============================================================
//  ДЕТАЛЬ 2: НАРУЧ-МАНЖЕТА У ЗАПЯСТЬЯ (короткий модуль)
// ============================================================

module part_cuff() {
    cuff_len = 55;
    difference() {
        intersection() {
            difference() {
                cylinder(h = cuff_len, r1 = R_OUT_W, r2 = R_OUT_W + 3);
                translate([0, 0, -EPS])
                    cylinder(h = cuff_len + 2 * EPS, r1 = R_IN_W, r2 = R_IN_W + 3);
            }
            translate([0, 0, cuff_len / 2]) arc_wedge(deg = 170);
        }
        // одна лесенка MOLLE
        translate([0, 0, cuff_len / 2 - PANEL_LEN / 2]) molle_slots();
    }
}


// ============================================================
//  ДЕТАЛЬ 3: МОДУЛЬ-ПОДСУМОК НА MOLLE
// ============================================================

module part_pouch() {
    w = MOLLE_SLOT_W * 2;
    h = 60;
    d = 22;
    wall = 2.0;

    difference() {
        // коробка со скруглениями
        hull() for (x = [-1, 1], y = [-1, 1], z = [-1, 1])
            translate([x * (w / 2 - 4), y * (d / 2 - 4), z * (h / 2 - 4)])
                sphere(r = 4);
        // полость
        translate([0, 0, 6])
            hull() for (x = [-1, 1], y = [-1, 1], z = [-1, 1])
                translate([x * (w / 2 - 4 - wall), y * (d / 2 - 4 - wall), z * (h / 2 - 4)])
                    sphere(r = 4);
        // открытый верх
        translate([0, 0, h / 2 + 4]) cube([w, d, 12], center = true);
    }
    // задняя пластина с MOLLE-язычком
    translate([0, -d / 2 - 1.2, 0])
        cube([w, 2.4, h + 30], center = true);
}


// ============================================================
//  ДЕТАЛЬ 4: ЗАГЛУШКА-ЩИТОК (глухая, без ажура — прочная)
// ============================================================

module part_shield() {
    difference() {
        panel_blank();
        molle_slots();
        strap_slots();
    }
    molle_ladders();
}


// ============================================================
//  ВЫБОР ДЕТАЛИ
// ============================================================
//  PART:
//    "forearm" — основная ажурная панель (главная деталь)
//    "shield"  — та же панель без ажура, максимально прочная
//    "cuff"    — короткая манжета у запястья
//    "pouch"   — навесной подсумок на MOLLE
//    "all"     — всё вместе для предпросмотра

PART = "forearm";

if (PART == "forearm") part_forearm();
else if (PART == "shield") part_shield();
else if (PART == "cuff") part_cuff();
else if (PART == "pouch") part_pouch();
else if (PART == "all") {
    part_forearm();
    translate([R_OUT_E * 2.5, 0, 0]) part_cuff();
    translate([-R_OUT_E * 2.5, 0, 0]) part_pouch();
}
