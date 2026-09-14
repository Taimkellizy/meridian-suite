#!/usr/bin/env node

import { program } from 'commander';
import chalk from 'chalk';
import chalkAnimation from 'chalk-animation';
import figlet from 'figlet';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import inquirer from 'inquirer';
import { createSpinner } from 'nanospinner';
import { saveConfig } from '../utils/config.js';
import { detectTailwind, runModifications } from '../utils/runner.js';
import { runTranslations } from '../utils/translator-runner.js';
import { runSync } from '../utils/sync-runner.js';
import { runSyncConfig } from '../utils/sync-config.js';
import { runDoctor } from '../utils/doctor.js';
import { getActiveAdapterInstance } from '../utils/adapter-utils.js';
import { getToggleTemplate, detectAdapter } from '@meridian/core';
import { getModeQuestion, getQuickStartQuestions, getAdvancedQuestions } from '../utils/prompts.js';
import { checkEnvironment } from '../utils/envChecker.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Get version from package.json
const packageJsonPath = path.join(__dirname, '../package.json');
let version = '1.0.0';
try {
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  version = packageJson.version;
} catch (e) {
  // fallback if file not found
}

program
  .name('meridian')
  .description('Meridian Suite: The ultimate i18n automation tool')
  .version(version);

program
  .command('init')
  .description('Initialize meridian in your project and setup i18n')
  .option('--adapter <adapter>', 'Specify translation adapter: pages-router or app-router')
  .action(async (options) => {
    // Display Banner
    console.log('');
    console.log(chalk.cyan(figlet.textSync('MERIDIAN', { font: 'isometric3', horizontalLayout: 'fitted' })));
    console.log(chalk.bold.blue('Welcome to the Meridian Suite CLI!\n'));
    
    // Environment Pre-flight Check
    const envData = checkEnvironment(process.cwd());
    if (envData.status === 'unsupported') {
      console.log(chalk.red('❌ Initialization Aborted.'));
      console.log(chalk.red(envData.reason));
      process.exit(1);
    }

    const projectRoot = process.cwd();
    let detected;
    try {
      detected = detectAdapter(projectRoot, options.adapter);
      console.log(chalk.green(`✓ Selected adapter "${detected.name}" because: ${detected.reason}`));
    } catch (err) {
      console.log(chalk.red(`❌ Error: ${err.message}`));
      process.exit(1);
    }

    const meridianDir = path.join(projectRoot, '.meridian');
    if (!fs.existsSync(meridianDir)) {
      fs.mkdirSync(meridianDir, { recursive: true });
    }
    fs.writeFileSync(
      path.join(meridianDir, 'config.json'),
      JSON.stringify({ adapter: detected.name }, null, 2),
      'utf8'
    );

    /**
     * @typedef {Object} ModeAnswer
     * @property {string[]} mode
     */

    /** @type {ModeAnswer} */
    const { mode } = await inquirer.prompt(getModeQuestion());

    /** @type {Object} */
    let answers;
    const tailwindDetection = detectTailwind(projectRoot);

    if (mode[0] === 'Quick Start') {
      /** @type {Object} */
      const qsAnswers = await inquirer.prompt(getQuickStartQuestions(tailwindDetection));

      answers = {
        languages: qsAnswers.languages,
        installI18next: true,
        extractText: true,
        useApi: qsAnswers.useApi,
        translationMethod: qsAnswers.translationMethod ? qsAnswers.translationMethod : undefined,
        apiKey: qsAnswers.apiKey,
        libreUrl: qsAnswers.libreUrl,
        hasLibreKey: qsAnswers.hasLibreKey || false,
        libreApiKey: qsAnswers.libreApiKey,
        wantsSwitcher: true,
        switcherPosition: qsAnswers.switcherPosition,
        customTag: qsAnswers.customTag,
        insertMode: ['append'],
        targetingMethod: qsAnswers.targetingMethod,
        targetFilePath: qsAnswers.targetFilePath,
        targetFileById: qsAnswers.targetFileById,
        targetId: qsAnswers.targetId,
        wantsCustomClass: false,
        installTailwindLogical: tailwindDetection.hasTailwind,
        installLinters: false,
        setupCI: qsAnswers.setupCI
      };

      const summaryLines = [
        'Quick Start Configuration Summary',
        '---------------------------------',
        `Languages: ${qsAnswers.languages.join(', ')}`,
        `Auto-translate: ${qsAnswers.useApi}`,
        ...(qsAnswers.useApi && qsAnswers.translationMethod ? [`API Provider: ${qsAnswers.translationMethod[0]}`] : []),
        `Install i18next: true`,
        `Extract Text: true`,
        `Add Switcher: ${qsAnswers.switcherPosition[0] !== 'skip'}`,
        ...(qsAnswers.switcherPosition[0] !== 'skip' ? [`Switcher Position: ${qsAnswers.switcherPosition[0] === 'custom' ? qsAnswers.customTag : qsAnswers.switcherPosition[0]}`] : []),
        `Insert Mode: append`,
        `Target Method: ${qsAnswers.targetingMethod ? qsAnswers.targetingMethod[0] : 'None'}`,
        ...(qsAnswers.targetFilePath ? [`Target File: ${qsAnswers.targetFilePath}`] : []),
        ...(qsAnswers.targetId ? [`Target ID: ${qsAnswers.targetId}`] : []),
        `Custom Class: false`,
        ...(tailwindDetection.hasTailwind ? ['Tailwind logical utilities: enabled'] : []),
        `Install Linters: false`,
        `Setup GitHub CI: ${qsAnswers.setupCI ? 'true' : 'false'}`
      ];

      /**
       * Prints a bordered summary box for the applied settings.
       * @param {string[]} lines - Text lines to display in the box.
       */
      const printSummaryBox = (lines) => {
        const width = Math.max(...lines.map(l => l.length)) + 4;
        console.log('┌' + '─'.repeat(width - 2) + '┐');
        lines.forEach(line => {
          console.log('│ ' + line.padEnd(width - 4) + ' │');
        });
        console.log('└' + '─'.repeat(width - 2) + '┘');
      };
      
      console.log('');
      printSummaryBox(summaryLines);
      console.log('');
      console.log('Run `meridian sync` any time to extract and translate new strings.\n');

    } else {
      answers = await inquirer.prompt(getAdvancedQuestions(tailwindDetection));
    }

    if (envData.nextjsWarning) {
      console.log(chalk.blue(envData.nextjsWarning));
    }
    if (envData.status === 'legacy') {
      console.log(chalk.yellow('⚠️  Legacy environment detected. Meridian will install compatibility-friendly versions of i18next to prevent build errors.'));
    }

    const spinner = createSpinner('Initializing Meridian...').start();
    
    // Simulate work
    await new Promise((r) => setTimeout(r, 1000));
    
    let providerName = 'manual';
    let endpointUrl = '';
    let collectedApiKey = '';

    if (answers.useApi && answers.translationMethod && answers.translationMethod.length > 0) {
      const selected = answers.translationMethod[0];
      if (selected === 'Google API') {
        providerName = 'google';
        collectedApiKey = answers.apiKey;
      } else if (selected === 'DeepL') {
        providerName = 'deepl';
        collectedApiKey = answers.apiKey;
      } else if (selected === 'LibreTranslate') {
        providerName = 'libre';
        endpointUrl = answers.libreUrl || 'https://translate.terraprint.co/translate';
        if (answers.hasLibreKey) {
          collectedApiKey = answers.libreApiKey;
        }
      } else if (selected === 'Mock (Local Testing)') {
        providerName = 'mock';
      }
    }

    /**
     * Resolves the targeting parameters based on user answers.
     * @param {Object} ans - The prompt answers.
     * @returns {Object} The resolved id and filePath.
     */
    function resolveTargeting(ans) {
      const method = ans.targetingMethod ? ans.targetingMethod[0] : null;
      if (method && method.startsWith('By HTML ID')) {
        return { id: ans.targetId, filePath: undefined };
      } else if (method && method.startsWith('By file path')) {
        return { filePath: ans.targetFilePath, id: ans.targetFileById ? ans.targetId : undefined };
      }
      return { id: undefined, filePath: undefined };
    }

    const configData = {
      version: '1.0',
      languages: answers.languages,
      defaultLanguage: 'en',
      i18next: answers.installI18next,
      extractText: answers.extractText || false,
      translation: answers.extractText && answers.useApi ? {
        provider: providerName,
        fallback: 'manual',
        ...(endpointUrl && { endpointUrl })
      } : false,
      languageSwitcher: answers.wantsSwitcher && answers.switcherPosition && answers.switcherPosition[0] !== 'skip' ? {
        position: {
          tag: answers.switcherPosition[0] === 'floating element (fixed position)' ? undefined : (answers.switcherPosition[0] === 'custom' ? answers.customTag : answers.switcherPosition[0]),
          floating: answers.switcherPosition[0] === 'floating element (fixed position)',
          ...resolveTargeting(answers),
          insertMode: answers.insertMode && answers.insertMode[0] ? answers.insertMode[0].toLowerCase() : 'append'
        },
        customClass: answers.wantsCustomClass ? answers.switcherClass : '',
        showFlags: true
      } : false,
      tailwind: tailwindDetection.hasTailwind ? {
        detected: true,
        version: tailwindDetection.version,
        install: Boolean(answers.installTailwindLogical)
      } : {
        detected: false,
        version: null,
        install: false
      },
      linters: answers.installLinters
    };

    saveConfig(process.cwd(), configData);
    
    let keySavedMsg = '';
    if (collectedApiKey) {
      const envPath = path.join(process.cwd(), '.env');
      if (fs.existsSync(envPath)) {
        fs.appendFileSync(envPath, `\nMERIDIAN_API_KEY=${collectedApiKey}\n`);
      } else {
        fs.writeFileSync(envPath, `MERIDIAN_API_KEY=${collectedApiKey}\n`);
      }
      
      const gitignorePath = path.join(process.cwd(), '.gitignore');
      if (fs.existsSync(gitignorePath)) {
        let gitignoreContent = fs.readFileSync(gitignorePath, 'utf8');
        let toAppend = '';
        if (!gitignoreContent.includes('.env')) {
          toAppend += '\n.env\n';
        }
        if (!gitignoreContent.includes('.meridian/last-sync')) {
          toAppend += '\n.meridian/last-sync\n';
        }
        if (!gitignoreContent.includes('.meridian/last-data-scan.json')) {
          toAppend += '\n.meridian/last-data-scan.json\n';
        }
        if (toAppend) {
          fs.appendFileSync(gitignorePath, toAppend);
        }
      }
      keySavedMsg = chalk.green('\n   ✓ API key safely stored in .env and ignored in Git.');
    }

    if (answers.setupCI) {
      const workflowsDir = path.join(process.cwd(), '.github', 'workflows');
      if (!fs.existsSync(workflowsDir)) {
        fs.mkdirSync(workflowsDir, { recursive: true });
      }
      const ciPath = path.join(workflowsDir, 'i18n-check.yml');
      if (!fs.existsSync(ciPath)) {
        const ciContent = `name: i18n Check

on:
  pull_request:
    branches: [ "main", "master" ]

jobs:
  check-translations:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
      - name: Install dependencies
        run: npm ci
      - name: Run Meridian Sync Check
        run: npx meridian sync --check --ci
`;
        fs.writeFileSync(ciPath, ciContent, 'utf8');
        keySavedMsg += chalk.green('\n   ✓ Created GitHub Action workflow at .github/workflows/i18n-check.yml');
      }
    }

    spinner.success({ text: 'Initialization complete!' });
    if (keySavedMsg) console.log(keySavedMsg);
    
    // Execute Modifications
    await runModifications(process.cwd(), configData, envData.dependencies);
  });

