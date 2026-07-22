/* @ds-bundle: {"format":3,"namespace":"TazkiaSIAKADDesignSystem_e8738f","components":[{"name":"Avatar","sourcePath":"components/core/Avatar.jsx"},{"name":"Badge","sourcePath":"components/core/Badge.jsx"},{"name":"Button","sourcePath":"components/core/Button.jsx"},{"name":"Card","sourcePath":"components/core/Card.jsx"},{"name":"IconButton","sourcePath":"components/core/IconButton.jsx"},{"name":"ProgressBar","sourcePath":"components/data/ProgressBar.jsx"},{"name":"StatCard","sourcePath":"components/data/StatCard.jsx"},{"name":"Tabs","sourcePath":"components/data/Tabs.jsx"},{"name":"Alert","sourcePath":"components/feedback/Alert.jsx"},{"name":"Checkbox","sourcePath":"components/forms/Checkbox.jsx"},{"name":"Input","sourcePath":"components/forms/Input.jsx"},{"name":"Select","sourcePath":"components/forms/Select.jsx"},{"name":"Switch","sourcePath":"components/forms/Switch.jsx"}],"sourceHashes":{"components/core/Avatar.jsx":"8a33c7da21e8","components/core/Badge.jsx":"ae2625eadafc","components/core/Button.jsx":"ace24bf82bdb","components/core/Card.jsx":"c8e16b87e95b","components/core/IconButton.jsx":"088aaceb5a11","components/data/ProgressBar.jsx":"b2f5132c7cfd","components/data/StatCard.jsx":"866e2ee41d6e","components/data/Tabs.jsx":"0c9a8a6d2f42","components/feedback/Alert.jsx":"07600e10f0a5","components/forms/Checkbox.jsx":"8c45ae79fd3f","components/forms/Input.jsx":"f133de38b419","components/forms/Select.jsx":"9c769d68c8d4","components/forms/Switch.jsx":"dc200739ea91","ui_kits/siakad/data.js":"9430bcd153d8","ui_kits/siakad/screens.jsx":"e197072e2dd6","ui_kits/siakad/shell.jsx":"b6e184df838a"},"inlinedExternals":[],"unexposedExports":[]} */

(() => {

const __ds_ns = (window.TazkiaSIAKADDesignSystem_e8738f = window.TazkiaSIAKADDesignSystem_e8738f || {});

const __ds_scope = {};

(__ds_ns.__errors = __ds_ns.__errors || []);

// components/core/Avatar.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function Avatar({
  src,
  name = '',
  size = 'md',
  className = '',
  ...props
}) {
  const initials = name.trim().split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase();
  const cls = ['tz-avatar', `tz-avatar--${size}`, className].filter(Boolean).join(' ');
  return /*#__PURE__*/React.createElement("span", _extends({
    className: cls
  }, props), src ? /*#__PURE__*/React.createElement("img", {
    src: src,
    alt: name
  }) : initials || '?');
}
Object.assign(__ds_scope, { Avatar });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Avatar.jsx", error: String((e && e.message) || e) }); }

// components/core/Badge.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function Badge({
  variant = 'neutral',
  dot = false,
  children,
  className = '',
  ...props
}) {
  const cls = ['tz-badge', `tz-badge--${variant}`, className].filter(Boolean).join(' ');
  return /*#__PURE__*/React.createElement("span", _extends({
    className: cls
  }, props), dot && /*#__PURE__*/React.createElement("span", {
    className: "tz-badge__dot"
  }), children);
}
Object.assign(__ds_scope, { Badge });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Badge.jsx", error: String((e && e.message) || e) }); }

// components/core/Button.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function Button({
  variant = 'primary',
  size = 'md',
  block = false,
  leftIcon,
  rightIcon,
  children,
  className = '',
  ...props
}) {
  const cls = ['tz-btn', `tz-btn--${variant}`, size !== 'md' && `tz-btn--${size}`, block && 'tz-btn--block', className].filter(Boolean).join(' ');
  return /*#__PURE__*/React.createElement("button", _extends({
    className: cls
  }, props), leftIcon && /*#__PURE__*/React.createElement("span", {
    className: "tz-btn__icon"
  }, leftIcon), children, rightIcon && /*#__PURE__*/React.createElement("span", {
    className: "tz-btn__icon"
  }, rightIcon));
}
Object.assign(__ds_scope, { Button });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Button.jsx", error: String((e && e.message) || e) }); }

// components/core/Card.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function Card({
  pad = false,
  hover = false,
  title,
  action,
  children,
  className = '',
  ...props
}) {
  const cls = ['tz-card', pad && !title && 'tz-card--pad', hover && 'tz-card--hover', className].filter(Boolean).join(' ');
  return /*#__PURE__*/React.createElement("div", _extends({
    className: cls
  }, props), title != null && /*#__PURE__*/React.createElement("div", {
    className: "tz-card__header"
  }, /*#__PURE__*/React.createElement("div", {
    className: "tz-card__title"
  }, title), action), title != null ? /*#__PURE__*/React.createElement("div", {
    className: "tz-card__body"
  }, children) : children);
}
Object.assign(__ds_scope, { Card });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Card.jsx", error: String((e && e.message) || e) }); }

// components/core/IconButton.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function IconButton({
  size = 'md',
  solid = false,
  label,
  children,
  className = '',
  ...props
}) {
  const cls = ['tz-iconbtn', size === 'sm' && 'tz-iconbtn--sm', solid && 'tz-iconbtn--solid', className].filter(Boolean).join(' ');
  return /*#__PURE__*/React.createElement("button", _extends({
    className: cls,
    "aria-label": label,
    title: label
  }, props), children);
}
Object.assign(__ds_scope, { IconButton });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/IconButton.jsx", error: String((e && e.message) || e) }); }

// components/data/ProgressBar.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function ProgressBar({
  value = 0,
  max = 100,
  variant = 'primary',
  label,
  showValue = true,
  className = '',
  ...props
}) {
  const pct = Math.max(0, Math.min(100, value / max * 100));
  return /*#__PURE__*/React.createElement("div", _extends({
    className: ['tz-progress', className].filter(Boolean).join(' ')
  }, props), (label || showValue) && /*#__PURE__*/React.createElement("div", {
    className: "tz-progress__meta"
  }, /*#__PURE__*/React.createElement("span", null, label), showValue && /*#__PURE__*/React.createElement("span", null, Math.round(pct), "%")), /*#__PURE__*/React.createElement("div", {
    className: "tz-progress__track"
  }, /*#__PURE__*/React.createElement("div", {
    className: ['tz-progress__bar', variant !== 'primary' && `tz-progress__bar--${variant}`].filter(Boolean).join(' '),
    style: {
      width: pct + '%'
    }
  })));
}
Object.assign(__ds_scope, { ProgressBar });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/data/ProgressBar.jsx", error: String((e && e.message) || e) }); }

