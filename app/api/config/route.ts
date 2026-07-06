import { NextResponse } from "next/server";
import { PUBLIC_CONFIG } from "@/shared/config";

export function GET() {
  return NextResponse.json({
    data: PUBLIC_CONFIG,
    error: null
  });
}
