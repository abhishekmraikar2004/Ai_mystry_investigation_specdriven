// tsx versions before the Node 22.22.3 fix call os.userInfo() during startup.
// This environment may not provide a Windows profile to that API.
const os = require('node:os');
if (typeof process.geteuid !== 'function') {
  os.userInfo = () => ({ username: process.env.USERNAME || 'mystery-room' });
}
