/**
 * Tokenizes a string containing i18next variables into a safe format for translation APIs.
 * It identifies standard `{{var}}`, spaced `{{ var }}`, and unescaped `{{{var}}}` patterns.
 * 
 * @param {string} input - The raw string with variables.
 * @returns {{ tokenizedString: string, variableMap: Object }}
 */
function tokenizeString(input) {
  let tokenizedString = '';
  let variableMap = {};
  let mapIndex = 0;
  
  let i = 0;
  while (i < input.length) {
    if (input[i] === '{' && input[i + 1] === '{') {
      let isTriple = input[i + 2] === '{';
      let offset = isTriple ? 3 : 2;
      let startIdx = i;
      let j = startIdx + offset;
      let foundClose = false;
      
      while (j < input.length) {
        if (isTriple && input[j] === '}' && input[j + 1] === '}' && input[j + 2] === '}') {
          foundClose = true;
          break;
        } else if (!isTriple && input[j] === '}' && input[j + 1] === '}') {
          // Verify it's not actually the start of a triple close if we didn't open with triple
          if (input[j + 2] === '}') {
            // It's technically mismatched if we opened double but closed triple.
            // i18next usually just treats it as {{var}}} where the last } is just text.
            foundClose = true;
            break;
          }
          foundClose = true;
          break;
        }
        j++;
      }
      
      if (foundClose) {
        let closeOffset = isTriple ? 3 : 2;
        let fullMatch = input.substring(startIdx, j + closeOffset);
        let innerContent = input.substring(startIdx + offset, j).trim();
        
        variableMap[mapIndex] = {
          full: fullMatch,
          inner: innerContent
        };
        
        tokenizedString += `<v id="${mapIndex}" />`;
        mapIndex++;
        
        i = j + closeOffset;
        continue;
      }
    }
    
    tokenizedString += input[i];
    i++;
  }
  
  return { tokenizedString, variableMap };
}

export { tokenizeString };
