import { fileDesc } from '../utils/files'


export const LOG_NAMESPACE = 'wtchr'

/*
 * Message types
 */
export enum messageFrom {
  server,
  client,
}

export enum serverMessageType {
  startup,
  process,
  shutdown,
}

export type serverMessage = { from: messageFrom.server } & (
  { type: serverMessageType.startup } |
  { type: serverMessageType.shutdown } |
  ({ type: serverMessageType.process } & processRequest)
  )

export type processRequest = {
  libsPath: string,
  dumpPath: string,
  filename: string,
}

export enum clientMessageType {
  startupDone,
  processingResult,
  delayShutdown,
}

export type clientMessage = { from: messageFrom.client } & (
  { type: clientMessageType.delayShutdown } |
  ({ type: clientMessageType.processingResult } & processingResult) |
  { type: clientMessageType.startupDone }
  )

export type processingResult = {
  filename: string,
  main?: fileDesc[],
  analysis?: fileDesc[],
}
