from typing import Optional
from conductor.models import SessionState, TurnScore

# Decision Constants
MAX_OFFTOPIC_TURNS = 1
MAX_FOLLOW_UPS_PER_COMPETENCY = 1
MIN_TURNS_BEFORE_CLOSE = 20

def decide_next_action(state: SessionState, last_score: Optional[TurnScore]) -> str:
    """
    Decides the next logical action for the conductor based on the current session state
    and the latest turn evaluation.
    
    Returns one of:
    - "redirect"        -> Candidate is rambling or off-topic. Redirect them.
    - "probe_deeper"     -> Answer was vague/incomplete. Ask a follow-up.
    - "next_competency"  -> Competency is covered or max turns reached. Move to next.
    - "closing"          -> All probes covered and turn limit met. Move to closing.
    - "continue"         -> Keep exploring the current competency.
    """
    # 1. Redirect Guard: Candidate is off-topic
    if last_score and last_score.scores.get("relevance", 5) <= 2:
        if state.offtopic_turns >= MAX_OFFTOPIC_TURNS:
            return "redirect"
    
    # 2. Probe Guard: Answer needs probing
    if last_score and last_score.probe_needed:
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
        
    # Soft limit: 2 turns if the composite score is strong (>= 3.5)
    if len(scores) >= 2 and scores[-1].composite >= 3.5:
        return True
        
    return False

def all_mandatory_covered(state: SessionState) -> bool:
    """
    Checks if all mandatory probes have been covered.
    """
    return len(state.mandatory_probes_remaining) == 0
