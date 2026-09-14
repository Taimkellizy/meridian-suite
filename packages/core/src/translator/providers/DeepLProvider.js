import TranslationProvider from './TranslationProvider.js';
import https from 'https';

class DeepLProvider extends TranslationProvider {
  /**
   * Translates a batch of strings using DeepL API V2.
   * Note: DeepL free API endpoint is api-free.deepl.com, Pro is api.deepl.com. 
   * This implementation assumes the hostname is derived from the API key suffix, or can be passed.
   * For simplicity here we auto-detect based on :fx suffix.
   */
  async translateBatch(strings, targetLang, sourceLang = undefined) {
    if (!strings || strings.length === 0) return [];
    
    return new Promise((resolve, reject) => {
      const isFree = this.apiKey.endsWith(':fx');
      const hostname = isFree ? 'api-free.deepl.com' : 'api.deepl.com';
      
      const requestData = {
        text: strings,
        target_lang: targetLang.toUpperCase(),
        tag_handling: 'xml', // CRITICAL: Treat inputs as XML
        ignore_tags: ['v']   // CRITICAL: Explicitly do NOT translate text within <v> (not strictly necessary for empty elements, but safe)
      };
      
      if (sourceLang) {
        requestData.source_lang = sourceLang.toUpperCase();
      }

      const data = JSON.stringify(requestData);

      const options = {
        hostname: hostname,
        path: '/v2/translate',
        method: 'POST',
        headers: {
          'Authorization': `DeepL-Auth-Key ${this.apiKey}`,
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
              const translatedStrings = json.translations.map(t => t.text);
              resolve(translatedStrings);
            } catch (error) {
              reject(new Error(`Failed to map DeepL response: ${error.message}`));
            }
          } else {
            reject(new Error(`DeepL API error: ${res.statusCode} - ${responseBody}`));
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

export default DeepLProvider;
