import asyncio
import pandas as pd
import sys
import os

# Add backend to path
sys.path.append(os.getcwd())

from app.services.excel import excel_service
from app.schemas.order import OrderCreate, OrderStatus


# Mock DB and Pydantic stuff locally without full app context
class MockDB:
    async def execute(self, query):
        class MockResult:
            def scalars(self):
                class MockScalars:
                    def first(self):
                        return None  # No existing order

                return MockScalars()

        return MockResult()

    def add(self, obj):
        pass

    async def commit(self):
        pass

    async def refresh(self, obj):
        pass


async def test_import():
    file_path = r"e:\Py\Delivery-System-III\Sales orders_639045087241734537.xlsx"
    print(f"Testing import with file: {file_path}")

    try:
        # 1. Parse File
        with open(file_path, "rb") as f:
            contents = f.read()

        import io

        try:
            data = excel_service.parse_file(io.BytesIO(contents))
            print(f"Parsed {len(data)} rows successfully.")
        except Exception as e:
            print(f"Excel Parse Error: {str(e)}")
            return

        created_count = 0
        errors = []

        # 2. Run Mapping Logic (Copied from orders.py)
        for i, row in enumerate(data):
            try:
                keys = {k.strip().lower(): k for k in row.keys()}

                # Logic from orders.py
                order_num_raw = row.get("Sales order") or row.get("Order Number")

                if pd.isna(order_num_raw) or str(order_num_raw).strip() == "":
                    raise Exception("Missing 'Sales order' column or value")

                sales_order_number = str(order_num_raw).strip()

                def clean_value(val):
                    if (
                        pd.isna(val)
                        or str(val).strip() == ""
                        or str(val).lower() == "nan"
                    ):
                        return None
                    return str(val).strip()

                cust_name = clean_value(
                    row.get("Customer name") or row.get("Customer Name")
                )
                cust_phone = clean_value(row.get("Customer phone") or row.get("Phone"))
                cust_addr = clean_value(
                    row.get("Customer address") or row.get("Address")
                )
                cust_area = clean_value(row.get("Area"))

                amount_raw = row.get("Total amount") or row.get("Amount")
                total_amount = float(amount_raw) if not pd.isna(amount_raw) else 0.0

                target_wh_id = 1

                print(
                    f"Row {i + 1}: OK -> {sales_order_number}, {cust_name}, {total_amount}"
                )
                created_count += 1

            except Exception as e:
                print(f"Row {i + 1} Error: {str(e)}")
                errors.append({"row": i + 1, "error": str(e)})

        print(f"\nResult: {created_count} created, {len(errors)} errors.")
        if errors:
            print("Errors:", errors)

    except Exception as e:
        print(f"CRITICAL ERROR: {str(e)}")
        import traceback

        traceback.print_exc()


if __name__ == "__main__":
    asyncio.run(test_import())
