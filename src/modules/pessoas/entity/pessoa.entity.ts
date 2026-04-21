import { Document } from './document.value-object';

export class Pessoa {
  constructor(
    public readonly personId: number,
    public readonly name: string,
    public readonly document: Document,
    public readonly birthDate: Date,
  ) {}

  /**
   * Factory method to create a new Pessoa instance, ensuring all business rules are met.
   */
  static create(props: {
    personId: number;
    name: string;
    document: string;
    birthDate: Date;
  }): Pessoa {
    // The Document value object validates itself upon creation
    const documentVo = Document.create(props.document);

    return new Pessoa(props.personId, props.name, documentVo, props.birthDate);
  }
}
