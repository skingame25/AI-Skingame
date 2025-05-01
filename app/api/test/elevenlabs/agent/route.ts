import { NextResponse } from "next/server"
import { logger } from "@/lib/logger"

export async function GET() {
  try {
    logger.info("Testing ElevenLabs agent")

    // Verify environment variables
    if (!process.env.ELEVENLABS_API_KEY) {
      return NextResponse.json(
        {
          success: false,
          message: "ELEVENLABS_API_KEY is not set",
        },
        { status: 400 },
      )
    }

    if (!process.env.ELEVENLABS_AGENT_ID) {
      return NextResponse.json(
        {
          success: false,
          message: "ELEVENLABS_AGENT_ID is not set",
        },
        { status: 400 },
      )
    }

    // Get agent details
    const response = await fetch(`https://api.elevenlabs.io/v1/convai/agents/${process.env.ELEVENLABS_AGENT_ID}`, {
      headers: {
        "xi-api-key": process.env.ELEVENLABS_API_KEY!,
      },
    })

    if (!response.ok) {
      const errorText = await response.text()
      logger.error("Failed to get ElevenLabs agent details", {
        status: response.status,
        statusText: response.statusText,
        errorText,
      })
      return NextResponse.json(
        {
          success: false,
          message: "Failed to get ElevenLabs agent details",
          error: `API error: ${response.status} - ${errorText}`,
        },
        { status: 400 },
      )
    }

    const data = await response.json()
    logger.info("Successfully retrieved ElevenLabs agent details", {
      agentId: process.env.ELEVENLABS_AGENT_ID,
      agentName: data.name,
    })

    // Test getting a signed URL
    const signedUrlResponse = await fetch(
      `https://api.elevenlabs.io/v1/convai/conversation/get_signed_url?agent_id=${process.env.ELEVENLABS_AGENT_ID}`,
      {
        headers: {
          "xi-api-key": process.env.ELEVENLABS_API_KEY!,
        },
      },
    )

    if (!signedUrlResponse.ok) {
      const errorText = await signedUrlResponse.text()
      logger.error("Failed to get ElevenLabs signed URL", {
        status: signedUrlResponse.status,
        statusText: signedUrlResponse.statusText,
        errorText,
      })
      return NextResponse.json(
        {
          success: false,
          message: "Failed to get ElevenLabs signed URL",
          error: `API error: ${signedUrlResponse.status} - ${errorText}`,
        },
        { status: 400 },
      )
    }

    const signedUrlData = await signedUrlResponse.json()

    return NextResponse.json({
      success: true,
      message: "ElevenLabs agent is working correctly",
      agent: {
        id: process.env.ELEVENLABS_AGENT_ID,
        name: data.name,
        description: data.description,
      },
      signedUrl: {
        available: !!signedUrlData.signed_url,
        preview: signedUrlData.signed_url ? signedUrlData.signed_url.substring(0, 50) + "..." : null,
      },
    })
  } catch (error) {
    logger.error("Error testing ElevenLabs agent", {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    })
    return NextResponse.json(
      {
        success: false,
        message: "Error testing ElevenLabs agent",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
