import fs from 'fs';
import path from 'path';
import chalk from 'chalk';

const CONFIG_FILE_NAME = '.meridianrc.json';

export function saveConfig(cwd, configData) {
  const configPath = path.join(cwd, CONFIG_FILE_NAME);
  try {
    fs.writeFileSync(configPath, JSON.stringify(configData, null, 2), 'utf8');
    console.log(`\n${chalk.green('✨ Configuration saved to')} ${chalk.cyan(CONFIG_FILE_NAME)}`);
  } catch (error) {
    console.error(chalk.red(`Failed to save configuration: ${error.message}`));
  }
}

export function loadConfig(cwd) {
  const configPath = path.join(cwd, CONFIG_FILE_NAME);
  if (fs.existsSync(configPath)) {
    try {
      const data = fs.readFileSync(configPath, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      console.error(chalk.red(`Failed to read configuration: ${error.message}`));
      return null;
    }
  }
  return null;
}
