
export class AppException extends Error {
  public statusCode: number;

  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;

    // Ensure the prototype chain is correctly set
    Object.setPrototypeOf(this, new.target.prototype);
  }
}