import { type NextRequest, NextResponse } from "next/server"
import { getAvailableTimeSlots, bookMeeting } from "@/lib/google-calendar"
import { logger } from "@/lib/logger"

// API route for getting available time slots
export async function GET(request: NextRequest) {
  try {
    // Get query parameters
    const searchParams = request.nextUrl.searchParams
    const startDateParam = searchParams.get("startDate")
    const endDateParam = searchParams.get("endDate")

    // Default to next 7 days if not provided
    const startDate = startDateParam ? new Date(startDateParam) : new Date()
    const endDate = endDateParam ? new Date(endDateParam) : new Date(startDate)
    endDate.setDate(endDate.getDate() + 7)

    // Get available time slots
    const result = await getAvailableTimeSlots(startDate, endDate)

    if (!result.success) {
      return NextResponse.json({ error: "Failed to get available time slots" }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      timeSlots: result.timeSlots.map((slot) => ({
        start: slot.start.toISOString(),
        end: slot.end.toISOString(),
      })),
    })
  } catch (error) {
    logger.error("Error getting available time slots", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// API route for booking a meeting
export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body = await request.json()
    const { email, startTime, endTime, summary, description } = body

    // Validate inputs
    if (!email || !startTime || !endTime) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Book the meeting
    const result = await bookMeeting(
      email,
      new Date(startTime),
      new Date(endTime),
      summary || "Consultation Call",
      description || `Meeting with ${email}`,
    )

    if (!result.success) {
      return NextResponse.json({ error: "Failed to book meeting" }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      eventId: result.eventId,
      eventLink: result.eventLink,
    })
  } catch (error) {
    logger.error("Error booking meeting", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
