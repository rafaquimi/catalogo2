import crypto from "crypto";
import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import { authOptions } from "@/auth";
import { getAuditActor } from "@/lib/audit";
import {
  exchangeMicrosoftCode,
  getMicrosoftProfile,
  getMicrosoftRedirectUri,
  saveMicrosoftConnection,
} from "@/lib/microsoft-email";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function stateMatches(received: string, expected: string) {
  const left = Buffer.from(received);
  const right = Buffer.from(expected);
  return left.length === right.length && crypto.timingSafeEqual(left, right);
}

function redirectWithStatus(request: NextRequest, status: string) {
  const response = NextResponse.redirect(new URL(`/catalogo/configuracion?microsoft=${status}`, request.url));
  const expiredCookie = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/api/microsoft/callback",
    maxAge: 0,
  };
  response.cookies.set("microsoft_oauth_state", "", expiredCookie);
  response.cookies.set("microsoft_oauth_verifier", "", expiredCookie);
  return response;
}

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.redirect(new URL("/login?callbackUrl=/catalogo/configuracion", request.url));

  const code = request.nextUrl.searchParams.get("code") || "";
  const state = request.nextUrl.searchParams.get("state") || "";
  const expectedState = request.cookies.get("microsoft_oauth_state")?.value || "";
  const codeVerifier = request.cookies.get("microsoft_oauth_verifier")?.value || "";
  const oauthError = request.nextUrl.searchParams.get("error");

  if (oauthError || !code || !state || !expectedState || !codeVerifier || !stateMatches(state, expectedState)) {
    return redirectWithStatus(request, oauthError === "access_denied" ? "cancelled" : "invalid");
  }

  try {
    const tokens = await exchangeMicrosoftCode({
      code,
      codeVerifier,
      redirectUri: getMicrosoftRedirectUri(request.nextUrl.origin),
    });
    const profile = await getMicrosoftProfile(tokens.accessToken);
    const accountEmail = profile.mail || profile.userPrincipalName;
    if (!accountEmail) throw new Error("La cuenta Microsoft no tiene una dirección de correo disponible.");

    await saveMicrosoftConnection({
      accountEmail,
      displayName: profile.displayName,
      refreshToken: tokens.refreshToken,
    });
    const actor = getAuditActor(session);
    await prisma.auditLog.create({
      data: {
        actorUserId: actor.userId,
        actorEmail: actor.email,
        action: "CONNECT",
        entityType: "MICROSOFT_EMAIL",
        entityId: "default",
        summary: `Cuenta Microsoft conectada: ${accountEmail}`,
      },
    });
    return redirectWithStatus(request, "connected");
  } catch (error) {
    console.error("Error completando Microsoft OAuth", error);
    return redirectWithStatus(request, "error");
  }
}
