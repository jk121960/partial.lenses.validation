import { isFunction, isString, isNumber, arityN, sndU, curry, identicalU, id, freeze, isArray, always, curryN } from 'infestines';
import { rewrite, any, modify, elems, values, get, ifElse, toFunction, choose, zero, setOp, modifyOp, Identity, traverse, setter, set, optional, branchOr, Constant, lazy } from 'partial.lenses';

var isThenable = function isThenable(x) {
  return null != x && isFunction(x.then);
};

var length = function length(x) {
  return x.length;
};

var lte = /*#__PURE__*/curry(function (l, r) {
  return l <= r;
});
var gte = /*#__PURE__*/curry(function (l, r) {
  return l >= r;
});
var identical = /*#__PURE__*/curry(identicalU);

var isInstanceOf = /*#__PURE__*/curry(function (Class, x) {
  return x instanceof Class;
});
var isInstanceOfObject = /*#__PURE__*/isInstanceOf(Object);

var isBoolean = function isBoolean(x) {
  return typeof x === 'boolean';
};

var o = /*#__PURE__*/curry(function (f, g) {
  return function (x) {
    return f(g(x));
  };
});

var both = /*#__PURE__*/curry(function (p1, p2) {
  return function (x) {
    return p1(x) && p2(x);
  };
});

var ignore = function ignore(_) {};

//

var P = Promise;

var throwAsync = /*#__PURE__*/P.reject.bind(P);
var returnAsync = /*#__PURE__*/P.resolve.bind(P);

var chain = function chain(xyP, xP) {
  return isThenable(xP) ? xP.then(xyP) : xyP(xP);
};

var Async = /*#__PURE__*/(process.env.NODE_ENV === 'production' ? id : freeze)({
  map: chain,
  ap: function ap(xyP, xP) {
    return chain(function (xP) {
      return chain(function (xyP) {
        return xyP(xP);
      }, xyP);
    }, xP);
  },
  of: id,
  chain: chain
});

//

var unique = {};

var uniqueToUndefined = function uniqueToUndefined(x) {
  return x === unique ? undefined : x;
};
var undefinedToUnique = function undefinedToUnique(y) {
  return undefined !== y ? y : unique;
};

var fromUniques = /*#__PURE__*/rewrite(function (xs) {
  var r = isRejected(xs);
  if (r) xs = value(xs);
  xs = xs.map(uniqueToUndefined);
  return r ? rejected(xs) : xs;
});

var toUnique = function toUnique(x, i, M, xi2yM) {
  return M.map(undefinedToUnique, xi2yM(x, i));
};

//

function Rejected(value) {
  this.value = undefined !== value ? value : null;
}

var isRejected = /*#__PURE__*/isInstanceOf(Rejected);

var rejected = /*#__PURE__*/(process.env.NODE_ENV === 'production' ? id : o(freeze))(function (value) {
  return new Rejected(value);
});

var value = function value(x) {
  return x.value;
};

var fromRejected = function fromRejected(x) {
  return isRejected(x) ? value(x) : undefined;
};
var fromRejectedOrNull = function fromRejectedOrNull(x) {
  return isRejected(x) ? value(x) : null;
};

//

var trickle = function trickle(optic, from) {
  return function (r) {
    return any(isRejected, optic, r) ? rejected(modify(optic, from, r)) : r;
  };
};

var arrayIxTrickle = /*#__PURE__*/rewrite( /*#__PURE__*/trickle(elems, fromRejectedOrNull));
var arrayIdTrickle = /*#__PURE__*/rewrite( /*#__PURE__*/trickle(elems, fromRejected));
var propsTrickle = /*#__PURE__*/rewrite( /*#__PURE__*/trickle(values, fromRejected));

//

function toError(errors) {
  var error = Error(JSON.stringify(errors, null, 2));
  error.errors = errors;
  return error;
}

function raise(errors) {
  throw toError(errors);
}

var raiseRejected = function raiseRejected(r) {
  return isRejected(r) ? raise(toError(value(r))) : r;
};

//

