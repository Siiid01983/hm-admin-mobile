import { Calendar } from 'react-native-big-calendar';
import type { Band } from '@/api/calendar';

// One grid block. Bookings render blue (confirmed) / grey (pending); admin
// blocks render dark grey. Blocks span their band's 3-hour window (the backend
// has no finer time than the 4 bands — see CalendarScreen).
export interface GridEvent {
  title: string;
  start: Date;
  end: Date;
  kind: 'booking' | 'block';
  color: string;
  band: Band;
  bookingId?: string;
}

// Scrollable hourly day grid (react-native-big-calendar). Expo Go-safe.
export default function DayGrid({
  date,
  events,
  height,
  onPressEvent,
  onPressCell,
}: {
  date: string; // YYYY-MM-DD
  events: GridEvent[];
  height: number;
  onPressEvent: (e: GridEvent) => void;
  onPressCell: (d: Date) => void;
}) {
  const [y, m, d] = date.split('-').map(Number);
  const dayDate = new Date(y, (m || 1) - 1, d || 1);

  return (
    <Calendar<GridEvent>
      events={events}
      height={height}
      mode="day"
      date={dayDate}
      hourRowHeight={44}
      scrollOffsetMinutes={8 * 60}
      swipeEnabled={false}
      ampm={false}
      onPressEvent={onPressEvent}
      onPressCell={onPressCell}
      eventCellStyle={(e) => ({ backgroundColor: e.color, borderRadius: 8 })}
    />
  );
}
