import os
import json
import requests
import random
import string
from typing import Optional, List, Dict, Any

class JiraClient:
    def __init__(self, base_url: str, email: str, api_token: str):
        """
        Jira Cloud REST API client.

        :param base_url: e.g. "https://your-domain.atlassian.net"
        :param email: Jira account email
        :param api_token: API token from Atlassian account
        """
        self.base_url = base_url.rstrip("/")
        self.session = requests.Session()
        self.session.auth = (email, api_token)
        self.session.headers.update({
            "Accept": "application/json",
            "Content-Type": "application/json"
        })

    def _check(self, resp: requests.Response, expected_status: int):
        if resp.status_code != expected_status:
            try:
                payload = resp.json()
            except Exception:
                payload = resp.text
            raise RuntimeError(
                f"[HTTP {resp.status_code}] {resp.request.method} {resp.request.url}\n"
                f"{json.dumps(payload, indent=2) if isinstance(payload, dict) else payload}"
            )

    def find_account_id_by_email(self, email: str) -> Optional[str]:
        url = f"{self.base_url}/rest/api/3/user/search"
        params = {"query": email}
        r = self.session.get(url, params=params)
        self._check(r, 200)
        users = r.json()
        return users[0].get("accountId") if users else None

    def list_project_types(self) -> List[Dict[str, Any]]:
        url = f"{self.base_url}/rest/api/3/project/type"
        r = self.session.get(url)
        self._check(r, 200)
        return r.json()

    def list_accessible_templates(self, project_type_key: str) -> List[Dict[str, Any]]:
        url = f"{self.base_url}/rest/api/3/project/type/{project_type_key}/accessible"
        r = self.session.get(url)
        self._check(r, 200)
        return r.json()

    def create_company_managed_project(
        self,
        name: str,
        lead_account_id: str,
        project_type_key: str = "software",
        project_template_key: Optional[str] = None,
        description: Optional[str] = None,
        assignee_type: str = "PROJECT_LEAD",
        start_date: Optional[str] = None,  # YYYY-MM-DD
        end_date: Optional[str] = None     # YYYY-MM-DD
    ) -> Dict[str, Any]:
        url = f"{self.base_url}/rest/api/3/project"
        key = self.generate_random_key(6)
        payload = {
            "key": key,
            "name": name,
            "projectTypeKey": project_type_key,
            "leadAccountId": lead_account_id,
            "assigneeType": assignee_type,
        }
        if description:
            payload["description"] = description
        if project_template_key:
            payload["projectTemplateKey"] = project_template_key

        print(json.dumps(payload, indent=2))
        r = self.session.post(url, data=json.dumps(payload))
        self._check(r, 201)
        return r.json()

    def create_team_managed_project(
        self,
        name: str,
        lead_account_id: str,
        project_template_key: str,
        description: Optional[str] = None,
        start_date: Optional[str] = None,  # YYYY-MM-DD
        end_date: Optional[str] = None     # YYYY-MM-DD
    ) -> Dict[str, Any]:
        url = f"{self.base_url}/rest/api/3/project"
        payload = {
            "key": self.generate_random_key(6),
            "name": name,
            "projectTypeKey": "software",
            "projectTemplateKey": project_template_key,
            "assigneeType": "UNASSIGNED",
            "leadAccountId": lead_account_id
        }
        if description:
            payload["description"] = description

        print(json.dumps(payload, indent=2))
        r = self.session.post(url, data=json.dumps(payload))
        self._check(r, 201)
        return r.json()

    def generate_random_key(self, length: int = 4) -> str:
        """
        Generate a random Jira project key.
        - Must start with a letter
        - Contains only A-Z and 0-9
        - Default length: 4 (e.g., 'AB12')
        """
        if length < 2 or length > 10:
            raise ValueError("Jira key length must be between 2 and 10 characters.")
        first_char = random.choice(string.ascii_uppercase)
        rest = ''.join(random.choices(string.ascii_uppercase + string.digits, k=length-1))
        return first_char + rest
