import fs from 'fs';

function buildJsonReadError(filePath, cause) {
  const error = new Error(`${filePath} is missing or invalid JSON. Run \`meridian init\` first.`);
  error.cause = cause;
  return error;
}

export function readJsonFile(filePath) {
  let raw;
  try {
    raw = fs.readFileSync(filePath, 'utf8');
  } catch (err) {
    throw buildJsonReadError(filePath, err);
  }

  try {
    return JSON.parse(raw);
  } catch (err) {
    throw buildJsonReadError(filePath, err);
  }
}
