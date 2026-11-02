import 'dotenv/config';
import concurrently from 'concurrently';
import { pythonRuntime } from './python-runtime.mjs';
const python = pythonRuntime();
process.env.PYTHON_COMMAND = python;
const result = concurrently(
  [
    { command: 'node backend/src/index.js', name: 'api' },
    { command: `"${python}" ai-service/run.py`, name: 'ai' },
    { command: 'node backend/scripts/ai-worker.js', name: 'worker' },
    {
      command:
        'node node_modules/vite/bin/vite.js --config frontend/vite.config.js',
      name: 'web',
    },
  ],
  { killOthersOn: ['failure', 'success'], prefix: 'name' },
);
try {
  await result.result;
} catch {
  process.exitCode = 1;
}
