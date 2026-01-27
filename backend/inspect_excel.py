import pandas as pd

FILE_PATH = "e:/Py/Delivery-System-III/Sales orders_639045087241734537.xlsx"

try:
    df = pd.read_excel(FILE_PATH)
    print("COLUMNS:", df.columns.tolist())
    print("FIRST ROW:", df.iloc[0].to_dict())
except Exception as e:
    print(f"Error reading file: {e}")
