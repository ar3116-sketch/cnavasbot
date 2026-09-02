from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import Optional

from sqlalchemy import Column, JSON
from sqlmodel import Field, SQLModel


def utcnow() -> datetime:
    # SQLite does not preserve timezone offsets; persist UTC as a naive value.
    return datetime.utcnow()


class AssignmentState(str, Enum):
    DETECTED = "DETECTED"
    ANALYZED = "ANALYZED"
    AWAITING_CALIBRATION = "AWAITING_CALIBRATION"
    CALIBRATION_IN_PROGRESS = "CALIBRATION_IN_PROGRESS"
    CALIBRATED = "CALIBRATED"
    SCHEDULED = "SCHEDULED"
    IN_PROGRESS = "IN_PROGRESS"
    COMPLETED = "COMPLETED"
    STALE = "STALE"
    ERROR = "ERROR"


class BlockKind(str, Enum):
    HARD = "HARD"
    SOFT = "SOFT"
    PROTECTED = "PROTECTED"
    FLOATING = "FLOATING"


class RiskLevel(str, Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"


class Timestamped(SQLModel):
    created_at: datetime = Field(default_factory=utcnow)
    updated_at: datetime = Field(default_factory=utcnow)


class UserPreferences(Timestamped, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    day_start_hour: int = 8
    day_end_hour: int = 22
    preferred_start_hour: int = 16
    min_block_minutes: int = 30
    max_block_minutes: int = 90
    safety_buffer_hours: int = 12


class Course(Timestamped, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(index=True)
    code: str = Field(index=True, unique=True)
    color: str = "#526D5B"


class Assignment(Timestamped, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    course_id: int = Field(foreign_key="course.id", index=True)
    title: str
    description: str = ""
    due_at: datetime = Field(index=True)
    state: AssignmentState = Field(default=AssignmentState.DETECTED, index=True)
    priority: int = 3
    base_minutes: int = 90
    estimated_minutes: int = 90
    scheduled_minutes: int = 0
    proficiency: Optional[str] = None
    risk: RiskLevel = RiskLevel.LOW
    assignment_type: str = "Homework"
    submitted: bool = False


class AssignmentSnapshot(Timestamped, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    assignment_id: int = Field(foreign_key="assignment.id", index=True)
    content_hash: str = Field(index=True)
    payload: dict = Field(default_factory=dict, sa_column=Column(JSON))


class AssignmentAnalysis(Timestamped, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    assignment_id: int = Field(foreign_key="assignment.id", index=True)
    summary: str = ""
    topics: list = Field(default_factory=list, sa_column=Column(JSON))
    estimated_difficulty: float = 0.5
    base_time_minutes: int = 60
    prerequisites: list = Field(default_factory=list, sa_column=Column(JSON))
    assignment_type: str = ""
    reasoning_summary: str = ""


class Calibration(Timestamped, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    assignment_id: int = Field(foreign_key="assignment.id", index=True)
    status: str = "PENDING"
    overall_score: Optional[float] = None
    mastery_classification: Optional[str] = None


class CalibrationQuestion(Timestamped, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    calibration_id: int = Field(foreign_key="calibration.id", index=True)
    position: int
    dimension: str
    prompt: str
    expected_topics: list = Field(default_factory=list, sa_column=Column(JSON))


class CalibrationAnswer(Timestamped, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    question_id: int = Field(foreign_key="calibrationquestion.id", index=True)
    answer: str = ""
    score: Optional[float] = None
    error_type: Optional[str] = None
    feedback_summary: str = ""


class CalendarEvent(Timestamped, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    title: str
    start_at: datetime = Field(index=True)
    end_at: datetime = Field(index=True)
    kind: BlockKind = Field(default=BlockKind.HARD, index=True)
    color: str = "#8A6B4C"
    locked: bool = True
    source: str = "local"


class StudyBlock(Timestamped, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    assignment_id: int = Field(foreign_key="assignment.id", index=True)
    title: str
    start_at: datetime = Field(index=True)
    end_at: datetime = Field(index=True)
    kind: BlockKind = BlockKind.FLOATING
    locked: bool = False
    completed: bool = False
    schedule_run_id: Optional[int] = Field(default=None, foreign_key="schedulerun.id")


class ScheduleRun(Timestamped, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    reason: str = "manual"
    status: str = "COMPLETED"
    blocks_created: int = 0
    unscheduled_minutes: int = 0


class ScheduleDecision(Timestamped, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    schedule_run_id: int = Field(foreign_key="schedulerun.id")
    assignment_id: int = Field(foreign_key="assignment.id")
    decision: str
    score: float = 0.0
    explanation: str = ""


class Topic(Timestamped, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    course_id: int = Field(foreign_key="course.id")
    topic_key: str = Field(index=True, unique=True)
    name: str
    parent_key: Optional[str] = None


class MasteryRecord(Timestamped, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    topic_id: int = Field(foreign_key="topic.id", index=True)
    mastery_score: float = 0.5
    confidence: float = 0.2
    evidence_count: int = 0
    last_tested: Optional[datetime] = None
    recent_error_types: list = Field(default_factory=list, sa_column=Column(JSON))


class SyncRun(Timestamped, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    provider: str = "demo"
    status: str = "SUCCESS"
    changes: int = 0
    finished_at: Optional[datetime] = None


class HistoricalWorkRecord(Timestamped, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    assignment_id: int = Field(foreign_key="assignment.id")
    estimated_minutes: int
    actual_minutes: int


class ProviderConfiguration(Timestamped, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    provider: str = Field(index=True)
    model: str
    base_url: Optional[str] = None
    temperature: float = 0.2
    credential_key: Optional[str] = None


class ModelRoute(Timestamped, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    task: str = Field(index=True, unique=True)
    provider_configuration_id: int = Field(foreign_key="providerconfiguration.id")


class Notification(Timestamped, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    title: str
    body: str
    severity: str = "INFO"
    read: bool = False
