"use client";

import { useEffect, useState } from "react";

export function AnalogClock() {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  const hours = time.getHours();
  const minutes = time.getMinutes();
  const seconds = time.getSeconds();

  const hourDeg = (hours % 12) * 30 + minutes * 0.5;
  const minuteDeg = minutes * 6 + seconds * 0.1;
  const secondDeg = seconds * 6;

  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  const dayName = days[time.getDay()];
  const monthName = months[time.getMonth()];
  const date = time.getDate();

  const greeting =
    hours < 12 ? "Good morning" : hours < 17 ? "Good afternoon" : "Good evening";

  const digital = time.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative h-28 w-28 rounded-full bg-white p-2 shadow-[0_8px_32px_rgba(0,0,0,0.08)] ring-1 ring-slate-200/60">
        <svg viewBox="0 0 100 100" className="h-full w-full drop-shadow-sm">
          {/* Face */}
          <circle cx="50" cy="50" r="47" fill="#fafbfc" />
          <circle cx="50" cy="50" r="36" fill="#ffffff" />

          {/* Minute tick marks (60) */}
          {Array.from({ length: 60 }).map((_, i) => {
            const angle = (i * 6 - 90) * (Math.PI / 180);
            const isHour = i % 5 === 0;
            const inner = isHour ? 38 : 41;
            const outer = isHour ? 44 : 43;
            return (
              <line
                key={i}
                x1={50 + inner * Math.cos(angle)}
                y1={50 + inner * Math.sin(angle)}
                x2={50 + outer * Math.cos(angle)}
                y2={50 + outer * Math.sin(angle)}
                stroke={isHour ? "#334155" : "#cbd5e1"}
                strokeWidth={isHour ? 2 : 1}
                strokeLinecap="round"
              />
            );
          })}

          {/* Hour hand */}
          <line
            x1="50" y1="50"
            x2={50 + 18 * Math.cos((hourDeg - 90) * (Math.PI / 180))}
            y2={50 + 18 * Math.sin((hourDeg - 90) * (Math.PI / 180))}
            stroke="#1e293b"
            strokeWidth={3}
            strokeLinecap="round"
          />

          {/* Minute hand */}
          <line
            x1="50" y1="50"
            x2={50 + 26 * Math.cos((minuteDeg - 90) * (Math.PI / 180))}
            y2={50 + 26 * Math.sin((minuteDeg - 90) * (Math.PI / 180))}
            stroke="#1e293b"
            strokeWidth={2}
            strokeLinecap="round"
          />

          {/* Second hand */}
          <line
            x1="50" y1="54"
            x2={50 + 30 * Math.cos((secondDeg - 90) * (Math.PI / 180))}
            y2={50 + 30 * Math.sin((secondDeg - 90) * (Math.PI / 180))}
            stroke="#e11d48"
            strokeWidth={1.2}
            strokeLinecap="round"
          />

          {/* Cap */}
          <circle cx="50" cy="50" r="2.5" fill="#1e293b" />
          <circle cx="50" cy="50" r="1.2" fill="#e11d48" />
        </svg>
      </div>

      <div className="text-center">
        <div className="flex items-baseline justify-center gap-2">
          <p className="text-lg font-bold tracking-tight text-slate-800">
            {digital}
          </p>
          <span className="text-[10px] font-medium text-slate-400">
            {dayName}, {monthName} {date}
          </span>
        </div>
        <p className="mt-0.5 text-[11px] font-medium text-slate-400">{greeting}</p>
      </div>
    </div>
  );
}
