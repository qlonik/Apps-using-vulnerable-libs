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

export type serverMessage2Data = (
  { type: serverMessageType.startup } |
  ({ type: serverMessageType.process } & processRequest) |
  ({ type: serverMessageType.reanalyseLib } & reanalyseLibRequest) |
  { type: serverMessageType.shutdown }
  )
export type serverMessage = {
  from: messageFrom.server,
  id: string,
  data: serverMessage2Data
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

export type clientMessage2Data = (
  { type: clientMessageType.startupDone } |
  ({ type: clientMessageType.processingResult } & processingResult) |
  ({ type: clientMessageType.reanalysisResult } & reanalysisResult) |
  { type: clientMessageType.delayShutdown }
  )
export type clientMessage = {
  from: messageFrom.client,
  id: string,
  data: clientMessage2Data
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

export type ServerMsg = any
export type ClientMsg = any
export type MessagesMap = {
  [x: string]: [ServerMsg, ClientMsg],
}

export type WorkerFunctionsMap<T extends MessagesMap> = {
  [S in keyof T]: (o: T[S][0]) => (T[S][1] | Promise<T[S][1]>)
  }

export type serverMessage3<Msg extends MessagesMap, Type extends keyof Msg> = {
  from: messageFrom,
  id: string,
  type: Type,
  data: Msg[Type][0],
}
export type clientMessage3<Msg extends MessagesMap, Type extends keyof Msg> = {
  from: messageFrom,
  id: string,
  type: Type,
  data: Msg[Type][1],
}
export type startupMsg = {
  id: string,
  type: 'up',
}
export type shutdownMsg = {
  id: string,
  type: 'down',
}

export type messages = {
  process: [processRequest, processingResult],
  reanalyse: [reanalyseLibRequest, reanalysisResult],
}
