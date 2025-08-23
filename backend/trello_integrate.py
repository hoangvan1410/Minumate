
import os
import time
import typing as t
import requests
from dotenv import load_dotenv
load_dotenv()
 
 

class TrelloError(Exception):
    pass
 
 

class TrelloClient:
    def find_board_by_name(self, name: str):
        """
        Find a Trello board by name (case-insensitive, exact match).
        Returns the board dict if found, else None.
        """
        me = self.get_me()
        member_id = me["id"]
        boards = self._request("GET", f"members/{member_id}/boards")
        for board in boards:
            # Only consider open boards (closed == False)
            if (
                board.get("name", "").strip().lower() == name.strip().lower()
                and not board.get("closed", False)
            ):
                return board
        return None
    """
    Simple Trello API client (v1) using key/token auth.
    Docs: https://developer.atlassian.com/cloud/trello/rest/api-group-cards/
    """
    def __init__(self, key: str | None = None, token: str | None = None, base_url: str = "https://api.trello.com/1"):
        self.key = key or os.getenv("TRELLO_KEY")
        self.token = token or os.getenv("TRELLO_TOKEN")
        if not self.key or not self.token:
            raise TrelloError("Missing TRELLO_KEY or TRELLO_TOKEN. Set env vars or pass to TrelloClient().")
        self.base_url = base_url
        self.session = requests.Session()
        self.session.headers.update({"User-Agent": "TrelloClient/1.0"})

    def _request(
        self,
        method: str,
        path: str,
        params: dict | None = None,
        data: dict | None = None,
        files: dict | None = None,
        max_retries: int = 3,
    ):
        url = f"{self.base_url.rstrip('/')}/{path.lstrip('/')}"
        qp = {"key": self.key, "token": self.token}
        if params:
            qp.update(params)

        backoff = 1.0
        for attempt in range(max_retries):
            resp = self.session.request(method, url, params=qp, data=data, files=files, timeout=30)

            # Rate limit
            if resp.status_code == 429:
                retry_after = float(resp.headers.get("Retry-After", backoff))
                time.sleep(retry_after)
                backoff = min(backoff * 2, 8)
                continue

            # Success
            if 200 <= resp.status_code < 300:
                if resp.content:
                    return resp.json()
                return None

            # Server errors → retry a bit
            if 500 <= resp.status_code < 600 and attempt < max_retries - 1:
                time.sleep(backoff)
                backoff = min(backoff * 2, 8)
                continue

            # Other errors → raise
            try:
                detail = resp.json()
            except Exception:
                detail = resp.text
            raise TrelloError(f"{method} {url} failed [{resp.status_code}]: {detail}")

        raise TrelloError(f"{method} {url} failed after {max_retries} retries.")

    # Board, List, Label, Member APIs
    def get_board(self, board_id: str):
        return self._request("GET", f"boards/{board_id}")

    def get_lists(self, board_id: str):
        return self._request("GET", f"boards/{board_id}/lists")

    def get_labels(self, board_id: str):
        return self._request("GET", f"boards/{board_id}/labels")

    def get_me(self):
        return self._request("GET", "members/me")

    def create_board(self, name: str, default_lists: bool = False, desc: str = None, public: bool = True, idOrganization: str = None) -> dict:
        params = {
            "name": name,
            "defaultLists": str(default_lists).lower(),
            "prefs_permissionLevel": "public" if public else "private"
        }
        if desc:
            params["desc"] = desc
        if idOrganization is not None and str(idOrganization).strip():
            params["idOrganization"] = str(idOrganization).strip()
        else:
            # If Trello will create a new workspace, set the workspace name as required
            params["organizationName"] = "AI Elevate Course Demo"
        print("[TRELLO][DEBUG] Payload gửi lên Trello khi tạo board:", params)
        board = self._request("POST", "boards", params=params)
        print("[TRELLO][DEBUG] Response trả về khi tạo board:", board)
        # Kiểm tra nếu idOrganization trả về khác với idOrganization truyền vào (nếu có)
        if idOrganization and board.get("idOrganization") != str(idOrganization).strip():
            raise TrelloError(f"Trello đã tạo board ở workspace khác! idOrganization gửi: {idOrganization}, idOrganization trả về: {board.get('idOrganization')}")
        return board

    def create_list(self, board_id: str, name: str, pos: str = "bottom") -> dict:
        params = {
            "name": name,
            "idBoard": board_id,
            "pos": pos
        }
        return self._request("POST", "lists", params=params)

    def create_label(self, board_id: str, name: str, color: str = "null"):
        params = {
            "idBoard": board_id,
            "name": name,
            "color": color
        }
        return self._request("POST", "labels", params=params)

    # Card APIs
    def create_card(
        self,
        list_id: str,
        name: str,
        desc: str | None = None,
        due_iso: str | None = None,
        member_ids: list[str] | None = None,
        label_ids: list[str] | None = None,
        pos: str | float | None = None,
        url_source: str | None = None,
    ):
        params = {
            "idList": list_id,
            "name": name,
        }
        if desc:
            params["desc"] = desc
        if due_iso:
            params["due"] = due_iso
        if member_ids:
            params["idMembers"] = ",".join(member_ids)
        if label_ids:
            params["idLabels"] = ",".join(label_ids)
        if pos is not None:
            params["pos"] = str(pos)
        if url_source:
            params["urlSource"] = url_source
        return self._request("POST", "cards", params=params)

    def update_card(
        self,
        card_id: str,
        name: str | None = None,
        desc: str | None = None,
        due_iso: str | None = None,
        closed: bool | None = None,
        list_id: str | None = None,
    ):
        params: dict[str, t.Any] = {}
        if name is not None:
            params["name"] = name
        if desc is not None:
            params["desc"] = desc
        if due_iso is not None:
            params["due"] = due_iso
        if closed is not None:
            params["closed"] = str(closed).lower()
        if list_id is not None:
            params["idList"] = list_id
        return self._request("PUT", f"cards/{card_id}", params=params)

    def move_card(self, card_id: str, new_list_id: str):
        return self.update_card(card_id, list_id=new_list_id)

    def add_comment(self, card_id: str, text: str):
        return self._request("POST", f"cards/{card_id}/actions/comments", params={"text": text})

    def add_members(self, card_id: str, member_ids: list[str]):
        return self._request("PUT", f"cards/{card_id}", params={"idMembers": ",".join(member_ids)})

    def add_labels(self, card_id: str, label_ids: list[str]):
        return self._request("PUT", f"cards/{card_id}", params={"idLabels": ",".join(label_ids)})

    def attach_file(self, card_id: str, file_path: str, name: str | None = None):
        if not os.path.exists(file_path):
            raise TrelloError(f"File not found: {file_path}")
        files = {"file": open(file_path, "rb")}
        data = {}
        if name:
            data["name"] = name
        try:
            return self._request("POST", f"cards/{card_id}/attachments", data=data, files=files)
        finally:
            files["file"].close()

    def get_card(self, card_id: str):
        return self._request("GET", f"cards/{card_id}")

    def archive_card(self, card_id: str):
        return self.update_card(card_id, closed=True)

    def get_cards_in_list(self, list_id: str):
        return self._request("GET", f"lists/{list_id}/cards")

    # --- Assign / unassign members (safe add/remove, no overwrite) ---
    def assign_member(self, card_id: str, member_id: str):
        return self._request("POST", f"cards/{card_id}/idMembers", params={"value": member_id})

    def unassign_member(self, card_id: str, member_id: str):
        return self._request("DELETE", f"cards/{card_id}/idMembers/{member_id}")

    def assign_members(self, card_id: str, member_ids: list[str]):
        results = []
        for mid in member_ids:
            results.append(self.assign_member(card_id, mid))
        return results

    def get_board_members(self, board_id: str):
        return self._request("GET", f"boards/{board_id}/members")

    def get_board_member_ids(self, board_id: str) -> list[str]:
        members = self.get_board_members(board_id)
        return [m["id"] for m in members]