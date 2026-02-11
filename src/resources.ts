import fs from 'node:fs';
import path from 'node:path';

export interface ResourcePaths {
    workerExe: string;
    internalFolder: string;
}

export function validateResources(basePath: string): { exists: boolean; missing: string[] } {
    const isWindows = process.platform === 'win32';
    const workerName = isWindows ? 'worker.exe' : 'worker';

    const paths = {
        workerExe: path.join(basePath, workerName),
        internalFolder: path.join(basePath, '_internal')
    };

    const missing: string[] = [];
    if (!fs.existsSync(paths.workerExe)) missing.push(workerName);
    if (!fs.existsSync(paths.internalFolder)) missing.push('_internal folder');

    return {
        exists: missing.length === 0,
        missing
    };
}
