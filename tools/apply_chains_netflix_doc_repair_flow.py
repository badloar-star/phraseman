#!/usr/bin/env python3
"""Run the approved Netflix-documentary repair flow for the Chains draft."""

from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path


REPORT_PATH = Path("exports/chains/episode1/unique_explanations_approved/netflix_doc_repair_flow_report.json")
COMMANDS = [
    ["python", "tools/build_chains_intro_semantic_montage.py"],
    ["python", "tools/remove_chains_explanations_close_gaps.py"],
    ["python", "tools/apply_chains_intro_semantic_background.py"],
    ["python", "tools/repair_chains_intro_vo_cta_gaps.py"],
    [
        "python",
        "tools/capcut_chains_quality_gate.py",
        "--skip-explanation-gate",
        "--report",
        "exports/chains/episode1/unique_explanations_approved/capcut_chains_quality_gate_no_explanations_report.json",
    ],
]


def capcut_is_open() -> bool:
    result = subprocess.run(
        ["tasklist", "/FI", "IMAGENAME eq CapCut.exe"],
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="ignore",
        check=False,
    )
    return "CapCut.exe" in result.stdout


def main() -> int:
    if capcut_is_open():
        raise SystemExit("CapCut is open. Close CapCut before running the Netflix-documentary repair flow.")

    report: list[dict[str, object]] = []
    for command in COMMANDS:
        result = subprocess.run(
            command,
            capture_output=True,
            text=True,
            encoding="utf-8",
            errors="replace",
            check=False,
        )
        item = {
            "command": command,
            "returncode": result.returncode,
            "stdout_tail": result.stdout[-4000:],
            "stderr_tail": result.stderr[-4000:],
        }
        report.append(item)
        REPORT_PATH.parent.mkdir(parents=True, exist_ok=True)
        REPORT_PATH.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
        if result.returncode != 0:
            print(json.dumps(item, ensure_ascii=False, indent=2))
            return result.returncode

    print(json.dumps({"passed": True, "steps": len(report), "report": str(REPORT_PATH)}, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    sys.exit(main())
