"""Exercises the real OpenCV pipeline in app.services.pill_detection.

opencv-python-headless is an optional dependency (see requirements-optional.txt)
and is NOT installed in every dev environment, so these tests are skipped
(not failed) when cv2 is unavailable via `pytest.importorskip`.

IMPORTANT — see KNOWN_LIMITATIONS.md: this repo has no physically-acquired
real pill photographs checked in. The images below are programmatically
generated synthetic shapes (drawn circles/ellipses), which exercise the real
contour/HSV math end-to-end, but they are NOT a substitute for validating
identification accuracy against real product photos.
"""
import io

import pytest

cv2 = pytest.importorskip("cv2")
from PIL import Image, ImageDraw  # noqa: E402

from app.services import pill_detection  # noqa: E402

_KNOWN_COLORS = {"red", "orange", "yellow", "green", "blue", "pink", "white", "beige"}
_KNOWN_SHAPES = {"round", "square", "capsule", "oblong", "oval"}


def _synthetic_pill_jpeg(size: tuple[int, int], fill: tuple[int, int, int], shape: str) -> bytes:
    image = Image.new("RGB", (300, 300), (255, 255, 255))
    draw = ImageDraw.Draw(image)
    w, h = size
    x0, y0 = (300 - w) // 2, (300 - h) // 2
    box = (x0, y0, x0 + w, y0 + h)
    if shape == "ellipse":
        draw.ellipse(box, fill=fill)
    else:
        draw.rectangle(box, fill=fill)
    buf = io.BytesIO()
    image.save(buf, format="JPEG")
    return buf.getvalue()


def test_detect_color_and_shape_runs_end_to_end_on_a_round_synthetic_pill():
    image_bytes = _synthetic_pill_jpeg((160, 160), (200, 30, 30), "ellipse")
    color, shape = pill_detection.detect_color_and_shape(image_bytes)
    assert color in _KNOWN_COLORS
    assert shape in _KNOWN_SHAPES
    # TODO: add a ground-truth accuracy assertion (color == "red", shape ==
    # "round") once real, labeled product photos are available — see
    # KNOWN_LIMITATIONS.md. Not asserted here because a synthetic drawn
    # circle is not proof the real HSV bucket thresholds are correct.


def test_detect_color_and_shape_runs_end_to_end_on_an_oblong_synthetic_pill():
    image_bytes = _synthetic_pill_jpeg((240, 80), (230, 200, 40), "ellipse")
    color, shape = pill_detection.detect_color_and_shape(image_bytes)
    assert color in _KNOWN_COLORS
    assert shape in _KNOWN_SHAPES
    # TODO: add a ground-truth accuracy assertion once real, labeled product
    # photos are available — see KNOWN_LIMITATIONS.md.


def test_detect_color_and_shape_raises_on_undecodable_bytes():
    with pytest.raises(ValueError):
        pill_detection.detect_color_and_shape(b"not-an-image")
