import json
from groq import AsyncGroq
from core.config.settings import settings
from core.utils.logger import get_logger
from ingestion.models import ResumeSnapshot, JDConfig, CandidateProfile, GeneratedProfileData

logger = get_logger(__name__)

class ProfileExtractor:
    
    def __init__(self):
        self.client = AsyncGroq(api_key=settings.groq_api_key)
        self.model = settings.groq_model
        
    async def analyze_jd(self, jd_text: str) -> JDConfig:
        logger.info("Analyzing Job Description with Groq...")
        
        schema_json = json.dumps(JDConfig.model_json_schema(), indent=2)
        
        prompt = f"""You are an expert HR Executive and Hiring Manager.
Analyze the following Job Description and extract structured interview configuration.

Rules for competency_weights:
- Assign 0.0–1.0 based on how central each competency is to THIS role
- At least one competency must be 1.0 (the most critical)
- Do not assign the same weight to more than 2 competencies
- Base weights on the actual mandate, not generic CXO assumptions

Rules for mandatory_probes:
- Only include things explicitly required by the JD, not assumptions
- Each probe must be a specific verifiable claim, not a vague topic

Rules for red_flag_triggers:
- These are disqualifying weaknesses — only flag things the JD explicitly demands

You MUST return the output as a valid JSON object matching this exact schema:
{schema_json}

Job Description:
{jd_text}
"""
        try:
            response = await self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": "You are an expert AI recruiter. You only reply in valid JSON."},
                    {"role": "user", "content": prompt}
                ],
                response_format={"type": "json_object"},
                temperature=0.1
            )
            raw_json = response.choices[0].message.content
            return JDConfig.model_validate_json(raw_json)
        except Exception as e:
            logger.error(f"Failed to analyze JD: {e}")
            raise

    async def analyze_resume(self, resume_text: str) -> ResumeSnapshot:
        logger.info("Analyzing Resume with Groq...")
        
        schema_json = json.dumps(ResumeSnapshot.model_json_schema(), indent=2)
        
        prompt = f"""You are an expert HR Executive reviewing a resume critically.
Extract structured information from the following resume.

Rules:
- Treat all claims as UNVERIFIED — flag anything that sounds inflated or vague
- For career arc: calculate exact duration_months for every role
- Flag tenure gaps > 6 months in tenure_gaps with the companies on either side
- notable_signals should capture patterns: too many short stints, big company → tiny company jumps, title inflation, vague descriptions with no numbers
- red_flags should be specific: "Claims P&L ownership but title was CFO reporting to CEO — verify autonomy"

You MUST return the output as a valid JSON object matching this exact schema:
{schema_json}

Resume:
{resume_text}
"""
        try:
            response = await self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": "You are an expert AI recruiter. You only reply in valid JSON."},
                    {"role": "user", "content": prompt}
                ],
                response_format={"type": "json_object"},
                temperature=0.1
            )
            raw_json = response.choices[0].message.content
            return ResumeSnapshot.model_validate_json(raw_json)
        except Exception as e:
            logger.error(f"Failed to analyze resume: {e}")
            raise
    
    async def build_candidate_profile(self, session_id: str, resume: ResumeSnapshot, jd: JDConfig) -> CandidateProfile:
        logger.info("Building Candidate Profile & Hypothesis Map with Groq...")
        
        schema_json = json.dumps(GeneratedProfileData.model_json_schema(), indent=2)
        
        prompt = f"""You are configuring a rigorous executive interview for a {jd.role_type} role.

Your job is to produce:

1. HYPOTHESIS MAP
   For each major claim in the resume, generate a skeptical hypothesis.
   Focus on: title vs actual authority, short tenures, career pivots, gaps, vague impact claims.
   Each hypothesis needs a specific probe_instruction — not a question, but a direction for the interviewer.

2. ANCHOR QUESTIONS
   Generate 4-5 opening questions that could ONLY be asked of this specific candidate.
   Every question must name a specific company, year, role, or career moment from their resume.
   FORBIDDEN: "Tell me about a challenge", "Describe your leadership style", anything generic.
   GOOD EXAMPLE: "You moved from CFO at [Company] to CEO of a 200-person startup in [year] — what broke in your first 90 days?"

3. ADDITIONAL RED FLAGS AND MANDATORY PROBES
   Based on gaps between what the JD requires and what the resume demonstrates.

You MUST return the output as a valid JSON object matching this exact schema:
{schema_json}

=== JD CONFIGURATION ===
{jd.model_dump_json(indent=2)}

=== CANDIDATE RESUME ===
{resume.model_dump_json(indent=2)}
"""
        try:
            response = await self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": "You are a Principal Engineering Manager preparing for a rigorous interview. You only reply in valid JSON."},
                    {"role": "user", "content": prompt}
                ],
                response_format={"type": "json_object"},
                temperature=0.2
            )
            raw_json = response.choices[0].message.content
            generated_data = GeneratedProfileData.model_validate_json(raw_json)
            
            profile = CandidateProfile(
                session_id=session_id,
                candidate=resume,
                jd=jd,
                **generated_data.model_dump()
            )
            
            logger.info("Successfully built Candidate Profile with Groq.")
            return profile
        except Exception as e:
            logger.error(f"Failed to build Candidate Profile: {e}")
            raise
