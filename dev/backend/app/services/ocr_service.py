"""PaddleOCR wrapper for prescription label text extraction (Priority 1B).

Gated by OCR_PIPELINE_ENABLED. PaddleOCR/PaddlePaddle are heavy native
dependencies that are not installed in every dev environment — import is
lazy and failures degrade to the demo path instead of crashing the request.
"""
import logging
import threading

logger = logging.getLogger(__name__)

_ocr_engine = None
_engine_lock = threading.Lock()


class OcrUnavailableError(Exception):
    pass


def _get_engine():
    global _ocr_engine
    if _ocr_engine is not None:
        return _ocr_engine
    with _engine_lock:
        if _ocr_engine is None:
            try:
                from paddleocr import PaddleOCR  # noqa: PLC0415
            except ImportError as exc:
                raise OcrUnavailableError(
                    "paddleocr is not installed — run `pip install paddleocr paddlepaddle` "
                    "to enable the real OCR pipeline."
                ) from exc
            _ocr_engine = PaddleOCR(use_angle_cls=True, lang="en", show_log=False)
    return _ocr_engine


def extract_text(image_bytes: bytes) -> str:
    """Run PaddleOCR over raw image bytes and return concatenated text lines."""
    engine = _get_engine()  # raises OcrUnavailableError before touching numpy/PIL

    import io
    import numpy as np
    from PIL import Image

    image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    result = engine.ocr(np.array(image), cls=True)

    lines: list[str] = []
    for page in result or []:
        for detection in page or []:
            text = detection[1][0]
            if text:
                lines.append(text)
    return "\n".join(lines)
