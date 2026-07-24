"""One-off dev tool: exports SB2's real DIN appearance reference table into a small,
git-committed CSV this app can seed `din_pills` from at startup.

Not part of the running app — run once, whenever the source xlsx is available (e.g.
from a Pillsafe_Muthu handover drop), never referenced by app code afterward.

Usage:
    python scripts/export_din_reference_seed.py <path-to-ca_appearance_harmonized_v2.xlsx>
"""
import csv
import sys
from pathlib import Path

import pandas as pd

OUT_PATH = Path(__file__).resolve().parent.parent / "app" / "data" / "din_reference_seed.csv"
OUT_COLUMNS = ["din", "product", "active_ingredient", "strength", "colour", "shape", "imprint"]


def main(xlsx_path: str) -> None:
    df = pd.read_excel(xlsx_path, sheet_name="harmonized")
    if df["din_raw"].isna().any():
        raise ValueError("din_raw has null values — investigate before exporting")

    out_rows = []
    for _, row in df.iterrows():
        out_rows.append({
            "din": f"{int(row['din_raw']):08d}",
            "product": row["product"],
            "active_ingredient": row["ai"],
            "strength": row["strength"],
            "colour": row["colour_norm_1"] if pd.notna(row["colour_norm_1"]) else "",
            "shape": row["shape_norm"] if pd.notna(row["shape_norm"]) else "",
            "imprint": row["imprint_side1"] if pd.notna(row["imprint_side1"]) else "",
        })

    OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    with open(OUT_PATH, "w", newline="", encoding="utf-8") as fh:
        writer = csv.DictWriter(fh, fieldnames=OUT_COLUMNS)
        writer.writeheader()
        writer.writerows(out_rows)

    print(f"Wrote {len(out_rows)} rows to {OUT_PATH}")


if __name__ == "__main__":
    if len(sys.argv) != 2:
        print(__doc__)
        sys.exit(1)
    main(sys.argv[1])
