/**
 * Prompt configurations and dynamic question generators for Meridian Suite CLI.
 */

/**
 * Returns the prompt to choose the setup mode (Quick Start vs Advanced).
 * @returns {import('inquirer').Question[]}
 */
export function getModeQuestion() {
  return [
    {
      type: 'checkbox',
      name: 'mode',
      message: 'How do you want to set up Meridian? (Select strictly ONE using space, then press enter)',
      choices: [
        { name: 'Quick Start (recommended defaults)', value: 'Quick Start' },
        { name: 'Advanced (configure everything manually)', value: 'Advanced' }
      ],
      validate(answer) {
        if (answer.length !== 1) {
          return 'You must select exactly one option.';
        }
        return true;
      }
    }
  ];
}

/**
 * Returns the Quick Start inquirer questions.
 * @param {{ hasTailwind: boolean, version: number | null }} tailwindDetection - Tailwind detection info.
 * @returns {import('inquirer').Question[]}
 */
export function getQuickStartQuestions(tailwindDetection) {
  return [
    {
      type: 'checkbox',
      name: 'languages',
      message: 'Which languages do you want to support?',
      choices: ['en', 'ar', 'es', 'fr', 'de', 'zh'],
      default: ['en', 'ar']
    },
    {
      type: 'confirm',
      name: 'useApi',
      message: 'Do you want to auto-translate extracted strings using an API?',
      default: true
    },
    {
      type: 'checkbox',
      name: 'translationMethod',
      message: 'Which translation provider do you want to use? (Select strictly ONE using space, then press enter)',
      choices: ['Google API', 'DeepL', 'LibreTranslate', 'Mock (Local Testing)'],
      validate(answer) {
        if (answer.length !== 1) {
          return 'You must select exactly one API provider.';
        }
        return true;
      },
      when: (answers) => answers.useApi
    },
    {
      type: 'password',
      name: 'apiKey',
      message: 'Enter your API key:',
      when: (answers) => answers.useApi && answers.translationMethod && (answers.translationMethod[0] === 'Google API' || answers.translationMethod[0] === 'DeepL')
    },
    {
      type: 'input',
      name: 'libreUrl',
      message: 'Enter your LibreTranslate endpoint URL:',
      default: 'https://translate.terraprint.co/translate',
      when: (answers) => answers.useApi && answers.translationMethod && answers.translationMethod[0] === 'LibreTranslate'
    },
    {
      type: 'confirm',
      name: 'hasLibreKey',
      message: 'Do you have an API key for this LibreTranslate instance?',
      default: false,
      when: (answers) => answers.useApi && answers.translationMethod && answers.translationMethod[0] === 'LibreTranslate'
    },
    {
      type: 'password',
      name: 'libreApiKey',
      message: 'Enter your LibreTranslate API/Access Key:',
      when: (answers) => answers.hasLibreKey
    },
    {
      type: 'checkbox',
      name: 'switcherPosition',
      message: 'Where to inject the language switcher? (Select strictly ONE using space, then press enter)',
      choices: ['nav', 'header', 'footer', 'div', 'section', 'li', 'span', 'main', 'aside', 'custom', 'floating element (fixed position)', 'skip'],
      validate: (answer) => {
        if (answer.length !== 1) {
          return 'You must select exactly one option.';
        }
        return true;
      }
    },
    {
      type: 'input',
      name: 'customTag',
      message: 'Enter your custom HTML tag (without brackets, e.g. article, figure):',
      when: (answers) => answers.switcherPosition && answers.switcherPosition[0] === 'custom'
    },
    {
      type: 'checkbox',
      name: 'targetingMethod',
      message: 'How do you want to pinpoint the injection target? (Select strictly ONE using space, then press enter)',
      choices: [
        'By HTML ID (e.g. nav#main-nav)',
        'By file path (e.g. src/components/Navbar.jsx)',
        'No specific target (first matching tag)'
      ],
      when: (answers) => answers.switcherPosition && answers.switcherPosition[0] !== 'skip' && answers.switcherPosition[0] !== 'floating element (fixed position)',
      validate: (answer) => {
        if (answer.length !== 1) {
          return 'You must select exactly one option.';
        }
        return true;
      }
    },
    {
      type: 'input',
      name: 'targetId',
      message: 'Enter the exact HTML ID of the target element (without the #):',
      when: (answers) => answers.targetingMethod && answers.targetingMethod[0].startsWith('By HTML ID')
    },
    {
      type: 'input',
      name: 'targetFilePath',
      message: 'Enter the relative file path from your project root:\n(e.g. src/components/Navbar.jsx)',
      when: (answers) => answers.targetingMethod && answers.targetingMethod[0].startsWith('By file path')
    },
    {
      type: 'confirm',
      name: 'targetFileById',
      message: 'Do you also want to narrow it down by HTML ID within that file?',
      default: false,
      when: (answers) => answers.targetingMethod && answers.targetingMethod[0].startsWith('By file path')
    },
    {
      type: 'input',
      name: 'targetId',
      message: 'Enter the HTML ID (without the #):',
      when: (answers) => answers.targetFileById
    },
    {
      type: 'confirm',
      name: 'setupCI',
      message: 'Do you want to set up a GitHub Action CI workflow to automatically check for un-synced i18n keys on PRs?',
      default: true
    }
  ];
}

