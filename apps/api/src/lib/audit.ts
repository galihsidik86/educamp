// ============================================================
// Audit log helper — tulis record AuditLog secara fire-and-forget.
// Pemanggil tidak perlu await (kecuali pengujian).
// ============================================================

import type { Request } from 'express';
import { prisma } from '../db.js';

export type AuditInput = {
  action: string;           // dot-namespaced: "krs.approve", "auth.login", "nilai.finalize"
  entity?: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
};

export type ActorOverride = {
  actorId?: string | null;
  actorRole?: string | null;
  actorName?: string | null;
};

/**
 * Tulis 1 record audit. Tidak melempar — error di-log saja agar
 * gagal log audit tidak menggagalkan response utama.
 */
export async function writeAudit(req: Request | null, input: AuditInput, override?: ActorOverride) {
  try {
    const ip = req?.ip?.slice(0, 64) ?? null;
    const userAgent = req?.headers['user-agent']?.slice(0, 255) ?? null;

    const actorId = override?.actorId !== undefined ? override.actorId : req?.user?.sub ?? null;
    const actorRole = override?.actorRole !== undefined ? override.actorRole : req?.user?.role ?? null;

    // fetch actor name once (denormalized). Skip kalau override sudah ada nama.
    let actorName = override?.actorName ?? null;
    if (actorName === null && actorId) {
      const u = await prisma.user.findUnique({
        where: { id: actorId },
        include: { mahasiswa: true, dosen: true, akademik: true },
      });
      actorName = u?.mahasiswa?.nama ?? u?.dosen?.nama ?? u?.akademik?.nama ?? u?.email ?? null;
    }

    await prisma.auditLog.create({
      data: {
        actorId, actorRole, actorName,
        action: input.action,
        entity: input.entity,
        entityId: input.entityId,
        metadata: input.metadata as any,
        ip, userAgent,
      },
    });
  } catch (e) {
    console.error('[audit] gagal menulis log:', e);
  }
}
