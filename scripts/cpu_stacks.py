"""Что держит JS-поток в окне холодного старта: стэки вызовов из профиля Hermes (.cpuprofile).

зачем (Ядро 13.10, профиль Сверки ×3 a5d12a5e6): разбор scripts/hermes_cpuprofile.mjs печатает ЛИСТЬЯ — «__native_constructor__
3,3–3,8 с» без хозяина приняли за простой. Стэки показали: prewarm → ensure → createAudioPlayer (прогрев звуков, 21d429827).
Этот разбор печатает включительное время функций и стэки листьев в заданном окне секунд — видно, ЧЕЙ код стоит в паузе.

Запуск (только чтение файла профиля, сеть и Firebase не трогает):
    python -X utf8 scripts/cpu_stacks.py C:/Temp/claude/cold1.cpuprofile [C:/Temp/claude/cold2.cpuprofile ...] --from 5 --to 12
Профиль снимается по R1_PERF_FIRST_FRAME §5б (scripts/hermes_cpuprofile.mjs --out <файл>).
Номера строк вида `ensure:873605` — строки dev-бандла; имя функции обычно достаточно, чтобы найти её grep-ом.
"""
import argparse
import collections
import json

# Первая дельта профиля Hermes через CDP — время «от эпохи» (≈3·10^10 мкс), её заменяем шагом сэмплирования.
FIRST_DELTA_US = 17_000


def load(path):
    with open(path, encoding='utf-8') as fh:
        return json.load(fh)


def analyze(path, start_s, end_s, top_incl, top_leaf, depth):
    profile = load(path)
    nodes = {node['id']: node for node in profile['nodes']}
    parent = {}
    for node in profile['nodes']:
        for child in node.get('children', []):
            parent[child] = node['id']
    deltas = profile['timeDeltas'][:]
    if len(deltas) > 1:
        deltas[1] = FIRST_DELTA_US
    stamps = []
    acc = 0
    for delta in deltas:
        acc += delta
        stamps.append(acc / 1e6)
    samples = profile['samples']

    def label(node_id):
        frame = nodes[node_id]['callFrame']
        name = frame['functionName'] or '(anon)'
        url = frame.get('url', '')
        return f"{name}:{frame.get('lineNumber')}" if 'platform=' in url or url.startswith('http') else name

    def chain(node_id):
        out = []
        while node_id in nodes:
            name = label(node_id)
            if name.startswith('(root)'):
                break
            out.append(name)
            node_id = parent.get(node_id)
            if node_id is None:
                break
        return out

    inclusive = collections.Counter()
    leaves = collections.Counter()
    total_ms = 0.0
    for index, node_id in enumerate(samples):
        if not (start_s <= stamps[index] < end_s):
            continue
        dur_ms = (deltas[index + 1] if index + 1 < len(deltas) else FIRST_DELTA_US) / 1000
        total_ms += dur_ms
        frames = chain(node_id)
        for name in set(frames):
            inclusive[name] += dur_ms
        leaves[' < '.join(frames[:depth])] += dur_ms

    print(f'=== {path}: окно +{start_s}…+{end_s} с, всего {total_ms:.0f} мс')
    print(f' включительное время (топ-{top_incl}):')
    for name, ms in inclusive.most_common(top_incl):
        print(f'  {ms:6.0f}  {name[:110]}')
    print(f' стэки листьев (топ-{top_leaf}):')
    for stack, ms in leaves.most_common(top_leaf):
        print(f'  {ms:6.0f}  {stack[:300]}')


def main():
    parser = argparse.ArgumentParser(description='Стэки JS-потока в окне холодного старта (Hermes .cpuprofile)')
    parser.add_argument('profiles', nargs='+', help='файлы .cpuprofile')
    parser.add_argument('--from', dest='start', type=float, default=5.0, help='начало окна, с от начала профиля')
    parser.add_argument('--to', dest='end', type=float, default=12.0, help='конец окна, с')
    parser.add_argument('--top', type=int, default=35, help='сколько функций по включительному времени')
    parser.add_argument('--leaves', type=int, default=15, help='сколько стэков листьев')
    parser.add_argument('--depth', type=int, default=7, help='глубина стэка листа')
    args = parser.parse_args()
    for path in args.profiles:
        analyze(path, args.start, args.end, args.top, args.leaves, args.depth)


if __name__ == '__main__':
    main()
