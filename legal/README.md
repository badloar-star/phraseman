# Legal copy (single source of truth)

Canonical English text for **Terms of Use** and **Privacy Policy**:

- `terms_of_use_en.json`
- `privacy_policy_en.json`

The Phraseman app imports these files directly (`app/terms_screen.tsx`, `app/privacy_screen.tsx`).

After editing either JSON file, regenerate the public HTML copies at the repo root:

```bash
npm run legal:sync
```

This updates `terms.html` and `privacy.html` at the **repository root**, `admin/oauth-privacy.html`, and the live Knowly website copies under `knowly-www/legal/privacy/index.html`, `knowly-www/legal/terms/index.html`, and `knowly-www/legal/data-deletion/index.html`. Firebase Hosting has both `admin` and `knowlywww` targets, so the Knowly pages must be regenerated before deploying `hosting:knowly-www`.

Do not duplicate long legal paragraphs in `terms_screen.tsx` / `privacy_screen.tsx` — change the JSON, then run `legal:sync`.
