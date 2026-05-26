/**
 * Security-headers middleware (helmet-style).
 *
 * Sets common security-related HTTP headers on every response to harden
 * the application against XSS, clickjacking, MIME-type sniffing, and
 * other web-based attacks. Each header can be individually disabled by
 * setting its value to `false`.
 * @module
 */
import type { DesoMiddleware } from "../types.ts";

/** Options for the {@link secureHeaders} middleware. */
export interface SecureHeadersOptions {
  /** `Content-Security-Policy` header value. Default: `"default-src 'self'"`. */
  contentSecurityPolicy?: string | false;
  /** `X-Frame-Options` header value. Default: `"DENY"`. */
  xFrameOptions?: string | false;
  /** `X-Content-Type-Options` header value. Default: `"nosniff"`. */
  xContentTypeOptions?: string | false;
  /** `X-DNS-Prefetch-Control` header value. Default: `"off"`. */
  xDnsPrefetchControl?: string | false;
  /** `Strict-Transport-Security` header value. Default: `"max-age=15552000; includeSubDomains"`. */
  strictTransportSecurity?: string | false;
  /** `X-Download-Options` header value. Default: `"noopen"`. */
  xDownloadOptions?: string | false;
  /** `X-Permitted-Cross-Domain-Policies` header value. Default: `"none"`. */
  xPermittedCrossDomainPolicies?: string | false;
  /** `Referrer-Policy` header value. Default: `"no-referrer"`. */
  referrerPolicy?: string | false;
  /** `Cross-Origin-Opener-Policy` header value. Default: `"same-origin"`. */
  crossOriginOpenerPolicy?: string | false;
  /** `Cross-Origin-Embedder-Policy` header value. Default: `"require-corp"`. */
  crossOriginEmbedderPolicy?: string | false;
  /** `Cross-Origin-Resource-Policy` header value. Default: `"same-origin"`. */
  crossOriginResourcePolicy?: string | false;
  /** `Origin-Agent-Cluster` header value. Default: `"?1"`. */
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

/**
 * Security-headers middleware.
 *
 * Sets 12 security-related HTTP headers on every response with sensible
 * defaults. Pass `false` for any header to omit it.
 *
 * Default policy:
 * - `Content-Security-Policy: default-src 'self'`
 * - `X-Frame-Options: DENY`
 * - `Strict-Transport-Security: max-age=15552000; includeSubDomains`
 * - …and 9 more.
 *
 * @param options - Partial set of headers to override. Omitted headers use
 *   secure defaults.
 *
 * ```ts
 * app.use(secureHeaders({
 *   contentSecurityPolicy: "default-src 'self' https:",
 * }));
 * ```
 */
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
