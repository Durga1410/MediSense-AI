"""Each of the 4 demo scenarios yields its intended risk pathway (criterion #4)."""

EXPECTED = {
    "low": {"risk_level": "LOW", "risk_score": 18, "confidence": 94, "department": "General Medicine"},
    "medium": {"risk_level": "MEDIUM", "risk_score": 52, "confidence": 88, "department": "General Medicine"},
    "high": {"risk_level": "HIGH", "risk_score": 78, "confidence": 91, "department": "Pulmonology"},
    "critical": {"risk_level": "CRITICAL", "risk_score": 96, "confidence": 97, "department": "Emergency Care"},
}


def _assess(client, scenario):
    resp = client.post("/ai/assess", json={"scenario": scenario})
    assert resp.status_code == 200, f"{scenario}: {resp.status_code} {resp.text[:300]}"
    return resp.json()


def test_low_scenario_pathway(client):
    data = _assess(client, "low")
    exp = EXPECTED["low"]
    assert data["risk_level"] == exp["risk_level"]
    assert data["risk_score"] == exp["risk_score"]
    assert data["confidence"] == exp["confidence"]
    assert data["recommended_department"] == exp["department"]
    assert len(data["contributing_factors"]) >= 1
    assert data["guidance"]
    assert data["possible_category"]


def test_medium_scenario_pathway(client):
    data = _assess(client, "medium")
    exp = EXPECTED["medium"]
    assert data["risk_level"] == exp["risk_level"]
    assert data["risk_score"] == exp["risk_score"]
    assert data["confidence"] == exp["confidence"]
    assert data["recommended_department"] == exp["department"]
    assert len(data["contributing_factors"]) >= 1


def test_high_scenario_pathway_escalates(client):
    data = _assess(client, "high")
    exp = EXPECTED["high"]
    assert data["risk_level"] == exp["risk_level"]
    assert data["risk_score"] == exp["risk_score"]
    assert data["confidence"] == exp["confidence"]
    assert data["recommended_department"] == exp["department"]
    assert len(data["contributing_factors"]) >= 1
    # HIGH must trigger human review escalation
    assert data["escalation_required"] is True
    assert data["escalation_reason"]


def test_critical_scenario_pathway_escalates(client):
    data = _assess(client, "critical")
    exp = EXPECTED["critical"]
    assert data["risk_level"] == exp["risk_level"]
    assert data["risk_score"] == exp["risk_score"]
    assert data["confidence"] == exp["confidence"]
    assert data["recommended_department"] == exp["department"]
    assert len(data["contributing_factors"]) >= 1
    assert data["escalation_required"] is True
    assert data["escalation_reason"]

    # Confirm a corresponding human_review row was created for this assessment.
    reviews = client.get("/human-review").json()
    matches = [r for r in reviews if r.get("assessment_id") == data["id"]]
    assert matches, "expected a human_review row created for the escalated CRITICAL assessment"
