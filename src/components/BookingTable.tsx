import { FlatList, View, Text, RefreshControl } from 'react-native';
import AdminCard from './AdminCard';
import StatusBadge from './StatusBadge';
import type { Booking } from '@/api/types';

interface BookingTableProps {
  data: Booking[];
  refreshing?: boolean;
  onRefresh?: () => void;
  onPressItem?: (booking: Booking) => void;
}

// Mobile-friendly replacement for the admin panel's booking TABLE: a FlatList of
// tappable cards. Each row shows customer, date, phone/email, and a status badge.
export default function BookingTable({ data, refreshing, onRefresh, onPressItem }: BookingTableProps) {
  return (
    <FlatList
      data={data}
      keyExtractor={(b) => b.id}
      contentContainerStyle={{ padding: 16 }}
      refreshControl={
        onRefresh ? (
          <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} />
        ) : undefined
      }
      ListEmptyComponent={
        <Text className="text-center text-neutral-400 mt-10">予約はありません</Text>
      }
      renderItem={({ item }) => (
        <AdminCard
          title={item.customer_name || '（名前なし）'}
          subtitle={item.booking_date || ''}
          right={<StatusBadge status={item.status} />}
          onPress={onPressItem ? () => onPressItem(item) : undefined}
        >
          <View className="mt-2 flex-row flex-wrap gap-x-4 gap-y-1">
            {item.customer_phone ? (
              <Text className="text-xs text-neutral-600">📞 {item.customer_phone}</Text>
            ) : null}
            {item.customer_email ? (
              <Text className="text-xs text-neutral-600">✉️ {item.customer_email}</Text>
            ) : null}
          </View>
        </AdminCard>
      )}
    />
  );
}
