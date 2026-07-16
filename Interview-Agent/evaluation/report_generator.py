import os
import json
from core.utils.logger import get_logger
from evaluation.models import FinalEvaluationReport

logger = get_logger(__name__)

class ReportGenerator:
    def __init__(self, output_dir: str = "reports"):
        self.output_dir = output_dir
        os.makedirs(self.output_dir, exist_ok=True)

    def save_json_report(self, report: FinalEvaluationReport) -> str:
        """
        Saves the structured FinalEvaluationReport as a JSON file.
        """
        file_path = os.path.join(self.output_dir, f"{report.session_id}.json")
        try:
            with open(file_path, "w", encoding="utf-8") as f:
                f.write(report.model_dump_json(indent=2))
            logger.info(f"Successfully saved JSON report to: {file_path}")
            return file_path
        except Exception as e:
            logger.error(f"Failed to save JSON report: {e}")
            raise

    def save_markdown_report(self, report: FinalEvaluationReport) -> str:
        """
        Saves the report as a beautifully formatted Markdown file.
        """
        file_path = os.path.join(self.output_dir, f"{report.session_id}.md")
        
        signal_emojis = {
            "strong": "🟢 STRONG HIRE",
            "mixed": "🟡 MIXED SIGNAL",
            "weak": "🔴 NO HIRE"
        }
        signal_header = signal_emojis.get(report.overall_signal.lower(), report.overall_signal.upper())
        
        # Helper for stars
        def stars(val: int) -> str:
            return "★" * val + "☆" * (5 - val)
            
        # Helper for radar bar
        def make_radar_bar(score: float) -> str:
            percentage = int((score / 5.0) * 100)
            bars_count = int(percentage / 10)
            return "█" * bars_count + "░" * (10 - bars_count)

        # Build Executive Radar
        radar_rows = []
        for comp, item in report.scorecard.items():
            formatted_name = comp.replace("_", " ").title()
            radar_rows.append(
                f"{formatted_name:<25} {make_radar_bar(item.average_score)} {int((item.average_score / 5.0) * 100)}"
            )
        radar_block = "\n".join(radar_rows)

        # Build Decision Matrix
        matrix_rows = []
        for comp, item in report.scorecard.items():
            formatted_name = comp.replace("_", " ").title()
            matrix_rows.append(
                f"| **{formatted_name}** | {item.candidate_turns_count} | `{item.grade}` | {item.strategic_framework} | {item.real_example} | {item.metrics} | {item.confidence} |"
            )
        decision_matrix_table = "\n".join(matrix_rows)

        # Build detailed notes section (linking subcomponents & notes)
        details_list = []
        for comp in report.scorecard.keys():
            formatted_name = comp.replace("_", " ").title()
            item = report.scorecard[comp]
            note = report.competency_notes.get(comp, "No notes available.")
            
            details_list.append(f"""
### 🎯 {formatted_name}
* **Score**: {item.average_score}/5 (`{item.grade}`)
* **Assessor Note**: {note}
* **Criteria Scoring**:
  - Strategic Framework: `{item.strategic_framework}`
  - Real Example: `{item.real_example}`
  - Metrics: `{item.metrics}`
  - Candidate Confidence: `{item.confidence}`
""")
        details_section = "\n".join(details_list)

        # Build key strengths list
        strengths_rows = []
        for s in report.key_strengths:
            strengths_rows.append(f"""
#### 🟢 {s.name}
- **Assessment**: {s.explanation}
- **Evidence**: *"{s.evidence}"*
""")
        strengths_section = "\n".join(strengths_rows)
        
        # Build key risks list
        risks_rows = []
        severity_colors = {"high": "🔴 HIGH", "medium": "🟡 MEDIUM", "low": "🟢 LOW"}
        for r in report.key_risks:
            sev_tag = severity_colors.get(r.severity.lower(), r.severity.upper())
            risks_rows.append(f"""
#### {sev_tag} - {r.name}
- **Reason**: {r.reason}
- **Evidence / Observed Behavior**: *"{r.evidence}"*
""")
        risks_section = "\n".join(risks_rows)

        # Build observations
        obs_list = "\n".join([f"- {o}" for o in report.interviewer_observations])

        # Build recommended next topics
        topics_list = "\n".join([f"- {t}" for t in report.recommended_topics])

        # Build transcript appendix
        transcript_rows = []
        for turn in report.full_transcript:
            role = "**Interviewer** 🤖" if turn["speaker"] == "interviewer" else f"**{report.candidate_name}** 👤"
            transcript_rows.append(f"{role}: {turn['text']}\n")
        transcript_section = "\n".join(transcript_rows)

        markdown_content = f"""# Executive Evaluation Report
**Candidate**: {report.candidate_name}  
**Role**: {report.role_type}  
**Session ID**: {report.session_id}  

---

## 📊 Summary Scorecard

| Overall Hiring Signal | Recommended Action | Hiring Confidence |
|:---|:---|:---|
| **{signal_header}** | **`{report.recommended_next_step.upper()}`** | **`{report.hiring_confidence_score}%`** |

### Executive Summary
{report.executive_summary}

### Recommendation Details
**Hiring Confidence Reasoning**: {report.hiring_confidence_reasoning}

**Next Step Guidance**:
{report.detailed_recommendation}

---

## 📡 Executive Radar
```text
{radar_block}
```

---

## 🏆 Key Strengths
{strengths_section}

---

## ⚠️ Risks & Concerns
{risks_section}

---

## 🧠 Behavioral & Integrity Indicators
| Trait | Rating |
| :--- | :--- |
| **Communication** | `{stars(report.behavioral_indicators.communication)}` |
| **Executive Presence** | `{stars(report.behavioral_indicators.executive_presence)}` |
| **Confidence Under Pressure** | `{stars(report.behavioral_indicators.confidence_under_pressure)}` |
| **Strategic Thinking** | `{stars(report.behavioral_indicators.strategic_thinking)}` |
| **Ownership** | `{stars(report.behavioral_indicators.ownership)}` |
| **Decision Making** | `{stars(report.behavioral_indicators.decision_making)}` |
| **Influencing** | `{stars(report.behavioral_indicators.influencing)}` |

---

## 📋 Interviewer Observations
{obs_list}

---

## 🎯 Next Round Recommended Topics
{topics_list}

---

## 🔍 Competency Decision Matrix
| Competency | Turns Scored | Grade | Strategic Framework | Real Example | Metrics | Confidence |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
{decision_matrix_table}

---

## 🔍 Detailed Competency Evaluations
{details_section}

---

## 📝 Appendix: Full Interview Transcript
{transcript_section}
"""
        try:
            with open(file_path, "w", encoding="utf-8") as f:
                f.write(markdown_content)
            logger.info(f"Successfully saved Markdown report to: {file_path}")
            return file_path
        except Exception as e:
            logger.error(f"Failed to save Markdown report: {e}")
            raise

    def generate_all_reports(self, report: FinalEvaluationReport) -> dict:
        """
        Helper to generate and save both JSON and Markdown reports.
        """
        json_path = self.save_json_report(report)
        md_path = self.save_markdown_report(report)
        return {
            "json": json_path,
            "markdown": md_path
        }
