import { NextResponse } from "next/server";

type ApiError = {
  code: string;
  message: string;
};

export function ok<T>(data: T, init?: ResponseInit) {
  return NextResponse.json({ data, error: null }, init);
}

export function fail(error: ApiError, status = 400) {
  return NextResponse.json({ data: null, error }, { status });
}
