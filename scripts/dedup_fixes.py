import sys, io, re, os

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

def read(fp):
    with open(fp, encoding='utf-8') as f:
        return f.read()

def write(fp, content):
    with open(fp, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f"  fixed: {os.path.basename(fp)}")

def dedup_lines(content, pattern):
    """Remove duplicate lines matching pattern, keep first occurrence."""
    lines = content.split('\n')
    seen = set()
    result = []
    for line in lines:
        if re.search(pattern, line):
            if line in seen:
                continue
            seen.add(line)
        result.append(line)
    return '\n'.join(result)

def keep_last_func(content, func_signature_pattern):
    """When function is defined multiple times, keep only last definition."""
    # Find all occurrences
    matches = list(re.finditer(func_signature_pattern, content))
    if len(matches) <= 1:
        return content
    # Remove all but last
    # Find the blocks to remove
    for m in matches[:-1]:
        start = m.start()
        # Find end: next match start or next export async function
        next_start = matches[matches.index(m) + 1].start()
        content = content[:start] + content[next_start:]
        # Re-find since we modified content
        matches = list(re.finditer(func_signature_pattern, content))
        if len(matches) <= 1:
            break
    return content

BASE = 'c:/appsprojects/phraseman'

# 1. _layout.tsx - duplicate registerInLeagueGroupSilently imports (keep 1)
fp = f'{BASE}/app/_layout.tsx'
c = read(fp)
c = dedup_lines(c, r"import \{ registerInLeagueGroupSilently \}")
write(fp, c)

# 2. league_screen.tsx - duplicate refreshing
fp = f'{BASE}/app/league_screen.tsx'
c = read(fp)
c = dedup_lines(c, r"const \[refreshing, setRefreshing\]")
write(fp, c)

# 3. hall_of_fame.tsx - duplicate refreshing + duplicate imports
fp = f'{BASE}/app/(tabs)/hall_of_fame.tsx'
c = read(fp)
c = dedup_lines(c, r"const \[refreshing, setRefreshing\]")
c = dedup_lines(c, r"^import \{ Animated")
write(fp, c)

# 4. home.tsx - duplicate useDuelRank import
fp = f'{BASE}/app/(tabs)/home.tsx'
c = read(fp)
c = dedup_lines(c, r"import \{ useDuelRank \}")
write(fp, c)

# 5. streak_stats.tsx - duplicate useDuelRank import + duplicate duelRank const
fp = f'{BASE}/app/streak_stats.tsx'
c = read(fp)
c = dedup_lines(c, r"import \{ useDuelRank \}")
c = dedup_lines(c, r"const duelRank = useDuelRank")
write(fp, c)

# 6. firestore_leagues.ts - triple AsyncStorage + triple registerInLeagueGroupSilently
fp = f'{BASE}/app/firestore_leagues.ts'
c = read(fp)
c = dedup_lines(c, r"import AsyncStorage from")
# Keep only the last registerInLeagueGroupSilently with isPremium param
# Remove versions without isPremium param
# Find and remove the old version without isPremium
old_ver = re.search(
    r"export async function registerInLeagueGroupSilently\(\): Promise<void>.*?^}",
    c, re.DOTALL | re.MULTILINE
)
if old_ver:
    c = c[:old_ver.start()] + c[old_ver.end():]

# Now dedup the ones with isPremium - keep first only
parts = c.split('export async function registerInLeagueGroupSilently(isPremium: boolean)')
if len(parts) > 2:
    # Find end of first function block
    first_body = parts[1]
    # Find matching closing brace
    depth = 0
    end_idx = 0
    for i, ch in enumerate(first_body):
        if ch == '{': depth += 1
        elif ch == '}':
            depth -= 1
            if depth == 0:
                end_idx = i + 1
                break
    c = parts[0] + 'export async function registerInLeagueGroupSilently(isPremium: boolean)' + first_body[:end_idx] + parts[-1]
write(fp, c)

# 7. league_engine.ts - duplicate getBotPopulation import
fp = f'{BASE}/app/league_engine.ts'
c = read(fp)
c = dedup_lines(c, r"getBotPopulation")
c = dedup_lines(c, r"import AsyncStorage")
write(fp, c)

# 8. lesson_irregular_verbs.tsx - duplicate allVerbsFlat
fp = f'{BASE}/app/lesson_irregular_verbs.tsx'
c = read(fp)
c = dedup_lines(c, r"const allVerbsFlat")
write(fp, c)

# 9. use-audio.ts - duplicate audioModeSet + duplicate ensureAudioMode
fp = f'{BASE}/hooks/use-audio.ts'
c = read(fp)
c = dedup_lines(c, r"let audioModeSet")
# Keep only first ensureAudioMode
parts = c.split('async function ensureAudioMode()')
if len(parts) > 2:
    first_body = parts[1]
    depth = 0
    end_idx = 0
    for i, ch in enumerate(first_body):
        if ch == '{': depth += 1
        elif ch == '}':
            depth -= 1
            if depth == 0:
                end_idx = i + 1
                break
    c = parts[0] + 'async function ensureAudioMode()' + first_body[:end_idx] + parts[-1]
write(fp, c)

# 10. use-duel-session.ts - duplicate pendingBotRef
fp = f'{BASE}/hooks/use-duel-session.ts'
c = read(fp)
c = dedup_lines(c, r"const pendingBotRef")
write(fp, c)

# 11. duel_game.tsx - duplicate handleExit
fp = f'{BASE}/app/duel_game.tsx'
c = read(fp)
c = dedup_lines(c, r"const handleExit")
write(fp, c)

# 12. duel_lobby.tsx - duplicate myRank
fp = f'{BASE}/app/duel_lobby.tsx'
c = read(fp)
c = dedup_lines(c, r"const myRank")
write(fp, c)

# 13. duel_results.tsx - duplicate entire function
fp = f'{BASE}/app/duel_results.tsx'
c = read(fp)
# Keep only last export default function
parts = c.split('export default function DuelResultsScreen()')
if len(parts) > 2:
    c = parts[0] + 'export default function DuelResultsScreen()' + parts[-1]
write(fp, c)

# 14. duel_db.ts - duplicate SessionSize + duplicate createBotSession
fp = f'{BASE}/app/services/duel_db.ts'
c = read(fp)
c = dedup_lines(c, r"SessionSize")
parts = c.split('export async function createBotSession(')
if len(parts) > 2:
    first_body = parts[1]
    depth = 0
    end_idx = 0
    for i, ch in enumerate(first_body):
        if ch == '{': depth += 1
        elif ch == '}':
            depth -= 1
            if depth == 0:
                end_idx = i + 1
                break
    c = parts[0] + 'export async function createBotSession(' + first_body[:end_idx] + parts[-1]
write(fp, c)

print("\nDone. Running tsc check...")
os.system('npx tsc --noEmit 2>&1 | head -30')
