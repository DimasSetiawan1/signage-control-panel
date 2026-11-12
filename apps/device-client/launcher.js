const { spawn } = require('child_process');
const electronPath = require('electron');
const path = require('path');

const env = { ...process.env };
delete env.ELECTRON_RUN_AS_NODE;

const mainPath = path.join(__dirname, 'main/index.js');
const child = spawn(electronPath, [mainPath], {
  stdio: 'inherit',
  env,
  windowsHide: false,
});

child.on('close', (code) => {
  process.exit(code || 0);
});

