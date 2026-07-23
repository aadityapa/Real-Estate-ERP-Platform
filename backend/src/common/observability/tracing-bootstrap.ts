/**
 * Side-effect import: start OTel before Nest/HTTP modules finish loading
 * so auto-instrumentation can patch Express, ioredis, etc.
 */
import { startTracing } from "./tracing";

startTracing();
