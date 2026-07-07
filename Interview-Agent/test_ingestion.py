import asyncio
import os
import uuid
from ingestion.parser import DocumentParser
from ingestion.extractor import ProfileExtractor, ResumeSnapshot, JDConfig, CandidateProfile

async def main():
    if not os.path.exists("dummy_jd.txt"):
        with open("dummy_jd.txt", "w") as f:
            f.write("Role: Chief Technology Officer (CTO)\nCompany Stage: Series B\nMandate: Scale engineering team from 20 to 100 while rebuilding monolithic architecture into microservices.\nRequirements: Strong P&L experience, previously scaled teams, expert in cloud architecture.")
            
    if not os.path.exists("dummy_resume.txt"):
        with open("dummy_resume.txt", "w") as f:
            f.write("Candidate: Alice Smith\nExperience:\n- VP of Engineering at StartUpX (2020-2024): Managed 15 engineers. Re-architected AWS backend. Didn't manage P&L.\n- Senior Engineer at BigCorp (2015-2019): Built scalable services.\nGap: Took 2019-2020 off to travel.")

    print("--- 1. Parsing Documents ---")
    jd_text = DocumentParser.extract_text("dummy_jd.txt")
    resume_text = DocumentParser.extract_text("dummy_resume.txt")
    
    extractor = ProfileExtractor()
    
    print("\n--- 2. Analyzing JD ---")
    jd_config = await extractor.analyze_jd(jd_text)
    print("JD Config generated!")
    
    print("\n--- 3. Analyzing Resume ---")
    resume_snapshot = await extractor.analyze_resume(resume_text)
    print("Resume Snapshot generated!")
    
    print("\n--- 4. Building Candidate Profile ---")
    session_id = str(uuid.uuid4())
    profile = await extractor.build_candidate_profile(session_id, resume_snapshot, jd_config)
    
    print("\n=== FINAL CANDIDATE PROFILE ===")
    print(profile.model_dump_json(indent=2))
    
if __name__ == "__main__":
    asyncio.run(main())
