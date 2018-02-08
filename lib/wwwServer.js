import url from 'url'
import path from 'path'
import { Observable } from 'rxjs'

import HttpServer from './httpServer'
import lib from '../root'

const NODE_PROCESS_PATH = process.cwd()

export const mimeTypes = {
    html: 'text/html',
    mp3: 'audio/mpeg',
    mp4: 'video/mp4',
    jpeg: 'image/jpeg',
    jpg: 'image/jpeg',
    png: 'image/png',
    js: 'text/javascript',
    json: 'application/json',
    css: 'text/css',
    text: 'text/plain'
}

/*
 * headData = [{ 'Access-Control-Allow-Origin': '*' }]
 */
export class WwwResponse {
    constructor({
        httpCode = 404,
        contentType = 'text/plain',
        filePath = '',
        data = undefined,
        headData = []
    }) {
        this.httpCode = httpCode
        this.contentType = contentType
        this.filePath = filePath
        this.data = data
        this.headData = headData
    }
}

const handleFileDefault = filename =>
    lib.fs.accessRead(filename)
        .map(isExists => {
            if (!isExists) {
                return new WwwResponse({
                    httpCode: 404,
                    filePath: filename,
                    contentType: mimeTypes.text,
                    data: '404 not found'
                })
            }

            const mimeType = mimeTypes[path.extname(filename).split('.')[1]]
            return new WwwResponse({
                filePath: filename,
                httpCode: 200,
                contentType: mimeType
            })
        })

/*
 * handleApi = {
 *      'api_url1': (body) => Observable.of(new WwwResponse()),
 *      'api_url2': (body) => Observable.of(new WwwResponse()),
 * }
 * handleFileOverride = filename => Observable.of(new WwwResponse())
 */
export default class WwwServer {
    constructor({
        port = 80,
        wwwRoot = './wwwroot_dev',
        index = 'index.html',
        handleApi = undefined,
        handleFileOverride = undefined
    }) {
        this.port = port
        this.wwwRoot = wwwRoot
        this.index = index
        this.apiUrls = handleApi ? Object.keys(handleApi) : []
        this.handleApi = handleApi || {}
        this.handleFile = handleFileOverride || handleFileDefault
        this.httpServer = new HttpServer(port)
    }

    get response() {
        const wwwRoot = this.wwwRoot
        const index = this.index
        const api = this.apiUrls
        const handleApi = this.handleApi
        const handleFile = this.handleFile

        const requestsObservable = this.httpServer.requests.share()

        const apiRequestObservable =
            requestsObservable
                .filter(data => {
                    const uri = url.parse(data.request.url).pathname
                    return api && api.indexOf(uri) !== -1
                })

        const fileRequestsObservable =
            requestsObservable
                .filter(data => {
                    const uri = url.parse(data.request.url).pathname
                    return !api || api.indexOf(uri) === -1
                })

        const apiResponseObservable =
            apiRequestObservable
                .flatMap(data =>
                    Observable.merge(
                        Observable.fromEvent(data.request, 'data')
                            .map(bodyBytes => Object.create({
                                body: bodyBytes ? JSON.parse(bodyBytes.toString()) : {},
                                data
                            })),
                        Observable.fromEvent(data.request, 'end')
                            .map(() => Object.create({
                                body: {},
                                data
                            }))
                    ).take(1)
                )
                .flatMap(bodyAndData => {
                    const { body, data } = bodyAndData
                    const uri = url.parse(data.request.url).pathname
                    const apiHandlerObservable = handleApi[uri]
                    return apiHandlerObservable({ body, method: data.request.method })
                        .map(apiResponse => Object.create({ data, apiResponse }))
                })
                .flatMap(wwwData => {
                    const { data, apiResponse } = wwwData
                    data.response.writeHead(apiResponse.httpCode, {
                        'Content-Type': apiResponse.contentType,
                        ...apiResponse.headData
                    })
                    data.response.end(apiResponse.data)
                    return Observable.of(true)
                })

        const fileResponseObservable =
            fileRequestsObservable
                .flatMap(data => {
                    const uri = url.parse(data.request.url).pathname
                    const filename = path.join(NODE_PROCESS_PATH, wwwRoot, uri !== '/' ? uri : index)
                    return handleFile(filename)
                        .map(wwwResponse => Object.create({ data, wwwResponse }))
                })
                .flatMap(wwwData => {
                    const { data, wwwResponse } = wwwData
                    if (wwwResponse.httpCode === 404) {
                        console.log(`not exists: ${wwwResponse.filePath}`)
                        data.response.writeHead(wwwResponse.httpCode, {
                            'Content-Type': wwwResponse.contentType,
                            ...wwwResponse.headData
                        })
                        data.response.end(wwwResponse.data)
                        return Observable.of(false)
                    }
                    data.response.writeHead(wwwResponse.httpCode, {
                        'Content-Type': wwwResponse.contentType,
                        ...wwwResponse.headData
                    })
                    return lib.fs.createReadStream(wwwResponse.filePath)
                        .map(fileStream => {
                            fileStream.pipe(data.response)
                            return true
                        })
                    // INFO: not working
                    // .catch(() => Object.create({
                    //     data,
                    //     status: RESPONSE_STATUS.CANT_CREATE_READ_STREAM
                    // }))
                })

        return Observable.merge(
            apiResponseObservable,
            fileResponseObservable
        )
    }
}
