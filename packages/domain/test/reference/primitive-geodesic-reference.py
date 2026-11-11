"""TEST ONLY. Offline PROJ/GeographicLib WGS84 reference; no runtime dependencies/data.
Run in the pinned GDAL image as documented in docs/validation/safe-01.md.
GeoJSON line edges interpolate longitude/latitude; they are not geodesic segments.
"""
import ctypes as c
import ctypes.util
import json
import math
import random

class Geodesic(c.Structure):
    _fields_ = [(name, c.c_double) for name in ('a', 'f', 'f1', 'e2', 'ep2', 'n', 'b', 'c2', 'etol2')] + [('A3x', c.c_double * 6), ('C3x', c.c_double * 15), ('C4x', c.c_double * 21)]
lib = c.CDLL(ctypes.util.find_library('proj'))
lib.geod_init.argtypes = [c.POINTER(Geodesic), c.c_double, c.c_double]
lib.geod_inverse.argtypes = [c.POINTER(Geodesic)] + [c.c_double] * 4 + [c.POINTER(c.c_double)] * 3
lib.geod_direct.argtypes = [c.POINTER(Geodesic)] + [c.c_double] * 4 + [c.POINTER(c.c_double)] * 3
lib.geod_init.restype = lib.geod_inverse.restype = lib.geod_direct.restype = None
g = Geodesic()
lib.geod_init(c.byref(g), 6378137, 1 / 298.257223563)

def distance(a, b):
    result = c.c_double()
    lib.geod_inverse(c.byref(g), a[1], a[0], b[1], b[0], c.byref(result), None, None)
    return result.value

def direct(a, bearing, metres):
    lat, lon = c.c_double(), c.c_double()
    lib.geod_direct(c.byref(g), a[1], a[0], bearing, metres, c.byref(lat), c.byref(lon), None)
    return [lon.value, lat.value]

def line_distance(origin, a, b):
    def f(t):
        return distance(origin, [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t])
    grid = [f(i / 1024) for i in range(1025)]
    at = min(range(1025), key=grid.__getitem__)
    lo, hi = max(0, at - 1) / 1024, min(1024, at + 1) / 1024
    # Independent deterministic golden-section minimization of ellipsoidal point distances.
    ratio = (math.sqrt(5) - 1) / 2
    x1, x2 = hi - ratio * (hi - lo), lo + ratio * (hi - lo)
    y1, y2 = f(x1), f(x2)
    for _ in range(100):
        if y1 < y2:
            hi, x2, y2 = x2, x1, y1
            x1 = hi - ratio * (hi - lo)
            y1 = f(x1)
        else:
            lo, x1, y1 = x1, x2, y2
            x2 = lo + ratio * (hi - lo)
            y2 = f(x2)
    return min(grid[at], y1, y2)

rng = random.Random(642859)
cases = []
for origin in ([0, 0], [-81.1, 24.7], [18, 59.9], [18, 85], [18, -85]):
    prefix = str(origin[1])
    for d in (1, 52, 500, 10000, 49000):
        for bearing in (45, 90, 135, 180, 225, 270, 315):
            point = direct(origin, bearing, d)
            if abs(point[1]) <= 85:
                cases.append(dict(id=f'{prefix}-point-{d}-{bearing}', origin=origin, geometry=dict(type='Point', coordinates=point), referenceM=distance(origin, point)))
    for index in range(12):
        points = []
        while len(points) < 2:
            point = direct(origin, rng.random() * 360, 50 + rng.random() * 4000)
            if abs(point[1]) <= 85:
                points.append(point)
        cases.append(dict(id=f'{prefix}-line-{index}', origin=origin, geometry=dict(type='LineString', coordinates=points), referenceM=line_distance(origin, *points)))
print(json.dumps(dict(testOnly=True, reference='PROJ 9.6.1 geod_* / GeographicLib C, WGS84', seed=642859, lineMethod='1024-bracket scan plus 100 golden iterations along original lon/lat-linear edge', cases=cases), indent=2))
