# zoom_transcript.py
import base64
import os
import sys
from urllib.parse import urlencode
import requests
from dotenv import load_dotenv

load_dotenv()

ACCOUNT_ID = os.getenv("ZOOM_ACCOUNT_ID")
CLIENT_ID = os.getenv("ZOOM_CLIENT_ID")
CLIENT_SECRET = os.getenv("ZOOM_CLIENT_SECRET")

if not (ACCOUNT_ID and CLIENT_ID and CLIENT_SECRET):
    print("Thiếu ZOOM_ACCOUNT_ID / ZOOM_CLIENT_ID / ZOOM_CLIENT_SECRET trong .env")
    sys.exit(1)

def get_access_token_s2s() -> str:
    """
    Get OAuth token for Server-to-Server:
    POST https://zoom.us/oauth/token?grant_type=account_credentials&account_id=ACCOUNT_ID
    Header: Authorization: Basic base64(CLIENT_ID:CLIENT_SECRET)
    """
    token_url = "https://zoom.us/oauth/token"
    qs = {"grant_type": "account_credentials", "account_id": ACCOUNT_ID}
    basic = base64.b64encode(f"{CLIENT_ID}:{CLIENT_SECRET}".encode()).decode()
    headers = {"Authorization": f"Basic {basic}"}
    r = requests.post(f"{token_url}?{urlencode(qs)}", headers=headers, timeout=30)
    r.raise_for_status()
    return r.json()["access_token"]

def get_meeting_recordings(meeting_id: str, access_token: str) -> dict:
    """GET /v2/meetings/{meetingId}/recordings"""
    url = f"https://api.zoom.us/v2/meetings/{meeting_id}/recordings"
    r = requests.get(url, headers={"Authorization": f"Bearer {access_token}"}, timeout=30)
    if r.status_code == 404:
        # Có thể meeting không thuộc org bạn, hoặc không có cloud recording
        raise RuntimeError("Không tìm thấy recordings cho meeting này (404).")
    r.raise_for_status()
    return r.json()

def download_url_with_token(download_url: str, access_token: str) -> bytes:
    """
    recording/transcript download link from Zoom needs access_token in query form.
    """
    url = f"{download_url}?access_token={access_token}"
    r = requests.get(url, timeout=60)
    r.raise_for_status()
    return r.content

def save_bytes(path: str, content: bytes):
    os.makedirs(os.path.dirname(path) or ".", exist_ok=True)
    with open(path, "wb") as f:
        f.write(content)

def main():
    if len(sys.argv) < 2:
        print("Use: python zoom_transcript.py <MEETING_ID> [save_folder]")
        sys.exit(1)
    meeting_id = sys.argv[1]
    out_dir = sys.argv[2] if len(sys.argv) >= 3 else "transcripts"

    token = get_access_token_s2s()
    data = get_meeting_recordings(meeting_id, token)

    files = data.get("recording_files", []) or []
    vtt_files = [f for f in files if f.get("file_type") in ("TRANSCRIPT", "CC")]

    if not vtt_files:
        print("Can not find transcript file (TRANSCRIPT/CC). Check if Audio transcription turned on and wait for Zoom to finish processing")
        return

    for idx, f in enumerate(vtt_files, 1):
        name_hint = f.get("id", f"part{idx}")
        content = download_url_with_token(f["download_url"], token)
        out_path = os.path.join(out_dir, f"transcript_{name_hint}.vtt")
        save_bytes(out_path, content)
        print(f"Đã lưu: {out_path}")

if __name__ == "__main__":
    main()
