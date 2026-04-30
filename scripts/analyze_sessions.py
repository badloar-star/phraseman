#!/usr/bin/env python3
"""
Analyze Claude session JSONL files and apply Edit/Write operations
for files in c:/appsprojects/phraseman
"""

import json
import os
import re

SESSION_FILES = [
    "C:/Users/badlo/.claude/projects/c--appsprojects-phraseman/fa8a53f6-4276-4a25-88c5-6b8bde5879ef.jsonl",
    "C:/Users/badlo/.claude/projects/c--appsprojects-phraseman/f03ded42-448c-40fe-bd13-aa58f6b76f79.jsonl",
    "C:/Users/badlo/.claude/projects/c--appsprojects-phraseman/560c3309-c253-4584-9b47-f73b75269a20.jsonl",
    "C:/Users/badlo/.claude/projects/c--appsprojects-phraseman/0506cde2-bb1e-484c-9395-b86120e16785.jsonl",
]

PROJECT_ROOT = "c:/appsprojects/phraseman"
REPORT_PATH = "c:/appsprojects/phraseman/scripts/sessions_evening_analysis.txt"

def normalize_path(p):
    if not p:
        return p
    p = p.replace("\\", "/")
    # Normalize drive letter
    if re.match(r'^[Cc]:', p):
        p = 'c:' + p[2:]
    return p

def is_project_file(path):
    if not path:
        return False
    p = normalize_path(path)
    return p.lower().startswith("c:/appsprojects/phraseman")

def read_file_safe(path):
    real_path = normalize_path(path)
    # Convert to Windows path for os operations
    win_path = real_path.replace("/", "\\")
    try:
        with open(win_path, 'r', encoding='utf-8') as f:
            return f.read()
    except:
        try:
            with open(real_path, 'r', encoding='utf-8') as f:
                return f.read()
        except:
            return None

def write_file_safe(path, content):
    real_path = normalize_path(path)
    win_path = real_path.replace("/", "\\")
    os.makedirs(os.path.dirname(win_path), exist_ok=True)
    with open(win_path, 'w', encoding='utf-8') as f:
        f.write(content)

def extract_operations(session_file):
    """Extract all Edit and Write tool calls from a session file."""
    ops = []
    try:
        with open(session_file, 'r', encoding='utf-8') as f:
            for line in f:
                line = line.strip()
                if not line:
                    continue
                try:
                    entry = json.loads(line)
                except:
                    continue

                # Look for tool use in messages
                msg = entry.get('message', {})
                content = msg.get('content', [])
                if isinstance(content, list):
                    for block in content:
                        if isinstance(block, dict) and block.get('type') == 'tool_use':
                            tool_name = block.get('name', '')
                            inp = block.get('input', {})
                            if tool_name == 'Edit':
                                ops.append({
                                    'type': 'Edit',
                                    'file_path': inp.get('file_path', ''),
                                    'old_string': inp.get('old_string', ''),
                                    'new_string': inp.get('new_string', ''),
                                    'replace_all': inp.get('replace_all', False),
                                    'session': os.path.basename(session_file),
                                })
                            elif tool_name == 'Write':
                                ops.append({
                                    'type': 'Write',
                                    'file_path': inp.get('file_path', ''),
                                    'content': inp.get('content', ''),
                                    'session': os.path.basename(session_file),
                                })
    except Exception as e:
        print(f"Error reading {session_file}: {e}")
    return ops

def apply_edit(op):
    """Apply an Edit operation. Returns status string."""
    path = op['file_path']
    old_str = op['old_string']
    new_str = op['new_string']
    replace_all = op.get('replace_all', False)

    content = read_file_safe(path)
    if content is None:
        return 'FILE_NOT_FOUND'

    if old_str not in content:
        # Check if new_string is already there (already applied)
        if new_str and new_str in content:
            return 'ALREADY_APPLIED'
        return 'OLD_STRING_NOT_FOUND'

    if replace_all:
        new_content = content.replace(old_str, new_str)
    else:
        new_content = content.replace(old_str, new_str, 1)

    write_file_safe(path, new_content)
    return 'APPLIED'

def apply_write(op):
    """Apply a Write operation. Returns status string."""
    path = op['file_path']
    content = op['content']

    existing = read_file_safe(path)
    if existing is None:
        write_file_safe(path, content)
        return 'CREATED'

    if existing == content:
        return 'ALREADY_IDENTICAL'

    # Check similarity - if file is significantly different, write it
    # Simple heuristic: if more than 20% different, rewrite
    existing_lines = set(existing.splitlines())
    new_lines = set(content.splitlines())
    if len(new_lines) == 0:
        return 'EMPTY_CONTENT_SKIP'

    overlap = len(existing_lines & new_lines) / max(len(new_lines), 1)
    if overlap < 0.8:
        write_file_safe(path, content)
        return f'WRITTEN (overlap={overlap:.0%})'
    else:
        return f'SKIPPED_SIMILAR (overlap={overlap:.0%})'

