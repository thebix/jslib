import { RxFileSystem } from './lib/fs'
import Time from './lib/time'
import WwwServer from './lib/www-server'
import config from './config'

const fs = new RxFileSystem()
const time = new Time()
const www = config && config.http
    ? new WwwServer(config.http.port, config.http.wwwroot)
    : WwwServer.createEmpty()

export default {
    fs,
    time,
    www
}
