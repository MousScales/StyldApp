export class PaywallTimeoutError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PaywallTimeoutError';
  }
}

export async function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  message: string,
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;

  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timer = setTimeout(() => reject(new PaywallTimeoutError(message)), ms);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export const PURCHASE_FLOW_TIMEOUT_MS = 60_000;
export const ENTITLEMENT_CONFIRM_TIMEOUT_MS = 15_000;
