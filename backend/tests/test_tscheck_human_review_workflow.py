"""Human review queue filters and the Mark Reviewed workflow persist (criterion #5)."""


def _create_pending_review(client):
    """Generate a CRITICAL demo assessment -> creates a fresh pending human_review row."""
    assess = client.post("/ai/assess", json={"scenario": "critical"})
    assert assess.status_code == 200
    assessment = assess.json()
    reviews = client.get("/human-review").json()
    matches = [r for r in reviews if r.get("assessment_id") == assessment["id"]]
    assert matches, "expected new pending human_review row for the CRITICAL assessment"
    return matches[0]


def test_review_queue_has_seeded_counts(client):
    reviews = client.get("/human-review").json()
    assert isinstance(reviews, list)
    assert len(reviews) >= 21
    pending = [r for r in reviews if r.get("status") == "pending"]
    assert len(pending) >= 7


def test_mark_reviewed_persists(client):
    review = _create_pending_review(client)
    review_id = review["id"]
    assert review["status"] == "pending"

    patch = client.patch(
        f"/human-review/{review_id}",
        json={"status": "reviewed", "reviewer_notes": "tscheck-review-note reviewed via backend test"},
    )
    assert patch.status_code == 200, patch.text[:300]
    updated = patch.json()
    assert updated["status"] == "reviewed"
    assert updated["reviewer_notes"] == "tscheck-review-note reviewed via backend test"

    # Verify persistence via a fresh GET (simulates page reload).
    reviews_after = client.get("/human-review").json()
    persisted = next(r for r in reviews_after if r["id"] == review_id)
    assert persisted["status"] == "reviewed"
    assert persisted["reviewer_notes"] == "tscheck-review-note reviewed via backend test"
