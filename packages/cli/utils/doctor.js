import fs from 'fs';
import path from 'path';
import chalk from 'chalk';

function getRegexForLanguages(languages) {
  // Support ['en', 'ar'], ["en", "ar"], ['en','ar'], etc.
  const regexParts = languages.map(lang => `['"]${lang}['"]`);
  const combined = regexParts.join('\\s*,\\s*');
  return new RegExp(`\\[\\s*${combined}\\s*\\]`, 'g');
}

function scanDir(dir, fileList = []) {
  if (!fs.existsSync(dir)) return fileList;
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    if (fs.statSync(filePath).isDirectory()) {
      scanDir(filePath, fileList);
    } else {
      if (/\.(js|jsx|ts|tsx)$/.test(filePath)) {
        fileList.push(filePath);
      }
    }
  }
  return fileList;
}

export function runDoctor(cwd, config) {
  const languages = config.languages || ['en'];
  if (languages.length < 2) {
    console.log(chalk.green('✓ Single language project. No array literals to check.'));
    return;
  }

  console.log(chalk.blue('Scanning project for hardcoded language arrays...'));

  const regex = getRegexForLanguages(languages);
  const dirsToScan = ['src', 'app', 'pages', 'components'].map(d => path.join(cwd, d));
  
  let foundIssues = false;
  
  for (const dir of dirsToScan) {
    const files = scanDir(dir);
    for (const file of files) {
      const content = fs.readFileSync(file, 'utf8');
      
      // Don't warn about the locales file itself
      if (file.replace(/\\/g, '/').includes('/i18n/locales.')) continue;
      
      const matches = [...content.matchAll(regex)];
      if (matches.length > 0) {
        foundIssues = true;
        const relativePath = path.relative(cwd, file);
        console.log(chalk.yellow(`⚠️  Warning: Hardcoded language array found in ${relativePath}`));
        matches.forEach(m => {
          console.log(`   Replace ${chalk.red(m[0])} with an import from src/i18n/locales.ts`);
        });
      }
    }
  }

  if (!foundIssues) {
    console.log(chalk.green('✓ No hardcoded language arrays found!'));
  } else {
    console.log(chalk.blue('\nRecommendation: Run `meridian sync-config` if you haven\'t already to generate src/i18n/locales.ts'));
  }
}
