import { OraclePoll } from '@/constants/oracle.constant';

export function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

export async function withTimeout<T>(
  promise: Promise<T>,
  ms = OraclePoll.RPC_TIMEOUT_MS,
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error('RPC timeout')), ms),
    ),
  ]);
}
