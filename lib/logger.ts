// Enhanced logger for tracking events that works in both Node.js and Edge Runtime
export const logger = {
  info: (message: string, data?: any) => {
    console.log(`[INFO] ${new Date().toISOString()} - ${message}`, data ? JSON.stringify(data) : "")
  },

  error: (message: string, error?: any) => {
    console.error(
      `[ERROR] ${new Date().toISOString()} - ${message}`,
      error instanceof Error ? { message: error.message, stack: error.stack } : error ? JSON.stringify(error) : "",
    )
  },

  warn: (message: string, data?: any) => {
    console.warn(`[WARN] ${new Date().toISOString()} - ${message}`, data ? JSON.stringify(data) : "")
  },

  debug: (message: string, data?: any) => {
    if (process.env.NODE_ENV === "development" || process.env.DEBUG === "true") {
      console.debug(`[DEBUG] ${new Date().toISOString()} - ${message}`, data ? JSON.stringify(data) : "")
    }
  },
}
