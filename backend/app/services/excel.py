import pandas as pd
from typing import BinaryIO, List, Dict

class ExcelService:
    def parse_file(self, file: BinaryIO) -> List[Dict]:
        """Parse an Excel file and return a list of dictionaries."""
        df = pd.read_excel(file)
        return df.to_dict(orient="records")
    
    def read_local_file(self, file_path: str) -> List[Dict]:
        """Read a local Excel file."""
        df = pd.read_excel(file_path)
        return df.to_dict(orient="records")

excel_service = ExcelService()
