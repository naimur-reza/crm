export interface PaginationParams {
  page: number;
  pageSize: number;
  offset: number;
}

export interface PaginationResult {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export function getPaginationParams(
  searchParams: Record<string, string>,
  defaultPageSize = 25,
): PaginationParams {
  const page = Math.max(1, Number(searchParams.page) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(searchParams.pageSize) || defaultPageSize));
  return { page, pageSize, offset: (page - 1) * pageSize };
}

export function buildPagination(page: number, pageSize: number, total: number): PaginationResult {
  return {
    page,
    pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}