// components/data/StatCard.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function StatCard({
  label,
  value,
  icon,
  delta,
  deltaDir = 'up',
  className = '',
  ...props
}) {
  return /*#__PURE__*/React.createElement("div", _extends({
    className: ['tz-stat', className].filter(Boolean).join(' ')
  }, props), /*#__PURE__*/React.createElement("div", {
    className: "tz-stat__top"
  }, /*#__PURE__*/React.createElement("span", {
    className: "tz-stat__label"
  }, label), icon && /*#__PURE__*/React.createElement("span", {
    className: "tz-stat__icon"
  }, icon)), /*#__PURE__*/React.createElement("div", {
    className: "tz-stat__value"
  }, value), delta && /*#__PURE__*/React.createElement("span", {
    className: `tz-stat__delta tz-stat__delta--${deltaDir}`
  }, delta));
}
Object.assign(__ds_scope, { StatCard });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/data/StatCard.jsx", error: String((e && e.message) || e) }); }

// components/data/Tabs.jsx
try { (() => {
function Tabs({
  tabs = [],
  value,
  onChange,
  className = ''
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: ['tz-tabs', className].filter(Boolean).join(' '),
    role: "tablist"
  }, tabs.map(t => {
    const val = t.value ?? t;
    const label = t.label ?? t;
    const active = value === val;
    return /*#__PURE__*/React.createElement("button", {
      key: val,
      role: "tab",
      "aria-selected": active,
      className: ['tz-tab', active && 'tz-tab--active'].filter(Boolean).join(' '),
      onClick: () => onChange && onChange(val)
    }, label);
  }));
}
Object.assign(__ds_scope, { Tabs });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/data/Tabs.jsx", error: String((e && e.message) || e) }); }

// components/feedback/Alert.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const ICONS = {
  info: /*#__PURE__*/React.createElement("svg", {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }, /*#__PURE__*/React.createElement("circle", {
    cx: "12",
    cy: "12",
    r: "10"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M12 16v-4M12 8h.01"
  })),
  success: /*#__PURE__*/React.createElement("svg", {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M21.8 10A10 10 0 1 1 17 3.3"
  }), /*#__PURE__*/React.createElement("path", {
    d: "m9 11 3 3L22 4"
  })),
  warning: /*#__PURE__*/React.createElement("svg", {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }, /*#__PURE__*/React.createElement("path", {
    d: "m21.7 18-8-14a2 2 0 0 0-3.4 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.7-3Z"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M12 9v4M12 17h.01"
  })),
  danger: /*#__PURE__*/React.createElement("svg", {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }, /*#__PURE__*/React.createElement("circle", {
    cx: "12",
    cy: "12",
    r: "10"
  }), /*#__PURE__*/React.createElement("path", {
    d: "m15 9-6 6M9 9l6 6"
  }))
};
function Alert({
  variant = 'info',
  title,
  children,
  icon,
  className = '',
  ...props
}) {
  return /*#__PURE__*/React.createElement("div", _extends({
    className: ['tz-alert', `tz-alert--${variant}`, className].filter(Boolean).join(' '),
    role: "status"
  }, props), /*#__PURE__*/React.createElement("span", {
    className: "tz-alert__icon"
  }, icon || ICONS[variant]), /*#__PURE__*/React.createElement("div", null, title && /*#__PURE__*/React.createElement("div", {
    className: "tz-alert__title"
  }, title), /*#__PURE__*/React.createElement("div", {
    className: "tz-alert__body"
  }, children)));
}
Object.assign(__ds_scope, { Alert });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/feedback/Alert.jsx", error: String((e && e.message) || e) }); }

// components/forms/Checkbox.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function Checkbox({
  label,
  className = '',
  ...props
}) {
  return /*#__PURE__*/React.createElement("label", {
    className: ['tz-check', className].filter(Boolean).join(' ')
  }, /*#__PURE__*/React.createElement("input", _extends({
    type: "checkbox"
  }, props)), /*#__PURE__*/React.createElement("span", {
    className: "tz-check__box"
  }, /*#__PURE__*/React.createElement("svg", {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "3",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M20 6 9 17l-5-5"
  }))), label && /*#__PURE__*/React.createElement("span", null, label));
}
Object.assign(__ds_scope, { Checkbox });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Checkbox.jsx", error: String((e && e.message) || e) }); }

// components/forms/Input.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function Input({
  label,
  hint,
  error,
  required,
  icon,
  id,
  className = '',
  ...props
}) {
  const auto = React.useId();
  const fid = id || auto;
  const invalid = !!error;
  return /*#__PURE__*/React.createElement("div", {
    className: ['tz-field', invalid && 'tz-field--invalid', className].filter(Boolean).join(' ')
  }, label && /*#__PURE__*/React.createElement("label", {
    className: "tz-field__label",
    htmlFor: fid
  }, label, required && /*#__PURE__*/React.createElement("span", {
    className: "tz-req"
  }, "*")), /*#__PURE__*/React.createElement("div", {
    className: ['tz-inputwrap', icon && 'tz-inputwrap--icon'].filter(Boolean).join(' ')
  }, icon && /*#__PURE__*/React.createElement("span", {
    className: "tz-inputwrap__icon"
  }, icon), /*#__PURE__*/React.createElement("input", _extends({
    id: fid,
    className: "tz-input",
    "aria-invalid": invalid || undefined
  }, props))), error ? /*#__PURE__*/React.createElement("span", {
    className: "tz-field__error"
  }, error) : hint && /*#__PURE__*/React.createElement("span", {
    className: "tz-field__hint"
  }, hint));
}
Object.assign(__ds_scope, { Input });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Input.jsx", error: String((e && e.message) || e) }); }