var getEither = function getEither(k, r, x) {
  return r = get(k, r), undefined !== r ? r : get(k, x);
};

var sumRight = function sumRight(zero$$1, one, plus) {
  return function () {
    var n = arguments.length;
    var r = zero$$1;
    if (n) {
      r = one(arguments[--n], r);
      while (n) {
        r = plus(arguments[--n], r);
      }
    }
    return r;
  };
};

//

var toRule = function toRule(rule) {
  if (isFunction(rule)) {
    return length(rule) < 3 ? where(rule) : rule;
  } else {
    var error = rule[1];
    return isFunction(error) ? modifyError(error, rule[0]) : setError(error, rule[0]);
  }
};

var toRules = /*#__PURE__*/modify(elems, toRule);

//

var andCompose = function andCompose(p, o$$1) {
  return ifElse(p, compose(o$$1), reject);
};

var compose = /*#__PURE__*/o(toFunction, toRules);

//

var tupleOr = function tupleOr(_ref) {
  var less = _ref.less,
      rest = _ref.rest;
  return rest = toRule(rest), function () {
    var rules = [];
    var n = arguments.length;
    for (var i = 0; i < n; ++i) {
      rules.push(toRule(arguments[i]));
    }return andCompose(less ? isArray : both(isArray, o(lte(n), length)), [fromUniques, arrayIxTrickle, less ? function (xs, i, M, xi2yM) {
      var m = length(xs);
      if (m < n) {
        xs = xs.slice();
        xs.length = n;
        return M.map(function (ys) {
          return any(isRejected, elems, ys) ? ys : ys.slice(0, m);
        }, elems(xs, i, M, xi2yM));
      } else {
        return elems(xs, i, M, xi2yM);
      }
    } : elems, toUnique, choose(function (_, i) {
      return rules[i] || rest;
    })]);
  };
};

var runWith = function runWith(Monad, onAccept, onReject) {
  return run({ Monad: Monad, onAccept: onAccept, onReject: onReject });
};

//

var raised = unique;

function rejectRaisedOr(M, x) {
  var r = raised;
  if (r === unique) r = x;else raised = unique;
  return M.of(rejected(r));
}

var protect = function protect(predicate, orElse) {
  return function (x, i) {
    try {
      return predicate(x, i);
    } catch (e) {
      raised = e;
      return orElse;
    }
  };
};

// Primitive

var accept = zero;

var acceptAs = function acceptAs(value) {
  return function (x, i, M, xi2yM) {
    return xi2yM(value, i);
  };
};

var acceptWith = function acceptWith(fn) {
  return function (x, i, M, xi2yM) {
    return M.chain(function (x) {
      return xi2yM(x, i);
    }, fn(x, i));
  };
};

var rejectWith = function rejectWith(fn) {
  return function (x, i, M, _xi2yM) {
    return M.map(rejected, fn(x, i));
  };
};

var rejectAs = /*#__PURE__*/o(setOp, rejected);

var reject = /*#__PURE__*/modifyOp(rejected);

var remove = /*#__PURE__*/acceptAs(undefined);

//

var casesOfDefault = /*#__PURE__*/always(reject);
var casesOfCase = function casesOfCase(p, o$$1, r) {
  return function (y, j) {
    return function (x, i, M, xi2yM) {
      return M.chain(function (b) {
        return b ? o$$1(x, i, M, xi2yM) : undefined !== b || raised === unique ? r(y, j)(x, i, M, xi2yM) : rejectRaisedOr(M, x);
      }, p(y, j));
    };
  };
};

//

var ruleBinOp = function ruleBinOp(op) {
  return curryN(2, function (l) {
    return l = toRule(l), function (r) {
      return r = toRule(r), op(l, r);
    };
  });
};

//

var upgradesCase = function upgradesCase(revalidate) {
  return function (c) {
    return length(c) === 3 ? [c[0], both$1(modifyAfter(c[1], c[2]), revalidate)] : c;
  };
};

// General

