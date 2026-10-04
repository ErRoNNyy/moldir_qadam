import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

function getSafeDestination(value: string | null, origin: string): URL {
  if (!value) return new URL("/", origin);
  try {
    const destination = new URL(value, origin);
    return destination.origin === origin ? destination : new URL("/", origin);
  } catch {
    return new URL("/", origin);
  }
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const appOrigin = new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? requestUrl.origin
  ).origin;
  const code = requestUrl.searchParams.get("code");
  const tokenHash = requestUrl.searchParams.get("token_hash");
  const type = requestUrl.searchParams.get("type");
  const supabase = await createClient();

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      return NextResponse.redirect(new URL("/login?error=auth_callback", appOrigin));
    }
  } else if (tokenHash && type === "recovery") {
    const { error } = await supabase.auth.verifyOtp({
      type: "recovery",
      token_hash: tokenHash,
    });
    if (error) {
      return NextResponse.redirect(new URL("/login?error=auth_callback", appOrigin));
    }
  } else {
    return NextResponse.redirect(new URL("/login?error=auth_callback", appOrigin));
  }

  return NextResponse.redirect(
    getSafeDestination(requestUrl.searchParams.get("next"), appOrigin)
  );
}
