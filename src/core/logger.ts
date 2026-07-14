import picocolors from 'picocolors';

export enum LogLevel {
  Debug = 0,
  Info = 1,
  Warn = 2,
  Error = 3,
  Silent = 4,
}

type LogFn = (msg: string, ...rest: unknown[]) => void;

export class Logger {
  private level: LogLevel;

  constructor(level: LogLevel = LogLevel.Info) {
    this.level = level;
  }

  setLevel(level: LogLevel) {
    this.level = level;
  }

  debug: LogFn = (msg, ...rest) => this.write(LogLevel.Debug, picocolors.dim(msg), ...rest);
  info: LogFn = (msg, ...rest) => this.write(LogLevel.Info, msg, ...rest);
  success: LogFn = (msg, ...rest) => this.write(LogLevel.Info, picocolors.green(`✔ ${msg}`), ...rest);
  warn: LogFn = (msg, ...rest) => this.write(LogLevel.Warn, picocolors.yellow(`⚠ ${msg}`), ...rest);
  error: LogFn = (msg, ...rest) => this.write(LogLevel.Error, picocolors.red(`✖ ${msg}`), ...rest);

  private write(level: LogLevel, msg: string, ...rest: unknown[]) {
    if (level < this.level) return;
    const prefix = picocolors.dim(`[${LogLevel[level].toUpperCase()}]`);
    const formatted = rest.length > 0 ? `${msg} ${rest.map(r => typeof r === 'object' ? JSON.stringify(r, null, 2) : String(r)).join(' ')}` : msg;
    console.error(`${prefix} ${formatted}`);
  }
}