var run = /*#__PURE__*/curryN(3, function (c) {
  var M = c.Monad || Identity;
  var onAccept = c.onAccept || id;
  var onReject = c.onReject || raise;
  var handler = function handler(r) {
    return isRejected(r) ? onReject(value(r)) : onAccept(r);
  };
  return function (rule) {
    return rule = toRule(rule), function (data) {
      return M.chain(handler, traverse(M, id, rule, data));
    };
  };
});

// Synchronous

var accepts = /*#__PURE__*/runWith(0, /*#__PURE__*/always(true), /*#__PURE__*/always(false));

var errors = /*#__PURE__*/runWith(0, ignore, id);

var validate = /*#__PURE__*/runWith();

// Asynchronous

var acceptsAsync = /*#__PURE__*/runWith(Async, /*#__PURE__*/always( /*#__PURE__*/returnAsync(true)), /*#__PURE__*/always( /*#__PURE__*/returnAsync(false)));

var errorsAsync = /*#__PURE__*/runWith(Async, /*#__PURE__*/always( /*#__PURE__*/returnAsync()), returnAsync);

var tryValidateAsyncNow = /*#__PURE__*/runWith(Async, 0, /*#__PURE__*/o(raise, toError));

var validateAsync = /*#__PURE__*/runWith(Async, returnAsync, /*#__PURE__*/o(throwAsync, toError));

// Predicates

var where = function where(predicate) {
  return predicate = protect(predicate), function (x, i, M, _xi2yM) {
    return M.chain(function (b) {
      return b ? M.of(x) : rejectRaisedOr(M, x);
    }, predicate(x, i));
  };
};

// Elaboration

var modifyError = /*#__PURE__*/curry(function (fn, rule) {
  return rule = toRule(rule), function (x, i, M, xi2yM) {
    return M.chain(function (r) {
      return isRejected(r) ? M.map(rejected, fn(x, value(r), i)) : M.of(r);
    }, rule(x, i, M, xi2yM));
  };
});

var setError = /*#__PURE__*/curry(function (error, rule) {
  return compose([rewrite(function (r) {
    return isRejected(r) ? rejected(error) : r;
  }), rule]);
});

// Ad-hoc

var modifyAfter = /*#__PURE__*/curryN(2, function (rule) {
  return o(both$1(rule), acceptWith);
});
var setAfter = /*#__PURE__*/curryN(2, function (rule) {
  return o(both$1(rule), acceptAs);
});
var removeAfter = function removeAfter(rule) {
  return both$1(rule, remove);
};

// Logical

var both$1 = /*#__PURE__*/ruleBinOp(function (rule, rest) {
  return function (x, i, M, xi2yM) {
    return M.chain(function (r) {
      return isRejected(r) ? M.of(r) : rest(r, i, M, xi2yM);
    }, rule(x, i, M, xi2yM));
  };
});

var and = /*#__PURE__*/sumRight(accept, toRule, both$1);

var not = function not(rule) {
  return compose([setter(function (r, x) {
    return isRejected(r) ? x : rejected(x);
  }), rule]);
};

var either = /*#__PURE__*/ruleBinOp(function (rule, rest) {
  return function (x, i, M, xi2yM) {
    return M.chain(function (r) {
      return isRejected(r) ? rest(x, i, M, xi2yM) : M.of(r);
    }, rule(x, i, M, xi2yM));
  };
});

var or = /*#__PURE__*/sumRight(reject, toRule, either);

// Uniform

var arrayId = function arrayId(rule) {
  return andCompose(isArray, [arrayIdTrickle, elems, rule]);
};

var arrayIx = function arrayIx(rule) {
  return andCompose(isArray, [arrayIxTrickle, elems, rule]);
};

// Varying

var args = /*#__PURE__*/tupleOr({ less: true, rest: accept });

var tuple = /*#__PURE__*/tupleOr({ less: false, rest: reject });

// Functions

