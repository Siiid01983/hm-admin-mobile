import { useState } from 'react';
import { View, Text, Pressable, Alert, type LayoutChangeEvent } from 'react-native';
import { useRouter, type Href } from 'expo-router';
import Screen from '@/components/Screen';
import ErrorState from '@/components/ErrorState';
import DayGrid, { type GridEvent } from '@/components/DayGrid';
import { useBookingsByDate } from '@/hooks/useBookings';
import { useDayAvailability, useToggleBlock } from '@/hooks/useCalendar';
import { isConfirmed } from '@/api/bookings';
import { BANDS, BAND_LABELS, BAND_HOURS, bandFromNotes, bandForHour, type Band } from '@/api/calendar';
import type { Booking } from '@/api/types';

const COLOR_CONFIRMED = '#2563eb'; // blue — confirmed
const COLOR_PENDING = '#9ca3af'; // grey — pending
const COLOR_BLOCKED = '#6b7280'; // dark grey — admin blocked

function todayIso(): string {
  const d = new Date();
  const p = (n: number) => (n < 10 ? `0${n}` : `${n}`);
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}
function addDays(iso: string, delta: number): string {
  const [y, m, d] = iso.split('-').map(Number);
  const dt = new Date(y, m - 1, d + delta);
  const p = (n: number) => (n < 10 ? `0${n}` : `${n}`);
  return `${dt.getFullYear()}-${p(dt.getMonth() + 1)}-${p(dt.getDate())}`;
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <View className="flex-row items-center gap-x-1.5">
      <View style={{ width: 12, height: 12, borderRadius: 3, backgroundColor: color }} />
      <Text className="text-[11px] text-neutral-500">{label}</Text>
    </View>
  );
}

// Calendar — a scrollable hourly Day View grid. Bookings map to colored blocks
// at their band's window (the platform's granularity is the 4 bands, so each
// block spans 3 hours). Tap a booking → detail (Approve/Reject/Edit); tap an
// empty slot → block that band.
export default function CalendarScreen() {
  const router = useRouter();
  const [date, setDate] = useState(todayIso());
  const [gridH, setGridH] = useState(0);

  const avail = useDayAvailability(date);
  const bookings = useBookingsByDate(date);
  const toggle = useToggleBlock(date);

  const [y, mo, d] = date.split('-').map(Number);
  const at = (hour: number) => new Date(y, mo - 1, d, hour, 0, 0);

  const all = bookings.data ?? [];
  const events: GridEvent[] = [];
  const unscheduled: Booking[] = [];

  for (const b of all) {
    const band = bandFromNotes(b.notes);
    if (!band) {
      unscheduled.push(b);
      continue;
    }
    const { start, end } = BAND_HOURS[band];
    events.push({
      title: b.customer_name || '（名前なし）',
      start: at(start),
      end: at(end),
      kind: 'booking',
      color: isConfirmed(b.status) ? COLOR_CONFIRMED : COLOR_PENDING,
      band,
      bookingId: b.id,
    });
  }
  for (const band of BANDS) {
    if (avail.data?.[band] === 'blocked') {
      const { start, end } = BAND_HOURS[band];
      events.push({ title: 'ブロック', start: at(start), end: at(end), kind: 'block', color: COLOR_BLOCKED, band });
    }
  }

  function toggleErr(e: unknown) {
    Alert.alert('エラー', e instanceof Error ? e.message : '更新に失敗しました');
  }

  function onPressEvent(e: GridEvent) {
    if (e.kind === 'booking' && e.bookingId) {
      router.push(`/booking/${e.bookingId}` as Href);
      return;
    }
    if (e.kind === 'block') {
      Alert.alert('ブロック解除', `${BAND_LABELS[e.band]}のブロックを解除しますか？`, [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: '解除',
          onPress: () => toggle.mutate({ band: e.band, block: false }, { onError: toggleErr }),
        },
      ]);
    }
  }

  function onPressCell(cd: Date) {
    const band = bandForHour(cd.getHours());
    if (!band) return;
    if ((avail.data?.[band] ?? 'available') !== 'available') return; // occupied → use event tap
    Alert.alert('時間帯をブロック', `${BAND_LABELS[band]} をブロックしますか？`, [
      { text: 'キャンセル', style: 'cancel' },
      { text: 'ブロック', onPress: () => toggle.mutate({ band, block: true }, { onError: toggleErr }) },
    ]);
  }

  return (
    <Screen title="スケジュール">
      {/* Day selector */}
      <View className="flex-row items-center justify-between px-4 py-2 border-b border-neutral-200 bg-white">
        <Pressable
          onPress={() => setDate(addDays(date, -1))}
          className="px-3 py-1.5 rounded-lg bg-neutral-100 active:opacity-70"
        >
          <Text className="text-brand text-lg">‹</Text>
        </Pressable>
        <Pressable onPress={() => setDate(todayIso())}>
          <Text className="text-base font-bold text-brand">{date}</Text>
        </Pressable>
        <Pressable
          onPress={() => setDate(addDays(date, 1))}
          className="px-3 py-1.5 rounded-lg bg-neutral-100 active:opacity-70"
        >
          <Text className="text-brand text-lg">›</Text>
        </Pressable>
      </View>

      {unscheduled.length > 0 ? (
        <View className="px-3 pt-2 flex-row flex-wrap gap-2">
          <Text className="text-[11px] text-neutral-400 w-full">時間未設定の予約</Text>
          {unscheduled.map((b) => (
            <Pressable
              key={b.id}
              onPress={() => router.push(`/booking/${b.id}` as Href)}
              className="px-3 py-1.5 rounded-full bg-neutral-100 active:opacity-70"
            >
              <Text className="text-xs text-neutral-700">{b.customer_name || '（名前なし）'}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}

      <View className="flex-row gap-x-4 px-4 py-2">
        <Legend color={COLOR_CONFIRMED} label="確定" />
        <Legend color={COLOR_PENDING} label="保留" />
        <Legend color={COLOR_BLOCKED} label="ブロック" />
      </View>

      <View className="flex-1" onLayout={(e: LayoutChangeEvent) => setGridH(e.nativeEvent.layout.height)}>
        {bookings.isError || avail.isError ? (
          <ErrorState
            message="読み込みに失敗しました"
            onRetry={() => {
              bookings.refetch();
              avail.refetch();
            }}
          />
        ) : gridH > 0 ? (
          <DayGrid
            date={date}
            events={events}
            height={gridH}
            onPressEvent={onPressEvent}
            onPressCell={onPressCell}
          />
        ) : null}
      </View>
    </Screen>
  );
}
