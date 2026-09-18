import os
import sys

backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

import pytest
from starlette.testclient import TestClient
from app.main import app
from app.database.connection import SessionLocal
from app.models.notification import Notification

client = TestClient(app)


def test_get_notifications():
    response = client.get("/api/notifications")
    assert response.status_code == 200
    data = response.json()
    assert "items" in data
    assert "unread_count" in data
    assert "total" in data
    assert isinstance(data["items"], list)
    assert data["total"] >= 0


def test_create_and_mark_notification_read():
    # 1. Create a notification
    create_payload = {
        "user_id": 1,
        "title": "Test System Alert",
        "message": "This is a test notification verifying end-to-end functionality.",
        "type": "system",
        "link": "/documents",
    }
    create_resp = client.post("/api/notifications", json=create_payload)
    assert create_resp.status_code == 201
    created_data = create_resp.json()
    notif_id = created_data["id"]
    assert created_data["title"] == "Test System Alert"
    assert created_data["is_read"] is False

    # 2. Mark this notification as read
    read_resp = client.put(f"/api/notifications/{notif_id}/read")
    assert read_resp.status_code == 200
    read_data = read_resp.json()
    assert read_data["id"] == notif_id
    assert read_data["is_read"] is True


def test_mark_all_read():
    # 1. Create an unread notification
    client.post("/api/notifications", json={
        "user_id": 1,
        "title": "Batch Unread Test",
        "message": "Testing mark all as read.",
        "type": "document",
    })

    # 2. Call read-all
    resp = client.put("/api/notifications/read-all")
    assert resp.status_code == 200
    data = resp.json()
    assert "marked_count" in data

    # 3. Verify unread count is now 0 for user 1
    list_resp = client.get("/api/notifications")
    assert list_resp.status_code == 200
    assert list_resp.json()["unread_count"] == 0
