import json
from collections import defaultdict
from typing import Dict, List, Optional
from pydantic import BaseModel
from groq import AsyncGroq

from core.config.settings import settings
from core.utils.logger import get_logger
from ingestion.models import CandidateProfile
from conductor.models import SessionState, TurnScore
from evaluation.models import CompetencyScorecardItem, QualitativeAssessment, FinalEvaluationReport

logger = get_logger(__name__)

class EvaluationAggregator:
    def __init__(self):
        self.client = AsyncGroq(api_key=settings.groq_api_key)
        self.model = settings.groq_model  # High-capability model (e.g. llama-3.3-70b-versatile)

    def calculate_scorecard(self, turn_scores: List[TurnScore]) -> Dict[str, CompetencyScorecardItem]:
        """
        Groups turn scores by competency and calculates the average score and grade.
        """
        by_competency = defaultdict(list)
        for ts in turn_scores:
            by_competency[ts.competency].append(ts.composite)

        scorecard = {}
        for competency, scores in by_competency.items():
            avg = round(sum(scores) / len(scores), 2)
            scorecard[competency] = CompetencyScorecardItem(
                average_score=avg,
                grade=self.score_to_grade(avg),
                candidate_turns_count=len(scores)
            )
        return scorecard

    def score_to_grade(self, score: float) -> str:
        if score >= 4.5: return "Exceptional"
        if score >= 3.5: return "Strong"
        if score >= 2.5: return "Adequate"
        if score >= 1.5: return "Weak"
        return "Poor"

    async def generate_qualitative_assessment(
        self,
        profile: CandidateProfile,
        state: SessionState,
        scorecard: Dict[str, CompetencyScorecardItem]
    ) -> QualitativeAssessment:
        """
        Runs the LLM pass to generate the executive summary, assessor notes, and extract key quotes.
        """
        logger.info("Generating qualitative post-interview assessment...")
        
        # Format transcript for prompt
        transcript_str = "\n".join([
            f"{turn.speaker.upper()}: {turn.text}" for turn in state.full_transcript
        ])
        
        # Format mathematical scorecard for prompt
        scorecard_str = "\n".join([
            f"- {comp}: Average={item.average_score} ({item.grade})"
            for comp, item in scorecard.items()
        ])

        schema_json = json.dumps(QualitativeAssessment.model_json_schema(), indent=2)

        prompt = f"""You are an elite executive search partner writing a post-interview assessment report.
Analyze the candidate's responses in the transcript and compile a qualitative evaluation.

=== CANDIDATE & JD ===
Candidate: {profile.candidate.full_name}
Target Role: {profile.jd.role_type}
Mandate: {profile.jd.mandate}

=== PRE-CALCULATED SCORECARD MATH ===
{scorecard_str}

=== FULL TRANSCRIPT ===
{transcript_str}

INSTRUCTIONS:
1. Provide a one-paragraph executive_summary evaluating the candidate against the role requirements.
2. Decide the overall_signal ("strong", "mixed", "weak") and recommended_next_step ("progress", "hold", "reject") based on the scorecard scores and transcript depth.
3. For each competency listed in the scorecard:
   - Provide a 2-3 sentence competency_note explaining the score and their grasp of the topic.
   - Extract the single best key_quote (verbatim candidate sentence from the transcript) illustrating their performance in that competency.

You MUST return the output as a valid JSON object matching this exact format:
{schema_json}
"""
        try:
            response = await self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": "You are a professional executive talent assessor. You only reply in valid JSON."},
                    {"role": "user", "content": prompt}
                ],
                response_format={"type": "json_object"},
                temperature=0.2
            )
            raw_json = response.choices[0].message.content
            return QualitativeAssessment.model_validate_json(raw_json)
        except Exception as e:
            logger.error(f"Failed to generate qualitative assessment: {e}")
            # Fallback output on failure
            return QualitativeAssessment(
                overall_signal="mixed",
                executive_summary=f"Evaluation generated with manual fallback due to assessment error: {str(e)}",
                competency_notes={c: "Score calculated programmatically. Assessor notes unavailable." for c in scorecard.keys()},
                key_quotes={c: "" for c in scorecard.keys()},
                recommended_next_step="hold"
            )

    async def aggregate_report(self, profile: CandidateProfile, state: SessionState) -> FinalEvaluationReport:
        """
        Orchestrates the entire evaluation: calculates scores and merges with qualitative LLM assessment.
        """
        scorecard = self.calculate_scorecard(state.turn_scores)
        qualitative = await self.generate_qualitative_assessment(profile, state, scorecard)
        
        # Format transcript as simple list of dicts for storage
        transcript_list = [{"speaker": t.speaker, "text": t.text} for t in state.full_transcript]
        
        return FinalEvaluationReport(
            session_id=state.session_id,
            candidate_name=profile.candidate.full_name,
            role_type=profile.jd.role_type,
            overall_signal=qualitative.overall_signal,
            executive_summary=qualitative.executive_summary,
            recommended_next_step=qualitative.recommended_next_step,
            scorecard=scorecard,
            competency_notes=qualitative.competency_notes,
            key_quotes=qualitative.key_quotes,
            full_transcript=transcript_list
        )
