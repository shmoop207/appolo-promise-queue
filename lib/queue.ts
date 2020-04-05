import {Objects, Arrays, Promises} from "appolo-utils";
import {IQueueItem} from "./IQueueItem";
import {IOptions} from "./IOptions";
import {OptionsDefaults} from "./defautls";
import {Event, IEvent} from "appolo-event-dispatcher";

export class Queue<T> {

    private _items: IQueueItem<T>[] = [];
    private _pending: IQueueItem<T>[] = [];

    private _onDrainEvent = new Event<void>();
    private _onIdleEvent = new Event<void>();
    private _onResolvedEvent = new Event<any>();
    private _onDequeueEvent = new Event<void>();

    private _options: IOptions;

    private _isRunning: boolean;
    private _timeSpanWindow: number;

    private _lastDequeueTime: number = 0;
    private _dequeueInterval: NodeJS.Timeout;

    constructor(options?: IOptions) {
        this._options = Objects.defaults({}, options || {}, OptionsDefaults);

        if (this._options.autoStart) {
            this.start();
        }

        this._setTimeSpanWindow();
    }

    public start() {
        this._isRunning = true;
        this._dequeue();
    }

    public stop() {
        this._isRunning = false
    }

    public get size() {
        return this._items.length
    }

    public get pending() {
        return this._pending.length
    }

    public get isDrained(): boolean {
        return this._items.length == 0
    }

    public get isIdle(): boolean {
        return this._items.length == 0 && this._pending.length == 0
    }

    public get canExecute(): boolean {
        return this._pending.length < this._options.concurrency
    }

    public get isRunning() {
        return this._isRunning;
    }


    public get concurrency() {
        return this._options.concurrency
    }

    public set concurrency(value: number) {
        this._options.concurrency = value;
        this._setTimeSpanWindow();
    }

    public get timespan() {
        return this._options.timespan;
    }

    public set timespan(value: number) {
        this._options.timespan = value;
        this._setTimeSpanWindow();
    }

    private _setTimeSpanWindow() {
        this._options.timespan && (this._timeSpanWindow = this._options.timespan / this._options.concurrency);
    }

    public clear() {
        this._items.length = 0;
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

    public remove(fn: () => Promise<T>): void {
        Arrays.removeBy(this._items, item => item.fn === fn);
    }

    public has(fn: () => Promise<T>): boolean {
        return !!this._items.find(item => item.fn === fn)
    }


    public add(fn: () => Promise<T>, options: { priority?: number, timeout?: number, expire?: number } = {}) {
        return new Promise((resolve, reject) => {
            this._items.push({
                fn, reject, resolve,
                priority: options.priority || 0,
                timeout: options.timeout || this._options.timeout || 0,
                expire: options.expire || this._options.expire || 0,
                insertTime: Date.now()
            });

            this._items.sort((a, b) => b.priority - a.priority);
            this._dequeue();
        })
    }

    private _checkEvents() {
        this.isDrained && (this._onDrainEvent.fireEvent());
        this.isIdle && (this._onIdleEvent.fireEvent());
    }

    private _dequeue() {

        this._checkEvents();

        if (!this.isRunning || this.isDrained || !this.canExecute || !this._isValidTimespan()) {
            return;
        }

        this._dequeueItem();

        this._dequeue();
    }

    private _isValidTimespan(): boolean {
        if (!this._options.timespan) {
            return true
        }

        let offset = Date.now() - this._lastDequeueTime - this._timeSpanWindow;

        if (offset >= 0) {
            return true
        }

        clearTimeout(this._dequeueInterval);

        this._dequeueInterval = setTimeout(() => this._dequeue(), Math.abs(offset));

        return false;
    }

    private _dequeueItem() {
        let item = this._items.shift();

        if (item.expire && item.expire + item.insertTime < Date.now()) {
            return;
        }

        let promise = item.timeout ? Promises.promiseTimeout(item.fn(), item.timeout) : item.fn();

        this._pending.push(item);

        this._lastDequeueTime = Date.now();

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
            .finally(() => this._dequeue());
    }
}
