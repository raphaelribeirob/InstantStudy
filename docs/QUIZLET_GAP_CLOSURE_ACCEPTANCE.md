# Quizlet Gap Closure — Acceptance Criteria

This release closes the remaining student-offer gaps identified against the current Quizlet offer while preserving InstantStudy's deterministic-first architecture and independent design.

## Scope

Included:
- conversational Podcast;
- content-derived Study Game;
- Family plan with up to five independent learner accounts;
- private Google Drive selection/import on Web;
- real InstantPay → StudyEngine plan synchronization;
- Flutter Podcast + Study Game.

Not included:
- Quizlet brand, copy, code, screenshots, datasets or marketplace content;
- textbook/expert solutions;
- teacher/classroom management;
- public study-set marketplace.

## AC-01 — Conversational Podcast

Given a saved material,
when Podcast is opened,
then the backend produces a deterministic two-speaker script grounded in the material's persisted Study Assets.

Required:
- Host + Coach speakers;
- alternating conversational turns;
- recall challenge(s);
- source title and core concepts represented;
- no LLM call required for normal podcast generation.

Web playback:
- speaks segments sequentially;
- selects two different available device voices when possible;
- uses different rate/pitch profiles;
- Stop cancels playback.

Flutter:
- uses native text-to-speech;
- applies separate Host/Coach voice profiles;
- exposes the transcript in the Podcast scene.

## AC-02 — Content Study Game

Given a material with persisted flashcards,
when Study Game opens,
then the backend deterministically builds prompt/answer pairs from those flashcards.

Required:
- deterministic shuffle for identical material;
- no generic trivia unrelated to the source;
- Web and Flutter both support selecting cards;
- matching requires the same pair with opposite card kinds;
- moves and completion are visible;
- no celebratory/confetti mechanics.

## AC-03 — Family plan

The InstantPay catalog includes:
- `instant_study_family_annual`;
- entitlement `instant_study.family`.

Family semantics:
- one owner + up to four members;
- owner receives Unlimited;
- active members inherit Unlimited;
- each member keeps an independent learner ID, Library, mastery state, usage and Review queue;
- removing a member immediately removes inherited family access on the next entitlement lookup;
- cancellation/inactivation of the owner's Family entitlement removes inherited access.

Family management:
- requires authenticated Instant Account bearer identity;
- owner cannot add themselves;
- member emails are validated;
- maximum four member rows;
- Family API is never authorized by query-string user IDs.

## AC-04 — Billing actually reaches StudyEngine

Given an authenticated account,
when a Learn/Test session is prepared,
then the Web BFF resolves active InstantPay entitlements.

Mapping:
- Plus → StudyEngine `plus`;
- Unlimited → `unlimited`;
- Family owner/member → `unlimited`;
- no active paid entitlement → `free`.

Only the trusted BFF/API-key boundary may pass the resolved billing plan to the StudyEngine.

## AC-05 — Private Google Drive on Web

Given Google Picker credentials are configured,
when the learner selects a private Drive file,
then:
1. Google Identity Services requests file-scoped OAuth;
2. Google Picker returns a selected file ID;
3. the temporary OAuth access token is sent only to the same-origin BFF for that import;
4. the BFF fetches/exports the file from Google Drive;
5. the file enters the existing InstantStudy ingestion path;
6. no Google client secret is present in the browser.

Supported Google-native exports:
- Docs → text/plain;
- Sheets → text/csv;
- Slides/Drawings → PDF.

Other ordinary Drive files are downloaded with `alt=media`.

Private Drive imports retain the current 2.5 MB BFF limit.

## AC-06 — Google Picker security configuration

Required Web environment:
- `VITE_GOOGLE_DRIVE_CLIENT_ID`;
- `VITE_GOOGLE_DRIVE_API_KEY`;
- `VITE_GOOGLE_DRIVE_APP_ID`.

The browser API key must be restricted in Google Cloud by:
- allowed InstantStudy origins;
- Google Picker/Drive APIs.

CSP permits only the Google origins required to load Identity Services/Picker and its frame.

## AC-07 — Mobile Drive honesty

The Flutter app does not claim private Google Drive OAuth is production-ready without platform OAuth client IDs and callback/deep-link registration.

Native Google Picker setup remains an external deployment configuration step because Android/iOS require platform-specific OAuth credentials and return handling.

Public/shared Drive and native file/photo import remain available through existing paths.

## AC-08 — Family pricing surface

Landing pricing exposes Family separately from Plus and Unlimited.

Family copy must communicate:
- annual billing;
- up to five accounts;
- independent progress;
- Unlimited access.

## AC-09 — Automated gates

Required green gates:
- TypeScript typecheck;
- all Node tests;
- offer-layer Podcast/Game tests;
- Paddle security/catalog tests;
- Web build;
- production dependency audit;
- Flutter `pub get`;
- Flutter `analyze`;
- Flutter widget tests;
- OWASP Dependency-Check.

## External production configuration

Code completion does not manufacture third-party credentials.

Production activation still requires:
- Google Cloud Picker + Drive APIs enabled;
- authorized Web origins;
- Google OAuth Web client ID;
- restricted Google API key;
- Drive App ID/project number;
- Paddle Family price mapped to `PADDLE_PRICE_INSTANT_STUDY_FAMILY_ANNUAL`;
- working Instant Account introspection;
- Neon `DATABASE_URL`;
- successful Vercel deployment.

These are deployment credentials/configuration, not product placeholders.
