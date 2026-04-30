#!/usr/bin/env python3
"""
Analyze Claude session files and apply unapplied edits/writes.
Sessions: 18 Apr morning, 09:05-12:55
"""

import json
import os
import re
from pathlib import Path

SESSION_DIR = Path("C:/Users/badlo/.claude/projects/c--appsprojects-phraseman")
PROJECT_ROOT = Path("c:/appsprojects/phraseman")
OUTPUT_FILE = PROJECT_ROOT / "scripts/sessions_morning_analysis.txt"

SESSION_FILES = [
    "dca4eba4-ee3e-4fc2-909f-a01dd5ac39f2.jsonl",  # 09:05
    "a9f317e2-3dc7-4488-a9b1-cd2a18e30949.jsonl",  # 10:38
    "75ec9482-b8e9-4d08-bf11-e37170764462.jsonl",  # 11:11
    "ab6ff238-b065-42fe-804f-427246de0afe.jsonl",  # 11:15
    "1483959d-c857-4eb1-bbb5-d72b3ccfc8fa.jsonl",  # 11:42
    "327644f1-bedc-47de-9962-1a0629f5c1ab.jsonl",  # 11:58
    "a813499c-f63c-46c8-93d3-68e174bb43ec.jsonl",  # 12:41
    "1eb4d6e8-d2b7-47a5-b8af-c09c0d72e323.jsonl",  # 12:55
]

def normalize_path(path_str):
    """Normalize path to check if it's in the project."""
    if not path_str:
        return None
    p = path_str.replace("\\", "/").lower()
    # Must be in phraseman project
    if "appsprojects/phraseman" not in p and "appsprojects\\phraseman" not in p.replace("/", "\\"):
        return None
    # Skip settings/claude internal files
    if "/users/badlo/.claude" in p:
        return None
    return path_str

def get_real_path(path_str):
    """Convert path to actual filesystem path."""
    # Normalize separators
    p = path_str.replace("\\", "/")
    # Already absolute
    if os.path.isabs(p) or (len(p) > 1 and p[1] == ':'):
        return Path(p)
    return PROJECT_ROOT / p

def extract_operations(session_file):
    """Extract Edit and Write operations from a session JSONL file."""
    ops = []
    filepath = SESSION_DIR / session_file

    if not filepath.exists():
        print(f"WARNING: Session file not found: {filepath}")
        return ops

    with open(filepath, 'r', encoding='utf-8', errors='replace') as f:
        for line_num, line in enumerate(f, 1):
            line = line.strip()
            if not line:
                continue
            try:
                entry = json.loads(line)
            except json.JSONDecodeError:
                continue

            # Look for tool use in messages
            msg = entry.get('message', {})
            if not msg:
                continue

            content = msg.get('content', [])
            if not isinstance(content, list):
                continue

            for item in content:
                if not isinstance(item, dict):
                    continue

                if item.get('type') == 'tool_use':
                    tool_name = item.get('name', '')
                    tool_input = item.get('input', {})

                    if tool_name == 'Edit':
                        file_path = tool_input.get('file_path', '')
                        if normalize_path(file_path):
                            ops.append({
                                'type': 'Edit',
                                'session': session_file,
                                'file_path': file_path,
                                'old_string': tool_input.get('old_string', ''),
                                'new_string': tool_input.get('new_string', ''),
                                'replace_all': tool_input.get('replace_all', False),
                            })

                    elif tool_name == 'Write':
                        file_path = tool_input.get('file_path', '')
                        if normalize_path(file_path):
                            ops.append({
                                'type': 'Write',
                                'session': session_file,
                                'file_path': file_path,
                                'content': tool_input.get('content', ''),
                            })

    return ops

def check_edit_status(op):
    """Check if an Edit operation has been applied."""
    real_path = get_real_path(op['file_path'])

    if not real_path.exists():
        return 'file_missing'

    try:
        content = real_path.read_text(encoding='utf-8', errors='replace')
    except Exception as e:
        return f'read_error: {e}'

    old_str = op['old_string']
    new_str = op['new_string']

    if op.get('replace_all'):
        if old_str in content:
            return 'not_applied'
        elif new_str in content or old_str not in content:
            return 'already_applied'
    else:
        if old_str in content:
            return 'not_applied'
        elif new_str and new_str in content:
            return 'already_applied'
        else:
            return 'cannot_apply'

def check_write_status(op):
    """Check if a Write operation has been applied."""
    real_path = get_real_path(op['file_path'])

    if not real_path.exists():
        return 'not_applied'

    try:
        current = real_path.read_text(encoding='utf-8', errors='replace')
    except Exception as e:
        return f'read_error: {e}'

    if current == op['content']:
        return 'already_applied'
    else:
        return 'not_applied'

def apply_edit(op):
    """Apply an Edit operation."""
    real_path = get_real_path(op['file_path'])

    try:
        content = real_path.read_text(encoding='utf-8', errors='replace')
    except Exception as e:
        return False, f'read_error: {e}'

    old_str = op['old_string']
    new_str = op['new_string']

    if op.get('replace_all'):
        if old_str not in content:
            return False, 'old_string not found'
        new_content = content.replace(old_str, new_str)
    else:
        if old_str not in content:
            return False, 'old_string not found'
        # Replace only first occurrence
        new_content = content.replace(old_str, new_str, 1)

    try:
        real_path.write_text(new_content, encoding='utf-8')
        return True, 'applied'
    except Exception as e:
        return False, f'write_error: {e}'

