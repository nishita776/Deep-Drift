from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import init_db
from app.api import samples, jobs

app = FastAPI(
    title="NovaTaxa API",
    description="AI-driven taxonomy and biodiversity discovery from deep-sea eDNA (DJS_26_SW_15)",
    version="0.1.0",
)

# Wide-open CORS for the hackathon — the 3 frontend teammates can hit this
# from any local dev port without config back-and-forth. Lock this down
# to specific origins before any real deployment.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(samples.router)
app.include_router(jobs.router)


@app.on_event("startup")
def on_startup():
    init_db()


@app.get("/")
def health_check():
    return {"status": "ok", "service": "NovaTaxa API"}
