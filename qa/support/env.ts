type EnvHost = { process?: { env?: Record<string, string | undefined> } };

const env: Record<string, string | undefined> = (globalThis as unknown as EnvHost).process?.env ?? {};

export const port = env.RHEA_QA_PORT ?? "3107";

export const externalBaseUrl: string | undefined = env.RHEA_BASE_URL;

export const baseUrl = externalBaseUrl ?? `http://localhost:${port}`;
