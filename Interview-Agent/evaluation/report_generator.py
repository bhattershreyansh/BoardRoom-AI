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
        
        # Build scorecard table
        scorecard_rows = []
        for comp, item in report.scorecard.items():
            formatted_name = comp.replace("_", " ").title()
            scorecard_rows.append(
                f"| **{formatted_name}** | {item.average_score}/5 | `{item.grade}` | {item.candidate_turns_count} |"
            )
        scorecard_table = "\n".join(scorecard_rows)

        # Build detailed notes & quotes section
        details_list = []
        for comp in report.scorecard.keys():
            formatted_name = comp.replace("_", " ").title()
            note = report.competency_notes.get(comp, "No notes available.")
            quote = report.key_quotes.get(comp, "")
            
            details_list.append(f"""
### 🎯 {formatted_name}
* **Score**: {report.scorecard[comp].average_score}/5 (`{report.scorecard[comp].grade}`)
* **Assessor Note**: {note}
{f'* **Key Quote**: *"{quote}"*' if quote else ''}
""")
        details_section = "\n".join(details_list)

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

| Overall Hiring Signal | Recommended Action |
|:---|:---|
| **{signal_header}** | **`{report.recommended_next_step.upper()}`** |

### Executive Summary
{report.executive_summary}

### Competency Breakdown
| Competency | Score | Grade | Turns Scored |
|:---|:---|:---|:---|
{scorecard_table}

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
