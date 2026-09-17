"""Settings integration status, threshold persistence, n8n test round-trip (criterion #8)."""


def test_settings_thresholds_persist(client):
    original = client.get("/settings").json()
    assert "thresholds" in original

    updated_payload = dict(original)
    updated_payload["thresholds"] = dict(original["thresholds"])
    new_high_min = 61 if original["thresholds"].get("high_min") != 61 else 63
    updated_payload["thresholds"]["high_min"] = new_high_min

    put_resp = client.put("/settings", json=updated_payload)
    assert put_resp.status_code == 200, put_resp.text[:300]
    assert put_resp.json()["thresholds"]["high_min"] == new_high_min

    # Reload (fresh GET) confirms persistence.
    reloaded = client.get("/settings").json()
    assert reloaded["thresholds"]["high_min"] == new_high_min

    # Restore original value so this test stays rerun-safe / doesn't corrupt other checks.
    restore_payload = dict(reloaded)
    restore_payload["thresholds"] = dict(reloaded["thresholds"])
    restore_payload["thresholds"]["high_min"] = original["thresholds"]["high_min"]
    restore = client.put("/settings", json=restore_payload)
    assert restore.status_code == 200


def test_n8n_webhook_simulation_returns_actions(client):
    resp = client.post(
        "/webhooks/n8n/assessment",
        json={"assessment_id": "tscheck-n8n-test", "data": {"source": "backend-test"}},
    )
    assert resp.status_code == 200, resp.text[:300]
    data = resp.json()
    assert data["received"] is True
    assert data["workflow"]
    assert isinstance(data["actions"], list) and len(data["actions"]) >= 1
