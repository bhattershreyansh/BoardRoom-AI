import json
from typing import Dict, Optional
from pydantic import BaseModel
from groq import AsyncGroq
from core.config.settings import settings
from core.utils.logger import get_logger
from conductor.models import TurnScore
from conductor.models import RawScorerOutput


logger = get_logger(__name__)

class CompetencyScorer:
    def __init__(self):
        self.client = AsyncGroq(api_key=settings.groq_api_key)
        # Using a fast model for background scoring to keep it swift and cheap
        self.model = settings.groq_competency_model
        self.probe_threshold = 3.0

    async def score_turn(
        self, 
        turn_id: int, 
        competency: str, 
        question: str, 
        answer: str
    ) -> TurnScore:
        """
        Asynchronously evaluates a single candidate response against the target competency.
        """
        logger.info(f"Scoring turn {turn_id} for competency: {competency}...")
        
        prompt = f"""You are an elite executive assessor. Analyze the candidate's answer to the interviewer's question.
Evaluate the answer against the competency: "{competency}".

You must grade the response on 5 signals from 1 to 5 (1 = Very Poor, 5 = Exceptional):
1. specificity: Did they give real names, numbers, dates, and concrete details? (Or was it generic/vague?)
2. consequence: Did they talk about the impact/consequences of their actions? (Or just what they did?)
3. self_awareness: Did they acknowledge failures, limitations, or lessons learned?
4. relevance: Did they answer the actual question asked?
5. depth: Did they show deep expertise and survive follow-up details? (If this is not a follow-up, grade neutral 3 or higher based on depth of the answer).

You MUST return the output as a valid JSON object matching this exact format:
{{
  "scores": {{
    "specificity": 3,
    "consequence": 3,
    "self_awareness": 3,
    "relevance": 3,
    "depth": 3
  }},
  "rationale": "A brief explanation of the grades assigned."
}}

=== CONTEXT ===
Question Asked: {question}
Candidate Answer: {answer}
"""
        try:
            response = await self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": "You are a precise executive scoring assistant. You only reply in valid JSON."},
                    {"role": "user", "content": prompt}
                ],
                response_format={"type": "json_object"},
                temperature=0.1
            )
            raw_json = response.choices[0].message.content
            raw_output = RawScorerOutput.model_validate_json(raw_json)
            
            # Programmatically calculate composite and probe flag
            scores = raw_output.scores
            # Ensure all keys exist, default to 3 if missing
            required_keys = ["specificity", "consequence", "self_awareness", "relevance", "depth"]
            validated_scores = {k: scores.get(k, 3) for k in required_keys}
            
            composite = round(sum(validated_scores.values()) / len(validated_scores), 2)
            probe_needed = composite < self.probe_threshold
            
            turn_score = TurnScore(
                turn_id=turn_id,
                competency=competency,
                scores=validated_scores,
                composite=composite,
                probe_needed=probe_needed,
                rationale=raw_output.rationale
            )
            
            logger.info(f"Turn {turn_id} scoring complete. Composite: {composite}, Probe Needed: {probe_needed}")
            return turn_score
            
        except Exception as e:
            logger.error(f"Failed to score turn {turn_id}: {e}")
            # Return a default neutral score on failure so the pipeline doesn't crash
            default_scores = {"specificity": 3, "consequence": 3, "self_awareness": 3, "relevance": 3, "depth": 3}
            return TurnScore(
                turn_id=turn_id,
                competency=competency,
                scores=default_scores,
                composite=3.0,
                probe_needed=False,
                rationale=f"Fallback score due to evaluation error: {str(e)}"
            )
