#!/usr/bin/env python3
"""
Generates the three alarm tones.

Run from the project root:

    python3 scripts/make-sounds.py

These are synthesised rather than recorded because the project has no licence
to a sound library. That is a real limitation and the honest way to work
inside it is to synthesise properly rather than to emit bare sine waves:
everything below uses struck-instrument models with inharmonic partials,
per-partial decay, and a soft-clipped output stage, which is what separates a
tone that reads as an instrument from one that reads as a test signal.

Each file is a CLEANLY LOOPING pattern at its steady state. The gentle
fade-in of the "soft" tone is NOT baked in here: it is done at playback time
by ramping the player's volume, so the same file loops for as long as it
needs to without the ramp repeating every cycle.

Mono, 44.1 kHz, 16-bit. Mono halves the size and an alarm has nothing to say
in stereo.
"""

from __future__ import annotations

import math
import struct
import wave
from pathlib import Path

SR = 44_100
OUT = Path(__file__).resolve().parent.parent / "assets" / "sounds"


# ─────────────────────────────────────────────────────────────────────────
# Building blocks
# ─────────────────────────────────────────────────────────────────────────

def silence(seconds: float) -> list[float]:
    return [0.0] * int(SR * seconds)


def mix_into(base: list[float], part: list[float], at: float) -> None:
    """Adds `part` into `base` starting at `at` seconds, clipping at the end."""
    start = int(SR * at)
    for i, sample in enumerate(part):
        j = start + i
        if j >= len(base):
            break
        base[j] += sample


def struck(
    freq: float,
    seconds: float,
    partials: list[tuple[float, float, float]],
    attack: float = 0.004,
    amp: float = 1.0,
) -> list[float]:
    """
    One struck note, by additive synthesis.

    `partials` is a list of (ratio, level, decay_seconds). Real struck
    instruments are inharmonic — a bell's partials are not integer multiples of
    the fundamental, and the high ones die away first. Both of those are what
    the ear uses to decide something was hit rather than generated, so both are
    modelled explicitly rather than approximated with one exponential.
    """
    n = int(SR * seconds)
    out = [0.0] * n
    attack_n = max(1, int(SR * attack))

    for ratio, level, decay in partials:
        w = 2.0 * math.pi * freq * ratio / SR
        # A little detune per partial keeps the tone from sounding synthetic.
        w *= 1.0 + (ratio * 0.00035)
        tau = decay * SR
        for i in range(n):
            env = math.exp(-i / tau)
            if i < attack_n:
                # Raised cosine attack: no click, still fast enough to read as a strike.
                env *= 0.5 - 0.5 * math.cos(math.pi * i / attack_n)
            out[i] += level * env * math.sin(w * i)

    peak = max((abs(s) for s in out), default=0.0)
    if peak > 0:
        scale = amp / peak
        out = [s * scale for s in out]
    return out


def beep(freq: float, seconds: float, amp: float = 1.0, edge: float = 0.35) -> list[float]:
    """
    A hard electronic beep.

    `edge` blends in odd harmonics toward a square wave. A pure sine is easy to
    sleep through; the odd harmonics are what make a beep cut through the noise
    floor of a moving bus.
    """
    n = int(SR * seconds)
    out = [0.0] * n
    w = 2.0 * math.pi * freq / SR
    ramp = max(1, int(SR * 0.006))

    for i in range(n):
        s = math.sin(w * i)
        s += edge * (1.0 / 3.0) * math.sin(3 * w * i)
        s += edge * (1.0 / 5.0) * math.sin(5 * w * i)
        s += edge * 0.5 * (1.0 / 7.0) * math.sin(7 * w * i)

        # Short raised-cosine ramps on both ends so looping never clicks.
        env = 1.0
        if i < ramp:
            env = 0.5 - 0.5 * math.cos(math.pi * i / ramp)
        elif i > n - ramp:
            env = 0.5 - 0.5 * math.cos(math.pi * (n - i) / ramp)
        out[i] = s * env

    peak = max((abs(s) for s in out), default=0.0)
    if peak > 0:
        out = [s * (amp / peak) for s in out]
    return out


def tail(buf: list[float], amount: float = 0.16, delay_ms: float = 62.0) -> list[float]:
    """
    A short feedback delay, standing in for a room.

    Not reverb in any serious sense, but enough that the tone does not sound
    like it was recorded inside a wire. Kept short so it cannot smear into the
    loop point.
    """
    d = int(SR * delay_ms / 1000.0)
    out = list(buf)
    for i in range(d, len(out)):
        out[i] += out[i - d] * amount
    return out


