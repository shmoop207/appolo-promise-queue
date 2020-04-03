import {Objects, Arrays, Promises} from "appolo-utils";
import {IQueueItem} from "./IQueueItem";
import {IOptions} from "./IOptions";
import {OptionsDefaults} from "./defautls";
import {Event, IEvent} from "appolo-event-dispatcher";

export class Queue<T> {

    private _promises: IQueueItem<T>[] = [];
    private _pending: IQueueItem<T>[] = [];

    private _onDrainEvent = new Event<void>();
    private _onIdleEvent = new Event<void>();
    private _onResolvedEvent = new Event<any>();
    private _onDequeueEvent = new Event<void>();

    private _options: IOptions;

    private _isRunning: boolean;

    // private _drainPromise: Promise<void>;
    // private _drainResolve: Function;
    //
    // private _idlePromise: Promise<void>;
    // private _idleResolve: Function;

    constructor(options?: IOptions) {
        this._options = Objects.defaults({}, options || {}, OptionsDefaults);

        if (this._options.autoStart) {
            this.start();
        }
    }

    public start() {
        this._isRunning = true;
        this._dequeue();
    }

    public stop() {
        this._isRunning = false
    }

    public get size() {
        return this._promises.length
    }

    public get pending() {
        return this._pending.length
    }

    public get isDrained() {
        return this._promises.length == 0
    }

    public get isIdle() {
        return this._promises.length == 0 && this._pending.length == 0
    }

    public get isRunning() {
        return this._isRunning;
    }


    public get concurrency() {
        return this._options.concurrency
    }

    public set concurrency(value: number) {
        this._options.concurrency = value
    }

    public clear() {
        this._promises.length = 0;
    }

    public get onDrainEvent(): IEvent<void> {
        return this._onDrainEvent
    }

    public get onResolvedEvent(): IEvent<T> {
        return this._onResolvedEvent
    }

    public get onDequeueEvent(): IEvent<void> {
        return this._onDequeueEvent
    }


    public get onIdleEvent(): IEvent<void> {
        return this._onIdleEvent;
    }

    public onDrain(): Promise<void> {
        return this._onDrainEvent.once() as Promise<void>
    }

    public onIdle(): Promise<void> {
        return this._onIdleEvent.once() as Promise<void>
    }

    public add(fn: () => Promise<T>, options: { priority?: number, timeout?: number } = {}) {
        return new Promise((resolve, reject) => {
            this._promises.push({
                fn, reject, resolve,
                priority: options.priority || 0,
                timeout: options.timeout || this._options.timeout || 0
            });

            this._promises.sort((a, b) => b.priority - a.priority);
            this._dequeue();
        })
    }

    private _checkEvents() {
        this.isDrained && (this._onDrainEvent.fireEvent());
        this.isIdle && (this._onIdleEvent.fireEvent());
    }

    private _dequeue() {
        this._checkEvents();
        if (!this._isRunning || !this._promises.length || this._pending.length >= this._options.concurrency) {
            return;
        }

        let item = this._promises.shift();

        let promise = item.timeout ? Promises.promiseTimeout(item.fn(), item.timeout) : item.fn();

        this._pending.push(item);

        this._onDequeueEvent.fireEvent();

        promise
            .then(value => {
                Arrays.remove(this._pending, item);
                item.resolve(value);
                this._onResolvedEvent.fireEvent(value)
            })
            .catch(e => {
                Arrays.remove(this._pending, item);
                item.reject(e)
            })
            .finally(() => {
                this._dequeue();
            });

        this._dequeue();
    }


}