// components/forms/Select.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function Select({
  label,
  hint,
  error,
  required,
  id,
  children,
  className = '',
  ...props
}) {
  const auto = React.useId();
  const fid = id || auto;
  const invalid = !!error;
  return /*#__PURE__*/React.createElement("div", {
    className: ['tz-field', invalid && 'tz-field--invalid', className].filter(Boolean).join(' ')
  }, label && /*#__PURE__*/React.createElement("label", {
    className: "tz-field__label",
    htmlFor: fid
  }, label, required && /*#__PURE__*/React.createElement("span", {
    className: "tz-req"
  }, "*")), /*#__PURE__*/React.createElement("select", _extends({
    id: fid,
    className: "tz-select"
  }, props), children), error ? /*#__PURE__*/React.createElement("span", {
    className: "tz-field__error"
  }, error) : hint && /*#__PURE__*/React.createElement("span", {
    className: "tz-field__hint"
  }, hint));
}
Object.assign(__ds_scope, { Select });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Select.jsx", error: String((e && e.message) || e) }); }

// components/forms/Switch.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function Switch({
  label,
  className = '',
  ...props
}) {
  return /*#__PURE__*/React.createElement("label", {
    className: ['tz-switch', className].filter(Boolean).join(' ')
  }, /*#__PURE__*/React.createElement("input", _extends({
    type: "checkbox"
  }, props)), /*#__PURE__*/React.createElement("span", {
    className: "tz-switch__track"
  }, /*#__PURE__*/React.createElement("span", {
    className: "tz-switch__thumb"
  })), label && /*#__PURE__*/React.createElement("span", null, label));
}
Object.assign(__ds_scope, { Switch });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Switch.jsx", error: String((e && e.message) || e) }); }

