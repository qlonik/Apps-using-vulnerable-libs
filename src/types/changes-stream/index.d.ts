import { Readable } from 'stream'
import { Agent } from 'http'

interface Options {
  db: string
  feed?: 'continuous' | 'longpoll'
  filter?: string | string[] | (() => boolean)
  inactivity_ms?: number
  timeout?: number
  requestTimeout?: number
  agent?: Agent
  since?: number | 'now'
  heartbeat?: number
  style?: string
  include_docs?: boolean
  query_params?: { [name: string]: string }
  use_post?: boolean
}

declare class ChangesStream extends Readable {
  public constructor(options: string | Options)
}

export = ChangesStream
