"""Distances entre couleurs, pour associer un pixel a la perle la plus proche.

Memes formules que le generateur cote navigateur (static/tama/app.js) :
- weighted  : distance euclidienne RGB ponderee 2/4/3 (sensibilite de l'oeil), au carre ;
- oklab     : distance euclidienne dans l'espace perceptuel OKLab, au carre ;
- ciede2000 : Delta E 2000 dans CIELAB (D65).
Chaque methode a une etape `prepare` (conversion depuis RGB 0-255, faite une fois
par couleur) et une `distance` entre deux couleurs preparees.
"""
from math import atan2, cbrt, cos, degrees, exp, hypot, radians, sin, sqrt


def srgb_to_linear(v):
    v /= 255
    return v / 12.92 if v <= 0.04045 else ((v + 0.055) / 1.055) ** 2.4


def rgb_to_oklab(rgb):
    r, g, b = (srgb_to_linear(v) for v in rgb)
    l = cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b)
    m = cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b)
    s = cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b)
    return (0.2104542553 * l + 0.7936177850 * m - 0.0040720468 * s,
            1.9779984951 * l - 2.4285922050 * m + 0.4505937099 * s,
            0.0259040371 * l + 0.7827717662 * m - 0.8086757660 * s)


def rgb_to_lab(rgb):
    r, g, b = (srgb_to_linear(v) for v in rgb)
    x = (0.4124564 * r + 0.3575761 * g + 0.1804375 * b) / 0.95047
    y = 0.2126729 * r + 0.7151522 * g + 0.0721750 * b
    z = (0.0193339 * r + 0.1191920 * g + 0.9503041 * b) / 1.08883

    def f(t):
        return cbrt(t) if t > 216 / 24389 else (24389 / 27 * t + 16) / 116

    fx, fy, fz = f(x), f(y), f(z)
    return 116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)


def ciede2000(lab1, lab2):
    """Delta E 2000 (Sharma, Wu & Dalal 2005), kL = kC = kH = 1."""
    l1, a1, b1 = lab1
    l2, a2, b2 = lab2
    c_bar = (hypot(a1, b1) + hypot(a2, b2)) / 2
    g = 0.5 * (1 - sqrt(c_bar ** 7 / (c_bar ** 7 + 25 ** 7)))
    a1p, a2p = a1 * (1 + g), a2 * (1 + g)
    c1p, c2p = hypot(a1p, b1), hypot(a2p, b2)
    h1p = degrees(atan2(b1, a1p)) % 360 if c1p else 0
    h2p = degrees(atan2(b2, a2p)) % 360 if c2p else 0

    dlp, dcp = l2 - l1, c2p - c1p
    if c1p * c2p == 0:
        dhp = 0
    elif abs(h2p - h1p) <= 180:
        dhp = h2p - h1p
    elif h2p - h1p > 180:
        dhp = h2p - h1p - 360
    else:
        dhp = h2p - h1p + 360
    dhp_big = 2 * sqrt(c1p * c2p) * sin(radians(dhp / 2))

    lp_bar, cp_bar = (l1 + l2) / 2, (c1p + c2p) / 2
    if c1p * c2p == 0:
        hp_bar = h1p + h2p
    elif abs(h1p - h2p) <= 180:
        hp_bar = (h1p + h2p) / 2
    elif h1p + h2p < 360:
        hp_bar = (h1p + h2p + 360) / 2
    else:
        hp_bar = (h1p + h2p - 360) / 2

    t = (1 - 0.17 * cos(radians(hp_bar - 30)) + 0.24 * cos(radians(2 * hp_bar))
         + 0.32 * cos(radians(3 * hp_bar + 6)) - 0.20 * cos(radians(4 * hp_bar - 63)))
    d_theta = 30 * exp(-(((hp_bar - 275) / 25) ** 2))
    r_c = 2 * sqrt(cp_bar ** 7 / (cp_bar ** 7 + 25 ** 7))
    s_l = 1 + 0.015 * (lp_bar - 50) ** 2 / sqrt(20 + (lp_bar - 50) ** 2)
    s_c = 1 + 0.045 * cp_bar
    s_h = 1 + 0.015 * cp_bar * t
    r_t = -sin(radians(2 * d_theta)) * r_c
    return sqrt((dlp / s_l) ** 2 + (dcp / s_c) ** 2 + (dhp_big / s_h) ** 2
                + r_t * (dcp / s_c) * (dhp_big / s_h))


def weighted(p, q):
    return 2 * (p[0] - q[0]) ** 2 + 4 * (p[1] - q[1]) ** 2 + 3 * (p[2] - q[2]) ** 2


def squared(p, q):
    return (p[0] - q[0]) ** 2 + (p[1] - q[1]) ** 2 + (p[2] - q[2]) ** 2


METRICS = {
    'weighted': (tuple, weighted),
    'oklab': (rgb_to_oklab, squared),
    'ciede2000': (rgb_to_lab, ciede2000),
}
DEFAULT_METRIC = 'weighted'


def nearest_finder(palette, metric=DEFAULT_METRIC):
    """palette : [(code, (r, g, b))]. Retourne une fonction rgb -> code de la couleur la plus proche."""
    prepare, distance = METRICS[metric]
    prepared = [(code, prepare(rgb)) for code, rgb in palette]

    def nearest(rgb):
        p = prepare(rgb)
        return min(prepared, key=lambda item: distance(p, item[1]))[0]
    return nearest
