import { useState } from 'react';
import { View, Text, Pressable } from 'react-native';

const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
const toIso = (y: number, m: number, d: number) => `${y}-${pad(m + 1)}-${pad(d)}`;

const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土'];

interface MonthCalendarProps {
  /** Currently selected day, YYYY-MM-DD. */
  selectedDate: string;
  onSelectDate: (iso: string) => void;
}

// Dependency-free month grid (no date library). Local-time date math avoids the
// UTC off-by-one that bites toISOString(). 6-week grid, tap a day to select.
export default function MonthCalendar({ selectedDate, onSelectDate }: MonthCalendarProps) {
  const now = new Date();
  const todayIso = toIso(now.getFullYear(), now.getMonth(), now.getDate());

  // Visible month — initialised from the selected date.
  const [ref, setRef] = useState(() => {
    const [y, m] = selectedDate.split('-').map(Number);
    return { y, m: m - 1 };
  });

  const startWeekday = new Date(ref.y, ref.m, 1).getDay(); // 0=Sun
  const daysInMonth = new Date(ref.y, ref.m + 1, 0).getDate();

  const cells: (number | null)[] = [];
  for (let i = 0; i < startWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  function shift(delta: number) {
    setRef((r) => {
      const nm = r.m + delta;
      return { y: r.y + Math.floor(nm / 12), m: ((nm % 12) + 12) % 12 };
    });
  }

  return (
    <View className="bg-white rounded-2xl border border-neutral-200 p-3">
      <View className="flex-row items-center justify-between mb-2 px-1">
        <Pressable onPress={() => shift(-1)} className="px-3 py-1 active:opacity-60">
          <Text className="text-brand text-xl">‹</Text>
        </Pressable>
        <Text className="text-base font-bold text-brand">
          {ref.y}年{ref.m + 1}月
        </Text>
        <Pressable onPress={() => shift(1)} className="px-3 py-1 active:opacity-60">
          <Text className="text-brand text-xl">›</Text>
        </Pressable>
      </View>

      <View className="flex-row">
        {WEEKDAYS.map((w, i) => (
          <View key={w} className="flex-1 items-center py-1">
            <Text
              className={`text-xs ${
                i === 0 ? 'text-red-400' : i === 6 ? 'text-blue-400' : 'text-neutral-400'
              }`}
            >
              {w}
            </Text>
          </View>
        ))}
      </View>

      <View className="flex-row flex-wrap">
        {cells.map((d, idx) => {
          if (d === null) return <View key={`b${idx}`} className="w-[14.28%] h-11" />;
          const iso = toIso(ref.y, ref.m, d);
          const isSelected = iso === selectedDate;
          const isToday = iso === todayIso;
          return (
            <Pressable
              key={iso}
              onPress={() => onSelectDate(iso)}
              className="w-[14.28%] h-11 items-center justify-center"
            >
              <View
                className={`w-9 h-9 items-center justify-center rounded-full ${
                  isSelected ? 'bg-brand' : isToday ? 'border border-brand-sage' : ''
                }`}
              >
                <Text
                  className={`text-sm ${
                    isSelected ? 'text-white font-bold' : 'text-neutral-700'
                  }`}
                >
                  {d}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