// ui_kits/siakad/data.js
try { (() => {
/* Sample academic data for the SIAKAD UI kit (fictional). */
window.DATA = {
  student: {
    nama: "Aisyah Rahmawati",
    nim: "2023010142",
    prodi: "Sistem Informasi",
    angkatan: "2023",
    semester: 5,
    ipk: "3.78",
    sksTotal: 108,
    sksTarget: 144,
    dpa: "Dr. Hammam Faroni, M.Kom.",
    tagihan: "Lunas"
  },
  pengumuman: [{
    tag: "Akademik",
    judul: "Pengisian KRS Ganjil 2025/2026 dibuka",
    tgl: "4 Agu 2025",
    warna: "brand"
  }, {
    tag: "Keuangan",
    judul: "Batas pembayaran UKT semester ganjil",
    tgl: "1 Agu 2025",
    warna: "warning"
  }, {
    tag: "Kemahasiswaan",
    judul: "Pendaftaran asisten lab dibuka",
    tgl: "28 Jul 2025",
    warna: "accent"
  }],
  jadwalHariIni: [{
    jam: "08:00–09:40",
    mk: "Pemrograman Web Lanjut",
    ruang: "Lab 305",
    dosen: "Hammam F."
  }, {
    jam: "10:00–11:40",
    mk: "Basis Data Terdistribusi",
    ruang: "R. 212",
    dosen: "Siti A."
  }, {
    jam: "13:00–14:40",
    mk: "Etika Profesi & Keislaman",
    ruang: "R. 108",
    dosen: "Ust. Yusuf"
  }],
  // KRS — mata kuliah ditawarkan
  tawaran: [{
    kode: "IF-3101",
    mk: "Kecerdasan Buatan",
    sks: 3,
    kelas: "A",
    jadwal: "Sen 08:00",
    kuota: "32/40",
    wajib: true
  }, {
    kode: "IF-3102",
    mk: "Rekayasa Perangkat Lunak",
    sks: 3,
    kelas: "A",
    jadwal: "Sel 10:00",
    kuota: "38/40",
    wajib: true
  }, {
    kode: "SI-3201",
    mk: "Analisis & Desain Sistem",
    sks: 3,
    kelas: "B",
    jadwal: "Rab 13:00",
    kuota: "29/40",
    wajib: true
  }, {
    kode: "SI-3203",
    mk: "Tata Kelola TI",
    sks: 2,
    kelas: "A",
    jadwal: "Kam 08:00",
    kuota: "24/40",
    wajib: false
  }, {
    kode: "IF-3204",
    mk: "Komputasi Awan",
    sks: 3,
    kelas: "A",
    jadwal: "Kam 13:00",
    kuota: "31/40",
    wajib: false
  }, {
    kode: "UN-3001",
    mk: "Ekonomi Syariah",
    sks: 2,
    kelas: "C",
    jadwal: "Jum 08:00",
    kuota: "40/40",
    wajib: true
  }, {
    kode: "IF-3205",
    mk: "Keamanan Siber",
    sks: 3,
    kelas: "A",
    jadwal: "Sel 13:00",
    kuota: "18/40",
    wajib: false
  }],
  // Jadwal mingguan (kolom: Senin..Jumat)
  sched: {
    times: ["08:00", "10:00", "13:00", "15:00"],
    days: ["Senin", "Selasa", "Rabu", "Kamis", "Jumat"],
    cells: {
      "Senin-08:00": {
        mk: "Kecerdasan Buatan",
        ruang: "Lab 305",
        c: "blue"
      },
      "Selasa-10:00": {
        mk: "Rekayasa PL",
        ruang: "R. 212",
        c: "green"
      },
      "Selasa-13:00": {
        mk: "Keamanan Siber",
        ruang: "Lab 301",
        c: "red"
      },
      "Rabu-13:00": {
        mk: "Analisis Sistem",
        ruang: "R. 108",
        c: "orange"
      },
      "Kamis-08:00": {
        mk: "Tata Kelola TI",
        ruang: "R. 210",
        c: "blue"
      },
      "Kamis-13:00": {
        mk: "Komputasi Awan",
        ruang: "Lab 305",
        c: "green"
      },
      "Jumat-08:00": {
        mk: "Ekonomi Syariah",
        ruang: "R. 401",
        c: "orange"
      }
    }
  },
  // KHS / transkrip
  nilai: [{
    kode: "IF-2101",
    mk: "Struktur Data",
    sks: 3,
    n: "A",
    bobot: "4.00",
    w: "success"
  }, {
    kode: "IF-2103",
    mk: "Pemrograman Web",
    sks: 3,
    n: "A-",
    bobot: "3.70",
    w: "success"
  }, {
    kode: "SI-2201",
    mk: "Sistem Informasi Manajemen",
    sks: 3,
    n: "B+",
    bobot: "3.30",
    w: "brand"
  }, {
    kode: "MA-2001",
    mk: "Statistika",
    sks: 3,
    n: "B",
    bobot: "3.00",
    w: "brand"
  }, {
    kode: "UN-2001",
    mk: "Bahasa Inggris",
    sks: 2,
    n: "A",
    bobot: "4.00",
    w: "success"
  }, {
    kode: "UN-2002",
    mk: "Studi Islam Lanjut",
    sks: 2,
    n: "A",
    bobot: "4.00",
    w: "success"
  }]
};
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/siakad/data.js", error: String((e && e.message) || e) }); }

// ui_kits/siakad/screens.jsx
try { (() => {
/* ============================================================
   TAZKIA SIAKAD — CONTENT SCREENS
   ============================================================ */
const {
  Ic: SIc,
  D: SD
} = window.SIAKAD;
const {
  useState: uS
} = React;
function Stat({
  label,
  value,
  icon,
  delta,
  dir = "up"
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: "tz-stat"
  }, /*#__PURE__*/React.createElement("div", {
    className: "tz-stat__top"
  }, /*#__PURE__*/React.createElement("span", {
    className: "tz-stat__label"
  }, label), /*#__PURE__*/React.createElement("span", {
    className: "tz-stat__icon"
  }, /*#__PURE__*/React.createElement(SIc, {
    n: icon
  }))), /*#__PURE__*/React.createElement("div", {
    className: "tz-stat__value"
  }, value), delta && /*#__PURE__*/React.createElement("span", {
    className: "tz-stat__delta tz-stat__delta--" + dir
  }, /*#__PURE__*/React.createElement(SIc, {
    n: dir === "up" ? "trending-up" : "trending-down",
    style: {
      width: 14,
      height: 14
    }
  }), " ", delta));
}
function Badge({
  v,
  children
}) {
  return /*#__PURE__*/React.createElement("span", {
    className: "tz-badge tz-badge--" + v
  }, children);
}

/* ---------- Dashboard ---------- */
function Dashboard({
  onNav
}) {
  const s = SD.student;
  return /*#__PURE__*/React.createElement("div", {
    className: "content"
  }, /*#__PURE__*/React.createElement("div", {
    className: "page-head"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "ds-eyebrow"
  }, "Semester Ganjil 2025/2026"), /*#__PURE__*/React.createElement("h1", null, "Assalamu'alaikum, ", s.nama.split(" ")[0]), /*#__PURE__*/React.createElement("p", {
    className: "muted",
    style: {
      marginTop: 4
    }
  }, s.prodi, " \xB7 Angkatan ", s.angkatan, " \xB7 Semester ", s.semester)), /*#__PURE__*/React.createElement("button", {
    className: "tz-btn tz-btn--primary",
    onClick: () => onNav("krs")
  }, /*#__PURE__*/React.createElement(SIc, {
    n: "clipboard-list",
    style: {
      width: 18,
      height: 18
    }
  }), " Isi KRS")), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-4"
  }, /*#__PURE__*/React.createElement(Stat, {
    label: "IPK Kumulatif",
    value: s.ipk,
    icon: "award",
    delta: "+0.06 semester ini"
  }), /*#__PURE__*/React.createElement(Stat, {
    label: "SKS Tempuh",
    value: s.sksTotal,
    icon: "layers",
    delta: "dari " + s.sksTarget + " SKS"
  }), /*#__PURE__*/React.createElement(Stat, {
    label: "Semester",
    value: s.semester,
    icon: "calendar-range",
    delta: "Aktif"
  }), /*#__PURE__*/React.createElement(Stat, {
    label: "Status Keuangan",
    value: s.tagihan,
    icon: "wallet",
    delta: "UKT Ganjil"
  })), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-3"
  }, /*#__PURE__*/React.createElement("div", {
    className: "tz-card col-span-2"
  }, /*#__PURE__*/React.createElement("div", {
    className: "tz-card__header"
  }, /*#__PURE__*/React.createElement("div", {
    className: "tz-card__title"
  }, "Jadwal Hari Ini"), /*#__PURE__*/React.createElement("span", {
    className: "tz-badge tz-badge--brand"
  }, "Senin")), /*#__PURE__*/React.createElement("div", {
    className: "tz-card__body",
    style: {
      paddingTop: 6,
      paddingBottom: 6
    }
  }, SD.jadwalHariIni.map((j, i) => /*#__PURE__*/React.createElement("div", {
    className: "list-row",
    key: i
  }, /*#__PURE__*/React.createElement("span", {
    className: "dot-time"
  }, j.jam), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 600,
      color: "var(--text-strong)"
    }
  }, j.mk), /*#__PURE__*/React.createElement("div", {
    className: "muted",
    style: {
      fontSize: 13
    }
  }, j.dosen)), /*#__PURE__*/React.createElement("span", {
    className: "tz-badge tz-badge--neutral"
  }, /*#__PURE__*/React.createElement(SIc, {
    n: "map-pin",
    style: {
      width: 12,
      height: 12
    }
  }), " ", j.ruang))))), /*#__PURE__*/React.createElement("div", {
    className: "tz-card"
  }, /*#__PURE__*/React.createElement("div", {
    className: "tz-card__header"
  }, /*#__PURE__*/React.createElement("div", {
    className: "tz-card__title"
  }, "Progres Studi")), /*#__PURE__*/React.createElement("div", {
    className: "tz-card__body",
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 16
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "tz-progress"
  }, /*#__PURE__*/React.createElement("div", {
    className: "tz-progress__meta"
  }, /*#__PURE__*/React.createElement("span", null, "SKS Tempuh"), /*#__PURE__*/React.createElement("span", null, Math.round(s.sksTotal / s.sksTarget * 100), "%")), /*#__PURE__*/React.createElement("div", {
    className: "tz-progress__track"
  }, /*#__PURE__*/React.createElement("div", {
    className: "tz-progress__bar tz-progress__bar--success",
    style: {
      width: s.sksTotal / s.sksTarget * 100 + "%"
    }
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13
    },
    className: "muted"
  }, "Dosen Pembimbing Akademik"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 10,
      alignItems: "center",
      marginTop: -8
    }
  }, /*#__PURE__*/React.createElement("span", {
    className: "tz-avatar tz-avatar--sm"
  }, "HF"), /*#__PURE__*/React.createElement("span", {
    style: {
      fontWeight: 600,
      color: "var(--text-strong)",
      fontSize: 14
    }
  }, s.dpa))))), /*#__PURE__*/React.createElement("div", {
    className: "tz-card"
  }, /*#__PURE__*/React.createElement("div", {
    className: "tz-card__header"
  }, /*#__PURE__*/React.createElement("div", {
    className: "tz-card__title"
  }, "Pengumuman"), /*#__PURE__*/React.createElement("a", {
    href: "#",
    style: {
      fontSize: 13,
      fontWeight: 600
    }
  }, "Lihat semua")), /*#__PURE__*/React.createElement("div", {
    className: "tz-card__body",
    style: {
      paddingTop: 6,
      paddingBottom: 6
    }
  }, SD.pengumuman.map((p, i) => /*#__PURE__*/React.createElement("div", {
    className: "list-row",
    key: i
  }, /*#__PURE__*/React.createElement(Badge, {
    v: p.warna
  }, p.tag), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      fontWeight: 600,
      color: "var(--text-strong)"
    }
  }, p.judul), /*#__PURE__*/React.createElement("span", {
    className: "muted",
    style: {
      fontSize: 13
    }
  }, p.tgl))))));
}

