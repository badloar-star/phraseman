from __future__ import annotations

import argparse
import json
import subprocess
from pathlib import Path
from typing import Any


KEEP_DECISIONS = {"keep", "take_selected", "visual_added"}


def load_json(path: Path) -> dict[str, Any]:
    return json.loads(path.read_text(encoding="utf-8-sig"))


def even(value: float) -> int:
    rounded = int(round(value))
    return rounded if rounded % 2 == 0 else rounded + 1


def kept_decisions(manifest: dict[str, Any]) -> list[dict[str, Any]]:
    return [
        decision
        for decision in manifest.get("editDecisions", [])
        if decision.get("decision") in KEEP_DECISIONS
        and float(decision.get("sourceEnd", 0.0)) > float(decision.get("sourceStart", 0.0))
    ]


def zoom_by_decision(manifest: dict[str, Any]) -> dict[str, float]:
    zooms: dict[str, float] = {}
    for effect in manifest.get("motionEffects", []):
        target_id = effect.get("targetId")
        if not isinstance(target_id, str):
            continue
        try:
            zoom = float(effect.get("zoom", 1.0))
        except (TypeError, ValueError):
            continue
        zooms[target_id] = min(max(zoom, 1.0), 1.12)
    return zooms


def filter_path(path: Path) -> str:
    return path.as_posix().replace("\\", "/").replace(":", r"\:").replace("'", r"\'")


def build_filter_graph(
    manifest: dict[str, Any],
    ass_path: Path | None,
    output_width: int = 1920,
    output_height: int = 1080,
    fps: int = 30,
    layout: str = "full",
    panel_width: int = 480,
    include_sfx: bool = False,
) -> str:
    decisions = kept_decisions(manifest)
    if not decisions:
        raise ValueError("manifest has no kept decisions to render")

    content_width = output_width - panel_width if layout == "side-panel" else output_width
    if content_width <= 0:
        raise ValueError("panel width must be smaller than output width")
    zooms = zoom_by_decision(manifest)
    lines: list[str] = []
    concat_inputs: list[str] = []

    for index, decision in enumerate(decisions):
        start = float(decision["sourceStart"])
        end = float(decision["sourceEnd"])
        zoom = zooms.get(decision["id"], 1.0)
        scaled_width = even(output_width * zoom)
        scaled_height = even(output_height * zoom)
        lines.append(
            f"[0:v]trim=start={start:.3f}:end={end:.3f},"
            "setpts=PTS-STARTPTS,"
            f"scale={scaled_width}:{scaled_height}:flags=lanczos,"
            f"crop={content_width}:{output_height}:0:(ih-{output_height})/2,"
            f"setsar=1,fps={fps},format=yuv420p[v{index}]"
        )
        lines.append(
            f"[0:a]atrim=start={start:.3f}:end={end:.3f},"
            f"asetpts=PTS-STARTPTS,aresample=async=1:first_pts=0[a{index}]"
        )
        concat_inputs.append(f"[v{index}][a{index}]")

    lines.append(f"{''.join(concat_inputs)}concat=n={len(decisions)}:v=1:a=1[vcat][acat]")
    if include_sfx:
        lines.append("[acat][1:a]amix=inputs=2:duration=first:dropout_transition=0:weights=1 0.22[aout]")
    else:
        lines.append("[acat]anull[aout]")
    video_label = "vcat"
    if layout == "side-panel":
        lines.append(f"[vcat]pad={output_width}:{output_height}:0:0:black[vpad]")
        video_label = "vpad"
    if ass_path is not None:
        lines.append(f"[{video_label}]subtitles=filename='{filter_path(ass_path)}',format=yuv420p[vout]")
    else:
        lines.append(f"[{video_label}]format=yuv420p[vout]")
    return ";\n".join(lines) + "\n"


def build_command(args: argparse.Namespace) -> list[str]:
    return [
        "ffmpeg",
        "-y",
        "-hide_banner",
        "-i",
        str(args.input),
        "-filter_complex_script",
        str(args.filter_complex),
        "-map",
        "[vout]",
        "-map",
        "[aout]",
        "-c:v",
        args.video_codec,
        "-preset",
        args.preset,
        "-cq",
        str(args.cq),
        "-r",
        str(args.fps),
        "-c:a",
        "aac",
        "-b:a",
        args.audio_bitrate,
        "-movflags",
        "+faststart",
        str(args.output),
    ]


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--manifest", required=True, type=Path)
    parser.add_argument("--input", required=True, type=Path)
    parser.add_argument("--output", required=True, type=Path)
    parser.add_argument("--ass", type=Path)
    parser.add_argument("--filter-complex", required=True, type=Path)
    parser.add_argument("--fps", type=int, default=30)
    parser.add_argument("--width", type=int, default=1920)
    parser.add_argument("--height", type=int, default=1080)
    parser.add_argument("--layout", choices=("full", "side-panel"), default="full")
    parser.add_argument("--panel-width", type=int, default=480)
    parser.add_argument("--video-codec", default="h264_nvenc")
    parser.add_argument("--preset", default="p4")
    parser.add_argument("--cq", type=int, default=24)
    parser.add_argument("--audio-bitrate", default="192k")
    parser.add_argument("--sfx-bed", type=Path)
    parser.add_argument("--render", action="store_true")
    args = parser.parse_args()

    manifest = load_json(args.manifest)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.filter_complex.parent.mkdir(parents=True, exist_ok=True)
    graph = build_filter_graph(
        manifest,
        args.ass,
        output_width=args.width,
        output_height=args.height,
        fps=args.fps,
        layout=args.layout,
        panel_width=args.panel_width,
        include_sfx=args.sfx_bed is not None,
    )
    args.filter_complex.write_text(graph, encoding="utf-8")
    command = build_command(args)
    if args.sfx_bed is not None:
        command[command.index("-filter_complex_script"):command.index("-filter_complex_script")] = ["-i", str(args.sfx_bed)]
    if args.render:
        subprocess.run(command, check=True)
    else:
        print(" ".join(command))


if __name__ == "__main__":
    main()
