import time
import math

# ---------- Constants ----------
REPS_PER_SIDE = 5
TOTAL_REPS = REPS_PER_SIDE * 2
HOLD_DURATION = 5.0
REST_DURATION = 3.0
RAISE_DURATION = 2.0       # time to raise leg (guided mode)
LOWER_DURATION = 2.0       # time to lower leg (guided mode)

# MediaPipe landmarks
_L_HIP = 23
_R_HIP = 24
_L_KNEE = 25
_R_KNEE = 26
_L_ANKLE = 27
_R_ANKLE = 28
_L_SHOULDER = 11
_R_SHOULDER = 12

MIN_VIS_BODY = 0.15       # require hips clearly visible — face alone won't pass


# ---------- Helpers ----------
def hips_visible(landmarks):
    """Require at least one HIP visible — face/shoulders alone won't pass."""
    if not landmarks or len(landmarks) < 25:
        return False
    return (landmarks[_L_HIP]["visibility"] > MIN_VIS_BODY or
            landmarks[_R_HIP]["visibility"] > MIN_VIS_BODY)


def legs_detectable(landmarks):
    """Check if any full leg (hip+knee+ankle) is reliably visible."""
    if not landmarks or len(landmarks) < 29:
        return False
    # MIRROR: Left landmarks = User's Right leg
    left_vis = all(landmarks[i]["visibility"] > 0.10 for i in [_L_HIP, _L_KNEE, _L_ANKLE])
    right_vis = all(landmarks[i]["visibility"] > 0.10 for i in [_R_HIP, _R_KNEE, _R_ANKLE])
    return left_vis or right_vis


def calc_angle(a, b, c):
    ba = (a["x"] - b["x"], a["y"] - b["y"])
    bc = (c["x"] - b["x"], c["y"] - b["y"])
    dot = ba[0] * bc[0] + ba[1] * bc[1]
    m1 = math.sqrt(ba[0]**2 + ba[1]**2)
    m2 = math.sqrt(bc[0]**2 + bc[1]**2)
    if m1 * m2 < 1e-6:
        return 0
    return math.degrees(math.acos(max(-1, min(1, dot / (m1 * m2)))))


def leg_raise_angle(hip, ankle):
    dx = abs(ankle["x"] - hip["x"])
    dy = hip["y"] - ankle["y"]
    if dx < 1e-6:
        return 90 if dy > 0 else 0
    return math.degrees(math.atan2(dy, dx))


