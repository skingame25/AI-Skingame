// Send data to Go High Level
export async function sendToGoHighLevel(data: any) {
  try {
    const response = await fetch(process.env.GOHIGHLEVEL_WEBHOOK_URL!, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    })

    if (!response.ok) {
      throw new Error(`Go High Level API error: ${response.status}`)
    }

    return { success: true }
  } catch (error) {
    console.error("Error sending data to Go High Level:", error)
    return { success: false, error }
  }
}
