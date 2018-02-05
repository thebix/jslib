import { RxFileSystem } from './lib/fs'
import Time from './lib/time'

const fs = new RxFileSystem()
const time = new Time()

export default {
    fs,
    time
}
