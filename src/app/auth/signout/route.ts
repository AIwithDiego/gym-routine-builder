import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  await supabase.auth.signOut();

  // 303 so the browser follows with a GET after the form POST.
  return NextResponse.redirect(new URL("/login", request.url), {
    status: 303,
  });
}
