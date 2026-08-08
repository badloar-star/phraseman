# Wider gift certificate with travelling highlight

## Goal

Make the live gift certificate preview slightly wider on desktop and add a premium light streak that periodically travels across its surface without obscuring the artwork or text.

## Approved design

- Increase the gift page content width from the shared 1080px maximum to a page-local 1160px maximum.
- Rebalance the desktop gift grid so the certificate column grows by approximately 14–16%, while both columns use `minmax(0, …)` and cannot force horizontal scrolling.
- Keep the existing single-column breakpoint at 860px. On tablets and phones the certificate stays at the available viewport width; it must never exceed the page padding.
- Add one diagonal pearl-white highlight for monthly/yearly art and a warmer gold-white highlight for lifetime art.
- The streak crosses the complete certificate once every 6 seconds. Most of the cycle is still, followed by one smooth pass; it does not pulse or bounce.
- Implement the streak with a clipped `.cert::after` pseudo-element using only `transform` and `opacity`. Existing certificate content receives a higher stacking layer so the effect reads as surface gloss and never reduces text contrast.
- Disable the moving streak under `prefers-reduced-motion: reduce`.

## Boundaries

- Do not modify certificate artwork files, phrases, prices, checkout fields, payment behavior, email rendering, or mobile form layout.
- Do not add JavaScript, timers, image assets, or additional network requests.
- Preserve the sticky desktop preview and the existing plan-specific backgrounds and colors.

## Verification

- Extend the focused gift certificate contract to require the wider page override, `minmax(0, …)` grid columns, shimmer pseudo-element, transform/opacity keyframes, lifetime color override, and reduced-motion opt-out.
- Check desktop layouts at 1024px, 1440px, and the supplied 1668px viewport for zero horizontal overflow.
- Check 375px mobile layout for zero horizontal overflow and full-width certificate containment.
- Capture the live monthly, yearly, and lifetime cards after deployment and confirm that the text remains readable and the highlight stays clipped to the rounded certificate.
