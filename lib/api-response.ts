import { NextResponse } from "next/server";

export interface PaginationMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export function successResponse<T>(data: T, message?: string) {
  return NextResponse.json({
    success: true,
    data,
    message,
  });
}

export function errorResponse(message: string, status: number = 400) {
  return NextResponse.json(
    {
      success: false,
      message,
    },
    { status }
  );
}

export function paginatedResponse<T>(
  data: T[],
  pagination: PaginationMeta,
  message?: string
) {
  return NextResponse.json({
    success: true,
    data,
    message,
    pagination,
  });
}
