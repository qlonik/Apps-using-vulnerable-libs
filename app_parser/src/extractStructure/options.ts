export enum EXTRACTOR_VERSION {
  /**
   * default, extracts everything
   */
  v1,
  /**
   * This option makes extractor skip all variable and parameter declarations
   */
  v2,
}

export type opts = {
  'extractor-version': EXTRACTOR_VERSION
}

export const getDefaultOpts = ({
  'extractor-version': v = EXTRACTOR_VERSION.v1,
}: Partial<opts> = {}): opts => ({
  'extractor-version': v,
})
