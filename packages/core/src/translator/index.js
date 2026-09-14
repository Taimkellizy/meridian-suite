import { tokenizeString } from './utils/tokenizer.js';
import { detokenizeString } from './utils/detokenizer.js';

/**
 * Translator orchestrator that utilizes TranslationProvider adapters
 * alongside variable preservation (tokenization/detokenization).
 */
class TranslatorService {
  /**
   * @param {TranslationProvider} provider - The initialized provider instance (e.g., GoogleProvider)
   */
  constructor(provider) {
    this.provider = provider;
  }

  /**
   * Deeply translates a JSON object's values while preserving structural keys.
   * Handles chunking to respect typical provider API limits if necessary.
   * 
   * @param {Object} jsonObj - Nested or flat object mapping translation keys to strings.
   * @param {string} targetLang - The code of the language to translate into.
   * @param {string} sourceLang - (Optional) The original language.
   * @returns {Promise<Object>} A cloned object with translated values.
   */
  async translateObject(jsonObj, targetLang, sourceLang = undefined) {
    if (!jsonObj || typeof jsonObj !== 'object') return jsonObj;

    // Internal separator for flatten/unflatten that cannot appear in i18n
    // keys.  '.' is NOT safe because flat translation keys are full English
    // sentences that routinely contain periods (e.g. "Lorem ipsum dolor. Duis
    // sed…").  A null-byte is impossible in JSON keys.
    const SEP = '\0';

    // 1. Flatten the object to a 1D key-value map
    const flattenObj = (obj, prefix = '') => {
      const flat = {};
      for (const k in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, k)) {
          const pre = prefix.length ? prefix + SEP : '';
          if (typeof obj[k] === 'object' && obj[k] !== null && !Array.isArray(obj[k])) {
            Object.assign(flat, flattenObj(obj[k], pre + k));
          } else if (typeof obj[k] === 'string') {
            flat[pre + k] = obj[k];
          }
        }
      }
      return flat;
    };

    const flatMap = flattenObj(jsonObj);
    const keys = Object.keys(flatMap);
    
    if (keys.length === 0) return jsonObj;

    // 2. Tokenize the values
    const stringArray = [];
    const varMaps = [];

    for (const key of keys) {
      const originalString = flatMap[key];
      const { tokenizedString, variableMap } = tokenizeString(originalString);
      stringArray.push(tokenizedString);
      varMaps.push(variableMap);
    }

    // 3. Translate in chunks
    const CHUNK_SIZE = 100;
    const translatedArray = [];

    for (let i = 0; i < stringArray.length; i += CHUNK_SIZE) {
      const chunk = stringArray.slice(i, i + CHUNK_SIZE);
      const chunkTrans = await this.provider.translateBatch(chunk, targetLang, sourceLang);
      translatedArray.push(...chunkTrans);
    }

    // 4. Detokenize and reconstruct the flat map
    const translatedFlatMap = {};
    for (let i = 0; i < keys.length; i++) {
      const key = keys[i];
      const translatedItem = translatedArray[i] ?? stringArray[i];
      translatedFlatMap[key] = detokenizeString(translatedItem, varMaps[i]);
    }

    // 5. Unflatten the 1D map back into a deep object
    const unflattenObj = (flatObj) => {
      const result = {};
      for (const flatKey in flatObj) {
        if (!Object.prototype.hasOwnProperty.call(flatObj, flatKey)) continue;
        
        const parts = flatKey.split(SEP);
        let current = result;
        
        for (let j = 0; j < parts.length; j++) {
          const part = parts[j];
          if (j === parts.length - 1) {
            current[part] = flatObj[flatKey];
          } else {
            current[part] = current[part] || {};
            current = current[part];
          }
        }
      }
      return result;
    };

    return unflattenObj(translatedFlatMap);
  }
}

export { TranslatorService };
