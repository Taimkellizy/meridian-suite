import fs from 'fs';

const API_KEY_PATTERN = /^MERIDIAN_API_KEY=/m;

export function saveApiKeyToEnv(envPath, apiKey) {
  if (!fs.existsSync(envPath)) {
    fs.writeFileSync(envPath, `MERIDIAN_API_KEY=${apiKey}\n`);
    return 'created';
  }

  const content = fs.readFileSync(envPath, 'utf8');
  if (API_KEY_PATTERN.test(content)) {
    return 'exists';
  }

  fs.appendFileSync(envPath, `\nMERIDIAN_API_KEY=${apiKey}\n`);
  return 'appended';
}
