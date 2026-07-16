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
        Runs the LLM pass to generate the executive summary, assessor notes, strengths/risks with evidence,
        behavioral indicators, and next interview guidelines.
        """
        logger.info("Generating qualitative recruiter-grade post-interview assessment...")
        
        # Format transcript for prompt
        transcript_str = "\n".join([
            f"{turn.speaker.upper()}: {turn.text}" for turn in state.full_transcript
        ])
        
        # Format mathematical scorecard for prompt
        scorecard_str = "\n".join([
            f"- {comp}: Average={item.average_score} ({item.grade})"
            for comp, item in scorecard.items()
        ])

        # Format individual turn scores with confidence and rehearsed flags
        turn_details = []
        for ts in state.turn_scores:
            turn_details.append(
                f"- Turn {ts.turn_id} ({ts.competency}): Composite={ts.composite}, Confidence={ts.confidence}, Rehearsed={ts.is_rehearsed}"
            )
        turn_details_str = "\n".join(turn_details)

        schema_json = json.dumps(QualitativeAssessment.model_json_schema(), indent=2)

        prompt = f"""You are an elite executive search partner writing a premium candidate evaluation report for the Board and CEO.
Analyze the candidate's responses in the transcript and compile a rigorous, highly credible recruiter-grade qualitative evaluation.

=== CANDIDATE & JD ===
Candidate: {profile.candidate.full_name}
Target Role: {profile.jd.role_type}
Mandate: {profile.jd.mandate}

=== PRE-CALCULATED SCORECARD MATH ===
{scorecard_str}

=== INDIVIDUAL TURN EVALUATIONS (Real-time scorer flags) ===
{turn_details_str}

=== FULL TRANSCRIPT ===
{transcript_str}

CRITICAL RULES FOR RECRUITER WRITING STYLE:
1. **Recruiter Vocabulary**: Banish simple or negative words like "poor", "weak", "bad", "terrible", and "low confidence". Replace them with objective, soft, and sophisticated recruiter prose:
   - Instead of "poor brand positioning", write: "Limited evidence demonstrated in brand strategy during the session."
   - Instead of "weak product marketing", write: "Insufficient depth shown in product marketing frameworks."
   - Instead of "bad answers", write: "Needs stronger examples to support assertions."
   - Instead of "low confidence", write: "Partially demonstrated confidence under pressure."
2. **Evidence & Quotes**: Every single strength and risk item MUST include a verbatim quote snippet from the candidate in the `evidence` field.
   - Example Strength Evidence: "We increased marketing-sourced pipeline by 170%."
   - Example Risk Evidence: "Candidate focused on ABM execution instead of messaging framework."
3. **Transparent Score Breakdown**: For each competency in the scorecard, assess the candidate's performance across four criteria inside the `scorecard_details` mapping:
   - `strategic_framework`: "Exceptional" | "Strong" | "Moderate" | "Weak" | "Poor"
   - `real_example`: "Exceptional" | "Strong" | "Moderate" | "Weak" | "Poor"
   - `metrics`: "Exceptional" | "Strong" | "Moderate" | "Weak" | "Poor"
   - `confidence`: "High" | "Medium" | "Low"
4. **Behavioral Indicators**: Grade the candidate's general C-suite soft traits (from 1 to 5 stars) based on their transcript performance:
   - `communication` (Articulate, clear, well-paced)
   - `executive_presence` (Authority, executive tone, mature)
   - `confidence_under_pressure` (Handling prompt push-backs)
   - `strategic_thinking` (Trade-offs, high-level business vision)
   - `ownership` (Taking responsibility for failures/outcomes)
   - `decision_making` (Clear prioritization models)
   - `influencing` (Stakeholder alignment strategy)

INSTRUCTIONS:
1. Provide a one-paragraph executive_summary summarizing if the candidate fits the mandate and company stage.
2. Provide 3-4 structured key_strengths (detailed explanations with verbatim quote evidence).
3. Provide 2-3 structured key_risks (must include a severity rating "high" | "medium" | "low", detailed reason, and verbatim quote/observational evidence).
4. Provide a general list of 3-4 interviewer_observations (e.g. "Candidate consistently answered with metrics. Needed probing before discussing tradeoffs.").
5. Provide a hiring_confidence_score (int between 0 and 100) and hiring_confidence_reasoning explaining the score.
6. Provide a detailed_recommendation (conditional hiring action, e.g. "Hold - Advance only if the next interview validates...") and a list of 3-4 recommended_topics to probe next.

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
            from evaluation.models import BehavioralIndicators
            return QualitativeAssessment(
                overall_signal="mixed",
                executive_summary=f"Evaluation generated with manual fallback due to assessment error: {str(e)}",
                competency_notes={c: "Score calculated programmatically. Assessor notes unavailable." for c in scorecard.keys()},
                key_strengths=[],
                key_risks=[],
                recommended_next_step="hold",
                hiring_confidence_score=50,
                hiring_confidence_reasoning="Manual fallback due to assessment error.",
                detailed_recommendation="Hold - Re-evaluate after system stability is verified.",
                recommended_topics=["System diagnostics", "Verification of interview logs"],
                interviewer_observations=["Manual fallback assessment triggered."],
                behavioral_indicators=BehavioralIndicators(
                    communication=3,
                    executive_presence=3,
                    confidence_under_pressure=3,
                    strategic_thinking=3,
                    ownership=3,
                    decision_making=3,
                    influencing=3
                ),
                scorecard_details={c: {
                    "strategic_framework": "Moderate",
                    "real_example": "Moderate",
                    "metrics": "Moderate",
                    "confidence": "Medium"
                } for c in scorecard.keys()}
            )

    async def aggregate_report(self, profile: CandidateProfile, state: SessionState) -> FinalEvaluationReport:
        """
        Orchestrates the entire evaluation: calculates scores and merges with qualitative LLM assessment.
        """
        scorecard = self.calculate_scorecard(state.turn_scores)
        qualitative = await self.generate_qualitative_assessment(profile, state, scorecard)
        
        # Enrich scorecard with qualitative sub-component details
        enriched_scorecard = {}
        for comp, item in scorecard.items():
            details = qualitative.scorecard_details.get(comp, {})
            enriched_scorecard[comp] = CompetencyScorecardItem(
                average_score=item.average_score,
                grade=item.grade,
                candidate_turns_count=item.candidate_turns_count,
                strategic_framework=details.get("strategic_framework", "Moderate"),
                real_example=details.get("real_example", "Moderate"),
                metrics=details.get("metrics", "Moderate"),
                confidence=details.get("confidence", "Medium")
            )
        
        # Format transcript as simple list of dicts for storage
        transcript_list = [{"speaker": t.speaker, "text": t.text} for t in state.full_transcript]
        
        return FinalEvaluationReport(
            session_id=state.session_id,
            candidate_name=profile.candidate.full_name,
            role_type=profile.jd.role_type,
            overall_signal=qualitative.overall_signal,
            executive_summary=qualitative.executive_summary,
            recommended_next_step=qualitative.recommended_next_step,
            scorecard=enriched_scorecard,
            competency_notes=qualitative.competency_notes,
            key_strengths=qualitative.key_strengths,
            key_risks=qualitative.key_risks,
            behavioral_indicators=qualitative.behavioral_indicators,
            hiring_confidence_score=qualitative.hiring_confidence_score,
            hiring_confidence_reasoning=qualitative.hiring_confidence_reasoning,
            detailed_recommendation=qualitative.detailed_recommendation,
            recommended_topics=qualitative.recommended_topics,
            interviewer_observations=qualitative.interviewer_observations,
            full_transcript=transcript_list
        )
