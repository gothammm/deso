import type { DesoMiddleware } from "../types.ts";

export interface SecureHeadersOptions {
  contentSecurityPolicy?: string | false;
  xFrameOptions?: string | false;
  xContentTypeOptions?: string | false;
  xDnsPrefetchControl?: string | false;
  strictTransportSecurity?: string | false;
  xDownloadOptions?: string | false;
  xPermittedCrossDomainPolicies?: string | false;
  referrerPolicy?: string | false;
  crossOriginOpenerPolicy?: string | false;
  crossOriginEmbedderPolicy?: string | false;
  crossOriginResourcePolicy?: string | false;
  originAgentCluster?: string | false;
}

const DEFAULTS: SecureHeadersOptions = {
  contentSecurityPolicy: "default-src 'self'",
  xFrameOptions: "DENY",
  xContentTypeOptions: "nosniff",
  xDnsPrefetchControl: "off",
  strictTransportSecurity: "max-age=15552000; includeSubDomains",
  xDownloadOptions: "noopen",
  xPermittedCrossDomainPolicies: "none",
  referrerPolicy: "no-referrer",
  crossOriginOpenerPolicy: "same-origin",
  crossOriginEmbedderPolicy: "require-corp",
  crossOriginResourcePolicy: "same-origin",
  originAgentCluster: "?1",
};

export function secureHeaders(
  options: SecureHeadersOptions = {},
): DesoMiddleware {
  const config = { ...DEFAULTS, ...options };

  const entries: Array<[string, string | false]> = [
    ["Content-Security-Policy", config.contentSecurityPolicy],
    ["X-Frame-Options", config.xFrameOptions],
    ["X-Content-Type-Options", config.xContentTypeOptions],
    ["X-DNS-Prefetch-Control", config.xDnsPrefetchControl],
    ["Strict-Transport-Security", config.strictTransportSecurity],
    ["X-Download-Options", config.xDownloadOptions],
    ["X-Permitted-Cross-Domain-Policies", config.xPermittedCrossDomainPolicies],
    ["Referrer-Policy", config.referrerPolicy],
    ["Cross-Origin-Opener-Policy", config.crossOriginOpenerPolicy],
    ["Cross-Origin-Embedder-Policy", config.crossOriginEmbedderPolicy],
    ["Cross-Origin-Resource-Policy", config.crossOriginResourcePolicy],
    ["Origin-Agent-Cluster", config.originAgentCluster],
  ].filter(([, v]) => v !== undefined) as Array<[string, string | false]>;

  return (context, next) => {
    for (const [key, value] of entries) {
      if (value !== false) {
        context.header(key, value);
      }
    }
    return next();
  };
}
