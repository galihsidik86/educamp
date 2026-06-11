Tabs — controlled underline tabs.

```jsx
const [tab, setTab] = React.useState('khs');
<Tabs value={tab} onChange={setTab} tabs={[{value:'krs',label:'KRS'},{value:'khs',label:'KHS'},{value:'transkrip',label:'Transkrip'}]} />
```