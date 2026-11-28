const DEFAULT_PAGE_SIZE = 50;
const MAX_PAGE_SIZE = 100;

export function parsePagination(searchParams) {
  const requestedPage = Number.parseInt(searchParams.get("page") ?? "1", 10);
  const requestedSize = Number.parseInt(searchParams.get("pageSize") ?? String(DEFAULT_PAGE_SIZE), 10);
  const page = Number.isInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1;
  const pageSize =
    Number.isInteger(requestedSize) && requestedSize > 0
      ? Math.min(requestedSize, MAX_PAGE_SIZE)
      : DEFAULT_PAGE_SIZE;
  return { page, pageSize, skip: (page - 1) * pageSize, take: pageSize };
}

export function paginationHeaders(page, pageSize, total) {
  return {
    "X-Page": String(page),
    "X-Page-Size": String(pageSize),
    "X-Total-Count": String(total),
    "X-Has-More": String(page * pageSize < total),
  };
}