/* ---------- KRS ---------- */
function Krs() {
  const [sel, setSel] = uS({
    "IF-3101": true,
    "IF-3102": true,
    "SI-3201": true,
    "UN-3001": true
  });
  const toggle = k => setSel(p => ({
    ...p,
    [k]: !p[k]
  }));
  const total = SD.tawaran.filter(t => sel[t.kode]).reduce((a, t) => a + t.sks, 0);
  const maxSks = 24;
  return /*#__PURE__*/React.createElement("div", {
    className: "content"
  }, /*#__PURE__*/React.createElement("div", {
    className: "page-head"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "ds-eyebrow"
  }, "Ganjil 2025/2026"), /*#__PURE__*/React.createElement("h1", null, "Kartu Rencana Studi")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 10
    }
  }, /*#__PURE__*/React.createElement("select", {
    className: "tz-select",
    style: {
      width: 220
    },
    defaultValue: "ganjil"
  }, /*#__PURE__*/React.createElement("option", {
    value: "ganjil"
  }, "Ganjil 2025/2026"), /*#__PURE__*/React.createElement("option", {
    value: "genap"
  }, "Genap 2024/2025")))), /*#__PURE__*/React.createElement("div", {
    className: "tz-alert tz-alert--warning"
  }, /*#__PURE__*/React.createElement("span", {
    className: "tz-alert__icon"
  }, /*#__PURE__*/React.createElement("svg", {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }, /*#__PURE__*/React.createElement("path", {
    d: "m21.7 18-8-14a2 2 0 0 0-3.4 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.7-3Z"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M12 9v4M12 17h.01"
  }))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "tz-alert__title"
  }, "Batas Pengisian KRS"), /*#__PURE__*/React.createElement("div", {
    className: "tz-alert__body"
  }, "Pengisian KRS ditutup 12 Agustus 2025, 23:59 WIB. Wajib divalidasi Dosen Pembimbing Akademik."))), /*#__PURE__*/React.createElement("div", {
    className: "grid",
    style: {
      gridTemplateColumns: "1fr 300px",
      alignItems: "start"
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "tz-card",
    style: {
      overflow: "hidden"
    }
  }, /*#__PURE__*/React.createElement("table", {
    className: "tbl"
  }, /*#__PURE__*/React.createElement("thead", null, /*#__PURE__*/React.createElement("tr", null, /*#__PURE__*/React.createElement("th", {
    style: {
      width: 40
    }
  }), /*#__PURE__*/React.createElement("th", null, "Kode"), /*#__PURE__*/React.createElement("th", null, "Mata Kuliah"), /*#__PURE__*/React.createElement("th", null, "SKS"), /*#__PURE__*/React.createElement("th", null, "Kelas"), /*#__PURE__*/React.createElement("th", null, "Jadwal"), /*#__PURE__*/React.createElement("th", null, "Kuota"))), /*#__PURE__*/React.createElement("tbody", null, SD.tawaran.map(t => /*#__PURE__*/React.createElement("tr", {
    key: t.kode
  }, /*#__PURE__*/React.createElement("td", null, /*#__PURE__*/React.createElement("label", {
    className: "tz-check"
  }, /*#__PURE__*/React.createElement("input", {
    type: "checkbox",
    checked: !!sel[t.kode],
    onChange: () => toggle(t.kode)
  }), /*#__PURE__*/React.createElement("span", {
    className: "tz-check__box"
  }, /*#__PURE__*/React.createElement("svg", {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "3",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M20 6 9 17l-5-5"
  }))))), /*#__PURE__*/React.createElement("td", {
    className: "kode"
  }, t.kode), /*#__PURE__*/React.createElement("td", null, /*#__PURE__*/React.createElement("span", {
    className: "mk-name"
  }, t.mk), " ", t.wajib ? /*#__PURE__*/React.createElement("span", {
    className: "tz-badge tz-badge--brand",
    style: {
      marginLeft: 6
    }
  }, "Wajib") : /*#__PURE__*/React.createElement("span", {
    className: "tz-badge tz-badge--neutral",
    style: {
      marginLeft: 6
    }
  }, "Pilihan")), /*#__PURE__*/React.createElement("td", {
    className: "num"
  }, t.sks), /*#__PURE__*/React.createElement("td", null, t.kelas), /*#__PURE__*/React.createElement("td", {
    className: "muted"
  }, t.jadwal), /*#__PURE__*/React.createElement("td", {
    className: "num"
  }, t.kuota)))))), /*#__PURE__*/React.createElement("div", {
    className: "tz-card tz-card--pad",
    style: {
      position: "sticky",
      top: 88,
      display: "flex",
      flexDirection: "column",
      gap: 14
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 700,
      color: "var(--text-strong)",
      fontSize: 16
    }
  }, "Ringkasan KRS"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "baseline"
    }
  }, /*#__PURE__*/React.createElement("span", {
    className: "muted"
  }, "Total SKS"), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--font-mono)",
      fontWeight: 800,
      fontSize: 28,
      color: total > maxSks ? "var(--danger-solid)" : "var(--blue-800)"
    }
  }, total, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 15,
      color: "var(--text-muted)"
    }
  }, "/", maxSks))), /*#__PURE__*/React.createElement("div", {
    className: "tz-progress"
  }, /*#__PURE__*/React.createElement("div", {
    className: "tz-progress__track"
  }, /*#__PURE__*/React.createElement("div", {
    className: "tz-progress__bar",
    style: {
      width: Math.min(100, total / maxSks * 100) + "%"
    }
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      color: "var(--text-muted)"
    }
  }, SD.tawaran.filter(t => sel[t.kode]).length, " mata kuliah dipilih \xB7 maksimal ", maxSks, " SKS."), /*#__PURE__*/React.createElement("button", {
    className: "tz-btn tz-btn--primary tz-btn--block"
  }, /*#__PURE__*/React.createElement(SIc, {
    n: "send",
    style: {
      width: 18,
      height: 18
    }
  }), " Ajukan KRS"), /*#__PURE__*/React.createElement("button", {
    className: "tz-btn tz-btn--secondary tz-btn--block"
  }, "Simpan Draf"))));
}

