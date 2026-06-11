Button — the standard action trigger; use `variant="primary"` for the main action on a screen, `accent` (gold) only for celebratory/positive emphasis, `secondary`/`ghost` for lower-priority actions, `danger` for destructive ones.

```jsx
<Button variant="primary" leftIcon={<i data-lucide="save" />}>Simpan KRS</Button>
<Button variant="secondary">Batal</Button>
<Button variant="ghost" size="sm">Lihat detail</Button>
```

One primary per view. Sizes: `sm` (toolbars/tables), `md` (default), `lg` (forms/login). Use `block` inside narrow cards.