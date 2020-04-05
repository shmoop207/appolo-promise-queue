import {IOptions} from "./IOptions";

export let OptionsDefaults: Partial<IOptions> = {
    concurrency: 1,
    timeout: 0,
    expire: 0,
    timespan: 0,
    autoStart: true
};