var dependentFn = /*#__PURE__*/curry(function (argsRule, toResRule) {
  return argsRule = toRule(argsRule), function (fn, i, M, _xi2yM) {
    return M.of(isFunction(fn) ? function () {
      for (var _len = arguments.length, args = Array(_len), _key = 0; _key < _len; _key++) {
        args[_key] = arguments[_key];
      }

      return M.chain(function (args) {
        return isRejected(args) ? raise(toError(value(args))) : M.chain(function (res) {
          return M.map(raiseRejected, traverse(M, id, toRule(toResRule.apply(null, args)), res));
        }, fn.apply(null, args));
      }, traverse(M, id, argsRule, args));
    } : rejected(fn));
  };
});

var freeFn = /*#__PURE__*/curry(function (argsRule, resRule) {
  return dependentFn(argsRule, always(resRule));
});

// Objects

var keep = /*#__PURE__*/curry(function (key, rule) {
  return andCompose(isInstanceOfObject, [setter(function (r, x) {
    return isRejected(r) ? rejected(set(key, getEither(key, value(r), x), value(r))) : r;
  }), rule]);
});

var optional$1 = function optional$$1(rule) {
  return compose([optional, rule]);
};

var propsOr = /*#__PURE__*/curry(function (onOthers, template) {
  return andCompose(isInstanceOfObject, [propsTrickle, branchOr(toRule(onOthers), modify(values, toRule, template))]);
});

var props = /*#__PURE__*/propsOr(reject);

// Dependent

var choose$1 = function choose$$1(xi2r) {
  return xi2r = protect(xi2r), function (x, i, M, xi2yM) {
    return M.chain(function (r) {
      return r ? toRule(r)(x, i, M, xi2yM) : rejectRaisedOr(M, x);
    }, xi2r(x, i));
  };
};

// Conditional

var cases = /*#__PURE__*/sumRight(reject, function (alt, rest) {
  return length(alt) === 1 ? alt[0] : ifElse$1(alt[0], alt[1], rest);
}, function (alt, rest) {
  return ifElse$1(alt[0], alt[1], rest);
});

var ifElse$1 = /*#__PURE__*/curry(function (p, c, a) {
  return p = protect(p), c = toRule(c), a = toRule(a), function (x, i, M, xi2yM) {
    return M.chain(function (b) {
      return b ? c(x, i, M, xi2yM) : undefined !== b || raised === unique ? a(x, i, M, xi2yM) : rejectRaisedOr(M, x);
    }, p(x, i));
  };
});

function casesOf(lens) {
  lens = toFunction(lens);
  var n = arguments.length;
  var op = casesOfDefault;
  while (--n) {
    var c = arguments[n];
    op = length(c) !== 1 ? casesOfCase(protect(c[0]), toRule(c[1]), op) : always(toRule(c[0]));
  }
  return function (x, i, M, xi2yM) {
    return lens(x, i, Constant, op)(x, i, M, xi2yM);
  };
}

// Recursive

var lazy$1 = /*#__PURE__*/o(lazy, /*#__PURE__*/o(toRule));

// Promotion

var promote = function promote() {
  for (var _len2 = arguments.length, cs = Array(_len2), _key2 = 0; _key2 < _len2; _key2++) {
    cs[_key2] = arguments[_key2];
  }

  return lazy$1(function (rec) {
    return or.apply(null, cs.map(function (c) {
      return length(c) === 2 ? both$1(modifyAfter(c[0], c[1]), rec) : c[0];
    }));
  });
};

var upgrades = function upgrades() {
  for (var _len3 = arguments.length, cs = Array(_len3), _key3 = 0; _key3 < _len3; _key3++) {
    cs[_key3] = arguments[_key3];
  }

  return lazy$1(function (rec) {
    return cases.apply(null, cs.map(upgradesCase(rec)));
  });
};

var upgradesOf = function upgradesOf(lens) {
  for (var _len4 = arguments.length, cs = Array(_len4 > 1 ? _len4 - 1 : 0), _key4 = 1; _key4 < _len4; _key4++) {
    cs[_key4 - 1] = arguments[_key4];
  }

  return lazy$1(function (rec) {
    return casesOf.apply(null, [lens].concat(cs.map(upgradesCase(rec))));
  });
};

// Contract helpers

var any$1 = accept;

var thenable = function thenable(t) {
  return modifyAfter(isThenable, function (p) {
    return p.then(validate(t));
  });
};

