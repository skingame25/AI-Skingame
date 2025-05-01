import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

// In a real application, this would fetch data from a database
const mockCallHistory = [
  {
    id: "1",
    phoneNumber: "+1234567890",
    email: "lead1@example.com",
    timestamp: "2023-05-15T14:30:00Z",
    duration: "3m 45s",
    outcome: "Meeting Scheduled",
  },
  {
    id: "2",
    phoneNumber: "+1987654321",
    email: "lead2@example.com",
    timestamp: "2023-05-14T10:15:00Z",
    duration: "2m 12s",
    outcome: "No Answer",
  },
  {
    id: "3",
    phoneNumber: "+1555555555",
    email: "lead3@example.com",
    timestamp: "2023-05-13T16:45:00Z",
    duration: "5m 30s",
    outcome: "Meeting Scheduled",
  },
]

export default function CallHistory() {
  return (
    <div className="container mx-auto py-10">
      <h1 className="text-3xl font-bold mb-6">Call History</h1>

      <Card>
        <CardHeader>
          <CardTitle>Recent Calls</CardTitle>
          <CardDescription>View details of recent outbound calls</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Phone Number</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Outcome</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mockCallHistory.map((call) => (
                <TableRow key={call.id}>
                  <TableCell>{new Date(call.timestamp).toLocaleDateString()}</TableCell>
                  <TableCell>{call.phoneNumber}</TableCell>
                  <TableCell>{call.email}</TableCell>
                  <TableCell>{call.duration}</TableCell>
                  <TableCell>{call.outcome}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
