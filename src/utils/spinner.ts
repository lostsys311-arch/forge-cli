import picocolors from 'picocolors';

type OraSpawn = {
  start: (t?: string) => OraSpawn;
  stop: () => OraSpawn;
  succeed: (t?: string) => OraSpawn;
  fail: (t?: string) => OraSpawn;
  warn: (t?: string) => OraSpawn;
  info: (t?: string) => OraSpawn;
  isSpinning: boolean;
};

let _ora: ((opts: { text: string; color: string }) => OraSpawn) | null = null;

export class Spinner {
  private spinner: OraSpawn | null = null;

  async start(text: string): Promise<void> {
    if (!_ora) {
      const mod = await import('ora');
      _ora = mod.default as unknown as (opts: { text: string; color: string }) => OraSpawn;
    }
    this.spinner = _ora!({ text, color: 'cyan' }).start();
  }

  succeed(text?: string): void {
    this.spinner?.succeed(text ? picocolors.green(text) : undefined);
    this.spinner = null;
  }

  fail(text?: string): void {
    this.spinner?.fail(text ? picocolors.red(text) : undefined);
    this.spinner = null;
  }

  update(text: string): void {
    if (this.spinner) (this.spinner as unknown as { text: string }).text = text;
  }

  warn(text?: string): void {
    this.spinner?.warn(text ? picocolors.yellow(text) : undefined);
    this.spinner = null;
  }

  info(text?: string): void {
    this.spinner?.info(text ? picocolors.cyan(text) : undefined);
    this.spinner = null;
  }

  get isSpinning(): boolean {
    return this.spinner?.isSpinning ?? false;
  }
}
