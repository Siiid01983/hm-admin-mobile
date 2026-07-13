// Mirrors the `bookings` table columns exposed by hm-api/rest.php.
export interface Booking {
  id: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  booking_date: string;
  service_id: string | null;
  // JP status labels used across the platform: 新規 / 確認中 / 確定 / 完了 / キャンセル
  status: string;
  notes: string | null;
  items: unknown | null;
  created_at: string;
  updated_at: string;
}

export interface AdminUser {
  id: string;
  email: string;
  name?: string;
  role?: string;
}

// hm-api standard envelope ({ ok, data, error }) — used by admin-login.php,
// rest.php (hm_ok), and the other endpoints.
export interface ApiEnvelope<T> {
  ok: boolean;
  data: T;
  error?: { message?: string; code?: string } | string | null;
}
