from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse
from sqlmodel import Session

from .api import router
from .config import settings
from .database import create_db_and_tables, engine
from .seed import seed_demo
from .services import recompute_schedule


@asynccontextmanager
async def lifespan(_: FastAPI):
    create_db_and_tables()
    if settings.demo_mode:
        with Session(engine) as session:
            seed_demo(session)
            recompute_schedule(session, "demo startup")
    yield


app = FastAPI(title=settings.app_name, version="0.1.0", description="Local-first academic planning API", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_origin, "http://127.0.0.1:5173", "tauri://localhost", "http://tauri.localhost"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(router, prefix=settings.api_prefix)


@app.get("/", include_in_schema=False)
def root():
    return RedirectResponse(url="/docs")
