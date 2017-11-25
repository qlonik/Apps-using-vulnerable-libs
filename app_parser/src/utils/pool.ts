import { Pool } from 'generic-pool'

/*
 * Promisified auto closed pool
 */
export const createAutoClosedPool = <T>(pool: Pool<T>) => {
  return (fn: (resource: T) => Promise<any>) => {
    return pool.acquire().then((resource) => {
      return fn(resource).then(
        (result) => {
          pool.release(resource)
          return result
        },
        (error) => {
          pool.release(resource)
          throw error
        }
      )
    })
  }
}
