import TranslationProvider from './TranslationProvider.js';
import https from 'https';

class GoogleProvider extends TranslationProvider {
  /**
   * Translates a batch of strings using Google Cloud Translation API (v2).
   */
  async translateBatch(strings, targetLang, sourceLang = undefined) {
    if (!strings || strings.length === 0) return [];
    
    return new Promise((resolve, reject) => {
      const data = JSON.stringify({
        q: strings,
        target: targetLang,
        ...(sourceLang && { source: sourceLang }),
        format: 'html' // CRITICAL: Tells Google to respect XML/HTML tags
      });

      const options = {
        hostname: 'translation.googleapis.com',
        path: `/language/translate/v2?key=${this.apiKey}`,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(data)
        }
      };

      const req = https.request(options, (res) => {
        let responseBody = '';

        res.on('data', (chunk) => {
          responseBody += chunk;
        });

        res.on('end', () => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            try {
              const json = JSON.parse(responseBody);
              const translatedStrings = json.data.translations.map(t => t.translatedText);
              // Clean up any HTML entities Google might have returned like &#39;
              const unescapedStrings = translatedStrings.map(str => this._unescapeHtml(str));
              resolve(unescapedStrings);
            } catch (error) {
              reject(new Error(`Failed to map Google Translate response: ${error.message}`));
            }
          } else {
            reject(new Error(`Google API error: ${res.statusCode} - ${responseBody}`));
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

  _unescapeHtml(unsafe) {
    return unsafe
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&#x2F;/g, "/");
  }
}

export default GoogleProvider;
