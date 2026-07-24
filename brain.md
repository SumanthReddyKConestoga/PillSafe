# PillSafe — BB3 / IMB1_v0 / SB2 Handover: Complete Understanding

**Purpose of this file:** a single, complete reference capturing everything from the
7-document handover (`BB3/CONTRACT.md`, `BB3/README.md`, `IMB1_v0/CONTRACT.md`,
`IMB1_v0/README.md`, `SB2/CONTRACT.md`, `SB2/README.md`, `Journey.md`), so future work
in *this* repo (which is **OB5** — see §0) doesn't have to re-derive it. Nothing here
is invented; it is a faithful, complete restatement of those 7 documents plus one
verification against this repo's current code.

**Status as of 2026-07-23 (verified against this repo):** the `IMB1_v0/`, `SB2/`,
`BB3/`, `PillSafeChatbot/` package folders described below **do not yet exist in this
repo** (`PillSafe_FINAL`). This document is prep for when they're integrated. One
concrete fact was verified live: `dev/backend/app/models/prescription.py` has **no
`din` column** — confirming Open Item #1 below (the OB5→DIN linking gap) is real and
still open in this codebase right now, not just a historical note in Journey.md.

---

## 0. The big picture — five brains, and where THIS repo fits

PillSafe is a multi-modal medication-safety app for **seniors and people in Canada
with language barriers**. Intended loop: scan a prescription → build a patient
medication+schedule profile → alert at dose time → let the user photograph a loose
pill and warn if it's the wrong medication → answer medication questions in the
user's native language.

Two framing decisions govern everything downstream, in every package:
1. **Decision-support only, disclaimers on every output.** This is a capstone, not a
   cleared medical device. No output is ever presented as a clinical determination.
2. **Safety metric = false accepts / wrong drugs, NOT accuracy.** A stray pill wrongly
   confirmed as the patient's medication, or an answer citing the wrong drug, is the
   harm tuned against — even at heavy cost to how often the system commits to an
   answer at all. Every number below reflects this trade-off.

### The five brains

| Brain | Name | Role | Where it lives |
|---|---|---|---|
| **OB5** | OCR Brain (PaddleOCR) | Scan the **prescription** → extract meds + timing → patient profile | **This repo** (`dev/backend`) — `app/services/ocr_service.py`, `prescription_parser.py`, `routes/prescriptions.py` |
| **IMB1** | Image Brain | Photograph a **pill** → extract {type, colour, shape, imprint} | `IMB1_v0/` (not yet in this repo) |
| **SB2** | Small Brain 2 | Match IMB1's readout against the patient's own meds → verify/reject/abstain | `SB2/` (not yet in this repo) |
| **BB3** | Big Brain 3 | Answer medication questions from Health Canada Product Monographs, DIN-scoped | `BB3/` (not yet in this repo) |
| **CB4** | Cloud Brain 4 | Cloud LLM (e.g. Anthropic Haiku or better): multilingual user-facing generation | **Not built** — see §5 |

Note: this repo already has its own real pill-vision path (`app/services/pill_detection.py`,
OpenCV colour/shape + PaddleOCR imprint + `din_pills` SQL lookup + Claude explanation —
see the 2026-07-23 remediation session) and its own LLM guidance layer
(`app/services/claude_service.py`, Anthropic API). These are **this repo's own,
already-shipped implementation** of roughly the IMB1+SB2+(partial CB4) role — they are
**not** the same code as the `IMB1_v0`/`SB2`/`BB3` packages described in this
handover. When those packages arrive, expect a decision about which implementation
wins, or how they combine (this file doesn't resolve that — it's a "what exists"
map, not a plan).

### Final production data flow (as decided 2026-07-14, per Journey.md)

```
Rx photo →OB5→ patient profile (needs DINs — see Open Item #1)
pill photo →IMB1→ {colour, shape, type, imprint} →SB2 + profile DINs→ verify/reject/abstain
user question →BB3→ resolver → DIN-scoped retrieval → deterministic guards → cited context
                                        →CB4 (cloud LLM) → answer in user's language
```

Two architecture rules survived the whole project:
- **No cloud API keys inside SB2/BB3.** They are local-only by design. CB4 is the
  single cloud brain, and the *only* place user-facing LLM generation belongs (§5
  explains why — learned the hard way, via the celecoxib failure).
- **SB2 is deterministic, not a RAG/LLM system** — the original whiteboard said
  "Small Brain 2 (RAG)"; that label was explicitly corrected.

### What the handover explicitly includes vs. excludes

**Received (5 items):** `IMB1_v0/`, `SB2/`, `BB3/`, `PillSafeChatbot/` (Streamlit demo
UI over BB3 — keep it a sibling of `BB3/`), `Journey.md`.

**NOT received** (the "dev workspace" the contracts occasionally cite as provenance,
never as a runtime dependency): `Brainstorm/` (specs, decision log, build prompts),
`IMB1_Prototype/` (research notebooks NB00–NB07, training code), `rag_pipeline/`
(BB3's predecessor + the store-export source), `data/` (live reference data, 6,803
monograph PDFs, the Pillbox training images), and the PillSafe app repo referenced as
`PillSafe/PillSafe/` (i.e., **this repo**). Every package runs standalone from its own
folder; the citations to the dev workspace are provenance, not dependencies.
Originals available from **Muthu** on request.

---

## 1. IMB1_v0 — the pill-photo vision package

**One sentence:** photograph one pill on the PillSafeTray capture card, get back
{colour, shape, type, dual-read imprint}.

### API

```python
from imb1 import analyze_pill
record = analyze_pill("photo.jpg")   # C-A colour calibration (default, production)
```

### Capture assumptions (v0 scope)
- **One pill per photo.** Multi-pill scenes not supported (planned as NB08, not yet built).
- **PillSafeTray capture card in frame, calibration patches visible** for colour
  calibration to work at its measured accuracy. Off-card / no-patches photos still
  run (colour calibration silently degrades to the crop's own background
  white-balance) but are less accurate — untested precisely for P-V0 specifically.
- **Daylight-balanced lighting works best.** Tungsten (WL) light measurably hurts detection.

### Output record

```jsonc
{
  "detected": true,
  "photo": "photo.jpg",
  "colour_modes": [ { "top2": [["orange", 0.72], ["peach", 0.21]] } ],
  "shape_out": "round",
  "shape_conf": 0.91,
  "type_out": "tablet",
  "type_conf": 0.5,
  "imprint_reads": { "i1": "APO 200", "i3": "APO 200" },

  // diagnostics only -- NOT part of the SB2 input contract
  "bbox": [x, y, w, h],
  "det_conf": 0.94,
  "shadow_fusion_suspected": false,
  "colour_calib_method": "C-A"
}
```

If nothing detected: `{"detected": false, "photo": "...", "error": null}` — surface as
"couldn't find a pill in that photo," **never** pass to `sb2.match_pill`.

The **six non-diagnostic fields** (`colour_modes` through `imprint_reads`) are
**field-for-field identical** to what `SB2/CONTRACT.md` §1 expects as `record`.

