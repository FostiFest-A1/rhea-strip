export class ContractPanic extends Error {
  readonly code: string;

  constructor(code: string, detail?: string) {
    super(detail === undefined ? code : `${code}: ${detail}`);
    this.name = "ContractPanic";
    this.code = code;
  }
}

export function panic(code: string, detail?: string): never {
  throw new ContractPanic(code, detail);
}
