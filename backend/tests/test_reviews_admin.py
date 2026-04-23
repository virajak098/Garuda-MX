"""Backend tests for Reviews (public) + Admin moderation routes."""
import os
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://premium-photo-crop.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"
ADMIN_PASSWORD = "GarudaMX2026"


@pytest.fixture(scope="module")
def session():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="module")
def admin_token(session):
    r = session.post(f"{API}/admin/login", json={"password": ADMIN_PASSWORD})
    assert r.status_code == 200, r.text
    t = r.json().get("token")
    assert t
    return t


@pytest.fixture(scope="module")
def created_review_ids(session):
    ids = []
    yield ids
    # cleanup
    r = session.post(f"{API}/admin/login", json={"password": ADMIN_PASSWORD})
    if r.status_code == 200:
        tok = r.json()["token"]
        for rid in ids:
            session.delete(f"{API}/admin/reviews/{rid}", headers={"Authorization": f"Bearer {tok}"})


# ---------- Health ----------
def test_root_api(session):
    r = session.get(f"{API}/")
    assert r.status_code == 200
    assert "Garuda" in r.json().get("message", "")


# ---------- Admin login ----------
def test_admin_login_wrong_password(session):
    r = session.post(f"{API}/admin/login", json={"password": "wrong-pass"})
    assert r.status_code == 403
    assert "detail" in r.json()


def test_admin_login_correct_password(session):
    r = session.post(f"{API}/admin/login", json={"password": ADMIN_PASSWORD})
    assert r.status_code == 200
    data = r.json()
    assert data.get("ok") is True
    assert isinstance(data.get("token"), str) and len(data["token"]) > 0


def test_admin_endpoints_require_auth(session):
    r = session.get(f"{API}/admin/reviews")
    assert r.status_code == 401  # no bearer
    r = session.get(f"{API}/admin/reviews", headers={"Authorization": "Bearer wrong"})
    assert r.status_code == 403


# ---------- Review create ----------
def test_create_review_public(session, created_review_ids):
    payload = {"name": "TEST_User1", "rating": 5, "text": "Absolutely love Garuda MX — great editor!"}
    r = session.post(f"{API}/reviews", json=payload)
    assert r.status_code == 200, r.text
    data = r.json()
    assert data["name"] == payload["name"]
    assert data["rating"] == 5
    assert data["text"] == payload["text"]
    assert data["approved"] is False
    assert "id" in data
    created_review_ids.append(data["id"])


def test_create_review_invalid_rating(session):
    r = session.post(f"{API}/reviews", json={"name": "TEST_Bad", "rating": 9, "text": "too high"})
    assert r.status_code == 422


def test_create_review_missing_fields(session):
    r = session.post(f"{API}/reviews", json={"name": "", "rating": 3, "text": "x"})
    assert r.status_code == 422


# ---------- Public list filters approved only ----------
def test_public_list_only_approved(session, created_review_ids):
    # newly created one is unapproved -> should NOT be in /api/reviews
    r = session.get(f"{API}/reviews")
    assert r.status_code == 200
    ids = [row["id"] for row in r.json()]
    assert created_review_ids[0] not in ids
    # And every returned row is approved
    for row in r.json():
        assert row["approved"] is True


# ---------- Admin list shows all ----------
def test_admin_list_all(session, admin_token, created_review_ids):
    r = session.get(f"{API}/admin/reviews", headers={"Authorization": f"Bearer {admin_token}"})
    assert r.status_code == 200
    ids = [row["id"] for row in r.json()]
    assert created_review_ids[0] in ids


# ---------- Approve flow ----------
def test_approve_review_flow(session, admin_token, created_review_ids):
    rid = created_review_ids[0]
    r = session.patch(
        f"{API}/admin/reviews/{rid}",
        json={"approved": True},
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert r.status_code == 200, r.text
    assert r.json()["approved"] is True

    # Now visible publicly
    pub = session.get(f"{API}/reviews").json()
    assert any(row["id"] == rid for row in pub)


def test_unapprove_review(session, admin_token, created_review_ids):
    rid = created_review_ids[0]
    r = session.patch(
        f"{API}/admin/reviews/{rid}",
        json={"approved": False},
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert r.status_code == 200
    assert r.json()["approved"] is False
    # Not visible publicly anymore
    pub = session.get(f"{API}/reviews").json()
    assert not any(row["id"] == rid for row in pub)


def test_delete_review(session, admin_token, created_review_ids):
    # Create a throwaway
    r = session.post(f"{API}/reviews", json={"name": "TEST_DeleteMe", "rating": 3, "text": "to delete"})
    assert r.status_code == 200
    rid = r.json()["id"]
    created_review_ids.append(rid)

    r = session.delete(
        f"{API}/admin/reviews/{rid}",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert r.status_code == 200
    assert r.json()["deleted"] == rid

    # Verify gone
    r = session.delete(
        f"{API}/admin/reviews/{rid}",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert r.status_code == 404
    created_review_ids.remove(rid)


def test_patch_nonexistent_review(session, admin_token):
    r = session.patch(
        f"{API}/admin/reviews/does-not-exist-id",
        json={"approved": True},
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert r.status_code == 404
