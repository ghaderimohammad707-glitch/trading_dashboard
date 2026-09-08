/// <reference types="vite/client" />

// Environment variables for Vite
interface ImportMetaEnv {
  readonly VITE_TELEGRAM_BOT_TOKEN: string;
  readonly VITE_TELEGRAM_CHAT_ID: string;
  readonly VITE_API_BASE_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
