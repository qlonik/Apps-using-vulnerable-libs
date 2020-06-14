import { readJSON } from 'fs-extra'
import R from 'ramda'
import { FN_MATCHING_METHODS_TYPE } from '../../similarityIndex/similarity-methods'
import { indexedMap } from '../../utils/functional'
import { MainFn, TerminateFn } from '../_all.types'

const TOTAL_MANUAL_NAME_DETECTIONS = 17
const TOTAL_MANUAL_NAME_VERSION_DETECTIONS = 15

type DetectionType = 'non-guess' | 'incorrect-version' | 'false-match'
type NumDen = { num: number; den: number }
type PrecisionRecall = { precision: NumDen; recall: NumDen }
type MethodPrecisionRecall = {
  method: FN_MATCHING_METHODS_TYPE
  names: PrecisionRecall
  'names-versions': PrecisionRecall
}
type PrecisionString = string
type RecallString = string
type LatexRow = [FN_MATCHING_METHODS_TYPE, RecallString, PrecisionString]

const mapObjValues = <T, U, K extends string>(fn: (x: T) => U, obj: Record<K, T>): Record<K, U> =>
  R.pipe(
    (x: Record<K, T>) => Object.entries(x) as [K, T][],
    R.map(([k, v]: [K, T]): [K, U] => [k, fn(v)]),
    R.reduce((acc, [k, v]: [K, U]) => ({ ...(acc as any), [k]: v }), {} as Record<K, U>),
  )(obj)
const matchesIntoMap = (x: ReadonlyArray<[DetectionType, string]>) =>
  R.reduce(
    (acc, [type, match]) => ({
      ...acc,
      [type]: R.concat(acc[type], [match]),
    }),
    {
      'non-guess': [],
      'incorrect-version': [],
      'false-match': [],
    } as Record<DetectionType, string[]>,
    x,
  )
const findMaxLength = R.pipe(
  R.map((x: string) => x.length),
  R.reduce<number, number>(R.max, 0),
)

const latexPrRe = ({ num, den }: NumDen) =>
  `$\\dfrac{${num}}{${den}}\\ (${Math.round((100 * num) / den)}\\%)$`
const toLatexRowInColumns = ({
  method: m,
  names: { recall: nr, precision: np },
  'names-versions': { recall: nvr, precision: nvp },
}: MethodPrecisionRecall): Record<'names' | 'names-versions', LatexRow> => ({
  names: [m, latexPrRe(nr), latexPrRe(np)],
  'names-versions': [m, latexPrRe(nvr), latexPrRe(nvp)],
})
const toLatexTable: (r: LatexRow[]) => string = R.pipe(
  (rows: LatexRow[]) => ({ rows, padLengths: R.map(findMaxLength, R.transpose(rows)) }),
  ({ rows, padLengths: pl }) => R.map(indexedMap((el: string, i) => el.padEnd(pl[i])), rows),
  (x) => R.map(([me, re, pr]) => `${me}    & ${re} & ${pr} \\\\ \\cmidrule(lr){2-3}`, x),
  R.join('\n'),
)

export const environment = {
  MANUALLY_VERIFIED_DETECTED_MATCHES: {},
}
export const main: MainFn<typeof environment> = async function main(
  log,
  { MANUALLY_VERIFIED_DETECTED_MATCHES: matchesPath },
) {
  const matches = (await readJSON(matchesPath)) as Record<
    FN_MATCHING_METHODS_TYPE,
    [DetectionType, string][]
  >

  const methodPrecisionRecall = R.map(
    ([method, matches]): MethodPrecisionRecall => {
      const typeSizeMap = mapObjValues((x) => x.length, matchesIntoMap(matches))

      const ng = typeSizeMap['non-guess']
      const iv = typeSizeMap['incorrect-version']
      const fm = typeSizeMap['false-match']

      const total = ng + iv + fm

      return {
        method,
        names: {
          precision: { num: ng + iv, den: total },
          recall: { num: ng + iv, den: TOTAL_MANUAL_NAME_DETECTIONS },
        },
        'names-versions': {
          precision: { num: ng, den: total },
          recall: { num: ng, den: TOTAL_MANUAL_NAME_VERSION_DETECTIONS },
        },
      }
    },
    Object.entries(matches) as [FN_MATCHING_METHODS_TYPE, [DetectionType, string][]][],
  )

  log.info({ 'method-precision-recall': methodPrecisionRecall }, 'precision recall')

  const latexRows = R.map(toLatexRowInColumns, methodPrecisionRecall)
  const latexNamesTable = toLatexTable(R.map((o) => o.names, latexRows))
  const latexNamesVersionsTable = toLatexTable(R.map((o) => o['names-versions'], latexRows))

  log.info({ latexNamesTable, latexNamesVersionsTable }, 'latex tables')
}
export const terminate: TerminateFn = () => () => {}
