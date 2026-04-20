export class Document {
  private constructor(public readonly value: string) {}

  /**
   * Factory method to create and validate a Document Value Object
   * @param value The document string (e.g., CPF, CNPJ, ID)
   */
  static create(value: string): Document {
    // Remove all non-digit characters
    const cleanValue = value.replace(/\D/g, '');
    
    // Basic validation (e.g., must have at least 9 digits)
    if (!cleanValue || cleanValue.length < 9) {
      throw new Error('Invalid document format. Must contain at least 9 digits.');
    }

    return new Document(cleanValue);
  }
}
