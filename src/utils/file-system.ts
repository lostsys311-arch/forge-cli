import { readFile, writeFile, mkdir, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import fg from 'fast-glob';

export interface FileEntry {
  path: string;
  content: string | Buffer;
  mode?: number;
}

export async function readTextFile(path: string): Promise<string> {
  return readFile(path, 'utf-8');
}

export async function writeTextFile(path: string, content: string): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, content, 'utf-8');
}

export async function writeFiles(files: FileEntry[], baseDir: string): Promise<string[]> {
  const written: string[] = [];
  for (const file of files) {
    const fullPath = join(baseDir, file.path);
    await mkdir(dirname(fullPath), { recursive: true });
    await writeFile(fullPath, file.content, file.mode ? { mode: file.mode } : undefined);
    written.push(file.path);
  }
  return written;
}

export async function readFiles(patterns: string[], baseDir: string): Promise<Map<string, string>> {
  const files = new Map<string, string>();
  const entries = await fg(patterns, { cwd: baseDir, dot: true });
  for (const entry of entries) {
    const content = await readFile(join(baseDir, entry), 'utf-8');
    files.set(entry, content);
  }
  return files;
}

export async function directoryExists(path: string): Promise<boolean> {
  try {
    return (await stat(path)).isDirectory();
  } catch {
    return false;
  }
}

export function directoryExistsSync(path: string): boolean {
  return existsSync(path) && stat(path).then(s => s.isDirectory()).catch(() => false) as unknown as boolean;
}

export async function ensureDir(path: string): Promise<void> {
  await mkdir(path, { recursive: true });
}
