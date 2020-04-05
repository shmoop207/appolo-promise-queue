"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const appolo_utils_1 = require("appolo-utils");
const defautls_1 = require("./defautls");
const appolo_event_dispatcher_1 = require("appolo-event-dispatcher");
class Queue {
    constructor(options) {
        this._items = [];
        this._pending = [];
        this._onDrainEvent = new appolo_event_dispatcher_1.Event();
        this._onIdleEvent = new appolo_event_dispatcher_1.Event();
        this._onResolvedEvent = new appolo_event_dispatcher_1.Event();
        this._onDequeueEvent = new appolo_event_dispatcher_1.Event();
        this._lastDequeueTime = 0;
        this._options = appolo_utils_1.Objects.defaults({}, options || {}, defautls_1.OptionsDefaults);
        if (this._options.autoStart) {
            this.start();
        }
        this._setTimeSpanWindow();
    }
    start() {
        this._isRunning = true;
        this._dequeue();
    }
    stop() {
        this._isRunning = false;
    }
    get size() {
        return this._items.length;
    }
    get pending() {
        return this._pending.length;
    }
    get isDrained() {
        return this._items.length == 0;
    }
    get isIdle() {
        return this._items.length == 0 && this._pending.length == 0;
    }
    get canExecute() {
        return this._pending.length < this._options.concurrency;
    }
    get isRunning() {
        return this._isRunning;
    }
    get concurrency() {
        return this._options.concurrency;
    }
    set concurrency(value) {
        this._options.concurrency = value;
        this._setTimeSpanWindow();
    }
    get timespan() {
        return this._options.timespan;
    }
    set timespan(value) {
        this._options.timespan = value;
        this._setTimeSpanWindow();
    }
    _setTimeSpanWindow() {
        this._options.timespan && (this._timeSpanWindow = this._options.timespan / this._options.concurrency);
    }
    clear() {
        this._items.length = 0;
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
    remove(fn) {
        appolo_utils_1.Arrays.removeBy(this._items, item => item.fn === fn);
    }
    has(fn) {
        return !!this._items.find(item => item.fn === fn);
    }
    add(fn, options = {}) {
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
        });
    }
    _checkEvents() {
        this.isDrained && (this._onDrainEvent.fireEvent());
        this.isIdle && (this._onIdleEvent.fireEvent());
    }
    _dequeue() {
        this._checkEvents();
        if (!this.isRunning || this.isDrained || !this.canExecute || !this._isValidTimespan()) {
            return;
        }
        this._dequeueItem();
        this._dequeue();
    }
    _isValidTimespan() {
        if (!this._options.timespan) {
            return true;
        }
        let offset = Date.now() - this._lastDequeueTime - this._timeSpanWindow;
        if (offset >= 0) {
            return true;
        }
        clearTimeout(this._dequeueInterval);
        this._dequeueInterval = setTimeout(() => this._dequeue(), Math.abs(offset));
        return false;
    }
    _dequeueItem() {
        let item = this._items.shift();
        if (item.expire && item.expire + item.insertTime < Date.now()) {
            return;
        }
        let promise = item.timeout ? appolo_utils_1.Promises.promiseTimeout(item.fn(), item.timeout) : item.fn();
        this._pending.push(item);
        this._lastDequeueTime = Date.now();
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
            .finally(() => this._dequeue());
    }
}
exports.Queue = Queue;
//# sourceMappingURL=queue.js.map