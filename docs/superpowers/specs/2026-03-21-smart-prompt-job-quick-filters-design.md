# Smart Prompt / Job Quick Filters Design

Date: 2026-03-21

## Context

Configuration users work across two related surfaces:

- Smart Prompt list
- Smart Job list

They already have full filter forms, but they need a faster way to narrow results by page ownership and scope when they are working inside a specific menu or page context.

The current UX goal is to add lightweight shortcut filters at the top of the prompt and job list pages. The shortcuts should reduce repeated manual filtering without turning the page into a dense admin console.

## Goals

- Let configuration users switch scope with one click.
- Prioritize page ownership and scope filtering over advanced search fields.
- Keep the shortcut UI compact and visually light.
- Use the same mental model on prompt and job pages.
- Preserve the existing detailed filters for edge cases.

## Non-goals

- No new persistent saved-filter management.
- No new backend query model in this phase.
- No changes to prompt/job record columns.
- No changes to menu management beyond using its existing page context.

## Proposed UX

### Shortcut Filters

Add a small shortcut bar above the main filter area on both Smart Prompt and Smart Job pages.

Recommended shortcut items:

- All
- Current menu
- Current page
- Current menu pages

If the user is not already inside a page context, hide `Current page`.

### Behavior

- `All` clears scope constraints and shows the full list.
- `Current menu` filters to the current menu code context.
- `Current page` filters to the exact current page context when available.
- `Current menu pages` filters to all pages under the current menu, which is useful when users want to inspect the full scope before drilling into a single page.

### Visual Shape

- Use a segmented control or a compact button group.
- Keep the control aligned with the top of the existing filter row.
- Avoid introducing a second large filter panel.
- Show the active shortcut state clearly.

## Interaction Model

### Smart Prompt Page

The shortcut bar sits above the existing prompt filter form.

When a shortcut is chosen:

- Update the page scope filter state.
- Keep existing keyword/date/org filters intact unless the shortcut explicitly resets them.
- Re-run the list query with the combined filter state.

### Smart Job Page

The shortcut bar behaves the same way as on the prompt page.

The shortcut state should be reusable between the two pages so that the user does not have to learn two different models.

## Data Model

The shortcut component should accept a scope context from the host page:

- `menuCode`
- `menuName`
- `pageCode`
- `pageName`

The host page is responsible for translating that context into the actual query constraints used by the prompt/job service.

This keeps the shortcut UI generic and avoids coupling it to one specific service shape.

## Edge Cases

- If there is no current menu context, hide menu/page shortcuts and only show `All`.
- If there is a current menu but no current page, show `Current menu` and `Current menu pages`.
- If there are too many pages under the current menu, the shortcut bar should still stay compact and rely on the existing page filter controls for deep narrowing.
- If the current page is unavailable or deleted, fall back to the current menu shortcut.

## Recommended Implementation Shape

1. Extract a reusable `QuickScopeFilterBar` component.
2. Pass in the current menu/page context from the prompt and job list pages.
3. Add a compact filter state that maps shortcuts to query constraints.
4. Keep advanced filters untouched.
5. Add tests for:
   - no-context fallback
   - current-menu shortcut
   - current-page shortcut
   - active state rendering

## Risks

- If the shortcut bar repeats too much information, the page will feel crowded again.
- If scope context is not passed consistently from the host page, the filter bar will be confusing.
- If the shortcut states diverge between prompt and job pages, users will have to relearn the pattern.

## Success Criteria

- A configuration user can switch to the current menu scope in one click.
- A configuration user can switch to the current page scope in one click.
- The prompt and job pages feel lighter, not heavier.
- Existing filter controls still work for detailed searches.
