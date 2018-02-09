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

export type serverMessage = serverMessage1 | serverMessage2

export type serverMessage1 = { from: messageFrom.server } & (
  { type: serverMessageType.startup } |
  ({ type: serverMessageType.process } & processRequest) |
  ({ type: serverMessageType.reanalyseLib } & reanalyseLibRequest) |
  { type: serverMessageType.shutdown }
  )

export type serverMessage2Data = (
  { type: serverMessageType.startup } |
  ({ type: serverMessageType.process } & processRequest) |
  ({ type: serverMessageType.reanalyseLib } & reanalyseLibRequest) |
  { type: serverMessageType.shutdown }
  )
export type serverMessage2 = {
  from: messageFrom.server,
  id: string,
  data: serverMessage2Data
}

export function isServerMessage1(m: serverMessage): m is serverMessage1 {
  return ('type' in m)
}

export function isServerMessage2(m: serverMessage): m is serverMessage2 {
  return ('id' in m)
}

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

export type clientMessage = clientMessage1 | clientMessage2

export type clientMessage1 = { from: messageFrom.client } & (
  { type: clientMessageType.startupDone } |
  ({ type: clientMessageType.processingResult } & processingResult) |
  ({ type: clientMessageType.reanalysisResult } & reanalysisResult) |
  { type: clientMessageType.delayShutdown }
  )

export type clientMessage2Data = (
  { type: clientMessageType.startupDone } |
  ({ type: clientMessageType.processingResult } & processingResult) |
  ({ type: clientMessageType.reanalysisResult } & reanalysisResult) |
  { type: clientMessageType.delayShutdown }
  )
export type clientMessage2 = {
  from: messageFrom.client,
  id: string,
  data: clientMessage2Data
}

export function isClientMessage1(m: clientMessage): m is clientMessage1 {
  return ('type' in m)
}

export function isClientMessage2(m: clientMessage): m is clientMessage2 {
  return ('id' in m)
}

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
