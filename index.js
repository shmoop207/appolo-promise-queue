"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const queue_1 = require("./lib/queue");
exports.Queue = queue_1.Queue;
function createQueue(options) {
    return new queue_1.Queue(options);
}
exports.createQueue = createQueue;
//# sourceMappingURL=index.js.map