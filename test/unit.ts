"use strict";
import chai = require('chai');
import {Promises, Numbers} from "appolo-utils";
import {createQueue, Queue} from "../index";
import sinonChai = require("sinon-chai");

chai.use(sinonChai);

let should = chai.should();

describe("Promise Queue", function () {


    it('should run promises with queue ', async () => {
        let queue = createQueue();

        let promise = queue.add(async () => 1);

        queue.isRunning.should.be.ok;
        queue.pending.should.be.eq(1);
        queue.size.should.be.eq(0);
        queue.isDrained.should.be.eq(true);
        queue.isIdle.should.be.eq(false);

        let result = await promise;

        result.should.be.eq(1);
        queue.isIdle.should.be.eq(true);

    });

    it('should run promises with queue concurrency ', async () => {
        let queue = createQueue({concurrency: 2});

        let promise = queue.add(async () => 1);
        let promise2 = queue.add(async () => {
            await Promises.delay(100);
            return 2
        });
        let promise3 = queue.add(async () => 3);

        queue.pending.should.be.eq(2);
        queue.size.should.be.eq(1);
        queue.isDrained.should.be.eq(false);

        let [result1, result2, result3] = await Promise.all([promise, promise2, promise3]);

        result1.should.be.eq(1);
        result2.should.be.eq(2);
        result3.should.be.eq(3);
        queue.isIdle.should.be.eq(true);

    });

    it('should run promises with queue start stop ', async () => {
        let queue = createQueue({concurrency: 2});

        queue.stop();
        queue.add(async () => Promises.delay(20000));
        queue.add(async () => Promises.delay(20000));
        queue.add(async () => Promises.delay(20000));
        queue.add(async () => Promises.delay(20000));
        queue.add(async () => Promises.delay(20000));
        queue.size.should.be.eq(5);
        queue.pending.should.be.eq(0);
        queue.isRunning.should.be.eq(false);

        queue.start();
        queue.size.should.be.eq(3);
        queue.pending.should.be.eq(2);
        queue.isRunning.should.be.eq(true);

        queue.add(async () => Promises.delay(20000));
        queue.stop();
        queue.size.should.be.eq(4);
        queue.pending.should.be.eq(2);
        queue.isRunning.should.be.eq(false);

        queue.start();
        queue.size.should.be.eq(4);
        queue.pending.should.be.eq(2);
        queue.isRunning.should.be.eq(true);

        queue.clear();
        queue.size.should.be.eq(0);
    });

    it('should run promises with queue priority ', async () => {
        const result: number[] = [];

        let queue = createQueue({concurrency: 1});

        queue.add(async () => result.push(1), {priority: 1});
        queue.add(async () => result.push(0), {priority: 0});
        queue.add(async () => result.push(1), {priority: 1});
        queue.add(async () => result.push(2), {priority: 1});
        queue.add(async () => result.push(3), {priority: 2});
        queue.add(async () => result.push(0), {priority: -1});

        await queue.onIdle();
        result.should.be.deep.equal([1, 3, 1, 2, 0, 0])
    });

    it('should handle big queue and concurrency', async () => {
        const concurrency = 5;
        const queue = new Queue({concurrency});
        let running = 0;

        const input = new Array(100).fill(0).map(async () => queue.add(async () => {
            running++;
            (running <= concurrency).should.be.ok;
            (queue.pending <= concurrency).should.be.ok;
            await Promises.delay(Numbers.random(5, 20));
            running--;
        }));

        await Promise.all(input);
    });

    it('should run queue with timeout', async () => {
        const result: number[] = [];

        const queue = new Queue({concurrency: 2, timeout: 10});

        queue.add(async () => {
            await Promises.delay(20);
            result.push(1)
        }).catch(() => {

        });
        queue.add(async () => {
            await Promises.delay(5);
            result.push(0)
        }).catch(() => {
        });

        await queue.onIdle();

        result.should.be.deep.equal([0])

    });

    it('should run queue with onDrain', async () => {
        const queue = new Queue({concurrency: 1});

        queue.add(async () => 0);
        queue.add(async () => 0);
        queue.size.should.be.eq(1);
        queue.pending.should.be.eq(1);
        await queue.onDrain();
        queue.size.should.be.eq(0);

        queue.add(async () => 0);
        queue.add(async () => 0);
        queue.size.should.be.eq(1);
        queue.pending.should.be.eq(1);
        await queue.onDrain();
        queue.size.should.be.eq(0);

    });

    it('should run queue with onIdle', async () => {
        const queue = new Queue({concurrency: 2});

        queue.add(async () => Promises.delay(100));
        queue.add(async () => Promises.delay(100));
        queue.add(async () => Promises.delay(100));
        queue.size.should.be.eq(1);
        queue.pending.should.be.eq(2);
        await queue.onIdle();
        queue.size.should.be.eq(0);
        queue.pending.should.be.eq(0);

        queue.add(async () => Promises.delay(100));
        queue.add(async () => Promises.delay(100));
        queue.add(async () => Promises.delay(100));
        queue.size.should.be.eq(1);
        queue.pending.should.be.eq(2);
        await queue.onIdle();
        queue.size.should.be.eq(0);
        queue.pending.should.be.eq(0);

    })


});