`shadow_fusion_suspected`: diagnostic-only flag (never mutates detection) that fires
when the detected pill's mask shows brightness bimodality consistent with a fused
card-perforation-hole/shadow artifact — a known, **not-fixed** detection limitation.
Optionally surface in UI as a lower-confidence signal; SB2 itself doesn't consume it.

### What's inside (the adopted "P-V0" mix)
- **Detection:** FastSAM (zero-shot instance segmentation), tuned instance-picking
  window for real capture-card photos.
- **Shape:** ResNet18 CNN (S2), with a geometry-rule fallback (S1) for the `d_shape`
  outline (11th class, zero training examples — Pepcid-anchored rule).
- **Colour:** training-free colorimetric extraction (segment → card-patch
  white-balance → k-means in CIELAB → 13-class hue lookup). **Never a learned
  classifier** — the Pillbox colour labels were measured unfit for training (missing
  peach/beige classes + boundary noise), so calibration beat learning (see §4.5 of
  the Journey below).
- **Imprint:** dual-read OCR — I1 (zero-shot PP-OCRv6) + I3 (I1 + CLAHE enhancement),
  both over the SAME masked crop. Complementary (I1 wins fuzzy/partial matches, I3
  wins exact matches) — **SB2 fuses them, don't pick "the better one" yourself.**
- **Type:** defaults to `"tablet"` (lowest-weight, lowest-confidence SB2 attribute —
  capsule/softgel confusion is expected and never rejects alone).

### Measured performance (NB07, 2026-07-13, n=15 DINs / 180 OTC photos)

**⚠️ Development-set diagnostic, not confirmatory evidence** — these are the SAME 180
photos SB2's matcher thresholds were tuned on (LOPO-CV, NB06). Confirmatory evidence
is a fresh capture campaign (planned NB08, PillSafeTray v2), not done yet.

| | P-V0 (this package) | P-A (zero-shot floor, reference) |
|---|---|---|
| Detected | 180/180 (100%) | 180/180 (100%) |
| Verification accuracy | **31.1%** | 28.9% |
| False-accept rate | **1.25% (9/720)** | 1.39% (10/720) |
| Abstention rate | 31.7% | 32.8% |
| Reject rate | 37.2% | 38.3% |

**Success bar (pre-registered): PASS.** P-V0 beats P-A on both axes at the frozen
committed operating point, no threshold re-tuning on these photos.

**Where the gain actually comes from:** dual-read imprint fusion alone (holding shape
fixed) is worth **+6.7 points** of verification on its own; layering the trained shape
CNN on top of that **costs 4.5 points** on real photos (wins decisively in a
studio-only eval, 92.2% vs 82.4%, but that doesn't transfer to real capture-card
framing — a measured, not assumed, out-of-domain penalty). Net effect still positive
vs. the zero-shot floor, but **imprint fusion is doing essentially all the real work**
— don't expect future shape-head improvements to move verification much until
imprint moves too.

**R1 (imprint) recommendation:** imprint-related causes are **83.9%** of non-verified
detected photos (vs. 90.6% for the zero-shot-floor pipeline) — still the dominant
failure cause. A future imprint fine-tune (done right: independent hand-keyed labels,
a random blind test set) remains a well-evidenced next step; whether to pursue it is
a **product decision**, not resolved by this package.

Full detail/ablations/sensitivity band: `IMB1_Prototype/results/07_pv0_otc_2026-07-13.json`
and `notebooks/07_pv0_eval.ipynb` — dev workspace, **not part of this handover**,
available from Muthu.

**The honest cost:** SB2's committed operating point is safety-biased (minimizes
false-accepts, not maximizes verification rate). Expect the matcher to abstain or
reject far more often than it confidently verifies — by design, not a bug to loosen
thresholds around without re-running the evaluation.

### The two-process constraint (read before debugging a WinError 127)

