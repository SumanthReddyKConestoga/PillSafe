"""OpenCV colour/shape detection + DIN lookup (Priority 6).

Pure math — no custom model training. OpenCV and PaddleOCR are used as
pre-built tools; cv2/paddleocr are optional dependencies and degrade
gracefully (raise CvUnavailableError) when not installed.
"""
import math

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.din_pill import DinPill

_COLOR_BUCKETS: list[tuple[str, tuple[int, int], tuple[int, int]]] = [
    # name, (hue_min, hue_max), (sat_min, val_min)
    ("red", (0, 10), (60, 60)),
    ("orange", (11, 25), (60, 60)),
    ("yellow", (26, 38), (50, 60)),
    ("green", (39, 85), (40, 40)),
    ("blue", (86, 130), (40, 40)),
    ("pink", (300, 345), (20, 60)),
    ("red", (346, 360), (60, 60)),
]


class CvUnavailableError(Exception):
    pass


def _classify_color(hue: float, sat: float, val: float) -> str:
    if sat < 25 and val > 70:
        return "white"
    if sat < 35 and val < 60:
        return "beige"
    for name, (h_min, h_max), (s_min, v_min) in _COLOR_BUCKETS:
        if h_min <= hue <= h_max and sat >= s_min and val >= v_min:
            return name
    return "beige"


def _classify_shape(contour) -> str:
    import cv2  # noqa: PLC0415

    area = cv2.contourArea(contour)
    perimeter = cv2.arcLength(contour, True)
    if perimeter == 0:
        return "round"

    circularity = 4 * math.pi * area / (perimeter**2)
    x, y, w, h = cv2.boundingRect(contour)
    aspect_ratio = max(w, h) / max(min(w, h), 1)

    hull = cv2.convexHull(contour)
    hull_area = cv2.contourArea(hull) or 1
    solidity = area / hull_area

    if aspect_ratio < 1.15 and circularity > 0.85:
        return "round"
    if aspect_ratio < 1.15:
        return "square"
    if solidity < 0.88 and aspect_ratio < 2.2:
        return "capsule"
    if aspect_ratio >= 2.2:
        return "oblong"
    return "oval"


def detect_color_and_shape(image_bytes: bytes) -> tuple[str, str]:
    """Isolate the largest pill-like contour and classify colour + shape."""
    try:
        import cv2  # noqa: PLC0415
        import numpy as np
    except ImportError as exc:
        raise CvUnavailableError(
            "opencv-python-headless is not installed — run "
            "`pip install opencv-python-headless` to enable pill detection."
        ) from exc

    buffer = np.frombuffer(image_bytes, dtype=np.uint8)
    image = cv2.imdecode(buffer, cv2.IMREAD_COLOR)
    if image is None:
        raise ValueError("Could not decode image.")

    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    blurred = cv2.GaussianBlur(gray, (5, 5), 0)
    _, thresh = cv2.threshold(blurred, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)

    contours, _ = cv2.findContours(thresh, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    if not contours:
        raise ValueError("No pill contour detected — retake with a plain background.")

    largest = max(contours, key=cv2.contourArea)
    mask = np.zeros(gray.shape, dtype=np.uint8)
    cv2.drawContours(mask, [largest], -1, 255, thickness=cv2.FILLED)

    hsv = cv2.cvtColor(image, cv2.COLOR_BGR2HSV)
    mean_h, mean_s, mean_v = cv2.mean(hsv, mask=mask)[:3]
    hue_deg = mean_h * 2  # OpenCV hue is 0-180; convert to 0-360
    sat_pct = mean_s / 255 * 100
    val_pct = mean_v / 255 * 100

    color = _classify_color(hue_deg, sat_pct, val_pct)
    shape = _classify_shape(largest)
    return color, shape


async def lookup_din_candidates(
    db: AsyncSession, color: str, shape: str, imprint: str | None
) -> list[DinPill]:
    """Query the din_pills table. Empty until a real Health Canada DPD extract is loaded."""
    stmt = select(DinPill).where(DinPill.colour.ilike(f"%{color}%"), DinPill.shape.ilike(f"%{shape}%"))
    if imprint:
        stmt = stmt.where(DinPill.imprint.ilike(f"%{imprint}%"))
    stmt = stmt.order_by(DinPill.confidence.desc()).limit(5)
    result = await db.execute(stmt)
    return list(result.scalars().all())
