// Source: https://nodejs.org/api/fs.html

import fs from 'fs'
import jsonfile from 'jsonfile'
import Rx from 'rxjs'
import ReadWriteLock from 'rwlock'

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

// TODO: think about Scheduler use
export class RxFileSystem {
    constructor() {
        this.filesystem = new FileSystem()
    }
    readFile(file, scheduler = null) {
        return Rx.Observable.fromPromise(this.filesystem.readFile(file), scheduler)
    }
    saveFile(file, data) {
        return Rx.Observable.fromPromise(this.filesystem.saveFile(file, data))
    }
    appendFile(file, data) {
        return Rx.Observable.fromPromise(this.filesystem.appendFile(file, data))
    }
    readJson(file) {
        return Rx.Observable.fromPromise(this.filesystem.readJson(file))
    }
    saveJson(file, data) {
        return Rx.Observable.fromPromise(this.filesystem.saveJson(file, data))
    }
    createReadStream(file) {
        return Rx.Observable.of(fs.createReadStream(file))
    }
    access(path, mode) {
        return Rx.Observable.fromPromise(this.filesystem.access(path, mode))
    }
    isExists(path) {
        return this.access(path, fs.constants.F_OK)
            .flatMap(() => Rx.Observable.of(true))
            .catch(() => Rx.Observable.of(false))
    }
    accessRead(path) {
        return this.access(path, fs.constants.R_OK)
            .flatMap(() => Rx.Observable.of(true))
            .catch(() => Rx.Observable.of(false))
    }
    mkDir(path) {
        return Rx.Observable.fromPromise(this.filesystem.mkDir(path))
    }
    readDir(path) {
        return Rx.Observable.fromPromise(this.filesystem.readDir(path))
    }
}
