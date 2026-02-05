import logging
import pandas as pd
from typing import BinaryIO, List, Dict

logger = logging.getLogger(__name__)

CSV_ENCODINGS = ["utf-8", "utf-8-sig", "latin-1", "cp1256", "cp1252"]

class ExcelService:
    def parse_file(self, file: BinaryIO, filename: str = "") -> List[Dict]:
        """Parse an Excel/CSV/HTML file and return a list of dictionaries."""
        errors = {}

        # CSV path - try multiple encodings
        if filename.lower().endswith(".csv"):
            for encoding in CSV_ENCODINGS:
                try:
                    df = pd.read_csv(file, encoding=encoding)
                    if df.empty:
                        raise ValueError("CSV file is empty")
                    logger.info(f"CSV parsed with encoding={encoding}, rows={len(df)}")
                    return df.to_dict(orient="records")
                except Exception as e:
                    errors[f"csv({encoding})"] = str(e)
                    file.seek(0)
            # All CSV encodings failed
            logger.error(f"CSV parse failed for '{filename}': {errors}")
            raise ValueError(f"CSV parse failed: {errors.get('csv(utf-8)', errors.get('csv(latin-1)', 'unknown'))}")

        # Try .xlsx
        try:
            df = pd.read_excel(file, engine="openpyxl")
            return df.to_dict(orient="records")
        except Exception as e:
            errors["xlsx"] = str(e)
            file.seek(0)

        # Try .xls
        try:
            df = pd.read_excel(file, engine="xlrd")
            return df.to_dict(orient="records")
        except Exception as e:
            errors["xls"] = str(e)
            file.seek(0)

        # Try CSV (for files without .csv extension)
        for encoding in CSV_ENCODINGS:
            try:
                df = pd.read_csv(file, encoding=encoding)
                if df.empty:
                    raise ValueError("CSV file is empty")
                return df.to_dict(orient="records")
            except Exception:
                file.seek(0)

        # Try HTML table (Dynamics 365 exports)
        try:
            dfs = pd.read_html(file)
            if not dfs:
                raise ValueError("No tables found")
            return dfs[0].to_dict(orient="records")
        except Exception as e:
            errors["html"] = str(e)
            file.seek(0)

        logger.error(f"All parse attempts failed for '{filename}': {errors}")
        raise ValueError(f"Unsupported file format. Tried: xlsx, xls, csv, html")

    def read_local_file(self, file_path: str) -> List[Dict]:
        """Read a local Excel file."""
        df = pd.read_excel(file_path)
        return df.to_dict(orient="records")

excel_service = ExcelService()