var monad = /*#__PURE__*/propsOr(accept, {
  map: isFunction,
  ap: isFunction,
  of: isFunction,
  chain: isFunction
});

var fn = [isFunction, function (x) {
  return 'Expected function, but got ' + x;
}];

var fnMaxN = function fnMaxN(n) {
  return and(fn, [o(gte(n), length), function (x) {
    return 'Expected function of max arity ' + n + ', but got arity ' + length(x);
  }]);
};

var fnN = function fnN(n) {
  return and(fn, [o(identical(n), length), function (x) {
    return 'Expected function of arity ' + n + ', but got arity ' + length(x);
  }]);
};

var runCallback = /*#__PURE__*/fnMaxN(1);
var predicateFn = /*#__PURE__*/fnMaxN(2);
var transformFn = /*#__PURE__*/fnMaxN(2);
var errorTransformFn = /*#__PURE__*/fnMaxN(3);
var opticFn = /*#__PURE__*/fnN(4);

var rule = /*#__PURE__*/lazy$1(function (rule) {
  return or(predicateFn, opticFn, tuple(rule, accept));
});

var lens = /*#__PURE__*/lazy$1(function (lens) {
  return or(isString, isNumber, transformFn, opticFn, arrayIx(lens));
});

var tagError = function tagError(tag, rule) {
  return modifyError(function (_, e) {
    return [tag, e];
  }, rule);
};

var tagArgs = function tagArgs(name, rule) {
  return tagError('partial.lenses.validation: `' + name + '` given invalid arguments', rule);
};

var curriedFn = function curriedFn(name, ps, r) {
  return choose$1(function (fn) {
    return modifyAfter(freeFn(tagArgs(name, tuple.apply(null, ps)), r), function (f) {
      return arityN(length(fn), f);
    });
  });
};

var fml = function fml(firsts, middle, lasts) {
  return choose$1(function (xs) {
    return arrayIx(casesOf.apply(null, [sndU].concat(firsts.map(function (rule, i) {
      return [identical(i), rule];
    }), lasts.map(function (rule, i) {
      return [identical(length(xs) - length(lasts) + i), rule];
    }), [[middle]])));
  });
};

var variadicFn1 = function variadicFn1(fn) {
  return function (x) {
    for (var _len = arguments.length, xs = Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
      xs[_key - 1] = arguments[_key];
    }

    return fn.apply(undefined, [x].concat(xs));
  };
};

var caseR = /*#__PURE__*/tuple(rule);
var casePR = /*#__PURE__*/tuple(predicateFn, rule);
var caseRT = /*#__PURE__*/tuple(rule, transformFn);
var casePRT = /*#__PURE__*/tuple(predicateFn, rule, transformFn);

var caseR_casePR = /*#__PURE__*/or(caseR, casePR);
var caseR_caseRT = /*#__PURE__*/or(caseR, caseRT);
var casePR_casePRT = /*#__PURE__*/or(casePR, casePRT);

var C = process.env.NODE_ENV === 'production' ? function (x) {
  return x;
} : function (x, c) {
  return validate(c, x);
};

// Primitive

var accept$1 = /*#__PURE__*/C(accept, rule);

var acceptAs$1 = /*#__PURE__*/C(acceptAs, /*#__PURE__*/curriedFn('acceptAs', [any$1], rule));

var acceptWith$1 = /*#__PURE__*/C(acceptWith, /*#__PURE__*/curriedFn('acceptWith', [transformFn], rule));

var rejectWith$1 = /*#__PURE__*/C(rejectWith, /*#__PURE__*/curriedFn('rejectWith', [transformFn], rule));

var rejectAs$1 = /*#__PURE__*/C(rejectAs, /*#__PURE__*/curriedFn('rejectAs', [any$1], rule));

var reject$1 = /*#__PURE__*/C(reject, rule);

var remove$1 = /*#__PURE__*/C(remove, rule);

// General

