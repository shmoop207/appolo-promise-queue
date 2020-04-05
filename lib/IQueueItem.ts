export interface IQueueItem<T> {
    fn: () => Promise<T>,
    resolve: (value?: T) => any,
    reject: (reason?: any) => any,
    priority: number,
    timeout: number
    expire: number
    insertTime: number
}
