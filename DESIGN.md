# InstantStudy — Design System

> Quiet intelligence for learning.
> Warm paper, black ink, spacious interfaces, and small moments of color that represent memory becoming stronger.

**Status:** Foundation v0.1  
**Product:** InstantStudy  
**Category:** Education / AI Learning  
**Reference:** ElevenLabs visual language as documented by Refero Styles  
**Reference URL:** https://styles.refero.design/style/031056ff-7af1-46db-8daa-115f731c5d26  
**Compatibility:** RiverThree App Shell 1.0.0 / Design Contract 4.18.0

---

## 1. Design thesis

InstantStudy should not look like a traditional LMS, productivity dashboard, or gamified flashcard app.

It should feel like a calm workspace where intelligence is present but never visually noisy.

The core experience is:

**Learn → Capture → Recall → Strengthen → Master**

The interface should make this cycle feel almost invisible.

### Principles

1. **Calm over stimulation**  
   No confetti, oversized gradients, streak obsession, neon dashboards, or visual pressure.

2. **Editorial over SaaS chrome**  
   Pages should feel closer to a beautifully typeset notebook than an admin panel.

3. **Content is the interface**  
   Questions, explanations, concepts, and recall prompts receive more visual importance than navigation.

4. **One obvious action**  
   Each screen should have one dominant next step: continue, answer, reveal, review, or finish.

5. **Progress without gamification theater**  
   Show mastery, retention, and due reviews clearly. Avoid points, fake currencies, and unnecessary badges.

6. **AI should feel contextual, not decorative**  
   AI is expressed through adaptive content, memory states, and subtle generative visuals—not robot icons or glowing gradients everywhere.

---

## 2. Visual direction

The visual direction is inspired by ElevenLabs' warm editorial minimalism documented by Refero, adapted specifically for learning.

### The feeling

- Warm paper instead of clinical white
- Pure black as the strongest UI contrast
- Warm taupe surfaces instead of gray cards
- Hairline borders instead of heavy shadows
- Lightweight editorial headings
- Generous whitespace
- Fully rounded action pills
- Saturated colors reserved for learning-state visuals

### Avoid

- Generic blue SaaS dashboards
- Purple gradient backgrounds
- Glassmorphism
- Heavy card shadows
- Dense sidebars
- Cartoon education illustrations
- Excessive gamification
- Multiple competing CTA colors
- Bright success/error colors covering large surfaces

---

## 3. Color system

### Foundation

| Token | Value | Role |
|---|---|---|
| `--color-canvas` | `#FDFCFC` | Main page background |
| `--color-surface` | `#F5F3F1` | Cards, section bands, learning surfaces |
| `--color-border` | `#EBE8E4` | Hairline borders and separators |
| `--color-ink` | `#000000` | Primary text, primary buttons |
| `--color-graphite` | `#44403B` | Strong secondary text |
| `--color-muted` | `#777169` | Body copy and labels |
| `--color-faint` | `#A59F97` | Tertiary metadata |

### Learning accents

Accent colors must not become general UI chrome.

| Token | Value | Role |
|---|---|---|
| `--color-memory` | `#0447FF` | Memory-strength visualizations, active knowledge nodes |
| `--color-attention` | `#FF4704` | Forgetting-risk visuals, difficult concepts, decay indicators |

Use accents inside:

- mastery or memory orbs
- retention graphs
- concept maps
- subtle progress visualization
- illustration details
- selected learning-state indicators

Do **not** use them as the default fill for primary buttons, top navigation, generic links, or large backgrounds.

### Semantic states

Semantic states should remain restrained.

- **Known:** black / graphite first; memory blue as secondary signal
- **Learning:** warm taupe with subtle memory blue detail
- **Weak:** warm taupe with subtle orange detail
- **Due:** black text + orange micro-indicator
- **Missed:** do not flood the interface red; use concise copy and a small warm warning marker

---

## 4. Typography

InstantStudy inherits the light editorial character of the ElevenLabs reference without depending on proprietary typefaces.

### Display

**Preferred:** Inter Light 300  
**Optional premium substitute:** Söhne Light or another restrained grotesk  
**Fallback:** system-ui

Use for:

- hero statements
- major page titles
- learning-session conclusions
- mastery milestones

Rules:

- Weight: `300`
- Letter spacing: `-0.02em`
- Never bold display headlines
- Prefer short headlines with strong line breaks

### UI and body

**Font:** Inter

- Regular: `400`
- Medium: `500`
- Avoid `600+` unless accessibility or platform rendering requires it

### Type scale

| Role | Size | Weight | Line height | Tracking |
|---|---:|---:|---:|---:|
| Display | 48px | 300 | 1.08 | -0.02em |
| H1 | 36px | 300 | 1.17 | -0.02em |
| H2 | 32px | 300 | 1.13 | -0.02em |
| Lead | 20px | 400 | 1.35 | normal |
| Subheading | 18px | 400 | 1.55 | normal |
| Body | 16px | 400 | 1.5 | +0.01em |
| Body small | 14px | 400 | 1.5 | +0.01em |
| Label | 13px | 500 | 1.4 | +0.01em |
| Caption | 11px | 400 | 1.45 | +0.01em |

