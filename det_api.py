"""FastAPI bridge: browser (det_interactive.html) <-> Python solver (det_permutation.py).

Setup:  pip install fastapi uvicorn
Run:    python det_api.py        then open http://127.0.0.1:8000
"""
import math
import re
import threading
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
    run: str = ""  # id of this calculation, so that /api/stop can cancel it


class Stop(BaseModel):
    run: str


RUNS = {}  # run id -> Event; setting the Event stops that calculation


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
    """Validates the matrix, then lists every Leibniz term for A and for A transposed."""
    n = len(m.A)
    if n < 1:
        raise HTTPException(422, "The matrix needs at least one row.")
    if any(len(r) != n for r in m.A):
        raise HTTPException(422, "The matrix must be square: n rows and n columns.")

    A = [[num(v, f"Row {i + 1}, column {j + 1}") for j, v in enumerate(r)] for i, r in enumerate(m.A)]
    stop = RUNS.setdefault(m.run, threading.Event()) if m.run else None
    try:
        det, rows = dp.leibniz(A, stop)
        det_t, rows_t = dp.leibniz(transpose(A), stop)  # the same formula applied to A transposed
    except dp.Stopped:
        return {"stopped": True}
    finally:
        RUNS.pop(m.run, None)
    count, even = len(rows), sum(1 for r in rows if r[4] == "+1")
    fact = math.factorial(n)
    return {"n": n, "terms": rows, "terms_t": rows_t, "count": str(count), "even": str(even), "factorial": str(fact),
            "det": str(det), "check": str(det_t),
            "counted": count == fact, "balanced": n < 2 or even * 2 == count, "same": det == det_t}


@app.post("/api/stop")
def stop_run(s: Stop):
    """Cancels a running calculation: its loop notices the Event and gives up."""
    RUNS.setdefault(s.run, threading.Event()).set()
    return {"ok": True}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)