import twilio from "twilio"
import { logger } from "./logger"

// Initialize Twilio client
export const twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)

// Generate TwiML for outbound calls
export function generateTwiML(callData: any) {
  const twiml = new twilio.twiml.VoiceResponse()

  // Add a small pause to ensure the call is established
  twiml.pause({ length: 1 })

  // Instead of using our own WebSocket endpoint, we'll use a simple <Say> action for testing
  twiml.say(
    { voice: "alice" },
    "This is a test call to verify connectivity. Your WebSocket implementation needs to be hosted on a platform that supports WebSocket protocol.",
  )

  // Log the generated TwiML for debugging
  const twimlString = twiml.toString()
  logger.info("Generated TwiML", {
    twimlString,
    callData: JSON.stringify({
      sessionId: callData.sessionId,
      phoneNumber: callData.phoneNumber,
      email: callData.email,
    }),
  })

  return twimlString
}

// Make an outbound call
export async function makeOutboundCall(to: string, callData: any) {
  try {
    logger.info("Making outbound call", {
      to,
      callData: JSON.stringify({
        sessionId: callData.sessionId,
        phoneNumber: callData.phoneNumber,
        email: callData.email,
      }),
    })

    const call = await twilioClient.calls.create({
      to,
      from: process.env.TWILIO_PHONE_NUMBER!,
      twiml: generateTwiML(callData),
      statusCallback: `${process.env.NEXT_PUBLIC_BASE_URL}/api/webhook/twilio-status`,
      statusCallbackEvent: ["initiated", "ringing", "answered", "completed"],
      statusCallbackMethod: "POST",
    })

    logger.info("Outbound call initiated", { callSid: call.sid, status: call.status })
    return { success: true, callSid: call.sid }
  } catch (error) {
    logger.error("Error making outbound call", {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    })
    return { success: false, error }
  }
}
