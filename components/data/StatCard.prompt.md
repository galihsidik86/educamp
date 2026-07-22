StatCard — dashboard metric tile. Keep `value` short; use `delta` for trend.

```jsx
<StatCard label="IPK Kumulatif" value="3.78" icon={<i data-lucide="award" />} delta="+0.06 semester ini" deltaDir="up" />
```

`tone` memberi bobot visual di dalam satu grid KPI, supaya pembaca tahu mana
angka rujukan dan mana angka yang menuntut tindakan — tanpa menambah teks:

```jsx
<StatCard label="Mahasiswa Aktif"     value="139"  tone="default" />
<StatCard label="KRS Diajukan"        value="12"   tone="attention" />
<StatCard label="Total Belum Lunas"   value="Rp 25.000.000" tone="feature" />
```

Pakai `feature` **maksimal satu kali** per grid — begitu ada dua kartu terisi,
keduanya berhenti menonjol. `attention` bukan status error: itu untuk angka
yang wajar dilihat lalu ditindaklanjuti (antrean, tunggakan), bukan kegagalan.
