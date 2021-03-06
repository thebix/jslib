// Source: https://nodejs.org/api/fs.html

import fs from 'fs'
import https from 'https'
import jsonfile from 'jsonfile'
import ReadWriteLock from 'rwlock'
import { of, Observable, empty } from 'rxjs'
import { catchError, mergeMap, switchMap } from 'rxjs/operators'
import { fromPromise } from 'rxjs/observable/fromPromise'
import csv from 'fast-csv'

const lock = new ReadWriteLock()

export default class FileSystem {
    readFile(file) {
        return new Promise((resolve, reject) => {
            lock.readLock(file, release => {
                fs.readFile(file, (err, data) => {
                    release()
                    if (err) return reject(err);
                    return resolve(data);
                });
            })
        })
    }
    saveFile(file, data) {
        return new Promise((resolve, reject) => {
            lock.writeLock(file, release => {
                fs.writeFile(file, data, err => {
                    release()
                    if (err) return reject(err);
                    return resolve();
                });
            })
        })
    }
    appendFile(file, data) {
        return new Promise((resolve, reject) => {
            lock.writeLock(file, release => {
                fs.appendFile(file, data, err => {
                    release()
                    if (err) return reject(err);
                    return resolve();
                });
            })
        })
    }
    readJson(file) {
        return new Promise((resolve, reject) => {
            lock.readLock(file, release => {
                jsonfile.readFile(file, (err, data) => {
                    release()
                    if (err) return reject(err);
                    return resolve(data);
                });
            })
        })
    }
    saveJson(file, data) {
        return new Promise((resolve, reject) => {
            lock.writeLock(file, release => {
                jsonfile.writeFile(file, data, err => {
                    release()
                    if (err) return reject(err);
                    return resolve();
                });
            })
        })
    }
    access(path, mode) {
        return new Promise((resolve, reject) => {
            lock.readLock(path, release => {
                fs.access(path, mode, err => {
                    release()
                    if (err) reject(err)
                    resolve({ path, mode })
                })
            })
        })
    }
    isExists(path) {
        return this.access(path, fs.constants.F_OK)
    }
    accessRead(path) {
        return this.access(path, fs.constants.R_OK)
    }
    mkDir(path) {
        return new Promise((resolve, reject) => {
            lock.writeLock(path, release => {
                fs.mkdir(path, undefined, err => {
                    release()
                    if (err) return reject(err);
                    return resolve();
                });
            })
        })
    }
    readDir(path) {
        return new Promise((resolve, reject) => {
            lock.writeLock(path, release => {
                fs.readdir(path, undefined, (err, files) => {
                    release()
                    if (err) return reject(err);
                    return resolve(files);
                });
            })
        })
    }
}

export class RxFileSystem {
    constructor() {
        this.filesystem = new FileSystem()
    }
    readFile(file, scheduler = null) {
        return fromPromise(this.filesystem.readFile(file), scheduler)
    }
    saveFile(file, data) {
        return fromPromise(this.filesystem.saveFile(file, data))
    }
    appendFile(file, data) {
        return fromPromise(this.filesystem.appendFile(file, data))
    }
    readJson(file) {
        return fromPromise(this.filesystem.readJson(file))
    }
    saveJson(file, data) {
        return fromPromise(this.filesystem.saveJson(file, data))
    }
    createReadStream(file) {
        return of(fs.createReadStream(file))
    }
    access(path, mode) {
        return fromPromise(this.filesystem.access(path, mode))
    }
    isExists(path) {
        return this.access(path, fs.constants.F_OK)
            .pipe(
                mergeMap(() => of(true)),
                catchError(() => of(false))
            )
    }
    accessRead(path) {
        return this.access(path, fs.constants.R_OK)
    }
    mkDir(path) {
        return fromPromise(this.filesystem.mkDir(path))
    }
    mkDirIfNotExists(path) {
        return this.isExists(path)
            .pipe(switchMap(isExists => {
                if (isExists)
                    return of(true)
                return this.mkDir(path)
            }))
    }
    readDir(path) {
        return fromPromise(this.filesystem.readDir(path))
    }
    // options = {{ headers: true }} https://www.npmjs.com/package/fast-csv
    readCsv(path, options = {}) {
        return Observable.create(observer => {
            csv
                .fromPath(path, options)
                .on('data', data => {
                    observer.next(data)
                })
                .on('end', () => {
                    observer.complete()
                })
        })
    }
    saveCsv(path, dataArray, options = { rowDelimiter: ',' }) {
        return Observable.create(observer => {
            csv.writeToPath(path, dataArray, options)
                .on('finish', () => {
                    observer.next(true)
                    observer.complete()
                })
        })
    }
    downloadFile(url, dest) {
        return Observable.create(observer => {
            const file = fs.createWriteStream(dest)
            https.get(url, response => {
                response.pipe(file)
                file.on('finish', () => {
                    // close() is async, call array function after close completes.
                    file.close(() => {
                        observer.next(file)
                        observer.complete()
                    })
                });
            }).on('error', err => { // Handle errors
                fs.unlink(dest) // Delete the file async. (But we don't check the result)
                observer.error(err)
            })
        })
    }
}
