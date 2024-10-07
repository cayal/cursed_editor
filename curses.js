import { PP } from "./ppstuff"
import { ModalCharGazer } from "./filePeeking"

/**
 * Represent a string as a chain of corruptions from the original.
 * An input string S begins its representation as S', the shattered
 * memory of S. S' can be cleaved at any point into S'1 and S'2. Any
 * shattered memory S'x can be imprisoned in a demonic destruction 
 * dungeon, which silences the cry of the immured, or usurped by a 
 * devious deposition, which bumps the deposed down the chain.
 */
export class CursedAnthology {
    #tome
    id

    constructor(stringContent) {
        this.id = Symbol(PP.shortcode('anth'))
        this.#tome = [ new ShatteredMemory(stringContent) ]
    }

    // Cardinality: {sum(t.length) for t of tome}
    #_ptrs
    get #pointers() {
        if (this.#_ptrs) { return this.#_ptrs}
        else { 
            let ptrs = []
            let o = 0
            let p = 0
            let stn = 0
            for (let stanza of this.#tome) {
                let i = 0
                for (let _ of stanza.voice) {
                    ptrs.push({
                        offset: o, 
                        pageno: p, 
                        inset: i, 
                        stanza: stanza,
                        stanzano: stn
                    })
                    o++, i++
                }

                if (stanza.voice.length <= 0) { 
                    ptrs.push({offset: o, pageno: p, inset: i, stanza: stanza, stanzano: stn}) 
                }
                else { p++ }
                stn++
            }
            this.#_ptrs = ptrs
        }
        return this.#_ptrs
    }
    
