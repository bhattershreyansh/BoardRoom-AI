import re
from typing import Optional
from conductor.models import SessionState, TurnScore

# Decision Constants
MAX_OFFTOPIC_TURNS = 1
MAX_FOLLOW_UPS_PER_COMPETENCY = 2
MIN_TURNS_BEFORE_CLOSE = 17

def contains_metrics(text: str) -> bool:
    """
    Scans the response for numeric milestones, percentages, scale, or metrics that require verification.
    """
    text_lower = text.lower()
    if "%" in text or "$" in text:
        return True
    # Look for expressions like 35M, 10k, 130 people, 170 percent, 28x, or multi-digit numbers
    if re.search(r'\b\d+(?:[.,]\d+)?\s*(?:m|k|million|billion|percent|x|people|reports|vps|years)?\b', text_lower):
        # Filter out tiny single digits like "one" or "1" to avoid over-triggering
        digits = re.findall(r'\b\d+\b', text_lower)
        if any(int(d) > 1 for d in digits):
            return True
        if any(w in text_lower for w in ["million", "billion", "percent", "pipeline", "revenue", "spend", "budget"]):
            return True
    return False

def decide_next_action(state: SessionState, last_score: Optional[TurnScore]) -> str:
    """
    Decides the next logical action for the conductor based on the current session state
    and the latest turn evaluation.
    
    Returns one of:
    - "redirect"        -> Candidate is rambling or off-topic. Redirect them.
    - "probe_deeper"     -> Answer was vague/incomplete or needs metrics challenged.
    - "next_competency"  -> Competency is covered or max turns reached. Move to next.
    - "closing"          -> All probes covered and turn limit met. Move to closing.
    - "continue"         -> Keep exploring the current competency.
    """
    # Find last candidate message text
    candidate_msgs = [t for t in state.full_transcript if t.speaker == "candidate"]
    last_msg_text = candidate_msgs[-1].text if candidate_msgs else ""

    # 1. Redirect Guard: Candidate is off-topic
    if last_score and last_score.scores.get("relevance", 5) <= 2:
        if state.offtopic_turns >= MAX_OFFTOPIC_TURNS:
            return "redirect"
    
    # 2. Probe Guard: Answer needs probing or contains metrics to challenge
    if last_score:
        has_metrics = contains_metrics(last_msg_text)
        if last_score.probe_needed or has_metrics:
            # If this is a mandatory probe, we always follow up
            if state.current_competency in state.mandatory_probes_remaining:
                return "probe_deeper"
                
            # Otherwise, check if we haven't hit the follow-up limit
            if state.follow_ups_this_turn < MAX_FOLLOW_UPS_PER_COMPETENCY:
                return "probe_deeper"
            
    # 3. Competency Coverage Guard
    if competency_has_sufficient_coverage(state):
        return "next_competency"
        
    # 4. Closing Guard
    if all_mandatory_covered(state) and len(state.full_transcript) >= MIN_TURNS_BEFORE_CLOSE:
        return "closing"
        
    return "continue"

def competency_has_sufficient_coverage(state: SessionState) -> bool:
    """
    Determines if the current competency has been explored sufficiently.
    """
    # Count candidate turns scored for the current competency
    scores = [s for s in state.turn_scores if s.competency == state.current_competency]
    if not scores:
        return False
        
    # Hard limit: maximum 3 turns per competency
    if len(scores) >= 3:
        return True
        
    # Soft limit: 2 turns if the composite score is strong (>= 3.5) and no probe is needed
    if len(scores) >= 2 and scores[-1].composite >= 3.5 and not scores[-1].probe_needed:
        return True
        
    return False

def all_mandatory_covered(state: SessionState) -> bool:
    """
    Checks if all mandatory probes have been covered.
    """
    return len(state.mandatory_probes_remaining) == 0
