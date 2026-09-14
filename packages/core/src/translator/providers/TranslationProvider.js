/**
 * Base Abstract class for Translation Providers.
 * Implements the Adapter Pattern to ensure consistent payload processing and 
 * tag preservation configuration across different translation APIs.
 */
class TranslationProvider {
  constructor(apiKey) {
    if (new.target === TranslationProvider) {
      throw new TypeError("Cannot construct Abstract instances directly");
    }
    this.apiKey = apiKey;
  }

  /**
   * Translates a batch of strings.
   * @param {string[]} strings - Array of strings with <v id="X" /> tags.
   * @param {string} targetLang - The target language code (e.g. 'es').
   * @param {string} sourceLang - The source language code (e.g. 'en'). Defaults to undefined.
   * @returns {Promise<string[]>} - The translated strings.
   */
  async translateBatch(strings, targetLang, sourceLang = undefined) {
    throw new Error("translateBatch method must be implemented by subclass");
  }
}

export default TranslationProvider;
