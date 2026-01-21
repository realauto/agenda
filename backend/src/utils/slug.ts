import { nanoid } from 'nanoid';

export function generateSlug(name: string): string {
  const baseSlug = name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');

  const uniqueId = nanoid(6);
  return `${baseSlug}-${uniqueId}`;
}

export function generateToken(): string {
  return nanoid(32);
}
