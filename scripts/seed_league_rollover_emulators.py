import json
import os
import sqlite3
import subprocess
import sys
import tempfile
from pathlib import Path


APP_ID = "app.phraseman"
ADB = Path(os.environ.get("LOCALAPPDATA", "")) / "Android" / "Sdk" / "platform-tools" / "adb.exe"


def run(args, **kwargs):
    return subprocess.run([str(ADB), *args], check=True, **kwargs)


def adb_bytes(serial: str, args: list[str]) -> bytes:
    return run(["-s", serial, *args], stdout=subprocess.PIPE).stdout


def pull_rk(serial: str, out_path: Path) -> None:
    try:
        data = adb_bytes(serial, ["exec-out", "run-as", APP_ID, "cat", "databases/RKStorage"])
    except subprocess.CalledProcessError:
        data = b""
    out_path.write_bytes(data)
    if not data.startswith(b"SQLite format 3"):
        out_path.unlink(missing_ok=True)
        con = sqlite3.connect(out_path)
        try:
            con.execute("CREATE TABLE IF NOT EXISTS catalystLocalStorage (key TEXT PRIMARY KEY, value TEXT NOT NULL)")
            con.commit()
        finally:
            con.close()


def push_rk(serial: str, db_path: Path) -> None:
    remote = "/data/local/tmp/RKStorage.seed"
    run(["-s", serial, "push", str(db_path), remote], stdout=subprocess.DEVNULL)
    run(["-s", serial, "shell", "chmod", "666", remote])
    run(["-s", serial, "shell", "run-as", APP_ID, "mkdir", "-p", "databases"])
    run(["-s", serial, "shell", "run-as", APP_ID, "cp", remote, "databases/RKStorage"])
    run(["-s", serial, "shell", "run-as", APP_ID, "rm", "-f", "databases/RKStorage-journal"])
    run(["-s", serial, "shell", "run-as", APP_ID, "rm", "-f", "databases/RKStorage-wal"])
    run(["-s", serial, "shell", "run-as", APP_ID, "rm", "-f", "databases/RKStorage-shm"])


def member(uid: str, name: str, points: int, is_me: bool = False):
    return {"uid": uid, "name": name, "points": points, "isMe": is_me}


def group_for(rank: int, my_points: int):
    rows = [
        member("u1", "Ava", 990),
        member("u2", "Mia", 870),
        member("u3", "Leo", 760),
        member("u4", "Noah", 640),
        member("u5", "Eli", 520),
        member("u6", "Zoe", 410),
        member("u7", "Ivy", 300),
        member("u8", "Max", 180),
        member("u9", "Sol", 80),
    ]
    rows.append(member("me", "QA Monday", my_points, True))
    return sorted(rows, key=lambda r: r["points"], reverse=True)


def pending(prev_league: int, new_league: int, rank: int, my_points: int, promoted: bool, demoted: bool):
    group = group_for(rank, my_points)
    return {
        "prevLeagueId": prev_league,
        "newLeagueId": new_league,
        "myRank": rank,
        "totalInGroup": len(group),
        "promoted": promoted,
        "demoted": demoted,
        "group": group,
    }


SCENARIOS = {
    "emulator-5554": {
        "label": "server_pending_promotion",
        "league_state": {"leagueId": 1, "weekId": "2026-W20", "group": group_for(1, 1200)},
        "league_result_pending": pending(0, 1, 1, 1200, True, False),
        "week_points_v2": {"weekKey": "2026-W19", "points": 1200},
        "xp": "12000",
        "streak": "14",
    },
    "emulator-5566": {
        "label": "server_pending_promotion_pixel",
        "league_state": {"leagueId": 1, "weekId": "2026-W20", "group": group_for(1, 1200)},
        "league_result_pending": pending(0, 1, 1, 1200, True, False),
        "week_points_v2": {"weekKey": "2026-W19", "points": 1200},
        "xp": "12000",
        "streak": "14",
    },
    "emulator-5556": {
        "label": "local_engine_demote_from_previous_week",
        "league_state": {"leagueId": 2, "weekId": "2026-W19", "group": group_for(10, 20)},
        "league_result_pending": None,
        "week_points_v2": {"weekKey": "2026-W19", "points": 20},
        "xp": "13000",
        "streak": "20",
    },
    "emulator-5558": {
        "label": "server_pending_stay",
        "league_state": {"leagueId": 3, "weekId": "2026-W20", "group": group_for(5, 520)},
        "league_result_pending": pending(3, 3, 5, 520, False, False),
        "week_points_v2": {"weekKey": "2026-W19", "points": 520},
        "xp": "9000",
        "streak": "7",
    },
    "emulator-5564": {
        "label": "server_pending_stay_fold",
        "league_state": {"leagueId": 3, "weekId": "2026-W20", "group": group_for(5, 520)},
        "league_result_pending": pending(3, 3, 5, 520, False, False),
        "week_points_v2": {"weekKey": "2026-W19", "points": 520},
        "xp": "9000",
        "streak": "7",
    },
}


BASE_SET = {
    "onboarding_done": "1",
    "user_name": "QA Monday",
    "app_lang": "ru",
    "tester_no_limits": "true",
    "notifications_enabled": "false",
    "cloud_migration_v1": "1",
}

REMOVE_KEYS = [
    "pending_level_up_queue",
    "login_bonus_pending",
    "comeback_pending",
    "premium_celebration_pending",
    "premium_admin_grant_pending",
    "release_notes_pending",
    "league_result_pending",
    "league_result_consumed_sig",
]


def seed(serial: str, scenario: dict) -> None:
    run(["-s", serial, "shell", "am", "force-stop", APP_ID])
    with tempfile.TemporaryDirectory() as td:
        db_path = Path(td) / f"RKStorage.{serial}"
        pull_rk(serial, db_path)
        con = sqlite3.connect(db_path)
        try:
            cur = con.cursor()
            cur.execute("CREATE TABLE IF NOT EXISTS catalystLocalStorage (key TEXT PRIMARY KEY, value TEXT NOT NULL)")
            for key in REMOVE_KEYS:
                cur.execute("DELETE FROM catalystLocalStorage WHERE key = ?", (key,))
            values = dict(BASE_SET)
            values.update(
                {
                    "user_total_xp": scenario["xp"],
                    "streak_count": scenario["streak"],
                    "league_state_v3": json.dumps(scenario["league_state"], separators=(",", ":")),
                    "week_points_v2": json.dumps(scenario["week_points_v2"], separators=(",", ":")),
                }
            )
            if scenario["league_result_pending"] is not None:
                values["league_result_pending"] = json.dumps(scenario["league_result_pending"], separators=(",", ":"))
            for key, value in values.items():
                cur.execute(
                    "INSERT OR REPLACE INTO catalystLocalStorage(key, value) VALUES(?, ?)",
                    (key, str(value)),
                )
            con.commit()
        finally:
            con.close()
        push_rk(serial, db_path)


def main() -> int:
    if not ADB.exists():
        print(f"adb not found: {ADB}", file=sys.stderr)
        return 2
    serials = sys.argv[1:] or list(SCENARIOS.keys())
    for serial in serials:
        scenario = SCENARIOS.get(serial)
        if not scenario:
            print(f"no scenario for {serial}", file=sys.stderr)
            return 3
        seed(serial, scenario)
        print(f"{serial}: seeded {scenario['label']}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
