import { google } from "googleapis"

// Initialize Google Calendar API
export function getGoogleCalendarClient() {
  const oauth2Client = new google.auth.OAuth2(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET)

  oauth2Client.setCredentials({
    refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
  })

  return google.calendar({ version: "v3", auth: oauth2Client })
}

// Get available time slots
export async function getAvailableTimeSlots(
  startDate: Date,
  endDate: Date,
  duration = 30, // minutes
  timeZone = "Europe/London", // Default to UK time zone
) {
  try {
    const calendar = getGoogleCalendarClient()

    // Get busy times from calendar
    const busyTimesResponse = await calendar.freebusy.query({
      requestBody: {
        timeMin: startDate.toISOString(),
        timeMax: endDate.toISOString(),
        timeZone,
        items: [{ id: "primary" }],
      },
    })

    const busyTimes = busyTimesResponse.data.calendars?.primary?.busy || []

    // Generate time slots (9 AM to 5 PM UK time)
    const timeSlots = []
    const currentDate = new Date(startDate)

    while (currentDate <= endDate) {
      if (currentDate.getDay() !== 0 && currentDate.getDay() !== 6) {
        // Skip weekends
        const dayStart = new Date(currentDate)
        dayStart.setHours(9, 0, 0, 0) // 9 AM UK time

        const dayEnd = new Date(currentDate)
        dayEnd.setHours(17, 0, 0, 0) // 5 PM UK time

        const slotStart = new Date(dayStart)

        while (slotStart < dayEnd) {
          const slotEnd = new Date(slotStart)
          slotEnd.setMinutes(slotStart.getMinutes() + duration)

          // Check if slot overlaps with any busy time
          const isAvailable = !busyTimes.some((busyTime) => {
            const busyStart = new Date(busyTime.start!)
            const busyEnd = new Date(busyTime.end!)

            return (
              (slotStart >= busyStart && slotStart < busyEnd) ||
              (slotEnd > busyStart && slotEnd <= busyEnd) ||
              (slotStart <= busyStart && slotEnd >= busyEnd)
            )
          })

          if (isAvailable) {
            timeSlots.push({
              start: new Date(slotStart),
              end: new Date(slotEnd),
            })
          }

          slotStart.setMinutes(slotStart.getMinutes() + duration)
        }
      }

      // Move to next day
      currentDate.setDate(currentDate.getDate() + 1)
      currentDate.setHours(0, 0, 0, 0)
    }

    return { success: true, timeSlots }
  } catch (error) {
    console.error("Error getting available time slots:", error)
    return { success: false, error }
  }
}

// Book a meeting
export async function bookMeeting(
  email: string,
  startTime: Date,
  endTime: Date,
  summary: string,
  description: string,
  timeZone = "Europe/London", // Default to UK time zone
) {
  try {
    const calendar = getGoogleCalendarClient()

    const event = {
      summary,
      description,
      start: {
        dateTime: startTime.toISOString(),
        timeZone,
      },
      end: {
        dateTime: endTime.toISOString(),
        timeZone,
      },
      attendees: [{ email }],
      reminders: {
        useDefault: true,
      },
      conferenceData: {
        createRequest: {
          requestId: `meet_${Date.now()}`,
          conferenceSolutionKey: {
            type: "hangoutsMeet",
          },
        },
      },
    }

    const response = await calendar.events.insert({
      calendarId: "primary",
      requestBody: event,
      sendUpdates: "all",
      conferenceDataVersion: 1, // Enable Google Meet
    })

    // Extract Google Meet link if available
    const meetUrl = response.data.conferenceData?.entryPoints?.find((ep) => ep.entryPointType === "video")?.uri || null

    return {
      success: true,
      eventId: response.data.id,
      eventLink: response.data.htmlLink,
      meetUrl,
      start: response.data.start?.dateTime,
      end: response.data.end?.dateTime,
    }
  } catch (error) {
    console.error("Error booking meeting:", error)
    return { success: false, error }
  }
}