program
  .command('sync [languages...]')
  .description('Sync newly added or changed strings from data files to the translation pipeline')
  .option('-f, --force', 'Force writing changes even if array reordering warning is triggered')
  .option('--check', 'Run reconciliation check')
  .option('--ci', 'Exit with code 1 if check fails')
  .option('--prune', 'Remove orphaned keys during sync')
  .option('--migrate-value', 'Migrate translation values when data file keys are renamed')
  .option('--no-extract', 'Skip incremental extraction of new strings from JSX')
  .action(async (cliLanguages, options) => {
    const configPath = path.join(process.cwd(), '.meridianrc.json');
    if (!fs.existsSync(configPath)) {
      console.log(chalk.red('❌ Error: .meridianrc.json not found. Run `meridian init` first.'));
      process.exit(1);
    }

    try {
      const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      const spinner = createSpinner('Syncing data files...').start();
      await runSync(process.cwd(), config, spinner, cliLanguages, options);
    } catch (err) {
      console.log(chalk.red(`\n❌ Error running sync: ${err.message}`));
    }
  });

program
  .command('translate [languages...]')
  .description('Sync and translate new strings found in your en/translation.json file')
  .action(async (cliLanguages) => {
    const configPath = path.join(process.cwd(), '.meridianrc.json');
    if (!fs.existsSync(configPath)) {
      console.log(chalk.red('❌ Error: .meridianrc.json not found. Run meridian init first.'));
      return;
    }

    try {
      const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      if (!config.translation) {
        console.log(chalk.yellow('⚠️  Translation is disabled or not configured in .meridianrc.json.'));
        return;
      }
      
      if (cliLanguages && cliLanguages.length > 0) {
        const newLangs = cliLanguages.filter(lang => !config.languages.includes(lang) && lang !== config.defaultLanguage);
        if (newLangs.length > 0) {
          config.languages.push(...newLangs);
          fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf8');
          console.log(chalk.green(`✓ Added new target language(s) to configuration: ${newLangs.join(', ')}`));
          
          // Regenerate single source of truth locales.ts/js
          try {
            runSyncConfig(process.cwd(), config);
          } catch (e) {
            console.log(chalk.red(`  ❌ Failed to regenerate locales configuration: ${e.message}`));
          }

          // Update active adapter configurations (e.g. next-i18next.config.js, next.config.js, middleware)
          let isNextJs = false;
          try {
            const adapter = getActiveAdapterInstance(process.cwd());
            isNextJs = ['next-i18next', 'next-intl'].includes(adapter.name);
            await adapter.injectRuntime(process.cwd(), config.languages);
            console.log(chalk.green(`✓ Updated configuration in next.config.js and adapter runtime.`));
          } catch (e) {
            console.log(chalk.red(`  ❌ Failed to update adapter runtime config: ${e.message}`));
          }

          if (config.i18next) {
              const i18nPath = path.join(process.cwd(), 'src', 'i18n.js');
              if (fs.existsSync(i18nPath)) {
                  let i18nContent = fs.readFileSync(i18nPath, 'utf8');
                  const supportedLngsRegex = /supportedLngs:\s*\[.*?\]/;
                  if (supportedLngsRegex.test(i18nContent)) {
                      i18nContent = i18nContent.replace(supportedLngsRegex, `supportedLngs: ${JSON.stringify(config.languages)}`);
                      fs.writeFileSync(i18nPath, i18nContent, 'utf8');
                      console.log(chalk.green(`✓ Updated supportedLngs inside src/i18n.js to include new languages.`));
                  }
              }
          }
          
          if (config.languageSwitcher) {
              const { updateToggle } = await inquirer.prompt([{
                  type: 'confirm',
                  name: 'updateToggle',
                  message: 'Do you want to regenerate your LanguageToggle component to include the new languages? (Warning: This will overwrite customizations)',
                  default: true
              }]);
              
              if (updateToggle) {
                  let foundPath = null;
                  const compPaths = [
                    'src/components/LanguageToggle.tsx',
                    'src/components/LanguageToggle.jsx', 
                    'app/components/LanguageToggle.tsx',
                    'app/components/LanguageToggle.jsx', 
                    'components/LanguageToggle.tsx',
                    'components/LanguageToggle.jsx',
                    'src/LanguageToggle.tsx',
                    'src/LanguageToggle.jsx'
                  ];
                  for (const sp of compPaths) {
                      const full = path.join(process.cwd(), sp);
                      if (fs.existsSync(full)) {
                          foundPath = full;
                          break;
                      }
                  }
                  
                  if (foundPath) {
                      const isTs = foundPath.endsWith('.tsx');
                      fs.writeFileSync(foundPath, getToggleTemplate(config.languages, isNextJs, isTs), 'utf8');
                      console.log(chalk.green(`✓ Regenerated Language Toggle at ${path.relative(process.cwd(), foundPath)}`));
                  } else {
                      console.log(chalk.yellow(`⚠️ LanguageToggle.jsx not found in standard paths. You may need to update the options list manually.`));
                  }
              }
          }
        }
      }

      const spinner = createSpinner('Starting translation pipeline...').start();
      await runTranslations(process.cwd(), config, spinner, cliLanguages);
      spinner.success({ text: 'Translation pipeline finished!' });
    } catch (err) {
      console.log(chalk.red(`❌ Error running translations: ${err.message}`));
    }
  });

