import crypto from "crypto";
import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import { authOptions } from "@/auth";
import { getMicrosoftOAuthConfig, getMicrosoftRedirectUri, MICROSOFT_SCOPES } from "@/lib/microsoft-email";

export const dynamic = "force-dynamic";

function base64Url(value: Buffer) {
  return value.toString("base64url");
}

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.redirect(new URL("/login?callbackUrl=/catalogo/configuracion", request.url));
  }

  try {
    const { clientId } = getMicrosoftOAuthConfig();
    const redirectUri = getMicrosoftRedirectUri(request.nextUrl.origin);
    const state = base64Url(crypto.randomBytes(32));
    const codeVerifier = base64Url(crypto.randomBytes(64));
    const codeChallenge = base64Url(crypto.createHash("sha256").update(codeVerifier).digest());

    const authorizationUrl = new URL("https://login.microsoftonline.com/common/oauth2/v2.0/authorize");
    authorizationUrl.search = new URLSearchParams({
      client_id: clientId,
      response_type: "code",
      redirect_uri: redirectUri,
      response_mode: "query",
      scope: MICROSOFT_SCOPES,
      state,
      code_challenge: codeChallenge,
      code_challenge_method: "S256",
      prompt: "select_account",
    }).toString();

    const response = NextResponse.redirect(authorizationUrl);
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax" as const,
      path: "/api/microsoft/callback",
      maxAge: 10 * 60,
    };
    response.cookies.set("microsoft_oauth_state", state, cookieOptions);
    response.cookies.set("microsoft_oauth_verifier", codeVerifier, cookieOptions);
    return response;
  } catch (error) {
    console.error("No se ha podido iniciar Microsoft OAuth", error);
    return NextResponse.redirect(new URL("/catalogo/configuracion?microsoft=config", request.url));
  }
}
