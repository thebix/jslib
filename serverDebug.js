import _config from './config'
import lib from './root'

console.log(`Start server ${_config.isProduction ? '<Production>' : '<Debug>'}`)

console.log(lib.time.dateTimeString())
