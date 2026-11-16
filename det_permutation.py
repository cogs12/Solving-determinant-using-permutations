"""Determinant using Permutations (Leibniz formula).

det(A) = sum over all permutations p of sgn(p) * a[1][p(1)] * a[2][p(2)] * ... * a[n][p(n)]

Outputs:
  1) Matrix A
  2) Every permutation: inversions, sign, product, signed term
  3) det(A) = sum of the signed terms
  4) Check against the determinant by row reduction
Exact arithmetic (fractions).
"""
import operator
from fractions import Fraction as F
from itertools import permutations

MAX_N = 7      # normal size limit; every permutation is listed up to here (7! = 5040)
ABS_MAX = 30   # ceiling when the user unlocks the size limit


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


# ---------- Decimal (double precision) mode, used above 10x10 ----------
def det_float(A):
    """det(A) by Gaussian elimination with partial pivoting in double precision (0.0 if no usable pivot)."""
    n = len(A)
    M = [r[:] for r in A]
    scale = [max(abs(r[c]) for r in A) for c in range(n)]
    det = 1.0
    for c in range(n):
        p = max(range(c, n), key=lambda r: abs(M[r][c]))
        if abs(M[p][c]) <= 1e-12 * scale[c]:
            return 0.0
        if p != c:
            M[c], M[p] = M[p], M[c]
            det = -det
        det *= M[c][c]
        for r in range(c + 1, n):
            f = M[r][c] / M[c][c]
            M[r] = [a - f * b for a, b in zip(M[r], M[c])]
    return det


def float_inverse(A):
    """Gauss-Jordan with partial pivoting in double precision (None if no usable pivot). Used for the condition number."""
    n = len(A)
    M = [r[:] + [float(i == j) for j in range(n)] for i, r in enumerate(A)]
    scale = [max(abs(r[c]) for r in A) for c in range(n)]
    for c in range(n):
        p = max(range(c, n), key=lambda r: abs(M[r][c]))
        if abs(M[p][c]) <= 1e-12 * scale[c]:
            return None
        M[c], M[p] = M[p], M[c]
        pv = M[c][c]
        M[c] = [v / pv for v in M[c]]
        for r in range(n):
            if r != c and M[r][c]:
                f = M[r][c]
                M[r] = [a - f * b for a, b in zip(M[r], M[c])]
    return [r[n:] for r in M]


def fmm(P, Q):
    """Decimal matrix multiplication."""
    cols = list(zip(*Q))
    return [[sum(map(operator.mul, row, c)) for c in cols] for row in P]


def max_identity_deviation(M):
    """Largest entry-wise absolute difference between M and the identity matrix."""
    return max(abs(v - (i == j)) for i, r in enumerate(M) for j, v in enumerate(r))


def norm_1(M):
    """1-norm (maximum absolute column sum) of a square matrix."""
    n = len(M)
    return max(sum(abs(M[i][j]) for i in range(n)) for j in range(n))