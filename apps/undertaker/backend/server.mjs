// src/server.ts
import { createServer } from "node:http";
import { dirname as dirname2, resolve as resolve2 } from "node:path";
import { fileURLToPath } from "node:url";

// src/api.ts
import { randomUUID as randomUUID3 } from "node:crypto";

// src/config.ts
import { randomUUID } from "node:crypto";
import { join, resolve } from "node:path";
var APP_NAME = "undertaker";
function resolveDataDir(env, appRoot2) {
  if (env.UNDERTAKER_DATA_DIR) return resolve(env.UNDERTAKER_DATA_DIR);
  if (env.KIROCREW_HOME) return join(env.KIROCREW_HOME, "apps", env.KIROCREW_APP_NAME || APP_NAME, "data");
  return join(appRoot2, "data");
}
function storePath(dataDir2) {
  return join(dataDir2, "store.json");
}
function defaultWatches(now2) {
  const watch = (kind, subject, everyHours) => ({
    id: randomUUID(),
    kind,
    subject,
    mode: "fixture",
    everyHours,
    createdAt: now2
  });
  return [
    watch("package", "abandoned", 24),
    watch("package", "stable-old", 168),
    watch("repository", "neglected", 24),
    watch("repository", "archived", 24),
    watch("repository", "active", 168)
  ];
}

