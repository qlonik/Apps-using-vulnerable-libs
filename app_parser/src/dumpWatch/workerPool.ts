import { createPool, Pool } from 'generic-pool'
import { cpus } from 'os'
import { relative } from 'path'
import { WorkerInstance } from '../utils/workerPool'
import { messages } from './common'

const WORKER_PATH = relative(process.cwd(), require.resolve('./worker'))
const WORKER_MIN_AT_LEAST = 1
const WORKER_MAX_AT_LEAST = 3
const WORKER_EVICTION_TIMEOUT = 10 * 1000
const WORKER_IDLE_SHUTDOWN_TIMEOUT = 30 * 1000

/*
 * Creating pool of analysis executors
 */
const maxCPUs = cpus().length
export const workerPool: Pool<WorkerInstance<messages>> = createPool<WorkerInstance<messages>>(
  {
    create: () => WorkerInstance.create(WORKER_PATH),
    destroy: (w) => WorkerInstance.destroy(w),
  },
  {
    min: Math.max(Math.floor((maxCPUs - 1) / 2), WORKER_MIN_AT_LEAST),
    max: Math.max(maxCPUs - 1, WORKER_MAX_AT_LEAST),
    evictionRunIntervalMillis: WORKER_EVICTION_TIMEOUT,
    softIdleTimeoutMillis: WORKER_IDLE_SHUTDOWN_TIMEOUT,
    idleTimeoutMillis: Infinity,
  },
)
