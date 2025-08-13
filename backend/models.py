"""Pydantic models for API requests and responses."""

from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime
from auth import UserRole

# Authentication models
class UserRegister(BaseModel):
    username: str
    email: EmailStr
    password: str
    full_name: str
    role: Optional[UserRole] = UserRole.USER

class UserLogin(BaseModel):
    username: str
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str
    user: dict

class UserResponse(BaseModel):
    id: int
    username: str
    email: str
    full_name: str
    role: str
    is_active: bool
    created_at: datetime

# Meeting models
class MeetingCreate(BaseModel):
    title: str
    description: Optional[str] = ""
    transcript: Optional[str] = ""
    participants: Optional[List[int]] = []  # User IDs

class MeetingResponse(BaseModel):
    id: int
    title: str
    description: str
    created_at: datetime
    user_role: str
    creator: str

class MeetingAnalysisResponse(BaseModel):
    id: int
    title: str
    analysis: dict
    tasks: List[dict]

# Task models
class TaskCreate(BaseModel):
    meeting_id: int
    assigned_to: Optional[int] = None
    title: str
    description: Optional[str] = ""
    due_date: Optional[datetime] = None

class TaskUpdate(BaseModel):
    status: str  # 'pending', 'in_progress', 'completed'

class TaskResponse(BaseModel):
    id: int
    title: str
    description: str
    due_date: Optional[datetime]
    status: str
    meeting_title: str
    created_at: datetime

# Transcript analysis models
class TranscriptAnalysis(BaseModel):
    transcript: str
    meeting_title: Optional[str] = "Meeting Analysis"
    participants: Optional[List[int]] = []

class AnalysisResponse(BaseModel):
    success: bool
    meeting_id: Optional[int] = None
    summary: Optional[str] = None
    key_points: Optional[List[str]] = None
    action_items: Optional[List[dict]] = None
    participants_analysis: Optional[List[dict]] = None
    next_steps: Optional[List[str]] = None
    error: Optional[str] = None
