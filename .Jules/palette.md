## 2025-05-18 - Controlled Form Title Validation and Focus Management
**Learning:** Submitting forms without title validation feedback causes silent failures where users (especially screen reader users) don't know why form submission failed. Using `aria-required="true"` along with `role="alert"` and focusing the invalid field provides immediate feedback without triggering disruptive native browser tooltips that bypass controlled React submission handlers.
**Action:** When validating required fields in React components, set explicit inline error alerts with `role="alert"`, programmatic focus management (`elementRef.focus()`), and `aria-required="true"` instead of standard HTML5 `required` attribute.

## 2026-10-06 - Interactive Button Events for Keyboard and Touch Accessibility
**Learning:** Binding only `onDoubleClick` to interactive `<Button>` elements renders them unusable for keyboard users (since Space/Enter trigger `click` events, not `dblclick`) and touch screen users. Providing `onClick` with explicit `aria-label` ensures full accessibility across keyboard, touch, and mouse interactions without redundant event bindings.
**Action:** When making title/header elements editable via buttons, bind `onClick` and set informative `aria-label` attributes instead of relying solely on pointer `onDoubleClick`.
