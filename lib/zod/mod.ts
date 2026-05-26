/**
 * Zod/OpenAPI integration for Deso.
 *
 * Provides `zValidator` for request-validation middleware and
 * `OpenAPIRegistry` for generating OpenAPI 3.1 specs from registered
 * routes and their Zod schemas.
 * @module
 */
export type { OpenAPIConfig, OperationSchema } from "./openapi.ts";
export { OpenAPIRegistry } from "./openapi.ts";
export { zValidator } from "./validator.ts";
