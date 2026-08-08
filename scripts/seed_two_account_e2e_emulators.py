import json
import os
import sqlite3
import subprocess
import sys
import tempfile
from pathlib import Path


APP_ID = "app.phraseman"
ADB = Path(os.environ.get("LOCALAPPDATA", "")) / "Android" / "Sdk" / "platform-tools" / "adb.exe"
TARGET_AVDS = {
    "Pixel_8_5": {
        "name": "QA League A",
        "stable_id": "11111111-1111-4111-8111-111111111111",
        "xp": "16500",
        "points": 420,
    },
    "Pixel_8_4": {
        "name": "QA League B",
        "stable_id": "22222222-2222-4222-8222-222222222222",
        "xp": "16400",
        "points": 410,
    },
}
WEEK_ID = "2026-W20"
LEAGUE_ID = 2
GROUP_ID = f"qa-two-account-{WEEK_ID.lower()}"


def run(args, **kwargs):
    return subprocess.run([str(ADB), *args], check=True, **kwargs)


def out(args) -> str:
    return run(args, stdout=subprocess.PIPE, stderr=subprocess.DEVNULL).stdout.decode("utf-8", "ignore").strip()


def serials_by_avd() -> dict[str, str]:
    raw = out(["devices"])
    serials = [line.split()[0] for line in raw.splitlines() if line.startswith("emulator-") and "\tdevice" in line]
    found: dict[str, str] = {}
    for serial in serials:
        name = out(["-s", serial, "emu", "avd", "name"]).splitlines()[0].strip()
        if name in TARGET_AVDS:
            found[name] = serial
    missing = [name for name in TARGET_AVDS if name not in found]
    if missing:
        raise RuntimeError(f"missing target AVD(s): {', '.join(missing)}")
    return found


def push_rk(serial: str, db_path: Path) -> None:
    remote = "/data/local/tmp/RKStorage.e2e"
    run(["-s", serial, "push", str(db_path), remote], stdout=subprocess.DEVNULL)
    run(["-s", serial, "shell", "chmod", "666", remote])
    run(["-s", serial, "shell", "run-as", APP_ID, "mkdir", "-p", "databases"])
    run(["-s", serial, "shell", "run-as", APP_ID, "cp", remote, "databases/RKStorage"])
    for suffix in ("-journal", "-wal", "-shm"):
        run(["-s", serial, "shell", "run-as", APP_ID, "rm", "-f", f"databases/RKStorage{suffix}"])


def pull_rk(serial: str, db_path: Path) -> None:
    try:
        data = subprocess.check_output([str(ADB), "-s", serial, "exec-out", "run-as", APP_ID, "cat", "databases/RKStorage"])
    except subprocess.CalledProcessError:
        data = b""
    db_path.write_bytes(data)
    if not data.startswith(b"SQLite format 3"):
        db_path.unlink(missing_ok=True)
        con = sqlite3.connect(db_path)
        try:
            con.execute("CREATE TABLE android_metadata (locale TEXT)")
            con.execute("INSERT INTO android_metadata(locale) VALUES('en_US')")
            con.execute("CREATE TABLE catalystLocalStorage (key TEXT PRIMARY KEY, value TEXT NOT NULL)")
            con.commit()
        finally:
            con.close()


def make_group() -> list[dict]:
    rows = [
        {"uid": cfg["stable_id"], "name": cfg["name"], "points": cfg["points"], "avatar": "15"}
        for cfg in TARGET_AVDS.values()
    ]
    rows.extend(
        [
            {"uid": "qa-bot-ava", "name": "Ava", "points": 380, "avatar": "14"},
            {"uid": "qa-bot-mia", "name": "Mia", "points": 360, "avatar": "13"},
            {"uid": "qa-bot-leo", "name": "Leo", "points": 340, "avatar": "12"},
        ]
    )
    return sorted(rows, key=lambda row: row["points"], reverse=True)


def seed_device(serial: str, avd_name: str) -> None:
    cfg = TARGET_AVDS[avd_name]
    run(["-s", serial, "shell", "am", "force-stop", APP_ID])
    with tempfile.TemporaryDirectory() as td:
        db_path = Path(td) / "RKStorage"
        pull_rk(serial, db_path)
        con = sqlite3.connect(db_path)
        try:
            con.execute("CREATE TABLE IF NOT EXISTS catalystLocalStorage (key TEXT PRIMARY KEY, value TEXT NOT NULL)")
            current = con.execute(
                "SELECT value FROM catalystLocalStorage WHERE key = 'phraseman_stable_uid_cache'"
            ).fetchone()
            if current and str(current[0]).strip():
                cfg["stable_id"] = str(current[0]).strip()
            group = []
            for row in make_group():
                group.append({**row, "isMe": row["uid"] == cfg["stable_id"]})

            room = {"groupId": GROUP_ID, "weekId": WEEK_ID, "leagueId": LEAGUE_ID}
            league_state = {"leagueId": LEAGUE_ID, "weekId": WEEK_ID, "groupId": GROUP_ID, "group": group}
            week_points = {"weekKey": WEEK_ID, "points": cfg["points"]}
            leaderboard_cache = {
                "uid": cfg["stable_id"],
                "name": cfg["name"],
                "points": int(cfg["xp"]),
                "leagueId": LEAGUE_ID,
                "groupId": GROUP_ID,
                "groupWeekId": WEEK_ID,
                "weekPoints": cfg["points"],
            }
            values = {
                "onboarding_done": "1",
                "auth_onboarding_done_v1": "1",
                "xp_migration_v2": "1",
                "cloud_migration_v1": "1",
                "pending_level_up_queue": "[]",
                "app_lang": "ru",
                "notifications_enabled": "false",
                "tester_no_limits": "true",
                "tester_energy_disabled": "true",
                "user_name": cfg["name"],
                "user_total_xp": cfg["xp"],
                "user_prev_xp": cfg["xp"],
                "streak_count": "21",
                "shards_balance": "500",
                "league_state_v3": json.dumps(league_state, separators=(",", ":")),
                "week_points_v2": json.dumps(week_points, separators=(",", ":")),
                "leaderboard_cache_v1": json.dumps(leaderboard_cache, separators=(",", ":")),
            }
            con.executemany(
                "INSERT OR REPLACE INTO catalystLocalStorage(key, value) VALUES(?, ?)",
                [(k, str(v)) for k, v in values.items()],
            )
            con.commit()
        finally:
            con.close()
        push_rk(serial, db_path)
    run(["-s", serial, "reverse", "tcp:8081", "tcp:8081"], stdout=subprocess.DEVNULL)
    print(f"{avd_name} ({serial}): seeded {cfg['name']} / {cfg['stable_id']}")


def main() -> int:
    if not ADB.exists():
        print(f"adb not found: {ADB}", file=sys.stderr)
        return 2
    found = serials_by_avd()
    for avd_name in ("Pixel_8_5", "Pixel_8_4"):
        seed_device(found[avd_name], avd_name)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
