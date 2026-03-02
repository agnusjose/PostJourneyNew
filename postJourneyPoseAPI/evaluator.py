def evaluate_exercise(angle, rules):
    if angle < rules["neutral"][1]:
        return "neutral"
    elif angle <= rules["correct"][1]:
        return "correct"
    return "over"
