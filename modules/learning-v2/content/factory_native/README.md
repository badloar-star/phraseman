# Factory native English course

This module projects the current reviewed factory release into the existing
Learning V2 native children without rewriting task text, answers, order, or
feedback. The current authored locales are RU and UK; the six other interface
locales use an explicit RU display fallback and are not claimed as authored
translations.

`scripts/build_learning_v2_factory_native_manifest.mjs` copies only admitted
release JSON into `generated_release/`, which Metro watches, and emits static
`require()` edges. It also checks that the native session inventory matches the
canonical owner mockup. The canonical mockup build invokes the same generator,
so a future ready session cannot update the mockup while leaving the native
manifest stale.

Run the freshness gate after changing an admitted release:

```powershell
node scripts/build_learning_v2_factory_native_manifest.mjs --check
```

English catalog/session loading is local and fail closed. It never falls back
to the retired English authored shard, network cache, or LKG. Device speech is
declared separately from published MP3 authority. The Spanish authored path is
kept independent.
