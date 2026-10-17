export type ApiFailure = "network" | "timeout" | "http" | "response";
export class ApiError extends Error {
  readonly kind: ApiFailure;
  readonly status?: number;
  constructor(kind: ApiFailure, message: string, status?: number) {
    super(message);
    this.kind = kind;
    this.status = status;
    this.name = "ApiError";
  }
}
export async function request<T>(
  path: string,
  options: RequestInit = {},
  token = "",
  signal?: AbortSignal,
  timeoutMs = 12_000,
): Promise<T> {
  const controller = new AbortController();
  let timedOut = false;
  const abort = () => controller.abort(signal?.reason);
  if (signal?.aborted) abort();
  else signal?.addEventListener("abort", abort, { once: true });
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);
  const headers = new Headers(options.headers);
  if (options.body && !headers.has("Content-Type"))
    headers.set("Content-Type", "application/json");
  if (token) headers.set("Authorization", `Bearer ${token}`);
  try {
    const response = await fetch(`/api${path}`, {
      ...options,
      headers,
      signal: controller.signal,
    });
    if (!response.ok) {
      const text = await response.text();
      let message = `Bodhi Cast could not complete this request (${response.status}). Try again shortly.`;
      try {
        const body: unknown = JSON.parse(text);
        if (
          typeof body === "object" &&
          body !== null &&
          "error" in body &&
          typeof body.error === "string"
        )
          message = body.error;
      } catch {
        message = `Bodhi Cast could not complete this request (${response.status}). Try again shortly.`;
      }
      throw new ApiError("http", message, response.status);
    }
    try {
      return (await response.json()) as T;
    } catch (error) {
      if (controller.signal.aborted) throw error;
      throw new ApiError(
        "response",
        "Bodhi Cast returned an unreadable response. Try again shortly.",
      );
    }
  } catch (error) {
    if (signal?.aborted) throw error;
    if (timedOut)
      throw new ApiError(
        "timeout",
        "This request took too long. Try again; your last loaded forecast is kept.",
      );
    if (error instanceof ApiError) throw error;
    throw new ApiError(
      "network",
      "Cannot reach Bodhi Cast. Check your connection and try again.",
    );
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener("abort", abort);
  }
}
