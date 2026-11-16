"""FastAPI bridge: browser (det_interactive.html) <-> Python solver (det_permutation.py).

Setup:  pip install fastapi uvicorn
Run:    python det_api.py        then open http://127.0.0.1:8000
"""
import re
from fractions import Fraction as F
from pathlib import Path
from typing import List

from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse
from pydantic import BaseModel

import det_permutation as dp

HERE = Path(__file__).parent
app = FastAPI(title="Determinant by Permutation API")


class Matrix(BaseModel):
    A: List[List[str]]


# Accepts integers, decimals, and fractions with optional signs (e.g., 3/-4)
NUM = re.compile(r"^[+-]?(?:\d+(?:\.\d+)?|\.\d+)(?:/[+-]?(?:\d+(?:\.\d+)?|\.\d+))?$")


def num(s, where):
    """Parses a string cell into an exact Fraction or raises HTTP 422."""
    t = s.strip().replace("−", "-")
    if len(t) > 40 or not NUM.match(t):
        raise HTTPException(422, f"{where} is not a number. Use values like 3, -2, 1.5 or 3/4.")
    top, _, bottom = t.partition("/")
    if bottom and F(bottom) == 0:
        raise HTTPException(422, f"{where} divides by zero.")
    return F(top) / F(bottom) if bottom else F(top)


@app.get("/")
def index():
    return FileResponse(HERE / "det_interactive.html")


@app.get("/style.css")
def serve_css():
    return FileResponse(HERE / "style.css", media_type="text/css")


@app.get("/script.js")
def serve_js():
    return FileResponse(HERE / "script.js", media_type="application/javascript")


@app.post("/api/solve")
def solve(m: Matrix):
    """Validates the matrix, then returns every permutation term, det(A) and the row-reduction check."""
    n = len(m.A)
    if not 1 <= n <= dp.MAX_N:
        raise HTTPException(422, f"The size must be between 1 and {dp.MAX_N}.")
    if any(len(r) != n for r in m.A):
        raise HTTPException(422, "The matrix must be square: n rows and n columns.")

    A = [[num(v, f"Row {i + 1}, column {j + 1}") for j, v in enumerate(r)] for i, r in enumerate(m.A)]
    det, terms = dp.leibniz(A)
    check = dp.determinant(A)
    rows = [[
        "(" + ", ".join(map(str, t["p"])) + ")", t["inv"], "+1" if t["sign"] > 0 else "-1",
        "".join(f"({v})" for v in t["factors"]), str(t["prod"]), str(t["term"]),
    ] for t in terms]
    return {"n": n, "terms": rows, "det": str(det), "check": str(check), "ok": det == check}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)
