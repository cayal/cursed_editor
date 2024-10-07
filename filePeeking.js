import { readdirSync, readFileSync, statSync } from "fs"
import path from "path"

export class ModalCharGazer {
    #content

    /**
    * @param {{FSTree & FSTfimpl}|string} contentious
    */
    constructor(contentious) {
        if (contentious instanceof FSTree && contentious.impl.type == 'file') {
           this.title = contentious.relpath
           this.#content = readFileSync(contentious.relpath, 'utf-8')
        } else if (typeof contentious == 'string') {
           this.#content = contentious
           this.title = this.#content.split('').slice(0, 3).join('') + '...'
        } else {
            throw new TypeError('wtf ypu trying to read then')
        }
    }
    
    enrange(enterSeq, exitSeq) {
       let enteredBy, exitedBy, 
           enterLength, exitLength,
           nLookahead, nLookbehind
       if (Object.getPrototypeOf(enterSeq) == RegExp.prototype) {
           enteredBy = (s) => s.match(enterSeq)
           enterLength = (s) => s.match(enterSeq)[0].length
           nLookahead = Infinity
       } else {
           enteredBy = (s) => s == enterSeq
           enterLength = (_) => enterSeq.length
           nLookahead  = enterSeq.length
       }

       if (Object.getPrototypeOf(exitSeq) == RegExp.prototype) {
           exitedBy = (s) => s.match(exitSeq)
           exitLength = (s) => s.match(exitSeq)[0].length
           nLookbehind = Infinity
       } else {
           exitedBy = (s) => s == exitSeq
           exitLength = (_) => exitSeq.length
           nLookbehind = exitSeq.length
       }
       
       const con = this.#content

       let rangeOpen = -1
       let innerRangeOpen = -1
       let depth = 0
       let ranges = []
       for (let i = 0; i <= con.length; i++) {
           const lookahead  = con.slice(i, Math.min(con.length, i + nLookahead))
           const lookbehind = con.slice(Math.max(0, i - nLookbehind), i)
           if (rangeOpen > 0) {
               if (exitedBy(lookbehind)) {
                   depth -= 1
                   if (depth === 0) {
                       ranges.push({
                           start: rangeOpen, 
                           end: i, 
                           innerStart: innerRangeOpen, 
                           innerEnd: i - exitLength(lookbehind)
                       })
                       rangeOpen = -1
                       innerRangeOpen = -1
                   }
                   continue
               } else {
                   // Even if we finish without matching an end pattern,
                   // we can close off the range as the end of the content.
                   (i == (con.length - 1)) && ranges.push({
                       start: rangeOpen, 
                       end: i, 
                       innerStart: innerRangeOpen, 
                       innerEnd: i})
                   continue;
               };
           } else {
               if (enteredBy(lookahead)) {
                   if (depth === 0) {
                       rangeOpen = i
                       innerRangeOpen = i + enterLength(lookahead)
                   }
                   depth += 1
                   continue
               };
           }
       }

       return ranges
    }
}


/**
 * @typedef {{ type: "dir", children: (FSTree & (FSTfimpl | FSTdimpl))}} FSTdimpl
 * @param {FSTree} from 
 * @returns {FSTdimpl}
 */
function MakeDimpl(from) {
    const children = () => readdirSync(from.relpath).map(subEntry => new FSTree(subEntry, from))

    return {
        type: "dir",
        get children() { return children() },

        /**
        * 
        * @param {string} relpath - A relative-style path, separated with forward slashes.
        * @returns {{ reason: ?string, data: ?FSTree }} - The filetree, or an error message, but not both.
        */
        getEntry(relpath) {
            const dbgInfo = `[FileTree '${from.relpath}'].getFile('${relpath}')`

            if (!relpath) {
                return { reason: `${dbgInfo} | Path required.` }
            }

            else if (relpath.startsWith('/')) {
                return { reason: `${dbgInfo} | Relative path required.` }
            } 
            
            else if (relpath == '.') {
                return { data: from }
            } 
            
            else if (relpath == '..') {
                return { data: from.parent }
            }
            
            if (relpath.startsWith('./')){
                return this.getEntry(relpath.slice(2))
            }
            
            if (relpath.startsWith('../')) {
                if (!this.parent) {
                    return { reason: `${dbgInfo} | Directory is top-most in tree.` }
                }
                return this.parent.getEntry(relpath.slice(3))
            }

            const parts = relpath.split('/')
            const match = this.children.find(c => c.name == parts[0])
            if (!match) {
                return { reason: `${dbgInfo} | '${parts[0]}' not found in ${from.name} [${children().map(s=>s.name).join(', ')}].`}
            }

            const reassembled = parts.slice(1).join('/')
            const subpath = reassembled ? `${reassembled}` : '.'
            return match.impl.getEntry(subpath)
        }
    } 
}

