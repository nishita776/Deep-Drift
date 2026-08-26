import time
from pathlib import Path
from fastapi.testclient import TestClient
from app.main import app

# Using TestClient as a context manager ensures FastAPI's startup event
# (which creates the DB tables via init_db()) actually fires.
client = TestClient(app)
client.__enter__()
FIXTURE = Path(__file__).parent / "fixtures" / "sample.fastq"


def test_health_check():
    resp = client.get("/")
    assert resp.status_code == 200
    assert resp.json()["status"] == "ok"


def test_full_pipeline_end_to_end():
    # 1. upload
    with open(FIXTURE, "rb") as f:
        resp = client.post(
            "/samples",
            data={"name": "test_sample", "sample_type": "field", "marker_gene": "18S"},
            files={"file": ("sample.fastq", f, "text/plain")},
        )
    assert resp.status_code == 200
    sample_id = resp.json()["id"]

    # 2. trigger run
    resp = client.post(f"/samples/{sample_id}/run")
    assert resp.status_code == 200
    job_id = resp.json()["id"]

    # 3. poll until done (BackgroundTasks run synchronously-ish under TestClient)
    for _ in range(20):
        resp = client.get(f"/jobs/{job_id}/status")
        status = resp.json()["status"]
        if status in ("done", "failed"):
            break
        time.sleep(0.2)

    assert status == "done", f"pipeline failed: {resp.json().get('error_log')}"

    # 4. check results exist
    results = client.get(f"/samples/{sample_id}/results").json()
    assert results["total_reads"] > 0

    clusters = client.get(f"/samples/{sample_id}/novel-clusters").json()
    assert isinstance(clusters, list)

    bio = client.get(f"/samples/{sample_id}/biodiversity").json()
    assert "shannon" in bio and "rarefaction_curve" in bio
