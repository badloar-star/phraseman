# Publer API Access Diagnosis - 2026-06-12

Result: automatic posting is blocked by Publer API access for the current key/workspace.

What worked:

- `GET /api/v1/workspaces` returned `200`.
- Workspace returned by API: `MyTheo`.
- API workspace plan field returned: `professional`.
- `GET /api/v1/job_status/test` returned `200`.

What is blocked:

- `GET /api/v1/accounts` returned `403`.
- `GET /api/v1/posts` returned `403`.
- `GET /api/v1/media` returned `403`.
- Header variants checked: `Publer-Workspace-Id`, `Publer-Workspace-ID`, `publer-workspace-id`.
- All blocked endpoints returned: `Please upgrade to Business to access our API.`

Likely cause:

- The API key is valid, but Publer is not allowing the needed scopes/endpoints for this workspace/key.
- Required scopes for this automation are: `workspaces`, `accounts`, `posts`, `media`.
- `analytics` is optional, only needed for best-time analysis.

No posts were created during this diagnosis.
