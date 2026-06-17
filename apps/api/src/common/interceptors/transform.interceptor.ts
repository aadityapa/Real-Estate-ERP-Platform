import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from "@nestjs/common";
import { Observable } from "rxjs";
import { map } from "rxjs/operators";
import { Response } from "express";

export interface StandardResponse<T> {
  success: boolean;
  data: T;
  meta?: Record<string, unknown>;
  message?: string;
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
            data: paginated.data,
            meta: paginated.meta,
          };
        }

        return {
          success: true,
          data: data as T,
        };
      }),
    );
  }
}
