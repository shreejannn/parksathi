export type ParkingMode = "credit" | "commercial";
export type BookingStatus = "reserved" | "active" | "completed" | "cancelled";
export type VehicleType = "car" | "bike" | "scooter" | "van" | "other";
export type VerificationStatus = "unverified" | "pending" | "verified" | "rejected";
export type SpotVerificationStatus = "pending" | "verified" | "rejected";

export interface Profile {
  id: string;
  full_name: string | null;
  phone: string | null;
  license_photo_url: string | null;
  avatar_url: string | null;
  credits: number;
  is_host: boolean;
  rating_avg: number;
  rating_count: number;
  date_of_birth: string | null;
  license_number: string | null;
  verification_status: VerificationStatus;
  verification_notes: string | null;
  verification_submitted_at: string | null;
  is_admin: boolean;
  created_at: string;
}

export interface Vehicle {
  id: string;
  owner_id: string;
  nickname: string | null;
  plate_number: string;
  vehicle_type: VehicleType;
  is_default: boolean;
  created_at: string;
}

export interface ParkingSpot {
  id: string;
  host_id: string;
  title: string;
  description: string | null;
  mode: ParkingMode;
  price_per_hour: number;
  credit_per_hour: number;
  latitude: number;
  longitude: number;
  address: string | null;
  total_slots: number;
  available_slots: number;
  is_active: boolean;
  photo_url: string | null;
  rating_avg: number;
  rating_count: number;
  verification_status: SpotVerificationStatus;
  verification_notes: string | null;
  created_at: string;
}

export interface Booking {
  id: string;
  spot_id: string;
  driver_id: string;
  vehicle_id: string | null;
  status: BookingStatus;
  reserved_at: string;
  started_at: string | null;
  ended_at: string | null;
  duration_minutes: number | null;
  mode: ParkingMode;
  credits_charged: number;
  amount_charged: number;
  created_at: string;
}

export interface AppNotification {
  id: string;
  user_id: string;
  title: string;
  body: string | null;
  data: Record<string, unknown> | null;
  is_read: boolean;
  created_at: string;
}

export interface Rating {
  id: string;
  spot_id: string;
  booking_id: string;
  rater_id: string;
  stars: number;
  comment: string | null;
  created_at: string;
}
