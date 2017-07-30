// Source: https://nodejs.org/api/fs.html

import fs from 'fs'
import jsonfile from 'jsonfile'
import Rx from 'rx'

export default class FileSystem {
    readFile(file) {
        return new Promise((resolve, reject) => {
            fs.readFile(file, (err, data) => {
                if (err) return reject(err);
                return resolve(data);
            });
        })
    }
    saveFile(file, data) {
        return new Promise((resolve, reject) => {
            fs.writeFile(file, data, err => {
                if (err) return reject(err);
                return resolve();
            });
        })
    }
    appendFile(file, data) {
        return new Promise((resolve, reject) => {
            fs.appendFile(file, data, err => {
                if (err) return reject(err);
                return resolve();
            });
        })
    }
    readJson(file) {
        return new Promise((resolve, reject) => {
            jsonfile.readFile(file, (err, data) => {
                if (err) return reject(err);
                return resolve(data);
            });
        })
    }
    saveJson(file, data) {
        return new Promise((resolve, reject) => {
            jsonfile.writeFile(file, data, err => {
                if (err) return reject(err);
                return resolve();
            });
        })
    }
    access(path, mode) {
        return new Promise((resolve, reject) => {
            fs.access(path, mode, err => {
                if (err) reject(err)
                resolve({ path, mode })
            })
        })
    }
    isExists(path) {
        return this.access(path, fs.constants.F_OK)
    }
    accessRead(path) {
        return this.access(path, fs.constants.R_OK)
    }

    // sync
    isFileExistsSync(path, isMakeIfNot = false, isLogErrIfNot = false, data = '') {
        if (!fs.existsSync(path)) {
            if (isLogErrIfNot) {
                console.log(`Директория или файл с путем '${path}' не существует. ${isMakeIfNot ? 'Создаем' : 'Не создаем'}`)
            }
            if (!isMakeIfNot) {
                return false
            }
            fs.writeFileSync(path, data)
        }
        return true
    }
    isDirExistsSync(path, isMakeIfNot = false, isLogErrIfNot = false) {
        if (!fs.existsSync(path)) {
            if (isLogErrIfNot) {
                console.error(`Директория или файл с путем '${path}' не существует. ${isMakeIfNot ? 'Создаем' : 'Не создаем'}`)
            }
            if (!isMakeIfNot) {
                return false
            }
            fs.mkdirSync(path)
        }
        return true
    }
    readFileSync(file, options) {
        try {
            return fs.readFileSync(file, options)
        } catch (ex) {
            console.error(ex)
        }
        return ''
    }
}

export class RxFileSystem {
    constructor() {
        this.filesystem = new FileSystem()
    }
    readFile(file) {
        return Rx.Observable.fromPromise(this.filesystem.readFile(file))
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
        return Rx.Observable.just(fs.createReadStream(file))
    }
    access(path, mode) {
        return Rx.Observable.fromPromise(this.filesystem.access(path, mode))
    }
    isExists(path) {
        return this.access(path, fs.constants.F_OK)
            .flatMap(() => Rx.Observable.just(true))
            .catch(() => Rx.Observable.just(false))
    }
    accessRead(path) {
        return this.access(path, fs.constants.R_OK)
            .flatMap(() => Rx.Observable.just(true))
            .catch(() => Rx.Observable.just(false))
    }
}
