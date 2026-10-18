// framework/util/app-response.ts
import { Response } from 'express';

export function AppResponse(
  res: Response,
  statusCode: number,
  success: boolean,
  data: any,
  message: string | null,
  error: any,
) {
  return res.status(statusCode).json({
    success,
    message,
    data,
    error,
  });
}