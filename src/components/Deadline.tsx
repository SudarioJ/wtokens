import { useEffect, useState } from "react";
export function Deadline({ date, label }: { date: string; label: string }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    setNow(Date.now());
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [date]);
  const seconds = Math.max(0, Math.ceil((Date.parse(date) - now) / 1000));
  return (
    <span className="duel-deadline">
      {label}: {Math.floor(seconds / 60)}:
      {String(seconds % 60).padStart(2, "0")}
      {seconds === 0 ? " · actualizando estado…" : ""}
    </span>
  );
}
