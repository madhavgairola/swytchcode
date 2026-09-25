import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

dotenv.config();

// Determine Swytchcode binary path
function resolveSwytchcodeBin(): string {
  if (process.env.SWYTCHCODE_BIN && fs.existsSync(process.env.SWYTCHCODE_BIN)) {
    return process.env.SWYTCHCODE_BIN;
  }

  // Windows global npm path
  const winGlobal = path.join(
    process.env.APPDATA || '',
    'npm',
    'node_modules',
    'swytchcode',
    'node_modules',
    'swytchcode-cli-win32-x64',
    'bin',
    'swytchcode.exe'
  );
  if (fs.existsSync(winGlobal)) {
    return winGlobal;
  }

  // Fallback to 'swytchcode' on PATH
  return 'swytchcode';
}

export const config = {
  port: parseInt(process.env.PORT || '3001', 10),
  geminiApiKey: process.env.GEMINI_API_KEY || '',
  swytchcodeToken: process.env.SWYTCHCODE_TOKEN || '',
  weatherApiKey: process.env.WEATHERAPI_API_KEY || process.env.WEATHER_API_KEY || '',
  resendApiKey: process.env.RESEND_API_KEY || '',
  notionApiKey: process.env.NOTION_API_KEY || '',
  swytchcodeBin: resolveSwytchcodeBin(),
  projectRoot: path.resolve(process.cwd()),
  isDemoMode: (process.env.SWYTCHCODE_MODE || 'sandbox') === 'sandbox',
};
