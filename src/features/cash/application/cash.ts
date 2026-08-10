import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ApiError } from '@/core/http';
import { useSession } from '@/core/session';
import { instructorKeys } from '@/features/instructor';
import type { CashRegisterSnapshot, CloseRequest, OpenRequest } from '@/generated/api';
export type { CashRegisterSnapshot } from '@/generated/api';
export const cashKeys = { current: () => ['cash-register', 'current'] as const };
function absent(error: unknown) { return error instanceof ApiError && error.status === 404 && error.code === 'CASH_REGISTER_NOT_OPEN'; }
export function useCurrentCashRegister(enabled = true) { const { authorizedRequest } = useSession(); return useQuery({ queryKey: cashKeys.current(), enabled: enabled && Boolean(authorizedRequest), staleTime: 5_000, queryFn: async ({ signal }) => { if (!authorizedRequest) throw new Error('La sesión no está disponible.'); try { return (await authorizedRequest<CashRegisterSnapshot>({ method: 'GET', path: '/cash-register/current', signal })).data; } catch (error) { if (absent(error)) return undefined; throw error; } } }); }
async function invalidateCashState(client: ReturnType<typeof useQueryClient>) { await Promise.all([client.invalidateQueries({ queryKey: cashKeys.current() }), client.invalidateQueries({ queryKey: instructorKeys.todaySummary() })]); }
export function useOpenCashRegister() { const { authorizedRequest } = useSession(); const client = useQueryClient(); return useMutation({ retry: 0, networkMode: 'always', mutationFn: async (body: OpenRequest) => { if (!authorizedRequest) throw new Error('La sesión no está disponible.'); return (await authorizedRequest<CashRegisterSnapshot>({ method: 'POST', path: '/cash-register/open', body, allowRefresh: false })).data; }, onSuccess: async () => { await invalidateCashState(client); } }); }
export function useCloseCashRegister() { const { authorizedRequest } = useSession(); const client = useQueryClient(); return useMutation({ retry: 0, networkMode: 'always', mutationFn: async (body: CloseRequest) => { if (!authorizedRequest) throw new Error('La sesión no está disponible.'); return (await authorizedRequest<CashRegisterSnapshot>({ method: 'POST', path: '/cash-register/close', body, allowRefresh: false })).data; }, onSuccess: async () => { await invalidateCashState(client); } }); }
