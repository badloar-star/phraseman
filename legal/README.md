# Legal copy (single source of truth)

Canonical English text for **Terms of Use** and **Privacy Policy**:

- `terms_of_use_en.json`
- `privacy_policy_en.json`

The Phraseman app imports these files directly (`app/terms_screen.tsx`, `app/privacy_screen.tsx`).

After editing either JSON file, regenerate the public HTML copies at the repo root:

```bash
npm run legal:sync
```

This updates `terms.html` and `privacy.html` at the **repository root** to match the JSON (e.g. GitHub Pages, static host, or copy into your site). Current Firebase Hosting in this repo targets the `admin/` folder only — add `privacy.html` / mirror `terms.html` there if you want them on the same Firebase site.

Do not duplicate long legal paragraphs in `terms_screen.tsx` / `privacy_screen.tsx` — change the JSON, then run `legal:sync`.
