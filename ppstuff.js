export const PP = (function() {
    const SPCSYM = '⎺' 
    const RETSYM = '↩️'
    const NULSYM = '␀'
    const UNDSYM = '⎕' 
    const COL = {
        none: '\x1b[0m',
        black: '\x1b[30m',
        red: '\x1b[31m',
        green: '\x1b[32m',
        yellow: '\x1b[33m',
        pink: '\x1b[34m',
        purple: '\x1b[35m',
        blue: '\x1b[36m'
    }
    const spaces = (s) => {
        return Array(typeof s == "number" ? s : s.length).fill(' ').join('')
    }

    const padded = (s, w) => {
        s = s.toString()
        const delta = w - s.length > 0 ? w - s.length : 0
        return s + spaces(delta)
    }

    const oneChar = (c, w=1) => {
        if (c === null || c === '') {
            c = NULSYM
        } else if (c === undefined) {
            c = UNDSYM
        } else if (c === '\n') {
            c = RETSYM
        } else if (c === ' ') {
            c = SPCSYM
        } else {
            c = c.toString()
        }

        return padded(c, w)
    }

    /**
     * 
     * @param {string} s 
     * @param {number} n suffix width. Default 3 (10% dup odds at ~75 items)
     * @returns 
     */
    function shortcode(s, n=3) {
        const cashMoneyB64digits = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRS$TUVWXY¥Z0123456789'
        const prefix = s.split('').map(x => oneChar(x)).join('')
        const suffix = Array(n).fill(0).map((_) => cashMoneyB64digits[Math.floor(Math.random()*64)]).join('')
        return `${prefix}#${suffix}`
    }

    return {
        colors: COL,
        SPCSYM,
        RETSYM,
        NULSYM,
        UNDSYM,
        spaces,
        padded,
        oneChar,
        shortcode
    }
}())

export function pprintProblem(title, lineno, msg, asError) {
    let log = asError ? (s) => console.log(s) : (s) => { console.error(s) }
    
    log(`${title}:${lineno}`)
    log(msg)
    log(Array(msg.length).fill('^').join(''))
    if (asError) {
        throw new Error(s) 
    }
}