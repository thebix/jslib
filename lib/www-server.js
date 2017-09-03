// Source: https://stackoverflow.com/questions/6084360/using-node-js-as-a-simple-web-server

import url from 'url'
import path from 'path'
import Rx from 'rxjs/Rx'

import lib from '../root'
import HttpServer from './http-server'

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

export const RESPONSE_STATUS = {
    HTTP_200: '200',
    HTTP_404: '404',
    CANT_CREATE_READ_STREAM: 'CANT_CREATE_READ_STREAM',
    API_CALL: 'API_CALL'
}

export default class WwwServer {
    constructor(port = 80, wwwroot = './', index = 'index.html', api = []) {
        this.httpServer = new HttpServer(port)
        this.wwwroot = wwwroot
        this.index = index
        this.api = api
    }
    static createEmpty() {
        return new WwwServer(0)
    }
    get response() {
        return this.httpServer.requests
            .concatMap(data => {
                const uri = url.parse(data.request.url).pathname
                const filename = path.join(process.cwd(), this.wwwroot, uri !== '/' ? uri : this.index)
                if (this.api && this.api.indexOf(uri) !== -1)
                    return Rx.Observable.of({ data, filename, isExists: false })
                return lib.fs.accessRead(filename)
                    .map(isExists => Object.create({ data, filename, isExists }))
            })
            .flatMap(file => {
                const { isExists, data, filename } = file
                const uri = url.parse(data.request.url).pathname
                if (this.api && this.api.indexOf(uri) !== -1)
                    return Rx.Observable.of({
                        data,
                        status: RESPONSE_STATUS.API_CALL
                    })
                if (!isExists) {
                    console.log(`not exists: ${filename}`)
                    data.response.writeHead(404, { 'Content-Type': 'text/plain' })
                    data.response.end('404 Not Found')

                    return Rx.Observable.of({
                        data,
                        status: RESPONSE_STATUS.HTTP_404
                    })
                }

                const mimeType = mimeTypes[path.extname(filename).split('.')[1]]
                data.response.writeHead(200, { 'Content-Type': mimeType })

                return lib.fs.createReadStream(filename)
                    .map(fileStream => {
                        fileStream.pipe(data.response)
                        return { data, status: RESPONSE_STATUS.HTTP_200 }
                    })
                    // INFO: not working
                    .catch(() => Object.create({
                        data,
                        status: RESPONSE_STATUS.CANT_CREATE_READ_STREAM
                    }))
            })
    }
    // TODO: builder pattern?
    set apiUrls(apiUrls) {
        this.api = Array.isArray(apiUrls) ? apiUrls : []
    }
    set wwwRootPath(value) {
        this.wwwroot = value || './'
    }
    set indexPage(page) {
        this.index = page || 'index.html'
    }
    // TODO: bad - already subscribed response() has old server
    set httpServerSet(port) {
        this.httpServer = new HttpServer(port)
    }
}