// src/plan-approval.ts
var DECISIONS = ["approve", "dismiss"];
function isDecision(value) {
  return typeof value === "string" && DECISIONS.includes(value);
}
async function approvePlan(store2, planId, decision, decidedAt) {
  if (!isDecision(decision)) throw new RangeError(`Invalid decision: ${String(decision)}`);
  return store2.decidePlan(planId, decision, decidedAt);
}
function section(plan) {
  const steps = plan.steps.map((step) => `${step.priority}. [${step.severity}] ${step.action} (${step.title})`);
  return [
    `## ${plan.title}`,
    `Plan id: ${plan.id}  
Approved: ${plan.decidedAt ?? "unknown"}  
Score when planned: ${plan.score ?? "unscored"} (${plan.band})`,
    "### Steps",
    steps.join("\n"),
    "### Scan report",
    plan.markdown.trim().replace(/^#/gm, "####")
  ].join("\n\n");
}
async function exportApprovedPlans(store2) {
  const approved = (await store2.listPlans()).filter((plan) => plan.decision === "approve");
  const intro = approved.length === 0 ? ["No approved plans yet."] : approved.map(section);
  return ["# Approved revival plans", ...intro].join("\n\n") + "\n";
}

// src/proxy-auth.ts
import { createHash, createHmac, timingSafeEqual } from "node:crypto";
var WINDOW_SECONDS = 60;
var NONCE = /^[0-9a-f]{32}$/;
function createNonceCache(max = 4096) {
  return { seen: /* @__PURE__ */ new Map(), max };
}
function signV2(secret2, ts, nonce, method, target, body) {
  const bodyHash = createHash("sha256").update(body).digest("hex");
  return createHmac("sha256", secret2).update(`v2:${ts}:${nonce}:${method}:${target}:${bodyHash}`).digest("hex");
}
function signV1(secret2, ts, method, target, body) {
  const bodyHash = createHash("sha256").update(body).digest("hex");
  return createHmac("sha256", secret2).update(`${ts}:${method}:${target}:${bodyHash}`).digest("hex");
}
function verifyProxyV1(signature, req, secret2, nowSeconds) {
  const [tsText, mac] = (signature ?? "").split(":");
  const ts = Number(tsText);
  if (!mac || !Number.isInteger(ts) || Math.abs(nowSeconds - ts) > WINDOW_SECONDS) return false;
  const expected = Buffer.from(signV1(secret2, ts, req.method, req.target, req.body), "hex");
  const given = Buffer.from(mac, "hex");
  return given.length === expected.length && timingSafeEqual(given, expected);
}
function verifyProxyV2(req, secret2, nowSeconds, cache) {
  const [tsText, mac] = (req.signature ?? "").split(":");
  const ts = Number(tsText);
  if (!mac || !Number.isInteger(ts) || !req.nonce || !NONCE.test(req.nonce)) return false;
  if (Math.abs(nowSeconds - ts) > WINDOW_SECONDS) return false;
  const expected = Buffer.from(signV2(secret2, ts, req.nonce, req.method, req.target, req.body), "hex");
  const given = Buffer.from(mac, "hex");
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return false;
  for (const [nonce, expires] of cache.seen) if (expires < nowSeconds) cache.seen.delete(nonce);
  if (cache.seen.has(req.nonce) || cache.seen.size >= cache.max) return false;
  cache.seen.set(req.nonce, ts + WINDOW_SECONDS);
  return true;
}

// src/schedule.ts
var HOUR_MS = 60 * 60 * 1e3;
function assertInterval(everyHours) {
  if (!Number.isFinite(everyHours) || everyHours <= 0) {
    throw new RangeError(`everyHours must be a positive number, got ${everyHours}`);
  }
}
function nextRunAt(lastRunAt, everyHours, now2) {
  assertInterval(everyHours);
  if (lastRunAt === null) return now2;
  return new Date(Date.parse(lastRunAt) + everyHours * HOUR_MS).toISOString();
}
function isDue(lastRunAt, everyHours, now2) {
  return Date.parse(now2) >= Date.parse(nextRunAt(lastRunAt, everyHours, now2));
}

// vendor/necrokit.mjs
var abandoned_default = {
  name: "abandoned-glob-shim",
  version: "0.9.4",
  dependencies: {
    "minimatch-lite": "^0.3.0",
    "picomatch-old": "2.0.0"
  },
  devDependencies: {},
  snapshot: {
    daysSinceLastPublish: 1480,
    daysSinceLastCommit: 1420,
    deprecated: true,
    repositoryArchived: true,
    maintainerCount: 1,
    weeklyDownloads: 412,
    observedAt: "2026-10-01T00:00:00.000Z"
  }
};
var stable_old_default = {
  name: "stable-old-parser",
  version: "3.2.1",
  dependencies: {
    "tokenize-lite": "^1.4.0",
    "semver-lite": "~2.0.3"
  },
  devDependencies: {
    vitest: "^1.6.0"
  },
  snapshot: {
    daysSinceLastPublish: 900,
    daysSinceLastCommit: 30,
    deprecated: false,
    repositoryArchived: false,
    maintainerCount: 2,
    weeklyDownloads: 18e4,
    observedAt: "2026-10-01T00:00:00.000Z"
  }
};
var active_default = {
  fullName: "acme/active-lib",
  archived: false,
  pushedAt: "2026-10-20T09:00:00Z",
  latestReleaseAt: "2026-09-01T12:00:00Z",
  openIssues: { count: 4, staleCount: 2 },
  openPullRequests: { count: 2, oldestDays: 12 },
  ciStatus: "passing",
  license: "MIT",
  hasReadme: true
};
var archived_default = {
  fullName: "acme/retired-parser",
  archived: true,
  pushedAt: "2023-06-01T00:00:00Z",
  latestReleaseAt: "2021-05-01T00:00:00Z",
  openIssues: { count: 0, staleCount: 0 },
  openPullRequests: { count: 0, oldestDays: 0 },
  ciStatus: "unknown",
  license: null,
  hasReadme: true
};
var neglected_default = {
  fullName: "acme/neglected-tool",
  archived: false,
  pushedAt: "2024-11-02T10:00:00Z",
  latestReleaseAt: "2024-03-10T08:00:00Z",
  openIssues: { count: 38, staleCount: 21 },
  openPullRequests: { count: 5, oldestDays: 240 },
  ciStatus: "failing",
  license: "MIT",
  hasReadme: true
};
var util;
(function(util2) {
  util2.assertEqual = (val) => val;
  function assertIs(_arg) {
  }
  util2.assertIs = assertIs;
  function assertNever(_x) {
    throw new Error();
  }
  util2.assertNever = assertNever;
  util2.arrayToEnum = (items) => {
    const obj = {};
    for (const item of items) {
      obj[item] = item;
    }
    return obj;
  };
  util2.getValidEnumValues = (obj) => {
    const validKeys = util2.objectKeys(obj).filter((k) => typeof obj[obj[k]] !== "number");
    const filtered = {};
    for (const k of validKeys) {
      filtered[k] = obj[k];
    }
    return util2.objectValues(filtered);
  };
  util2.objectValues = (obj) => {
    return util2.objectKeys(obj).map(function(e) {
      return obj[e];
    });
  };
  util2.objectKeys = typeof Object.keys === "function" ? (obj) => Object.keys(obj) : (object) => {
    const keys = [];
    for (const key in object) {
      if (Object.prototype.hasOwnProperty.call(object, key)) {
        keys.push(key);
      }
    }
    return keys;
  };
  util2.find = (arr, checker) => {
    for (const item of arr) {
      if (checker(item))
        return item;
    }
    return void 0;
  };
  util2.isInteger = typeof Number.isInteger === "function" ? (val) => Number.isInteger(val) : (val) => typeof val === "number" && isFinite(val) && Math.floor(val) === val;
  function joinValues(array, separator = " | ") {
    return array.map((val) => typeof val === "string" ? `'${val}'` : val).join(separator);
  }
  util2.joinValues = joinValues;
  util2.jsonStringifyReplacer = (_, value) => {
    if (typeof value === "bigint") {
      return value.toString();
    }
    return value;
  };
})(util || (util = {}));
var objectUtil;
(function(objectUtil2) {
  objectUtil2.mergeShapes = (first, second) => {
    return {
      ...first,
      ...second
      // second overwrites first
    };
  };
})(objectUtil || (objectUtil = {}));
var ZodParsedType = util.arrayToEnum([
  "string",
  "nan",
  "number",
  "integer",
  "float",
  "boolean",
  "date",
  "bigint",
  "symbol",
  "function",
  "undefined",
  "null",
  "array",
  "object",
  "unknown",
  "promise",
  "void",
  "never",
  "map",
  "set"
]);
var getParsedType = (data) => {
  const t = typeof data;
  switch (t) {
    case "undefined":
      return ZodParsedType.undefined;
    case "string":
      return ZodParsedType.string;
    case "number":
      return isNaN(data) ? ZodParsedType.nan : ZodParsedType.number;
    case "boolean":
      return ZodParsedType.boolean;
    case "function":
      return ZodParsedType.function;
    case "bigint":
      return ZodParsedType.bigint;
    case "symbol":
      return ZodParsedType.symbol;
    case "object":
      if (Array.isArray(data)) {
        return ZodParsedType.array;
      }
      if (data === null) {
        return ZodParsedType.null;
      }
      if (data.then && typeof data.then === "function" && data.catch && typeof data.catch === "function") {
        return ZodParsedType.promise;
      }
      if (typeof Map !== "undefined" && data instanceof Map) {
        return ZodParsedType.map;
      }
      if (typeof Set !== "undefined" && data instanceof Set) {
        return ZodParsedType.set;
      }
      if (typeof Date !== "undefined" && data instanceof Date) {
        return ZodParsedType.date;
      }
      return ZodParsedType.object;
    default:
      return ZodParsedType.unknown;
  }
};
var ZodIssueCode = util.arrayToEnum([
  "invalid_type",
  "invalid_literal",
  "custom",
  "invalid_union",
  "invalid_union_discriminator",
  "invalid_enum_value",
  "unrecognized_keys",
  "invalid_arguments",
  "invalid_return_type",
  "invalid_date",
  "invalid_string",
  "too_small",
  "too_big",
  "invalid_intersection_types",
  "not_multiple_of",
  "not_finite"
]);
var quotelessJson = (obj) => {
  const json2 = JSON.stringify(obj, null, 2);
  return json2.replace(/"([^"]+)":/g, "$1:");
};
var ZodError = class _ZodError extends Error {
  get errors() {
    return this.issues;
  }
  constructor(issues) {
    super();
    this.issues = [];
    this.addIssue = (sub) => {
      this.issues = [...this.issues, sub];
    };
    this.addIssues = (subs = []) => {
      this.issues = [...this.issues, ...subs];
    };
    const actualProto = new.target.prototype;
    if (Object.setPrototypeOf) {
      Object.setPrototypeOf(this, actualProto);
    } else {
      this.__proto__ = actualProto;
    }
    this.name = "ZodError";
    this.issues = issues;
  }
  format(_mapper) {
    const mapper = _mapper || function(issue) {
      return issue.message;
    };
    const fieldErrors = { _errors: [] };
    const processError = (error) => {
      for (const issue of error.issues) {
        if (issue.code === "invalid_union") {
          issue.unionErrors.map(processError);
        } else if (issue.code === "invalid_return_type") {
          processError(issue.returnTypeError);
        } else if (issue.code === "invalid_arguments") {
          processError(issue.argumentsError);
        } else if (issue.path.length === 0) {
          fieldErrors._errors.push(mapper(issue));
        } else {
          let curr = fieldErrors;
          let i = 0;
          while (i < issue.path.length) {
            const el = issue.path[i];
            const terminal = i === issue.path.length - 1;
            if (!terminal) {
              curr[el] = curr[el] || { _errors: [] };
            } else {
              curr[el] = curr[el] || { _errors: [] };
              curr[el]._errors.push(mapper(issue));
            }
            curr = curr[el];
            i++;
          }
        }
      }
    };
    processError(this);
    return fieldErrors;
  }
  static assert(value) {
    if (!(value instanceof _ZodError)) {
      throw new Error(`Not a ZodError: ${value}`);
    }
  }
  toString() {
    return this.message;
  }
  get message() {
    return JSON.stringify(this.issues, util.jsonStringifyReplacer, 2);
  }
  get isEmpty() {
    return this.issues.length === 0;
  }
  flatten(mapper = (issue) => issue.message) {
    const fieldErrors = {};
    const formErrors = [];
    for (const sub of this.issues) {
      if (sub.path.length > 0) {
        fieldErrors[sub.path[0]] = fieldErrors[sub.path[0]] || [];
        fieldErrors[sub.path[0]].push(mapper(sub));
      } else {
        formErrors.push(mapper(sub));
      }
    }
    return { formErrors, fieldErrors };
  }
  get formErrors() {
    return this.flatten();
  }
};
ZodError.create = (issues) => {
  const error = new ZodError(issues);
  return error;
};
var errorMap = (issue, _ctx) => {
  let message;
  switch (issue.code) {
    case ZodIssueCode.invalid_type:
      if (issue.received === ZodParsedType.undefined) {
        message = "Required";
      } else {
        message = `Expected ${issue.expected}, received ${issue.received}`;
      }
      break;
    case ZodIssueCode.invalid_literal:
      message = `Invalid literal value, expected ${JSON.stringify(issue.expected, util.jsonStringifyReplacer)}`;
      break;
    case ZodIssueCode.unrecognized_keys:
      message = `Unrecognized key(s) in object: ${util.joinValues(issue.keys, ", ")}`;
      break;
    case ZodIssueCode.invalid_union:
      message = `Invalid input`;
      break;
    case ZodIssueCode.invalid_union_discriminator:
      message = `Invalid discriminator value. Expected ${util.joinValues(issue.options)}`;
      break;
    case ZodIssueCode.invalid_enum_value:
      message = `Invalid enum value. Expected ${util.joinValues(issue.options)}, received '${issue.received}'`;
      break;
    case ZodIssueCode.invalid_arguments:
      message = `Invalid function arguments`;
      break;
    case ZodIssueCode.invalid_return_type:
      message = `Invalid function return type`;
      break;
    case ZodIssueCode.invalid_date:
      message = `Invalid date`;
      break;
    case ZodIssueCode.invalid_string:
      if (typeof issue.validation === "object") {
        if ("includes" in issue.validation) {
          message = `Invalid input: must include "${issue.validation.includes}"`;
          if (typeof issue.validation.position === "number") {
            message = `${message} at one or more positions greater than or equal to ${issue.validation.position}`;
          }
        } else if ("startsWith" in issue.validation) {
          message = `Invalid input: must start with "${issue.validation.startsWith}"`;
        } else if ("endsWith" in issue.validation) {
          message = `Invalid input: must end with "${issue.validation.endsWith}"`;
        } else {
          util.assertNever(issue.validation);
        }
      } else if (issue.validation !== "regex") {
        message = `Invalid ${issue.validation}`;
      } else {
        message = "Invalid";
      }
      break;
    case ZodIssueCode.too_small:
      if (issue.type === "array")
        message = `Array must contain ${issue.exact ? "exactly" : issue.inclusive ? `at least` : `more than`} ${issue.minimum} element(s)`;
      else if (issue.type === "string")
        message = `String must contain ${issue.exact ? "exactly" : issue.inclusive ? `at least` : `over`} ${issue.minimum} character(s)`;
      else if (issue.type === "number")
        message = `Number must be ${issue.exact ? `exactly equal to ` : issue.inclusive ? `greater than or equal to ` : `greater than `}${issue.minimum}`;
      else if (issue.type === "date")
        message = `Date must be ${issue.exact ? `exactly equal to ` : issue.inclusive ? `greater than or equal to ` : `greater than `}${new Date(Number(issue.minimum))}`;
      else
        message = "Invalid input";
      break;
    case ZodIssueCode.too_big:
      if (issue.type === "array")
        message = `Array must contain ${issue.exact ? `exactly` : issue.inclusive ? `at most` : `less than`} ${issue.maximum} element(s)`;
      else if (issue.type === "string")
        message = `String must contain ${issue.exact ? `exactly` : issue.inclusive ? `at most` : `under`} ${issue.maximum} character(s)`;
      else if (issue.type === "number")
        message = `Number must be ${issue.exact ? `exactly` : issue.inclusive ? `less than or equal to` : `less than`} ${issue.maximum}`;
      else if (issue.type === "bigint")
        message = `BigInt must be ${issue.exact ? `exactly` : issue.inclusive ? `less than or equal to` : `less than`} ${issue.maximum}`;
      else if (issue.type === "date")
        message = `Date must be ${issue.exact ? `exactly` : issue.inclusive ? `smaller than or equal to` : `smaller than`} ${new Date(Number(issue.maximum))}`;
      else
        message = "Invalid input";
      break;
    case ZodIssueCode.custom:
      message = `Invalid input`;
      break;
    case ZodIssueCode.invalid_intersection_types:
      message = `Intersection results could not be merged`;
      break;
    case ZodIssueCode.not_multiple_of:
      message = `Number must be a multiple of ${issue.multipleOf}`;
      break;
    case ZodIssueCode.not_finite:
      message = "Number must be finite";
      break;
    default:
      message = _ctx.defaultError;
      util.assertNever(issue);
  }
  return { message };
};
var overrideErrorMap = errorMap;
function setErrorMap(map) {
  overrideErrorMap = map;
}
function getErrorMap() {
  return overrideErrorMap;
}
var makeIssue = (params) => {
  const { data, path, errorMaps, issueData } = params;
  const fullPath = [...path, ...issueData.path || []];
  const fullIssue = {
    ...issueData,
    path: fullPath
  };
  if (issueData.message !== void 0) {
    return {
      ...issueData,
      path: fullPath,
      message: issueData.message
    };
  }
  let errorMessage2 = "";
  const maps = errorMaps.filter((m) => !!m).slice().reverse();
  for (const map of maps) {
    errorMessage2 = map(fullIssue, { data, defaultError: errorMessage2 }).message;
  }
  return {
    ...issueData,
    path: fullPath,
    message: errorMessage2
  };
};
var EMPTY_PATH = [];
function addIssueToContext(ctx, issueData) {
  const overrideMap = getErrorMap();
  const issue = makeIssue({
    issueData,
    data: ctx.data,
    path: ctx.path,
    errorMaps: [
      ctx.common.contextualErrorMap,
      // contextual error map is first priority
      ctx.schemaErrorMap,
      // then schema-bound map if available
      overrideMap,
      // then global override map
      overrideMap === errorMap ? void 0 : errorMap
      // then global default map
    ].filter((x) => !!x)
  });
  ctx.common.issues.push(issue);
}
var ParseStatus = class _ParseStatus {
  constructor() {
    this.value = "valid";
  }
  dirty() {
    if (this.value === "valid")
      this.value = "dirty";
  }
  abort() {
    if (this.value !== "aborted")
      this.value = "aborted";
  }
  static mergeArray(status, results) {
    const arrayValue = [];
    for (const s of results) {
      if (s.status === "aborted")
        return INVALID;
      if (s.status === "dirty")
        status.dirty();
      arrayValue.push(s.value);
    }
    return { status: status.value, value: arrayValue };
  }
  static async mergeObjectAsync(status, pairs) {
    const syncPairs = [];
    for (const pair of pairs) {
      const key = await pair.key;
      const value = await pair.value;
      syncPairs.push({
        key,
        value
      });
    }
    return _ParseStatus.mergeObjectSync(status, syncPairs);
  }
  static mergeObjectSync(status, pairs) {
    const finalObject = {};
    for (const pair of pairs) {
      const { key, value } = pair;
      if (key.status === "aborted")
        return INVALID;
      if (value.status === "aborted")
        return INVALID;
      if (key.status === "dirty")
        status.dirty();
      if (value.status === "dirty")
        status.dirty();
      if (key.value !== "__proto__" && (typeof value.value !== "undefined" || pair.alwaysSet)) {
        finalObject[key.value] = value.value;
      }
    }
    return { status: status.value, value: finalObject };
  }
};
var INVALID = Object.freeze({
  status: "aborted"
});
var DIRTY = (value) => ({ status: "dirty", value });
var OK = (value) => ({ status: "valid", value });
var isAborted = (x) => x.status === "aborted";
var isDirty = (x) => x.status === "dirty";
var isValid = (x) => x.status === "valid";
var isAsync = (x) => typeof Promise !== "undefined" && x instanceof Promise;
function __classPrivateFieldGet(receiver, state, kind, f) {
  if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a getter");
  if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot read private member from an object whose class did not declare it");
  return kind === "m" ? f : kind === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
}
function __classPrivateFieldSet(receiver, state, value, kind, f) {
  if (kind === "m") throw new TypeError("Private method is not writable");
  if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a setter");
  if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot write private member to an object whose class did not declare it");
  return kind === "a" ? f.call(receiver, value) : f ? f.value = value : state.set(receiver, value), value;
}
var errorUtil;
(function(errorUtil2) {
  errorUtil2.errToObj = (message) => typeof message === "string" ? { message } : message || {};
  errorUtil2.toString = (message) => typeof message === "string" ? message : message === null || message === void 0 ? void 0 : message.message;
})(errorUtil || (errorUtil = {}));
var _ZodEnum_cache;
var _ZodNativeEnum_cache;
var ParseInputLazyPath = class {
  constructor(parent, value, path, key) {
    this._cachedPath = [];
    this.parent = parent;
    this.data = value;
    this._path = path;
    this._key = key;
  }
  get path() {
    if (!this._cachedPath.length) {
      if (this._key instanceof Array) {
        this._cachedPath.push(...this._path, ...this._key);
      } else {
        this._cachedPath.push(...this._path, this._key);
      }
    }
    return this._cachedPath;
  }
};
var handleResult = (ctx, result) => {
  if (isValid(result)) {
    return { success: true, data: result.value };
  } else {
    if (!ctx.common.issues.length) {
      throw new Error("Validation failed but no issues detected.");
    }
    return {
      success: false,
      get error() {
        if (this._error)
          return this._error;
        const error = new ZodError(ctx.common.issues);
        this._error = error;
        return this._error;
      }
    };
  }
};
function processCreateParams(params) {
  if (!params)
    return {};
  const { errorMap: errorMap2, invalid_type_error, required_error, description } = params;
  if (errorMap2 && (invalid_type_error || required_error)) {
    throw new Error(`Can't use "invalid_type_error" or "required_error" in conjunction with custom error map.`);
  }
  if (errorMap2)
    return { errorMap: errorMap2, description };
  const customMap = (iss, ctx) => {
    var _a, _b;
    const { message } = params;
    if (iss.code === "invalid_enum_value") {
      return { message: message !== null && message !== void 0 ? message : ctx.defaultError };
    }
    if (typeof ctx.data === "undefined") {
      return { message: (_a = message !== null && message !== void 0 ? message : required_error) !== null && _a !== void 0 ? _a : ctx.defaultError };
    }
    if (iss.code !== "invalid_type")
      return { message: ctx.defaultError };
    return { message: (_b = message !== null && message !== void 0 ? message : invalid_type_error) !== null && _b !== void 0 ? _b : ctx.defaultError };
  };
  return { errorMap: customMap, description };
}
var ZodType = class {
  get description() {
    return this._def.description;
  }
  _getType(input) {
    return getParsedType(input.data);
  }
  _getOrReturnCtx(input, ctx) {
    return ctx || {
      common: input.parent.common,
      data: input.data,
      parsedType: getParsedType(input.data),
      schemaErrorMap: this._def.errorMap,
      path: input.path,
      parent: input.parent
    };
  }
  _processInputParams(input) {
    return {
      status: new ParseStatus(),
      ctx: {
        common: input.parent.common,
        data: input.data,
        parsedType: getParsedType(input.data),
        schemaErrorMap: this._def.errorMap,
        path: input.path,
        parent: input.parent
      }
    };
  }
  _parseSync(input) {
    const result = this._parse(input);
    if (isAsync(result)) {
      throw new Error("Synchronous parse encountered promise.");
    }
    return result;
  }
  _parseAsync(input) {
    const result = this._parse(input);
    return Promise.resolve(result);
  }
  parse(data, params) {
    const result = this.safeParse(data, params);
    if (result.success)
      return result.data;
    throw result.error;
  }
  safeParse(data, params) {
    var _a;
    const ctx = {
      common: {
        issues: [],
        async: (_a = params === null || params === void 0 ? void 0 : params.async) !== null && _a !== void 0 ? _a : false,
        contextualErrorMap: params === null || params === void 0 ? void 0 : params.errorMap
      },
      path: (params === null || params === void 0 ? void 0 : params.path) || [],
      schemaErrorMap: this._def.errorMap,
      parent: null,
      data,
      parsedType: getParsedType(data)
    };
    const result = this._parseSync({ data, path: ctx.path, parent: ctx });
    return handleResult(ctx, result);
  }
  "~validate"(data) {
    var _a, _b;
    const ctx = {
      common: {
        issues: [],
        async: !!this["~standard"].async
      },
      path: [],
      schemaErrorMap: this._def.errorMap,
      parent: null,
      data,
      parsedType: getParsedType(data)
    };
    if (!this["~standard"].async) {
      try {
        const result = this._parseSync({ data, path: [], parent: ctx });
        return isValid(result) ? {
          value: result.value
        } : {
          issues: ctx.common.issues
        };
      } catch (err) {
        if ((_b = (_a = err === null || err === void 0 ? void 0 : err.message) === null || _a === void 0 ? void 0 : _a.toLowerCase()) === null || _b === void 0 ? void 0 : _b.includes("encountered")) {
          this["~standard"].async = true;
        }
        ctx.common = {
          issues: [],
          async: true
        };
      }
    }
    return this._parseAsync({ data, path: [], parent: ctx }).then((result) => isValid(result) ? {
      value: result.value
    } : {
      issues: ctx.common.issues
    });
  }
  async parseAsync(data, params) {
    const result = await this.safeParseAsync(data, params);
    if (result.success)
      return result.data;
    throw result.error;
  }
  async safeParseAsync(data, params) {
    const ctx = {
      common: {
        issues: [],
        contextualErrorMap: params === null || params === void 0 ? void 0 : params.errorMap,
        async: true
      },
      path: (params === null || params === void 0 ? void 0 : params.path) || [],
      schemaErrorMap: this._def.errorMap,
      parent: null,
      data,
      parsedType: getParsedType(data)
    };
    const maybeAsyncResult = this._parse({ data, path: ctx.path, parent: ctx });
    const result = await (isAsync(maybeAsyncResult) ? maybeAsyncResult : Promise.resolve(maybeAsyncResult));
    return handleResult(ctx, result);
  }
  refine(check, message) {
    const getIssueProperties = (val) => {
      if (typeof message === "string" || typeof message === "undefined") {
        return { message };
      } else if (typeof message === "function") {
        return message(val);
      } else {
        return message;
      }
    };
    return this._refinement((val, ctx) => {
      const result = check(val);
      const setError = () => ctx.addIssue({
        code: ZodIssueCode.custom,
        ...getIssueProperties(val)
      });
      if (typeof Promise !== "undefined" && result instanceof Promise) {
        return result.then((data) => {
          if (!data) {
            setError();
            return false;
          } else {
            return true;
          }
        });
      }
      if (!result) {
        setError();
        return false;
      } else {
        return true;
      }
    });
  }
  refinement(check, refinementData) {
    return this._refinement((val, ctx) => {
      if (!check(val)) {
        ctx.addIssue(typeof refinementData === "function" ? refinementData(val, ctx) : refinementData);
        return false;
      } else {
        return true;
      }
    });
  }
  _refinement(refinement) {
    return new ZodEffects({
      schema: this,
      typeName: ZodFirstPartyTypeKind.ZodEffects,
      effect: { type: "refinement", refinement }
    });
  }
  superRefine(refinement) {
    return this._refinement(refinement);
  }
  constructor(def) {
    this.spa = this.safeParseAsync;
    this._def = def;
    this.parse = this.parse.bind(this);
    this.safeParse = this.safeParse.bind(this);
    this.parseAsync = this.parseAsync.bind(this);
    this.safeParseAsync = this.safeParseAsync.bind(this);
    this.spa = this.spa.bind(this);
    this.refine = this.refine.bind(this);
    this.refinement = this.refinement.bind(this);
    this.superRefine = this.superRefine.bind(this);
    this.optional = this.optional.bind(this);
    this.nullable = this.nullable.bind(this);
    this.nullish = this.nullish.bind(this);
    this.array = this.array.bind(this);
    this.promise = this.promise.bind(this);
    this.or = this.or.bind(this);
    this.and = this.and.bind(this);
    this.transform = this.transform.bind(this);
    this.brand = this.brand.bind(this);
    this.default = this.default.bind(this);
    this.catch = this.catch.bind(this);
    this.describe = this.describe.bind(this);
    this.pipe = this.pipe.bind(this);
    this.readonly = this.readonly.bind(this);
    this.isNullable = this.isNullable.bind(this);
    this.isOptional = this.isOptional.bind(this);
    this["~standard"] = {
      version: 1,
      vendor: "zod",
      validate: (data) => this["~validate"](data)
    };
  }
  optional() {
    return ZodOptional.create(this, this._def);
  }
  nullable() {
    return ZodNullable.create(this, this._def);
  }
  nullish() {
    return this.nullable().optional();
  }
  array() {
    return ZodArray.create(this);
  }
  promise() {
    return ZodPromise.create(this, this._def);
  }
  or(option) {
    return ZodUnion.create([this, option], this._def);
  }
  and(incoming) {
    return ZodIntersection.create(this, incoming, this._def);
  }
  transform(transform) {
    return new ZodEffects({
      ...processCreateParams(this._def),
      schema: this,
      typeName: ZodFirstPartyTypeKind.ZodEffects,
      effect: { type: "transform", transform }
    });
  }
  default(def) {
    const defaultValueFunc = typeof def === "function" ? def : () => def;
    return new ZodDefault({
      ...processCreateParams(this._def),
      innerType: this,
      defaultValue: defaultValueFunc,
      typeName: ZodFirstPartyTypeKind.ZodDefault
    });
  }
  brand() {
    return new ZodBranded({
      typeName: ZodFirstPartyTypeKind.ZodBranded,
      type: this,
      ...processCreateParams(this._def)
    });
  }
  catch(def) {
    const catchValueFunc = typeof def === "function" ? def : () => def;
    return new ZodCatch({
      ...processCreateParams(this._def),
      innerType: this,
      catchValue: catchValueFunc,
      typeName: ZodFirstPartyTypeKind.ZodCatch
    });
  }
  describe(description) {
    const This = this.constructor;
    return new This({
      ...this._def,
      description
    });
  }
  pipe(target) {
    return ZodPipeline.create(this, target);
  }
  readonly() {
    return ZodReadonly.create(this);
  }
  isOptional() {
    return this.safeParse(void 0).success;
  }
  isNullable() {
    return this.safeParse(null).success;
  }
};
var cuidRegex = /^c[^\s-]{8,}$/i;
var cuid2Regex = /^[0-9a-z]+$/;
var ulidRegex = /^[0-9A-HJKMNP-TV-Z]{26}$/i;
var uuidRegex = /^[0-9a-fA-F]{8}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{12}$/i;
var nanoidRegex = /^[a-z0-9_-]{21}$/i;
var jwtRegex = /^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]*$/;
var durationRegex = /^[-+]?P(?!$)(?:(?:[-+]?\d+Y)|(?:[-+]?\d+[.,]\d+Y$))?(?:(?:[-+]?\d+M)|(?:[-+]?\d+[.,]\d+M$))?(?:(?:[-+]?\d+W)|(?:[-+]?\d+[.,]\d+W$))?(?:(?:[-+]?\d+D)|(?:[-+]?\d+[.,]\d+D$))?(?:T(?=[\d+-])(?:(?:[-+]?\d+H)|(?:[-+]?\d+[.,]\d+H$))?(?:(?:[-+]?\d+M)|(?:[-+]?\d+[.,]\d+M$))?(?:[-+]?\d+(?:[.,]\d+)?S)?)??$/;
var emailRegex = /^(?!\.)(?!.*\.\.)([A-Z0-9_'+\-\.]*)[A-Z0-9_+-]@([A-Z0-9][A-Z0-9\-]*\.)+[A-Z]{2,}$/i;
var _emojiRegex = `^(\\p{Extended_Pictographic}|\\p{Emoji_Component})+$`;
var emojiRegex;
var ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\.){3}(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])$/;
var ipv4CidrRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\.){3}(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\/(3[0-2]|[12]?[0-9])$/;
var ipv6Regex = /^(([0-9a-fA-F]{1,4}:){7,7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9]))$/;
var ipv6CidrRegex = /^(([0-9a-fA-F]{1,4}:){7,7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9]))\/(12[0-8]|1[01][0-9]|[1-9]?[0-9])$/;
var base64Regex = /^([0-9a-zA-Z+/]{4})*(([0-9a-zA-Z+/]{2}==)|([0-9a-zA-Z+/]{3}=))?$/;
var base64urlRegex = /^([0-9a-zA-Z-_]{4})*(([0-9a-zA-Z-_]{2}(==)?)|([0-9a-zA-Z-_]{3}(=)?))?$/;
var dateRegexSource = `((\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-((0[13578]|1[02])-(0[1-9]|[12]\\d|3[01])|(0[469]|11)-(0[1-9]|[12]\\d|30)|(02)-(0[1-9]|1\\d|2[0-8])))`;
var dateRegex = new RegExp(`^${dateRegexSource}$`);
function timeRegexSource(args) {
  let secondsRegexSource = `[0-5]\\d`;
  if (args.precision) {
    secondsRegexSource = `${secondsRegexSource}\\.\\d{${args.precision}}`;
  } else if (args.precision == null) {
    secondsRegexSource = `${secondsRegexSource}(\\.\\d+)?`;
  }
  const secondsQuantifier = args.precision ? "+" : "?";
  return `([01]\\d|2[0-3]):[0-5]\\d(:${secondsRegexSource})${secondsQuantifier}`;
}
function timeRegex(args) {
  return new RegExp(`^${timeRegexSource(args)}$`);
}
function datetimeRegex(args) {
  let regex = `${dateRegexSource}T${timeRegexSource(args)}`;
  const opts = [];
  opts.push(args.local ? `Z?` : `Z`);
  if (args.offset)
    opts.push(`([+-]\\d{2}:?\\d{2})`);
  regex = `${regex}(${opts.join("|")})`;
  return new RegExp(`^${regex}$`);
}
function isValidIP(ip, version) {
  if ((version === "v4" || !version) && ipv4Regex.test(ip)) {
    return true;
  }
  if ((version === "v6" || !version) && ipv6Regex.test(ip)) {
    return true;
  }
  return false;
}
function isValidJWT(jwt, alg) {
  if (!jwtRegex.test(jwt))
    return false;
  try {
    const [header2] = jwt.split(".");
    const base64 = header2.replace(/-/g, "+").replace(/_/g, "/").padEnd(header2.length + (4 - header2.length % 4) % 4, "=");
    const decoded = JSON.parse(atob(base64));
    if (typeof decoded !== "object" || decoded === null)
      return false;
    if (!decoded.typ || !decoded.alg)
      return false;
    if (alg && decoded.alg !== alg)
      return false;
    return true;
  } catch (_a) {
    return false;
  }
}
function isValidCidr(ip, version) {
  if ((version === "v4" || !version) && ipv4CidrRegex.test(ip)) {
    return true;
  }
  if ((version === "v6" || !version) && ipv6CidrRegex.test(ip)) {
    return true;
  }
  return false;
}
var ZodString = class _ZodString extends ZodType {
  _parse(input) {
    if (this._def.coerce) {
      input.data = String(input.data);
    }
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.string) {
      const ctx2 = this._getOrReturnCtx(input);
      addIssueToContext(ctx2, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.string,
        received: ctx2.parsedType
      });
      return INVALID;
    }
    const status = new ParseStatus();
    let ctx = void 0;
    for (const check of this._def.checks) {
      if (check.kind === "min") {
        if (input.data.length < check.value) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_small,
            minimum: check.value,
            type: "string",
            inclusive: true,
            exact: false,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "max") {
        if (input.data.length > check.value) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_big,
            maximum: check.value,
            type: "string",
            inclusive: true,
            exact: false,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "length") {
        const tooBig = input.data.length > check.value;
        const tooSmall = input.data.length < check.value;
        if (tooBig || tooSmall) {
          ctx = this._getOrReturnCtx(input, ctx);
          if (tooBig) {
            addIssueToContext(ctx, {
              code: ZodIssueCode.too_big,
              maximum: check.value,
              type: "string",
              inclusive: true,
              exact: true,
              message: check.message
            });
          } else if (tooSmall) {
            addIssueToContext(ctx, {
              code: ZodIssueCode.too_small,
              minimum: check.value,
              type: "string",
              inclusive: true,
              exact: true,
              message: check.message
            });
          }
          status.dirty();
        }
      } else if (check.kind === "email") {
        if (!emailRegex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "email",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "emoji") {
        if (!emojiRegex) {
          emojiRegex = new RegExp(_emojiRegex, "u");
        }
        if (!emojiRegex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "emoji",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "uuid") {
        if (!uuidRegex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "uuid",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "nanoid") {
        if (!nanoidRegex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "nanoid",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "cuid") {
        if (!cuidRegex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "cuid",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "cuid2") {
        if (!cuid2Regex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "cuid2",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "ulid") {
        if (!ulidRegex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "ulid",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "url") {
        try {
          new URL(input.data);
        } catch (_a) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "url",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "regex") {
        check.regex.lastIndex = 0;
        const testResult = check.regex.test(input.data);
        if (!testResult) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "regex",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "trim") {
        input.data = input.data.trim();
      } else if (check.kind === "includes") {
        if (!input.data.includes(check.value, check.position)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_string,
            validation: { includes: check.value, position: check.position },
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "toLowerCase") {
        input.data = input.data.toLowerCase();
      } else if (check.kind === "toUpperCase") {
        input.data = input.data.toUpperCase();
      } else if (check.kind === "startsWith") {
        if (!input.data.startsWith(check.value)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_string,
            validation: { startsWith: check.value },
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "endsWith") {
        if (!input.data.endsWith(check.value)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_string,
            validation: { endsWith: check.value },
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "datetime") {
        const regex = datetimeRegex(check);
        if (!regex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_string,
            validation: "datetime",
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "date") {
        const regex = dateRegex;
        if (!regex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_string,
            validation: "date",
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "time") {
        const regex = timeRegex(check);
        if (!regex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_string,
            validation: "time",
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "duration") {
        if (!durationRegex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "duration",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "ip") {
        if (!isValidIP(input.data, check.version)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "ip",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "jwt") {
        if (!isValidJWT(input.data, check.alg)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "jwt",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "cidr") {
        if (!isValidCidr(input.data, check.version)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "cidr",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "base64") {
        if (!base64Regex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "base64",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "base64url") {
        if (!base64urlRegex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "base64url",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else {
        util.assertNever(check);
      }
    }
    return { status: status.value, value: input.data };
  }
  _regex(regex, validation, message) {
    return this.refinement((data) => regex.test(data), {
      validation,
      code: ZodIssueCode.invalid_string,
      ...errorUtil.errToObj(message)
    });
  }
  _addCheck(check) {
    return new _ZodString({
      ...this._def,
      checks: [...this._def.checks, check]
    });
  }
  email(message) {
    return this._addCheck({ kind: "email", ...errorUtil.errToObj(message) });
  }
  url(message) {
    return this._addCheck({ kind: "url", ...errorUtil.errToObj(message) });
  }
  emoji(message) {
    return this._addCheck({ kind: "emoji", ...errorUtil.errToObj(message) });
  }
  uuid(message) {
    return this._addCheck({ kind: "uuid", ...errorUtil.errToObj(message) });
  }
  nanoid(message) {
    return this._addCheck({ kind: "nanoid", ...errorUtil.errToObj(message) });
  }
  cuid(message) {
    return this._addCheck({ kind: "cuid", ...errorUtil.errToObj(message) });
  }
  cuid2(message) {
    return this._addCheck({ kind: "cuid2", ...errorUtil.errToObj(message) });
  }
  ulid(message) {
    return this._addCheck({ kind: "ulid", ...errorUtil.errToObj(message) });
  }
  base64(message) {
    return this._addCheck({ kind: "base64", ...errorUtil.errToObj(message) });
  }
  base64url(message) {
    return this._addCheck({
      kind: "base64url",
      ...errorUtil.errToObj(message)
    });
  }
  jwt(options) {
    return this._addCheck({ kind: "jwt", ...errorUtil.errToObj(options) });
  }
  ip(options) {
    return this._addCheck({ kind: "ip", ...errorUtil.errToObj(options) });
  }
  cidr(options) {
    return this._addCheck({ kind: "cidr", ...errorUtil.errToObj(options) });
  }
  datetime(options) {
    var _a, _b;
    if (typeof options === "string") {
      return this._addCheck({
        kind: "datetime",
        precision: null,
        offset: false,
        local: false,
        message: options
      });
    }
    return this._addCheck({
      kind: "datetime",
      precision: typeof (options === null || options === void 0 ? void 0 : options.precision) === "undefined" ? null : options === null || options === void 0 ? void 0 : options.precision,
      offset: (_a = options === null || options === void 0 ? void 0 : options.offset) !== null && _a !== void 0 ? _a : false,
      local: (_b = options === null || options === void 0 ? void 0 : options.local) !== null && _b !== void 0 ? _b : false,
      ...errorUtil.errToObj(options === null || options === void 0 ? void 0 : options.message)
    });
  }
  date(message) {
    return this._addCheck({ kind: "date", message });
  }
  time(options) {
    if (typeof options === "string") {
      return this._addCheck({
        kind: "time",
        precision: null,
        message: options
      });
    }
    return this._addCheck({
      kind: "time",
      precision: typeof (options === null || options === void 0 ? void 0 : options.precision) === "undefined" ? null : options === null || options === void 0 ? void 0 : options.precision,
      ...errorUtil.errToObj(options === null || options === void 0 ? void 0 : options.message)
    });
  }
  duration(message) {
    return this._addCheck({ kind: "duration", ...errorUtil.errToObj(message) });
  }
  regex(regex, message) {
    return this._addCheck({
      kind: "regex",
      regex,
      ...errorUtil.errToObj(message)
    });
  }
  includes(value, options) {
    return this._addCheck({
      kind: "includes",
      value,
      position: options === null || options === void 0 ? void 0 : options.position,
      ...errorUtil.errToObj(options === null || options === void 0 ? void 0 : options.message)
    });
  }
  startsWith(value, message) {
    return this._addCheck({
      kind: "startsWith",
      value,
      ...errorUtil.errToObj(message)
    });
  }
  endsWith(value, message) {
    return this._addCheck({
      kind: "endsWith",
      value,
      ...errorUtil.errToObj(message)
    });
  }
  min(minLength, message) {
    return this._addCheck({
      kind: "min",
      value: minLength,
      ...errorUtil.errToObj(message)
    });
  }
  max(maxLength, message) {
    return this._addCheck({
      kind: "max",
      value: maxLength,
      ...errorUtil.errToObj(message)
    });
  }
  length(len, message) {
    return this._addCheck({
      kind: "length",
      value: len,
      ...errorUtil.errToObj(message)
    });
  }
  /**
   * Equivalent to `.min(1)`
   */
  nonempty(message) {
    return this.min(1, errorUtil.errToObj(message));
  }
  trim() {
    return new _ZodString({
      ...this._def,
      checks: [...this._def.checks, { kind: "trim" }]
    });
  }
  toLowerCase() {
    return new _ZodString({
      ...this._def,
      checks: [...this._def.checks, { kind: "toLowerCase" }]
    });
  }
  toUpperCase() {
    return new _ZodString({
      ...this._def,
      checks: [...this._def.checks, { kind: "toUpperCase" }]
    });
  }
  get isDatetime() {
    return !!this._def.checks.find((ch) => ch.kind === "datetime");
  }
  get isDate() {
    return !!this._def.checks.find((ch) => ch.kind === "date");
  }
  get isTime() {
    return !!this._def.checks.find((ch) => ch.kind === "time");
  }
  get isDuration() {
    return !!this._def.checks.find((ch) => ch.kind === "duration");
  }
  get isEmail() {
    return !!this._def.checks.find((ch) => ch.kind === "email");
  }
  get isURL() {
    return !!this._def.checks.find((ch) => ch.kind === "url");
  }
  get isEmoji() {
    return !!this._def.checks.find((ch) => ch.kind === "emoji");
  }
  get isUUID() {
    return !!this._def.checks.find((ch) => ch.kind === "uuid");
  }
  get isNANOID() {
    return !!this._def.checks.find((ch) => ch.kind === "nanoid");
  }
  get isCUID() {
    return !!this._def.checks.find((ch) => ch.kind === "cuid");
  }
  get isCUID2() {
    return !!this._def.checks.find((ch) => ch.kind === "cuid2");
  }
  get isULID() {
    return !!this._def.checks.find((ch) => ch.kind === "ulid");
  }
  get isIP() {
    return !!this._def.checks.find((ch) => ch.kind === "ip");
  }
  get isCIDR() {
    return !!this._def.checks.find((ch) => ch.kind === "cidr");
  }
  get isBase64() {
    return !!this._def.checks.find((ch) => ch.kind === "base64");
  }
  get isBase64url() {
    return !!this._def.checks.find((ch) => ch.kind === "base64url");
  }
  get minLength() {
    let min = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "min") {
        if (min === null || ch.value > min)
          min = ch.value;
      }
    }
    return min;
  }
  get maxLength() {
    let max = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "max") {
        if (max === null || ch.value < max)
          max = ch.value;
      }
    }
    return max;
  }
};
ZodString.create = (params) => {
  var _a;
  return new ZodString({
    checks: [],
    typeName: ZodFirstPartyTypeKind.ZodString,
    coerce: (_a = params === null || params === void 0 ? void 0 : params.coerce) !== null && _a !== void 0 ? _a : false,
    ...processCreateParams(params)
  });
};
function floatSafeRemainder(val, step) {
  const valDecCount = (val.toString().split(".")[1] || "").length;
  const stepDecCount = (step.toString().split(".")[1] || "").length;
  const decCount = valDecCount > stepDecCount ? valDecCount : stepDecCount;
  const valInt = parseInt(val.toFixed(decCount).replace(".", ""));
  const stepInt = parseInt(step.toFixed(decCount).replace(".", ""));
  return valInt % stepInt / Math.pow(10, decCount);
}
var ZodNumber = class _ZodNumber extends ZodType {
  constructor() {
    super(...arguments);
    this.min = this.gte;
    this.max = this.lte;
    this.step = this.multipleOf;
  }
  _parse(input) {
    if (this._def.coerce) {
      input.data = Number(input.data);
    }
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.number) {
      const ctx2 = this._getOrReturnCtx(input);
      addIssueToContext(ctx2, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.number,
        received: ctx2.parsedType
      });
      return INVALID;
    }
    let ctx = void 0;
    const status = new ParseStatus();
    for (const check of this._def.checks) {
      if (check.kind === "int") {
        if (!util.isInteger(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_type,
            expected: "integer",
            received: "float",
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "min") {
        const tooSmall = check.inclusive ? input.data < check.value : input.data <= check.value;
        if (tooSmall) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_small,
            minimum: check.value,
            type: "number",
            inclusive: check.inclusive,
            exact: false,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "max") {
        const tooBig = check.inclusive ? input.data > check.value : input.data >= check.value;
        if (tooBig) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_big,
            maximum: check.value,
            type: "number",
            inclusive: check.inclusive,
            exact: false,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "multipleOf") {
        if (floatSafeRemainder(input.data, check.value) !== 0) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.not_multiple_of,
            multipleOf: check.value,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "finite") {
        if (!Number.isFinite(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.not_finite,
            message: check.message
          });
          status.dirty();
        }
      } else {
        util.assertNever(check);
      }
    }
    return { status: status.value, value: input.data };
  }
  gte(value, message) {
    return this.setLimit("min", value, true, errorUtil.toString(message));
  }
  gt(value, message) {
    return this.setLimit("min", value, false, errorUtil.toString(message));
  }
  lte(value, message) {
    return this.setLimit("max", value, true, errorUtil.toString(message));
  }
  lt(value, message) {
    return this.setLimit("max", value, false, errorUtil.toString(message));
  }
  setLimit(kind, value, inclusive, message) {
    return new _ZodNumber({
      ...this._def,
      checks: [
        ...this._def.checks,
        {
          kind,
          value,
          inclusive,
          message: errorUtil.toString(message)
        }
      ]
    });
  }
  _addCheck(check) {
    return new _ZodNumber({
      ...this._def,
      checks: [...this._def.checks, check]
    });
  }
  int(message) {
    return this._addCheck({
      kind: "int",
      message: errorUtil.toString(message)
    });
  }
  positive(message) {
    return this._addCheck({
      kind: "min",
      value: 0,
      inclusive: false,
      message: errorUtil.toString(message)
    });
  }
  negative(message) {
    return this._addCheck({
      kind: "max",
      value: 0,
      inclusive: false,
      message: errorUtil.toString(message)
    });
  }
  nonpositive(message) {
    return this._addCheck({
      kind: "max",
      value: 0,
      inclusive: true,
      message: errorUtil.toString(message)
    });
  }
  nonnegative(message) {
    return this._addCheck({
      kind: "min",
      value: 0,
      inclusive: true,
      message: errorUtil.toString(message)
    });
  }
  multipleOf(value, message) {
    return this._addCheck({
      kind: "multipleOf",
      value,
      message: errorUtil.toString(message)
    });
  }
  finite(message) {
    return this._addCheck({
      kind: "finite",
      message: errorUtil.toString(message)
    });
  }
  safe(message) {
    return this._addCheck({
      kind: "min",
      inclusive: true,
      value: Number.MIN_SAFE_INTEGER,
      message: errorUtil.toString(message)
    })._addCheck({
      kind: "max",
      inclusive: true,
      value: Number.MAX_SAFE_INTEGER,
      message: errorUtil.toString(message)
    });
  }
  get minValue() {
    let min = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "min") {
        if (min === null || ch.value > min)
          min = ch.value;
      }
    }
    return min;
  }
  get maxValue() {
    let max = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "max") {
        if (max === null || ch.value < max)
          max = ch.value;
      }
    }
    return max;
  }
  get isInt() {
    return !!this._def.checks.find((ch) => ch.kind === "int" || ch.kind === "multipleOf" && util.isInteger(ch.value));
  }
  get isFinite() {
    let max = null, min = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "finite" || ch.kind === "int" || ch.kind === "multipleOf") {
        return true;
      } else if (ch.kind === "min") {
        if (min === null || ch.value > min)
          min = ch.value;
      } else if (ch.kind === "max") {
        if (max === null || ch.value < max)
          max = ch.value;
      }
    }
    return Number.isFinite(min) && Number.isFinite(max);
  }
};
ZodNumber.create = (params) => {
  return new ZodNumber({
    checks: [],
    typeName: ZodFirstPartyTypeKind.ZodNumber,
    coerce: (params === null || params === void 0 ? void 0 : params.coerce) || false,
    ...processCreateParams(params)
  });
};
var ZodBigInt = class _ZodBigInt extends ZodType {
  constructor() {
    super(...arguments);
    this.min = this.gte;
    this.max = this.lte;
  }
  _parse(input) {
    if (this._def.coerce) {
      try {
        input.data = BigInt(input.data);
      } catch (_a) {
        return this._getInvalidInput(input);
      }
    }
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.bigint) {
      return this._getInvalidInput(input);
    }
    let ctx = void 0;
    const status = new ParseStatus();
    for (const check of this._def.checks) {
      if (check.kind === "min") {
        const tooSmall = check.inclusive ? input.data < check.value : input.data <= check.value;
        if (tooSmall) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_small,
            type: "bigint",
            minimum: check.value,
            inclusive: check.inclusive,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "max") {
        const tooBig = check.inclusive ? input.data > check.value : input.data >= check.value;
        if (tooBig) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_big,
            type: "bigint",
            maximum: check.value,
            inclusive: check.inclusive,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "multipleOf") {
        if (input.data % check.value !== BigInt(0)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.not_multiple_of,
            multipleOf: check.value,
            message: check.message
          });
          status.dirty();
        }
      } else {
        util.assertNever(check);
      }
    }
    return { status: status.value, value: input.data };
  }
  _getInvalidInput(input) {
    const ctx = this._getOrReturnCtx(input);
    addIssueToContext(ctx, {
      code: ZodIssueCode.invalid_type,
      expected: ZodParsedType.bigint,
      received: ctx.parsedType
    });
    return INVALID;
  }
  gte(value, message) {
    return this.setLimit("min", value, true, errorUtil.toString(message));
  }
  gt(value, message) {
    return this.setLimit("min", value, false, errorUtil.toString(message));
  }
  lte(value, message) {
    return this.setLimit("max", value, true, errorUtil.toString(message));
  }
  lt(value, message) {
    return this.setLimit("max", value, false, errorUtil.toString(message));
  }
  setLimit(kind, value, inclusive, message) {
    return new _ZodBigInt({
      ...this._def,
      checks: [
        ...this._def.checks,
        {
          kind,
          value,
          inclusive,
          message: errorUtil.toString(message)
        }
      ]
    });
  }
  _addCheck(check) {
    return new _ZodBigInt({
      ...this._def,
      checks: [...this._def.checks, check]
    });
  }
  positive(message) {
    return this._addCheck({
      kind: "min",
      value: BigInt(0),
      inclusive: false,
      message: errorUtil.toString(message)
    });
  }
  negative(message) {
    return this._addCheck({
      kind: "max",
      value: BigInt(0),
      inclusive: false,
      message: errorUtil.toString(message)
    });
  }
  nonpositive(message) {
    return this._addCheck({
      kind: "max",
      value: BigInt(0),
      inclusive: true,
      message: errorUtil.toString(message)
    });
  }
  nonnegative(message) {
    return this._addCheck({
      kind: "min",
      value: BigInt(0),
      inclusive: true,
      message: errorUtil.toString(message)
    });
  }
  multipleOf(value, message) {
    return this._addCheck({
      kind: "multipleOf",
      value,
      message: errorUtil.toString(message)
    });
  }
  get minValue() {
    let min = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "min") {
        if (min === null || ch.value > min)
          min = ch.value;
      }
    }
    return min;
  }
  get maxValue() {
    let max = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "max") {
        if (max === null || ch.value < max)
          max = ch.value;
      }
    }
    return max;
  }
};
ZodBigInt.create = (params) => {
  var _a;
  return new ZodBigInt({
    checks: [],
    typeName: ZodFirstPartyTypeKind.ZodBigInt,
    coerce: (_a = params === null || params === void 0 ? void 0 : params.coerce) !== null && _a !== void 0 ? _a : false,
    ...processCreateParams(params)
  });
};
var ZodBoolean = class extends ZodType {
  _parse(input) {
    if (this._def.coerce) {
      input.data = Boolean(input.data);
    }
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.boolean) {
      const ctx = this._getOrReturnCtx(input);
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.boolean,
        received: ctx.parsedType
      });
      return INVALID;
    }
    return OK(input.data);
  }
};
ZodBoolean.create = (params) => {
  return new ZodBoolean({
    typeName: ZodFirstPartyTypeKind.ZodBoolean,
    coerce: (params === null || params === void 0 ? void 0 : params.coerce) || false,
    ...processCreateParams(params)
  });
};
var ZodDate = class _ZodDate extends ZodType {
  _parse(input) {
    if (this._def.coerce) {
      input.data = new Date(input.data);
    }
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.date) {
      const ctx2 = this._getOrReturnCtx(input);
      addIssueToContext(ctx2, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.date,
        received: ctx2.parsedType
      });
      return INVALID;
    }
    if (isNaN(input.data.getTime())) {
      const ctx2 = this._getOrReturnCtx(input);
      addIssueToContext(ctx2, {
        code: ZodIssueCode.invalid_date
      });
      return INVALID;
    }
    const status = new ParseStatus();
    let ctx = void 0;
    for (const check of this._def.checks) {
      if (check.kind === "min") {
        if (input.data.getTime() < check.value) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_small,
            message: check.message,
            inclusive: true,
            exact: false,
            minimum: check.value,
            type: "date"
          });
          status.dirty();
        }
      } else if (check.kind === "max") {
        if (input.data.getTime() > check.value) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_big,
            message: check.message,
            inclusive: true,
            exact: false,
            maximum: check.value,
            type: "date"
          });
          status.dirty();
        }
      } else {
        util.assertNever(check);
      }
    }
    return {
      status: status.value,
      value: new Date(input.data.getTime())
    };
  }
  _addCheck(check) {
    return new _ZodDate({
      ...this._def,
      checks: [...this._def.checks, check]
    });
  }
  min(minDate, message) {
    return this._addCheck({
      kind: "min",
      value: minDate.getTime(),
      message: errorUtil.toString(message)
    });
  }
  max(maxDate, message) {
    return this._addCheck({
      kind: "max",
      value: maxDate.getTime(),
      message: errorUtil.toString(message)
    });
  }
  get minDate() {
    let min = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "min") {
        if (min === null || ch.value > min)
          min = ch.value;
      }
    }
    return min != null ? new Date(min) : null;
  }
  get maxDate() {
    let max = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "max") {
        if (max === null || ch.value < max)
          max = ch.value;
      }
    }
    return max != null ? new Date(max) : null;
  }
};
ZodDate.create = (params) => {
  return new ZodDate({
    checks: [],
    coerce: (params === null || params === void 0 ? void 0 : params.coerce) || false,
    typeName: ZodFirstPartyTypeKind.ZodDate,
    ...processCreateParams(params)
  });
};
var ZodSymbol = class extends ZodType {
  _parse(input) {
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.symbol) {
      const ctx = this._getOrReturnCtx(input);
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.symbol,
        received: ctx.parsedType
      });
      return INVALID;
    }
    return OK(input.data);
  }
};
ZodSymbol.create = (params) => {
  return new ZodSymbol({
    typeName: ZodFirstPartyTypeKind.ZodSymbol,
    ...processCreateParams(params)
  });
};
var ZodUndefined = class extends ZodType {
  _parse(input) {
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.undefined) {
      const ctx = this._getOrReturnCtx(input);
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.undefined,
        received: ctx.parsedType
      });
      return INVALID;
    }
    return OK(input.data);
  }
};
ZodUndefined.create = (params) => {
  return new ZodUndefined({
    typeName: ZodFirstPartyTypeKind.ZodUndefined,
    ...processCreateParams(params)
  });
};
var ZodNull = class extends ZodType {
  _parse(input) {
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.null) {
      const ctx = this._getOrReturnCtx(input);
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.null,
        received: ctx.parsedType
      });
      return INVALID;
    }
    return OK(input.data);
  }
};
ZodNull.create = (params) => {
  return new ZodNull({
    typeName: ZodFirstPartyTypeKind.ZodNull,
    ...processCreateParams(params)
  });
};
var ZodAny = class extends ZodType {
  constructor() {
    super(...arguments);
    this._any = true;
  }
  _parse(input) {
    return OK(input.data);
  }
};
ZodAny.create = (params) => {
  return new ZodAny({
    typeName: ZodFirstPartyTypeKind.ZodAny,
    ...processCreateParams(params)
  });
};
var ZodUnknown = class extends ZodType {
  constructor() {
    super(...arguments);
    this._unknown = true;
  }
  _parse(input) {
    return OK(input.data);
  }
};
ZodUnknown.create = (params) => {
  return new ZodUnknown({
    typeName: ZodFirstPartyTypeKind.ZodUnknown,
    ...processCreateParams(params)
  });
};
var ZodNever = class extends ZodType {
  _parse(input) {
    const ctx = this._getOrReturnCtx(input);
    addIssueToContext(ctx, {
      code: ZodIssueCode.invalid_type,
      expected: ZodParsedType.never,
      received: ctx.parsedType
    });
    return INVALID;
  }
};
ZodNever.create = (params) => {
  return new ZodNever({
    typeName: ZodFirstPartyTypeKind.ZodNever,
    ...processCreateParams(params)
  });
};
var ZodVoid = class extends ZodType {
  _parse(input) {
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.undefined) {
      const ctx = this._getOrReturnCtx(input);
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.void,
        received: ctx.parsedType
      });
      return INVALID;
    }
    return OK(input.data);
  }
};
ZodVoid.create = (params) => {
  return new ZodVoid({
    typeName: ZodFirstPartyTypeKind.ZodVoid,
    ...processCreateParams(params)
  });
};
var ZodArray = class _ZodArray extends ZodType {
  _parse(input) {
    const { ctx, status } = this._processInputParams(input);
    const def = this._def;
    if (ctx.parsedType !== ZodParsedType.array) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.array,
        received: ctx.parsedType
      });
      return INVALID;
    }
    if (def.exactLength !== null) {
      const tooBig = ctx.data.length > def.exactLength.value;
      const tooSmall = ctx.data.length < def.exactLength.value;
      if (tooBig || tooSmall) {
        addIssueToContext(ctx, {
          code: tooBig ? ZodIssueCode.too_big : ZodIssueCode.too_small,
          minimum: tooSmall ? def.exactLength.value : void 0,
          maximum: tooBig ? def.exactLength.value : void 0,
          type: "array",
          inclusive: true,
          exact: true,
          message: def.exactLength.message
        });
        status.dirty();
      }
    }
    if (def.minLength !== null) {
      if (ctx.data.length < def.minLength.value) {
        addIssueToContext(ctx, {
          code: ZodIssueCode.too_small,
          minimum: def.minLength.value,
          type: "array",
          inclusive: true,
          exact: false,
          message: def.minLength.message
        });
        status.dirty();
      }
    }
    if (def.maxLength !== null) {
      if (ctx.data.length > def.maxLength.value) {
        addIssueToContext(ctx, {
          code: ZodIssueCode.too_big,
          maximum: def.maxLength.value,
          type: "array",
          inclusive: true,
          exact: false,
          message: def.maxLength.message
        });
        status.dirty();
      }
    }
    if (ctx.common.async) {
      return Promise.all([...ctx.data].map((item, i) => {
        return def.type._parseAsync(new ParseInputLazyPath(ctx, item, ctx.path, i));
      })).then((result2) => {
        return ParseStatus.mergeArray(status, result2);
      });
    }
    const result = [...ctx.data].map((item, i) => {
      return def.type._parseSync(new ParseInputLazyPath(ctx, item, ctx.path, i));
    });
    return ParseStatus.mergeArray(status, result);
  }
  get element() {
    return this._def.type;
  }
  min(minLength, message) {
    return new _ZodArray({
      ...this._def,
      minLength: { value: minLength, message: errorUtil.toString(message) }
    });
  }
  max(maxLength, message) {
    return new _ZodArray({
      ...this._def,
      maxLength: { value: maxLength, message: errorUtil.toString(message) }
    });
  }
  length(len, message) {
    return new _ZodArray({
      ...this._def,
      exactLength: { value: len, message: errorUtil.toString(message) }
    });
  }
  nonempty(message) {
    return this.min(1, message);
  }
};
ZodArray.create = (schema, params) => {
  return new ZodArray({
    type: schema,
    minLength: null,
    maxLength: null,
    exactLength: null,
    typeName: ZodFirstPartyTypeKind.ZodArray,
    ...processCreateParams(params)
  });
};
function deepPartialify(schema) {
  if (schema instanceof ZodObject) {
    const newShape = {};
    for (const key in schema.shape) {
      const fieldSchema = schema.shape[key];
      newShape[key] = ZodOptional.create(deepPartialify(fieldSchema));
    }
    return new ZodObject({
      ...schema._def,
      shape: () => newShape
    });
  } else if (schema instanceof ZodArray) {
    return new ZodArray({
      ...schema._def,
      type: deepPartialify(schema.element)
    });
  } else if (schema instanceof ZodOptional) {
    return ZodOptional.create(deepPartialify(schema.unwrap()));
  } else if (schema instanceof ZodNullable) {
    return ZodNullable.create(deepPartialify(schema.unwrap()));
  } else if (schema instanceof ZodTuple) {
    return ZodTuple.create(schema.items.map((item) => deepPartialify(item)));
  } else {
    return schema;
  }
}
var ZodObject = class _ZodObject extends ZodType {
  constructor() {
    super(...arguments);
    this._cached = null;
    this.nonstrict = this.passthrough;
    this.augment = this.extend;
  }
  _getCached() {
    if (this._cached !== null)
      return this._cached;
    const shape = this._def.shape();
    const keys = util.objectKeys(shape);
    return this._cached = { shape, keys };
  }
  _parse(input) {
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.object) {
      const ctx2 = this._getOrReturnCtx(input);
      addIssueToContext(ctx2, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.object,
        received: ctx2.parsedType
      });
      return INVALID;
    }
    const { status, ctx } = this._processInputParams(input);
    const { shape, keys: shapeKeys } = this._getCached();
    const extraKeys = [];
    if (!(this._def.catchall instanceof ZodNever && this._def.unknownKeys === "strip")) {
      for (const key in ctx.data) {
        if (!shapeKeys.includes(key)) {
          extraKeys.push(key);
        }
      }
    }
    const pairs = [];
    for (const key of shapeKeys) {
      const keyValidator = shape[key];
      const value = ctx.data[key];
      pairs.push({
        key: { status: "valid", value: key },
        value: keyValidator._parse(new ParseInputLazyPath(ctx, value, ctx.path, key)),
        alwaysSet: key in ctx.data
      });
    }
    if (this._def.catchall instanceof ZodNever) {
      const unknownKeys = this._def.unknownKeys;
      if (unknownKeys === "passthrough") {
        for (const key of extraKeys) {
          pairs.push({
            key: { status: "valid", value: key },
            value: { status: "valid", value: ctx.data[key] }
          });
        }
      } else if (unknownKeys === "strict") {
        if (extraKeys.length > 0) {
          addIssueToContext(ctx, {
            code: ZodIssueCode.unrecognized_keys,
            keys: extraKeys
          });
          status.dirty();
        }
      } else if (unknownKeys === "strip") ;
      else {
        throw new Error(`Internal ZodObject error: invalid unknownKeys value.`);
      }
    } else {
      const catchall = this._def.catchall;
      for (const key of extraKeys) {
        const value = ctx.data[key];
        pairs.push({
          key: { status: "valid", value: key },
          value: catchall._parse(
            new ParseInputLazyPath(ctx, value, ctx.path, key)
            //, ctx.child(key), value, getParsedType(value)
          ),
          alwaysSet: key in ctx.data
        });
      }
    }
    if (ctx.common.async) {
      return Promise.resolve().then(async () => {
        const syncPairs = [];
        for (const pair of pairs) {
          const key = await pair.key;
          const value = await pair.value;
          syncPairs.push({
            key,
            value,
            alwaysSet: pair.alwaysSet
          });
        }
        return syncPairs;
      }).then((syncPairs) => {
        return ParseStatus.mergeObjectSync(status, syncPairs);
      });
    } else {
      return ParseStatus.mergeObjectSync(status, pairs);
    }
  }
  get shape() {
    return this._def.shape();
  }
  strict(message) {
    errorUtil.errToObj;
    return new _ZodObject({
      ...this._def,
      unknownKeys: "strict",
      ...message !== void 0 ? {
        errorMap: (issue, ctx) => {
          var _a, _b, _c, _d;
          const defaultError = (_c = (_b = (_a = this._def).errorMap) === null || _b === void 0 ? void 0 : _b.call(_a, issue, ctx).message) !== null && _c !== void 0 ? _c : ctx.defaultError;
          if (issue.code === "unrecognized_keys")
            return {
              message: (_d = errorUtil.errToObj(message).message) !== null && _d !== void 0 ? _d : defaultError
            };
          return {
            message: defaultError
          };
        }
      } : {}
    });
  }
  strip() {
    return new _ZodObject({
      ...this._def,
      unknownKeys: "strip"
    });
  }
  passthrough() {
    return new _ZodObject({
      ...this._def,
      unknownKeys: "passthrough"
    });
  }
  // const AugmentFactory =
  //   <Def extends ZodObjectDef>(def: Def) =>
  //   <Augmentation extends ZodRawShape>(
  //     augmentation: Augmentation
  //   ): ZodObject<
  //     extendShape<ReturnType<Def["shape"]>, Augmentation>,
  //     Def["unknownKeys"],
  //     Def["catchall"]
  //   > => {
  //     return new ZodObject({
  //       ...def,
  //       shape: () => ({
  //         ...def.shape(),
  //         ...augmentation,
  //       }),
  //     }) as any;
  //   };
  extend(augmentation) {
    return new _ZodObject({
      ...this._def,
      shape: () => ({
        ...this._def.shape(),
        ...augmentation
      })
    });
  }
  /**
   * Prior to zod@1.0.12 there was a bug in the
   * inferred type of merged objects. Please
   * upgrade if you are experiencing issues.
   */
  merge(merging) {
    const merged = new _ZodObject({
      unknownKeys: merging._def.unknownKeys,
      catchall: merging._def.catchall,
      shape: () => ({
        ...this._def.shape(),
        ...merging._def.shape()
      }),
      typeName: ZodFirstPartyTypeKind.ZodObject
    });
    return merged;
  }
  // merge<
  //   Incoming extends AnyZodObject,
  //   Augmentation extends Incoming["shape"],
  //   NewOutput extends {
  //     [k in keyof Augmentation | keyof Output]: k extends keyof Augmentation
  //       ? Augmentation[k]["_output"]
  //       : k extends keyof Output
  //       ? Output[k]
  //       : never;
  //   },
  //   NewInput extends {
  //     [k in keyof Augmentation | keyof Input]: k extends keyof Augmentation
  //       ? Augmentation[k]["_input"]
  //       : k extends keyof Input
  //       ? Input[k]
  //       : never;
  //   }
  // >(
  //   merging: Incoming
  // ): ZodObject<
  //   extendShape<T, ReturnType<Incoming["_def"]["shape"]>>,
  //   Incoming["_def"]["unknownKeys"],
  //   Incoming["_def"]["catchall"],
  //   NewOutput,
  //   NewInput
  // > {
  //   const merged: any = new ZodObject({
  //     unknownKeys: merging._def.unknownKeys,
  //     catchall: merging._def.catchall,
  //     shape: () =>
  //       objectUtil.mergeShapes(this._def.shape(), merging._def.shape()),
  //     typeName: ZodFirstPartyTypeKind.ZodObject,
  //   }) as any;
  //   return merged;
  // }
  setKey(key, schema) {
    return this.augment({ [key]: schema });
  }
  // merge<Incoming extends AnyZodObject>(
  //   merging: Incoming
  // ): //ZodObject<T & Incoming["_shape"], UnknownKeys, Catchall> = (merging) => {
  // ZodObject<
  //   extendShape<T, ReturnType<Incoming["_def"]["shape"]>>,
  //   Incoming["_def"]["unknownKeys"],
  //   Incoming["_def"]["catchall"]
  // > {
  //   // const mergedShape = objectUtil.mergeShapes(
  //   //   this._def.shape(),
  //   //   merging._def.shape()
  //   // );
  //   const merged: any = new ZodObject({
  //     unknownKeys: merging._def.unknownKeys,
  //     catchall: merging._def.catchall,
  //     shape: () =>
  //       objectUtil.mergeShapes(this._def.shape(), merging._def.shape()),
  //     typeName: ZodFirstPartyTypeKind.ZodObject,
  //   }) as any;
  //   return merged;
  // }
  catchall(index) {
    return new _ZodObject({
      ...this._def,
      catchall: index
    });
  }
  pick(mask) {
    const shape = {};
    util.objectKeys(mask).forEach((key) => {
      if (mask[key] && this.shape[key]) {
        shape[key] = this.shape[key];
      }
    });
    return new _ZodObject({
      ...this._def,
      shape: () => shape
    });
  }
  omit(mask) {
    const shape = {};
    util.objectKeys(this.shape).forEach((key) => {
      if (!mask[key]) {
        shape[key] = this.shape[key];
      }
    });
    return new _ZodObject({
      ...this._def,
      shape: () => shape
    });
  }
  /**
   * @deprecated
   */
  deepPartial() {
    return deepPartialify(this);
  }
  partial(mask) {
    const newShape = {};
    util.objectKeys(this.shape).forEach((key) => {
      const fieldSchema = this.shape[key];
      if (mask && !mask[key]) {
        newShape[key] = fieldSchema;
      } else {
        newShape[key] = fieldSchema.optional();
      }
    });
    return new _ZodObject({
      ...this._def,
      shape: () => newShape
    });
  }
  required(mask) {
    const newShape = {};
    util.objectKeys(this.shape).forEach((key) => {
      if (mask && !mask[key]) {
        newShape[key] = this.shape[key];
      } else {
        const fieldSchema = this.shape[key];
        let newField = fieldSchema;
        while (newField instanceof ZodOptional) {
          newField = newField._def.innerType;
        }
        newShape[key] = newField;
      }
    });
    return new _ZodObject({
      ...this._def,
      shape: () => newShape
    });
  }
  keyof() {
    return createZodEnum(util.objectKeys(this.shape));
  }
};
ZodObject.create = (shape, params) => {
  return new ZodObject({
    shape: () => shape,
    unknownKeys: "strip",
    catchall: ZodNever.create(),
    typeName: ZodFirstPartyTypeKind.ZodObject,
    ...processCreateParams(params)
  });
};
ZodObject.strictCreate = (shape, params) => {
  return new ZodObject({
    shape: () => shape,
    unknownKeys: "strict",
    catchall: ZodNever.create(),
    typeName: ZodFirstPartyTypeKind.ZodObject,
    ...processCreateParams(params)
  });
};
ZodObject.lazycreate = (shape, params) => {
  return new ZodObject({
    shape,
    unknownKeys: "strip",
    catchall: ZodNever.create(),
    typeName: ZodFirstPartyTypeKind.ZodObject,
    ...processCreateParams(params)
  });
};
var ZodUnion = class extends ZodType {
  _parse(input) {
    const { ctx } = this._processInputParams(input);
    const options = this._def.options;
    function handleResults(results) {
      for (const result of results) {
        if (result.result.status === "valid") {
          return result.result;
        }
      }
      for (const result of results) {
        if (result.result.status === "dirty") {
          ctx.common.issues.push(...result.ctx.common.issues);
          return result.result;
        }
      }
      const unionErrors = results.map((result) => new ZodError(result.ctx.common.issues));
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_union,
        unionErrors
      });
      return INVALID;
    }
    if (ctx.common.async) {
      return Promise.all(options.map(async (option) => {
        const childCtx = {
          ...ctx,
          common: {
            ...ctx.common,
            issues: []
          },
          parent: null
        };
        return {
          result: await option._parseAsync({
            data: ctx.data,
            path: ctx.path,
            parent: childCtx
          }),
          ctx: childCtx
        };
      })).then(handleResults);
    } else {
      let dirty = void 0;
      const issues = [];
      for (const option of options) {
        const childCtx = {
          ...ctx,
          common: {
            ...ctx.common,
            issues: []
          },
          parent: null
        };
        const result = option._parseSync({
          data: ctx.data,
          path: ctx.path,
          parent: childCtx
        });
        if (result.status === "valid") {
          return result;
        } else if (result.status === "dirty" && !dirty) {
          dirty = { result, ctx: childCtx };
        }
        if (childCtx.common.issues.length) {
          issues.push(childCtx.common.issues);
        }
      }
      if (dirty) {
        ctx.common.issues.push(...dirty.ctx.common.issues);
        return dirty.result;
      }
      const unionErrors = issues.map((issues2) => new ZodError(issues2));
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_union,
        unionErrors
      });
      return INVALID;
    }
  }
  get options() {
    return this._def.options;
  }
};
ZodUnion.create = (types, params) => {
  return new ZodUnion({
    options: types,
    typeName: ZodFirstPartyTypeKind.ZodUnion,
    ...processCreateParams(params)
  });
};
var getDiscriminator = (type) => {
  if (type instanceof ZodLazy) {
    return getDiscriminator(type.schema);
  } else if (type instanceof ZodEffects) {
    return getDiscriminator(type.innerType());
  } else if (type instanceof ZodLiteral) {
    return [type.value];
  } else if (type instanceof ZodEnum) {
    return type.options;
  } else if (type instanceof ZodNativeEnum) {
    return util.objectValues(type.enum);
  } else if (type instanceof ZodDefault) {
    return getDiscriminator(type._def.innerType);
  } else if (type instanceof ZodUndefined) {
    return [void 0];
  } else if (type instanceof ZodNull) {
    return [null];
  } else if (type instanceof ZodOptional) {
    return [void 0, ...getDiscriminator(type.unwrap())];
  } else if (type instanceof ZodNullable) {
    return [null, ...getDiscriminator(type.unwrap())];
  } else if (type instanceof ZodBranded) {
    return getDiscriminator(type.unwrap());
  } else if (type instanceof ZodReadonly) {
    return getDiscriminator(type.unwrap());
  } else if (type instanceof ZodCatch) {
    return getDiscriminator(type._def.innerType);
  } else {
    return [];
  }
};
var ZodDiscriminatedUnion = class _ZodDiscriminatedUnion extends ZodType {
  _parse(input) {
    const { ctx } = this._processInputParams(input);
    if (ctx.parsedType !== ZodParsedType.object) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.object,
        received: ctx.parsedType
      });
      return INVALID;
    }
    const discriminator = this.discriminator;
    const discriminatorValue = ctx.data[discriminator];
    const option = this.optionsMap.get(discriminatorValue);
    if (!option) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_union_discriminator,
        options: Array.from(this.optionsMap.keys()),
        path: [discriminator]
      });
      return INVALID;
    }
    if (ctx.common.async) {
      return option._parseAsync({
        data: ctx.data,
        path: ctx.path,
        parent: ctx
      });
    } else {
      return option._parseSync({
        data: ctx.data,
        path: ctx.path,
        parent: ctx
      });
    }
  }
  get discriminator() {
    return this._def.discriminator;
  }
  get options() {
    return this._def.options;
  }
  get optionsMap() {
    return this._def.optionsMap;
  }
  /**
   * The constructor of the discriminated union schema. Its behaviour is very similar to that of the normal z.union() constructor.
   * However, it only allows a union of objects, all of which need to share a discriminator property. This property must
   * have a different value for each object in the union.
   * @param discriminator the name of the discriminator property
   * @param types an array of object schemas
   * @param params
   */
  static create(discriminator, options, params) {
    const optionsMap = /* @__PURE__ */ new Map();
    for (const type of options) {
      const discriminatorValues = getDiscriminator(type.shape[discriminator]);
      if (!discriminatorValues.length) {
        throw new Error(`A discriminator value for key \`${discriminator}\` could not be extracted from all schema options`);
      }
      for (const value of discriminatorValues) {
        if (optionsMap.has(value)) {
          throw new Error(`Discriminator property ${String(discriminator)} has duplicate value ${String(value)}`);
        }
        optionsMap.set(value, type);
      }
    }
    return new _ZodDiscriminatedUnion({
      typeName: ZodFirstPartyTypeKind.ZodDiscriminatedUnion,
      discriminator,
      options,
      optionsMap,
      ...processCreateParams(params)
    });
  }
};
function mergeValues(a, b) {
  const aType = getParsedType(a);
  const bType = getParsedType(b);
  if (a === b) {
    return { valid: true, data: a };
  } else if (aType === ZodParsedType.object && bType === ZodParsedType.object) {
    const bKeys = util.objectKeys(b);
    const sharedKeys = util.objectKeys(a).filter((key) => bKeys.indexOf(key) !== -1);
    const newObj = { ...a, ...b };
    for (const key of sharedKeys) {
      const sharedValue = mergeValues(a[key], b[key]);
      if (!sharedValue.valid) {
        return { valid: false };
      }
      newObj[key] = sharedValue.data;
    }
    return { valid: true, data: newObj };
  } else if (aType === ZodParsedType.array && bType === ZodParsedType.array) {
    if (a.length !== b.length) {
      return { valid: false };
    }
    const newArray = [];
    for (let index = 0; index < a.length; index++) {
      const itemA = a[index];
      const itemB = b[index];
      const sharedValue = mergeValues(itemA, itemB);
      if (!sharedValue.valid) {
        return { valid: false };
      }
      newArray.push(sharedValue.data);
    }
    return { valid: true, data: newArray };
  } else if (aType === ZodParsedType.date && bType === ZodParsedType.date && +a === +b) {
    return { valid: true, data: a };
  } else {
    return { valid: false };
  }
}
var ZodIntersection = class extends ZodType {
  _parse(input) {
    const { status, ctx } = this._processInputParams(input);
    const handleParsed = (parsedLeft, parsedRight) => {
      if (isAborted(parsedLeft) || isAborted(parsedRight)) {
        return INVALID;
      }
      const merged = mergeValues(parsedLeft.value, parsedRight.value);
      if (!merged.valid) {
        addIssueToContext(ctx, {
          code: ZodIssueCode.invalid_intersection_types
        });
        return INVALID;
      }
      if (isDirty(parsedLeft) || isDirty(parsedRight)) {
        status.dirty();
      }
      return { status: status.value, value: merged.data };
    };
    if (ctx.common.async) {
      return Promise.all([
        this._def.left._parseAsync({
          data: ctx.data,
          path: ctx.path,
          parent: ctx
        }),
        this._def.right._parseAsync({
          data: ctx.data,
          path: ctx.path,
          parent: ctx
        })
      ]).then(([left, right]) => handleParsed(left, right));
    } else {
      return handleParsed(this._def.left._parseSync({
        data: ctx.data,
        path: ctx.path,
        parent: ctx
      }), this._def.right._parseSync({
        data: ctx.data,
        path: ctx.path,
        parent: ctx
      }));
    }
  }
};
ZodIntersection.create = (left, right, params) => {
  return new ZodIntersection({
    left,
    right,
    typeName: ZodFirstPartyTypeKind.ZodIntersection,
    ...processCreateParams(params)
  });
};
var ZodTuple = class _ZodTuple extends ZodType {
  _parse(input) {
    const { status, ctx } = this._processInputParams(input);
    if (ctx.parsedType !== ZodParsedType.array) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.array,
        received: ctx.parsedType
      });
      return INVALID;
    }
    if (ctx.data.length < this._def.items.length) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.too_small,
        minimum: this._def.items.length,
        inclusive: true,
        exact: false,
        type: "array"
      });
      return INVALID;
    }
    const rest = this._def.rest;
    if (!rest && ctx.data.length > this._def.items.length) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.too_big,
        maximum: this._def.items.length,
        inclusive: true,
        exact: false,
        type: "array"
      });
      status.dirty();
    }
    const items = [...ctx.data].map((item, itemIndex) => {
      const schema = this._def.items[itemIndex] || this._def.rest;
      if (!schema)
        return null;
      return schema._parse(new ParseInputLazyPath(ctx, item, ctx.path, itemIndex));
    }).filter((x) => !!x);
    if (ctx.common.async) {
      return Promise.all(items).then((results) => {
        return ParseStatus.mergeArray(status, results);
      });
    } else {
      return ParseStatus.mergeArray(status, items);
    }
  }
  get items() {
    return this._def.items;
  }
  rest(rest) {
    return new _ZodTuple({
      ...this._def,
      rest
    });
  }
};
ZodTuple.create = (schemas, params) => {
  if (!Array.isArray(schemas)) {
    throw new Error("You must pass an array of schemas to z.tuple([ ... ])");
  }
  return new ZodTuple({
    items: schemas,
    typeName: ZodFirstPartyTypeKind.ZodTuple,
    rest: null,
    ...processCreateParams(params)
  });
};
var ZodRecord = class _ZodRecord extends ZodType {
  get keySchema() {
    return this._def.keyType;
  }
  get valueSchema() {
    return this._def.valueType;
  }
  _parse(input) {
    const { status, ctx } = this._processInputParams(input);
    if (ctx.parsedType !== ZodParsedType.object) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.object,
        received: ctx.parsedType
      });
      return INVALID;
    }
    const pairs = [];
    const keyType = this._def.keyType;
    const valueType = this._def.valueType;
    for (const key in ctx.data) {
      pairs.push({
        key: keyType._parse(new ParseInputLazyPath(ctx, key, ctx.path, key)),
        value: valueType._parse(new ParseInputLazyPath(ctx, ctx.data[key], ctx.path, key)),
        alwaysSet: key in ctx.data
      });
    }
    if (ctx.common.async) {
      return ParseStatus.mergeObjectAsync(status, pairs);
    } else {
      return ParseStatus.mergeObjectSync(status, pairs);
    }
  }
  get element() {
    return this._def.valueType;
  }
  static create(first, second, third) {
    if (second instanceof ZodType) {
      return new _ZodRecord({
        keyType: first,
        valueType: second,
        typeName: ZodFirstPartyTypeKind.ZodRecord,
        ...processCreateParams(third)
      });
    }
    return new _ZodRecord({
      keyType: ZodString.create(),
      valueType: first,
      typeName: ZodFirstPartyTypeKind.ZodRecord,
      ...processCreateParams(second)
    });
  }
};
var ZodMap = class extends ZodType {
  get keySchema() {
    return this._def.keyType;
  }
  get valueSchema() {
    return this._def.valueType;
  }
  _parse(input) {
    const { status, ctx } = this._processInputParams(input);
    if (ctx.parsedType !== ZodParsedType.map) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.map,
        received: ctx.parsedType
      });
      return INVALID;
    }
    const keyType = this._def.keyType;
    const valueType = this._def.valueType;
    const pairs = [...ctx.data.entries()].map(([key, value], index) => {
      return {
        key: keyType._parse(new ParseInputLazyPath(ctx, key, ctx.path, [index, "key"])),
        value: valueType._parse(new ParseInputLazyPath(ctx, value, ctx.path, [index, "value"]))
      };
    });
    if (ctx.common.async) {
      const finalMap = /* @__PURE__ */ new Map();
      return Promise.resolve().then(async () => {
        for (const pair of pairs) {
          const key = await pair.key;
          const value = await pair.value;
          if (key.status === "aborted" || value.status === "aborted") {
            return INVALID;
          }
          if (key.status === "dirty" || value.status === "dirty") {
            status.dirty();
          }
          finalMap.set(key.value, value.value);
        }
        return { status: status.value, value: finalMap };
      });
    } else {
      const finalMap = /* @__PURE__ */ new Map();
      for (const pair of pairs) {
        const key = pair.key;
        const value = pair.value;
        if (key.status === "aborted" || value.status === "aborted") {
          return INVALID;
        }
        if (key.status === "dirty" || value.status === "dirty") {
          status.dirty();
        }
        finalMap.set(key.value, value.value);
      }
      return { status: status.value, value: finalMap };
    }
  }
};
ZodMap.create = (keyType, valueType, params) => {
  return new ZodMap({
    valueType,
    keyType,
    typeName: ZodFirstPartyTypeKind.ZodMap,
    ...processCreateParams(params)
  });
};
var ZodSet = class _ZodSet extends ZodType {
  _parse(input) {
    const { status, ctx } = this._processInputParams(input);
    if (ctx.parsedType !== ZodParsedType.set) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.set,
        received: ctx.parsedType
      });
      return INVALID;
    }
    const def = this._def;
    if (def.minSize !== null) {
      if (ctx.data.size < def.minSize.value) {
        addIssueToContext(ctx, {
          code: ZodIssueCode.too_small,
          minimum: def.minSize.value,
          type: "set",
          inclusive: true,
          exact: false,
          message: def.minSize.message
        });
        status.dirty();
      }
    }
    if (def.maxSize !== null) {
      if (ctx.data.size > def.maxSize.value) {
        addIssueToContext(ctx, {
          code: ZodIssueCode.too_big,
          maximum: def.maxSize.value,
          type: "set",
          inclusive: true,
          exact: false,
          message: def.maxSize.message
        });
        status.dirty();
      }
    }
    const valueType = this._def.valueType;
    function finalizeSet(elements2) {
      const parsedSet = /* @__PURE__ */ new Set();
      for (const element of elements2) {
        if (element.status === "aborted")
          return INVALID;
        if (element.status === "dirty")
          status.dirty();
        parsedSet.add(element.value);
      }
      return { status: status.value, value: parsedSet };
    }
    const elements = [...ctx.data.values()].map((item, i) => valueType._parse(new ParseInputLazyPath(ctx, item, ctx.path, i)));
    if (ctx.common.async) {
      return Promise.all(elements).then((elements2) => finalizeSet(elements2));
    } else {
      return finalizeSet(elements);
    }
  }
  min(minSize, message) {
    return new _ZodSet({
      ...this._def,
      minSize: { value: minSize, message: errorUtil.toString(message) }
    });
  }
  max(maxSize, message) {
    return new _ZodSet({
      ...this._def,
      maxSize: { value: maxSize, message: errorUtil.toString(message) }
    });
  }
  size(size, message) {
    return this.min(size, message).max(size, message);
  }
  nonempty(message) {
    return this.min(1, message);
  }
};
ZodSet.create = (valueType, params) => {
  return new ZodSet({
    valueType,
    minSize: null,
    maxSize: null,
    typeName: ZodFirstPartyTypeKind.ZodSet,
    ...processCreateParams(params)
  });
};
var ZodFunction = class _ZodFunction extends ZodType {
  constructor() {
    super(...arguments);
    this.validate = this.implement;
  }
  _parse(input) {
    const { ctx } = this._processInputParams(input);
    if (ctx.parsedType !== ZodParsedType.function) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.function,
        received: ctx.parsedType
      });
      return INVALID;
    }
    function makeArgsIssue(args, error) {
      return makeIssue({
        data: args,
        path: ctx.path,
        errorMaps: [
          ctx.common.contextualErrorMap,
          ctx.schemaErrorMap,
          getErrorMap(),
          errorMap
        ].filter((x) => !!x),
        issueData: {
          code: ZodIssueCode.invalid_arguments,
          argumentsError: error
        }
      });
    }
    function makeReturnsIssue(returns, error) {
      return makeIssue({
        data: returns,
        path: ctx.path,
        errorMaps: [
          ctx.common.contextualErrorMap,
          ctx.schemaErrorMap,
          getErrorMap(),
          errorMap
        ].filter((x) => !!x),
        issueData: {
          code: ZodIssueCode.invalid_return_type,
          returnTypeError: error
        }
      });
    }
    const params = { errorMap: ctx.common.contextualErrorMap };
    const fn = ctx.data;
    if (this._def.returns instanceof ZodPromise) {
      const me = this;
      return OK(async function(...args) {
        const error = new ZodError([]);
        const parsedArgs = await me._def.args.parseAsync(args, params).catch((e) => {
          error.addIssue(makeArgsIssue(args, e));
          throw error;
        });
        const result = await Reflect.apply(fn, this, parsedArgs);
        const parsedReturns = await me._def.returns._def.type.parseAsync(result, params).catch((e) => {
          error.addIssue(makeReturnsIssue(result, e));
          throw error;
        });
        return parsedReturns;
      });
    } else {
      const me = this;
      return OK(function(...args) {
        const parsedArgs = me._def.args.safeParse(args, params);
        if (!parsedArgs.success) {
          throw new ZodError([makeArgsIssue(args, parsedArgs.error)]);
        }
        const result = Reflect.apply(fn, this, parsedArgs.data);
        const parsedReturns = me._def.returns.safeParse(result, params);
        if (!parsedReturns.success) {
          throw new ZodError([makeReturnsIssue(result, parsedReturns.error)]);
        }
        return parsedReturns.data;
      });
    }
  }
  parameters() {
    return this._def.args;
  }
  returnType() {
    return this._def.returns;
  }
  args(...items) {
    return new _ZodFunction({
      ...this._def,
      args: ZodTuple.create(items).rest(ZodUnknown.create())
    });
  }
  returns(returnType) {
    return new _ZodFunction({
      ...this._def,
      returns: returnType
    });
  }
  implement(func) {
    const validatedFunc = this.parse(func);
    return validatedFunc;
  }
  strictImplement(func) {
    const validatedFunc = this.parse(func);
    return validatedFunc;
  }
  static create(args, returns, params) {
    return new _ZodFunction({
      args: args ? args : ZodTuple.create([]).rest(ZodUnknown.create()),
      returns: returns || ZodUnknown.create(),
      typeName: ZodFirstPartyTypeKind.ZodFunction,
      ...processCreateParams(params)
    });
  }
};
var ZodLazy = class extends ZodType {
  get schema() {
    return this._def.getter();
  }
  _parse(input) {
    const { ctx } = this._processInputParams(input);
    const lazySchema = this._def.getter();
    return lazySchema._parse({ data: ctx.data, path: ctx.path, parent: ctx });
  }
};
ZodLazy.create = (getter, params) => {
  return new ZodLazy({
    getter,
    typeName: ZodFirstPartyTypeKind.ZodLazy,
    ...processCreateParams(params)
  });
};
var ZodLiteral = class extends ZodType {
  _parse(input) {
    if (input.data !== this._def.value) {
      const ctx = this._getOrReturnCtx(input);
      addIssueToContext(ctx, {
        received: ctx.data,
        code: ZodIssueCode.invalid_literal,
        expected: this._def.value
      });
      return INVALID;
    }
    return { status: "valid", value: input.data };
  }
  get value() {
    return this._def.value;
  }
};
ZodLiteral.create = (value, params) => {
  return new ZodLiteral({
    value,
    typeName: ZodFirstPartyTypeKind.ZodLiteral,
    ...processCreateParams(params)
  });
};
function createZodEnum(values, params) {
  return new ZodEnum({
    values,
    typeName: ZodFirstPartyTypeKind.ZodEnum,
    ...processCreateParams(params)
  });
}
var ZodEnum = class _ZodEnum extends ZodType {
  constructor() {
    super(...arguments);
    _ZodEnum_cache.set(this, void 0);
  }
  _parse(input) {
    if (typeof input.data !== "string") {
      const ctx = this._getOrReturnCtx(input);
      const expectedValues = this._def.values;
      addIssueToContext(ctx, {
        expected: util.joinValues(expectedValues),
        received: ctx.parsedType,
        code: ZodIssueCode.invalid_type
      });
      return INVALID;
    }
    if (!__classPrivateFieldGet(this, _ZodEnum_cache, "f")) {
      __classPrivateFieldSet(this, _ZodEnum_cache, new Set(this._def.values), "f");
    }
    if (!__classPrivateFieldGet(this, _ZodEnum_cache, "f").has(input.data)) {
      const ctx = this._getOrReturnCtx(input);
      const expectedValues = this._def.values;
      addIssueToContext(ctx, {
        received: ctx.data,
        code: ZodIssueCode.invalid_enum_value,
        options: expectedValues
      });
      return INVALID;
    }
    return OK(input.data);
  }
  get options() {
    return this._def.values;
  }
  get enum() {
    const enumValues = {};
    for (const val of this._def.values) {
      enumValues[val] = val;
    }
    return enumValues;
  }
  get Values() {
    const enumValues = {};
    for (const val of this._def.values) {
      enumValues[val] = val;
    }
    return enumValues;
  }
  get Enum() {
    const enumValues = {};
    for (const val of this._def.values) {
      enumValues[val] = val;
    }
    return enumValues;
  }
  extract(values, newDef = this._def) {
    return _ZodEnum.create(values, {
      ...this._def,
      ...newDef
    });
  }
  exclude(values, newDef = this._def) {
    return _ZodEnum.create(this.options.filter((opt) => !values.includes(opt)), {
      ...this._def,
      ...newDef
    });
  }
};
_ZodEnum_cache = /* @__PURE__ */ new WeakMap();
ZodEnum.create = createZodEnum;
var ZodNativeEnum = class extends ZodType {
  constructor() {
    super(...arguments);
    _ZodNativeEnum_cache.set(this, void 0);
  }
  _parse(input) {
    const nativeEnumValues = util.getValidEnumValues(this._def.values);
    const ctx = this._getOrReturnCtx(input);
    if (ctx.parsedType !== ZodParsedType.string && ctx.parsedType !== ZodParsedType.number) {
      const expectedValues = util.objectValues(nativeEnumValues);
      addIssueToContext(ctx, {
        expected: util.joinValues(expectedValues),
        received: ctx.parsedType,
        code: ZodIssueCode.invalid_type
      });
      return INVALID;
    }
    if (!__classPrivateFieldGet(this, _ZodNativeEnum_cache, "f")) {
      __classPrivateFieldSet(this, _ZodNativeEnum_cache, new Set(util.getValidEnumValues(this._def.values)), "f");
    }
    if (!__classPrivateFieldGet(this, _ZodNativeEnum_cache, "f").has(input.data)) {
      const expectedValues = util.objectValues(nativeEnumValues);
      addIssueToContext(ctx, {
        received: ctx.data,
        code: ZodIssueCode.invalid_enum_value,
        options: expectedValues
      });
      return INVALID;
    }
    return OK(input.data);
  }
  get enum() {
    return this._def.values;
  }
};
_ZodNativeEnum_cache = /* @__PURE__ */ new WeakMap();
ZodNativeEnum.create = (values, params) => {
  return new ZodNativeEnum({
    values,
    typeName: ZodFirstPartyTypeKind.ZodNativeEnum,
    ...processCreateParams(params)
  });
};
var ZodPromise = class extends ZodType {
  unwrap() {
    return this._def.type;
  }
  _parse(input) {
    const { ctx } = this._processInputParams(input);
    if (ctx.parsedType !== ZodParsedType.promise && ctx.common.async === false) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.promise,
        received: ctx.parsedType
      });
      return INVALID;
    }
    const promisified = ctx.parsedType === ZodParsedType.promise ? ctx.data : Promise.resolve(ctx.data);
    return OK(promisified.then((data) => {
      return this._def.type.parseAsync(data, {
        path: ctx.path,
        errorMap: ctx.common.contextualErrorMap
      });
    }));
  }
};
ZodPromise.create = (schema, params) => {
  return new ZodPromise({
    type: schema,
    typeName: ZodFirstPartyTypeKind.ZodPromise,
    ...processCreateParams(params)
  });
};
var ZodEffects = class extends ZodType {
  innerType() {
    return this._def.schema;
  }
  sourceType() {
    return this._def.schema._def.typeName === ZodFirstPartyTypeKind.ZodEffects ? this._def.schema.sourceType() : this._def.schema;
  }
  _parse(input) {
    const { status, ctx } = this._processInputParams(input);
    const effect = this._def.effect || null;
    const checkCtx = {
      addIssue: (arg) => {
        addIssueToContext(ctx, arg);
        if (arg.fatal) {
          status.abort();
        } else {
          status.dirty();
        }
      },
      get path() {
        return ctx.path;
      }
    };
    checkCtx.addIssue = checkCtx.addIssue.bind(checkCtx);
    if (effect.type === "preprocess") {
      const processed = effect.transform(ctx.data, checkCtx);
      if (ctx.common.async) {
        return Promise.resolve(processed).then(async (processed2) => {
          if (status.value === "aborted")
            return INVALID;
          const result = await this._def.schema._parseAsync({
            data: processed2,
            path: ctx.path,
            parent: ctx
          });
          if (result.status === "aborted")
            return INVALID;
          if (result.status === "dirty")
            return DIRTY(result.value);
          if (status.value === "dirty")
            return DIRTY(result.value);
          return result;
        });
      } else {
        if (status.value === "aborted")
          return INVALID;
        const result = this._def.schema._parseSync({
          data: processed,
          path: ctx.path,
          parent: ctx
        });
        if (result.status === "aborted")
          return INVALID;
        if (result.status === "dirty")
          return DIRTY(result.value);
        if (status.value === "dirty")
          return DIRTY(result.value);
        return result;
      }
    }
    if (effect.type === "refinement") {
      const executeRefinement = (acc) => {
        const result = effect.refinement(acc, checkCtx);
        if (ctx.common.async) {
          return Promise.resolve(result);
        }
        if (result instanceof Promise) {
          throw new Error("Async refinement encountered during synchronous parse operation. Use .parseAsync instead.");
        }
        return acc;
      };
      if (ctx.common.async === false) {
        const inner = this._def.schema._parseSync({
          data: ctx.data,
          path: ctx.path,
          parent: ctx
        });
        if (inner.status === "aborted")
          return INVALID;
        if (inner.status === "dirty")
          status.dirty();
        executeRefinement(inner.value);
        return { status: status.value, value: inner.value };
      } else {
        return this._def.schema._parseAsync({ data: ctx.data, path: ctx.path, parent: ctx }).then((inner) => {
          if (inner.status === "aborted")
            return INVALID;
          if (inner.status === "dirty")
            status.dirty();
          return executeRefinement(inner.value).then(() => {
            return { status: status.value, value: inner.value };
          });
        });
      }
    }
    if (effect.type === "transform") {
      if (ctx.common.async === false) {
        const base = this._def.schema._parseSync({
          data: ctx.data,
          path: ctx.path,
          parent: ctx
        });
        if (!isValid(base))
          return base;
        const result = effect.transform(base.value, checkCtx);
        if (result instanceof Promise) {
          throw new Error(`Asynchronous transform encountered during synchronous parse operation. Use .parseAsync instead.`);
        }
        return { status: status.value, value: result };
      } else {
        return this._def.schema._parseAsync({ data: ctx.data, path: ctx.path, parent: ctx }).then((base) => {
          if (!isValid(base))
            return base;
          return Promise.resolve(effect.transform(base.value, checkCtx)).then((result) => ({ status: status.value, value: result }));
        });
      }
    }
    util.assertNever(effect);
  }
};
ZodEffects.create = (schema, effect, params) => {
  return new ZodEffects({
    schema,
    typeName: ZodFirstPartyTypeKind.ZodEffects,
    effect,
    ...processCreateParams(params)
  });
};
ZodEffects.createWithPreprocess = (preprocess, schema, params) => {
  return new ZodEffects({
    schema,
    effect: { type: "preprocess", transform: preprocess },
    typeName: ZodFirstPartyTypeKind.ZodEffects,
    ...processCreateParams(params)
  });
};
var ZodOptional = class extends ZodType {
  _parse(input) {
    const parsedType = this._getType(input);
    if (parsedType === ZodParsedType.undefined) {
      return OK(void 0);
    }
    return this._def.innerType._parse(input);
  }
  unwrap() {
    return this._def.innerType;
  }
};
ZodOptional.create = (type, params) => {
  return new ZodOptional({
    innerType: type,
    typeName: ZodFirstPartyTypeKind.ZodOptional,
    ...processCreateParams(params)
  });
};
var ZodNullable = class extends ZodType {
  _parse(input) {
    const parsedType = this._getType(input);
    if (parsedType === ZodParsedType.null) {
      return OK(null);
    }
    return this._def.innerType._parse(input);
  }
  unwrap() {
    return this._def.innerType;
  }
};
ZodNullable.create = (type, params) => {
  return new ZodNullable({
    innerType: type,
    typeName: ZodFirstPartyTypeKind.ZodNullable,
    ...processCreateParams(params)
  });
};
var ZodDefault = class extends ZodType {
  _parse(input) {
    const { ctx } = this._processInputParams(input);
    let data = ctx.data;
    if (ctx.parsedType === ZodParsedType.undefined) {
      data = this._def.defaultValue();
    }
    return this._def.innerType._parse({
      data,
      path: ctx.path,
      parent: ctx
    });
  }
  removeDefault() {
    return this._def.innerType;
  }
};
ZodDefault.create = (type, params) => {
  return new ZodDefault({
    innerType: type,
    typeName: ZodFirstPartyTypeKind.ZodDefault,
    defaultValue: typeof params.default === "function" ? params.default : () => params.default,
    ...processCreateParams(params)
  });
};
var ZodCatch = class extends ZodType {
  _parse(input) {
    const { ctx } = this._processInputParams(input);
    const newCtx = {
      ...ctx,
      common: {
        ...ctx.common,
        issues: []
      }
    };
    const result = this._def.innerType._parse({
      data: newCtx.data,
      path: newCtx.path,
      parent: {
        ...newCtx
      }
    });
    if (isAsync(result)) {
      return result.then((result2) => {
        return {
          status: "valid",
          value: result2.status === "valid" ? result2.value : this._def.catchValue({
            get error() {
              return new ZodError(newCtx.common.issues);
            },
            input: newCtx.data
          })
        };
      });
    } else {
      return {
        status: "valid",
        value: result.status === "valid" ? result.value : this._def.catchValue({
          get error() {
            return new ZodError(newCtx.common.issues);
          },
          input: newCtx.data
        })
      };
    }
  }
  removeCatch() {
    return this._def.innerType;
  }
};
ZodCatch.create = (type, params) => {
  return new ZodCatch({
    innerType: type,
    typeName: ZodFirstPartyTypeKind.ZodCatch,
    catchValue: typeof params.catch === "function" ? params.catch : () => params.catch,
    ...processCreateParams(params)
  });
};
var ZodNaN = class extends ZodType {
  _parse(input) {
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.nan) {
      const ctx = this._getOrReturnCtx(input);
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.nan,
        received: ctx.parsedType
      });
      return INVALID;
    }
    return { status: "valid", value: input.data };
  }
};
ZodNaN.create = (params) => {
  return new ZodNaN({
    typeName: ZodFirstPartyTypeKind.ZodNaN,
    ...processCreateParams(params)
  });
};
var BRAND = Symbol("zod_brand");
var ZodBranded = class extends ZodType {
  _parse(input) {
    const { ctx } = this._processInputParams(input);
    const data = ctx.data;
    return this._def.type._parse({
      data,
      path: ctx.path,
      parent: ctx
    });
  }
  unwrap() {
    return this._def.type;
  }
};
var ZodPipeline = class _ZodPipeline extends ZodType {
  _parse(input) {
    const { status, ctx } = this._processInputParams(input);
    if (ctx.common.async) {
      const handleAsync = async () => {
        const inResult = await this._def.in._parseAsync({
          data: ctx.data,
          path: ctx.path,
          parent: ctx
        });
        if (inResult.status === "aborted")
          return INVALID;
        if (inResult.status === "dirty") {
          status.dirty();
          return DIRTY(inResult.value);
        } else {
          return this._def.out._parseAsync({
            data: inResult.value,
            path: ctx.path,
            parent: ctx
          });
        }
      };
      return handleAsync();
    } else {
      const inResult = this._def.in._parseSync({
        data: ctx.data,
        path: ctx.path,
        parent: ctx
      });
      if (inResult.status === "aborted")
        return INVALID;
      if (inResult.status === "dirty") {
        status.dirty();
        return {
          status: "dirty",
          value: inResult.value
        };
      } else {
        return this._def.out._parseSync({
          data: inResult.value,
          path: ctx.path,
          parent: ctx
        });
      }
    }
  }
  static create(a, b) {
    return new _ZodPipeline({
      in: a,
      out: b,
      typeName: ZodFirstPartyTypeKind.ZodPipeline
    });
  }
};
var ZodReadonly = class extends ZodType {
  _parse(input) {
    const result = this._def.innerType._parse(input);
    const freeze = (data) => {
      if (isValid(data)) {
        data.value = Object.freeze(data.value);
      }
      return data;
    };
    return isAsync(result) ? result.then((data) => freeze(data)) : freeze(result);
  }
  unwrap() {
    return this._def.innerType;
  }
};
ZodReadonly.create = (type, params) => {
  return new ZodReadonly({
    innerType: type,
    typeName: ZodFirstPartyTypeKind.ZodReadonly,
    ...processCreateParams(params)
  });
};
function cleanParams(params, data) {
  const p = typeof params === "function" ? params(data) : typeof params === "string" ? { message: params } : params;
  const p2 = typeof p === "string" ? { message: p } : p;
  return p2;
}
function custom(check, _params = {}, fatal) {
  if (check)
    return ZodAny.create().superRefine((data, ctx) => {
      var _a, _b;
      const r = check(data);
      if (r instanceof Promise) {
        return r.then((r2) => {
          var _a2, _b2;
          if (!r2) {
            const params = cleanParams(_params, data);
            const _fatal = (_b2 = (_a2 = params.fatal) !== null && _a2 !== void 0 ? _a2 : fatal) !== null && _b2 !== void 0 ? _b2 : true;
            ctx.addIssue({ code: "custom", ...params, fatal: _fatal });
          }
        });
      }
      if (!r) {
        const params = cleanParams(_params, data);
        const _fatal = (_b = (_a = params.fatal) !== null && _a !== void 0 ? _a : fatal) !== null && _b !== void 0 ? _b : true;
        ctx.addIssue({ code: "custom", ...params, fatal: _fatal });
      }
      return;
    });
  return ZodAny.create();
}
var late = {
  object: ZodObject.lazycreate
};
var ZodFirstPartyTypeKind;
(function(ZodFirstPartyTypeKind2) {
  ZodFirstPartyTypeKind2["ZodString"] = "ZodString";
  ZodFirstPartyTypeKind2["ZodNumber"] = "ZodNumber";
  ZodFirstPartyTypeKind2["ZodNaN"] = "ZodNaN";
  ZodFirstPartyTypeKind2["ZodBigInt"] = "ZodBigInt";
  ZodFirstPartyTypeKind2["ZodBoolean"] = "ZodBoolean";
  ZodFirstPartyTypeKind2["ZodDate"] = "ZodDate";
  ZodFirstPartyTypeKind2["ZodSymbol"] = "ZodSymbol";
  ZodFirstPartyTypeKind2["ZodUndefined"] = "ZodUndefined";
  ZodFirstPartyTypeKind2["ZodNull"] = "ZodNull";
  ZodFirstPartyTypeKind2["ZodAny"] = "ZodAny";
  ZodFirstPartyTypeKind2["ZodUnknown"] = "ZodUnknown";
  ZodFirstPartyTypeKind2["ZodNever"] = "ZodNever";
  ZodFirstPartyTypeKind2["ZodVoid"] = "ZodVoid";
  ZodFirstPartyTypeKind2["ZodArray"] = "ZodArray";
  ZodFirstPartyTypeKind2["ZodObject"] = "ZodObject";
  ZodFirstPartyTypeKind2["ZodUnion"] = "ZodUnion";
  ZodFirstPartyTypeKind2["ZodDiscriminatedUnion"] = "ZodDiscriminatedUnion";
  ZodFirstPartyTypeKind2["ZodIntersection"] = "ZodIntersection";
  ZodFirstPartyTypeKind2["ZodTuple"] = "ZodTuple";
  ZodFirstPartyTypeKind2["ZodRecord"] = "ZodRecord";
  ZodFirstPartyTypeKind2["ZodMap"] = "ZodMap";
  ZodFirstPartyTypeKind2["ZodSet"] = "ZodSet";
  ZodFirstPartyTypeKind2["ZodFunction"] = "ZodFunction";
  ZodFirstPartyTypeKind2["ZodLazy"] = "ZodLazy";
  ZodFirstPartyTypeKind2["ZodLiteral"] = "ZodLiteral";
  ZodFirstPartyTypeKind2["ZodEnum"] = "ZodEnum";
  ZodFirstPartyTypeKind2["ZodEffects"] = "ZodEffects";
  ZodFirstPartyTypeKind2["ZodNativeEnum"] = "ZodNativeEnum";
  ZodFirstPartyTypeKind2["ZodOptional"] = "ZodOptional";
  ZodFirstPartyTypeKind2["ZodNullable"] = "ZodNullable";
  ZodFirstPartyTypeKind2["ZodDefault"] = "ZodDefault";
  ZodFirstPartyTypeKind2["ZodCatch"] = "ZodCatch";
  ZodFirstPartyTypeKind2["ZodPromise"] = "ZodPromise";
  ZodFirstPartyTypeKind2["ZodBranded"] = "ZodBranded";
  ZodFirstPartyTypeKind2["ZodPipeline"] = "ZodPipeline";
  ZodFirstPartyTypeKind2["ZodReadonly"] = "ZodReadonly";
})(ZodFirstPartyTypeKind || (ZodFirstPartyTypeKind = {}));
var instanceOfType = (cls, params = {
  message: `Input not instance of ${cls.name}`
}) => custom((data) => data instanceof cls, params);
var stringType = ZodString.create;
var numberType = ZodNumber.create;
var nanType = ZodNaN.create;
var bigIntType = ZodBigInt.create;
var booleanType = ZodBoolean.create;
var dateType = ZodDate.create;
var symbolType = ZodSymbol.create;
var undefinedType = ZodUndefined.create;
var nullType = ZodNull.create;
var anyType = ZodAny.create;
var unknownType = ZodUnknown.create;
var neverType = ZodNever.create;
var voidType = ZodVoid.create;
var arrayType = ZodArray.create;
var objectType = ZodObject.create;
var strictObjectType = ZodObject.strictCreate;
var unionType = ZodUnion.create;
var discriminatedUnionType = ZodDiscriminatedUnion.create;
var intersectionType = ZodIntersection.create;
var tupleType = ZodTuple.create;
var recordType = ZodRecord.create;
var mapType = ZodMap.create;
var setType = ZodSet.create;
var functionType = ZodFunction.create;
var lazyType = ZodLazy.create;
var literalType = ZodLiteral.create;
var enumType = ZodEnum.create;
var nativeEnumType = ZodNativeEnum.create;
var promiseType = ZodPromise.create;
var effectsType = ZodEffects.create;
var optionalType = ZodOptional.create;
var nullableType = ZodNullable.create;
var preprocessType = ZodEffects.createWithPreprocess;
var pipelineType = ZodPipeline.create;
var ostring = () => stringType().optional();
var onumber = () => numberType().optional();
var oboolean = () => booleanType().optional();
var coerce = {
  string: (arg) => ZodString.create({ ...arg, coerce: true }),
  number: (arg) => ZodNumber.create({ ...arg, coerce: true }),
  boolean: (arg) => ZodBoolean.create({
    ...arg,
    coerce: true
  }),
  bigint: (arg) => ZodBigInt.create({ ...arg, coerce: true }),
  date: (arg) => ZodDate.create({ ...arg, coerce: true })
};
var NEVER = INVALID;
var z = /* @__PURE__ */ Object.freeze({
  __proto__: null,
  defaultErrorMap: errorMap,
  setErrorMap,
  getErrorMap,
  makeIssue,
  EMPTY_PATH,
  addIssueToContext,
  ParseStatus,
  INVALID,
  DIRTY,
  OK,
  isAborted,
  isDirty,
  isValid,
  isAsync,
  get util() {
    return util;
  },
  get objectUtil() {
    return objectUtil;
  },
  ZodParsedType,
  getParsedType,
  ZodType,
  datetimeRegex,
  ZodString,
  ZodNumber,
  ZodBigInt,
  ZodBoolean,
  ZodDate,
  ZodSymbol,
  ZodUndefined,
  ZodNull,
  ZodAny,
  ZodUnknown,
  ZodNever,
  ZodVoid,
  ZodArray,
  ZodObject,
  ZodUnion,
  ZodDiscriminatedUnion,
  ZodIntersection,
  ZodTuple,
  ZodRecord,
  ZodMap,
  ZodSet,
  ZodFunction,
  ZodLazy,
  ZodLiteral,
  ZodEnum,
  ZodNativeEnum,
  ZodPromise,
  ZodEffects,
  ZodTransformer: ZodEffects,
  ZodOptional,
  ZodNullable,
  ZodDefault,
  ZodCatch,
  ZodNaN,
  BRAND,
  ZodBranded,
  ZodPipeline,
  ZodReadonly,
  custom,
  Schema: ZodType,
  ZodSchema: ZodType,
  late,
  get ZodFirstPartyTypeKind() {
    return ZodFirstPartyTypeKind;
  },
  coerce,
  any: anyType,
  array: arrayType,
  bigint: bigIntType,
  boolean: booleanType,
  date: dateType,
  discriminatedUnion: discriminatedUnionType,
  effect: effectsType,
  "enum": enumType,
  "function": functionType,
  "instanceof": instanceOfType,
  intersection: intersectionType,
  lazy: lazyType,
  literal: literalType,
  map: mapType,
  nan: nanType,
  nativeEnum: nativeEnumType,
  never: neverType,
  "null": nullType,
  nullable: nullableType,
  number: numberType,
  object: objectType,
  oboolean,
  onumber,
  optional: optionalType,
  ostring,
  pipeline: pipelineType,
  preprocess: preprocessType,
  promise: promiseType,
  record: recordType,
  set: setType,
  strictObject: strictObjectType,
  string: stringType,
  symbol: symbolType,
  transformer: effectsType,
  tuple: tupleType,
  "undefined": undefinedType,
  union: unionType,
  unknown: unknownType,
  "void": voidType,
  NEVER,
  ZodIssueCode,
  quotelessJson,
  ZodError
});
var SeveritySchema = z.enum(["info", "warning", "critical"]);
var EvidenceSchema = z.object({
  id: z.string().min(1),
  source: z.string().min(1),
  label: z.string().min(1),
  value: z.union([z.string(), z.number(), z.boolean(), z.null()]),
  observedAt: z.string().datetime().nullable(),
  url: z.string().url().nullable()
});
var UnavailableSchema = z.object({
  id: z.string().min(1),
  source: z.string().min(1),
  reason: z.string().min(1)
});
var FindingSchema = z.object({
  id: z.string().min(1),
  ruleId: z.string().min(1),
  title: z.string().min(1),
  severity: SeveritySchema,
  weight: z.number().int().min(0).max(100),
  explanation: z.string().min(1),
  evidenceIds: z.array(z.string().min(1)),
  suggestedAction: z.string().min(1)
});
var HealthScoreSchema = z.object({
  score: z.number().int().min(0).max(100),
  band: z.enum(["healthy", "at-risk", "critical"]),
  breakdown: z.object({
    info: z.number().int().min(0),
    warning: z.number().int().min(0),
    critical: z.number().int().min(0)
  })
});
var UnscoredSchema = z.object({
  score: z.null(),
  band: z.literal("unknown"),
  breakdown: HealthScoreSchema.shape.breakdown
});
var RevivalStepSchema = z.object({
  priority: z.number().int().min(1),
  findingId: z.string().min(1),
  action: z.string().min(1)
});
var RevivalPlanSchema = z.object({
  steps: z.array(RevivalStepSchema)
});
var ReportSchema = z.object({
  subject: z.string().min(1),
  kind: z.string().min(1),
  generatedAt: z.string().datetime(),
  evidence: z.array(EvidenceSchema),
  unavailable: z.array(UnavailableSchema),
  findings: z.array(FindingSchema),
  score: z.union([HealthScoreSchema, UnscoredSchema]),
  plan: RevivalPlanSchema
});
var AdapterResultSchema = z.object({
  subject: z.string().min(1),
  kind: z.string().min(1),
  evidence: z.array(EvidenceSchema),
  unavailable: z.array(UnavailableSchema)
});
function runRules(rules, evidence) {
  const findings = [];
  for (const rule of rules) {
    const hit = rule.evaluate(evidence);
    if (!hit) continue;
    findings.push({
      id: `${rule.id}:${[...hit.evidenceIds].sort().join(",")}`,
      ruleId: rule.id,
      title: rule.title,
      severity: rule.severity,
      weight: rule.weight,
      explanation: hit.explanation,
      evidenceIds: [...hit.evidenceIds].sort(),
      suggestedAction: rule.suggestedAction
    });
  }
  return findings.sort((a, b) => a.id.localeCompare(b.id));
}
function findEvidence(evidence, label) {
  return evidence.find((e) => e.label === label);
}
var SEVERITY_PENALTY = { info: 3, warning: 12, critical: 30 };
function scoreFindings(findings) {
  const breakdown = { info: 0, warning: 0, critical: 0 };
  let penalty = 0;
  const ordered = [...findings].sort(
    (a, b) => a.id.localeCompare(b.id) || a.weight - b.weight || a.severity.localeCompare(b.severity)
  );
  for (const f of ordered) {
    breakdown[f.severity] += 1;
    const scale = 0.5 + f.weight / 100;
    penalty += SEVERITY_PENALTY[f.severity] * scale;
  }
  const score = Math.max(0, Math.min(100, Math.round(100 - penalty)));
  const band = score >= 75 ? "healthy" : score >= 40 ? "at-risk" : "critical";
  return { score, band, breakdown };
}
var RANK = { critical: 0, warning: 1, info: 2 };
function buildRevivalPlan(findings) {
  const ordered = [...findings].sort(
    (a, b) => RANK[a.severity] - RANK[b.severity] || b.weight - a.weight || a.id.localeCompare(b.id)
  );
  return {
    steps: ordered.map((f, i) => ({
      priority: i + 1,
      findingId: f.id,
      action: f.suggestedAction
    }))
  };
}
function unscored() {
  return { score: null, band: "unknown", breakdown: { info: 0, warning: 0, critical: 0 } };
}
function buildReport(input, options) {
  const findings = runRules(options.rules, input.evidence);
  const report = {
    subject: input.subject,
    kind: input.kind,
    generatedAt: options.generatedAt,
    evidence: input.evidence,
    unavailable: input.unavailable,
    findings,
    score: input.evidence.length === 0 ? unscored() : scoreFindings(findings),
    plan: buildRevivalPlan(findings)
  };
  return ReportSchema.parse(report);
}
function toMarkdown(report) {
  const lines = [];
  lines.push(`# ${report.subject}`, "", `Kind: ${report.kind}`, report.score.score === null ? "Score: unavailable (no evidence could be collected)" : `Score: ${report.score.score}/100 (${report.score.band})`, "");
  lines.push("## Findings");
  if (report.findings.length === 0) lines.push("- None");
  for (const f of report.findings) lines.push(`- [${f.severity}] ${f.title}: ${f.explanation}`);
  lines.push("", "## Unavailable evidence");
  if (report.unavailable.length === 0) lines.push("- None");
  for (const u of report.unavailable) lines.push(`- ${u.source}: ${u.reason}`);
  lines.push("", "## Revival plan");
  if (report.plan.steps.length === 0) lines.push(report.score.score === null ? "- No plan: fix the unavailable evidence first" : "- No action needed");
  for (const s of report.plan.steps) lines.push(`${s.priority}. ${s.action}`);
  return lines.join("\n") + "\n";
}
var DEFAULT_TIMEOUT_MS = 8e3;
async function fetchJson(url, options = {}) {
  const doFetch = options.fetch ?? globalThis.fetch;
  if (!doFetch) return { ok: false, status: null, reason: "No fetch implementation is available." };
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), options.timeoutMs ?? DEFAULT_TIMEOUT_MS);
  try {
    const res = await doFetch(url, { headers: { Accept: "application/json", ...options.headers }, signal: controller.signal });
    if (!res.ok) return { ok: false, status: res.status, reason: describeStatus(res.status, res.headers) };
    return { ok: true, status: res.status, body: await res.json() };
  } catch (error) {
    const aborted = controller.signal.aborted;
    const message = error instanceof Error ? error.message : String(error);
    return { ok: false, status: null, reason: aborted ? "Request timed out." : `Network error: ${message}` };
  } finally {
    clearTimeout(timer);
  }
}
function describeStatus(status, headers) {
  const remaining = headers.get("x-ratelimit-remaining");
  if (status === 429 || status === 403 && remaining === "0") {
    const reset = Number(headers.get("x-ratelimit-reset"));
    const when = Number.isFinite(reset) && reset > 0 ? ` until ${new Date(reset * 1e3).toISOString().slice(11, 16)} UTC` : "";
    return `Rate limit reached${when}. Use a recorded fixture or try later.`;
  }
  if (status === 404) return "Not found (HTTP 404).";
  return `Request failed with HTTP ${status}.`;
}
function unavailableFrom(id, source, result) {
  return { id, source, reason: result.reason };
}
var SnapshotSchema = z.object({
  daysSinceLastPublish: z.number().int().min(0),
  daysSinceLastCommit: z.number().int().min(0).nullable(),
  deprecated: z.boolean(),
  repositoryArchived: z.boolean(),
  maintainerCount: z.number().int().min(0),
  weeklyDownloads: z.number().int().min(0),
  observedAt: z.string().datetime().nullable()
});
var ManifestSchema = z.object({
  name: z.string().min(1),
  version: z.string().min(1),
  dependencies: z.record(z.string()).default({}),
  devDependencies: z.record(z.string()).default({}),
  snapshot: SnapshotSchema
});
var SOURCE = "registry-snapshot";
var KIND = "npm-package";
function adaptPackageManifest(input) {
  const parsed = ManifestSchema.safeParse(input);
  if (!parsed.success) {
    const name = typeof input === "object" && input !== null ? input.name : void 0;
    return {
      subject: typeof name === "string" && name.length > 0 ? name : "unknown-package",
      kind: KIND,
      evidence: [],
      unavailable: [
        {
          id: "manifest",
          source: "package.json",
          reason: parsed.error.issues.map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`).join("; ")
        }
      ]
    };
  }
  const m = parsed.data;
  const observedAt = m.snapshot.observedAt;
  const fact = (label, value, observed = null) => ({
    id: `snapshot:${label}`,
    source: SOURCE,
    label,
    value,
    observedAt: observed,
    url: null
  });
  const declared = [
    ...Object.entries(m.dependencies).map(([name, range]) => ({ section: "dependencies", name, range })),
    ...Object.entries(m.devDependencies).map(([name, range]) => ({ section: "devDependencies", name, range }))
  ];
  const evidence = [
    {
      id: "manifest:dependency-count",
      source: "package.json",
      label: "dependency-count",
      value: declared.length,
      observedAt: null,
      url: null
    },
    ...declared.map(
      (d) => ({
        id: `declared:${d.section}:${d.name}`,
        source: "package.json",
        label: "declared-range",
        value: `${d.name}@${d.range}`,
        observedAt: null,
        url: null
      })
    ),
    fact("days-since-last-publish", m.snapshot.daysSinceLastPublish, observedAt),
    fact("days-since-last-commit", m.snapshot.daysSinceLastCommit, observedAt),
    fact("deprecated", m.snapshot.deprecated, observedAt),
    fact("repository-archived", m.snapshot.repositoryArchived, observedAt),
    fact("maintainer-count", m.snapshot.maintainerCount, observedAt),
    fact("weekly-downloads", m.snapshot.weeklyDownloads, observedAt)
  ];
  return { subject: m.name, kind: KIND, evidence, unavailable: [] };
}
var DAY_MS = 864e5;
var KIND2 = "npm-package";
var RegistryDocSchema = z.object({
  name: z.string().min(1),
  "dist-tags": z.object({ latest: z.string().min(1) }),
  time: z.record(z.string()),
  maintainers: z.array(z.unknown()).default([]),
  repository: z.union([z.string(), z.object({ url: z.string() })]).optional(),
  versions: z.record(
    z.object({
      deprecated: z.union([z.string(), z.boolean()]).optional(),
      dependencies: z.record(z.string()).optional()
    })
  )
});
var DownloadsSchema = z.object({ downloads: z.number().int().min(0) });
var GithubRepoSchema = z.object({ archived: z.boolean(), pushed_at: z.string() });
function githubSlug(repository) {
  const raw = typeof repository === "string" ? repository : repository?.url;
  if (!raw) return null;
  const short = raw.match(/^(?:github:)?([\w.-]+)\/([\w.-]+)$/);
  const long = raw.match(/github\.com[/:]([\w.-]+)\/([\w.-]+?)(?:\.git)?(?:[#/].*)?$/);
  const m = long ?? short;
  return m ? `${m[1]}/${m[2]}` : null;
}
function encodeName(name) {
  return name.startsWith("@") ? `@${encodeURIComponent(name.slice(1))}` : encodeURIComponent(name);
}
async function fetchPackageEvidence(name, options = {}) {
  const now2 = options.now ?? /* @__PURE__ */ new Date();
  const observedAt = now2.toISOString();
  const trimmed = name.trim();
  const evidence = [];
  const unavailable = [];
  const npmUrl = `https://www.npmjs.com/package/${trimmed}`;
  const fact = (label, value, source, url) => ({
    id: `${source}:${label}`,
    source,
    label,
    value,
    observedAt,
    url
  });
  if (!/^(@[\w.-]+\/)?[\w.-]+$/.test(trimmed)) {
    return {
      subject: trimmed || "unknown-package",
      kind: KIND2,
      evidence,
      unavailable: [{ id: "registry", source: "npm-registry", reason: "That is not a valid npm package name." }]
    };
  }
  const [docResult, downloadsResult] = await Promise.all([
    fetchJson(`https://registry.npmjs.org/${encodeName(trimmed)}`, options),
    fetchJson(`https://api.npmjs.org/downloads/point/last-week/${trimmed}`, options)
  ]);
  if (!docResult.ok) {
    unavailable.push(unavailableFrom("registry", "npm-registry", docResult));
    return { subject: trimmed, kind: KIND2, evidence, unavailable };
  }
  const doc = RegistryDocSchema.safeParse(docResult.body);
  if (!doc.success) {
    unavailable.push({ id: "registry", source: "npm-registry", reason: "The registry returned a document in an unexpected shape." });
    return { subject: trimmed, kind: KIND2, evidence, unavailable };
  }
  const d = doc.data;
  const latest = d["dist-tags"].latest;
  const latestManifest = d.versions[latest];
  const publishedAt = d.time[latest];
  const deps = Object.entries(latestManifest?.dependencies ?? {});
  evidence.push(fact("latest-version", latest, "npm-registry", `${npmUrl}/v/${latest}`));
  evidence.push(fact("dependency-count", deps.length, "npm-registry", `${npmUrl}?activeTab=dependencies`));
  for (const [dep, range] of deps) {
    evidence.push({ ...fact("declared-range", `${dep}@${range}`, "npm-registry", null), id: `npm-registry:declared:${dep}` });
  }
  if (publishedAt) {
    const days = Math.max(0, Math.floor((now2.getTime() - Date.parse(publishedAt)) / DAY_MS));
    evidence.push(fact("days-since-last-publish", days, "npm-registry", `${npmUrl}?activeTab=versions`));
  } else {
    unavailable.push({ id: "publish-date", source: "npm-registry", reason: `No publish time is recorded for ${latest}.` });
  }
  evidence.push(fact("deprecated", Boolean(latestManifest?.deprecated), "npm-registry", npmUrl));
  if (typeof latestManifest?.deprecated === "string" && latestManifest.deprecated.length > 0) {
    evidence.push(fact("deprecation-notice", latestManifest.deprecated, "npm-registry", npmUrl));
  }
  evidence.push(fact("maintainer-count", d.maintainers.length, "npm-registry", npmUrl));
  if (downloadsResult.ok) {
    const parsed = DownloadsSchema.safeParse(downloadsResult.body);
    if (parsed.success) {
      evidence.push(fact("weekly-downloads", parsed.data.downloads, "npm-downloads", `https://npm-stat.com/charts.html?package=${trimmed}`));
    } else {
      unavailable.push({ id: "downloads", source: "npm-downloads", reason: "Download counts came back in an unexpected shape." });
    }
  } else {
    unavailable.push(unavailableFrom("downloads", "npm-downloads", downloadsResult));
  }
  const slug = githubSlug(d.repository);
  if (!slug) {
    unavailable.push({ id: "repository", source: "github", reason: "The package does not link a GitHub repository, so archive and commit signals are unknown." });
    return { subject: d.name, kind: KIND2, evidence, unavailable };
  }
  const headers = options.githubToken ? { Authorization: `Bearer ${options.githubToken}` } : void 0;
  const repoResult = await fetchJson(`https://api.github.com/repos/${slug}`, { ...options, ...headers ? { headers } : {} });
  const repoUrl = `https://github.com/${slug}`;
  if (!repoResult.ok) {
    unavailable.push(unavailableFrom("repository", "github", repoResult));
  } else {
    const repo = GithubRepoSchema.safeParse(repoResult.body);
    if (repo.success) {
      const days = Math.max(0, Math.floor((now2.getTime() - Date.parse(repo.data.pushed_at)) / DAY_MS));
      evidence.push(fact("repository-archived", repo.data.archived, "github", repoUrl));
      evidence.push(fact("days-since-last-commit", days, "github", `${repoUrl}/commits`));
    } else {
      unavailable.push({ id: "repository", source: "github", reason: "GitHub returned repository data in an unexpected shape." });
    }
  }
  return { subject: d.name, kind: KIND2, evidence, unavailable };
}
var STALE_PUBLISH_DAYS = 730;
var RECENT_COMMIT_DAYS = 365;
var LOW_DOWNLOADS = 1e3;
function num(ev, label) {
  const value = findEvidence(ev, label)?.value;
  return typeof value === "number" ? value : null;
}
function flag(ev, label) {
  return findEvidence(ev, label)?.value === true;
}
function ids(ev, labels) {
  return labels.flatMap((label) => {
    const found = findEvidence(ev, label);
    return found ? [found.id] : [];
  });
}
var packageRules = [
  {
    id: "stale-release",
    title: "No release in two or more years",
    severity: "warning",
    weight: 60,
    evaluate(ev) {
      const publish = num(ev, "days-since-last-publish");
      const commit = num(ev, "days-since-last-commit");
      if (publish === null || publish < STALE_PUBLISH_DAYS) return null;
      if (commit !== null && commit < RECENT_COMMIT_DAYS) return null;
      return {
        evidenceIds: ids(ev, ["days-since-last-publish", "days-since-last-commit"]),
        explanation: `Last publish was ${publish} days ago and the last commit was ${commit ?? "unknown"} days ago.`
      };
    },
    suggestedAction: "Confirm the project still has an active maintainer, or plan a move to a maintained alternative."
  },
  {
    id: "deprecated",
    title: "Package is deprecated",
    severity: "critical",
    weight: 90,
    evaluate(ev) {
      if (!flag(ev, "deprecated")) return null;
      const notice = findEvidence(ev, "deprecation-notice")?.value;
      return {
        evidenceIds: ids(ev, ["deprecated", "deprecation-notice"]),
        explanation: typeof notice === "string" ? `The registry marks this package as deprecated: "${notice}"` : "The registry marks this package as deprecated."
      };
    },
    suggestedAction: "Replace the package with the successor named in its deprecation notice."
  },
  {
    id: "repository-archived",
    title: "Source repository is archived",
    severity: "critical",
    weight: 80,
    evaluate(ev) {
      if (!flag(ev, "repository-archived")) return null;
      return {
        evidenceIds: ids(ev, ["repository-archived"]),
        explanation: "The source repository is archived, so upstream fixes are unlikely."
      };
    },
    suggestedAction: "Fork the repository you depend on, or migrate to a package with active upstream."
  },
  {
    id: "single-maintainer",
    title: "Single maintainer",
    severity: "info",
    weight: 30,
    evaluate(ev) {
      if (num(ev, "maintainer-count") !== 1) return null;
      return {
        evidenceIds: ids(ev, ["maintainer-count"]),
        explanation: "Only one maintainer is listed, so a single absence can stall the project."
      };
    },
    suggestedAction: "Note the bus factor and watch for an identified backup maintainer."
  },
  {
    id: "low-downloads",
    title: "Low weekly downloads",
    severity: "info",
    weight: 10,
    evaluate(ev) {
      const downloads = num(ev, "weekly-downloads");
      if (downloads === null || downloads >= LOW_DOWNLOADS) return null;
      return {
        evidenceIds: ids(ev, ["weekly-downloads"]),
        explanation: `The package sees about ${downloads} weekly downloads, so few eyes review it.`
      };
    },
    suggestedAction: "Check whether the package has a broader community or a larger alternative."
  }
];
function scanPackage(fixture, generatedAt) {
  return buildReport(adaptPackageManifest(fixture), { rules: packageRules, generatedAt });
}
async function scanPackageLive(name, options = {}) {
  const now2 = options.now ?? /* @__PURE__ */ new Date();
  const adapted = await fetchPackageEvidence(name, { ...options, now: now2 });
  return buildReport(adapted, { rules: packageRules, generatedAt: now2.toISOString() });
}
var SnapshotSchema2 = z.object({
  fullName: z.string().regex(/^[\w.-]+\/[\w.-]+$/),
  archived: z.boolean(),
  pushedAt: z.string().datetime(),
  latestReleaseAt: z.string().datetime().nullable(),
  openIssues: z.object({ count: z.number().int().min(0), staleCount: z.number().int().min(0) }),
  openPullRequests: z.object({ count: z.number().int().min(0), oldestDays: z.number().int().min(0) }),
  ciStatus: z.enum(["passing", "failing", "unknown"]),
  license: z.string().min(1).nullable(),
  hasReadme: z.boolean()
});
var SOURCE2 = "repository-snapshot";
function adaptRepository(input) {
  const parsed = SnapshotSchema2.safeParse(input);
  if (!parsed.success) {
    const reason = parsed.error.issues.map((issue) => `${issue.path.join(".") || "(root)"}: ${issue.message}`).join("; ");
    return {
      subject: "unknown repository",
      kind: "repository",
      evidence: [],
      unavailable: [{ id: "snapshot", source: SOURCE2, reason }]
    };
  }
  const s = parsed.data;
  const fact = (field, value, observedAt = null, url = null) => ({ id: `repo:${field}`, source: SOURCE2, label: field, value, observedAt, url });
  return {
    subject: s.fullName,
    kind: "repository",
    evidence: [
      fact("fullName", s.fullName, null, `https://github.com/${s.fullName}`),
      fact("archived", s.archived),
      fact("pushedAt", s.pushedAt, s.pushedAt),
      fact("latestReleaseAt", s.latestReleaseAt, s.latestReleaseAt),
      fact("openIssues", s.openIssues.count),
      fact("staleIssues", s.openIssues.staleCount),
      fact("openPullRequests", s.openPullRequests.count),
      fact("oldestPullRequestDays", s.openPullRequests.oldestDays),
      fact("ciStatus", s.ciStatus),
      fact("license", s.license),
      fact("hasReadme", s.hasReadme)
    ],
    unavailable: []
  };
}
var DAY_MS2 = 864e5;
var STALE_ISSUE_DAYS = 180;
var SOURCE3 = "github";
var API = "https://api.github.com";
var PULLS_PAGE = 100;
var RepoSchema = z.object({
  full_name: z.string(),
  archived: z.boolean(),
  pushed_at: z.string(),
  default_branch: z.string(),
  open_issues_count: z.number().int().min(0),
  license: z.object({ spdx_id: z.string().nullable() }).nullable()
});
var ReleaseSchema = z.object({ published_at: z.string().nullable() });
var SearchSchema = z.object({ total_count: z.number().int().min(0) });
var PullsSchema = z.array(z.object({ created_at: z.string() }));
var RunsSchema = z.object({ workflow_runs: z.array(z.object({ conclusion: z.string().nullable(), status: z.string() })) });
function parseRepository(input) {
  const trimmed = input.trim().replace(/\/+$/, "");
  const m = trimmed.match(/^(?:https?:\/\/)?(?:www\.)?(?:github\.com\/)?([\w.-]+)\/([\w.-]+?)(?:\.git)?$/);
  return m ? `${m[1]}/${m[2]}` : null;
}
async function fetchRepositoryEvidence(input, options = {}) {
  const now2 = options.now ?? /* @__PURE__ */ new Date();
  const observedAt = now2.toISOString();
  const evidence = [];
  const unavailable = [];
  const slug = parseRepository(input);
  if (!slug) {
    return {
      subject: input.trim() || "unknown repository",
      kind: "repository",
      evidence,
      unavailable: [{ id: "repo", source: SOURCE3, reason: "Enter a repository as owner/name or a github.com URL." }]
    };
  }
  const http = { ...options, headers: { Accept: "application/vnd.github+json", ...options.githubToken ? { Authorization: `Bearer ${options.githubToken}` } : {} } };
  const web = `https://github.com/${slug}`;
  const fact = (field, value, url) => ({
    id: `repo:${field}`,
    source: SOURCE3,
    label: field,
    value,
    observedAt,
    url
  });
  const repoResult = await fetchJson(`${API}/repos/${slug}`, http);
  if (!repoResult.ok) {
    unavailable.push(unavailableFrom("repo", SOURCE3, repoResult));
    return { subject: slug, kind: "repository", evidence, unavailable };
  }
  const repo = RepoSchema.safeParse(repoResult.body);
  if (!repo.success) {
    unavailable.push({ id: "repo", source: SOURCE3, reason: "GitHub returned repository data in an unexpected shape." });
    return { subject: slug, kind: "repository", evidence, unavailable };
  }
  const r = repo.data;
  const license = r.license?.spdx_id && r.license.spdx_id !== "NOASSERTION" ? r.license.spdx_id : r.license ? "Other" : null;
  evidence.push(fact("fullName", r.full_name, web));
  evidence.push(fact("archived", r.archived, web));
  evidence.push(fact("pushedAt", r.pushed_at, `${web}/commits`));
  evidence.push(fact("license", license, `${web}#license`));
  const staleBefore = new Date(now2.getTime() - STALE_ISSUE_DAYS * DAY_MS2).toISOString().slice(0, 10);
  const q = (query2) => `${API}/search/issues?per_page=1&q=${encodeURIComponent(`repo:${slug} ${query2}`)}`;
  const [release, readme, stale, pulls, runs] = await Promise.all([
    fetchJson(`${API}/repos/${slug}/releases/latest`, http),
    fetchJson(`${API}/repos/${slug}/readme`, http),
    fetchJson(q(`is:issue is:open updated:<${staleBefore}`), http),
    fetchJson(`${API}/repos/${slug}/pulls?state=open&sort=created&direction=asc&per_page=${PULLS_PAGE}`, http),
    fetchJson(`${API}/repos/${slug}/actions/runs?per_page=1&branch=${encodeURIComponent(r.default_branch)}&status=completed`, http)
  ]);
  if (release.ok) {
    const parsed = ReleaseSchema.safeParse(release.body);
    evidence.push(fact("latestReleaseAt", parsed.success ? parsed.data.published_at : null, `${web}/releases`));
  } else if (release.status === 404) {
    evidence.push(fact("latestReleaseAt", null, `${web}/releases`));
  } else {
    unavailable.push(unavailableFrom("latestReleaseAt", SOURCE3, release));
  }
  if (readme.ok) evidence.push(fact("hasReadme", true, `${web}#readme`));
  else if (readme.status === 404) evidence.push(fact("hasReadme", false, web));
  else unavailable.push(unavailableFrom("hasReadme", SOURCE3, readme));
  if (stale.ok) {
    const parsed = SearchSchema.safeParse(stale.body);
    if (parsed.success) evidence.push(fact("staleIssues", parsed.data.total_count, `${web}/issues?q=${encodeURIComponent(`is:issue is:open updated:<${staleBefore}`)}`));
    else unavailable.push({ id: "staleIssues", source: SOURCE3, reason: "GitHub search returned an unexpected shape." });
  } else {
    unavailable.push(unavailableFrom("staleIssues", SOURCE3, stale));
  }
  const parsedPulls = pulls.ok ? PullsSchema.safeParse(pulls.body) : null;
  if (parsedPulls?.success) {
    const open = parsedPulls.data;
    const first = open[0];
    const days = first ? Math.max(0, Math.floor((now2.getTime() - Date.parse(first.created_at)) / DAY_MS2)) : 0;
    evidence.push(fact("openPullRequests", open.length, `${web}/pulls`));
    evidence.push(fact("oldestPullRequestDays", days, `${web}/pulls?q=is%3Apr+is%3Aopen+sort%3Acreated-asc`));
    evidence.push(fact("openIssues", Math.max(0, r.open_issues_count - open.length), `${web}/issues`));
  } else if (!pulls.ok) {
    unavailable.push(unavailableFrom("pullRequests", SOURCE3, pulls));
  } else {
    unavailable.push({ id: "pullRequests", source: SOURCE3, reason: "GitHub returned pull requests in an unexpected shape." });
  }
  if (runs.ok) {
    const parsed = RunsSchema.safeParse(runs.body);
    if (parsed.success) {
      const conclusion = parsed.data.workflow_runs[0]?.conclusion;
      const status = conclusion === "success" ? "passing" : conclusion === "failure" ? "failing" : "unknown";
      evidence.push(fact("ciStatus", status, `${web}/actions`));
    } else {
      unavailable.push({ id: "ciStatus", source: SOURCE3, reason: "GitHub returned workflow runs in an unexpected shape." });
    }
  } else {
    unavailable.push(unavailableFrom("ciStatus", SOURCE3, runs));
  }
  return { subject: r.full_name, kind: "repository", evidence, unavailable };
}
var DAY_MS3 = 864e5;
var STALE_ISSUE_THRESHOLD = 10;
var OLD_PULL_REQUEST_DAYS = 180;
var STALE_RELEASE_DAYS = 365;
var repoRules = [
  {
    id: "archived",
    title: "Repository is archived",
    severity: "critical",
    weight: 80,
    evaluate(evidence) {
      const e = findEvidence(evidence, "archived");
      if (e?.value !== true) return null;
      return { evidenceIds: [e.id], explanation: "The repository is archived and accepts no new changes." };
    },
    suggestedAction: "Decide whether to unarchive the repository or document it as retired."
  },
  {
    id: "ci-failing",
    title: "CI is failing",
    severity: "warning",
    weight: 40,
    evaluate(evidence) {
      const e = findEvidence(evidence, "ciStatus");
      if (e?.value !== "failing") return null;
      return { evidenceIds: [e.id], explanation: "The latest CI status is failing." };
    },
    suggestedAction: "Fix the failing CI pipeline before merging anything new."
  },
  {
    id: "stale-issues",
    title: "Many stale open issues",
    severity: "warning",
    weight: 30,
    evaluate(evidence) {
      const e = findEvidence(evidence, "staleIssues");
      if (typeof e?.value !== "number" || e.value < STALE_ISSUE_THRESHOLD) return null;
      return {
        evidenceIds: [e.id],
        explanation: `${e.value} open issues are stale (threshold ${STALE_ISSUE_THRESHOLD}).`
      };
    },
    suggestedAction: "Triage stale issues: close, relabel, or schedule them."
  },
  {
    id: "old-pull-requests",
    title: "Pull requests left open too long",
    severity: "warning",
    weight: 30,
    evaluate(evidence) {
      const e = findEvidence(evidence, "oldestPullRequestDays");
      if (typeof e?.value !== "number" || e.value < OLD_PULL_REQUEST_DAYS) return null;
      return {
        evidenceIds: [e.id],
        explanation: `The oldest open pull request is ${e.value} days old (threshold ${OLD_PULL_REQUEST_DAYS}).`
      };
    },
    suggestedAction: "Merge, rebase, or close the oldest open pull requests."
  },
  {
    id: "no-license",
    title: "No license declared",
    severity: "critical",
    weight: 60,
    evaluate(evidence) {
      const e = findEvidence(evidence, "license");
      if (e?.value !== null) return null;
      return { evidenceIds: [e.id], explanation: "No license is declared, so reuse rights are unclear." };
    },
    suggestedAction: "Add a LICENSE file that matches the intended reuse terms."
  },
  {
    id: "no-recent-release",
    title: "No recent release",
    severity: "info",
    weight: 20,
    evaluate(evidence) {
      const release = findEvidence(evidence, "latestReleaseAt");
      const reference = findEvidence(evidence, "generatedAt");
      if (!release || typeof reference?.value !== "string") return null;
      const evidenceIds = [release.id, reference.id];
      if (release.value === null) {
        return { evidenceIds, explanation: "No release has been published." };
      }
      if (typeof release.value !== "string") return null;
      const ageDays = Math.floor((Date.parse(reference.value) - Date.parse(release.value)) / DAY_MS3);
      if (ageDays <= STALE_RELEASE_DAYS) return null;
      return {
        evidenceIds,
        explanation: `The latest release is ${ageDays} days old (threshold ${STALE_RELEASE_DAYS}).`
      };
    },
    suggestedAction: "Cut a release, or state that the project is intentionally unversioned."
  },
  {
    id: "no-readme",
    title: "No README",
    severity: "info",
    weight: 10,
    evaluate(evidence) {
      const e = findEvidence(evidence, "hasReadme");
      if (e?.value !== false) return null;
      return { evidenceIds: [e.id], explanation: "No README was found at the repository root." };
    },
    suggestedAction: "Add a README that explains what the project does and how to run it."
  }
];
function withReference(adapted, generatedAt) {
  if (adapted.evidence.length === 0) return adapted;
  const reference = {
    id: "scan:generatedAt",
    source: "scan",
    label: "generatedAt",
    value: generatedAt,
    observedAt: generatedAt,
    url: null
  };
  return { ...adapted, evidence: [...adapted.evidence, reference] };
}
function scanRepository(snapshot, generatedAt) {
  return buildReport(withReference(adaptRepository(snapshot), generatedAt), { rules: repoRules, generatedAt });
}
async function scanRepositoryLive(input, options = {}) {
  const now2 = options.now ?? /* @__PURE__ */ new Date();
  const generatedAt = now2.toISOString();
  const adapted = await fetchRepositoryEvidence(input, { ...options, now: now2 });
  return buildReport(withReference(adapted, generatedAt), { rules: repoRules, generatedAt });
}
var PACKAGE_FIXTURES = { abandoned: abandoned_default, "stable-old": stable_old_default };
var REPO_FIXTURES = { active: active_default, neglected: neglected_default, archived: archived_default };

// src/scanner.ts
var FIXTURES = { package: PACKAGE_FIXTURES, repository: REPO_FIXTURES };
var PACKAGE_NAME = /^(@[\w.-]+\/)?[\w.-]+$/;
var REPO_NAME = /^[\w.-]+\/[\w.-]+$/;
function fixtureNames(kind) {
  return Object.keys(FIXTURES[kind]).sort();
}
function validateTarget(target) {
  const { kind, subject, mode } = target;
  if (kind !== "package" && kind !== "repository") return 'kind must be "package" or "repository"';
  if (mode !== "fixture" && mode !== "live") return 'mode must be "fixture" or "live"';
  if (typeof subject !== "string" || subject.trim() === "") return "subject is required";
  if (mode === "fixture" && !(subject in FIXTURES[kind])) {
    return `No ${kind} fixture named "${subject}". Known: ${fixtureNames(kind).join(", ")}`;
  }
  if (mode === "live" && kind === "package" && !PACKAGE_NAME.test(subject)) return "Not a valid npm package name";
  if (mode === "live" && kind === "repository" && !REPO_NAME.test(subject)) return 'Repository must look like "owner/name"';
  return null;
}
function createScanner(options = {}) {
  return async (target, now2) => {
    const problem = validateTarget(target);
    if (problem) throw new Error(problem);
    if (target.mode === "fixture") {
      const fixture = FIXTURES[target.kind][target.subject];
      const generatedAt = now2.toISOString();
      return target.kind === "package" ? scanPackage(fixture, generatedAt) : scanRepository(fixture, generatedAt);
    }
    const live = { now: now2, ...options };
    return target.kind === "package" ? scanPackageLive(target.subject, live) : scanRepositoryLive(target.subject, live);
  };
}

// src/watch.ts
import { randomUUID as randomUUID2 } from "node:crypto";

// src/plans.ts
function planFromReport(report, scan) {
  if (report.plan.steps.length === 0) return null;
  const byId = new Map(report.findings.map((finding) => [finding.id, finding]));
  const steps = report.plan.steps.map((step) => {
    const finding = byId.get(step.findingId);
    return { ...step, severity: finding?.severity ?? "info", title: finding?.title ?? step.findingId };
  });
  return {
    id: scan.id,
    watchId: scan.watchId,
    scanId: scan.id,
    subject: report.subject,
    title: `Revival plan for ${report.subject}`,
    createdAt: scan.scannedAt,
    score: report.score.score,
    band: report.score.band,
    findingIds: report.findings.map((finding) => finding.id).sort(),
    steps,
    markdown: toMarkdown(report),
    decision: null,
    decidedAt: null
  };
}
function sameFindings(a, b) {
  return a.findingIds.length === b.findingIds.length && a.findingIds.every((id, i) => id === b.findingIds[i]);
}

// src/watch.ts
function errorMessage(error) {
  return error instanceof Error ? error.message : String(error);
}
function scansFor(scans, watchId) {
  return scans.filter((scan) => scan.watchId === watchId).sort((a, b) => a.scannedAt.localeCompare(b.scannedAt));
}
function lastScanFor(scans, watchId) {
  return scansFor(scans, watchId).at(-1) ?? null;
}
async function runWatch(watch, deps, options = {}) {
  const now2 = deps.now();
  const last = lastScanFor(await deps.store.listScans(), watch.id);
  if (!options.force && !isDue(last?.scannedAt ?? null, watch.everyHours, now2)) return null;
  const base = { id: randomUUID2(), watchId: watch.id, kind: watch.kind, subject: watch.subject, mode: watch.mode, scannedAt: now2 };
  let entry;
  try {
    const report = await deps.scan(watch, new Date(now2));
    entry = { ...base, score: report.score.score, band: report.score.band, findingCount: report.findings.length, report };
  } catch (error) {
    entry = { ...base, score: null, band: null, findingCount: null, report: null, error: errorMessage(error) };
  }
  await deps.store.recordScan(entry);
  const plan = entry.report ? planFromReport(entry.report, entry) : null;
  if (plan) {
    const previous = (await deps.store.listPlans()).filter((p) => p.watchId === watch.id).at(-1);
    if (!previous || !sameFindings(previous, plan)) await deps.store.addPlan(plan);
  }
  return entry;
}
async function runWatches(watches, deps, options = {}) {
  const entries = [];
  for (const watch of watches) {
    const entry = await runWatch(watch, deps, options);
    if (entry) entries.push(entry);
  }
  return entries;
}
async function runDueWatches(deps) {
  return runWatches(await deps.store.listWatches(), deps);
}

// src/api.ts
var TREND_POINTS = 20;
var MAX_EVERY_HOURS = 24 * 30;
var BAND_RANK = { healthy: 0, unknown: 1, "at-risk": 2, critical: 3 };
var HttpError = class extends Error {
  status;
  constructor(status, message) {
    super(message);
    this.status = status;
  }
};
var json = (status, data) => ({
  status,
  headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
  body: JSON.stringify(data)
});
var header = (req, name) => {
  const value = req.headers[name.toLowerCase()];
  return Array.isArray(value) ? value[0] : value;
};
function parseBody(req) {
  if (req.body.length === 0) return {};
  try {
    const parsed = JSON.parse(Buffer.from(req.body).toString("utf8"));
    if (typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)) return parsed;
  } catch {
  }
  throw new HttpError(400, "Body must be a JSON object");
}
function routePath(target) {
  const path = target.split("?")[0] ?? "/";
  for (const prefix of [`/api/apps/${APP_NAME}`, "/api"]) {
    if (path === prefix) return "/";
    if (path.startsWith(`${prefix}/`)) return path.slice(prefix.length).replace(/\/+$/, "") || "/";
  }
  return path.replace(/\/+$/, "") || "/";
}
function query(target) {
  const index = target.indexOf("?");
  return new URLSearchParams(index === -1 ? "" : target.slice(index + 1));
}
function viewWatch(watch, scans, plans, now2) {
  const own = scansFor(scans, watch.id);
  const latest = own.at(-1) ?? null;
  const last = latest?.scannedAt ?? null;
  const trend = own.flatMap((scan) => scan.score === null ? [] : [{ scannedAt: scan.scannedAt, score: scan.score }]);
  const pending = plans.filter((plan) => plan.watchId === watch.id && plan.decision === null).at(-1);
  return {
    ...watch,
    due: isDue(last, watch.everyHours, now2),
    nextRunAt: nextRunAt(last, watch.everyHours, now2),
    latest,
    trend: trend.slice(-TREND_POINTS),
    pendingPlanId: pending?.id ?? null
  };
}
async function listWatches(deps) {
  const now2 = deps.now();
  const [watches, scans, plans] = await Promise.all([deps.store.listWatches(), deps.store.listScans(), deps.store.listPlans()]);
  const views = watches.map((watch) => viewWatch(watch, scans, plans, now2));
  const count = (band) => views.filter((view) => view.latest?.band === band).length;
  return {
    now: now2,
    watches: views,
    summary: {
      total: views.length,
      due: views.filter((view) => view.due).length,
      healthy: count("healthy"),
      atRisk: count("at-risk"),
      critical: count("critical"),
      unknown: count("unknown"),
      pendingPlans: plans.filter((plan) => plan.decision === null).length
    }
  };
}
async function addWatch(deps, body) {
  const problem = validateTarget(body);
  if (problem) throw new HttpError(400, problem);
  const everyHours = body.everyHours ?? 24;
  if (typeof everyHours !== "number" || !Number.isFinite(everyHours) || everyHours <= 0 || everyHours > MAX_EVERY_HOURS) {
    throw new HttpError(400, `everyHours must be a number between 0 and ${MAX_EVERY_HOURS}`);
  }
  const watch = {
    id: randomUUID3(),
    kind: body.kind,
    subject: String(body.subject).trim(),
    mode: body.mode,
    everyHours,
    createdAt: deps.now()
  };
  const existing = await deps.store.listWatches();
  if (existing.some((w) => w.kind === watch.kind && w.mode === watch.mode && w.subject === watch.subject)) {
    throw new HttpError(409, `Already watching ${watch.kind} ${watch.subject} (${watch.mode})`);
  }
  await deps.store.addWatch(watch);
  return watch;
}
async function run(deps, body) {
  const runDeps = { scan: deps.scan, store: deps.store, now: deps.now };
  if (body.watchId === void 0) return { ran: await runDueWatches(runDeps) };
  const watch = (await deps.store.listWatches()).find((w) => w.id === body.watchId);
  if (!watch) throw new HttpError(404, `Unknown watch: ${String(body.watchId)}`);
  const entry = await runWatch(watch, runDeps, { force: true });
  return { ran: entry ? [entry] : [] };
}
async function digest(deps) {
  const [watches, scans, plans] = await Promise.all([deps.store.listWatches(), deps.store.listScans(), deps.store.listPlans()]);
  const worsened = [];
  const critical = [];
  for (const watch of watches) {
    const scored = scansFor(scans, watch.id).filter((scan) => scan.band !== null && scan.band !== "unknown");
    const latest = scored.at(-1);
    if (!latest?.band) continue;
    const previous = scored.at(-2)?.band ?? null;
    const item = { watchId: watch.id, subject: latest.report?.subject ?? watch.subject, from: previous, to: latest.band, score: latest.score };
    if (previous !== null && BAND_RANK[latest.band] > BAND_RANK[previous]) worsened.push(item);
    if (latest.band === "critical") critical.push(item);
  }
  const pendingPlans = plans.filter((plan) => plan.decision === null).length;
  const line = (i) => `- ${i.subject}: ${i.from ?? "new"} -> ${i.to} (score ${i.score ?? "unscored"})`;
  const markdown = [
    "# Undertaker digest",
    "",
    "## Got worse since the previous scan",
    ...worsened.length ? worsened.map(line) : ["- None"],
    "",
    "## Critical now",
    ...critical.length ? critical.map(line) : ["- None"],
    "",
    `Pending plans waiting for a human decision: ${pendingPlans}`
  ].join("\n");
  return { generatedAt: deps.now(), worsened, critical, pendingPlans, markdown: `${markdown}
` };
}
async function route(deps, req, path) {
  const method = req.method.toUpperCase();
  const parts = path.split("/").filter(Boolean);
  if (method === "GET" && path === "/watches") return json(200, await listWatches(deps));
  if (method === "POST" && path === "/watches") return json(201, await addWatch(deps, parseBody(req)));
  if (method === "DELETE" && parts[0] === "watches" && parts.length === 2) {
    if (!await deps.store.removeWatch(parts[1] ?? "")) throw new HttpError(404, `Unknown watch: ${parts[1]}`);
    return json(200, { removed: parts[1] });
  }
  if (method === "POST" && path === "/run") return json(200, await run(deps, parseBody(req)));
  if (method === "GET" && path === "/fixtures") {
    const fixtures = { package: fixtureNames("package"), repository: fixtureNames("repository") };
    return json(200, fixtures);
  }
  if (method === "GET" && path === "/scans") {
    const watchId = query(req.target).get("watchId");
    const scans = await deps.store.listScans();
    const picked = watchId ? scansFor(scans, watchId) : [...scans];
    return json(200, { scans: picked.sort((a, b) => b.scannedAt.localeCompare(a.scannedAt)) });
  }
  if (method === "GET" && path === "/plans/export") {
    return { status: 200, headers: { "content-type": "text/markdown; charset=utf-8", "cache-control": "no-store" }, body: await exportApprovedPlans(deps.store) };
  }
  if (method === "GET" && path === "/plans") {
    const status = query(req.target).get("status");
    const plans = (await deps.store.listPlans()).filter((plan) => {
      if (status === "pending") return plan.decision === null;
      if (status === "approve" || status === "dismiss") return plan.decision === status;
      return true;
    });
    return json(200, { plans: plans.reverse() });
  }
  if (method === "POST" && parts[0] === "plans" && parts[2] === "decision" && parts.length === 3) {
    const { decision } = parseBody(req);
    if (!isDecision(decision)) throw new HttpError(400, 'decision must be "approve" or "dismiss"');
    const known = (await deps.store.listPlans()).some((plan) => plan.id === parts[1]);
    if (!known) throw new HttpError(404, `Unknown plan: ${parts[1]}`);
    return json(200, await approvePlan(deps.store, parts[1] ?? "", decision, deps.now()));
  }
  if (method === "GET" && path === "/digest") return json(200, await digest(deps));
  throw new HttpError(404, `${method} ${path} not found`);
}
function createApi(deps) {
  return async (req) => {
    const path = routePath(req.target);
    if (req.method.toUpperCase() === "GET" && path === "/health") return json(200, { status: "ok", app: APP_NAME });
    if (deps.secret && deps.nonces) {
      const signed = {
        method: req.method.toUpperCase(),
        target: req.target,
        body: req.body,
        signature: header(req, "x-kirocrew-proxy-v2"),
        nonce: header(req, "x-kirocrew-proxy-nonce")
      };
      const now2 = Math.floor(Date.now() / 1e3);
      const ok = signed.signature ? verifyProxyV2(signed, deps.secret, now2, deps.nonces) : verifyProxyV1(header(req, "x-kirocrew-proxy"), signed, deps.secret, now2);
      if (!ok) {
        return json(401, { error: "Request was not signed by the Kiro Crew gateway" });
      }
    }
    try {
      return await route(deps, req, path);
    } catch (error) {
      if (error instanceof HttpError) return json(error.status, { error: error.message });
      return json(500, { error: error instanceof Error ? error.message : String(error) });
    }
  };
}

// src/store.ts
import { randomUUID as randomUUID4 } from "node:crypto";
import { mkdir, readFile, rename, rmdir, stat, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
var LOCK_STALE_MS = 3e4;
var LOCK_RETRY_MS = 25;
var sleep = (ms) => new Promise((resolve3) => setTimeout(resolve3, ms));
async function withFileLock(lockPath, timeoutMs, run2) {
  const deadline = Date.now() + timeoutMs;
  for (; ; ) {
    try {
      await mkdir(lockPath);
      break;
    } catch (error) {
      if (error.code !== "EEXIST") throw error;
      const age = await stat(lockPath).then((s) => Date.now() - s.mtimeMs, () => 0);
      if (age > LOCK_STALE_MS) await rmdir(lockPath).catch(() => void 0);
      else if (Date.now() > deadline) throw new Error(`Store is locked: ${lockPath}`);
      else await sleep(LOCK_RETRY_MS);
    }
  }
  try {
    return await run2();
  } finally {
    await rmdir(lockPath).catch(() => void 0);
  }
}
function openStore(filePath, options = {}) {
  const maxScans = options.maxScansPerWatch ?? 30;
  const lockTimeout = options.lockTimeoutMs ?? 5e3;
  let queue = Promise.resolve();
  async function read() {
    try {
      const parsed = JSON.parse(await readFile(filePath, "utf8"));
      const data = { scans: parsed.scans ?? [], plans: parsed.plans ?? [] };
      if (parsed.watches) data.watches = parsed.watches;
      return data;
    } catch (error) {
      if (error.code === "ENOENT") return { scans: [], plans: [] };
      throw error;
    }
  }
  async function write(data) {
    const tmp = `${filePath}.${randomUUID4()}.tmp`;
    await writeFile(tmp, `${JSON.stringify(data, null, 2)}
`);
    await rename(tmp, filePath);
  }
  function update(mutate) {
    const run2 = queue.then(async () => {
      await mkdir(dirname(filePath), { recursive: true });
      return withFileLock(`${filePath}.lock`, lockTimeout, async () => {
        const data = await read();
        const result = mutate(data);
        await write(data);
        return result;
      });
    });
    queue = run2.catch(() => void 0);
    return run2;
  }
  return {
    listWatches: async () => (await read()).watches ?? [],
    seedWatches: (defaults) => update((data) => {
      if (data.watches) return false;
      data.watches = [...defaults];
      return true;
    }),
    addWatch: (watch) => update((data) => {
      data.watches = [...data.watches ?? [], watch];
    }),
    removeWatch: (id) => update((data) => {
      const before = data.watches ?? [];
      data.watches = before.filter((watch) => watch.id !== id);
      return data.watches.length !== before.length;
    }),
    recordScan: (entry) => update((data) => {
      data.scans.push(entry);
      const own = data.scans.filter((scan) => scan.watchId === entry.watchId);
      if (own.length > maxScans) {
        const drop = new Set(own.slice(0, own.length - maxScans).map((scan) => scan.id));
        data.scans = data.scans.filter((scan) => !drop.has(scan.id));
      }
    }),
    listScans: async () => (await read()).scans,
    addPlan: (plan) => update((data) => {
      data.plans.push(plan);
    }),
    listPlans: async () => (await read()).plans,
    decidePlan: (planId, decision, decidedAt) => update((data) => {
      const plan = data.plans.find((candidate) => candidate.id === planId);
      if (!plan) throw new Error(`Unknown plan: ${planId}`);
      plan.decision = decision;
      plan.decidedAt = decidedAt;
      return { ...plan };
    })
  };
}

// src/server.ts
var MAX_BODY_BYTES = 64 * 1024;
var DEV_PORT = 8787;
var appRoot = resolve2(dirname2(fileURLToPath(import.meta.url)), "..");
var dataDir = resolveDataDir(process.env, appRoot);
var store = openStore(storePath(dataDir));
var now = () => (/* @__PURE__ */ new Date()).toISOString();
var secret = process.env.KIROCREW_PROXY_SECRET ?? "";
var handle = createApi({
  store,
  scan: createScanner(),
  now,
  ...secret ? { secret, nonces: createNonceCache() } : {}
});
var server = createServer((req, res) => {
  const chunks = [];
  let size = 0;
  req.on("data", (chunk) => {
    size += chunk.length;
    if (size > MAX_BODY_BYTES) {
      res.writeHead(413, { "content-type": "application/json" }).end('{"error":"Body too large"}');
      req.destroy();
      return;
    }
    chunks.push(chunk);
  });
  req.on("end", () => {
    if (res.writableEnded) return;
    handle({ method: req.method ?? "GET", target: req.url ?? "/", headers: req.headers, body: Buffer.concat(chunks) }).then((out) => res.writeHead(out.status, out.headers).end(out.body)).catch((error) => {
      res.writeHead(500, { "content-type": "application/json" }).end(JSON.stringify({ error: String(error) }));
    });
  });
});
var port = Number(process.env.PORT ?? DEV_PORT);
await store.seedWatches(defaultWatches(now()));
server.listen(port, "127.0.0.1", () => {
  const mode = secret ? "gateway (signed requests only)" : "local dev (no signature check)";
  console.log(`Undertaker backend on http://127.0.0.1:${port}  mode: ${mode}  data: ${dataDir}`);
});
for (const signal of ["SIGTERM", "SIGINT"]) {
  process.on(signal, () => server.close(() => process.exit(0)));
}
