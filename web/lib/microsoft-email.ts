import "server-only";

import { prisma } from "@/lib/prisma";
import { decryptSecret, encryptSecret } from "@/lib/secret-crypto";

const TOKEN_ENDPOINT = "https://login.microsoftonline.com/common/oauth2/v2.0/token";
const GRAPH_ENDPOINT = "https://graph.microsoft.com/v1.0";
export const MICROSOFT_SCOPES = "openid profile email offline_access User.Read Mail.Send";

interface MicrosoftTokenResponse {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  error?: string;
  error_description?: string;
}

interface GraphProfile {
  displayName?: string;
  mail?: string;
  userPrincipalName?: string;
}

export function getMicrosoftOAuthConfig() {
  const clientId = process.env.MICROSOFT_CLIENT_ID;
  const clientSecret = process.env.MICROSOFT_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("Faltan MICROSOFT_CLIENT_ID o MICROSOFT_CLIENT_SECRET.");
  }
  return { clientId, clientSecret };
}

export function getMicrosoftRedirectUri(origin?: string) {
  if (process.env.MICROSOFT_REDIRECT_URI) return process.env.MICROSOFT_REDIRECT_URI;
  const baseUrl = process.env.NEXTAUTH_URL || origin;
  if (!baseUrl) throw new Error("No se puede determinar la URL de retorno de Microsoft.");
  return `${baseUrl.replace(/\/$/, "")}/api/microsoft/callback`;
}

async function parseTokenResponse(response: Response) {
  const body = await response.json() as MicrosoftTokenResponse;
  if (!response.ok || !body.access_token) {
    console.error("Microsoft OAuth token error", body.error, body.error_description);
    throw new Error("Microsoft no ha podido autorizar la cuenta.");
  }
  return body;
}

export async function exchangeMicrosoftCode(input: {
  code: string;
  codeVerifier: string;
  redirectUri: string;
}) {
  const { clientId, clientSecret } = getMicrosoftOAuthConfig();
  const response = await fetch(TOKEN_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "authorization_code",
      code: input.code,
      redirect_uri: input.redirectUri,
      code_verifier: input.codeVerifier,
      scope: MICROSOFT_SCOPES,
    }),
    cache: "no-store",
  });
  const tokens = await parseTokenResponse(response);
  if (!tokens.refresh_token) throw new Error("Microsoft no ha entregado un token renovable.");
  return { accessToken: tokens.access_token!, refreshToken: tokens.refresh_token };
}

export async function getMicrosoftProfile(accessToken: string) {
  const response = await fetch(`${GRAPH_ENDPOINT}/me?$select=displayName,mail,userPrincipalName`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });
  if (!response.ok) throw new Error("No se ha podido leer la cuenta de Microsoft.");
  return await response.json() as GraphProfile;
}

export async function saveMicrosoftConnection(input: {
  accountEmail: string;
  displayName?: string;
  refreshToken: string;
}) {
  const data = {
    enabled: true,
    accountEmail: input.accountEmail,
    displayName: input.displayName || "",
    refreshTokenEncrypted: encryptSecret(input.refreshToken),
    connectedAt: new Date(),
  };
  await prisma.microsoftEmailConnection.upsert({
    where: { id: "default" },
    create: { id: "default", ...data },
    update: data,
  });
}

async function refreshMicrosoftAccessToken() {
  const connection = await prisma.microsoftEmailConnection.findUnique({ where: { id: "default" } });
  if (!connection?.enabled) return null;

  const { clientId, clientSecret } = getMicrosoftOAuthConfig();
  const response = await fetch(TOKEN_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "refresh_token",
      refresh_token: decryptSecret(connection.refreshTokenEncrypted),
      scope: MICROSOFT_SCOPES,
    }),
    cache: "no-store",
  });
  const tokens = await parseTokenResponse(response);

  if (tokens.refresh_token) {
    await prisma.microsoftEmailConnection.update({
      where: { id: "default" },
      data: { refreshTokenEncrypted: encryptSecret(tokens.refresh_token) },
    });
  }
  return { accessToken: tokens.access_token!, connection };
}

export async function testMicrosoftConnection() {
  const session = await refreshMicrosoftAccessToken();
  if (!session) throw new Error("No hay una cuenta Microsoft conectada.");
  const profile = await getMicrosoftProfile(session.accessToken);
  return profile.mail || profile.userPrincipalName || session.connection.accountEmail;
}

