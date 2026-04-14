# Hive API migration & debugging notes (DailyReviewCreator)

This document summarizes changes made to work with a **newer Hive** server (DRF-style JSON, different fields than the old client in `backend/hive.py`). Use it when continuing work in a new session or agent.

---

## Architecture (reminder)

- **Backend:** FastAPI (`backend/api.py`) → `MisuvCreator` (`backend/misuv_creator.py`) → `HiveAPI` (`backend/hive.py`) → Hive HTTPS API.
- **Frontend:** Vite dev server proxies `/api` to the FastAPI backend.
- **Config:** Hive instances live in `backend/config.py` under `HIVES_CONFIG` (name → `username`, `password`, `url`).

---

## Backend: TLS / SSL

- Hive used a **self-signed certificate** → `requests` failed with `CERTIFICATE_VERIFY_FAILED` on `/api/core/token/` because only the first request had `verify=False`.
- **Fix:** `self.session.verify = False` on the shared `requests.Session` in `HiveAPI.__init__` so **all** calls skip verification (aligned with existing `urllib3` warning suppression).
- **Production note:** Prefer a proper CA or pinned cert instead of disabling verification long term.

---

## Backend: List responses and pagination

- Newer APIs often return **DRF pagination:** `{ "count", "next", "results": [ ... ] }` instead of a bare array.
- **Fix:** `_unwrap_list()` in `hive.py` — if the payload has `results`, use that list; otherwise treat as a list or `[]`.
- **Limitation:** Only the **first page** of results is used. If a program/subject/user is on a later page, lookups can fail until pagination is implemented (follow `next` or add server-side filters).

---

## Backend: Safer handling of POST responses (`misuv_creator.py`)

- **Helper:** `_require_json_id(response, what)` — checks HTTP status, parses JSON, requires `id` or `pk`, raises `RuntimeError` with the body on failure (avoids bare `KeyError: 'id'` on validation errors).
- **Debug logging:** If the environment variable **`DEBUG_HIVE=1`** (or `true` / `yes`), `_hive_debug_print` logs full response text for each `_require_json_id` call. Use when capturing payloads; turn off for quiet logs.

---

## Backend: Exercise creation (`POST /api/core/course/exercises/`)

The old client sent booleans for `preview` / guessed strings; the new API uses **string choices** and **extra fields**.

**Captured shape (disabled preview, typical daily מישוב):**

- `preview`: `"Disabled"` when not using markdown; `"Markdown"` can be set via `preview=True` or `preview_display="Markdown"` in code.
- **`patbas_preview`:** always **`"Disabled"`** in captures — it is **not** the same as `preview` (do not mirror `preview`/`Markdown` into `patbas_preview` unless the UI shows otherwise).
- `patbas_download` and `download`: booleans (from the `download` argument).
- Also send: `autodone`, `on_creation_data`, `expected_duration`, `autocheck_tag`, `is_lecture`, `style`, `segel_brief` with the defaults from browser captures.
- `order`: **string** (e.g. `"1"`), not zero-padded unless the UI does.

**Do not guess** choice strings; use Network tab captures when adding new modes.

---

## Backend: Field creation (`POST /api/core/course/exercises/{id}/fields/`)

**Path:** use plural **`exercises`** in the path (e.g. `/api/core/course/exercises/{exercise_id}/fields/`), not `.../exercise/...`.

**Body (from UI capture):** includes `hanich_responses`, `staff_responses`, `description`, `choices`, `groups` (e.g. `[1]`), etc. The old **`for_response_type`** field is **not** sent anymore.

**Defaults in code:** `groups` defaults to `[1]` — if your Hive deployment uses another group id, move this to `config.py` or env.

---

## Backend: Queues (`POST /api/core/queues/`)

- New API required **`module`** on the serializer.
- Sending **both** `module` and **`user`** caused a DB **`for_one_item`** integrity error — the queue row must satisfy a check that only one “target” is set in a certain way.
- **Fix:** send **`module`** (id) and **do not** send `user` in the JSON; the authenticated user is implied by the Bearer token.
- **`for_object` / `owns`:** older code read `owns` from module list/detail for `for_object`; newer module payloads may omit `owns`. Queue creation was updated to not depend on `get_module_owns` (method removed).

**If queue create still fails:** capture **`POST /api/core/queues/`** from the browser and align fields exactly.

---

## Backend: Queue items (`POST /api/core/queues/{queue_id}/items/`)

**Captured body when adding an exercise at the beginning:**

```json
{
  "order": 0,
  "queue_rule": "Wait For Submitted",
  "set_nested_queue_id": null,
  "set_exercise_id": <exercise_id>,
  "set_module_id": null,
  "continue_on_redo": false,
  "enabled": true,
  "set_tags_id": []
}
```

**Note:** A different action adds a **module** to the queue (`set_module_id` set, `set_exercise_id` null) — do not confuse the two.

**Order:** prepend is implemented as **`order`: 0** (no client-side PATCH bump unless the API requires it and you have a capture).

**Bug fixed:** the POST URL had a **leading space** before `hive_host` in `add_exercise_to_queue` — invalid URL.

---

## Backend: Other fixes worth remembering

- **`add_user_to_class`:** URL typo **`clas ses`** → **`classes`**.
- **`get_module_id`:** list URL normalized to **`/api/core/course/modules/`** with query `parent_subject__id=<subject_id>` (matches browser).

---

## Frontend: npm peer dependency conflict

- `@material-ui/core@4` peer-optional types expect React 17 types; project uses React 18.
- **Fix:** `frontend/.npmrc` with `legacy-peer-deps=true`.

---

## Frontend: Vite proxy (`vite.config.js`)

- **`process.env.VITE_API_BASE_URL`** was undefined in the config file → proxy `target` was **`undefined`** → runtime error (`'req' in undefined`).
- **Fix:** `loadEnv` from Vite + default **`http://127.0.0.1:9000`** (matches `uvicorn` in `backend/Dockerfile`).
- Override locally with **`frontend/.env`:** `VITE_API_BASE_URL=http://127.0.0.1:<port>` if the API is not on 9000.

---

## How to debug the next issue

1. Reproduce with **`DEBUG_HIVE=1`** on the backend.
2. For any failing call, capture from Chrome/Firefox **Network:** full **request URL**, **method**, **JSON body**, and **response JSON**.
3. Prefer **browser captures** over guessing enum values (`preview`, queues, etc.).
4. If list endpoints seem incomplete, check **pagination** (`results` / `next`).

---

## Files touched (high level)

| Area | Files |
|------|--------|
| Hive client | `backend/hive.py` |
| Daily flow + debug helpers | `backend/misuv_creator.py` |
| FastAPI | `backend/api.py` (unchanged behavior aside from upstream fixes) |
| Vite | `frontend/vite.config.js` |
| npm | `frontend/.npmrc` |

---

## Security reminder

`backend/config.py` may contain **real Hive credentials** — ensure it is **gitignored** in real deployments or use environment variables; do not commit secrets to public repos.
