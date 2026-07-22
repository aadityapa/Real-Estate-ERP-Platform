import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from "@nestjs/common";
import { Observable } from "rxjs";
import { map } from "rxjs/operators";
import { Response } from "express";
import { signStoragePath } from "../utils/crypto";

export interface StandardResponse<T> {
  success: boolean;
  data: T;
  meta?: Record<string, unknown>;
  message?: string;
}

/**
 * Recursively replace bare "/storage/..." paths with expiring
 * HMAC-SHA256 signed URLs so files are never publicly accessible.
 */
export function signStorageUrls(value: unknown, seen = new WeakSet<object>()): unknown {
  if (typeof value === "string") {
    return value.startsWith("/storage/") && !value.includes("sig=")
      ? signStoragePath(value)
      : value;
  }
  if (Array.isArray(value)) {
    return value.map((item) => signStorageUrls(item, seen));
  }
  if (value && typeof value === "object") {
    if (seen.has(value)) return value;
    seen.add(value);
    if (value instanceof Date) return value;
    const proto = Object.getPrototypeOf(value) as object | null;
    // Only walk plain objects — leave Decimal/Buffer/class instances untouched
    if (proto !== Object.prototype && proto !== null) return value;
    const out: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value)) {
      out[key] = signStorageUrls(val, seen);
    }
    return out;
  }
  return value;
}

@Injectable()
export class TransformInterceptor<T>
  implements NestInterceptor<T, StandardResponse<T>>
{
  intercept(
    context: ExecutionContext,
    next: CallHandler<T>,
  ): Observable<StandardResponse<T>> {
    const response = context.switchToHttp().getResponse<Response>();

    if (response.statusCode === 204) {
      return next.handle().pipe(
        map((data) => ({
          success: true,
          data: data as T,
        })),
      );
    }

    return next.handle().pipe(
      map((data) => {
        if (
          data &&
          typeof data === "object" &&
          "success" in data &&
          (data as unknown as StandardResponse<T>).success === true
        ) {
          return data as unknown as StandardResponse<T>;
        }

        if (
          data &&
          typeof data === "object" &&
          "data" in data &&
          "meta" in data
        ) {
          const paginated = data as { data: T; meta: Record<string, unknown> };
          return {
            success: true,
            data: signStorageUrls(paginated.data) as T,
            meta: paginated.meta,
          };
        }

        return {
          success: true,
          data: signStorageUrls(data) as T,
        };
      }),
    );
  }
}
