import type { HTMLInputAttributes } from 'svelte/elements';

export class FileNotSelectedError extends Error {
  constructor() {
    super('ファイルが選択されませんでした');
    this.name = 'FileNotSelectedError';
  }
}

export function pickSingleFile(options?: Pick<HTMLInputAttributes, 'accept'>): Promise<File> {
  return new Promise<File>((resolve, reject) => {
    const input = document.createElement('input');
    input.type = 'file';
    if (options?.accept) {
      input.accept = options.accept;
    }
    input.onchange = (e) => {
      if (!(e.currentTarget instanceof HTMLInputElement)) {
        reject(new Error('Invalid input element'));
        return;
      }
      const file = e.currentTarget.files?.[0];
      if (file) resolve(file);
      else reject(new FileNotSelectedError());
    };
    input.oncancel = () => reject(new FileNotSelectedError());
    input.click();
  });
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

export function getCurrentDateString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