export async function sendMicrosoftEmail(input: {
  to: string;
  subject: string;
  text: string;
  html: string;
  attachment: { filename: string; content: Buffer; contentType: string };
}) {
  const session = await refreshMicrosoftAccessToken();
  if (!session) throw new Error("No hay una cuenta Microsoft conectada.");

  // Graph permite adjuntar directamente archivos pequeños. Para presupuestos
  // mayores se crea un borrador y se sube el PDF por bloques.
  if (input.attachment.content.length >= 3 * 1024 * 1024) {
    await sendMicrosoftEmailWithUploadSession(session.accessToken, input);
    return;
  }

  const response = await fetch(`${GRAPH_ENDPOINT}/me/sendMail`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${session.accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      message: {
        subject: input.subject,
        body: { contentType: "HTML", content: input.html },
        toRecipients: [{ emailAddress: { address: input.to } }],
        attachments: [{
          "@odata.type": "#microsoft.graph.fileAttachment",
          name: input.attachment.filename,
          contentType: input.attachment.contentType,
          contentBytes: input.attachment.content.toString("base64"),
        }],
      },
      saveToSentItems: true,
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    const detail = await response.text();
    console.error("Microsoft Graph sendMail error", response.status, detail);
    throw new Error("Microsoft no ha podido enviar el correo.");
  }
}

async function sendMicrosoftEmailWithUploadSession(
  accessToken: string,
  input: {
    to: string;
    subject: string;
    text: string;
    html: string;
    attachment: { filename: string; content: Buffer; contentType: string };
  },
) {
  const headers = { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" };
  const draftResponse = await fetch(`${GRAPH_ENDPOINT}/me/messages`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      subject: input.subject,
      body: { contentType: "HTML", content: input.html },
      toRecipients: [{ emailAddress: { address: input.to } }],
    }),
    cache: "no-store",
  });
  if (!draftResponse.ok) throw new Error("Microsoft no ha podido preparar el correo.");
  const draft = await draftResponse.json() as { id?: string };
  if (!draft.id) throw new Error("Microsoft no ha devuelto el borrador del correo.");

  const messageId = encodeURIComponent(draft.id);
  try {
    const uploadSessionResponse = await fetch(`${GRAPH_ENDPOINT}/me/messages/${messageId}/attachments/createUploadSession`, {
      method: "POST",
      headers,
      body: JSON.stringify({ AttachmentItem: {
        attachmentType: "file",
        name: input.attachment.filename,
        size: input.attachment.content.length,
        contentType: input.attachment.contentType,
      } }),
      cache: "no-store",
    });
    if (!uploadSessionResponse.ok) throw new Error("Microsoft no ha podido iniciar la subida del PDF.");
    const uploadSession = await uploadSessionResponse.json() as { uploadUrl?: string };
    if (!uploadSession.uploadUrl) throw new Error("Microsoft no ha devuelto una URL de subida.");

    // 10 × 320 KiB: múltiplo exigido por Graph y por debajo del máximo por bloque.
    const chunkSize = 10 * 320 * 1024;
    const content = input.attachment.content;
    for (let start = 0; start < content.length; start += chunkSize) {
      const endExclusive = Math.min(start + chunkSize, content.length);
      const chunk = content.subarray(start, endExclusive);
      const uploadResponse = await fetch(uploadSession.uploadUrl, {
        method: "PUT",
        headers: {
          "Content-Length": String(chunk.length),
          "Content-Range": `bytes ${start}-${endExclusive - 1}/${content.length}`,
        },
        body: new Uint8Array(chunk),
        cache: "no-store",
      });
      if (![200, 201, 202].includes(uploadResponse.status)) {
        throw new Error("Microsoft no ha podido subir el PDF completo.");
      }
    }

    const sendResponse = await fetch(`${GRAPH_ENDPOINT}/me/messages/${messageId}/send`, {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: "no-store",
    });
    if (!sendResponse.ok) throw new Error("Microsoft no ha podido enviar el correo preparado.");
  } catch (error) {
    // Evita dejar borradores incompletos si falla la carga del adjunto.
    await fetch(`${GRAPH_ENDPOINT}/me/messages/${messageId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: "no-store",
    }).catch(() => undefined);
    throw error;
  }
}