def apply_write(op):
    """Apply a Write operation."""
    real_path = get_real_path(op['file_path'])

    try:
        real_path.parent.mkdir(parents=True, exist_ok=True)
        real_path.write_text(op['content'], encoding='utf-8')
        return True, 'applied'
    except Exception as e:
        return False, f'write_error: {e}'

def main():
    print("=== Analyzing Morning Sessions (18 Apr) ===\n")

    all_ops = []

    for session_file in SESSION_FILES:
        ops = extract_operations(session_file)
        print(f"Session {session_file[:8]}...: {len(ops)} ops found")
        all_ops.extend(ops)

    print(f"\nTotal operations found: {len(all_ops)}")

    # Separate by type
    edit_ops = [op for op in all_ops if op['type'] == 'Edit']
    write_ops = [op for op in all_ops if op['type'] == 'Write']
    print(f"  Edit ops: {len(edit_ops)}")
    print(f"  Write ops: {len(write_ops)}")

    # Process Write ops first (in order), then Edit ops
    # For writes, later sessions override earlier ones for the same file
    # Deduplicate writes: keep last write per file
    write_by_file = {}
    for op in write_ops:
        write_by_file[op['file_path']] = op

    results = {
        'edit_total': len(edit_ops),
        'edit_applied': 0,
        'edit_already': 0,
        'edit_cannot': 0,
        'edit_file_missing': 0,
        'write_total': len(write_by_file),
        'write_applied': 0,
        'write_already': 0,
        'changed_files': {},
    }

    report_lines = []
    report_lines.append("=== MORNING SESSIONS ANALYSIS (18 Apr 09:05-12:55) ===\n")
    report_lines.append(f"Sessions analyzed: {len(SESSION_FILES)}")
    report_lines.append(f"Total Edit ops: {len(edit_ops)}")
    report_lines.append(f"Total Write ops (unique files): {len(write_by_file)}\n")

    # Process edits in order
    report_lines.append("--- EDIT OPERATIONS ---\n")
    for i, op in enumerate(edit_ops):
        status = check_edit_status(op)

        short_path = op['file_path'].replace('c:/appsprojects/phraseman/', '').replace('c:\\appsprojects\\phraseman\\', '')
        old_preview = op['old_string'][:60].replace('\n', '\\n') if op['old_string'] else ''

        if status == 'not_applied':
            success, msg = apply_edit(op)
            if success:
                results['edit_applied'] += 1
                results['changed_files'][op['file_path']] = results['changed_files'].get(op['file_path'], [])
                results['changed_files'][op['file_path']].append(f"EDIT applied: {old_preview}...")
                status_str = "APPLIED"
            else:
                results['edit_cannot'] += 1
                status_str = f"FAILED: {msg}"
        elif status == 'already_applied':
            results['edit_already'] += 1
            status_str = "already applied"
        elif status == 'file_missing':
            results['edit_file_missing'] += 1
            status_str = "FILE MISSING"
        else:
            results['edit_cannot'] += 1
            status_str = f"cannot apply ({status})"

        session_short = op['session'][:8]
        report_lines.append(f"[{i+1:03d}] [{session_short}] {short_path}")
        report_lines.append(f"      Status: {status_str}")
        report_lines.append(f"      Old: {old_preview}")
        report_lines.append("")

    # Process writes
    report_lines.append("\n--- WRITE OPERATIONS (unique files, last session wins) ---\n")
    for file_path, op in write_by_file.items():
        status = check_write_status(op)
        short_path = file_path.replace('c:/appsprojects/phraseman/', '').replace('c:\\appsprojects\\phraseman\\', '')

        if status == 'not_applied':
            success, msg = apply_write(op)
            if success:
                results['write_applied'] += 1
                results['changed_files'][file_path] = results['changed_files'].get(file_path, [])
                results['changed_files'][file_path].append(f"WRITE applied ({len(op['content'])} chars)")
                status_str = f"APPLIED ({len(op['content'])} chars)"
            else:
                status_str = f"FAILED: {msg}"
        elif status == 'already_applied':
            results['write_already'] += 1
            status_str = "already applied"
        else:
            status_str = f"unknown: {status}"

        session_short = op['session'][:8]
        report_lines.append(f"[W] [{session_short}] {short_path}")
        report_lines.append(f"    Status: {status_str}")
        report_lines.append("")

    # Summary
    report_lines.append("\n=== SUMMARY ===\n")
    report_lines.append(f"EDIT ops total:          {results['edit_total']}")
    report_lines.append(f"  Applied now:           {results['edit_applied']}")
    report_lines.append(f"  Already applied:       {results['edit_already']}")
    report_lines.append(f"  Cannot apply:          {results['edit_cannot']}")
    report_lines.append(f"  File missing:          {results['edit_file_missing']}")
    report_lines.append(f"\nWRITE ops (unique files): {results['write_total']}")
    report_lines.append(f"  Applied now:           {results['write_applied']}")
    report_lines.append(f"  Already applied:       {results['write_already']}")

    if results['changed_files']:
        report_lines.append(f"\n--- FILES CHANGED ({len(results['changed_files'])}) ---")
        for fp, actions in results['changed_files'].items():
            short = fp.replace('c:/appsprojects/phraseman/', '').replace('c:\\appsprojects\\phraseman\\', '')
            report_lines.append(f"\n  {short}:")
            for a in actions:
                report_lines.append(f"    - {a}")

    report_text = "\n".join(report_lines)

    # Write report
    OUTPUT_FILE.write_text(report_text, encoding='utf-8')
    print(f"\nReport written to: {OUTPUT_FILE}")
    print("\n" + report_text[-3000:])

if __name__ == '__main__':
    main()