    /**
     * 
     * This should be a simple lookup for the vpage
     *  paired with a reduction fn for the real pages
     * by index collections
     * @param {*} offset 
     * @param {*} startPage 
     * @returns 
     */
    point(offset, startPage=0) {
        if (offset < 0 || offset >= this.totalLength) { throw new RangeError(`Invalid offset ${offset}.`)}
        if (startPage < 0 || startPage >= this.#tome.length) { throw new RangeError(`Invalid start page ${startPage}.`)}
        if (startPage) {
            let found = this.#pointers.find(({ pageno }) => pageno == startPage)
            if (!found) {
                this.summonBugs()
                throw new RangeError(`Page ${startPage} not found.`)
            }
            let { offset: sto } = found
            offset += sto
        }

        return this.#pointers
            .filter(({offset: o}) => o == offset)
            .sort((a, b) => {
                if (a.inset == b.inset) {
                    return a.stanza.length - b.stanza.length
                } else {
                    return (a.inset - b.inset)
                }
            })
    }
    

    get voice() {
        return [...this.shriek()].map(x => x.stammer).join('')
    }
    
    get totalLength() {
        return this.#tome.reduce((a, t) => a + t.length, 0)
    }

    *shriek(o=0, startPage) {
        let [{ inset, stanzano }] = this.point(o, startPage)

        let range = Array(this.#tome[stanzano].length - inset).fill(0)
        yield* range.map((_, i) => this.#tome[stanzano].at(i + inset))

        for (let i = stanzano + 1; i < this.#tome.length; i++) {
            yield* this.#tome[i].shriek()
        }
    }
    
    brand(start, end, sigil) {
        for (let o = start; o < end; o++) {
            const brandees = this.point(o)
            for (let b of brandees) {
                const { stanza, inset } = b
                stanza.brand(sigil, inset)
            }
        }
    }
    
    crushNonbelievers(sigil) {
        return [...this.shriek()].map(x => x.brands.includes(sigil) ? x.stammer : '').join('')
    }
    
    capture(pattern, o=0, startPage) {
        let v = [...this.shriek(o, startPage)].map(x=>x.stammer).join('');

        let m = v.match(pattern)
        if (m === null) { return null }
        else {
            let [{ pageno, inset }] = this.point(m.index, startPage)
            let groups = [...m]

            return  { pageno, inset, groups }
        }
    }

    depose(offset, usurp) {
        let severed = this.sunder(offset)
        let dep = new DeviousDeposition(usurp, (this.#tome[severed].disempowered ?? false), this)
        this.#tome.splice(severed, 0, dep)

        this.notify()

        return [severed + 1, dep]
    }

    destroy(offset, count) {
        let [{ pageno: pageA }] = this.point(offset)
        let [{ pageno: pageB }] = this.point(offset + count)
        if (pageA !== pageB) 
        { 
            for (let i = pageA; i <= pageB; i++) {
                let p = this.page(i)
                if (!(p instanceof ShatteredMemory)) {
                    let vectorDescription = `[${(offset).toString(16)}->${(offset+count).toString(16)}]`
                    throw new RangeError(`${this.id.description}: ${vectorDescription} crosses an edit boundary. Nested edits not implemented.`) 
                }
            }
            this.heal(pageA, pageB)
        }
        let severed = this.sunder(offset)
        let thorax = this.#tome[severed]
        let tail = thorax.splice(count);

        let doomy = new DemonicDestruction(thorax, thorax.disempowered, this)
        this.#tome.splice(severed, 1, doomy, tail)
        this.notify()

        return [severed, doomy]
    }
    
    heal(startPage, endPage) {
        let pieces = ''
        for (let i = startPage; i <= endPage; i++) {
            pieces += this.page(i).voice
        }

        let nobell = new ShatteredMemory(pieces)
        this.#tome.splice(startPage, (endPage-startPage)+1, nobell)
        this.notify()

        return [startPage, nobell]
    }

    page(pn) {
        let x = this.#pointers.filter(({ inset, pageno }) => inset == 0 && pageno == pn)
        return x.sort(({ stanza }) => {
            if (stanza instanceof DemonicDestruction) {
                return -1
            }
            if (stanza instanceof DeviousDeposition) {
                return 0
            }
            if (stanza instanceof ShatteredMemory) {
                return 1
            }
        }).map(({ stanza }) => stanza)
    }

    sunder(offset, startPage) {

        let points = this.point(offset, startPage)
        let stanza, pageno, inset, stanzano
        for (let p of points) {
            if (p.stanza.length > 0) {
                ({ stanza, pageno, stanzano, inset } = p)
                break
            }
        }

        if (inset === undefined || pageno === undefined) { 
            this.summonBugs()
            throw new RangeError(`Page ${startPage ?? 0} / offset ${offset} has no members with length.`)
        }

        if (inset === 0) { return stanzano }
        const cloven = stanza.splice(inset)

        this.notify()

        if (cloven === null) { 
            return stanzano 
        }
        else {
            this.#tome.splice(stanzano+1, 0, cloven)
            this.notify()

            return stanzano+1
        }
    }
    
    ripInAndTearOut(entryPattern, exitPattern) {
        let rv = []
        const gazer = new ModalCharGazer(this.voice)
        const ranges = gazer.enrange(entryPattern, exitPattern)
        for (let r of ranges.reverse()) {
            const count = r.end - r.start
            const content = [...this.shriek(r.start)].slice(0, count).map(x => x.stammer).join('')
            const lineno  = this.divineRealLines(r.start)
            rv.push([content, lineno])
            this.destroy(r.start, count)
        }
        return rv
    }
    
    divineRealLines(until) {
        let lineno = 1
        for (let s of this.#tome) { 
            if ((s instanceof ShatteredMemory) || (s instanceof DemonicDestruction)) {
                until -= s.maxLength
                lineno += s.countNewlines(until) ?? 0 
            }
        }
        return lineno
    }
    
    notify() {
        this.#_ptrs = undefined
        let _ = this.#pointers
    }

    summonBugs(title='', depth=0, cWidth=3, maxCols=20, debugOffsets=true) {
        const idMaxW = 8

        let tt = title ? ' | ' + title : ''
        const ownid = '(' + this.id.description + tt + ')';
        const indent = PP.spaces(depth)
        let sent = ''
        const send = (s) => {
            process.stdout.write(s)
            sent += s.replaceAll(new RegExp('\x1b\\[[0-9][0-9]?m', 'g'), '')
        }

        send(PP.colors.green)
        send('\n' + indent)
        send(PP.padded(ownid, idMaxW))
        send(PP.colors.none)

        let globalOffset = 0
        for (let p of this.#tome) {
            for (let pl of p.bugForm(globalOffset, cWidth, maxCols)) {
                send(PP.colors.green  + '\n' + indent + '|' + PP.colors.none)
                send(pl)
            }

            if (debugOffsets) {
                send(PP.colors.green  + '\n' + indent + '|' + PP.colors.yellow)
                send('0x           ')
                let ci = 0
                for (let q of this.#pointers.filter(({stanza}) => stanza==p)) {
                    ci < maxCols && send(PP.padded(q.offset.toString(16), cWidth))
                    ci++
                }

                send(PP.colors.green  + '\n' + indent + '|' + PP.colors.yellow)
                send('pn           ')
                ci = 0
                for (let q of this.#pointers.filter(({stanza}) => stanza==p)) {
                    ci < maxCols && send(PP.padded(q.pageno.toString(16), cWidth))
                    ci++
                }

                send(PP.colors.green  + '\n' + indent + '|' + PP.colors.yellow)
                send('in           ')
                ci = 0
                for (let q of this.#pointers.filter(({stanza}) => stanza==p)) {
                    ci < maxCols && send(PP.padded(q.inset.toString(16), cWidth))
                    ci++
                }

                send(PP.colors.green  + '\n' + indent + '|' + PP.colors.yellow)
                send('stzn         ')
                ci = 0
                for (let q of this.#pointers.filter(({stanza}) => stanza==p)) {
                    ci < maxCols && send(PP.padded(q.stanzano.toString(16), cWidth))
                    ci++
                }
            }

            globalOffset += p.length
        }



        send('\n')
        send(PP.colors.green + indent + '|')
        send(Array(depth+2).fill('_').join(''))
        send(`(${this.#tome.length})\n`)
        return sent
    }
}

export class ShatteredMemory {
    #head

    constructor(fable) { 
        if (typeof fable.slice(0,1) == 'string') {
           this.id = Symbol(PP.shortcode('m|' + fable[0]))
           this.#head = fable.split('').map(c => ({ stammer: c, brands: [] }))
        } else {
           this.id = Symbol(PP.shortcode('m|' + fable.at(0).stammer))
           this.#head = fable 
        }
    }

    get length() { return this.#head.length }
    get maxLength() { this.#head.length }

    *shriek() { yield* this.#head }
    get voice() { return this.#head.map(x => x.stammer).join('') }
    at(i) { 
        if (i < 0 || i >= this.length) { 
            return { stammer: '', brands: [] } 
        } 
        return this.#head[i] 
    }

    countNewlines(until) { 
        let u = 0
        let n = 0
        for (let {stammer} of this.#head) {
            if (u >= until) { break }
            if (stammer == '\n') { n++ }
            u++
        }
        return n
    }

    brand(sigil, i) {
        if (i < 0 || i >= this.length) { 
            return
        } 
        this.#head[i].brands.push(sigil)
    }

    sliver(start=0, end=this.length) {
        if (start < 0) { start  += this.length }
        if (end   < 0) { end    += this.length }
        if (start > end) { return '' }
        let acc = []
        for (let i = start; i < end; i++) { acc.push(this.at(i)) }
        return new ShatteredMemory(acc)
    }

    splice(start=0, count=(this.length-start), ...replacements) {
        if (start < 0 || start >= this.length) { throw new RangeError(`Offset ${start} invalid for '${this.voice}'`) }
        if (count < 0) { throw new RangeError(`Count ${count} invalid.`) }

        let stub  = this.#head.slice(0, start)
        let severed = this.#head.slice(start, start+count)

        for (let r of replacements) { stub.push(...r.shriek()) }

        stub.push(...this.#head.slice(start+count))
        this.#head = stub

        if (!severed) { return null }
        else { return new ShatteredMemory(severed) }
    }

    *bugForm(shift=0, cWidth = 3, maxCols = 20) {
        let line1 = []

        const powerArrow = '-: '
        const arrowThroughHead = `-(${this.id.description})` + powerArrow
        const expected = '0x_computed:'

        line1 += (PP.colors.purple + arrowThroughHead + PP.colors.none)
        if (this.length) {
           Array(this.length).fill(0).forEach((_, i) => i < maxCols && (line1 += (PP.oneChar(this.at(i).stammer, cWidth))))
           line1 += ('\x1b[0m')
        } else {
           line1 += (PP.oneChar('', cWidth))
        }
        yield line1
        
        let line2 = PP.padded(expected, arrowThroughHead.length)
        line2 += PP.colors.pink
        Array(this.length).fill(0).forEach((_, i) => {
            i < maxCols && (line2 += PP.padded((i+shift).toString(16), cWidth))
        })
        line2 += '.'
        yield line2
    }
}

export class DeviousDeposition {
    #disempowered = false
    #liege
    #head
    
    constructor(oath, disempowered, liege) {
        if (typeof oath.slice(0,1) == 'string') {
            this.id = Symbol(PP.shortcode('+|' + oath[0]))
            this.#head = oath.split('').map(c => ({ stammer: c, brands: [] }))
        }
        else {
            this.id = Symbol(PP.shortcode('+|' + oath.at(0).stammer))
            this.#head = oath.split('')
        }

        this.#disempowered = disempowered
        this.#liege = liege
    }

    get maxLength() { this.#head.length }
    get length() { return this.#disempowered ? 0 : this.#head.length }
    get disempowered() { return this.#disempowered }
    set disempowered(b) { this.#disempowered = b; this.#liege?.notify() }
    countNewlines(until) { 
        let u = 0
        let n = 0
        for (let {stammer} of this.#head) {
            if (u >= until) { break }
            if (stammer == '\n') { n++ }
            u++            
        }
        return n
    }

    *shriek () { yield* this.#disempowered ? '' : this.#head }
    get voice() { return this.#disempowered ? '' : this.#head.map(x => x.stammer).join('') }

    brand(sigil, i) { 
        if (i < 0 || i >= this.length) { 
            return
        } 
        this.#head[i].brands.push(sigil)
    }

    at(i) { 
        if (i < 0 || i >= this.length) { return {stammer: '', brands: []} }
        return this.#disempowered ? {stammer: '', brands: []} : this.#head[i]
    }

    pop() { return this.#disempowered ? '' : this.#head.pop() }

    sliver(start=0, end=this.length) {
        if (start < 0) { start  += this.length }
        if (end   < 0) { end    += this.length }
        if (start > end) { return '' }
        let acc = []
        for (let i = start; i < end; i++) { acc.push(this.at(i)) }
        return new DeviousDeposition(acc, this.#disempowered, this.#liege)
    }

    splice(start=0, count=(this.length-start), ...replacements) {
        if (start < 0 || start >= this.length) { throw new RangeError(`Offset ${start} not in [0,${this.length})`) }
        if (count < 0) { throw new RangeError(`Count ${count} invalid.`) }

        let stub  = this.#head.slice(0, start)
        let severed = this.#head.slice(start, start+count)

        for (let r of replacements) { stub.push(r.voice) }

        stub.push(...this.#head.slice(start+count))
        this.#head = stub

        if (!severed) { return null }
        else { return new DeviousDeposition(severed.join(''), this.#disempowered, this.#liege) }
    }
    
    *bugForm(shift=0, cWidth = 3, maxCols = 20) {
        const range = Array(this.length).fill(0)
        const powerArrow = this.#disempowered ? '-ø ' : '-+ '
        const arrowThroughHead = `-(${this.id.description})` + powerArrow

        let line1 = []
        line1 += (PP.colors.blue + arrowThroughHead + PP.colors.none)
        if (this.length) {
           range.forEach((_, i) => i < maxCols && (line1 += (PP.oneChar(this.at(i).stammer, cWidth))))
           line1 += ('\x1b[0m')
        } else {
           line1 += (PP.oneChar('', cWidth))
        }
        yield line1

        let line2 = PP.spaces(arrowThroughHead)
        line2 += PP.colors.pink
        Array(this.length).fill(0).forEach((_, i) => {
            i < maxCols && (line2 += PP.padded((i+shift).toString(16), cWidth))
        })
        line2 += '.'
        yield line2
    }


}

export class DemonicDestruction {
    #disempowered = false
    #liege
    #dungeon
    
    constructor(destroyedMemory, disempowered, liege) {
        this.id = Symbol(PP.shortcode('x|' + (destroyedMemory.at(0)?.stammer || destroyedMemory.at(0))))
        this.#dungeon = destroyedMemory
        this.#disempowered = disempowered
        this.#liege = liege
    }
    
    get maxLength() { this.#dungeon.length }

    get length() {
        return this.#disempowered ? this.#dungeon.length : 0
    }
    
    get disempowered() { return this.#disempowered }
    set disempowered(b) { this.#disempowered = b; this.#liege?.notify() }
    countNewlines(until) { return this.#dungeon.countNewlines(until) }
    
    *shriek()    { yield* this.#disempowered ? this.#dungeon.shriek() : [] }
    get voice() { return this.#disempowered ? this.#dungeon.voice : '' }

    at(i) { 
        if (i < 0 || i >= this.length) { return '' }
        return this.#disempowered ? this.#dungeon.at(i) : {stammer: '', brands: []}
    }

    brand(sigil, inset) {
        if(this.#disempowered) {
            this.#dungeon.brand(sigil, inset)            
        } else {
            for (let i = 0; i < this.#dungeon.length; i++) {
                this.#dungeon.brand(sigil, i)
            }
        }
    }

    pop() { return this.#disempowered ? this.#dungeon.pop() :  '' }

    splice(start=0, count=(this.length-start), ...replacements) {
        if (start < 0 || start >= this.length) { throw new RangeError(`Offset ${start} invalid for [${this.voice}]`) }
        if (count < 0) { throw new RangeError(`Count ${count} invalid.`) }

        let stub  = this.#dungeon.slice(0, start)
        let severed = this.#dungeon.slice(start, start+count)

        for (let r of replacements) { stub.push(r.voice) }

        stub.push(...this.#dungeon.slice(start+count))
        this.#dungeon = stub

        if (!severed) { return null }
        else { return new DemonicDestruction(severed.join(''), this.#disempowered, this.#liege) }
    }

    sliver(start=0, end=this.length) {
        if (start < 0) { start  += this.length }
        if (end   < 0) { end    += this.length }
        if (start > end) { return '' }
        let acc = ''
        for (let i = start; i < end; i++) { acc += this.at(i) }
        return new DemonicDestruction(acc, this.#disempowered, this.#liege)
    }


    *bugForm(shift=0, cWidth = 3, maxCols = 20) {
        const range = Array(this.length).fill(0)
        const powerArrow = this.#disempowered ? '-< ' : '-- '
        const arrowThroughHead = `-(${this.id.description})` + powerArrow

        let line1 = PP.colors.red + arrowThroughHead + PP.colors.none, line2 = PP.spaces(arrowThroughHead)
        for (let i = 0; i < this.#dungeon.length; i++) {
                line1 += PP.padded(this.#dungeon.at(i).stammer, cWidth)
                line2 += this.#disempowered ? PP.colors.pink : PP.colors.red
                line2 += this.#disempowered ? PP.padded(shift+i, cWidth) : PP.padded('x', cWidth)
        }
        line2 += PP.colors.none
        line2 += '.'
        yield line1
        yield line2
    }
}

if (import.meta.vitest) {
    const { test, expect } = import.meta.vitest
    test('shats are spliced', () => {
        let sm = new ShatteredMemory('abcdef')
        sm.splice(0, 5)
        expect(sm.voice).toBe('f')

        let sm2 = new ShatteredMemory('abcdef')
        let x = sm2.splice(2, 2)
        expect(sm2.voice).toBe('abef')
        expect(x.voice).toBe('cd')

        let sm3 = new ShatteredMemory('abcdef')
        let y = sm3.splice(2, 2, new ShatteredMemory('¥¥¥'))
        expect(y.voice).toBe('cd')
        expect(sm3.voice).toBe('ab¥¥¥ef')
    })
    
    test('sunders are numbered', () => {
        let ca = new CursedAnthology('sunder me')
        let numberMe = ca.sunder(3)
        expect(numberMe).toBe(1)
        expect(ca.voice).toBe('sunder me')
        expect(ca.page(0)[0].voice).toBe('sun')
        expect(ca.page(1)[0].voice).toBe('der me')
        let numberMeToo = ca.sunder(7)
        expect(numberMeToo).toBe(2)
        expect(ca.page(1)[0].voice).toBe('der ')
        expect(ca.page(2)[0].voice).toBe('me')
    })

    test('destruction of the realms', () => {
        let d = new CursedAnthology('realms')
        expect(d.voice).toBe('realms')

        let [severed] = d.destroy(0, 3)
        expect(severed).toBe(0)

        expect(d.page(0)[0].length).toBe(0)
        expect(d.page(0)[0].voice).toBe('')

        expect(d.voice).toBe('lms')

        expect(d.page(0)[0]).toBeInstanceOf(DemonicDestruction)
        expect(d.page(0)[1]).toBeInstanceOf(ShatteredMemory)
        expect(d.page(0)[1].voice).toBe('lms')
        expect(d.page(0)[1].length).toBe(3)

        d.page(0)[0].disempowered = true
        expect(d.page(0)[0].length).toBe(3)
        expect(d.page(0)[0].voice).toBe('rea')
        expect(d.voice).toBe('realms')

        let d2 = new CursedAnthology('realms')
        d2.destroy(3, 1)
        expect(d2.page(0)[0].voice).toBe('rea')
        expect(d2.page(1)[0].voice).toBe('')
        d2.summonBugs()
        expect(d2.page(1)[1].voice).toBe('ms')
        expect(d2.voice).toBe('reams')
    })

    test('deposing of the kings', () => {
        let s = new CursedAnthology('visage')
        let [n] = s.depose(0, 'shattered ')
        expect(n).toBe(1)
        expect(s.page(0)[0].voice).toBe('shattered ')
        expect(s.page(0)[0].voice).toBe('shattered ')
        expect(s.page(1)[0].voice).toBe('visage')
        expect(s.page(0)[0]).toBeInstanceOf(DeviousDeposition)
        expect(s.page(1)[0]).toBeInstanceOf(ShatteredMemory)
        expect(s.page(0)[0].length).toBe(10)
        s.page(0)[0].disempowered = true
        expect(s.page(0)[0].length).toBe(0)
    })

    test('capture of the commas', () => {
        let nimh = new CursedAnthology(
            `Fool, becoming immortal is a cursed crusade. ` +
            `A nemesis, leading to the grave.`
            )
        expect(nimh.capture(',')?.inset).toBe(4)
        expect( nimh.capture(',')?.pageno).toBe(0)
        nimh.sunder(2)
        expect(nimh.capture(',', 0, 1)?.inset).toBe(2)
        expect( nimh.capture(',')?.pageno).toBe(1)
        expect(nimh.capture(',', 10, 1)?.inset).toBe(42)
    })

    test('corruption of the greetings', () => {
        let hw = new CursedAnthology('Hello, world!')
        let [_0, H] = hw.destroy(0, 5)

        let [_1, gb] = hw.depose(0, 'Goodbye')
        let [_2, c] = hw.depose(9, 'cruel ')
        expect(hw.voice).toBe('Goodbye, cruel world!')
        gb.disempowered = true
        H.disempowered = true
        hw.depose(5, ' again')
        expect(hw.voice).toBe('Hello again, cruel world!')

    })

    test('not gonna nest edits for my own sanity', () => {
        let hw2 = new CursedAnthology('Hello, world!')
        hw2.destroy(5, 2)
        expect(hw2.voice).toBe('Helloworld!')
        expect(() => hw2.destroy(4, 2)).toThrowError()
    })
}