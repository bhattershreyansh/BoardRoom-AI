import os
from PyPDF2 import PdfReader
from core.utils.logger import get_logger

logger = get_logger(__name__)

class DocumentParser:
    """Parses resumes and job descriptions from various file formats into raw text."""
    
    @staticmethod
    def extract_text(file_path: str) -> str:
        if not os.path.exists(file_path):
            raise FileNotFoundError(f"File not found: {file_path}")
            
        ext = os.path.splitext(file_path)[1].lower()
        
        if ext == '.pdf':
            return DocumentParser._parse_pdf(file_path)
        elif ext in ['.txt', '.md']:
            return DocumentParser._parse_txt(file_path)
        elif ext == '.docx':
            return DocumentParser._parse_docx(file_path)
        else:
            raise ValueError(f"Unsupported file format: {ext}. Only PDF, TXT, and DOCX are supported.")

    @staticmethod
    def _parse_pdf(file_path: str) -> str:
        try:
            reader = PdfReader(file_path)
            text = ""
            for page in reader.pages:
                extracted = page.extract_text()
                if extracted:
                    text += extracted + "\n"
            logger.info(f"Successfully extracted {len(text)} characters from {file_path}")
            return text
        except Exception as e:
            logger.error(f"Failed to parse PDF {file_path}: {e}")
            raise

    @staticmethod
    def _parse_txt(file_path: str) -> str:
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                text = f.read()
            logger.info(f"Successfully extracted {len(text)} characters from {file_path}")
            return text
        except Exception as e:
            logger.error(f"Failed to parse text file {file_path}: {e}")
            raise

    @staticmethod
    def _parse_docx(file_path: str) -> str:
        try:
            import docx2txt
            text = docx2txt.process(file_path)
            logger.info(f"Successfully extracted {len(text)} characters from DOCX {file_path}")
            return text
        except Exception as e:
            logger.error(f"Failed to parse DOCX {file_path}: {e}")
            raise
