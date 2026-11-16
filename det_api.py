"""FastAPI bridge: browser (det_interactive.html) <-> Python solver (det_permutation.py).

Setup:  pip install fastapi uvicorn
Run:    python det_api.py        then open http://127.0.0.1:8000
"""
import json
import math
import re
from fractions import Fraction as F
from pathlib import Path
from typing import List

from fastapi import FastAPI, HTTPException, Response
from fastapi.responses import FileResponse
from pydantic import BaseModel

import det_permutation as dp

EXACT_MAX = 10  # exact fractions up to this size, double precision above it
HERE = Path(__file__).parent
app = FastAPI(title="Determinant by Permutation API")


class Matrix(BaseModel):
    A: List[List[str]]
    unlimited: bool = False


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


def transpose(A):
    return [list(c) for c in zip(*A)]


def exact_payload(A):
    """Exact fractions: permutation sum up to MAX_N, row reduction from there up to EXACT_MAX."""
    n = len(A)
    if n > dp.MAX_N:
        det = dp.determinant(A)
        check = dp.determinant(transpose(A))
        return {"mode": "exact", "method": "reduction", "n": n, "factorial": str(math.factorial(n)),
                "det": str(det), "check": str(check), "ok": det == check}
    det, terms = dp.leibniz(A)
    check = dp.determinant(A)
    rows = [[
        "(" + ", ".join(map(str, t["p"])) + ")", t["inv"], "+1" if t["sign"] > 0 else "-1",
        "".join(f"({v})" for v in t["factors"]), str(t["prod"]), str(t["term"]),
    ] for t in terms]
    return {"mode": "exact", "method": "perm", "n": n, "terms": rows,
            "det": str(det), "check": str(check), "ok": det == check}


def float_payload(A):
    """Double precision above EXACT_MAX: det by row reduction, plus condition number and error measures."""
    n = len(A)
    Af = [[float(v) for v in r] for r in A]
    base = {"mode": "float", "method": "reduction", "n": n, "factorial": str(math.factorial(n))}
    det = dp.det_float(Af)
    inv = dp.float_inverse(Af)
    if det == 0.0 or inv is None:
        return {**base, "singular": True, "det": 0.0}
    det_t = dp.det_float(transpose(Af))
    return {
        **base, "det": det, "check": det_t,
        "err": abs(det - det_t) / max(abs(det), abs(det_t)),
        "e": dp.max_identity_deviation(dp.fmm(Af, inv)),
        "cond": dp.norm_1(Af) * dp.norm_1(inv),
    }


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
    """Validates the matrix, then computes det(A): permutation sum (n <= 7), exact row reduction (n <= 10) or decimals."""
    n = len(m.A)
    limit = dp.ABS_MAX if m.unlimited else dp.MAX_N
    if not 1 <= n <= limit:
        if n > dp.MAX_N and not m.unlimited:
            raise HTTPException(422, f"Matrices above {dp.MAX_N}x{dp.MAX_N} need the 'Remove the size limit' option.")
        raise HTTPException(422, f"The size must be between 1 and {limit}.")
    if any(len(r) != n for r in m.A):
        raise HTTPException(422, "The matrix must be square: n rows and n columns.")

    A = [[num(v, f"Row {i + 1}, column {j + 1}") for j, v in enumerate(r)] for i, r in enumerate(m.A)]
    if n <= EXACT_MAX:
        return exact_payload(A)
    try:
        return Response(content=json.dumps(float_payload(A), allow_nan=False), media_type="application/json")
    except (OverflowError, ValueError):
        raise HTTPException(422, "These numbers are too large or too small to solve in decimal mode.")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)