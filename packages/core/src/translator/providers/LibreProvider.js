import TranslationProvider from './TranslationProvider.js';
import http from 'http';
import https from 'https';
import { URL } from 'url';

class LibreProvider extends TranslationProvider {
  /**
   * LibreTranslate allows custom instances, so we can pass API URL as well.
   * If not passed, we use the public one (not recommended for large volumes).
   * @param {string} apiKey - Optional for some LibreTranslate instances.
   * @param {string} apiUrl - URL of the LibreTranslate instance.
   */
  constructor(apiKey = '', apiUrl = 'https://translate.terraprint.co/translate') {
    super(apiKey);
    // Ensure the URL ends with /translate if a base URL is provided
    if (!apiUrl.endsWith('/translate')) {
      this.apiUrl = apiUrl.endsWith('/') ? `${apiUrl}translate` : `${apiUrl}/translate`;
    } else {
      this.apiUrl = apiUrl;
    }
  }

  /**
   * Translates a batch of strings using LibreTranslate API.
   */
  async translateBatch(strings, targetLang, sourceLang = undefined) {
    if (!strings || strings.length === 0) return [];
    
    return new Promise((resolve, reject) => {
      const data = JSON.stringify({
        q: strings,
        source: sourceLang || 'auto',
        target: targetLang,
        format: 'html', // CRITICAL: Treat inputs as HTML to avoid translating our tags
        api_key: this.apiKey
      });

      const parsedUrl = new URL(this.apiUrl);
      const requestModule = parsedUrl.protocol === 'https:' ? https : http;

      const options = {
        hostname: parsedUrl.hostname,
        path: parsedUrl.pathname + parsedUrl.search,
        port: parsedUrl.port,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(data)
        }
      };

      const req = requestModule.request(options, (res) => {
        let responseBody = '';

        res.on('data', (chunk) => {
          responseBody += chunk;
        });

        res.on('end', () => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            try {
              const json = JSON.parse(responseBody);
              // LibreTranslate returns an array of translated texts in 'translatedText'
              resolve(json.translatedText);
            } catch (error) {
              reject(new Error(`Failed to map LibreTranslate response: ${error.message}`));
            }
          } else {
            reject(new Error(`LibreTranslate API error: ${res.statusCode} - ${responseBody}`));
          }
        });
      });

      req.on('error', (error) => {
        reject(error);
      });

      req.write(data);
      req.end();
    });
  }
}

export default LibreProvider;
