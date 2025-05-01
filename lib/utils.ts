import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Validate phone number format
export function isValidPhoneNumber(phoneNumber: string): boolean {
  // Basic validation for E.164 format (e.g., +1234567890)
  return /^\+[1-9]\d{1,14}$/.test(phoneNumber)
}

// Validate email format
export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

// Generate a unique session ID
export function generateSessionId(): string {
  return `session_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`
}

// Format date for display with time zone support
export function formatDate(date: Date, timeZone = "UTC"): string {
  return date.toLocaleString("en-GB", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    timeZone: timeZone,
    timeZoneName: "short",
  })
}
