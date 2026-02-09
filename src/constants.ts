const CONFIG_PATH = './tasktui.config.json';

const KEYBINDS = [
  'm            - Toggle this help menu',
  '↑ or k       - Select previous task',
  '↓ or j       - Select next task',
  'Ctrl-c or q  - Quit',
];

const CLEANUP_TIMEOUT = 10000;

export { CLEANUP_TIMEOUT, CONFIG_PATH, KEYBINDS };
