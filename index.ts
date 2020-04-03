import {Queue} from "./lib/queue"
import {IOptions} from "./lib/IOptions"

export {Queue, IOptions}

export function createQueue(options?:IOptions) {
    return new Queue(options)
}
