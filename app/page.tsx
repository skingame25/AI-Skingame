import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 md:p-24">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle>AI Calling System</CardTitle>
          <CardDescription>Initiate an AI-powered call using Twilio and ElevenLabs</CardDescription>
        </CardHeader>
        <CardContent>
          <CallForm />
        </CardContent>
      </Card>
    </main>
  )
}

function CallForm() {
  return (
    <form action="/api/call" method="POST" className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="phoneNumber">Phone Number</Label>
        <Input id="phoneNumber" name="phoneNumber" placeholder="+1234567890" required />
      </div>

      <div className="space-y-2">
        <Label htmlFor="email">Email Address</Label>
        <Input id="email" name="email" type="email" placeholder="lead@example.com" required />
      </div>

      <div className="space-y-2">
        <Label htmlFor="adSpend">Ad Spend ($)</Label>
        <Input id="adSpend" name="adSpend" type="number" placeholder="1000" required />
      </div>

      <div className="space-y-2">
        <Label htmlFor="firstMessage">First Message</Label>
        <Textarea
          id="firstMessage"
          name="firstMessage"
          placeholder="Hello, this is [Name] calling from [Company]. Is this a good time to talk?"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="prompt">AI Agent Prompt</Label>
        <Textarea
          id="prompt"
          name="prompt"
          placeholder="You are a friendly sales representative. Your goal is to schedule a meeting with the lead. Be conversational and natural."
          required
          className="min-h-[100px]"
        />
      </div>

      <Button type="submit" className="w-full">
        Initiate Call
      </Button>
    </form>
  )
}
