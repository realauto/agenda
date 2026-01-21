import { ObjectId } from 'mongodb';

export interface PaginationParams {
  cursor?: string;
  limit?: number;
  page?: number;
}

export interface PaginationResult {
  limit: number;
  skip: number;
  cursor?: ObjectId;
}

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

export function parsePagination(params: PaginationParams): PaginationResult {
  const limit = Math.min(params.limit || DEFAULT_LIMIT, MAX_LIMIT);

  if (params.cursor) {
    return {
      limit,
      skip: 0,
      cursor: new ObjectId(params.cursor),
    };
  }

  const page = Math.max(params.page || 1, 1);
  return {
    limit,
    skip: (page - 1) * limit,
  };
}

export function encodeCursor(id: ObjectId): string {
  return id.toHexString();
}

export function decodeCursor(cursor: string): ObjectId {
  return new ObjectId(cursor);
}
