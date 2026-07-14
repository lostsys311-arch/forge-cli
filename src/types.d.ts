declare module 'validate-npm-package-name' {
  interface Result {
    validForNewPackages: boolean;
    validForOldPackages: boolean;
    errors?: string[];
    warnings?: string[];
  }
  export default function validate(name: string): Result;
}

declare module 'cli-highlight' {
  export function highlight(code: string, options?: { language?: string; theme?: Record<string, string> }): string;
}

declare module 'giget' {
  export async function downloadTemplate(source: string, options?: { provider?: string; dir?: string; force?: boolean }): Promise<{ dir: string; name: string; source: string }>;
}
