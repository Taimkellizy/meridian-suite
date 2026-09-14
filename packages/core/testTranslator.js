import { TranslatorService } from './src/translator/index.js';
import MockTranslationAdapter from './src/translator/providers/MockTranslationAdapter.js';

async function runTest() {
  console.log('--- Meridian Suite Translation Test ---\n');
  
  // 1. Initialize the Mock Adapter and the Orchestrator
  const mockAdapter = new MockTranslationAdapter();
  const translator = new TranslatorService(mockAdapter);

  // 2. Define a dummy i18next JSON object representing extracted strings
  const testObject = {
    common: {
      greeting: "Hello, {{ userName }}!",
      goodbye: "Goodbye {{{userName}}}, see you later.",
      dashboard: "Welcome to your dashboard.",
    },
    auth: {
      login: {
        success: "Success! Logged in as {{ email }}",
        errors: {
          invalid: "Invalid credentials for {{email}}."
        }
      }
    }
  };

  console.log('Original Object:');
  console.log(JSON.stringify(testObject, null, 2));
  console.log('\nTranslating to Arabic ("AR"). Please wait (~500ms)...\n');

  try {
    // 3. Execute translation
    const result = await translator.translateObject(testObject, 'ar');
    
    console.log('--- Translation Complete ---');
    console.log('Resulting Object:');
    console.log(JSON.stringify(result, null, 2));
    
  } catch (error) {
    console.error('Test failed:', error);
  }
}

runTest();