var run$1 = /*#__PURE__*/C(run, /*#__PURE__*/curriedFn('run', [/*#__PURE__*/props({
  monad: /*#__PURE__*/optional$1(monad),
  onAccept: /*#__PURE__*/optional$1(runCallback),
  onReject: /*#__PURE__*/optional$1(runCallback)
}), rule, any$1], any$1));

// Synchronous

var accepts$1 = /*#__PURE__*/C(accepts, /*#__PURE__*/curriedFn('accepts', [rule, any$1], isBoolean));

var errors$1 = /*#__PURE__*/C(errors, /*#__PURE__*/curriedFn('errors', [rule, any$1], any$1));

var validate$1 = /*#__PURE__*/C(validate, /*#__PURE__*/curriedFn('validate', [rule, any$1], any$1));

// Asynchronous

var acceptsAsync$1 = /*#__PURE__*/C(acceptsAsync, /*#__PURE__*/curriedFn('acceptsAsync', [rule, any$1], /*#__PURE__*/thenable(isBoolean)));

var errorsAsync$1 = /*#__PURE__*/C(errorsAsync, /*#__PURE__*/curriedFn('errorsAsync', [rule, any$1], isThenable));

var tryValidateAsyncNow$1 = /*#__PURE__*/C(tryValidateAsyncNow, /*#__PURE__*/curriedFn('tryValidateAsyncNow', [rule, any$1], any$1));

var validateAsync$1 = /*#__PURE__*/C(validateAsync, /*#__PURE__*/curriedFn('validateAsync', [rule, any$1], isThenable));

// Predicates

var where$1 = /*#__PURE__*/C(where, /*#__PURE__*/curriedFn('where', [predicateFn], rule));

// Elaboration

var modifyError$1 = /*#__PURE__*/C(modifyError, /*#__PURE__*/curriedFn('modifyError', [errorTransformFn, rule], rule));

var setError$1 = /*#__PURE__*/C(setError, /*#__PURE__*/curriedFn('setError', [any$1, rule], rule));

// Ad-hoc

var modifyAfter$1 = /*#__PURE__*/C(modifyAfter, /*#__PURE__*/curriedFn('modifyAfter', [rule, transformFn], rule));

var setAfter$1 = /*#__PURE__*/C(setAfter, /*#__PURE__*/curriedFn('setAfter', [rule, any$1], rule));

var removeAfter$1 = /*#__PURE__*/C(removeAfter, rule);

// Logical

var both$2 = /*#__PURE__*/C(both$1, /*#__PURE__*/curriedFn('both', [rule, rule], rule));

var and$1 = /*#__PURE__*/C(and, /*#__PURE__*/freeFn( /*#__PURE__*/tagArgs('and', /*#__PURE__*/arrayIx(rule)), rule));

var not$1 = /*#__PURE__*/C(not, /*#__PURE__*/curriedFn('not', [rule], rule));

var either$1 = /*#__PURE__*/C(either, /*#__PURE__*/curriedFn('either', [rule, rule], rule));

var or$1 = /*#__PURE__*/C(or, /*#__PURE__*/freeFn( /*#__PURE__*/tagArgs('or', /*#__PURE__*/arrayIx(rule)), rule));

// Uniform

var arrayId$1 = /*#__PURE__*/C(arrayId, /*#__PURE__*/curriedFn('arrayId', [rule], rule));

var arrayIx$1 = /*#__PURE__*/C(arrayIx, /*#__PURE__*/curriedFn('arrayIx', [rule], rule));

// Varying

var args$1 = /*#__PURE__*/C(args, /*#__PURE__*/freeFn( /*#__PURE__*/tagArgs('args', /*#__PURE__*/arrayIx(rule)), rule));

var tuple$1 = /*#__PURE__*/C(tuple, /*#__PURE__*/freeFn( /*#__PURE__*/tagArgs('tuple', /*#__PURE__*/arrayIx(rule)), rule));

// Functions

var dependentFn$1 = /*#__PURE__*/C(dependentFn, /*#__PURE__*/curriedFn('dependentFn', [rule, /*#__PURE__*/freeFn( /*#__PURE__*/arrayIx(any$1), rule)], rule));