/* ---------- Jadwal ---------- */
const SCHED_COLORS = {
  blue: {
    bg: "var(--blue-50)",
    bd: "var(--blue-600)"
  },
  green: {
    bg: "var(--green-50)",
    bd: "var(--green-500)"
  },
  orange: {
    bg: "var(--orange-50)",
    bd: "var(--orange-500)"
  },
  red: {
    bg: "var(--red-50)",
    bd: "var(--red-500)"
  }
};
function Jadwal() {
  const sc = SD.sched;
  return /*#__PURE__*/React.createElement("div", {
    className: "content"
  }, /*#__PURE__*/React.createElement("div", {
    className: "page-head"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "ds-eyebrow"
  }, "Ganjil 2025/2026"), /*#__PURE__*/React.createElement("h1", null, "Jadwal Kuliah")), /*#__PURE__*/React.createElement("button", {
    className: "tz-btn tz-btn--secondary"
  }, /*#__PURE__*/React.createElement(SIc, {
    n: "printer",
    style: {
      width: 18,
      height: 18
    }
  }), " Cetak Jadwal")), /*#__PURE__*/React.createElement("div", {
    className: "tz-card tz-card--pad"
  }, /*#__PURE__*/React.createElement("div", {
    className: "sched"
  }, /*#__PURE__*/React.createElement("div", null), sc.days.map(d => /*#__PURE__*/React.createElement("div", {
    key: d,
    className: "sched__head"
  }, d)), sc.times.map(tm => /*#__PURE__*/React.createElement(React.Fragment, {
    key: tm
  }, /*#__PURE__*/React.createElement("div", {
    className: "sched__time"
  }, tm), sc.days.map(d => {
    const cell = sc.cells[d + "-" + tm];
    if (!cell) return /*#__PURE__*/React.createElement("div", {
      key: d,
      className: "sched__col"
    });
    const c = SCHED_COLORS[cell.c];
    return /*#__PURE__*/React.createElement("div", {
      key: d,
      className: "sched__col"
    }, /*#__PURE__*/React.createElement("div", {
      className: "sched__cell",
      style: {
        background: c.bg,
        borderLeftColor: c.bd
      }
    }, /*#__PURE__*/React.createElement("div", {
      className: "mk"
    }, cell.mk), /*#__PURE__*/React.createElement("div", {
      className: "meta"
    }, /*#__PURE__*/React.createElement(SIc, {
      n: "map-pin",
      style: {
        width: 11,
        height: 11
      }
    }), " ", cell.ruang)));
  }))))));
}

/* ---------- Nilai ---------- */
function Nilai() {
  const [tab, setTab] = uS("khs");
  const tabs = [{
    value: "khs",
    label: "KHS Semester"
  }, {
    value: "transkrip",
    label: "Transkrip"
  }];
  return /*#__PURE__*/React.createElement("div", {
    className: "content"
  }, /*#__PURE__*/React.createElement("div", {
    className: "page-head"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "ds-eyebrow"
  }, "Kartu Hasil Studi"), /*#__PURE__*/React.createElement("h1", null, "Nilai & Transkrip")), /*#__PURE__*/React.createElement("button", {
    className: "tz-btn tz-btn--secondary"
  }, /*#__PURE__*/React.createElement(SIc, {
    n: "download",
    style: {
      width: 18,
      height: 18
    }
  }), " Unduh PDF")), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-4"
  }, /*#__PURE__*/React.createElement(Stat, {
    label: "IP Semester",
    value: "3.62",
    icon: "bar-chart-3",
    delta: "Semester 4"
  }), /*#__PURE__*/React.createElement(Stat, {
    label: "IPK Kumulatif",
    value: SD.student.ipk,
    icon: "award",
    delta: "+0.06"
  }), /*#__PURE__*/React.createElement(Stat, {
    label: "SKS Lulus",
    value: "108",
    icon: "check-check",
    delta: "Tanpa mengulang"
  }), /*#__PURE__*/React.createElement(Stat, {
    label: "Predikat",
    value: "Cum Laude",
    icon: "medal",
    delta: "Sementara"
  })), /*#__PURE__*/React.createElement("div", {
    className: "tz-card",
    style: {
      overflow: "hidden"
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "tz-card__header",
    style: {
      paddingBottom: 0,
      borderBottom: "none"
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "tz-tabs",
    style: {
      border: "none"
    }
  }, tabs.map(t => /*#__PURE__*/React.createElement("button", {
    key: t.value,
    className: "tz-tab" + (tab === t.value ? " tz-tab--active" : ""),
    onClick: () => setTab(t.value)
  }, t.label)))), /*#__PURE__*/React.createElement("table", {
    className: "tbl"
  }, /*#__PURE__*/React.createElement("thead", null, /*#__PURE__*/React.createElement("tr", null, /*#__PURE__*/React.createElement("th", null, "Kode"), /*#__PURE__*/React.createElement("th", null, "Mata Kuliah"), /*#__PURE__*/React.createElement("th", null, "SKS"), /*#__PURE__*/React.createElement("th", null, "Nilai"), /*#__PURE__*/React.createElement("th", null, "Bobot"))), /*#__PURE__*/React.createElement("tbody", null, SD.nilai.map(n => /*#__PURE__*/React.createElement("tr", {
    key: n.kode
  }, /*#__PURE__*/React.createElement("td", {
    className: "kode"
  }, n.kode), /*#__PURE__*/React.createElement("td", {
    className: "mk-name"
  }, n.mk), /*#__PURE__*/React.createElement("td", {
    className: "num"
  }, n.sks), /*#__PURE__*/React.createElement("td", null, /*#__PURE__*/React.createElement("span", {
    className: "tz-badge tz-badge--" + n.w
  }, n.n)), /*#__PURE__*/React.createElement("td", {
    className: "num"
  }, n.bobot)))))));
}

