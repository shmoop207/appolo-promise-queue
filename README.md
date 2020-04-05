# Appolo Thread
[![Build Status](https://travis-ci.org/shmoop207/appolo-promise-queue.svg?branch=master)](https://travis-ci.org/shmoop207/appolo-promise-queue) [![Dependencies status](https://david-dm.org/shmoop207/appolo-promise-queue.svg)](https://david-dm.org/shmoop207/appolo-promise-queue) [![NPM version](https://badge.fury.io/js/appolo-promise-queue.svg)](https://badge.fury.io/js/appolo-promise-queue)  [![npm Downloads](https://img.shields.io/npm/dm/appolo-promise-queue.svg?style=flat)](https://www.npmjs.com/package/appolo-promise-queue)
[![Known Vulnerabilities](https://snyk.io/test/github/shmoop207/appolo-promise-queue/badge.svg)](https://snyk.io/test/github/shmoop207/appolo-promise-queue)
Handle your promises in priority queue and control execution concurrency

## Installation

```javascript
npm install appolo-promise-queue --save
```

## Usage
```typescript
import { Queue } from 'appolo-promise-queue';
import got = require('got');


let queue = new Queue({concurrency: 1});

let promise1 = queue.add(async () => got("somesite"));
let promise2 = queue.add(async () => got("somesite2"));

let [result,result2] = await Promise.all([promise1,promise2])

```


## Api
#### Queue options:

- `concurrency` - max concurrent running promises default `1`
- `timeout` - max wait time for promise to settle on the promise wil be rejected default `null`
- `autoStart` - start running promises as the added default `true`
- `expire` - max time the job can wait in the queue is when passed the job will be removed without execution of the promise
- `timespan` - time frame in milliseconds of concurrency jobs

```javascript

const queue = new Queue({
    concurrency: 2, 
    timeout: 1000,
    autoStart: false,
    timespan:60000
});

```

#### add(fn,[options])
add job to queue with given Promise-returning/async function
##### options:
- `timeout` - override queue timeout for this job.
- `priority` - job priority in the queue greater priority will be scheduled first.
- `expire` - max time the job can wait in the queue before it removed.

returns promise when the origin promise settled; 

```javascript
const queue = new Queue();

await queue.add(async ()=>await "something",{timeout:1000,priority:100});

await queue.add(()=>Promise.resolve(),{expire:60000});

```

#### start()
Start (or resume) executing enqueued promises
#### stop()
stop queue execution

#### onDrain()
Returns a promise that settles when the queue becomes empty

#### onIdle()
Returns a promise that settles when the queue becomes empty, and all promises have completed
```javascript

const queue = new Queue();

 queue.add(async ()=>await "something",{timeout:1000,priority:100})
 
 await queue.onIdle();
```
#### clear()
clear the queue

#### size
get current queue size

#### pending
get current running promises

#### concurrency
get or set current concurrency

#### isRunning
return true if queue is not stopped

#### isDrained
return true if queue is empty

#### isIdle
return true if queue is empty and no running promises

#### has(fn)
return true if given fn exists in queue;

#### remove(fn)
removes given fn from queue

### Events

#### onDrainEvent
fires when queue becomes empty
```javascript

const queue = new Queue();

 queue.add(async ()=>await "something",{timeout:1000,priority:100})
 
 queue.onDequeueEvent.on(()=>"do something");
```
#### onIdleEvent
fires when the queue becomes empty, and all promises have completed

#### onDequeueEvent
fires when promise pulled from queue and start excitation


#### onResolvedEvent
fires when promise resolved


## License
MIT
