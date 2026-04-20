/**
 * Custom exception class for Domain-specific business rule violations.
 * This helps distinguish between system errors (500) and business logic errors (400).
 */
export class DomainException extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DomainException';
  }
}
