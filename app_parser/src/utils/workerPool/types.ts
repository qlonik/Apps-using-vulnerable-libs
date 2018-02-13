export enum FROM {
  server,
  client,
}

export type ServerMsg = any
export type ClientMsg = any
export type MessagesMap = {
  [x: string]: [ServerMsg, ClientMsg],
}

export type WorkerFunctionsMap<T extends MessagesMap> = {
  [S in keyof T]: (o: T[S][0]) => (T[S][1] | Promise<T[S][1]>)
  }

export type startupMsg = {
  id: string,
  type: 'up',
}
export type shutdownMsg = {
  id: string,
  type: 'down',
}

export type ServerClientMessage
  <Msg extends MessagesMap,
    Type extends keyof Msg,
    From extends FROM> = {
  from: From,
  id: string,
  type: Type,
  data: Msg[Type][From],
}
export type serverMessage3<Msg extends MessagesMap, Type extends keyof Msg> =
  ServerClientMessage<Msg, Type, FROM.server>
export type clientMessage3<Msg extends MessagesMap, Type extends keyof Msg> =
  ServerClientMessage<Msg, Type, FROM.client>
