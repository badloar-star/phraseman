# Legal copy (single source of truth)

Canonical English text for **Terms of Use** and **Privacy Policy**:

- `terms_of_use_en.json`
- `terms_of_use_en_ios.json`
- `privacy_policy_en.json`
- `privacy_policy_en_ios.json`

The Phraseman app imports synchronized copies from `app/legal/` (`app/terms_screen.tsx`, `app/privacy_screen.tsx`). Keep the root `legal/` files as the source of truth.

After editing any JSON file, sync the in-app copies and regenerate the public HTML copies:

```bash
npm run legal:sync
```

This updates `app/legal/*.json`, `terms.html` and `privacy.html` at the **repository root**, `admin/oauth-privacy.html`, and the live Knowly website copies under `knowly-www/legal/privacy/index.html`, `knowly-www/legal/terms/index.html`, and `knowly-www/legal/data-deletion/index.html`. Firebase Hosting has both `admin` and `knowlywww` targets, so the Knowly pages must be regenerated before deploying `hosting:knowly-www`.

Do not duplicate long legal paragraphs in `terms_screen.tsx` / `privacy_screen.tsx` — change the JSON, then run `legal:sync`.
