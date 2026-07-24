# Known Limitations — Test Coverage Honesty

This document states plainly which parts of the CV/OCR/NLP pipeline are
tested against real-world input vs. only against mocked/synthetic input, and
why. It exists because "which tests actually evaluate CV performance with
real images?" is a fair question that deserves an honest answer instead of a
report that implies more coverage than exists.

## Pill colour/shape detection (`app/services/pill_detection.py`)

- **Failure/fallback path** — `dev/backend/tests/test_pill.py::test_analyze_pill_returns_cv_unavailable_on_detector_failure`
  monkeypatches `detect_color_and_shape` to raise. This is a legitimate test
  of the error contract (HTTP 501 / `CV_UNAVAILABLE`), but it does **not**
  exercise the OpenCV algorithm at all and says nothing about identification
  accuracy.
- **Real-pipeline, synthetic-image path** — `dev/backend/tests/test_pill_detection.py`
  runs the actual OpenCV contour/HSV code end-to-end (no mocking) against
  **programmatically generated** images (PIL-drawn circles/ellipses on a
  plain background). This proves the pipeline runs without crashing and
  returns structurally valid output (color/shape from the known enums). It
  does **not** prove the algorithm correctly identifies real pills.
- **What is missing:** this repo has **no physically-acquired photographs of
  real OTC pills or their packaging checked in** (verified: no `.jpg`/`.png`
  files anywhere in the repo outside build artifacts, and no dataset
  directory). There is therefore currently no test that measures real-world
  identification accuracy, and no ground-truth-labeled image set to assert
  against. The two new synthetic tests include
  `# TODO: add ground-truth accuracy assertion once labeled real photos
  exist` rather than inventing a passing assertion against data that doesn't
  exist.
- **Why:** time/scope — building and labeling a real OTC photo set was out
  of scope for this remediation pass, and no such set was available in the
  repo to reuse despite being referenced as available.

## OCR (`app/services/ocr_service.py`, PaddleOCR)

- No test in this repo runs PaddleOCR against a real prescription photo.
  `opencv-python-headless`, `paddleocr`, and `paddlepaddle` are all optional,
  heavy native dependencies (see `requirements-optional.txt`) not installed
  by default in this dev environment, so real-pipeline tests for both OCR and
  CV are gated behind `pytest.importorskip` and were **skipped, not
  executed,** in this remediation session.
- Existing tests (`test_prescriptions.py`) monkeypatch `ocr_service.extract_text`
  to return known strings and assert the downstream parsing/failure-contract
  behavior. That is real coverage of the parsing and error-handling logic,
  but zero coverage of PaddleOCR's actual text-recognition accuracy.

## NLP / label parsing (`app/services/prescription_parser.py`, `timing_parser.py`)

- This is rule-based regex parsing, not a trained model — `test_prescription_parser.py`
  and `test_prescriptions.py` exercise it directly with realistic multi-line
  prescription text (synthetic but representative). This is meaningful
  coverage since there is no learned model whose "real-world accuracy" would
  need separate validation.

## LLM guidance (`app/services/claude_service.py`)

- `LLM_API_KEY` is not configured in the test environment, so `generate_pill_guidance`
  is inert (`is_enabled()` returns `False`) in all existing tests — there is
  no test that exercises a real Claude API call. The prompt-contract tests
  (no-database-match → fixed safety message, never LLM speculation) verify
  the code path that decides *whether* to call the LLM at all, not the
  quality of real Claude output.
