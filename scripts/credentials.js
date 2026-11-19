const path = require('node:path');
const dotenv = require('dotenv');

dotenv.config({
  path: path.join(__dirname, '..', 'Resources', '.env'),
  quiet: true,
});

function loadCredentials() {
  const { SIMTRA_USERNAME: username, SIMTRA_PASSWORD: password } = process.env;

  if (!username || !password) {
    throw new Error(
      'SIMTRA_USERNAME and SIMTRA_PASSWORD must be set in Resources/.env or the process environment.',
    );
  }

  return { username, password };
}

module.exports = { loadCredentials };
