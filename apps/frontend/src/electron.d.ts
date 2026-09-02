export {}

declare global {
  interface Window {
    academicOS?: {
      canvas: {
        connect: () => Promise<{ status: 'closed' | 'opening' | 'connected' | 'auth_required' | 'error'; url?: string }>
        status: () => Promise<{ status: string; url: string | null; allowedOrigins: string[] }>
      }
      credentials: {
        set: (key: string, value: string) => Promise<{ stored: boolean }>
        has: (key: string) => Promise<boolean>
      }
    }
  }
}