/* ---------- Profil ---------- */
function Profil() {
  const s = SD.student;
  return /*#__PURE__*/React.createElement("div", {
    className: "content"
  }, /*#__PURE__*/React.createElement("div", {
    className: "page-head"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "ds-eyebrow"
  }, "Data Diri"), /*#__PURE__*/React.createElement("h1", null, "Profil Mahasiswa"))), /*#__PURE__*/React.createElement("div", {
    className: "grid",
    style: {
      gridTemplateColumns: "280px 1fr",
      alignItems: "start"
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "tz-card tz-card--pad",
    style: {
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      gap: 12,
      textAlign: "center"
    }
  }, /*#__PURE__*/React.createElement("span", {
    className: "tz-avatar tz-avatar--lg",
    style: {
      width: 88,
      height: 88,
      fontSize: 30
    }
  }, "AR"), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 800,
      fontSize: 18,
      color: "var(--text-strong)"
    }
  }, s.nama), /*#__PURE__*/React.createElement("div", {
    className: "muted",
    style: {
      fontFamily: "var(--font-mono)",
      fontSize: 13
    }
  }, s.nim)), /*#__PURE__*/React.createElement("span", {
    className: "tz-badge tz-badge--success tz-badge--"
  }, "Mahasiswa Aktif"), /*#__PURE__*/React.createElement("button", {
    className: "tz-btn tz-btn--secondary tz-btn--sm tz-btn--block"
  }, /*#__PURE__*/React.createElement(SIc, {
    n: "camera",
    style: {
      width: 16,
      height: 16
    }
  }), " Ubah Foto")), /*#__PURE__*/React.createElement("div", {
    className: "tz-card"
  }, /*#__PURE__*/React.createElement("div", {
    className: "tz-card__header"
  }, /*#__PURE__*/React.createElement("div", {
    className: "tz-card__title"
  }, "Data Akademik"), /*#__PURE__*/React.createElement("button", {
    className: "tz-btn tz-btn--ghost tz-btn--sm"
  }, /*#__PURE__*/React.createElement(SIc, {
    n: "pencil",
    style: {
      width: 16,
      height: 16
    }
  }), " Edit")), /*#__PURE__*/React.createElement("div", {
    className: "tz-card__body",
    style: {
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: 18
    }
  }, /*#__PURE__*/React.createElement(Field, {
    label: "Program Studi",
    value: s.prodi
  }), /*#__PURE__*/React.createElement(Field, {
    label: "Angkatan",
    value: s.angkatan
  }), /*#__PURE__*/React.createElement(Field, {
    label: "Semester",
    value: "Semester " + s.semester
  }), /*#__PURE__*/React.createElement(Field, {
    label: "Dosen Pembimbing",
    value: s.dpa
  }), /*#__PURE__*/React.createElement(Field, {
    label: "Status",
    value: "Aktif"
  }), /*#__PURE__*/React.createElement(Field, {
    label: "Email Kampus",
    value: "aisyah.r@student.tazkia.ac.id"
  })))));
}
function Field({
  label,
  value
}) {
  return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      fontWeight: 700,
      letterSpacing: "0.04em",
      textTransform: "uppercase",
      color: "var(--text-muted)",
      marginBottom: 4
    }
  }, label), /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 600,
      color: "var(--text-strong)"
    }
  }, value));
}
window.SIAKAD_SCREENS = {
  Dashboard,
  Krs,
  Jadwal,
  Nilai,
  Profil
};
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/siakad/screens.jsx", error: String((e && e.message) || e) }); }

// ui_kits/siakad/shell.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/* ============================================================
   TAZKIA SIAKAD — UI KIT SCREENS
   Self-contained recreations using DS tokens + component classes.
   Exports screens to window for the index orchestrator.
   ============================================================ */
const {
  useState
} = React;
const D = window.DATA;
const Ic = ({
  n,
  ...p
}) => /*#__PURE__*/React.createElement("i", _extends({
  "data-lucide": n
}, p));

/* ---------- Shared chrome ---------- */
const NAV = [{
  group: "Akademik",
  items: [{
    key: "dashboard",
    label: "Dashboard",
    icon: "layout-dashboard"
  }, {
    key: "krs",
    label: "Kartu Rencana Studi",
    icon: "clipboard-list",
    badge: "1"
  }, {
    key: "jadwal",
    label: "Jadwal Kuliah",
    icon: "calendar-days"
  }, {
    key: "nilai",
    label: "Nilai & Transkrip",
    icon: "graduation-cap"
  }]
}, {
  group: "Layanan",
  items: [{
    key: "profil",
    label: "Profil Mahasiswa",
    icon: "user-round"
  }]
}];
function Sidebar({
  active,
  onNav
}) {
  return /*#__PURE__*/React.createElement("aside", {
    className: "sb"
  }, /*#__PURE__*/React.createElement("div", {
    className: "sb__logo"
  }, /*#__PURE__*/React.createElement("img", {
    src: "../../assets/logo-tazkia-inverse.svg",
    alt: "Tazkia SIAKAD"
  })), NAV.map(sec => /*#__PURE__*/React.createElement("div", {
    key: sec.group
  }, /*#__PURE__*/React.createElement("div", {
    className: "sb__section"
  }, sec.group), sec.items.map(it => /*#__PURE__*/React.createElement("button", {
    key: it.key,
    className: "sb__item" + (active === it.key ? " sb__item--active" : ""),
    onClick: () => onNav(it.key)
  }, /*#__PURE__*/React.createElement(Ic, {
    n: it.icon
  }), " ", /*#__PURE__*/React.createElement("span", null, it.label), it.badge && /*#__PURE__*/React.createElement("span", {
    className: "sb__badge"
  }, it.badge))))), /*#__PURE__*/React.createElement("div", {
    className: "sb__user"
  }, /*#__PURE__*/React.createElement("span", {
    className: "tz-avatar tz-avatar--md",
    style: {
      background: "rgba(255,255,255,0.15)",
      color: "#fff"
    }
  }, "AR"), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "nm"
  }, D.student.nama), /*#__PURE__*/React.createElement("div", {
    className: "rl"
  }, D.student.nim))));
}
const TITLES = {
  dashboard: ["Dashboard", "Beranda"],
  krs: ["Kartu Rencana Studi", "Akademik / KRS"],
  jadwal: ["Jadwal Kuliah", "Akademik / Jadwal"],
  nilai: ["Nilai & Transkrip", "Akademik / Nilai"],
  profil: ["Profil Mahasiswa", "Layanan / Profil"]
};
function Topbar({
  screen,
  onLogout
}) {
  const [t, c] = TITLES[screen] || ["", ""];
  return /*#__PURE__*/React.createElement("header", {
    className: "topbar"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "topbar__crumb"
  }, c), /*#__PURE__*/React.createElement("div", {
    className: "topbar__title"
  }, t)), /*#__PURE__*/React.createElement("div", {
    className: "topbar__search"
  }, /*#__PURE__*/React.createElement(Ic, {
    n: "search"
  }), /*#__PURE__*/React.createElement("input", {
    placeholder: "Cari mata kuliah, dosen, layanan\u2026"
  })), /*#__PURE__*/React.createElement("button", {
    className: "tz-iconbtn",
    title: "Notifikasi"
  }, /*#__PURE__*/React.createElement(Ic, {
    n: "bell"
  })), /*#__PURE__*/React.createElement("button", {
    className: "tz-iconbtn",
    title: "Keluar",
    onClick: onLogout
  }, /*#__PURE__*/React.createElement(Ic, {
    n: "log-out"
  })), /*#__PURE__*/React.createElement("span", {
    className: "tz-avatar tz-avatar--md"
  }, "AR"));
}

