import { Subject } from 'rxjs'
import lib from '../root'

export const timerTypes = {
    NONE: 'NONE',
    MAIN: 'MAIN',
    MONTHLY: 'MONTHLY',
    WEEKLY: 'WEEKLY',
    SOON: 'SOON'
}

export default class Timer {
    constructor(type, callback) {
        if (!type || type === timerTypes.NONE) {
            throw Object.create({ message: `В конструктор таймера не передан тип. timerTypes = ${type}` })
        }
        if (!callback || typeof callback !== 'function') {
            throw Object.create({ message: 'В конструктор таймера не передана колбэк функция' })
        }
        this.type = type // тип таймера
        this.timerId = null // выключение таймера по id
        this.callback = callback // функция "триггер таймера"
        this.onTrigger = this.onTrigger.bind(this) // функция "триггер по интервалу"
        this.onCheckDateTime = this.onCheckDateTime.bind(this) // функция "триггер по дате"
        this.start = this.start.bind(this) // функция "старт таймера"
        this.isStopped = true // Состояние таймера - выключен
    }
    onCheckDateTime() {
        if (this.isStopped)
            return
        const dt = new Date()
        if (!this.dateTime || dt < this.dateTime) {
            if (this.timerId)
                clearInterval(this.timerId)
            let interval = this.dateTime.getTime() - dt.getTime()
            if (interval < 2000) interval = 2000
            this.timerId = setTimeout(this.onCheckDateTime, interval)
            this.isStopped = false
            return
        }
        this.isStopped = true
        this.callback(this.type)
    }
    onTrigger() {
        if (this.isStopped)
            return
        this.isStopped = true
        this.callback(this.type)
    }
    start({ interval, dateTime }) {
        if (interval) {
            this.isStopped = false
            this.timerId = setTimeout(this.onTrigger, interval * 1000)
        } else if (dateTime) {
            this.dateTime = dateTime
            this.isStopped = false
            let intrvl = this.dateTime.getTime() - (new Date()).getTime()
            if (intrvl < 2000) intrvl = 2000
            this.timerId = setTimeout(this.onCheckDateTime, intrvl)
        }
    }
    stop() {
        this.isStopped = true
        if (this.timerId)
            clearInterval(this.timerId)
    }
}

export class IntervalTimerRx {
    constructor(type) {
        this.timerSubject = new Subject()
        this.type = type
        this.timerCallback = this.timerCallback.bind(this)
        this.timer = new Timer(type, this.timerCallback)
    }
    timerEvent() {
        return this.timerSubject.asObservable()
    }
    start() {
        let nextEmitDate
        if (this.type === timerTypes.WEEKLY) {
            nextEmitDate = lib.time.getChangedDateTime(
                { seconds: 23 },
                lib.time.getMonday(new Date(), true)
            )
        } else if (this.type === timerTypes.MONTHLY) {
            const dt = new Date()
            nextEmitDate = lib.time.getChangedDateTime(
                { months: 1, seconds: 23 },
                new Date(dt.getFullYear(), dt.getMonth(), 1)
            )
        } else if (this.type === timerTypes.SOON) {
            const dt = new Date()
            nextEmitDate = lib.time.getChangedDateTime({ seconds: 1 }, dt)
        } else {
            throw Object.create({ message: `timer: IntervalTimerRx: start: unknown type of timer, type: <${this.type}>` })
        }
        this.timer.start({ dateTime: nextEmitDate })
    }
    stop() {
        this.timer.stop()
    }
    timerCallback(type) {
        this.timerSubject.next(type)
        this.start()
    }
}