def main():
    report_lines = []
    report_lines.append("=" * 70)
    report_lines.append("SESSION ANALYSIS REPORT - 17-18 Apr 2026")
    report_lines.append("Sessions analyzed:")
    for sf in SESSION_FILES:
        report_lines.append(f"  - {os.path.basename(sf)}")
    report_lines.append("=" * 70)
    report_lines.append("")

    all_ops = []
    for sf in SESSION_FILES:
        ops = extract_operations(sf)
        report_lines.append(f"Session {os.path.basename(sf)}: {len(ops)} operations found")
        all_ops.extend(ops)

    report_lines.append(f"\nTotal operations extracted: {len(all_ops)}")
    report_lines.append("")

    # Filter to project files only
    project_ops = [op for op in all_ops if is_project_file(op['file_path'])]
    skipped_ops = [op for op in all_ops if not is_project_file(op['file_path'])]

    report_lines.append(f"Project file operations: {len(project_ops)}")
    report_lines.append(f"Skipped (non-project): {len(skipped_ops)}")
    report_lines.append("")

    # Process operations
    results = {
        'APPLIED': [],
        'ALREADY_APPLIED': [],
        'ALREADY_IDENTICAL': [],
        'SKIPPED_SIMILAR': [],
        'OLD_STRING_NOT_FOUND': [],
        'FILE_NOT_FOUND': [],
        'CREATED': [],
        'WRITTEN': [],
        'OTHER': [],
    }

    report_lines.append("=" * 70)
    report_lines.append("PROCESSING OPERATIONS")
    report_lines.append("=" * 70)

    for i, op in enumerate(project_ops):
        path = op['file_path']
        op_type = op['type']
        session = op['session']

        report_lines.append(f"\n[{i+1}] {op_type} | {path}")
        report_lines.append(f"     Session: {session}")

        if op_type == 'Edit':
            old_preview = op['old_string'][:80].replace('\n', '\\n') if op['old_string'] else '(empty)'
            new_preview = op['new_string'][:80].replace('\n', '\\n') if op['new_string'] else '(empty)'
            report_lines.append(f"     OLD: {old_preview}...")
            report_lines.append(f"     NEW: {new_preview}...")
            status = apply_edit(op)
        elif op_type == 'Write':
            content_preview = op['content'][:100].replace('\n', '\\n') if op['content'] else '(empty)'
            report_lines.append(f"     Content preview: {content_preview}...")
            status = apply_write(op)
        else:
            status = 'UNKNOWN_OP'

        report_lines.append(f"     STATUS: {status}")

        # Categorize result
        found = False
        for key in results:
            if status.startswith(key):
                results[key].append({'path': path, 'type': op_type, 'status': status})
                found = True
                break
        if not found:
            results['OTHER'].append({'path': path, 'type': op_type, 'status': status})

    # Summary
    report_lines.append("")
    report_lines.append("=" * 70)
    report_lines.append("SUMMARY")
    report_lines.append("=" * 70)

    applied_count = len(results['APPLIED']) + len(results['CREATED']) + len(results['WRITTEN'])
    already_done = len(results['ALREADY_APPLIED']) + len(results['ALREADY_IDENTICAL']) + len(results['SKIPPED_SIMILAR'])
    cannot_apply = len(results['OLD_STRING_NOT_FOUND']) + len(results['FILE_NOT_FOUND'])

    report_lines.append(f"Applied:      {applied_count}")
    report_lines.append(f"Already done: {already_done}")
    report_lines.append(f"Cannot apply: {cannot_apply}")
    report_lines.append(f"Other:        {len(results['OTHER'])}")
    report_lines.append("")

    for category, items in results.items():
        if items:
            report_lines.append(f"\n{category} ({len(items)}):")
            for item in items:
                report_lines.append(f"  [{item['type']}] {item['path']}")
                if item['status'] != category:
                    report_lines.append(f"        {item['status']}")

    report_text = "\n".join(report_lines)
    # Print safely (avoid encoding errors on Windows console)
    safe_text = report_text.encode('ascii', errors='replace').decode('ascii')
    print(safe_text)

    write_file_safe(REPORT_PATH, report_text)
    print(f"\nReport saved to: {REPORT_PATH}")

if __name__ == '__main__':
    main()