/* ---------- Login ---------- */
function Login({
  onLogin
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: "login"
  }, /*#__PURE__*/React.createElement("div", {
    className: "login__brand"
  }, /*#__PURE__*/React.createElement("img", {
    src: "../../assets/logo-tazkia-inverse.svg",
    alt: "Tazkia",
    style: {
      height: 48
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: "auto",
      maxWidth: 420
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "ds-eyebrow",
    style: {
      color: "var(--orange-300)"
    }
  }, "STMIK Tazkia \xB7 SIAKAD"), /*#__PURE__*/React.createElement("h1", {
    style: {
      fontFamily: "var(--font-serif)",
      fontSize: 42,
      color: "#fff",
      lineHeight: 1.1,
      marginTop: 12,
      letterSpacing: "-0.02em"
    }
  }, "Kampus Luar Biasa"), /*#__PURE__*/React.createElement("p", {
    style: {
      color: "rgba(255,255,255,0.82)",
      fontSize: 16,
      marginTop: 14,
      lineHeight: 1.6
    }
  }, "Sistem Informasi Akademik terpadu \u2014 KRS, jadwal, nilai, dan layanan Tri Dharma dalam satu portal.")), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 28,
      display: "flex",
      gap: 22,
      color: "rgba(187,206,254,0.85)",
      fontSize: 13
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      display: "flex",
      gap: 7,
      alignItems: "center"
    }
  }, /*#__PURE__*/React.createElement(Ic, {
    n: "shield-check"
  }), " Aman & Tervalidasi"), /*#__PURE__*/React.createElement("span", {
    style: {
      display: "flex",
      gap: 7,
      alignItems: "center"
    }
  }, /*#__PURE__*/React.createElement(Ic, {
    n: "git-merge"
  }), " Terintegrasi PDDikti"))), /*#__PURE__*/React.createElement("div", {
    className: "login__form"
  }, /*#__PURE__*/React.createElement("form", {
    className: "login__form-inner",
    onSubmit: e => {
      e.preventDefault();
      onLogin();
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h2", {
    style: {
      fontSize: 26,
      color: "var(--text-strong)"
    }
  }, "Masuk Portal"), /*#__PURE__*/React.createElement("p", {
    className: "muted",
    style: {
      fontSize: 14,
      marginTop: 4
    }
  }, "Gunakan NIM dan kata sandi SIAKAD Anda.")), /*#__PURE__*/React.createElement("div", {
    className: "tz-field"
  }, /*#__PURE__*/React.createElement("label", {
    className: "tz-field__label"
  }, "NIM / NIDN"), /*#__PURE__*/React.createElement("div", {
    className: "tz-inputwrap tz-inputwrap--icon"
  }, /*#__PURE__*/React.createElement("span", {
    className: "tz-inputwrap__icon"
  }, /*#__PURE__*/React.createElement(Ic, {
    n: "user-round"
  })), /*#__PURE__*/React.createElement("input", {
    className: "tz-input",
    defaultValue: "2023010142"
  }))), /*#__PURE__*/React.createElement("div", {
    className: "tz-field"
  }, /*#__PURE__*/React.createElement("label", {
    className: "tz-field__label"
  }, "Kata Sandi"), /*#__PURE__*/React.createElement("div", {
    className: "tz-inputwrap tz-inputwrap--icon"
  }, /*#__PURE__*/React.createElement("span", {
    className: "tz-inputwrap__icon"
  }, /*#__PURE__*/React.createElement(Ic, {
    n: "lock"
  })), /*#__PURE__*/React.createElement("input", {
    className: "tz-input",
    type: "password",
    defaultValue: "********"
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center"
    }
  }, /*#__PURE__*/React.createElement("label", {
    className: "tz-check"
  }, /*#__PURE__*/React.createElement("input", {
    type: "checkbox",
    defaultChecked: true
  }), /*#__PURE__*/React.createElement("span", {
    className: "tz-check__box"
  }, /*#__PURE__*/React.createElement("svg", {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "3",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M20 6 9 17l-5-5"
  }))), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 13
    }
  }, "Ingat saya")), /*#__PURE__*/React.createElement("a", {
    href: "#",
    style: {
      fontSize: 13,
      fontWeight: 600
    }
  }, "Lupa sandi?")), /*#__PURE__*/React.createElement("button", {
    type: "submit",
    className: "tz-btn tz-btn--primary tz-btn--lg tz-btn--block"
  }, "Masuk ", /*#__PURE__*/React.createElement(Ic, {
    n: "arrow-right"
  })), /*#__PURE__*/React.createElement("p", {
    className: "muted",
    style: {
      fontSize: 12,
      textAlign: "center"
    }
  }, "Butuh bantuan? Hubungi BAAK STMIK Tazkia."))));
}
window.SIAKAD = {
  Sidebar,
  Topbar,
  Login,
  Ic,
  D
};
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/siakad/shell.jsx", error: String((e && e.message) || e) }); }

__ds_ns.Avatar = __ds_scope.Avatar;

__ds_ns.Badge = __ds_scope.Badge;

__ds_ns.Button = __ds_scope.Button;

__ds_ns.Card = __ds_scope.Card;

__ds_ns.IconButton = __ds_scope.IconButton;

__ds_ns.ProgressBar = __ds_scope.ProgressBar;

__ds_ns.StatCard = __ds_scope.StatCard;

__ds_ns.Tabs = __ds_scope.Tabs;

__ds_ns.Alert = __ds_scope.Alert;

__ds_ns.Checkbox = __ds_scope.Checkbox;

__ds_ns.Input = __ds_scope.Input;

__ds_ns.Select = __ds_scope.Select;

__ds_ns.Switch = __ds_scope.Switch;

})();
