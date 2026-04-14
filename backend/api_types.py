from datetime import date
from pydantic import BaseModel
from typing import List, Optional


class ClassReview(BaseModel):
    type: str
    title: str


class DailySubmission(BaseModel):
    course: str
    selectedDate: date
    classReviews: List[ClassReview]
    weekNumber: int
    dailyQuestion: Optional[str] = None


class Course(BaseModel):
    name: str
