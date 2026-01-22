from jose import jwt, JWTError
from app.core.config import settings

token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjE3NjkwOTAzNjgsInN1YiI6IjEifQ.WQ-zSSEjxgAxFYrC8y64Xh0WOcwQwqiAagrpEqKGgw-U"
key = "change_this_to_a_secure_random_key"
algo = "HS256"

try:
    payload = jwt.decode(token, key, algorithms=[algo])
    print(f"VERIFIED: {payload}")
except JWTError as e:
    print(f"FAILED: {e}")
except Exception as e:
    print(f"ERROR: {e}")
