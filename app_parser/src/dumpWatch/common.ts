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
  reanalyseLib,
  shutdown,
}

export type serverMessage = { from: messageFrom.server } & (
  { type: serverMessageType.startup } |
  ({ type: serverMessageType.process } & processRequest) |
  ({ type: serverMessageType.reanalyseLib } & reanalyseLibRequest) |
  { type: serverMessageType.shutdown }
  )

export type processRequest = {
  libsPath: string,
  dumpPath: string,
  filename: string,
}

export type reanalyseLibRequest = {
  libsPath: string,
  name: string,
  version: string,
}

export enum clientMessageType {
  startupDone,
  processingResult,
  reanalysisResult,
  delayShutdown,
}

export type clientMessage = { from: messageFrom.client } & (
  { type: clientMessageType.startupDone } |
  ({ type: clientMessageType.processingResult } & processingResult) |
  ({ type: clientMessageType.reanalysisResult } & reanalysisResult) |
  { type: clientMessageType.delayShutdown }
  )

export type processingResult = {
  filename: string,
  main?: fileDesc[],
  analysis?: fileDesc[],
}

export type reanalysisResult = {
  name: string,
  version: string,
  analysis?: fileDesc[],
}
