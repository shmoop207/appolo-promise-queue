"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const appolo_utils_1 = require("appolo-utils");
const defautls_1 = require("./defautls");
const appolo_event_dispatcher_1 = require("appolo-event-dispatcher");
class Queue {
    // private _drainPromise: Promise<void>;
    // private _drainResolve: Function;
    //
    // private _idlePromise: Promise<void>;
    // private _idleResolve: Function;
    constructor(options) {
        this._promises = [];
        this._pending = [];
        this._onDrainEvent = new appolo_event_dispatcher_1.Event();
        this._onIdleEvent = new appolo_event_dispatcher_1.Event();
        this._onResolvedEvent = new appolo_event_dispatcher_1.Event();
        this._onDequeueEvent = new appolo_event_dispatcher_1.Event();
        this._options = appolo_utils_1.Objects.defaults({}, options || {}, defautls_1.OptionsDefaults);
        if (this._options.autoStart) {
            this.start();
        }
    }
    start() {
        this._isRunning = true;
        this._dequeue();
    }
    stop() {
        this._isRunning = false;
    }
    get size() {
        return this._promises.length;
    }
    get pending() {
        return this._pending.length;
    }
    get isDrained() {
        return this._promises.length == 0;
    }
    get isIdle() {
        return this._promises.length == 0 && this._pending.length == 0;
    }
    get isRunning() {
        return this._isRunning;
    }
    get concurrency() {
        return this._options.concurrency;
    }
    set concurrency(value) {
        this._options.concurrency = value;
    }
    clear() {
        this._promises.length = 0;
    }
    get onDrainEvent() {
        return this._onDrainEvent;
    }
    get onResolvedEvent() {
        return this._onResolvedEvent;
    }
    get onDequeueEvent() {
        return this._onDequeueEvent;
    }
    get onIdleEvent() {
        return this._onIdleEvent;
    }
    onDrain() {
        return this._onDrainEvent.once();
    }
    onIdle() {
        return this._onIdleEvent.once();
    }
    add(fn, options = {}) {
        return new Promise((resolve, reject) => {
            this._promises.push({
                fn, reject, resolve,
                priority: options.priority || 0,
                timeout: options.timeout || this._options.timeout || 0
            });
            this._promises.sort((a, b) => b.priority - a.priority);
            this._dequeue();
        });
    }
    _checkEvents() {
        this.isDrained && (this._onDrainEvent.fireEvent());
        this.isIdle && (this._onIdleEvent.fireEvent());
    }
    _dequeue() {
        this._checkEvents();
        if (!this._isRunning || !this._promises.length || this._pending.length >= this._options.concurrency) {
            return;
        }
        let item = this._promises.shift();
        let promise = item.timeout ? appolo_utils_1.Promises.promiseTimeout(item.fn(), item.timeout) : item.fn();
        this._pending.push(item);
        this._onDequeueEvent.fireEvent();
        promise
            .then(value => {
            appolo_utils_1.Arrays.remove(this._pending, item);
            item.resolve(value);
            this._onResolvedEvent.fireEvent(value);
        })
            .catch(e => {
            appolo_utils_1.Arrays.remove(this._pending, item);
            item.reject(e);
        })
            .finally(() => {
            this._dequeue();
        });
        this._dequeue();
    }
}
exports.Queue = Queue;
//# sourceMappingURL=queue.js.map