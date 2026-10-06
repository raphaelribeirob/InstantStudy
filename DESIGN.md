# InstantStudy™ — Design System

> Active learning should feel clear, modern, and immediately actionable.

**Status:** Offer-led visual system v1.0  
**Product:** InstantStudy™  
**Category:** AI-native learning

---

## 1. Design thesis

InstantStudy™ should look like a modern learning product, not a developer tool and not a clone of an existing study app.

The commercial flow is simple:

**Bring material → Practice → Test → Review → Remember**

The design must make that loop visible.

### Principles

1. **Learning outcome first**  
   Lead with what the student can do, not MCP, APIs, agents, or infrastructure.

2. **One connected system**  
   Learn, Quiz, Test, Review, and mastery should feel like states of the same product.

3. **Serious, not academic-corporate**  
   The product should feel credible for university and professional study without looking like an LMS.

4. **Color carries learning state**  
   Blue = active learning / primary progress.  
   Orange = weak / due attention.  
   Green = stable knowledge.  
   Purple = exam / challenge context.

5. **Progress without gamification theater**  
   Use mastery, review queues, and exam readiness. Avoid coins, streak pressure, confetti, or cartoon rewards.

---

## 2. Brand language

The visual identity is original to InstantStudy™.

### Core feeling

- crisp white learning surfaces
- cool blue-gray canvas
- deep navy for focus states
- electric blue for action and mastery
- orange for due/weak concepts
- soft lavender and mint as secondary learning signals
- strong typography
- rounded but not playful
- product UI shown directly in marketing

### Avoid

- copying Quizlet visual assets or exact layouts
- ElevenLabs editorial minimalism as the main identity
- generic black-and-white AI landing pages
- excessive gradients
- glass everywhere
- neon gaming aesthetics
- enterprise dashboards
- decorative AI robots

---

## 3. Color system

```css
:root {
  --ink: #172036;
  --muted: #68728a;
  --line: #dfe4ef;
  --paper: #ffffff;
  --wash: #f1f4fb;

  --blue: #3859ff;
  --blue-dark: #2438b8;
  --navy: #111a35;

  --lavender: #dfe3ff;
  --purple: #7a5cff;
  --mint: #bff1dc;
  --yellow: #ffe7a0;
  --orange: #ff8f5c;
}
```

### Semantic meaning

- **Blue:** active learning, mastery, primary action
- **Orange:** due now, fragile memory, attention
- **Green/mint:** stable concept
- **Purple:** tests, challenge, exam simulation
- **Navy:** focused study environments and technical connection surfaces

---

## 4. Typography

**Primary:** Inter  
**Fallback:** system-ui

### Display

- weight: 700–800
- tracking: -0.045em to -0.055em
- line-height: 0.98–1.06
- use for hero and core product promises

### Product headings

- weight: 650–750
- tracking: -0.02em to -0.04em

### Body

- weight: 400
- line-height: 1.5–1.65
- muted blue-gray, not pure gray

### Recommended scale

| Role | Size |
|---|---:|
| Hero | 48–76px |
| Section title | 36–52px |
| Product card title | 22–30px |
| Lead | 16–18px |
| Body | 13–16px |
| UI label | 9–12px |

---

## 5. Layout

**Marketing max width:** 1180px  
**Content max width:** 1120px  
**Mobile gutter:** 11–16px

### Section rhythm

- hero top: 90–110px
- standard section: 100–120px
- feature bands: 52–72px internal padding
- card gaps: 10–16px

The page should alternate between:

1. open white/cool canvas
2. strong navy feature band
3. soft learning-state feature band
4. white pricing/FAQ

---

## 6. Shape system

| Element | Radius |
|---|---:|
| Nav shell | 16–20px |
| Primary CTA | 12–14px |
| Product cards | 20–28px |
| Feature bands | 24–34px |
| Small controls | 9–13px |
| Pills / tags | 999px |

The system is rounded, but not bubbly.

---

## 7. Elevation

Use shadows only to make product surfaces feel tangible.

### Product window

```css
box-shadow: 0 24px 80px rgba(35, 48, 84, .10);
```

### Primary blue CTA

