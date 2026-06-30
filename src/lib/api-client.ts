/**
 * Thin, framework-agnostic HTTP client with:
 *  - typed errors (NetworkError, ApiError, TimeoutError)
 *  - request timeout via AbortController
 *  - exponential-backoff retry for transient failures (5xx / network)
 *
 * Nothing here is tied to DummyJSON — the service layer composes this with
 * a concrete base URL and response mappers.
 */

export class NetworkError extends Error {
  constructor(
    message: string,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = "NetworkError";
  }
}

export class TimeoutError extends Error {
  constructor(public readonly url: string, timeoutMs: number) {
    super(`Request to ${url} timed out after ${timeoutMs}ms`);
    this.name = "TimeoutError";
  }
}

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly body?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

interface FetchOptions extends RequestInit {
  /** Timeout in ms (default 10s). */
  timeoutMs?: number;
  /** Max retry attempts for transient failures (default 2). */
  retries?: number;
  /** Base backoff in ms (default 300). */
  baseBackoffMs?: number;
  /** Optional JSON body — auto-serialised + content-type set. */
  json?: unknown;
}

function isRetryableStatus(status: number): boolean {
  return status === 408 || status === 429 || status >= 500;
}

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener(
      "abort",
      () => {
        clearTimeout(timer);
        reject(new DOMException("Aborted", "AbortError"));
      },
      { once: true },
    );
  });
}

export async function apiFetch<T>(
  url: string,
  options: FetchOptions = {},
): Promise<T> {
  const {
    timeoutMs = 10_000,
    retries = 2,
    baseBackoffMs = 300,
    json,
    headers,
    signal,
    ...rest
  } = options;

  // Combine an external abort signal with our timeout signal.
  const controller = new AbortController();
  const timeoutHandle = setTimeout(() => controller.abort(), timeoutMs);
  if (signal) {
    if (signal.aborted) controller.abort();
    else signal.addEventListener("abort", () => controller.abort(), { once: true });
  }

  const finalHeaders = new Headers(headers);
  let body = rest.body;
  if (json !== undefined) {
    body = JSON.stringify(json);
    finalHeaders.set("Content-Type", "application/json");
  }

  let lastError: unknown;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, {
        ...rest,
        headers: finalHeaders,
        body,
        signal: controller.signal,
      });

      if (!res.ok) {
        const raw = await res.text().catch(() => undefined);
        let parsed: unknown = raw;
        try {
          if (raw) parsed = JSON.parse(raw);
        } catch {
          /* keep as text */
        }
        if (isRetryableStatus(res.status) && attempt < retries) {
          lastError = new ApiError(
            `Request failed with ${res.status}`,
            res.status,
            parsed,
          );
          await sleep(baseBackoffMs * 2 ** attempt, controller.signal);
          continue;
        }
        throw new ApiError(
          (parsed as { message?: string })?.message ??
            `Request failed with status ${res.status}`,
          res.status,
          parsed,
        );
      }

      const contentType = res.headers.get("content-type") ?? "";
      if (contentType.includes("application/json")) {
        return (await res.json()) as T;
      }
      return (await res.text()) as unknown as T;
    } catch (err) {
      if (err instanceof ApiError) {
        lastError = err;
        continue;
      }
      if (err instanceof DOMException && err.name === "AbortError") {
        // Distinguish timeout vs caller abort.
        if (controller.signal.aborted && !signal?.aborted) {
          throw new TimeoutError(url, timeoutMs);
        }
        throw err;
      }
      lastError = new NetworkError(
        err instanceof Error ? err.message : "Network request failed",
        err,
      );
      if (attempt < retries) {
        await sleep(baseBackoffMs * 2 ** attempt, controller.signal);
        continue;
      }
    }
  }

  clearTimeout(timeoutHandle);
  throw lastError ?? new NetworkError("Request failed after retries");
}
