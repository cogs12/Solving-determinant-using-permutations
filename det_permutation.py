"""Determinant using Permutations (Leibniz formula).

det(A) = sum over all permutations p of sgn(p) * a[1][p(1)] * a[2][p(2)] * ... * a[n][p(n)]

Outputs (full working, every permutation, no shortcuts):
  1) Matrix A
  2) Every permutation: inversions, sign, entries, product, signed term, running sum
  3) det(A) = the final running sum
  4) Check with the same formula applied to A^T: n! terms, even = odd, det(A^T) = det(A)
Exact arithmetic (fractions).
"""
from fractions import Fraction as F
from itertools import permutations


class Stopped(Exception):
    """Raised when the user presses Stop."""


def leibniz(A, stop=None):
    """Returns (det, rows). Each row is the full working for one permutation, as display strings:
    [#, sigma, inversion pairs, inversion count, sign, entries and values, product, signed term, running sum].
    If stop (a threading.Event) is set, the calculation is abandoned by raising Stopped."""
    n = len(A)
    total = F(0)
    rows = []
    for k, p in enumerate(permutations(range(n)), 1):
        if stop is not None and stop.is_set():
            raise Stopped
        pairs = [(p[i] + 1, p[j] + 1) for i in range(n) for j in range(i + 1, n) if p[i] > p[j]]
        sign = -1 if len(pairs) % 2 else 1
        factors = [A[i][p[i]] for i in range(n)]
        prod = F(1)
        for v in factors:
            prod *= v
        term = sign * prod
        total += term
        rows.append([
            k, "(" + ", ".join(str(c + 1) for c in p) + ")",
            " ".join(f"({a},{b})" for a, b in pairs) or "none", len(pairs), "+1" if sign > 0 else "-1",
            " · ".join(f"a{i + 1},{p[i] + 1}" for i in range(n)) + " = " + "".join(f"({v})" for v in factors),
            str(prod), str(term), str(total),
        ])
    return total, rows