/** 期間・魚種・釣り方の絞り込み。スクロールしても消えない位置に置くのが要件。 */
export default function FilterBar({ fishes, methods, value, onChange }) {
  const set = (key, v) => onChange({ ...value, [key]: value[key] === v && key !== "days" ? "" : v });

  return (
    <div className="filters" role="group" aria-label="釣況の絞り込み">
      {/* 何で絞っているのかを見出しで示す。並んだボタンだけだと種類の違いが読み取れない。 */}
      <span className="flabel">期間</span>
      {[["1", "今日"], ["3", "3日"], ["7", "1週間"], ["30", "1か月"]].map(([v, label]) => (
        <button key={v} className={`chip${value.days === v ? " on" : ""}`}
          aria-pressed={value.days === v} onClick={() => set("days", v)}>{label}</button>
      ))}

      <span className="flabel">魚種</span>
      {fishes.slice(0, 6).map((f) => (
        <button key={f.slug} className={`chip${value.fish === f.slug ? " on" : ""}`}
          aria-pressed={value.fish === f.slug} onClick={() => set("fish", f.slug)}>{f.name}</button>
      ))}

      <span className="flabel">釣り方</span>
      {methods.map((m) => (
        <button key={m.slug} className={`chip${value.method === m.slug ? " on" : ""}`}
          aria-pressed={value.method === m.slug} onClick={() => set("method", m.slug)}>{m.name}</button>
      ))}
    </div>
  );
}
