// framework/util/response-builder.ts
export class ApiResponse<T = any> {
  constructor(
    public data: T,
    public statusCode: number = 200,
    public message?: string,
  ) {}
}

// Helpers
export const ok = <T>(data: T, message?: string) =>
  new ApiResponse(data, 200, message);

export const created = <T>(data: T, message?: string) =>
  new ApiResponse(data, 201, message);

export const accepted = <T>(data: T, message?: string) =>
  new ApiResponse(data, 202, message);

export const noContent = () => new ApiResponse(null, 204);