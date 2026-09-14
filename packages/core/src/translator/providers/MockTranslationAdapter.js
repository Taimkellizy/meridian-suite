import TranslationProvider from './TranslationProvider.js';

/**
 * Mock translation provider for local testing and development.
 * Safely wraps strings to simulate translation without hitting external APIs,
 * ensuring complete preservation of <v id="X" /> tags.
 */
class MockTranslationAdapter extends TranslationProvider {
  /**
   * Initializes the mock provider. API key is not required.
   */
  constructor() {
    super('mock-api-key');
  }

  /**
   * Translates a batch of strings locally by prepending a test flag.
   * Simulates a 500ms network delay.
   * 
   * @param {string[]} strings - Array of strings with <v id="X" /> tags.
   * @param {string} targetLang - The target language code.
   * @returns {Promise<string[]>}
   */
  async translateBatch(strings, targetLang, sourceLang = undefined) {
    if (!strings || strings.length === 0) return [];

    return new Promise((resolve) => {
      setTimeout(() => {
        const prefix = `[TEST_${targetLang.toUpperCase()}] `;
        
        // Simply prepend the prefix to each string. The <v id="X" /> tags 
        // will naturally remain perfectly intact since we're just concatenating.
        const translatedStrings = strings.map(str => `${prefix}${str}`);
        
        resolve(translatedStrings);
      }, 500); // Simulated 500ms latency
    });
  }
}

export default MockTranslationAdapter;
