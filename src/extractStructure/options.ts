export enum EXTRACTOR_VERSION {
  /**
   * default, extracts everything
   */
  v1,
  /**
   * This option makes extractor skip all variable and parameter declarations
   */
  v2,
  /**
   * This option makes extractor skip parameters of functions, as well as skip empty functions,
   * as well as skip functions that only return new functions.
   */
  v3,
}

export type opts = {
  'extractor-version': EXTRACTOR_VERSION
}

export const getDefaultOpts = ({
  'extractor-version': v = EXTRACTOR_VERSION.v3,
}: Partial<opts> = {}): opts => ({
  'extractor-version': v,
})
