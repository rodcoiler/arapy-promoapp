import { Session } from "@shopify/shopify-app-remix/server";
import prisma from "./db.server";

/**
 * Custom Prisma Session Storage
 * Implementa la interfaz SessionStorage de Shopify sin el paquete externo.
 */
export class PrismaSessionStorage {
  async storeSession(session) {
    const data = {
      id: session.id,
      shop: session.shop,
      state: session.state,
      isOnline: session.isOnline,
      scope: session.scope,
      expires: session.expires,
      accessToken: session.accessToken,
      userId: session.onlineAccessInfo?.associated_user?.id
        ? BigInt(session.onlineAccessInfo.associated_user.id)
        : null,
      firstName: session.onlineAccessInfo?.associated_user?.first_name || null,
      lastName: session.onlineAccessInfo?.associated_user?.last_name || null,
      email: session.onlineAccessInfo?.associated_user?.email || null,
      accountOwner: session.onlineAccessInfo?.associated_user?.account_owner ?? false,
      locale: session.onlineAccessInfo?.associated_user?.locale || null,
      collaborator: session.onlineAccessInfo?.associated_user?.collaborator ?? false,
      emailVerified: session.onlineAccessInfo?.associated_user?.email_verified ?? false,
    };

    await prisma.session.upsert({
      where: { id: session.id },
      update: data,
      create: data,
    });

    return true;
  }

  async loadSession(id) {
    const row = await prisma.session.findUnique({ where: { id } });
    if (!row) return undefined;

    return new Session({
      id: row.id,
      shop: row.shop,
      state: row.state,
      isOnline: row.isOnline,
      scope: row.scope || undefined,
      expires: row.expires || undefined,
      accessToken: row.accessToken,
      onlineAccessInfo: row.userId
        ? {
            associated_user: {
              id: Number(row.userId),
              first_name: row.firstName || "",
              last_name: row.lastName || "",
              email: row.email || "",
              account_owner: row.accountOwner,
              locale: row.locale || "",
              collaborator: row.collaborator || false,
              email_verified: row.emailVerified || false,
            },
          }
        : undefined,
    });
  }

  async deleteSession(id) {
    try {
      await prisma.session.delete({ where: { id } });
    } catch {
      // Session might not exist
    }
    return true;
  }

  async deleteSessions(ids) {
    await prisma.session.deleteMany({ where: { id: { in: ids } } });
    return true;
  }

  async findSessionsByShop(shop) {
    const rows = await prisma.session.findMany({ where: { shop } });
    return rows.map(
      (row) =>
        new Session({
          id: row.id,
          shop: row.shop,
          state: row.state,
          isOnline: row.isOnline,
          scope: row.scope || undefined,
          expires: row.expires || undefined,
          accessToken: row.accessToken,
        })
    );
  }
}
