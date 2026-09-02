from __future__ import annotations

from datetime import datetime, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select

from .database import get_session
from .models import Assignment, AssignmentState, CalendarEvent, Course, MasteryRecord, StudyBlock, SyncRun, Topic
from .schemas import AssignmentRead, BlockPatch, CalendarItemRead, CourseRead, ScheduleRequest
from .services import recompute_schedule


router = APIRouter()


def assignment_view(assignment: Assignment, course: Course) -> AssignmentRead:
    return AssignmentRead(**assignment.model_dump(), course=CourseRead.model_validate(course))


@router.get("/status")
def status(session: Session = Depends(get_session)):
    last_sync = session.exec(select(SyncRun).order_by(SyncRun.created_at.desc())).first()
    return {"status": "ok", "mode": "demo", "last_sync": last_sync.finished_at if last_sync else None}


@router.get("/courses", response_model=list[CourseRead])
def courses(session: Session = Depends(get_session)):
    return session.exec(select(Course).order_by(Course.code)).all()


@router.get("/assignments", response_model=list[AssignmentRead])
def assignments(session: Session = Depends(get_session)):
    course_map = {c.id: c for c in session.exec(select(Course)).all()}
    items = session.exec(select(Assignment).order_by(Assignment.due_at)).all()
    return [assignment_view(item, course_map[item.course_id]) for item in items]


@router.get("/assignments/upcoming", response_model=list[AssignmentRead])
def upcoming_assignments(session: Session = Depends(get_session)):
    now = datetime.now()
    course_map = {c.id: c for c in session.exec(select(Course)).all()}
    items = session.exec(select(Assignment).where(Assignment.due_at >= now, Assignment.submitted == False).order_by(Assignment.due_at)).all()  # noqa: E712
    return [assignment_view(item, course_map[item.course_id]) for item in items]


@router.get("/calendar", response_model=list[CalendarItemRead])
def calendar(start: Optional[datetime] = None, end: Optional[datetime] = None, session: Session = Depends(get_session)):
    start = start or datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
    end = end or start + timedelta(days=7)
    events = session.exec(select(CalendarEvent).where(CalendarEvent.end_at > start, CalendarEvent.start_at < end)).all()
    blocks = session.exec(select(StudyBlock).where(StudyBlock.end_at > start, StudyBlock.start_at < end)).all()
    result = [CalendarItemRead(id=f"event-{e.id}", title=e.title, start_at=e.start_at, end_at=e.end_at, kind=e.kind, color=e.color, locked=e.locked) for e in events]
    result += [CalendarItemRead(id=f"block-{b.id}", title=b.title, start_at=b.start_at, end_at=b.end_at, kind=b.kind, color="#D9895B", locked=b.locked, assignment_id=b.assignment_id) for b in blocks]
    return sorted(result, key=lambda item: item.start_at)


@router.get("/mastery")
def mastery(session: Session = Depends(get_session)):
    topics = {t.id: t for t in session.exec(select(Topic)).all()}
    courses = {c.id: c for c in session.exec(select(Course)).all()}
    records = session.exec(select(MasteryRecord)).all()
    return [{"topic": topics[r.topic_id].name, "topic_key": topics[r.topic_id].topic_key, "course": courses[topics[r.topic_id].course_id].name, "score": r.mastery_score, "confidence": r.confidence, "evidence_count": r.evidence_count} for r in records]


@router.get("/dashboard")
def dashboard(session: Session = Depends(get_session)):
    all_assignments = assignments(session)
    events = calendar(session=session)
    calibration = [a for a in all_assignments if a.state == AssignmentState.AWAITING_CALIBRATION]
    scheduled = sum(a.scheduled_minutes for a in all_assignments if a.due_at >= datetime.now())
    return {"assignments": all_assignments, "events": events, "calibration_count": len(calibration), "high_risk_count": sum(a.risk == "HIGH" for a in all_assignments), "scheduled_minutes": scheduled}


@router.post("/schedule/recompute")
def recompute(payload: ScheduleRequest, session: Session = Depends(get_session)):
    run = recompute_schedule(session, payload.reason)
    return {"id": run.id, "status": run.status, "blocks_created": run.blocks_created, "unscheduled_minutes": run.unscheduled_minutes}


@router.patch("/calendar/blocks/{block_id}")
def patch_block(block_id: int, payload: BlockPatch, session: Session = Depends(get_session)):
    block = session.get(StudyBlock, block_id)
    if not block:
        raise HTTPException(status_code=404, detail="Study block not found")
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(block, key, value)
    if block.end_at <= block.start_at:
        raise HTTPException(status_code=422, detail="Block must end after it starts")
    session.add(block)
    session.commit()
    session.refresh(block)
    return block