/**
 * @typedef {{ type: "file", children: (FSTree & (FSTfimpl | FSTdimpl))}} FSTfimpl
 * @param {FSTree} from 
 * @returns {FSTfimpl}
 */
function MakeFimpl(from) {
    return {
        type: "file",
        getEntry: (relpath) => {
            if (relpath == '.' || !relpath) {
                return { data: from }
            }

            if (!from.parent) {
                return { reason: 'No parent' }
            }

            return from.parent.impl.getEntry(relpath)
        },

        getFileCursor() {
            return new ModalCharGazer(from)
        }
    } 
}

/**
 * @property {string} name
 * @property {FSTdimpl | FSTfimpl} impl
 * @property {Stats} stats
 * @property {FSTree | null} parent
 */
export class FSTree {
    name

    impl
    
    stats 
    
    parent = null
    
    #rp = null

    /**
     * 
     * @param {string} entryName - The filename to investigate
     * @param {?(FSTree & FSTdimpl)} from - The parent directory.
     * @returns {FSTree} - The file or tree-style directory representation.
     */
    constructor(entrypoint, from = null) {
        this.name = entrypoint
        this.parent = from

        if (from && from.impl.type !== "dir") {
            throw new TypeError(`Not a directory: ${JSON.stringify(from)}`)
        }

        for (let p = this; p.parent; p = p.parent) {
            if (p.parent == this) {
                throw new RangeError('Circular file tree. Something is wrong.')
            }
        }

        this.stats = statSync(this.relpath)
        this.impl  = this.stats.isDirectory()
            ? MakeDimpl(this)
            : MakeFimpl(this)
    }

    get relpath() {
        if (this.#rp) { return this.#rp }

        const stack = [ this.name ]
        for (let p = this.parent; p; p = p?.parent) {
            stack.unshift(p.name)
        }
        this.#rp = path.join(...stack)
        return this.#rp
    }
    
    /**
     * 
     * @param {function(FSTree): void} f 
     */
    forEach(f) {
        if (this.stats.isDirectory()) {
            return this.children.forEach(c => c.forEach(f))
        } else {
            return f(this)
        }
    }

    /**
     * 
     * @param {FSTree} tree - The tree to pretty-print
     * @param {number} level - Starting indentation level
     */
    pprint(level = 0) {
        const indent = new Array(level * 2).fill(' ').join('')

        const prefix = `${indent}|-${this.stats.isDirectory() ? '>' : '-'} `
        const color = this.stats.isDirectory() ? '\x1b[32m' : ''
        const postfix = this.stats.isDirectory() ? '/' : ''
        console.info(`${prefix}${color}${this.name}${postfix}\x1b[0m`)

        if (this.stats.isDirectory()) {
            this.impl.children.forEach(entry => {
                entry.pprint(level + 1)
            });
        }
    }
}

if (import.meta.vitest) {
    const { test, assert, expect } = import.meta.vitest
    let cwdFST;
    let editme;
    let ranges;
    test('FSTree reads dir of this file', () => {
        cwdFST = new FSTree(import.meta.dirname)
    })

    test('type is directory', () => { assert(cwdFST.impl.type == 'dir') })

    test('testdata/ in children', () => { 
        assert(cwdFST.impl.children.some(c => c.name == 'testdata')) 
    })

    test('testdata/hello.txt exists', () => { 
        editme = cwdFST.impl.getEntry('testdata/filePeeking/hello.txt')?.data
        expect(editme?.name).toBe('hello.txt')
        expect(editme?.impl?.type).toBe('file')
    })

    test('私見たーーー大変なものを見たーーー', () => { 
        let chargazer = new ModalCharGazer(editme)
        expect(chargazer.enrange('ll', 'wo')).toStrictEqual([{ start: 2, innerStart: 4, end: 9, innerEnd: 7 }])
    })

    test('DOes the thing for raw string too', () => { 
        let chargazer = new ModalCharGazer(`<provocation> Haha browhat 
            if i wa <!-- commendt --> to comment there like</provocation>
            <response>Nooooo you can't just comment anywhere like that it</res<!-- yeah w't -->ponse<!--->>`)
        expect(chargazer.enrange('<!--', '-->')).toStrictEqual(
            [{end: 65,
             innerEnd: 62,
             innerStart: 52,
             start: 48,
           },
           {
             end: 197,
             innerEnd: 194,
             innerStart: 184,
             start: 180,
           },
           {
             end: 208,
             innerEnd: 205,
             innerStart: 206,
             start: 202,
           }]
        )})
}