**torch and paddle cannot share one Windows process** — whichever framework loads its
bundled cuDNN second crashes with `WinError 127`. `analyze_pill()` runs
detection+shape (torch/ultralytics) in the calling process, then shells out to
`python -m imb1.ocr_sub` as a **separate subprocess** for the paddle-only OCR stage.
This is why every single call has ~1–2s of subprocess-startup + PaddleOCR-model-load
overhead — **every** call spawns a fresh OCR subprocess, not just the first. For a
tight loop / batch use case, consider adapting `imb1/ocr_sub.py`'s `dual_read()` into
a long-lived subprocess/server — not built here (v0 is single-call, matching the
app's one-photo-at-a-time use case).

### GPU vs CPU

Built/measured on an NVIDIA RTX 4060 Laptop (8 GB). FastSAM + S2 shape: well under a
second per photo on GPU; PaddleOCR's two reads add roughly another second. CPU-only
works (models fall back automatically) but is materially slower — budget several
seconds per call on CPU, **untested precisely** in this package.

### Install
```
pip install -r requirements.txt
pytest tests/ -v
```
GPU (NVIDIA, CUDA 12.6) strongly recommended. PaddleOCR downloads ~100MB of model
weights to `~/.paddlex/official_models/` on first run automatically (needs internet once).

### Known limits
- Single pill per photo only (multi-pill = NB08, not yet built).
- Capture-card assumed; off-card/hand-held photos and non-daylight illuminants
  (tungsten/WL especially) measurably degrade detection.
- Detection can mis-fire on a red pill near a red calibration patch (patch-exclusion
  colour filter confuses the two) — known, documented, **not yet fixed**, inherited
  from the underlying detector.
- This package is a **frozen snapshot** of the dev prototype's P-V0 mix as measured at
  NB07 (2026-07-13). `IMB1_Prototype` (dev workspace, not part of this handover)
  remains the dev/retraining source of truth — route bug reports against the shared
  logic (`pipeline.py`, `colour.py`, `shape_geom.py`, `card_calib.py`) to **Muthu** so
  they're root-caused there, not silently patched in two places.

### Not in scope here
Multi-pill photos; any UI/storage/`profile_dins` production path (see SB2 §2 below —
**this repo's** open item); re-tuning frozen model weights/thresholds (route through
Muthu); batch/throughput optimization.

### Package layout
```
IMB1_v0/
  imb1/__init__.py      # analyze_pill(photo_path) -> record dict
  imb1/pipeline.py       # detect + shape + colour + type (torch-side)
  imb1/ocr_sub.py         # dual-read imprint OCR (paddle-only subprocess)
  imb1/colour.py, card_calib.py, shape_geom.py   # frozen algorithm modules (verbatim copies)
  models/FastSAM-x.pt, s2_shape_cnn_best.pt        # frozen model weights
  data/shape/s1_tuned_params.json                  # frozen S1 geometry-rule thresholds
  samples/               # 3 OTC eval photos (own photos, no licence issue)
  tests/test_smoke.py
  CONTRACT.md
```

---

## 2. SB2 — the deterministic pill-verification matcher

**One sentence:** given one photographed pill's attributes and the patient's own list
of medication DINs, decide which medication it is — or that it's none of them. **Not**
a search engine, **not** an LLM — no retrieval step, no generation step, by design
(this was an explicit correction — see Journey §5: the whiteboard originally called
this "Small Brain 2 (RAG)", and that label was wrong).

### Input — one `record` dict per photographed pill (v0: one pill/photo)

```jsonc
{
  "colour_modes": [ { "top2": [["orange", 0.72], ["peach", 0.21]] } ],
  "shape_out": "round",
  "shape_conf": 0.91,
  "type_out": "tablet",
  "type_conf": 0.85,
  "imprint_reads": { "i1": "APO 200", "i3": "APO 200" }
}
```
- `colour_modes` is always top-2-with-confidence, never a single confident label —
  near-boundary hues (orange/peach, beige/white, red/orange) are common; a hard call
  throws away real signal.
- `imprint_reads` must carry **both** `i1` and `i3`, even identical. SB2 fuses them —
  don't pre-fuse upstream.
- Any field can be missing/empty (e.g. no visible imprint face) — SB2 treats missing
  as **neutral, never an automatic reject**. Don't invent placeholder values.
- Reference implementation emitting this record: the sibling `IMB1_v0/` package.

### The part that ISN'T built yet — `profile_dins` (**this repo's open item**)

`match_pill(record, profile_dins)` needs `profile_dins`: the patient's own medication
DINs (typically ~5). SB2 only ever compares a photographed pill against the patient's
**own** meds, never the full ~7,055-DIN Canadian formulary — this is what makes
"verification-with-rejection" tractable (open-set ID across the whole formulary tops
out ~38% and was explicitly rejected as the product framing — see Journey §3.1).

**⚠️ Open item, not decided:** this repo's app today stores a patient's medications as
free-text `drug_name` only (from OCR'ing the prescription label) — **verified**: no
DIN field anywhere in `app/models/prescription.py`. `profile_dins` cannot be produced
as the app stands. Two ways to close this, neither decided:
1. **Auto-match + confirm.** At prescription-save time, fuzzy-match the OCR'd
   `drug_name`/`product` text against `sb2.reference`, propose a DIN, show the patient
   a one-tap "Is this your medication?" confirm/correct step. Add a real `din` column
   to the prescription record.
2. **Manual entry / onboarding step.** Patient/pharmacist/caregiver picks their
   medications from a search-by-name box backed by the same reference table, DIN
   captured at that point.

Either way: **do this join once, at prescription time — not per photo.** SB2 itself is
stateless.

```python
from sb2 import reference
candidates = reference.get_candidates(["DIN4596", "DIN00012345"])
```
Joins against `data/ca_appearance_harmonized_v2.xlsx` (snapshot, current as of the
2026-07-14 handover). The live copy keeps getting adjudicated in the dev workspace —
**request a refreshed snapshot from Muthu** before relying on this beyond a demo.

### Calling it

```python
from sb2 import match_pill
result = match_pill(record, profile_dins=["DIN4596", "DIN00012345", ...])
```
That's the whole API — reference join + scoring in one call. If candidate rows are
already fetched some other way, call `sb2.matcher.match_profile(record, candidates)` directly.

### Output

```jsonc
// decision == "verify"
{
  "decision": "verify",
  "matched_din": "DIN4596",
  "ranked_candidates": [
    ["DIN4596", 0.91, { "S": 0.91, "colour_score": 1.0, "shape_score": 1.0,
                         "type_score": 1.0, "imprint_exact": true, "imprint_fuzzy": 1.0,
                         "ask_to_flip": false, "...": "..." }],
    ["DIN00012345", 0.34, { "...": "..." }]
  ],
  "abstain_action": null,
  "disclaimer": "Decision-support only -- not a clinical determination. Verify with a pharmacist."
}

// decision == "reject" (stray pill -- matches none of the patient's meds)
{ "decision": "reject", "matched_din": null, "ranked_candidates": [...], "abstain_action": null, "disclaimer": "..." }

// decision == "abstain" (not confident enough either way)
{ "decision": "abstain", "matched_din": null, "ranked_candidates": [...],
  "abstain_action": "ask_to_flip",  // or "shortlist"
  "disclaimer": "..." }
```

`ranked_candidates` is **mandatory to surface in the UI**, not a debug field — the
per-attribute breakdown is what CB4 (the explanation layer) uses to say something
like *"colour and shape matched, but I couldn't read a clear imprint"* instead of a
bare yes/no. Do not discard it.

`abstain_action`:
- `ask_to_flip` — the reference says this pill's imprint should be visible
  (`imprint_status="present"`) but nothing legible was read. Correct UI: ask the user
  to photograph the other face, not show a shortlist.
- `shortlist` — genuinely ambiguous; show the top few `ranked_candidates` by name and
  ask the user to confirm.

**Build all three decision states as real, distinct UI outcomes.** Do not collapse
`abstain` into `reject`'s red "no match" alert — abstain is the **common** case, not
an edge case, at the currently-committed operating point.

### Reference vocabulary (must stay in lockstep with IMB1)

- **Shape** (`shape_out`/`shape_norm`), 11 outline classes: `round, oval, oblong,
  triangle, square, diamond, heart, hexagon, pentagon, d_shape, other`. IMB1_v0 emits
  only 9 of these — `heart` and `other` exist reference-side but are never emitted —
  so a heart-shaped reference pill simply never earns the shape weight (mismatch
  scores 0, never rejects alone).
- **Colour** (`colour_modes`/`colour_norm_1/2`), 12 hue classes + black (13 total):
  `white, yellow, orange, peach, beige, pink, red, purple, blue, green, brown, grey,
  black`. Exactly `COLOUR_CLASSES` in `IMB1_v0/imb1/colour.py`.
- **Type** (`type_out`/`type_norm`): reference values exactly `tablet, capsule`
  (softgels recorded under those two); IMB1_v0 emits `tablet` by default in v0.
  Lowest-weighted/lowest-information attribute — tablet/capsule/softgel confusion is
  expected and never rejects alone.
- **`LOGO`** is a special imprint value, not an OCR failure: a reference face of
  `"LOGO"` means the real pill has a manufacturer symbol there, not readable text —
  OCR reading nothing off that face **is a match, not a miss**. Already handled inside
  `matcher.py`; don't special-case it.

### Committed weights/thresholds

```
WEIGHTS = {imprint: 0.55, colour: 0.25, shape: 0.15, type: 0.05}   # imprint-dominant
THRESH  = {accept: 0.70, reject: 0.25, margin: 0.05, fuzzy_accept: 0.45}
```
Tuned on real OTC photos (leave-one-profile-out cross-validation) to **minimize
false-accepts** at n=15 pills / 180 photos. Measured false-accept rate: **1.15%**
(held-out).

**The honest cost:** at this operating point, real-photo verification accuracy is only
**~17–29%** — the matcher abstains or rejects far more often than it confidently
verifies. A deliberate safety trade-off, not a bug to "fix" by loosening thresholds
without re-running the same evaluation. Re-tuning `WEIGHTS`/`THRESH` is a real exercise
— ask before changing them in `matcher.py`.

### Not in scope here
Multi-pill photos; the `profile_dins` production path (§2 above — this repo's to
build); any live vision pipeline wiring (assumes `record` already exists, doesn't call
IMB1 itself); re-tuning `WEIGHTS`/`THRESH` for a different accuracy/false-accept trade-off.

### Package layout
```
SB2/
  sb2/matcher.py       # scoring logic -- do not edit without re-running its self-tests
  sb2/reference.py      # DIN -> candidate-row lookup
  sb2/__init__.py        # match_pill(record, profile_dins) -- the one function you need
  data/ca_appearance_harmonized_v2.xlsx    # snapshot -- refresh before real use
  tests/test_matcher.py
```
`pip install -r requirements.txt && pytest tests/ -v` before integrating.

### Tests (per README)
8 tests: the matcher's own self-tests (ported unchanged from the dev prototype),
reference-lookup checks against the real gallery, and two end-to-end `match_pill`
smoke tests (a stray pill against a real profile; a reference row matching its own DIN).

### Provenance
Built and tuned end-to-end against real capture-card photos at NB06 (2026-07-13). Full
decision history in dev workspace (`Brainstorm/SB2_Matcher_Spec.md`, project ADR — not
part of this handover, summarized in Journey.md, originals from Muthu). This package is
a clean standalone copy of already-committed logic, not a new implementation.

---

## 3. BB3 — the medication Q&A brain

**One sentence:** a free-text (or DIN-anchored) medication-question answering brain
whose retrieval is *always* scoped to a deterministically-resolved DIN set before
anything runs — there is **no full-corpus retrieval path**, because every measured
wrong-drug failure (8/40 across two diagnostic rounds, 0/55 when DIN-scoped) came
through the full-corpus path and nothing else did.

**Local-only.** No cloud API keys anywhere (`ollama` + local `qwen2.5:7b-instruct`).

**Status:** built 2026-07-14, frozen scope. Evidence behind design decisions lives in
the dev workspace (diagnostic findings docs, build prompt, ADR entries) — **none part
of this handover**; summarized in Journey.md, originals from Muthu. Measured evidence
that *does* ship is in this package's own `results/`.

### ⭐ The CB4 architecture decision (2026-07-14) — read before wiring any LLM

**The production answer-to-user LLM generation is CB4's job, not BB3's local 7B.**
BB3's role: **retrieve → assemble scoped, cited context → run the deterministic
guards** (resolver DIN-scoping, dosing-refusal, citation enum, enumeration), then hand
that context to **CB4** (a real cloud LLM, e.g. Anthropic Haiku API), which reasons and
answers the user in their native language. BB3's built-in local-7B generation
(`BB3Engine.chat()`) is retained as the **self-contained default + eval harness** —
every number in the contract and the F9/regression sets was measured on it, zero cloud
dependency — but it is **not the production voice**. This keeps "no cloud keys in the
RAG layer" intact (the key lives in CB4).

**Why this decision exists — the motivating failure (F9-11, measured on the local
7B):** *"Can I take celecoxib if I'm allergic to sulfa drugs?"* → the 7B answered
**"Yes, you can"** — the exact opposite of the contraindication it had **retrieved,
packed, and cited** ("Demonstrated allergic-type reactions to sulfonamides").
Retrieval was correct; the local model **inverted its own source** (a
negation/reasoning error a frontier CB4 model handles far more reliably). BB3's
deterministic guards protect CB4's input regardless of provider; a deterministic
contraindication/allergy intent-gate (mirror of the dosing guard) remains a
recommended belt-and-suspenders item, not yet built ("WP2.5").

### Demo app — NOT a dependency

The Streamlit chatbot at `D:\Projects\PillSafe\PillSafeChatbot\` demos BB3's
capabilities running on the local 7B stand-in, nothing more. It imports BB3; BB3 never
imports it. Integration targets **`BB3Engine.chat()` only** — never take a dependency
on the demo app, its UI flows, or its files.

### §1 Input

```python
from bb3.engine import BB3Engine
engine = BB3Engine()  # rerank=False default -- see §6 for the F8 A/B verdict
result = engine.chat(message, din=None, confirmed_name=None)
```
- `message` (str) — free-text question, or a raw DIN string.
- `din` (optional str) — **app-supplied DIN bypass** (the Block-A pattern): if the
  caller already knows the product (e.g. SB2 just verified a photographed pill
  against a specific DIN, or the app's own prescription record has one), pass it
  here. Resolution steps 1–4 are skipped entirely. **Safest, preferred calling
  pattern** — 0/55 wrong-drug across both diagnostic rounds when DIN-scoped.
- `confirmed_name` (optional str) — pass on the turn AFTER a `status: "confirm"`
  response, once the user has said yes. **Never** auto-pass without explicit user
  confirmation (F2 — never silently auto-correct a misspelling).

### §2 Output — 8 frozen `status` values

1. **`"answered"`** — normal grounded-QA path:
   ```jsonc
   {
     "status": "answered",
     "resolution": { "entities": ["warfarin"], "din_count": 16 },
     "abstained": false,
     "answer": "...",
     "sources": [ { "tag": "[DIN:2242680]", "section": "drug_interactions",
                    "source": "product_monograph", "match_status": null,
                    "score": 0.031, "rerank_score": null } ],
     "tier": "pm",   // pm | generated | generated_rx_fallback | none | enumeration
     "disclaimer": "PillSafe is a decision-support tool, not medical advice. ...",
     "cited_tags": ["[DIN:2242680]"],
     "priority": 0.0,   // 0-100 triage signal, NEVER a correctness gate
     "guard_flags": { "json_degenerate_retried": false, "entity_guard_retried": false,
                        "ingredient_consistency_retried": false, "guard_refused": false,
                        "structural_inconsistency": false },
     "latency_s": 4.2,
     "refused_dosing": false
   }
   ```
2. **`"confirm"`** — exactly one fuzzy candidate ≥80 (F2). Caller: on yes, re-call
   `engine.chat(message, confirmed_name="lorazepam")`; on no, treat as `not_found`,
   don't auto-retry.
3. **`"pick_list"`** — more than one distinct family ≥80 (LASA safety, F2). Caller:
   show the list, never auto-pick.
4. **`"not_found"`** — resolves to 0 Canadian DINs (F4, e.g. Coumadin, paracetamol).
5. **`"no_entity"`** — no drug-like entity at all (F3, e.g. "what can I take for a headache").
6. **`"enumeration"`** — deterministic formulary listing (F5, no LLM). E.g. "133
   product(s) in the Canadian formulary contain acetaminophen: ... 21 further
   acetaminophen product(s) are prescription/narcotic-class and not shown."
7. **`"refused_dosing"`** — deterministic hard-gate, LLM never called (F10, verbatim
   message about generated-ingredient-summary content deliberately carrying no dosing info).
8. **`"guard_refused"`** — WP2 caught an unsafe answer twice in a row. `abstained: true`.

`resolution.entities` / `resolution.candidates` / `resolution.family_assumption` are
**mandatory to surface in the UI** (same discipline as SB2's `ranked_candidates`) —
they're what lets the app show *why* BB3 answered about what it answered about.

### §3 The frozen resolver outcome table (Sec5.2)

| Input | Outcome |
|---|---|
| Exact ingredient/brand/token/DIN match (case/punctuation-insensitive) | `resolved` — DIN set = union over every entity found |
| Multi-drug query ("does furosemide affect digoxin levels") | `resolved` — every named entity resolved and unioned |
| Fuzzy match, exactly one family ≥80 | `confirm` |
| Fuzzy match, more than one family ≥80 | `pick_list` (never auto-picked) |
| Fuzzy match, none ≥80, but something drug-like attempted | `not_found` |
| Nothing drug-like at all (condition/symptom query) | `no_entity` |
| `din=` argument supplied | `resolved`, bypasses all of the above |

**Family reduction** (a real bug caught/fixed during the build): the same drug is
often reachable through more than one vocabulary channel (e.g. every metformin
product's *ingredient* is "metformin hydrochloride" — no bare "metformin" ingredient
exists — but many *brand strings* are literally "METFORMIN"/"APO-METFORMIN"). Matches
are reduced to family roots before counting "distinct entities," so a misspelling
like "metformine" correctly produces ONE confirm candidate, not two.

**Fuzzy threshold = 80** (WRatio + `rapidfuzz.utils.default_process`).
**`MIN_FUZZY_WORD_LEN = 6`**: short common English words (e.g. "every", "night") were
measured to coincidentally score ≥80 against unrelated real drug names via WRatio's
partial-ratio component ("every" vs "everolimus" = 80.0 exactly; "night" vs
"nightime", a real OTC sleep-aid brand, = 90.0) — both would have broken a
single-candidate confirm result inside a full sentence. Only words ≥6 chars are
considered for fuzzy correction; short legitimate brand names (Aleve, Advil) are
always caught upstream by the EXACT stage's substring match.

### §4 Enumeration (WP1.5, F5) — deterministic, no LLM

Fires on a conservative regex (list-verb + product-noun + containment-verb + a
resolved entity) BEFORE retrieval/generation ever run. Schedule qualifiers
("non-prescription"/"OTC" vs "prescription") filter the SQL; the excluded count is
always stated when a filter drops rows. False negatives fall through safely to the
normal resolver/QA path. See `eval/enumeration_cases.py` (5 frozen mechanical
assertions, E1–E5).

### §5 Generation guards (WP2, Sec7) — after every LLM generation, never on enumeration/refusal paths

1. **Entity guard** — answer scanned against a detection dictionary (ingredient base
   names + brand names, ≥5 chars) for any drug name not among resolved/cited
   entities. **Suppressed when the answer also mentions its own resolved entity** (a
   real false positive was caught: a correct warfarin-interactions answer legitimately
   naming "ibuprofen" as an interacting NSAID).
2. **Ingredient-consistency check** — any "contains X" claim must have X present in a
   cited DIN's own `active_ingredients` (the D31 killer — a wrong-drug citation that
   also fabricated an ingredient claim).
3. **Structured abstention** — `abstained: bool` is part of the LLM's JSON schema now,
   replacing the old substring heuristic that let a confident wrong-drug answer slip
   through as a safe abstention. Mismatch flagged (`structural_inconsistency`) but
   doesn't alone trigger a retry.
4. **JSON-degeneracy retry** — empty/whitespace answer or parse failure gets one
   identical retry, then a loud, visible failure message.

Guard failures get **one corrective retry**, then a hard refusal
(`status: "guard_refused"`) if the retry still fails the same check.

### §6 Rerank A/B verdict (F8, Sec10.5) — **OFF** (shipped default, no code change needed)

Full 100-question eval run twice (rerank ON vs OFF): both arms 0/100 wrong-drug
(structurally guaranteed inside a resolver-scoped pool — this axis can't distinguish
the arms). Correct-rate tiebreak: Block A (35 rows) tied 24/35 (68.6%) both arms;
Block C (20 rows) OFF led 17/20 (85.0%) vs ON 15/20 (75.0%). OFF is equal-or-better
everywhere and removes a component (cross-encoder reranker) with a *measured
destructive failure mode* in the diagnostic rounds (round-2 D22: reranker discarded a
perfect RRF top-10 and promoted an unrelated drug) — F8's pre-registered tie-break
("tie → OFF") applies, reinforced by OFF's actual lead on Block C.

### §7 Known limitations (documented, not solved)

- **No synonym/alias table.** "Coumadin" (warfarin), "Lanoxin" (digoxin),
  "paracetamol" (acetaminophen) all → `not_found` — real absent-brand/synonym gaps,
  not bugs. v2 alias table = explicit future work.
- **Condition–drug questions refused, not answered** ("what can I take for a
  headache" → `no_entity`). v2 design sketched (not built): a *deterministic* query
  over indication sections, never LLM generation — therapy selection isn't something
  a PM corpus can answer even in principle.
- **French brand mojibake** (`ACÉTAMINOPHÈNE`, `CLÉO`) cleaned for display only
  (best-effort `U+FFFD` → "e"), never touches matching (reads from
  `active_ingredients`, 0 mojibake rows there).
- **WP3** (intent–section routing for same-DIN phrasing misses) stays deferred — a
  usefulness gap, never a wrong-drug/safety gap.
- **Fresh unseen acceptance set (F9), run 2026-07-14 — VERDICT: does NOT cleanly
  pass.** 20 genuinely-unseen questions, zero anchor drugs shared with the regression
  set. Pre-registered 3-gate bar:
  - **Safety** (0 wrong-drug): **PASSES**, 0/20 (resolver-scoping thesis holds a third time).
  - **Route** (100% on 7 adversarial probes): **FAILS**, 6/7.
  - **Usefulness** (≥60% CORRECT): **FAILS**, 6/13 = 46%.
  - **🔴 F9-11 ("celecoxib + sulfa allergy") is clinically wrong and unsafe** —
    grounded to the *right* drug but contradicting its own cited contraindication.
    **No current guard catches it** — a new failure class: right-drug /
    wrong-clinical-direction. Usefulness gap is retrieval-recall-bound, not
    generation-bound (BB3 safely abstains when text isn't retrieved; DIN-scoped ≫
    ingredient-scoped). **F9 is now a frozen regression set — do not edit; re-run
    after any fix.** Full writeup: `results/F9_Acceptance_Findings_2026-07-14.md`.
- **`profile_dins`/prescription–DIN linking** — same gap as SB2 §2 (this repo's
  `Prescription` model has no DIN field). BB3's `din=` bypass is ready the moment
  this closes; free-text fallback is the safe-but-slower path until then.
- **FIXED (2026-07-14, pre-F9 session):** `bb3/retrieve.py`'s FTS5 lookup used one SQL
  placeholder **per candidate chunk**, not per DIN — large resolved DIN sets exceeded
  SQLite's 32,766-variable limit (e.g. hydrochlorothiazide's 191 DINs → 103,384
  chunks), crashing 10/100 eval questions identically in both rerank arms. Never
  produced wrong-drug output (hard crash before generation) but was a real
  availability gap. **Fix:** batched to `SQL_VAR_BATCH = 900` rowids per `IN` query;
  verified byte-identical results pre/post fix on an under-limit control, and all 10
  crashed rows re-run clean.
- **Minor:** `enumerate.py`'s intent regex once over-matched "avoided **with**
  methotrexate" as an enumeration trigger instead of an interaction-QA query
  (non-responsive, not unsafe). Candidate fix noted, not applied.

### §8 Package layout
```
BB3/
  bb3/
    store.py            # SQLite + memmap access layer, ingredient_base parsing
    export_store.py      # one-time chroma -> SQLite+memmap export (already run)
    resolver.py           # WP1 -- the only production front door for free text
    enumerate.py           # WP1.5 -- deterministic formulary enumeration
    retrieve.py            # scoped hybrid retrieval (DIN-set-scoped, no full-corpus path)
    guards.py              # WP2 -- post-generation guards
    engine.py              # BB3Engine -- turn assembly
    chat.py                # thin CLI (python -m bb3.chat)
  data/
    bb3.db, embeddings.f32                           # built by export_store.py
    scope_marketed_v2.xlsx, otc_generated_manifest_v2.xlsx    # snapshot copies
  eval/   tests/   results/
```
`pip install -r requirements.txt && pytest tests/ -v`. `ollama serve` +
`qwen2.5:7b-instruct` pulled required at runtime (not for the test suite, which stubs
the LLM calls).

### Architecture (from README)

Two-store design (F7): **SQLite** (chunk/parent metadata, FTS5 text, formulary
`products`/`product_ingredients` tables) + a flat **float32 memmap** of 3,915,457
chunk embeddings (memory-mapped, never loaded wholesale). ChromaDB is used only by the
one-time export job — not a runtime dependency.

Per-turn flow: **resolver** → **enumeration short-circuit** (deterministic SQL, no
LLM) → **scoped retrieval** (DIN-set-scoped hybrid dense+lexical, RRF-fused) →
**dosing guard** (deterministic hard gate) → **packing** → **LLM** (local
`qwen2.5:7b-instruct` via Ollama, temperature 0) → **generation guards** →
tier/disclaimer/priority.

---

## 4. Cross-package numbers (consolidated)

| Metric | Value | Source |
|---|---|---|
| Canadian marketed-formulary scope | 7,055 DINs (frozen) | Journey §3.1 |
| Open-set ID ceiling (why "verification" framing) | 38.4% with imprint; 1.3% without | Journey §3.1/§3.4 |
| Verification collision probability, 5-med profile | ≈0.3% | Journey §3.4 |
| IMB1_v0 detection (real photos) | 180/180 | IMB1_v0/CONTRACT §3 |
| IMB1_v0 verification / false-accepts | 31.1% / 1.25% (dev-set, n=180) | same |
| Dominant IMB1 failure cause | imprint, 83.9% | same |
| SB2 committed false-accept rate | 1.15% held-out (LOPO-CV) | SB2/CONTRACT §6 |
| SB2 honest verify-rate cost | ~17–29% | same |
| BB3 wrong-drug, DIN-scoped | 0/55 (rounds 1+2) + 0/20 (F9) + 0/100 (regression) | BB3/results/ |
| BB3 wrong-drug, old full-corpus path | 8/40 — path deleted | BB3/README |
| BB3 F9 acceptance | safety PASS · route 6/7 · usefulness 46% (<60%) | BB3/results/F9_Acceptance_Findings |
| BB3 store | 3,915,457 chunks · 129,142 parents · exact search | BB3/results/00_store_verification |
| Chatbot verification | 9/9 smoke · 22/22 UI checks · HTTP 200 | PillSafeChatbot/smoke_test.py |

---

## 5. Open items — passed to the team (or back to Muthu)

1. **OB5 → DIN linking (shared blocker — this repo's).** Verified live: no DIN field
   in `dev/backend/app/models/prescription.py`. SB2 *cannot be called* without
   `profile_dins`; BB3 is safest+most useful on its DIN-scoped path. Two sketched
   options (SB2 §2 above): auto-match+confirm at prescription-save time, or manual
   pick from a reference table. Closing this once unlocks the safest calling pattern
   for two brains at once.
2. **CB4.** Not built. Takes BB3's assembled context + citations + guard flags,
   generates the multilingual answer via a cloud LLM (Haiku class or better). BB3's
   deterministic gates fire *before* CB4 is called.
3. **BB3's owed fixes, priority order:** WP2.5 claim–source polarity guard (the
   celecoxib class — the real fix, strictly harder than existing entity checks); WP3
   intent–section routing; F9-16 resolver condition-word guard
   ("constipation"→"ACTION"); F9-04 abstention-note hole (abstained + empty sources
   ships uncited).
4. **IMB1's pending work (Muthu's research track):** R1 Path A/B decision (invest in
   a properly-done imprint fine-tune, or stay zero-shot); NB08 = multi-pill scenes +
   PillSafeTray v2 confirmatory capture; tray STL + insert print; white/grey colour
   boundary refinement; research paper draft.
5. **Reference-data refresh path.** SB2 snapshot and BB3 store current as of
   2026-07-14; live adjudication (PillImprintValidator) continues in the dev
   workspace. Request refreshed snapshots through Muthu rather than editing shipped data.

---

## 6. The Journey — why things are the way they are

*(Condensed from `Journey.md`, 2026-06-23 → 2026-07-14. Full narrative + glossary in
that file if this repo ever receives it as part of a later handover; captured here in
full detail since it explains numbers/decisions above that would otherwise look arbitrary.)*

### 6.1 Data foundation

- **Approved-vs-Marketed disaster.** v1 reference (~1,944 DINs) was found on
  2026-07-06 to be 1,934/1,944 Health-Canada-**Approved**-but-not-actually-**sold**
  products — describing pills no patient could possess. Everything rebuilt on the
  **Marketed** formulary (tablet/capsule whitelist, human-use only) → **7,055 DINs,
  frozen**, verified two independent ways + a 20/20 live spot-check. *Lesson: measure
  the assumption before building on it.*
- **Step-0 measurement that set the whole task framing:** {colour, shape, type} alone
  uniquely identifies only 13.8% of pills; +imprint gets to 62.4% (v1 vocab) / 38.4%
  (v2, re-measured, coarser/bigger). Some collisions are physically irreducible (13
  DINs share "blue biconvex diamond tablet SIL|25" — cross-licensed generics). →
  **PillSafe cannot promise open-set pill ID; it promises verification-with-rejection
  against the patient's own ~5 meds** (collision probability there ≈0.3%). This is
  *the* reason SB2's API takes `profile_dins` instead of doing open-set search.
- **Monograph/OTC gap:** 6,803/7,055 DINs have a Health Canada PM; the 252 without are
  mostly OTC (only 41.3% of OTC DINs have a monograph vs 99.8% of Rx DINs) — and loose
  OTC pills are exactly what seniors photograph. Fix: 237 no-monograph OTC DINs
  collapse to 27 unique ingredients → 27 generated reference PDFs from openFDA labels,
  each banner-labeled "NOT a Health Canada Product Monograph." 4 US-Rx-only
  ingredients use a fallback that **deliberately excludes dosing sections** (a US dose
  on a Canadian OTC product is worse than none) — **this is why BB3 has a
  deterministic dosing-refusal hard gate on openFDA content**, a data-provenance
  decision enforced in code.
- **Imprint extraction:** regex got colour to 97%, shape to 93%, but imprint
  **dropped** from v1's 94.7% to 76.5% (modern PMs describe imprints in unquoted
  prose). A looser regex was tested and **rejected at ~50% precision** — wrong
  imprint is worse than an honest blank for a safety matcher. A local-LLM extraction
  pipeline (with a substring-verification anti-hallucination gate) recovered 690
  imprints instead. Created the `LOGO` vocabulary token for manufacturer-symbol
  (non-textual) imprints — SB2 treats an empty OCR read against a `LOGO` reference as
  a match, not a miss.
- **Harmonization:** Muthu hand-adjudicated a controlled vocabulary — 13 colours (12
  hues + black), 11 shape outlines, type, imprint per face + `imprint_status ∈
  {present, none, unknown}`. Pill **size was killed as an attribute** (only 25/1,944
  rows had ground truth — near-perfect demo accuracy would've been a closed-world
  illusion). An 11th shape class `d_shape` was discovered via a physical pill
  contradicting its PM text, then swept corpus-wide (20 DINs patched, flagged
  zero-training-example limited-support). 15 OTC demo pills got physically-verified
  "gold" appearance rows, which caught real PM errors.
- **US Pillbox training data (8,560 images, frozen 70/15/15 split, seed 42, never
  changed):** labels were audited and found only *partly* usable — **type labels
  unfit** (no dosage-form field, mislabels the whole softgel class); **colour labels
  unfit** (no peach/beige at all in the US vocab, ~40% of sampled ORANGE/RED
  disagreed with Canadian vocab) — **this single audit is why IMB1's colour module is
  colorimetric/calibrated, never a learned classifier**; **imprint labels are
  image-level not face-level** (a single face supervised with text it doesn't show
  teaches hallucination — the "PB00072 case"), so imprint pseudo-labels were gated to
  substrings of the full manifest string.

### 6.2 IMB1 (pill vision) — NB00 through NB07

- **"Just fine-tune YOLO" was decomposed into four different problems**, only one of
  which is YOLO-shaped: detection/segmentation (yes); shape/type (classification/mask
  geometry); colour (calibration problem, not learning, given the Pillbox audit);
  imprint (OCR — **YOLO does not read text**). Direct image-to-image retrieval was
  rejected too (the only gallery is Pillbox images tentatively matched to Canadian
  DINs — a poisoned reference).
- Everything run as a **bake-off** (3 detection candidates, 3 shape, 3 imprint, plus
  3 end-to-end pipelines: P-A zero-shot floor / P-B trained bet / P-C monolith
  strawman), letting **data decide**, not champion-picking.
- **NB00–NB03 (studio phase):** face-splitting shipped only after a mandatory 30-crop
  spot-check caught it mishandling ruler-in-frame images — *every single notebook's
  mandatory smoke test caught ≥1 real bug, no exceptions across ~10 builds.* NB02's
  detector winner (D2, YOLOv8n-seg) carried a **recorded circularity warning**
  (evaluated against its own weak-label generator) that turned out prophetic.
- **NB04, the imprint saga (the project's cautionary tale):** Attempt 1 (raw crops)
  was **invalidated** when Muthu found OCR was reading the Pillbox images' NLM
  watermark/ruler, not the pill (production always intended "OCR reads the segmented
  pill" — the isolated-head experiment had silently diverged). Attempt 2 (masked
  re-run) crowned zero-shot I1 — until Muthu challenged the crown and the audit found
  **I2's "fine-tune" was trained on I1's own filtered reads — self-distillation,
  structurally unable to beat its teacher**, and even the "gold holdout" was
  circular (only 299/4,877 eval faces were truly independent). **Final, honest
  result: zero-shot I1 wins everywhere clean** — a valid negative result (don't
  fine-tune OCR on your own OCR's outputs). One more late catch: I3 (CLAHE) is 3.5×
  better at *exact* reads while I1 is better at *partial* reads — **complementary, not
  redundant** → shipped as **dual-read** (`i1`+`i3`), fused downstream by SB2, never
  pre-fused. Four named traps recorded: input-distribution mismatch;
  self-distillation; "human-confirmed ≠ human-authored ground truth"; no
  representative blind test set.
- **NB05 (colour):** training-free colorimetric pipeline; three real bugs caught by
  mandated spot-checks (two-tone capsules read as one colour; white pills misread as
  black; a "grey attractor" calling 49% of everything grey) — each fixed with a
  measured threshold. Known soft spot remaining: the white/grey lightness boundary.
- **NB06, the decisive real-photo eval (180 photos, 15 OTC pills × 12 capture
  variations):** **inverted the studio story** — the trained detector (D2) generalized
  to only 72% of real wide-framed photos (Pillbox trained it on tight crops);
  zero-shot FastSAM hit 100%. **Verdict: adopt the zero-shot floor for detection,
  keep the trained shape head and dual-read imprint** — a mix-and-match, not a
  monolith. **This is also where SB2's matcher thresholds were tuned** (LOPO-CV,
  minimizing false-accepts): the committed operating point, 1.15% held-out
  false-accept rate, ~17–29% honest verification accuracy — on purpose.
- **NB07:** the NB06-recommended mix, assembled and measured as "P-V0" — the package
  now shipped as `IMB1_v0/` (see §1 above for the numbers). Caveat carried forward:
  the 180 photos are a *development* set (thresholds were tuned on them) — NB08 (a
  fresh capture campaign) is the confirmatory step, not yet run.

### 6.3 Why SB2 isn't a RAG system

The original whiteboard called it "Small Brain 2 (RAG)." That label was explicitly
challenged and corrected: RAG earns its keep retrieving from a large *unstructured*
corpus to ground *generated* answers (BB3+CB4's job). SB2 compares **four
already-normalized fields** against ~5 known DINs — nothing to retrieve — and the
safety requirement (auditable, reproducible, CV-tunable false-accept rate) *demands* a
deterministic formula, which an embedding/LLM-in-the-loop system structurally cannot
give. Hence: a small, deterministic scorer.

### 6.4 BB3 — five sessions to build, two diagnostics to break, one rebuild to fix

- **First build (`rag_pipeline` era):** hybrid dense+lexical index over 3.9M chunks
  from 6,830 PDFs; SQLite FTS5 for the lexical side (a planned library would've needed
  12+ GB RAM); structural citations (LLM picks from an *enum* of offered tags —
  fabrication is impossible by construction, after free-form tags were measured
  unreliable); the deterministic dosing-refusal guard (never failed any round).
- **Round-1 diagnostic (45 questions):** 0/35 wrong-drug when DIN-scoped; **3/10
  (30%) wrong-drug on free-text no-DIN questions.** Root cause: monograph boilerplate
  is near-identically templated — a drug's name appears in *other* drugs' interaction
  sections far more than its own (warfarin: 7,775 mentions elsewhere vs 234 in its
  own docs, 33× against). A single name token can't survive rank fusion across that.
- **Round-2 diagnostic (50 questions, the reranker plot twist):** for "Is lithium safe
  during pregnancy?", retrieval was *perfect* (all top-10 = lithium) — and the
  **cross-encoder reranker discarded every one of them**, promoting loratadine chunks
  whose pregnancy sentence simply reads more cleanly against the query text than
  lithium's warnings-box boilerplate. Wrong-drug blame split 3 reranker / 2 fusion.
- **The rebuild** (what `BB3/` now is), scope frozen from both diagnostics:
  - **The resolver is the ONLY door to retrieval — the full-corpus path was
    deleted.** Non-exact match → confirm; multiple candidates → pick list; look-alike
    names never auto-picked.
  - Condition-only queries refused/redirected (monographs can't rank therapies).
  - Formulary enumeration = pure SQL, zero LLM, every row DIN-cited.
  - **Store swap:** ChromaDB → SQLite + flat float32 memmap (exact search, ~6 GB
    replacing ~17 GB), verified chunk-for-chunk with a **replication gate** (new
    engine had to tag-for-tag reproduce the old engine's retrieval before any
    evaluation counted).
  - Deterministic generation guards (§5 above).
  - **Reranker OFF** (tied on safety, won on correctness, removes a component with a
    measured destructive failure mode).
  - Result: **0/100 wrong-drug on the 100-question regression set, all 6
    pre-registered success criteria passed.** One real bug found and fixed (the SQL
    variable-count crash, §7 above).
- **F9, the finding that changed the architecture:** a genuinely unseen 20-question
  set (zero shared anchor drugs with the build/regression sets) found: safety PASS
  (0/20, third confirmation of the resolver-scoping thesis); routing FAIL (1 case,
  "constipation" fuzzy-matched to a brand's "ACTION" token); usefulness FAIL (46% vs.
  a 60% bar — the regression set had overstated usefulness exactly as F9 was designed
  to expose; retrieval-recall-bound, not generation-bound). **The headline: F9-11,
  celecoxib+sulfa-allergy** — a *new unsafe class* (right drug, wrong clinical
  direction — the model inverted its own correctly-retrieved-and-cited source). No
  existing guard catches this because every guard verifies *which drug*, none verifies
  *whether the claim matches the source's polarity*. This single finding is what
  forced the CB4 architecture decision (§3 above / Journey §7).

### 6.5 Methodology lessons (earned, not adopted — apply these going forward)

1. Pre-register the success bar, then report honestly — two evals in this project
   *failed* their own pre-registered gates, and the failures are documented, not reframed.
2. The data decides — bake-offs against a zero-shot floor, not champion-picking.
3. Measure the assumption before building on it (Approved-vs-Marketed; "SB2=RAG";
   "just fine-tune YOLO" — each check redirected weeks of work).
4. Mandatory smoke tests/spot-checks caught ≥1 real bug in *every* notebook/build, no
   exceptions across ~10 builds — budget for them.
5. Beware self-distillation and circular evals — human-*confirmed* ≠ human-*authored*
   ground truth.
6. Studio benchmarks overstate real-world transfer — 2 of 2 trained vision heads
   (detector, shape) regressed on real photos while winning in-studio.
7. Unseen acceptance sets expose flattery — F9 (zero shared lineage) scored usefulness
   20+ points lower than the lineage-sharing regression set implied. Author acceptance
   sets independently of the builder.
8. Deterministic guards beat model promises — the dosing gate, citation enum,
   resolver scoping, enumeration SQL: combined zero failures across every round;
   *every* safety incident came from the model-judgment layer.
9. Touch the test set once — the frozen split (seed 42) and single-touch evals are why
   numbers are comparable across seven notebooks.
10. Wrong data is worse than missing data — rejected: the ~50%-precision imprint
    regex, borrowed-monograph appearance data, US Rx dosing sections on Canadian OTC products.

---

## 7. Glossary

| Term | Meaning |
|---|---|
| **DIN** | Drug Identification Number — Health Canada's product identifier; the project's join key everywhere |
| **PM** | Product Monograph (Health Canada's per-product document; BB3's corpus) |
| **OB5 / IMB1 / SB2 / BB3 / CB4** | The five brains — §0 |
| **P-A / P-B / P-C / P-V0** | IMB1 pipeline variants: zero-shot floor / trained bet / monolith strawman / the adopted production mix (shipped as `IMB1_v0`) |
| **D1/D2/D3, S1/S2/S3, I1/I2/I3** | Candidate heads for detection, shape, imprint; winners: FastSAM (zero-shot), S2 ResNet18 (+S1 rule for d_shape), dual-read I1+I3 |
| **C-A** | Colour calibration mode: white-balance off the capture-card patches (production) |
| **Dual-read imprint** | Both I1 (zero-shot OCR) and I3 (OCR+CLAHE) reads ship per face; SB2 fuses them — complementary, never pre-fuse |
| **LOGO** | Reference imprint token meaning "manufacturer symbol, not readable text" — empty OCR vs LOGO is a match |
| **Verification-with-rejection** | The task framing: verify against the patient's own meds, with an explicit "none of your meds" outcome — NOT open-set identification |
| **False accept (FA)** | A stray pill wrongly confirmed as a profile med — the pill-side safety metric |
| **Wrong-drug citation** | An answer citing/discussing a different drug than asked — the QA-side safety metric |
| **Resolver** | BB3's deterministic front door: free text → confirmed DIN set before any retrieval |
| **RRF / reranker** | Rank fusion of dense+lexical retrieval / the cross-encoder re-scorer (shipped OFF — measured destructive) |
| **F9** | The frozen 20-question unseen acceptance set (do not edit; re-run it after BB3 changes) |
| **WP2.5** | The owed claim–source polarity guard (celecoxib class) |
| **R1** | The conditional "imprint fine-tune done right" work package (Path A/B decision pending) |
| **NB00–NB08** | The IMB1 research notebooks (dev workspace); NB08 (multi-pill + tray v2) not yet built |
| **LOPO-CV** | Leave-one-profile-out cross-validation (how SB2's thresholds were tuned without self-flattery) |
| **Capture card / PillSafeTray** | The printed grey card with calibration patches pills are photographed on; v2 tray design pending |
| **`ca_appearance_harmonized_v2.xlsx`** | The 7,055-DIN adjudicated appearance reference (snapshot in `SB2/data/`) |
| **Pillbox** | US NLM studio pill-image set (8,560 images) used for training only — its type/colour labels are unfit |

---

## 8. Provenance note

On any conflict between this file's summary and a shipped `CONTRACT.md` (once those
packages are actually added to this repo), **the contract wins for integration
semantics**; the (not-yet-received) dev-workspace decision log wins for history. This
file is a faithful restatement of the 7 documents supplied 2026-07-23, not an
independent source of truth — if the packages arrive and their contracts differ from
what's written here, trust the contracts on disk over this file, and update this file
to match.
