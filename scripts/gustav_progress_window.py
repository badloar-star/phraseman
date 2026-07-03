#!/usr/bin/env python3
"""Small local progress window for Gustav work.

The script intentionally reads local JSON files only. It does not talk to the
browser, Firebase, the app runtime or network services.

Usage:
  python scripts/gustav_progress_window.py
  python scripts/gustav_progress_window.py --task "Building French quiz bank" --progress 12 --status running
"""

from __future__ import annotations

import argparse
import json
import os
import time
import tkinter as tk
from pathlib import Path
from tkinter import ttk


ROOT = Path(__file__).resolve().parents[1]
STATE_PATH = ROOT / "docs" / "gustav" / "state.json"
PROGRESS_PATH = ROOT / "docs" / "gustav" / "progress_state.json"


def read_json(path: Path) -> dict:
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return {}


def write_progress_from_args(args: argparse.Namespace) -> None:
    if args.task is None and args.status is None and args.progress is None:
        return
    current = read_json(PROGRESS_PATH)
    current.update(
        {
            "updatedAt": time.strftime("%Y-%m-%dT%H:%M:%S%z"),
            "task": args.task if args.task is not None else current.get("task", ""),
            "status": args.status if args.status is not None else current.get("status", "idle"),
            "progress": args.progress if args.progress is not None else current.get("progress", 0),
            "detail": args.detail if args.detail is not None else current.get("detail", ""),
        }
    )
    PROGRESS_PATH.write_text(json.dumps(current, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def first_next_action(state: dict) -> str:
    actions = state.get("nextActions")
    if isinstance(actions, list) and actions:
        return str(actions[0])
    return "No next action recorded."


def run_window() -> None:
    root = tk.Tk()
    root.title("Gustav Progress")
    root.geometry("620x260")
    root.minsize(520, 220)

    task_var = tk.StringVar(value="Loading Gustav state...")
    status_var = tk.StringVar(value="")
    detail_var = tk.StringVar(value="")
    updated_var = tk.StringVar(value="")
    progress_var = tk.DoubleVar(value=0)

    frame = ttk.Frame(root, padding=18)
    frame.pack(fill="both", expand=True)

    ttk.Label(frame, text="Current Gustav Task", font=("Segoe UI", 13, "bold")).pack(anchor="w")
    ttk.Label(frame, textvariable=task_var, wraplength=560, justify="left").pack(anchor="w", pady=(8, 10))
    ttk.Progressbar(frame, variable=progress_var, maximum=100).pack(fill="x", pady=(0, 8))
    ttk.Label(frame, textvariable=status_var).pack(anchor="w")
    ttk.Label(frame, textvariable=detail_var, wraplength=560, justify="left").pack(anchor="w", pady=(6, 0))
    ttk.Label(frame, textvariable=updated_var, foreground="#666").pack(anchor="w", pady=(10, 0))

    def refresh() -> None:
        state = read_json(STATE_PATH)
        progress = read_json(PROGRESS_PATH)
        task = progress.get("task") or first_next_action(state)
        status = progress.get("status") or state.get("languages", {}).get("fr", {}).get("stage", "unknown")
        detail = progress.get("detail") or state.get("activation", {}).get("state", "")
        percent = progress.get("progress", 0)
        try:
            percent = max(0, min(100, float(percent)))
        except Exception:
            percent = 0

        task_var.set(str(task))
        status_var.set(f"Status: {status} | Progress: {percent:.0f}%")
        detail_var.set(str(detail))
        updated_var.set(f"State: {STATE_PATH} | Progress: {PROGRESS_PATH}")
        progress_var.set(percent)
        root.after(1500, refresh)

    refresh()
    root.mainloop()


def main() -> None:
    parser = argparse.ArgumentParser(description="Show or update Gustav progress in a local Python window.")
    parser.add_argument("--task", help="Current Gustav task label.")
    parser.add_argument("--status", help="Current task status, for example running/pass/hold/block.")
    parser.add_argument("--progress", type=float, help="Current task progress percent, 0..100.")
    parser.add_argument("--detail", help="Short detail line.")
    parser.add_argument("--no-window", action="store_true", help="Only update progress_state.json, do not open Tk window.")
    args = parser.parse_args()

    os.chdir(ROOT)
    write_progress_from_args(args)
    if not args.no_window:
        run_window()


if __name__ == "__main__":
    main()
