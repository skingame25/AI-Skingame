"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function TestWebSocket() {
  const [status, setStatus] = useState<string>("Not connected")
  const [messages, setMessages] = useState<string[]>([])
  const [websocket, setWebsocket] = useState<WebSocket | null>(null)

  const connectWebSocket = () => {
    setStatus("Connecting...")
    setMessages([])

    // Close existing connection if any
    if (websocket && websocket.readyState === WebSocket.OPEN) {
      websocket.close()
    }

    // Get the base URL
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:"
    const wsUrl = `${protocol}//${window.location.host}/api/stream`

    try {
      const ws = new WebSocket(wsUrl)

      ws.onopen = () => {
        setStatus("Connected")
        setMessages((prev) => [...prev, "Connection established"])
        setWebsocket(ws)

        // Send a test message
        ws.send(JSON.stringify({ type: "test", message: "Hello from browser client" }))
      }

      ws.onmessage = (event) => {
        setMessages((prev) => [...prev, `Received: ${event.data}`])
      }

      ws.onerror = (error) => {
        setStatus("Error")
        setMessages((prev) => [...prev, `WebSocket error: ${JSON.stringify(error)}`])
      }

      ws.onclose = () => {
        setStatus("Disconnected")
        setMessages((prev) => [...prev, "Connection closed"])
      }
    } catch (error) {
      setStatus("Error")
      setMessages((prev) => [
        ...prev,
        `Failed to create WebSocket: ${error instanceof Error ? error.message : String(error)}`,
      ])
    }
  }

  const disconnectWebSocket = () => {
    if (websocket) {
      websocket.close()
      setWebsocket(null)
    }
  }

  const sendTestMessage = () => {
    if (websocket && websocket.readyState === WebSocket.OPEN) {
      const message = JSON.stringify({ type: "test", message: "Test message from client" })
      websocket.send(message)
      setMessages((prev) => [...prev, `Sent: ${message}`])
    } else {
      setMessages((prev) => [...prev, "Cannot send message: WebSocket not connected"])
    }
  }

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (websocket) {
        websocket.close()
      }
    }
  }, [websocket])

  return (
    <div className="container mx-auto py-10">
      <Card>
        <CardHeader>
          <CardTitle>WebSocket Test</CardTitle>
          <CardDescription>Test the WebSocket connection to /api/stream</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <p className="font-bold">
              Status:{" "}
              <span
                className={
                  status === "Connected"
                    ? "text-green-500"
                    : status === "Connecting..."
                      ? "text-yellow-500"
                      : status === "Disconnected"
                        ? "text-gray-500"
                        : "text-red-500"
                }
              >
                {status}
              </span>
            </p>
          </div>

          <div className="flex gap-4 mb-6">
            <Button onClick={connectWebSocket} disabled={status === "Connected" || status === "Connecting..."}>
              Connect
            </Button>
            <Button onClick={disconnectWebSocket} disabled={status !== "Connected"} variant="outline">
              Disconnect
            </Button>
            <Button onClick={sendTestMessage} disabled={status !== "Connected"}>
              Send Test Message
            </Button>
          </div>

          <div className="border rounded-md p-4 bg-gray-50 h-64 overflow-y-auto">
            <h3 className="font-semibold mb-2">Messages:</h3>
            {messages.length === 0 ? (
              <p className="text-gray-500 italic">No messages yet</p>
            ) : (
              <ul className="space-y-1">
                {messages.map((msg, index) => (
                  <li key={index} className="text-sm font-mono">
                    {msg}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
