# Gift certificate catchphrases and clean email layout

## Goal

Make every Phraseman gift certificate feel personal and collectible. Replace explanatory copy inside the certificate with a short plan-specific catchphrase, while keeping activation instructions clearly available below the certificate in the purchase email.

## Approved experience

- Maintain three distinct phrase catalogs with exactly 50 unique Russian phrases each:
  - `monthly`: playful, quick, light humor about trying English for a month;
  - `yearly`: confident, adventurous humor about meaningful progress over a year;
  - `lifetime`: cinematic, legendary, deliberately epic humor about permanent access.
- Phrases must be warm, concise, gift-related, and understandable without extra context. Avoid insults, stereotypes, profanity, guilt, promises of guaranteed fluency, and short-lived internet memes.
- A phrase is selected on the first page load and whenever the customer selects a certificate plan. Editing recipient or sender names must not change it.
- The selected phrase is carried into the completed order, validated against the catalog for the selected plan, stored with the order, and reused for all email retries. The purchased certificate therefore keeps the phrase that the buyer saw before payment.

## Web preview

The existing plan artwork, header, product name, and optional `Для / От` lines stay unchanged. Add one catchphrase line inside the existing translucent certificate panel.

The preview must not show a fake code or expiry date before purchase. Catchphrase space is reserved so switching between one- and two-line phrases does not cause the certificate or checkout form to jump. On narrow screens the phrase may wrap only at word boundaries and is limited to two lines.

## Purchased email

The decorated certificate itself contains only:

1. Phraseman certificate header and existing plan artwork;
2. product name and optional `Для / От` names;
3. selected catchphrase;
4. real activation code;
5. certificate expiry date.

The following content moves outside and directly below the decorated certificate:

- test-issuance warning, when applicable;
- activation heading and numbered instructions;
- forwarding/personal-delivery guidance;
- support contact.

The activation code remains plain text on the certificate, without a pill, plaque, or filled background. The date is visually subordinate to the code. Instructions use a separate neutral card so they are clearly part of the email but not part of the gift artwork.

The plain-text email keeps the same information in a readable order: gift identity and phrase, code and expiry, then instructions and support.

## Phrase selection and data contract

- Each phrase has a stable identifier and belongs to exactly one plan.
- The browser chooses one valid identifier from the current plan's 50 entries.
- Checkout submits the identifier alongside existing gift fields.
- Server code ignores or rejects identifiers that do not exist for the purchased plan and uses a safe server-selected phrase from that plan as fallback. Payment and certificate issuance must never fail solely because a phrase identifier is missing or stale.
- The validated identifier is stored on the order before the email is rendered, making retries idempotent.
- User-supplied names continue to be escaped. Catchphrases come only from the trusted catalog and are escaped by the email renderer as defense in depth.

## Visual rules

- Preserve all three existing certificate backgrounds and their plan-specific color treatment.
- Use the existing type family and color tokens; do not introduce a competing font or color palette.
- Catchphrase styling is expressive but secondary to the product name: medium weight, comfortable line height, high contrast, and a fixed/reserved text area.
- Lifetime may use the gold accent on the dark artwork; monthly and yearly use their existing dark/gold treatment.
- No animation is required. Randomization is a content change triggered only by page load or an explicit plan selection.

These choices follow the existing premium visual language and the UI guidance to prevent content jumping, preserve contrast, and keep dynamic text bounded on responsive layouts.

## Verification

Focused contracts must prove:

- there are exactly 50 unique non-empty phrases for each plan and no phrase is shared across plans;
- every phrase stays within the agreed display-length bound;
- initial load and plan selection choose from the correct catalog;
- name input does not reroll the phrase;
- checkout includes the phrase identifier and server validation cannot cross plan boundaries;
- email retries render the stored phrase consistently;
- the decorated email certificate contains names, plan, phrase, real code, and expiry date, but no activation instructions, test warning, delivery guidance, or support copy;
- those instructions and notices are present below the decorated certificate;
- no fake code or expiry appears in the unpaid web preview;
- existing gift prices, payment providers, certificate artwork, names, code issuance, and activation behavior remain intact.

Run only the focused gift-page and web-checkout tests, plus a narrow static email-render assertion. Deployment is a separate explicit step after the implementation passes verification.