/**
 * Returns the Advanced setup inquirer questions.
 * @param {{ hasTailwind: boolean, version: number | null }} tailwindDetection - Tailwind detection info.
 * @returns {import('inquirer').Question[]}
 */
export function getAdvancedQuestions(tailwindDetection) {
  return [
    {
      type: 'checkbox',
      name: 'languages',
      message: 'Which languages do you want to support?',
      choices: ['en', 'ar', 'es', 'fr', 'de', 'zh'],
      default: ['en', 'ar']
    },
    {
      type: 'confirm',
      name: 'installI18next',
      message: 'Do you want to install and initialize i18next?',
      default: true
    },
    {
      type: 'confirm',
      name: 'extractText',
      message: 'Do you want to extract text to JSON automatically?',
      default: true,
      when: (answers) => answers.installI18next
    },
    {
      type: 'confirm',
      name: 'useApi',
      message: 'Do you want to use an API to translate the extracted text?',
      default: true,
      when: (answers) => answers.extractText
    },
    {
      type: 'checkbox',
      name: 'translationMethod',
      message: 'Which API provider should we use? (Select strictly ONE using space, then press enter)',
      choices: ['Google API', 'DeepL', 'LibreTranslate', 'Mock (Local Testing)'],
      validate(answer) {
        if (answer.length !== 1) {
          return 'You must select exactly one API provider.';
        }
        return true;
      },
      when: (answers) => answers.useApi
    },
    {
      type: 'password',
      name: 'apiKey',
      message: 'Enter your API Key:',
      when: (answers) => answers.useApi && answers.translationMethod && (answers.translationMethod[0] === 'Google API' || answers.translationMethod[0] === 'DeepL')
    },
    {
      type: 'input',
      name: 'libreUrl',
      message: 'Enter your LibreTranslate endpoint URL:',
      default: 'https://translate.terraprint.co/translate',
      when: (answers) => answers.useApi && answers.translationMethod && answers.translationMethod[0] === 'LibreTranslate'
    },
    {
      type: 'confirm',
      name: 'hasLibreKey',
      message: 'Do you have an API key for this LibreTranslate instance?',
      default: false,
      when: (answers) => answers.useApi && answers.translationMethod && answers.translationMethod[0] === 'LibreTranslate'
    },
    {
      type: 'password',
      name: 'libreApiKey',
      message: 'Enter your LibreTranslate API/Access Key:',
      when: (answers) => answers.hasLibreKey
    },
    {
      type: 'confirm',
      name: 'wantsSwitcher',
      message: 'Do you want to add a language switcher button component?',
      default: true
    },
    {
      type: 'checkbox',
      name: 'switcherPosition',
      message: 'Where to inject the language switcher? (Select strictly ONE using space, then press enter)',
      choices: ['nav', 'header', 'footer', 'div', 'section', 'li', 'span', 'main', 'aside', 'custom', 'floating element (fixed position)', 'skip'],
      when: (answers) => answers.wantsSwitcher,
      validate: (answer) => {
        if (answer.length !== 1) {
          return 'You must select exactly one option.';
        }
        return true;
      }
    },
    {
      type: 'input',
      name: 'customTag',
      message: 'Enter your custom HTML tag (without brackets, e.g. article, figure):',
      when: (answers) => answers.wantsSwitcher && answers.switcherPosition && answers.switcherPosition[0] === 'custom'
    },
    {
      type: 'checkbox',
      name: 'targetingMethod',
      message: 'How do you want to pinpoint the injection target? (Select strictly ONE using space, then press enter)',
      choices: [
        'By HTML ID (e.g. nav#main-nav)',
        'By file path (e.g. src/components/Navbar.jsx)',
        'No specific target (first matching tag)'
      ],
      when: (answers) => answers.wantsSwitcher && answers.switcherPosition && answers.switcherPosition[0] !== 'skip' && answers.switcherPosition[0] !== 'floating element (fixed position)',
      validate: (answer) => {
        if (answer.length !== 1) {
          return 'You must select exactly one option.';
        }
        return true;
      }
    },
    {
      type: 'input',
      name: 'targetId',
      message: 'Enter the exact HTML ID of the target element (without the #):',
      when: (answers) => answers.targetingMethod && answers.targetingMethod[0].startsWith('By HTML ID')
    },
    {
      type: 'input',
      name: 'targetFilePath',
      message: 'Enter the relative file path from your project root:\n(e.g. src/components/Navbar.jsx)',
      when: (answers) => answers.targetingMethod && answers.targetingMethod[0].startsWith('By file path')
    },
    {
      type: 'confirm',
      name: 'targetFileById',
      message: 'Do you also want to narrow it down by HTML ID within that file?',
      default: false,
      when: (answers) => answers.targetingMethod && answers.targetingMethod[0].startsWith('By file path')
    },
    {
      type: 'input',
      name: 'targetId',
      message: 'Enter the HTML ID (without the #):',
      when: (answers) => answers.targetFileById
    },
    {
      type: 'checkbox',
      name: 'insertMode',
      message: 'How should the button be inserted into the target element? (Select strictly ONE using space, then press enter)',
      choices: ['Append', 'Prepend'],
      default: ['Append'],
      when: (answers) => answers.wantsSwitcher && answers.switcherPosition && answers.switcherPosition[0] !== 'skip' && answers.switcherPosition[0] !== 'floating element (fixed position)',
      validate: (answer) => {
        if (answer.length !== 1) {
          return 'You must select exactly one option.';
        }
        return true;
      }
    },
    {
      type: 'confirm',
      name: 'wantsCustomClass',
      message: 'Do you want to add a custom CSS class to style the button component itself?',
      default: false,
      when: (answers) => answers.wantsSwitcher
    },
    {
      type: 'input',
      name: 'switcherClass',
      message: 'Enter your custom CSS class name(s):',
      when: (answers) => answers.wantsCustomClass
    },
    {
      type: 'confirm',
      name: 'installTailwindLogical',
      message: 'Tailwind CSS detected. Install tailwindcss-logical to add logical property utilities (mis-*, mie-*, pbs-*, etc.)?',
      default: true,
      when: () => tailwindDetection.hasTailwind
    },
    {
      type: 'confirm',
      name: 'installLinters',
      message: 'Do you want to install ESLint/Stylelint plugins?',
      default: true
    },
    {
      type: 'confirm',
      name: 'setupCI',
      message: 'Do you want to set up a GitHub Action CI workflow to automatically check for un-synced i18n keys on PRs?',
      default: true
    }
  ];
}
