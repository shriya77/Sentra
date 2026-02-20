"""Voice strain: openSMILE eGeMAPS baseline drift. No diagnosis, just acoustic strain/arousal drift."""
from __future__ import annotations

import os
from typing import Any, Optional

import numpy as np

# Optional: openSMILE and pandas for eGeMAPS extraction
_opensmile_available = False
_pandas_available = False
try:
    import opensmile
    import pandas as pd
    _opensmile_available = True
    _pandas_available = True
except ImportError:
    pass

# Stable subset of eGeMAPS functionals that map to strain (energy, pitch, jitter, spectral)
VOICE_KEYS = [
    "loudness_sma3_amean",
    "loudness_sma3_stddevNorm",
    "F0semitoneFrom27.5Hz_sma3nz_amean",
    "F0semitoneFrom27.5Hz_sma3nz_stddevNorm",
    "jitterLocal_sma3nz_amean",
    "shimmerLocaldB_sma3nz_amean",
    "HNRdBACF_sma3nz_amean",
    "spectralFlux_sma3_amean",
]

# Human labels for drivers (top z-score features)
VOICE_DRIVER_LABELS = {
    "loudness_sma3_amean": "energy",
    "loudness_sma3_stddevNorm": "loudness variability",
    "F0semitoneFrom27.5Hz_sma3nz_amean": "pitch",
    "F0semitoneFrom27.5Hz_sma3nz_stddevNorm": "pitch variability",
    "jitterLocal_sma3nz_amean": "jitter",
    "shimmerLocaldB_sma3nz_amean": "shimmer",
    "HNRdBACF_sma3nz_amean": "spectral balance",
    "spectralFlux_sma3_amean": "spectral harshness",
}

EPS = 1e-6
BASELINE_N = 7


def get_audio_duration_sec(audio_path: str) -> float:
    """Get duration in seconds using soundfile."""
    try:
        import soundfile as sf
        info = sf.info(audio_path)
        return float(info.duration)
    except Exception:
        return 0.0


def extract_egemaps(audio_path: str) -> dict[str, float]:
    """Extract eGeMAPS functionals (one row per file). Returns dict of feature name -> float."""
    if not _opensmile_available or not _pandas_available:
        return {}
    try:
        smile = opensmile.Smile(
            feature_set=opensmile.FeatureSet.eGeMAPSv02,
            feature_level=opensmile.FeatureLevel.Functionals,
        )
        df: pd.DataFrame = smile.process_file(audio_path)
        if df is None or df.empty:
            return {}
        row = df.iloc[0]
        raw = {k: float(v) for k, v in row.items() if isinstance(v, (int, float, np.floating))}
        # Keep only whitelisted keys that exist
        return {k: raw[k] for k in VOICE_KEYS if k in raw}
    except Exception:
        return {}


def compute_voice_drift(
    current: dict[str, float],
    baseline_mean: dict[str, float],
    baseline_std: dict[str, float],
    keys: list[str],
) -> dict[str, Any]:
    """Z-score drift vs baseline. Returns drift_score and z_scores. Uses top-K mean of abs z."""
    z_scores: dict[str, float] = {}
    for k in keys:
        if k not in current or k not in baseline_mean or k not in baseline_std:
            continue
        mu = baseline_mean[k]
        sd = max(baseline_std[k], EPS)
        z = (current[k] - mu) / sd
        z_scores[k] = float(z)

    if not z_scores:
        return {"drift_score": 0.0, "z_scores": {}, "drivers": []}

    abs_z = np.array([abs(v) for v in z_scores.values()], dtype=float)
    K = min(4, len(abs_z))
    topk = np.sort(abs_z)[-K:]
    drift = float(np.mean(topk))

    # Top drivers for display (by abs z)
    driver_list = [
        {"key": k, "label": VOICE_DRIVER_LABELS.get(k, k), "direction": "up" if z_scores[k] > 0 else "down"}
        for k in sorted(z_scores.keys(), key=lambda x: -abs(z_scores[x]))[:3]
    ]

    return {"drift_score": drift, "z_scores": z_scores, "drivers": driver_list}


def drift_to_level(drift: float) -> tuple[int, str]:
    """Map drift (avg abs z) to 0-100 score and low/medium/high."""
    score = int(max(0, min(100, (drift / 2.0) * 100)))
    if drift < 0.6:
        level = "low"
    elif drift < 1.2:
        level = "medium"
    else:
        level = "high"
    return score, level


def confidence_level(baseline_n: int, duration_s: float, used_feature_count: int) -> str:
    """Confidence from baseline size, audio length, and feature availability."""
    if baseline_n < 3 or duration_s < 6 or used_feature_count < 4:
        return "low"
    if baseline_n < 7 or duration_s < 10:
        return "medium"
    return "high"


def baseline_from_sessions(sessions: list[dict[str, Any]], keys: list[str]) -> tuple[dict[str, float], dict[str, float]]:
    """Compute mean and std per key from a list of voice_features dicts."""
    mean: dict[str, float] = {}
    std: dict[str, float] = {}
    for k in keys:
        vals = []
        for s in sessions:
            feats = s.get("voice_features") if isinstance(s.get("voice_features"), dict) else None
            if feats and k in feats and feats[k] is not None:
                try:
                    vals.append(float(feats[k]))
                except (TypeError, ValueError):
                    pass
        if len(vals) < 2:
            continue
        arr = np.array(vals, dtype=float)
        mean[k] = float(np.mean(arr))
        std[k] = float(np.std(arr)) + EPS
    return mean, std
