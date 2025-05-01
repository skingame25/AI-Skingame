import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

// In a real application, this would fetch data from Google Calendar API
const mockMeetings = [
  {
    id: "1",
    title: "Consultation Call",
    attendee: "lead1@example.com",
    date: "2023-05-20T14:00:00Z",
    duration: "30 minutes",
  },
  {
    id: "2",
    title: "Follow-up Meeting",
    attendee: "lead3@example.com",
    date: "2023-05-21T10:30:00Z",
    duration: "45 minutes",
  },
  {
    id: "3",
    title: "Product Demo",
    attendee: "lead4@example.com",
    date: "2023-05-22T15:15:00Z",
    duration: "60 minutes",
  },
]

export default function CalendarPage() {
  return (
    <div className="container mx-auto py-10">
      <h1 className="text-3xl font-bold mb-6">Calendar</h1>

      <Card>
        <CardHeader>
          <CardTitle>Upcoming Meetings</CardTitle>
          <CardDescription>View scheduled meetings with leads</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Time</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Attendee</TableHead>
                <TableHead>Duration</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mockMeetings.map((meeting) => {
                const date = new Date(meeting.date)
                return (
                  <TableRow key={meeting.id}>
                    <TableCell>{date.toLocaleDateString()}</TableCell>
                    <TableCell>{date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</TableCell>
                    <TableCell>{meeting.title}</TableCell>
                    <TableCell>{meeting.attendee}</TableCell>
                    <TableCell>{meeting.duration}</TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