# ---------- Main Analyzer ----------
def analyze_straight_leg_raise(landmarks, state=None):
    """
    Straight Leg Raise — 5 reps right, 5 reps left.
    HYBRID: uses leg detection when possible, falls back to guided timed mode.
    Requires HIPS visible (face alone doesn't count).
    """
    now = time.time()
    state = state or {}

    state.setdefault("phase", "SETUP")
    state.setdefault("reps", 0)
    state.setdefault("side_reps", 0)
    state.setdefault("current_side", "right")
    state.setdefault("rep_phase", None)   # RAISE, HOLD, LOWER, REST
    state.setdefault("phase_start", None)
    state.setdefault("body_confirmed", 0)
    state.setdefault("switch_start", None)

    cur = state["current_side"]
    wrong = "left" if cur == "right" else "right"

    def result(instruction, progress=None):
        if progress is None:
            progress = state["reps"] / TOTAL_REPS
        return {
            "instruction": instruction,
            "progress": min(progress, 1.0),
            "state": state,
            "completed": state["reps"] >= TOTAL_REPS,
            "reps": state["reps"],
        }

    if state.get("phase") == "COMPLETED":
        return result("Exercise complete!", 1.0)

    # REQUIRE HIPS — face alone is NOT enough
    detected = hips_visible(landmarks)

    if not detected:
        state["body_confirmed"] = 0  # reset setup
        if state["phase"] in ("EXERCISING", "SWITCH_SIDES"):
            return result("I can't see your body — make sure camera sees your hips")
        return result("Lie down and position camera so it can see your hips and legs", 0)

    phase = state["phase"]

    # === SETUP — confirm hips visible ===
    if phase == "SETUP":
        state["body_confirmed"] += 1
        if state["body_confirmed"] >= 10:
            state["phase"] = "EXERCISING"
            state["rep_phase"] = "RAISE"
            state["phase_start"] = now
            return result("Good! Starting with RIGHT leg — raise it slowly")
        return result("Lie on your back, bend one knee for support")

    # === SWITCH SIDES ===
    if phase == "SWITCH_SIDES":
        elapsed = now - (state["switch_start"] or now)
        if elapsed >= 5.0:
            state["phase"] = "EXERCISING"
            state["rep_phase"] = "RAISE"
            state["phase_start"] = now
            return result(f"Now raise your LEFT leg slowly")
        remaining = int(5.0 - elapsed) + 1
        return result(f"Switch — bend right knee, extend left — {remaining}s")

    # === EXERCISING — guided timed with optional detection ===
    if phase == "EXERCISING":
        rp = state["rep_phase"]
        elapsed = now - (state["phase_start"] or now)

        # Check if we can actually see legs for smart detection
        has_legs = legs_detectable(landmarks)

        # --- RAISE phase ---
        if rp == "RAISE":
            # If we can detect legs, check for wrong leg
            if has_legs:
                both = {}
                # MIRROR: MediaPipe Left = User's Right
                if all(landmarks[i]["visibility"] > 0.10 for i in [_L_HIP, _L_KNEE, _L_ANKLE]):
                    both["right"] = leg_raise_angle(landmarks[_L_HIP], landmarks[_L_ANKLE])
                if all(landmarks[i]["visibility"] > 0.10 for i in [_R_HIP, _R_KNEE, _R_ANKLE]):
                    both["left"] = leg_raise_angle(landmarks[_R_HIP], landmarks[_R_ANKLE])

                cur_a = both.get(cur, 0)
                wrong_a = both.get(wrong, 0)

                if wrong_a > 15:
                    return result(f"That's your {wrong} leg — raise your {cur} leg instead")

                if cur_a > 15:
                    state["rep_phase"] = "HOLD"
                    state["phase_start"] = now
                    return result("Good lift! Hold it there")

            # Timed fallback — after enough time, assume raised
            if elapsed >= RAISE_DURATION:
                state["rep_phase"] = "HOLD"
                state["phase_start"] = now
                return result("Hold your leg up steady")

            return result(f"Raise your {cur} leg up slowly (Rep {state['reps']+1}/{TOTAL_REPS})")

        # --- HOLD phase ---
        if rp == "HOLD":
            if elapsed >= HOLD_DURATION:
                state["rep_phase"] = "LOWER"
                state["phase_start"] = now
                return result("Good hold! Now slowly lower your leg")
            remaining = int(HOLD_DURATION - elapsed) + 1
            return result(f"Hold steady ({remaining}s)")

        # --- LOWER phase ---
        if rp == "LOWER":
            if elapsed >= LOWER_DURATION:
                state["reps"] += 1
                state["side_reps"] += 1

                if state["reps"] >= TOTAL_REPS:
                    state["phase"] = "COMPLETED"
                    return result("Exercise complete!", 1.0)

                if state["side_reps"] >= REPS_PER_SIDE and cur == "right":
                    state["current_side"] = "left"
                    state["side_reps"] = 0
                    state["phase"] = "SWITCH_SIDES"
                    state["switch_start"] = now
                    return result("Right leg done! Switch to LEFT leg")

                state["rep_phase"] = "REST"
                state["phase_start"] = now
                return result(f"Rep {state['reps']}/{TOTAL_REPS} done — rest")
            return result("Lower slowly and controlled")

        # --- REST phase ---
        if rp == "REST":
            if elapsed >= REST_DURATION:
                state["rep_phase"] = "RAISE"
                state["phase_start"] = now
                return result(f"Raise your {cur} leg (Rep {state['reps']+1}/{TOTAL_REPS})")
            remaining = int(REST_DURATION - elapsed) + 1
            return result(f"Rest — next rep in {remaining}s")

    if phase == "COMPLETED":
        return result("Exercise complete!", 1.0)

    return result("Position yourself in front of the camera")