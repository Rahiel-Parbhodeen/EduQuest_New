import path from 'node:path';
import { existsSync } from 'node:fs';
export function pythonRuntime() {
  const local = path.resolve(
    '.venv',
    process.platform === 'win32' ? 'Scripts/python.exe' : 'bin/python',
  );
  return process.env.PYTHON_COMMAND || (existsSync(local) ? local : 'python');
}
