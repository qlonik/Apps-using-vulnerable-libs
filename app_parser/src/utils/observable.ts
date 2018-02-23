import { EventEmitter } from 'events'
import Observable from 'zen-observable'


export const observableFromEventEmitter = (ee: EventEmitter, ev: string) => {
  return new Observable<any>((observer) => {
    const onMsgCb = (...args: any[]) => {
      observer.next(args)
    }
    ee.on(ev, onMsgCb)
    return () => ee.removeListener(ev, onMsgCb)
  })
}
