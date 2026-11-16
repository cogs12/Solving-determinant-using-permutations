"""Determinant using Permutations (Leibniz formula).

det(A) = sum over all permutations p of sgn(p) * a[1][p(1)] * a[2][p(2)] * ... * a[n][p(n)]

Outputs:
  1) Matrix A
  2) Every permutation: inversions, sign, product, signed term
  3) det(A) = sum of the signed terms
  4) Check against the determinant by row reduction
Exact arithmetic (fractions).
"""
from fractions import Fraction as F
from itertools import permutations

MAX_N = 7  # n! terms: 7! = 5040


def inversions(p):
    """Counts pairs that are out of order in permutation p."""
    return sum(1 for i in range(len(p)) for j in range(i + 1, len(p)) if p[i] > p[j])


def leibniz(A):
    """Returns (det, terms). Each term holds p, inversions, sign, factors, product and signed term."""
    n = len(A)
    total = F(0)
    terms = []
    for p in permutations(range(n)):
        inv = inversions(p)
        sign = -1 if inv % 2 else 1
        factors = [A[i][p[i]] for i in range(n)]
        prod = F(1)
        for v in factors:
            prod *= v
        total += sign * prod
        terms.append({"p": [k + 1 for k in p], "inv": inv, "sign": sign,
                      "factors": factors, "prod": prod, "term": sign * prod})
    return total, terms


def determinant(A):
    """Computes det(A) via Gaussian elimination (used as the cross-check)."""
    M = [row[:] for row in A]
    n = len(A)
    det = F(1)
    for col in range(n):
        pivot_row = next((r for r in range(col, n) if M[r][col] != 0), None)
        if pivot_row is None:
            return F(0)
        if pivot_row != col:
            M[col], M[pivot_row] = M[pivot_row], M[col]
            det = -det
        det *= M[col][col]
        for row in range(col + 1, n):
            factor = M[row][col] / M[col][col]
            M[row] = [a - factor * b for a, b in zip(M[row], M[col])]
    return det