```css
box-shadow: 0 10px 26px rgba(56, 89, 255, .20);
```

Avoid stacking multiple elevated cards inside each other.

---

## 8. Signature elements

### 8.1 InstantStudy orb

The orb is the compact brand mark.

- blue lower mass = accumulated memory
- orange upper mass = attention / forgetting risk
- pale blue field = active learning space

It may appear in:
- logo
- ingestion/result moments
- loading / learning-state transitions

Do not repeat it as decoration in every section.

### 8.2 Knowledge state

The product should always be able to show:

- mastery %
- weak concepts
- next review
- difficulty
- what is due

The knowledge state is a product differentiator, not a decorative analytics widget.

### 8.3 Study path

Use a four-step product language:

**Learn → Quiz → Test → Review**

The current mode should be obvious, while the rest remain visibly part of the same loop.

---

## 9. Marketing page architecture

The homepage follows the proven study-offer logic without copying another brand's design.

### 1. Hero

Promise:

**Turn anything you're learning into practice.**

Show accepted material types beside the promise.

Primary CTA:
**Start studying free**

Secondary CTA:
**See a study session**

### 2. Product demonstration

Show the real loop:

- source material
- question
- answer surface
- adaptive difficulty
- mastery
- next review

### 3. Study tools

Four connected cards:

- Learn
- Quiz
- Test
- Review

### 4. Practice test

This is a major premium-value surface.

Show:
- question format
- timer
- progress
- hidden feedback
- final score concept

### 5. Review / retention

Show:
- due concepts
- mastery decay
- review queue
- strong / weak knowledge

### 6. Continuity

Explain the moat:

**The next session remembers the last one.**

### 7. AI connection

MCP belongs later in the page.

Consumer message:
**Study where you already think.**

Technical configuration is available but is not the headline.

### 8. Pricing

Free:
- complete loop with limits

Unlimited:
- unlimited study
- cross-session mastery
- due reviews
- all supported agents
- optional Anki

### 9. FAQ + final CTA

Close on outcome, not infrastructure.

---

## 10. Product UI

### Active study surface

During a study session:

- question occupies the visual center
- navigation becomes quiet
- one answer surface
- one primary action
- mastery remains visible but secondary

### Test mode

Test should feel stricter than Learn:

- timer
- question count
- no correctness feedback mid-test
- exam-like whitespace
- score only at the end

### Review mode

Review should prioritize urgency:

- due now
- today
- tomorrow
- later

Weak concepts use orange micro-signals, never full red screens.

---

## 11. Interaction style

### Buttons

Primary:
- blue fill
- white text
- 12–14px radius
- 44–50px height

Secondary:
- white fill
- subtle border
- dark text

Dark feature bands:
- white button or dark nested controls depending on hierarchy

### Motion

- 120–180ms controls
- 180–260ms surfaces
- no bouncing
- no decorative infinite motion

Respect `prefers-reduced-motion`.

---

## 12. Responsive rules

### Desktop

Marketing can show dense product previews, but study content itself remains focused.

### Tablet

Collapse three-column study windows to two columns.

### Mobile

- single-column
- hide secondary product panels before shrinking them into illegibility
- CTAs stack vertically
- product preview remains usable
- pricing becomes one card per row
- technical connection controls scroll or stack

---

## 13. Accessibility

- WCAG AA contrast for body text and controls
- 44px touch targets where practical
- learning state never encoded by color only
- visible keyboard focus
- reduced-motion support
- text zoom must not break active study

---

## 14. Copy style

InstantStudy™ speaks in outcomes.

### Prefer

- Turn your notes into practice.
- Practice until it sticks.
- 3 concepts need review.
- No hints until the test ends.
- Review this again tomorrow.
- Your next study session remembers this one.

### Avoid

- AI-powered revolutionary learning platform
- Supercharge your brain
- Crush every exam
- Become unstoppable
- MCP-first developer language in consumer sections

---

## 15. Offer/design rule

The homepage may borrow **commercial structure** from proven study products, but never their visual identity, proprietary graphics, logos, exact wording, or page composition.

The test for every section:

> Does this make the learner understand the next useful learning action faster?

If not, remove it.