Long explanations should optimize for reading comfort, not density.

---

## 5. Spacing and layout

**Base unit:** 4px  
**Desktop max width:** 1280px  
**Primary reading width:** 680–760px

### Spacing scale

`4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 72, 96, 128, 160`

### Rules

- Standard component gap: `8–16px`
- Card padding: `24–32px`
- Major section gap: `96–128px`
- Learning prompt vertical breathing room: minimum `32px`
- Do not fill desktop screens just because space exists
- Reading and recall surfaces should remain centered and intentionally narrow

---

## 6. Shape system

| Element | Radius |
|---|---:|
| Primary / secondary buttons | `9999px` |
| Tags / filters | `9999px` |
| Standard cards | `20px` |
| Hero / learning cards | `24px` |
| Inputs | `8px` |
| Small controls | `6–10px` |

Rounded forms should feel calm and tactile, not playful.

---

## 7. Elevation

The product is primarily flat.

Prefer:

1. surface color changes
2. 1px warm hairline borders
3. subtle inset separation
4. shadow only when hierarchy truly requires elevation

### Border

```css
border: 1px solid #EBE8E4;
```

### Whisper shadow

Use only for floating or transient surfaces such as command menus, popovers, and active recall overlays.

```css
box-shadow:
  0 0 0 1px rgba(0,0,0,.04),
  0 2px 8px rgba(0,0,0,.035);
```

No dramatic shadows.

---

## 8. Core components

### 8.1 Primary pill button

Role: one dominant action per view.

- Fill: `#000000`
- Text: `#FDFCFC`
- Height: 40–44px
- Horizontal padding: 16–20px
- Radius: full pill
- Font: Inter 14px / 500

Examples:

- Start review
- Continue
- Reveal answer
- Save to memory

### 8.2 Secondary pill button

- Fill: canvas
- Text: black
- Border: 1px solid warm border
- Same geometry as primary

Examples:

- Skip
- Edit
- View source

### 8.3 Learning card

The signature InstantStudy surface.

- Background: warm taupe
- Radius: 24px
- Padding: 24–32px mobile; 32–40px desktop
- No default shadow
- Minimal metadata
- Prompt receives visual priority

Card anatomy:

1. optional context label
2. question / concept
3. answer interaction area
4. optional source
5. confidence / knowledge action

### 8.4 Recall answer controls

Do not replicate traditional four-button Anki grading as the main interaction.

Default simple model:

- **I knew it**
- **Almost**
- **I missed it**

Advanced scheduling data can remain behind these human labels.

### 8.5 Memory orb

A contextual visual representation of learning state.

It may use memory blue and attention orange inside the visual itself.

It must never become a decorative logo repeated everywhere.

Potential mappings:

- size → knowledge importance
- opacity → confidence
- blue intensity → memory strength
- orange edge → forgetting risk
- motion → active consolidation

### 8.6 Mastery meter

Prefer calm language:

- New
- Learning
- Stable
- Strong
- Mastered

Avoid RPG language unless explicitly used in a future product mode.

The default visualization should be a thin line, ring, or orbital state—not a giant percentage gauge.

### 8.7 Input / ask box

The capture box is central to InstantStudy.

It should feel closer to an intelligent command surface than a school form.

Possible prompts:

- Paste something you want to remember
- What are you learning?
- Ask anything. We'll turn the important parts into memory.

Style:

- Canvas or taupe surface
- 1px warm border
- 12–16px internal padding
- 12–16px radius where multiline
- Black send control or understated icon action

---

## 9. Core product surfaces

### 9.1 Home

Goal: answer one question immediately:

**What should I learn or review now?**

Structure:

1. quiet header
2. contextual greeting / learning state
3. one dominant action: Continue learning / Start review
4. compact due-review summary
5. recent topics
6. capture / ask surface

Avoid a dashboard full of analytics cards.

### 9.2 Review session

This is the most important product surface.

The user should focus on one unit of knowledge at a time.

Desktop composition:

- centered narrow column
- progress metadata above the card
- large learning card
- answer controls below
- optional source hidden until requested

Navigation should disappear or become visually quiet during active recall.

### 9.3 Topic page

A topic is not simply a deck.

It represents a knowledge area.

Show:

- topic title
- concise mastery state
- what is strong
- what is weakening
- concepts due soon
- source material
- recent learning activity

### 9.4 Memory map

The memory map is a secondary, high-value surface.

It visualizes relationships between concepts without becoming a sci-fi graph.

Rules:

- warm canvas
- black labels
- thin neutral connectors
- blue/orange accents only where meaningful
- avoid hundreds of nodes by default
- prioritize semantic clusters and actionable weak areas

