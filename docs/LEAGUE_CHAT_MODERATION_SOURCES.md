# League Chat Moderation Sources

The generated league chat blocklist is produced by `scripts/generate_league_chat_blocklist.mjs`.

Sources:

- LDNOOBW/List-of-Dirty-Naughty-Obscene-and-Otherwise-Bad-Words, CC-BY-4.0:
  https://github.com/LDNOOBW/List-of-Dirty-Naughty-Obscene-and-Otherwise-Bad-Words
- 4troDev/profanity.csv, MIT:
  https://github.com/4troDev/profanity.csv
- dsojevic/profanity-list, MIT:
  https://github.com/dsojevic/profanity-list

The generated files are deduplicated, normalized, and include local additions for Russian/Ukrainian/Latin transliteration evasions. The word list is intentionally not the only moderation layer: links, contacts, spam patterns, hate/threat patterns, and report/hide actions still run separately.
