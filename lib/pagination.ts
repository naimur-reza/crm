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
  showingStart: number;
  showingEnd: number;
}

export interface SortParams {
  by: string;
  order: "asc" | "desc";
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
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const clampedPage = Math.min(page, totalPages);
  return {
    page: clampedPage,
    pageSize,
    total,
    totalPages,
    showingStart: total === 0 ? 0 : (clampedPage - 1) * pageSize + 1,
    showingEnd: Math.min(clampedPage * pageSize, total),
  };
}

export function buildSortParams(searchParams: Record<string, string>): SortParams | null {
  const by = searchParams.sortBy;
  if (!by) return null;
  const order = searchParams.sortOrder === "asc" ? "asc" : "desc";
  return { by, order };
}