def soft_clip(buf: list[float], drive: float = 1.0) -> list[float]:
    """tanh saturation: raises perceived loudness without the crunch of clipping."""
    return [math.tanh(s * drive) / math.tanh(drive) for s in buf]


def normalise(buf: list[float], peak_target: float = 0.89) -> list[float]:
    peak = max((abs(s) for s in buf), default=0.0)
    if peak == 0:
        return buf
    return [s * (peak_target / peak) for s in buf]


def seal_loop(buf: list[float], ms: float = 8.0) -> list[float]:
    """
    Forces the very start and end to zero.

    A loop whose endpoints do not meet at zero produces an audible tick on every
    repeat, and an alarm repeats a lot. Cheaper and more reliable than trying to
    make every generator land on a zero crossing.
    """
    n = max(1, int(SR * ms / 1000.0))
    out = list(buf)
    for i in range(min(n, len(out))):
        f = i / n
        out[i] *= f
        out[-1 - i] *= f
    return out


def write_wav(name: str, buf: list[float]) -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    path = OUT / name
    frames = b"".join(
        struct.pack("<h", max(-32768, min(32767, int(s * 32767)))) for s in buf
    )
    with wave.open(str(path), "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(frames)
    print(f"  {name:14s} {len(buf) / SR:4.2f}s  {len(frames) / 1024:6.0f} KB")


# ─────────────────────────────────────────────────────────────────────────
# The three tones
# ─────────────────────────────────────────────────────────────────────────

# A marimba-ish bar: strong fundamental, a fourth-ish partial, fast highs.
BAR = [
    (1.00, 1.00, 0.62),
    (3.93, 0.34, 0.17),
    (9.20, 0.12, 0.07),
    (2.00, 0.08, 0.30),
]

# A small struck bell: inharmonic, long fundamental, prominent minor third.
BELL = [
    (0.50, 0.36, 1.90),   # hum
    (1.00, 1.00, 1.55),   # prime
    (1.19, 0.52, 1.05),   # minor third — the reason a bell sounds like a bell
    (1.50, 0.40, 0.80),   # fifth
    (2.00, 0.46, 0.62),   # nominal
    (2.66, 0.22, 0.34),
    (3.40, 0.14, 0.22),
]


def make_soft() -> list[float]:
    """
    רך — two warm bars, a step apart, with room to breathe.

    For someone who wants to be woken without waking the row behind them. The
    volume ramp that makes this usable is applied at playback, not here.
    """
    buf = silence(3.0)
    mix_into(buf, struck(523.25, 1.5, BAR, amp=0.95), 0.00)   # C5
    mix_into(buf, struck(659.25, 1.5, BAR, amp=0.78), 0.42)   # E5
    mix_into(buf, struck(523.25, 1.2, BAR, amp=0.55), 1.28)   # C5, quieter echo
    buf = tail(buf, amount=0.20, delay_ms=95.0)
    return seal_loop(normalise(soft_clip(buf, 1.2), 0.80))


def make_normal() -> list[float]:
    """
    רגיל — a rising three-note bell figure, struck firmly.

    The default. Clearly an alarm, and still something you would not mind
    hearing in a quiet carriage.
    """
    buf = silence(2.6)
    mix_into(buf, struck(587.33, 2.0, BELL, amp=0.92), 0.00)  # D5
    mix_into(buf, struck(783.99, 2.0, BELL, amp=0.96), 0.30)  # G5
    mix_into(buf, struck(1046.50, 1.8, BELL, amp=1.00), 0.60) # C6
    mix_into(buf, struck(783.99, 1.4, BELL, amp=0.62), 1.45)  # G5, answer
    buf = tail(buf, amount=0.17, delay_ms=71.0)
    return seal_loop(normalise(soft_clip(buf, 1.5), 0.90))


def make_sharp() -> list[float]:
    """
    חודרת — the alarm clock.

    Three hard beeps and a gap, with the third a tone higher so the pattern
    never blurs into a continuous noise the ear can filter out. For people who
    genuinely sleep through things.
    """
    buf = silence(1.7)
    mix_into(buf, beep(880.0, 0.16, amp=0.95), 0.00)
    mix_into(buf, beep(880.0, 0.16, amp=0.95), 0.24)
    mix_into(buf, beep(1174.66, 0.22, amp=1.00), 0.48)
    buf = tail(buf, amount=0.10, delay_ms=41.0)
    return seal_loop(normalise(soft_clip(buf, 2.0), 0.94))


if __name__ == "__main__":
    print("writing alarm tones to assets/sounds/")
    write_wav("alarm-soft.wav", make_soft())
    write_wav("alarm-normal.wav", make_normal())
    write_wav("alarm-sharp.wav", make_sharp())
