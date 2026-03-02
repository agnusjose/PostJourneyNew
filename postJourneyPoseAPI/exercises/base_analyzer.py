def analyze_generic(landmarks=None, state=None, exercise_name="Exercise"):
    state = state or {}
    
    if not landmarks:
        return {
            "instruction": "Ensure you are visible to the camera",
            "progress": 0,
            "state": state,
            "completed": False
        }
        
    # Basic feedback for unimplemented exercises
    return {
        "instruction": f"Perform {exercise_name.replace('_', ' ').title()}",
        "progress": 0.5,
        "state": state,
        "completed": False
    }
