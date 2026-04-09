import { SyncContext, EMPTY_GUID } from "./sync-context";

export async function resolveContractorId(ctx: SyncContext, refKey: string | null | undefined): Promise<number | null> {
  if (!refKey || refKey === EMPTY_GUID) return null;
  const row = await ctx.db.contractor.findUnique({ where: { externalId: refKey }, select: { id: true } });
  return row?.id ?? null;
}

export async function resolvePersonId(ctx: SyncContext, refKey: string | null | undefined): Promise<number | null> {
  if (!refKey || refKey === EMPTY_GUID) return null;
  const row = await ctx.db.person.findUnique({ where: { externalId: refKey }, select: { id: true } });
  return row?.id ?? null;
}

export async function resolveCashFlowArticleId(ctx: SyncContext, refKey: string | null | undefined): Promise<number | null> {
  if (!refKey || refKey === EMPTY_GUID) return null;
  const row = await ctx.db.cashFlowArticle.findUnique({ where: { externalId: refKey }, select: { id: true } });
  return row?.id ?? null;
}

export async function resolveCounterparty(
  ctx: SyncContext,
  refKey: string | null | undefined,
  type: string | null | undefined,
): Promise<{ contractorId: number | null; personId: number | null }> {
  if (!refKey || refKey === EMPTY_GUID) return { contractorId: null, personId: null };

  if (type?.includes("Catalog_Контрагенты")) {
    return { contractorId: await resolveContractorId(ctx, refKey), personId: null };
  }
  if (type?.includes("Catalog_ФизическиеЛица")) {
    return { contractorId: null, personId: await resolvePersonId(ctx, refKey) };
  }

  const cId = await resolveContractorId(ctx, refKey);
  if (cId) return { contractorId: cId, personId: null };
  const pId = await resolvePersonId(ctx, refKey);
  return { contractorId: null, personId: pId };
}
