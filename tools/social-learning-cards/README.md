# Social learning cards

This offline-first tool prepares two-slide, 1080×1080 English-learning posts. Slide 1 teaches; slide 2 connects the lesson to a real Phraseman screen and `knowlyapps.com/download/`.

The tool never calls an image API. `prepare` writes a text brief; a Codex operator generates one atlas with the built-in image tool, saves it to the ignored revision folder, then runs import, render, validate and package.

```powershell
npm run social-cards:prepare -- --card slc_pilot_01_taste
npm run social-cards:import -- --card slc_pilot_01_taste --atlas <atlas.png>
npm run social-cards:render -- --card slc_pilot_01_taste --screenshot <real-app-screen.png>
npm run social-cards:validate -- --card slc_pilot_01_taste
npm run social-cards:package -- --card slc_pilot_01_taste
```

Raw atlases, crops, rendered previews and packages remain ignored. Commit only manifests, tooling and human QA templates. Never mark manual QA true before viewing both final slides.

## Non-negotiable visual QA

- Reject any extra fingers, hands, limbs, fused anatomy, duplicated utensils, merged food or malformed objects.
- Keep illustrations deliberately smaller than their grid cells so English and Russian labels have clear breathing room.
- A technically valid image is not publishable until every cell has been inspected at full size and at mobile-feed size.
