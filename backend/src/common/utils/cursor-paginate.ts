export interface CursorPageMeta {
  limit: number;
  nextCursor: string | null;
  hasMore: boolean;
  mode: "cursor";
}

export interface CursorPaginatedResult<T> {
  data: T[];
  meta: CursorPageMeta;
}

/**
 * Slice a Prisma `take: limit + 1` result into a cursor page.
 * `idOf` extracts the stable cursor (usually row.id).
 */
export function cursorPaginate<T>(
  rows: T[],
  limit: number,
  idOf: (row: T) => string,
): CursorPaginatedResult<T> {
  const hasMore = rows.length > limit;
  const data = hasMore ? rows.slice(0, limit) : rows;
  const last = data[data.length - 1];
  return {
    data,
    meta: {
      limit,
      nextCursor: hasMore && last ? idOf(last) : null,
      hasMore,
      mode: "cursor",
    },
  };
}
