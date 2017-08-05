// Source: https://stackoverflow.com/questions/6084360/using-node-js-as-a-simple-web-server

import url from 'url'
import path from 'path'
import Rx from 'rx'

import lib from '../root'
import HttpServer from './http-server'
import { WWW_RESPONSE_STATUS } from './const'

const mimeTypes = {
    html: 'text/html',
    mp3: 'audio/mpeg',
    mp4: 'video/mp4',
    jpeg: 'image/jpeg',
    jpg: 'image/jpeg',
    png: 'image/png',
    js: 'text/javascript',
    css: 'text/css'
}

export default class WwwServer {
    constructor(port = 80, wwwroot = './') {
        this.httpServer = new HttpServer(port)
        this.wwwroot = wwwroot
    }
    static createEmpty() {
        return new WwwServer(0)
    }
    get response() {
        return this.httpServer.requests
            .concatMap(data => {
                const uri = url.parse(data.request.url).pathname
                const filename = path.join(process.cwd(), this.wwwroot, uri !== '/' ? uri : 'index.html')
                return lib.fs.accessRead(filename)
                    .map(isExists => Object.create({ data, filename, isExists }))
            })
            .flatMap(file => {
                const { isExists, data, filename } = file
                if (!isExists) {
                    console.log(`not exists: ${filename}`)
                    return Rx.Observable.just({ data, status: WWW_RESPONSE_STATUS.STATUS_404 })
                }

                const mimeType = mimeTypes[path.extname(filename).split('.')[1]]
                data.response.writeHead(200, { 'Content-Type': mimeType })

                return lib.fs.createReadStream(filename)
                    .map(fileStream => {
                        fileStream.pipe(data.response)
                        return { data, status: WWW_RESPONSE_STATUS.STATUS_200 }
                    })
                    // INFO: not working
                    .catch(() => Object.create({ data, status: WWW_RESPONSE_STATUS.STATUS_CANT_CREATE_READ_STREAM }))
            })
    }
}