program
  .command('add-button')
  .description('Injects the frontend structural language toggle')
  .option('-p, --position <position>', 'Where to inject (e.g., nav, header, floating, custom)')
  .option('--tag <tag>', 'Custom HTML tag if position is custom')
  .option('--id <id>', 'Target element HTML ID')
  .option('--file <file>', 'Target file path')
  .option('--mode <mode>', 'Insert mode: append or prepend', 'append')
  .option('--class <className>', 'Custom CSS class for the toggle')
  .action(async (options) => {
    const configPath = path.join(process.cwd(), '.meridianrc.json');
    if (!fs.existsSync(configPath)) {
      console.log(chalk.red('❌ Error: .meridianrc.json not found. Run `meridian init` first.'));
      process.exit(1);
    }

    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

    if (!options.position && !options.file) {
      console.log(chalk.yellow('⚠️  Please provide a --position (e.g., nav) or --file path (e.g., src/components/Header.jsx)'));
      process.exit(1);
    }

    config.languageSwitcher = {
        position: {
            tag: options.position === 'floating' ? undefined : (options.position === 'custom' ? options.tag : options.position),
            floating: options.position === 'floating',
            id: options.id,
            filePath: options.file,
            insertMode: options.mode.toLowerCase()
        },
        customClass: options.class || '',
        showFlags: true
    };

    saveConfig(process.cwd(), config);
    console.log(chalk.green('✓ Configuration updated for Language Switcher.'));

    const runConfig = { ...config, translation: false, i18next: false, extractText: false };

    await runModifications(process.cwd(), runConfig);
  });

program
  .command('sync-config')
  .description('Generate src/i18n/locales.ts from .meridianrc.json')
  .action(() => {
    const configPath = path.join(process.cwd(), '.meridianrc.json');
    if (!fs.existsSync(configPath)) {
      console.log(chalk.red('❌ Error: .meridianrc.json not found. Run `meridian init` first.'));
      process.exit(1);
    }
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    try {
      runSyncConfig(process.cwd(), config);
    } catch (err) {
      console.log(chalk.red(`❌ Error running sync-config: ${err.message}`));
    }
  });

program
  .command('doctor')
  .description('Scan project for issues like hardcoded language arrays')
  .action(() => {
    const configPath = path.join(process.cwd(), '.meridianrc.json');
    if (!fs.existsSync(configPath)) {
      console.log(chalk.red('❌ Error: .meridianrc.json not found. Run `meridian init` first.'));
      process.exit(1);
    }
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    try {
      runDoctor(process.cwd(), config);
    } catch (err) {
      console.log(chalk.red(`❌ Error running doctor: ${err.message}`));
    }
  });

program.parse(process.argv);

if (!process.argv.slice(2).length) {
  program.outputHelp();
}