var freeFn$1 = /*#__PURE__*/C(freeFn, /*#__PURE__*/curriedFn('freeFn', [rule, rule], rule));

// Objects

var keep$1 = /*#__PURE__*/C(keep, /*#__PURE__*/curriedFn('keep', [isString, rule], rule));

var optional$2 = /*#__PURE__*/C(optional$1, /*#__PURE__*/curriedFn('optional', [rule], rule));

var propsOr$1 = /*#__PURE__*/C(propsOr, /*#__PURE__*/curriedFn('propsOr', [rule, /*#__PURE__*/propsOr(rule, {})], rule));

var props$1 = /*#__PURE__*/C(props, /*#__PURE__*/curriedFn('props', [/*#__PURE__*/propsOr(rule, {})], rule));

// Dependent

var choose$2 = /*#__PURE__*/C(choose$1, /*#__PURE__*/curriedFn('choose', [/*#__PURE__*/freeFn( /*#__PURE__*/tuple(any$1, any$1), rule)], rule));

// Conditional

var cases$1 = /*#__PURE__*/C(cases, /*#__PURE__*/freeFn( /*#__PURE__*/tagArgs('cases', /*#__PURE__*/fml([], casePR, [caseR_casePR])), rule));

var ifElse$2 = /*#__PURE__*/C(ifElse$1, /*#__PURE__*/curriedFn('ifElse', [predicateFn, rule, rule], rule));

var casesOf$1 = /*#__PURE__*/C(casesOf, /*#__PURE__*/modifyAfter( /*#__PURE__*/freeFn( /*#__PURE__*/tagArgs('casesOf', /*#__PURE__*/fml([lens], casePR, [caseR_casePR])), rule), variadicFn1));

// Recursive

var lazy$2 = /*#__PURE__*/C(lazy$1, /*#__PURE__*/curriedFn('lazy', [/*#__PURE__*/freeFn( /*#__PURE__*/tuple$1(rule), rule)], rule));

// Promotion

var promote$1 = /*#__PURE__*/C(promote, /*#__PURE__*/freeFn( /*#__PURE__*/tagArgs('promote', /*#__PURE__*/arrayIx(caseR_caseRT)), rule));

var upgrades$1 = /*#__PURE__*/C(upgrades, /*#__PURE__*/freeFn( /*#__PURE__*/tagArgs('upgrades', /*#__PURE__*/fml([], casePR_casePRT, [caseR_casePR])), rule));

var upgradesOf$1 = /*#__PURE__*/C(upgradesOf, /*#__PURE__*/modifyAfter( /*#__PURE__*/freeFn( /*#__PURE__*/tagArgs('upgradesOf', /*#__PURE__*/fml([lens], casePR_casePRT, [caseR_casePR])), rule), variadicFn1));

export { accept$1 as accept, acceptAs$1 as acceptAs, acceptWith$1 as acceptWith, rejectWith$1 as rejectWith, rejectAs$1 as rejectAs, reject$1 as reject, remove$1 as remove, run$1 as run, accepts$1 as accepts, errors$1 as errors, validate$1 as validate, acceptsAsync$1 as acceptsAsync, errorsAsync$1 as errorsAsync, tryValidateAsyncNow$1 as tryValidateAsyncNow, validateAsync$1 as validateAsync, where$1 as where, modifyError$1 as modifyError, setError$1 as setError, modifyAfter$1 as modifyAfter, setAfter$1 as setAfter, removeAfter$1 as removeAfter, both$2 as both, and$1 as and, not$1 as not, either$1 as either, or$1 as or, arrayId$1 as arrayId, arrayIx$1 as arrayIx, args$1 as args, tuple$1 as tuple, dependentFn$1 as dependentFn, freeFn$1 as freeFn, keep$1 as keep, optional$2 as optional, propsOr$1 as propsOr, props$1 as props, choose$2 as choose, cases$1 as cases, ifElse$2 as ifElse, casesOf$1 as casesOf, lazy$2 as lazy, promote$1 as promote, upgrades$1 as upgrades, upgradesOf$1 as upgradesOf };