### 9.5 Session complete

No confetti.

The reward is clarity.

Example structure:

**Your memory is stronger.**

- 12 concepts reviewed
- 8 strengthened
- 3 scheduled sooner
- 1 needs a better explanation

Primary action: `Done`  
Secondary: `Review weak concepts`

---

## 10. Navigation

Navigation must be minimal.

Recommended desktop structure:

- Home
- Library
- Review
- Search / command
- Profile

Do not introduce a permanent enterprise-style sidebar unless product complexity later justifies it.

Mobile should prioritize bottom navigation only if three or more destinations are used frequently. Otherwise prefer contextual navigation.

---

## 11. Motion

Motion communicates cognitive state, not spectacle.

### Timing

- micro interaction: `120–180ms`
- surface transition: `180–260ms`
- learning-state visualization: `300–600ms`

### Character

- soft
- deliberate
- low amplitude
- no bounce by default

### Good motion

- card answer revealing
- memory orb stabilizing after a correct response
- knowledge node softly changing state
- progress line advancing
- subtle content crossfade between questions

### Avoid

- constant floating animation
- excessive parallax
- elastic UI
- celebration particles

Respect `prefers-reduced-motion` everywhere.

---

## 12. Accessibility

- Maintain WCAG AA contrast for body text and controls
- Never encode learning state only by color
- Keyboard navigation must cover the complete review session
- Visible focus states are mandatory
- Minimum interactive target: 44×44px on touch surfaces
- Answer actions should expose keyboard shortcuts when useful
- Motion must have reduced-motion alternatives
- Long-form study content must support browser zoom without layout breakage

---

## 13. Responsive behavior

### Desktop

Use whitespace aggressively.

Do not stretch learning content to full width.

### Tablet

Preserve reading width and card proportions. Navigation can collapse earlier than conventional SaaS layouts.

### Mobile

Mobile is a first-class learning environment.

- single-column
- 16px page gutters minimum
- 20–24px learning-card radius
- answer actions reachable with one thumb
- minimal persistent chrome
- no tiny analytics

A review session should feel excellent on a phone before advanced desktop dashboards are added.

---

## 14. Copy style

InstantStudy speaks like an intelligent study partner.

### Voice

- concise
- calm
- specific
- non-judgmental
- not childish
- not motivational by default

### Prefer

- `3 concepts need review.`
- `You remembered this.`
- `This one is weakening.`
- `Try explaining it without looking.`
- `Review again tomorrow.`

### Avoid

- `Amazing job!!!`
- `You're on fire 🔥`
- `You crushed it!`
- `Level up your brain!`
- manipulative streak language

---

## 15. Product identity

The InstantStudy brand should emerge from the product itself.

### Signature elements

1. warm-paper canvas
2. lightweight black typography
3. taupe learning surfaces
4. black pill actions
5. contextual memory orb
6. restrained blue/orange cognitive signals
7. calm spatial composition

The identity should remain recognizable even with the logo removed.

---

## 16. Implementation tokens

```css
:root {
  --color-canvas: #fdfcfc;
  --color-surface: #f5f3f1;
  --color-border: #ebe8e4;

  --color-ink: #000000;
  --color-graphite: #44403b;
  --color-muted: #777169;
  --color-faint: #a59f97;

  --color-memory: #0447ff;
  --color-attention: #ff4704;

  --radius-control: 8px;
  --radius-card: 20px;
  --radius-card-lg: 24px;
  --radius-pill: 9999px;

  --page-max: 1280px;
  --reading-max: 720px;

  --font-sans: "Inter", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
}
```

---

## 17. Design constraints for AI/code agents

When generating InstantStudy UI:

### Always

- default to warm off-white, not pure white
- keep major learning content centered and narrow
- use black for primary actions
- use full-pill buttons
- use taupe cards with 20–24px radii
- use hairline borders before shadows
- keep headings light, never heavy
- reserve vivid blue/orange for knowledge-state visuals
- reduce UI chrome during active study
- design mobile review flows deliberately

### Never

- create generic gradient SaaS heroes
- use violet or orange CTA buttons by default
- fill every section with a card
- use thick borders or dramatic shadows
- make dashboards denser than the learning content
- add gamification without a product reason
- use emojis as the core icon system
- imitate ElevenLabs assets, illustrations, logos, or layouts literally

---

## 18. Reference interpretation

This system uses ElevenLabs on Refero as a **design-language reference**, not as a template to clone.

The reference contributes:

- warm editorial minimalism
- light display typography
- eggshell/taupe neutral hierarchy
- black primary interaction
- pill-shaped controls
- large-radius cards
- sparse use of saturated color
- restrained elevation

InstantStudy must develop its own identity around **memory, recall, mastery, and knowledge state**.

The test for every screen is simple:

> Does this help the learner focus on the next useful act of learning?

If not, remove it.
