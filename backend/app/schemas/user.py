from typing import Optional, List, Any

from pydantic import BaseModel, ConfigDict, EmailStr


class UserBase(BaseModel):
    email: Optional[EmailStr] = None
    is_active: Optional[bool] = True
    is_superuser: bool = False
    full_name: Optional[str] = None
    role: Optional[str] = None
    fcm_token: Optional[str] = None
    phone: Optional[str] = None


# Properties to receive via API on creation
class UserCreate(UserBase):
    email: EmailStr
    password: str
    full_name: str
    role: str


# Properties to receive via API on update
class UserUpdate(UserBase):
    password: Optional[str] = None


class UserInDBBase(UserBase):
    id: int  # Changed from Optional[int] as it should be present
    model_config = ConfigDict(from_attributes=True)


# Additional properties to return via API
class User(UserInDBBase):
    pass


class PaginatedUserResponse(BaseModel):
    items: List[User]
    total: int
    page: int
    size: int
    pages: int


# Additional properties stored in DB
class UserInDB(UserInDBBase):
    hashed_password: str
