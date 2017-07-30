// INFO: в дальнейшем можно добавить конструктор (с часовым поясом, например)

const weekdays = {
    mo: 1,
    tu: 2,
    we: 3,
    th: 4,
    fr: 5,
    sa: 6,
    su: 0,
    unknown: 8
}

export default class Time {
    getChangedDateTime(
        options = {
            years: null,
            months: null,
            days: null,
            hours: null,
            minutes: null,
            seconds: null,
            ticks: null
        },
        date = new Date()
    ) {
        const dt = new Date(date)
        if (options.years != null)
            dt.setFullYear(dt.getFullYear() + options.years)
        if (options.months != null)
            dt.setMonth(dt.getMonth() + options.months)
        if (options.days != null)
            dt.setDate(dt.getDate() + options.days)
        if (options.hours != null)
            dt.setHours(dt.getHours() + options.hours)
        if (options.minutes != null)
            dt.setMinutes(dt.getMinutes() + options.minutes)
        if (options.seconds != null)
            dt.setSeconds(dt.getSeconds() + options.seconds)
        if (options.ticks != null) {
            dt.setTime(dt.getTime() + options.ticks)
        }
        return dt
    }

    // 16.12.2017 | 16/12/2016 | 16.12.16 | 16/12 = 16/12/текущий год | 16 - текущий месяц
    getDate(date = new Date()) {
        if (Object.prototype.toString.call(date) === '[object Date]') return date
        const d = `${date}`
        let split = d.split('.')
        if (!split || split.length === 1)
            split = d.split('/')
        let year = split.length === 3 ? split[2] : (new Date()).getFullYear()
        year = +year
        if (year.toString().length < 4)
            year += 2000
        if (year > new Date().getFullYear()) year -= 100
        const month = split.length > 1 ? split[1] : (new Date()).getMonth() + 1
        const day = parseInt(split[0], 10)
        if (isNaN(day))
            return null
        return new Date(year, month - 1, day)
    }

    getStartDate(date = new Date()) {
        return new Date(date.getFullYear(), date.getMonth(), date.getDate())
    }

    dateTimeString(date = new Date()) {
        return `${this.dateString(date)} ${`0${date.getHours()}`.slice(-2)}:${`0${date.getMinutes()}`.slice(-2)}:${`0${date.getSeconds()}`.slice(-2)}`
    }

    dateString(date = new Date(), isFullYear = false) {
        // сокращенная запись только для этого столетия
        const century = Math.floor(date.getFullYear() / 100) * 100
        const yearDiff = isFullYear || century < 2000 ? 0 : 2000
        return `${`0${date.getDate()}`.slice(-2)}.${`0${(date.getMonth() + 1)}`.slice(-2)}.${date.getFullYear() - yearDiff}`
    }

    getWeekday(day) {
        if (day === null || day === undefined)
            return weekdays.unknown
        const d = `${day}`.toLowerCase()
        if (d === '1' || d === 'пн' || d === 'mo') return weekdays.mo
        if (d === '2' || d === 'вт' || d === 'tu') return weekdays.tu
        if (d === '3' || d === 'ср' || d === 'we') return weekdays.we
        if (d === '4' || d === 'чт' || d === 'th') return weekdays.th
        if (d === '5' || d === 'пт' || d === 'fr') return weekdays.fr
        if (d === '6' || d === 'сб' || d === 'sa') return weekdays.sa
        if (d === '0' || d === 'вс' || d === 'su') return weekdays.su
        return weekdays.unknown
    }

    dateWeekdayString(date = new Date()) {
        return `${this.weekdayString(date)} ${this.dateString(date)}`
    }

    weekdayString(date = new Date()) {
        const weekday = this.getWeekday(date.getDay())
        switch (weekday) {
            case weekdays.mo: return 'Пн'
            case weekdays.tu: return 'Вт'
            case weekdays.we: return 'Ср'
            case weekdays.th: return 'Чт'
            case weekdays.fr: return 'Пт'
            case weekdays.sa: return 'Сб'
            case weekdays.su: // case zero problem
            default: return 'Вс'
        }
    }

    getMonday(date = new Date(), next = false) {
        const d = new Date(date);
        const day = d.getDay()
        let diff
        if (!next && diff === 1) {
            diff = 0
        } else {
            // diff = 7 - day + (day === 0 ? -6 : 1)
            diff = 7 - day
            if (day === 0) diff -= 6;
            else diff += 1
        }
        return this.getStartDate(
            this.getChangedDateTime({ days: diff }, d))
    }

    daysBetween(d1, d2) {
        return Math.ceil((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24))
    }

    // search = mo | 16.12.2017 | 16.12 | 16
    getBack(search, after = new Date()) {
        // дата
        const date = this.getDate(search)
        if (date) {
            if (date.getTime() <= after.getTime())
                return date
            const slashs = `${search}`.split('/').length
            const dots = `${search}`.split('.').length
            if (slashs === 2 || dots === 2)
                return this.getChangedDateTime({ years: -1 }, date)
            if (slashs === 1 || dots === 1)
                return this.getChangedDateTime({ months: -1 }, date)
        }
        // день недели
        const weekday = this.getWeekday(search)
        if (weekday !== weekdays.unknown) {
            const start = this.getWeekday(after.getDay())
            let diff = 0
            if (start > weekday) { // искомый день на этой неделе
                diff = weekday - start
            } else if (start < weekday) { // искомый день на прошлой неделе
                diff = 7 - start - weekday
                diff = weekday - start - 7
            }
            const res = this.getChangedDateTime({ days: diff }, after)
            return new Date(res.getFullYear(), res.getMonth(), res.getDate())
        }
        return new Date()
    }

    isDateSame(d1, d2) {
        return d1.getFullYear() === d2.getFullYear()
            && d1.getMonth() === d2.getMonth()
            && d1.getDate() === d2.getDate()
    }
}
