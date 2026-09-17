"""Dashboard stat cards / chart data source (criterion #6) - API-level data checks."""


def test_dashboard_stats_meet_seeded_floor(client):
    resp = client.get("/dashboard/stats")
    assert resp.status_code == 200
    data = resp.json()

    # Assessment generation during other tests legitimately grows totals - assert floors, not exact equality.
    assert data["total_assessments"] >= 128
    assert data["low"] >= 54
    assert data["medium"] >= 39
    assert data["high"] >= 25
    assert data["critical"] >= 10
    assert data["human_reviews_total"] >= 21
    assert data["human_reviews_pending"] >= 0
    assert 0 <= data["avg_confidence"] <= 100
    assert isinstance(data["trend"], list) and len(data["trend"]) > 0
