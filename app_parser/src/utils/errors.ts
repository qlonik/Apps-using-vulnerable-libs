export class DataError extends Error {
  public constructor(msg?: string) {
    super(msg)
    this.name = 'DataError'
  }
}

export class AppDataError extends DataError {
  public constructor(msg?: string) {
    super(msg)
    this.name = 'AppDataError'
  }
}

export class CordovaAppDataError extends AppDataError {
  public constructor(msg?: string) {
    super(msg)
    this.name = 'CordovaAppDataError'
  }
}

export class ReactNativeAppDataError extends AppDataError {
  public constructor(msg?: string) {
    super(msg)
    this.name = 'ReactNativeAppDataError'
  }
}

export class LibDataError extends DataError {
  public constructor(msg?: string) {
    super(msg)
    this.name = 'LibDataError'
  }
}

export class EnvironmentError extends Error {
  public constructor(msg: string) {
    super(msg)
    this.name = 'EnvironmentError'
  }
}
