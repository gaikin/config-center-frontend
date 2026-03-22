# Page Resource Menu Code And Business Process Design

## Goal

Align page resource ownership with two explicit references:
- menu association via `menu_code`
- business process association via `business_process_id`

The page resource table remains the shared page master. The design keeps internal numeric ids for persistence joins, but the public and UI-facing contract uses codes.

## Background

We have already agreed on these constraints:
- `business_process` is not `job_scene` and must not inherit job execution semantics.
- `business_process` uses its own `processCode` and `processName`.
- `page_resource` should not use `menu_id` anymore.
- `page_resource` must add `menu_code`.
- `page_resource` must also keep `business_process_id`.
- Menus are associated by `menuCode`.
- Business processes are associated by `business_process_id`.
- Codes are unique within their own object type, not globally.

## Design

### 1. Page resource ownership

`page_resource` becomes the shared page master with two independent ownership references:
- `menu_code`: links the page to a menu.
- `business_process_id`: links the page to a business process.

This means a page resource can be queried from either side:
- menu -> pages by `menu_code`
- business process -> pages by `business_process_id`

### 2. Menu model

The menu model stays code-driven for UI and API contracts:
- `menuCode`
- `menuName`
- `regionId`

Internally, the database may still keep numeric ids for joins and foreign keys, but `menuCode` is the business-facing key used by the frontend and by page resource references.

### 3. Business process model

Business process is a separate configuration domain with the same management style as menus:
- `processCode`
- `processName`

The process does not execute jobs. It only groups pages.

### 4. Relationship rules

- A page resource must belong to exactly one menu by `menu_code`.
- A page resource must belong to exactly one business process by `business_process_id`.
- `menu_id` is removed from the page resource contract.
- The frontend creates and edits pages by selecting `menuCode` and `processCode`.

### 5. Public contract

The frontend should not expose internal ids for these relationships unless needed for joins in backend responses.
The user-facing forms and lists should display:
- menu code and menu name
- process code and process name
- page code and page name

### 6. Error handling

When saving a page resource:
- reject missing `menuCode`
- reject missing `business_process_id`
- reject unknown menu code
- reject unknown business process id
- reject duplicate page code within the same menu if existing rules require it

### 7. Migration strategy

- Remove `menu_id` from `page_resource`.
- Add `menu_code` to `page_resource`.
- Keep `business_process_id` on `page_resource`.
- Update schema, seed data, tests, and frontend forms together.
- Do not keep a compatibility layer for old `menu_id` based payloads.

## Open questions

None remain for the current agreed boundary.

## Success criteria

- A page resource can be saved only when it has a valid `menuCode` and a valid `business_process_id`.
- The frontend uses codes instead of menu ids.
- The backend stores the new relationship model without relying on `menu_id`.
- Existing page resource queries can still render correctly from the new references.
