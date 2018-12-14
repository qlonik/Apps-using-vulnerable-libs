import { Observable as RxOb } from 'rxjs'

export const streamToRx = <T>(stream: NodeJS.ReadableStream) =>
  new RxOb<T>((subscriber) => {
    const endHandler = () => subscriber.complete()
    const errorHandler = (e: Error) => subscriber.error(e)
    const dataHandler = (data: T) => subscriber.next(data)

    stream.addListener('end', endHandler)
    stream.addListener('error', errorHandler)
    stream.addListener('data', dataHandler)

    return () => {
      stream.removeListener('end', endHandler)
      stream.removeListener('error', errorHandler)
      stream.removeListener('data', dataHandler)
    }
  })
