/**
 * Detokenizes a string returned from APIs, replacing XML tags back to original i18next variables.
 * Designed to handle standard self-closing `<v id="X" />` or auto-expanded `<v id="X"></v>` tag formats.
 * 
 * @param {string} translatedString - The translated string containing <v id="X" />
 * @param {Object} variableMap - The map created by the Tokenizer containing original variables
 * @returns {string}
 */
function detokenizeString(translatedString, variableMap) {
  let result = '';
  let i = 0;
  
  while (i < translatedString.length) {
    if (
      translatedString[i] === '<' && 
      translatedString[i + 1] === 'v' && 
      translatedString[i + 2] === ' ' && 
      translatedString[i + 3] === 'i' && 
      translatedString[i + 4] === 'd' && 
      translatedString[i + 5] === '=' && 
      (translatedString[i + 6] === '"' || translatedString[i + 6] === "'")
    ) {
      let quoteType = translatedString[i + 6];
      let idStartIdx = i + 7;
      let j = idStartIdx;
      
      while (j < translatedString.length && translatedString[j] !== quoteType) {
        j++;
      }
      
      if (j < translatedString.length && translatedString[j] === quoteType) {
        let idStr = translatedString.substring(idStartIdx, j);
        let numericId = parseInt(idStr, 10);
        
        // Find the closure of the tag
        let closeIdx = j + 1;
        let isSelfClosing = false;
        
        while (closeIdx < translatedString.length) {
          if (translatedString[closeIdx] === '>') {
            if (translatedString[closeIdx - 1] === '/') {
              isSelfClosing = true;
            }
            break;
          }
          closeIdx++;
        }
        
        if (closeIdx < translatedString.length) {
          let tagEndIdx = closeIdx;
          
          // If it wasn't self closing, the translation API may have auto-expanded it into <v id="X"></v>
          if (!isSelfClosing) {
            let nextChars = translatedString.substring(closeIdx + 1, closeIdx + 5);
            if (nextChars === '</v>') {
              tagEndIdx = closeIdx + 4;
            }
          }
          
          if (variableMap.hasOwnProperty(numericId)) {
            result += variableMap[numericId].full;
            i = tagEndIdx + 1;
            continue;
          }
        }
      }
    }
    
    result += translatedString[i];
    i++;
  }
  
  return result;
}

export { detokenizeString };
