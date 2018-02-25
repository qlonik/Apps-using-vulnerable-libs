import { Pool } from 'generic-pool'
import { WorkerExecutor } from './WorkerExecutor'
import { WorkerInstance } from './WorkerInstance'

export { WorkerInstance as WorkerInstance, WorkerExecutor as WorkerExecutor }

/*
 * Promisified auto closed pool
 */
export const createAutoClosedPool = <T>(pool: Pool<T>) => {
  return async function<K>(fn: (resource: T) => Promise<K>): Promise<K> {
    const resource = await pool.acquire()
    try {
      return await fn(resource)
    } finally {
      pool.release(resource)
    }
  }
}
