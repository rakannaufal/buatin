export class AppError extends Error {
  constructor(
    public code: string,
    public status = 400,
    public publicMessage = "Permintaan tidak dapat diproses.",
  ) {
    super(code);
  }
}
export function errorCode(error: unknown) {
  return error instanceof AppError ? error.code : "INTERNAL_ERROR";
}
