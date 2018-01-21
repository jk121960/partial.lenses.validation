import * as L from 'partial.lenses'
import * as I from './ext/infestines'

const header = 'partial.lenses.validation: '
function error(msg) {
  throw Error(header + msg)
}

const defaultsArray = L.defaults(I.array0)
const requiredNull = L.required(null)

const removeIfAllNull = L.rewrite(
  xs => (L.all(I.isNull, L.elems, xs) ? undefined : xs)
)

export const accept = L.removeOp
export const reject = L.setOp

const rejectArray = reject(I.array0)

export const objectWith = I.curry((onOthers, propsToKeep, template) => {
  onOthers = L.toFunction(onOthers)
  const op = {}
  const n = propsToKeep && I.length(propsToKeep)
  const toKeep = n ? {} : I.object0
  for (let i = 0; i < n; ++i) {
    const k = propsToKeep[i]
    op[k] = L.zero
    toKeep[k] = 1
  }
  for (const k in template) op[k] = L.toFunction(template[k])
  const min = {}
  for (const k in template) min[k] = undefined
  return L.toFunction([
    (x, i, C, xi2yC) =>
      C.map(o => {
        for (const k in o) if (I.isUndefined(toKeep[k])) return o
      }, xi2yC(I.assign({}, min, x), i)),
    L.values,
    (x, i, C, xi2yC) => (op[i] || onOthers)(x, i, C, xi2yC)
  ])
})

export const object = objectWith(accept)

export const arrayIxOr = I.curry((onOther, rules) =>
  L.ifElse(I.isArray, [removeIfAllNull, L.elems, requiredNull, rules], onOther)
)

export const arrayIx = arrayIxOr(rejectArray)

export const arrayIdOr = I.curry((onOther, rules) =>
  L.ifElse(I.isArray, [defaultsArray, L.elems, rules], onOther)
)

export const arrayId = arrayIdOr(rejectArray)

const pargs = (name, fn) =>
  (process.env.NODE_ENV === 'production'
    ? I.id
    : fn =>
        function() {
          for (let i = 0, n = arguments.length; i < n; ++i) {
            const c = arguments[i]
            if (!I.isArray(c) || I.length(c) !== 2)
              error('`' + name + '` must be given pairs as arguments.')
          }
          return fn.apply(null, arguments)
        })(function() {
    let r = accept
    let n = arguments.length
    while (n) {
      const c = arguments[--n]
      r = fn(c[0], c[1], r)
    }
    return r
  })

export const cases = pargs('cases', L.ifElse)
export const unless = pargs('unless', (c, a, r) => L.ifElse(c, r, reject(a)))

export {choose} from 'partial.lenses'

export const optional = rules => L.toFunction([L.optional, rules])

export const validate = L.transform
