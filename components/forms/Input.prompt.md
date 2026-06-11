Input — labelled text field. Pass `error` to flip to invalid; `icon` for a leading glyph (search, user).

```jsx
<Input label="NIM" required placeholder="2025010142" icon={<i data-lucide="hash" />} />
<Input label="Email" error="Format email tidak valid" defaultValue="abc" />
```