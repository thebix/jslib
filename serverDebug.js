import lib from './root'

const isProduction = process.env.NODE_ENV === 'production'

console.log(`Start server ${isProduction ? '<Production>' : '<Debug>'}`)

console.log(lib.time.dateTimeString())
