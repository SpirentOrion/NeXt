/**
 * @module nx
 */

var nx = {
    VERSION: '0.9.0',
    DEBUG: false,
    global: (function () {
        return this;
    }).call(null)
};
nx.global.nx = nx;

// prepare for cross browser
(function () {
    if (!Function.prototype.bind) {
        Function.prototype.bind = function (context) {
            var f = this;
            return function () {
                return f.apply(context, arguments);
            };
        };
    }
})();


(function (nx) {
    /**
     * @class nx
     * @static
     */


    var isArray = Array.isArray || function (target) {
        return target && target.constructor === Array;
    };
    var isPojo = function (obj) {
        var hasown = Object.prototype.hasOwnProperty;
        if (!obj || Object.prototype.toString(obj) !== "[object Object]" || obj.nodeType || obj === window) {
            return false;
        }
        try {
            // Not own constructor property must be Object
            if (obj.constructor && !hasown.call(obj, "constructor") && !hasown.call(obj.constructor.prototype, "isPrototypeOf")) {
                return false;
            }
        } catch (e) {
            // IE8,9 Will throw exceptions on certain host objects #9897
            return false;
        }
        var key;
        for (key in obj) {}
        return key === undefined || hasown.call(obj, key);
    };

    /**
     * Extend target with properties from sources.
     * @method extend
     * @param target {Object} The target object to be extended.
     * @param source* {Object} The source objects.
     * @returns {Object}
     */
    nx.extend = function (target) {
        for (var i = 1, length = arguments.length; i < length; i++) {
            var arg = arguments[i];
            for (var key in arg) {
                if (arg.hasOwnProperty(key)) {
                    target[key] = arg[key];
                }
            }
        }

        return target;
    };

    /**
     * Iterate over target and execute the callback with context.
     * @method each
     * @param target {Object|Array|Iterable} The target object to be iterate over.
     * @param callback {Function} The callback function to execute.
     * @param context {Object} The context object which act as 'this'.
     */
    nx.each = function (target, callback, context) {
        /* jshint -W014 */
        if (target && callback) {
            if (target.__each__) {
                target.__each__(callback, context);
            } else {
                // FIXME maybe some other array-like things missed here
                if (isArray(target) // normal Array
                    || Object.prototype.toString.call(target) === "[object Arguments]" // array-like: arguments
                    || nx.global.NodeList && target instanceof NodeList // array-like: NodeList
                    || nx.global.HTMLCollection && target instanceof HTMLCollection // array-like: HTMLCollection
                ) {
                    for (var i = 0, length = target.length; i < length; i++) {
                        if (callback.call(context, target[i], i) === false) {
                            break;
                        }
                    }
                } else {
                    for (var key in target) {
                        if (target.hasOwnProperty(key)) {
                            if (callback.call(context, target[key], key) === false) {
                                break;
                            }
                        }
                    }
                }
            }
        }
    };

    /**
     * Shallow clone target object.
     * @method clone
     * @param target {Object|Array} The target object to be cloned.
     * @returns {Object} The cloned object.
     */

    nx.clone = (function () {
        var deepclone = (function () {
            var get, put, top, keys, clone;
            get = function (map, key) {
                for (var i = 0; i < map.length; i++) {
                    if (map[i].key === key) {
                        return map[i].value;
                    }
                }
                return null;
            };
            put = function (map, key, value) {
                var i;
                for (i = 0; i < map.length; i++) {
                    if (map[i].key === key) {
                        map[i].value = value;
                        return;
                    }
                }
                map[i] = {
                    key: key,
                    value: value
                };
            };
            top = function (stack) {
                if (stack.length === 0) {
                    return null;
                }
                return stack[stack.length - 1];
            };
            keys = function (obj) {
                var keys = [];
                if (Object.prototype.toString.call(obj) == '[object Array]') {
                    for (var i = 0; i < obj.length; i++) {
                        keys.push(i);
                    }
                } else {
                    for (var key in obj) {
                        keys.push(key);
                    }
                }
                return keys;
            };
            clone = function (self) {
                // TODO clone DOM object
                if (window === self || document === self) {
                    // window and document cannot be clone
                    return null;
                }
                if (["null", "undefined", "number", "string", "boolean", "function"].indexOf(typeof self) >= 0) {
                    return self;
                }
                if (!isArray(self) && !isPojo(self)) {
                    return self;
                }
                var map = [],
                    stack = [],
                    origin = self,
                    dest = (isArray(self) ? [] : {});
                var stacktop, key, cached;
                // initialize the map and stack
                put(map, origin, dest);
                stack.push({
                    origin: origin,
                    dest: dest,
                    keys: keys(origin),
                    idx: 0
                });
                while (true) {
                    stacktop = top(stack);
                    if (!stacktop) {
                        // the whole object is cloned
                        break;
                    }
                    origin = stacktop.origin;
                    dest = stacktop.dest;
                    if (stacktop.keys.length <= stacktop.idx) {
                        // object on the stack top is cloned
                        stack.pop();
                        continue;
                    }
                    key = stacktop.keys[stacktop.idx++];
                    // clone an object
                    if (isArray(origin[key])) {
                        dest[key] = [];
                    } else if (isPojo(origin[key])) {
                        dest[key] = {};
                    } else {
                        dest[key] = origin[key];
                        continue;
                    }
                    // check if needn't deep into or cloned already
                    cached = get(map, origin[key]);
                    if (cached) {
                        dest[key] = cached;
                        continue;
                    }
                    // deep into the object
                    put(map, origin[key], dest[key]);
                    stack.push({
                        origin: origin[key],
                        dest: dest[key],
                        keys: keys(origin[key]),
                        idx: 0
                    });
                }
                return dest;
            };
            return clone;
        })();
        return function (target, cfg) {
            if (target) {
                if (target.__clone__) {
                    return target.__clone__(cfg);
                } else if (!cfg) {
                    if (nx.is(target, 'Array')) {
                        return target.slice(0);
                    } else {
                        var result = {};
                        for (var key in target) {
                            if (target.hasOwnProperty(key)) {
                                result[key] = target[key];
                            }
                        }

                        return result;
                    }
                } else {
                    // TODO more config options
                    return deepclone(target);
                }
            } else {
                return target;
            }
        };
    })();

    /**
     * Check whether target is specified type.
     * @method is
     * @param target {Object} The target object to be checked.
     * @param type {String|Function} The type could either be a string or a class object.
     * @returns {Boolean}
     */
    nx.is = function (target, type) {
        if (target && target.__is__) {
            return target.__is__(type);
        } else {
            switch (type) {
            case 'Undefined':
                return target === undefined;
            case 'Null':
                return target === null;
            case 'Object':
                return target && (typeof target === 'object');
            case 'String':
            case 'Boolean':
            case 'Number':
            case 'Function':
                return typeof target === type.toLowerCase();
            case 'Array':
                return isArray(target);
            case 'POJO':
                return isPojo(target);
            default:
                return target instanceof type;
            }
        }
    };

    /**
     * Get the specified property value of target.
     * @method get
     * @param target {Object} The target object.
     * @param name {String} The property name.
     * @returns {*} The value.
     */
    nx.get = function (target, name) {
        if (target) {
            if (target.__get__) {
                return target.__get__(name);
            } else {
                return target[name];
            }
        }
    };

    /**
     * Set the specified property of target with value.
     * @method set
     * @param target {Object} The target object.
     * @param name {String} The property name.
     * @param value {*} The value to be set.
     */
    nx.set = function (target, name, value) {
        if (target) {
            if (target.__set__) {
                target.__set__(name);
            } else {
                target[name] = value;
            }
        }
    };

    /**
     * Get all properties of target.
     * @method gets
     * @param target {Object} The target Object.
     * @returns {Object} An object contains all keys and values of target.
     */
    nx.gets = function (target) {
        if (target) {
            if (target.__gets__) {
                return target.__gets__();
            } else {
                var result = {};
                for (var key in target) {
                    if (target.hasOwnProperty(key)) {
                        result[key] = target[key];
                    }
                }
                return result;
            }
        }
    };

    /**
     * Set a bunch of properties for target.
     * @method sets
     * @param target {Object} The target object.
     * @param dict {Object} An object contains all keys and values to be set.
     */
    nx.sets = function (target, dict) {
        if (target && dict) {
            if (target.__sets__) {
                target.__sets__(dict);
            } else {
                for (var key in dict) {
                    if (dict.hasOwnProperty(key)) {
                        target[key] = dict[key];
                    }
                }
            }
        }
    };

    /**
     * Check whether target has specified property.
     * @method has
     * @param target {Object} The target object.
     * @param name {String} The property name.
     * @returns {Boolean}
     */
    nx.has = function (target, name) {
        if (target) {
            if (target.__has__) {
                return target.__has__(name);
            } else {
                return name in target;
            }
        } else {
            return false;
        }
    };

    /**
     * Compare target and source.
     * @method compare
     * @param target {Object} The target object.
     * @param source {Object} The source object.
     * @returns {Number} The result could be -1,0,1 which indicates the comparison result.
     */
    nx.compare = function (target, source) {
        if (target && target.__compare__) {
            return target.__compare__(source);
        } else {
            if (target === source) {
                return 0;
            } else if (target > source) {
                return 1;
            } else if (target < source) {
                return -1;
            }

            return 1;
        }
    };

    /**
     * Get value from target specified by a path and optionally set a value for it.
     * @method path
     * @param target {Object} The target object.
     * @param path {String} The path.
     * @param [value] {*} The value to be set.
     * @returns {*}
     */
    nx.path = function (target, path, value) {
        var result = target;
        if (path) {
            var tokens, token, length, i = 0;
            if (typeof path === "string") {
                tokens = path.split(".");
            } else if (isArray(path)) {
                tokens = path;
            } else {
                return target;
            }
            length = tokens.length;

            if (value === undefined) {
                for (; result && i < length; i++) {
                    token = tokens[i];
                    if (result.__get__) {
                        result = result.__get__(token);
                    } else {
                        result = result[token];
                    }
                }
            } else {
                length -= 1;
                for (; result && i < length; i++) {
                    token = tokens[i];
                    if (result.__get__) {
                        result = result.__get__(token);
                    } else {
                        result = result[token] = result[token] || {};
                    }
                }

                token = tokens[i];
                if (result) {
                    if (result.__set__) {
                        result.__set__(token, value);
                    } else {
                        result[token] = value;
                    }

                    result = value;
                }
            }
        }

        return result;
    };

    nx.idle = function () {};

    nx.identity = function (i) {
        return i;
    };

    nx.uuid = function () {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
            var r = Math.random() * 16 | 0,
                v = c == 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        }).toUpperCase();
    };


})(nx);

(function (nx) {

    var classId = 1,
        instanceId = 1,
        metaPrefix = '@',
        eventPrefix = 'on',
        classes = {},
        global = nx.global;

    /**
     * The base of any Classes defined in nx framework.
     * @class nx.Object
     * @constructor
     */
    function NXObject() {}

    var NXPrototype = NXObject.prototype = {
        constructor: NXObject,
        /**
         * Dispose current object.
         * @method dispose
         */
        dispose: function () {
            this.__listeners__ = {};
        },
        /**
         * Destroy current object.
         * @method destroy
         */
        destroy: function () {
            this.dispose();
        },
        /**
         * Call overridden method from super class
         * @method inherited
         */
        inherited: function () {
            var base = this.inherited.caller.__super__;
            if (base) {
                return base.apply(this, arguments);
            }
        },
        /**
         * Check whether current object is specified type.
         * @method is
         * @param type {String|Function}
         * @returns {Boolean}
         */
        is: function (type) {
            if (typeof type === 'string') {
                type = nx.path(global, type);
            }

            if (type) {
                if (this instanceof type) {
                    return true;
                } else {
                    var mixins = this.__mixins__;
                    for (var i = 0, len = mixins.length; i < len; i++) {
                        var mixin = mixins[i];
                        if (type === mixin) {
                            return true;
                        }
                    }
                }
            }

            return false;
        },
        /**
         * Check whether current object has specified property.
         * @method has
         * @param name {String}
         * @returns {Boolean}
         */
        has: function (name) {
            var member = this[name];
            return member && member.__type__ == 'property';
        },
        /**
         * Get specified property value.
         * @method get
         * @param name {String}
         * @returns {*}
         */
        get: function (name) {
            var member = this[name];
            if (member !== undefined) {
                if (member.__type__ == 'property') {
                    return member.call(this);
                } else {
                    return member;
                }
            }
        },
        /**
         * Set specified property value.
         * @method set
         * @param name {String}
         * @param value {*}
         */
        set: function (name, value) {
            var member = this[name];
            if (member !== undefined) {
                if (member.__type__ == 'property') {
                    return member.call(this, value);
                } else {
                    this[name] = value;
                }
            } else {
                this[name] = value;
            }
        },
        /**
         * Get all properties.
         * @method gets
         * @returns {Object}
         */
        gets: function () {
            var result = {};
            nx.each(this.__properties__, function (name) {
                result[name] = this.get(name);
            }, this);

            return result;
        },
        /**
         * Set a bunch of properties.
         * @method sets
         * @param dict {Object}
         */
        sets: function (dict) {
            if (dict) {
                for (var name in dict) {
                    if (dict.hasOwnProperty(name)) {
                        this.set(name, dict[name]);
                    }
                }
            }
        },
        /**
         * Check whether current object has specified event.
         * @method can
         * @param name {String}
         * @returns {Boolean}
         */
        can: function (name) {
            var member = this[eventPrefix + name];
            return member && member.__type__ == 'event';
        },
        /**
         * Add an event handler.
         * @method on
         * @param name {String}
         * @param handler {Function}
         * @param [context] {Object}
         */
        on: function (name, handler, context) {
            var map = this.__listeners__;
            var listeners = map[name] = map[name] || [{
                owner: null,
                handler: null,
                context: null
            }];
            var listener = {
                owner: this,
                handler: handler,
                context: context || this
            };

            listeners.push(listener);
            return {
                release: function () {
                    var idx = listeners.indexOf(listener);
                    if (idx >= 0) {
                        listeners.splice(idx, 1);
                    }
                }
            };
        },
        /**
         * Remove an event handler.
         * @method off
         * @param name {String}
         * @param [handler] {Function}
         * @param [context] {Object}
         */
        off: function (name, handler, context) {
            var listeners = this.__listeners__[name],
                listener;
            if (listeners) {
                if (handler) {
                    context = context || this;
                    for (var i = 0, length = listeners.length; i < length; i++) {
                        listener = listeners[i];
                        if (listener.handler == handler && listener.context == context) {
                            listeners.splice(i, 1);
                            break;
                        }
                    }
                } else {
                    listeners.length = 1;
                }
            }
        },
        /**
         * Add a single event handler.
         * @method upon
         * @param name {String}
         * @param handler {Function}
         * @param [context] {Object}
         */
        upon: function (name, handler, context) {
            var map = this.__listeners__;
            var listeners = map[name] = map[name] || [{
                owner: null,
                handler: null,
                context: null
            }];

            listeners[0] = {
                owner: this,
                handler: handler,
                context: context
            };
        },
        /**
         * Trigger an event.
         * @method fire
         * @param name {String}
         * @param [data] {*}
         */
        fire: function (name, data) {
            var i, length, listener, result, calling, existing = this.__listeners__[name];
            calling = existing ? existing.slice() : [];
            for (i = 0, length = calling.length; i < length; i++) {
                listener = calling[i];
                if (listener && listener.handler && (existing[i] === listener || existing.indexOf(listener) >= 0)) {
                    result = listener.handler.call(listener.context, listener.owner, data);
                    if (result === false) {
                        return false;
                    }
                }
            }
        },
        __is__: function (type) {
            return this.is(type);
        },
        __has__: function (name) {
            return this.has(name);
        },
        __get__: function (name) {
            return this.get(name);
        },
        __set__: function (name, value) {
            return this.set(name, value);
        },
        __gets__: function () {
            return this.gets();
        },
        __sets__: function (dict) {
            return this.sets(dict);
        }
    };

    NXObject.__classId__ = NXPrototype.__classId__ = 0;
    NXObject.__className__ = NXPrototype.__className__ = 'nx.Object';
    NXObject.__events__ = NXPrototype.__events__ = [];
    NXObject.__properties__ = NXPrototype.__properties__ = [];
    NXObject.__methods__ = NXPrototype.__methods__ = [];
    NXObject.__defaults__ = NXPrototype.__defaults__ = {};
    NXObject.__mixins__ = NXPrototype.__mixins__ = [];
    NXObject.extendEvent = extendEvent;
    NXObject.extendProperty = extendProperty;
    NXObject.extendMethod = extendMethod;

    /**
     * Define an event and attach to target.
     * @method extendEvent
     * @static
     * @param target {Object}
     * @param name {String}
     */
    function extendEvent(target, name) {
        var eventName = eventPrefix + name;
        var exist = target[eventName] && target[eventName].__type__ == 'event';
        var fn = target[eventName] = function (handler, context) {
            var map = this.__listeners__;
            var listeners = map[name] = map[name] || [{
                owner: null,
                handler: null,
                context: null
            }];

            listeners[0] = {
                owner: this,
                handler: handler,
                context: context
            };
        };

        fn.__name__ = name;
        fn.__type__ = 'event';

        if (!exist) {
            target.__events__.push(name);
        }

        return fn;
    }

    /**
     * Define a property and attach to target.
     * @method extendProperty
     * @static
     * @param target {Object}
     * @param name {String}
     * @param meta {Object}
     */
    function extendProperty(target, name, meta) {
        if (nx.is(meta, nx.keyword.internal.Keyword) || !nx.is(meta, "Object")) {
            meta = {
                value: meta
            };
        }
        var defaultValue;
        var exist = target[name] && target[name].__type__ == 'property';
        if (meta.dependencies) {
            if (nx.is(meta.dependencies, "String")) {
                meta.dependencies = meta.dependencies.replace(/\s/g, "").split(",");
            }
            defaultValue = nx.keyword.binding({
                source: meta.dependencies,
                async: true,
                callback: function () {
                    var owner = this.owner;
                    if (meta.update) {
                        meta.update.apply(owner, arguments);
                    }
                    if (nx.is(meta.value, "Function")) {
                        owner.set(name, meta.value.apply(owner, arguments));
                    } else if (!meta.update && !meta.value) {
                        owner.set(name, arguments[0]);
                    }
                }
            });
        } else {
            defaultValue = meta.value;
        }

        if (target[name] && meta.inherits) {
            meta = nx.extend({}, target[name].__meta__, meta);
        }

        var fn = function (value, params) {
            if (value === undefined && arguments.length === 0) {
                return fn.__getter__.call(this, params);
            } else {
                return fn.__setter__.call(this, value, params);
            }
        };

        fn.__name__ = name;
        fn.__type__ = 'property';
        fn.__meta__ = meta;
        fn.__getter__ = meta.get || function () {
            return this['_' + name];
        };

        fn.__setter__ = meta.set || function (value) {
            this['_' + name] = value;
        };

        fn.getMeta = function (key) {
            return key ? fn.__meta__[key] : fn.__meta__;
        };

        if (nx.is(target, "Function") && target.__properties__ && !target.__static__) {
            target.prototype[name] = fn;
        } else {
            target[name] = fn;
        }

        if (defaultValue !== undefined) {
            target.__defaults__[name] = defaultValue;
        }

        if (!exist) {
            if (!nx.is(target, "Function") && target.__properties__ === target.constructor.__properties) {
                target.__properties__ = target.__properties__.slice();
            }
            target.__properties__.push(name);
        }

        return fn;
    }

    /**
     * Define a method and attach to target.
     * @method extendMethod
     * @static
     * @param target {Object}
     * @param name {String}
     * @param method {Function}
     */
    function extendMethod(target, name, method) {
        var exist = target[name] && target[name].__type__ == 'method';

        if (target[name] && target[name] !== method) {
            method.__super__ = target[name];
        }

        method.__name__ = name;
        method.__type__ = 'method';
        method.__meta__ = {};

        target[name] = method;

        if (!exist) {
            target.__methods__.push(name);
        }
    }

    /**
     * Define a class
     * @method define
     * @param [type] {String}
     * @param [parent] {Function}
     * @param [members] {Object}
     * @returns {Function}
     */
    function define(type, parent, members) {
        if (!members) {
            if (nx.is(parent, 'Object')) {
                members = parent;
                parent = null;

                if (nx.is(type, 'Function')) {
                    parent = type;
                    type = null;
                }
            } else if (!parent) {
                if (nx.is(type, 'Object')) {
                    members = type;
                    type = null;
                } else if (nx.is(type, 'Function')) {
                    parent = type;
                    type = null;
                }
            }
        }

        members = members || {};

        var sup = parent || NXObject;
        var mixins = members.mixins || [];
        var events = members.events || [];
        var props = members.properties || {};
        var methods = members.methods || {};
        var static = members.static || false;
        var statics = members.statics || {};
        var prototype;
        var key, i, length;
        var Class, SuperClass;

        if (nx.is(mixins, 'Function')) {
            mixins = [mixins];
        }

        if (sup.__static__) {
            throw new Error('Static class cannot be inherited.');
        }

        if (static) {
            Class = function () {
                throw new Error('Cannot instantiate static class.');
            };

            Class.__classId__ = classId++;
            Class.__className__ = type ? type : 'Anonymous';
            Class.__static__ = true;
            Class.__events__ = [];
            Class.__properties__ = [];
            Class.__methods__ = [];
            Class.__defaults__ = {};

            for (i = 0, length = events.length; i < length; i++) {
                extendEvent(Class, events[i]);
            }

            for (key in props) {
                if (props.hasOwnProperty(key)) {
                    extendProperty(Class, key, props[key]);
                }
            }

            for (key in methods) {
                if (methods.hasOwnProperty(key)) {
                    extendMethod(Class, key, methods[key]);
                }
            }

            for (key in statics) {
                if (statics.hasOwnProperty(key)) {
                    Class[key] = statics[key];
                }
            }

            nx.each(Class.__defaults__, function (value, name) {
                if (nx.is(value, "Function")) {
                    this["_" + name] = value.call(this);
                } else if (nx.is(value, nx.keyword.internal.Keyword)) {
                    switch (value.type) {
                    case "binding":
                        // FIXME memory leak
                        value.apply(this, name);
                        break;
                    }
                } else {
                    this["_" + name] = value;
                }
            }, Class);

            if (methods.init) {
                methods.init.call(Class);
            }
        } else {
            Class = function () {
                // get the real arguments
                var args = arguments[0];
                if (Object.prototype.toString.call(args) !== "[object Arguments]") {
                    args = arguments;
                }

                var mixins = this.__mixins__;
                this.__id__ = instanceId++;
                this.__listeners__ = {};
                this.__bindings__ = this.__bindings__ || {};
                this.__watchers__ = this.__watchers__ || {};
                this.__keyword_bindings__ = this.__keyword_bindings__ || [];
                this.__keyword_watchers__ = this.__keyword_watchers__ || {};
                this.__keyword_init__ = this.__keyword_init__ || [];

                this.__initializing__ = true;

                for (var i = 0, length = mixins.length; i < length; i++) {
                    var ctor = mixins[i].__ctor__;
                    if (ctor) {
                        ctor.call(this);
                    }
                }

                nx.each(Class.__defaults__, function (value, name) {
                    if (nx.is(value, "Function")) {
                        this["_" + name] = value.call(this);
                    } else if (nx.is(value, nx.keyword.internal.Keyword)) {
                        // FIXME memory leak
                        // FIXME bind order
                        this.__keyword_bindings__.push({
                            name: name,
                            definition: value
                        });
                    } else {
                        this["_" + name] = value;
                    }
                }, this);

                nx.each(Class.__properties__, function (name) {
                    var prop = this[name];
                    if (!prop || prop.__type__ !== "property") {
                        return;
                    }
                    var meta = prop.__meta__,
                        watcher = meta.watcher,
                        init = meta.init;
                    if (watcher && this.watch) {
                        if (nx.is(watcher, "String")) {
                            watcher = this[watcher];
                        }
                        this.watch(name, watcher.bind(this));
                        this.__keyword_watchers__[name] = watcher;
                    }
                    if (init) {
                        this.__keyword_init__.push(init);
                    }
                }, this);

                nx.each(this.__keyword_bindings__, function (binding) {
                    binding.instance = binding.definition.apply(this, binding.name);
                }, this);

                nx.each(this.__keyword_init__, function (init) {
                    init.apply(this, args);
                }, this);

                if (this.__ctor__) {
                    this.__ctor__.apply(this, args);
                }

                nx.each(this.__keyword_watchers__, function (watcher, name) {
                    watcher.call(this, name, this[name].call(this));
                }, this);

                nx.each(this.__keyword_bindings__, function (binding) {
                    binding.instance.notify();
                }, this);

                this.__initializing__ = false;
            };

            SuperClass = function () {};

            SuperClass.prototype = sup.prototype;
            prototype = new SuperClass();
            prototype.constructor = Class;
            prototype.__events__ = sup.__events__.slice(0);
            prototype.__properties__ = sup.__properties__.slice(0);
            prototype.__methods__ = sup.__methods__.slice(0);
            prototype.__defaults__ = nx.clone(sup.__defaults__);
            prototype.__mixins__ = sup.__mixins__.concat(mixins);

            Class.__classId__ = classId++;
            Class.__className__ = prototype.__className__ = type ? type : 'Anonymous';
            Class.__super__ = prototype.__super__ = sup;
            Class.prototype = prototype;

            if (methods.init) {
                prototype.__ctor__ = methods.init;
            }

            for (key in members) {
                if (members.hasOwnProperty(key)) {
                    prototype[metaPrefix + key] = Class[metaPrefix + key] = members[key];
                }
            }

            nx.each(mixins, function (mixin) {
                var mixinPrototype = mixin.prototype;

                nx.each(mixin.__events__, function (name) {
                    extendEvent(prototype, name);
                });

                nx.each(mixin.__properties__, function (name) {
                    extendProperty(prototype, name, mixinPrototype[name].__meta__);
                });

                nx.each(mixin.__methods__, function (name) {
                    if (name !== 'init' && name !== 'dispose') {
                        extendMethod(prototype, name, mixinPrototype[name]);
                    }
                });
            });

            for (i = 0, length = events.length; i < length; i++) {
                extendEvent(prototype, events[i]);
            }

            for (key in props) {
                if (props.hasOwnProperty(key)) {
                    extendProperty(prototype, key, props[key]);
                }
            }

            for (key in methods) {
                if (methods.hasOwnProperty(key)) {
                    extendMethod(prototype, key, methods[key]);
                }
            }

            for (key in statics) {
                if (statics.hasOwnProperty(key)) {
                    Class[key] = statics[key];
                }
            }

            Class.__ctor__ = prototype.__ctor__;
            Class.__events__ = prototype.__events__;
            Class.__properties__ = prototype.__properties__;
            Class.__methods__ = prototype.__methods__;
            Class.__defaults__ = prototype.__defaults__;
            Class.__mixins__ = prototype.__mixins__;
        }

        if (type) {
            nx.path(global, type, Class);
        }

        classes[Class.__classId__] = Class;
        return Class;
    }

    nx.Object = NXObject;
    nx.define = define;
    nx.classes = classes;

})(nx);

(function (nx) {
    var keyword = nx.keyword = nx.keyword || {
        binding: function (source, callback, async) {
            var context = false;
            if (typeof source !== "string") {
                context = !! source.context;
                callback = source.callback;
                async = source.async;
                source = source.source;
            }
            return new nx.keyword.internal.Keyword({
                type: "binding",
                context: context,
                source: source,
                async: async,
                callback: callback
            });
        },
        internal: {
            idle: function () {},
            watch: (function () {
                var single = function (o, path, listener, context) {
                    var keys = path.split(".");

                    function level(parent, idx) {
                        if (parent && idx < keys.length) {
                            var key = keys[idx];
                            // watch on the collection changes
                            if (key == "*" || key == "%") {
                                // TODO handler watching on collection changes
                            } else {
                                var child = nx.path(parent, key);
                                if (parent.watch) {
                                    var pathRest = keys.slice(idx + 1).join("."),
                                        childUnwatch = level(child, idx + 1);
                                    var watcher = function (pname, pnewvalue, poldvalue) {
                                        var newvalue = pathRest ? nx.path(pnewvalue, pathRest) : pnewvalue;
                                        var oldvalue = pathRest ? nx.path(poldvalue, pathRest) : poldvalue;
                                        listener.call(context || o, path, newvalue, oldvalue);
                                        if (pnewvalue !== child) {
                                            childUnwatch();
                                            child = pnewvalue;
                                            childUnwatch = level(child, idx + 1);
                                        }
                                    };
                                    parent.watch(key, watcher, parent);
                                    return function () {
                                        childUnwatch();
                                        parent.unwatch(key, watcher, parent);
                                    };
                                } else if (child) {
                                    return level(child, idx + 1);
                                }
                            }
                        }
                        return keyword.internal.idle;
                    }
                    var unwatch = level(o, 0);
                    return {
                        unwatch: unwatch,
                        notify: function () {
                            var value = nx.path(o, path);
                            listener.call(context || o, path, value, value);
                        }
                    };
                };

                var singleWithCollection = function (o, path, listener, context) {
                    var collman = {
                        collection: null,
                        unlistener: null,
                        listener: function (collection, evt) {
                            listener.call(context || o, path, collection, evt);
                        },
                        update: function (value) {
                            if (collman.collection === value) {
                                return;
                            }
                            /* jslint -W030 */
                            collman.unlistener && collman.unlistener();
                            if (value && value.is && value.is(nx.data.ObservableCollection)) {
                                value.on("change", collman.listener, o);
                                collman.unlistener = function () {
                                    value.off("change", collman.listener, o);
                                };
                            } else {
                                collman.unlistener = null;
                            }
                            collman.collection = value;
                        }
                    };
                    collman.update(nx.path(o, path));
                    var unwatcher = single(o, path, function (path, value) {
                        collman.update(value);
                        listener.call(context || o, path, value);
                    }, context);
                    return {
                        unwatch: function () {
                            unwatcher.unwatch();
                            /* jslint -W030 */
                            collman.unlistener && collman.unlistener();
                        },
                        notify: unwatcher.notify
                    };
                };

                return function (target, paths, update) {
                    if (!target || !paths || !update) {
                        return;
                    }
                    // apply the watching
                    var deps;
                    if (nx.is(paths, "String")) {
                        deps = paths.replace(/\s/g, "").split(",");
                    } else {
                        deps = paths;
                    }
                    nx.each(deps, function (v, i) {
                        if (/^\d+$/.test(v)) {
                            deps[i] = v * 1;
                        }
                    });
                    var unwatchers = [],
                        vals = [];
                    var notify = function (key, diff) {
                        var values = vals.slice();
                        values.push(key);
                        /* jslint -W030 */
                        diff && values.push(diff);
                        update.apply(target, values);
                    };
                    for (i = 0; i < deps.length; i++) {
                        /* jslint -W083 */
                        (function (idx) {
                            vals[idx] = nx.path(target, deps[idx]);
                            var unwatcher = singleWithCollection(target, deps[idx], function (path, value, diff) {
                                vals[idx] = value;
                                notify(deps[idx], diff);
                            });
                            unwatchers.push(unwatcher);
                        })(i);
                    }
                    return {
                        notify: notify,
                        release: function () {
                            while (unwatchers.length) {
                                unwatchers.shift().unwatch();
                            }
                        }
                    };
                };
            })(),
            Keyword: (function () {
                var Keyword = function (options) {
                    nx.sets(this, options);
                };
                Keyword.prototype = {
                    apply: function (o, pname) {
                        var binding = {
                            owner: o,
                            property: pname,
                            set: o && pname && function (v) {
                                o.set(pname, v);
                                return o.get(pname);
                            }
                        };
                        var watching = nx.keyword.internal.watch(o, this.source, function () {
                            var rslt;
                            if (this.callback) {
                                rslt = this.callback.apply(this.context ? binding.owner : binding, arguments);
                            } else {
                                rslt = arguments[0];
                            }
                            if (!this.async) {
                                binding.set(rslt);
                            }
                        }.bind(this));
                        return watching;
                    }
                };
                return Keyword;
            })()
        }
    };
})(nx);

(function (nx) {

    /**
     * @class Iterable
     * @namespace nx
     */
    var Iterable = nx.define('nx.Iterable', {
        statics: {
            /**
             * Get the iteration function from an iterable object.
             * @method getIterator
             * @static
             * @param iter {Object|Array|nx.Iterable}
             * @returns {Function}
             */
            getIterator: function (iter) {
                if (nx.is(iter, Iterable)) {
                    return function (callback, context) {
                        iter.each(callback, context);
                    };
                }
                else {
                    return function (callback, context) {
                        nx.each(iter, callback, context);
                    };
                }
            },
            /**
             * Convert the iterable object to an array.
             * @method toArray
             * @static
             * @param iter {Object|Array|nx.Iterable}
             * @returns {Array}
             */
            toArray: function (iter) {
                if (nx.is(iter, Iterable)) {
                    return iter.toArray();
                }
                else if (nx.is(iter, 'Array')) {
                    return iter.slice(0);
                }
                else {
                    var result = [];
                    nx.each(iter, function (item) {
                        result.push(item);
                    });

                    return result;
                }
            }
        },
        properties: {
            /**
             * @property count {Number}
             */
            count: {
                get: function () {
                    return this.toArray().length;
                }
            }
        },
        methods: {
            /**
             * @method each
             * @param callback
             * @param context
             */
            each: function (callback, context) {
                throw new Error('Not Implemented.');
            },
            /**
             * @method toArray
             * @returns {Array}
             */
            toArray: function () {
                var result = [];
                this.each(function (item) {
                    result.push(item);
                });

                return result;
            },
            __each__: function (callback, context) {
                return this.each(callback, context);
            }
        }
    });
})(nx);
(function (nx) {
    /**
     * @class Observable
     * @namespace nx
     */
    var Observable = nx.define('nx.Observable', {
        statics: {
            extendProperty: function extendProperty(target, name, meta) {
                var property = nx.Object.extendProperty(target, name, meta);
                if (property && property.__type__ == 'property') {
                    if (!property._watched) {
                        var setter = property.__setter__;
                        var dependencies = property.getMeta('dependencies');
                        nx.each(dependencies, function (dep) {
                            this.watch(dep, function () {
                                this.notify(name);
                            }, this);
                        }, this);

                        property.__setter__ = function (value, params) {
                            var oldValue = this.get(name);
                            if (oldValue !== value) {
                                if (setter.call(this, value, params) !== false) {
                                    return this.notify(name, oldValue);
                                }
                            }

                            return false;
                        };

                        property._watched = true;
                    }
                }

                return property;
            },
            /**
             * This method in order to watch the change of specified path of specified target.
             * @static
             * @method watch
             * @param target The target observable object.
             * @param path The path to be watched.
             * @param callback The callback function accepting arguments list: (path, newvalue, oldvalue).
             * @param context (Optional) The context which the callback will be called with.
             * @return Resource stub object, with release and affect methods.
             *  <p>release: unwatch the current watching.</p>
             *  <p>affect: invoke the callback with current value immediately.</p>
             */
            watch: function (target, path, callback, context) {
                var keys = (typeof path === "string" ? path.split(".") : path);
                var iterate = function (parent, idx) {
                    if (parent && idx < keys.length) {
                        var key = keys[idx];
                        var child = nx.path(parent, key);
                        if (parent.watch) {
                            var rkeys = keys.slice(idx + 1);
                            var iter = iterate(child, idx + 1);
                            var watch = parent.watch(key, function (pname, pnewvalue, poldvalue) {
                                var newvalue = nx.path(pnewvalue, rkeys);
                                var oldvalue = nx.path(poldvalue, rkeys);
                                callback.call(context || target, path, newvalue, oldvalue);
                                if (pnewvalue !== child) {
                                    iter && iter.release();
                                    child = pnewvalue;
                                    iter = iterate(child, idx + 1);
                                }
                            });
                            return {
                                release: function () {
                                    iter && iter.release();
                                    watch.release();
                                }
                            };
                        } else if (child) {
                            return iterate(child, idx + 1);
                        }
                    }
                    return {
                        release: nx.idle
                    };
                };
                var iter = iterate(target, 0);
                return {
                    release: iter.release,
                    affect: function () {
                        var value = nx.path(target, path);
                        callback.call(context || target, path, value, value);
                    }
                };
            },
            /**
             * Monitor several paths of target at the same time, any value change of any path will trigger the callback with all values of all paths.
             * @static
             * @method monitor
             * @param target The target observable object.
             * @param pathlist The path list to be watched.
             * @param callback The callback function accepting arguments list: (value1, value2, value3, ..., changed_path, changed_old_value).
             * @return Resource stub object, with release and affect methods.
             *  <p>release: release the current monitoring.</p>
             *  <p>affect: invoke the callback with current values immediately.</p>
             */
            monitor: function (target, pathlist, callback) {
                if (!target || !pathlist || !callback) {
                    return;
                }
                // apply the cascading
                var i, paths, resources, values;
                paths = typeof pathlist === "string" ? pathlist.replace(/\s/g, "").split(",") : pathlist;
                resources = [];
                values = [];
                var affect = function (path, oldvalue) {
                    var args = values.slice();
                    args.push(path, oldvalue);
                    callback.apply(target, args);
                };
                for (i = 0; i < paths.length; i++) {
                    (function (idx) {
                        values[idx] = nx.path(target, paths[idx]);
                        var resource = Observable.watch(target, paths[idx], function (path, value) {
                            var oldvalue = values[idx];
                            values[idx] = value;
                            affect(paths[idx], oldvalue);
                        });
                        resources.push(resource);
                    })(i);
                }
                return {
                    affect: affect,
                    release: function () {
                        while (resources.length) {
                            resources.shift().release();
                        }
                    }
                };
            }
        },
        methods: {
            /**
             * @constructor
             */
            init: function () {
                this.__bindings__ = this.__bindings__ || {};
                this.__watchers__ = this.__watchers__ || {};
            },
            /**
             * Dispose current object.
             * @method dispose
             */
            dispose: function () {
                this.inherited();
                nx.each(this.__bindings__, function (binding) {
                    binding.dispose();
                });
                this.__bindings__ = {};
                this.__watchers__ = {};
            },
            /**
             * @method
             * @param names
             * @param handler
             * @param context
             */
            watch: function (names, handler, context) {
                var resources = [];
                nx.each(names == '*' ? this.__properties__ : (nx.is(names, 'Array') ? names : [names]), function (name) {
                    resources.push(this._watch(name, handler, context));
                }, this);
                return {
                    affect: function () {
                        nx.each(resources, function (resource) {
                            resource.affect();
                        });
                    },
                    release: function () {
                        nx.each(resources, function (resource) {
                            resource.release();
                        });
                    }
                };
            },
            /**
             * @method unwatch
             * @param names
             * @param handler
             * @param context
             */
            unwatch: function (names, handler, context) {
                nx.each(names == '*' ? this.__properties__ : (nx.is(names, 'Array') ? names : [names]), function (name) {
                    this._unwatch(name, handler, context);
                }, this);
            },
            /**
             * @method notify
             * @param names
             * @param oldValue
             */
            notify: function (names, oldValue) {
                if (names == '*') {
                    nx.each(this.__watchers__, function (value, name) {
                        this._notify(name, oldValue);
                    }, this);
                } else {
                    nx.each(nx.is(names, 'Array') ? names : [names], function (name) {
                        this._notify(name, oldValue);
                    }, this);
                }

            },
            /**
             * Get existing binding object for specified property.
             * @method getBinding
             * @param prop
             * @returns {*}
             */
            getBinding: function (prop) {
                return this.__bindings__[prop];
            },
            /**
             * Set binding for specified property.
             * @method setBinding
             * @param prop
             * @param expr
             * @param source
             */
            setBinding: function (prop, expr, source) {
                var binding = this.__bindings__[prop];
                var params = {};

                if (nx.is(expr, 'String')) {
                    var tokens = expr.split(',');
                    var path = tokens[0];
                    var i = 1,
                        length = tokens.length;

                    for (; i < length; i++) {
                        var pair = tokens[i].split('=');
                        params[pair[0]] = pair[1];
                    }

                    params.target = this;
                    params.targetPath = prop;
                    params.sourcePath = path;
                    params.source = source;
                    if (params.converter) {
                        params.converter = Binding.converters[params.converter] || nx.path(window, params.converter);
                    }

                } else {
                    params = nx.clone(expr);
                    params.target = this;
                    params.targetPath = prop;
                    params.source = params.source || this;
                }

                if (binding) {
                    binding.destroy();
                }

                this.__bindings__[prop] = new Binding(params);
            },
            /**
             * Clear binding for specified property.
             * @method clearBinding
             * @param prop
             */
            clearBinding: function (prop) {
                var binding = this.__bindings__[prop];
                if (binding) {
                    binding.destroy();
                    this.__bindings__[prop] = null;
                }
            },
            _watch: function (name, handler, context) {
                var map = this.__watchers__;
                var watchers = map[name] = map[name] || [];
                var property = this[name];
                var watcher = {
                    owner: this,
                    handler: handler,
                    context: context
                };

                watchers.push(watcher);

                if (property && property.__type__ == 'property') {
                    if (!property._watched) {
                        var setter = property.__setter__;
                        var dependencies = property.getMeta('dependencies');
                        var equalityCheck = property.getMeta('equalityCheck');
                        nx.each(dependencies, function (dep) {
                            this.watch(dep, function () {
                                this.notify(name);
                            }, this);
                        }, this);

                        property.__setter__ = function (value, params) {
                            var oldValue = this.get(name);
                            if (oldValue !== value || (params && params.force) || equalityCheck === false) {
                                if (setter.call(this, value, params) !== false) {
                                    return this.notify(name, oldValue);
                                }
                            }

                            return false;
                        };

                        property._watched = true;
                    }
                }
                return {
                    affect: function () {
                        var value = watcher.owner.get(name);
                        if (watcher && watcher.handler) {
                            watcher.handler.call(watcher.context || watcher.owner, name, value, value, watcher.owner);
                        }
                    },
                    release: function () {
                        var idx = watchers.indexOf(watcher);
                        if (idx >= 0) {
                            watchers.splice(idx, 1);
                        }
                    }
                };
            },
            _unwatch: function (name, handler, context) {
                var map = this.__watchers__;
                var watchers = map[name],
                    watcher;

                if (watchers) {
                    if (handler) {
                        for (var i = 0, length = watchers.length; i < length; i++) {
                            watcher = watchers[i];
                            if (watcher.handler == handler && watcher.context == context) {
                                watchers.splice(i, 1);
                                break;
                            }
                        }
                    } else {
                        watchers.length = 0;
                    }
                }
            },
            _notify: function (name, oldValue) {
                var i, watcher, calling, existing = this.__watchers__[name];
                calling = existing ? existing.slice() : [];
                for (i = 0; i < calling.length; i++) {
                    watcher = calling[i];
                    if (watcher && watcher.handler && (watcher === existing[i] || existing.indexOf(watcher) >= 0)) {
                        watcher.handler.call(watcher.context || watcher.owner, name, this.get(name), oldValue, watcher.owner);
                    }

                }
            }
        }
    });

    var Binding = nx.define('nx.Binding', Observable, {
        statics: {
            converters: {
                boolean: {
                    convert: function (value) {
                        return !!value;
                    },
                    convertBack: function (value) {
                        return !!value;
                    }
                },
                inverted: {
                    convert: function (value) {
                        return !value;
                    },
                    convertBack: function (value) {
                        return !value;
                    }
                },
                number: {
                    convert: function (value) {
                        return Number(value);
                    },
                    convertBack: function (value) {
                        return value;
                    }
                }
            },
            /**
             * @static
             */
            format: function (expr, target) {
                if (expr) {
                    return expr.replace('{0}', target);
                } else {
                    return '';
                }
            }
        },
        properties: {
            /**
             * Get the target object of current binding.
             */
            target: {
                value: null
            },
            /**
             * Get the target path of current binding.
             */
            targetPath: {
                value: ''
            },
            /**
             * Get the source path of current binding.
             */
            sourcePath: {
                value: ''
            },
            /**
             * Get or set the source of current binding.
             */
            source: {
                get: function () {
                    return this._source;
                },
                set: function (value) {
                    if (this._initialized && this._source !== value) {
                        this._rebind(0, value);
                        if (this._direction[0] == '<') {
                            this._updateTarget();
                        }
                        this._source = value;
                    }
                }
            },
            /**
             * Get or set the binding type.
             */
            bindingType: {
                value: 'auto'
            },
            /**
             * Get the direction for current binding.
             */
            direction: {
                value: 'auto'
            },
            /**
             * Get the trigger for current binding.
             */
            trigger: {
                value: 'auto'
            },
            /**
             * Get the format for current binding.
             */
            format: {
                value: 'auto'
            },
            /**
             * Get the converter for current binding.
             */
            converter: {
                value: 'auto'
            }
        },
        methods: {
            init: function (config) {
                this.sets(config);
                if (config.target) {
                    var target = this.target();
                    var targetPath = this.targetPath();
                    var sourcePath = this.sourcePath();
                    var bindingType = this.bindingType();
                    var direction = this.direction();
                    var format = this.format();
                    var converter = this.converter();
                    var targetMember = target[targetPath];
                    var watchers = this._watchers = [];
                    var keys = this._keys = sourcePath.split('.'),
                        key;
                    var i = 0,
                        length = keys.length;
                    var self = this;

                    if (targetMember) {
                        var bindingMeta = targetMember.__meta__.binding;

                        if (bindingType == 'auto') {
                            bindingType = targetMember.__type__;
                        }

                        if (direction == 'auto') {
                            direction = this._direction = (bindingMeta && bindingMeta.direction) || '<-';
                        }

                        if (format == 'auto') {
                            format = bindingMeta && bindingMeta.format;
                        }

                        if (converter == 'auto') {
                            converter = bindingMeta && bindingMeta.converter;
                        }
                    } else {
                        if (bindingType == 'auto') {
                            bindingType = target.can(targetPath) ? 'event' : 'property';
                        }

                        if (direction == 'auto') {
                            direction = this._direction = '<-';
                        }

                        if (format == 'auto') {
                            format = null;
                        }

                        if (converter == 'auto') {
                            converter = null;
                        }
                    }

                    if (converter) {
                        if (nx.is(converter, 'Function')) {
                            converter = {
                                convert: converter,
                                convertBack: function (value) {
                                    return value;
                                }
                            };
                        }
                    }

                    if (direction[0] == '<') {
                        for (; i < length; i++) {
                            watchers.push({
                                key: keys[i],
                                /*jshint -W083*/
                                handler: (function (index) {
                                    return function (property, value) {
                                        self._rebind(index, value);
                                        self._updateTarget();
                                    };
                                })(i + 1)
                            });
                        }
                    }

                    if (bindingType == 'event') {
                        key = watchers[length - 1].key;
                        watchers.length--;
                        this._updateTarget = function () {
                            var actualValue = this._actualValue;
                            if (actualValue) {
                                target.upon(targetPath, actualValue[key], actualValue);
                            }
                        };
                    } else {
                        this._updateTarget = function () {
                            var actualValue = this._actualValue;
                            if (converter) {
                                actualValue = converter.convert.call(this, actualValue);
                            }

                            if (format) {
                                actualValue = Binding.format(format, actualValue);
                            }

                            nx.path(target, targetPath, actualValue);
                        };
                    }

                    if (direction[1] == '>') {
                        if (target.watch && target.watch.__type__ === 'method') {
                            target.watch(targetPath, this._onTargetChanged = function (property, value) {
                                var actualValue = value;
                                if (converter) {
                                    actualValue = converter.convertBack.call(this, actualValue);
                                }
                                nx.path(this.source(), sourcePath, actualValue);
                            }, this);
                        }
                    }

                    this._initialized = true;
                    this.source(config.source);
                }
            },
            dispose: function () {
                var target = this._target;
                this._rebind(0, null);
            },
            _rebind: function (index, value) {
                var watchers = this._watchers;
                var newSource = value,
                    oldSource;

                for (var i = index, length = watchers.length; i < length; i++) {
                    var watcher = watchers[i];
                    var key = watcher.key;
                    var handler = watcher.handler;

                    oldSource = watcher.source;

                    if (oldSource && oldSource.unwatch && oldSource.unwatch.__type__ === 'method') {
                        oldSource.unwatch(key, handler, this);
                    }

                    watcher.source = newSource;

                    if (newSource) {
                        if (newSource.watch && newSource.watch.__type__ === 'method') {
                            newSource.watch(key, handler, this);
                        }

                        if (newSource.get) {
                            newSource = newSource.get(key);
                        } else {
                            newSource = newSource[key];
                        }
                    }
                }

                this._actualValue = newSource;
            }
        }
    });

})(nx);

(function (nx) {

    /**
     * @class Counter
     * @namespace nx.data
     * @uses nx.Observable
     */
    var EXPORT = nx.define("nx.data.Counter", {
        events: [
            /**
             * An event which notifies the happening of a count change of item.
             * @event change
             * @param {Object} evt The event object with item, count, previousCount.
             */
            'change',
            /**
             * Same as change event but only happens on count increasing.
             * @event increase
             * @param {Object} evt The event object with item, count, previousCount.
             */
            'increase',
            /**
             * Same as change event but only happens on count decreasing.
             * @event decrease
             * @param {Object} evt The event object with item, count, previousCount.
             */
            'decrease'
        ],
        methods: {
            init: function () {
                this._nummap = {};
                this._strmap = {};
                this._objmap = [];
                this._nxomap = {};
                this._null = 0;
                this._true = 0;
                this._false = 0;
                this._undefined = 0;
            },
            /**
             * Get count of specified item.
             *
             * @method getCount
             * @param {Any} item The counting item.
             * @return Count of the item.
             */
            getCount: function (item) {
                // XXX PhantomJS bug
                if (Object.prototype.toString.call(null) !== "[object Null]") {
                    if (item === null) {
                        return this._null;
                    } else if (item === undefined) {
                        return this._undefined;
                    }
                }
                // check the type
                switch (Object.prototype.toString.call(item)) {
                case "[object Null]":
                    return this._null;
                case "[object Boolean]":
                    return item ? this._true : this._false;
                case "[object Undefined]":
                    return this._undefined;
                case "[object Number]":
                    return this._nummap[item] || 0;
                case "[object String]":
                    return this._strmap[item] || 0;
                default:
                    if (item.__id__) {
                        return this._nxomap[item.__id__] || 0;
                    } else {
                        return EXPORT.getArrayMapValue(this._objmap, item) || 0;
                    }
                }
            },
            /**
             * Set count of specified item.
             *
             * @method setCount
             * @param {Any} item The counting item.
             * @param {Number} count The count to be set.
             * @return Set result count.
             */
            setCount: function (item, count) {
                // XXX PhantomJS bug
                if (Object.prototype.toString.call(null) !== "[object Null]") {
                    if (item === null) {
                        this._null = count;
                    } else if (item === undefined) {
                        this._undefined = count;
                    }
                }
                // XXX optimizable for obj-map
                var previousCount = this.getCount(item);
                // check if change happening
                if (previousCount === count) {
                    return count;
                }
                // change count
                switch (Object.prototype.toString.call(item)) {
                case "[object Null]":
                    this._null = count;
                    break;
                case "[object Boolean]":
                    if (item) {
                        this._true = count;
                    } else {
                        this._false = count;
                    }
                    break;
                case "[object Undefined]":
                    this._undefined = count;
                    break;
                case "[object Number]":
                    this._nummap[item] = count;
                    break;
                case "[object String]":
                    this._strmap[item] = count;
                    break;
                default:
                    if (item.__id__) {
                        this._nxomap[item.__id__] = count;
                    } else {
                        EXPORT.setArrayMapValue(this._objmap, item, count);
                    }
                    break;
                }
                // trigger events
                var event = {
                    item: item,
                    previousCount: previousCount,
                    count: count
                };
                if (previousCount > count) {
                    this.fire('decrease', event);
                } else {
                    this.fire('increase', event);
                }
                this.fire('change', event);
                return count;
            },
            /**
             * Increase the count of given item.
             *
             * @method increase
             * @param {Any} item The item to count.
             * @param {Number} increment The increment, default 1.
             * @return The increasing result
             */
            increase: function (inItem, i) {
                i = arguments.length > 1 ? Math.floor(i * 1 || 0) : 1;
                return this.setCount(inItem, this.getCount(inItem) + i);
            },
            /**
             * Decrease the count of given item.
             *
             * @method decrease
             * @param {Any} item The item to count.
             * @param {Number} decrement The decrement, default 1.
             * @return The decreasing result
             */
            decrease: function (inItem, i) {
                i = arguments.length > 1 ? Math.floor(i * 1 || 0) : 1;
                return this.setCount(inItem, this.getCount(inItem) - i);
            },
            __addArrayItem: function (inItem) {
                this._arrcache.push(inItem);
            },
            __removeArrayItem: function (inItem) {
                var index = this._arrcache.indexOf(inItem);
                this._arrcache.splice(index, 1);
            },
            __getArrayCounter: function (inItem) {
                var counter = 0;
                nx.each(this._arrcache, function (item) {
                    if (inItem === item) {
                        counter++;
                    }
                });
                return counter;
            }
        },
        statics: {
            _getArrayMapItem: function (map, key) {
                return map.filter(function (item) {
                    return item.key === key;
                })[0];
            },
            getArrayMapValue: function (map, key) {
                return (EXPORT._getArrayMapItem(map, key) || {}).value;
            },
            setArrayMapValue: function (map, key, value) {
                var item = EXPORT._getArrayMapItem(map, key);
                if (!item) {
                    map.push({
                        key: key,
                        value: value
                    });
                } else {
                    item.value = value;
                }
                return value;
            }
        }
    });

})(nx);

(function (nx) {
    var Iterable = nx.Iterable;

    /**
     * @class Collection
     * @namespace nx.data
     * @extends nx.Iterable
     * @constructor
     * @param iter
     */
    var Collection = nx.define('nx.data.Collection', Iterable, {
        properties: {
            /**
             * @property count
             * @type {Number}
             */
            count: {
                get: function () {
                    return this._data.length;
                },
                set: function () {
                    throw new Error("Unable to set count of Collection");
                }
            },
            /**
             * @property length
             * @type {Number}
             */
            length: {
                get: function () {
                    return this._data.length;
                },
                set: function () {
                    throw new Error("Unable to set length of Collection");
                }
            },
            unique: {
                set: function (unique) {
                    // check if the unique status is change
                    /* jshint -W018 */
                    if ( !! this._unique === !! unique) {
                        return;
                    }
                    this._unique = !! unique;
                    if (unique) {
                        // remove duplicated items
                        var data = this._data;
                        var i, len = data.length;
                        for (i = len - 1; i > 0; i--) {
                            if (this.indexOf(data[i]) < i) {
                                this.removeAt(i);
                            }
                        }
                    }
                }
            }
        },
        methods: {
            init: function (iter) {
                var data = this._data = [];
                if (nx.is(iter, Iterable)) {
                    this._data = iter.toArray();
                } else {
                    Iterable.getIterator(iter)(function (item) {
                        data.push(item);
                    });
                }
            },
            /**
             * Add an item.
             *
             * @method add
             * @param item
             * @return added item. Null if fail to add, e.g. duplicated add into unique collection.
             */
            add: function (item) {
                if (!this._unique || this.indexOf(item) == -1) {
                    this._data.push(item);
                    return item;
                }
                return null;
            },
            /**
             * Add multiple items. Will avoid duplicated items for unique collection.
             *
             * @method addRange
             * @param iter
             * @returns array of added items.
             */
            addRange: function (iter) {
                var data = this._data;
                var i, items = Iterable.toArray(iter).slice();
                // check for unique
                if (this._unique) {
                    for (i = items.length - 1; i >= 0; i--) {
                        if (this.indexOf(items[i]) >= 0 || items.indexOf(items[i]) < i) {
                            items.splice(i, 1);
                        }
                    }
                }
                data.splice.apply(data, [data.length, 0].concat(items));
                return items;
            },
            /**
             * @method remove
             * @param item
             * @returns Removed item's index, -1 if not found.
             */
            remove: function (item) {
                var self = this;
                var remove = function (item) {
                    var index = self.indexOf(item);
                    if (index >= 0) {
                        self._data.splice(index, 1);
                        return index;
                    } else {
                        return -1;
                    }
                };
                if (arguments.length > 1) {
                    var i, indices = [];
                    for (i = arguments.length - 1; i >= 0; i--) {
                        indices.unshift(remove(arguments[i]));
                    }
                    return indices;
                } else {
                    return remove(item);
                }
            },
            /**
             * @method removeAt
             * @param index
             * @returns Removed item.
             */
            removeAt: function (index) {
                return this._data.splice(index, 1)[0];
            },
            /**
             * @method insert
             * @param item
             * @param index
             */
            insert: function (item, index) {
                if (!this._unique || this.indexOf(item) == -1) {
                    this._data.splice(index, 0, item);
                    return item;
                }
                return null;
            },
            /**
             * @method insertRange
             * @param index
             * @param iter
             * @returns {*}
             */
            insertRange: function (iter, index) {
                var data = this._data;
                var i, items = Iterable.toArray(iter).slice();
                // check for unique
                if (this._unique) {
                    for (i = items.length - 1; i >= 0; i--) {
                        if (this.indexOf(items[i]) >= 0 || items.indexOf(items[i]) < i) {
                            items.splice(i, 1);
                        }
                    }
                }
                data.splice.apply(data, [index, 0].concat(items));
                return items;
            },
            /**
             * @method clear
             * @returns {*}
             */
            clear: function () {
                var items = this._data.slice();
                this._data.length = 0;
                return items;
            },
            /**
             * @method getItem
             * @param index
             * @returns {*}
             */
            getItem: function (index) {
                return this._data[index];
            },
            /**
             * @method getRange
             * @param index
             * @param count
             * @returns {Collection}
             */
            getRange: function (index, count) {
                return new Collection(this._data.slice(index, index + count));
            },
            /**
             * Get the first index the given item appears in the collection, -1 if not found.
             *
             * @method indexOf
             * @param item
             * @returns {*}
             */
            indexOf: function (item) {
                var data = this._data;
                if (data.indexOf) {
                    return data.indexOf(item);
                } else {
                    for (var i = 0, length = data.length; i < length; i++) {
                        if (nx.compare(data[i], item) === 0) {
                            return i;
                        }
                    }
                    return -1;
                }
            },
            /**
             * @method lastIndexOf
             * @param item
             * @returns {*}
             */
            lastIndexOf: function (item) {
                var data = this._data;
                if (data.lastIndexOf) {
                    return data.lastIndexOf(item);
                } else {
                    for (var i = data.length - 1; i >= 0; i--) {
                        if (nx.compare(data[i], item) === 0) {
                            return i;
                        }
                    }

                    return -1;
                }
            },
            /**
             * @method contains
             * @param item
             * @returns {boolean}
             */
            contains: function (item) {
                return this.indexOf(item) >= 0;
            },
            /**
             * Toggle item's existence.
             * @method toggle
             * @param item
             */
            toggle: function (item, existence) {
                if (arguments.length <= 1) {
                    if (this.contains(item)) {
                        this.remove(item);
                    } else {
                        this.add(item);
                    }
                } else if (existence) {
                    this.add(item);
                } else {
                    this.remove(item);
                }
            },
            /**
             * @method sort
             * @param comp
             * @returns {Array}
             */
            sort: function (comp) {
                return this._data.sort(comp);
            },
            /**
             * @method each
             * @param callback
             * @param context
             */
            each: function (callback, context) {
                nx.each(this._data, callback, context);
            },
            /**
             * @method  toArray
             * @returns {Array}
             */
            toArray: function () {
                return this._data.slice(0);
            }
        }
    });
})(nx);

(function (nx) {
    var Iterable = nx.Iterable;

    var DictionaryItem = nx.define({
        properties: {
            key: {},
            value: {
                set: function (value) {
                    if (this._dict) {
                        this._dict.setItem(this._key, value);
                    } else {
                        this._value = value;
                    }
                }
            }
        },
        methods: {
            init: function (dict, key) {
                this._dict = dict;
                this._key = key;
            }
        }
    });

    var KeyIterator = nx.define(Iterable, {
        methods: {
            init: function (dict) {
                this._dict = dict;
            },
            each: function (callback, context) {
                this._dict.each(function (item) {
                    callback.call(context, item.key());
                });
            }
        }
    });

    var ValueIterator = nx.define(Iterable, {
        methods: {
            init: function (dict) {
                this._dict = dict;
            },
            each: function (callback, context) {
                this._dict.each(function (item) {
                    callback.call(context, item.value());
                });
            }
        }
    });

    /**
     * @class Dictionary
     * @namespace nx.data
     * @extends nx.Iterable
     * @constructor
     * @param dict
     */
    var Dictionary = nx.define('nx.data.Dictionary', Iterable, {
        properties: {
            /**
             * @property count
             * @type {Number}
             */
            count: {
                get: function () {
                    return this._items.length;
                }
            },
            /**
             * @property keys
             * @type {Iterable}
             */
            keys: {
                get: function () {
                    return this._keys;
                }
            },
            /**
             * @property values
             * @type {Iterable}
             */
            values: {
                get: function () {
                    return this._values;
                }
            }
        },
        methods: {
            init: function (dict) {
                var map = this._map = {};
                var items = this._items = [];
                this.setItems(dict);
                this._keys = new KeyIterator(this);
                this._values = new ValueIterator(this);
            },
            /**
             * @method contains
             * @param key {String}
             * @returns {Boolean}
             */
            contains: function (key) {
                return key in this._map;
            },
            /**
             * @method getItem
             * @param key {String}
             * @returns {*}
             */
            getItem: function (key) {
                var item = this._map[key];
                return item && item._value;
            },
            /**
             * @method setItem
             * @param key {String}
             * @param value {any}
             */
            setItem: function (key, value) {
                var item = this._map[key];
                if (!item) {
                    item = this._map[key] = new DictionaryItem(this, '' + key);
                    this._items.push(item);
                }
                item._value = value;
                return item;
            },
            /**
             * @method setItems
             * @param dict {Dictionary|Object}
             */
            setItems: function (dict) {
                if (dict) {
                    nx.each(dict, function (value, key) {
                        this.setItem(key, value);
                    }, this);
                }
            },
            /**
             * @method removeItem
             * @param key {String}
             */
            removeItem: function (key) {
                var map = this._map;
                if (!(key in map)) {
                    return;
                }
                var item = map[key];
                var idx = this._items.indexOf(item);
                delete map[key];
                if (idx >= 0) {
                    this._items.splice(idx, 1);
                }
                item._dict = null;
                return item;
            },
            /**
             * @method clear
             */
            clear: function () {
                var items = this._items.slice();
                this._map = {};
                this._items = [];
                nx.each(items, function (item) {
                    item._dict = null;
                });
                return items;
            },
            /**
             * @method each
             * @param callback {Function}
             * @param [context] {Object}
             */
            each: function (callback, context) {
                context = context || this;
                nx.each(this._map, function (item, key) {
                    callback.call(context, item, key);
                });
            },
            /**
             * @method toArray
             * @returns {Array}
             */
            toArray: function () {
                return this._items.slice();
            },
            /**
             * @method toObject
             * @returns {Object}
             */
            toObject: function () {
                var result = {};
                this.each(function (item) {
                    result[item.key()] = item.value();
                });
                return result;
            }
        }
    });
})(nx);

(function (nx) {

    /**
     * @class ObservableObject
     * @namespace nx.data
     * @extends nx.Observable
     */
    nx.define('nx.data.ObservableObject', nx.Observable, {
        methods: {
            init: function (data) {
                this.inherited();
                this._data = data || {};
            },
            /**
             * Dispose current object.
             * @method dispose
             */
            dispose: function () {
                this.inherited();
                this._data = null;
            },
            /**
             * Check whether current object has specified property.
             * @method has
             * @param name {String}
             * @returns {Boolean}
             */
            has: function (name) {
                var member = this[name];
                return (member && member.__type__ == 'property') || (name in this._data);
            },
            /**
             * Get specified property value.
             * @method get
             * @param name {String}
             * @returns {*}
             */
            get: function (name) {
                var member = this[name];
                if (member === undefined) {
                    return this._data[name];
                }
                else if (member.__type__ == 'property') {
                    return member.call(this);
                }
            },
            /**
             * Set specified property value.
             * @method set
             * @param name {String}
             * @param value {*}
             */
            set: function (name, value) {
                var member = this[name];
                if (member === undefined) {
                    if (this._data[name] !== value) {
                        this._data[name] = value;
                        this.notify(name);
                        return true;
                    }
                }
                else if (member.__type__ == 'property') {
                    return member.call(this, value);
                }
            },
            /**
             * Get all properties.
             * @method gets
             * @returns {Object}
             */
            gets: function () {
                var result = nx.clone(this._data);
                nx.each(this.__properties__, function (name) {
                    result[name] = this.get(name);
                }, this);

                return result;
            }
        }
    });
})(nx);
(function (nx) {

    var REGEXP_CHECK = /^(&&|\|\||&|\||\^|-|\(|\)|[a-zA-Z\_][a-zA-Z\d\_]*|\s)*$/;
    var REGEXP_TOKENS = /&&|\|\||&|\||\^|-|\(|\)|[a-zA-Z\_][a-zA-Z\d\_]*/g;
    var REGEXP_OPN = /[a-zA-Z\_][a-zA-Z\d\_]*/;
    var REGEXP_OPR = /&&|\|\||&|\||\^|-|\(|\)/;
    var OPERATORNAMES = {
        "-": "complement",
        "&": "cross",
        "^": "delta",
        "|": "union",
        "&&": "and",
        "||": "or"
    };

    /**
     * @class ObservableCollection
     * @namespace nx.data
     * @extends nx.data.Collection
     * @uses nx.Observable
     */
    var EXPORT = nx.define('nx.data.ObservableCollection', nx.data.Collection, {
        mixins: nx.Observable,
        events: ['change'],
        methods: {
            /**
             * Add an item.
             * @method add
             * @param item
             */
            add: function (item) {
                item = this.inherited(item);
                if (!this._unique || item !== null) {
                    this.notify('count');
                    this.notify('length');
                    this.fire('change', {
                        action: 'add',
                        items: [item]
                    });
                }
                return item;
            },
            /**
             * @method addRange
             * @param iter
             */
            addRange: function (iter) {
                var items = this.inherited(iter);
                if (items.length) {
                    this.notify('count');
                    this.notify('length');
                    this.fire('change', {
                        action: 'add',
                        items: items
                    });
                }
                return items;
            },
            /**
             * @method insert
             * @param item
             * @param index
             */
            insert: function (item, index) {
                item = this.inherited(item, index);
                if (!this._unique || item !== null) {
                    this.notify('count');
                    this.notify('length');
                    this.fire('change', {
                        action: 'add',
                        items: [item],
                        index: index
                    });
                }
                return item;
            },
            /**
             * @method insertRange
             * @param iter
             * @param index
             */
            insertRange: function (iter, index) {
                var items = this.inherited(iter, index);
                if (items.length) {
                    this.notify('count');
                    this.notify('length');
                    this.fire('change', {
                        action: 'add',
                        items: items,
                        index: index
                    });
                }
                return items;
            },
            /**
             * @method remove
             * @param item
             */
            remove: function (item) {
                var result;
                if (arguments.length > 1) {
                    item = Array.prototype.slice.call(arguments);
                    result = this.inherited.apply(this, item);
                    if (result.length) {
                        this.notify('count');
                        this.notify('length');
                        this.fire('change', {
                            action: 'remove',
                            items: item,
                            indices: result
                        });
                    }
                    return result;
                }
                result = this.inherited(item);
                if (result >= 0) {
                    this.notify('count');
                    this.notify('length');
                    this.fire('change', {
                        action: 'remove',
                        items: [item],
                        index: result,
                        indices: [result]
                    });
                }
                return result;
            },
            /**
             * @method removeAt
             * @param index
             */
            removeAt: function (index) {
                var result = this.inherited(index);
                if (result !== undefined) {
                    this.notify('count');
                    this.notify('length');
                    this.fire('change', {
                        action: 'remove',
                        items: [result],
                        index: index
                    });
                }
                return result;
            },
            /**
             * @method clear
             */
            clear: function () {
                var result = this.inherited();
                this.notify('count');
                this.notify('length');
                this.fire('change', {
                    action: 'clear',
                    items: result
                });
            },
            /**
             * @method sort
             * @param comp
             */
            sort: function (comp) {
                var result = this.inherited(comp);
                this.notify('count');
                this.notify('length');
                this.fire('change', {
                    action: 'sort',
                    comparator: comp || function (a, b) {
                        if (a > b) {
                            return 1;
                        } else if (a < b) {
                            return -1;
                        } else {
                            return 0;
                        }
                    }
                });
                return result;
            },
            /**
             * Apply a diff watcher, which handles each item in the collection, to the collection.
             *
             * @method monitor
             * @param handler lambda(item) returning a rollback method
             * @return unwatcher A Object with unwatch method.
             */
            monitor: function (handler) {
                var collection = this;
                // resource (aka. rollback-methods) manager
                var resmgr = {
                    // retains item-vs-rollback-method pairs
                    objcache: [],
                    // since NEXT objects have identified ID, map is used more often
                    idcache: {},
                    // find pair index of indicated item in obj-cache
                    findPair: function (item) {
                        var i;
                        for (i = 0; i < resmgr.objcache.length; i++) {
                            if (item === resmgr.objcache[i][0]) {
                                return i;
                            }
                        }
                        return -1;
                    },
                    // get the rollback method of given item
                    get: function (item) {
                        if (item.__id__) {
                            return resmgr.idcache[item.__id__];
                        } else {
                            var pair = resmgr.objcache[resmgr.findPair(item)];
                            return pair && pair[1];
                        }
                    },
                    // set or remove(with null value) rollback method, will call the old rollback method if exists
                    set: function (item, res) {
                        if (item.__id__) {
                            if (resmgr.idcache[item.__id__]) {
                                resmgr.idcache[item.__id__].call(collection);
                            }
                            if (res) {
                                resmgr.idcache[item.__id__] = res;
                            } else {
                                delete resmgr.idcache[item.__id__];
                            }
                        } else {
                            var pairidx = resmgr.findPair(item);
                            var pair = resmgr.objcache[pairidx];
                            if (pair) {
                                if (pair[1] === res) {
                                    return;
                                }
                                pair[1].call(collection);
                                if (!res) {
                                    resmgr.objcache.splice(pairidx, 1);
                                } else {
                                    pair[1] = res;
                                }
                            } else if (res) {
                                pair = [item, res];
                                resmgr.objcache.push(pair);
                            }
                        }
                    },
                    // call all rollback methods
                    release: function () {
                        nx.each(resmgr.idcache, function (res, key) {
                            res();
                        });
                        nx.each(resmgr.objcache, function (pair) {
                            pair[1]();
                        });
                    }
                };
                // watch the further change of the collection
                var listener = collection.on("change", function (sender, evt) {
                    switch (evt.action) {
                    case "add":
                        nx.each(evt.items, function (item) {
                            var res = handler(item);
                            if (res) {
                                resmgr.set(item, res);
                            }
                        });
                        break;
                    case "remove":
                    case "clear":
                        nx.each(evt.items, function (item) {
                            resmgr.set(item, null);
                        });
                        break;
                    }
                });
                // and don't forget the existing items in the collection
                nx.each(collection, function (item) {
                    var res = handler(item);
                    if (res) {
                        resmgr.set(item, res);
                    }
                });
                // return unwatcher
                return {
                    release: function () {
                        resmgr.release();
                        listener.release();
                    }
                };
            },
            /**
             * Select a sub-collection from a source collection.
             * Usage:
             * <pre>
             * // select all items from collection with property active==true
             * resource = subCollection.select(collection, "active")
             * // select all items from collection with path owner.name=="Knly"
             * resource = subCollection.select(collection, "owner.name", function(name){
             *     return name==="Knly";
             * });
             * // select all string item from collection
             * resource = subCollection.select(collection, function(item){
             *     return typeof item === "string";
             * });
             * </pre>
             * 
             * @method select
             * @param {nx.data.ObservableCollection} source
             * @param {String} conditions
             * @param {Function} determinator
             * @return resource for release the binding
             */
            select: function (source, conditions, determinator) {
                if (!nx.is(source, EXPORT)) {
                    return null;
                }
                if (typeof conditions === "function") {
                    determinator = conditions;
                    conditions = null;
                }
                if (!determinator) {
                    determinator = nx.identity;
                }
                var self = this;
                this.clear();
                var resource = source.monitor(function (item) {
                    var resource;
                    if (conditions) {
                        if (nx.is(item, nx.Observable)) {
                            // monitor the specified conditions
                            resource = nx.Observable.monitor(item, conditions, function () {
                                self.toggle(item, determinator.apply(self, arguments));
                            });
                            resource.affect();
                        } else {
                            // determine the specified conditions if unable to monitor
                            self.toggle(item, determinator.call(self, nx.path(item, conditions)));
                        }
                    } else {
                        // no condition specified means determine item itself
                        self.toggle(item, determinator.call(self, item));
                    }
                    return function () {
                        resource && resource.release();
                        self.toggle(item, false);
                    };
                });
                return resource;
            },
            /**
             * Calculate and synchronize collection with a collection calculation.
             *
             * @method calculate
             * @param experssion
             * @param sources
             * @return resource for release the binding
             */
            calculate: function (expression, sources) {
                var calculation = new EXPORT.Calculation(sources);
                return calculation.calculate(this, expression);
            }
        },
        statics: {
            /**
             * Prepare a calculation provider for a map of collections.
             *
             * @class CollectionRelation
             * @namespace nxex.toolkit.collection
             * @constructor
             * @param map {Object/Map} A map indicates names of the collection for calculation.
             */
            Calculation: nx.define({
                properties: {
                    map: {
                        value: function () {
                            return new nx.data.ObservableDictionary();
                        }
                    }
                },
                methods: {
                    init: function (map) {
                        this.map().setItems(map);
                    },
                    /**
                     * Apply a inter-collection releation to a collection.
                     * Supported operators:<br/>
                     * <table>
                     * <tr><th>Operator</th><th>Calculation</th><th>Method</th></tr>
                     * <tr><td>&amp;</td><td>Sets cross</td><td>cross</td></tr>
                     * <tr><td>|</td><td>Sets union</td><td>union</td></tr>
                     * <tr><td>^</td><td>Sets symmetric difference</td><td>delta</td></tr>
                     * <tr><td>-</td><td>Sets complement</td><td>complement</td></tr>
                     * <tr><td>&amp;&amp;</td><td>Sets logical and</td><td>and</td></tr>
                     * <tr><td>||</td><td>Sets logical or</td><td>or</td></tr>
                     * </table>
                     * Tips:
                     * <ul>
                     * <li>Logical and means 'first empty collection or last collection'</li>
                     * <li>Logical or means 'first non-empty collection or last collection'</li>
                     * </ul>
                     *
                     * @method calculate
                     * @param target {Collection} The target collection.
                     * @param expression {String} The relation expression.
                     * @return An object with release method.
                     */
                    calculate: function (target, expression) {
                        // TODO more validation on the expression
                        if (!expression.match(REGEXP_CHECK)) {
                            throw new Error("Bad expression.");
                        }
                        var self = this;
                        var map = this.map();
                        var tokens = expression.match(REGEXP_TOKENS);
                        var requirements = tokens.filter(RegExp.prototype.test.bind(REGEXP_OPN));
                        var tree = EXPORT.buildExpressionTree(tokens);
                        // sync with the collection existence
                        var res, monitor;
                        var reqmgr = {
                            count: 0,
                            map: {},
                            sync: function () {
                                res && (res.release(), res = null);
                                if (reqmgr.count === requirements.length) {
                                    target.clear();
                                    if (typeof tree === "string") {
                                        // need not to calculate
                                        res = self.map().getItem(tree).monitor(EXPORT.getCollectionSyncMonitor(target));
                                    } else {
                                        res = self._calculate(target, tree);
                                    }
                                }
                            },
                            monitor: function (key, value) {
                                if (requirements.indexOf(key) >= 0) {
                                    /*
                                    if (map[key] && !value) {
                                        reqmgr.count--;
                                    } else if (!map[key] && value) {
                                        reqmgr.count++;
                                    }*/
                                    reqmgr.count += ((!reqmgr.map[key]) * 1 + (!!value) * 1 - 1);
                                    reqmgr.map[key] = value;
                                    reqmgr.sync();
                                }
                            }
                        };
                        monitor = map.monitor(reqmgr.monitor);
                        return {
                            release: function () {
                                res && res.release();
                                monitor.release();
                            }
                        };
                    },
                    _calculate: function (target, tree) {
                        var self = this;
                        var res, iterate, opr = tree[0];
                        // short-circuit for logical operatiors (&& and ||)
                        switch (opr) {
                        case "&&":
                            iterate = function (idx) {
                                var coll, calc, watch, itr;
                                if (typeof tree[idx] === "string") {
                                    coll = self.map().getItem(tree[idx]);
                                } else {
                                    coll = new nx.data.ObservableCollection();
                                    calc = self._calculate(coll, tree[idx]);
                                }
                                if (idx >= tree.length - 1) {
                                    watch = coll.monitor(function (item) {
                                        target.add(item);
                                        return function () {
                                            target.remove(item);
                                        };
                                    });
                                } else {
                                    watch = coll.watch("length", function (n, v) {
                                        if (v) {
                                            itr = iterate(idx + 1);
                                        } else if (itr) {
                                            itr.release();
                                            itr = null;
                                        }
                                    });
                                    watch.affect();
                                }
                                return {
                                    release: function () {
                                        itr && itr.release();
                                        watch && watch.release();
                                        calc && calc.release();
                                    }
                                };
                            };
                            res = iterate(1);
                            break;
                        case "||":
                            iterate = function (idx) {
                                var coll, calc, watch, itr;
                                if (typeof tree[idx] === "string") {
                                    coll = self.map().getItem(tree[idx]);
                                } else {
                                    coll = new nx.data.ObservableCollection();
                                    calc = self._calculate(coll, tree[idx]);
                                }
                                if (idx >= tree.length - 1) {
                                    watch = coll.monitor(EXPORT.getCollectionSyncMonitor(target));
                                } else {
                                    watch = coll.watch("length", function (n, v) {
                                        if (itr) {
                                            itr.release();
                                        }
                                        if (!v) {
                                            itr = iterate(idx + 1);
                                        } else {
                                            itr = coll.monitor(EXPORT.getCollectionSyncMonitor(target));
                                        }
                                    });
                                    watch.affect();
                                }
                                return {
                                    release: function () {
                                        itr && itr.release();
                                        watch && watch.release();
                                        calc && calc.release();
                                    }
                                };
                            };
                            res = iterate(1);
                            break;
                        default:
                            iterate = function () {
                                var i, coll, colls = [];
                                var calc, calcs = [];
                                for (i = 1; i < tree.length; i++) {
                                    if (typeof tree[i] === "string") {
                                        coll = self.map().getItem(tree[i]);
                                    } else {
                                        coll = new nx.data.ObservableCollection();
                                        calc = self._calculate(coll, tree[i]);
                                    }
                                    colls.push(coll);
                                    calcs.push(calc);
                                }
                                calc = EXPORT[OPERATORNAMES[opr]](target, colls);
                                return {
                                    release: function () {
                                        nx.each(calcs, function (calc) {
                                            calc && calc.release();
                                        });
                                        calc.release();
                                    }
                                };
                            };
                            res = iterate();
                            break;
                        }
                        return res;
                    }
                }
            }),
            /**
             * This util returns a monitor function of ObservableCollection, which is used to synchronize item existance between 2 collections.
             *
             * @method getCollectionSyncMonitor
             * @param collection The target collection to be synchronized.
             * @param sync
             *  <ul>
             *  <li>If true, make sure target collection will have all items as source collection has;</li>
             *  <li>If false, make sure target collection will not have any item as source collection has.</li>
             *  </ul>
             *  Default true.
             * @return {function&lt;item&gt;}
             *  The monitor function.
             */
            getCollectionSyncMonitor: function (coll, sync) {
                if (sync !== false) {
                    return function (item) {
                        coll.add(item);
                        return function () {
                            coll.remove(item);
                        };
                    };
                } else {
                    return function (item) {
                        coll.remove(item);
                        return function () {
                            coll.add(item);
                        };
                    };
                }
            },
            /**
             * Affect target to be the cross collection of sources collections.
             * Release object could stop the dependencies.
             *
             * @method cross
             * @param target {Collection}
             * @param sources {Array of Collection}
             * @return an object with release method
             * @static
             */
            cross: function (target, sources) {
                target.clear();
                var counter = new nx.data.Counter();
                var monitors = [];
                var increaseHandler = counter.on("increase", function (o, evt) {
                    if (evt.count == sources.length) {
                        target.add(evt.item);
                    }
                });
                var decreaseHandler = counter.on("decrease", function (o, evt) {
                    if (evt.count == sources.length - 1) {
                        target.remove(evt.item);
                    }
                });

                nx.each(sources, function (coll) {
                    var monitor = coll.monitor(function (item) {
                        counter.increase(item, 1);
                        return function () {
                            counter.decrease(item, 1);
                        };
                    });
                    monitors.push(monitor);
                });
                return {
                    release: function () {
                        increaseHandler.release();
                        decreaseHandler.release();
                        nx.each(monitors, function (monitor) {
                            monitor.release();
                        });
                    }
                };
            },
            /**
             * Affect target to be the union collection of sources collections.
             * Release object could stop the dependencies.
             *
             * @method union
             * @param target {Collection}
             * @param sources {Array of Collection}
             * @return an object with release method
             * @static
             */
            union: function (target, sources) {
                target.clear();
                var counter = new nx.data.Counter();
                var monitors = [];
                var increaseHandler = counter.on("increase", function (o, evt) {
                    if (evt.count === 1) {
                        target.add(evt.item);
                    }
                });
                var decreaseHandler = counter.on("decrease", function (o, evt) {
                    if (evt.count === 0) {
                        target.remove(evt.item);
                    }
                });

                nx.each(sources, function (coll) {
                    var monitor = coll.monitor(function (item) {
                        counter.increase(item, 1);
                        return function () {
                            counter.decrease(item, 1);
                        };
                    });
                    monitors.push(monitor);
                });
                return {
                    release: function () {
                        increaseHandler.release();
                        decreaseHandler.release();
                        nx.each(monitors, function (monitor) {
                            monitor.release();
                        });
                    }
                };
            },
            /**
             * Affect target to be the complement collection of sources collections.
             * Release object could stop the dependencies.
             *
             * @method complement
             * @param target {Collection}
             * @param sources {Array of Collection}
             * @return an object with release method
             * @static
             */
            complement: function (target, sources) {
                target.clear();
                var counter = new nx.data.Counter();
                var monitors = [];
                var length = sources.length;
                var changeHandler = counter.on("change", function (o, evt) {
                    var previous = evt.previousCount,
                        count = evt.count;
                    if (previous < length && count >= length) {
                        target.add(evt.item);
                    }
                    if (previous >= length && count < length) {
                        target.remove(evt.item);
                    }
                });
                var globalMonitor = sources[0].monitor(function (item) {
                    counter.increase(item, length);
                    return function () {
                        counter.decrease(item, length);
                    };
                });
                monitors.push(globalMonitor);
                nx.each(sources, function (coll, index) {
                    if (index > 0) {
                        var monitor = coll.monitor(function (item) {
                            counter.decrease(item);
                            return function () {
                                counter.increase(item);
                            };
                        });
                        monitors.push(monitor);
                    }
                });
                return {
                    release: function () {
                        changeHandler.release();
                        nx.each(monitors, function (monitor) {
                            monitor.release();
                        });
                    }
                };
            },
            /**
             * Affect target to be the symmetric difference collection of sources collections.
             * Release object could stop the dependencies.
             * The name 'delta' is the symbol of this calculation in mathematics.
             * @reference {http://en.wikipedia.org/wiki/Symmetric_difference}
             * @method delta
             * @param target {Collection}
             * @param sources {Array of Collection}
             * @return an object with release method
             * @static
             */
            delta: function (target, sources) {
                target.clear();
                var bound = true;
                var monitors = [];
                nx.each(sources, function (coll) {
                    var monitor = coll.monitor(function (item) {
                        target.toggle(item);
                        return function () {
                            if (bound) {
                                target.toggle(item);
                            }
                        };
                    });
                    monitors.push(monitor);
                });
                return {
                    release: function () {
                        bound = false;
                        nx.each(monitors, function (monitor) {
                            monitor.release();
                        });
                    }
                };
            },
            /**
             * Affect target to be the equivalent collection of the first non-empty collection.
             * Release object could stop the dependencies.
             *
             * @method or
             * @param target {Collection}
             * @param sources {Array of Collection}
             * @return an object with release method
             * @static
             */
            or: function (target, sources) {
                target.clear();
                var res, bound = true;
                var iterator = function (index) {
                    var watch, res, coll = sources[index];
                    watch = coll.watch('length', function (name, value) {
                        res && res.release();
                        if (index < sources.length - 1 && !value) {
                            res = iterator(index + 1);
                        } else {
                            res = coll.monitor(function (item) {
                                target.add(item);
                                return function () {
                                    if (bound) {
                                        target.remove(item);
                                    }
                                };
                            });
                        }
                    });
                    watch.affect();
                    return {
                        release: function () {
                            res && res.release();
                            watch && watch.release();
                        }
                    };
                };
                res = iterator(0);
                return {
                    release: function () {
                        bound = false;
                        res.release();
                    }
                };
            },
            /**
             * Affect target to be the equivalent collection of the first empty collection or the last collection.
             * Release object could stop the dependencies.
             *
             * @method and
             * @param target {Collection}
             * @param sources {Array of Collection}
             * @return an object with release method
             * @static
             */
            and: function (target, sources) {
                target.clear();
                var bound = true;
                var iterate = function (idx) {
                    var watcher, resource, coll = sources[idx];
                    if (idx === sources.length - 1) {
                        return coll.monitor(function (item) {
                            target.add(item);
                            return function () {
                                if (bound) {
                                    target.remove(item);
                                }
                            };
                        });
                    }
                    watcher = coll.watch("length", function (n, v) {
                        if (v) {
                            resource = iterate(idx + 1);
                        } else if (resource) {
                            resource.release();
                            resource = null;
                        }
                    });
                    watcher.affect();
                    return {
                        release: function () {
                            if (resource) {
                                resource.release();
                            }
                            watcher.release();
                        }
                    };
                };
                var resource = iterate(0);
                return {
                    release: function () {
                        bound = false;
                        resource.release();
                    }
                };
            },
            /**
             * Build a tree of expresson syntax with the expression tokens.
             * e.g. tokens ["A", "|", "B", "&", "(", "C", "&", "D", ")"], which was separated from expression "A | B & (C | D)",
             * will be separated into [|, A, [&, B, [|, C, D]]], because '&' has higher priority than '|',
             * and braced "C | D" has higher priority than &. <br/>
             * <br/>
             * Similar to the priorities in JavaScript:<br/>
             * <table>
             * <tr><th>operator</th><th>functionality</th></tr>
             * <tr><td>()</td><td>braces</td></tr>
             * <tr><td>-</td><td>complement</td></tr>
             * <tr><td>&</td><td>cross</td></tr>
             * <tr><td>^</td><td>symmetric difference</td></tr>
             * <tr><td>|</td><td>union</td></tr>
             * <tr><td>&&</td><td>and (the first empty collection or the last collection)</td></tr>
             * <tr><td>||</td><td>or (the first non-empty collection)</td></tr>
             * </table>
             *
             * @method buildExpressionTree
             * @param {Array of token} tokens
             * @return {Array tree} Parsed syntax tree of the expression tokens.
             * @static
             */
            buildExpressionTree: (function () {
                var PRIORITIES = [
                    ["-"],
                    ["&"],
                    ["^"],
                    ["|"],
                    ["&&"],
                    ["||"]
                ];
                var getPriority = function (opr) {
                    for (var i = 0; i < PRIORITIES.length; i++) {
                        if (PRIORITIES[i].indexOf(opr) >= 0) {
                            return i;
                        }
                    }
                };
                var buildExpressionNode = function (opr, opn1, opn2) {
                    if (Object.prototype.toString.call(opn1) === "[object Array]" && opn1[0] === opr) {
                        opn1.push(opn2);
                        return opn1;
                    }
                    return [opr, opn1, opn2];
                };
                return function (tokens) {
                    if (typeof tokens === "string") {
                        tokens = tokens.match(REGEXP_TOKENS);
                    }
                    tokens = tokens.concat([")"]);
                    var token, opr, oprstack = [];
                    var opn, opnstack = [];
                    var operands = [];
                    while (tokens.length) {
                        token = tokens.shift();
                        if (token === ")") {
                            while ((opr = oprstack.pop())) {
                                if (opr === "(") {
                                    break;
                                }
                                opn = opnstack.pop();
                                opnstack.push(buildExpressionNode(opr, opnstack.pop(), opn));
                            }
                        } else if (token === "(") {
                            oprstack.push(token);
                        } else if (token.match(REGEXP_OPN)) {
                            opnstack.push(token);
                            if (operands.indexOf(token) == -1) {
                                operands.push(token);
                            }
                        } else if (token.match(REGEXP_OPR)) {
                            while (oprstack.length) {
                                opr = oprstack.pop();
                                if (opr === "(" || getPriority(opr) > getPriority(token)) {
                                    oprstack.push(opr);
                                    break;
                                }
                                opn = opnstack.pop();
                                opnstack.push(buildExpressionNode(opr, opnstack.pop(), opn));
                            }
                            oprstack.push(token);
                        }
                    }
                    if (opnstack[0]) {
                        opnstack[0].operands = operands;
                    }
                    return opnstack[0];
                };
            })()
        }
    });
})(nx);

(function (nx) {

    var Observable = nx.Observable;
    var Dictionary = nx.data.Dictionary;

    var ObservableDictionaryItem = nx.define(Observable, {
        properties: {
            key: {},
            value: {
                set: function (value) {
                    if (this._dict) {
                        this._dict.setItem(this._key, value);
                    } else {
                        this._value = value;
                    }
                }
            }
        },
        methods: {
            init: function (dict, key) {
                this._dict = dict;
                this._key = key;
            }
        }
    });

    /**
     * @class ObservableDictionary
     * @namespace nx.data
     * @extends nx.data.Dictionary
     * @constructor
     * @param dict
     */
    nx.define('nx.data.ObservableDictionary', Dictionary, {
        mixins: Observable,
        events: ['change'],
        methods: {
            /**
             * @method setItem
             * @param key {String}
             * @param value {any}
             */
            setItem: function (key, value) {
                var map = this._map,
                    items = this._items;
                var item = map[key],
                    ov;
                if (item) {
                    ov = item.value;
                    item._value = value;
                    item.notify("value");
                    this.fire('change', {
                        action: 'replace',
                        items: [item],
                        oldValue: ov,
                        newValue: value,
                        // FIXME actually unnecessary
                        oldItem: item,
                        newItem: item
                    });
                } else {
                    item = map[key] = new ObservableDictionaryItem(this, key);
                    items.push(item);
                    item._dict = this;
                    item._value = value;
                    this.notify('count');
                    this.fire('change', {
                        action: 'add',
                        index: items.length - 1,
                        items: [item]
                    });
                }
            },
            /**
             * @method removeItem
             * @param key {String}
             */
            removeItem: function (key) {
                var map = this._map;
                if (!(key in map)) {
                    return;
                }
                var item = map[key];
                var idx = this._items.indexOf(item);
                delete map[key];
                if (idx >= 0) {
                    this._items.splice(idx, 1);
                }
                item._dict = null;
                this.notify('count');
                this.fire('change', {
                    action: 'remove',
                    items: [item]
                });
                return item;
            },
            /**
             * @method clear
             */
            clear: function () {
                var items = this.inherited();
                this.notify('count');
                this.fire('change', {
                    action: 'clear',
                    items: items
                });
            },
            /**
             * Apply a diff watcher, which handles each key-item-pair in the collection, to the dictionary.
             *
             * @method monitor
             * @param handler lambda(key, item) returning a rollback method
             * @return unwatcher A Object with unwatch method.
             */
            monitor: function (keys, callback) {
                // check parameter list
                if (typeof keys === "string" && keys.indexOf(",") >= 0 || Object.prototype.toString.call(keys) === "[object Array]") {
                    if (typeof keys === "string") {
                        keys = keys.replace(/\s/g, "").split(",");
                    }
                    return this._monitor(keys, callback);
                }
                if (typeof keys === "function") {
                    callback = keys;
                    keys = null;
                }
                var dict = this;
                var resmgr = {
                    map: {},
                    get: function (key) {
                        return resmgr.map[key];
                    },
                    set: function (key, res) {
                        if (keys && keys !== key) {
                            return;
                        }
                        var old = resmgr.get(key);
                        old && old();
                        if (res) {
                            resmgr.map[key] = res;
                        } else {
                            delete resmgr.map[key];
                        }
                    },
                    release: function () {
                        var key, map = resmgr.map;
                        for (key in map) {
                            map[key]();
                        }
                    },
                    callback: function (key, value) {
                        if (keys) {
                            if (keys === key) {
                                return callback(value);
                            }
                        } else {
                            return callback(key, value);
                        }
                    }
                };
                var listener = dict.on("change", function (target, evt) {
                    var i, item, key, res;
                    switch (evt.action) {
                    case "replace":
                    case "add":
                        for (i = 0; i < evt.items.length; i++) {
                            item = evt.items[i];
                            key = item.key();
                            res = resmgr.callback(key, item.value());
                            resmgr.set(key, res);
                        }
                        break;
                    case "remove":
                    case "clear":
                        for (i = 0; i < evt.items.length; i++) {
                            resmgr.set(evt.items[i].key(), null);
                        }
                        break;
                    }
                });
                dict.each(function (item, key) {
                    var res = resmgr.callback(key, item.value());
                    resmgr.set(key, res);
                });
                return {
                    release: function () {
                        resmgr.release();
                        listener.release();
                    }
                };
            },
            _monitor: function (keys, callback) {
                var self = this;
                var resmgr = {
                    values: keys.map(function (key) {
                        return self.getItem(key);
                    }),
                    affect: function () {
                        callback.apply(self, resmgr.values);
                    }
                };
                var listener = this.on("change", function (dict, evt) {
                    var idx, key, item, hasValue, affect = false;
                    switch (evt.action) {
                    case "replace":
                    case "add":
                        hasValue = true;
                        break;
                    case "remove":
                    case "clear":
                        hasValue = false;
                        break;
                    }
                    for (i = 0; i < evt.items.length; i++) {
                        item = evt.items[i];
                        key = item.key();
                        idx = keys.indexOf(key);
                        if (idx >= 0) {
                            resmgr.values[idx] = hasValue ? item.value() : undefined;
                            affect = true;
                        }
                    }
                    affect && resmgr.affect();
                });
                return {
                    affect: resmgr.affect,
                    release: listener.release
                };
            }
        }
    });
})(nx);

(function (nx) {
    var Iterable = nx.Iterable;
    var ArrayPrototype = Array.prototype;
    var every = ArrayPrototype.every;
    var some = ArrayPrototype.some;
    var filter = ArrayPrototype.filter;
    var map = ArrayPrototype.map;
    var reduce = ArrayPrototype.reduce;

    /**
     * @class Query
     * @namespace nx.data
     * @extend nx.Iterable
     */
    var Query = nx.define('nx.data.Query', nx.Iterable, {
        methods: {
            /**
             * @constructor
             * @param iter
             */
            init: function (iter) {
                this._iter = iter;
                this.reset();
            },
            /**
             * Reset the query.
             * @method reset
             */
            reset: function () {
                this._where = null;
                this._orderBy = null;
                this._unions = [];
                this._joins = [];
                this._begin = 0;
                this._end = null;
            },
            /**
             * @method where
             * @param expr
             * @chainable
             */
            where: function (expr) {
                this._where = expr;
                return this;
            },
            /**
             * method orderBy
             * @param expr
             * @param desc
             * @chainable
             */
            orderBy: function (expr, desc) {
                if (nx.is(expr, 'Function')) {
                    this._orderBy = desc ? function (a, b) {
                        return expr(b, a);
                    } : expr;
                }
                else {
                    this._orderBy = desc ? function (a, b) {
                        return nx.compare(nx.path(b, expr), nx.path(a, expr));
                    } : function (a, b) {
                        return nx.compare(nx.path(a, expr), nx.path(b, expr));
                    };
                }

                return this;
            },
            /**
             * @method groupBy
             * @param expr
             * @chainable
             */
            groupBy: function (expr) {
                throw new Error('Not Implemented');
            },
            /**
             * @method distinct
             * @param expr
             * @chainable
             */
            distinct: function (expr) {
                throw new Error('Not Implemented');
            },
            /**
             * @method skip
             * @param count
             * @chainable
             */
            skip: function (count) {
                this._begin = count;

                if (this._end) {
                    this._end += count;
                }

                return this;
            },
            /**
             * @method take
             * @param count
             * @chainable
             */
            take: function (count) {
                this._end = this._begin + count;

                return this;
            },
            /**
             * @method join
             * @param iter
             * @param on
             * @chainable
             */
            join: function (iter, on) {
                this._join = function () {

                };
                throw new Error('Not Implemented');
            },
            /**
             * @method select
             * @param expr
             * @returns {Array}
             */
            select: function (expr) {
                var arr = this.toArray();
                if (nx.is(expr, 'Function')) {
                    return map.call(arr, expr);
                }
                else if (nx.is(expr, 'String')) {
                    return map.call(arr, function (item) {
                        return nx.path(item, expr);
                    });
                }
                else if (nx.is(expr, 'Array')) {
                    return map.call(arr, function (item) {
                        var result = {};
                        nx.each(expr, function (path) {
                            nx.path(result, path, nx.path(item, path));
                        });

                        return result;
                    });
                }
                else {
                    return arr;
                }
            },
            /**
             * @method first
             * @param expr
             * @returns {any}
             */
            first: function (expr) {
                var arr = this.toArray();
                if (expr) {
                    for (var i = 0, length = arr.length; i < length; i++) {
                        var item = arr[i];
                        if (expr(item)) {
                            return item;
                        }
                    }
                }
                else {
                    return arr[0];
                }
            },
            /**
             * @method last
             * @param expr
             * @returns {any}
             */
            last: function (expr) {
                var arr = this.toArray();
                if (expr) {
                    for (var i = arr.length - 1; i >= 0; i--) {
                        var item = arr[i];
                        if (expr(item)) {
                            return item;
                        }
                    }
                }
                else {
                    return arr[arr.length - 1];
                }
            },
            /**
             * @method all
             * @param expr
             * @returns {Boolean}
             */
            all: function (expr) {
                return every.call(this.toArray(), expr);
            },
            /**
             * @method any
             * @param expr
             * @returns {Boolean}
             */
            any: function (expr) {
                return some.call(this.toArray(), expr);
            },
            /**
             * @method max
             * @param expr
             * @returns {Number}
             */
            max: function (expr) {
                return reduce.call(this.toArray(), function (pre, cur, index, arr) {
                    return pre > cur ? pre : cur;
                });
            },
            /**
             * @method min
             * @param expr
             * @returns {Number}
             */
            min: function (expr) {
                return reduce.call(this.toArray(), function (pre, cur, index, arr) {
                    return pre < cur ? pre : cur;
                });
            },
            /**
             * @method sum
             * @param expr
             * @returns {Number}
             */
            sum: function (expr) {
                return reduce.call(this.toArray(), function (pre, cur, index, arr) {
                    return pre + cur;
                });
            },
            /**
             * @method average
             * @param expr
             * @returns {Number}
             */
            average: function (expr) {
                var arr = this.toArray();
                return reduce.call(arr, function (pre, cur, index, arr) {
                    return pre + cur;
                }) / arr.length;
            },
            /**
             * @method toArray
             * @returns {Array}
             */
            toArray: function () {
                var arr = Iterable.toArray(this._iter);

                nx.each(this._unions, function (union) {
                    arr.concat(Iterable.toArray(union));
                });

                if (this._where) {
                    arr = filter.call(arr, this._where);
                }

                if (this._orderBy) {
                    arr = arr.sort(this._orderBy);
                }

                if (this._end > 0) {
                    arr = arr.slice(this._begin, this._end);
                }
                else {
                    arr = arr.slice(this._begin);
                }

                this.reset();
                return arr;
            }
        },
        statics: {
            query: (function () {
                var i, internal = {
                        publics: {
                            select: function (array, selector) {
                                var rslt = [];
                                if (nx.is(array, "Array") && nx.is(selector, "Function")) {
                                    var i, item;
                                    for (i = 0; i < array.length; i++) {
                                        item = array[i];
                                        if (selector(item)) {
                                            rslt.push(item);
                                        }
                                    }
                                }
                                return rslt;
                            },
                            group: function (array, grouper) {
                                var map;
                                if (nx.is(grouper, "Function")) {
                                    map = {};
                                    var i, id, group;
                                    for (i = 0; i < array.length; i++) {
                                        id = grouper(array[i]);
                                        if (!id || typeof id !== "string") {
                                            continue;
                                        }
                                        group = map[id] = map[id] || [];
                                        group.push(array[i]);
                                    }
                                }
                                else {
                                    map = array;
                                }
                                return map;
                            },
                            aggregate: function (array, aggregater) {
                                var rslt = null,
                                    key;
                                if (nx.is(aggregater, "Function")) {
                                    if (nx.is(array, "Array")) {
                                        rslt = aggregater(array);
                                    }
                                    else {
                                        rslt = [];
                                        for (key in array) {
                                            rslt.push(aggregater(array[key], key));
                                        }
                                    }
                                }
                                return rslt;
                            }
                        },
                        privates: {
                            aggregate: function (array, args) {
                                var rslt, grouper = null,
                                    aggregater = null;
                                // get original identfier and aggregater
                                if (nx.is(args, "Array")) {
                                    if (typeof args[args.length - 1] === "function") {
                                        aggregater = args.pop();
                                    }
                                    grouper = (args.length > 1 ? args : args[0]);
                                }
                                else {
                                    grouper = args.map;
                                    aggregater = args.aggregate;
                                }
                                // translate grouper into function if possible
                                if (typeof grouper === "string") {
                                    grouper = grouper.replace(/\s/g, "").split(",");
                                }
                                if (nx.is(grouper, "Array") && grouper[0] && typeof grouper[0] === "string") {
                                    grouper = (function (keys) {
                                        return function (obj) {
                                            var i, o = {};
                                            for (i = 0; i < keys.length; i++) {
                                                o[keys[i]] = obj[keys[i]];
                                            }
                                            return JSON.stringify(o);
                                        };
                                    })(grouper);
                                }
                                // do map aggregate
                                rslt = internal.publics.aggregate(internal.publics.group(array, grouper), aggregater);
                                return rslt;
                            },
                            mapping: function (array, mapper) {
                                var i, rslt;
                                if (mapper === true) {
                                    rslt = EXPORT.clone(array);
                                }
                                else if (nx.is(mapper, "Function")) {
                                    if (nx.is(array, "Array")) {
                                        rslt = [];
                                        for (i = 0; i < array.length; i++) {
                                            rslt.push(mapper(array[i], i));
                                        }
                                    }
                                    else {
                                        rslt = mapper(array, 0);
                                    }
                                }
                                else {
                                    if (nx.is(array, "Array")) {
                                        rslt = array.slice();
                                    }
                                    else {
                                        rslt = array;
                                    }
                                }
                                return rslt;
                            },
                            orderby: function (array, comparer) {
                                if (typeof comparer === "string") {
                                    comparer = comparer.replace(/^\s*(.*)$/, "$1").replace(/\s*$/, "").replace(/\s*,\s*/g, ",").split(",");
                                }
                                if (nx.is(comparer, "Array") && comparer[0] && typeof comparer[0] === "string") {
                                    comparer = (function (keys) {
                                        return function (o1, o2) {
                                            var i, key, desc;
                                            if (!o1 && !o2) {
                                                return 0;
                                            }
                                            for (i = 0; i < keys.length; i++) {
                                                key = keys[i];
                                                desc = /\sdesc$/.test(key);
                                                key = key.replace(/(\s+desc|\s+asc)$/, "");
                                                if (o1[key] > o2[key]) {
                                                    return desc ? -1 : 1;
                                                }
                                                else if (o2[key] > o1[key]) {
                                                    return desc ? 1 : -1;
                                                }
                                            }
                                            return 0;
                                        };
                                    })(comparer);
                                }
                                if (comparer && typeof comparer === "function") {
                                    array.sort(comparer);
                                }
                                return array;
                            }
                        },
                        query: function (array, options) {
                            /**
                             * @doctype MarkDown
                             * options:
                             * - options.array [any*]
                             *   - the target array
                             * - options.select: function(any){return boolean;}
                             *   - *optional*
                             *   - pre-filter of the array
                             * - options.aggregate: {grouper:grouper,aggregater:aggregater} or [proplist, aggregater] or [prop, prop, ..., aggregater]
                             *   - *optional*
                             *   - proplist: "prop,prop,..."
                             *   - prop: property name on array items
                             *   - grouper: map an array item into a string key
                             *   - aggregater: function(mapped){return aggregated}
                             * - options.mapping: function(item){return newitem}
                             *   - *optional*
                             * - options.orderby: proplist or [prop, prop, ...]
                             *   - *optional*
                             */
                            if (arguments.length == 1) {
                                options = array;
                                array = options.array;
                            }
                            if (!array) {
                                return array;
                            }
                            if (options.select) {
                                array = internal.publics.select(array, options.select);
                            }
                            if (options.aggregate) {
                                array = internal.privates.aggregate(array, options.aggregate);
                            }
                            if (options.mapping) {
                                array = internal.privates.mapping(array, options.mapping);
                            }
                            if (options.orderby) {
                                array = internal.privates.orderby(array, options.orderby);
                            }
                            return array;
                        }
                    };
                for (i in internal.publics) {
                    internal.query[i] = internal.publics[i];
                }
                return internal.query;
            })()
        }
    });
})(nx);

(function (nx) {

    /**
     * @class SortedMap
     * @namespace nx.data
     * @uses nx.Observable
     * @param data The initial data of SortedMap, which is an array of objects with properties "key" and "value".
     */
    nx.define('nx.data.SortedMap', {
        mixins: nx.Observable,
        events: ['change'],
        properties: {
            /**
             * The length of SortedMap.
             * @property length
             */
            length: {
                get: function () {
                    return this._data.length;
                }
            }
        },
        methods: {
            init: function (data) {
                data = data || [];
                var b = this.__validateData(data);
                if (b) {
                    this._data = data;
                    this._map = {};

                    //init _map
                    var self = this;
                    nx.each(data, function (item) {
                        var map = self._map;
                        map[item.key] = item;
                    });

                } else {
                    throw Error('init data are invalid!');
                }
            },
            /**
             * validate the init args
             * @param data
             * @returns {boolean}
             * @private
             */
            __validateData: function (data) {
                var b = true;
                if (!nx.is(data, 'Array')) {
                    b = false;
                } else {
                    nx.each(data, function (item) {
                        if (item.key === undefined || item.value === undefined) {
                            b = false;
                            return false;
                        }
                    });
                }

                return b;
            },
            /**
             * Add or insert an value with specified key and index.
             * @method add
             * @param key Specified key.
             * @param value (Optional) The value, default undefined.
             * @param index (Optional) Specified index, default append.
             * @return The created entry.
             */
            add: function (key, value, index) {
                var item = {
                    key: key,
                    value: value
                };
                this._map[key] = item;
                if (index === undefined) {
                    index = this._data.length;
                }
                this._data.splice(index, 0, item);
                this.notify('length');
                this.fire('change', {
                    action: "add",
                    index: index,
                    key: key,
                    value: value
                });
                return value;
            },
            /**
             * Remove value(s) from SortedMap by key(s).
             * @method remove
             * @param key The key of value attempt to be removed.
             * @return Removed value.
             */
            remove: function (key) {
                var value, item;

                item = this._map[key];
                if (item !== undefined) {
                    var idx = this._data.indexOf(item);
                    if (idx > -1) {
                        value = item.value;
                        this._data.splice(idx, 1);
                        delete this._map[key];
                        this.notify('length');
                        this.fire('change', {
                            action: "remove",
                            index: idx,
                            key: key,
                            value: value
                        });
                    } else {
                        throw 'key:"' + key + '" has been found in the _map but not exists in the _data!';
                    }
                }

                return value;
            },
            /**
             * Remove value from SortedMap by index.
             * @method removeAt
             * @param index The index of value attempt to be removed.
             * @return Removed value.
             */
            removeAt: function (index) {
                var value, item = this.__getItemAt(index);

                if (item !== undefined) {
                    value = item.value;
                    this._data.splice(index, 1);
                    delete this._map[item.key];
                    this.notify('length');
                    this.fire('change', {
                        action: "remove",
                        index: index,
                        key: item.key,
                        value: value
                    });
                }

                return value;
            },
            /**
             * get the item of this._data by index
             * @param index Support negative number
             * @returns {Object} item
             * @private
             */
            __getItemAt: function (index) {
                var item = this._data[index > -1 ? index : this._data.length + index];

                return item;
            },
            /**
             * Get the key at specified index.
             * @method getKeyAt
             * @param index The index.
             * @return The key, null if not exists.
             */
            getKeyAt: function (index) {
                var item = this.__getItemAt(index), key;
                if (item) {
                    key = item.key;
                }
                return key;
            },
            /**
             * Get the index of specified key.
             * @method indexOf
             * @param key The key.
             * @return The index, -1 if not exists.
             */
            indexOf: function (key) {
                var item = this._map[key], idx = -1;
                if (item !== undefined) {
                    idx = this._data.indexOf(item);
                }
                return idx;
            },
            /**
             * Get a value with specified key.
             * @method getValue
             * @param key The value's key.
             * @return The value.
             */
            getValue: function (key) {
                var item = this._map[key], value;
                if (item !== undefined) {
                    value = item.value;
                }
                return value;
            },
            /**
             * Change value of specified key.
             * @method setValue
             * @param key The key attempt to be changed.
             * @param value The new value.
             * @return The new value.
             */
            setValue: function (key, value) {
                var item = this._map[key];
                if (item !== undefined) {
                    var oldValue = item.value;
                    var idx = this._data.indexOf(item);
                    item.value = value;
                    this.fire('change', {
                        action: "set",
                        index: idx,
                        key: key,
                        value: value,
                        oldValue: oldValue
                    });
                } else {
                    throw Error('the key:"' + key + '" dos not exists!');
                }

                return value;
            },
            /**
             * Get a value with speicifed index.
             * @method getValueAt
             * @param index The value's index.
             * @return The value.
             */
            getValueAt: function (index) {
                var value, item = this.__getItemAt(index);

                if (item !== undefined) {
                    value = item.value;
                }

                return value;
            },
            /**
             * Change value of speicifed index.
             * @method setValueAt
             * @param index The index attempt to be changed.
             * @param value The new value.
             * @return The new value.
             */
            setValueAt: function (index, value) {
                var item = this.__getItemAt(index);
                if (item !== undefined) {
                    var oldValue = item.value;
                    item.value = value;
                    this.fire('change', {
                        action: "set",
                        index: index,
                        key: item.key,
                        value: value,
                        oldValue: oldValue
                    });
                }
                return value;
            },
            /**
             * change the order of specific Item by key
             * @param key
             * @param index
             */
            setIndex: function (key, index) {
                var idx = this.indexOf(key), result = true;
                if (idx != -1 && index !== idx) {
                    var rtn = this._data.splice(idx, 1);
                    this._data.splice(index, 0, rtn[0]);
                    this.fire('change', {
                        action: 'reorder',
                        index: index,
                        oldIndex: idx,
                        key: key
                    });
                } else {
                    result = false;
                }

                return result;
            },
            /**
             * Sort the SortedMap with a comparer function.
             * @method sort
             * @param comparer A function expecting arguments: key1, value1, key2, value2
             */
            sort: function (comparer) {
                this._data.sort(function (item1, item2) {
                    return comparer.call(null, item1.key, item1.value, item2.key, item2.value);
                });
            },
            /**
             * Get array of key-value pairs of all entries.
             * @method toArray
             * @return An array, each item of which is an object with key and value property.
             */
            toArray: function () {
                var arr = this._data.slice(0);
                for (var i = 0, len = arr.length; i < len; i++) {
                    arr[i] = nx.clone(arr[i]);
                }
                return arr;
            },
            /**
             * support iterator for the callback which has three params:k,v,index
             * @param callback
             */
            each: function (callback) {
                var arr = this.toArray();
                for (var i = 0, len = arr.length; i < len; i++) {
                    var item = arr[i];
                    callback.call(this, item.key, item.value, i);
                }
            },
            /**
             * adapt to the nx.each, which has two params for the callback:k,v
             * @param callback
             * @private
             */
            __each__: function (callback) {
                var arr = this.toArray();
                for (var i = 0, len = arr.length; i < len; i++) {
                    var item = arr[i];
                    callback.call(this, item.key, item.value);
                }
            }
        }
    });
})(nx);

(function (nx) {
    //@https://github.com/yui/yui3/blob/master/src/yui/js/yui-ua.js
    var window = nx.global,
        document = window.document,
        documentMode = document.documentMode || 0,
        compatMode = document.compatMode,
        navigator = window.navigator,
        location = window.location,
        userAgent = navigator.userAgent.toLowerCase(),
        protocol = location.protocol.toLowerCase();
    var tempElement = document.createElement('div'),
        tempStyle = tempElement.style,
        result,
        ie = (result = userAgent.match(/msie (\d+)\./)) && result[1];

    //test opacity:
    tempStyle.cssText = "opacity:.55";

    var vendorPrefixMap = {
        'webkit': ['webkit', '-webkit-'],
        'gecko': ['Moz', '-moz-'],
        'presto': ['O', '-o-'],
        'trident': ['ms', '-ms-']
    };

    var osPatternMap = {
        'windows': /windows|win32/,
        'macintosh': /macintosh|mac_powerpc/,
        'linux': /linux/
    };

    var supportMap = {
        addEventListener: !! document.addEventListener,
        dispatchEvent: !! document.dispatchEvent,
        getBoundingClientRect: !! document.documentElement.getBoundingClientRect,
        onmousewheel: 'onmousewheel' in document,
        XDomainRequest: !! window.XDomainRequest,
        crossDomain: !! (window.XDomainRequest || window.XMLHttpRequest),
        getComputedStyle: 'getComputedStyle' in window,
        iePropertyChange: !! (ie && ie < 9),
        w3cChange: !ie || ie > 8,
        w3cFocus: !ie || ie > 8,
        w3cInput: !ie || ie > 9,
        innerText: 'innerText' in tempElement,
        firstElementChild: 'firstElementChild' in tempElement,
        cssFloat: 'cssFloat' in tempStyle,
        opacity: (/^0.55$/).test(tempStyle.opacity),
        filter: 'filter' in tempStyle,
        classList: !! tempElement.classList,
        removeProperty: 'removeProperty' in tempStyle,
        touch:'ontouchstart' in document.documentElement
    };

    var engineMap = {
        firefox: function () {
            return {
                name: 'gecko',
                version: getVersion('rv:')
            };
        },
        opera: function () {
            var version = getVersion('presto\\/');
            var engineName = 'presto';
            if (!version) {
                engineName = 'webkit';
                version = getVersion('webkit\\/');
            }
            return {
                name: engineName,
                version: version
            };
        },
        ie: function () {
            return {
                name: 'trident',
                version: getVersion('trident\\/') || 4
            };
        },
        'default': function () {
            return {
                name: 'webkit',
                version: getVersion('webkit\\/')
            };
        }
    };

    function getVersion(pattern) {
        var regexp = new RegExp(pattern + '(\\d+\\.\\d+)');
        var regexResult;
        return (regexResult = regexp.exec(userAgent)) ? parseFloat(regexResult[1]) : 0;
    }

    var os = (function () {
        var osName;
        for (osName in osPatternMap) {
            if (osPatternMap[osName].test(userAgent)) {
                break;
            }
        }
        return {
            name: osName
        };
    })();

    var browser = (function () {
        var browserName,
            item,
            checkIs,
            checkExclude,
            browserVersion = 0;

        for (browserName in browserPatternMap) {
            item = browserPatternMap[browserName];
            checkIs = (new RegExp(item.is)).test(userAgent);
            checkExclude = (new RegExp(item.exclude)).test(userAgent);
            if (checkIs && !checkExclude) {
                if (userAgent.indexOf('opr/') > -1) {
                    browserName = 'opera';
                    item.version = '\\bopr\/';
                }
                browserVersion = getVersion(item.version);
                break;
            }
        }

        return {
            name: browserName,
            version: browserVersion
        };
    })();

    var browserPatternMap = {
        ie: {
            is: 'msie',
            exclude: 'opera',
            version: 'msie '
        },
        firefox: {
            is: 'gecko',
            exclude: 'webkit',
            version: '\\bfirefox\/'
        },
        chrome: {
            is: '\\bchrome\\b',
            exclude: null,
            version: '\\bchrome\/'
        },
        safari: {
            is: 'safari',
            exclude: '\\bchrome\\b',
            version: 'version\/'
        },
        opera: {
            is: 'opera',
            exclude: null,
            version: 'version\/'
        }
    };


    var keyMap = {
        BACKSPACE: 8,
        TAB: 9,
        CLEAR: 12,
        ENTER: 13,
        SHIFT: 16,
        CTRL: 17,
        ALT: 18,
        META: (browser.name === "chrome" || browser.name === "webkit" || browser.name === "safari") ? 91 : 224, // the apple key on macs
        PAUSE: 19,
        CAPS_LOCK: 20,
        ESCAPE: 27,
        SPACE: 32,
        PAGE_UP: 33,
        PAGE_DOWN: 34,
        END: 35,
        HOME: 36,
        LEFT_ARROW: 37,
        UP_ARROW: 38,
        RIGHT_ARROW: 39,
        DOWN_ARROW: 40,
        INSERT: 45,
        DELETE: 46,
        HELP: 47,
        LEFT_WINDOW: 91,
        RIGHT_WINDOW: 92,
        SELECT: 93,
        NUMPAD_0: 96,
        NUMPAD_1: 97,
        NUMPAD_2: 98,
        NUMPAD_3: 99,
        NUMPAD_4: 100,
        NUMPAD_5: 101,
        NUMPAD_6: 102,
        NUMPAD_7: 103,
        NUMPAD_8: 104,
        NUMPAD_9: 105,
        NUMPAD_MULTIPLY: 106,
        NUMPAD_PLUS: 107,
        NUMPAD_ENTER: 108,
        NUMPAD_MINUS: 109,
        NUMPAD_PERIOD: 110,
        NUMPAD_DIVIDE: 111,
        F1: 112,
        F2: 113,
        F3: 114,
        F4: 115,
        F5: 116,
        F6: 117,
        F7: 118,
        F8: 119,
        F9: 120,
        F10: 121,
        F11: 122,
        F12: 123,
        F13: 124,
        F14: 125,
        F15: 126,
        NUM_LOCK: 144,
        SCROLL_LOCK: 145
    };


    var engine = (engineMap[browser] || engineMap['default'])();

    /**
     * Environment and check behavior support
     * @class nx.Env
     * @constructor
     */
    nx.define('nx.Env', {
        static: true,
        properties: {
            /**
             * Document mode
             * @property documentMode
             * @type {Number}
             * @default 0
             */
            documentMode: {
                value: documentMode
            },
            /**
             * Document compatMode
             * @property compatMode
             * @type {String}
             * @default "CSS1Compat"
             */
            compatMode: {
                value: compatMode
            },
            /**
             * User agent string
             * @property userAgent
             * @type {String}
             * @default ""
             */
            userAgent: {
                value: userAgent
            },
            /**
             * Browser render model CSS1Compat
             * @property strict
             * @type {Boolean}
             * @default true
             */
            strict: {
                value: compatMode === 'CSS1Compat'
            },
            /**
             * If it is secure
             * @property strict
             * @type {Boolean}
             * @default false
             */
            secure: {
                value: protocol.indexOf('https') === 0
            },
            /**
             * Get operating system information
             * @property os
             * @type {Object}
             * @default {}
             */
            os: {
                value: os
            },
            /**
             * Get specific prefix
             * @property prefix
             * @type {Array}
             * @default ['webkit','-webkit-']
             */
            prefix: {
                value: vendorPrefixMap[engine.name]
            },
            /**
             * Get browser's render engine information
             * @property engine
             * @type {Object}
             * @default {}
             */
            engine: {
                value: engine
            },
            /**
             * Get basic browser information
             * @property browser
             * @type {Object}
             * @default {}
             */
            browser: {
                value: browser
            },
            /**
             * Get keyboard key code map.
             * @property keyMap
             * @type {Object}
             * @default {}
             */
            keyMap: {
                value: keyMap
            }
        },
        methods: {
            /**
             * Whether the property is support
             * @method support
             * @param inName
             * @returns {*}
             */
            support: function (inName) {
                return supportMap[inName];
            },
            /**
             * Support map for debug
             * @method getSupportMap
             * @returns {{addEventListener: boolean, dispatchEvent: boolean, getBoundingClientRect: boolean, onmousewheel: boolean, XDomainRequest: boolean, crossDomain: boolean, getComputedStyle: boolean, iePropertyChange: boolean, w3cChange: boolean, w3cFocus: boolean, w3cInput: boolean, innerText: boolean, firstElementChild: boolean, cssFloat: boolean, opacity: boolean, filter: boolean, removeProperty: boolean}}
             */
            getSupportMap: function () {
                return supportMap;
            },
            /**
             * Register a support item
             * @method registerSupport
             * @param inName
             * @param inValue
             */
            registerSupport: function (inName, inValue) {
                if (!(inName in supportMap)) {
                    supportMap[inName] = inValue;
                }
            }
        }
    });

})(nx);

(function (nx) {
    var global = nx.global,
        document = global.document,
        env = nx.Env;

    var tempElement = document.createElement('div'),
        tempStyle = tempElement.style;
    var rsizeElement = /width|height|top|right|bottom|left|size|margin|padding/i,
        rHasUnit = /[c-x%]/,
        PX = 'px',
        rUpperCameCase = /(?:^|-)([a-z])/g,
        rDeCameCase = /([A-Z])/g;

    var cssNumber = {
        'lineHeight': true,
        'zIndex': true,
        'zoom': true
    };


    var styleHooks = {
        float: 'cssFloat'
    };

    var stylePropCache = {};
    var styleNameCache = {};

    nx.ready = function (clz) {
        var callback;
        if (typeof clz === "string") {
            clz = nx.path(global, clz);
        }
        if (typeof clz === "function") {
            if (clz.__classId__) {
                var App = nx.define(nx.ui.Application, {
                    properties: {
                        comp: {
                            value: function () {
                                return new clz();
                            }
                        }
                    },
                    methods: {
                        start: function () {
                            this.comp().attach(this);
                        },
                        stop: function () {
                            this.comp().detach(this);
                        }
                    }
                });
                callback = function () {
                    var app = new App();
                    app.start();
                };
            } else {
                callback = clz;
            }
            window.addEventListener("load", callback);
        }
    };

    /**
     * This is Util
     * @class nx.Util
     * @constructor
     */
    var util = nx.define('nx.Util', {
        static: true,
        methods: {
            /**
             * Get a string which is join by an style object.
             * @method getCssText
             * @param inStyles
             * @returns {string}
             */
            getCssText: function (inStyles) {
                var cssText = [''];
                nx.each(inStyles, function (styleValue, styleName) {
                    cssText.push(this.getStyleProperty(styleName, true) + ':' + this.getStyleValue(styleName, styleValue));
                }, this);
                return cssText.join(';');
            },
            /**
             * Get real value of the style name.
             * @method getStyleValue
             * @param inName
             * @param inValue
             * @returns {*}
             */
            getStyleValue: function (inName, inValue) {
                var property = this.getStyleProperty(inName);
                var value = inValue;
                if (rsizeElement.test(property)) {
                    if (!rHasUnit.test(inValue) && !cssNumber[property]) {
                        value += PX;
                    }
                }
                return value;
            },
            /**
             * Get compatible css property.
             * @method getStyleProperty
             * @param inName
             * @param isLowerCase
             * @returns {*}
             */
            getStyleProperty: function (inName, isLowerCase) {
                if (isLowerCase) {
                    if (inName in styleNameCache) {
                        return styleNameCache[inName];
                    }
                } else {
                    if (inName in stylePropCache) {
                        return stylePropCache[inName];
                    }
                }

                var property = styleHooks[inName] || this.lowerCamelCase(inName);
                if (property in tempStyle) {
                    if (isLowerCase) {
                        property = this.deCamelCase(inName);
                        styleNameCache[inName] = property;
                    }
                } else {
                    if (isLowerCase) {
                        property = env.prefix()[1] + inName;
                        styleNameCache[inName] = property;
                    } else {
                        property = env.prefix()[0] + this.upperCamelCase(inName);
                        stylePropCache[inName] = property;
                    }
                }
                return property;
            },
            /**
             * Lower camel case.
             * @method lowerCamelCase
             * @param inName
             * @returns {string}
             */
            lowerCamelCase: function (inName) {
                var _camelizeString = this.upperCamelCase(inName);
                return _camelizeString.charAt(0).toLowerCase() + _camelizeString.substring(1);
            },
            /**
             * Upper camel case.
             * @method upperCamelCase
             * @param inName
             * @returns {*|string|void}
             */
            upperCamelCase: function (inName) {
                return inName.replace(rUpperCameCase, function (match, group1) {
                    return group1.toUpperCase();
                });
            },
            /**
             * Decode camel case to '-' model.
             * @method deCamelCase
             * @param inName
             * @returns {*|string|void}
             */
            deCamelCase: function (inName) {
                return inName.replace(rDeCameCase, function (match, group1) {
                    return '-' + group1.toLowerCase();
                });
            },
            /**
             * Upper first word of a string.
             * @method capitalize
             * @param inString
             * @returns {string}
             */
            capitalize: function (inString) {
                return inString.charAt(0).toUpperCase() + inString.slice(1);
            }
        }
    });
})(nx);

(function (nx) {
    var Collection = nx.data.Collection;
    /**
     * Dom Node
     * @class nx.dom.Node
     * @constructor
     */
    var Node = nx.define('nx.dom.Node',nx.Comparable,{
        methods: {
            /**
             * Set $dom as an attribute for node
             * @param node
             */
            init: function (node) {
                this.$dom = node;
            },
            /**
             * Whether target is current dom element
             * @param target
             * @returns {number}
             */
            compare: function (target) {
                if (target && this.$dom === target.$dom) {
                    return 0;
                }
                else {
                    return -1;
                }
            },
            /**
             * Whether target is a element
             * @returns {boolean}
             */
            isElement: function () {
                return this.$dom.nodeType === 1;
            },
            /**
             * Get current element's index
             * @returns {number}
             */
            index: function () {
                var node,
                    index = 0;
                if (this.parentNode() !== null) {
                    while ((node = this.previousSibling()) !== null) {
                        ++index;
                    }
                } else {
                    index = -1;
                }
                return index;
            },
            /**
             * Get the index child element
             * @param inIndex
             * @returns {null}
             */
            childAt: function (inIndex) {
                var node = null;
                if (inIndex >= 0) {
                    node = this.firstChild();
                    while (node && --inIndex >= 0) {
                        node = node.nextSibling();
                        break;
                    }
                }
                return node;
            },
            /**
             * Compare dom element position
             * @param inTarget
             * @returns {*}
             */
            contains: function (inTarget) {
                return this.$dom && this.$dom.contains(inTarget.$dom);
            },
            /**
             * Get first element child
             * @returns {this.constructor}
             */
            firstChild: function () {
                return new this.constructor(this.$dom.firstElementChild);
            },
            /**
             * Get last element child
             * @returns {this.constructor}
             */
            lastChild: function () {
                return new this.constructor(this.$dom.lastElementChild);
            },
            /**
             * Get previous element
             * @returns {this.constructor}
             */
            previousSibling: function () {
                return new this.constructor(this.$dom.previousElementSibling);
            },
            /**
             * Get next element
             * @returns {this.constructor}
             */
            nextSibling: function () {
                return new this.constructor(this.$dom.nextElementSibling);
            },
            /**
             * Get parent element
             * @returns {this.constructor}
             */
            parentNode: function () {
                return new this.constructor(this.$dom.parentNode);
            },
            /**
             * Get element children
             * @returns {nx.data.Collection}
             */
            children: function () {
                var result = new Collection();
                nx.each(this.$dom.children, function (child) {
                    result.add(new this.constructor(child));
                }, this);
                return result;
            },
            /**
             * Clone an element node
             * @param deep
             * @returns {this.constructor}
             */
            cloneNode: function (deep) {
                return new this.constructor(this.$dom.cloneNode(deep));
            },
            /**
             * Whether the element has child.
             * @param child
             * @returns {boolean}
             */
            hasChild: function (child) {
                return child.$dom.parentNode == this.$dom;
            },
            /**
             * Adds a node to the end of the list of children of a specified parent node
             * @param child
             */
            appendChild: function (child) {
                this.$dom.appendChild(child.$dom);
            },
            /**
             * Inserts the specified node before a reference element as a child of the current node
             * @param child
             * @param ref
             */
            insertBefore: function (child,ref) {
                this.$dom.insertBefore(child.$dom,ref.$dom);
            },
            /**
             * Removes a child node from the DOM
             * @param child
             */
            removeChild: function (child) {
                if (this.hasChild(child)) {
                    this.$dom.removeChild(child.$dom);
                }
            },
            /**
             * Remove all child nodes
             */
            empty: function () {
                this.children().each(function (child) {
                    this.removeChild(child);
                },this);
            }
        }
    });
})(nx);
(function (nx) {
    /**
     * Text Node
     * @class nx.dom.Text
     * @constructor
     */
    nx.define('nx.dom.Text', nx.dom.Node);
})(nx);
(function (nx) {
    var global = nx.global,
        document = global.document,
        env = nx.Env,
        util = nx.Util;
    var rTableElement = /^t(?:able|d|h)$/i,
        rBlank = /\s+/,
        borderMap = {
            thin: '2px',
            medium: '4px',
            thick: '6px'
        },
        isGecko = env.engine().name === 'gecko';
    var MARGIN = 'margin',
        PADDING = 'padding',
        BORDER = 'border',
        POSITION = 'position',
        FIXED = 'fixed';

    var Collection = nx.data.Collection;
    //======attrHooks start======//
    var attrHooks = {
        value: {
            set: function (inElement, inValue) {
                var type = inElement.type;
                switch (type) {
                case 'checkbox':
                case 'radio':
                    inElement.checked = !!inValue;
                    break;
                default:
                    inElement.value = inValue;
                }
            },
            get: function (inElement) {
                var type = inElement.type;
                var value = inElement.value;
                switch (type) {
                case 'checkbox':
                case 'radio':
                    value = !!inElement.checked;
                    break;
                default:
                    value = inElement.value;
                }
                return value;
            }
        }
    };
    var baseAttrHooks = {
        'class': 'className',
        'for': 'htmlFor'
    };
    var booleanAttrHooks = {
        disabled: 'disabled',
        readonly: 'readonly',
        checked: 'checked'
    };
    //registerAttrHooks for Element
    (function registerAttrHooks() {

        //baseAttrHooks
        nx.each(baseAttrHooks, function (hookValue, hookKey) {
            attrHooks[hookKey] = {
                set: function (inElement, inValue) {
                    inElement[hookValue] = inValue;
                },
                get: function (inElement) {
                    return inElement[hookValue];
                }
            };
        });

        //booleanAttrHooks
        nx.each(booleanAttrHooks, function (hookValue, hookKey) {
            attrHooks[hookKey] = {
                set: function (inElement, inValue) {
                    if (!inValue) {
                        inElement.removeAttribute(hookKey);
                    } else {
                        inElement.setAttribute(hookKey, hookKey);
                    }
                    inElement[hookValue] = !!inValue;
                },
                get: function (inElement) {
                    return !!inElement[hookValue];
                }
            };
        });
    }());


    function getClsPos(inElement, inClassName) {
        return (' ' + inElement.className + ' ').indexOf(' ' + inClassName + ' ');
    }

    //======attrHooks end ======//
    /**
     * Dom Element
     * @class nx.dom.Element
     * @constructor
     */
    var Element = nx.define('nx.dom.Element', nx.dom.Node, {
        methods: {
            /**
             * Get an attribute from element
             * @method get
             * @param name
             * @returns {*}
             */
            get: function (name) {
                if (name === 'text') {
                    return this.getText();
                } else
                if (name == 'html') {
                    return this.getHtml();
                } else {
                    return this.getAttribute(name);
                }
            },
            /**
             * Set an attribute for an element
             * @method set
             * @param name
             * @param value
             */
            set: function (name, value) {
                if (name === 'text') {
                    this.setText(value);
                } else
                if (name == 'html') {
                    this.setHtml(value);
                } else {
                    this.setAttribute(name, value);
                }
            },
            /**
             * Get an element by selector.
             * @method get
             * @param inSelector
             * @returns {HTMLElement}
             */
            select: function (inSelector) {
                var element = this.$dom.querySelector(inSelector);
                return new Element(element);
            },
            /**
             * Get a collection by selector
             * @method selectAll
             * @param inSelector
             * @returns {nx.data.Collection}
             */
            selectAll: function (inSelector) {
                var elements = this.$dom.querySelectorAll(inSelector),
                    i = 0,
                    element = elements[i];
                var nxElements = new Collection();
                for (; element; i++) {
                    element = elements[i];
                    nxElements.add(new Element(element));
                }
                return nxElements;
            },
            /**
             * Focus an element
             * @method focus
             */
            focus: function () {
                this.$dom.focus();
            },
            /**
             * Blur form an element
             * @method blur
             */
            blur: function () {
                this.$dom.blur();
            },
            /**
             * Show an element
             * @method show
             */
            show: function () {
                this.setAttribute('nx-status', '');
            },
            /**
             * Hide an element
             * @method hide
             */
            hide: function () {
                this.setAttribute('nx-status', 'hidden');
            },
            /**
             * Whether the element has the class
             * @method hasClass
             * @param inClassName
             * @returns {boolean}
             */
            hasClass: function (inClassName) {
                var element = this.$dom;
                if (nx.Env.support('classList')) {
                    return this.$dom.classList.contains(inClassName);
                } else {
                    return getClsPos(element, inClassName) > -1;
                }
            },
            /**
             * Set css class existence for element
             * @method setClass
             * @param className the class name
             * @param has existence
             * @returns {*}
             */
            setClass: function (inClassName, inHas) {
                if (!inHas) {
                    this.removeClass(inClassName);
                } else {
                    this.addClass(inClassName);
                }
            },
            /**
             * Add class for element
             * @method addClass
             * @returns {*}
             */
            addClass: function () {
                var element = this.$dom;
                var args = arguments,
                    classList = element.classList;
                if (nx.Env.support('classList')) {
                    if (args.length === 1 && args[0].search(rBlank) > -1) {
                        args = args[0].split(rBlank);
                    }
                    return classList.add.apply(classList, args);
                } else if (!this.hasClass(args[0])) {
                    var curCls = element.className;
                    /* jslint -W093 */
                    return element.className = curCls ? (curCls + ' ' + args[0]) : args[0];
                }
            },
            /**
             * Remove class from element
             * @method removeClass
             * @returns {*}
             */
            removeClass: function () {
                var element = this.$dom;
                if (!element) {
                    return;
                }
                if (nx.Env.support('classList')) {
                    var classList = this.$dom.classList;
                    if (classList) {
                        return classList.remove.apply(classList, arguments);
                    }
                } else {
                    var curCls = element.className,
                        index = getClsPos(element, arguments[0]),
                        className = arguments[0];
                    if (index > -1) {
                        if (index === 0) {
                            if (curCls !== className) {
                                className = className + ' ';
                            }
                        } else {
                            className = ' ' + className;
                        }
                        element.className = curCls.replace(className, '');
                    }
                }
            },
            /**
             * Toggle a class on element
             * @method toggleClass
             * @param inClassName
             * @returns {*}
             */
            toggleClass: function (inClassName) {
                var element = this.$dom;
                if (nx.Env.support('classList')) {
                    return this.$dom.classList.toggle(inClassName);
                } else {
                    if (this.hasClass(inClassName)) {
                        this.removeClass(inClassName);
                    } else {
                        this.addClass(inClassName);
                    }
                }
            },
            /**
             * Get document
             * @method getDocument
             * @returns {*}
             */
            getDocument: function () {
                var element = this.$dom;
                var doc = document;
                if (element) {
                    doc = (element.nodeType === 9) ? element : // element === document
                        element.ownerDocument || // element === DOM node
                        element.document; // element === window
                }
                return doc;
            },
            /**
             * Get window
             * @method getWindow
             * @returns {DocumentView|window|*}
             */
            getWindow: function () {
                var doc = this.getDocument();
                return doc.defaultView || doc.parentWindow || global;
            },
            /**
             * Get root element
             * @method getRoot
             * @returns {Element}
             */
            getRoot: function () {
                return env.strict() ? document.documentElement : document.body;
            },
            /**
             * Get element position information
             * @method getBound
             * @returns {{top: number, right: Number, bottom: Number, left: number, width: Number, height: Number}}
             */
            getBound: function () {
                var box = this.$dom.getBoundingClientRect(),
                    root = this.getRoot(),
                    clientTop = root.clientTop || 0,
                    clientLeft = root.clientLeft || 0;
                return {
                    top: box.top - clientTop,
                    right: box.right,
                    bottom: box.bottom,
                    left: box.left - clientLeft,
                    width: box.width,
                    height: box.height
                };
            },
            /**
             * Get margin distance information
             * @method margin
             * @param inDirection
             * @returns {*}
             */
            margin: function (inDirection) {
                return this._getBoxWidth(MARGIN, inDirection);
            },
            /**
             * Get padding distance information
             * @method padding
             * @param inDirection
             * @returns {*}
             */
            padding: function (inDirection) {
                return this._getBoxWidth(PADDING, inDirection);
            },
            /**
             * Get border width information
             * @method border
             * @param inDirection
             * @returns {*}
             */
            border: function (inDirection) {
                return this._getBoxWidth(BORDER, inDirection);
            },
            /**
             * Get offset information
             * @method getOffset
             * @returns {{top: number, left: number}}
             */
            getOffset: function () {
                var box = this.$dom.getBoundingClientRect(),
                    root = this.getRoot(),
                    clientTop = root.clientTop || 0,
                    clientLeft = root.clientLeft || 0;
                return {
                    'top': box.top + (global.pageYOffset || root.scrollTop) - clientTop,
                    'left': box.left + (global.pageXOffset || root.scrollLeft) - clientLeft
                };
            },
            /**
             * Set offset style
             * @method setOffset
             * @param inStyleObj
             */
            setOffset: function (inStyleObj) {
                var elPosition = this.getStyle(POSITION),
                    styleObj = inStyleObj;
                var scrollXY = {
                    left: Math.max((global.pageXOffset || 0), root.scrollLeft),
                    top: Math.max((global.pageYOffset || 0), root.scrollTop)
                };
                if (elPosition === FIXED) {
                    styleObj = {
                        left: parseFloat(styleObj) + scrollXY.scrollX,
                        top: parseFloat(styleObj) + scrollXY.scrollY
                    };
                }
                this.setStyles(styleObj);
            },
            /**
             * Has in line style
             * @method hasStyle
             * @param inName
             * @returns {boolean}
             */
            hasStyle: function (inName) {
                var cssText = this.$dom.style.cssText;
                return cssText.indexOf(inName + ':') > -1;
            },
            /**
             * Get computed style
             * @method getStyle
             * @param inName
             * @param isInline
             * @returns {*}
             */
            getStyle: function (inName, isInline) {
                var property = util.getStyleProperty(inName);
                if (isInline) {
                    return this.$dom.style[property];
                } else {
                    var styles = getComputedStyle(this.$dom, null);
                    return styles[property] || '';
                }
            },
            /**
             * Set style for element
             * @method setStyle
             * @param inName
             * @param inValue
             */
            setStyle: function (inName, inValue) {
                var property = util.getStyleProperty(inName);
                this.$dom.style[property] = util.getStyleValue(inName, inValue);
            },
            /**
             * Remove inline style
             * @method removeStyle
             * @param inName
             */
            removeStyle: function (inName) {
                var property = util.getStyleProperty(inName, true);
                this.$dom.style.removeProperty(property);
            },
            /**
             * Set style by style object
             * @method setStyles
             * @param inStyles
             */
            setStyles: function (inStyles) {
                this.$dom.style.cssText += util.getCssText(inStyles);
            },
            /**
             * Get attribute
             * @method getAttribute
             * @param inName
             * @returns {*}
             */
            getAttribute: function (inName) {
                var hook = attrHooks[inName];
                if (hook) {
                    if (hook.get) {
                        return hook.get(this.$dom);
                    } else {
                        return this.$dom.getAttribute(hook);
                    }
                }
                return this.$dom.getAttribute(inName);
            },
            /**
             * Set attribute
             * @method setAttribute
             * @param inName
             * @param inValue
             * @returns {*}
             */
            setAttribute: function (inName, inValue) {
                if (inValue !== null && inValue !== undefined) {
                    var hook = attrHooks[inName];
                    if (hook) {
                        if (hook.set) {
                            return hook.set(this.$dom, inValue);
                        } else {
                            return this.$dom.setAttribute(hook, inValue);
                        }
                    }
                    return this.$dom.setAttribute(inName, inValue);
                }
            },
            /**
             * Remove attribute
             * @method removeAttribute
             * @param inName
             */
            removeAttribute: function (inName) {
                this.$dom.removeAttribute(baseAttrHooks[inName] || inName);
            },
            /**
             * Get all attributes
             * @method getAttributes
             * @returns {{}}
             */
            getAttributes: function () {
                var attrs = {};
                nx.each(this.$dom.attributes, function (attr) {
                    attrs[attr.name] = attr.value;
                });
                return attrs;
            },
            /**
             * Set attributes
             * @method setAttributes
             * @param attrs
             */
            setAttributes: function (attrs) {
                nx.each(attrs, function (value, key) {
                    this.setAttribute(key, value);
                }, this);
            },
            /**
             * Get inner text
             * @method getText
             * @returns {*}
             */
            getText: function () {
                return this.$dom.textContent;
            },
            /**
             * Set inner text
             * @method setText
             * @param text
             */
            setText: function (text) {
                this.$dom.textContent = text;
            },
            /**
             * Get inner html
             * @method getHtml
             * @returns {*|string}
             */
            getHtml: function () {
                return this.$dom.innerHTML;
            },
            /**
             * Set inner html
             * @method setHtml
             * @param html
             */
            setHtml: function (html) {
                this.$dom.innerHTML = html;
            },
            /**
             * Add event listener
             * @method addEventListener
             * @param name
             * @param listener
             * @param useCapture
             */
            addEventListener: function (name, listener, useCapture) {
                this.$dom.addEventListener(name, listener, useCapture || false);
            },
            /**
             * Remove event listener
             * @method removeEventListener
             * @param name
             * @param listener
             * @param useCapture
             */
            removeEventListener: function (name, listener, useCapture) {
                this.$dom.removeEventListener(name, listener, useCapture || false);
            },
            _getBoxWidth: function (inBox, inDirection) {
                var boxWidth, styleResult;
                var element = this.$dom;
                switch (inBox) {
                case PADDING:
                case MARGIN:
                    styleResult = this.getStyle(inBox + "-" + inDirection);
                    boxWidth = parseFloat(styleResult);
                    break;
                default:
                    styleResult = this.getStyle('border-' + inDirection + '-width');
                    if (isGecko) {
                        if (rTableElement.test(element.tagName)) {
                            styleResult = 0;
                        }
                    }
                    boxWidth = parseFloat(styleResult) || borderMap[styleResult];
                }
                return boxWidth || 0;
            }
        }
    });
})
(nx);

(function (nx) {

    var Collection = nx.data.Collection;
    /**
     * Dom Fragment
     * @class nx.dom.Fragment
     * @constructor
     */
    nx.define('nx.dom.Fragment', nx.dom.Node, {
        methods: {
            /**
             * Get collection child nodes.
             * @returns {nx.data.Collection}
             */
            children: function () {
                var result = new Collection();
                nx.each(this.$dom.childNodes, function (child) {
                    result.add(new this.constructor(child));
                }, this);
                return result;
            }
        }
    });
})(nx);
(function(nx) {
    var Element = nx.dom.Element;
    var Fragment = nx.dom.Fragment;
    var Text = nx.dom.Text,
        global = nx.global,
        document = global.document,
        util = nx.Util;

    var readyModel = {
        topFrame: null,
        hasReady: false,
        queue: [],
    };

    var readyService = {
        setHasReady: function(inValue) {
            readyModel.hasReady = inValue;
        },
        getHasReady: function() {
            return readyModel.hasReady;
        },
        addQueue: function(inHandler) {
            readyModel.queue.push(inHandler);
        },
        clearQueue: function() {
            readyModel.queue.length = 0;
        },
        execQueue: function() {
            var i = 0,
                length = readyModel.queue.length;
            for (; i < length; i++) {
                readyModel.queue[i]();
            }
        },
        setTopFrame: function(inValue) {
            readyModel.topFrame = inValue;
        },
        getTopFrame: function() {
            return readyModel.topFrame;
        }
    };

    var readyController = {
        initReady: function(inHandler) {
            readyService.addQueue(inHandler); //save the event
            return readyController.isReady();
        },
        fireReady: function() {
            readyService.execQueue();
            readyService.clearQueue();
        },
        setTopFrame: function() {
            // If IE and not a frame
            // continually check to see if the document is ready
            try {
                readyService.setTopFrame(global.frameElement === null && document.documentElement);
            } catch (e) {}
        },
        doScrollCheck: function() {
            var topFrame = readyService.getTopFrame();
            if (topFrame && topFrame.doScroll) {
                try {
                    // Use the trick by Diego Perini
                    // http://javascript.nwbox.com/IEContentLoaded/
                    topFrame.doScroll("left");
                } catch (e) {
                    return setTimeout(readyController.doScrollCheck, 50);
                }

                // and execute any waiting functions
                readyController.fireReady();
            }
        },
        isOnLoad: function(inEvent) {
            return (inEvent || global.event).type === 'load';
        },
        isReady: function() {
            return readyService.getHasReady() || document.readyState === "complete";
        },
        detach: function() {
            if (document.addEventListener) {
                document.removeEventListener("DOMContentLoaded", readyController.completed, false);
                global.removeEventListener("load", readyController.completed, false);
            } else {
                document.detachEvent("onreadystatechange", readyController.completed);
                global.detachEvent("onload", readyController.completed);
            }
        },
        w3cReady: function() {
            document.addEventListener('DOMContentLoaded', readyController.completed, false);
            global.addEventListener('load', readyController.completed, false);
        },
        ieReady: function() {
            document.attachEvent("onreadystatechange", readyController.completed);
            global.attachEvent("onload", readyController.completed);
            readyController.setTopFrame();
            readyController.doScrollCheck();
        },
        readyMain: function() {
            if (document.readyState === "complete") {
                return setTimeout(readyController.readyMain);
            } else {
                if (document.addEventListener) {
                    //w3c
                    readyController.w3cReady();
                } else {
                    //old ie
                    readyController.ieReady();
                }
            }
        },
        completed: function(inEvent) {
            if (readyController.isReady() || readyController.isOnLoad(inEvent)) {
                readyService.setHasReady(true);
                readyController.detach();
                readyController.fireReady();
            }
        }
    };

    var nsMap = {
        svg: "http://www.w3.org/2000/svg",
        xlink: "http://www.w3.org/1999/xlink",
        xhtml: "http://www.w3.org/1999/xhtml"
    };

    /**
     * Document Element
     * @class nx.dom.Document
     * @constructor
     */
    var Document = nx.define('nx.dom.Document', {
        static: true,
        properties: {
            /**
             * Get/set next cssStyle sheet
             * @property cssStyleSheet
             * @type {Object}
             * @default {}
             */
            cssStyleSheet: {
                get: function() {
                    var nxCssStyleSheet = this._cssStyleSheet;
                    if (!nxCssStyleSheet) {
                        var styleNode = document.getElementById('nx-style') || this._createStyleNode();
                        nxCssStyleSheet = this._cssStyleSheet = this._getCSSStyleSheetInstance(styleNode);
                    }
                    return nxCssStyleSheet;
                }
            },
            /**
             * Get document root element
             * @property root
             * @type {Object}
             * @default {}
             */
            root: {
                get: function() {
                    return document.documentElement;
                }
            },
            /**
             * Get next body element
             * @property body
             * @type {Object}
             * @default {}
             */
            body: {
                get: function() {
                    return new Element(document.body);
                }
            },
            html: {
                get: function() {
                    return new Element(document.getElementsByTagName('html')[0]);
                }
            }
        },
        methods: {
            init: function() {
                this.__listeners__ = {};
                this._documentListeners = {};
            },
            /**
             * Add an event handler.
             * @method on
             * @param name {String}
             * @param handler {Function}
             * @param [context] {Object}
             */
            on: function(name, handler, context) {
                var map = this.__listeners__;
                var listeners = map[name] = map[name] || [{
                    owner: null,
                    handler: null,
                    context: null
                }];

                listeners.push({
                    owner: this,
                    handler: handler,
                    context: context || this
                });

                this._attachDocumentListeners(name);

                var self;
                return {
                    release: function() {
                        self.off(name, handler, context);
                    }
                };
            },
            /**
             * Remove an event handler.
             * @method off
             * @param name {String}
             * @param [handler] {Function}
             * @param [context] {Object}
             */
            off: function(name, handler, context) {
                var listeners = this.__listeners__[name],
                    listener;
                if (listeners) {
                    if (handler) {
                        context = context || this;
                        for (var i = 0, length = listeners.length; i < length; i++) {
                            listener = listeners[i];
                            if (listener.handler == handler && listener.context == context) {
                                listeners.splice(i, 1);
                                break;
                            }
                        }
                    } else {
                        listeners.length = 1;
                    }
                }
            },
            /**
             * Add a single event handler.
             * @method upon
             * @param name {String}
             * @param handler {Function}
             * @param [context] {Object}
             */
            upon: function(name, handler, context) {
                var map = this.__listeners__;
                var listeners = map[name] = map[name] || [{
                    owner: null,
                    handler: null,
                    context: null
                }];

                listeners[0] = {
                    owner: this,
                    handler: handler,
                    context: context
                };

                this._attachDocumentListeners(name);
            },
            /**
             * Trigger an event.
             * @method fire
             * @param name {String}
             * @param [data] {*}
             */
            fire: function(name, data) {
                var listeners = this.__listeners__[name],
                    listener, result;
                if (listeners) {
                    listeners = listeners.slice();
                    for (var i = 0, length = listeners.length; i < length; i++) {
                        listener = listeners[i];
                        if (listener && listener.handler) {
                            result = listener.handler.call(listener.context, listener.owner, data);
                            if (result === false) {
                                return false;
                            }
                        }
                    }
                }
            },
            /**
             * Register html tag namespace
             * @method registerNS
             * @param key
             * @param value
             */
            registerNS: function(key, value) {
                nsMap[key] = value;
            },
            /**
             * Get a tag namespace value
             * @method resolveNS
             * @param key
             * @returns {*}
             */
            resolveNS: function(key) {
                return nsMap[key];
            },
            /**
             * Create document fragment
             * @method createFragment
             * @returns {nx.dom.Fragment}
             */
            createFragment: function() {
                return new Fragment(document.createDocumentFragment());
            },
            /**
             * Create element
             * @method createElement
             * @param tag
             * @returns {nx.dom.Element}
             */
            createElement: function(tag) {
                return new Element(document.createElement(tag));
            },
            /**
             * Create text node.
             * @method createText
             * @param text
             * @returns {nx.dom.Text}
             */
            createText: function(text) {
                return new Text(document.createTextNode(text));
            },
            /**
             * Create element by namespace
             * @method createElementNS
             * @param ns
             * @param tag
             * @returns {nx.dom.Element}
             */
            createElementNS: function(ns, tag) {
                var uri = Document.resolveNS(ns);
                if (uri) {
                    return new Element(document.createElementNS(uri, tag));
                } else {
                    throw new Error('The namespace ' + ns + ' is not registered.');
                }
            },
            /**
             * Wrap dom element to next element
             * @method wrap
             * @param dom
             * @returns {*}
             */
            wrap: function(dom) {
                if (nx.is(dom, Node)) {
                    return dom;
                } else {

                }
            },
            /**
             * Get document position information
             * @method docRect
             * @returns {{width: (Function|number), height: (Function|number), scrollWidth: *, scrollHeight: *, scrollX: *, scrollY: *}}
             */
            docRect: function() {
                var root = this.root(),
                    height = global.innerHeight || 0,
                    width = global.innerWidth || 0,
                    scrollW = root.scrollWidth,
                    scrollH = root.scrollHeight,
                    scrollXY = {
                        left: Math.max((global.pageXOffset || 0), root.scrollLeft),
                        top: Math.max((global.pageYOffset || 0), root.scrollTop)
                    };
                scrollW = Math.max(scrollW, width);
                scrollH = Math.max(scrollH, height);
                return {
                    width: width,
                    height: height,
                    scrollWidth: scrollW,
                    scrollHeight: scrollH,
                    scrollX: scrollXY.left,
                    scrollY: scrollXY.top
                };
            },
            /**
             * Dom ready
             * @method ready
             * @param inHandler
             */
            ready: function(inHandler) {
                //add handler to queue:
                if (readyController.initReady(inHandler)) {
                    setTimeout(readyController.fireReady, 1);
                } else {
                    readyController.readyMain();
                }
            },
            /**
             * Add a rule to next style sheet
             * @method addRule
             * @param inSelector
             * @param inCssText
             * @param inIndex
             * @returns {*}
             */
            addRule: function(inSelector, inCssText, inIndex) {
                var cssText = inSelector + "{" + inCssText + "}";
                return this._ruleAction('insert', [cssText, inIndex]);
            },
            /**
             * insert a rule to next style sheet
             * @method insertRule
             * @param inFullCssText
             * @param inIndex
             * @returns {*}
             */
            insertRule: function(inFullCssText, inIndex) {
                return this._ruleAction('insert', [inFullCssText, inIndex]);
            },
            /**
             * Delete a rule from next style sheet at last line
             * @method deleteRule
             * @param inIndex
             * @returns {*}
             */
            deleteRule: function(inIndex) {
                return this._ruleAction('delete', [inIndex]);
            },
            /**
             * Remove a rule from next style sheet
             * @method removeRule
             * @param inSelector
             * @param inIndex
             * @returns {*}
             */
            removeRule: function(inSelector, inIndex) {
                return this._ruleAction('remove', [inSelector, inIndex]);
            },
            /**
             * Add multi rules
             * @method addRules
             * @param inRules
             */
            addRules: function(inRules) {
                nx.each(inRules, function(rule, selector) {
                    this.addRule(selector, util.getCssText(rule), null);
                }, this);
            },
            /**
             * Delete all rules
             * @method deleteRules
             */
            deleteRules: function() {
                var defLength = this.cssStyleSheet().rules.length;
                while (defLength--) {
                    this.deleteRule(0);
                }
            },
            _ruleAction: function(inAction, inArgs) {
                var styleSheet = this.cssStyleSheet();
                var lastIndex = inArgs.length - 1;
                //set default index
                inArgs[lastIndex] = this._defRuleIndex(styleSheet, inArgs[lastIndex]);
                styleSheet[inAction + 'Rule'].apply(styleSheet, inArgs);
                return this._defRuleIndex(styleSheet, null);
            },
            _defRuleIndex: function(inStyleSheet, inIndex) {
                var rules = inStyleSheet.rules ||inStyleSheet.cssRules;
                return inIndex == null ? rules.length : inIndex;
            },
            _createStyleNode: function() {
                var styleNode = document.createElement("style");
                styleNode.type = "text/css";
                styleNode.id = "nx-style";
                (document.head || document.getElementsByTagName("head")[0] || document.documentElement).appendChild(styleNode);
                return styleNode;
            },
            _getCSSStyleSheetInstance: function(inStyleNode) {
                var styleSheets = document.styleSheets,
                    key,
                    sheet = null;
                for (key in styleSheets) {
                    sheet = styleSheets[key];
                    if (sheet.ownerNode === inStyleNode) {
                        break;
                    }
                }
                return sheet;
            },
            _attachDocumentListeners: function(name) {
                var documentListeners = this._documentListeners;
                if (!(name in documentListeners)) {
                    var self = this;
                    var listener = documentListeners[name] = function(event) {
                        self.fire(name, event);
                    };

                    document.addEventListener(name, listener);
                }
            }
        }
    });
})(nx);
(function (nx) {
    var global = nx.global;
    var Binding = nx.Binding;
    var Collection = nx.data.Collection;
    var Document = nx.dom.Document;

    function extractBindingExpression(value) {
        if (nx.is(value, 'String')) {
            var start = value.indexOf('{');
            var end = value.indexOf('}');

            if (start >= 0 && end > start) {
                return value.slice(start + 1, end);
            }
        }

        return null;
    }

    function setProperty(target, name, value, source, owner) {
        if (nx.is(value, Binding)) {
            target.setBinding(name, nx.extend(value.gets(), {
                bindingType: 'property'
            }));
        } else {
            var expr = extractBindingExpression(value);
            if (expr !== null) {
                if (expr[0] === '#') {
                    target.setBinding(name, expr.slice(1) + ',bindingType=property', owner || target);
                } else {
                    target.setBinding(name, (expr ? 'model.' + expr : 'model') + ',bindingType=property', source || target);
                }
            } else {
                target.set(name, value);
            }
        }
    }

    function setEvent(target, name, value, source, owner) {
        if (nx.is(value, Binding)) {
            target.setBinding(name, value.gets());
        } else {
            var expr = extractBindingExpression(value);
            if (expr !== null) {
                if (expr[0] === '#') {
                    target.setBinding(name, expr.slice(1) + ',bindingType=event', owner || target);
                } else {
                    target.setBinding(name, (expr ? 'model.' + expr : 'model') + ',bindingType=event', source || target);
                }
            } else {
                target.on(name, value, owner || target);
            }
        }
    }

    function createComponent(view, owner) {
        if (view || view === 0) {
            var comp;
            if (nx.is(view, 'Array')) {
                comp = new DOMComponent('fragment');

                nx.each(view, function (child) {
                    createComponent(child, owner).attach(comp);
                });
            } else if (nx.is(view, 'Object')) {
                var type = view.type;
                if (type) {
                    var clazz = nx.is(type, 'String') ? nx.path(global, type) : type;
                    if (nx.is(clazz, 'Function')) {
                        comp = new clazz();
                    } else {
                        throw new Error('Component "' + type + '" is not defined.');
                    }
                } else {
                    comp = new DOMComponent(view.tag || 'div');
                }

                var name = view.name;
                var props = view.props;
                var events = view.events;
                var content = view.content;

                if (name) {
                    comp.register('@name', name);
                }

                if (owner) {
                    comp.owner(owner);
                }

                nx.each(events, function (value, name) {
                    setEvent(comp, name, value, comp, owner);
                });

                nx.each(props, function (value, name) {
                    if (nx.is(value, 'Array')) {
                        nx.each(value, function (item) {
                            if (nx.is(item, 'Object')) {
                                item.__owner__ = owner;
                            }
                        });
                    }

                    if (nx.is(value, 'Object')) {
                        value.__owner__ = owner;
                    }

                    setProperty(comp, name, value, comp, owner);
                });

                if (content !== undefined) {
                    setProperty(comp, 'content', content, comp, owner);
                }
            } else {
                comp = new DOMComponent('text', view);
            }

            return comp;
        }

        return null;
    }

    /**
     * @class Collection
     * @namespace nx.ui
     * @extends nx.Observable
     */
    var AbstractComponent = nx.define('nx.ui.AbstractComponent', nx.Observable, {
        abstract: true,
        statics: {
            /**
             * Create component by json view.
             * @method createComponent
             * @static
             */
            createComponent: createComponent
        },
        events: ['enter', 'leave', 'contententer', 'contentleave'],
        properties: {
            /**
             * @property count
             * @type {nx.data.Collection}
             */
            content: {
                get: function () {
                    return this._content;
                },
                set: function (value) {
                    nx.each(this._content.toArray(), function (c) {
                        c.destroy();
                    });
                    if (nx.is(value, AbstractComponent)) {
                        value.attach(this);
                    } else if (nx.is(value, 'Array')) {
                        nx.each(value, function (v) {
                            createComponent(v, this.owner()).attach(this);
                        }, this);
                    } else if (value || value === 0) {
                        createComponent(value, this.owner()).attach(this);
                    }
                }
            },
            /**
             * @property model
             * @type {Any}
             */
            model: {
                get: function () {
                    return this._model_was_set ? this._model : this._inheritedModel;
                },
                set: function (value, inherited) {
                    if (inherited && this._model_was_set) {
                        return false;
                    }

                    if (inherited) {
                        this._inheritedModel = value;
                    } else {
                        this._model = value;
                        this._model_was_set = true;
                    }

                    this._content.each(function (c) {
                        if (!nx.is(c, 'String')) {
                            c.model(value, true);
                        }
                    });
                }
            },
            /**
             * @property owner
             * @type {nx.ui.AbstractComponent}
             */
            owner: {
                value: null
            },
            /**
             * @property parent
             * @type {nx.ui.AbstractComponent}
             */
            parent: {
                value: null
            }
        },
        methods: {
            init: function () {
                this.inherited();
                this._resources = {};
                this._content = new Collection();
            },
            /**
             * Attach the component to parent.
             * @method attach
             * @param parent
             * @param index
             */
            attach: function (parent, index) {
                this.detach();

                if (nx.is(parent, AbstractComponent)) {
                    var name = this.resolve('@name');
                    var owner = this.owner() || parent;

                    if (name) {
                        owner.register(name, this);
                    }

                    this.onAttach(parent, index);
                    parent.onChildAttach(this, index);

                    if (index >= 0) {
                        parent.content().insert(this, index);
                    } else {
                        parent.content().add(this);
                    }

                    this.parent(parent);
                    this.owner(owner);
                    parent.fire('contententer', {
                        content: this,
                        owner: owner
                    });
                    this.fire('enter', {
                        parent: parent,
                        owner: owner
                    });

                    this._attached = true;
                }
            },
            /**
             * Detach the component from parent.
             * @method detach
             */
            detach: function () {
                if (this._attached) {
                    var name = this.resolve('@name');
                    var owner = this.owner();
                    var parent = this.parent();

                    if (name) {
                        owner.unregister(name);
                    }

                    this.onDetach(parent);
                    parent.onChildDetach(this);
                    parent.content().remove(this);
                    this.parent(null);
                    this.owner(null);
                    parent.fire('contentleave', {
                        content: this,
                        owner: owner
                    });
                    this.fire('leave', {
                        parent: parent,
                        owner: owner
                    });
                    this._attached = false;
                }
            },
            /**
             * Register a resource.
             * @method register
             * @param name
             * @param value
             * @param force
             */
            register: function (name, value, force) {
                var resources = this._resources;
                if (resources && !(name in resources) || force) {
                    resources[name] = value;
                }
            },
            /**
             * Unregister a resource.
             * @method unregister
             * @param name
             */
            unregister: function (name) {
                var resources = this._resources;
                if (resources && name in resources) {
                    delete resources[name];
                }
            },
            /**
             * Resolve a resource.
             * @method resolve
             * @param name
             * @returns {Any}
             */
            resolve: function (name) {
                var resources = this._resources;
                if (resources && name in resources) {
                    return resources[name];
                }
            },
            /**
             * Get the container for component.
             * @method getContainer
             * @param comp
             * @returns {nx.dom.Element}
             */
            getContainer: function (comp) {
                if (this.resolve('@tag') === 'fragment') {
                    var parent = this.parent();
                    if (parent) {
                        return parent.getContainer(comp);
                    }
                }

                return this.resolve('@root');
            },
            /**
             * Dispose the component.
             * @method dispose
             */
            dispose: function () {
                this.inherited();
                if (this._content) {
                    this._content.each(function (content) {
                        content.dispose();
                    });
                }

                this._resources = null;
                this._content = null;
                this._model = null;
                this._inheritedModel = null;
                this.dispose = function () {};
            },
            /**
             * Destroy the component.
             * @method destroy
             */
            destroy: function () {
                this.detach();
                this.inherited();
            },
            /**
             * Template method for component attach.
             * @method onAttach
             */
            onAttach: function (parent, index) {},
            /**
             * Template method for component detach.
             * @method onDetach
             */
            onDetach: function (parent) {},
            /**
             * Template method for child component attach.
             * @method onChildAttach
             */
            onChildAttach: function (child, index) {},
            /**
             * Template method for child component detach.
             * @method onChildDetach
             */
            onChildDetach: function (child) {}
        }
    });

    /**
     * @class CssClass
     * @extends nx.Observable
     * @internal
     */
    var CssClass = nx.define(nx.Observable, {
        methods: {
            init: function (comp) {
                this.inherited();
                this._comp = comp;
                this._classList = [];
            },
            has: function (name) {
                return name in this._classList;
            },
            get: function (name) {
                return this._classList[name];
            },
            set: function (name, value) {
                this._classList[name] = value;
                this._comp.resolve('@root').set('class', this._classList.join(' '));
            },
            hasClass: function (name) {
                return this._classList.indexOf(name) >= 0;
            },
            addClass: function (name) {
                if (!this.hasClass(name)) {
                    this._classList.push(name);
                    this._comp.resolve('@root').set('class', this._classList.join(' '));
                }
            },
            removeClass: function (name) {
                var index = this._classList.indexOf(name);
                if (index >= 0) {
                    this._classList.splice(index, 1);
                    this._comp.resolve('@root').set('class', this._classList.join(' '));
                }
            },
            toggleClass: function (name) {
                var index = this._classList.indexOf(name);
                if (index >= 0) {
                    this._classList.splice(index, 1);
                } else {
                    this._classList.push(name);
                }

                this._comp.resolve('@root').set('class', this._classList.join(' '));
            },
            dispose: function () {
                this.inherited();
                this._comp = null;
                this._classList = null;
            }
        }
    });

    /**
     * @class CssStyle
     * @extends nx.Observable
     * @internal
     */
    var CssStyle = nx.define(nx.Observable, {
        methods: {
            init: function (comp) {
                this.inherited();
                this._comp = comp;
            },
            get: function (name) {
                return this._comp.resolve('@root').getStyle(name);
            },
            set: function (name, value) {
                this._comp.resolve('@root').setStyle(name, value);
            },
            dispose: function () {
                this.inherited();
                this._comp = null;
            }
        }
    });

    /**
     * @class DOMComponent
     * @extends nx.ui.AbstractComponent
     * @internal
     */
    var DOMComponent = nx.define(AbstractComponent, {
        final: true,
        events: ['generated'],
        properties: {
            /**
             * @property class
             * @type {CssClass}
             */
            'class': {
                get: function () {
                    return this._class;
                },
                set: function (value) {
                    var cssClass = this._class;
                    if (nx.is(value, 'Array')) {
                        nx.each(value, function (item, index) {
                            setProperty(cssClass, '' + index, item, this, value.__owner__ || this.owner());
                        }, this);
                    } else if (nx.is(value, 'Object')) {
                        if (value.add) {
                            this._class.addClass(value.add);
                        }
                        if (value.remove) {
                            this._class.addClass(value.remove);
                        }
                        if (value.toggle) {
                            this._class.addClass(value.toggle);
                        }
                    } else {
                        this.resolve('@root').set('class', value);
                    }
                }
            },
            /**
             * @property style
             * @type {CssStyle}
             */
            style: {
                get: function () {
                    return this._style;
                },
                set: function (value) {
                    if (nx.is(value, 'Object')) {
                        var cssStyle = this._style;
                        nx.each(value, function (v, k) {
                            setProperty(cssStyle, k, v, this, value.__owner__ || this.owner());
                        }, this);
                    } else {
                        this.resolve('@root').set('style', value);
                    }
                }
            },
            /**
             * @property template
             */
            template: {
                get: function () {
                    return this._template;
                },
                set: function (value) {
                    this._template = value;
                    this._generateContent();
                }
            },
            /**
             * @property items
             */
            items: {
                get: function () {
                    return this._items;
                },
                set: function (value) {
                    var items = this._items;
                    if (items && items.off) {
                        items.off('change', this._onItemsChange, this);
                    }
                    items = this._items = value;
                    if (items && items.on) {
                        items.on('change', this._onItemsChange, this);
                    }

                    this._generateContent();
                }
            },
            /**
             * @property value
             */
            value: {
                get: function () {
                    return this.resolve('@root').get('value');
                },
                set: function (value) {
                    return this.resolve('@root').set('value', value);
                },
                binding: {
                    direction: '<>'
                }
            },
            /**
             * @property states
             */
            states: {
                value: null
            },
            /**
             * @property dom
             */
            dom: {
                get: function () {
                    return this.resolve('@root');
                }
            }
        },
        methods: {
            init: function (tag, text) {
                this.inherited();
                this._domListeners = {};
                this._resources = {};
                this._content = new Collection();
                this._class = new CssClass(this);
                this._style = new CssStyle(this);

                if (tag) {
                    var tokens = tag.split(':');
                    if (tokens.length === 2) {
                        var ns = tokens[0];
                        tag = tokens[1];
                        this.register('@ns', ns);
                        this.register('@root', Document.createElementNS(ns, tag));
                    } else if (tag === 'text') {
                        this.register('@root', Document.createText(text));
                    } else if (tag === 'fragment') {
                        this.register('@root', Document.createFragment());
                    } else {
                        this.register('@root', Document.createElement(tag));
                    }

                    this.register('@tag', tag);
                }

                //Temp
                switch (tag) {
                case 'input':
                case 'textarea':
                    this.on('change', function (sender, event) {
                        switch (event.target.type) {
                        case 'checkbox':
                        case 'radio':
                            this.notify('checked');
                            break;
                        default:
                            this.notify('value');
                            break;
                        }
                    }, this);
                    this.on('input', function (sender, event) {
                        this.notify('value');
                    }, this);
                    break;
                case 'select':
                    this.on('change', function (sender, event) {
                        this.notify('selectedIndex');
                        this.notify('value');
                    }, this);
                    break;
                }
            },
            get: function (name) {
                if (this.has(name) || name.indexOf(':') >= 0) {
                    return this.inherited(name);
                } else {
                    return this.resolve('@root').get(name);
                }
            },
            set: function (name, value) {
                if (this.has(name) || name.indexOf(':') >= 0) {
                    this.inherited(name, value);
                } else {
                    this.resolve('@root').set(name, value);
                    this.notify(name);
                }
            },
            on: function (name, handler, context) {
                this._attachDomListener(name);
                return this.inherited(name, handler, context);
            },
            upon: function (name, handler, context) {
                this._attachDomListener(name);
                return this.inherited(name, handler, context);
            },
            dispose: function () {
                var root = this.resolve('@root');
                if (root) {
                    nx.each(this._domListeners, function (listener, name) {
                        if (name.charAt(0) === ':') {
                            root.removeEventListener(name.slice(1), listener, true);
                        } else {
                            root.removeEventListener(name, listener);
                        }
                    });
                }
                this.items(null);
                this._class.dispose();
                this._style.dispose();
                this.inherited();
                this._domListeners = null;
            },
            onAttach: function (parent, index) {
                var root = this.resolve('@root');
                if (root) {
                    var container = parent.getContainer(this);

                    if (index >= 0) {
                        var ref = parent.content().getItem(index);

                        if (ref && ref.resolve('@tag') === 'fragment') {
                            ref = ref.content().getItem(0);
                        }

                        if (ref) {
                            container.insertBefore(root, ref.resolve('@root'));
                        } else {
                            container.appendChild(root);
                        }
                    } else {
                        container.appendChild(root);
                    }

                    var states = this.states();
                    var enterState = null;
                    if (states) {
                        enterState = states.enter;
                    }

                    if (enterState) {
                        var cssText = root.$dom.style.cssText;
                        var transition = 'all ' + (enterState.duration || 500) + 'ms';
                        root.setStyles(nx.extend({
                            transition: transition
                        }, enterState));
                        this.upon('transitionend', function () {
                            root.removeStyle('transition');
                        });
                        setTimeout(function () {
                            root.$dom.style.cssText = cssText + ';transition: ' + transition;
                        }, 10);
                    }
                }
            },
            onDetach: function (parent) {
                var root = this.resolve('@root');
                if (root) {
                    var tag = this.resolve('@tag');
                    var self = this;

                    if (tag === 'fragment') {
                        nx.each(self.content(), function (child) {
                            root.appendChild(child.resolve('@root'));
                        });
                    } else {
                        var states = this.states();
                        var leaveState = null;
                        if (states) {
                            leaveState = states.leave;
                        }

                        if (leaveState) {
                            var cssText = root.$dom.style.cssText;
                            var transition = 'all ' + (leaveState.duration || 500) + 'ms';
                            root.setStyle('transition', transition);
                            setTimeout(function () {
                                root.setStyles(leaveState);
                            }, 10);
                            this.upon('transitionend', function () {
                                root.$dom.style.cssText = cssText;
                                parent.getContainer(this).removeChild(root);
                            });
                        } else {
                            parent.getContainer(this).removeChild(root);
                        }
                    }
                }
            },
            _attachDomListener: function (name) {
                var domListeners = this._domListeners;
                if (!(name in domListeners)) {
                    var self = this;
                    var root = this.resolve('@root');
                    var listener = domListeners[name] = function (event) {
                        self.fire(name, event);
                    };

                    if (name.charAt(0) === ':') {
                        root.addEventListener(name.slice(1), listener, true);
                    } else {
                        root.addEventListener(name, listener);
                    }
                }
            },
            _generateContent: function () {
                var template = this._template;
                var items = this._items;
                nx.each(this._content.toArray(), function (c) {
                    c.detach();
                    setTimeout(function () {
                        c.dispose();
                    }, 600);
                });

                if (template && items) {
                    nx.each(items, function (item) {
                        var comp = createComponent(template, this.owner());
                        comp.model(item);
                        comp.attach(this);
                    }, this);

                    this.fire('generated');
                }
            },
            _onItemsChange: function (sender, event) {
                var template = this._template;
                var action = event.action;
                var index = event.index;
                index = index >= 0 ? index : -1;
                if (action === 'add') {
                    nx.each(event.items, function (item, i) {
                        var comp = createComponent(template, this.owner());
                        comp.model(item);
                        comp.attach(this, index + i);
                    }, this);
                } else if (action === 'remove') {
                    nx.each(event.items, function (item) {
                        nx.each(this.content().toArray(), function (comp) {
                            if (comp.model() === item) {
                                comp.detach();
                            }
                        }, this);
                    }, this);
                } else if (action === 'replace') {
                    // XXX no need to handle if bind to model.value
                } else if (action === 'sort') {
                    var comparator = event.comparator;
                    var sortedContent = this.content().toArray().sort(function (a, b) {
                        return comparator(a.model(), b.model());
                    });

                    nx.each(sortedContent, function (comp) {
                        comp.attach(this);
                    }, this);
                } else {
                    this._generateContent();
                }
            }
        }
    });
})(nx);

(function (nx) {
    var AbstractComponent = nx.ui.AbstractComponent;

    /**
     * @class Component
     * @namespace nx.ui
     * @extends nx.ui.AbstractComponent
     */
    nx.define('nx.ui.Component', AbstractComponent, {
        properties: {
            model: {
                get: function () {
                    return this._model === undefined ? this._inheritedModel : this._model;
                },
                set: function (value, inherited) {
                    if (inherited) {
                        this._inheritedModel = value;
                    } else {
                        this._model = value;
                    }

                    var view = this.view();
                    if (view) {
                        view.model(value, true);
                    }

                    var content = this._content;
                    if (content) {
                        content.each(function (c) {
                            if (!nx.is(c, 'String')) {
                                c.model(value, true);
                            }
                        });
                    }
                }
            },
            'class': {
                get: function () {
                    return this.view().get('class');
                },
                set: function (value) {
                    this.view().set('class', value);
                }
            },
            style: {
                get: function () {
                    return this.view().style();
                },
                set: function (value) {
                    this.view().style(value);
                }
            },
            dom: {
                get: function () {
                    return this.resolve('@root');
                }
            }
        },
        methods: {
            init: function () {
                this.inherited();
                var view = this['@view'];
                if (nx.is(view, 'Function')) {
                    var cls = this.constructor;
                    var superView;
                    while (cls) {
                        cls = cls.__super__;
                        superView = cls['@view'];
                        if (superView) {
                            break;
                        }
                    }
                    view = view.call(this, nx.clone(superView, true));
                }

                if (view) {
                    var comp = AbstractComponent.createComponent(view, this);
                    this.register('@root', comp.resolve('@root'));
                    this.register('@tag', comp.resolve('@tag'));
                    this.register('@comp', comp);
                }
            },
            view: function (name) {
                return this.resolve(name || '@comp');
            },
            get: function (name) {
                if (this.has(name)) {
                    return this.inherited(name);
                } else {
                    return this.view().get(name);
                }
            },
            set: function (name, value) {
                if (this.has(name)) {
                    this.inherited(name, value);
                } else {
                    this.view().set(name, value);
                    this.notify(name);
                }
            },
            onAttach: function (parent, index) {
                this.view().onAttach(parent, index);
            },
            onDetach: function () {
                this.view().onDetach(this.parent());
            },
            on: function (name, handler, context) {
                if (this.can(name)) {
                    return this.inherited(name, handler, context);
                } else {
                    return this.view().on(name, handler, context);
                }
            },
            upon: function (name, handler, context) {
                if (this.can(name)) {
                    this.inherited(name, handler, context);
                } else {
                    this.view().upon(name, handler, context);
                }
            },
            off: function (name, handler, context) {
                if (this.can(name)) {
                    this.inherited(name, handler, context);
                } else {
                    this.view().off(name, handler, context);
                }
            },
            dispose: function () {
                var comp = this.view();
                if (comp) {
                    comp.dispose();
                }

                this.inherited();
            }
        }
    });
})(nx);

(function (nx) {
    var global = nx.global;
    var Document = nx.dom.Document;

    /**
     * @class Application
     * @namespace nx.ui
     * @extends nx.ui.AbstractComponent
     */
    nx.define('nx.ui.Application', nx.ui.AbstractComponent, {
        properties: {
            container: {}
        },
        methods: {
            init: function () {
                this.inherited();
                var startFn = this.start;
                var stopFn = this.stop;
                var self = this;
                this.start = function (options) {
                    Document.ready(function () {
                        nx.app = self;
                        startFn.call(self, options);
                    });
                    return this;
                };

                this.stop = function () {
                    nx.app = null;
                    stopFn.call(self);
                };

                this._globalListeners = {};
            },
            /**
             * Start the application.
             * @method start
             */
            start: function () {
                throw new Error('Method "start" is not implemented');
            },
            /**
             * Stop the application.
             * @method stop
             */
            stop: function () {
                throw new Error('Method "stop" is not implemented');
            },
            getContainer: function () {
                if (this.container()) {
                    return new nx.dom.Element(this.container());
                } else {
                    return Document.body();
                }

            },
            on: function (name, handler, context) {
                if (!this.can(name)) {
                    this._attachGlobalListeners(name);
                }

                return this.inherited(name, handler, context);
            },
            upon: function (name, handler, context) {
                if (!this.can(name)) {
                    this._attachGlobalListeners(name);
                }

                this.inherited(name, handler, context);
            },
            _attachGlobalListeners: function (name) {
                var globalListeners = this._globalListeners;
                if (!(name in globalListeners)) {
                    var self = this;
                    var listener = globalListeners[name] = function (event) {
                        self.fire(name, event);
                    };

                    window.addEventListener(name, listener);
                }
            }
        }
    });
})(nx);

(function (nx, global) {

    nx.define("nx.util", {
        static: true,
        methods: {
            uuid: function () {
                return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
                    var r = Math.random() * 16 | 0,
                        v = c == 'x' ? r : (r & 0x3 | 0x8);
                    return v.toString(16);
                }).toUpperCase();
            },
            without: function (array, item) {
                var index;
                while ((index = array.indexOf(item)) != -1) {
                    array.splice(index, 1);
                }
                return array;
            },
            find: function (array, iterator, context) {
                var result;
                array.some(function (value, index, list) {
                    if (iterator.call(context || this, value, index, list)) {
                        result = value;
                        return true;
                    }
                });
                return result;
            },
            uniq: function (array, iterator, context) {
                var initial = iterator ? array.map(iterator.bind(context || this)) : array;
                var results = [];
                nx.each(initial, function (value, index) {
                    if (results.indexOf(value) == -1) {
                        results.push(array[index]);
                    }
                });
                return results;
            },
            indexOf: function (array, item) {
                return array.indexOf(item);
            },
            setProperty: function (source, key, value, owner) {
                if (value !== undefined) {
                    if (nx.is(value, 'String')) {
                        if (value.substr(0, 5) == 'model') { // directly target'bind model
                            source.setBinding(key, value + ',direction=<>', source);
                        } else if (value.substr(0, 2) == '{#') { // bind owner's property
                            source.setBinding(key, 'owner.' + value.substring(2, value.length - 1) + ',direction=<>', owner);
                        } else if (value.substr(0, 1) == '{') { // bind owner's model
                            source.setBinding(key, 'owner.model.' + value.substring(1, value.length - 1), owner);
                        } else {
                            source.set(key, value);
                        }
                    } else {
                        source.set(key, value);
                    }
                }
            },
            loadScript: function (url, callback) {
                var script = document.createElement("script");
                script.type = "text/javascript";

                if (script.readyState) { //IE
                    script.onreadystatechange = function () {
                        if (script.readyState == "loaded" ||
                            script.readyState == "complete") {
                            script.onreadystatechange = null;
                            callback();
                        }
                    };
                } else { //Others
                    script.onload = function () {
                        callback();
                    };
                }
                script.src = url;
                document.getElementsByTagName("head")[0].appendChild(script);
            },
            parseURL: function (url) {
                var a = document.createElement('a');
                a.href = url;
                return {
                    source: url,
                    protocol: a.protocol.replace(':', ''),
                    host: a.hostname,
                    port: a.port,
                    query: a.search,
                    params: (function () {
                        var ret = {},
                            seg = a.search.replace(/^\?/, '').split('&'),
                            len = seg.length,
                            i = 0,
                            s;
                        for (; i < len; i++) {
                            if (!seg[i]) {
                                continue;
                            }
                            s = seg[i].split('=');
                            ret[s[0]] = s[1];
                        }
                        return ret;
                    })(),
                    file: (a.pathname.match(/\/([^\/?#]+)$/i) || [, ''])[1],
                    hash: a.hash.replace('#', ''),
                    path: a.pathname.replace(/^([^\/])/, '/$1'),
                    relative: (a.href.match(/tps?:\/\/[^\/]+(.+)/) || [, ''])[1],
                    segments: a.pathname.replace(/^\//, '').split('/')
                };
            },
            keys: function (obj) {
                return Object.keys(obj);
            },
            values: function (obj) {
                var values = [];
                for (var key in obj) {
                    if (obj.hasOwnProperty(key)) {
                        values.push(obj[key]);
                    }
                }
                return values;
            },
            boundHitTest: function (sourceBound, targetBound) {
                var t = targetBound.top >= sourceBound.top && targetBound.top <= ((sourceBound.top + sourceBound.height)),
                    l = targetBound.left >= sourceBound.left && targetBound.left <= (sourceBound.left + sourceBound.width),
                    b = (sourceBound.top + sourceBound.height) >= (targetBound.top + targetBound.height) && (targetBound.top + targetBound.height) >= sourceBound.top,
                    r = (sourceBound.left + sourceBound.width) >= (targetBound.left + targetBound.width) && (targetBound.left + targetBound.width) >= sourceBound.left,
                    hm = sourceBound.top >= targetBound.top && (sourceBound.top + sourceBound.height) <= (targetBound.top + targetBound.height),
                    vm = sourceBound.left >= targetBound.left && (sourceBound.left + sourceBound.width) <= (targetBound.left + targetBound.width);

                return (t && l) || (b && r) || (t && r) || (b && l) || (t && vm) || (b && vm) || (l && hm) || (r && hm);
            },
            isFirefox: function () {
                return navigator.userAgent.indexOf("Firefox") > 0;
            }
        }
    });


})(nx, nx.global);

(function (nx, global) {

    nx.util.query = (function () {
        var i,
            internal = {
                publics: {
                    select: function (array, selector) {
                        var rslt = [];
                        if ($.isArray(array) && $.isFunction(selector)) {
                            var i, item;
                            for (i = 0; i < array.length; i++) {
                                item = array[i];
                                if (selector(item)) {
                                    rslt.push(item);
                                }
                            }
                        }
                        return rslt;
                    },
                    group: function (array, grouper) {
                        var map;
                        if ($.isFunction(grouper)) {
                            map = {};
                            var i, id, group;
                            for (i = 0; i < array.length; i++) {
                                id = grouper(array[i]);
                                if (!id || typeof id !== "string") {
                                    continue;
                                }
                                group = map[id] = map[id] || [];
                                group.push(array[i]);
                            }
                        } else {
                            map = array;
                        }
                        return map;
                    },
                    aggregate: function (array, aggregater) {
                        var rslt = null, key;
                        if ($.isFunction(aggregater)) {
                            if ($.isArray(array)) {
                                rslt = aggregater(array);
                            } else {
                                rslt = [];
                                for (key in array) {
                                    rslt.push(aggregater(array[key], key));
                                }
                            }
                        }
                        return rslt;
                    }
                },
                privates: {
                    aggregate: function (array, args) {
                        var rslt, grouper = null, aggregater = null;
                        // get original identfier and aggregater
                        if ($.isArray(args)) {
                            if (typeof args[args.length - 1] === "function") {
                                aggregater = args.pop();
                            }
                            grouper = (args.length > 1 ? args : args[0]);
                        } else {
                            grouper = args.map;
                            aggregater = args.aggregate;
                        }
                        // translate grouper into function if possible
                        if (typeof grouper === "string") {
                            grouper = grouper.replace(/\s/g, "").split(",");
                        }
                        if ($.isArray(grouper) && grouper[0] && typeof grouper[0] === "string") {
                            grouper = (function (keys) {
                                return function (obj) {
                                    var i, o = {};
                                    for (i = 0; i < keys.length; i++) {
                                        o[keys[i]] = obj[keys[i]];
                                    }
                                    return JSON.stringify(o);
                                };
                            })(grouper);
                        }
                        // do map aggregate
                        rslt = internal.publics.aggregate(internal.publics.group(array, grouper), aggregater);
                        return rslt;
                    },
                    mapping: function (array, mapper) {
                        var i, rslt;
                        if (mapper === true) {
                            rslt = EXPORT.clone(array);
                        } else if ($.isFunction(mapper)) {
                            if ($.isArray(array)) {
                                rslt = [];
                                for (i = 0; i < array.length; i++) {
                                    rslt.push(mapper(array[i], i));
                                }
                            } else {
                                rslt = mapper(array, 0);
                            }
                        } else {
                            if ($.isArray(array)) {
                                rslt = array.slice();
                            } else {
                                rslt = array;
                            }
                        }
                        return rslt;
                    },
                    orderby: function (array, comparer) {
                        if (typeof comparer === "string") {
                            comparer = comparer.replace(/^\s*(.*)$/, "$1").replace(/\s*$/, "").replace(/\s*,\s*/g, ",").split(",");
                        }
                        if ($.isArray(comparer) && comparer[0] && typeof comparer[0] === "string") {
                            comparer = (function (keys) {
                                return function (o1, o2) {
                                    var i, key, desc;
                                    if (!o1 && !o2) {
                                        return 0;
                                    }
                                    for (i = 0; i < keys.length; i++) {
                                        key = keys[i];
                                        desc = /\sdesc$/.test(key);
                                        key = key.replace(/(\s+desc|\s+asc)$/, "");
                                        if (o1[key] > o2[key]) {
                                            return desc ? -1 : 1;
                                        } else if (o2[key] > o1[key]) {
                                            return desc ? 1 : -1;
                                        }
                                    }
                                    return 0;
                                };
                            })(comparer);
                        }
                        if (comparer && typeof comparer === "function") {
                            array.sort(comparer);
                        }
                        return array;
                    }
                },
                query: function (array, options) {
                    /**
                     * @doctype MarkDown
                     * options:
                     * - options.array [any*]
                     *   - the target array
                     * - options.select: function(any){return boolean;}
                     *   - *optional*
                     *   - pre-filter of the array
                     * - options.aggregate: {grouper:grouper,aggregater:aggregater} or [proplist, aggregater] or [prop, prop, ..., aggregater]
                     *   - *optional*
                     *   - proplist: "prop,prop,..."
                     *   - prop: property name on array items
                     *   - grouper: map an array item into a string key
                     *   - aggregater: function(mapped){return aggregated}
                     * - options.mapping: function(item){return newitem}
                     *   - *optional*
                     * - options.orderby: proplist or [prop, prop, ...]
                     *   - *optional*
                     */
                    if (arguments.length == 1) {
                        options = array;
                        array = options.array;
                    }
                    if (!array) {
                        return array;
                    }
                    if (options.select) {
                        array = internal.publics.select(array, options.select);
                    }
                    if (options.aggregate) {
                        array = internal.privates.aggregate(array, options.aggregate);
                    }
                    if (options.mapping) {
                        array = internal.privates.mapping(array, options.mapping);
                    }
                    if (options.orderby) {
                        array = internal.privates.orderby(array, options.orderby);
                    }
                    return array;
                }
            };
        for (i in internal.publics) {
            internal.query[i] = internal.publics[i];
        }
        return internal.query;
    })();
})(nx, nx.global);
(function (nx, util) {
    /**
     * @link http://webstuff.nfshost.com/anim-timing/Overview.html
     * @link https://developer.mozilla.org/en/DOM/window.requestAnimationFrame
     * @link http://dev.chromium.org/developers/design-documents/requestanimationframe-implementation
     */
    var requestAnimationFrame = (function () {
        return window.requestAnimationFrame ||
            window.webkitRequestAnimationFrame ||
            window.mozRequestAnimationFrame ||
            window.oRequestAnimationFrame ||
            window.msRequestAnimationFrame ||
            function (callback) {
                return window.setTimeout(callback, 1000 / 60);
            };
    })(), cancelAnimationFrame = (function () {
        return window.cancelAnimationFrame ||
            window.cancelRequestAnimationFrame ||
            window.webkitCancelAnimationFrame ||
            window.webkitCancelRequestAnimationFrame ||
            window.mozCancelAnimationFrame ||
            window.mozCancelRequestAnimationFrame ||
            window.msCancelAnimationFrame ||
            window.msCancelRequestAnimationFrame ||
            window.oCancelAnimationFrame ||
            window.oCancelRequestAnimationFrame ||
            window.clearTimeout;
    })();

    nx.define('nx.graphic.Animation', {
        statics: {
            requestAnimationFrame: requestAnimationFrame,
            cancelAnimationFrame: cancelAnimationFrame
        },
        events: ['complete'],
        properties: {
            callback: {
                set: function (value) {
                    this._callback = value;
                    this.createAnimation();
                    if (this.autoStart()) {
                        this.start();
                    }
                },
                get: function () {
                    return this._callback || function () {
                    };
                }
            },
            duration: {
                value: 1000
            },
            interval: {
                value: 1000 / 60
            },
            autoStart: {
                value: false
            },
            complete: {
                value: function () {
                    return function () {
                    };
                }
            },
            context: {
                value: this
            }
        },
        methods: {
            init: function (opts, args) {
                this.inherited(arguments);
                this.sets(opts);
            },

            createAnimation: function () {
                var self = this;
                var callback = this.callback();
                var duration = this.duration();
                var interval = this.interval();
                var startTime, progress, id, timestamp, lastTime = 0;
                this.fn = function () {
                    timestamp = +new Date();
                    if (!startTime) {
                        startTime = +new Date();
                        progress = 0;
                    } else {
                        if (!duration) {
                            progress = 0;
                        } else {
                            progress = (timestamp - startTime) / duration;
                        }
                    }
                    if (progress >= 1 || (timestamp - lastTime) >= interval) {
                        lastTime = timestamp;
                        if (progress > 1) {
                            progress = 1;
                        }
                        if (callback.call(self.context(), progress) === false) {
                            //break  when user return false
                            duration = 1;
                            self._completeFN();
                        }

                    }
                    if (progress < 1) {
                        self.ani_id = requestAnimationFrame(self.fn);
                    } else if (progress == 1) {
                        self._completeFN();
                    }
                };
            },

            start: function () {
                this.ani_id = requestAnimationFrame(this.fn);
            },
            stop: function () {
                cancelAnimationFrame(this.ani_id);
            },
            _completeFN: function () {
                this.complete().call(this.context());
                this.stop();
                this.fire("complete");
            }
        }
    });
})(nx, nx.util);



(function (nx,global) {
    var zIndex = 1000;
    /**
     * Popup z-index mamager
     * @class nx.widget.ZIndexManager
     * @static
     */
    nx.define('nx.widget.ZIndexManager',null,{
        static: true,
        methods: {
            getIndex: function () {
                return zIndex++;
            }
        }
    });
}(nx,nx.global));
(function(nx, global) {
    var Container;
    (function() {
        if (nx && nx.ui && !Container) {
            Container = nx.define(nx.ui.Component, {
                view: {
                    props: {
                        'class': 'nx n-popupContainer',
                        style: {
                            'position': 'absolute',
                            'top': '0px',
                            'left': '0px'

                        }
                    }
                }
            });

            /**
             * Popup container
             * @class nx.ui.PopupContainer
             * @static
             */

            nx.define("nx.ui.PopupContainer", {
                static: true,
                properties: {
                    container: {
                        value: function() {
                            return new Container();
                        }
                    }
                },
                methods: {
                    addPopup: function(popup) {
                        this.container().view().dom().appendChild(popup.view().dom());
                    }
                }
            });
        }

        if (document.body && nx && nx.ui) {
            if (document.body.firstChild) {
                document.body.insertBefore(nx.ui.PopupContainer.container().view().dom().$dom, document.body.firstChild);
            } else {
                document.body.appendChild(nx.ui.PopupContainer.container().view().dom().$dom);
            }
        } else {
            setTimeout(arguments.callee, 10);
        }
    })();


})(nx, nx.global);
(function (nx, global) {

    var Container = nx.ui.PopupContainer;

    /**
     * Base popup class
     * @class nx.ui.Popup
     * @extend nx.ui.Component
     */
    nx.define("nx.ui.Popup", nx.ui.Component, {
        events: ['open', 'close'],
        view: {
            props: {
                style: "position:absolute",
                tabindex: -1
            },
            events: {
                blur: function (sender, evt) {
                    // this.close();
                }
            }
        },
        properties: {
            /**
             * @property target
             */
            target: {
                value: document
            },
            /**
             * [bottom,top,left,right]
             * @property direction
             */
            direction: {
                value: "auto" //[bottom,top,left,right]
            },
            /**
             * @property width
             */
            width: {
                value: null
            },
            /**
             * @property height
             */
            height: {
                value: null
            },
            /**
             * @property offset
             */
            offset: {
                value: 0
            },
            /**
             * @property offsetX
             */
            offsetX: {
                value: 0
            },
            /**
             * @property offsetY
             */
            offsetY: {
                value: 0
            },
            /**
             * @property align
             */
            align: {
                value: false
            },
            /**
             * @property position
             */
            position: {
                value: 'absolute'
            },
            /**
             * @property location
             */
            location: {
                value: "outer" // outer inner
            },
            /**
             * @property listenResize
             */
            listenResize: {
                value: false
            },
            /**
             * @property lazyClose
             */
            lazyClose: {
                value: false
            },
            /**
             * @property pin
             */
            pin: {
                value: false
            },
            /**
             * @property registeredPositionMap
             */
            registeredPositionMap: {
                value: function () {
                    return {};
                }
            },
            scrollClose: {
                value: false
            }
        },
        methods: {

            init: function (inPros) {
                this.inherited(inPros);
                this.sets(inPros);
                this._defaultConfig = this.gets();
            },
            attach: function (args) {
                this.inherited(args);
                this.appendToPopupContainer();
            },
            appendToPopupContainer: function () {
                if (!this._appended) {
                    Container.addPopup(this);
                    this._delayCloseEvent();
                    this._listenResizeEvent();
                    this._appended = true;
                    this._closed = false;
                }
            },
            /**
             * Open popup
             * @method open
             * @param args {Object} config
             */
            open: function (args) {
                this._clearTimeout();


                var left = 0;
                var top = 0;

                var root = this.view().dom();

                this.sets(args || {});


                this._resetOffset(args);
                var prevPosition = root.get("data-nx-popup-direction");
                if (prevPosition) {
                    root.removeClass(prevPosition);
                }
                this.appendToPopupContainer();


                //process target

                var target = this.target();
                var targetSize = {
                    width: 0,
                    height: 0
                };

                if (target.resolve && target.view) {
                    target = target.view();
                }

                // if target is a point {x:Number,y:Number}
                if (target.x !== undefined && target.y !== undefined) {
                    left = target.x;
                    top = target.y;
                } else if (target != document) {
                    var elOffset = target.getOffset();
                    left = elOffset.left;
                    top = elOffset.top;
                    targetSize = target.getBound();
                } else {
                    left = 0;
                    top = 0;
                }


                //process
                var width = this.width();
                var height = this.height();
                if (this.align()) {
                    width = targetSize.width || 0;
                }

                if (width) {
                    root.setStyle('width', width);
                    root.setStyle("max-width", width);
                    this.width(width);
                }

                if (height) {
                    root.setStyle('height', height);
                }

                root.setStyle("display", "block");


                //process position

                left += this.offsetX();
                top += this.offsetY();


                var popupSize = this._popupSize = root.getBound();
                var offset = this.offset();
                var innerPositionMap = {
                    "outer": {
                        bottom: {
                            left: left,
                            top: top + targetSize.height + offset
                        },
                        top: {
                            left: left,
                            top: top - popupSize.height - offset
                        },
                        right: {
                            left: left + targetSize.width + offset,
                            top: top
                        },
                        left: {
                            left: left - popupSize.width - offset,
                            top: top
                        }

                    },
                    "inner": {
                        bottom: {
                            left: left + targetSize.width / 2 - popupSize.width / 2 + offset,
                            top: top
                        },
                        top: {
                            left: left + targetSize.width / 2 - popupSize.width / 2,
                            top: top + targetSize.height - popupSize.height - offset
                        },
                        left: {
                            left: left + targetSize.width - popupSize.width - offset,
                            top: top + targetSize.height / 2 - popupSize.height / 2
                        },
                        right: {
                            left: left + offset,
                            top: top + targetSize.height / 2 - popupSize.height / 2
                        }

                    },
                    "tooltip": {
                        "bottom": {
                            left: left + targetSize.width / 2 - popupSize.width / 2,
                            top: top + targetSize.height + offset + 2
                        },
                        "bottom-left": {
                            left: left - 22,
                            top: top + targetSize.height + offset + 2
                        },
                        "bottom-right": {
                            left: left + targetSize.width - popupSize.width + 22,
                            top: top + targetSize.height + offset + 2
                        },
                        "top": {
                            left: left + targetSize.width / 2 - popupSize.width / 2,
                            top: top - popupSize.height - offset - 2
                        },
                        "top-left": {
                            left: left - 22,
                            top: top - popupSize.height - offset - 2
                        },
                        "top-right": {
                            left: left + targetSize.width / 2 - popupSize.width / 2 + 22,
                            top: top - popupSize.height - offset - 2
                        },
                        "right": {
                            left: left + targetSize.width + offset + 2,
                            top: top + targetSize.height / 2 - popupSize.height / 2
                        },
                        "right-top": {
                            left: left + targetSize.width + offset + 2,
                            top: top <= 0 ? 0 : top - 22
                        },
                        "right-bottom": {
                            left: left + targetSize.width + offset + 2,
                            top: top + targetSize.height - popupSize.height
                        },
                        "left": {
                            left: left - popupSize.width - offset - 2,
                            top: top + targetSize.height / 2 - popupSize.height / 2
                        },
                        "left-top": {
                            left: left - popupSize.width - offset - 2,
                            top: top <= 0 ? 0 : top - 22
                        },
                        "left-bottom": {
                            left: left - popupSize.width - offset - 2,
                            top: top + targetSize.height - popupSize.height
                        }
                    }
                };


                var location = this.location();
                this._directionMap = innerPositionMap[location];


                var direction = this.direction();
                if (direction === null || direction == "auto") {
                    direction = this._hitTest();
                }
                if (!direction) {
                    direction = "bottom";
                }
                var positionObj = this._directionMap[direction];
                root.setStyles({
                    "top": positionObj.top,
                    "left": positionObj.left,
                    "position": "position",
                    "z-index": nx.widget.ZIndexManager.getIndex(),
                    'display': 'block'

                });
                //position.setSize(this,popupSize);

                root.set("data-nx-popup-direction", direction);
                root.addClass(direction);
                root.addClass("in");
                this.fire("open");
                this.dom().$dom.focus();
            },
            /**
             * close popup
             * @method close
             * @param force
             */
            close: function (force) {

                this._clearTimeout();

                var root = this.view().dom();

                if (this.pin()) {
                    return;
                }

                if (force || !this.lazyClose()) {
                    this._closed = true;
                    root.removeClass('in');
                    root.setStyle("display", "none");
                    this.fire("close");
                } else {
                    this._delayClose();
                }
            },
            _clearTimeout: function () {
                if (this.timer) {
                    clearTimeout(this.timer);
                }
            },
            _delayClose: function () {
                var self = this;
                this._clearTimeout();
                this.timer = setTimeout(function () {
                    self.close(true);
                }, 500);
            },
            _delayCloseEvent: function () {

                if (this.lazyClose()) {
                    //                    this.on("mouseover", function () {
                    //                        var element = this.view().dom().$dom;
                    //                        var target = event.target;
                    //                        var related = event.relatedTarget;
                    //                        if (target && !element.contains(related) && target !== related) {
                    //                            if (this.timer) {
                    //                                clearTimeout(this.timer);
                    //                            }
                    //                        }
                    //                    }, this);
                    //
                    //                    this.on("mouseout", function () {
                    //                        var element = this.view().dom().$dom;
                    //                        var target = event.target;
                    //                        var related = event.relatedTarget;
                    //                        if (!element.contains(related) && target !== related) {
                    //                            clearTimeout(this.timer);
                    //                            this.close(true);
                    //                        }
                    //                    }, this);


                    this.on("mouseenter", function () {
                        if (this.timer) {
                            clearTimeout(this.timer);
                        }
                    }, this);

                    this.on("mouseleave", function () {
                        clearTimeout(this.timer);
                        this.close(true);
                    }, this);
                }
            },
            _listenResizeEvent: function () {
                var self = this;
                var timer;
                if (this.listenResize()) {
                    //                    nx.app.on('resize', function () {
                    //                        if (!this._closed) {
                    //                            if (timer) {
                    //                                clearTimeout(timer)
                    //                            }
                    //                            timer = setTimeout(function () {
                    //                                self.open();
                    //                            }, 22);
                    //                        }
                    //
                    //                    }, this);
                    //
                    //
                    //                    nx.app.on('scroll', function () {
                    //                        if (timer) {
                    //                            clearTimeout(timer)
                    //                        }
                    //                        if (!this._closed) {
                    //                            timer = setTimeout(function () {
                    //                                self.open();
                    //                            }, 22);
                    //                        }
                    //                    }, this);

                }


                if (this.scrollClose()) {
                    //                    nx.app.on('scroll', function () {
                    //                        if (timer) {
                    //                            clearTimeout(timer)
                    //                        }
                    //                        self.close(true);
                    //                    }, this);
                }
            },
            _hitTest: function () {
                var docRect = nx.dom.Document.docRect();

                var keys = Object.keys(this._directionMap);
                var testDirection = keys[0];
                keys.some(function (direction) {
                    var elementRect = {
                        left: this._directionMap[direction].left,
                        top: this._directionMap[direction].top,
                        width: this._popupSize.width,
                        height: this._popupSize.height

                    };
                    //make sure it visible
                    var resulte = elementRect.left >= docRect.scrollX &&
                        elementRect.top >= docRect.scrollY &&
                        elementRect.left + elementRect.width <= docRect.width + docRect.scrollX &&
                        elementRect.top + elementRect.height <= docRect.height + docRect.scrollY;

                    if (resulte) {
                        testDirection = direction;
                        return true;
                    }
                }, this);
                return testDirection;
            },
            _resetOffset: function (args) {
                if (args) {
                    //                    if (!args.offset) {
                    //                        this.offset(this.offset.defaultValue);
                    //                    }
                    //
                    //
                    //                    if (!args.offsetX) {
                    //                        this.offsetX(this.offsetX.defaultValue);
                    //                    }
                    //
                    //
                    //                    if (!args.offsetY) {
                    //                        this.offsetY(this.offsetY.defaultValue);
                    //                    }
                }
            }
        }
    });


})(nx, nx.global);

(function (nx, global) {

    /**
     * UI popover class
     * @class nx.ui.Popover
     * @extend nx.ui.Popup
     */
    nx.define("nx.ui.Popover", nx.ui.Popup, {
        properties: {
            /**
             * Popover's title
             */
            title: {
                get: function () {
                    return this._title;
                },
                set: function (value) {
                    if (value) {
                        this.view("title").dom().setStyle("display", "block");

                    } else {
                        this.view("title").dom().setStyle("display", "none");
                    }
                    if (this._title != value) {
                        this._title = value;
                        return true;
                    } else {
                        return false;
                    }
                }
            },
            location: {
                value: "tooltip"
            }
        },
        view: {
            props: {
                'class': 'popover fade',
                style: {
                    outline: "none"
                },
                tabindex: -1
            },
            events: {
                blur: function (sender, evt) {
                    // this.close();
                }
            },
            content: [{
                props: {
                    'class': 'arrow'
                }
            }, {
                tag: 'h3',
                name: 'title',
                props: {
                    'class': 'popover-title',
                    style: {
                        display: 'none'
                    }
                },
                content: "{#title}"
            }, {
                name: 'body',
                props: {
                    'class': 'popover-content'
                }
            }]
        },
        methods: {
            getContainer: function () {
                return this.view('body').dom();
            }
        }
    });


})(nx, nx.global);

(function(nx, global) {
    /**
     * Global drag manager

     var Component = nx.define(nx.ui.Component, {
        view: {
            content: {
                name: "stage",
                type: 'nx.graphic.TopologyStage',
                props: {
                    width: 600,
                    height: 600
                },
                content: {
                    name: 'a',
                    type: 'nx.graphic.Rect',
                    props: {
                        x: 100,
                        y: 10,
                        width: 100,
                        height: 100,
                        fill: '#f0f'
                    },
                    events: {
                        'mousedown': '{#_mousedown}',
                        'dragmove': '{#_dragmove}'
                    }
                }
            }
        },
        properties: {
            positionX: {
                value: 150
            }
        },
        methods: {
            _mousedown: function (sender, event) {
                event.captureDrag(sender.owner());
            },
            _dragmove: function (sender, event) {
                sender.set("x", sender.get("x") * 1 + event.drag.delta[0]);
                sender.set("y", sender.get("y") * 1 + event.drag.delta[1]);
            }

        }
     });


     var app = new nx.ui.Application();
     var comp = new Component();
     comp.attach(app);


     * @class nx.graphic.DragManager
     * @static
     * @extend nx.Observable
     */

    nx.define("nx.graphic.DragManager", nx.Observable, {
        static: true,
        properties: {
            /**
             * activated component.
             * @property node {nx.graphic.Component}
             */
            node: {},
            /**
             * All coordinate will reference to this element.
             * @property referrer {DOMELement}
             */
            referrer: {},
            /**
             * drag track
             * @property track {Array}
             */
            track: {},
            /**
             * Dragging indicator
             * @property dragging
             * @type Boolean
             */
            dragging: {
                value: false
            }
        },
        methods: {
            init: function() {
                window.addEventListener('mousedown', this._capture_mousedown.bind(this), true);
                window.addEventListener('mousemove', this._capture_mousemove.bind(this), true);
                window.addEventListener('mouseup', this._capture_mouseup.bind(this), true);
                window.addEventListener('touchstart', this._capture_mousedown.bind(this), true);
                window.addEventListener('touchmove', this._capture_mousemove.bind(this), true);
                window.addEventListener('touchend', this._capture_mouseup.bind(this), true);

            },
            /**
             * Start drag event capture
             * @method start
             * @param evt {Event} original dom event
             * @returns {function(this:nx.graphic.DragManager)}
             */
            start: function(evt) {
                return function(node, referrer) {
                    // make sure only one node can capture the "drag" event
                    if (node && !this.node()) {
                        // FIXME may not be right on global
                        referrer = (referrer === window || referrer === document || referrer === document.body) ? document.body : (referrer || node);
                        referrer = (typeof referrer.dom === "function") ? referrer.dom().$dom : referrer;
                        this.node(node);
                        this.referrer(referrer);
                        // track and data
                        var bound, track = [];
                        bound = referrer.getBoundingClientRect();
                        this.track(track);
                        var pageX = (evt.touches && evt.touches.length) ? evt.touches[0].pageX : evt.pageX;
                        var pageY = (evt.touches && evt.touches.length) ? evt.touches[0].pageY : evt.pageY;
                        var current = [pageX - document.body.scrollLeft - bound.left, pageY - document.body.scrollTop - bound.top];
                        track.push(current);
                        track[0].time = evt.timeStamp;
                        evt.dragCapture = function() {};
                        return true;
                    }
                }.bind(this);
            },
            /**
             * Drag move handler
             * @method move
             * @param evt {Event} original dom event
             */
            move: function(evt) {
                var node = this.node();
                if (node) {
                    // attach to the event
                    evt.drag = this._makeDragData(evt);
                    if (!this.dragging()) {
                        this.dragging(true);
                        node.fire("dragstart", evt);
                    }
                    // fire events
                    node.fire("dragmove", evt);
                }
            },
            /**
             * Drag end
             * @method end
             * @param evt {Event} original dom event
             */
            end: function(evt) {
                var node = this.node();
                if (node) {
                    // attach to the event
                    evt.drag = this._makeDragData(evt);
                    // fire events
                    if (this.dragging()) {
                        node.fire("dragend", evt);
                    }
                    // clear status
                    this.node(null);
                    this.track(null);
                    this.dragging(false);
                }
            },
            _makeDragData: function(evt) {
                var track = this.track();
                var bound = this.referrer().getBoundingClientRect();
                var pageX = (evt.touches && evt.touches.length) ? evt.touches[0].pageX : evt.pageX;
                var pageY = (evt.touches && evt.touches.length) ? evt.touches[0].pageY : evt.pageY;
                var current = [pageX - document.body.scrollLeft - bound.left, pageY - document.body.scrollTop - bound.top],
                    origin = track[0],
                    last = track[track.length - 1];
                current.time = evt.timeStamp;
                track.push(current);
                // FIXME optimize if track too large
                if (track.length > 20) {
                    track.splice(1, track.length - 20);
                }
                // TODO make sure the data is correct when target applied a matrix
                return {
                    target: this.node(),
                    accord: this.referrer(),
                    origin: origin,
                    current: current,
                    offset: [current[0] - origin[0], current[1] - origin[1]],
                    delta: [current[0] - last[0], current[1] - last[1]],
                    track: track
                };
            },
            _capture_mousedown: function(evt) {
                if (evt.captureDrag) {
                    this._lastDragCapture = evt.captureDrag;
                }
                if (evt.type === "mousedown" || evt.type === "touchstart") {
                    evt.captureDrag = this.start(evt);
                } else {
                    evt.captureDrag = function() {};
                }
            },
            _capture_mousemove: function(evt) {
                this.move(evt);
                var node = this.node();
                if (node) {
                    evt.stopPropagation();
                    evt.preventDefault();
                    return false;
                }
            },
            _capture_mouseup: function(evt) {
                this.end(evt);
            }
        }
    });

})(nx, nx.global);
(function (nx, global) {

    nx.Object.delegateEvent = function (source, sourceEvent, target, targetEvent) {
        if (!target.can(targetEvent)) {
            source.on(sourceEvent, function (sender, event) {
                target.fire(targetEvent, event);
            });
            nx.Object.extendEvent(target, targetEvent);
        }
    };


    //http://www.timotheegroleau.com/Flash/experiments/easing_function_generator.htm

    var ease = function (t, b, c, d) {
        var ts = (t /= d) * t;
        var tc = ts * t;
        return b + c * (-0.6475 * tc * ts + 0.7975 * ts * ts + -2.3 * tc + 3.2 * ts + -0.05 * t);
    };

    var cssHook = {
        transform: 'webkitTransform'
    };


    /**
     * Base class of graphic component
     * @class nx.graphic.Component
     * @extend nx.ui.Component
     * @module nx.graphic
     */

    nx.define('nx.graphic.Component', nx.ui.Component, {
        /**
         * Fire when drag start
         * @event dragstart
         * @param sender {Object}  Trigger instance
         * @param event {Object} original event object
         */
        /**
         * Fire when drag move
         * @event dragmove
         * @param sender {Object}  Trigger instance
         * @param event {Object} original event object , include delta[x,y] for the shift
         */
        /**
         * Fire when drag end
         * @event dragend
         * @param sender {Object}  Trigger instance
         * @param event {Object} original event object
         */
        events: ['dragstart', 'dragmove', 'dragend'],
        properties: {
            /**
             * Set/get x translate
             * @property translateX
             */
            translateX: {
                set: function (value) {
                    this.setTransform(value);
                }
            },
            /**
             * Set/get y translate
             * @property translateY
             */
            translateY: {
                set: function (value) {
                    this.setTransform(null, value);
                }
            },
            /**
             * Set/get scale
             * @property scale
             */
            scale: {
                set: function (value) {
                    this.setTransform(null, null, value);
                }
            },
            /**
             * Set/get translate, it set/get as {x:number,y:number}
             * @property translate
             */
            translate: {
                get: function () {
                    return {
                        x: this._translateX || 0,
                        y: this._translateY || 0
                    };
                },
                set: function (value) {
                    this.setTransform(value.x, value.y);
                }
            },
            /**
             * Set/get element's visibility
             * @property visible
             */
            visible: {
                get: function () {
                    return this._visible !== undefined ? this._visible : true;
                },
                set: function (value) {
                    if (this.view()) {
                        if (value) {
                            this.view().dom().removeClass('n-hidden');
                        } else {
                            this.view().dom().addClass('n-hidden');
                        }

                    }
                    this._visible = value;
                }
            },
            /**
             * Set/get css class
             * @property class
             */
            'class': {
                get: function () {
                    return this._class !== undefined ? this._class : '';
                },
                set: function (value) {
                    if (this._class !== value) {
                        this._class = value;
                        this.dom().addClass(value);
                        return true;
                    } else {
                        return false;
                    }
                }
            }
        },
        view: {},
        methods: {
            init: function (args) {
                this.inherited(args);
                this.sets(args);
            },
            /**
             * Set component's transform
             * @method setTransform
             * @param [translateX] {Number} x axle translate
             * @param [translateY] {Number} y axle translate
             * @param [scale] {Number} element's scale
             * @param [duration=0] {Number} transition time, unite is second
             */
            setTransform: function (translateX, translateY, scale, duration) {

                var tx = parseFloat(translateX != null ? translateX : this._translateX || 0);
                var ty = parseFloat(translateY != null ? translateY : this._translateY || 0);
                var scl = parseFloat(scale != null ? scale : this._scale || 1);

                this.setStyle('transform', ' matrix(' + scl + ',' + 0 + ',' + 0 + ',' + scl + ',' + tx + ', ' + ty + ')', duration);
                //this.setStyle('transform', ' translate(' + tx + 'px, ' + ty + 'px) scale(' + scl + ')', duration);

                this.dom().$dom.setAttribute('transform', ' translate(' + tx + ', ' + ty + ') scale(' + scl + ')');

                this._translateX = tx;
                this._translateY = ty;
                this._scale = scl;
            },
            /**
             * Set component's css style
             * @method setStyle
             * @param key {String} css key
             * @param value {*} css value
             * @param [duration=0] {Number} set transition time
             * @param [callback]
             * @param [context]
             */
            setStyle: function (key, value, duration, callback, context) {
                if (duration) {
                    this.setTransition(callback, context, duration);
                } else if (callback) {
                    setTimeout(function () {
                        callback.call(context || this);
                    }, 0);
                }


                //todo optimize
                var dom = this.dom().$dom;
                dom.style[key] = value;

                if (cssHook[key]) {
                    dom.style[cssHook[key]] = value;
                }
            },
            setTransition: function (callback, context, duration) {
                var el = this.dom();
                if (duration) {
                    el.setStyle('transition', 'all ' + duration + 's ease');
                    this.on('transitionend', function fn() {
                        if (callback) {
                            callback.call(context || this);
                        }
                        el.setStyle('transition', '');
                        this.off('transitionend', fn, this);
                    }, this);
                } else {
                    el.setStyle('transition', '');
                    if (callback) {
                        setTimeout(function () {
                            callback.call(context || this);
                        }, 0);
                    }
                }
            },
            /**
             * Append component's element to parent node or other dom element
             * @param [parent] {nx.graphic.Component}
             * @method append
             */
            append: function (parent) {
                var parentElement;
                if (parent) {
                    parentElement = this._parentElement = parent.view().dom();
                } else {
                    parentElement = this._parentElement = this._parentElement || this.view().dom().parentNode(); //|| this.parent().view();
                }
                if (parentElement && parentElement.$dom && this._resources && this.view() && !parentElement.contains(this.view().dom())) {
                    parentElement.appendChild(this.view().dom());
                }
            },
            /**
             * Remove component's element from dom tree
             * @method remove
             */
            remove: function () {
                var parentElement = this._parentElement = this._parentElement || this.view().dom().parentNode();
                if (parentElement && this._resources && this.view()) {
                    parentElement.removeChild(this.view().dom());
                }
            },
            /**
             * Get component's bound, delegate element's getBoundingClientRect function
             * @method getBound
             * @returns {*|ClientRect}
             */
            getBound: function () {

                //console.log(this.dom().$dom.getBoundingClientRect())
                //debugger;
                return this.dom().$dom.getBoundingClientRect();
            },
            /**
             * Hide component
             * @method hide
             */
            hide: function () {
                this.visible(false);
            },
            /**
             * Show component
             * @method show
             */
            show: function () {
                this.visible(true);
            },
            /**
             * Set animation for element,pass a config to this function
             * {
             *      to :{
             *          attr1:value,
             *          attr2:value,
             *          ...
             *      },
             *      duration:Number,
             *      complete:Function
             * }
             * @method animate
             * @param config {JSON}
             */
            animate: function (config) {
                var self = this;
                var aniMap = [];
                var el = this.view();
                nx.each(config.to, function (value, key) {
                    var oldValue = this.has(key) ? this.get(key) : el.getStyle(key);
                    aniMap.push({
                        key: key,
                        oldValue: oldValue,
                        newValue: value
                    });
                }, this);

                if (this._ani) {
                    this._ani.stop();
                    this._ani.dispose();
                    delete this._ani;
                }

                var ani = this._ani = new nx.graphic.Animation({
                    duration: config.duration || 1000,
                    context: config.context || this
                });
                ani.callback(function (progress) {
                    nx.each(aniMap, function (item) {
                        var value = item.oldValue + (item.newValue - item.oldValue) * progress;
                        //                        var value = ease(progress, item.oldValue, item.newValue - item.oldValue, 1);
                        self.set(item.key, value);
                    });
                    //console.log(progress);
                });

                if (config.complete) {
                    ani.complete(config.complete);
                }
                ani.on("complete", function fn() {
                    /**
                     * Fired when animation completed
                     * @event animationCompleted
                     * @param sender {Object}  Trigger instance
                     * @param event {Object} original event object
                     */
                    this.fire("animationCompleted");
                    ani.dispose();
                    delete this._ani;
                }, this);
                ani.start();
            },
            _processPropertyValue: function (propertyValue) {
                var value = propertyValue;
                if (nx.is(propertyValue, 'Function')) {
                    value = propertyValue.call(this, this.model(), this);
                }
                return value;
            },
            dispose: function () {
                if (this._resources && this._resources['@root']) {
                    this.view().dom().$dom.remove();
                }
                this.inherited();
            }
        }
    });

})(nx, nx.global);

(function(nx, global) {
    /**
     * SVG Arc component
     * @class nx.graphic.Arc
     * @extend nx.graphic.Component
     * @module nx.graphic
     */
    nx.define("nx.graphic.Arc", nx.graphic.Component, {
        view: {
            name: 'path',
            tag: 'svg:path',
            props: {
                'class': 'n-svg-arc'
            }

        },
        properties: {
            innerRadius: 0,
            outerRadius: 0,
            startAngle: 0,
            endAngle: 0,
            clockwies: false,
            stoke: {
                set: function(inValue) {
                    var value = this._processPropertyValue(inValue);
                    if (value !== this._stoke) {
                        this._stoke = value;
                        this.view().dom().setStyle('stroke', value);
                        return true;
                    } else {
                        return false;
                    }
                }
            },
            fill: {
                set: function(inValue) {
                    var value = this._processPropertyValue(inValue);
                    if (value !== this._stoke) {
                        this._fill = value;
                        this.view().dom().setStyle('fill', value);
                        return true;
                    } else {
                        return false;
                    }
                }
            },
            innerStartPoint: {
                value: function() {
                    return {
                        x: 0,
                        y: 0
                    };
                }
            },
            outerStartPoint: {
                value: function() {
                    return {
                        x: 0,
                        y: 0
                    };
                }
            },
            innerEndPoint: {
                value: function() {
                    return {
                        x: 0,
                        y: 0
                    };
                }
            },
            outerEndPoint: {
                value: function() {
                    return {
                        x: 0,
                        y: 0
                    };
                }
            },
            innerCenterPoint: {
                value: function() {
                    return {
                        x: 0,
                        y: 0
                    };
                }
            },
            outerCenterPoint: {
                value: function() {
                    return {
                        x: 0,
                        y: 0
                    };
                }
            },
            thickness: {
                value: null
            },
            centerPoint: {
                value: function() {
                    return {
                        x: 0,
                        y: 0
                    };
                }
            }
        },
        methods: {
            init: function(args) {
                this.inherited(args);
                this.watch(['innerRadius', 'outerRadius', 'startAngle', 'endAngle', 'clockwies', 'thickness'], function(prop, value) {
                    if (this._outerRadius && (this._startAngle || this._endAngle)) {
                        this._updates();
                    }
                }, this);
            },
            _updates: function() {
                var delta = Math.PI / 180 * (this._clockwies ? -1 : 1);
                var thickness = this._thickness;
                var innerRadius = this._innerRadius;
                var outerRadius = this._outerRadius || innerRadius + thickness;
                var startAngle = Math.min(this._startAngle, this._endAngle) * delta;
                var endAngle = Math.max(this._startAngle, this._endAngle) * delta;
                var gapRadius = outerRadius - innerRadius;
                var gapAngle = Math.abs(this._endAngle - this._startAngle);

                if (gapAngle >= 360) {

                    return;
                    //startAngle = 0;
                    //endAngle = (Math.PI * 2 + startAngle) * (this._clockwies ? -1 : 1);
                    //gapAngle = 360;
                }


                var i_s_x = innerRadius * Math.cos(startAngle);
                var i_s_y = innerRadius * Math.sin(startAngle);

                var o_s_x = outerRadius * Math.cos(startAngle);
                var o_s_y = outerRadius * Math.sin(startAngle);


                var i_e_x = innerRadius * Math.cos(endAngle);
                var i_e_y = innerRadius * Math.sin(endAngle);

                var o_e_x = outerRadius * Math.cos(endAngle);
                var o_e_y = outerRadius * Math.sin(endAngle);

                var d = [];

                d.push('M', o_s_x, o_s_y);
                d.push('A', outerRadius, outerRadius, '0,');
                d.push(gapAngle > 180 ? '1' : '0', ',');
                d.push(this._clockwies ? '0' : '1');
                d.push(o_e_x, o_e_y);
                d.push('L', i_e_x, i_e_y);
                d.push('A', innerRadius, innerRadius, '0,');
                d.push(gapAngle > 180 ? '1' : '0', ',');
                d.push(this._clockwies ? '1' : '0');
                d.push(i_s_x, i_s_y);

                d.push('Z');

                this.view().set('d', d.join(' '));


                this.innerStartPoint({
                    x: i_s_x,
                    y: i_s_y
                });

                this.outerStartPoint({
                    x: o_s_x,
                    y: o_s_y
                });

                this.innerEndPoint({
                    x: i_e_x,
                    y: i_e_y
                });


                this.outerEndPoint({
                    x: o_e_x,
                    y: o_e_y
                });

                var absGap = endAngle - startAngle;

                this.innerCenterPoint({
                    x: innerRadius * Math.cos(startAngle + absGap / 2),
                    y: innerRadius * Math.sin(startAngle + absGap / 2)
                });

                this.outerCenterPoint({
                    x: outerRadius * Math.cos(startAngle + absGap / 2),
                    y: outerRadius * Math.sin(startAngle + absGap / 2)
                });


                this.centerPoint({
                    x: (innerRadius + gapRadius / 2) * Math.cos(startAngle + absGap / 2),
                    y: (innerRadius + gapRadius / 2) * Math.sin(startAngle + absGap / 2)
                });

            }
        }
    });
})(nx, nx.global);
(function (nx, global) {

    /**
     * SVG group component
     * @class nx.graphic.Group
     * @extend nx.graphic.Component
     * @module nx.graphic
     */
    nx.define("nx.graphic.Group", nx.graphic.Component, {
        properties: {
            'data-id': {
                set: function (value) {
                    nx.each(this.content(), function (item) {
                        item.set('data-id', value);
                    });
                    this.view().set('data-id', value);
                    this['_data-id'] = value;
                }
            }
        },
        view: {
            tag: 'svg:g'
        },
        methods: {
            move: function (x, y) {
                var translate = this.translate();
                this.setTransform(x + translate.x, y + translate.y);
            }
        }
    });
})(nx, nx.global);
(function (nx, global) {
    var xlink = 'http://www.w3.org/1999/xlink';
    /**
     * SVG icon component, which icon's define in nx framework
     * @class nx.graphic.Icon
     * @extend nx.graphic.Component
     * @module nx.graphic
     */
    nx.define("nx.graphic.Icon", nx.graphic.Component, {
        view: {
            tag: 'svg:g',
            content: [{
                name: 'bgtext',
                tag: 'svg:text'
            }, {
                name: 'text',
                tag: 'svg:text'
            }, {
                tag: 'svg:g',
                name: 'image',
                content: {
                    name: 'use',
                    tag: 'svg:use'
                }
            }]
        },
        properties: {
            imageType: {
                value: "font"
            },
            /**
             * set/get icon's type
             * @property iconType
             */
            iconType: {
                get: function () {
                    return this._iconType;
                },
                set: function (value) {
                    var icon = nx.graphic.Icons.get(value.toLowerCase());
                    var size = icon.size;
                    var img = this.view('image').dom();
                    var shapeEL = this.view('text').dom();
                    var bgEL = this.view('bgtext').dom();
                    var useEL = this.view('use').dom();


                    if (icon.font) {

                        shapeEL.setStyle('display', 'block');
                        useEL.setStyle('display', 'none');

                        // front font
                        if (shapeEL.$dom.firstChild) {
                            shapeEL.$dom.removeChild(shapeEL.$dom.firstChild);
                        }
                        shapeEL.$dom.appendChild(document.createTextNode(icon.font[0]));
                        shapeEL.addClass('fontIcon iconShape');
                        //

                        //background font

                        if (bgEL.$dom.firstChild) {
                            bgEL.$dom.removeChild(bgEL.$dom.firstChild);
                        }
                        bgEL.$dom.appendChild(document.createTextNode(icon.font[1]));
                        bgEL.addClass('fontIcon iconBG');


                        this.imageType('font');

                    } else {

                        shapeEL.setStyle('display', 'none');
                        useEL.setStyle('display', 'block');

                        if (bgEL.$dom.firstChild) {
                            bgEL.$dom.removeChild(bgEL.$dom.firstChild);
                        }
                        bgEL.$dom.appendChild(document.createTextNode('\ue61d'));
                        bgEL.addClass('fontIcon iconBG');

                        //compatible with before
                        useEL.$dom.setAttributeNS(xlink, 'xlink:href', '#' + value);
                        img.setStyle('transform', 'translate(' + size.width / -2 + 'px, ' + size.height / -2 + 'px)');

                        this.imageType('image');
                    }


                    this.view().set('icontype', value);
                    this.view().dom().addClass('n-topology-icon');


                    this.size(size);
                    this._iconType = icon.name;


                }
            },
            /**
             * set/get icon size
             * @property size
             */
            size: {
                value: function () {
                    return {
                        width: 36,
                        height: 36
                    };
                }
            },
            color: {
                set: function (value) {
                    if (this.imageType() == 'font') {
                        this.view('text').dom().setStyle('fill', value);
                    }
                    this.view('bgtext').dom().setStyle('fill', this.showIcon() ? '' : value);
                    this.view('image').dom().set('color', value);
                    this._color = value;
                }
            },
            scale: {
                set: function (value) {
                    var shapeEL = this.view('text').dom();
                    var bgEL = this.view('bgtext').dom();
                    var img = this.view('image').dom();
                    var size = this.size();
                    var fontSize = Math.max(size.width, size.height);
                    var _size = this.showIcon() ? fontSize * value : 4 + value * 8;
                    shapeEL.setStyle('font-size', _size);
                    bgEL.setStyle('font-size', _size);

                    if (this.imageType() == 'image' && value) {
                        img.setStyle('transform', 'translate(' + size.width / -2 + 'px, ' + size.height / -2 + 'px) scale(' + value + ')');
                    }

                    // FIXME for firefox bug with g.getBoundingClientRect
                    if (nx.util.isFirefox()) {
                        shapeEL.$dom.setAttribute('transform', ' translate(0, ' + _size / 2 + ')');
                        bgEL.$dom.setAttribute('transform', ' translate(0, ' + _size / 2 + ')');
                    }


                    this._scale = value;
                }
            },
            showIcon: {
                get: function () {
                    return this._showIcon !== undefined ? this._showIcon : true;
                },
                set: function (value) {
                    var shapeEL = this.view('text').dom();
                    var bgEL = this.view('bgtext').dom();
                    var img = this.view('image').dom();
                    if (value) {
                        if (this.imageType() == 'font') {
                            shapeEL.setStyle('display', 'block');
                            bgEL.setStyle('display', 'block');
                        } else {
                            img.setStyle('display', 'block');
                            bgEL.setStyle('display', 'none');
                        }

                        bgEL.removeClass('iconBGActive');

                        this.view().dom().addClass('showIcon');

                    } else {
                        if (this.imageType() == 'font') {
                            shapeEL.setStyle('display', 'none');
                        } else {
                            img.setStyle('display', 'none');
                        }
                        bgEL.setStyle('display', 'block');
                        bgEL.addClass('iconBGActive');

                        this.view().dom().removeClass('showIcon');
                    }

                    this._showIcon = value;

                    if (this._color) {
                        this.color(this._color, {
                            force: true
                        });
                    }

                    if (this._scale) {
                        this.scale(this._scale, {
                            force: true
                        });
                    }
                }
            }
        }
    });
})(nx, nx.global);

(function(nx, global) {
    var xlink = "http://www.w3.org/1999/xlink";
    /**
     * Topology device icons collection
     * @class nx.graphic.Icons
     * @static
     */
    var ICONS = nx.define("nx.graphic.Icons", {
        static: true,
        statics: {
            /**
             * Get icons collection
             * @static
             * @property icons
             */
            icons: {}
        },
        methods: {
            /**
             * Get icon by type
             * @param type {String}
             * @returns {element}
             * @method get
             */
            get: function(type) {
                return ICONS.icons[type] || ICONS.icons.switch;
            },
            /**
             * Get icon"s svg string
             * @param type {String}
             * @returns {element}
             * @method getSVGString
             */
            getSVGString: function(type) {
                return topology_icon[type].icon;
            },
            /**
             * Get all types list
             * @returns {Array}
             * @method getTypeList
             */
            getTypeList: function() {
                return Object.keys(topology_icon);
            },
            /**
             * Register a new icon to this collection
             * @method registerIcon
             * @param name {String} icon"s name
             * @param url {URL} icon"s url
             * @param width {Number} icon"s width
             * @param height {Number} icon"s height
             */
            registerIcon: function(name, url, width, height) {
                var icon1 = document.createElementNS(NS, "image");
                icon1.setAttributeNS(XLINK, "href", url);
                ICONS.icons[name] = {
                    size: {
                        width: width,
                        height: height
                    },
                    icon: icon1.cloneNode(true),
                    name: name
                };
            },
            /**
             * Register a fontIcon to this collection
             * @method registerFontIcon
             * @param name {String} icon's name
             * @param fontfamily {String} icon's font family
             * @param fontCharacter {String} font icon's character, start with \u, like \uf108
             * @param fontSize
             */
            registerFontIcon: function(name, fontfamily, fontCharacter, fontSize) {
                ICONS.icons[name] = {
                    size: {
                        width: fontSize,
                        height: fontSize
                    },
                    name: name
                };

                ICONS.icons[name].font = [fontCharacter, fontCharacter];

                nx.dom.Document.addRule(".n-topology g[icontype=" + name + "] .fontIcon", "font-family: " + fontfamily + " !important;");


            },
            /**
             * Iterate all icons
             * @param inCallback {Function}
             * @param [inContext] {Object}
             * @private
             */
            __each__: function(inCallback, inContext) {
                var callback = inCallback || function() {};
                nx.each(topology_icon, function(obj, name) {
                    var icon = obj.icon;
                    callback.call(inContext || this, icon, name, topology_icon);
                });
            }
        }
    });


    var XLINK = "http://www.w3.org/1999/xlink";
    var NS = "http://www.w3.org/2000/svg";


    var topology_icon = {
        switch: {
            width: 32,
            height: 32,
            name: "Switch",
            font: ["\ue618", "\ue619"]
        },
        router: {
            width: 32,
            height: 32,
            name: "Router",
            font: ["\ue61c", "\ue61d"]
        },
        wlc: {
            width: 32,
            height: 32,
            font: ["\ue60f", "\ue610"]
        },
        unknown: {
            width: 32,
            height: 32,
            font: ["\ue612", "\ue611"]
        },
        server: {
            width: 32,
            height: 32,
            font: ["\ue61b", "\ue61a"]
        },
        phone: {
            width: 32,
            height: 32,
            font: ["\ue61e", "\ue61f"]
        },
        nexus5000: {
            width: 32,
            height: 32,
            font: ["\ue620", "\ue621"]
        },
        ipphone: {
            width: 32,
            height: 32,
            font: ["\ue622", "\ue623"]
        },
        host: {
            width: 32,
            height: 32,
            font: ["\ue624", "\ue625"]
        },
        camera: {
            width: 32,
            height: 32,
            font: ["\ue626", "\ue627"]
        },
        accesspoint: {
            width: 32,
            height: 32,
            font: ["\ue628", "\ue629"]
        },
        groups: {
            width: 32,
            height: 32,
            font: ["\ue615", "\ue62f"]
        },
        groupm: {
            width: 32,
            height: 32,
            font: ["\ue616", "\ue630"]
        },
        groupl: {
            width: 32,
            height: 32,
            font: ["\ue617", "\ue631"]
        },
        collapse: {
            width: 16,
            height: 16,
            font: ["\ue62e", "\ue61d"]
        },
        expand: {
            width: 14,
            height: 14,
            font: ["\ue62d", "\ue61d"]
        },
        //nodeset: {
        //    width: 32,
        //    height: 32,
        //    font: ["\ue617", "\ue63a"]
        //},
        cloud: {
            width: 48,
            height: 48,
            font: ["\ue633", "\ue633"]
        },
        unlinked: {
            width: 32,
            height: 32,
            font: ["\ue646", "\ue61d"]
        },
        firewall: {
            width: 32,
            height: 32,
            font: ["\ue647", "\ue648"]
        },
        hostgroup: {
            width: 32,
            height: 32,
            font: ["\ue64d", "\ue64c"]
        },
        wirelesshost: {
            width: 32,
            height: 32,
            font: ["\ue64e", "\ue64c"]
        },
        port: {
            width: 32,
            height: 32,
            font: ["\ue650", "\ue619"]
        }
    };


    nx.each(topology_icon, function(icon, key) {
        var i = ICONS.icons[key] = {
            size: {
                width: icon.width,
                height: icon.height
            },
            name: key
        };

        if (icon.font) {
            i.font = icon.font;
        } else if (icon.icon) {
            i.icon = new DOMParser().parseFromString(icon.icon, "text/xml").documentElement.cloneNode(true);
        }
    });

})(nx, nx.global);
(function (nx,global) {
    /**
     * SVG circle component
     * @class nx.graphic.Circle
     * @extend nx.graphic.Component
     * @module nx.graphic
     */
    nx.define("nx.graphic.Circle", nx.graphic.Component, {
        view: {
            tag: 'svg:circle'

        }
    });
})(nx, nx.global);
(function (nx,global) {

    var xlink = 'http://www.w3.org/1999/xlink';

    /**
     * SVG image component
     * @class nx.graphic.Image
     * @extend nx.graphic.Component
     * @module nx.graphic
     */
    nx.define("nx.graphic.Image", nx.graphic.Component, {
        properties: {
            /**
             * Set/get image src
             * @property src
             */
            src: {
                get: function () {
                    return this._src !== undefined ? this._src : 0;
                },
                set: function (value) {
                    if (this._src !== value) {
                        this._src = value;
                        if (this.view() && value !== undefined) {
                            var el = this.view().dom().$dom;
                            el.setAttributeNS(xlink, 'href', value);
                        }
                        return true;
                    } else {
                        return false;
                    }
                }
            }
        },
        view: {
            tag: 'svg:image'
        }
    });
})(nx, nx.global);
(function (nx,global) {
    /**
     * SVG line component
     * @class nx.graphic.Line
     * @extend nx.graphic.Component
     * @module nx.graphic
     */
    nx.define("nx.graphic.Line", nx.graphic.Component, {
        view: {
            tag: 'svg:line'
        }
    });
})(nx, nx.global);
(function (nx,global) {
    /**
     * SVG path component
     * @class nx.graphic.Path
     * @extend nx.graphic.Component
     * @module nx.graphic
     */

    nx.define("nx.graphic.Path", nx.graphic.Component, {
        view: {
            tag: 'svg:path'
        }
    });
})(nx, nx.global);
(function (nx,global) {
    /**
     * SVG polygon component
     * @class nx.graphic.Polygon
     * @extend nx.graphic.Path
     * @module nx.graphic
     */

    nx.define("nx.graphic.Polygon", nx.graphic.Path, {
        properties: {
            nodes: {
                /**
                 * Set/get point array to generate a polygon shape
                 * @property nodes
                 */
                get: function () {
                    return this._nodes || [];
                },
                set: function (value) {
                    this._nodes = value;
                    var vertices = value;
                    if (vertices.length !== 0) {
                        if (vertices.length == 1) {
                            var point = vertices[0];
                            vertices.push({x: point.x - 1, y: point.y - 1});
                            vertices.push({x: point.x + 1, y: point.y - 1});
                        } else if (vertices.length == 2) {
                            vertices.push([vertices[0].x + 1, vertices[0].y + 1]);
                            vertices.push(vertices[1]);
                        }

                        var nodes = nx.data.Convex.process(vertices);
                        var path = [];
                        path.push('M ', nodes[0].x, ' ', nodes[0].y);
                        for (var i = 1; i < nodes.length; i++) {
                            if (!nx.is(nodes[i], 'Array')) {
                                path.push(' L ', nodes[i].x, ' ', nodes[i].y);
                            }

                        }
                        path.push(' Z');
                        this.set("d", path.join(''));
                    }

                }
            }
        }
    });
})(nx, nx.global);
(function (nx,global) {
    /**
     * SVG rect component
     * @class nx.graphic.Rect
     * @extend nx.graphic.Component
     * @module nx.graphic
     */

    nx.define("nx.graphic.Rect", nx.graphic.Component, {
        view: {
            tag: 'svg:rect'
        }
    });
})(nx, nx.global);
(function (nx, global) {

    /**
     * SVG root component
     * @class nx.graphic.Stage
     * @extend nx.ui.Component
     * @module nx.graphic
     */
    nx.define("nx.graphic.Stage", nx.ui.Component, {
        events: ['dragStageStart', 'dragStage', 'dragStageEnd', 'stageTransitionEnd'],
        view: {
            tag: 'svg:svg',
            props: {
                'class': 'n-svg',
                version: '1.1',
                xmlns: "http://www.w3.org/2000/svg",
                'xmlns:xlink': 'http://www.w3.org/1999/xlink',
                style: {
                    width: '{#width}',
                    height: '{#height}'
                }
            },
            content: [{
                name: 'defs',
                tag: 'svg:defs'
            }, {
                name: 'scalingLayer',
                type: 'nx.graphic.Group',
                props: {
                    'class': 'stage'
                },
                events: {
                    'transitionend': '{#_transitionend}'
                }
            }, {
                name: 'staticLayer',
                type: 'nx.graphic.Group'
            }],
            events: {
                'mousedown': '{#_mousedown}',
                'touchstart': '{#_mousedown}',
                'dragstart': '{#_dragstart}',
                'dragmove': '{#_drag}',
                'dragend': '{#_dragend}'
            }
        },
        properties: {
            /**
             * Is an animation in progress?
             * @property animating {Boolean}
             * @readOnly
             */
            animating: {},
            /**
             * Set/get topology's scalability
             * @property scalable {Boolean}
             */
            scalable: {
                value: true
            },
            /**
             * Get the viewbox of current stage position.
             * @property scalable {Boolean}
             * @readOnly
             */
            viewbox: {
                dependencies: "width, height, matrix",
                value: function (width, height, matrix) {
                    var inversion = nx.geometry.Matrix.inverse(matrix);
                    return [nx.geometry.Vector.transform([0, 0], inversion), nx.geometry.Vector.transform([width, height], inversion)];
                }
            },
            /**
             * set/get stage's width
             * @property width
             */
            width: {
                value: 300
            },
            /**
             * set/get stage's height
             * @property height
             */
            height: {
                value: 300
            },
            /**
             * Stage scale
             * @property stageScale {Number}
             */
            stageScale: {
                value: 1
            },
            /**
             * Stage padding
             * @property padding {number} 0
             */
            padding: {
                value: 0
            },
            /**
             * Topology max scaling
             * @property maxScale {Number}
             */
            maxZoomLevel: {
                value: 12
            },
            /**
             * Topology min scaling
             * @property minScale {Number}
             */
            minZoomLevel: {
                value: 0.25
            },
            zoomLevel: {
                value: 1
            },
            /**
             * Disable notify stageScale
             * @property disableUpdateStageScale {Boolean} false
             */
            disableUpdateStageScale: {
                value: false
            },
            /**
             * Stage transform matrix
             * @property matrix {nx.geometry.Math} nx.geometry.Matrix.I
             */
            matrix: {
                get: function () {
                    return this._matrix || nx.geometry.Matrix.I;
                },
                set: function (matrix) {
                    //dom.style.webkitTransform = matrixString;
                    var matrixObject = this.matrixObject();
                    var dom = this.scalingLayer().dom().$dom;
                    var matrixString = "matrix(" + nx.geometry.Matrix.stringify(matrix) + ")";
                    dom.style.transform = matrixString;
                    dom.setAttribute('transform', ' translate(' + matrixObject.x() + ', ' + matrixObject.y() + ') scale(' + matrixObject.scale() + ')');
                    this._matrix = matrix;
                }
            },
            /**
             * Matrix Object
             * @property matrixObject
             */
            matrixObject: {},
            /**
             * get content group element
             * @property stage
             */
            stage: {
                get: function () {
                    return this.view("scalingLayer");
                }
            },
            staticLayer: {
                get: function () {
                    return this.view("staticLayer");
                }
            },
            scalingLayer: {
                get: function () {
                    return this.view("scalingLayer");
                }
            },
            fitMatrixObject: {
                set: function (matrix) {
                    if (matrix) {
                        this.zoomLevel(this.stage().scale() / matrix.scale());
                    }
                    this._fitMatrixObject = matrix;
                }
            }
        },
        methods: {
            getContainer: function () {
                return this.view('scalingLayer').view().dom();
            },
            /**
             * Add svg def element into the stage
             * @method addDef
             * @param el {SVGDOM}
             */
            addDef: function (el) {
                this.view("defs").dom().$dom.appendChild(el);
            },
            /**
             * Add svg def element into the stage in string format
             * @method addDefString
             * @param str {String}
             */
            addDefString: function (str) {
                this.view("defs").dom().$dom.appendChild(new DOMParser().parseFromString(str, "text/xml").documentElement);
            },
            /**
             * Get content's relative bound
             * @method getContentBound
             * @returns {{left: number, top: number, width: Number, height: Number}}
             */
            getContentBound: function () {
                var stageBound = this.scalingLayer().getBound();
                var topoBound = this.view().dom().getBound();

                if (stageBound.left === 0 && stageBound.top === 0 && stageBound.width === 0 && stageBound.height === 0) {
                    var padding = this.padding();
                    return {
                        left: padding,
                        top: padding,
                        height: this.height() - padding * 2,
                        width: this.width() - padding * 2
                    };
                } else {
                    var bound = {
                        left: stageBound.left - topoBound.left,
                        top: stageBound.top - topoBound.top,
                        width: stageBound.width,
                        height: stageBound.height
                    };

                    if (bound.width < 300) {
                        bound.left -= (300 - bound.width) / 2;
                        bound.width = 300;
                    }

                    if (bound.height < 300) {
                        bound.top -= (300 - bound.height) / 2;
                        bound.height = 300;
                    }

                    return bound;

                }
            },
            fit: function (callback, context, isAnimated) {
                var watching = nx.keyword.internal.watch(this, "animating", function (animating) {
                    if (!animating) {
                        watching.release();
                        if (isAnimated) {
                            this.scalingLayer().on('transitionend', function fn() {
                                this.scalingLayer().dom().removeClass('n-topology-fit');
                                this.scalingLayer().off('transitionend', fn, this);
                                /* jslint -W030 */
                                callback && callback.call(context || this);
                                this.animating(false);
                            }, this);
                            var originalMatrix = this.matrix();
                            var newMatrix = this.fitMatrixObject().matrix();
                            if (!nx.geometry.Matrix.approximate(originalMatrix, newMatrix)) {
                                this.animating(true);
                                this.scalingLayer().dom().addClass('n-topology-fit');
                                this._setStageMatrix(this.fitMatrixObject().matrix());
                            } else {
                                /* jslint -W030 */
                                callback && callback.call(context || this);
                            }
                            this.zoomLevel(1);
                        } else {
                            this._setStageMatrix(this.fitMatrixObject().matrix());
                            this.zoomLevel(1);
                            /* jslint -W030 */
                            callback && callback.call(context || this);
                        }
                    }
                }.bind(this));
                watching.notify();
            },
            actualSize: function () {
                this.scalingLayer().setTransition(null, null, 0.6);
                this._setStageMatrix(nx.geometry.Matrix.I);
            },
            zoom: function (value, callback, context) {
                this.scalingLayer().setTransition(callback, context, 0.6);
                this.applyStageScale(value);
            },
            zoomByBound: function (inBound, callback, context, duration) {
                var padding = this.padding();
                var stageBound = {
                    left: padding,
                    top: padding,
                    height: this.height() - padding * 2,
                    width: this.width() - padding * 2
                };
                this.scalingLayer().setTransition(callback, context, duration);
                this.applyStageMatrix(this.calcRectZoomMatrix(stageBound, inBound));
            },
            calcRectZoomMatrix: function (graph, rect) {
                var s = (!rect.width && !rect.height) ? 1 : Math.min(graph.height / Math.abs(rect.height), graph.width / Math.abs(rect.width));
                var dx = (graph.left + graph.width / 2) - s * (rect.left + rect.width / 2);
                var dy = (graph.top + graph.height / 2) - s * (rect.top + rect.height / 2);
                return [
                    [s, 0, 0], [0, s, 0], [dx, dy, 1]
                ];
            },
            applyTranslate: function (x, y, duration) {
                var matrix = this.matrixObject();
                matrix.applyTranslate(x, y);
                if (duration) {
                    this.scalingLayer().setTransition(null, null, duration);
                }
                this.matrix(matrix.matrix());
                this.matrixObject(matrix);
                return matrix;
            },
            applyStageMatrix: function (matrix, according) {
                return this._setStageMatrix(nx.geometry.Matrix.multiply(this.matrix(), matrix), according);
            },
            applyStageScale: function (scale, according) {
                var _scale = scale || 1,
                    _according = according || [this.width() / 2, this.height() / 2];
                var matrix = nx.geometry.Matrix.multiply([
                    [1, 0, 0],
                    [0, 1, 0],
                    [-_according[0], -_according[1], 1]
                ], [
                    [_scale, 0, 0],
                    [0, _scale, 0],
                    [0, 0, 1]
                ], [
                    [1, 0, 0],
                    [0, 1, 0],
                    [_according[0], _according[1], 1]
                ]);
                return this.applyStageMatrix(matrix, _according);
            },
            resetStageMatrix: function () {
                var m = new nx.geometry.Matrix(this.matrix());
                this.disableUpdateStageScale(false);
                this.matrix(m.matrix());
                this.matrixObject(m);
                this.stageScale(1 / m.scale());
            },
            resetFitMatrix: function () {
                var watching = nx.keyword.internal.watch(this, "animating", function (animating) {
                    if (!animating) {
                        watching.release();
                        var contentBound, padding, stageBound, matrix;
                        // get transform matrix
                        contentBound = this.getContentBound();
                        padding = this.padding();
                        stageBound = {
                            left: padding,
                            top: padding,
                            height: this.height() - padding * 2,
                            width: this.width() - padding * 2
                        };
                        matrix = new nx.geometry.Matrix(this.calcRectZoomMatrix(stageBound, contentBound));
                        matrix.matrix(nx.geometry.Matrix.multiply(this.matrix(), matrix.matrix()));
                        this.fitMatrixObject(matrix);

                    }
                }.bind(this));
                watching.notify();
            },
            _setStageMatrix: function (matrix, according) {
                according = according || [this.width() / 2, this.height() / 2];
                var m = new nx.geometry.Matrix(matrix);
                var matrixFit = this.fitMatrixObject();
                var scaleFit = matrixFit.scale();
                var zoomMax = this.maxZoomLevel(),
                    zoomMin = this.minZoomLevel();
                if (m.scale() / scaleFit > zoomMax) {
                    m.applyScale(zoomMax * scaleFit / m.scale(), according);
                }
                if (m.scale() / scaleFit < zoomMin) {
                    m.applyScale(zoomMin * scaleFit / m.scale(), according);
                }
                if (!nx.geometry.Matrix.approximate(this.matrix(), m.matrix())) {
                    this.matrixObject(m);
                    this.matrix(m.matrix());
                    if (!this.disableUpdateStageScale()) {
                        this.stageScale(1 / m.scale());
                    }
                    this.zoomLevel(m.scale() / scaleFit);
                    return m;
                } else {
                    return this.matrixObject();
                }
            },
            hide: function () {
                this.view('scalingLayer').dom().setStyle('opacity', 0);
                this.view('staticLayer').dom().setStyle('opacity', 0);
            },
            show: function () {
                this.view('scalingLayer').dom().setStyle('opacity', 1);
                this.view('staticLayer').dom().setStyle('opacity', 1);
            },
            _transitionend: function (sender, event) {
                this.fire('stageTransitionEnd', event);
            },
            _mousedown: function (sender, event) {
                event.captureDrag(sender);
            },
            _dragstart: function (sender, event) {
                this.view("scalingLayer").dom().setStyle('pointer-events', 'none');
                this.fire('dragStageStart', event);
            },
            _drag: function (sender, event) {
                this.fire('dragStage', event);
            },
            _dragend: function (sender, event) {
                this.fire('dragStageEnd', event);
                this.view("scalingLayer").dom().setStyle('pointer-events', 'all');
            }
        }
    });


})(nx, nx.global);

(function (nx, global) {
    /**
     * SVG text component
     * @class nx.graphic.Text
     * @extend nx.graphic.Component
     * @module nx.graphic
     */
    nx.define("nx.graphic.Text", nx.graphic.Component, {
        properties: {
            /**
             * Set/get text
             * @property text
             */
            text: {
                get: function () {
                    return this._text !== undefined ? this._text : 0;
                },
                set: function (value) {
                    if (this._text !== value && value !== undefined) {
                        this._text = value;
                        var el = this.view().dom().$dom;
                        if (el.firstChild) {
                            el.removeChild(el.firstChild);
                        }
                        el.appendChild(document.createTextNode(value));
                        return true;
                    } else {
                        return false;
                    }
                }
            }
        },
        view: {
            tag: 'svg:text'
        }
    });
})(nx, nx.global);
(function (nx,global) {
    /**
     * SVG triangle component
     * @class nx.graphic.Triangle
     * @extend nx.graphic.Path
     * @module nx.graphic
     */
    nx.define("nx.graphic.Triangle", nx.graphic.Path, {
        properties: {
            width: {
                get: function () {
                    return this._width !== undefined ? this._width : 0;
                },
                set: function (value) {
                    if (this._width !== value) {
                        this._width = value;
                        this._draw();
                        return true;
                    } else {
                        return false;
                    }
                }
            },
            height: {
                get: function () {
                    return this._height !== undefined ? this._height : 0;
                },
                set: function (value) {
                    if (this._height !== value) {
                        this._height = value;
                        this._draw();
                        return true;
                    } else {
                        return false;
                    }
                }
            }
        },
        methods: {
            _draw: function () {
                if (this._width && this._height) {
                    var path = [];
                    path.push('M ', this._width / 2, ' ', 0);
                    path.push(' L ', this._width, ' ', this._height);
                    path.push(' L ', 0, ' ', this._height);
                    path.push(' Z');
                    this.set("d", path.join(''));
                }


            }
        }
    });
})(nx, nx.global);
(function (nx,global) {

    /**
     * SVG BezierCurves component
     * @class nx.graphic.BezierCurves
     * @extend nx.graphic.Path
     * @module nx.graphic
     */

    nx.define("nx.graphic.BezierCurves", nx.graphic.Path, {
        properties: {
            /**
             * set/get start point'x
             * @property x1
             */
            x1: {
                set: function (value) {
                    this._x1 = value;
                    this._buildPath();
                },
                get: function () {
                    return this._x1 || 0;
                }
            },
            /**
             * set/get start point'y
             * @property y1
             */
            y1: {
                set: function (value) {
                    this._y1 = value;
                    this._buildPath();
                },
                get: function () {
                    return this._y1 || 0;
                }
            },
            /**
             * set/get end point'x
             * @property x2
             */
            x2: {
                set: function (value) {
                    this._x2 = value;
                    this._buildPath();
                },
                get: function () {
                    return this._x2 || 0;
                }
            },
            /**
             * set/get end point'x
             * @property y2
             */
            y2: {
                set: function (value) {
                    this._y2 = value;
                    this._buildPath();
                },
                get: function () {
                    return this._y2 || 0;
                }
            },
            isClockwise: {
                value: true
            },
            straight: {
                value: false
            }
        },
        methods: {
            _buildPath: function () {
                var x1 = this.x1();
                var x2 = this.x2();
                var y1 = this.y1();
                var y2 = this.y2();

                var d;

                if (x1 !== null && x2 !== null && y1 !== null && y2 !== null) {
                    var dx = (x1 - x2);
                    var dy = (y2 - y1);
                    var dr = Math.sqrt((dx * dx + dy * dy));


                    if (this.straight()) {
                        d = "M" + x1 + "," + y1 + " " + x2 + "," + y2;
                    } else if (this.isClockwise()) {
                        d = "M" + x2 + "," + y2 +
                            "A " + dr + " " + dr + ", 0, 0, 1, " + x1 + "," + y1 +
                            "A " + (dr - 0) + " " + (dr - 0) + ", 0, 0, 0, " + x2 + "," + y2;
                    } else {
                        d = "M" + x2 + "," + y2 +
                            "A " + dr + " " + dr + ", 0, 0, 0, " + x1 + "," + y1 +
                            "A " + (dr - 0) + " " + (dr - 0) + ", 0, 0, 1, " + x2 + "," + y2;
                    }

                    return this.set("d", d);

                } else {
                    return null;
                }
            }
        }
    });

})(nx, nx.global);
(function (nx, ui, global) {
    nx.define("nx.geometry.MatrixSupport", {
        properties: {
            matrix: {
                value: function () {
                    return nx.geometry.Matrix.I;
                }
            },
            /**
             * @property matrixInversion
             * @type {Number[3][3]}
             * @readOnly
             */
            matrixInversion: {
                dependencies: ["matrix"],
                value: function (matrix) {
                    if (!matrix) {
                        return null;
                    }
                    return nx.geometry.Matrix.inverse(matrix);
                }
            },
            transform_internal_: {
                dependencies: ["matrix"],
                value: function (matrix) {
                    if (matrix) {
                        var scale = NaN,
                            rotate = NaN;
                        if (nx.geometry.Matrix.isometric(matrix)) {
                            scale = Math.sqrt(matrix[0][0] * matrix[0][0] + matrix[0][1] * matrix[0][1]);
                            rotate = matrix[0][1] > 0 ? Math.acos(matrix[0][0] / scale) : -Math.acos(matrix[0][0] / scale);
                        }
                        return {
                            x: matrix[2][0],
                            y: matrix[2][1],
                            scale: scale,
                            rotate: rotate
                        };
                    } else {
                        return {
                            x: 0,
                            y: 0,
                            scale: 1,
                            rotate: 0
                        };
                    }
                }
            },
            x: {
                get: function () {
                    return this._x !== undefined ? this._x : this.transform_internal_().x;
                },
                set: function (value) {
                    this._applyTransform("x", value);
                    if (!isNaN(this.transform_internal_().x) && this._x !== this.transform_internal_().x) {
                        this._x = this.transform_internal_().x;
                        return true;
                    }
                    return false;
                }
            },
            y: {
                get: function () {
                    return this._y !== undefined ? this._y : this.transform_internal_().y;
                },
                set: function (value) {
                    this._applyTransform("y", value);
                    if (!isNaN(this.transform_internal_().y) && this._y !== this.transform_internal_().y) {
                        this._y = this.transform_internal_().y;
                        return true;
                    }
                    return false;
                }
            },
            scale: {
                get: function () {
                    return this._scale !== undefined ? this._scale : this.transform_internal_().scale;
                },
                set: function (v) {
                    this._applyTransform("scale", v);
                    if (!isNaN(this.transform_internal_().scale) && this._scale !== this.transform_internal_().scale) {
                        this._scale = this.transform_internal_().scale;
                        return true;
                    }
                    return false;
                }
            },
            rotate: {
                get: function () {
                    return this._rotate !== undefined ? this._rotate : this.transform_internal_().rotate;
                },
                set: function (v) {
                    this._applyTransform("rotate", v);
                    if (!isNaN(this.transform_internal_().rotate) && this._rotate !== this.transform_internal_().rotate) {
                        this._rotate = this.transform_internal_().rotate;
                        return true;
                    }
                    return false;
                }
            }
        },
        methods: {
            applyTranslate: function (x, y) {
                this.matrix(nx.geometry.Matrix.multiply(this.matrix(), [
                    [1, 0, 0],
                    [0, 1, 0],
                    [x, y, 1]
                ]));
            },
            applyScale: function (s, accord) {
                if (accord) {
                    this.matrix(nx.geometry.Matrix.multiply(this.matrix(), [
                        [1, 0, 0],
                        [0, 1, 0],
                        [-accord[0], -accord[1], 1]
                    ], [
                        [s, 0, 0],
                        [0, s, 0],
                        [0, 0, 1]
                    ], [
                        [1, 0, 0],
                        [0, 1, 0],
                        [accord[0], accord[1], 1]
                    ]));
                } else {
                    this.matrix(nx.geometry.Matrix.multiply(this.matrix(), [
                        [s, 0, 0],
                        [0, s, 0],
                        [0, 0, 1]
                    ]));
                }
            },
            applyRotate: function (r, accord) {
                var x = this.x(),
                    y = this.y(),
                    sinr = sin(r),
                    cosr = cos(r);
                if (accord) {
                    this.matrix(nx.geometry.Matrix.multiply(this.matrix(), [
                        [1, 0, 0],
                        [0, 1, 0],
                        [-accord[0], -accord[1], 1]
                    ], [
                        [cos, sin, 0],
                        [-sin, cos, 0],
                        [0, 0, 1]
                    ], [
                        [1, 0, 0],
                        [0, 1, 0],
                        [accord[0], accord[1], 1]
                    ]));
                } else {
                    this.matrix(nx.geometry.Matrix.multiply(this.matrix(), [
                        [cos, sin, 0],
                        [-sin, cos, 0],
                        [0, 0, 1]
                    ]));
                }
            },
            applyMatrix: function () {
                var matrices = Array.prototype.slice.call(arguments);
                matrices = nx.util.query({
                    array: matrices,
                    mapping: function (matrix) {
                        return nx.is(matrix, nx.geometry.Matrix) ? matrix.matrix() : matrix;
                    }
                });
                matrices.unshift(this.matrix());
                this.matrix(nx.geometry.Matrix.multiply.apply(this, matrices));
            },
            _applyTransform: function (key, value) {
                if (this["_" + key] === value || isNaN(value)) {
                    return;
                }
                if (value === this.transform_internal_()[key]) {
                    this["_" + key] = value;
                    this.notify(key);
                } else {
                    switch (key) {
                    case "x":
                        this.applyTranslate(value - this.transform_internal_().x, 0);
                        break;
                    case "y":
                        this.applyTranslate(0, value - this.transform_internal_().y);
                        break;
                    case "scale":
                        this.applyScale(value / this.transform_internal_().scale, [this.transform_internal_().x, this.transform_internal_().y]);
                        break;
                    case "rotate":
                        this.applyRotate(value - this.transform_internal_().rotate, [this.transform_internal_().x, this.transform_internal_().y]);
                        break;
                    }
                }
            },
            toString: function () {
                return nx.geometry.Matrix.stringify(this.matrix());
            }
        }
    });
})(nx, nx.ui, window);

(function (nx, ui, global) {
    /**
     * @class Matrix
     * @namespace nx.geometry
     */
    var EXPORT = nx.define("nx.geometry.Matrix", nx.Observable, {
        mixins: [nx.geometry.MatrixSupport],
        methods: {
            init: function (matrix) {
                this.inherited();
                this.matrix(matrix);
            },
            equal: function (matrix) {
                return EXPORT.equal(this.matrix(), (nx.is(matrix, EXPORT) ? matrix.matrix() : matrix));
            }
        },
        statics: {
            I: [
                [1, 0, 0],
                [0, 1, 0],
                [0, 0, 1]
            ],
            isometric: function (m) {
                return m && (m[0][0] || m[0][1]) && m[0][0] === m[1][1] && m[0][1] === -m[1][0];
            },
            approximate: function (m1, m2) {
                if (!m1 || !m2 || m1.length != m2.length) {
                    return false;
                }
                var i;
                for (i = 0; i < m1.length; i++) {
                    if (!nx.geometry.Vector.approximate(m1[i], m2[i])) {
                        return false;
                    }
                }
                return true;
            },
            equal: function (m1, m2) {
                if (!m1 || !m2 || m1.length != m2.length) {
                    return false;
                }
                var i;
                for (i = 0; i < m1.length; i++) {
                    if (!nx.geometry.Vector.equal(m1[i], m2[i])) {
                        return false;
                    }
                }
                return true;
            },
            multiply: function () {
                var matrixes = Array.prototype.slice.call(arguments);
                var m1, m2, m, mr, mc, r, c, n, row, col, num;
                var i, j, k;
                while (matrixes.length > 1) {
                    /* jshint -W030 */
                    m1 = matrixes[0], m2 = matrixes[1];
                    if (m1[0].length != m2.length) {
                        return null;
                    }
                    /* jshint -W030 */
                    row = m1.length, col = m2[0].length, num = m2.length;
                    m = [];
                    for (r = 0; r < row; r++) {
                        mr = [];
                        for (c = 0; c < col; c++) {
                            mc = 0;
                            for (n = 0; n < num; n++) {
                                mc += m1[r][n] * m2[n][c];
                            }
                            mr.push(mc);
                        }
                        m.push(mr);
                    }
                    matrixes.splice(0, 2, m);
                }
                return matrixes[0];
            },
            transpose: function (m) {
                var t = [],
                    r, c, row = m.length,
                    col = m[0].length;
                for (c = 0; c < col; c++) {
                    t[c] = [];
                    for (r = 0; r < row; r++) {
                        t[c].push(m[r][c]);
                    }
                }
                return t;
            },
            inverse: function (m) {
                // FIXME just for 2D 3x3 Matrix
                var a = m[0][0],
                    b = m[0][1],
                    c = m[1][0],
                    d = m[1][1],
                    e = m[2][0],
                    f = m[2][1];
                var rslt = [],
                    deno = a * d - b * c;
                if (deno === 0) {
                    return null;
                }
                return [
                    [d / deno, -b / deno, 0], [-c / deno, a / deno, 0], [(c * f - d * e) / deno, (b * e - a * f) / deno, 1]
                ];
            },
            stringify: function (matrix) {
                return [matrix[0][0], matrix[0][1], matrix[1][0], matrix[1][1], matrix[2][0], matrix[2][1]].join(",").replace(/-?\d+e[+-]?\d+/g, "0");
            }
        }
    });
})(nx, nx.ui, window);

(function (nx, ui, global) {
    /**
     * @class Math
     * @namespace nx.geometry
     */
    var EXPORT = nx.define("nx.geometry.Math", nx.Observable, {
        statics: (function () {
            function precised(f) {
                return function (param) {
                    var v = f(param);
                    return EXPORT.approximate(v, 0) ? 0 : v;
                };
            }

            return {
                approximate: function (a, b) {
                    var v = a - b;
                    return v < 1e-10 && v > -1e-10;
                },
                sin: precised(Math.sin),
                cos: precised(Math.cos),
                tan: precised(Math.tan),
                cot: function (a) {
                    var tan = Math.tan(a);
                    if (tan > 1e10 || tan < -1e10) {
                        return 0;
                    }
                    return 1 / tan;
                }
            };
        })()
    });
})(nx, nx.ui, window);

(function(nx, ui, global) {
    /**
     * @class BezierCurve
     * @namespace nx.geometry
     */
    var EXPORT = nx.define("nx.geometry.BezierCurve", nx.Observable, {
        statics: (function() {
            function transformBezierToPolyline(bezier) {
                var i, polyline = [];
                for (i = 0; i < bezier.length - 1; i++) {
                    polyline.push([bezier[i], bezier[i + 1]]);
                }
                return polyline;
            }

            function transformPolylineToBezier(polyline) {
                var i, bezier = [polyline[0][0]];
                for (i = 0; i < polyline.length; i++) {
                    bezier.push(polyline[i][1]);
                }
                return bezier;
            }

            function transformRecursiveSeparatePoints(points) {
                var i = 0,
                    last = 0,
                    result = [];
                for (i = 0; i < points.length; i++) {
                    if (typeof points[i] !== "number" || points[i] <= last || points[i] > 1) {
                        throw "Invalid bread point list: " + points.join(",");
                    }
                    result.push((points[i] - last) / (1 - last));
                    last = points[i];
                }
                return result;
            }

            function quadLength(t, start, control_1, control_2, end) {
                /* Formula from Wikipedia article on Bezier curves. */
                return start * (1.0 - t) * (1.0 - t) * (1.0 - t) + 3.0 * control_1 * (1.0 - t) * (1.0 - t) * t + 3.0 * control_2 * (1.0 - t) * t * t + end * t * t * t;
            }


            return {
                slice: function(bezier, from, to) {
                    if (from === 0) {
                        if (to === 0) {
                            return null;
                        }
                        return EXPORT.breakdown(bezier, to).beziers[0];
                    } else if (!to) {
                        return EXPORT.breakdown(bezier, from).beziers[1];
                    } else {
                        return EXPORT.breakdown(bezier, from, to).beziers[1];
                    }
                },
                breakdown: function(bezier) {
                    // get the rest arguments
                    var rates = Array.prototype.slice.call(arguments, 1);
                    if (!rates.length) {
                        throw "Invalid argument length: " + arguments.length;
                    }
                    rates = transformRecursiveSeparatePoints(rates);
                    var rate, polyline, sep, points = [bezier[0]],
                        beziers = [];
                    // transform bezier points into lines
                    polyline = transformBezierToPolyline(bezier);
                    // iterate all rates
                    while (rates.length) {
                        // get the separate ratio
                        rate = rates.shift();
                        // separate the rest bezier
                        sep = EXPORT.separate(polyline, rate);
                        // mark the points and beziers
                        points.push(sep.point);
                        beziers.push(transformPolylineToBezier(sep.left));
                        // get the rest
                        polyline = sep.right;
                    }
                    // append the rest bezier
                    points.push(bezier[bezier.length - 1]);
                    beziers.push(transformPolylineToBezier(polyline));
                    return {
                        points: points,
                        beziers: beziers
                    };
                },
                /**
                 * @method separate
                 * @param polyline List of intervals (interval=[point-from, point-to], point=[x, y]).
                 * @param rate The rate to separate.
                 * @return {point:[x, y], left: leftPolyline, right: rightPolyline}
                 */
                separate: function separate(polyline, rate) {
                    var rest = 1 - rate;
                    var intervalSeparatePoint = function(interval) {
                        return [interval[0][0] * rest + interval[1][0] * rate, interval[0][1] * rest + interval[1][1] * rate];
                    };
                    var intervalInter = function(i1, i2) {
                        return [intervalSeparatePoint([i1[0], i2[0]]), intervalSeparatePoint([i1[1], i2[1]])];
                    };
                    var polylineLower = function(polyline) {
                        var i, rslt = [];
                        for (i = 0; i < polyline.length - 1; i++) {
                            rslt.push(intervalInter(polyline[i], polyline[i + 1]));
                        }
                        return rslt;
                    };
                    // start iterate
                    var point, left = [],
                        right = [];
                    var intervals = polyline,
                        interval;
                    while (intervals.length) {
                        interval = intervals[0];
                        left.push([interval[0], intervalSeparatePoint(interval)]);
                        interval = intervals[intervals.length - 1];
                        right.unshift([intervalSeparatePoint(interval), interval[1]]);
                        if (intervals.length == 1) {
                            point = intervalSeparatePoint(intervals[0]);
                        }
                        intervals = polylineLower(intervals);
                    }
                    return {
                        point: point,
                        left: left,
                        right: right
                    };
                },
                through: function(points, grade) {
                    // get default grade
                    if (grade === undefined) {
                        grade = points.length - 1;
                    }
                    // check if grade is too low
                    if (grade < 2) {
                        return null;
                    }
                    // TODO generalized algorithm for all grade
                    var anchors = [];
                    if (grade === 2) {
                        var A = points[0];
                        var B = points[2];
                        var X = points[1];
                        var O = [(A[0] + B[0]) / 2, (A[1] + B[1]) / 2];
                        var XX = [X[0] * 2 - O[0], X[1] * 2 - O[1]];
                        anchors.push(A, XX, B);
                    }
                    return anchors;
                },
                locationAlongCurve: function(bezier, distance) {
                    var t;
                    var steps = 1000;
                    var length = 0.0;
                    var previous_dot = [];
                    var start = bezier[0];
                    if (!distance) {
                        return 0;
                    }
                    for (var i = 0; i <= steps; i++) {
                        t = i / steps;
                        var x = quadLength(t, start[0], bezier[1][0], bezier[2][0], bezier[3][0]);
                        var y = quadLength(t, start[1], bezier[1][1], bezier[2][1], bezier[3][1]);
                        if (i > 0) {
                            var x_diff = x - previous_dot[0];
                            var y_diff = y - previous_dot[1];
                            var gap = Math.sqrt(x_diff * x_diff + y_diff * y_diff);
                            if (length < distance && distance < length + gap) {
                                return i / steps;
                            } else {
                                length += gap;
                            }
                        }
                        previous_dot = [x, y];
                    }
                    return NaN;
                },
                positionAlongCurve: function(bezier, distance) {
                    var t;
                    var steps = 1000;
                    var length = 0.0;
                    var previous_dot = null;
                    var start = bezier[0];
                    if (!distance) {
                        return 0;
                    }
                    for (var i = 0; i <= steps; i++) {
                        t = i / steps;
                        var x = quadLength(t, start[0], bezier[1][0], bezier[2][0], bezier[3][0]);
                        var y = quadLength(t, start[1], bezier[1][1], bezier[2][1], bezier[3][1]);
                        if (i > 0) {
                            var x_diff = x - previous_dot[0];
                            var y_diff = y - previous_dot[1];
                            var gap = Math.sqrt(x_diff * x_diff + y_diff * y_diff);
                            if (length < distance && distance < length + gap) {
                                return  [x, y];
                            } else {
                                length += gap;
                            }
                        }
                        previous_dot = [x, y];
                    }
                    return NaN;
                },
                getLength: function(bezier) {
                    var t;
                    var steps = 1000;
                    var length = 0.0;
                    var previous_dot = [];
                    var start = bezier[0];
                    for (var i = 0; i <= steps; i++) {
                        t = i / steps;
                        var x = quadLength(t, start[0], bezier[1][0], bezier[2][0], bezier[3][0]);
                        var y = quadLength(t, start[1], bezier[1][1], bezier[2][1], bezier[3][1]);
                        if (i > 0) {
                            var x_diff = x - previous_dot[0];
                            var y_diff = y - previous_dot[1];

                            length += Math.sqrt(x_diff * x_diff + y_diff * y_diff);
                        }
                        previous_dot = [x, y];
                    }
                    return length;
                }
            };
        })()
    });
})(nx, nx.ui, window);
(function (nx, global) {
    /**
     * @class Vector
     * @namespace nx.geometry
     */
    var Vector = nx.define("nx.geometry.Vector", nx.Observable, {
        statics: {
            approximate: function (v1, v2) {
                if (!v1 || !v2 || v1.length != v2.length) {
                    return false;
                }
                var i;
                for (i = 0; i < v1.length; i++) {
                    if (!nx.geometry.Math.approximate(v1[i], v2[i])) {
                        return false;
                    }
                }
                return true;
            },
            equal: function (v1, v2) {
                if (!v1 || !v2 || v1.length != v2.length) {
                    return false;
                }
                var i;
                for (i = 0; i < v1.length; i++) {
                    if (v1[i] !== v2[i]) {
                        return false;
                    }
                }
                return true;
            },
            plus: function (v1, v2) {
                return [v1[0] + v2[0], v1[1] + v2[1]];
            },
            transform: function (v, m) {
                var matrices = [
                    [v.concat([1])]
                ].concat(Array.prototype.slice.call(arguments, 1));
                return nx.geometry.Matrix.multiply.apply(nx.geometry.Matrix, matrices)[0].slice(0, 2);
            },
            multiply: function (v, k) {
                return Vector.transform(v, [
                    [k, 0, 0],
                    [0, k, 0],
                    [0, 0, 1]
                ]);
            },
            abs: function (v, len) {
                if (arguments.length == 1) {
                    return Math.sqrt(v[0] * v[0] + v[1] * v[1]);
                }
                var weight = len / Vector.abs(v);
                return Vector.transform(v, [
                    [weight, 0, 0],
                    [0, weight, 0],
                    [0, 0, 1]
                ]);
            },
            reverse: function (v) {
                return Vector.transform(v, [
                    [-1, 0, 0],
                    [0, -1, 0],
                    [0, 0, 1]
                ]);
            },
            rotate: function (v, a) {
                var sin = nx.geometry.Math.sin(a),
                    cos = nx.geometry.Math.cos(a);
                return Vector.transform(v, [
                    [cos, sin, 0],
                    [-sin, cos, 0],
                    [0, 0, 1]
                ]);
            },
            length: function (v) {
                return Math.sqrt(v[0] * v[0] + v[1] * v[1]);
            },
            angleCosine: function (v1, v2) {
                return (v1[0] * v2[0] + v1[1] * v2[1]) / Vector.length(v1) / Vector.length(v2);
            }
        },
        methods: {
            init: function (x, y) {
                this.x = x || 0;
                this.y = y || 0;
            },
            /**
             * @method equals
             * @param v {nx.geometry.Vector}
             * @returns {boolean}
             */
            equals: function (v) {
                return this.x === v.x && this.y === v.y;
            },
            /**
             * @method length
             * @returns {number}
             */
            length: function () {
                return Math.sqrt(this.squaredLength());
            },
            /**
             * @method squaredLength
             * @returns {number}
             */
            squaredLength: function () {
                var x = this.x,
                    y = this.y;

                return x * x + y * y;
            },
            /**
             * @method angle
             * @returns {number}
             */
            angle: function () {
                var l = this.length(),
                    a = l && Math.acos(this.x / l);
                a = a * 180 / Math.PI;
                a = this.y > 0 ? a : -a;

                return a;
            },
            /**
             * @method circumferentialAngle
             * @returns {number}
             */
            circumferentialAngle: function () {
                var angle = this.angle();
                if (angle < 0) {
                    angle += 360;
                }
                return angle;

            },
            /**
             * @method slope
             * @returns {number}
             */
            slope: function () {
                return this.y / this.x;
            },
            /**
             * @method add
             * @param v {nx.geometry.Vector}
             * @returns {nx.geometry.Vector}
             */
            add: function (v) {
                return new Vector(this.x + v.x, this.y + v.y);
            },
            /**
             * @method subtract
             * @param v {nx.geometry.Vector}
             * @returns {nx.geometry.Vector}
             */
            subtract: function (v) {
                return new Vector(this.x - v.x, this.y - v.y);
            },
            /**
             * @method multiply
             * @param k {Number}
             * @returns {nx.geometry.Vector}
             */
            multiply: function (k) {
                return new Vector(this.x * k, this.y * k);
            },
            /**
             * @method divide
             * @param k {Number}
             * @returns {nx.geometry.Vector}
             */
            divide: function (k) {
                return new Vector(this.x / k, this.y / k);
            },
            /**
             * @method rotate
             * @param a {Number}
             * @returns {nx.geometry.Vector}
             */
            rotate: function (a) {
                var x = this.x,
                    y = this.y,
                    sinA = Math.sin(a / 180 * Math.PI),
                    cosA = Math.cos(a / 180 * Math.PI);

                return new Vector(x * cosA - y * sinA, x * sinA + y * cosA);
            },
            /**
             * @method negate
             * @returns {nx.geometry.Vector}
             */
            negate: function () {
                return new Vector(-this.x, -this.y);
            },
            /**
             * @method normal
             * @returns {nx.geometry.Vector}
             */
            normal: function () {
                var l = this.length() || 1;
                return new Vector(-this.y / l, this.x / l);
            },
            /**
             * @method normalize
             * @returns {nx.geometry.Vector}
             */
            normalize: function () {
                var l = this.length() || 1;
                return new Vector(this.x / l, this.y / l);
            },
            /**
             * @method clone
             * @returns {nx.geometry.Vector}
             */
            clone: function () {
                return new Vector(this.x, this.y);
            }
        }
    });
})(nx, window);

(function (nx) {
    var Vector = nx.geometry.Vector;

    /**
     * Mathematics Line class
     * @class nx.geometry.Line
     * @module nx.geometry
     */
    var Line = nx.define('nx.geometry.Line', nx.Observable, {
        methods: {
            init: function (start, end) {
                this.start = start || new Vector();
                this.end = end || new Vector();
                this.dir = this.end.subtract(this.start);
            },
            /**
             * @method length
             * @returns {*}
             */
            length: function () {
                return this.dir.length();
            },
            /**
             * @method squaredLength
             * @returns {*}
             */
            squaredLength: function () {
                return this.dir.squaredLength();
            },
            /**
             * @method angle
             * @returns {*}
             */
            angle: function () {
                return this.dir.angle();
            },
            /**
             * @methid intersection
             * @returns {*}
             */
            circumferentialAngle: function () {
                var angle = this.angle();
                if (angle < 0) {
                    angle += 360;
                }
                return angle;
            },
            /**
             * @method center
             * @returns {nx.geometry.Vector}
             */
            center: function () {
                return this.start.add(this.end).divide(2);
            },
            /**
             * @method slope
             * @returns {*}
             */
            slope: function () {
                return this.dir.slope();
            },
            /**
             * @method general
             * @returns {Array}
             */
            general: function () {
                var k = this.slope(),
                    start = this.start;
                if (isFinite(k)) {
                    return [k, -1, start.y - k * start.x];
                }
                else {
                    return [1, 0, -start.x];
                }
            },
            /**
             * @method intersection
             * @param l {nx.geometry.Line}
             * @returns {nx.geometry.Vector}
             */
            intersection: function (l) {
                var g0 = this.general(),
                    g1 = l.general();

                return new Vector(
                        (g0[1] * g1[2] - g1[1] * g0[2]) / (g0[0] * g1[1] - g1[0] * g0[1]),
                        (g0[0] * g1[2] - g1[0] * g0[2]) / (g1[0] * g0[1] - g0[0] * g1[1]));
            },
            /**
             * @method pedal
             * @param v {nx.geometry.Vector}
             * @returns {nx.geometry.Vector}
             */
            pedal: function (v) {
                var dir = this.dir,
                    g0 = this.general(),
                    g1 = [dir.x, dir.y, -v.x * dir.x - v.y * dir.y];

                return new Vector(
                        (g0[1] * g1[2] - g1[1] * g0[2]) / (g0[0] * g1[1] - g1[0] * g0[1]),
                        (g0[0] * g1[2] - g1[0] * g0[2]) / (g1[0] * g0[1] - g0[0] * g1[1]));
            },
            /**
             * @method translate
             * @param v {nx.geometry.Vector}
             * @returns {mx.math.Line}
             */
            translate: function (v) {
                v = v.rotate(this.angle());
                return new Line(this.start.add(v), this.end.add(v));
            },
            /**
             * @method rotate
             * @param a {Number}
             * @returns {nx.geometry.Line}
             */
            rotate: function (a) {
                return new Line(this.start.rotate(a), this.end.rotate(a));
            },
            /**
             * @method negate
             * @returns {nx.geometry.Line}
             */
            negate: function () {
                return new Line(this.end, this.start);
            },
            /**
             * @method normal
             * @returns {nx.geometry.Vector}
             */
            normal: function () {
                var dir = this.dir, l = this.dir.length();
                return new Vector(-dir.y / l, dir.x / l);
            },
            /**
             * @method pad
             * @param a {nx.geometry.Vector}
             * @param b {nx.geometry.Vector}
             * @returns {nx.geometry.Line}
             */
            pad: function (a, b) {
                var n = this.dir.normalize();
                return new Line(this.start.add(n.multiply(a)), this.end.add(n.multiply(-b)));
            },
            /**
             * @method clone
             * @returns {nx.geometry.Line}
             */
            clone: function () {
                return new Line(this.start, this.end);
            }
        }
    });
})(nx);
(function (nx, global) {


    /*
     0|1
     ---
     2|3
     */

    nx.data.QuadTree = function (inPoints, inWidth, inHeight, inCharge) {
        var width = inWidth || 800;
        var height = inHeight || 600;
        var charge = inCharge || 200;
        var points = inPoints;
        var x1 = 0, y1 = 0, x2 = 0, y2 = 0;
        this.root = null;
        this.alpha = 0;

        if (points) {
            var i = 0, length = points.length;
            var point, px, py;
            for (; i < length; i++) {
                point = points[i];
                point.dx = 0;
                point.dy = 0;
                px = point.x;
                py = point.y;
                if (isNaN(px)) {
                    px = point.x = Math.random() * width;
                }
                if (isNaN(py)) {
                    py = point.y = Math.random() * height;
                }
                if (px < x1) {
                    x1 = px;
                } else if (px > x2) {
                    x2 = px;
                }
                if (py < y1) {
                    y1 = py;
                } else if (py > y2) {
                    y2 = py;
                }
            }

            //square
            var dx = x2 - x1, dy = y2 - y1;
            if (dx > dy) {
                y2 = y1 + dx;
            } else {
                x2 = x1 + dy;
            }

            var root = this.root = new QuadTreeNode(this, x1, y1, x2, y2);
            for (i = 0; i < length; i++) {
                root.insert(points[i]);
            }
        }
    };

    var QuadTreeNode = function (inQuadTree, inX1, inY1, inX2, inY2) {
        var x1 = this.x1 = inX1, y1 = this.y1 = inY1, x2 = this.x2 = inX2, y2 = this.y2 = inY2;
        var cx = (x1 + x2) * 0.5, cy = (y1 + y2) * 0.5;
        var dx = (inX2 - inX1) * 0.5;
        var dy = (inY2 - inY1) * 0.5;
        this.point = null;
        this.nodes = null;
        this.insert = function (inPoint) {
            var point = this.point;
            var nodes = this.nodes;
            if (!point && !nodes) {
                this.point = inPoint;
                return;
            }
            if (point) {
                if (Math.abs(point.x - inPoint.x) + Math.abs(point.y - inPoint.y) < 0.01) {
                    this._insert(inPoint);
                } else {
                    this.point = null;
                    this._insert(point);
                    this._insert(inPoint);
                }
            } else {
                this._insert(inPoint);
            }
        };

        this._insert = function (inPoint) {
            var right = inPoint.x >= cx, bottom = inPoint.y >= cy, i = (bottom << 1) + right;
            var index = (bottom << 1) + right;
            var x = x1 + dx * right;
            var y = y1 + dy * bottom;
            var nodes = this.nodes || (this.nodes = []);
            var node = nodes[index] || (nodes[index] = new QuadTreeNode(inQuadTree, x, y, x + dx, y + dy));
            node.insert(inPoint);
        };
    };

})(nx, nx.global);
(function (nx, global) {

    /**
     * NeXt force layout algorithm class
     * @class nx.data.Force
     */

    /**
     * Force layout algorithm class constructor function
     * @param inWidth {Number} force stage width, default 800
     * @param inHeight {Number} force stage height, default 800
     * @constructor
     */

    nx.data.NextForce = function (inWidth, inHeight) {
        var width = inWidth || 800;
        var height = inHeight || 800;
        var strength = 4;
        var distance = 100;
        var gravity = 0.1;
        this.charge = 1200;
        this.alpha = 1;

        this.totalEnergy = Infinity;
        this.maxEnergy = Infinity;

        var threshold = 2;
        var theta = 0.8;
        this.nodes = null;
        this.links = null;
        this.quadTree = null;
        /**
         * Set data to this algorithm
         * @method setData
         * @param inJson {Object} Follow Common Topology Data Definition
         */
        this.setData = function (inJson) {
            var nodes = this.nodes = inJson.nodes;
            var links = this.links = inJson.links;
            var nodeMap = this.nodeMap = {};
            var weightMap = this.weightMap = {};
            var maxWeight = this.maxWeight = 1;
            var node, link, i = 0, length = nodes.length, id, weight;
            for (; i < length; i++) {
                node = nodes[i];
                id = node.id;
                nodeMap[id] = node;
                weightMap[id] = 0;
            }
            if (links) {
                length = links.length;
                for (i = 0; i < length; ++i) {
                    link = links[i];
                    id = link.source;
                    weight = ++weightMap[id];
                    if (weight > maxWeight) {
                        this.maxWeight = weight;
                    }
                    id = link.target;
                    weight = ++weightMap[id];
                    if (weight > maxWeight) {
                        this.maxWeight = weight;
                    }
                }
            }
        };
        /**
         * Start processing
         * @method start
         */
        this.start = function () {
            var totalEnergyThreshold = threshold * this.nodes.length;
            while (true) {
                this.tick();
                if (this.maxEnergy < threshold * 5 && this.totalEnergy < totalEnergyThreshold) {
                    break;
                }
            }
        };
        /**
         * Tick whole force stage
         * @method tick
         */
        this.tick = function () {
            var nodes = this.nodes;
            var quadTree = this.quadTree = new nx.data.QuadTree(nodes, width, height);
            this._calculateLinkEffect();
            this._calculateCenterGravitation();

            var root = quadTree.root;
            this._calculateQuadTreeCharge(root);
//            var chargeCallback = this.chargeCallback;
//            if (chargeCallback) {
//                chargeCallback.call(scope, root);
//            }
            var i, length = nodes.length, node;
            for (i = 0; i < length; i++) {
                node = nodes[i];
                this._calculateChargeEffect(root, node);
            }
            this._changePosition();
        };
        this._changePosition = function () {
            var totalEnergy = 0;
            var maxEnergy = 0;
            var nodes = this.nodes;
            var i, node, length = nodes.length, x1 = 0, y1 = 0, x2 = 0, y2 = 0, x, y, energy, dx, dy, allFixed = true;
            for (i = 0; i < length; i++) {
                node = nodes[i];
                dx = node.dx * 0.5;
                dy = node.dy * 0.5;
                energy = Math.abs(dx) + Math.abs(dy);

                if (!node.fixed) {

                    totalEnergy += energy;

                    if (energy > maxEnergy) {
                        maxEnergy = energy;
                    }
                }


                if (!node.fixed) {
                    x = node.x += dx;
                    y = node.y += dy;
                    allFixed = false;
                } else {
                    x = node.x;
                    y = node.y;
                }
                if (x < x1) {
                    x1 = x;
                } else if (x > x2) {
                    x2 = x;
                }
                if (y < y1) {
                    y1 = y;
                } else if (y > y2) {
                    y2 = y;
                }
            }
            this.totalEnergy = allFixed ? 0 : totalEnergy;
            this.maxEnergy = allFixed ? 0 : maxEnergy;
            this.x1 = x1;
            this.y1 = y1;
            this.x2 = x2;
            this.y2 = y2;
        };
        this._calculateCenterGravitation = function () {
            var nodes = this.nodes;
            var node, x, y;
            var length = nodes.length;

            var k = 0.5 * gravity;
            x = width / 2;
            y = height / 2;
            for (var i = 0; i < length; i++) {
                node = nodes[i];
                node.dx += (x - node.x) * k;
                node.dy += (y - node.y) * k;
            }
        };
        this._calculateLinkEffect = function () {
            var links = this.links;
            var nodeMap = this.nodeMap;
            var weightMap = this.weightMap;
            var i, length , link, source, target, dx, dy, d2, d, dk, k, sWeight, tWeight, totalWeight;
            if (links) {
                length = links.length;
                for (i = 0; i < length; ++i) {
                    link = links[i];
                    source = nodeMap[link.source];
                    target = nodeMap[link.target];
                    dx = target.x - source.x;
                    dy = target.y - source.y;
                    if (dx === 0 && dy === 0) {
                        target.x += Math.random() * 5;
                        target.y += Math.random() * 5;
                        dx = target.x - source.x;
                        dy = target.y - source.y;
                    }
                    d2 = dx * dx + dy * dy;
                    d = Math.sqrt(d2);
                    if (d2) {
                        var maxWeight = this.maxWeight;
                        dk = strength * (d - distance) / d;
                        dx *= dk;
                        dy *= dk;
                        sWeight = weightMap[source.id];
                        tWeight = weightMap[target.id];
                        totalWeight = sWeight + tWeight;
                        k = sWeight / totalWeight;
                        target.dx -= (dx * k) / maxWeight;
                        target.dy -= (dy * k) / maxWeight;
                        k = 1 - k;
                        source.dx += (dx * k) / maxWeight;
                        source.dy += (dy * k) / maxWeight;
                    }
                }
            }
        };
        this._calculateQuadTreeCharge = function (inNode) {
            if (inNode.fixed) {
                return;
            }
            var nodes = inNode.nodes;
            var point = inNode.point;
            var chargeX = 0, chargeY = 0, charge = 0;
            if (!nodes) {
                inNode.charge = inNode.pointCharge = this.charge;
                inNode.chargeX = point.x;
                inNode.chargeY = point.y;
                return;
            }
            if (nodes) {
                var i = 0, length = nodes.length, node, nodeCharge;
                for (; i < length; i++) {
                    node = nodes[i];
                    if (node) {
                        this._calculateQuadTreeCharge(node);
                        nodeCharge = node.charge;
                        charge += nodeCharge;
                        chargeX += nodeCharge * node.chargeX;
                        chargeY += nodeCharge * node.chargeY;
                    }
                }
            }
            if (point) {
                var thisCharge = this.charge;
                charge += thisCharge;
                chargeX += thisCharge * point.x;
                chargeY += thisCharge * point.y;
            }
            inNode.charge = charge;
            inNode.chargeX = chargeX / charge;
            inNode.chargeY = chargeY / charge;
        };
        this._calculateChargeEffect = function (inNode, inPoint) {
            if (this.__calculateChargeEffect(inNode, inPoint)) {
                var nodes = inNode.nodes;
                if (nodes) {
                    var node, i = 0, length = nodes.length;
                    for (; i < length; i++) {
                        node = nodes[i];
                        if (node) {
                            this._calculateChargeEffect(node, inPoint);
                        }
                    }
                }

            }
        };

        this.__calculateChargeEffect = function (inNode, inPoint) {
            if (inNode.point != inPoint) {
                var dx = inNode.chargeX - inPoint.x;
                var dy = inNode.chargeY - inPoint.y;
                var d2 = dx * dx + dy * dy;
                var d = Math.sqrt(d2);
                var dk = 1 / d;
                var k;
                if ((inNode.x2 - inNode.x1) * dk < theta) {
                    k = inNode.charge * dk * dk;
                    inPoint.dx -= dx * k;
                    inPoint.dy -= dy * k;
                    return false;
                } else {
                    if (inNode.point) {
                        if (!isFinite(dk)) {
                            inPoint.dx -= Math.random() * 10;
                            inPoint.dy -= Math.random() * 10;
                        } else if (inNode.pointCharge) {
                            k = inNode.pointCharge * dk * dk;
                            inPoint.dx -= dx * k;
                            inPoint.dy -= dy * k;
                        }
                    }
                }
            }
            return true;
        };
    };
})(nx, nx.global);
(function (nx, global) {
    nx.data.Force = function () {
        var force = {};
        var size = [100, 100];
        var alpha = 0,
            friction = 0.9;
        var linkDistance = function () {
            return 100;
        };
        var linkStrength = function () {
            return 1;
        };
        var charge = -1200,
            gravity = 0.1,
            theta = 0.8,
            nodes = [],
            links = [],
            distances, strengths, charges;

        function repulse(node) {
            return function (quad, x1, _, x2) {
                if (quad.point !== node) {
                    var dx = quad.cx - node.x,
                        dy = quad.cy - node.y,
                        dn = 1 / Math.sqrt(dx * dx + dy * dy),
                        k;
                    if ((x2 - x1) * dn < theta) {
                        k = quad.charge * dn * dn;
                        node.px -= dx * k;
                        node.py -= dy * k;
                        return true;
                    }
                    if (quad.point && isFinite(dn)) {
                        k = quad.pointCharge * dn * dn;
                        node.px -= dx * k;
                        node.py -= dy * k;
                    }
                }
                return !quad.charge;
            };
        }

        force.tick = function () {
            if ((alpha *= 0.99) < 0.005) {
                alpha = 0;
                return true;
            }
            var n = nodes.length,
                m = links.length,
                q, i, o, s, t, l, k, x, y;
            for (i = 0; i < m; ++i) {
                o = links[i];
                s = o.source;
                t = o.target;
                x = t.x - s.x;
                y = t.y - s.y;
                if ((l = x * x + y * y)) {
                    l = alpha * strengths[i] * ((l = Math.sqrt(l)) - distances[i]) / l;
                    x *= l;
                    y *= l;
                    t.x -= x * (k = s.weight / (t.weight + s.weight));
                    t.y -= y * k;
                    s.x += x * (k = 1 - k);
                    s.y += y * k;
                }
            }
            if ((k = alpha * gravity)) {
                x = size[0] / 2;
                y = size[1] / 2;
                i = -1;
                if (k)
                    while (++i < n) {
                        o = nodes[i];
                        o.x += (x - o.x) * k;
                        o.y += (y - o.y) * k;
                    }
            }
            if (charge) {
                forceAccumulate(q = quadtree(nodes), alpha, charges);
                i = -1;
                while (++i < n) {
                    if (!(o = nodes[i]).fixed) {
                        q.visit(repulse(o));
                    }
                }
            }
            i = -1;
            while (++i < n) {
                o = nodes[i];
                if (o.fixed) {
                    o.x = o.px;
                    o.y = o.py;
                } else {
                    o.x -= (o.px - (o.px = o.x)) * friction;
                    o.y -= (o.py - (o.py = o.y)) * friction;
                }
            }
        };
        force.nodes = function (x) {
            if (!arguments.length) return nodes;
            nodes = x;
            return force;
        };
        force.links = function (x) {
            if (!arguments.length) return links;
            links = x;
            return force;
        };
        force.distance = linkDistance;
        force.charge = function (x) {
            if (!arguments.length) return charge;
            charge = typeof x === "function" ? x : +x;
            return force;
        };
        force.size = function (x) {
            if (!arguments.length) return size;
            size = x;
            return force;
        };
        force.alpha = function (x) {
            if (!arguments.length) return alpha;
            if (alpha) {
                if (x > 0) alpha = x;
                else alpha = 0;
            } else if (x > 0) {
                alpha = x;
                force.tick();
            }
            return force;
        };
        force.start = function () {
            var i, j, n = nodes.length,
                m = links.length,
                w = size[0],
                h = size[1],
                neighbors, o;
            for (i = 0; i < n; ++i) {
                (o = nodes[i]).index = i;
                o.weight = 0;
            }
            distances = [];
            strengths = [];
            for (i = 0; i < m; ++i) {
                o = links[i];
                if (typeof o.source == "number") o.source = nodes[o.source];
                if (typeof o.target == "number") o.target = nodes[o.target];
                distances[i] = linkDistance.call(this, o, i);
                strengths[i] = linkStrength.call(this, o, i);
                ++o.source.weight;
                ++o.target.weight;
            }
            for (i = 0; i < n; ++i) {
                o = nodes[i];
                if (isNaN(o.x)) o.x = position("x", w);
                if (isNaN(o.y)) o.y = position("y", h);
                if (isNaN(o.px)) o.px = o.x;
                if (isNaN(o.py)) o.py = o.y;
            }
            charges = [];
            if (typeof charge === "function") {
                for (i = 0; i < n; ++i) {
                    charges[i] = +charge.call(this, nodes[i], i);
                }
            } else {
                for (i = 0; i < n; ++i) {
                    charges[i] = charge;
                }
            }

            function position(dimension, size) {
                var neighbors = neighbor(i),
                    j = -1,
                    m = neighbors.length,
                    x;
                while (++j < m)
                    if (!isNaN(x = neighbors[j][dimension])) return x;
                return Math.random() * size;
            }

            function neighbor() {
                if (!neighbors) {
                    neighbors = [];
                    for (j = 0; j < n; ++j) {
                        neighbors[j] = [];
                    }
                    for (j = 0; j < m; ++j) {
                        var o = links[j];
                        neighbors[o.source.index].push(o.target);
                        neighbors[o.target.index].push(o.source);
                    }
                }
                return neighbors[i];
            }

            return force.resume();
        };
        force.resume = function () {
            return force.alpha(0.1);
        };
        force.stop = function () {
            return force.alpha(0);
        };

        return force;
    };


    var forceAccumulate = function (quad, alpha, charges) {
        var cx = 0,
            cy = 0;
        quad.charge = 0;
        if (!quad.leaf) {
            var nodes = quad.nodes,
                n = nodes.length,
                i = -1,
                c;
            while (++i < n) {
                c = nodes[i];
                if (c == null) continue;
                forceAccumulate(c, alpha, charges);
                quad.charge += c.charge;
                cx += c.charge * c.cx;
                cy += c.charge * c.cy;
            }
        }
        if (quad.point) {
            if (!quad.leaf) {
                quad.point.x += Math.random() - 0.5;
                quad.point.y += Math.random() - 0.5;
            }
            var k = alpha * charges[quad.point.index];
            quad.charge += quad.pointCharge = k;
            cx += k * quad.point.x;
            cy += k * quad.point.y;
        }
        quad.cx = cx / quad.charge;
        quad.cy = cy / quad.charge;
    };

    var quadtree = function (points, x1, y1, x2, y2) {
        var p, i = -1,
            n = points.length;
        if (arguments.length < 5) {
            if (arguments.length === 3) {
                y2 = y1;
                x2 = x1;
                y1 = x1 = 0;
            } else {
                x1 = y1 = Infinity;
                x2 = y2 = -Infinity;
                while (++i < n) {
                    p = points[i];
                    if (p.x < x1) x1 = p.x;
                    if (p.y < y1) y1 = p.y;
                    if (p.x > x2) x2 = p.x;
                    if (p.y > y2) y2 = p.y;
                }
            }
        }
        var dx = x2 - x1,
            dy = y2 - y1;
        if (dx > dy) y2 = y1 + dx;
        else x2 = x1 + dy;

        function insert(n, p, x1, y1, x2, y2) {
            if (isNaN(p.x) || isNaN(p.y)) return;
            if (n.leaf) {
                var v = n.point;
                if (v) {
                    if (Math.abs(v.x - p.x) + Math.abs(v.y - p.y) < 0.01) {
                        insertChild(n, p, x1, y1, x2, y2);
                    } else {
                        n.point = null;
                        insertChild(n, v, x1, y1, x2, y2);
                        insertChild(n, p, x1, y1, x2, y2);
                    }
                } else {
                    n.point = p;
                }
            } else {
                insertChild(n, p, x1, y1, x2, y2);
            }
        }

        function insertChild(n, p, x1, y1, x2, y2) {
            var sx = x1 * 0.5 + x2 * 0.5,
                sy = y1 * 0.5 + y2 * 0.5,
                right = p.x >= sx,
                bottom = p.y >= sy,
                i = (bottom << 1) + right;
            n.leaf = false;
            n = n.nodes[i] || (n.nodes[i] = quadtreeNode());
            if (right) x1 = sx;
            else x2 = sx;
            if (bottom) y1 = sy;
            else y2 = sy;
            insert(n, p, x1, y1, x2, y2);
        }

        var root = quadtreeNode();
        root.add = function (p) {
            insert(root, p, x1, y1, x2, y2);
        };
        root.visit = function (f) {
            quadtreeVisit(f, root, x1, y1, x2, y2);
        };
        points.forEach(root.add);
        return root;
    };

    var quadtreeNode = function () {
        return {
            leaf: true,
            nodes: [],
            point: null
        };
    };

    var quadtreeVisit = function (f, node, x1, y1, x2, y2) {
        if (!f(node, x1, y1, x2, y2)) {
            var sx = (x1 + x2) * 0.5,
                sy = (y1 + y2) * 0.5,
                children = node.nodes;
            if (children[0]) quadtreeVisit(f, children[0], x1, y1, sx, sy);
            if (children[1]) quadtreeVisit(f, children[1], sx, y1, x2, sy);
            if (children[2]) quadtreeVisit(f, children[2], x1, sy, sx, y2);
            if (children[3]) quadtreeVisit(f, children[3], sx, sy, x2, y2);
        }
    };
})(nx, nx.global);

(function (nx, global) {
    /**
     * Convex algorithm
     * @class nx.data.Convex
     * @static
     */
    nx.define('nx.data.Convex', {
        static: true,
        methods: {
            multiply: function (p1, p2, p0) {
                return((p1.x - p0.x) * (p2.y - p0.y) - (p2.x - p0.x) * (p1.y - p0.y));
            },
            dis: function (p1, p2) {
                return(Math.sqrt((p1.x - p2.x) * (p1.x - p2.x) + (p1.y - p2.y) * (p1.y - p2.y)));
            },
            /**
             * Process given node array
             * @method process
             * @param inPointArray {Array} Each item should be a object, which include x&y attribute
             * @returns {Array}
             */
            process: function (inPointArray) {
                var stack = [];
                var count = inPointArray.length;
                var i, j, k = 0, top = 2;
                var tmp;

                //找到最下且偏左的那个点
                for (i = 1; i < count; i++) {
                    if ((inPointArray[i].y < inPointArray[k].y) || ((inPointArray[i].y === inPointArray[k].y) && (inPointArray[i].x < inPointArray[k].x))) {
                        k = i;
                    }
                }
                //将这个点指定为PointSet[0]
                tmp = inPointArray[0];
                inPointArray[0] = inPointArray[k];
                inPointArray[k] = tmp;

                //按极角从小到大,距离偏短进行排序
                for (i = 1; i < count - 1; i++) {
                    k = i;
                    for (j = i + 1; j < count; j++)
                        if ((this.multiply(inPointArray[j], inPointArray[k], inPointArray[0]) > 0) ||
                            ((this.multiply(inPointArray[j], inPointArray[k], inPointArray[0]) === 0) &&
                                (this.dis(inPointArray[0], inPointArray[j]) < this.dis(inPointArray[0], inPointArray[k]))))
                            k = j;//k保存极角最小的那个点,或者相同距离原点最近
                    tmp = inPointArray[i];
                    inPointArray[i] = inPointArray[k];
                    inPointArray[k] = tmp;
                }
                //第三个点先入栈
                stack[0] = inPointArray[0];
                stack[1] = inPointArray[1];
                stack[2] = inPointArray[2];
                //判断与其余所有点的关系
                for (i = 3; i < count; i++) {
                    //不满足向左转的关系,栈顶元素出栈
                    while (top > 0 && this.multiply(inPointArray[i], stack[top], stack[top - 1]) >= 0) {
                        top--;
                        stack.pop();
                    }
                    //当前点与栈内所有点满足向左关系,因此入栈.
                    stack[++top] = inPointArray[i];
                }
                return stack;
            }
        }
    });


})(nx, nx.global);
(function (nx, global) {

    /**
     * Vertex class
     * @class nx.data.Vertex
     * @extend nx.data.ObservableObject
     * @module nx.data
     */

    var Vector = nx.geometry.Vector;

    nx.define('nx.data.Vertex', nx.data.ObservableObject, {
        events: ['updateCoordinate'],
        properties: {
            /**
             * Vertex id
             * @property id {String|Number}
             */
            id: {},
            /**
             * @property positionGetter
             */
            positionGetter: {
                value: function () {
                    return function () {
                        return {
                            x: nx.path(this._data, 'x') || 0,
                            y: nx.path(this._data, 'y') || 0
                        };
                    };
                }
            },
            /**
             * @property positionSetter
             */
            positionSetter: {
                value: function () {
                    return function (position) {
                        if (this._data) {
                            var x = nx.path(this._data, 'x');
                            var y = nx.path(this._data, 'y');
                            if (position.x !== x || position.y !== y) {
                                nx.path(this._data, 'x', position.x);
                                nx.path(this._data, 'y', position.y);
                                return true;
                            } else {
                                return false;
                            }
                        }
                    };
                }
            },
            /**
             * Get/set vertex position.
             * @property position
             */
            position: {
                get: function () {
                    return{
                        x: this._x || 0,
                        y: this._y || 0
                    };
                },
                set: function (obj) {
                    var isModified = false;
                    var _position = {
                        x: this._x,
                        y: this._y
                    };
                    if (obj.x !== undefined && this._x !== obj.x) {
                        this._x = obj.x;
                        isModified = true;
                    }

                    if (obj.y !== undefined && this._y !== obj.y) {
                        this._y = obj.y;
                        isModified = true;
                    }


                    if (isModified) {

                        this.positionSetter().call(this, {x: this._x, y: this._y});

                        this.fire("updateCoordinate", {
                            oldPosition: _position,
                            newPosition: {
                                x: this._x,
                                y: this._y
                            }
                        });
                        this.notify("vector");
                    }
                }
            },
            /**
             * Get/set x coordination, suggest use position property
             * @property x
             */
            x: {
                get: function () {
                    return this._x || 0;
                },
                set: function (value) {
                    this.position({x: parseFloat(value)});
                }
            },
            /**
             * Get/set y coordination, suggest use position property
             * @property y
             */
            y: {
                get: function () {
                    return this._y || 0;
                },
                set: function (value) {
                    this.position({y: parseFloat(value)});
                }
            },
            /**
             * Get vertex's Vector object
             * @readOnly
             */
            vector: {
                get: function () {
                    var position = this.position();
                    return new Vector(position.x, position.y);
                }
            },
            restricted: {
                value: false
            },
            /**
             * Set/get vertex's visibility, and this property related to all connect edge set
             * @property visible {Boolean}
             * @default true
             */
            visible: {
                get: function () {
                    return this._visible !== undefined ? this._visible : true;
                },
                set: function (value) {
                    this._visible = value;

                    var graph = this.graph();

                    if (value === false) {
                        if (this.generated()) {
                            nx.each(this.edgeSetCollections(), function (esc, linkKey) {
                                graph.deleteEdgeSetCollection(linkKey);
                            }, this);
                            graph.removeVertex(this.id());
                        }
                    } else {
                        if (!this.restricted() && !this.generated()) {
                            graph.generateVertex(this);

                            nx.each(this.edgeSets(), function (edgeSet) {
                                graph._generateConnection(edgeSet);
                            });
                        }
                    }
                    var parentVertexSet = this.parentVertexSet();
                    if (parentVertexSet) {
                        graph.updateVertexSet(parentVertexSet);
                    }
                }
            },
            /**
             * Status property,tag is this vertex generated
             * @property generated {Boolean}
             * @default false
             */
            generated: {
                value: false
            },
            /**
             * Status property,tag is this vertex updated
             * @property updated {Boolean}
             * @default false
             */
            updated: {
                value: false
            },
            /**
             * Vertex's type
             * @property type {String}
             * @default 'vertex'
             */
            type: {
                value: 'vertex'
            },
            /**
             * connected edgeSets
             * @property edgeSets
             */
            edgeSets: {
                value: function () {
                    return {};
                }
            },
            /**
             * connected edgeSetCollections
             * @property edgeSetCollections
             */
            edgeSetCollections: {
                value: function () {
                    return {};
                }
            },
            /**
             * Get connected edges
             * @property edges
             */
            edges: {
                get: function () {
                    var edges = {};
                    nx.each(this.edgeSets(), function (edgeSet) {
                        nx.extend(edges, edgeSet.edges());
                    });
                    return edges;
                }
            },
            /**
             * Get connected vertices
             * @property connectedVertices
             */
            connectedVertices: {
                get: function () {
                    var vertices = {};
                    this.eachConnectedVertex(function (vertex, id) {
                        vertices[id] = vertex;
                    }, this);
                    return vertices;
                }
            },
            /**
             * Graph instance
             * @property graph {nx.data.ObservableGraph}
             */
            graph: {

            },
            /**
             * Vertex parent vertex set, if exist
             * @property parentVertexSet {nx.data.VertexSet}
             */
            parentVertexSet: {},
            /**
             * Vertex root vertexSet
             * @property rootVertexSet
             */
            rootVertexSet: {
                get: function () {
                    var parentVertexSet = this.parentVertexSet();
                    while (parentVertexSet && parentVertexSet.parentVertexSet()) {
                        parentVertexSet = parentVertexSet.parentVertexSet();
                    }
                    return parentVertexSet;
                }
            },
            /**
             * Generated Root VertexSet
             * @property generatedRootVertexSet
             */
            generatedRootVertexSet: {
                get: function () {
                    var _parentVertexSet;
                    var parentVertexSet = this.parentVertexSet();

                    while (parentVertexSet) {
                        if (parentVertexSet.generated() && parentVertexSet.activated()) {
                            _parentVertexSet = parentVertexSet;
                        }
                        parentVertexSet = parentVertexSet.parentVertexSet();
                    }
                    return _parentVertexSet;
                }
            },
            selected: {
                value: false
            }
        },
        methods: {

            set: function (key, value) {
                if (this.has(key)) {
                    this[key].call(this, value);
                } else {
                    nx.path(this._data, key, value);
                    this.notify(key);
                }
            },
            get: function (key) {
                if (this.has(key)) {
                    return this[key].call(this);
                } else {
                    return nx.path(this._data, key);
                }
            },
            has: function (name) {
                var member = this[name];
                return (member && member.__type__ == 'property');
            },

            /**
             * Get original data
             * @method getData
             * @returns {Object}
             */
            getData: function () {
                return this._data;
            },
            /**
             * Add connected edgeSet, which source vertex is this vertex
             * @method addEdgeSet
             * @param edgeSet {nx.data.EdgeSet}
             * @param linkKey {String}
             */
            addEdgeSet: function (edgeSet, linkKey) {
                var _edgeSets = this.edgeSets();
                _edgeSets[linkKey] = edgeSet;
            },
            /**
             * Remove edgeSet from connected edges array
             * @method removeEdgeSet
             * @param linkKey {String}
             */
            removeEdgeSet: function (linkKey) {
                var _edgeSets = this.edgeSets();
                delete  _edgeSets[linkKey];
            },
            addEdgeSetCollection: function (esc, linkKey) {
                var edgeSetCollections = this.edgeSetCollections();
                edgeSetCollections[linkKey] = esc;
            },
            removeEdgeSetCollection: function (linkKey) {
                var edgeSetCollections = this.edgeSetCollections();
                delete edgeSetCollections[linkKey];
            },
            /**
             * Iterate all connected vertices
             * @method eachConnectedVertex
             * @param callback {Function}
             * @param context {Object}
             */
            eachConnectedVertex: function (callback, context) {
                var id = this.id();
                nx.each(this.edgeSets(), function (edgeSet) {
                    var vertex = edgeSet.sourceID() == id ? edgeSet.target() : edgeSet.source();
                    if (vertex.visible() && !vertex.restricted()) {
                        callback.call(context || this, vertex, vertex.id());
                    }
                }, this);

                nx.each(this.edgeSetCollections(), function (esc) {
                    var vertex = esc.sourceID() == id ? esc.target() : esc.source();
                    if (vertex.visible() && !vertex.restricted()) {
                        callback.call(context || this, vertex, vertex.id());
                    }
                }, this);
            },
            /**
             * Move vertex
             * @method translate
             * @param x
             * @param y
             */
            translate: function (x, y) {
                var _position = this.position();
                if (x != null) {
                    _position.x += x;
                }

                if (y != null) {
                    _position.y += y;
                }

                this.position(_position);
            }
        }
    });
})
(nx, nx.global);

(function (nx, global) {


    /**
     * Edge
     * @class nx.data.Edge
     * @extend nx.data.ObservableObject
     * @module nx.data
     */

    var Line = nx.geometry.Line;
    nx.define('nx.data.Edge', nx.data.ObservableObject, {
        events: ['updateCoordinate'],
        properties: {
            /**
             * Source vertex
             * @property source {nx.data.Vertex}
             */
            source: {
                value: null
            },
            /**
             * Target vertex
             * @property target {nx.data.Vertex}
             */
            target: {
                value: null
            },
            /**
             * Source vertex id
             * @property sourceID {String|Number}
             */
            sourceID: {
                value: null
            },
            /**
             * Target vertex id
             * @property targetID {String|Number}
             */
            targetID: {
                value: null
            },
            /**
             * Edge's linkkey, linkkey = sourceID-targetID
             * @property linkKey {String}
             */
            linkKey: {

            },
            /**
             * Edge's reverse linkkey,reverseLinkKey = targetID + '_' + sourceID
             * @property reverseLinkKey {String}
             */
            reverseLinkKey: {

            },

            /**
             * Status property,tag is this edge generated
             * @property generated {Boolean}
             * @default false
             */
            generated: {
                value: false
            },
            /**
             * Status property,tag is this edge updated
             * @property updated {Boolean}
             * @default false
             */
            updated: {
                value: false
            },
            /**
             * Edge's type
             * @property type {String}
             * @default edge
             */
            type: {
                value: 'edge'
            },
            /**
             * Edge's id
             * @property id {String|Number}
             */
            id: {},
            /**
             * Edge's parent edge set
             * @property parentEdgeSet {nx.data.edgeSet}
             */
            parentEdgeSet: {},
            /**
             * Edge line object
             * @property line {nx.geometry.Line}
             * @readOnly
             */
            line: {
                get: function () {
                    return new Line(this.source().vector(), this.target().vector());
                }
            },
            /**
             * Edge position object
             * {{x1: (Number), y1: (Number), x2: (Number), y2: (Number)}}
             * @property position {Object}
             * @readOnly
             */
            position: {
                get: function () {
                    return {
                        x1: this.source().get("x"),
                        y1: this.source().get("y"),
                        x2: this.target().get("x"),
                        y2: this.target().get("y")
                    };
                }
            },
            /**
             * Is this link is a reverse link
             * @property reverse {Boolean}
             * @readOnly
             */
            reverse: {
                value: false
            },
            /**
             * Graph instance
             * @property graph {nx.data.ObservableGraph}
             */
            graph: {

            }
        },
        methods: {
            /**
             * Get original data
             * @method getData
             * @returns {Object}
             */
            getData: function () {
                return this._data;
            },
            attachEvent: function () {
                this.source().on('updateCoordinate', this._updateCoordinate, this);
                this.target().on('updateCoordinate', this._updateCoordinate, this);
            },
            _updateCoordinate: function () {
                this.fire('updateCoordinate');
            },
            dispose: function () {
                this.source().off('updateCoordinate', this._updateCoordinate, this);
                this.target().off('updateCoordinate', this._updateCoordinate, this);
                this.inherited();
            }
        }
    });

})(nx, nx.global);
(function (nx, global) {
    var util = nx.util;
    /**
     * Vertex set ckass
     * @class nx.data.VertexSet
     * @extend nx.data.Vertex
     * @module nx.data
     */
    nx.define('nx.data.VertexSet', nx.data.Vertex, {
        properties: {
            position: {
                get: function () {
                    return{
                        x: this._x || 0,
                        y: this._y || 0
                    };
                },
                set: function (obj) {
                    var isModified = false;
                    var _position = {
                        x: this._x,
                        y: this._y
                    };
                    if (obj.x !== undefined && this._x !== obj.x) {
                        this._x = obj.x;
                        isModified = true;
                    }

                    if (obj.y !== undefined && this._y !== obj.y) {
                        this._y = obj.y;
                        isModified = true;
                    }


                    if (isModified) {

                        this.positionSetter().call(this, {x: this._x, y: this._y});


                        var _xDelta = this._x - _position.x;
                        var _yDelta = this._y - _position.y;

                        nx.each(this.vertices(), function (vertex) {
                            vertex.translate(_xDelta, _yDelta);
                        });
                        nx.each(this.vertexSet(), function (vertexSet) {
                            vertexSet.translate(_xDelta, _yDelta);
                        });

                        /**
                         * @event updateVertexSetCoordinate
                         * @param sender {Object}  Trigger instance
                         * @param {Object} {oldPosition:Point,newPosition:Point}
                         */

                        this.fire("updateCoordinate", {
                            oldPosition: _position,
                            newPosition: {
                                x: this._x,
                                y: this._y
                            }
                        });
                        this.notify("vector");
                    }
                }
            },
            /**
             * All child vertices
             * @property vertices {Object}
             * @default {}
             */
            vertices: {
                value: function () {
                    return {};
                }
            },
            vertexSet: {
                value: function () {
                    return {};
                }
            },
            subVertices: {
                get: function () {
                    var vertices = {};
                    this.eachSubVertex(function (vertex, id) {
                        vertices[id] = vertex;
                    });
                    return vertices;
                }
            },
            subVertexSet: {
                get: function () {
                    var vertexSets = {};
                    this.eachSubVertexSet(function (vertexSet, id) {
                        vertexSets[id] = vertexSet;
                    });
                    return vertexSets;
                }
            },
            visible: {
                value: true
            },
            inheritedVisible: {
                get: function () {
                    // all sub vertex is in visible
                    var invisible = true;
                    nx.each(this.vertices(), function (vertex) {
                        if (vertex.visible()) {
                            invisible = false;
                        }
                    });
                    nx.each(this.vertexSet(), function (vertexSet) {
                        if (vertexSet.visible()) {
                            invisible = false;
                        }
                    }, this);
                    return !invisible;
                }
            },
            /**
             * VertexSet's type
             * @property type {String}
             * @default 'vertexset'
             */
            type: {
                value: 'vertexSet'
            },
            activated: {
                get: function () {
                    return this._activated !== undefined ? this._activated : true;
                },
                set: function (value) {
                    if (this._activated !== value) {
                        if (value) {
                            this._collapse();
                        } else {
                            this._expand();
                        }
                        return true;
                    } else {
                        return false;
                    }
                }
            }
        },
        methods: {
            initNodes: function () {
                var graph = this.graph();
                var nodes = this.get('nodes');
                nx.each(nodes, function (id) {
                    var vertex = graph.vertices().getItem(id) || graph.vertexSets().getItem(id);
                    if (vertex && !vertex.restricted()) {
                        var _map = vertex.type() == 'vertex' ? this.vertices() : this.vertexSet();
                        _map[id] = vertex;
                        vertex.restricted(true);
                        vertex.parentVertexSet(this);
                    } else {
                        if (console) {
                            console.warn('NodeSet data error', this.id(), id);
                        }
                    }
                }, this);

            },
            /***
             * Add child vertex
             * @method addVertex
             * @param vertex
             */
            addVertex: function (vertex) {
                var nodes = this.get('nodes');
                if (vertex) { //&& !vertex.restricted()
                    var id = vertex.id();
                    var _map = vertex.type() == 'vertex' ? this.vertices() : this.vertexSet();
                    _map[id] = vertex;
                    vertex.restricted(true);

                    var parentVertexSet = vertex.parentVertexSet();
                    if (parentVertexSet) {
                        parentVertexSet.removeVertex(id);
                        parentVertexSet.updated(true);
                    }

                    vertex.parentVertexSet(this);
                    nodes.push(vertex.id());
                    this.updated(true);
                }
            },
            /**
             * Remove vertex
             * @param id {String}
             * @returns {Array}
             */
            removeVertex: function (id) {
                var nodes = this.get('nodes');
                var vertex = this.vertices()[id] || this.vertexSet()[id];
                if (vertex) {
                    vertex.parentVertexSet(null);
                    delete this.vertices()[id];
                    delete this.vertexSet()[id];
                    nodes.splice(nodes.indexOf(id), 1);
                    this.updated(true);
                }
            },
            eachSubVertex: function (callback, context) {
                nx.each(this.vertices(), callback, context || this);
                nx.each(this.vertexSet(), function (vertex) {
                    vertex.eachSubVertex(callback, context);
                }, this);
            },
            eachSubVertexSet: function (callback, context) {
                nx.each(this.vertexSet(), callback, context || this);
                nx.each(this.vertexSet(), function (vertex) {
                    vertex.eachSubVertexSet(callback, context);
                }, this);
            },
            getSubEdgeSets: function () {
                var subEdgeSetMap = {};
                // get all sub vertex and edgeSet
                this.eachSubVertex(function (vertex) {
                    nx.each(vertex.edgeSets(), function (edgeSet, linkKey) {
                        subEdgeSetMap[linkKey] = edgeSet;
                    });
                }, this);
                return subEdgeSetMap;
            },
            _expand: function () {
                var graph = this.graph();

                var parentVertexSet = this.parentVertexSet();
                if (parentVertexSet) {
                    parentVertexSet.activated(false);
                }

                this._activated = false;

                // remove created edgeSet collection
                nx.each(this.edgeSetCollections(), function (esc, linkKey) {
                    graph.deleteEdgeSetCollection(linkKey);
                }, this);


                nx.each(this.vertices(), function (vertex, id) {
                    vertex.restricted(false);
                    if (vertex.visible()) {
                        graph.generateVertex(vertex);
                    }
                }, this);

                nx.each(this.vertexSet(), function (vertexSet) {
                    vertexSet.restricted(false);
                    if (vertexSet.visible()) {
                        graph.generateVertexSet(vertexSet);
                    }
                }, this);

                this.visible(false);

                this._generateConnection();
            },
            _collapse: function () {
                var graph = this.graph();

                this._activated = true;


                this.eachSubVertex(function (vertex) {
                    vertex.restricted(true);
                    if (vertex.generated()) {
                        nx.each(vertex.edgeSetCollections(), function (esc, linkKey) {
                            graph.deleteEdgeSetCollection(linkKey);
                        });
                    }
                }, this);


                nx.each(this.vertexSet(), function (vertexSet, id) {
                    vertexSet.restricted(true);
                    if (vertexSet.generated()) {
                        graph.removeVertexSet(id, false);
                    }
                }, this);

                nx.each(this.vertices(), function (vertex, id) {
                    vertex.restricted(true);
                    if (vertex.generated()) {
                        graph.removeVertex(id);
                    }
                }, this);

                this.visible(true);

                this._generateConnection();

            },
            _generateConnection: function () {
                //
                var graph = this.graph();

                nx.each(this.getSubEdgeSets(), function (edgeSet) {
                    graph._generateConnection(edgeSet);
                }, this);
            }
        }
    });


})
(nx, nx.global);
(function (nx, global) {

    /**
     * Edge set clas
     * @class nx.data.EdgeSet
     * @extend nx.data.Edge
     * @module nx.data
     */

    nx.define('nx.data.EdgeSet', nx.data.Edge, {
        properties: {
            /**
             * All child edges
             * @property edges {Object}
             */
            edges: {
                value: function () {
                    return {};
                }
            },
            /**
             * Edge's type
             * @property type {String}
             * @default 'edgeSet'
             */
            type: {
                value: 'edgeSet'
            },
            activated: {
                get: function () {
                    return this._activated !== undefined ? this._activated : true;
                },
                set: function (value) {
                    var graph = this.graph();
                    nx.each(this.edges(), function (edge,id) {
                        if (value) {
                            graph.removeEdge(id, false);
                        } else {
                            graph.generateEdge(edge);
                        }
                    }, this);
                    this._activated = value;
                }
            }
        },
        methods: {
            /**
             * Add child edge
             * @method addEdge
             * @param edge {nx.data.Edge}
             */
            addEdge: function (edge) {
                var edges = this.edges();
                edges[edge.id()] = edge;
            },
            /**
             * Remove child edge
             * @method removeEdge
             * @param id {String}
             */
            removeEdge: function (id) {
                var edges = this.edges();
                delete  edges[id];
            }
        }

    });
})(nx, nx.global);
(function (nx, global) {
    /**
     * Edge set collection class
     * @class nx.data.EdgeSetCollection
     * @extend nx.data.Edge
     * @module nx.data
     */

    nx.define('nx.data.EdgeSetCollection', nx.data.Edge, {
        properties: {
            /**
             * All child edgeset
             * @property edgeSets {Object}
             */
            edgeSets: {
                value: function () {
                    return {};
                }
            },
            edges: {
                get: function () {
                    var edges = {};
                    nx.each(this.edgeSets(), function (edgeSet) {
                        nx.extend(edges, edgeSet.edges());
                    });
                    return edges;
                }
            },
            /**
             * Edge's type
             * @property type {String}
             * @default 'edgeSet'
             */
            type: {
                value: 'edgeSetCollection'
            },
            activated: {
                get: function () {
                    return this._activated !== undefined ? this._activated : true;
                },
                set: function (value) {
                    var graph = this.graph();
                    nx.each(this.edgeSets(),function(edgeSet){
                        edgeSet.activated(value, {
                            force: true
                        });
                    });
                    //this.eachEdge(function (edge) {
                    //    if (edge.type() == 'edge') {
                    //        if (value) {
                    //            graph.fire('removeEdge', edge);
                    //        } else {
                    //            graph.fire('addEdge', edge);
                    //        }
                    //    } else if (edge.type() == 'edgeSet') {
                    //        if (value) {
                    //            graph.fire('removeEdgeSet', edge);
                    //        } else {
                    //            graph.fire('addEdgeSet', edge);
                    //        }
                    //    }
                    //}, this);
                    this._activated = value;
                }
            }
        },
        methods: {
            /**
             * Add child edgeSet
             * @method addEdgeSet
             * @param edgeSet {nx.data.EdgeSet}
             */
            addEdgeSet: function (edgeSet) {
                var edgeSets = this.edgeSets();
                edgeSets[edgeSet.linkKey()] = edgeSet;
            },
            /**
             * Remove child edgeSet
             * @method removeEdgeSet
             * @param linkKey {String}
             */
            removeEdgeSet: function (linkKey) {
                var edgeSets = this.edgeSets();
                delete  edgeSets[linkKey];
            }
        }

    });
})(nx, nx.global);
(function(nx, global) {
    var util = nx.util;
    nx.define('nx.data.ObservableGraph.Vertices', nx.data.ObservableObject, {
        events: ['addVertex', 'removeVertex', 'deleteVertex', 'updateVertex', 'updateVertexCoordinate'],
        properties: {

            nodes: {
                get: function() {
                    return this._nodes || [];
                },
                set: function(value) {

                    // off previous ObservableCollection event
                    if (this._nodes && nx.is(this._nodes, nx.data.ObservableCollection)) {
                        this._nodes.off('change', this._nodesCollectionProcessor, this);
                    }

                    this.vertices().clear();

                    if (nx.is(value, nx.data.ObservableCollection)) {
                        value.on('change', this._nodesCollectionProcessor, this);
                        value.each(function(value) {
                            this._addVertex(value);
                        }, this);
                        this._nodes = value;
                    } else if (value) {
                        nx.each(value, this._addVertex, this);
                        this._nodes = value.slice();
                    }
                }
            },

            vertexFilter: {},
            vertices: {
                value: function() {
                    var vertices = new nx.data.ObservableDictionary();
                    vertices.on('change', function(sender, args) {
                        var action = args.action;
                        var items = args.items;
                        if (action == 'clear') {
                            nx.each(items, function(item) {
                                this.deleteVertex(item.key());
                            }, this);
                        }
                    }, this);
                    return vertices;
                }
            },
            visibleVertices: {
                get: function() {
                    var vertices = {};
                    this.eachVertex(function(vertex, id) {
                        if (vertex.visible()) {
                            vertices[id] = vertex;
                        }
                    });
                    return vertices;
                }
            },
            vertexPositionGetter: {},
            vertexPositionSetter: {}
        },
        methods: {
            /**
             * Add vertex to Graph
             * @method addVertex
             * @param {JSON} data Vertex original data
             * @param {Object} [config] Config object
             * @returns {nx.data.Vertex}
             */
            addVertex: function(data, config) {
                var vertex;
                var nodes = this.nodes();
                var vertices = this.vertices();
                var identityKey = this.identityKey();
                if (nx.is(nodes, nx.data.ObservableCollection)) {
                    nodes.add(data);
                    //todo will has issue when data is not current
                    vertex = vertices.getItem(vertices.count() - 1);
                } else {
                    vertex = this._addVertex(data, config);
                    if (vertex) {
                        nodes.push(data);
                    }
                }

                if (!vertex) {
                    return null;
                }

                if (config) {
                    vertex.sets(config);
                }
                this.generateVertex(vertex);


                return vertex;
            },
            _addVertex: function(data) {
                var vertices = this.vertices();
                var identityKey = this.identityKey();

                if (typeof(data) == 'string' || typeof(data) == 'number') {
                    data = {
                        data: data
                    };
                }

                var id = nx.path(data, identityKey);
                id = id !== undefined ? id : (this.vertexSets().count() + this.vertices().count());

                if (vertices.getItem(id)) {
                    return null;
                }

                var vertex = new nx.data.Vertex(data);

                var vertexPositionGetter = this.vertexPositionGetter();
                if (vertexPositionGetter) {
                    vertex.positionGetter(vertexPositionGetter);
                }

                var vertexPositionSetter = this.vertexPositionSetter();
                if (vertexPositionSetter) {
                    vertex.positionSetter(vertexPositionSetter);
                }


                vertex.sets({
                    graph: this,
                    id: id
                });


                //delegate synchronize
                if (nx.is(data, nx.data.ObservableObject)) {
                    var fn = data.set;
                    data.set = function(key, value) {
                        fn.call(data, key, value);
                        //
                        if (vertex.__properties__.indexOf(key) == -1) {
                            if (vertex.has(key)) {
                                vertex[key].call(vertex, value);
                            } else {
                                vertex.notify(key);
                            }
                        }
                    };
                }


                // init position
                vertex.position(vertex.positionGetter().call(vertex, vertex));

                vertices.setItem(id, vertex);


                var vertexFilter = this.vertexFilter();
                if (vertexFilter && nx.is(vertexFilter, Function)) {
                    var result = vertexFilter.call(this, data, vertex);
                    vertex.visible(result === false);
                }

                return vertex;
            },
            generateVertex: function(vertex) {
                if (vertex.visible() && !vertex.generated() && !vertex.restricted()) {

                    vertex.on('updateCoordinate', this._updateVertexCoordinateFN, this);
                    /**
                     * @event addVertex
                     * @param sender {Object}  Trigger instance
                     * @param {nx.data.Vertex} vertex Vertex object
                     */
                    this.fire('addVertex', vertex);
                    vertex.generated(true);
                }
            },
            _updateVertexCoordinateFN: function(vertex) {
                /**
                 * @event updateVertexCoordinate
                 * @param sender {Object}  Trigger instance
                 * @param {nx.data.Vertex} vertex Vertex object
                 */
                this.fire('updateVertexCoordinate', vertex);
            },


            /**
             * Remove a vertex from Graph
             * @method removeVertex
             * @param {String} id
             * @returns {Boolean}
             */
            removeVertex: function(id) {
                var vertex = this.vertices().getItem(id);
                if (!vertex) {
                    return false;
                }

                nx.each(vertex.edgeSets(), function(edgeSet, linkKey) {
                    this.removeEdgeSet(linkKey);
                }, this);

                nx.each(vertex.edgeSetCollections(), function(esc, linkKey) {
                    this.deleteEdgeSetCollection(linkKey);
                }, this);


                vertex.off('updateCoordinate', this._updateVertexCoordinateFN, this);
                vertex.generated(false);
                /**
                 * @event removeVertex
                 * @param sender {Object}  Trigger instance
                 * @param {nx.data.Vertex} vertex Vertex object
                 */
                this.fire('removeVertex', vertex);
                return vertex;
            },
            /**
             * Delete a vertex from Graph
             * @method removeVertex
             * @param {id} id
             * @returns {Boolean}
             */
            deleteVertex: function(id) {
                var nodes = this.nodes();
                var vertex = this.getVertex(id);
                if (vertex) {
                    if (nx.is(nodes, nx.data.ObservableCollection)) {
                        var data = vertex.getData();
                        nodes.remove(data);
                    } else {
                        var index = this.nodes().indexOf(vertex.getData());
                        if (index != -1) {
                            this.nodes().splice(index, 1);
                        }
                        this._deleteVertex(id);
                    }
                }
            },
            _deleteVertex: function(id) {
                var vertex = this.vertices().getItem(id);
                if (!vertex) {
                    return false;
                }

                nx.each(vertex.edgeSets(), function(edgeSet) {
                    this.deleteEdgeSet(edgeSet.linkKey());
                }, this);

                nx.each(vertex.edgeSetCollections(), function(esc) {
                    this.deleteEdgeSetCollection(esc.linkKey());
                }, this);

                var vertexSet = vertex.parentVertexSet();
                if (vertexSet) {
                    vertexSet.removeVertex(id);
                }

                vertex.off('updateCoordinate', this._updateVertexCoordinateFN, this);
                vertex.generated(false);
                this.fire('deleteVertex', vertex);

                this.vertices().removeItem(id);

                vertex.dispose();
            },
            eachVertex: function(callback, context) {
                this.vertices().each(function(item, id) {
                    callback.call(context || this, item.value(), id);
                });
            },
            getVertex: function(id) {
                return this.vertices().getItem(id);
            },
            _nodesCollectionProcessor: function(sender, args) {
                var items = args.items;
                var action = args.action;
                var identityKey = this.identityKey();
                if (action == 'add') {
                    nx.each(items, function(data) {
                        var vertex = this._addVertex(data);
                        this.generateVertex(vertex);
                    }, this);
                } else if (action == 'remove') {
                    nx.each(items, function(data) {
                        var id = nx.path(data, identityKey);
                        this._deleteVertex(id);
                    }, this);
                } else if (action == 'clear') {
                    this.vertices().clear();
                }
            }
        }
    });


})(nx, nx.global);
(function(nx, global) {

    nx.define('nx.data.ObservableGraph.VertexSets', nx.data.ObservableObject, {
        events: ['addVertexSet', 'removeVertexSet', 'updateVertexSet', 'updateVertexSetCoordinate'],
        properties: {
            nodeSet: {
                get: function() {
                    return this._nodeSet || [];
                },
                set: function(value) {

                    if (this._nodeSet && nx.is(this._nodeSet, nx.data.ObservableCollection)) {
                        this._nodeSet.off('change', this._nodeSetCollectionProcessor, this);
                    }

                    this.vertexSets().clear();

                    if (nx.is(value, nx.data.ObservableCollection)) {
                        value.on('change', this._nodeSetCollectionProcessor, this);
                        value.each(function(value) {
                            this._addVertexSet(value);
                        }, this);
                        this._nodeSet = value;
                    } else if (value) {
                        nx.each(value, this._addVertexSet, this);
                        this._nodeSet = value.slice();
                    }

                    this.eachVertexSet(this.initVertexSet, this);


                }
            },
            vertexSets: {
                value: function() {
                    var vertexSets = new nx.data.ObservableDictionary();
                    vertexSets.on('change', function(sender, args) {
                        var action = args.action;
                        var items = args.items;
                        if (action == 'clear') {
                            nx.each(items, function(item) {
                                this.removeVertexSet(item.key());
                            }, this);
                        }
                    }, this);
                    return vertexSets;
                }
            },
            visibleVertexSets: {
                get: function() {
                    var vertexSets = {};
                    this.eachVertexSet(function(vertexSet, id) {
                        if (vertexSet.visible()) {
                            vertexSets[id] = vertexSet;
                        }
                    });
                    return vertexSets;
                }
            }
        },
        methods: {
            /**
             * Add vertex set to Graph
             * @method addVertexSet
             * @param {JSON} data Vertex set original data, which include nodes(Array) attribute. That is node's ID collection.  e.g. {nodes:[id1,id2,id3]}
             * @param {Object} [config] Config object
             * @returns {nx.data.VertexSet}
             */
            addVertexSet: function(data, cfg) {
                var vertexSet;
                var config = cfg || {};
                var nodeSet = this.nodeSet();
                var vertexSets = this.vertexSets();
                if (nx.is(nodeSet, nx.data.ObservableCollection)) {
                    nodeSet.add(data);
                    vertexSet = vertexSets.getItem(vertexSets.count() - 1);
                } else {
                    nodeSet.push(data);
                    vertexSet = this._addVertexSet(data);
                }

                if (!vertexSet) {
                    return null;
                }

                if (config) {
                    vertexSet.sets(config);
                }


                if (config.parentVertexSetID != null) {
                    var parentVertexSet = this.getVertexSet(config.parentVertexSetID);
                    if (parentVertexSet) {
                        parentVertexSet.addVertex(vertexSet);
                    }
                }

                this.initVertexSet(vertexSet);


                this.generateVertexSet(vertexSet);

                vertexSet.activated(true, {
                    force: true
                });
                this.updateVertexSet(vertexSet);

                return vertexSet;
            },
            _addVertexSet: function(data) {
                var identityKey = this.identityKey();
                var vertexSets = this.vertexSets();
                //
                if (typeof(data) == 'string' || typeof(data) == 'number') {
                    data = {
                        data: data
                    };
                }
                var id = nx.path(data, identityKey);
                id = id !== undefined ? id : this.vertexSets().count() + this.vertices().count();

                if (vertexSets.getItem(id)) {
                    return null;
                }

                var vertexSet = new nx.data.VertexSet(data);


                var vertexPositionGetter = this.vertexPositionGetter();
                if (vertexPositionGetter) {
                    vertexSet.positionGetter(vertexPositionGetter);
                }

                var vertexPositionSetter = this.vertexPositionSetter();
                if (vertexPositionSetter) {
                    vertexSet.positionSetter(vertexPositionSetter);
                }

                //
                vertexSet.sets({
                    graph: this,
                    type: 'vertexSet',
                    id: id
                });


                //delegate synchronize
                if (nx.is(data, nx.data.ObservableObject)) {
                    var fn = data.set;
                    data.set = function(key, value) {
                        fn.call(data, key, value);
                        //
                        if (vertexSet.__properties__.indexOf(key) == -1) {
                            if (vertexSet.has(key)) {
                                vertexSet[key].call(vertexSet, value);
                            } else {
                                vertexSet.notify(key);
                            }
                        }
                    };
                }


                vertexSet.position(vertexSet.positionGetter().call(vertexSet, vertexSet));

                this.vertexSets().setItem(id, vertexSet);

                return vertexSet;
            },
            initVertexSet: function(vertexSet) {
                vertexSet.initNodes();
            },
            generateVertexSet: function(vertexSet) {
                if (vertexSet.visible() && !vertexSet.generated()) {
                    vertexSet.generated(true);
                    vertexSet.on('updateCoordinate', this._updateVertexSetCoordinateFN, this);
                    this.fire('addVertexSet', vertexSet);
                }
            },
            _updateVertexSetCoordinateFN: function(vertexSet, args) {
                /**
                 * @event updateVertexSetCoordinate
                 * @param sender {Object}  Trigger instance
                 * @param {nx.data.VertexSet} vertexSet VertexSet object
                 */
                this.fire('updateVertexSetCoordinate', vertexSet);
            },
            updateVertexSet: function(vertexSet) {
                if (vertexSet.generated()) {
                    vertexSet.updated(false);
                    /**
                     * @event updateVertexSet
                     * @param sender {Object}  Trigger instance
                     * @param {nx.data.VertexSet} vertexSet VertexSet object
                     */
                    this.fire('updateVertexSet', vertexSet);
                }
            },

            /**
             * Remove a vertex set from Graph
             * @method removeVertexSet
             * @param {String} id
             * @returns {Boolean}
             */
            removeVertexSet: function(id) {

                var vertexSet = this.vertexSets().getItem(id);
                if (!vertexSet) {
                    return false;
                }


                vertexSet.activated(true);

                nx.each(vertexSet.edgeSets(), function(edgeSet, linkKey) {
                    this.removeEdgeSet(linkKey);
                }, this);

                nx.each(vertexSet.edgeSetCollections(), function(esc, linkKey) {
                    this.deleteEdgeSetCollection(linkKey);
                }, this);

                vertexSet.generated(false);
                vertexSet.off('updateCoordinate', this._updateVertexSetCoordinateFN, this);
                this.fire('removeVertexSet', vertexSet);

            },
            deleteVertexSet: function(id) {
                var nodeSet = this.nodeSet();
                var vertexSet = this.getVertexSet(id);
                if (vertexSet) {
                    if (nx.is(nodeSet, nx.data.ObservableCollection)) {
                        var data = vertexSet.getData();
                        nodeSet.remove(data);
                    } else {
                        var index = this.nodeSet().indexOf(vertexSet.getData());
                        if (index != -1) {
                            this.nodeSet().splice(index, 1);
                        }
                        this._deleteVertexSet(id);
                    }
                }
            },
            _deleteVertexSet: function(id) {
                var vertexSet = this.vertexSets().getItem(id);
                if (!vertexSet) {
                    return false;
                }
                if (vertexSet.generated()) {
                    vertexSet.activated(false);
                }


                var parentVertexSet = vertexSet.parentVertexSet();
                if (parentVertexSet) {
                    parentVertexSet.removeVertex(id);

                }

                nx.each(vertexSet.vertices(), function(vertex) {
                    if (parentVertexSet) {
                        parentVertexSet.addVertex(vertex);
                    } else {
                        vertex.parentVertexSet(null);
                    }
                });
                nx.each(vertexSet.vertexSet(), function(vertexSet) {
                    if (parentVertexSet) {
                        parentVertexSet.addVertex(vertexSet);
                    } else {
                        vertexSet.parentVertexSet(null);
                    }
                });

                vertexSet.off('updateCoordinate', this._updateVertexCoordinateFN, this);
                vertexSet.generated(false);
                this.vertexSets().removeItem(id);
                this.fire('deleteVertexSet', vertexSet);

                vertexSet.dispose();
            },

            eachVertexSet: function(callback, context) {
                this.vertexSets().each(function(item, id) {
                    callback.call(context || this, item.value(), id);
                });
            },
            getVertexSet: function(id) {
                return this.vertexSets().getItem(id);
            },
            _nodeSetCollectionProcessor: function(sender, args) {
                var items = args.items;
                var action = args.action;
                var identityKey = this.identityKey();
                if (action == 'add') {
                    nx.each(items, function(data) {
                        var vertexSet = this._addVertexSet(data);
                        this.generateVertexSet(vertexSet);

                    }, this);
                } else if (action == 'remove') {
                    nx.each(items, function(data) {
                        var id = nx.path(data, identityKey);
                        this._deleteVertexSet(id);
                    }, this);
                } else if (action == 'clear') {
                    this.vertexSets().clear();
                }
            }
        }
    });


})(nx, nx.global);
(function (nx, global) {

    nx.define('nx.data.ObservableGraph.Edges', nx.data.ObservableObject, {
        events: ['addEdge', 'removeEdge', 'deleteEdge', 'updateEdge', 'updateEdgeCoordinate'],
        properties: {
            links: {
                get: function () {
                    return this._links || [];
                },
                set: function (value) {

                    if (this._links && nx.is(this._links, nx.data.ObservableCollection)) {
                        this._links.off('change', this._linksCollectionProcessor, this);
                    }

                    this.edgeSetCollections().clear();

                    this.edgeSets().clear();

                    this.edges().clear();


                    if (nx.is(value, nx.data.ObservableCollection)) {
                        value.on('change', this._linksCollectionProcessor, this);
                        value.each(function (value) {
                            this._addEdge(value);
                        }, this);
                        this._links = value;
                    } else if (value) {
                        nx.each(value, this._addEdge, this);
                        this._links = value.slice();
                    }


                }
            },
            edgeFilter: {},
            edges: {
                value: function () {
                    var edges = new nx.data.ObservableDictionary();
                    edges.on('change', function (sender, args) {
                        var action = args.action;
                        var items = args.items;
                        if (action == 'clear') {
                            nx.each(items, function (item) {
                                this.deleteEdge(item.key());
                            }, this);
                        }
                    }, this);
                    return edges;
                }
            }
        },
        methods: {
            /**
             * Add edge to Graph
             * @method addEdge
             * @param {JSON} data Vertex original data
             * @param {Object} [config] Config object
             * @returns {nx.data.Edge}
             */
            addEdge: function (data, config) {
                var links = this.links();
                var edges = this.edges();
                var edge;

                if (data.source == null || data.target == null) {
                    return undefined;
                }


                if (nx.is(links, nx.data.ObservableCollection)) {
                    links.add(data);
                    // todo, handler when the data error,
                    edge = edges.getItem(edges.count() - 1);
                }
                else {
                    edge = this._addEdge(data);
                    if (edge) {
                        links.push(data);
                    }
                }

                if (!edge) {
                    return null;
                }

                if (config) {
                    edge.sets(config);
                }

                //update edgeSet
                var edgeSet = edge.parentEdgeSet();
                if (!edgeSet.generated()) {
                    this.generateEdgeSet(edgeSet);
                }
                else {
                    this.updateEdgeSet(edgeSet);
                }

                return edge;
            },
            _addEdge: function (data) {
                var edges = this.edges();
                var identityKey = this.identityKey();
                var source, target, sourceID, targetID;


                if (data.source == null || data.target == null) {
                    return undefined;
                }


                sourceID = nx.path(data, 'source') != null ? nx.path(data, 'source') : data.source;
                source = this.vertices().getItem(sourceID); // || this.vertexSets().getItem(sourceID);


                targetID = nx.path(data, 'target') != null ? nx.path(data, 'target') : data.source;
                target = this.vertices().getItem(targetID); // || this.vertexSets().getItem(targetID);


                if (source && target) {
                    var edge = new nx.data.Edge(data);
                    var id = nx.path(data, 'id') != null ? nx.path(data, 'id') : edge.__id__;

                    if (edges.getItem(id)) {
                        return null;
                    }


                    edge.sets({
                        id: id,
                        source: source,
                        target: target,
                        sourceID: sourceID,
                        targetID: targetID,
                        graph: this
                    });

                    edge.attachEvent();

                    edges.setItem(id, edge);

                    var edgeSet = this.getEdgeSetBySourceAndTarget(sourceID, targetID);
                    if (!edgeSet) {
                        edgeSet = this._addEdgeSet({
                            source: source,
                            target: target,
                            sourceID: sourceID,
                            targetID: targetID
                        });
                    }
                    else {
                        edgeSet.updated(true);
                    }

                    edge.sets({
                        linkKey: edgeSet.linkKey(),
                        reverseLinkKey: edgeSet.reverseLinkKey()
                    });

                    edgeSet.addEdge(edge);
                    edge.parentEdgeSet(edgeSet);
                    edge.reverse(sourceID !== edgeSet.sourceID());


                    var edgeFilter = this.edgeFilter();
                    if (edgeFilter && nx.is(edgeFilter, Function)) {
                        var result = edgeFilter.call(this, data, edge);
                        edge.visible(result === false);
                    }

                    return edge;

                }
                else {
                    if (console) {
                        console.warn('source node or target node is not defined, or linkMappingKey value error', data, source, target);
                    }
                    return undefined;
                }
            },
            generateEdge: function (edge) {
                if (!edge.generated()) { //&& edge.source().generated() && edge.target().generated()
                    edge.on('updateCoordinate', this._updateEdgeCoordinate, this);

                    /**
                     * @event addEdge
                     * @param sender {Object}  Trigger instance
                     * @param {nx.data.Edge} edge Edge object
                     */
                    this.fire('addEdge', edge);
                    edge.generated(true);
                }
            },
            /**
             * Remove edge from Graph
             * @method removeEdge
             * @param id {String} edge id
             * @param isUpdateEdgeSet {Boolean}
             */
            removeEdge: function (id, isUpdateEdgeSet) {
                var edge = this.edges().getItem(id);
                if (!edge) {
                    return false;
                }
                edge.generated(false);
                edge.off('updateCoordinate', this._updateEdgeCoordinate, this);
                /**
                 * @event removeEdge
                 * @param sender {Object}  Trigger instance
                 * @param {nx.data.Edge} edge Edge object
                 */
                this.fire('removeEdge', edge);

                if (isUpdateEdgeSet !== false) {
                    var edgeSet = edge.parentEdgeSet();
                    this.updateEdgeSet(edgeSet);
                }
            },
            deleteEdge: function (id, isUpdateEdgeSet) {

                var edge = this.getEdge(id);
                if (!edge) {
                    return false;
                }

                var links = this.links();
                if (nx.is(links, nx.data.ObservableCollection)) {
                    links.removeAt(edge.getData());
                }
                else {
                    var index = links.indexOf(edge.getData());
                    if (index != -1) {
                        links.splice(index, 1);
                    }
                    this._deleteEdge(id, isUpdateEdgeSet);
                }

            },
            _deleteEdge: function (id, isUpdateEdgeSet) {
                var edge = this.getEdge(id);
                if (!edge) {
                    return false;
                }
                edge.off('updateCoordinate', this._updateEdgeCoordinate, this);

                //update parent
                if (isUpdateEdgeSet !== false) {
                    var edgeSet = edge.parentEdgeSet();
                    edgeSet.removeEdge(id);
                    this.updateEdgeSet(edgeSet);
                }

                /**
                 * @event deleteEdge
                 * @param sender {Object} Trigger instance
                 * @param {nx.data.Edge} edge Edge object
                 */
                this.fire('deleteEdge', edge);

                this.edges().removeItem(id);

                edge.dispose();

            },
            _updateEdgeCoordinate: function (sender, args) {
                this.fire('updateEdgeCoordinate', sender);
            },
            getEdge: function (id) {
                return this.edges().getItem(id);
            },
            /**
             * Get edges by source vertex id and target vertex id
             * @method getEdgesBySourceAndTarget
             * @param source {nx.data.Vertex|Number|String} could be vertex object or id
             * @param target {nx.data.Vertex|Number|String} could be vertex object or id
             * @returns {Array}
             */
            getEdgesBySourceAndTarget: function (source, target) {
                var edgeSet = this.getEdgeSetBySourceAndTarget(source, target);
                return edgeSet && edgeSet.getEdges();
            },
            /**
             * Get edges which are connected to passed vertices
             * @method getEdgesByVertices
             * @param inVertices
             * @returns {Array}
             */
            getEdgesByVertices: function (inVertices) {
                //                var edges = [];
                //                nx.each(inVertices, function (vertex) {
                //                    edges = edges.concat(vertex.edges);
                //                    edges = edges.concat(vertex.reverseEdges);
                //                });
                //
                //
                //                return util.uniq(edges);
            },

            /**
             * Get edges which's source and target vertex are both in the passed vertices
             * @method getInternalEdgesByVertices
             * @param inVertices
             * @returns {Array}
             */

            getInternalEdgesByVertices: function (inVertices) {
                //                var edges = [];
                //                var verticesMap = {};
                //                var internalEdges = [];
                //                nx.each(inVertices, function (vertex) {
                //                    edges = edges.concat(vertex.edges);
                //                    edges = edges.concat(vertex.reverseEdges);
                //                    verticesMap[vertex.id()] = vertex;
                //                });
                //
                //                nx.each(edges, function (edge) {
                //                    if (verticesMap[edge.sourceID()] !== undefined && verticesMap[edge.targetID()] !== undefined) {
                //                        internalEdges.push(edge);
                //                    }
                //                });
                //
                //
                //                return internalEdges;

            },
            /**
             * Get edges which's  just one of source or target vertex in the passed vertices. All edges connected ourside of passed vertices
             * @method getInternalEdgesByVertices
             * @param inVertices
             * @returns {Array}
             */
            getExternalEdgesByVertices: function (inVertices) {
                //                var edges = [];
                //                var verticesMap = {};
                //                var externalEdges = [];
                //                nx.each(inVertices, function (vertex) {
                //                    edges = edges.concat(vertex.edges);
                //                    edges = edges.concat(vertex.reverseEdges);
                //                    verticesMap[vertex.id()] = vertex;
                //                });
                //
                //                nx.each(edges, function (edge) {
                //                    if (verticesMap[edge.sourceID()] === undefined || verticesMap[edge.targetID()] === undefined) {
                //                        externalEdges.push(edge);
                //                    }
                //                });
                //
                //
                //                return externalEdges;

            },
            _linksCollectionProcessor: function (sender, args) {
                var items = args.items;
                var action = args.action;
                if (action == 'add') {
                    nx.each(items, function (data) {
                        var edge = this._addEdge(data);
                        //update edgeSet
                        var edgeSet = edge.parentEdgeSet();
                        if (!edgeSet.generated()) {
                            this.generateEdgeSet(edgeSet);
                        }
                        else {
                            this.updateEdgeSet(edgeSet);
                        }
                    }, this);
                }
                else if (action == 'remove') {
                    var ids = [];
                    // get all edges should be delete
                    this.edges().each(function (item, id) {
                        var edge = item.value();
                        if (items.indexOf(edge.getData()) != -1) {
                            ids.push(edge.id());
                        }
                    }, this);
                    nx.each(ids, function (id) {
                        this._deleteEdge(id);
                    }, this);

                }
                else if (action == 'clear') {
                    this.edges().clear();
                }
            }
        }
    });


})(nx, nx.global);

(function (nx, global) {

    nx.define('nx.data.ObservableGraph.EdgeSets', nx.data.ObservableObject, {
        events: ['addEdgeSet', 'updateEdgeSet', 'removeEdgeSet', 'deleteEdgeSet', 'updateEdgeSetCoordinate'],
        properties: {
            edgeSets: {
                value: function () {
                    var edgeSets = new nx.data.ObservableDictionary();
                    edgeSets.on('change', function (sender, args) {
                        var action = args.action;
                        var items = args.items;
                        if (action == 'clear') {
                            nx.each(items, function (item) {
                                this.deleteEdgeSet(item.key());
                            }, this);
                        }
                    }, this);
                    return edgeSets;
                }
            }
        },
        methods: {
            _addEdgeSet: function (data) {
                var edgeSet = new nx.data.EdgeSet();
                var id = edgeSet.__id__;
                var linkKey = data.sourceID + '_' + data.targetID;
                var reverseLinkKey = data.targetID + '_' + data.sourceID;


                edgeSet.sets(data);
                edgeSet.sets({
                    graph: this,
                    linkKey: linkKey,
                    reverseLinkKey: reverseLinkKey,
                    id: id
                });

                edgeSet.source().addEdgeSet(edgeSet, linkKey);
                edgeSet.target().addEdgeSet(edgeSet, linkKey);

                edgeSet.attachEvent();

                this.edgeSets().setItem(linkKey, edgeSet);
                return edgeSet;
            },
            generateEdgeSet: function (edgeSet) {
                if (!edgeSet.generated() && edgeSet.source().generated() && edgeSet.target().generated()) {
                    edgeSet.generated(true);
                    edgeSet.on('updateCoordinate', this._updateEdgeSetCoordinate, this);
                    /**
                     * @event addEdgeSet
                     * @param sender {Object}  Trigger instance
                     * @param {nx.data.EdgeSet} edgeSet EdgeSet object
                     */
                    this.fire('addEdgeSet', edgeSet);
                }
            },
            updateEdgeSet: function (edgeSet) {
                if (edgeSet.generated() && edgeSet.source().generated() && edgeSet.target().generated()) {
                    edgeSet.updated(false);
                    /**
                     * @event updateEdgeSet
                     * @param sender {Object}  Trigger instance
                     * @param {nx.data.EdgeSet} edgeSet EdgeSet object
                     */
                    this.fire('updateEdgeSet', edgeSet);
                }
            },
            removeEdgeSet: function (linkKey) {

                var edgeSet = this.edgeSets().getItem(linkKey);
                if (!edgeSet) {
                    return false;
                }

                edgeSet.off('updateCoordinate', this._updateEdgeSetCoordinate, this);

                nx.each(edgeSet.edges(), function (edge, id) {
                    this.removeEdge(id, false);
                }, this);
                edgeSet.generated(false);
                edgeSet._activated = true;
                /**
                 * @event removeEdgeSet
                 * @param sender {Object}  Trigger instance
                 * @param {nx.data.EdgeSet} edgeSet EdgeSet object
                 */
                this.fire('removeEdgeSet', edgeSet);
            },
            deleteEdgeSet: function (linkKey) {
                var edgeSet = this.edgeSets().getItem(linkKey);
                if (!edgeSet) {
                    return false;
                }

                edgeSet.off('updateCoordinate', this._updateEdgeSetCoordinate, this);

                nx.each(edgeSet.edges(), function (edge, id) {
                    this.deleteEdge(id, false);
                }, this);

                edgeSet.source().removeEdgeSet(linkKey);
                edgeSet.target().removeEdgeSet(linkKey);

                /**
                 * @event removeEdgeSet
                 * @param sender {Object}  Trigger instance
                 * @param {nx.data.EdgeSet} edgeSet EdgeSet object
                 */
                this.fire('deleteEdgeSet', edgeSet);

                this.edgeSets().removeItem(linkKey);

                edgeSet.dispose();
            },
            _updateEdgeSetCoordinate: function (sender, args) {
                this.fire('updateEdgeSetCoordinate', sender);
            },
            /**
             * Get edgeSet by source vertex id and target vertex id
             * @method getEdgeSetBySourceAndTarget
             * @param source {nx.data.Vertex|Number|String} could be vertex object or id
             * @param target {nx.data.Vertex|Number|String} could be vertex object or id
             * @returns {nx.data.EdgeSet}
             */
            getEdgeSetBySourceAndTarget: function (source, target) {
                var edgeSets = this.edgeSets();

                var sourceID = nx.is(source, nx.data.Vertex) ? source.id() : source;
                var targetID = nx.is(target, nx.data.Vertex) ? target.id() : target;

                var linkKey = sourceID + '_' + targetID;
                var reverseLinkKey = targetID + '_' + sourceID;

                return edgeSets.getItem(linkKey) || edgeSets.getItem(reverseLinkKey);
            },
            eachEdgeSet: function (callback, context) {
                this.edgeSets().each(function (item, id) {
                    callback.call(context || this, item.value(), id);
                });
            }
        }
    });


})(nx, nx.global);
(function (nx, global) {

    nx.define('nx.data.ObservableGraph.EdgeSetCollections', nx.data.ObservableObject, {
        events: ['addEdgeSetCollection', 'removeEdgeSetCollection', 'deleteEdgeSetCollection', 'updateEdgeSetCollection', 'updateEdgeSetCollectionCoordinate'],
        properties: {
            edgeSetCollections: {
                value: function () {
                    var edgeSetCollections = new nx.data.ObservableDictionary();
                    edgeSetCollections.on('change', function (sender, args) {
                        var action = args.action;
                        var items = args.items;
                        if (action == 'clear') {
                            nx.each(items, function (item) {
                                //[TODO] DEBUG
                                if(item.value()){
                                    this.deleteEdgeSetCollection(item.value().linkKey());
                                }
                            }, this);
                        }
                    }, this);
                    return edgeSetCollections;
                }
            }
        },
        methods: {
            _addEdgeSetCollection: function (data) {
                var esc = new nx.data.EdgeSetCollection();
                var id = esc.__id__;
                var linkKey = data.sourceID + '_' + data.targetID;
                var reverseLinkKey = data.targetID + '_' + data.sourceID;


                esc.sets(data);
                esc.sets({
                    graph: this,
                    linkKey: linkKey,
                    reverseLinkKey: reverseLinkKey,
                    id: id
                });

                esc.source().addEdgeSetCollection(esc, linkKey);
                esc.target().addEdgeSetCollection(esc, linkKey);

                esc.attachEvent();

                this.edgeSetCollections().setItem(linkKey, esc);
                return esc;
            },
            generateEdgeSetCollection: function (esc) {
                esc.generated(true);
                esc.on('updateCoordinate', this._updateEdgeSetCollectionCoordinate, this);
                this.fire('addEdgeSetCollection', esc);
            },
            updateEdgeSetCollection: function (esc) {
                esc.updated(true);
                this.fire('updateEdgeSetCollection', esc);
            },
            removeEdgeSetCollection: function (linkKey) {

                var esc = this.edgeSetCollections().getItem(linkKey);
                if (!esc) {
                    return false;
                }

                esc.generated(false);
                esc.off('updateCoordinate', this._updateEdgeSetCollectionCoordinate, this);

                /**
                 * @event removeEdgeSet
                 * @param sender {Object}  Trigger instance
                 * @param {nx.data.EdgeSet} edgeSet EdgeSet object
                 */
                this.fire('removeEdgeSetCollection', esc);
            },

            deleteEdgeSetCollection: function (linkKey) {

                var esc = this.edgeSetCollections().getItem(linkKey);
                if (!esc) {
                    return false;
                }
                esc.off('updateCoordinate', this._updateEdgeSetCollectionCoordinate, this);
                esc.source().removeEdgeSetCollection(linkKey);
                esc.target().removeEdgeSetCollection(linkKey);

                /**
                 * @event removeEdgeSet
                 * @param sender {Object}  Trigger instance
                 * @param {nx.data.EdgeSet} edgeSet EdgeSet object
                 */
                this.fire('deleteEdgeSetCollection', esc);

                this.edgeSetCollections().removeItem(linkKey);

                esc.dispose();
            },
            getEdgeSetCollectionBySourceAndTarget: function (source, target) {
                var edgeSetCollections = this.edgeSetCollections();

                var sourceID = nx.is(source, nx.data.Vertex) ? source.id() : source;
                var targetID = nx.is(target, nx.data.Vertex) ? target.id() : target;

                var linkKey = sourceID + '_' + targetID;
                var reverseLinkKey = targetID + '_' + sourceID;

                return edgeSetCollections.getItem(linkKey) || edgeSetCollections.getItem(reverseLinkKey);
            },
            _updateEdgeSetCollectionCoordinate: function (sender, args) {
                this.fire('updateEdgeSetCollectionCoordinate', sender);
            },
            eachEdgeCollections: function (callback, context) {
                this.edgeSetCollections().each(function (item, id) {
                    callback.call(context || this, item.value(), id);
                });
            },
            _generateConnection: function (edgeSet) {

                if (!edgeSet.source().visible() || !edgeSet.target().visible()) {
                    return;
                }

                var obj = this._getGeneratedRootVertexSetOfEdgeSet(edgeSet);

                if (!obj.source || !obj.target) {
                    return;
                }

                if (obj.source == obj.target) {
                    return;
                }

                if (!obj.source.visible() || !obj.target.visible()) {
                    return;
                }


                if (obj.source.id() == edgeSet.sourceID() && obj.target.id() == edgeSet.targetID()) {
                    this.generateEdgeSet(edgeSet);
                } else {
                    var esc = this.getEdgeSetCollectionBySourceAndTarget(obj.source.id(), obj.target.id());
                    if (!esc) {
                        esc = this._addEdgeSetCollection({
                            source: obj.source,
                            target: obj.target,
                            sourceID: obj.source.id(),
                            targetID: obj.target.id()
                        });
                        this.generateEdgeSetCollection(esc);
                    }
                    esc.addEdgeSet(edgeSet);
                    this.updateEdgeSetCollection(esc);
                }
            },
            _getGeneratedRootVertexSetOfEdgeSet: function (edgeSet) {
                var source = edgeSet.source();
                if (!source.generated()) {
                    source = source.generatedRootVertexSet();
                }
                var target = edgeSet.target();
                if (!target.generated()) {
                    target = target.generatedRootVertexSet();
                }
                return {
                    source: source,
                    target: target
                };
            }
        }
    });


})(nx, nx.global);
(function (nx, global, logger) {
    /**
     * Force layout processor
     * @class nx.data.ObservableGraph.ForceProcessor
     * @module nx.data
     */
    nx.define("nx.data.ObservableGraph.NeXtForceProcessor", {
        methods: {
            /**
             * Process graph data
             * @param data {JSON} standard graph data
             * @param [key]
             * @param [model]
             * @returns {JSON} {JSON} standard graph data
             */
            process: function (data, key, model) {
                var forceStartDate = new Date();

                var _data = {nodes: data.nodes, links: []};
                var nodeIndexMap = {};
                nx.each(data.nodes, function (node, index) {
                    nodeIndexMap[node[key]] = index;
                });

                _data.links = [];
                nx.each(data.links, function (link) {
                    if (!nx.is(link.source, 'Object') && nodeIndexMap[link.source] !== undefined && !nx.is(link.target, 'Object') && nodeIndexMap[link.target] !== undefined) {
                        _data.links.push({
                            source: nodeIndexMap[link.source],
                            target: nodeIndexMap[link.target]
                        });
                    }
                });

                // force
                var force = new nx.data.NextForce();
                force.setData(data);
                console.log(_data.nodes.length);
                if (_data.nodes.length < 50) {
                    while (true) {
                        force.tick();
                        if (force.maxEnergy < _data.nodes.length * 0.1) {
                            break;
                        }
                    }
                } else {
                    var step = 0;
                    while (++step < 900) {
                        force.tick();
                    }
                }

                console.log(force.maxEnergy);

                return data;
            }
        }
    });

})(nx, nx.global, nx.logger);
(function (nx, global, logger) {
    /**
     * Force layout processor
     * @class nx.data.ObservableGraph.ForceProcessor
     * @module nx.data
     */
    nx.define("nx.data.ObservableGraph.ForceProcessor", {
        methods: {
            /**
             * Process graph data
             * @param data {JSON} standard graph data
             * @param [key]
             * @param [model]
             * @returns {JSON} {JSON} standard graph data
             */
            process: function (data, key, model) {
                var forceStartDate = new Date();
                var _data;

                _data = {nodes: data.nodes, links: []};
                var nodeIndexMap = {};
                nx.each(data.nodes, function (node, index) {
                    nodeIndexMap[node[key]] = index;
                });


                // if source and target is not number, force will search node
                nx.each(data.links, function (link) {
                    if (!nx.is(link.source, 'Object') && nodeIndexMap[link.source] !== undefined && !nx.is(link.target, 'Object') && nodeIndexMap[link.target] !== undefined) {
                        if (key == 'ixd') {
                            _data.links.push({
                                source: link.source,
                                target: link.target
                            });
                        } else {
                            _data.links.push({
                                source: nodeIndexMap[link.source],
                                target: nodeIndexMap[link.target]
                            });
                        }

                    }
                });
                var force = new nx.data.Force();
                force.nodes(_data.nodes);
                force.links(_data.links);
                force.start();
                while (force.alpha()) {
                    force.tick();
                }
                force.stop();

                return data;
            }
        }
    });

})(nx, nx.global, nx.logger);
(function (nx, global) {
    nx.define("nx.data.ObservableGraph.QuickProcessor", {
        methods: {
            process: function (data, key, model) {
                nx.each(data.nodes, function (node) {
                    node.x = Math.floor(Math.random() * model.width());
                    node.y = Math.floor(Math.random() * model.height());
//                    node.x = Math.floor(Math.random() * 100);
//                    node.y = Math.floor(Math.random() * 100);
                });
                return data;
            }
        }
    });

})(nx, nx.global);
(function (nx, global) {
    nx.define("nx.data.ObservableGraph.CircleProcessor", {
        methods: {
            process: function (data) {

            }
        }
    });

})(nx, nx.global);
(function (nx, global) {

    var DataProcessor = nx.define("nx.data.ObservableGraph.DataProcessor", {
        statics: {
            dataProcessor: {
                'nextforce': new nx.data.ObservableGraph.NeXtForceProcessor(),
                'force': new nx.data.ObservableGraph.ForceProcessor(),
                'quick': new nx.data.ObservableGraph.QuickProcessor(),
                'circle': new nx.data.ObservableGraph.CircleProcessor()
            },
            /**
             * Register graph data processor,
             * @static
             * @method registerDataProcessor
             * @param {String} name data processor name
             * @param {Object} cls processor instance, instance should have a process method
             */
            registerDataProcessor: function (name, cls) {
                GRAPH.dataProcessor[name] = cls;
            }
        },
        properties: {
            /**
             * Set pre data processor,it could be 'force'/'quick'
             * @property dataProcessor
             * @default undefined
             */
            dataProcessor: {},
            width: {
                value: 100
            },
            height: {
                value: 100
            }
        },
        methods: {
            processData: function (data) {
                var identityKey = this._identityKey;
                var dataProcessor = this._dataProcessor;

                //TODO data validation

                if (dataProcessor) {
                    var processor = DataProcessor.dataProcessor[dataProcessor];
                    if (processor) {
                        return processor.process(data, identityKey, this);
                    } else {
                        return data;
                    }
                } else {
                    return data;
                }
            }
        }
    });

})(nx, nx.global);
(function(nx, global) {

    /**
     * ObservableGraph class
     * @extend nx.data.ObservableObject
     * @class nx.data.ObservableGraph
     * @module nx.data
     */
    nx.define('nx.data.ObservableGraph', nx.data.ObservableObject, {
        mixins: [
            nx.data.ObservableGraph.DataProcessor,
            nx.data.ObservableGraph.Vertices,
            nx.data.ObservableGraph.VertexSets,
            nx.data.ObservableGraph.Edges,
            nx.data.ObservableGraph.EdgeSets,
            nx.data.ObservableGraph.EdgeSetCollections
        ],
        event: ['setData', 'insertData', 'clear', 'startGenerate', 'endGenerate'],
        properties: {
            /**
             * Use this attribute of original data as vertex's id and link's mapping key
             * default is index, if not set use array's index as id
             * @property identityKey {String}
             * @default 'index'
             */
            identityKey: {
                value: 'index'
            },
            filter: {},
            groupBy: {}
        },
        methods: {
            init: function(args) {
                this.inherited(args);
                this.nodeSet([]);
                this.nodes([]);
                this.links([]);

                this.sets(args);

                if (args && args.data) {
                    this.setData(args.data);
                }

            },
            /**
             * Set data, data should follow Common Topology Data Definition
             * @method setData
             * @param {Object} inData
             */
            setData: function(inData) {

                var data = this.processData(this.getJSON(inData));
                //
                this.clear();

                //generate
                this._generate(inData);
                /**
                 * Trigger when set data to ObservableGraph
                 * @event setData
                 * @param sender {Object}  event trigger
                 * @param {Object} data data, which been processed by data processor
                 */
                this.fire('setData', inData);
            },
            subordinates: function(vertex, callback) {
                // argument type overload
                if (typeof vertex === "function") {
                    callback = vertex;
                    vertex = null;
                }
                // check the vertex children
                var result;
                if (vertex) {
                    result = nx.util.values(vertex.vertices()).concat(nx.util.values(vertex.vertexSet()));
                } else {
                    result = [];
                    nx.each(this.vertices(), function(pair) {
                        var vertex = pair.value();
                        if (!vertex.parentVertexSet()) {
                            result.push(vertex);
                        }
                    }.bind(this));
                    nx.each(this.vertexSets(), function(pair) {
                        var vertex = pair.value();
                        if (!vertex.parentVertexSet()) {
                            result.push(vertex);
                        }
                    }.bind(this));
                }
                // callback if given
                if (callback) {
                    nx.each(result, callback);
                }
                return result;
            },
            /**
             * Insert data, data should follow Common Topology Data Definition
             * @method insertData
             * @param {Object} inData
             */
            insertData: function(inData) {

                //                var data = this.processData(inData);
                var data = inData;
                nx.each(inData.nodes, function(node) {
                    this.addVertex(node);
                }, this);

                nx.each(inData.links, function(link) {
                    this.addEdge(link);
                }, this);

                nx.each(inData.nodeSet, function(nodeSet) {
                    this.addVertexSet(nodeSet);
                }, this);

                /**
                 * Trigger when insert data to ObservableGraph
                 * @event insertData
                 * @param sender {Object}  event trigger
                 * @param {Object} data data, which been processed by data processor
                 */

                this.fire('insertData', data);

            },
            _generate: function(data) {
                //
                this.nodes(data.nodes);
                this.links(data.links);
                this.nodeSet(data.nodeSet);

                var filter = this.filter();
                if (filter) {
                    filter.call(this, this);
                }

                /**
                 * Fired when start generate topology elements
                 * @event startGenerate
                 * @param sender{Object} trigger instance
                 * @param event {Object} original event object
                 */
                this.fire('startGenerate');


                //                console.time('vertex');
                this.eachVertex(this.generateVertex, this);
                //                console.timeEnd('vertex');

                this.eachVertexSet(this.generateVertexSet, this);

                //                console.time('edgeSet');
                this.eachEdgeSet(this.generateEdgeSet, this);
                //                console.timeEnd('edgeSet');


                this.eachVertexSet(function(vertexSet) {
                    vertexSet.activated(true, {
                        force: true
                    });
                    this.updateVertexSet(vertexSet);
                }, this);


                /**
                 * Fired when finish generate topology elements
                 * @event endGenerate
                 * @param sender{Object} trigger instance
                 * @param event {Object} original event object
                 */
                this.fire('endGenerate');

            },


            /**
             * Get original data
             * @method getData
             * @returns {Object}
             */

            getData: function() {
                return {
                    nodes: this.nodes(),
                    links: this.links(),
                    nodeSet: this.nodeSet()
                };
            },

            /**
             * Get original json object
             * @method getJSON
             * @param [inData]
             * @returns {{nodes: Array, links: Array,nodeSet:Array}}
             */
            getJSON: function(inData) {
                var data = inData || this.getData();
                var obj = {
                    nodes: [],
                    links: []
                };


                if (nx.is(data.nodes, nx.data.ObservableCollection)) {
                    nx.each(data.nodes, function(n) {
                        if (nx.is(n, nx.data.ObservableObject)) {
                            obj.nodes.push(n.gets());
                        } else {
                            obj.nodes.push(n);
                        }
                    });
                } else {
                    obj.nodes = data.nodes;
                }


                if (nx.is(data.links, nx.data.ObservableCollection)) {
                    nx.each(data.links, function(n) {
                        if (nx.is(n, nx.data.ObservableObject)) {
                            obj.links.push(n.gets());
                        } else {
                            obj.links.push(n);
                        }
                    });
                } else {
                    obj.links = data.links;
                }

                if (data.nodeSet) {
                    if (nx.is(data.nodeSet, nx.data.ObservableCollection)) {
                        obj.nodeSet = [];
                        nx.each(data.nodeSet, function(n) {
                            if (nx.is(n, nx.data.ObservableObject)) {
                                obj.nodeSet.push(n.gets());
                            } else {
                                obj.nodeSet.push(n);
                            }
                        });
                    } else {
                        obj.nodeSet = data.nodeSet;
                    }
                }

                return obj;

            },
            /**
             * Get visible vertices data bound
             * @method getBound
             * @returns {{x: number, y: number, width: number, height: number, maxX: number, maxY: number}}
             */

            getBound: function(invertices) {

                var min_x, max_x, min_y, max_y;

                var vertices = invertices || nx.util.values(this.visibleVertices()).concat(nx.util.values(this.visibleVertexSets()));
                var firstItem = vertices[0];
                var x, y;

                if (firstItem) {
                    x = firstItem.get ? firstItem.get('x') : firstItem.x;
                    y = firstItem.get ? firstItem.get('y') : firstItem.y;
                    min_x = max_x = x || 0;
                    min_y = max_y = y || 0;
                } else {
                    min_x = max_x = 0;
                    min_y = max_y = 0;
                }


                nx.each(vertices, function(vertex, index) {
                    x = vertex.get ? vertex.get('x') : vertex.x;
                    y = vertex.get ? vertex.get('y') : vertex.y;
                    min_x = Math.min(min_x, x || 0);
                    max_x = Math.max(max_x, x || 0);
                    min_y = Math.min(min_y, y || 0);
                    max_y = Math.max(max_y, y || 0);
                });

                return {
                    x: min_x,
                    y: min_y,
                    left: min_x,
                    top: min_y,
                    width: max_x - min_x,
                    height: max_y - min_y,
                    maxX: max_x,
                    maxY: max_y
                };
            },

            getHierarchicalStructure: function() {
                var json = this.getJSON();
                var tree = {};
                var hierarchical = [];
                var identityKey = this.identityKey();

                nx.each(json.nodes, function(node, index) {
                    var id = nx.path(node, identityKey);
                    var obj = {
                        id: id,
                        data: node,
                        children: []
                    };
                    hierarchical.push(obj);
                    tree[id] = obj;
                });

                var nodeSetData = {};
                nx.each(json.nodeSet, function(ns, index) {
                    var id = nx.path(ns, identityKey);
                    nodeSetData[id] = ns;
                });

                nx.each(json.nodeSet, function(ns, index) {
                    var id = nx.path(ns, identityKey);
                    var obj = {
                        id: id,
                        data: ns,
                        children: []
                    };
                    ns.nodes.forEach(function(nodeID) {
                        if (tree[nodeID]) {
                            if (~(index = hierarchical.indexOf(tree[nodeID]))) {
                                hierarchical.splice(index, 1);
                            }
                            obj.children.push(tree[nodeID]);
                        } else {
                            obj.children.push({
                                id: nodeID,
                                data: nodeSetData[nodeID],
                                children: []
                            });
                        }
                    });

                    hierarchical.push(obj);
                    tree[id] = obj;
                });
                return hierarchical;
            },

            /**
             * Clear graph data
             * @method clear
             */
            clear: function() {

                this.nodeSet([]);
                this.links([]);
                this.nodes([]);

                this.fire('clear');
            },
            dispose: function() {
                this.clear();
                this.inherited();
            }

        }
    });

})(nx, nx.global);
(function (nx, global) {

    nx.define("nx.data.UniqObservableCollection", nx.data.ObservableCollection, {
        methods: {
            add: function (item) {
                if (item == null || this.contains(item)) {
                    return false;
                }
                return this.inherited(item);
            },
            addRange: function (iter) {
                if (nx.is(iter, Array)) {
                    var items = nx.util.uniq(iter.slice());
                    var i = 0;
                    while (i < items.length) {
                        var item = items[i];
                        if (item == null || this.contains(item)) {
                            items.splice(i, 1);
                        }
                        i++;
                    }
                    return this.inherited(items);
                } else {
                    return this.inherited(iter);
                }


            },
            insert: function (item, index) {
                if (item == null || this.contains(item)) {
                    return false;
                }
                return this.inherited(item, index);
            },
            insertRange: function (iter, index) {
                if (nx.is(iter, Array)) {
                    var items = iter.slice();
                    var i = 0;
                    while (i < items.length) {
                        var item = items[i];
                        if (item == null || this.contains(item)) {
                            items.splice(i, 1);
                        }
                        i++;
                    }
                    return this.inherited(items);
                } else {
                    return this.inherited(iter);
                }
            }
        }
    });


})(nx, nx.global);
(function (nx, global) {

    /**
     * Topology's base config
     * @class nx.graphic.Topology.Config
     * @module nx.graphic.Topology
     */
    nx.define("nx.graphic.Topology.Config", {
        events: [],
        properties: {
            /**
             * Topology status, it could be  initializing/appended/ready
             * @property status {String}
             */
            status: {
                value: 'initializing',
                binding: {
                    direction: "<>"
                }
            },
            /**
             * topology's theme, it could be blue/green/dark/slate/yellow
             * @property theme {String}
             */
            theme: {
                get: function () {
                    return this._theme || 'blue';
                },
                set: function (value) {
                    this._theme = value;
                    this.notify('themeClass');
                }
            },
            themeClass: {
                get: function () {
                    return 'n-topology-' + this.theme();
                }
            },
            /**
             * Set the navigation visibility
             * @property showNavigation {Boolean}
             */
            showNavigation: {
                value: true
            },
            showThumbnail: {
                value: false
            },
            /**
             * Get the setting panel component instance for extend user setting
             * @property viewSettingPanel {nx.ui.Component}
             * @readonly
             */
            viewSettingPanel: {
                get: function () {
                    return this.view("nav").view("customize");
                }
            },
            viewSettingPopover: {
                get: function () {
                    return this.view("nav").view("settingPopover");
                }
            }
        },
        methods: {
        }
    });

})(nx, nx.global);
(function (nx, global) {

    /**
     * Topology graph model class
     * @class nx.graphic.Topology.Graph
     * @module nx.graphic.Topology
     */
    nx.define("nx.graphic.Topology.Graph", {
        events: ['beforeSetData', 'afterSetData', 'insertData', 'topologyGenerated'],
        properties: {
            /**
             * Identity the node and link mapping key, default is index
             * @property identityKey {String}
             */
            identityKey: {
                get: function () {
                    return this._identityKey || 'index';
                },
                set: function (value) {
                    this._identityKey = value;
                    this.graph().set('identityKey', value);
                }
            },
            /**
             * set/get the topology' data, data should follow Common Topology Data Definition
             * @property data {JSON}
             */
            data: {
                get: function () {
                    return this.graph().getData();
                },
                set: function (value) {
                    if (value == null || !nx.is(value, Object) || value.nodes == null) {
                        return;
                    }

                    var fn = function (data) {

                        /**
                         * Fired before start process data
                         * @event beforeSetData
                         * @param sender {Object} Trigger instance
                         * @param data {JSON}  event object
                         */
                        this.fire("beforeSetData", data);
                        this.clear();
                        this.graph().sets({
                            width: this.width(),
                            height: this.height()
                        });
                        // set Data;
                        this.graph().setData(data);
                        //
                        /**
                         * Fired after process data
                         * @event afterSetData
                         * @param sender{Object} trigger instance
                         * @param event {Object} original event object
                         */
                        this.fire("afterSetData", data);
                    };


                    if (this.status() === 'appended' || this.status() == 'generated') {
                        fn.call(this, value);
                    } else {
                        this.on('ready', function () {
                            fn.call(this, value);
                        }, this);
                    }
                }
            },
            /**
             * Set the use force layout, recommand use dataProcessor:'force'
             * @property autoLayout {Boolean}
             */
            autoLayout: {
                get: function () {
                    return this._autoLayout || false;
                },
                set: function (value) {
                    this._autoLayout = value;
                    if (value) {
                        this.graph().dataProcessor("force");
                    } else {
                        this.graph().dataProcessor("");
                    }
                }
            },
            vertexPositionGetter: {
                get: function () {
                    return this._vertexPositionGetter;
                },
                set: function (value) {
                    this._vertexPositionGetter = value;
                    this.graph().set('vertexPositionGetter', value);
                }
            },
            vertexPositionSetter: {
                get: function () {
                    return this._vertexPositionSetter;
                },
                set: function (value) {
                    this._vertexPositionSetter = value;
                    this.graph().set('vertexPositionSetter', value);
                }
            },
            /**
             * Pre data processor, it could be 'force'/'quick'. It could also support register a new processor
             * @property dataProcessor {String}
             */
            dataProcessor: {
                get: function () {
                    return this._dataProcessor;
                },
                set: function (value) {
                    this._dataProcessor = value;
                    this.graph().set('dataProcessor', value);
                }
            },
            /**
             * Topology graph object
             * @property graph {nx.data.ObservableGraph}
             * @readonly
             */
            graph: {
                value: function () {
                    return new nx.data.ObservableGraph();
                }
            }
        },
        methods: {
            initGraph: function () {
                var graph = this.graph();
                graph.sets({
                    vertexPositionGetter: this.vertexPositionGetter(),
                    vertexPositionSetter: this.vertexPositionSetter(),
                    identityKey: this.identityKey(),
                    dataProcessor: this.dataProcessor()
                });

                if (this.autoLayout()) {
                    graph.dataProcessor("force");
                }


                var nodesLayer = this.getLayer("nodes");
                var linksLayer = this.getLayer("links");
                var nodeSetLayer = this.getLayer("nodeSet");
                var linkSetLayer = this.getLayer("linkSet");

                /**
                 * Vertex
                 */
                graph.on("addVertex", function (sender, vertex) {
                    nodesLayer.addNode(vertex);
                }, this);

                graph.on("removeVertex", function (sender, vertex) {
                    nodesLayer.removeNode(vertex.id());
                }, this);


                graph.on("deleteVertex", function (sender, vertex) {
                    nodesLayer.removeNode(vertex.id());
                }, this);

                graph.on("updateVertex", function (sender, vertex) {
                    nodesLayer.updateNode(vertex.id());
                }, this);

                graph.on("updateVertexCoordinate", function (sender, vertex) {

                }, this);


                /**
                 * Edge
                 */
                graph.on("addEdge", function (sender, edge) {
                    var link = linksLayer.addLink(edge);
                    // add parent linkset
//                    if (edge.parentEdgeSet()) {
//                        var linkSet = this.getLinkSetByLinkKey(edge.linkKey());
//                        link.set('parentLinkSet', linkSet);
//                    }
                }, this);

                graph.on("removeEdge", function (sender, edge) {
                    linksLayer.removeLink(edge.id());
                }, this);
                graph.on("deleteEdge", function (sender, edge) {
                    linksLayer.removeLink(edge.id());
                }, this);
                graph.on("updateEdge", function (sender, edge) {
                    linksLayer.updateLink(edge.id());
                }, this);
                graph.on("updateEdgeCoordinate", function (sender, edge) {
                    linksLayer.updateLink(edge.id());
                }, this);


                /**
                 * EdgeSet
                 */
                graph.on("addEdgeSet", function (sender, edgeSet) {
                    if (this.supportMultipleLink()) {
                        linkSetLayer.addLinkSet(edgeSet);
                    } else {
                        edgeSet.activated(false);
                    }
                }, this);

                graph.on("removeEdgeSet", function (sender, edgeSet) {
                    linkSetLayer.removeLinkSet(edgeSet.linkKey());
                }, this);

                graph.on("deleteEdgeSet", function (sender, edgeSet) {
                    linkSetLayer.removeLinkSet(edgeSet.linkKey());
                }, this);

                graph.on("updateEdgeSet", function (sender, edgeSet) {
                    linkSetLayer.updateLinkSet(edgeSet.linkKey());
                }, this);
                graph.on("updateEdgeSetCoordinate", function (sender, edgeSet) {
                    if (this.supportMultipleLink()) {
                        linkSetLayer.updateLinkSet(edgeSet.linkKey());
                    }
                }, this);


                /**
                 * VertexSet
                 */
                graph.on("addVertexSet", function (sender, vertexSet) {
                    nodeSetLayer.addNodeSet(vertexSet);
                }, this);

                graph.on("removeVertexSet", function (sender, vertexSet) {
                    nodeSetLayer.removeNodeSet(vertexSet.id());
                }, this);
                graph.on("deleteVertexSet", function (sender, vertexSet) {
                    nodeSetLayer.removeNodeSet(vertexSet.id());
                }, this);

                graph.on("updateVertexSet", function (sender, vertexSet) {
                    nodeSetLayer.updateNodeSet(vertexSet.id());
                }, this);

                graph.on("updateVertexSetCoordinate", function (sender, vertexSet) {

                }, this);

                /**
                 * EdgeSetCollection
                 */
                graph.on("addEdgeSetCollection", function (sender, esc) {
                    linkSetLayer.addLinkSet(esc);
                }, this);

                graph.on("removeEdgeSetCollection", function (sender, esc) {
                    linkSetLayer.removeLinkSet(esc.linkKey());
                }, this);
                graph.on("deleteEdgeSetCollection", function (sender, esc) {
                    linkSetLayer.removeLinkSet(esc.linkKey());
                }, this);
                graph.on("updateEdgeSetCollection", function (sender, esc) {
                    linkSetLayer.updateLinkSet(esc.linkKey());
                }, this);
                graph.on("updateEdgeSetCollectionCoordinate", function (sender, esc) {
                    linkSetLayer.updateLinkSet(esc.linkKey());
                }, this);


                /**
                 * Data
                 */
                graph.on("setData", function (sender, data) {

                }, this);


                graph.on("insertData", function (sender, data) {
                    //this.showLoading();
                }, this);


                graph.on("clear", function (sender, event) {

                }, this);


                graph.on("startGenerate", function (sender, event) {
                    this.showLoading();
                    this.stage().hide();
                }, this);
                graph.on("endGenerate", function (sender, event) {
                    this._endGenerate();
                }, this);


            },
            /**
             * Set data to topology, recommend use topo.data(data)
             * @method setData
             * @param data {JSON} should be {nodes:[],links:[]}
             * @param [callback]
             * @param [context]
             */
            setData: function (data, callback, context) {
                if (callback) {
                    this.on('topologyGenerated', function fn() {
                        callback.call(context || this, this);
                        this.off('topologyGenerated', fn, this);
                    }, this);
                }
                if (data == null || !nx.is(data, Object) || data.nodes == null) {
                    return;
                }
                this.data(data);
            },
            /**
             * Insert data to topology
             * @method insertData
             * @param data {JSON}  should be {nodes:[],links:[]}
             */
            insertData: function (data) {
                if (data == null || !nx.is(data, Object)) {
                    return;
                }
                this.graph().insertData(data);
                /**
                 * Fired after insert data
                 * @event insertData
                 * @param sender{Object} trigger instance
                 * @param event {Object} original event object
                 */
                this.fire("insertData", data);
            },


            /**
             * Get topology data, recommend use topo.data()
             * @method getData
             * @returns {JSON}
             */
            getData: function () {
                return this.data();
            },


            _saveData: function () {
                var data = this.graph().getData();

                if (Object.prototype.toString.call(window.localStorage) === "[object Storage]") {
                    localStorage.setItem("topologyData", JSON.stringify(data));
                }

            },
            _loadLastData: function () {
                if (Object.prototype.toString.call(window.localStorage) === "[object Storage]") {
                    var data = JSON.parse(localStorage.getItem("topologyData"));
                    this.setData(data);
                }
            },
            start: function () {
            },
            _endGenerate: function () {

                this.stage().resetFitMatrix();

                /**
                 * Fired when all topology elements generated
                 * @event topologyGenerated
                 * @param sender{Object} trigger instance
                 * @param event {Object} original event object
                 */
                var layoutType = this.layoutType();
                if (layoutType) {
                    this.activateLayout(layoutType, null, function () {
                        this.__fit();
                        this.status('generated');
                        this.fire('topologyGenerated');
                    });
                } else {
                    this.__fit();
                    this.status('generated');
                    this.fire('topologyGenerated');
                }
            },
            __fit: function () {
                this.stage().show();
                if (this.autoFit()) {
                    this.stage().fit(null, null, false);
                    this.stage().resetFitMatrix();
                    this.stage().fit(null, null, false);
                    this.stage().resetFitMatrix();
                    this.stage().fit(null, null, false);
                }
                this.hideLoading();
            }
        }
    });


})(nx, nx.global);
(function (nx, global) {
    function extractDelta(e) {
        if (e.wheelDelta) {
            return e.wheelDelta;
        }

        if (e.detail) {
            return e.detail * -40;
        }


    }

    /**
     * Topology base events
     * @class nx.graphic.Topology.Event
     * @module nx.graphic.Topology
     */
    nx.define('nx.graphic.Topology.Event', {
        events: ['clickStage', 'pressStage', 'dragStageStart', 'dragStage', 'dragStageEnd', 'stageTransitionEnd', 'zoomstart', 'zooming', 'zoomend', 'resetzooming', 'fitStage', 'up', 'down', 'left', 'right', 'esc', 'space', 'enter', 'pressA', 'pressS', 'pressF', 'pressM', 'pressR'],
        properties: {
            /**
             * Enabling gradual scaling feature when zooming, set to false will improve the performance
             * @property enableGradualScaling {Boolean}
             */
            enableGradualScaling: {
                value: true
            }
        },
        methods: {
            _mousewheel: function (sender, event) {
                if (this.scalable()) {
                    var step = 8000;
                    var data = extractDelta(event);
                    var stage = this.stage();
                    var scale = data / step;

                    if (this._zoomWheelDelta == null) {
                        this._zoomWheelDelta = 0;
                        this.fire('zoomstart');
                    }

                    this._zoomWheelDelta += data / step;

                    if (this._enableGradualScaling) {
                        if (Math.abs(this._zoomWheelDelta) < 0.3) {
                            stage.disableUpdateStageScale(true);
                        } else {
                            this._zoomWheelDelta = 0;
                            stage.disableUpdateStageScale(false);
                        }
                    } else {
                        stage.disableUpdateStageScale(true);
                    }


                    stage.applyStageScale(1 + scale, [event.offsetX === undefined ? event.layerX : event.offsetX, event.offsetY === undefined ? event.layerY : event.offsetY]);

                    if (this._zooomEventTimer) {
                        clearTimeout(this._zooomEventTimer);
                    }

                    this._zooomEventTimer = setTimeout(function () {
                        stage.resetStageMatrix();
                        delete this._zoomWheelDelta;

                        /**
                         * Fired when end zooming
                         * @event zoomend
                         * @param sender{Object} trigger instance
                         * @param event {Object} original event object
                         */
                        this.fire('zoomend');

                    }.bind(this), 200);

                    /**
                     * Fired when zooming stage
                     * @event zooming
                     * @param sender{Object} trigger instance
                     * @param scale {Number} stage current scale
                     */
                    this.fire('zooming');
                }
                event.preventDefault();
                return false;
            },


            _contextmenu: function (sender, event) {
                event.preventDefault();
            },
            _clickStage: function (sender, event) {
                /**
                 * Fired when click the stage
                 * @event clickStage
                 * @param sender {Object}  Trigger instance
                 * @param event {Object} original event object
                 */
                this.fire('clickStage', event);
            },
            _pressStage: function (sender, event) {
                /**
                 * Fired when mouse press stage, this is a capture event
                 * @event pressStage
                 * @param sender {Object}  Trigger instance
                 * @param event {Object} original event object
                 */
                this.fire('pressStage', event);
            },
            _dragStageStart: function (sender, event) {
                /**
                 * Fired when start drag stage
                 * @event dragStageStart
                 * @param sender {Object}  Trigger instance
                 * @param event {Object} original event object
                 */
                this.fire('dragStageStart', event);
            },
            _dragStage: function (sender, event) {
                /**
                 * Fired when dragging stage
                 * @event dragStage
                 * @param sender {Object}  Trigger instance
                 * @param event {Object} original event object
                 */
                this.fire('dragStage', event);
            },
            _dragStageEnd: function (sender, event) {
                /**
                 * Fired when drag end stage
                 * @event dragStageEnd
                 * @param sender {Object}  Trigger instance
                 * @param event {Object} original event object
                 */
                this.fire('dragStageEnd', event);
            },
            _stageTransitionEnd: function (sender, event) {
                window.event = event;
                this.fire('stageTransitionEnd', event);
            },
            _key: function (sender, event) {
                var code = event.keyCode;
                switch (code) {
                case 38:
                    /**
                     * Fired when press up arrow key
                     * @event up
                     * @param sender {Object}  Trigger instance
                     * @param event {Object} original event object
                     */
                    this.fire('up', event);
                    event.preventDefault();
                    break;
                case 40:
                    /**
                     * Fired when press down arrow key
                     * @event down
                     * @param sender {Object}  Trigger instance
                     * @param event {Object} original event object
                     */
                    this.fire('down', event);
                    event.preventDefault();
                    break;
                case 37:
                    /**
                     * Fired when press left arrow key
                     * @event left
                     * @param sender {Object}  Trigger instance
                     * @param event {Object} original event object
                     */
                    this.fire('left', event);
                    event.preventDefault();
                    break;
                case 39:
                    /**
                     * Fired when press right arrow key
                     * @event right
                     * @param sender {Object}  Trigger instance
                     * @param event {Object} original event object
                     */
                    this.fire('right', event);
                    event.preventDefault();
                    break;
                case 13:
                    /**
                     * Fired when press enter key
                     * @event enter
                     * @param sender {Object}  Trigger instance
                     * @param event {Object} original event object
                     */
                    this.fire('enter', event);
                    event.preventDefault();
                    break;
                case 27:
                    /**
                     * Fired when press esc key
                     * @event esc
                     * @param sender {Object}  Trigger instance
                     * @param event {Object} original event object
                     */
                    this.fire('esc', event);
                    event.preventDefault();
                    break;
                case 65:
                    /**
                     * Fired when press a key
                     * @event pressA
                     * @param sender {Object}  Trigger instance
                     * @param event {Object} original event object
                     */
                    this.fire('pressA', event);
                    break;
                case 70:
                    /**
                     * Fired when press f key
                     * @event pressF
                     * @param sender {Object}  Trigger instance
                     * @param event {Object} original event object
                     */
                    this.fire('pressF', event);
                    break;
                case 77:
                    /**
                     * Fired when press m key
                     * @event pressM
                     * @param sender {Object}  Trigger instance
                     * @param event {Object} original event object
                     */
                    this.fire('pressM', event);
                    break;
                case 82:
                    /**
                     * Fired when press r key
                     * @event pressR
                     * @param sender {Object}  Trigger instance
                     * @param event {Object} original event object
                     */
                    this.fire('pressR', event);
                    break;
                case 83:
                    /**
                     * Fired when press s key
                     * @event pressS
                     * @param sender {Object}  Trigger instance
                     * @param event {Object} original event object
                     */
                    this.fire('pressS', event);
                    break;

                case 32:
                    /**
                     * Fired when press space key
                     * @event space
                     * @param sender {Object}  Trigger instance
                     * @param event {Object} original event object
                     */
                    this.fire('space', event);
                    event.preventDefault();
                    break;
                }


                return false;
            },
            blockEvent: function (value) {
                if (value) {
                    nx.dom.Document.body().addClass('n-userselect n-blockEvent');
                } else {
                    nx.dom.Document.body().removeClass('n-userselect');
                    nx.dom.Document.body().removeClass('n-blockEvent');
                }
            }

        }
    });

})(nx, nx.global);

(function(nx, global) {

    var util = nx.util;


    /**
     * Node mixin class
     * @class nx.graphic.Topology.NodeMixin
     * @module nx.graphic.Topology
     */
    nx.define("nx.graphic.Topology.NodeMixin", {
        events: ['addNode', 'deleteNode', 'addNodeSet', 'deleteNodeSet', 'expandAll'],
        properties: {
            /**
             * Node instance class name, support function
             * @property nodeInstanceClass
             */
            nodeInstanceClass: {
                value: 'nx.graphic.Topology.Node'
            },
            /**
             * NodeSet instance class name, support function
             * @property nodeSetInstanceClass
             */
            nodeSetInstanceClass: {
                value: 'nx.graphic.Topology.NodeSet'
            },
            /**
             * Set node's draggable
             * @property nodeDraggable
             */
            nodeDraggable: {
                value: true
            },
            /**
             * Enable smart label
             * @property enableSmartLabel
             */
            enableSmartLabel: {
                value: true
            },
            /**
             * Show or hide node's icon
             * @property showIcon
             */
            showIcon: {
                get: function() {
                    return this._showIcon !== undefined ? this._showIcon : false;
                },
                set: function(value) {
                    if (this._showIcon !== value) {
                        this._showIcon = value;
                        if (this.status() !== "initializing") {
                            this.eachNode(function(node) {
                                node.showIcon(value);
                            });
                        }
                        return true;
                    } else {
                        return false;
                    }
                }
            },
            /**
             * All node's config. key is node's property, support super binding
             * value could be a single string eg: color:'#f00'
             * value could be a an expression eg: label :'{model.id}'
             * value could be a function eg iconType : function (model,instance){ return  'router'}
             * value could be a normal binding expression eg : label :'{#label}'
             * @property {nodeConfig}
             */
            nodeConfig: {},
            /**
             * All nodeSet's config. key is node's property, support super binding
             * value could be a single string eg: color:'#f00'
             * value could be a an expression eg: label :'{model.id}'
             * value could be a function eg iconType : function (model,instance){ return  'router'}
             * value could be a normal binding expression eg : label :'{#label}'
             * @property {nodeSetConfig}
             */
            nodeSetConfig: {},
            /**
             * All selected nodes, could direct add/remove nodes to this collection
             * @property selectedNodes {nx.data.ObservableCollection}
             */
            selectedNodes: {
                value: function() {
                    return new nx.data.UniqObservableCollection();
                }
            },
            activeNodes: {
                set: function(value) {
                    var nodesLayer = this.getLayer("nodes");
                    var nodeSetLayer = this.getLayer("nodeSet");
                    var watcher = this._activeNodesWatcher;
                    if (!watcher) {
                        watcher = this._activeNodesWatcher = new nx.graphic.Topology.NodeWatcher();
                        watcher.topology(this);
                        watcher.updater(function() {
                            var nodes = watcher.getNodes();
                            nx.each(nodes, function(node) {
                                if (node.model().type() == 'vertex') {
                                    nodesLayer.activeElements().add(node);
                                } else {
                                    nodeSetLayer.activeElements().add(node);
                                }
                            }, this);
                        }.bind(this));


                    }
                    nodesLayer.activeElements().clear();
                    nodeSetLayer.activeElements().clear();
                    watcher.nodes(value);
                    this._activeNodes = value;
                }
            },
            highlightedNodes: {
                set: function(value) {
                    var nodesLayer = this.getLayer("nodes");
                    var nodeSetLayer = this.getLayer("nodeSet");
                    var watcher = this._highlightedNodesWatcher;
                    if (!watcher) {
                        watcher = this._highlightedNodesWatcher = new nx.graphic.Topology.NodeWatcher();
                        watcher.topology(this);
                        watcher.updater(function() {
                            nx.each(watcher.getNodes(), function(node) {
                                if (node.model().type() == 'vertex') {
                                    nodesLayer.highlightedElements().add(node);
                                } else {
                                    nodeSetLayer.highlightedElements().add(node);
                                }
                            }, this);
                        }.bind(this));
                    }

                    nodesLayer.highlightedElements().clear();
                    nodeSetLayer.highlightedElements().clear();
                    watcher.nodes(value);
                    this._highlightedNodes = value;
                }
            },
            enableNodeSetAnimation: {
                value: true
            },
            aggregationRule: {}
        },
        methods: {
            initNode: function() {
                var selectedNodes = this.selectedNodes();
                selectedNodes.on('change', function(sender, args) {
                    if (args.action == 'add') {
                        nx.each(args.items, function(node) {
                            node.selected(true);
                            node.on('remove', this._removeSelectedNode = function() {
                                selectedNodes.remove(node);
                            }, this);
                        }, this);
                    } else if (args.action == 'remove') {
                        nx.each(args.items, function(node) {
                            node.selected(false);
                            node.off('remove', this._removeSelectedNode, this);
                        }, this);
                    } else if (args.action == "clear") {
                        nx.each(args.items, function(node) {
                            node.selected(false);
                            node.off('remove', this._removeSelectedNode, this);
                        }, this);
                    }
                });
            },
            /**
             * Add a node to topology
             * @method addNode
             * @param obj
             * @param inOption
             * @returns {*}
             */
            addNode: function(obj, inOption) {
                var vertex = this.graph().addVertex(obj, inOption);
                if (vertex) {
                    var node = this.getNode(vertex.id());
                    this.fire("addNode", node);
                    return node;
                } else {
                    return null;
                }

            },

            /**
             * Remove a node
             * @method removeNode
             * @param arg
             * @returns {boolean}
             */
            removeNode: function(arg, callback, context) {
                this.deleteNode(arg);
            },
            deleteNode: function(arg, callback, context) {
                var id = arg;
                if (nx.is(arg, nx.graphic.Topology.AbstractNode)) {
                    id = arg.id();
                }
                var vertex = this.graph().getVertex(id);
                if (vertex) {
                    var node = this.getNode(id);
                    this.fire("deleteNode", node);
                    this.graph().deleteVertex(id);
                    if (callback) {
                        callback.call(context || this);
                    }
                }
            },
            _getAggregationTargets: function(vertices) {
                var graph = this.graph();
                var mark, marks, markmap = {},
                    NONE = nx.util.uuid();
                var i, v, vp, vpid, changed, vs = vertices.slice();
                // iterate unless the aggregation successful
                do {
                    changed = false;
                    for (i = vs.length - 1; i >= 0; i--) {
                        v = vs[i];
                        // get the parent vertex and its ID
                        vp = v.parentVertexSet();
                        vpid = (vp ? vp.id() : NONE);
                        // check if same parent vertex marked
                        if (!markmap.hasOwnProperty(vpid)) {
                            // create mark for the parent vertex
                            markmap[vpid] = {
                                vertex: vp || graph,
                                finding: graph.subordinates(vp),
                                found: []
                            };
                        }
                        // get parent mark
                        mark = markmap[vpid];
                        // check if child vertex marked already
                        if (mark === false || mark.found.indexOf(v) >= 0) {
                            // duplicated vertex appears, unable to aggregate
                            throw "wrong input";
                        }
                        // mark child vertex to its parent vertex
                        mark.found.push(v);
                        // remove child vertex from the pool
                        vs.splice(i, 1);
                        // set the vertex array changed
                        changed = true;
                        // check if the parent vertex is fully matched
                        if (mark.finding.length === mark.found.length && mark.vertex !== graph) {
                            // add parent vertex from the pool
                            vs.push(mark.vertex);
                            // mark the parent vertex as fully matched
                            markmap[vpid] = false;
                        }
                    }
                } while (changed);
                // clear fully matched marks from mark map
                for (mark in markmap) {
                    if (!markmap[mark]) {
                        delete markmap[mark];
                    }
                }
                // get remain marks of parent vertices
                marks = nx.util.values(markmap);
                // check if the number of parent not fully matched
                if (marks.length !== 1) {
                    // it should be at most & least one
                    throw nx.graphic.Topology.i18n.cantAggregateNodesInDifferentNodeSet;
                }
                // get the only parent's mark
                mark = marks[0];
                return mark.found;
            },
            aggregationNodes: function(inNodes, inConfig) {
                // transform nodes or node ids into vertices
                var nodes = [],
                    vertices = [];
                nx.each(inNodes, function(node) {
                    if (!nx.is(node, nx.graphic.Topology.AbstractNode)) {
                        node = this.getNode(node);
                    }
                    if (!nx.is(node, nx.graphic.Topology.AbstractNode)) {
                        throw "wrong input";
                    }
                    nodes.push(node);
                    vertices.push(node.model());
                }.bind(this));
                // get aggregate target vertices and ids
                var aggregateVertices, aggregateIds;
                // FIXME catch or not
                aggregateVertices = this._getAggregationTargets(vertices);
                if (aggregateVertices.length < 2) {
                    throw "wrong input. unable to aggregate.";
                }
                aggregateIds = [];
                nx.each(aggregateVertices, function(vertex) {
                    aggregateIds.push(vertex.id());
                });
                // check the user rule
                var aggregationRule = this.aggregationRule();
                if (aggregationRule && nx.is(aggregationRule, 'Function')) {
                    var result = aggregationRule.call(this, nodes, inConfig);
                    if (result === false) {
                        return;
                    }
                }
                // make up data, config and parent
                var data, parent, pn = null,
                    config = {};
                data = {
                    nodes: aggregateIds,
                    x: (inConfig && typeof inConfig.x === "number" ? inConfig.x : aggregateVertices[0].x()),
                    y: (inConfig && typeof inConfig.y === "number" ? inConfig.y : aggregateVertices[0].y()),
                    label: (inConfig && inConfig.label || [nodes[0].label(), nodes[nodes.length - 1].label()].sort().join("-"))
                };
                parent = aggregateVertices[0].parentVertexSet();
                if (parent) {
                    config.parentVertexSetID = parent.id();
                    pn = this.getNode(parent.id());
                }
                var nodeSet = this.addNodeSet(data, config, pn);
                this.stage().resetFitMatrix();
                return nodeSet;
            },
            /**
             * Add a nodeSet
             * @method addNodeSet
             * @param obj
             * @param [inOption]
             * @param [parentNodeSet]
             * @returns {*}
             */
            addNodeSet: function(obj, inOption, parentNodeSet) {
                var vertex = this.graph().addVertexSet(obj, inOption);
                if (vertex) {
                    var nodeSet = this.getNode(vertex.id());
                    if (parentNodeSet) {
                        nodeSet.parentNodeSet(parentNodeSet);
                    }
                    this.fire("addNodeSet", nodeSet);
                    return nodeSet;
                } else {
                    return null;
                }

            },
            removeNodeSet: function(arg, callback, context) {
                this.deleteNodeSet(arg);
            },

            deleteNodeSet: function(arg, callback, context) {
                if (!arg) {
                    return;
                }
                var id = arg;
                if (nx.is(arg, nx.graphic.Topology.AbstractNode)) {
                    id = arg.id();
                }
                var nodeSet = this.getLayer("nodeSet").getNodeSet(id);
                if (nodeSet) {
                    if (nodeSet.collapsed()) {
                        nodeSet.activated(false);
                        nodeSet.expandNodes(function() {
                            this.fire("deleteNodeSet", nodeSet);
                            this.graph().deleteVertexSet(id);
                            if (callback) {
                                callback.call(context || this);
                            }
                        }, this);
                    } else {
                        this.fire("deleteNodeSet", nodeSet);
                        this.graph().deleteVertexSet(id);
                        if (callback) {
                            callback.call(context || this);
                        }
                    }

                } else {
                    this.graph().deleteVertexSet(id);
                    if (callback) {
                        callback.call(context || this);
                    }
                }
            },


            /**
             * Traverse each node
             * @method eachNode
             * @param callback
             * @param context
             */
            eachNode: function(callback, context) {
                this.getLayer("nodes").eachNode(callback, context || this);
                this.getLayer("nodeSet").eachNodeSet(callback, context || this);
            },
            /**
             * Get node by node id
             * @method getNode
             * @param id
             * @returns {*}
             */
            getNode: function(id) {
                return this.getLayer("nodes").getNode(id) || this.getLayer("nodeSet").getNodeSet(id);
            },
            /**
             * Get all visible nodes
             * @returns {Array}
             */
            getNodes: function() {
                var nodes = this.getLayer("nodes").nodes();
                var nodeSets = this.getLayer("nodeSet").nodeSets();
                if (nodeSets && nodeSets.length !== 0) {
                    return nodes.concat(nodeSets);
                } else {
                    return nodes;
                }
            },
            /**
             * Register a customize icon
             * @param name {String}
             * @param url {URL}
             * @param width {Number}
             * @param height {Number}
             */
            registerIcon: function(name, url, width, height) {
                var XLINK = 'http://www.w3.org/1999/xlink';
                var NS = "http://www.w3.org/2000/svg";
                var icon1 = document.createElementNS(NS, "image");
                icon1.setAttributeNS(XLINK, 'href', url);
                nx.graphic.Icons.icons[name] = {
                    size: {
                        width: width,
                        height: height
                    },
                    icon: icon1.cloneNode(true),
                    name: name
                };

                var icon = icon1.cloneNode(true);
                icon.setAttribute("height", height);
                icon.setAttribute("width", width);
                icon.setAttribute("data-device-type", name);
                icon.setAttribute("id", name);
                icon.setAttribute("class", 'deviceIcon');
                this.stage().addDef(icon);
            },
            /**
             * Batch action, highlight node and related nodes and connected links.
             * @param inNode
             */
            highlightRelatedNode: function(inNode) {
                var node;
                if (inNode == null) {
                    return;
                }

                if (nx.is(inNode, nx.graphic.Topology.AbstractNode)) {
                    node = inNode;
                } else {
                    node = this.getNode(inNode);
                }
                if (!node) {
                    return;
                }


                var nodeSetLayer = this.getLayer('nodeSet');
                var nodeLayer = this.getLayer('nodes');

                //highlight node
                if (nx.is(node, 'nx.graphic.Topology.NodeSet')) {
                    nodeSetLayer.highlightedElements().add(node);
                } else {
                    nodeLayer.highlightedElements().add(node);
                }


                // highlight connected nodes and nodeSets
                node.eachConnectedNode(function(n) {
                    if (nx.is(n, 'nx.graphic.Topology.NodeSet')) {
                        nodeSetLayer.highlightedElements().add(n);
                    } else {
                        nodeLayer.highlightedElements().add(n);
                    }
                }, this);


                // highlight connected links and linkSets
                this.getLayer('linkSet').highlightLinkSets(util.values(node.linkSets()));
                this.getLayer('links').highlightLinks(util.values(node.links()));

                this.fadeOut(true);

            },
            /**
             * Batch action, highlight node and related nodes and connected links.
             * @param inNode
             */
            activeRelatedNode: function(inNode) {

                var node;
                if (!inNode) {
                    return;
                }

                if (nx.is(inNode, nx.graphic.Topology.AbstractNode)) {
                    node = inNode;
                } else {
                    node = this.getNode(inNode);
                }
                if (!node) {
                    return;
                }


                var nodeSetLayer = this.getLayer('nodeSet');
                var nodeLayer = this.getLayer('nodes');

                // active node
                if (nx.is(node, 'nx.graphic.Topology.NodeSet')) {
                    nodeSetLayer.activeElements().add(node);
                } else {
                    nodeLayer.activeElements().add(node);
                }


                // highlight connected nodes and nodeSets
                node.eachConnectedNode(function(n) {
                    if (nx.is(n, 'nx.graphic.Topology.NodeSet')) {
                        nodeSetLayer.activeElements().add(n);
                    } else {
                        nodeLayer.activeElements().add(n);
                    }
                }, this);


                // highlight connected links and linkSets
                this.getLayer('linkSet').activeLinkSets(util.values(node.linkSets()));
                this.getLayer('links').activeLinks(util.values(node.links()));

                this.fadeOut();

            },
            /**
             * Zoom topology to let the passing nodes just visible at the screen
             * @method zoomByNodes
             * @param [callback] {Function} callback function
             * @param [context] {Object} callback context
             * @param nodes {Array} nodes collection
             */
            zoomByNodes: function(nodes, callback, context, boundScale) {
                // TODO more overload about nodes
                if (!nx.is(nodes, Array)) {
                    nodes = [nodes];
                }
                // get bound of the selected nodes' models
                var stage = this.stage();
                var p0, p1, center, bound = this.getModelBoundByNodes(nodes);
                var delta, limitscale = stage.maxZoomLevel() * stage.fitMatrixObject().scale();

                if (!bound) {
                    return;
                }

                // check if the nodes are too close to zoom
                if (bound.width * limitscale < 1 && bound.height * limitscale < 1) {
                    // just centralize them instead of zoom
                    center = nx.geometry.Vector.transform(bound.center, stage.matrix());
                    delta = [stage.width() / 2 - center[0], stage.height() / 2 - center[1]];
                    stage.scalingLayer().setTransition(function() {
                        this.adjustLayout();
                        /* jshint -W030 */
                        callback && callback.call(context || this);
                        this.fire('zoomend');
                    }, this, 0.6);
                    stage.applyTranslate(delta[0], delta[1]);
                    stage.applyStageScale(stage.maxZoomLevel() / stage.zoomLevel() * boundScale);
                } else {
                    p0 = nx.geometry.Vector.transform([bound.left, bound.top], stage.matrix());
                    p1 = nx.geometry.Vector.transform([bound.right, bound.bottom], stage.matrix());
                    bound = {
                        left: p0[0],
                        top: p0[1],
                        width: Math.max(1, p1[0] - p0[0]),
                        height: Math.max(1, p1[1] - p0[1])
                    };

                    boundScale = 1 / (boundScale || 1);
                    bound.left += bound.width * (1 - boundScale) / 2;
                    bound.top += bound.height * (1 - boundScale) / 2;
                    bound.height *= boundScale;
                    bound.width *= boundScale;

                    this.zoomByBound(bound, function() {
                        this.adjustLayout();
                        /* jshint -W030 */
                        callback && callback.call(context || this);
                        this.fire('zoomend');
                    }, this);
                }
            },
            getModelBoundByNodes: function(nodes, isIncludeInvisibleNodes) {
                var xmin, xmax, ymin, ymax;
                nx.each(nodes, function(inNode) {
                    var vertex;
                    if (nx.is(inNode, nx.graphic.Topology.AbstractNode)) {
                        vertex = inNode.model();
                    } else {
                        if (isIncludeInvisibleNodes) {
                            vertex = this.graph().getVertex(inNode) || this.graph().getVertexSet(inNode);
                        } else {
                            var node = this.getNode(inNode);
                            vertex = node && node.model();
                        }
                    }
                    if (!vertex) {
                        return;
                    }


                    var x = vertex.x(),
                        y = vertex.y();
                    xmin = (xmin < x ? xmin : x);
                    ymin = (ymin < y ? ymin : y);
                    xmax = (xmax > x ? xmax : x);
                    ymax = (ymax > y ? ymax : y);
                }, this);
                if (xmin === undefined || ymin === undefined) {
                    return undefined;
                }
                return {
                    left: xmin,
                    top: ymin,
                    right: xmax,
                    bottom: ymax,
                    center: [(xmax + xmin) / 2, (ymax + ymin) / 2],
                    width: xmax - xmin,
                    height: ymax - ymin
                };
            },
            /**
             * Get the bound of passing node's
             * @param inNodes {Array}
             * @param isNotIncludeLabel {Boolean}
             * @returns {Array}
             */

            getBoundByNodes: function(inNodes, isNotIncludeLabel) {

                if (inNodes == null || inNodes.length === 0) {
                    inNodes = this.getNodes();
                }

                var bound = {
                    left: 0,
                    top: 0,
                    x: 0,
                    y: 0,
                    width: 0,
                    height: 0,
                    maxX: 0,
                    maxY: 0
                };

                var boundAry = [];


                nx.each(inNodes, function(inNode) {
                    var node;
                    if (nx.is(inNode, nx.graphic.Topology.AbstractNode)) {
                        node = inNode;
                    } else {
                        node = this.getNode(inNode);
                    }

                    if (!node) {
                        return;
                    }


                    if (node.visible()) {
                        if (isNotIncludeLabel) {
                            boundAry.push(this.getInsideBound(node.getBound(true)));
                        } else {
                            boundAry.push(this.getInsideBound(node.getBound()));
                        }
                    }
                }, this);


                var lastIndex = boundAry.length - 1;

                //
                boundAry.sort(function(a, b) {
                    return a.left - b.left;
                });

                bound.x = bound.left = boundAry[0].left;
                bound.maxX = boundAry[lastIndex].left;

                boundAry.sort(function(a, b) {
                    return (a.left + a.width) - (b.left + b.width);
                });

                bound.width = boundAry[lastIndex].left + boundAry[lastIndex].width - bound.x;


                //
                boundAry.sort(function(a, b) {
                    return a.top - b.top;
                });

                bound.y = bound.top = boundAry[0].top;
                bound.maxY = boundAry[lastIndex].top;

                boundAry.sort(function(a, b) {
                    return (a.top + a.height) - (b.top + b.height);
                });

                bound.height = boundAry[lastIndex].top + boundAry[lastIndex].height - bound.y;

                return bound;


            },
            _moveSelectionNodes: function(event, node) {
                if (this.nodeDraggable()) {
                    var nodes = this.selectedNodes().toArray();
                    var stageScale = this.stageScale();
                    if (nodes.indexOf(node) === -1) {
                        node.move(event.drag.delta[0] * stageScale, event.drag.delta[1] * stageScale);
                    } else {
                        nx.each(nodes, function(node) {
                            node.move(event.drag.delta[0] * stageScale, event.drag.delta[1] * stageScale);
                        });
                    }
                }
            },
            /**
             * Expand nodes from a source position, If nodes number more than 150, will ignore animation.
             * @method expandNodes
             * @param nodes {Array} ids of nodes to expand
             * @param sourcePosition
             * @param callback
             * @param context
             * @param isAnimate
             */
            expandNodes: function(nodes, sourcePosition, callback, context, isAnimate) {

                var nodesLength = nx.is(nodes, Array) ? nodes.length : nx.util.keys(nodes).length;
                callback = callback || function() {};


                if (nodesLength > 150 || nodesLength === 0 || isAnimate === false) {
                    callback.call(context || this, this);
                } else {
                    var positionMap = [];
                    nx.each(nodes, function(node) {
                        positionMap.push({
                            id: node.id(),
                            position: node.position(),
                            node: node
                        });
                        node.position(sourcePosition);
                    }, this);

                    if (this._nodesAnimation) {
                        this._nodesAnimation.stop();
                    }

                    var ani = this._nodesAnimation = new nx.graphic.Animation({
                        duration: 600
                    });
                    ani.callback(function(progress) {
                        nx.each(positionMap, function(item) {
                            var _position = item.position;
                            var node = item.node;
                            if (node && node.model()) {
                                node.position({
                                    x: sourcePosition.x + (_position.x - sourcePosition.x) * progress,
                                    y: sourcePosition.y + (_position.y - sourcePosition.y) * progress
                                });
                            }
                        });
                    }.bind(this));

                    ani.complete(function() {
                        callback.call(context || this, this);
                    }.bind(this));
                    ani.start();
                }
            },
            /**
             * To collapse nodes to a target position. If nodes number more than 150, will ignore animation.
             * @method collapseNodes
             * @param nodes nodes {Array} nodes to collape
             * @param targetPosition
             * @param callback
             * @param context
             * @param isAnimate
             */
            collapseNodes: function(nodes, targetPosition, callback, context, isAnimate) {
                var nodesLength = nx.is(nodes, Array) ? nodes.length : nx.util.keys(nodes).length;
                callback = callback || function() {};


                if (nodesLength > 150 || nodesLength === 0 || isAnimate === false) {
                    callback.call(context || this, this);
                } else {
                    var positionMap = [];
                    nx.each(nodes, function(node) {
                        positionMap.push({
                            id: node.id(),
                            position: node.position(),
                            node: node,
                            vertex: node.model(),
                            vertexPosition: node.model().position()
                        });
                    }, this);

                    if (this._nodesAnimation) {
                        this._nodesAnimation.stop();
                    }


                    var ani = this._nodesAnimation = new nx.graphic.Animation({
                        duration: 600
                    });
                    ani.callback(function(progress) {
                        nx.each(positionMap, function(item) {
                            var _position = item.position;
                            var node = item.node;
                            if (node && node.model()) {
                                node.position({
                                    x: _position.x - (_position.x - targetPosition.x) * progress,
                                    y: _position.y - (_position.y - targetPosition.y) * progress
                                });
                            }
                        });
                    }.bind(this));

                    ani.complete(function() {
                        nx.each(positionMap, function(item) {
                            item.vertex.position(item.vertexPosition);
                        });
                        callback.call(context || this, this);
                    }.bind(this));
                    ani.start();
                }
            },
            /**
             * Expand all nodeSets
             * @method expandAll
             */
            expandAll: function() {
                var nodeSetLayer = this.getLayer('nodeSet');
                //console.time('expandAll');
                var fn = function(callback) {
                    var isFinished = true;
                    nodeSetLayer.eachNodeSet(function(nodeSet) {
                        if (nodeSet.visible()) {
                            nodeSet.animation(false);
                            nodeSet.collapsed(false);
                            isFinished = false;
                        }
                    });
                    if (!isFinished) {
                        fn(callback);
                    } else {
                        callback();
                    }
                };

                this.showLoading();

                setTimeout(function() {
                    fn(function() {

                        nodeSetLayer.eachNodeSet(function(nodeSet) {
                            nodeSet.animation(true);
                        });
                        this.stage().resetFitMatrix();
                        this.hideLoading();
                        this.fit(function() {
                            this.blockEvent(false);
                            this.fire('expandAll');
                        }, this);
                    }.bind(this));
                }.bind(this), 100);
            },
            /**
             * Collpase all nodeSets
             * @method collapseAll
             */
            collapseAll: function() {
                var graph = this.graph();
                var rootVertexSets = {};
                graph.eachVertexSet(function(vertexSet, id) {
                    if (!vertexSet.rootVertexSet()) {
                        rootVertexSets[id] = vertexSet;
                    }
                });

                this.showLoading();



                nx.each(rootVertexSets, function(vertex, id) {
                    var nodeSet = this.getNode(id);
                    if (nodeSet) {
                        nodeSet.animation(false);
                        nodeSet.collapsed(true);
                    }
                }, this);


                var nodeSetLayer = this.getLayer('nodeSet');
                setTimeout(function() {
                    nodeSetLayer.eachNodeSet(function(nodeSet) {
                        nodeSet.animation(true);
                    });
                    this.stage().resetFitMatrix();
                    this.hideLoading();
                    this.fit(function() {
                        this.blockEvent(false);
                        this.fire('collapseAll');
                    }, this);
                }.bind(this), 100);
            }
        }
    });


})(nx, nx.global);
(function(nx, global) {

    /**
     * Links mixin class
     * @class nx.graphic.Topology.LinkMixin
     * @module nx.graphic.Topology
     */
    nx.define("nx.graphic.Topology.LinkMixin", {
        events: ['addLink', 'deleteLink'],
        properties: {
            /**
             * Link instance class name, support function
             * @property nodeInstanceClass
             */
            linkInstanceClass: {
                value: 'nx.graphic.Topology.Link'
            },
            /**
             * LinkSet instance class name, support function
             * @property linkSetInstanceClass
             */
            linkSetInstanceClass: {
                value: 'nx.graphic.Topology.LinkSet'
            },
            /**
             * Is topology support Multiple link , is false will highly improve performance
             * @property supportMultipleLink {Boolean}
             */
            supportMultipleLink: {
                value: true
            },
            /**
             * All link's config. key is link's property, support super binding
             * value could be a single string eg: color:'#f00'
             * value could be a an expression eg: label :'{model.id}'
             * value could be a function eg iconType : function (model,instance){ return  'router'}
             * value could be a normal binding expression eg : label :'{#label}'
             * @property {linkConfig}
             */
            linkConfig: {},
            /**
             * All linkSet's config. key is link's property, support super binding
             * value could be a single string eg: color:'#f00'
             * value could be a an expression eg: label :'{model.id}'
             * value could be a function eg iconType : function (model,instance){ return  'router'}
             * value could be a normal binding expression eg : label :'{#label}'
             * @property {linkSetConfig}
             */
            linkSetConfig: {}
        },
        methods: {

            /**
             * Add a link to topology
             * @method addLink
             * @param obj {JSON}
             * @param inOption {Config}
             * @returns {nx.graphic.Topology.Link}
             */
            addLink: function(obj, inOption) {
                if (!obj || obj.source == null || obj.target == null) {
                    return undefined;
                }
                var edge = this.graph().addEdge(obj, inOption);
                var edgeSet = this.graph().getEdgeSetBySourceAndTarget(obj.source, obj.target);
                if (edgeSet) {
                    this.graph()._generateConnection(edgeSet);
                }
                if (edge) {
                    var link = this.getLink(edge.id());
                    this.fire("addLink", link);
                    return link;
                } else {
                    return null;

                }

            },
            /**
             * Remove a link
             * @method removeLink
             * @param arg  {String}
             * @returns {boolean}
             */
            removeLink: function(arg) {
                this.deleteLink(arg);
            },

            deleteLink: function(arg) {
                var id = arg;
                if (nx.is(arg, nx.graphic.Topology.AbstractLink)) {
                    id = arg.id();
                }
                this.fire("deleteLink", this.getLink(id));
                this.graph().deleteEdge(id);
            },


            /**
             * Traverse each link
             * @method eachLink
             * @param callback <Function>
             * @param context {Object}
             */
            eachLink: function(callback, context) {
                this.getLayer("links").eachLink(callback, context || this);
            },

            /**
             * Get link by link id
             * @method getLink
             * @param id
             * @returns {*}
             */
            getLink: function(id) {
                return this.getLayer("links").getLink(id);
            },
            /**
             * get linkSet by node
             * @param sourceVertexID {String} source node's id
             * @param targetVertexID {String} target node's id
             * @returns  {nx.graphic.Topology.LinkSet}
             */
            getLinkSet: function(sourceVertexID, targetVertexID) {
                return this.getLayer("linkSet").getLinkSet(sourceVertexID, targetVertexID);
            },
            /**
             * Get linkSet by linkKey
             * @param linkKey {String} linkKey
             * @returns {nx.graphic.Topology.LinkSet}
             */
            getLinkSetByLinkKey: function(linkKey) {
                return this.getLayer("linkSet").getLinkSetByLinkKey(linkKey);
            },
            /**
             * Get links by node
             * @param sourceVertexID {String} source node's id
             * @param targetVertexID {String} target node's id
             * @returns {Array} links collection
             */
            getLinksByNode: function(sourceVertexID, targetVertexID) {
                var linkSet = this.getLinkSet(sourceVertexID, targetVertexID);
                if (linkSet) {
                    return linkSet.links();
                }
            }
        }
    });


})(nx, nx.global);
(function (nx, global) {
    nx.define("nx.graphic.Topology.LayerMixin", {
        events: [],
        properties: {
            /**
             * @property layersMap
             */
            layersMap: {
                value: function () {
                    return {};
                }
            },
            /**
             * @property layers
             */
            layers: {
                value: function () {
                    return [];
                }
            },

            /**
             * Get fade status.
             * @property fade
             * @readOnly
             */
            fade: {
                dependencies: "forceFade",
                value: function (forceFade) {
                    // TODO relates highlight and active setting
                    return (forceFade === true || forceFade === false) ? forceFade : this._fade;
                }
            },
            /**
             * Set active priority over highlight.
             * @property fadeActivePriority
             */
            fadeActivePriority: {
                value: false,
                set: function (v) {
                    if (v) {
                        this.dom().addClass("fade-active-priority");
                    } else {
                        this.dom().addClass("fade-active-priority");
                    }
                    this._fadeActivePriority = !! v;
                }
            },
            fadeUpdater_internal_: {
                dependencies: "fade",
                update: function (fade) {
                    if (fade) {
                        this.dom().addClass("fade-all");
                    } else {
                        this.dom().removeClass("fade-all");
                    }
                }
            },
            /**
             * Force layer fade.
             * @property forceFade
             */
            forceFade: {},
            layerResource_internal_: {
                value: function () {
                    return {};
                }
            }
        },
        methods: {
            initLayer: function () {
                this.layersMap({});
                this.layers([]);
                this.attachLayer("links", "nx.graphic.Topology.LinksLayer");
                this.attachLayer("linkSet", "nx.graphic.Topology.LinkSetLayer");
                this.attachLayer("groups", "nx.graphic.Topology.GroupsLayer");
                this.attachLayer("nodes", "nx.graphic.Topology.NodesLayer");
                this.attachLayer("nodeSet", "nx.graphic.Topology.NodeSetLayer");
                this.attachLayer("paths", "nx.graphic.Topology.PathLayer");

            },
            /**
             * To generate a layer
             * @param name
             * @param layer
             * @returns {*}
             * @private
             */
            _generateLayer: function (name, layer) {
                var layerObj;
                if (name && layer) {
                    if (nx.is(layer, "String")) {
                        var cls = nx.path(global, layer);
                        if (cls) {
                            layerObj = new cls();
                        }
                    } else {
                        layerObj = layer;
                    }
                    layerObj.topology(this);
                    layerObj.draw();

                    nx.each(layerObj.__events__, function (eventName) {
                        nx.Object.delegateEvent(layerObj, eventName, this, eventName);
                    }, this);


                    //                    debugger;
                    //                    nx.Object.extendProperty(this, name + 'LayerConfig', {
                    //                        set: function (value) {
                    //                            nx.each(value, function (value, key) {
                    //                                nx.util.setProperty(layerObj, key, value, this);
                    //                            }, this);
                    //                        }
                    //                    });


                }
                return layerObj;
            },
            /**
             * Get a layer reference by name
             * @method getLayer
             * @param name {String} The name you pass to topology when you attacherLayer/prependLayer/insertLayerAfter
             * @returns {*} Instance of a layer
             */
            getLayer: function (name) {
                var layersMap = this.layersMap();
                return layersMap[name];
            },
            appendLayer: function (name, layer) {
                return this.attachLayer(name, layer);
            },
            /**
             * attach a layer to topology, that should be subclass of nx.graphic.Topology.Layer
             * @method attachLayer
             * @param name {String} handler to get this layer
             * @param layer <String,nx.graphic.Topology.Layer> Could be string of a layer's class name, or a reference of a layer
             */
            attachLayer: function (name, layer, index) {
                var layersMap = this.layersMap();
                var layers = this.layers();
                var layerObj = this._generateLayer(name, layer);
                var layerResourceMap, layerResource = {};
                if (layerObj) {
                    if (index >= 0) {
                        layerObj.attach(this.stage(), index);
                        layers.splice(index, 0, layerObj);
                    } else {
                        layerObj.attach(this.stage());
                        layers.push(layerObj);
                    }
                    layersMap[name] = layerObj;
                    // listen layer active elements change
                    layerResourceMap = this.layerResource_internal_();
                    layerResourceMap[name] = layerResource;
                    layerResource.activeElementsChangeListener = function (sender, edata) {
                        layerResource.activeCount = layerObj.activeElements().count();
                        // get the total active count and update class
                        var total = 0;
                        nx.each(layerResourceMap, function (res) {
                            total += res.activeCount;
                        });
                        this.dom().setClass("fade-active-occur", total > 0);
                    };
                    layerObj.activeElements().on("change", layerResource.activeElementsChangeListener, this);
                }
                return layerObj;
            },
            /**
             * Prepend a layer to topology, that should be subclass of nx.graphic.Topology.Layer
             * @method prependLayer
             * @param name {String} handler to get this layer
             * @param layer <String,nx.graphic.Topology.Layer> Could be string of a layer's class name, or a reference of a layer
             */
            prependLayer: function (name, layer) {
                return this.attachLayer(name, layer, 0);
            },
            /**
             * Insert a layer under a certain layer, that should be subclass of nx.graphic.Topology.Layer
             * @method insertLayerAfter
             * @param name  {String} handler to get this layer
             * @param layer <String,Object> Could be string of a layer's class name, or a reference of a layer
             * @param upsideLayerName {String} name of upside layer
             */
            insertLayerAfter: function (name, layer, upsideLayerName) {
                var afterLayer = this.layersMap()[upsideLayerName];
                if (afterLayer) {
                    var index = this.layers().indexOf(afterLayer);
                    if (index >= 0) {
                        return this.attachLayer(name, layer, index + 1);
                    }
                }
            },

            eachLayer: function (callback, context) {
                nx.each(this.layersMap(), callback, context);
            },
            /**
             * fade out layer
             * @method fadeOut
             * @param [force] {Boolean} force layer fade out and can't fade in
             * @param [callback] {Function} callback after fade out
             * @param [context] {Object} callback context
             */
            fadeOut: function (force, callback, context) {
                if (force) {
                    this.forceFade(true);
                } else if (!this.forceFade()) {
                    this.fade(true);
                }
            },
            /**
             * FadeIn layer's fade statues
             * @param force {Boolean} force recover all items
             * @param [callback] {Function} callback after fade out
             * @param [context] {Object} callback context
             */
            fadeIn: function (force, callback, context) {
                if (this.forceFade() === true) {
                    if (force) {
                        this.forceFade(null);
                        this.fade(false);
                    }
                } else {
                    this.fade(false);
                }
            },
            recoverActive: function () {
                nx.each(this.layers(), function (layer) {
                    if (layer.activeElements) {
                        layer.activeElements().clear();
                    }
                }, this);
                this.activeNodes([]);
                this.fadeIn();
            },
            recoverHighlight: function () {
                nx.each(this.layers(), function (layer) {
                    if (layer.highlightedElements) {
                        layer.highlightedElements().clear();
                    }
                }, this);
                //todo refactore
                this.highlightedNodes([]);
                this.fadeIn(true);
            }
        }
    });
})(nx, nx.global);

(function (nx, global) {
    /**
     * Topology stage class
     * @class nx.graphic.Topology.StageMixin
     * @module nx.graphic.Topology
     */
    nx.define('nx.graphic.Topology.StageMixin', {
        events: ['fitStage', 'ready', 'resizeStage', 'afterFitStage'],
        properties: {
            /**
             * Set/get topology's width.
             * @property width {Number}
             */
            width: {
                get: function () {
                    return this._width || 300 + this.padding() * 2;
                },
                set: function (value) {
                    return this.resize(value);
                }
            },
            /**
             * height Set/get topology's height.
             * @property height {Number}
             */
            height: {
                get: function () {
                    return this._height || 300 + this.padding() * 2;
                },
                set: function (value) {
                    this.resize(null, value);
                }
            },
            /**
             * Set/get stage's padding.
             * @property padding {Number}
             */
            padding: {
                value: 100
            },
            /**
             * Set/get topology's scalability
             * @property scalable {Boolean}
             */
            scalable: {
                value: true
            },
            stageScale: {
                value: 1
            },
            revisionScale: {
                value: 1
            },
            matrix: {
                value: function () {
                    return new nx.geometry.Matrix(nx.geometry.Matrix.I);
                }
            },
            /**
             * Set to true will adapt to topology's outside container, set to ture will ignore width/height
             * @property adaptive {Boolean}
             */
            adaptive: {
                value: false
            },
            /**
             * Get the topology's stage component
             * @property stage {nx.graphic.Component}
             */
            stage: {
                get: function () {
                    return this.view('stage');
                }
            },
            /**
             * Enabling the smart node feature, set to false will improve the performance
             * @property enableSmartNode {Boolean}
             */
            enableSmartNode: {
                value: true
            },
            autoFit: {
                value: true
            }
        },

        methods: {
            initStage: function () {
                nx.each(nx.graphic.Icons.icons, function (iconObj, key) {
                    if (iconObj.icon) {
                        var icon = iconObj.icon.cloneNode(true);
                        icon.setAttribute("height", iconObj.size.height);
                        icon.setAttribute("width", iconObj.size.width);
                        icon.setAttribute("data-device-type", key);
                        icon.setAttribute("id", key);
                        icon.setAttribute("class", 'deviceIcon');
                        this.stage().addDef(icon);
                    }
                }, this);
            },
            _adaptiveTimer: function () {
                var self = this;
                if (!this.adaptive() && (this.width() !== 0 && this.height() !== 0)) {
                    this.status('appended');
                    /**
                     * Fired when topology appended to container with with& height
                     * @event ready
                     * @param sender{Object} trigger instance
                     * @param event {Object} original event object
                     */
                    setTimeout(function () {
                        this.fire('ready');
                    }.bind(this), 0);

                } else {
                    var timer = setInterval(function () {
                        if (self.dom() && nx.dom.Document.body().contains(self.dom())) {
                            clearInterval(timer);
                            this._adaptToContainer();
                            this.status('appended');
                            this.fire('ready');
                        }
                    }.bind(this), 10);
                }
            },
            _adaptToContainer: function () {
                var bound = this.view().dom().parentNode().getBound();
                if (bound.width === 0 || bound.height === 0) {
                    if (console) {
                        console.warn("Please set height*width to topology's parent container");
                    }
                    return;
                }
                if (this._width !== bound.width || this._height !== bound.height) {
                    this.resize(bound.width, bound.height);
                }
            },
            /**
             * Make topology adapt to container,container should set width/height
             * @method adaptToContainer
             */
            adaptToContainer: function (callback) {
                if (!this.adaptive()) {
                    return;
                }
                this._adaptToContainer();
                this.fit();
            },


            /**
             * Get the passing bound's relative inside bound,if not passing param will return the topology graphic's bound
             * @param bound {JSON}
             * @returns {{left: number, top: number, width: number, height: number}}
             */
            getInsideBound: function (bound) {
                var _bound = bound || this.stage().view('stage').getBound();
                var topoBound = this.view().dom().getBound();

                return {
                    left: _bound.left - topoBound.left,
                    top: _bound.top - topoBound.top,
                    width: _bound.width,
                    height: _bound.height
                };
            },
            getAbsolutePosition: function (obj) {
                var topoMatrix = this.matrix();
                var stageScale = topoMatrix.scale();
                var topoOffset = this.view().dom().getOffset();
                return {
                    x: obj.x * stageScale + topoMatrix.x() + topoOffset.left,
                    y: obj.y * stageScale + topoMatrix.y() + topoOffset.top
                };
            },
            /**
             * Make topology graphic fit stage
             * @method fit
             */
            fit: function (callback, context, isAnimated) {
                this.stage().fit(function () {
                    this.adjustLayout();
                    /* jshint -W030 */
                    callback && callback.call(context || this);
                    this.fire('afterFitStage');
                }, this, isAnimated == null ? true : isAnimated);
                /**
                 * Fired when  after topology fit to stage
                 * @event fit
                 * @param sender{Object} trigger instance
                 * @param event {Object} original event object
                 */
                this.fire('fitStage');

            },
            /**
             * Zoom topology
             * @param value {Number}
             * @method zoom
             */
            zoom: function (value) {

            },
            /**
             * Zoom topology by a bound
             * @method zoomByBound
             * @param inBound {Object} e.g {left:Number,top:Number,width:Number,height:Number}
             * @param [callback] {Function} callback function
             * @param [context] {Object} callback context
             * @param [duration] {Number} set the transition time, unit is second
             */
            zoomByBound: function (inBound, callback, context, duration) {
                this.stage().zoomByBound(inBound, function () {
                    this.adjustLayout();
                    /* jshint -W030 */
                    callback && callback.call(context || this);
                    this.fire('zoomend');
                }, this, duration !== undefined ? duration : 0.9);
            },
            /**
             * Move topology
             * @method move
             * @param x {Number}
             * @param y {Number}
             * @param [duration] {Number} default is 0
             */
            move: function (x, y, duration) {
                var stage = this.stage();
                stage.applyTranslate(x || 0, y || 0, duration);
            },
            /**
             * Resize topology
             * @method resize
             * @param width {Number}
             * @param height {Number}
             */
            resize: function (width, height) {
                var modified = false;
                if (width != null && width != this._width) {
                    var _width = Math.max(width, 300 + this.padding() * 2);
                    if (_width != this._width) {
                        this._width = _width;
                        modified = true;
                    }
                }
                if (height != null) {
                    var _height = Math.max(height, 300 + this.padding() * 2);
                    if (_height != this._height) {
                        this._height = _height;
                    }
                }

                if (modified) {
                    this.notify('width');
                    this.notify('height');
                    this.stage().resetFitMatrix();
                    /**
                     * Fired when topology's stage changed
                     * @event resizeStage
                     * @param sender{Object} trigger instance
                     * @param event {Object} original event object
                     */
                    this.fire('resizeStage');
                }
                return modified;
            },
            /**
             * If enable enableSmartNode, this function will auto adjust the node's overlapping and set the nodes to right size
             * @method adjustLayout
             */
            adjustLayout: function () {


                if (!this.enableSmartNode()) {
                    return;
                }

                if (this._adjustLayoutTimer) {
                    clearTimeout(this._adjustLayoutTimer);
                }
                this._adjustLayoutTimer = setTimeout(function () {
                    var graph = this.graph();
                    if (graph) {
                        var startTime = new Date();
                        var topoMatrix = this.matrix();
                        var stageScale = topoMatrix.scale();
                        var positionAry = [];
                        this.eachNode(function (node) {
                            if (node.activated && !node.activated()) {
                                return;
                            }
                            var position = node.position();
                            positionAry[positionAry.length] = {
                                x: position.x * stageScale + topoMatrix.x(),
                                y: position.y * stageScale + topoMatrix.y()
                            };
                        });
                        var calc = function (positionAry) {
                            var length = positionAry.length;
                            var iconRadius = 36 * 36;
                            var dotRadius = 32 * 32;

                            var testOverlap = function (sourcePosition, targetPosition) {
                                var distance = Math.pow(Math.abs(sourcePosition.x - targetPosition.x), 2) + Math.pow(Math.abs(sourcePosition.y - targetPosition.y), 2);
                                return {
                                    iconOverlap: distance < iconRadius,
                                    dotOverlap: distance < dotRadius
                                };
                            };

                            var iconOverlapCounter = 0;
                            var dotOverlapCounter = 0;

                            for (var i = 0; i < length; i++) {
                                var sourcePosition = positionAry[i];
                                var iconIsOverlap = false;
                                var dotIsOverlap = false;
                                for (var j = 0; j < length; j++) {
                                    var targetPosition = positionAry[j];
                                    if (i !== j) {
                                        var result = testOverlap(sourcePosition, targetPosition);
                                        /* jshint -W030 */
                                        result.iconOverlap && (iconIsOverlap = true);
                                        /* jshint -W030 */
                                        result.dotOverlap && (dotIsOverlap = true);
                                    }
                                }
                                /* jshint -W030 */
                                iconIsOverlap && iconOverlapCounter++;
                                /* jshint -W030 */
                                dotIsOverlap && dotOverlapCounter++;
                            }

                            //0.2,0.4,0.6.0.8,1
                            var overlapPercent = 1;
                            if (iconOverlapCounter / length > 0.2) {
                                overlapPercent = 0.8;
                                if (dotOverlapCounter / length > 0.8) {
                                    overlapPercent = 0.2;
                                } else if (dotOverlapCounter / length > 0.5) {
                                    overlapPercent = 0.4;
                                } else if (dotOverlapCounter / length > 0.15) {
                                    overlapPercent = 0.6;
                                }
                            }
                            return overlapPercent;
                        };

                        if (window.Blob && window.Worker) {
                            var fn = "onmessage = function(e) { self.postMessage(calc(e.data)); };";
                            fn += "var calc = " + calc.toString();

                            if (!this.adjustWorker) {
                                var blob = new Blob([fn]);
                                // Obtain a blob URL reference to our worker 'file'.
                                var blobURL = window.URL.createObjectURL(blob);
                                var worker = this.adjustWorker = new Worker(blobURL);
                                worker.onmessage = function (e) {
                                    var overlapPercent = e.data;
                                    this.revisionScale(overlapPercent);
                                }.bind(this);
                            }
                            this.adjustWorker.postMessage(positionAry); // Start the worker.
                        }


                        //                        var overlapPercent = calc(positionAry);
                        //                        this.revisionScale(overlapPercent);
                        //                        nodesLayer.updateNodeRevisionScale(overlapPercent);

                    }
                }.bind(this), 200);
            }
        }
    });
})
(nx, nx.global);

(function (nx, global) {

    /**
     * Tooltip mixin class
     * @class nx.graphic.Topology.TooltipMixin
     *
     */

    nx.define("nx.graphic.Topology.TooltipMixin", {
        events: [],
        properties: {
            /**
             * Set/get the tooltip manager config
             * @property tooltipManagerConfig
             */
            tooltipManagerConfig: {
                get: function () {
                    return this._tooltipManagerConfig || {};
                },
                set: function (value) {
                    var tooltipManager = this.tooltipManager();
                    if (tooltipManager) {
                        tooltipManager.sets(value);
                    }
                    this._tooltipManagerConfig = value;
                }
            },
            /**
             * get tooltip manager
             * @property tooltipManager
             */
            tooltipManager: {
                value: function () {
                    var config = this.tooltipManagerConfig();
                    return new nx.graphic.Topology.TooltipManager(nx.extend({}, {topology: this}, config));
                }
            }
        },
        methods: {

        }
    });


})(nx, nx.global);
(function (nx, global) {
    /**
     * Scene mixin
     * @class nx.graphic.Topology.SceneMixin
     * @module nx.graphic.Topology
     *
     */
    nx.define("nx.graphic.Topology.SceneMixin", {
        events: [],
        properties: {
            /**
             * @property scenesMap
             */
            scenesMap: {
                value: function () {
                    return {};
                }
            },
            /**
             * @property scenes
             */
            scenes: {
                value: function () {
                    return [];
                }
            },
            currentScene: {},
            /**
             * Current scene name
             * @property currentSceneName
             */
            currentSceneName: {},
            sceneEnabled: {
                value: true
            }
        },
        methods: {
            initScene: function () {
                this.registerScene("default", "nx.graphic.Topology.DefaultScene");
                this.registerScene("selection", "nx.graphic.Topology.SelectionNodeScene");
                this.registerScene("zoomBySelection", "nx.graphic.Topology.ZoomBySelection");
                this.activateScene('default');
                this._registerEvents();

            },
            /**
             * Register a scene to topology
             * @method registerScene
             * @param name {String} for reference to a certain scene
             * @param inClass <String,Class> A scene class name or a scene class instance, which is subclass of nx.graphic.Topology.Scene
             */
            registerScene: function (name, inClass) {
                var cls;
                if (name && inClass) {
                    var scene;
                    var scenesMap = this.scenesMap();
                    var scenes = this.scenes();
                    if (!nx.is(inClass, 'String')) {
                        scene = inClass;
                    } else {
                        cls = nx.path(global, inClass);
                        if (cls) {
                            scene = new cls();
                        } else {
                            //nx.logger.log('wrong scene name');
                        }
                    }
                    if (scene) {
                        scene.topology(this);
                        scenesMap[name] = scene;
                        scenes.push(scene);
                    }
                }
            },
            /**
             * Activate a scene, topology only has one active scene.
             * @method activateScene
             * @param name {String} Scene name which be passed at registerScene
             */
            activateScene: function (name) {
                var scenesMap = this.scenesMap();
                var sceneName = name || 'default';
                var scene = scenesMap[sceneName] || scenesMap["default"];
                //
                this.deactivateScene();
                this.currentScene(scene);
                this.currentSceneName(sceneName);

                scene.activate();
                this.fire("switchScene", {
                    name: name,
                    scene: scene
                });
                return scene;
            },
            /**
             * Deactivate a certain scene
             * @method deactivateScene
             */
            deactivateScene: function () {
                if (this.currentScene() && this.currentScene().deactivate) {
                    this.currentScene().deactivate();
                }
                this.currentScene(null);
            },
            disableCurrentScene: function (value) {
                this.sceneEnabled(!value);
            },
            _registerEvents: function () {
                nx.each(this.__events__, this._aop = function (eventName) {
                    this.upon(eventName, function (sender, data) {
                        this.dispatchEvent(eventName, sender, data);
                    }, this);
                }, this);
            },
            dispatchEvent: function (eventName, sender, data) {
                if (this.sceneEnabled()) {
                    var currentScene = this.currentScene();
                    if (currentScene.dispatch) {
                        currentScene.dispatch(eventName, sender, data);
                    }
                    if (currentScene[eventName]) {
                        currentScene[eventName].call(currentScene, sender, data);
                    }
                }
            }
        }
    });
})(nx, nx.global);
(function(nx, global) {
    /**
     * Layout mixin class
     * @class nx.graphic.Topology.LayoutMixin
     * @module nx.graphic.Topology
     */


    var __layouts = {
        'force': 'nx.graphic.Topology.NeXtForceLayout',
        'hierarchicalLayout': 'nx.graphic.Topology.HierarchicalLayout',
        'enterpriseNetworkLayout': 'nx.graphic.Topology.EnterpriseNetworkLayout'
    };


    var CLS = nx.define("nx.graphic.Topology.LayoutMixin", {
        events: [],
        properties: {
            /**
             * Layout map
             * @property  layoutMap
             */
            layoutMap: {
                value: function() {
                    return {};
                }
            },
            /**
             * Current layout type
             * @property layoutType
             */
            layoutType: {
                value: null
            },
            /**
             * Current layout config
             * @property layoutConfig
             */
            layoutConfig: {
                value: null
            }
        },
        methods: {
            initLayout: function() {

                var layouts = nx.extend({},__layouts,nx.graphic.Topology.layouts);

                nx.each(layouts, function(cls, name) {
                    var instance;
                    if (nx.is(cls, 'Function')) {
                        instance = new cls();
                    } else {
                        var clz = nx.path(global, cls);
                        if (!clz) {
                            throw "Error on instance node class";
                        } else {
                            instance = new clz();
                        }
                    }

                    this.registerLayout(name, instance);

                }, this);
            },
            /**
             * Register a layout
             * @method registerLayout
             * @param name {String} layout name
             * @param cls {Object} layout class instance
             */
            registerLayout: function(name, cls) {
                var layoutMap = this.layoutMap();
                layoutMap[name] = cls;

                if (cls.topology) {
                    cls.topology(this);
                }
            },
            /**
             * Get layout instance by name
             * @method getLayout
             * @param name {String}
             * @returns {*}
             */
            getLayout: function(name) {
                var layoutMap = this.layoutMap();
                return layoutMap[name];
            },
            /**
             * Activate a layout
             * @param inName {String} layout name
             * @param inConfig {Object} layout config object
             * @param callback {Function} callback for after apply a layout
             */
            activateLayout: function(inName, inConfig, callback) {
                var layoutMap = this.layoutMap();
                var name = inName || this.layoutType();
                var config = inConfig || this.layoutConfig();
                if (layoutMap[name] && layoutMap[name].process) {
                    layoutMap[name].process(this.graph(), config, callback);
                    this.layoutType(name);
                }
            },
            deactivateLayout: function(name) {

            }
        }
    });


})(nx, nx.global);
(function(nx, global) {
    /**
     * Topology's batch operation class
     * @class nx.graphic.Topology.Categories
     * @module nx.graphic.Topology
     */
    nx.define("nx.graphic.Topology.Categories", {
        events: [],
        properties: {
            /**
             * 
             * @property loading
             */
            loading: {
                get: function() {
                    return this._loading || false;
                },
                set: function(value) {
                    this._loading = value;
                    if (value) {
                        nx.dom.Document.html().addClass('n-waitCursor');
                        this.view().dom().addClass('n-topology-loading');
                        this.view('loading').dom().setStyle('display', 'block');
                    } else {
                        nx.dom.Document.html().removeClass('n-waitCursor');
                        this.view().dom().removeClass('n-topology-loading');
                        this.view('loading').dom().setStyle('display', 'none');
                    }

                }
            },
        },
        methods: {
            /**
             * Show loading indicator
             * @method showLoading
             */
            showLoading: function() {
                this.loading(true);
            },
            /**
             * Hide loading indicator
             * @method hideLoading
             */
            hideLoading: function() {
                this.loading(false);
            },
            exportPNG: function() {

                this.fit();


                var serializer = new XMLSerializer();
                var stageScale = this.stageScale();
                var translateX = topo.matrix().x();
                var translateY = topo.matrix().y();
                var stage = this.stage().view().dom().$dom.querySelector('.stage').cloneNode(true);
                nx.each(stage.querySelectorAll('.fontIcon'), function(icon) {
                    icon.remove();
                });

                nx.each(stage.querySelectorAll('.link'), function(item) {
                    item.style.stroke = '#26A1C5';
                    item.style.fill = 'none';
                    item.style.background = 'transparent';
                });

                nx.each(stage.querySelectorAll('line.link-set-bg'), function(item) {
                    item.style.stroke = '#26A1C5';
                });

                nx.each(stage.querySelectorAll('text.node-label'), function(item) {
                    item.style.fontSize = '12px';
                    item.style.fontFamily = 'Tahoma';
                });

                nx.each(stage.querySelectorAll('.n-hidden'), function(hidden) {
                    hidden.remove();
                });

                nx.each(stage.querySelectorAll('.selectedBG'), function(item) {
                    item.remove();
                });

                nx.each(stage.querySelectorAll('[data-nx-type="nx.graphic.Topology.GroupsLayer"]'), function(item) {
                    item.remove();
                });


                var svg = serializer.serializeToString(stage);
                var svgString = '<svg width="' + this.width() + '" height="' + this.height() + '" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" >' + svg + "</svg>";
                var b64 = window.btoa(svgString);
                var img = this.view("img").dom().$dom;
                //var canvas = this.view("canvas").view().$dom;
                img.setAttribute('width', this.width());
                img.setAttribute('height', this.height());
                img.setAttribute('src', 'data:image/svg+xml;base64,' + b64);
                var canvas = this.view('canvas').dom().$dom;
                var ctx = canvas.getContext("2d");
                var revisionScale = this.revisionScale();
                var fontSize = 32 * revisionScale;


                ctx.fillStyle = '#fff';
                ctx.fillRect(0, 0, this.width(), this.height());


                ctx.drawImage(img, 0, 0);
                ctx.font = fontSize + "px next-font";
                this.eachNode(function(node) {
                    var iconType = node.iconType();
                    var iconObject = nx.graphic.Icons.get(iconType);
                    ctx.fillStyle = '#fff';
                    ctx.fillText(iconObject.font[1], node.x() / stageScale + translateX - 16 * revisionScale, node.y() / stageScale + translateY + 16 * revisionScale);
                    ctx.fillStyle = node.color() || '#26A1C5';
                    ctx.fillText(iconObject.font[0], node.x() / stageScale + translateX - 16 * revisionScale, node.y() / stageScale + translateY + 16 * revisionScale);
                });
                var link = document.createElement('a');
                link.setAttribute('href', canvas.toDataURL());
                link.setAttribute('download', (new Date()).getTime() + ".png");
                var event = document.createEvent('MouseEvents');
                event.initMouseEvent('click', true, true, window, 1, 0, 0, 0, 0, false, false, false, false, 0, null);
                link.dispatchEvent(event);
            },
            __drawBG: function(inBound) {
                var bound = inBound || this.stage().getContentBound();
                var bg = this.stage().view('bg');
                bg.sets({
                    x: bound.left,
                    y: bound.top,
                    width: bound.width,
                    height: bound.height,
                    visible: true
                });
                bg.set('visible', true);
            }
        }
    });


})(nx, nx.global);
(function(nx, global) {
    /**
     * Topology base class

     var topologyData = {
        nodes: [
            {"id": 0, "x": 410, "y": 100, "name": "12K-1"},
            {"id": 1, "x": 410, "y": 280, "name": "12K-2"},
            {"id": 2, "x": 660, "y": 280, "name": "Of-9k-03"},
            {"id": 3, "x": 660, "y": 100, "name": "Of-9k-02"},
            {"id": 4, "x": 180, "y": 190, "name": "Of-9k-01"}
        ],
        links: [
            {"source": 0, "target": 1},
            {"source": 1, "target": 2},
            {"source": 1, "target": 3},
            {"source": 4, "target": 1},
            {"source": 2, "target": 3},
            {"source": 2, "target": 0},
            {"source": 3, "target": 0},
            {"source": 3, "target": 0},
            {"source": 3, "target": 0},
            {"source": 0, "target": 4},
            {"source": 0, "target": 4},
            {"source": 0, "target": 3}
        ]
     };
     nx.define('MyTopology', nx.ui.Component, {
        view: {
            content: {
                type: 'nx.graphic.Topology',
                props: {
                    width: 800,
                    height: 800,
                    nodeConfig: {
                        label: 'model.id'
                    },
                    showIcon: true,
                    data: topologyData
                }
            }
        }
     });
     var app = new nx.ui.Application();
     var comp = new MyTopology();
     comp.attach(app);


     * @class nx.graphic.Topology
     * @extend nx.ui.Component
     * @module nx.graphic.Topology
     * @uses nx.graphic.Topology.Config
     * @uses nx.graphic.Topology.Projection
     * @uses nx.graphic.Topology.Graph
     * @uses nx.graphic.Topology.Event
     * @uses nx.graphic.Topology.StageMixin
     * @uses nx.graphic.Topology.NodeMixin
     * @uses nx.graphic.Topology.LinkMixin
     * @uses nx.graphic.Topology.LayerMixin
     * @uses nx.graphic.Topology.TooltipMixin
     * @uses nx.graphic.Topology.SceneMixin
     *
     */
    var extendEvent = nx.Object.extendEvent;
    var extendProperty = nx.Object.extendProperty;
    var extendMethod = nx.Object.extendMethod;
    var Topology = nx.define("nx.graphic.Topology", nx.ui.Component, {
        statics: {
            i18n: {
                'cantAggregateExtraNode': 'Can\'t aggregate extra node',
                'cantAggregateNodesInDifferentNodeSet': 'Can\'t aggregate nodes in different nodeSet'
            },
            extensions: [],
            registerExtension: function(cls) {
                var prototype = Topology.prototype;
                var classPrototype = cls.prototype;

                Topology.extensions.push(cls);

                nx.each(cls.__events__, function(name) {
                    extendEvent(prototype, name);
                });

                nx.each(cls.__properties__, function(name) {
                    extendProperty(prototype, name, classPrototype[name].__meta__);
                });

                nx.each(cls.__methods__, function(name) {
                    if (name !== 'init') {
                        extendMethod(prototype, name, classPrototype[name]);
                    }
                });
            },
            layouts: {}
        },
        mixins: [
            nx.graphic.Topology.Config,
            nx.graphic.Topology.Graph,
            nx.graphic.Topology.Event,
            nx.graphic.Topology.StageMixin,
            nx.graphic.Topology.NodeMixin,
            nx.graphic.Topology.LinkMixin,
            nx.graphic.Topology.LayerMixin,
            nx.graphic.Topology.LayoutMixin,
            nx.graphic.Topology.TooltipMixin,
            nx.graphic.Topology.SceneMixin,
            nx.graphic.Topology.Categories
        ],
        events: ['clear'],
        view: {
            props: {
                'class': ['n-topology', '{#themeClass}'],
                tabindex: '0',
                style: {
                    width: "{#width}",
                    height: "{#height}"
                }
            },
            content: [{
                    name: "stage",
                    type: "nx.graphic.Stage",
                    props: {
                        width: "{#width}",
                        height: "{#height}",
                        padding: '{#padding}',
                        matrixObject: '{#matrix,direction=<>}',
                        stageScale: '{#stageScale,direction=<>}'
                    },
                    events: {
                        ':mousedown': '{#_pressStage}',
                        ':touchstart': '{#_pressStage}',
                        'click': '{#_clickStage}',
                        'touchend': '{#_clickStage}',
                        'mousewheel': '{#_mousewheel}',
                        'DOMMouseScroll': '{#_mousewheel}',
                        'dragStageStart': '{#_dragStageStart}',
                        'dragStage': '{#_dragStage}',
                        'dragStageEnd': '{#_dragStageEnd}',
                        'stageTransitionEnd': '{#_stageTransitionEnd}'

                    }
                }, {
                    name: 'nav',
                    type: 'nx.graphic.Topology.Nav',
                    props: {
                        visible: '{#showNavigation}',
                        showIcon: '{#showIcon,direction=<>}'
                    }
                }, {
                    name: 'loading',
                    props: {
                        'class': 'n-topology-loading'
                    },
                    content: {
                        tag: 'ul',
                        props: {
                            items: new Array(10),
                            template: {
                                tag: 'li'
                            }
                        }
                    }
                },
                //                {
                //                    type: 'nx.graphic.Topology.Thumbnail',
                //                    props: {
                //                        width: "{#width}",
                //                        height: "{#height}"
                //                    }
                //                },
                {
                    name: 'img',
                    tag: 'img',
                    props: {
                        style: {
                            'display': 'none'
                        }
                    }
                }, {
                    name: 'canvas',
                    tag: 'canvas',
                    props: {
                        width: "{#width}",
                        height: "{#height}",
                        style: {
                            'display': 'none'
                        }
                    }
                }

            ],
            events: {
                'contextmenu': '{#_contextmenu}',
                'keydown': '{#_key}'
            }
        },
        properties: {},
        methods: {
            init: function(args) {
                this.inherited(args);
                this.sets(args);

                this.initStage();
                this.initLayer();
                this.initGraph();
                this.initNode();
                this.initScene();
                this.initLayout();


                nx.each(Topology.extensions, function(cls) {
                    var ctor = cls.__ctor__;
                    if (ctor) {
                        ctor.call(this);
                    }
                }, this);


            },
            attach: function(args) {
                this.inherited(args);
                this._adaptiveTimer();
            },
            /**
             * Clear all layer's content
             * @method clear
             */
            clear: function() {
                this.status('cleared');
                if (this._nodesAnimation) {
                    this._nodesAnimation.stop();
                }
                this.graph().clear();
                this.tooltipManager().closeAll();
                nx.each(this.layers(), function(layer, name) {
                    layer.clear();
                });
                this.blockEvent(false);
                this.fire('clear');
                if (this.width() && this.height()) {
                    this.status('appended');
                }
            },
            dispose: function() {
                this.status('disposed');
                this.tooltipManager().dispose();
                this.graph().dispose();

                nx.each(this.layers(), function(layer) {
                    layer.dispose();
                });
                this.blockEvent(false);
                this.inherited();
            }
        }
    });
})(nx, nx.global);
(function (nx, global) {

    /**
     * Topology basic layer class
     * @class nx.graphic.Topology.Layer
     * @extend nx.graphic.Group
     * @module nx.graphic.Topology
     */
    nx.define("nx.graphic.Topology.Layer", nx.graphic.Group, {
        view: {
            type: 'nx.graphic.Group',
            props: {
                class: "layer"
            }
        },
        properties: {
            /**
             * Get topology
             * @property topology
             */
            topology: {
                value: null
            },
            highlightedElements: {
                value: function () {
                    return new nx.data.UniqObservableCollection();
                }
            },
            activeElements: {
                value: function () {
                    return new nx.data.UniqObservableCollection();
                }
            },
            /**
             * Get fade status.
             * @property fade
             * @readOnly
             */
            fade: {
                dependencies: "forceFade",
                value: function (forceFade) {
                    return (forceFade === true || forceFade === false) ? forceFade : this._fade;
                }
            },
            fadeUpdater_internal_: {
                dependencies: "fade",
                update: function (fade) {
                    if (fade) {
                        this.dom().addClass("fade-layer");
                    } else {
                        this.dom().removeClass("fade-layer");
                    }
                }
            },
            /**
             * Force layer fade.
             * @property forceFade
             */
            forceFade: {}
        },
        methods: {
            init: function (args) {
                this.inherited(args);
                this.view().set("data-nx-type", this.__className__);

                var highlightedElements = this.highlightedElements();
                var activeElements = this.activeElements();

                highlightedElements.on('change', function (sender, args) {
                    if (args.action == 'add') {
                        nx.each(args.items, function (el) {
                            el.dom().addClass("fade-highlight-item");
                        });
                    } else if (args.action == 'remove' || args.action == "clear") {
                        nx.each(args.items, function (el) {
                            /* jslint -W030 */
                            el.dom() && el.dom().removeClass("fade-highlight-item");
                        });
                    }
                    if (highlightedElements.count() === 0 && activeElements.count() === 0) {
                        this.fadeIn();
                    } else {
                        this.fadeOut();
                    }
                }, this);


                activeElements.on('change', function (sender, args) {
                    if (args.action == 'add') {
                        nx.each(args.items, function (el) {
                            el.dom().addClass("fade-active-item");
                        });
                    } else if (args.action == 'remove' || args.action == "clear") {
                        nx.each(args.items, function (el) {
                            /* jslint -W030 */
                            el.dom() && el.dom().removeClass("fade-active-item");
                        });
                    }
                    if (highlightedElements.count() === 0 && activeElements.count() === 0) {
                        this.fadeIn();
                    } else {
                        this.fadeOut();
                    }
                }, this);

            },
            /**
             * Factory function, draw group
             */
            draw: function () {

            },
            /**
             * Show layer
             * @method show
             */
            show: function () {
                this.visible(true);
            },
            /**
             * Hide layer
             * @method hide
             */
            hide: function () {
                this.visible(false);
            },
            /**
             * fade out layer
             * @method fadeOut
             * @param [force] {Boolean} force layer fade out and can't fade in
             * @param [callback] {Function} callback after fade out
             * @param [context] {Object} callback context
             */
            fadeOut: function (force, callback, context) {
                if (force) {
                    this.forceFade(true);
                } else if (!this.forceFade()) {
                    this.fade(true);
                }
            },
            /**
             * FadeIn layer's fade statues
             * @param force {Boolean} force recover all items
             * @param [callback] {Function} callback after fade out
             * @param [context] {Object} callback context
             */
            fadeIn: function (force, callback, context) {
                if (this.forceFade() === true) {
                    if (force) {
                        this.forceFade(null);
                        this.fade(false);
                    }
                } else {
                    this.fade(false);
                }
            },
            /**
             * Fade in layer
             * @method fadeIn
             * @param force {Boolean} force recover all items
             * @param [callback] {Function} callback after fade out
             * @param [context] {Object} callback context
             */
            recover: function (force, callback, context) {
                this.fadeIn(force, callback, context);
            },
            /**
             * clear layer's content
             * @method clear
             */
            clear: function () {
                this.highlightedElements().clear();
                this.activeElements().clear();
                this.view().dom().empty();
            },
            dispose: function () {
                this.clear();
                this.highlightedElements().clear();
                this.activeElements().clear();
                this.inherited();
            }
        }
    });
})(nx, nx.global);

(function (nx, global) {

    nx.define('nx.graphic.Topology.NodeWatcher', nx.Observable, {
        properties: {
            nodes: {
                get: function () {
                    return this._nodes || [];
                },
                set: function (inNodes) {
                    var updater = this.updater();
                    var vertices = this.vertices();

                    if (vertices.length !== 0) {
                        nx.each(vertices, function (vertex) {
                            vertex.unwatch('generated', updater, this);
                        }, this);
                        vertices.length = 0;
                    }

                    if (!inNodes) {
                        return;
                    }

                    var nodes = inNodes;
                    if (!nx.is(nodes, Array) && !nx.is(nodes, nx.data.ObservableCollection)) {
                        nodes = [nodes];
                    }
                    nx.each(nodes, function (item) {
                        var vertex = this._getVertex(item);
                        if (vertex && vertices.indexOf(vertex) == -1) {
                            vertices.push(vertex);
                        }
                    }, this);


                    //todo
                    if (nx.is(nodes, nx.data.ObservableCollection)) {
                        nodes.on('change', function (sender, args) {
                            var action = args.action;
                            var items = args.items;
                            if (action == 'add') {

                            } else if (action == 'remove') {

                            } else if (action == 'clear') {

                            }
                        });
                    }

                    var observePosition = this.observePosition();
                    nx.each(vertices, function (vertex) {
                        vertex.watch('generated', updater, this);
                        if (observePosition) {
                            vertex.on('updateCoordinate', updater, this);
                        }
                    }, this);

                    updater();
                    this._nodes = nodes;
                }
            },
            updater: {
                value: function () {
                    return function () {

                    };
                }
            },
            topology: {
                set: function (topo) {
                    if (topo && topo.graph()) {
                        var graph = topo.graph();
                        graph.on("addVertexSet", this.update, this);
                        graph.on("removeVertexSet", this.update, this);
                        graph.on("deleteVertexSet", this.update, this);
                        graph.on("updateVertexSet", this.update, this);
                    }
                    this._topology = topo;
                }
            },
            vertices: {
                value: function () {
                    return [];
                }
            },
            observePosition: {
                value: false
            }
        },
        methods: {
            _getVertex: function (value) {
                var vertex;
                var topo = this.topology();
                if (topo && topo.graph()) {
                    var graph = topo.graph();
                    if (nx.is(value, nx.graphic.Topology.AbstractNode)) {
                        vertex = value.model();
                    } else if (graph.getVertex(value)) {
                        vertex = graph.getVertex(value);
                    }
                }
                return vertex;
            },
            getNodes: function (includeParent) {
                var nodes = [];
                var topo = this.topology();
                var vertices = this.vertices();
                nx.each(vertices, function (vertex) {
                    var id = vertex.id();
                    var node = topo.getNode(id);
                    if (includeParent !== false && (!node || vertex.generated() === false)) {
                        var generatedRootVertexSet = vertex.generatedRootVertexSet();
                        if (generatedRootVertexSet) {
                            node = topo.getNode(generatedRootVertexSet.id());
                        }
                    }

                    if (node && nodes.indexOf(node)) {
                        nodes.push(node);
                    }
                });

                return nodes;
            },
            update: function () {
                var updater = this.updater();
                var vertices = this.vertices();
                if (vertices.length !== 0) {
                    updater();
                }
            },
            dispose: function () {
                var topo = this.topology();
                if (topo && topo.graph()) {
                    var graph = topo.graph();
                    graph.off("addVertexSet", this.update, this);
                    graph.off("removeVertexSet", this.update, this);
                    graph.off("deleteVertexSet", this.update, this);
                    graph.off("updateVertexSet", this.update, this);
                }
                this.inherited();
            }

        }
    });
})(nx, nx.global);
(function (nx, global) {

    var Vector = nx.geometry.Vector;
    /**
     * Abstract node class
     * @class nx.graphic.Topology.AbstractNode
     * @extend nx.graphic.Group
     * @module nx.graphic.Topology
     */
    nx.define("nx.graphic.Topology.AbstractNode", nx.graphic.Group, {
        events: ['updateNodeCoordinate', 'selectNode', 'remove'],
        properties: {
            /**
             * Get  node's absolute position
             * @property  position
             */
            position: {
                get: function () {
                    return {
                        x: this._x || 0,
                        y: this._y || 0
                    };
                },
                set: function (obj) {
                    var isModified = false;
                    if (obj.x != null && obj.x !== this._x && !this._lockXAxle) {
                        this._x = obj.x;
                        this.notify("x");
                        isModified = true;
                    }

                    if (obj.y != null && obj.y !== this._y && !this._lockYAxle) {
                        this._y = obj.y;
                        this.notify("y");
                        isModified = true;
                    }

                    if (isModified) {
                        var model = this.model();
                        model.position({
                            x: this._x,
                            y: this._y
                        });

                        this.view().setTransform(this._x, this._y);
                    }
                }
            },
            absolutePosition: {
                //dependencies: ['position'],
                get: function () {
                    var position = this.position();
                    var topoMatrix = this.topology().matrix();
                    var stageScale = topoMatrix.scale();
                    return {
                        x: position.x * stageScale + topoMatrix.x(),
                        y: position.y * stageScale + topoMatrix.y()
                    };
                },
                set: function (position) {
                    if (position == null || position.x == null || position.y == null) {
                        return false;
                    }
                    var topoMatrix = this.topology().matrix();
                    var stageScale = topoMatrix.scale();

                    this.position({
                        x: (position.x - topoMatrix.x()) / stageScale,
                        y: (position.y - topoMatrix.y()) / stageScale
                    });
                }
            },
            matrix: {
                //dependencies: ['position'],
                get: function () {
                    var position = this.position();
                    var stageScale = this.stageScale();
                    return [
                        [stageScale, 0, 0],
                        [0, stageScale, 0],
                        [position.x, position.y, 1]
                    ];
                }
            },
            /**
             * Get  node's vector
             * @property  vector
             */
            vector: {
                //dependencies: ['position'],
                get: function () {
                    return new Vector(this.x(), this.y());
                }
            },
            /**
             * Get/set  node's x position, suggest use position
             * @property  x
             */
            x: {
                ////dependencies: ['position'],
                get: function () {
                    return this._x || 0;
                },
                set: function (value) {
                    return this.position({x: parseFloat(value)});
                }
            },
            /**
             * Get/set  node's y position, suggest use position
             * @property  y
             */
            y: {
                ////dependencies: ['position'],
                get: function () {
                    return this._y || 0;
                },
                set: function (value) {
                    return this.position({y: parseFloat(value)});
                }
            },
            /**
             * Lock x axle, node only can move at y axle
             * @property lockXAxle {Boolean}
             */
            lockXAxle: {
                value: false
            },
            /**
             * Lock y axle, node only can move at x axle
             * @property lockYAxle
             */
            lockYAxle: {
                value: false
            },
            /**
             * Get topology stage scale
             * @property scale
             */
            stageScale: {
                set: function (value) {
                    this.view().setTransform(null, null, value);
                }
            },
            /**
             * Get topology instance
             * @property  topology
             */
            topology: {},
            /**
             * Get node's id
             * @property id
             */
            id: {
                get: function () {
                    return this.model().id();
                }
            },
            /**
             * Node is been selected statues
             * @property selected
             */
            selected: {
                value: false
            },
            /**
             * Get/set node's usablity
             * @property enable
             */
            enable: {
                value: true
            },
            /**
             * Get node self reference
             * @property node
             */
            node: {
                get: function () {
                    return this;
                }
            },
            showIcon: {
                value: true
            },
            links: {
                get: function () {
                    var links = {};
                    this.eachLink(function (link, id) {
                        links[id] = link;
                    });
                    return links;
                }
            },
            linkSets: {
                get: function () {
                    var linkSets = {};
                    this.eachLinkSet(function (linkSet, linkKey) {
                        linkSets[linkKey] = linkSet;
                    });
                    return linkSets;
                }
            },
            connectedNodes: {
                get: function () {
                    var nodes = {};
                    this.eachConnectedNode(function (node, id) {
                        nodes[id] = node;
                    });
                    return nodes;
                }
            }
        },
        view: {
            type: 'nx.graphic.Group'
        },
        methods: {
            init: function (args) {
                this.inherited(args);
                this.watch('selected', function (prop, value) {
                    /**
                     * Fired when node been selected or cancel selected
                     * @event selectNode
                     * @param sender{Object} trigger instance
                     * @param event {Object} original event object
                     */
                    this.fire('selectNode', value);
                }, this);
            },
            /**
             * Factory function , will be call when set model
             */
            setModel: function (model) {
                this.model(model);
                model.upon('updateCoordinate', function (sender, args) {
                    this.position({
                        x: args.newPosition.x,
                        y: args.newPosition.y
                    });
                    /**
                     * Fired when node update coordinate
                     * @event updateNodeCoordinate
                     * @param sender{Object} trigger instance
                     * @param event {Object} original event object
                     */
                    this.fire('updateNodeCoordinate');
                }, this);


                this.setBinding('visible', 'model.visible,direction=<>', this);
                this.setBinding('selected', 'model.selected,direction=<>', this);

                //initialize position
                this.position(model.position());
            },
            update: function () {

            },
            /**
             * Move node certain distance
             * @method move
             * @param x {Number}
             * @param y {Number}
             */
            move: function (x, y) {
                var position = this.position();
                this.position({x: position.x + x || 0, y: position.y + y || 0});
            },
            /**
             * Move to a position
             * @method moveTo
             * @param x {Number}
             * @param y {Number}
             * @param callback {Function}
             * @param isAnimated {Boolean}
             * @param duration {Number}
             */
            moveTo: function (x, y, callback, isAnimated, duration) {
                if (isAnimated !== false) {
                    var obj = {to: {}, duration: duration || 400};
                    obj.to.x = x;
                    obj.to.y = y;

                    if (callback) {
                        obj.complete = callback;
                    }
                    this.animate(obj);
                } else {
                    this.position({x: x, y: y});
                }
            },
            /**
             * Use css translate to move node for high performance, when use this method, related link can't recive notification. Could hide links during transition.
             * @method translateTo
             * @param x {Number}
             * @param y {Number}
             * @param callback {Function}
             */
            translateTo: function (x, y, callback) {

            },
            /**
             * Iterate  all connected links to this node
             * @method eachLink
             * @param callback
             * @param context
             */
            eachLink: function (callback, context) {
                var model = this.model();
                var topo = this.topology();
                //todo

                this.eachLinkSet(function (linkSet) {
                    linkSet.eachLink(callback, context || this);
                });

            },
            eachLinkSet: function (callback, context) {
                var model = this.model();
                var topo = this.topology();
                nx.each(model.edgeSets(), function (edgeSet, linkKey) {
                    var linkSet = topo.getLinkSetByLinkKey(linkKey);
                    if (linkSet) {
                        callback.call(context || this, linkSet, linkKey);
                    }
                }, this);
                nx.each(model.edgeSetCollections(), function (edgeSetCollection, linkKey) {
                    var linkSet = topo.getLinkSetByLinkKey(linkKey);
                    if (linkSet) {
                        callback.call(context || this, linkSet, linkKey);
                    }
                }, this);
            },
            /**
             * Iterate all connected node
             * @method eachConnectedNode
             * @param callback {Function}
             * @param context {Object}
             */
            eachConnectedNode: function (callback, context) {
                var topo = this.topology();
                this.model().eachConnectedVertex(function (vertex, id) {
                    var node = topo.getNode(id);
                    if (node) {
                        callback.call(context || this, node, id);
                    }
                });
            },
            dispose: function () {
                var model = this.model();
                if (model) {
                    model.upon('updateCoordinate', null);
                }
                this.fire('remove');
                this.inherited();
            }
        }
    });


})(nx, nx.global);
(function (nx, global) {
    /**
     * Node class
     * @class nx.graphic.Topology.Node
     * @extend nx.graphic.Topology.AbstractNode
     * @module nx.graphic.Topology
     */
    nx.define('nx.graphic.Topology.Node', nx.graphic.Topology.AbstractNode, {
        events: ['pressNode', 'clickNode', 'enterNode', 'leaveNode', 'dragNodeStart', 'dragNode', 'dragNodeEnd', 'selectNode'],
        properties: {
            /**
             * Get node's label
             * @property label
             */
            label: {
                set: function (inValue) {
                    var label = this._processPropertyValue(inValue);
                    var el = this.view('label');
                    el.set('text', label);
                    if (label != null) {
                        this.calcLabelPosition();
                    }
                    this._label = label;
                }
            },
            /**
             * Node icon's type
             * @method iconType {String}
             */
            iconType: {
                get: function () {
                    return this.view('icon').get('iconType');
                },
                set: function (inValue) {
                    var value = this._processPropertyValue(inValue);
                    if (value && this._iconType !== value) {
                        this._iconType = value;
                        this.view('icon').set('iconType', value);
                        return true;
                    } else {
                        return false;
                    }
                }
            },

            /**
             * Show/hide node's icon
             * @property showIcon
             */
            showIcon: {
                set: function (inValue) {
                    var value = this._processPropertyValue(inValue);
                    this._showIcon = value;

                    this.view('icon').set('showIcon', value);

                    if (this._label != null) {
                        this.calcLabelPosition();
                    }
                    if (this._selected) {
                        this.view('selectedBG').set('r', this.selectedRingRadius());
                    }
                }
            },
            enableSmartLabel: {
                value: true
            },
            labelAngle: {
                value: 90
            },
            /**
             * Set node's label visible
             * @property labelVisibility {Boolean} true
             */
            labelVisibility: {
                value: true,
                set: function (inValue) {
                    var value = this._processPropertyValue(inValue);
                    var el = this.view('label');
                    el.visible(value);
                    this._labelVisibility = value;
                }
            },
            revisionScale: {
                set: function (value) {
                    var topo = this.topology();
                    var icon = this.view('icon');
                    icon.set('scale', value);
                    if (topo.showIcon()) {
                        icon.showIcon(value > 0.2);
                    } else {
                        icon.showIcon(false);
                    }

                    if (value > 0.4) {
                        this.view('label').set('visible', this._labelVisibility == null ? true : this._labelVisibility);
                    } else {
                        this.view('label').set('visible', false);
                    }

                    if (this._label != null) {
                        this.calcLabelPosition();
                    }
                    if (this._selected) {
                        this.view('selectedBG').set('r', this.selectedRingRadius());
                    }

                }
            },
            /**
             * Set the node's color
             * @property color
             */
            color: {
                set: function (inValue) {
                    var value = this._processPropertyValue(inValue);
                    //                    this.view('graphic').dom().setStyle('fill', value);
                    this.view('label').dom().setStyle('fill', value);
                    this.view('icon').set('color', value);
                    this._color = value;
                }
            },

            /**
             * Set node's scale
             * @property scale {Number}
             */
            scale: {
                get: function () {
                    return this.view('graphic').scale();
                },
                set: function (inValue) {
                    var value = this._processPropertyValue(inValue);
                    this.view('graphic').setTransform(null, null, value);
                    this.calcLabelPosition(true);
                }
            },


            selectedRingRadius: {
                get: function () {
                    var bound = this.getBound(true);
                    var radius = Math.max(bound.height, bound.width) / 2;
                    return radius + (this.selected() ? 10 : -4);
                }
            },
            /**
             * Get/set node's selected statues
             * @property selected
             */
            selected: {
                get: function () {
                    return this._selected || false;
                },
                set: function (inValue) {
                    var value = this._processPropertyValue(inValue);
                    if (this._selected == value) {
                        return false;
                    }
                    this._selected = value;
                    this.dom().setClass("node-selected", !!value);
                    if (value) {
                        this.view('selectedBG').set('r', this.selectedRingRadius());
                    }
                    return true;
                }
            },
            enable: {
                get: function () {
                    return this._enable != null ? this._enable : true;
                },
                set: function (inValue) {
                    var value = this._processPropertyValue(inValue);
                    this._enable = value;
                    if (value) {
                        this.dom().removeClass('disable');
                    } else {
                        this.dom().addClass('disable');
                    }
                }
            },
            parentNodeSet: {
                get: function () {
                    var vertexSet = this.model().parentVertexSet();
                    if (vertexSet) {
                        return this.topology().getNode(vertexSet.id());
                    } else {
                        return null;
                    }
                }
            },
            rootNodeSet: {
                get: function () {
                    var model = this.model();
                    if (model.rootVertexSet()) {
                        return this.topology().getNode(model.rootVertexSet().id());
                    } {
                        return null;
                    }
                }
            }
        },
        view: {
            type: 'nx.graphic.Group',
            props: {
                'class': 'node'
            },
            content: [{
                    name: 'label',
                    type: 'nx.graphic.Text',
                    props: {
                        'class': 'node-label',
                        'alignment-baseline': 'central',
                        y: 12
                    }
                }, {
                    name: 'selectedBG',
                    type: 'nx.graphic.Circle',
                    props: {
                        'class': 'selectedBG',
                        'r': 26
                    }
                }, {
                    type: 'nx.graphic.Group',
                    name: 'graphic',
                    content: [{
                        name: 'icon',
                        type: 'nx.graphic.Icon',
                        props: {
                            'class': 'icon',
                            'iconType': 'unknown',
                            'showIcon': false,
                            scale: 1
                        }
                    }],
                    events: {
                        'mousedown': '{#_mousedown}',
                        'touchstart': '{#_mousedown}',
                        'mouseup': '{#_mouseup}',

                        'mouseenter': '{#_mouseenter}',
                        'mouseleave': '{#_mouseleave}',

                        'dragstart': '{#_dragstart}',
                        'dragmove': '{#_drag}',
                        'dragend': '{#_dragend}'
                    }
                }


            ]
        },
        methods: {
            translateTo: function (x, y, callback, context) {
                var el = this.view();
                var position = this.position();
                el.setTransition(function () {
                    this.position({
                        x: x,
                        y: y
                    });
                    this.calcLabelPosition(true);

                    if (callback) {
                        callback.call(context || this);
                    }
                }, this, 0.5);
                if (position.x == x && position.y == y && callback) {
                    callback.call(context || this);
                } else {
                    el.setTransform(x, y, null, 0.9);
                }

            },
            /**
             * Get node bound
             * @param onlyGraphic {Boolean} is is TRUE, will only get graphic's bound
             * @returns {*}
             */
            getBound: function (onlyGraphic) {
                if (onlyGraphic) {
                    return this.view('graphic').getBound();
                } else {
                    return this.view().getBound();
                }
            },
            _mousedown: function (sender, event) {
                if (this.enable()) {
                    this._prevPosition = this.position();
                    event.captureDrag(this.view('graphic'), this.topology().stage());
                    this.fire('pressNode', event);
                }
            },
            _mouseup: function (sender, event) {
                if (this.enable()) {
                    var _position = this.position();
                    if (this._prevPosition && _position.x === this._prevPosition.x && _position.y === this._prevPosition.y) {
                        /**
                         * Fired when click a node
                         * @event clickNode
                         * @param sender{Object} trigger instance
                         * @param event {Object} original event object
                         */
                        this.fire('clickNode', event);
                    }
                }
            },
            _mouseenter: function (sender, event) {
                if (this.enable()) {
                    if (!this.__enter && !this._nodeDragging) {
                        /**
                         * Fired when mouse enter a node
                         * @event enterNode
                         * @param sender{Object} trigger instance
                         * @param event {Object} original event object
                         */
                        this.fire('enterNode', event);
                        this.__enter = true;
                    }
                }


            },
            _mouseleave: function (sender, event) {
                if (this.enable()) {
                    if (this.__enter && !this._nodeDragging) {
                        /**
                         * Fired when mouse leave a node
                         * @event leaveNode
                         * @param sender{Object} trigger instance
                         * @param event {Object} original event object
                         */
                        this.fire('leaveNode', event);
                        this.__enter = false;
                    }
                }
            },
            _dragstart: function (sender, event) {
                window.event = event;
                this._nodeDragging = true;
                if (this.enable()) {
                    /**
                     * Fired when start drag a node
                     * @event dragNodeStart
                     * @param sender{Object} trigger instance
                     * @param event {Object} original event object
                     */
                    this.fire('dragNodeStart', event);
                }
            },
            _drag: function (sender, event) {
                window.event = event;
                if (this.enable()) {
                    /**
                     * Fired when drag a node
                     * @event dragNode
                     * @param sender{Object} trigger instance
                     * @param event {Object} original event object
                     */
                    this.fire('dragNode', event);
                }
            },
            _dragend: function (sender, event) {
                window.event = event;
                this._nodeDragging = false;
                if (this.enable()) {
                    /**
                     * Fired when finish a node
                     * @event dragNodeEnd
                     * @param sender{Object} trigger instance
                     * @param event {Object} original event object
                     */
                    this.fire('dragNodeEnd', event);
                    this.updateConnectedNodeLabelPosition();
                }
            },

            updateConnectedNodeLabelPosition: function () {
                this.calcLabelPosition(true);
                this.eachConnectedNode(function (node) {
                    node.calcLabelPosition();
                }, this);
            },
            /**
             * Set label to a node
             * @method calcLabelPosition
             */
            calcLabelPosition: function (force) {
                if (this.topology().enableSmartLabel()) {

                    if (force) {
                        this._centralizedText();
                    } else {
                        //                        clearTimeout(this._centralizedTextTimer || 0);
                        //                        this._centralizedTextTimer = setTimeout(function () {
                        this._centralizedText();
                        //                        }.bind(this), 100);
                    }

                } else {
                    var dflt = this.topology().nodeConfig().labelAngle;
                    this.updateByMaxObtuseAngle(dflt >= 0 ? dflt : this.labelAngle());
                }
            },
            _centralizedText: function () {


                //
                var vertex = this.model();

                if (vertex === undefined) {
                    return;
                }

                var vertexID = vertex.id();
                var vectors = [];


                nx.each(vertex.edgeSets(), function (edgeSet) {
                    if (edgeSet.sourceID() !== vertexID) {
                        vectors.push(edgeSet.line().dir.negate());
                    } else {
                        vectors.push(edgeSet.line().dir);
                    }
                }, this);

                nx.each(vertex.edgeSetCollections(), function (esc) {
                    if (esc.sourceID() !== vertexID) {
                        vectors.push(esc.line().dir.negate());
                    } else {
                        vectors.push(esc.line().dir);
                    }
                }, this);


                //sort line by angle;
                vectors = vectors.sort(function (a, b) {
                    return a.circumferentialAngle() - b.circumferentialAngle();
                });


                // get the min incline angle

                var startVector = new nx.geometry.Vector(1, 0);
                var maxAngle = 0,
                    labelAngle;

                if (vectors.length === 0) {
                    labelAngle = 90;
                } else {
                    //add first item to vectors, for compare last item with first

                    vectors.push(vectors[0].rotate(359.9));

                    //find out the max incline angle
                    for (var i = 0; i < vectors.length - 1; i++) {
                        var inclinedAngle = vectors[i + 1].circumferentialAngle() - vectors[i].circumferentialAngle();
                        if (inclinedAngle < 0) {
                            inclinedAngle += 360;
                        }
                        if (inclinedAngle > maxAngle) {
                            maxAngle = inclinedAngle;
                            startVector = vectors[i];
                        }
                    }

                    // bisector angle
                    labelAngle = maxAngle / 2 + startVector.circumferentialAngle();

                    // if max that 360, reduce 360
                    labelAngle %= 360;
                }


                this.updateByMaxObtuseAngle(labelAngle);
            },
            /**
             * @method updateByMaxObtuseAngle
             * @method updateByMaxObtuseAngle
             * @param angle
             */
            updateByMaxObtuseAngle: function (angle) {

                var el = this.view('label');

                // find out the quadrant
                var quadrant = Math.floor(angle / 60);
                var anchor = 'middle';
                if (quadrant === 5 || quadrant === 0) {
                    anchor = 'start';
                } else if (quadrant === 2 || quadrant === 3) {
                    anchor = 'end';
                }

                //
                var size = this.getBound(true);
                var radius = Math.max(size.width / 2, size.height / 2) + (this.showIcon() ? 12 : 8);
                var labelVector = new nx.geometry.Vector(radius, 0).rotate(angle);


                el.set('x', labelVector.x);
                el.set('y', labelVector.y);
                //

                el.set('text-anchor', anchor);

                this._labelAngle = angle;

            },
            dispose: function () {
                clearTimeout(this._centralizedTextTimer);
                this.inherited();
            }
        }
    });
})(nx, nx.global);

(function (nx, global) {
    var util = nx.util;
    /**
     * Nodes layer
     Could use topo.getLayer('nodes') get this
     * @class nx.graphic.Topology.NodesLayer
     * @extend nx.graphic.Topology.Layer
     *
     */
    var CLZ = nx.define('nx.graphic.Topology.NodesLayer', nx.graphic.Topology.Layer, {
        statics: {
            defaultConfig: {}
        },
        events: ['clickNode', 'enterNode', 'leaveNode', 'dragNodeStart', 'dragNode', 'dragNodeEnd', 'hideNode', 'pressNode', 'selectNode', 'updateNodeCoordinate'],
        properties: {
            /**
             * Get all nodes instance
             * @property nodes {Array}
             */
            nodes: {
                get: function () {
                    return this.nodeDictionary().values().toArray();
                }
            },
            /**
             * Get all nodes instance map
             * @property nodesMap {Object}
             */
            nodesMap: {
                get: function () {
                    return this.nodeDictionary().toObject();
                }
            },
            /**
             * Nodes observable dictionary
             * @property nodeDictionary {nx.data.ObservableDictionary}
             */
            nodeDictionary: {
                value: function () {
                    return new nx.data.ObservableDictionary();
                }
            }
        },
        methods: {
            attach: function (args) {
                this.inherited(args);

                var topo = this.topology();
                topo.watch('stageScale', this.__watchStageScaleFN = function (prop, value) {
                    this.nodeDictionary().each(function (item) {
                        item.value().stageScale(value);
                    });
                }, this);

                topo.watch('revisionScale', this.__watchRevisionScale = function (prop, value) {
                    this.nodeDictionary().each(function (item) {
                        item.value().revisionScale(value);
                    }, this);
                }, this);
            },
            /**
             * Add node a nodes layer
             * @param vertex
             * @method addNode
             */
            addNode: function (vertex) {
                var id = vertex.id();
                var node = this._generateNode(vertex);
                this.nodeDictionary().setItem(id, node);
                return node;
            },

            /**
             * Remove node
             * @method removeNode
             * @param id
             */
            removeNode: function (id) {
                var nodeDictionary = this.nodeDictionary();
                var node = nodeDictionary.getItem(id);
                if (node) {
                    node.dispose();
                    nodeDictionary.removeItem(id);
                }
            },
            updateNode: function (id) {
                var nodeDictionary = this.nodeDictionary();
                var node = nodeDictionary.getItem(id);
                if (node) {
                    node.update();
                }
            },
            //get node instance class
            _getNodeInstanceClass: function (vertex) {
                var Clz;
                var topo = this.topology();
                var nodeInstanceClass = topo.nodeInstanceClass();
                if (nx.is(nodeInstanceClass, 'Function')) {
                    Clz = nodeInstanceClass.call(this, vertex);
                    if (nx.is(Clz, 'String')) {
                        Clz = nx.path(global, Clz);
                    }
                } else {
                    Clz = nx.path(global, nodeInstanceClass);
                }
                if (!Clz) {
                    throw "Error on instance node class";
                }
                return Clz;
            },

            _generateNode: function (vertex) {
                var id = vertex.id();
                var topo = this.topology();
                var stageScale = topo.stageScale();
                var Clz = this._getNodeInstanceClass(vertex);
                var node = new Clz({
                    topology: topo
                });
                node.setModel(vertex);
                node.attach(this.view());

                node.sets({
                    'class': 'node',
                    'data-id': id,
                    'stageScale': stageScale
                });


                this.updateDefaultSetting(node);
                //                setTimeout(function () {
                //                    this.updateDefaultSetting(node);
                //                }.bind(this), 0);
                return node;
            },


            updateDefaultSetting: function (node) {
                var topo = this.topology();
                // delegate events
                var superEvents = nx.graphic.Component.__events__;
                nx.each(node.__events__, function (e) {
                    if (superEvents.indexOf(e) == -1) {
                        node.on(e, function (sender, event) {
                            if (event instanceof MouseEvent) {
                                window.event = event;
                            }
                            this.fire(e, node);
                        }, this);
                    }
                }, this);

                //properties
                var nodeConfig = this.nodeConfig = nx.extend({
                    enableSmartLabel: topo.enableSmartLabel()
                }, CLZ.defaultConfig, topo.nodeConfig());
                delete nodeConfig.__owner__;
                nx.each(nodeConfig, function (value, key) {
                    util.setProperty(node, key, value, topo);
                }, this);

                util.setProperty(node, 'showIcon', topo.showIcon());

                if (topo.revisionScale() !== 1) {
                    node.revisionScale(topo.revisionScale());
                }


            },

            /**
             * Iterate all nodes
             * @method eachNode
             * @param callback
             * @param context
             */
            eachNode: function (callback, context) {
                this.nodeDictionary().each(function (item, id) {
                    callback.call(context || this, item.value(), id);
                });
            },
            /**
             * Get node by id
             * @param id
             * @returns {*}
             * @method getNode
             */
            getNode: function (id) {
                return this.nodeDictionary().getItem(id);
            },
            clear: function () {
                this.eachNode(function (node) {
                    node.dispose();
                });
                this.nodeDictionary().clear();
                this.inherited();

            },
            dispose: function () {
                this.clear();
                var topo = this.topology();
                if (topo) {
                    this.topology().unwatch('stageScale', this.__watchStageScaleFN, this);
                    this.topology().unwatch('revisionScale', this.__watchRevisionScale, this);
                    if (topo._activeNodesWatcher) {
                        topo._activeNodesWatcher.dispose();
                    }
                    if (topo._highlightedNodesWatcher) {
                        topo._highlightedNodesWatcher.dispose();
                    }

                }


                this.inherited();
            }
        }
    });


})(nx, nx.global);

(function (nx, global) {

    /**
     * NodeSet class
     * @class nx.graphic.Topology.NodeSet
     * @extend nx.graphic.Topology.Node
     * @module nx.graphic.Topology
     */

    nx.define("nx.graphic.Topology.NodeSet", nx.graphic.Topology.Node, {
        events: ['expandNode', 'collapseNode', 'beforeExpandNode', 'beforeCollapseNode'],
        properties: {
            /**
             * Get all sub nodes
             */
            nodes: {
                get: function () {
                    var nodes = {};
                    var topo = this.topology();
                    var model = this.model();
                    if (this.model().activated()) {
                        return;
                    }
                    nx.each(model.vertices(), function (vertex, id) {
                        var node = topo.getNode(id);
                        if (node) {
                            nodes[id] = node;
                        }
                    });

                    nx.each(model.vertexSet(), function (vertexSet, id) {
                        var nodeSet = topo.getNode(id);
                        if (nodeSet) {
                            if (nodeSet.activated()) {
                                nodes[id] = nodeSet;
                            } else {
                                nx.extend(nodes, nodeSet.nodes());
                            }
                        }
                    });
                    return nodes;
                }
            },
            nodeSets: {
                get: function () {
                    var nodeSets = {};
                    var topo = this.topology();
                    var model = this.model();
                    model.eachSubVertexSet(function (vertexSet, id) {
                        var nodeSet = topo.getNode(id);
                        if (nodeSet) {
                            nodeSets[id] = nodeSet;
                        }
                    }, this);
                    return nodeSets;
                }
            },
            /**
             * Collapsed statues
             * @property collapsed
             */
            collapsed: {
                get: function () {
                    return this._collapsed !== undefined ? this._collapsed : true;
                },
                set: function (inValue) {
                    var value = this._processPropertyValue(inValue);
                    if (this._collapsed !== value) {
                        this._collapsed = value;
                        if (value) {
                            this.collapse(this._animation);
                        } else {
                            this.expand(this._animation);
                        }
                        return true;
                    } else {
                        return false;
                    }
                }
            },
            activated: {
                value: true
            },
            /**
             * Show/hide node's icon
             * @property showIcon
             */
            showIcon: {
                set: function (inValue) {
                    var value = this._processPropertyValue(inValue);
                    this._showIcon = value;

                    this.view('icon').set('showIcon', value);
                    this.view('icon').set('visible', value);

                    if (this._label != null) {
                        this.calcLabelPosition();
                    }
                    if (this._selected) {
                        this.view('selectedBG').set('r', this.selectedRingRadius());
                    }

                    this._updateMinusIcon();
                }
            },
            revisionScale: {
                set: function (value) {
                    var topo = this.topology();
                    var icon = this.view('icon');
                    icon.set('scale', value);
                    if (topo.showIcon()) {
                        icon.showIcon(value > 0.2);
                        icon.set('visible', value > 0.2);
                    } else {
                        icon.showIcon(false);
                        icon.set('visible', false);
                    }
                    this._updateMinusIcon(value);

                    if (this._labelVisibility) {
                        this.view('label').set('visible', value > 0.4);
                    }
                }
            },
            animation: {
                value: true
            },
            expandable:{
                value: true
            },
            collapsible:{
                value: true
            }
        },
        view: {
            type: 'nx.graphic.Group',
            props: {
                'class': 'node'
            },
            content: [{
                name: 'label',
                type: 'nx.graphic.Text',
                props: {
                    'class': 'node-label',
                    'alignment-baseline': 'central',
                    y: 12
                }
            }, {
                name: 'selectedBG',
                type: 'nx.graphic.Circle',
                props: {
                    'class': 'selectedBG',
                    'r': 26
                }
            }, {
                type: 'nx.graphic.Group',
                name: 'graphic',
                content: [{
                    name: 'icon',
                    type: 'nx.graphic.Icon',
                    props: {
                        'class': 'icon',
                        'iconType': 'unknown',
                        'showIcon': false,
                        scale: 1
                    }
                }, {
                    name: 'minus',
                    type: 'nx.graphic.Icon',
                    props: {
                        'class': 'indicator',
                        'iconType': 'expand',
                        scale: 1
                    }
                }],
                events: {
                    'mousedown': '{#_mousedown}',
                    'touchstart': '{#_mousedown}',
                    'mouseup': '{#_mouseup}',

                    'mouseenter': '{#_mouseenter}',
                    'mouseleave': '{#_mouseleave}',

                    'dragstart': '{#_dragstart}',
                    'dragmove': '{#_drag}',
                    'dragend': '{#_dragend}'
                }
            }


            ]
        },
        methods: {
            setModel: function (model) {
                this.inherited(model);
                this.setBinding('activated', 'model.activated,direction=<>', this);
            },
            update: function () {
                //                this.view().visible(this.model().activated() && this.model().inheritedVisible());
            },
            expand: function (animation, callback, context) {
                this.fire('beforeExpandNode', this);
                if(this.expandable()) {
                    // remember the animation status
                    var _animation = this.animation();
                    this.animation(typeof animation === "boolean" ? animation : _animation);
                    // prepare to expand
                    this._collapsed = false;
                    this.selected(false);
                    this.model().activated(false);
                    // expand
                    this.topology().expandNodes(this.nodes(), this.position(), function () {
                        // set the result
                        this.fire('expandNode', this);
                        /* jslint -W030 */
                        callback && callback.call(context, this, this);
                    }, this, this.animation());
                    // restore the animation
                    this.animation(_animation);
                }
            },
            collapse: function (animation, callback, context) {
                this.fire('beforeCollapseNode');
                if(this.collapsible()) {
                    // remember the animation status
                    var _animation = this.animation();
                    this.animation(typeof animation === "boolean" ? animation : _animation);
                    // prepare to expand
                    this._collapsed = true;
                    this.selected(false);
                    this.model().activated(false);
                    this.topology().collapseNodes(this.nodes(), this.position(), function () {
                        this.model().activated(true);
                        this.fire('collapseNode', this);
                        /* jslint -W030 */
                        callback && callback.call(context, this, this);
                    }, this, this.animation());
                    // restore the animation
                    this.animation(_animation);
                }
            },
            expandNodes: function (callback, context) {
                if (!this.model().activated()) {
                    this.topology().expandNodes(this.nodes(), this.position(), callback, context);
                }
            },
            collapseNodes: function (callback, context) {
                this.topology().collapseNodes(this.nodes(), this.position(), callback, context);
            },
            _updateMinusIcon: function (revisionScale) {
                var icon = this.view('icon');
                var minus = this.view('minus');
                if (icon.showIcon()) {

                    if (revisionScale == 0.4) {
                        minus.scale(0.8);
                    } else {
                        minus.scale(1);
                    }

                    var iconSize = icon.size();
                    var iconScale = icon.scale();

                    minus.setTransform(iconSize.width * iconScale / 2, iconSize.height * iconScale / 2);

                } else {
                    minus.setTransform(0, 0);
                }
            }
        }

    });

})(nx, nx.global);

(function (nx, global) {
    var util = nx.util;
    var CLZ = nx.define('nx.graphic.Topology.NodeSetLayer', nx.graphic.Topology.Layer, {
        statics: {
            defaultConfig: {
                iconType: 'nodeSet',
                label: 'model.label'
            }
        },
        events: ['clickNodeSet', 'enterNodeSet', 'leaveNodeSet', 'dragNodeSetStart', 'dragNodeSet', 'dragNodeSetEnd', 'hideNodeSet', 'pressNodeSet', 'selectNodeSet', 'updateNodeSetCoordinate', 'expandNodeSet', 'collapseNodeSet', 'beforeExpandNodeSet', 'beforeCollapseNodeSet', 'updateNodeSet', 'removeNodeSet'],
        properties: {
            nodeSets: {
                get: function () {
                    return this.nodeSetDictionary().values().toArray();
                }
            },
            nodeSetMap: {
                get: function () {
                    return this.nodeSetDictionary().toObject();
                }
            },
            nodeSetDictionary: {
                value: function () {
                    return new nx.data.ObservableDictionary();
                }
            }
        },
        methods: {
            attach: function (args, index) {
                this.inherited(args, index);
                var topo = this.topology();
                topo.watch('stageScale', this.__watchStageScaleFN = function (prop, value) {
                    this.eachNodeSet(function (nodeSet) {
                        nodeSet.stageScale(value);
                    });
                }, this);

                topo.watch('revisionScale', this.__watchRevisionScale = function (prop, value) {
                    this.eachNodeSet(function (nodeSet) {
                        nodeSet.revisionScale(value);
                    }, this);
                }, this);

            },
            addNodeSet: function (vertexSet) {
                var id = vertexSet.id();
                var nodeSet = this._generateNodeSet(vertexSet);
                this.nodeSetDictionary().setItem(id, nodeSet);
                return nodeSet;
            },

            removeNodeSet: function (id) {
                var nodeSetDictionary = this.nodeSetDictionary();
                var nodeSet = nodeSetDictionary.getItem(id);
                if (nodeSet) {
                    this.fire('removeNodeSet', nodeSet);
                    nodeSet.dispose();
                    nodeSetDictionary.removeItem(id);
                }
            },
            updateNodeSet: function (id) {
                var nodeSetDictionary = this.nodeSetDictionary();
                var nodeSet = nodeSetDictionary.getItem(id);
                if (nodeSet) {
                    nodeSet.update();
                    this.fire('updateNodeSet', nodeSet);
                }
            },
            _getNodeSetInstanceClass: function (vertexSet) {
                var Clz;
                var topo = this.topology();
                var nodeSetInstanceClass = topo.nodeSetInstanceClass();
                if (nx.is(nodeSetInstanceClass, 'Function')) {
                    Clz = nodeSetInstanceClass.call(this, vertexSet);
                    if (nx.is(Clz, 'String')) {
                        Clz = nx.path(global, Clz);
                    }
                } else {
                    Clz = nx.path(global, nodeSetInstanceClass);
                }

                if (!Clz) {
                    throw "Error on instance node set class";
                }
                return Clz;

            },
            _generateNodeSet: function (vertexSet) {
                var id = vertexSet.id();
                var topo = this.topology();
                var stageScale = topo.stageScale();
                var Clz = this._getNodeSetInstanceClass(vertexSet);

                var nodeSet = new Clz({
                    topology: topo
                });
                nodeSet.setModel(vertexSet);
                nodeSet.attach(this.view());

                nodeSet.sets({
                    'data-id': id,
                    'class': 'node nodeset',
                    stageScale: stageScale
                }, topo);

//                setTimeout(function () {
                this.updateDefaultSetting(nodeSet);
//                }.bind(this), 0);
                return nodeSet;


            },
            updateDefaultSetting: function (nodeSet) {
                var topo = this.topology();


                //register events
                var superEvents = nx.graphic.Component.__events__;
                nx.each(nodeSet.__events__, function (e) {
                    if (superEvents.indexOf(e) == -1) {
                        nodeSet.on(e, function (sender, event) {
                            if (event instanceof MouseEvent) {
                                window.event = event;
                            }
                            this.fire(e.replace('Node', 'NodeSet'), nodeSet);
                        }, this);
                    }
                }, this);


                var nodeSetConfig = nx.extend({enableSmartLabel: topo.enableSmartLabel()}, CLZ.defaultConfig, topo.nodeSetConfig());
                delete nodeSetConfig.__owner__;

                nx.each(nodeSetConfig, function (value, key) {
                    util.setProperty(nodeSet, key, value, topo);
                }, this);

                util.setProperty(nodeSet, 'showIcon', topo.showIcon());

                if (topo.revisionScale() !== 1) {
                    nodeSet.revisionScale(topo.revisionScale());
                }

            },
            /**
             * Get node by id
             * @param id
             * @returns {*}
             * @method getNodeSet
             */
            getNodeSet: function (id) {
                return this.nodeSetDictionary().getItem(id);
            },
            /**
             * Iterate all nodeSet
             * @method eachNode
             * @param callback
             * @param context
             */
            eachNodeSet: function (callback, context) {
                this.nodeSetDictionary().each(function (item, id) {
                    var nodeSet = item.value();
                    callback.call(context || this, nodeSet, id);
                }, this);
            },
            clear: function () {
                this.eachNodeSet(function (nodeSet) {
                    nodeSet.dispose();
                });
                this.nodeSetDictionary().clear();
                this.inherited();
            },
            dispose: function () {
                this.clear();
                this.topology().unwatch('stageScale', this.__watchStageScaleFN, this);
                this.topology().unwatch('revisionScale', this.__watchRevisionScale, this);
                this.inherited();
            }
        }
    });


})(nx, nx.global);

(function (nx, global) {
    var Vector = nx.geometry.Vector;
    var Line = nx.geometry.Line;

    /**
     * Abstract link class
     * @class nx.graphic.Topology.AbstractLink
     * @extend nx.graphic.Group
     * @module nx.graphic.Topology
     */
    nx.define('nx.graphic.Topology.AbstractLink', nx.graphic.Group, {
        events: ['hide', 'show', 'remove'],
        properties: {
            /**
             * Get source node's instance
             * @property  sourceNode
             */
            sourceNode: {
                get: function () {
                    var topo = this.topology();
                    var id = this.model().source().id();
                    return topo.getNode(id);
                }
            },
            /**
             * Get target node's instance
             * @property targetNode
             */
            targetNode: {
                get: function () {
                    var topo = this.topology();
                    var id = this.model().target().id();
                    return topo.getNode(id);
                }
            },
            /**
             * Get source node's position
             * @property sourcePosition
             */
            sourcePosition: {
                get: function () {
                    return this.sourceNode().position();
                }
            },
            /**
             * Get target node's position
             * @property targetPosition
             */
            targetPosition: {
                get: function () {
                    return this.targetNode().position();
                }
            },
            /**
             * Get source node's id
             * @property sourceNodeID
             */
            sourceNodeID: {
                get: function () {
                    return this.model().source().id();
                }
            },
            /**
             * Get target node's id
             * @property targetNodeID
             */
            targetNodeID: {
                get: function () {
                    return this.model().target().id();
                }
            },
            /**
             * Get source node's x position
             * @property sourceX
             */
            sourceX: {
                get: function () {
                    return this.sourceNode().x();
                }
            },
            /**
             * Get source node's y position
             * @property sourceY
             */
            sourceY: {
                get: function () {
                    return this.sourceNode().y();
                }
            },
            /**
             * Get target node's x position
             * @property targetX
             */
            targetX: {
                get: function () {
                    return this.targetNode().x();
                }
            },
            /**
             * Get target node's x position
             * @property targetY
             */
            targetY: {
                get: function () {
                    return this.targetNode().y();
                }
            },
            /**
             * Get source node's vector
             * @property sourceVector
             */
            sourceVector: {
                get: function () {
                    return this.sourceNode().vector();
                }
            },
            /**
             * Get target node's vector
             * @property targetVector
             */
            targetVector: {
                get: function () {
                    if (this.targetNode()) {
                        return this.targetNode().vector();
                    }
                }
            },
            position: {
                get: function () {
                    var sourceNode = this.sourceNode().position();
                    var targetNode = this.targetNode().position();
                    return {
                        x1: sourceNode.x || 0,
                        x2: sourceNode.y || 0,
                        y1: targetNode.x || 0,
                        y2: targetNode.y || 0
                    };
                }
            },
            /**
             * Get link's line object
             * @property line
             */
            line: {
                get: function () {
                    return  new Line(this.sourceVector(), this.targetVector());
                }
            },
            /**
             * Get topology instance
             * @property topology
             */
            topology: {
                value: null
            },
            /**
             * Get link's id
             * @property id
             */
            id: {
                get: function () {
                    return this.model().id();
                }
            },
            /**
             * Get link's linkKey
             * @property linkKey
             */
            linkKey: {
                get: function () {
                    return this.model().linkKey();
                }
            },
            /**
             * Get is link is reverse link
             * @property reverse
             */
            reverse: {
                get: function () {
                    return this.model().reverse();
                }
            },
            /**
             * Get this center point's position
             * @property centerPoint
             */
            centerPoint: {
                get: function () {
                    return this.line().center();
                }
            },
            /**
             * Get/set link's usability
             * @property enable
             */
            enable: {
                value: true
            }

        },
        methods: {
            /**
             * Factory function , will be call when set model
             * @method setModel
             */
            setModel: function (model, isUpdate) {
                //
                this.model(model);
                //

                //updateCoordinate

//                model.source().on('updateCoordinate', this._watchS = function () {
//                    this.notify('sourcePosition');
//                    this.update();
//                }, this);
//
//                model.target().on('updateCoordinate', this._watchS = function (prop, value) {
//                    this.notify('sourcePosition');
//                    this.update();
//                }, this);

//                model.source().watch('position', this._watchS = function (prop, value) {
//                    this.notify('sourcePosition');
//                    this.update();
//                }, this);
//
//                model.target().watch('position', this._watchT = function () {
//                    this.notify('targetPosition');
//                    this.update();
//                }, this);


                //bind model's visible with element's visible
                this.setBinding('visible', 'model.visible,direction=<>', this);

                if (isUpdate !== false) {
                    this.update();
                }
            },


            /**
             * Factory function , will be call when relate data updated
             * @method update
             */
            update: function () {
//                this.notify('centerPoint');
//                this.notify('line');
//                this.notify('position');
//                this.notify('targetVector');
//                this.notify('sourceVector');
            },
            dispose: function () {
//                var model = this.model();
//                if (model) {
//                    model.source().unwatch('position', this._watchS, this);
//                    model.target().unwatch('position', this._watchT, this);
//                }
                this.fire('remove');
                this.inherited();
            }
        }
    });


})(nx, nx.global);
(function(nx, global) {
    var Vector = nx.geometry.Vector;
    var Line = nx.geometry.Line;
    /**
     * Link class
     * @class nx.graphic.Topology.Link
     * @extend nx.graphic.Topology.AbstractLink
     * @module nx.graphic.Topology
     */

    var offsetRadix = 5;

    nx.define('nx.graphic.Topology.Link', nx.graphic.Topology.AbstractLink, {
        events: ['pressLink', 'clickLink', 'enterLink', 'leaveLink'],
        properties: {
            /**
             * Get link type 'curve' / 'parallel'
             * @property linkType {String}
             */
            linkType: {
                get: function() {
                    return this._linkType !== undefined ? this._linkType : 'parallel';
                },
                set: function(inValue) {
                    var value = this._processPropertyValue(inValue);
                    if (this._linkType !== value) {
                        this._linkType = value;
                        return true;
                    } else {
                        return false;
                    }
                }
            },
            /**
             * Get/set link's offset percentage
             * @property offset {Float}
             */
            offsetPercentage: {
                value: 0
            },
            /**
             * Get/set link's offset step
             * @property offsetRadix {Number}
             */
            offsetRadix: {
                value: 5
            },
            /**
             * Get/set link's label, it is shown at the center point
             * @property label {String}
             */
            label: {
                set: function(inValue) {
                    var label = this._processPropertyValue(inValue);
                    var el = this.view('label');
                    if (label != null) {
                        el.append();
                    } else {
                        el.remove();
                    }
                    this._label = label;
                }
            },
            /**
             * Set/get link's color
             * @property color {Color}
             */
            color: {
                set: function(inValue) {
                    var value = this._processPropertyValue(inValue);
                    this.view('line').dom().setStyle('stroke', value);
                    this.view('path').dom().setStyle('stroke', value);
                    this._color = value;
                }
            },
            /**
             * Set/get link's width
             * @property width {Number}
             */
            width: {
                set: function(inValue) {
                    var value = this._processPropertyValue(inValue);
                    var width = (this._stageScale || 1) * value;
                    this.view('line').dom().setStyle('stroke-width', width);
                    this.view('path').dom().setStyle('stroke-width', width);
                    this._width = value;
                }
            },
            stageScale: {
                set: function(value) {
                    var width = (this._width || 1) * value;
                    this.view('line').dom().setStyle('stroke-width', width);
                    this.view('path').dom().setStyle('stroke-width', width);
                    //                    this.view('disableLabel').scale(value);
                    this._stageScale = value;
                    this.update();
                }
            },
            /**
             * Set/get is link dotted
             * @property dotted {Boolean}
             */
            dotted: {
                set: function(inValue) {
                    var value = this._processPropertyValue(inValue);
                    if (value) {
                        this.view('path').dom().setStyle('stroke-dasharray', '2, 5');
                    } else {
                        this.view('path').dom().setStyle('stroke-dasharray', '');
                    }
                    this._dotted = value;
                }
            },
            /**
             * Set link's style
             * @property style {Object}
             */
            style: {
                set: function(inValue) {
                    var value = this._processPropertyValue(inValue);
                    this.view('line').dom().setStyles(value);
                    this.view('path').dom().setStyles(value);
                }
            },
            /**
             * Get link's parent linkSet
             * @property parentLinkSet
             */
            parentLinkSet: {

            },
            ///**
            // * Get link's source interface point position
            // * @property sourcePoint
            // */
            //sourcePoint: {
            //    get: function () {
            //        var line = this.getPaddingLine();
            //        return line.start;
            //    }
            //},
            ///**
            // * Get link's target interface point position
            // * @property targetPoint
            // */
            //targetPoint: {
            //    get: function () {
            //        var line = this.getPaddingLine();
            //        return line.end;
            //    }
            //},
            /**
             * Set/get link's usability
             * @property enable {Boolean}
             */
            enable: {
                get: function() {
                    return this._enable != null ? this._enable : true;
                },
                set: function(inValue) {
                    var value = this._processPropertyValue(inValue);
                    this._enable = value;
                    this.dom().setClass("disable", !value);
                    this.update();
                }
            },
            /**
             * Set the link's draw function, after set this property please call update function
             * @property drawMethod {Function}
             */
            drawMethod: {

            },
            revisionScale: {}

        },
        view: {
            type: 'nx.graphic.Group',
            props: {
                'class': 'link'
            },
            content: [{
                type: 'nx.graphic.Group',
                content: [{
                    name: 'path',
                    type: 'nx.graphic.Path',
                    props: {
                        'class': 'link'
                    }
                }, {
                    name: 'line_bg',
                    type: 'nx.graphic.Line',
                    props: {
                        'class': 'link_bg'
                    }
                }, {
                    name: 'line',
                    type: 'nx.graphic.Line',
                    props: {
                        'class': 'link'
                    }
                }],
                events: {
                    'mouseenter': '{#_mouseenter}',
                    'mouseleave': '{#_mouseleave}',
                    'mousedown': '{#_mousedown}',
                    'touchstart': '{#_mousedown}',
                    'mouseup': '{#_mouseup}',
                    'touchend': '{#_mouseup}'
                }
            }, {
                name: 'label',
                type: 'nx.graphic.Group',
                content: {
                    name: 'labelText',
                    type: 'nx.graphic.Text',
                    props: {
                        'alignment-baseline': 'text-before-edge',
                        'text-anchor': 'middle',
                        'class': 'link-label'
                    }
                }
            }]
        },
        methods: {

            /**
             * Update link's path
             * @method update
             */
            update: function() {

                this.inherited();

                var _offset = this.getOffset();
                var offset = new Vector(0, _offset);
                var width = (this._width || 1) * (this._stageScale || 1);
                var line = this.reverse() ? this.line().negate() : this.line();
                var d;
                var pathEL = this.view('path');
                var lineEl = this.view('line');
                var lineBGEl = this.view('line_bg');

                if (this.drawMethod()) {
                    d = this.drawMethod().call(this, this.model(), this);
                    pathEL.setStyle('display', 'block');
                    pathEL.set('d', d);
                    pathEL.dom().setStyle('stroke-width', width);
                    lineEl.setStyle('display', 'none');
                    lineBGEl.setStyle('display', 'none');
                } else if (this.linkType() == 'curve') {
                    var path = [];
                    var n, point;
                    n = line.normal().multiply(_offset * 3);
                    point = line.center().add(n);
                    path.push('M', line.start.x, line.start.y);
                    path.push('Q', point.x, point.y, line.end.x, line.end.y);
                    d = path.join(' ');

                    pathEL.setStyle('display', 'block');
                    pathEL.set('d', d);
                    pathEL.dom().setStyle('stroke-width', width);
                    lineEl.setStyle('display', 'none');
                    lineBGEl.setStyle('display', 'none');
                } else {
                    var newLine = line.translate(offset);
                    lineEl.sets({
                        x1: newLine.start.x,
                        y1: newLine.start.y,
                        x2: newLine.end.x,
                        y2: newLine.end.y
                    });
                    lineBGEl.sets({
                        x1: newLine.start.x,
                        y1: newLine.start.y,
                        x2: newLine.end.x,
                        y2: newLine.end.y
                    });
                    pathEL.setStyle('display', 'none');
                    lineEl.setStyle('display', 'block');
                    lineBGEl.setStyle('display', 'block');
                    lineEl.setStyle('stroke-width', width);
                    lineBGEl.setStyle('stroke-width', width * 4);

                }


                this._updateLabel();
            },
            /**
             * Get link's padding Line
             * @method getPaddingLine
             * @returns {*}
             */
            getPaddingLine: function() {
                var _offset = this.offset() * offsetRadix;
                var sourceSize = this.sourceNode().getBound(true);
                var sourceRadius = Math.max(sourceSize.width, sourceSize.height) / 1.3;
                var targetSize = this.targetNode().getBound(true);
                var targetRadius = Math.max(targetSize.width, targetSize.height) / 1.3;
                var line = this.line().pad(sourceRadius, targetRadius);
                var n = line.normal().multiply(_offset);
                return line.translate(n);
            },
            /**
             * Get calculated offset number
             * @method getoffset
             * @returns {number}
             */
            getOffset: function() {
                if (this.linkType() == 'parallel') {
                    return this.offsetPercentage() * this.offsetRadix() * this._stageScale;
                } else {
                    return this.offsetPercentage() * this.offsetRadix(); //* this._stageScale;
                }

            },
            _updateLabel: function() {
                var el, point;
                var _offset = this.getOffset();
                var line = this.line();
                var n = line.normal().multiply(_offset);
                if (this._label != null) {
                    el = this.view('label');
                    point = line.center().add(n);
                    el.setTransform(point.x, point.y, this.stageScale());
                    this.view('labelText').set('text', this._label);
                }
            },
            _mousedown: function() {
                if (this.enable()) {
                    /**
                     * Fired when mouse down on link
                     * @event pressLink
                     * @param sender{Object} trigger instance
                     * @param event {Object} original event object
                     */
                    this.fire('pressLink');
                }
            },
            _mouseup: function() {
                if (this.enable()) {
                    /**
                     * Fired when click link
                     * @event clickLink
                     * @param sender{Object} trigger instance
                     * @param event {Object} original event object
                     */
                    this.fire('clickLink');
                }
            },
            _mouseleave: function() {
                if (this.enable()) {
                    /**
                     * Fired when mouse leave link
                     * @event leaveLink
                     * @param sender{Object} trigger instance
                     * @param event {Object} original event object
                     */
                    this.fire('leaveLink');
                }
            },
            _mouseenter: function() {
                if (this.enable()) {
                    /**
                     * Fired when mouse enter link
                     * @event enterLink
                     * @param sender{Object} trigger instance
                     * @param event {Object} original event object
                     */
                    this.fire('enterLink');
                }
            }
        }
    });


})(nx, nx.global);

(function (nx, global) {
    var util = nx.util;

    /**
     * Links layer
     Could use topo.getLayer('links') get this
     * @class nx.graphic.Topology.LinksLayer
     * @extend nx.graphic.Topology.Layer
     */

    var CLZ = nx.define('nx.graphic.Topology.LinksLayer', nx.graphic.Topology.Layer, {
        statics: {
            defaultConfig: {
                linkType: 'parallel',
                label: null,
                color: null,
                width: null,
                enable: true
            }
        },
        events: ['pressLink', 'clickLink', 'enterLink', 'leaveLink'],
        properties: {
            links: {
                get: function () {
                    return this.linkDictionary().values().toArray();
                }
            },
            linkMap: {
                get: function () {
                    return this.linkDictionary().toObject();
                }
            },
            linkDictionary: {
                value: function () {
                    return new nx.data.ObservableDictionary();
                }
            }
        },
        methods: {
            attach: function (args) {
                this.inherited(args);
                var topo = this.topology();
                topo.watch('stageScale', this.__watchStageScaleFN = function (prop, value) {
                    this.eachLink(function (link) {
                        link.stageScale(value);
                    });
                }, this);

                topo.watch('revisionScale', this.__watchRevisionScale = function (prop, value) {
                    this.eachLink(function (link) {
                        link.revisionScale(value);
                    });
                }, this);
            },
            /**
             * Add a link
             * @param edge
             * @method addLink
             */

            addLink: function (edge) {
                var id = edge.id();
                var link = this._generateLink(edge);
                this.linkDictionary().setItem(id, link);
                return link;
            },
            /**
             * Remove a link
             * @param id {String}
             */
            removeLink: function (id) {
                var linkDictionary = this.linkDictionary();
                var link = linkDictionary.getItem(id);
                if (link) {
                    link.dispose();
                    linkDictionary.removeItem(id);
                }
            },
            /**
             * Update link
             * @method updateLink
             * @param id {String}
             */
            updateLink: function (id) {
                this.linkDictionary().getItem(id).update();
            },

            //get link instance class
            _getLinkInstanceClass: function (edge) {
                var Clz;
                var topo = this.topology();
                var linkInstanceClass = topo.linkInstanceClass();
                if (nx.is(linkInstanceClass, 'Function')) {
                    Clz = linkInstanceClass.call(this, edge);
                    if (nx.is(Clz, 'String')) {
                        Clz = nx.path(global, Clz);
                    }
                } else {
                    Clz = nx.path(global, linkInstanceClass);
                }
                if (!Clz) {
                    throw "Error on instance link class";
                }
                return Clz;
            },


            _generateLink: function (edge) {
                var id = edge.id();
                var topo = this.topology();
                var Clz = this._getLinkInstanceClass(edge);
                var link = new Clz({
                    topology: topo
                });
                //set model
                link.setModel(edge, false);
                link.attach(this.view());

                link.view().sets({
                    'class': 'link',
                    'data-id': id
                });



//                setTimeout(function () {
                this.updateDefaultSetting(link);
//                }.bind(this), 0);

                return link;

            },
            updateDefaultSetting: function (link) {
                var topo = this.topology();
                //delegate link's events
                var superEvents = nx.graphic.Component.__events__;
                nx.each(link.__events__, function (e) {
                    if (superEvents.indexOf(e) == -1) {
                        link.on(e, function (sender, event) {
                            this.fire(e, link);
                        }, this);
                    }
                }, this);
                //set properties
                var linkConfig = nx.extend({}, CLZ.defaultConfig, topo.linkConfig());
                delete  linkConfig.__owner__;

                nx.each(linkConfig, function (value, key) {
                    util.setProperty(link, key, value, topo);
                }, this);

                if (nx.DEBUG) {
                    var edge = link.model();
                    link.view().sets({
                        'data-linkKey': edge.linkKey(),
                        'data-source-node-id': edge.source().id(),
                        'data-target-node-id': edge.target().id()
                    });
                }

                link.stageScale(topo.stageScale());

                link.update();
            },


            /**
             * Traverse all links
             * @param callback
             * @param context
             * @method eachLink
             */
            eachLink: function (callback, context) {
                this.linkDictionary().each(function (item, id) {
                    callback.call(context || this, item.value(), id);
                });
            },
            /**
             * Get link by id
             * @param id
             * @returns {*}
             */
            getLink: function (id) {
                return this.linkDictionary().getItem(id);
            },
            /**
             * Highlight links
             * @method highlightLinks
             * @param links {Array} links array
             */
            highlightLinks: function (links) {
                this.highlightedElements().addRange(links);
            },
            activeLinks: function (links) {
                this.activeElements().addRange(links);
            },
            /**
             * Clear links layer
             * @method clear
             */
            clear: function () {
                this.eachLink(function (link) {
                    link.dispose();
                });

                this.linkDictionary().clear();
                this.inherited();
            },
            dispose: function () {
                this.clear();
                this.topology().unwatch('stageScale', this.__watchStageScaleFN, this);
                this.inherited();
            }
        }
    });


})(nx, nx.global);
(function (nx, global) {

    var Vector = nx.geometry.Vector;
    var Line = nx.geometry.Line;

    /**
     * LinkSet class
     * @class nx.graphic.Topology.LinkSet
     * @extend nx.graphic.Topology.AbstractLink
     * @module nx.graphic.Topology
     */


    nx.define('nx.graphic.Topology.LinkSet', nx.graphic.Topology.AbstractLink, {
        events: ['pressLinkSetNumber', 'clickLinkSetNumber', 'enterLinkSetNumber', 'leaveLinkSetNumber', 'collapseLinkSet', 'expandLinkSet'],
        properties: {
            /**
             * Get link type 'curve' / 'parallel'
             * @property linkType {String}
             */
            linkType: {
                get: function () {
                    return this._linkType || 'parallel';
                },
                set: function (inValue) {
                    var value = this._processPropertyValue(inValue);
                    if (this._linkType !== value) {
                        this._linkType = value;
                        return true;
                    } else {
                        return false;
                    }
                }
            },
            /**
             * Sub links collection
             * @property links
             * @readOnly
             */
            links: {
                get: function () {
                    var links = {};
                    this.eachLink(function (link, id) {
                        links[id] = link;
                    }, this);
                    return links;
                }
            },
            /**
             * LinkSet's color
             * @property color
             */
            color: {
                set: function (inValue) {
                    var value = this._processPropertyValue(inValue);
                    this.view('numBg').dom().setStyle('stroke', value);
                    this.view('path').dom().setStyle('stroke', value);
                    this._color = value;
                }
            },
            stageScale: {
                set: function (value) {
                    this.view('path').dom().setStyle('stroke-width', value);
                    this.view('number').setTransform(null, null, value);
                    /* jshint -W030 */
                    this.model() && this._updateLinksOffset();
                    this._stageScale = value;
                }
            },
            /**
             * Set/get link's usability
             * @property enable {Boolean}
             */
            enable: {
                get: function () {
                    return this._enable === undefined ? true : this._enable;
                },
                set: function (inValue) {
                    var value = this._processPropertyValue(inValue);
                    this.dom().setClass("disable", !value);
                    this._enable = value;
                    this.eachLink(function (link) {
                        link.enable(value);
                    });
                }
            },
            /**
             * Collapsed statues
             * @property collapsed
             */
            collapsedRule: {
                value: false
            },
            activated: {
                value: true
            },
            revisionScale: {
                set: function (value) {
                    var strokeWidth = value < 0.6 ? 8 : 12;
                    this.view('numBg').dom().setStyle('stroke-width', strokeWidth);

                    var fontSize = value < 0.6 ? 8 : 10;
                    this.view('num').dom().setStyle('font-size', fontSize);

                    this.view('number').visible(value !== 0.2);


                }


            }
        },
        view: {
            type: 'nx.graphic.Group',
            props: {
                'data-type': 'links-sum',
                'class': 'link-set'
            },
            content: [{
                name: 'path',
                type: 'nx.graphic.Line',
                props: {
                    'class': 'link-set-bg'
                }
            }, {
                name: 'number',
                type: 'nx.graphic.Group',
                content: [{
                    name: 'numBg',
                    type: 'nx.graphic.Rect',
                    props: {
                        'class': 'link-set-circle',
                        height: 1
                    },
                    events: {
                        'mousedown': '{#_number_mouseup}',
                        'touchstart': '{#_number_mouseup}',
                        'mouseenter': '{#_number_mouseenter}',
                        'mouseleave': '{#_number_mouseleave}'
                    }
                }, {
                    name: 'num',
                    type: 'nx.graphic.Text',
                    props: {
                        'class': 'link-set-text',
                        y: 1
                    }
                }]
            }]
        },
        methods: {
            setModel: function (model, isUpdate) {
                this.inherited(model, isUpdate);
                this.setBinding('activated', 'model.activated,direction=<>', this);
            },
            update: function () {
                if (this._activated) {
                    var line = this.line();
                    this.view('path').sets({
                        x1: line.start.x,
                        y1: line.start.y,
                        x2: line.end.x,
                        y2: line.end.y
                    });
                    //num
                    var centerPoint = this.centerPoint();
                    this.view('number').setTransform(centerPoint.x, centerPoint.y);
                }
            },
            /**
             * Update linkSet
             * @property updateLinkSet
             */
            updateLinkSet: function () {
                var value = this._processPropertyValue(this.collapsedRule());
                this.model().activated(value, {
                    force: true
                });
                if (value) {
                    this.append();
                    this.update();
                    this._updateLinkNumber();
                    /**
                     * Fired when collapse linkSet
                     * @event collapseLinkSet
                     * @param sender{Object} trigger instance
                     * @param event {Object} original event object
                     */
                    this.fire('collapseLinkSet');
                } else {
                    /* jshint -W030 */
                    this.parent() && this.remove();
                    this._updateLinksOffset();
                    /**
                     * Fired when expend linkSet
                     * @event expandLinkSet
                     * @param sender{Object} trigger instance
                     * @param event {Object} original event object
                     */
                    this.fire('expandLinkSet');
                }
            },
            /**
             * Iterate all sub links
             * @method eachLink
             * @param callback {Function}
             * @param context {Object}
             */
            eachLink: function (callback, context) {
                var topo = this.topology();
                var model = this.model();

                nx.each(model.edges(), function (edge, id) {
                    var link = topo.getLink(id);
                    if (link) {
                        callback.call(context || this, link, id);
                    }
                });
            },

            _updateLinkNumber: function () {
                var edges = Object.keys(this.model().edges());
                var numEl = this.view('num');
                var numBg = this.view('numBg');
                if (edges.length == 1) {
                    numEl.visible(false);
                    numBg.visible(false);

                } else {
                    numEl.sets({
                        text: edges.length,
                        visible: true
                    });

                    var bound = numEl.getBound();
                    var width = Math.max(bound.width - 6, 1);

                    numBg.sets({
                        width: width,
                        visible: true
                    });
                    numBg.setTransform(width / -2);
                }

            },
            _updateLinksOffset: function () {
                if (!this._activated) {
                    var links = this.links();
                    var offset = (Object.keys(links).length - 1) / 2;
                    var index = 0;
                    nx.each(links, function (link, id) {
                        link.offsetPercentage(index++ * -1 + offset);
                        link.update();
                    }, this);



                    //var obj = {};
                    //this.eachLink(function (link, id) {
                    //    var edge = link.model();
                    //    var linkKey = edge.linkKey();
                    //    var ary = obj[linkKey] = obj[linkKey] || [];
                    //    ary.push(link);
                    //}, this);
                    //
                    //console.log(obj);
                    //
                    //nx.each(obj, function (links, linkKey) {
                    //    if (links.length > 1) {
                    //        var offset = (links.length - 1) / 2;
                    //        nx.each(links, function (link, index) {
                    //            link.offsetPercentage(index * -1 + offset);
                    //            link.update();
                    //        }, this);
                    //    }
                    //}, this);
                }
            },


            _number_mousedown: function (sender, event) {
                if (this.enable()) {
                    /**
                     * Fired when press number element
                     * @event pressLinkSetNumber
                     * @param sender{Object} trigger instance
                     * @param event {Object} original event object
                     */
                    this.fire('pressLinkSetNumber', event);
                }
            },
            _number_mouseup: function (sender, event) {
                if (this.enable()) {
                    /**
                     * Fired when click number element
                     * @event clickLinkSetNumber
                     * @param sender{Object} trigger instance
                     * @param event {Object} original event object
                     */
                    this.fire('clickLinkSetNumber', event);
                }
            },
            _number_mouseleave: function (sender, event) {
                if (this.enable()) {
                    /**
                     * Fired when mouse leave number element
                     * @event numberleave
                     * @param sender{Object} trigger instance
                     * @param event {Object} original event object
                     */
                    this.fire('numberleave', event);
                }
            },
            _number_mouseenter: function (sender, event) {
                if (this.enable()) {
                    /**
                     * Fired when mouse enter number element
                     * @event numberenter
                     * @param sender{Object} trigger instance
                     * @param event {Object} original event object
                     */
                    this.fire('numberenter', event);
                }
            }
        }
    });


})(nx, nx.global);

(function (nx, global) {

    var util = nx.util;

    /** Links layer
     Could use topo.getLayer('linkSet') get this
     * @class nx.graphic.Topology.LinksLayer
     * @extend nx.graphic.Topology.Layer
     */

    var CLZ = nx.define('nx.graphic.Topology.LinkSetLayer', nx.graphic.Topology.Layer, {
        statics: {
            defaultConfig: {
                label: null,
                sourceLabel: null,
                targetLabel: null,
                color: null,
                width: null,
                dotted: false,
                style: null,
                enable: true,
                collapsedRule: function (model) {
                    if (model.type() == 'edgeSetCollection') {
                        return true;
                    }
                    var linkType = this.linkType();
                    var edges = Object.keys(model.edges());
                    var maxLinkNumber = linkType === 'curve' ? 9 : 5;
                    return edges.length > maxLinkNumber;
                }
            }
        },
        events: ['pressLinkSetNumber', 'clickLinkSetNumber', 'enterLinkSetNumber', 'leaveLinkSetNumber', 'collapseLinkSet', 'expandLinkSet'],
        properties: {
            linkSets: {
                get: function () {
                    return this.linkSetDictionary().values().toArray();
                }
            },
            linkSetMap: {
                get: function () {
                    return this.linkSetDictionary().toObject();
                }
            },
            linkSetDictionary: {
                value: function () {
                    return new nx.data.ObservableDictionary();
                }
            }
        },
        methods: {
            attach: function (args) {
                this.inherited(args);

                var topo = this.topology();
                //watch stageScale
                topo.watch('stageScale', this.__watchStageScaleFN = function (prop, value) {
                    this.eachLinkSet(function (linkSet) {
                        linkSet.stageScale(value);
                    });
                }, this);
                topo.watch('revisionScale', this.__watchRevisionScale = function (prop, value) {
                    this.eachLinkSet(function (linkSet) {
                        linkSet.revisionScale(value);
                    });
                }, this);

            },
            addLinkSet: function (edgeSet) {
                var linkSetDictionary = this.linkSetDictionary();
                var linkSet = this._generateLinkSet(edgeSet);
                linkSetDictionary.setItem(edgeSet.linkKey(), linkSet);
                return linkSet;
            },
            updateLinkSet: function (linkKey) {
                this.linkSetDictionary().getItem(linkKey).updateLinkSet();

            },
            removeLinkSet: function (linkKey) {
                var linkSetDictionary = this.linkSetDictionary();
                var linkSet = linkSetDictionary.getItem(linkKey);
                if (linkSet) {
                    linkSet.dispose();
                    linkSetDictionary.removeItem(linkKey);
                    return true;
                } else {
                    return false;
                }
            },

            _getLinkSetInstanceClass: function (edgeSet) {
                var Clz;
                var topo = this.topology();
                var nodeSetInstanceClass = topo.linkSetInstanceClass();
                if (nx.is(nodeSetInstanceClass, 'Function')) {
                    Clz = nodeSetInstanceClass.call(this, edgeSet);
                    if (nx.is(Clz, 'String')) {
                        Clz = nx.path(global, Clz);
                    }
                } else {
                    Clz = nx.path(global, nodeSetInstanceClass);
                }

                if (!Clz) {
                    throw "Error on instance linkSet class";
                }
                return Clz;

            },

            _generateLinkSet: function (edgeSet) {
                var topo = this.topology();
                var Clz = this._getLinkSetInstanceClass(edgeSet);
                var linkSet = new Clz({
                    topology: topo
                });
                //set model
                linkSet.setModel(edgeSet, false);
                linkSet.attach(this.view());


//                setTimeout(function () {
                this.updateDefaultSetting(linkSet);
//                }.bind(this), 0);

                return linkSet;


            },
            updateDefaultSetting: function (linkSet) {
                var topo = this.topology();


                //delegate elements events
                var superEvents = nx.graphic.Component.__events__;
                nx.each(linkSet.__events__, function (e) {
                    //exclude basic events
                    if (superEvents.indexOf(e) == -1) {
                        linkSet.on(e, function (sender, event) {
                            this.fire(e, linkSet);
                        }, this);
                    }
                }, this);

                //set properties
                var linkSetConfig = nx.extend({}, CLZ.defaultConfig, topo.linkSetConfig());
                delete linkSetConfig.__owner__; //fix bug


                linkSetConfig.linkType = (topo.linkConfig() && topo.linkConfig().linkType) || nx.graphic.Topology.LinksLayer.defaultConfig.linkType;


                nx.each(linkSetConfig, function (value, key) {
                    util.setProperty(linkSet, key, value, topo);
                }, this);

                linkSet.stageScale(topo.stageScale());


                if (nx.DEBUG) {
                    var edgeSet = linkSet.model();
                    //set element attribute
                    linkSet.view().sets({
                        'data-nx-type': 'nx.graphic.Topology.LinkSet',
                        'data-linkKey': edgeSet.linkKey(),
                        'data-source-node-id': edgeSet.source().id(),
                        'data-target-node-id': edgeSet.target().id()

                    });

                }

                linkSet.updateLinkSet();
                return linkSet;

            },
            /**
             * Iterate all linkSet
             * @method eachLinkSet
             * @param callback {Function}
             * @param context {Object}
             */
            eachLinkSet: function (callback, context) {
                this.linkSetDictionary().each(function (item, linkKey) {
                    callback.call(context || this, item.value(), linkKey);
                });
            },
            /**
             * Get linkSet by source node id and target node id
             * @method getLinkSet
             * @param sourceVertexID {String}
             * @param targetVertexID {String}
             * @returns {nx.graphic.LinkSet}
             */
            getLinkSet: function (sourceVertexID, targetVertexID) {
                var topo = this.topology();
                var graph = topo.graph();
                var edgeSet = graph.getEdgeSetBySourceAndTarget(sourceVertexID, targetVertexID) || graph.getEdgeSetCollectionBySourceAndTarget(sourceVertexID, targetVertexID);
                if (edgeSet) {
                    return this.getLinkSetByLinkKey(edgeSet.linkKey());
                } else {
                    return null;
                }
            },
            /**
             * Get linkSet by linkKey
             * @method getLinkSetByLinkKey
             * @param linkKey {String} linkKey
             * @returns {nx.graphic.Topology.LinkSet}
             */
            getLinkSetByLinkKey: function (linkKey) {
                return this.linkSetDictionary().getItem(linkKey);
            },
            /**
             * Highlight linkSet
             * @method highlightlinkSets
             * @param linkSets {Array} linkSet array
             */
            highlightLinkSets: function (linkSets) {
                this.highlightedElements().addRange(linkSets);
            },
            /**
             * Active linkSet
             * @method highlightlinkSets
             * @param linkSets {Array} linkSet array
             */
            activeLinkSets: function (linkSets) {
                this.activeElements().addRange(linkSets);
            },
            /**
             * Clear links layer
             * @method clear
             */
            clear: function () {
                this.eachLinkSet(function (linkSet) {
                    linkSet.dispose();
                });
                this.linkSetDictionary().clear();
                this.inherited();
            },
            dispose: function () {
                this.clear();
                this.topology().unwatch('stageScale', this.__watchStageScaleFN, this);
                this.inherited();
            }
        }
    });


})(nx, nx.global);
(function (nx, global) {

    nx.define("nx.graphic.Topology.HierarchicalLayout", {
        properties: {
            topology: {},
            levelBy: {
                value: function () {
                    return function (inNode) {
                        return inNode.model().get("role");
                    };
                }
            },
            sortOrder: {
                value: function () {
                    return [];
                }
            },
            direction: { // horizontal,vertical
                value: 'vertical'
            },
            order: {

            },
            nodesPositionObject: {

            },
            groups: {}
        },
        methods: {

            process: function (graph, config, callback) {
                var groups = this._group(graph, config || {});
                var nodesPositionObject = this._calc(groups, config || {});

                this._layout(nodesPositionObject, callback);
            },
            _group: function (graph, config) {
                var groups = {'__other__': []};
                var topo = this.topology();
                var levelBy = config.levelBy || this.levelBy();
                topo.eachNode(function (node) {
                    var key;
                    if (nx.is(levelBy, 'String') && levelBy.substr(5) == 'model') {
                        key = node.model().get(levelBy.substring(6));
                    } else {
                        key = levelBy.call(topo, node, node.model());
                    }

                    if (key) {
                        var group = groups[key] = groups[key] || [];
                        group.push(node);
                    } else {
                        groups.__other__.push(node);
                    }

                });
                return groups;
            },
            _calc: function (groups, config) {
                var nodesPositionObject = {}, keys = Object.keys(groups);
                var topo = this.topology();
                var sortOrder = config.sortOrder || this.sortOrder() || [];

                //build order array, and move __other__ to the last

                var order = [];
                nx.each(sortOrder, function (v) {
                    var index = keys.indexOf(v);
                    if (index !== -1) {
                        order.push(v);
                        keys.splice(index, 1);
                    }
                });
                keys.splice(keys.indexOf('__other__'), 1);
                order = order.concat(keys, ['__other__']);
                groups = this._sort(groups, order);

                //var y = 0;

                var padding = topo.padding();
                var width = topo.width() - padding * 2;
                var height = topo.height() - padding * 2;

                var direction = this.direction();


                var perY = height / (order.length + 1);
                var perX = width / (order.length + 1);
                var x = perX, y = perY;

                //'vertical'

                nx.each(order, function (key) {
                    if (groups[key]) {

                        if (direction == 'vertical') {
                            //build nodes position map
                            perX = width / (groups[key].length + 1);
                            nx.each(groups[key], function (node, i) {
                                nodesPositionObject[node.id()] = {
                                    x: perX * (i + 1),
                                    y: y
                                };
                            });
                            y += perY;
                        } else {
                            //build nodes position map
                            perY = height / (groups[key].length + 1);
                            nx.each(groups[key], function (node, i) {
                                nodesPositionObject[node.id()] = {
                                    x: x,
                                    y: perY * (i + 1)
                                };
                            });
                            x += perX;
                        }


                        delete groups[key];
                    }
                });

                this.order(order);


                return nodesPositionObject;

            },
            _sort: function (groups, order) {
                var topo = this.topology();
                var graph = topo.graph();

                groups[order[0]].sort(function (a, b) {
                    return Object.keys(b.model().edgeSets()).length - Object.keys(a.model().edgeSets()).length;
                });

                for (var i = 0; i < order.length - 1; i++) {
                    var firstGroup = groups[order[i]];
                    var secondGroup = groups[order[i + 1]];
                    var ary = [], indexs = [];
                    /* jshint -W083 */
                    nx.each(firstGroup, function (fNode) {
                        var temp = [];
                        nx.each(secondGroup, function (sNode, i) {
                            if (graph.getEdgesBySourceAndTarget(fNode, sNode) != null && temp.indexOf(sNode) != -1) {
                                temp.push(sNode);
                                indexs.push(i);
                            }
                        });
                        temp.sort(function (a, b) {
                            return Object.keys(b.model().edgeSets()).length - Object.keys(a.model().edgeSets()).length;
                        });

                        ary = ary.concat(temp);
                    });

                    /* jshint -W083 */
                    nx.each(ary, function (node, i) {
                        var index = secondGroup.indexOf(node);
                        if (index !== -1) {
                            secondGroup.splice(index, 1);
                        }
                    });
                    groups[order[i + 1]] = ary.concat(secondGroup);
                }

                this.groups(nx.extend({}, groups));
                return groups;
            },
            _layout: function (nodesPositionObject, callback) {
                var topo = this.topology();


                var queueCounter = 0;
                var nodeLength = 0;
                var finish = function () {
                    if (queueCounter == nodeLength) {
                        setTimeout(function () {
                            topo.getLayer('links').show();
                            topo.getLayer('linkSet').show();
                            topo.stage().resetFitMatrix();
                            topo.fit(function () {

                                if (callback) {
                                    callback.call(topo);
                                }
                            });
                        }, 0);

                    }
                }.bind(this);

                //
                topo.getLayer('links').hide();
                topo.getLayer('linkSet').hide();
                nx.each(nodesPositionObject, function (n, id) {
                    var node = topo.getNode(id);
                    if (node) {
                        node.translateTo(n.x, n.y, function () {
                            queueCounter++;
                            finish();
                        });
                        nodeLength++;
                    }
                });
            }
        }
    });


})(nx, nx.global);
// jshint ignore: start

(function (nx, global) {

    /**
     * Topology force layout
     * @class nx.graphic.Topology.NeXtForceLayout
     * @module nx.graphic.Topology
     */
    nx.define("nx.graphic.Topology.NeXtForceLayout", {
        properties: {
            topology: {},
            bound: {}
        },
        methods: {
            process: function (graph, config, callback) {
                var topo = this.topology();
                var selectedNodes = topo.selectedNodes().toArray();
                this._layoutTopology(graph, config, callback);
//                if (selectedNodes.length !== 0) {
//                    this._layoutNodes(graph, config, callback);
//                } else {
//                    this._layoutTopology(graph, config, callback);
//                }
            },
            _layoutNodes: function (graph, config, callback) {

            },
            _layoutTopology: function (graph, config, callback) {
                var topo = this.topology();
                var stage = topo.stage();
                var linksLayer = topo.getLayer('links');
                var linkSetLayer = topo.getLayer('linkSet');
                var transform = nx.geometry.Vector.transform;
                var data = {nodes: [], links: []};
                var nodeMap = {}, linkMap = {};

                topo.eachNode(function (node) {
                    nodeMap[node.id()] = data.nodes.length;
                    data.nodes.push({
                        id: node.id()
                    });
                });


                if (topo.supportMultipleLink()) {
                    linkSetLayer.eachLinkSet(function (linkSet) {
                        if (!linkMap[linkSet.linkKey()] && nodeMap[linkSet.sourceNodeID()] && nodeMap[linkSet.targetNodeID()]) {
                            data.links.push({
                                source: nodeMap[linkSet.sourceNodeID()],
                                target: nodeMap[linkSet.targetNodeID()]
                            });
                            linkMap[linkSet.linkKey()] = linkSet;
                        }

                    });
                } else {
                    linksLayer.eachLink(function (link) {
                        if (!linkMap[link.id()] && nodeMap[link.sourceNodeID()] && nodeMap[link.targetNodeID()]) {
                            data.links.push({
                                source: nodeMap[link.sourceNodeID()],
                                target: nodeMap[link.targetNodeID()]
                            });
                            linkMap[link.id()] = link;
                        }
                    });
                }

                topo.hideLoading();
                topo.stage().fit();
                topo.stage().show();

                //force
                var force = new nx.data.Force();
                force.nodes(data.nodes);
                force.links(data.links);
                force.start();
                while (force.alpha()) {
                    force.tick();
                }
                force.stop();

                var bound = this._getBound(data.nodes);
                var matrix = stage.calcRectZoomMatrix(topo.graph().getBound(), bound);


                topo.getLayer('links').hide();


                nx.each(data.nodes, function (n, i) {
                    var node = topo.getNode(n.id);
                    if (node) {
                        var p = transform([n.x, n.y], matrix);
                        node.translateTo(p[0], p[1]);
                    }
                }, this);

                if (this._timer) {
                    clearTimeout(this._timer);
                }

                this._timer = setTimeout(function () {
                    topo.getLayer('links').show();
                    topo.adjustLayout();
                    if (callback) {
                        callback.call(topo);
                    }
                }, 2000);
            },
            _getBound: function (nodes) {
                var lastIndex = nodes.length - 1;
                var bound = {
                    left: 0,
                    x: 0,
                    top: 0,
                    y: 0,
                    width: 0,
                    height: 0,
                    maxX: 0,
                    maxY: 0
                };


                //
                nodes.sort(function (a, b) {
                    return a.x - b.x;
                });

                bound.x = bound.left = nodes[0].x;
                bound.maxX = nodes[lastIndex].x;
                bound.width = bound.maxX - bound.x;


                //
                nodes.sort(function (a, b) {
                    return a.y - b.y;
                });

                bound.y = bound.top = nodes[0].y;
                bound.maxY = nodes[lastIndex].y;
                bound.height = bound.maxY - bound.x;
                return bound;
            }
        }
    });


    //                    console.log(JSON.stringify(data));

//                    var force = new nx.data.NextForce(100, 100);
//                    force.setData(data);
//                    if (data.nodes.length < 50) {
//                        while (true) {
//                            force.tick();
//                            if (force.maxEnergy < data.nodes.length * 0.1) {
//                                break;
//                            }
//                        }
//                    } else {
//                        var step = 0;
//                        while (++step < 900) {
//                            force.tick();
//                        }
//                    }
})(nx, nx.global);
(function (nx, global) {

    nx.define("nx.graphic.Topology.EnterpriseNetworkLayout", nx.graphic.Topology.HierarchicalLayout, {
        properties: {
        },
        methods: {

            process: function (graph, config, callback) {
                this.inherited(graph, config, function () {
                    this._appendGroupElements();
                    if (callback) {
                        callback();
                    }
                }.bind(this));
            },
            _appendGroupElements: function () {
                var topo = this.topology();
                var matrix = topo.matrix();
                var layer = topo.prependLayer('ENLLayer', new Layer());
                var stage = topo.stage();
                var padding = topo.padding();
                var width = topo.width() - padding * 2;
                var height = topo.height() - padding * 2;
                var groups = this.groups();
                var order = this.order();
                var perHeight = height / (order.length);
                var y = padding;
                var items = [];
                var gap = 0;
                nx.each(groups, function (nodes, key) {
                    var label = key !== '__other__' ? key : '';
                    var firstNode = nodes[0];
                    items.push({
                        left: (padding - matrix.x()) / matrix.scale(),
                        top: firstNode.y() - 30 / matrix.scale(),
                        width: width / matrix.scale(),
                        height: 65 / matrix.scale(),
                        label: label,
                        stroke: '#b2e47f'
                    });
                    y += perHeight;
                }, this);

                console.log(items);

                layer.items(items);

            }
        }
    });

    var GroupItem = nx.define(nx.graphic.Group, {
        properties: {
            scale: {},
            top: {},
            left: {},
            label: {},
            width: {},
            height: {},
            stroke: {}
        },
        view: {
            type: 'nx.graphic.Group',
            props: {
                translateY: '{#top}',
                translateX: '{#left}',
                scale: '{#scale}'
            },

            content: [
                {
                    type: 'nx.graphic.Text',
                    props: {
                        text: '{#label}',
                        fill: '{#stroke}',
                        'style': 'font-size:19px',
                        y: -5
                    }
                },
                {
                    type: 'nx.graphic.Rect',
                    props: {
                        width: '{#width}',
                        height: '{#height}',
                        stroke: '{#stroke}'
                    }
                }
            ]
        }
    });

    var Layer = nx.define(nx.graphic.Topology.Layer, {
        properties: {
            items: {}
        },
        view: {
            type: 'nx.graphic.Group',
            content: [
                {
                    type: 'nx.graphic.Group',
                    props: {
                        items: '{#items}',
                        template: {
                            type: GroupItem,
                            props: {
                                top: '{top}',
                                left: '{left}',
                                label: '{label}',
                                width: '{width}',
                                height: '{height}',
                                scale: '{scale}',
                                stroke: '{stroke}',
                                fill: 'none'
                            }
                        }
                    }
                }
            ]
        }
    });

})(nx, nx.global);
(function (nx, global) {
    /**
     * Topology tooltip policy
     * @class nx.graphic.Topology.TooltipPolicy
     */

    nx.define("nx.graphic.Topology.TooltipPolicy", {
        events: [],
        properties: {
            topology: {},
            tooltipManager: {}
        },
        methods: {
            init: function (args) {
                this.inherited(args);
                this.sets(args);
                this._tm = this.tooltipManager();
            },
            pressStage: function () {
                this._tm.closeAll();
            },
            zoomstart: function () {
                this._tm.closeAll();
            },
            clickNode: function (node) {
                this._tm.openNodeTooltip(node);
            },
            clickLinkSetNumber: function (linkSet) {
                this._tm.openLinkSetTooltip(linkSet);
            },
            dragStageStart: function () {
                this._tm.closeAll();
            },
            clickLink: function (link) {
                this._tm.openLinkTooltip(link);
            },
            resizeStage: function () {
                this._tm.closeAll();
            },
            fitStage: function () {
                this._tm.closeAll();
            },
            deleteNode: function () {
                this._tm.closeAll();
            },
            deleteNodeSet: function () {
                this._tm.closeAll();
            }
        }
    });

})(nx, nx.global);
(function (nx, global) {
    /**
     * Basic tooltip class for topology
     * @class nx.graphic.Topology.Tooltip
     * @extend nx.ui.Popover
     */
    nx.define("nx.graphic.Topology.Tooltip", nx.ui.Popover, {
        properties: {
            /**
             * Lazy closing a tooltip
             * @type Boolean
             * @property lazyClose
             */
            lazyClose: {
                value: false
            },
            /**
             * Pin a tooltip
             * @type Boolean
             * @property pin
             */
            pin: {
                value: false
            },
            /**
             * Is tooltip response to resize event
             * @type Boolean
             * @property listenWindow
             */
            listenWindow: {
                value: true
            }
        }
    });
})(nx, nx.global);
(function (nx, global) {
    /**
     * Node tooltip content class
     * @class nx.graphic.NodeTooltipContent
     * @extend nx.ui.Component
     * @module nx.graphic.Topology
     */

    nx.define('nx.graphic.Topology.NodeTooltipContent', nx.ui.Component, {
        properties: {
            node: {
                set: function (value) {
                    var model = value.model();
                    this.view('list').set('items', new nx.data.Dictionary(model.getData()));
                    this.title(value.label());
                }
            },
            topology: {},
            title: {}
        },
        view: {
            content: [
                {
                    name: 'header',
                    props: {
                        'class': 'n-topology-tooltip-header'
                    },
                    content: [
                        {
                            tag: 'span',
                            props: {
                                'class': 'n-topology-tooltip-header-text'
                            },
                            name: 'title',
                            content: '{#title}'
                        }
                    ]
                },
                {
                    name: 'content',
                    props: {
                        'class': 'n-topology-tooltip-content n-list'
                    },
                    content: [
                        {
                            name: 'list',
                            tag: 'ul',
                            props: {
                                'class': 'n-list-wrap',
                                template: {
                                    tag: 'li',
                                    props: {
                                        'class': 'n-list-item-i',
                                        role: 'listitem'
                                    },
                                    content: [
                                        {
                                            tag: 'label',
                                            content: '{key}: '
                                        },
                                        {
                                            tag: 'span',
                                            content: '{value}'
                                        }
                                    ]

                                }
                            }
                        }
                    ]
                }
            ]
        },
        methods: {
            init: function (args) {
                this.inherited(args);
                this.sets(args);
            }
        }
    });
})(nx, nx.global);
(function (nx, global) {
    /**
     * @class nx.graphic.LinkTooltipContent
     * @extend nx.ui.Component
     * @module nx.graphic.Topology
     */
    nx.define("nx.graphic.Topology.LinkTooltipContent", nx.ui.Component, {
        properties: {
            link: {
                set: function (value) {
                    var model = value.model();
                    this.view('list').set('items', new nx.data.Dictionary(model.getData()));
                }
            },
            topology: {},
            tooltipmanager: {}
        },
        view: {
            content: {
                props: {
                    'class': 'n-topology-tooltip-content n-list'
                },
                content: [
                    {
                        name: 'list',
                        tag: 'ul',
                        props: {
                            'class': 'n-list-wrap',
                            template: {
                                tag: 'li',
                                props: {
                                    'class': 'n-list-item-i',
                                    role: 'listitem'
                                },
                                content: [
                                    {
                                        tag: 'label',
                                        content: '{key}: '
                                    },
                                    {
                                        tag: 'span',
                                        content: '{value}'
                                    }
                                ]

                            }
                        }
                    }
                ]
            }
        }
    });


})(nx, nx.global);
(function (nx, global) {
    /**
     * @class nx.graphic.LinkSetTooltipContent
     * @extend nx.ui.Component
     * @module nx.graphic.Topology
     */
    nx.define("nx.graphic.Topology.LinkSetTooltipContent", nx.ui.Component, {
        properties: {
            linkSet: {
                set: function (value) {
                    var items = [];
                    nx.each(value.model().edges(), function (edge) {
                        items.push({
                            item: "Source:" + edge.sourceID() + " Target :" + edge.targetID(),
                            edge: edge});
                    });
                    this.view("list").items(items);
                }
            },
            topology: {}
        },
        view: [
            {
                props: {
                    style: {
                        'maxHeight': '247px',
                        'overflow': 'auto',
                        'overflow-x': 'hidden'
                    }
                },
                content: {
                    name: 'list',
                    props: {
                        'class': 'list-group',
                        style: 'width:200px',
                        template: {
                            tag: 'a',
                            props: {
                                'class': 'list-group-item'
                            },
                            content: '{item}',
                            events: {
                                'click': '{#_click}'
                            }
                        }
                    }
                }
            }
        ],
        methods: {
            _click: function (sender, events) {
                var link = sender.model().edge;
//                this.topology().fire('clickLink', link);
            }
        }
    });


})(nx, nx.global);
(function (nx, global) {


    /**
     * Tooltip manager for topology
     * @class nx.graphic.Topology.TooltipManager
     * @extend nx.data.ObservableObject
     * @module nx.graphic.Topology
     */
    nx.define("nx.graphic.Topology.TooltipManager", {
        events: ['openNodeToolTip', 'closeNodeToolTip', 'openLinkToolTip', 'closeLinkToolTip', 'openLinkSetTooltip', 'closeLinkSetToolTip'],
        properties: {
            /**
             * Get topology
             * @property  topology
             */
            topology: {
                value: null
            },
            /**
             * All tooltip's instance array
             */
            tooltips: {
                value: function () {
                    return new nx.data.ObservableDictionary();
                }
            },
            /**
             * Get node's tooltip
             * @property nodeTooltip
             */
            nodeTooltip: {},
            /**
             * Get link's tooltip
             * @property linkTooltip
             */
            linkTooltip: {},
            /**
             * Get linkSet tooltip
             * @method linkSetTooltip
             */
            linkSetTooltip: {},
            nodeSetTooltip: {},

            /**
             * node tooltip class
             * @property nodeTooltipClass
             */
            nodeTooltipClass: {
                value: 'nx.graphic.Topology.Tooltip'
            },

            /**
             * link tooltip class
             * @property linkTooltipClass
             */
            linkTooltipClass: {
                value: 'nx.graphic.Topology.Tooltip'
            },
            /**
             * linkSet tooltip class
             * @property linkSetTooltipClass
             */
            linkSetTooltipClass: {
                value: 'nx.graphic.Topology.Tooltip'
            },
            nodeSetTooltipClass: {
                value: 'nx.graphic.Topology.Tooltip'
            },
            /**
             * @property nodeTooltipContentClass
             */
            nodeTooltipContentClass: {
                value: 'nx.graphic.Topology.NodeTooltipContent'
            },
            /**
             * @property linkTooltipContentClass
             */
            linkTooltipContentClass: {
                value: 'nx.graphic.Topology.LinkTooltipContent'
            },
            /**
             * @property linkSetTooltipContentClass
             */
            linkSetTooltipContentClass: {
                value: 'nx.graphic.Topology.LinkSetTooltipContent'
            },

            nodeSetTooltipContentClass: {
                value: 'nx.graphic.Topology.NodeSetTooltipContent'
            },
            /**
             * Show/hide node's tooltip
             * @type Boolean
             * @property showNodeTooltip
             */
            showNodeTooltip: {
                value: true
            },
            /**
             * Show/hide link's tooltip
             * @type Boolean
             * @property showLinkTooltip
             */
            showLinkTooltip: {
                value: true
            },
            /**
             * Show/hide linkSet's tooltip
             * @type Boolean
             * @property showLinkSetTooltip
             */
            showLinkSetTooltip: {
                value: true
            },
            showNodeSetTooltip: {
                value: true
            },
            /**
             * Tooltip policy class
             * @property tooltipPolicyClass
             */
            tooltipPolicyClass: {
                get: function () {
                    return this._tooltipPolicyClass !== undefined ? this._tooltipPolicyClass : 'nx.graphic.Topology.TooltipPolicy';
                },
                set: function (value) {
                    if (this._tooltipPolicyClass !== value) {
                        this._tooltipPolicyClass = value;
                        var topology = this.topology();
                        var tooltipPolicyClass = nx.path(global, this.tooltipPolicyClass());
                        if (tooltipPolicyClass) {
                            var tooltipPolicy = new tooltipPolicyClass({
                                topology: topology,
                                tooltipManager: this
                            });
                            this.tooltipPolicy(tooltipPolicy);
                        }
                        return true;
                    } else {
                        return false;
                    }
                }
            },
            tooltipPolicy: {
                value: function () {
                    var topology = this.topology();
                    return new nx.graphic.Topology.TooltipPolicy({
                        topology: topology,
                        tooltipManager: this
                    });
                }
            },
            /**
             * Set/get tooltip's activate statues
             * @property activated
             */
            activated: {
                get: function () {
                    return this._activated !== undefined ? this._activated : true;
                },
                set: function (value) {
                    if (this._activated !== value) {
                        this._activated = value;
                        return true;
                    } else {
                        return false;
                    }
                }
            }
        },
        methods: {

            init: function (args) {

                this.inherited(args);

                this.sets(args);

                this.registerTooltip('nodeTooltip', this.nodeTooltipClass());
                this.registerTooltip('linkTooltip', this.linkTooltipClass());
                this.registerTooltip('linkSetTooltip', this.linkSetTooltipClass());
                this.registerTooltip('nodeSetTooltip', this.nodeSetTooltipClass());


                //build in tooltips


                var nodeTooltip = this.getTooltip('nodeTooltip');
                nodeTooltip.on("close", function () {
                    this.fire("closeNodeToolTip");
                }, this);
                nodeTooltip.view().dom().addClass('n-topology-tooltip');
                this.nodeTooltip(nodeTooltip);


                var linkTooltip = this.getTooltip('linkTooltip');
                linkTooltip.on("close", function () {
                    this.fire("closeLinkToolTip", linkTooltip);
                }, this);
                linkTooltip.view().dom().addClass('n-topology-tooltip');
                this.linkTooltip(linkTooltip);


                var linkSetTooltip = this.getTooltip('linkSetTooltip');
                linkSetTooltip.on("close", function () {
                    this.fire("closeLinkSetToolTip", linkSetTooltip);
                }, this);
                linkSetTooltip.view().dom().addClass('n-topology-tooltip');
                this.linkSetTooltip(linkSetTooltip);


                var nodeSetTooltip = this.getTooltip('nodeSetTooltip');
                nodeSetTooltip.on("close", function () {
                    this.fire("closeNodeSetToolTip");
                }, this);
                nodeSetTooltip.view().dom().addClass('n-topology-tooltip');
                this.nodeSetTooltip(nodeSetTooltip);


                var topology = this.topology();
                var tooltipPolicyClass = nx.path(global, this.tooltipPolicyClass());
                if (tooltipPolicyClass) {
                    var tooltipPolicy = new tooltipPolicyClass({
                        topology: topology,
                        tooltipManager: this
                    });
                    this.tooltipPolicy(tooltipPolicy);
                }
            },
            /**
             * Register tooltip class
             * @param name {String}
             * @param tooltipClass {nx.ui.Component}
             */
            registerTooltip: function (name, tooltipClass) {
                var tooltips = this.tooltips();
                var topology = this.topology();
                var clz = tooltipClass;
                if (nx.is(clz, 'String')) {
                    clz = nx.path(global, tooltipClass);
                }
                var instance = new clz();
                instance.sets({
                    topology: topology,
                    tooltipManager: this,
                    model: topology.graph(),
                    'data-tooltip-type': name
                });
                tooltips.setItem(name, instance);
            },
            /**
             * Get tooltip instance by name
             * @param name {String}
             * @returns {nx.ui.Component}
             */
            getTooltip: function (name) {
                var tooltips = this.tooltips();
                return tooltips.getItem(name);
            },

            executeAction: function (action, data) {
                if (this.activated()) {
                    var tooltipPolicy = this.tooltipPolicy();
                    if (tooltipPolicy && tooltipPolicy[action]) {
                        tooltipPolicy[action].call(tooltipPolicy, data);
                    }
                }
            },
            /**
             * Open a node's tooltip
             * @param node {nx.graphic.Topology.Node}
             * @param position {Object}
             * @method openNodeTooltip
             */
            openNodeTooltip: function (node, position) {
                var topo = this.topology();
                var nodeTooltip = this.nodeTooltip();
                var content;

                nodeTooltip.close(true);

                if (this.showNodeTooltip() === false) {
                    return;
                }


                var pos = position || topo.getAbsolutePosition(node.position());

                var contentClass = nx.path(global, this.nodeTooltipContentClass());
                if (contentClass) {
                    content = new contentClass();
                    content.sets({
                        topology: topo,
                        node: node,
                        model: topo.model()
                    });
                }

                if (content) {
                    nodeTooltip.content(null);
                    content.attach(nodeTooltip);
                }

                var size = node.getBound(true);

                nodeTooltip.open({
                    target: pos,
                    offset: Math.max(size.height, size.width) / 2
                });

                this.fire("openNodeToolTip", node);
            },
            /**
             * Open a nodeSet's tooltip
             * @param nodeSet {nx.graphic.Topology.NodeSet}
             * @param position {Object}
             * @method openNodeSetTooltip
             */
            openNodeSetTooltip: function (nodeSet, position) {
                var topo = this.topology();
                var nodeSetTooltip = this.nodeSetTooltip();
                var content;

                nodeSetTooltip.close(true);

                if (this.showNodeSetTooltip() === false) {
                    return;
                }


                var pos = position || topo.getAbsolutePosition(nodeSet.position());

                var contentClass = nx.path(global, this.nodeSetTooltipContentClass());
                if (contentClass) {
                    content = new contentClass();
                    content.sets({
                        topology: topo,
                        nodeSet: nodeSet,
                        model: topo.model()
                    });
                }

                if (content) {
                    nodeSetTooltip.content(null);
                    content.attach(nodeSetTooltip);
                }

                var size = nodeSet.getBound(true);

                nodeSetTooltip.open({
                    target: pos,
                    offset: Math.max(size.height, size.width) / 2
                });

                this.fire("openNodeSetToolTip", nodeSet);
            },
            /**
             * open a link's tooltip
             * @param link
             * @param position
             * @method openLinkTooltip
             */
            openLinkTooltip: function (link, position) {
                var topo = this.topology();
                var linkTooltip = this.linkTooltip();
                var content;

                linkTooltip.close(true);

                if (this.showLinkTooltip() === false) {
                    return;
                }

                var pos = position || topo.getAbsolutePosition(link.centerPoint());

                var contentClass = nx.path(global, this.linkTooltipContentClass());
                if (contentClass) {
                    content = new contentClass();
                    content.sets({
                        topology: topo,
                        link: link,
                        model: topo.model()
                    });
                }

                if (content) {
                    linkTooltip.content(null);
                    content.attach(linkTooltip);
                }

                linkTooltip.open({
                    target: pos,
                    offset: 4
                });

                this.fire("openLinkToolTip", link);
            },
            /**
             * Open linkSet tooltip
             * @method openLinkSetTooltip
             * @param linkSet
             * @param position
             */
            openLinkSetTooltip: function (linkSet, position) {
                var topo = this.topology();
                var linkSetTooltip = this.linkSetTooltip();
                var content;

                linkSetTooltip.close(true);

                if (this.showLinkSetTooltip() === false) {
                    return;
                }

                var pos = position || topo.getAbsolutePosition(linkSet.centerPoint());
                var contentClass = nx.path(global, this.linkSetTooltipContentClass());
                if (contentClass) {
                    content = new contentClass();
                    content.sets({
                        topology: topo,
                        linkSet: linkSet,
                        model: topo.model()
                    });
                }

                if (content) {
                    linkSetTooltip.content(null);
                    content.attach(linkSetTooltip);
                }

                linkSetTooltip.open({
                    target: pos,
                    offsetX: 0,
                    offsetY: 8
                });

                this.fire("openLinkSetToolTip", linkSet);
            },
            /**
             * Close all tooltip
             * @method closeAll
             */
            closeAll: function () {
                this.tooltips().each(function (obj, name) {
                    obj.value().close(true);
                }, this);
            },
            dispose: function () {
                this.tooltips().each(function (obj, name) {
                    obj.value().close(true);
                    obj.value().dispose();
                }, this);
                this.inherited();
            }
        }
    });


})(nx, nx.global);
(function (nx, global) {

    /**
     * Basic scene class
     * @class nx.graphic.Topology.Scene
     * @extend nx.data.ObservableObject
     */
    nx.define("nx.graphic.Topology.Scene", nx.data.ObservableObject, {
        properties: {
            topology: {
                value: null
            }
        },
        methods: {
            init: function (args) {
                this.sets(args);
            },
            /**
             * Factory function ,entry of a scene
             * @method activate
             */
            activate: function () {

            },
            /**
             * Deactivate a scene
             * @method deactivate
             */
            deactivate: function () {

            }
        }
    });

})(nx, nx.global);
(function (nx, global) {
    /**
     * Default Scene for topology
     * @class nx.graphic.Topology.DefaultScene
     * @extend nx.graphic.Topology.Scene
     */

    nx.define('nx.graphic.Topology.DefaultScene', nx.graphic.Topology.Scene, {
        events: [],
        methods: {
            /**
             * active scene
             * @method activate
             */

            activate: function () {
                this._topo = this.topology();
                this._nodesLayer = this._topo.getLayer('nodes');
                this._nodeSetLayer = this._topo.getLayer('nodeSet');
                this._linksLayer = this._topo.getLayer('links');
                this._linkSetLayer = this._topo.getLayer('linkSet');
                this._groupsLayer = this._topo.getLayer('groups');
                this._tooltipManager = this._topo.tooltipManager();
                this._nodeDragging = false;
                this._sceneTimer = null;
                this._interval = 600;
            },
            deactivate: function () {
                this._tooltipManager.closeAll();
            },
            dispatch: function (eventName, sender, data) {
                this._tooltipManager.executeAction(eventName, data);
            },
            pressStage: function (sender, event) {
            },
            clickStage: function (sender, event) {
                if (event.target == this._topo.stage().view().dom().$dom && !event.shiftKey) {
                    this._topo.selectedNodes().clear();
                }
            },
            dragStageStart: function (sender, event) {
                var nodes = this._nodesLayer.nodes().length;
                if (nodes > 300) {
                    this._linksLayer.hide();
                }
                this._recover();
                this._blockEvent(true);
                nx.dom.Document.html().addClass('n-moveCursor');
            },
            dragStage: function (sender, event) {
                var stage = this._topo.stage();
                stage.applyTranslate(event.drag.delta[0], event.drag.delta[1]);
            },
            dragStageEnd: function (sender, event) {
                this._linksLayer.show();
                this._blockEvent(false);
                nx.dom.Document.html().removeClass('n-moveCursor');
            },
            projectionChange: function () {

            },

            zoomstart: function () {
                var nodes = this._nodesLayer.nodes().length;
                if (nodes > 300) {
                    this._linksLayer.setStyle('display', 'none');
                }
                this._recover();
                //this._topo.adjustLayout();
            },
            zooming: function () {

            },
            zoomend: function () {
                this._linksLayer.setStyle('display', 'block');
                this._topo.adjustLayout();
            },

            beforeSetData: function () {

            },

            afterSetData: function () {

            },


            insertData: function () {

            },


            ready: function () {

            },
            enterNode: function (sender, node) {
                clearTimeout(this._sceneTimer);
                if (!this._nodeDragging) {
                    this._sceneTimer = setTimeout(function () {
                        if (!this._nodeDragging) {
                            this._topo.activeRelatedNode(node);
                        }
                    }.bind(this), this._interval);
                    this._recover();
                }
                nx.dom.Document.body().addClass('n-dragCursor');
            },
            leaveNode: function (sender, node) {
                clearTimeout(this._sceneTimer);
                if (!this._nodeDragging) {
                    this._recover();
                }
                nx.dom.Document.body().removeClass('n-dragCursor');
            },

            hideNode: function (sender, node) {

            },
            dragNodeStart: function (sender, node) {
                this._nodeDragging = true;
                this._blockEvent(true);
                nx.dom.Document.html().addClass('n-dragCursor');
                setTimeout(this._recover.bind(this), 0);
            },
            dragNode: function (sender, node) {
                this._topo._moveSelectionNodes(event, node);
            },
            dragNodeEnd: function () {
                this._nodeDragging = false;
                this._blockEvent(false);
                this._topo.stage().resetFitMatrix();
                nx.dom.Document.html().removeClass('n-dragCursor');
            },

            pressNode: function (sender, node) {
            },
            clickNode: function (sender, node) {
                if (!this._nodeDragging) {
                    if (!event.shiftKey) {
                        this._topo.selectedNodes().clear();
                    }
                    node.selected(!node.selected());
                }
            },
            selectNode: function (sender, node) {
                var selectedNodes = this._topo.selectedNodes();
                if (node.selected()) {
                    if (selectedNodes.indexOf(node) == -1) {
                        this._topo.selectedNodes().add(node);
                    }
                } else {
                    if (selectedNodes.indexOf(node) !== -1) {
                        this._topo.selectedNodes().remove(node);
                    }
                }
            },

            updateNodeCoordinate: function () {

            },


            enterLink: function (sender, events) {
            },

            pressNodeSet: function (sender, nodeSet) {
            },
            clickNodeSet: function (sender, nodeSet) {
                clearTimeout(this._sceneTimer);
                this._recover();
                if (event.shiftKey) {
                    nodeSet.selected(!nodeSet.selected());
                } else {
                    nodeSet.collapsed(false);
                }
            },

            enterNodeSet: function (sender, nodeSet) {
                clearTimeout(this._sceneTimer);
                if (!this._nodeDragging) {
                    this._sceneTimer = setTimeout(function () {
                        this._topo.activeRelatedNode(nodeSet);
                    }.bind(this), this._interval);
                }
            },
            leaveNodeSet: function (sender, nodeSet) {
                clearTimeout(this._sceneTimer);
                if (!this._nodeDragging) {
                    this._recover();
                }
            },
            beforeExpandNodeSet: function (sender, nodeSet) {

                this._blockEvent(true);
                //update parent group
                var parentNodeSet = nodeSet.parentNodeSet();
                while (parentNodeSet && parentNodeSet.group) {
                    var group = parentNodeSet.group;
                    group.clear();
                    group.nodes(nx.util.values(parentNodeSet.nodes()));
                    group.draw();
                    parentNodeSet = parentNodeSet.parentNodeSet();
                }
                this._recover();
            },
            expandNodeSet: function (sender, nodeSet) {
                clearTimeout(this._sceneTimer);
                this._recover();
                this._topo.stage().resetFitMatrix();
                this._topo.fit(function () {
                    nodeSet.group = this._groupsLayer.addGroup({
                        shapeType: 'nodeSetPolygon',
                        nodeSet: nodeSet,
                        nodes: nx.util.values(nodeSet.nodes()),
                        label: nodeSet.label(),
                        color: '#9BB150',
                        id: nodeSet.id()
                    });
                    var parentNodeSet = nodeSet.parentNodeSet();
                    while (parentNodeSet && parentNodeSet.group) {
                        parentNodeSet.group.draw();
                        parentNodeSet = parentNodeSet.parentNodeSet();
                    }

                    this._blockEvent(false);
                    this._topo.adjustLayout();

                }, this, nodeSet.animation() ? 1.5 : false);

                //
            },
            beforeCollapseNodeSet: function (sender, nodeSet) {
                this._blockEvent(true);
                if (nodeSet.group) {
                    this._groupsLayer.removeGroup(nodeSet.id());
                    delete nodeSet.group;
                }

                nx.each(nodeSet.nodeSets(), function (ns, id) {
                    if (ns.group) {
                        this._groupsLayer.removeGroup(ns.id());
                        delete ns.group;
                    }
                }, this);

                this._topo.fadeIn();
                this._recover();
            },
            collapseNodeSet: function (sender, nodeSet) {
                var parentNodeSet = nodeSet.parentNodeSet();
                while (parentNodeSet && parentNodeSet.group) {
                    var group = parentNodeSet.group;
                    group.clear();
                    group.nodes(nx.util.values(parentNodeSet.nodes()));
                    parentNodeSet = parentNodeSet.parentNodeSet();
                }

                this._topo.stage().resetFitMatrix();
                this._topo.fit(function () {
                    this._blockEvent(false);
                }, this, nodeSet.animation() ? 1.5 : false);
            },
            removeNodeSet: function (sender, nodeSet) {
                if (nodeSet.group) {
                    this._groupsLayer.removeGroup(nodeSet.id());
                    delete nodeSet.group;
                }
                this._topo.stage().resetFitMatrix();
            },
            updateNodeSet: function (sender, nodeSet) {
                if (nodeSet.group) {
                    nodeSet.group.clear();
                    nodeSet.group.nodes(nx.util.values(nodeSet.nodes()));
                }

            },
            dragNodeSetStart: function (sender, nodeSet) {
                this._nodeDragging = true;
                this._recover();
                this._blockEvent(true);
                nx.dom.Document.html().addClass('n-dragCursor');
            },
            dragNodeSet: function (sender, nodeSet) {
                this._topo._moveSelectionNodes(event, nodeSet);
            },
            dragNodeSetEnd: function () {
                this._nodeDragging = false;
                this._blockEvent(false);
                nx.dom.Document.html().removeClass('n-dragCursor');
                this._topo.stage().resetFitMatrix();
            },
            selectNodeSet: function (sender, nodeSet) {
                var selectedNodes = this._topo.selectedNodes();
                if (nodeSet.selected()) {
                    if (selectedNodes.indexOf(nodeSet) == -1) {
                        this._topo.selectedNodes().add(nodeSet);
                    }
                } else {
                    if (selectedNodes.indexOf(nodeSet) !== -1) {
                        this._topo.selectedNodes().remove(nodeSet);
                    }
                }
            },

            addNode: function () {
                this._topo.stage().resetFitMatrix();
                this._topo.adjustLayout();
            },
            addNodeSet: function () {
                this._topo.stage().resetFitMatrix();
//                this._topo.fit();
                this._topo.adjustLayout();

            },
            removeNode: function () {
                this._topo.adjustLayout();
            },

            dragGroupStart: function (sender, group) {
            },

            dragGroup: function (sender, group) {
                if (event) {
                    var stageScale = this._topo.stageScale();
                    group.updateNodesPosition(event.drag.delta[0], event.drag.delta[1]);
                    group.move(event.drag.delta[0] * stageScale, event.drag.delta[1] * stageScale);
                }
            },

            dragGroupEnd: function (sender, group) {
            },
            clickGroupLabel: function (sender, group) {

            },
            collapseNodeSetGroup: function (sender, group) {
                var nodeSet = group.nodeSet();
                if (nodeSet) {
                    nodeSet.collapsed(true);
                }
            },

            enterGroup: function (sender, group) {
                if (nx.is(group, 'nx.graphic.Topology.NodeSetPolygonGroup')) {
                    var ns = group.nodeSet();
                    this._topo.activeNodes(nx.util.values(ns.nodes()));
                    this._topo.fadeOut();
                    this._groupsLayer.fadeOut();

                    group.view().dom().addClass('fade-active-item');
                }
            },
            leaveGroup: function (sender, group) {
                group.view().dom().removeClass('fade-active-item');
                this._topo.fadeIn();
                this._topo.recoverActive();
            },


            right: function (sender, events) {
                this._topo.move(30, null, 0.5);
            },
            left: function (sender, events) {
                this._topo.move(-30, null, 0.5);
            },
            up: function () {
                this._topo.move(null, -30, 0.5);
            },
            down: function () {
                this._topo.move(null, 30, 0.5);
            },
            pressR: function () {
                if (nx.DEBUG) {
                    this._topo.activateLayout('force');
                }
            },
            pressA: function () {
                if (nx.DEBUG) {
                    var nodes = this._topo.selectedNodes().toArray();
                    this._topo.selectedNodes().clear();
                    this._topo.aggregationNodes(nodes);
                }
            },
            pressS: function () {
                if (nx.DEBUG) {
                    this._topo.activateScene('selection');
                }
            },
            pressM: function () {
                if (nx.DEBUG) {
                    this._topo.activateScene('default');
                }
            },
            pressF: function () {
                if (nx.DEBUG) {
                    this._topo.fit();
                }
            },
            topologyGenerated: function () {
                this._topo.adjustLayout();
            },
            _recover: function () {
                this._topo.fadeIn();
                this._topo.recoverActive();
            },
            _blockEvent: function (value) {
                this._topo.blockEvent(value);
            }
        }
    });
})(nx, nx.global);

(function (nx, global) {


    /**
     * Selection scene
     * @class nx.graphic.Topology.SelectionScene
     * @extend nx.graphic.Topology.Scene
     */
    nx.define("nx.graphic.Topology.SelectionScene", nx.graphic.Topology.DefaultScene, {
        methods: {
            /**
             * Entry
             * @method activate
             */

            activate: function (args) {
                this.appendRect();
                this.inherited(args);
                this.topology().dom().addClass('n-crosshairCursor');

            },
            deactivate: function () {
                this.inherited();
                this.rect.dispose();
                delete this.rect;
                this.topology().dom().removeClass('n-crosshairCursor');
                nx.dom.Document.html().removeClass('n-crosshairCursor');
            },
            _dispatch: function (eventName, sender, data) {
                if (this[eventName]) {
                    this[eventName].call(this, sender, data);
                }
            },
            appendRect: function () {
                var topo = this.topology();
                if (!this.rect) {
                    this.rect = new nx.graphic.Rect({
                        'class': 'selectionRect'
                    });
                    this.rect.attach(topo.stage().staticLayer());
                }
                this.rect.sets({
                    x: 0,
                    y: 0,
                    width: 0,
                    height: 0
                });
            },
            dragStageStart: function (sender, event) {
                this.rect.set('visible', true);
                this._blockEvent(true);
                nx.dom.Document.html().addClass('n-crosshairCursor');
            },
            dragStage: function (sender, event) {
                var rect = this.rect;
                var origin = event.drag.origin;
                var size = event.drag.offset;
                // check if width negative
                if (size[0] < 0) {
                    rect.set('x', origin[0] + size[0]);
                    rect.set('width', -size[0]);
                } else {
                    rect.set('x', origin[0]);
                    rect.set('width', size[0]);
                }
                if (size[1] < 0) {
                    rect.set('y', origin[1] + size[1]);
                    rect.set('height', -size[1]);
                } else {
                    rect.set('y', origin[1]);
                    rect.set('height', size[1]);
                }
            },
            dragStageEnd: function (sender, event) {
                this._stageTranslate = null;
                this.rect.set('visible', false);
                this._blockEvent(false);
                nx.dom.Document.html().removeClass('n-crosshairCursor');
            },
            _getRectBound: function () {
                var rectbound = this.rect.getBoundingClientRect();
                var topoBound = this.topology().getBound();
                return {
                    top: rectbound.top - topoBound.top,
                    left: rectbound.left - topoBound.left,
                    width: rectbound.width,
                    height: rectbound.height,
                    bottom: rectbound.bottom - topoBound.top,
                    right: rectbound.right - topoBound.left
                };
            },
            esc: {

            },
            clickNodeSet: function (sender, nodeSet) {},
            dragNode: function () {

            },
            dragNodeSet: function () {

            },
            _blockEvent: function (value) {
                if (value) {
                    this.topology().scalable(false);
                    nx.dom.Document.body().addClass('n-userselect n-blockEvent');
                } else {
                    this.topology().scalable(true);
                    nx.dom.Document.body().removeClass('n-userselect');
                    nx.dom.Document.body().removeClass('n-blockEvent');
                }
            }
        }
    });


})(nx, nx.global);

(function(nx, global) {

    /**
     * Selection node scene
     * @class nx.graphic.Topology.SelectionNodeScene
     * @extend nx.graphic.Topology.SelectionScene
     */

    nx.define('nx.graphic.Topology.SelectionNodeScene', nx.graphic.Topology.SelectionScene, {
        properties: {
            /**
             * Get all selected nodes
             * @property selectedNodes
             */
            selectedNodes: {
                get: function() {
                    return this.topology().selectedNodes();
                }
            }
        },
        methods: {

            activate: function() {
                this.inherited();
                var tooltipManager = this._tooltipManager;
                tooltipManager.activated(false);
            },
            deactivate: function() {
                this.inherited();
                var tooltipManager = this._tooltipManager;
                tooltipManager.activated(true);
            },

            pressStage: function(sender, event) {
                var selectedNodes = this.selectedNodes();
                var multi = this._multi = event.metaKey || event.ctrlKey || event.shiftKey;
                if (!multi) {
                    selectedNodes.clear();
                }

                event.captureDrag(sender.stage().view(), this.topology().stage());
            },
            enterNode: function() {

            },
            clickNode: function(sender, node) {},
            dragStageStart: function(sender, event) {
                this.inherited(sender, event);
                var selectedNodes = this.selectedNodes();
                var multi = this._multi = event.metaKey || event.ctrlKey || event.shiftKey;
                if (!multi) {
                    selectedNodes.clear();
                }
                this._prevSelectedNodes = this.selectedNodes().toArray().slice();
            },
            dragStage: function(sender, event) {
                this.inherited(sender, event);
                this.selectNodeByRect(this.rect.getBound());
            },
            selectNode: function(sender, node) {
                if (node.selected()) {
                    this._topo.selectedNodes().add(node);
                } else {
                    this._topo.selectedNodes().remove(node);
                }
            },
            selectNodeSet: function(sender, nodeset) {
                if (nodeset.selected()) {
                    this._topo.selectedNodes().add(nodeset);
                } else {
                    this._topo.selectedNodes().remove(nodeset);
                }
            },


            pressNode: function(sender, node) {
                if (node.enable()) {
                    var selectedNodes = this.selectedNodes();
                    this._multi = event.metaKey || event.ctrlKey || event.shiftKey;
                    if (!this._multi) {
                        selectedNodes.clear();
                    }
                    node.selected(!node.selected());
                }
            },
            pressNodeSet: function(sender, nodeSet) {
                if (nodeSet.enable()) {
                    var selectedNodes = this.selectedNodes();
                    this._multi = event.metaKey || event.ctrlKey || event.shiftKey;
                    if (!this._multi) {
                        selectedNodes.clear();
                    }
                    nodeSet.selected(!nodeSet.selected());
                }
            },
            selectNodeByRect: function(bound) {
                this.topology().eachNode(function(node) {
                    if (node.model().type() == 'vertexSet' && !node.collapsed()) {
                        return;
                    }
                    var nodeBound = node.getBound();
                    // FIXME for firefox bug with g.getBoundingClientRect
                    if (nx.util.isFirefox()) {
                        var position = [node.x(), node.y()];
                        var svgbound = this.topology().stage().dom().getBound();
                        var matrix = this.topology().stage().matrix();
                        position = nx.geometry.Vector.transform(position, matrix);
                        nodeBound.x = nodeBound.left = position[0] + svgbound.left - nodeBound.width / 2;
                        nodeBound.right = nodeBound.left + nodeBound.width;
                        nodeBound.y = nodeBound.top = position[1] + svgbound.top - nodeBound.height / 2;
                        nodeBound.bottom = nodeBound.top + nodeBound.height;
                    }
                    var nodeSelected = node.selected();
                    if (this._hittest(bound, nodeBound)) {
                        if (!nodeSelected) {
                            node.selected(true);
                        }
                    } else {
                        if (this._multi) {
                            if (this._prevSelectedNodes.indexOf(node) == -1) {
                                if (nodeSelected) {
                                    node.selected(false);
                                }
                            }
                        } else {
                            if (nodeSelected) {
                                node.selected(false);
                            }
                        }
                    }
                }, this);
            },
            collapseNodeSetGroup: function(sender, group) {

            },
            enterGroup: function(sender, group) {

            },
            _hittest: function(sourceBound, targetBound) {
                var t = targetBound.top >= sourceBound.top && targetBound.top <= ((sourceBound.top + sourceBound.height)),
                    l = targetBound.left >= sourceBound.left && targetBound.left <= (sourceBound.left + sourceBound.width),
                    b = (sourceBound.top + sourceBound.height) >= (targetBound.top + targetBound.height) && (targetBound.top + targetBound.height) >= sourceBound.top,
                    r = (sourceBound.left + sourceBound.width) >= (targetBound.left + targetBound.width) && (targetBound.left + targetBound.width) >= sourceBound.left,
                    hm = sourceBound.top >= targetBound.top && (sourceBound.top + sourceBound.height) <= (targetBound.top + targetBound.height),
                    vm = sourceBound.left >= targetBound.left && (sourceBound.left + sourceBound.width) <= (targetBound.left + targetBound.width);

                return (t && l) || (b && r) || (t && r) || (b && l) || (t && vm) || (b && vm) || (l && hm) || (r && hm);
            }
        }
    });

})(nx, nx.global);
(function (nx, global) {

    /**
     * Zoom by selection scene
     * @class nx.graphic.Topology.ZoomBySelection
     * @extend nx.graphic.Topology.SelectionScene
     */
    nx.define("nx.graphic.Topology.ZoomBySelection", nx.graphic.Topology.SelectionScene, {
        events: ['finish'],
        properties: {
        },
        methods: {
            activate: function (args) {
                this.inherited(args);
                nx.dom.Document.html().addClass('n-zoomInCursor');
            },
            deactivate: function () {
                this.inherited();
                nx.dom.Document.html().removeClass('n-zoomInCursor');
            },
            dragStageEnd: function (sender, event) {
                var bound = this.rect.getBound();
                this.inherited(sender, event);

                this.fire('finish', bound);
            },
            esc: function () {
                this.fire('finish');
            }
        }
    });


})(nx, nx.global);
(function (nx, global) {


    var shapeMap = {
        'rect': 'nx.graphic.Topology.RectGroup',
        'circle': 'nx.graphic.Topology.CircleGroup',
        'polygon': 'nx.graphic.Topology.PolygonGroup',
        'nodeSetPolygon': 'nx.graphic.Topology.NodeSetPolygonGroup'
    };


    var colorTable = ['#C3A5E4', '#75C6EF', '#CBDA5C', '#ACAEB1 ', '#2CC86F'];
    //    var colorTable = ['#75C6EF', '#75C6EF', '#75C6EF', '#75C6EF ', '#75C6EF'];


    /**
     * Topology group layer class

     var groupsLayer = topo.getLayer('groups');
     var nodes1 = [0, 1];
     var group1 = groupsLayer.addGroup({
                    nodes: nodes1,
                    label: 'Rect',
                    color: '#f00'
                });
     group1.on('clickGroupLabel', function (sender, events) {
                    console.log(group1.nodes());
                }, this);

     *
     * @class nx.graphic.Topology.GroupsLayer
     * @extend nx.graphic.Topology.Layer
     * @module nx.graphic.Topology
     */

    nx.define('nx.graphic.Topology.GroupsLayer', nx.graphic.Topology.Layer, {
        statics: {
            /**
             * Default color table, with 5 colors
             * @property colorTable
             * @static
             */
            colorTable: colorTable
        },
        events: ['dragGroupStart', 'dragGroup', 'dragGroupEnd', 'clickGroupLabel', 'enterGroup', 'leaveGroup', 'collapseNodeSetGroup'],
        properties: {
            shapeType: 'polygon',
            /**
             * Groups elements
             * @property groupItems {nx.data.ObservableDictionary}
             */
            groupItems: {
                value: function () {
                    var dict = new nx.data.ObservableDictionary();
                    dict.on('change', function (sender, args) {
                        var action = args.action;
                        var items = args.items;
                        if (action == 'clear') {
                            nx.each(items, function (item) {
                                var group = item.value();
                                if (group) {
                                    group.dispose();
                                }

                            });
                        }
                    }, this);
                    return dict;
                }
            },
            /**
             * groups data
             * @property groups {Array}
             */
            groups: {
                get: function () {
                    return this._groups || [];
                },
                set: function (value) {
                    if (nx.is(value, Array)) {
                        nx.each(value, function (item) {
                            this.addGroup(item);
                        }, this);
                        this._groups = value;
                    }
                }
            }
        },
        methods: {

            /**
             * Register a group item class
             * @param name {String} group items' name
             * @param className {Object} which should extend nx.graphic.Topology.GroupItem
             */
            registerGroupItem: function (name, className) {
                shapeMap[name] = className;
            },


            attach: function (args) {
                this.inherited(args);
                var topo = this.topology();
                topo.on('afterFitStage', this._redraw.bind(this), this);
                topo.on('zoomend', this._redraw.bind(this), this);
                topo.on('collapseNode', this._redraw.bind(this), this);
                topo.on('expandNode', this._redraw.bind(this), this);
                topo.watch('revisionScale', this._redraw.bind(this), this);
                topo.watch('showIcon', this._redraw.bind(this), this);
            },
            /**
             * Add a group to group layer
             * @param obj {Object} config of a group
             */
            addGroup: function (obj) {
                var groupItems = this.groupItems();
                var shape = obj.shapeType || this.shapeType();
                var nodes = obj.nodes;

                var GroupClass = nx.path(global, shapeMap[shape]);
                var group = new GroupClass({
                    'topology': this.topology()
                });

                var config = nx.clone(obj);

                if (!config.color) {
                    config.color = colorTable[groupItems.count() % 5];
                }
                delete config.nodes;
                delete config.shapeType;

                group.sets(config);
                group.attach(this);


                group.nodes(nodes);

                var id = config.id || group.__id__;

                groupItems.setItem(id, group);

                var events = ['dragGroupStart', 'dragGroup', 'dragGroupEnd', 'clickGroupLabel', 'enterGroup', 'leaveGroup', 'collapseNodeSetGroup'];

                nx.each(events, function (e) {
                    group.on(e, function (sender, event) {
                        if (event instanceof MouseEvent) {
                            window.event = event;
                        }
                        this.fire(e, group);
                    }, this);
                }, this);


                return group;

            },
            _redraw: function () {
                this.groupItems().each(function (item) {
                    item.value()._draw();
                }, this);
            },
            /**
             * Remove a group
             * @method removeGroup
             * @param id
             */
            removeGroup: function (id) {
                var groupItems = this.groupItems();
                var group = groupItems.getItem(id);
                if (group) {
                    group.dispose();
                    groupItems.removeItem(id);
                }
            },
            /**
             * Get a group by id
             * @method getGroup
             * @param id
             * @returns {*}
             */
            getGroup: function (id) {
                return this.groupItems().getItem(id);
            },
            /**
             * Iterate all group
             * @method eachGroupItem
             * @param callBack
             * @param context
             */
            eachGroupItem: function (callBack, context) {
                this.groupItems().each(function (item) {
                    callBack.call(context || this, item.value(), item.key());
                }, this);
            },
            /**
             * clear all group
             * @clear
             */
            clear: function () {
                this.groupItems().clear();
                this.inherited();
            },
            dispose: function () {
                this.clear();
                var topo = this.topology();
                topo.off('collapseNode', this._redraw.bind(this), this);
                topo.off('expandNode', this._redraw.bind(this), this);
                topo.off('zoomend', this._redraw.bind(this), this);
                topo.off('fitStage', this._redraw.bind(this), this);
                topo.unwatch('revisionScale', this._redraw.bind(this), this);
                topo.unwatch('showIcon', this._redraw.bind(this), this);
                this.inherited();
            }

        }
    });


})(nx, nx.global);

(function (nx, global) {

    /**
     *
     * Base group shape class
     * @class nx.graphic.Topology.GroupItem
     * @extend nx.graphic.Component
     * @module nx.graphic.Topology.Group
     *
     */


    nx.define("nx.graphic.Topology.GroupItem", nx.graphic.Group, {
        events: [],
        properties: {
            /**
             * Topology
             * @property topology
             * @readyOnly
             */
            topology: {

            },
            /**
             * Node array in the shape
             * @property nodes {Array}
             */
            nodes: {
                get: function () {
                    return this._nodes || [];
                },
                set: function (value) {
                    var topo = this.topology();
                    var graph = topo.graph();
                    var vertices = this.vertices();
                    if (nx.is(value, Array) || nx.is(value, nx.data.ObservableCollection)) {

                        //
                        nx.each(value, function (value) {
                            var vertex;
                            if (nx.is(value, nx.graphic.Topology.AbstractNode)) {
                                vertex = value.model();
                            } else if (graph.getVertex(value)) {
                                vertex = graph.getVertex(value);
                            }

                            if (vertex && vertices.indexOf(vertex) == -1) {
                                vertices.push(vertex);
                            }

                        }, this);

                        //
                        nx.each(vertices, function (vertex) {
                            this.attachEvent(vertex);
                        }, this);

                        this.draw();


                    }
                    this._nodes = value;
                }
            },
            vertices: {
                value: function () {
                    return [];
                }
            },
            /**
             * Shape's color
             * @property color
             */
            color: {

            },
            /**
             * Group's label
             * @property label
             */
            label: {

            },
            blockDrawing: {
                value: false
            }
        },
        view: {

        },
        methods: {
            attachEvent: function (vertex) {
                vertex.watch('generated', this._draw, this);
                vertex.on('updateCoordinate', this._draw, this);
            },
            detachEvent: function (vertex) {
                vertex.unwatch('generated', this._draw, this);
                vertex.off('updateCoordinate', this._draw, this);
            },
            getNodes: function () {
                var nodes = [];
                var topo = this.topology();
                nx.each(this.vertices(), function (vertex) {
                    if (vertex.generated()) {
                        var node = topo.getNode(vertex.id());
                        if (node) {
                            nodes.push(node);
                        }
                    }
                });
                return nodes;
            },
            addNode: function (value) {
                var vertex;
                var topo = this.topology();
                var graph = topo.graph();
                var vertices = this.vertices();

                if (nx.is(value, nx.graphic.Topology.AbstractNode)) {
                    vertex = value.model();
                } else if (graph.getVertex(value)) {
                    vertex = graph.getVertex(value);
                }

                if (vertex && vertices.indexOf(vertex) == -1) {
                    vertices.push(vertex);
                    this.attachEvent(vertex);
                    this.draw();
                }

            },
            removeNode: function (value) {
                var vertex;
                var topo = this.topology();
                var graph = topo.graph();
                var vertices = this.vertices();
                var nodes = this.nodes();

                if (nx.is(value, nx.graphic.Topology.AbstractNode)) {
                    vertex = value.model();
                } else if (graph.getVertex(value)) {
                    vertex = graph.getVertex(value);
                }

                if (vertex && vertices.indexOf(vertex) != -1) {
                    vertices.splice(vertices.indexOf(vertex), 1);
                    this.detachEvent(vertex);
                    if (nx.is(nodes, Array)) {
                        var id = vertex.id();
                        var node = topo.getNode(id);
                        if (nodes.indexOf(id) !== -1) {
                            nodes.splice(nodes.indexOf(id), 1);
                        } else if (node && nodes.indexOf(node) !== -1) {
                            nodes.splice(nodes.indexOf(node), 1);
                        } else {
                            //todo throw error
                        }

                    }

                    this.draw();

                }


            },
            _draw: function () {
                if (!this.blockDrawing()) {
                    this.draw();
                }
            },
            draw: function () {
                if (this.getNodes().length === 0) {
                    this.hide();
                } else {
                    this.show();
                }
            },
            updateNodesPosition: function (x, y) {
                var stageScale = this.topology().stageScale();
                nx.each(this.getNodes(), function (node) {
                    node.move(x * stageScale, y * stageScale);
                });
            },
            clear: function () {
                nx.each(this.vertices(), function (vertex) {
                    this.detachEvent(vertex);
                }, this);
                this.vertices([]);
                this.nodes([]);
            },
            dispose: function () {
                this.clear();
                this.inherited();
            }
        }
    });


})(nx, nx.global);
(function (nx, global) {

    /**
     * Rectangle shape group class
     * @class nx.graphic.Topology.RectGroup
     * @extend nx.graphic.Topology.GroupItem
     * @module nx.graphic.Topology.Group
     *
     */


    nx.define('nx.graphic.Topology.RectGroup', nx.graphic.Topology.GroupItem, {
        events: ['dragGroupStart', 'dragGroup', 'dragGroupEnd', 'clickGroupLabel', 'enterGroup', 'leaveGroup'],
        view: {
            type: 'nx.graphic.Group',
            props: {
                'class': 'group'
            },
            content: [
                {
                    name: 'shape',
                    type: 'nx.graphic.Rect',
                    props: {
                        'class': 'bg'
                    },
                    events: {
                        'mousedown': '{#_mousedown}',
                        'dragstart': '{#_dragstart}',
                        'dragmove': '{#_drag}',
                        'dragend': '{#_dragend}'
                    }
                },
                {
                    name: 'text',
                    type: 'nx.graphic.Group',
                    content: {
                        name: 'label',
                        type: 'nx.graphic.Text',
                        props: {
                            'class': 'groupLabel',
                            text: '{#label}'
                        },
                        events: {
                            'click': '{#_clickLabel}'
                        }
                    }
                }
            ]
        },
        properties: {
        },
        methods: {

            draw: function () {
                this.inherited();
                this.setTransform(0, 0);

                var topo = this.topology();
                var stageScale = topo.stageScale();
                var revisionScale = topo.revisionScale();
                var translate = {
                    x: topo.matrix().x(),
                    y: topo.matrix().y()
                };
                var bound = topo.getBoundByNodes(this.getNodes());
                if (bound == null) {
                    return;
                }
                bound.left -= translate.x;
                bound.top -= translate.y;
                var shape = this.view('shape');
                shape.sets({
                    x: bound.left,
                    y: bound.top,
                    width: bound.width,
                    height: bound.height,
                    fill: this.color(),
                    stroke: this.color(),
                    scale: topo.stageScale()
                });


                var text = this.view('text');


                text.setTransform((bound.left + bound.width / 2) * stageScale, (bound.top - 12) * stageScale, stageScale);
                text.view().dom().setStyle('fill', this.color());

                this.view('label').view().dom().setStyle('font-size', 11);
            },
            _clickLabel: function (sender, event) {
                this.fire('clickGroupLabel');
            },
            _mousedown: function (sender, event) {
                event.captureDrag(this.view('shape'),this.topology().stage());
            },
            _dragstart: function (sender, event) {
                this.blockDrawing(true);
                this.fire('dragGroupStart', event);
            },
            _drag: function (sender, event) {
                this.fire('dragGroup', event);
            },
            _dragend: function (sender, event) {
                this.blockDrawing(false);
                this.fire('dragGroupEnd', event);
            }
        }
    });


})(nx, nx.global);
(function (nx, global) {
    /**
     * Circle shape group class
     * @class nx.graphic.Topology.CircleGroup
     * @extend nx.graphic.Topology.GroupItem
     * @module nx.graphic.Topology.Group
     *
     */
    nx.define('nx.graphic.Topology.CircleGroup', nx.graphic.Topology.GroupItem, {
        events: ['dragGroupStart', 'dragGroup', 'dragGroupEnd', 'clickGroupLabel', 'enterGroup', 'leaveGroup'],
        view: {
            type: 'nx.graphic.Group',
            props: {
                'class': 'group'
            },
            content: [
                {
                    name: 'shape',
                    type: 'nx.graphic.Circle',
                    props: {
                        'class': 'bg'
                    },
                    events: {
                        'mousedown': '{#_mousedown}',
                        'touchstart': '{#_mousedown}',
                        'dragstart': '{#_dragstart}',
                        'dragmove': '{#_drag}',
                        'dragend': '{#_dragend}'
                    }
                },
                {
                    name: 'text',
                    type: 'nx.graphic.Group',
                    content: {
                        name: 'label',
                        type: 'nx.graphic.Text',
                        props: {
                            'class': 'groupLabel',
                            text: '{#label}'
                        },
                        events: {
                            'click': '{#_clickLabel}'
                        }
                    }
                }
            ]
        },
        methods: {

            draw: function () {


                this.inherited();
                this.setTransform(0, 0);

                var topo = this.topology();
                var revisionScale = topo.revisionScale();
                var translate = {
                    x: topo.matrix().x(),
                    y: topo.matrix().y()
                };
                var bound = topo.getBoundByNodes(this.getNodes());
                if (bound == null) {
                    return;
                }
                var radius = Math.sqrt(Math.pow(bound.width / 2, 2) + Math.pow(bound.height / 2, 2));

                var shape = this.view('shape');
                shape.sets({
                    cx: bound.left - translate.x + bound.width / 2,
                    cy: bound.top - translate.y + bound.height / 2,
                    r: radius,
                    fill: this.color(),
                    stroke: this.color(),
                    scale: topo.stageScale()
                });


                var text = this.view('text');
                var stageScale = topo.stageScale();
                bound.left -= translate.x;
                bound.top -= translate.y;

                text.setTransform((bound.left + bound.width / 2) * stageScale, (bound.top + bound.height / 2 - radius - 12) * stageScale, stageScale);
                text.view().dom().setStyle('fill', this.color());

                this.view('label').view().dom().setStyle('font-size', 11);


                this.setTransform(0, 0);
            },
            _clickLabel: function (sender, event) {
                this.fire('clickGroupLabel');
            },
            _mousedown: function (sender, event) {
                event.captureDrag(this.view('shape'), this.topology().stage());
            },
            _dragstart: function (sender, event) {
                this.blockDrawing(true);
                this.fire('dragGroupStart', event);
            },
            _drag: function (sender, event) {
                this.fire('dragGroup', event);
            },
            _dragend: function (sender, event) {
                this.blockDrawing(false);
                this.fire('dragGroupEnd', event);
            }
        }
    });


})(nx, nx.global);
(function (nx, global) {


    /**
     * Polygon shape group class
     * @class nx.graphic.Topology.PolygonGroup
     * @extend nx.graphic.Topology.GroupItem
     * @module nx.graphic.Topology.Group
     *
     */

    nx.define('nx.graphic.Topology.PolygonGroup', nx.graphic.Topology.GroupItem, {
        events: ['dragGroupStart', 'dragGroup', 'dragGroupEnd', 'clickGroupLabel', 'enterGroup', 'leaveGroup'],
        view: {
            type: 'nx.graphic.Group',
            props: {
                'class': 'group'
            },
            content: [
                {
                    name: 'shape',
                    type: 'nx.graphic.Polygon',
                    props: {
                        'class': 'bg'
                    },
                    events: {
                        'mousedown': '{#_mousedown}',
                        'dragstart': '{#_dragstart}',
                        'dragmove': '{#_drag}',
                        'dragend': '{#_dragend}'
                    }
                },
                {
                    name: 'text',
                    type: 'nx.graphic.Group',
                    content: {
                        name: 'label',
                        type: 'nx.graphic.Text',
                        props: {
                            'class': 'nodeSetGroupLabel',
                            text: '{#label}',
                            style: {
                                'alignment-baseline': 'central',
                                'text-anchor': 'middle',
                                'font-size': 12
                            }
                        },
                        events: {
                            'click': '{#_clickLabel}'
                        }
                    }
                }
            ],
            events: {
                'mouseenter': '{#_mouseenter}',
                'mouseleave': '{#_mouseleave}'
            }
        },
        properties: {
            shape: {
                get: function () {
                    return this.view('shape');
                }
            }
        },
        methods: {

            draw: function () {

                this.inherited();
                this.setTransform(0, 0);


                var topo = this.topology();
                var stageScale = topo.stageScale();
                var revisionScale = topo.revisionScale();
                var translate = {
                    x: topo.matrix().x(),
                    y: topo.matrix().y()
                };
                var vectorArray = [];
                nx.each(this.getNodes(), function (node) {
                    if (node.visible()) {
                        vectorArray.push({x: node.model().x(), y: node.model().y()});
                    }
                });
                var shape = this.view('shape');

                shape.sets({
                    fill: this.color()
                });
                shape.dom().setStyle('stroke', this.color());
                shape.dom().setStyle('stroke-width', 60 * stageScale * revisionScale);
                shape.nodes(vectorArray);


                var bound = topo.getInsideBound(shape.getBound());
                bound.left -= translate.x;
                bound.top -= translate.y;
                bound.left *= stageScale;
                bound.top *= stageScale;
                bound.width *= stageScale;
                bound.height *= stageScale;


                var text = this.view('text');
                text.setTransform(bound.left + bound.width / 2, bound.top - 40 * stageScale * revisionScale, stageScale);

                this.view('label').view().dom().setStyle('font-size', 11);

                text.view().dom().setStyle('fill', this.color());
            },
            _clickLabel: function (sender, event) {
                this.fire('clickGroupLabel');
            },
            _mousedown: function (sender, event) {
                event.captureDrag(this.view('shape'),this.topology().stage());
            },
            _dragstart: function (sender, event) {
                this.blockDrawing(true);
                this.fire('dragGroupStart', event);
            },
            _drag: function (sender, event) {
                this.fire('dragGroup', event);
            },
            _dragend: function (sender, event) {
                this.blockDrawing(false);
                this.fire('dragGroupEnd', event);
            }
        }
    });


})(nx, nx.global);
(function(nx, global) {


    /**
     * Polygon shape group class
     * @class nx.graphic.Topology.PolygonGroup
     * @extend nx.graphic.Topology.GroupItem
     * @module nx.graphic.Topology.Group
     *
     */

    nx.define('nx.graphic.Topology.NodeSetPolygonGroup', nx.graphic.Topology.GroupItem, {
        events: ['dragGroupStart', 'dragGroup', 'dragGroupEnd', 'clickGroupLabel', 'enterGroup', 'leaveGroup', 'collapseNodeSetGroup'],
        view: {
            type: 'nx.graphic.Group',
            props: {
                'class': 'group aggregationGroup'
            },
            content: [{
                    name: 'shape',
                    type: 'nx.graphic.Polygon',
                    props: {
                        'class': 'bg'
                    }
                }, {
                    name: 'icons',
                    type: 'nx.graphic.Group',
                    content: [{
                        name: 'minus',
                        type: 'nx.graphic.Group',
                        content: {
                            name: 'minusIcon',
                            type: 'nx.graphic.Icon',
                            props: {
                                iconType: 'collapse'
                            }
                        },
                        events: {
                            'click': '{#_collapse}'
                        }
                    }, {
                        name: 'nodeIcon',
                        type: 'nx.graphic.Group',
                        content: {
                            name: 'nodeIconImg',
                            type: 'nx.graphic.Icon',
                            props: {
                                iconType: 'nodeSet',
                                scale: 1
                            }
                        }
                    }, {
                        name: 'labelContainer',
                        type: 'nx.graphic.Group',
                        content: {
                            name: 'label',
                            type: 'nx.graphic.Text',
                            props: {
                                'class': 'nodeSetGroupLabel',
                                text: '{#label}',
                                style: {
                                    'alignment-baseline': 'central',
                                    'text-anchor': 'start',
                                    'font-size': 12
                                },
                                visible: false
                            },
                            events: {
                                'click': '{#_clickLabel}'
                            }
                        },
                        events: {

                        }
                    }],
                    events: {
                        'mouseenter': '{#_mouseenter}',
                        'mouseleave': '{#_mouseleave}',
                        'mousedown': '{#_mousedown}',
                        'touchstart': '{#_mousedown}',
                        'dragstart': '{#_dragstart}',
                        'dragmove': '{#_drag}',
                        'dragend': '{#_dragend}'
                    }
                },
                //                {
                //                    name: 'bg',
                //                    type: 'nx.graphic.Rect',
                //                    props: {
                //                        fill: '#f00',
                //                        'opacity': '0.1'
                //                    }
                //                }

            ]
        },
        properties: {
            nodeSet: {},
            topology: {},
            opacity: {
                set: function(value) {
                    var opacity = Math.max(value, 0.1);
                    //                    this.view('shape').dom().setStyle('opacity', opacity);
                    //                    this.view('minus').dom().setStyle('opacity', opacity);
                    //                    this.view('nodeIcon').dom().setStyle('opacity', opacity);
                    //                    this.view('labelContainer').dom().setStyle('opacity', opacity);
                    this._opacity = value;
                }
            },
            shape: {
                get: function() {
                    return this.view('shape');
                }
            }
            //            color: {
            //                set: function (value) {
            //                    var text = this.view('labelContainer');
            //                    text.view().dom().setStyle('fill', value);
            //                    var shape = this.view('shape');
            //                    shape.sets({
            //                        fill: value
            //                    });
            //                    shape.dom().setStyle('stroke', value);
            //                    this._color = value;
            //                }
            //            }
        },
        methods: {
            getNodes: function() {
                return nx.util.values(this.nodeSet().nodes());
            },
            draw: function() {
                this.inherited();
                this.setTransform(0, 0);

                var topo = this.topology();
                var stageScale = topo.stageScale();
                var translate = {
                    x: topo.matrix().x(),
                    y: topo.matrix().y()
                };


                var vectorArray = [];
                nx.each(this.getNodes(), function(node) {
                    if (node.visible()) {
                        vectorArray.push({
                            x: node.model().x(),
                            y: node.model().y()
                        });
                    }
                });
                var shape = this.view('shape');
                //                shape.sets({
                //                    fill: this.color()
                //                });
                //                shape.dom().setStyle('stroke', this.color());
                //
                shape.nodes(vectorArray);

                var bound = topo.getInsideBound(shape.getBound());
                bound.left -= translate.x;
                bound.top -= translate.y;
                bound.left *= stageScale;
                bound.top *= stageScale;
                bound.width *= stageScale;
                bound.height *= stageScale;

                //                this.view('bg').sets({
                //                    x: bound.left,
                //                    y: bound.top,
                //                    width: bound.width,
                //                    height: bound.height
                //                });

                var minus = this.view('minus');
                var label = this.view('label');
                var nodeIcon = this.view('nodeIcon');
                var nodeIconImg = this.view('nodeIconImg');
                var labelContainer = this.view('labelContainer');


                if (topo.showIcon() && topo.revisionScale() > 0.6) {

                    shape.dom().setStyle('stroke-width', 60 * stageScale);


                    nodeIconImg.set('iconType', this.nodeSet().iconType());
                    //                    nodeIconImg.set('color', this.color());

                    var iconSize = nodeIconImg.size();

                    nodeIcon.visible(true);

                    if (nx.util.isFirefox()) {
                        minus.setTransform(bound.left + bound.width / 2, bound.top - iconSize.height * stageScale / 2 + 8 * stageScale, 1 * stageScale);
                        nodeIcon.setTransform(bound.left + bound.width / 2 + 3 * stageScale + iconSize.width * stageScale / 2, bound.top - iconSize.height * stageScale / 2 - 0 * stageScale, 0.5 * stageScale);


                    } else {
                        minus.setTransform(bound.left + bound.width / 2, bound.top - iconSize.height * stageScale / 2 - 22 * stageScale, 1 * stageScale);
                        nodeIcon.setTransform(bound.left + bound.width / 2 + 3 * stageScale + iconSize.width * stageScale / 2, bound.top - iconSize.height * stageScale / 2 - 22 * stageScale, 0.5 * stageScale);
                    }




                    label.sets({
                        x: bound.left + bound.width / 2 - 3 * stageScale + iconSize.width * stageScale,
                        y: bound.top - iconSize.height * stageScale / 2 - 22 * stageScale
                    });
                    label.view().dom().setStyle('font-size', 16 * stageScale);
                    //                    labelContainer.view().dom().setStyle('fill', this.color());

                } else {

                    shape.dom().setStyle('stroke-width', 30 * stageScale);

                    if (nx.util.isFirefox()) {
                        minus.setTransform(bound.left + bound.width / 2, bound.top - 29 * stageScale / 2, stageScale);
                    } else {
                        minus.setTransform(bound.left + bound.width / 2, bound.top - 45 * stageScale / 2, stageScale);
                    }

                    nodeIcon.visible(false);

                    label.sets({
                        x: bound.left + bound.width / 2 + 12 * stageScale,
                        y: bound.top - 45 * stageScale / 2
                    });
                    label.view().dom().setStyle('font-size', 16 * stageScale);

                }


                //                this.view('minusIcon').color(this.color());

            },
            _clickLabel: function(sender, event) {
                this.fire('clickGroupLabel');
            },
            _mousedown: function(sender, event) {
                event.captureDrag(this.view('icons'), this.topology().stage());
            },
            _dragstart: function(sender, event) {
                this.blockDrawing(true);
                this.fire('dragGroupStart', event);
            },
            _drag: function(sender, event) {
                this.fire('dragGroup', event);
                if (!this.view('minus').dom().$dom.contains(event.srcElement)) {
                    this._dragMinusIcon = true;
                }
            },
            _dragend: function(sender, event) {
                this.blockDrawing(false);
                this.fire('dragGroupEnd', event);

            },
            _collapse: function() {
                if(!this._dragMinusIcon){
                    this.fire('collapseNodeSetGroup', event);
                }
                this._dragMinusIcon = false;
            },
            _mouseenter: function(sender, event) {
                this.fire('enterGroup');
            },
            _mouseleave: function(sender, event) {
                this.fire('leaveGroup');
            }
        }
    });


})(nx, nx.global);
(function(nx, global) {

    var Vector = nx.geometry.Vector;
    var Line = nx.geometry.Line;
    var colorIndex = 0;
    var colorTable = ['#b2e47f', '#e4e47f', '#bec2f9', '#b6def7', '#89f0de'];
    /**
     * A topology path class
     Path's background colors : ['#b2e47f', '#e4e47f', '#bec2f9', '#b6def7', '#89f0de']
     * @class nx.graphic.Topology.Path
     * @extend nx.graphic.Component
     * @module nx.graphic.Topology
     */

    nx.define("nx.graphic.Topology.Path", nx.graphic.Component, {
        view: {
            type: 'nx.graphic.Group',
            content: {
                name: 'path',
                type: 'nx.graphic.Path'
            }
        },
        properties: {
            /**
             * get/set links's style ,default value is
             value: {
                    'stroke': '#666',
                    'stroke-width': '1px'
                }

             * @property pathStyle
             */
            pathStyle: {
                value: {
                    'stroke': '#666',
                    'stroke-width': '0px'
                }
            },
            /**
             * Get/set a path's width
             * @property pathWidth
             */
            pathWidth: {
                value: "auto"
            },
            /**
             * Get/set a path's offset
             * @property pathGutter
             */
            pathGutter: {
                value: 13
            },
            /**
             * Get/set a path's padding to a node
             * @property pathPadding
             */
            pathPadding: {
                value: "auto"
            },
			pathColor: {
				get: function(){
					return this._pathStyle.color ? this._pathStyle.color : null;
				},
				set: function(userColor){
					var hexColorRE = /#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})/;
					// if it is a HEX-format color
					if(hexColorRE.test(userColor)){
						this.view("path").setStyle("fill", userColor);
						this._pathStyle.color = userColor;
					}
					else{
						console.warning("Color must be in HEX format, e.g.: #ffe4cc");
						this._setRandomColor();
					}
				}
			},
            /**
             * Get/set path arrow type , 'none'/'cap'/'full'/'end'
             * @property
             */
            arrow: {
                value: 'none'
            },
            /**
             * Get/set links to draw a path pver it
             * @property links
             */
            links: {
                value: [],
                set: function(value) {
                    this._links = value;
                    this.edgeIdCollection().clear();
                    var edges = [];
                    if (nx.is(value, "Array") || nx.is(value, nx.data.Collection)) {
                        nx.each(value, function(item) {
                            edges.push(item.model().id());
                        }.bind(this));
                        this.edgeIdCollection().addRange(edges);
                    }
                    this.draw();
                }
            },
            edgeIdCollection: {
                value: function() {
                    var allEdges, verticesIdCollection, collection = new nx.data.ObservableCollection();
                    var watcher = function(pname, pvalue) {
                        this.draw();
                    }.bind(this);
                    collection.on("change", function(sender, evt) {
                        var waitForTopology = function(pname, pvalue) {
                            if (!pvalue) {
                                return;
                            }
                            this.unwatch("topology", waitForTopology);
                            allEdges = allEdges || nx.path(this, "topology.graph.edges");
                            verticesIdCollection = this.verticesIdCollection();
                            var diff = [];
                            if (evt.action === "add") {
                                nx.each(evt.items, function(item) {
                                    var edge = allEdges.getItem(item);
                                    edge.watch("generated", watcher);
                                    diff.push(edge.sourceID());
                                    diff.push(edge.targetID());
                                }.bind(this));
                                // update vertices
                                nx.each(diff, function(id) {
                                    if (!verticesIdCollection.contains(id)) {
                                        verticesIdCollection.add(id);
                                    }
                                });
                            } else {
                                nx.each(evt.items, function(item) {
                                    var edge = allEdges.getItem(item);
                                    if (edge) {
                                        edge.unwatch("generated", watcher);
                                    }
                                }.bind(this));
                                // update vertices
                                // TODO improve this algorithm
                                verticesIdCollection.clear();
                                nx.each(collection, function(id) {
                                    var edge = allEdges.getItem(id);
                                    if (edge && verticesIdCollection.contains(edge.sourceID())) {
                                        verticesIdCollection.add(edge.sourceID());
                                    }
                                    if (edge && verticesIdCollection.contains(edge.targetID())) {
                                        verticesIdCollection.add(edge.targetID());
                                    }
                                }.bind(this));
                            }
                        }.bind(this);
                        if (!this.topology()) {
                            this.watch("topology", waitForTopology);
                        } else {
                            waitForTopology("topology", this.topology());
                        }
                    }.bind(this));
                    return collection;
                }
            },
            verticesIdCollection: {
                value: function() {
                    var allVertices, collection = new nx.data.ObservableCollection();
                    var watcher = function(pname, pvalue) {
                        this.draw();
                    }.bind(this);
                    collection.on("change", function(sender, evt) {
                        allVertices = allVertices || nx.path(this, "topology.graph.vertices");
                        if (evt.action === "add") {
                            nx.each(evt.items, function(item) {
                                var vertex = allVertices.getItem(item);
                                if (vertex) {
                                    vertex.watch("position", watcher);
                                }
                            }.bind(this));
                        } else {
                            nx.each(evt.items, function(item) {
                                var vertex = allVertices.getItem(item);
                                if (vertex) {
                                    vertex.unwatch("position", watcher);
                                }
                            }.bind(this));
                        }
                    }.bind(this));
                    return collection;
                }
            },
            /**
             * Reverse path direction
             * @property reverse
             */
            reverse: {
                value: false
            },
            owner: {

            },
            topology: {}
        },
        methods: {
            init: function(props) {
                this.inherited(props);
                var pathStyle = this.pathStyle();
                this.view("path").sets(pathStyle);

				// if user passed a distinct color
				if(props.color){
					this.pathColor(props.color);
				}
				else{
					this._setRandomColor();
				}
            },
            /**
             * Draw a path,internal
             * @method draw
             */
            draw: function() {
                if (!this.topology()) {
                    return;
                }
                var generated = true,
                    topo = this.topology(),
                    allEdges = nx.path(this, "topology.graph.edges"),
                    allVertices = nx.path(this, "topology.graph.vertices");
                nx.each(this.verticesIdCollection(), function(id) {
                    var item = allVertices.getItem(id);
                    if (!item.generated()) {
                        generated = false;
                        return false;
                    }
                }.bind(this));
                nx.each(this.edgeIdCollection(), function(id) {
                    var item = allEdges.getItem(id);
                    if (!item.generated()) {
                        generated = false;
                        return false;
                    }
                }.bind(this));
                if (!generated) {
                    this.view("path").set('d', "M0 0");
                    return;
                }

                var link, line1, line2, pt, d1 = [],
                    d2 = [];
                var stageScale = this.topology().stageScale();
                var pathWidth = this.pathWidth();
                var pathPadding = this.pathPadding();
                var paddingStart, paddingEnd;
                var arrow = this.arrow();
                var v1, v2;


                var edgeIds = this.edgeIdCollection();
                var links = [];
                nx.each(edgeIds, function(id) {
                    links.push(topo.getLink(id));
                });
                var linksSequentialArray = this._serializeLinks(links);
                var count = links.length;

                //first
                var firstLink = links[0];

                var offset = firstLink.getOffset();
                if (firstLink.reverse()) {
                    offset *= -1;
                }

                offset = new Vector(0, this.reverse() ? offset * -1 : offset);

                line1 = linksSequentialArray[0].translate(offset);


                if (pathPadding === "auto") {
                    paddingStart = Math.min(firstLink.sourceNode().showIcon() ? 24 : 4, line1.length() / 4 / stageScale);
                    paddingEnd = Math.min(firstLink.targetNode().showIcon() ? 24 : 4, line1.length() / 4 / stageScale);
                } else if (nx.is(pathPadding, 'Array')) {
                    paddingStart = pathPadding[0];
                    paddingEnd = pathPadding[1];
                } else {
                    paddingStart = paddingEnd = pathPadding;
                }
                if (typeof paddingStart == 'string' && paddingStart.indexOf('%') > 0) {
                    paddingStart = line1.length() * stageScale * parseInt(paddingStart, 10) / 100 / stageScale;
                }

                if (pathWidth === "auto") {
                    pathWidth = Math.min(10, Math.max(3, Math.round(3 / stageScale))); //3/stageScale
                }
                pathWidth *= 1.5 * stageScale;
                v1 = new Vector(0, pathWidth / 2);
                v2 = new Vector(0, -pathWidth / 2);

                paddingStart *= stageScale;

                pt = line1.translate(v1).pad(paddingStart, 0).start;
                d1.push('M', pt.x, pt.y);
                pt = line1.translate(v2).pad(paddingStart, 0).start;
                d2.unshift('L', pt.x, pt.y, 'Z');

                if (links.length > 1) {
                    for (var i = 1; i < count; i++) {
                        link = links[i];
                        line2 = linksSequentialArray[i].translate(new Vector(0, link.getOffset()));
                        pt = line1.translate(v1).intersection(line2.translate(v1));

                        if (isFinite(pt.x) && isFinite(pt.y)) {
                            d1.push('L', pt.x, pt.y);
                        }
                        pt = line1.translate(v2).intersection(line2.translate(v2));
                        if (isFinite(pt.x) && isFinite(pt.y)) {
                            d2.unshift('L', pt.x, pt.y);
                        }
                        line1 = line2;
                    }
                } else {
                    line2 = line1;
                }

                if (typeof paddingEnd == 'string' && paddingEnd.indexOf('%') > 0) {
                    paddingEnd = line2.length() * parseInt(paddingEnd, 10) / 100 / stageScale;
                }

                paddingEnd *= stageScale;

                if (arrow == 'cap') {
                    pt = line2.translate(v1).pad(0, 2.5 * pathWidth + paddingEnd).end;
                    d1.push('L', pt.x, pt.y);
                    pt = pt.add(line2.normal().multiply(pathWidth / 2));
                    d1.push('L', pt.x, pt.y);

                    pt = line2.translate(v2).pad(0, 2.5 * pathWidth + paddingEnd).end;
                    d2.unshift('L', pt.x, pt.y);
                    pt = pt.add(line2.normal().multiply(-pathWidth / 2));
                    d2.unshift('L', pt.x, pt.y);

                    pt = line2.pad(0, paddingEnd).end;
                    d1.push('L', pt.x, pt.y);
                } else if (arrow == 'end') {
                    pt = line2.translate(v1).pad(0, 2 * pathWidth + paddingEnd).end;
                    d1.push('L', pt.x, pt.y);

                    pt = line2.translate(v2).pad(0, 2 * pathWidth + paddingEnd).end;
                    d2.unshift('L', pt.x, pt.y);

                    pt = line2.pad(0, paddingEnd).end;
                    d1.push('L', pt.x, pt.y);
                } else if (arrow == 'full') {
                    pt = line2.pad(0, paddingEnd).end;
                    d1.push('L', pt.x, pt.y);
                } else {
                    pt = line2.translate(v1).pad(0, paddingEnd).end;
                    d1.push('L', pt.x, pt.y);
                    pt = line2.translate(v2).pad(0, paddingEnd).end;
                    d2.unshift('L', pt.x, pt.y);
                }

                this.view("path").set('d', d1.concat(d2).join(' '));
                //this.view("path").setTransform(null, null, this.topology().stageScale());

                //todo
                //                if (links.length == 1) {
                //                    firstLink.view().watch("opacity", function (prop, value) {
                //                        if (this.$ && this.view("path") && this.view("path").opacity) {
                //                            this.view("path").opacity(value);
                //                        }
                //                    }, this);
                //                }
            },

            _serializeLinks: function(links) {
                var linksSequentialArray = [];
                var len = links.length;

                if (this.reverse()) {
                    linksSequentialArray.push(new Line(links[0].targetVector(), links[0].sourceVector()));
                } else {
                    linksSequentialArray.push(new Line(links[0].sourceVector(), links[0].targetVector()));
                }

                for (var i = 1; i < len; i++) {
                    var firstLink = links[i - 1];
                    var secondLink = links[i];
                    var firstLinkSourceVector = firstLink.sourceVector();
                    var firstLinkTargetVector = firstLink.targetVector();
                    var secondLinkSourceVector = secondLink.sourceVector();
                    var secondLinkTargetVector = secondLink.targetVector();

                    if (firstLink.targetNodeID() == secondLink.sourceNodeID()) {
                        linksSequentialArray.push(new Line(secondLinkSourceVector, secondLinkTargetVector));
                    } else if (firstLink.targetNodeID() == secondLink.targetNodeID()) {
                        linksSequentialArray.push(new Line(secondLinkTargetVector, secondLinkSourceVector));
                    } else if (firstLink.sourceNodeID() == secondLink.sourceNodeID()) {
                        linksSequentialArray.pop();
                        linksSequentialArray.push(new Line(firstLinkTargetVector, firstLinkSourceVector));
                        linksSequentialArray.push(new Line(secondLinkSourceVector, secondLinkTargetVector));
                    } else {
                        linksSequentialArray.pop();
                        linksSequentialArray.push(new Line(firstLinkTargetVector, firstLinkSourceVector));
                        linksSequentialArray.push(new Line(secondLinkTargetVector, secondLinkSourceVector));
                    }
                }

                if (this.reverse()) {
                    linksSequentialArray.reverse();
                }

                return linksSequentialArray;
            },
			_setRandomColor: function() {
				var color = colorTable[colorIndex++ % 5];
				this.pathColor(color);
				return color;
			},
            isEqual: function(pos1, pos2) {
                return pos1.x == pos2.x && pos1.y == pos2.y;
            },
            dispose: function() {
                this.edgeIdCollection().clear();
                nx.each(this.nodes, function(node) {
                    node.off('updateNodeCoordinate', this.draw, this);
                }, this);
                this.inherited();
            }
        }
    });
})(nx, nx.global);
(function (nx, global) {

    /**
     * Base path class.
     * @class nx.graphic.Topology.BasePath
     * @extend nx.graphic.BasePath
     * @module nx.graphic.Topology
     */

    nx.define("nx.graphic.Topology.BasePath", nx.graphic.Component, {
        events: [],
        properties: {
            /**
             * nodes to over path
             * @property nodes
             */
            nodes: {},
            /**
             * path 'd' generator function
             * @property pathGenerator
             */
            pathGenerator: {
                value: function () {
                    return function () {

                    };
                }
            },
            /**
             * path style object
             * @property path style
             *
             */
            pathStyle: {
                value: function () {
                    return {
                        'stroke': '#666',
                        'stroke-width': 2,
                        fill: 'none'
                    };
                }
            },
            /**
             * topology reference
             * @property topology
             */
            topology: {}
        },
        view: {
            type: 'nx.graphic.Group',
            content: {
                name: 'path',
                type: 'nx.graphic.Path',
                props: {

                }
            }
        },
        methods: {
            attach: function (parent) {
                this.inherited(parent);
                var watcher = this._nodesWatcher = new nx.graphic.Topology.NodeWatcher();
                watcher.observePosition(true);
                watcher.topology(this.topology());
                watcher.updater(this._draw.bind(this));
                watcher.nodes(this.nodes());

                //watcher
                this.view("path").dom().setStyles(this.pathStyle());
            },
            _draw: function () {
                var pathEL = this.view('path');
                var nodes = this._nodesWatcher.getNodes();
                if (nodes.length == this.nodes().length) {
                    var topo = this.topology();
                    var pathStyle = this.pathStyle();
                    var d = this.pathGenerator().call(this);
                    if (d) {
                        pathEL.set('d', d);
                        pathEL.visible(true);
                        var strokeWidth = parseInt(pathStyle['stroke-width'], 10) || 1;
                        pathEL.dom().setStyle('stroke-width', strokeWidth * topo.stageScale());
                    }
                } else {
                    pathEL.visible(false);
                }


            },
            draw: function () {
                this._draw();
            }
        }
    });
})(nx, nx.global);
(function(nx, global) {
    var Vector = nx.geometry.Vector;
    var Line = nx.geometry.Line;

    /**
     * Path over nodeset, has limited use scene
     * @class nx.graphic.Topology.NodeSetPath
     * @extend nx.graphic.BasePath
     * @module nx.graphic.Topology
     */

    nx.define("nx.graphic.Topology.NodeSetPath", nx.graphic.Topology.BasePath, {
        properties: {
            /**
             * arrow style, could be null, cap, end
             * @property {String}
             */
            arrow: {
                value: null
            },
            pathGenerator: {
                value: function() {
                    return function() {
                        var nodes = this.nodes();
                        var topo = this.topology();
                        if (!topo || !nodes) {
                            return;
                        }
                        var graph = topo.graph();
                        var visibleNodes = [];
                        nodes.forEach(function(id) {
                            var vertex = graph.getVertex(id);
                            if (!vertex.generated()) {
                                vertex = vertex.generatedRootVertexSet();
                            }
                            var node = topo.getNode(vertex.id());
                            if (visibleNodes.indexOf(node) == -1) {
                                visibleNodes.push(node);
                            }
                        });
                        var arrow = this.arrow();
                        var pathStyle = this.pathStyle();
                        var stageScale = topo.stageScale();
                        var revisionScale = topo.revisionScale();
                        var padding = (topo.showIcon() ? 20 : 8) * stageScale * revisionScale;
                        var strokeWidth = (parseInt(pathStyle['stroke-width'], 10) || 1) * stageScale;
                        var visibleNodesLength = visibleNodes.length;
                        var d = this._dArray = [];

                        for (var i = 0; i < visibleNodesLength - 1; i++) {
                            var sourceNode = visibleNodes[i];
                            var targetNode = visibleNodes[i + 1];
                            var line = new Line(sourceNode.vector(), targetNode.vector());
                            // padding start
                            if (i === 0) {
                                line = line.pad(padding, 0);
                                d.push('M', line.start.x, line.start.y);
                            } else if (i == visibleNodesLength - 2) {
                                line = line.pad(0, arrow ? padding + strokeWidth : padding);
                                d.push('L', line.start.x, line.start.y);
                                d.push('L', line.end.x, line.end.y);
                            } else {
                                d.push('L', line.start.x, line.start.y);
                            }
                        }

                        this._drawArrow();
                        return d.join(" ");
                    };
                }
            }
        },
        methods: {
            attach: function(parent) {
                this.inherited(parent);
                var el = this._arrowEL = new nx.graphic.Path();
                el.attach(this);

            },
            _drawArrow: function() {
                var arrow = this.arrow();

                if (!this._arrowEL || !arrow) {
                    return;
                }
                var arrowD = [];
                var d = this._dArray;
                var len = d.length;
                var topo = this.topology();
                var pathStyle = this.pathStyle();
                var stageScale = topo.stageScale();
                var revisionScale = topo.revisionScale();
                var strokeWidth = (parseInt(pathStyle['stroke-width'], 10) || 1) * stageScale;
                var line = new Line(new Vector(d[len - 5], d[len - 4]), new Vector(d[len - 2], d[len - 1]));
                var v1, v2, v3;

                if (arrow == 'cap') {
                    v1 = new Vector(0, -strokeWidth);
                    v2 = new Vector(strokeWidth, strokeWidth);
                    v3 = new Vector(-strokeWidth, strokeWidth);
                    arrowD.push('M', line.end.x, line.end.y);
                    line = line.translate(v1);
                    arrowD.push('L', line.end.x, line.end.y);
                    line = line.translate(v2);
                    arrowD.push('L', line.end.x, line.end.y);
                    line = line.translate(v3);
                    arrowD.push('L', line.end.x, line.end.y);
                    arrowD.push('Z');
                    this._arrowEL.set('d', arrowD.join(" "));
                    this._arrowEL.dom().setStyle('stroke-width', 1 * stageScale);
                    this._arrowEL.dom().setStyle('fill', pathStyle.stroke);
                    this._arrowEL.dom().setStyle('stroke', pathStyle.stroke);

                } else if (arrow == 'end') {
                    v1 = new Vector(0, -strokeWidth / 2);
                    v2 = new Vector(strokeWidth, strokeWidth / 2);
                    v3 = new Vector(-strokeWidth, strokeWidth / 2);
                    arrowD.push('M', line.end.x, line.end.y);
                    line = line.translate(v1);
                    arrowD.push('L', line.end.x, line.end.y);
                    line = line.translate(v2);
                    arrowD.push('L', line.end.x, line.end.y);
                    line = line.translate(v3);
                    arrowD.push('L', line.end.x, line.end.y);
                    arrowD.push('Z');
                    this._arrowEL.set('d', arrowD.join(" "));
                    this._arrowEL.dom().setStyle('stroke-width', 1 * stageScale);
                    this._arrowEL.dom().setStyle('fill', pathStyle.stroke);
                    this._arrowEL.dom().setStyle('stroke', pathStyle.stroke);
                }

            }

        }

    });
})(nx, window);
(function (nx, global) {
    var util = nx.util;
    /**
     * Path layer class
     Could use topo.getLayer("pathLayer") get this
     * @class nx.graphic.Topology.PathLayer
     * @extend nx.graphic.Topology.Layer
     * @module nx.graphic.Topology
     */
    nx.define("nx.graphic.Topology.PathLayer", nx.graphic.Topology.Layer, {
        properties: {

            /**
             * Path array
             * @property paths
             */
            paths: {
                value: function () {
                    return [];
                }
            }
        },
        methods: {
            attach: function (args) {
                this.attach.__super__.apply(this, arguments);
                var topo = this.topology();
                topo.on('zoomend', this._draw, this);
                topo.watch('revisionScale', this._draw, this);

            },
            _draw: function () {
                nx.each(this.paths(), function (path) {
                    path.draw();
                });
            },
            /**
             * Add a path to topology
             * @param path {nx.graphic.Topology.Path}
             * @method addPath
             */
            addPath: function (path) {
                this.paths().push(path);
                path.topology(this.topology());
                path.attach(this);
                path.draw();
            },
            /**
             * Remove a path
             * @method removePath
             * @param path
             */
            removePath: function (path) {
                this.paths().splice(this.paths().indexOf(path), 1);
                path.dispose();
            },
            clear: function () {
                nx.each(this.paths(), function (path) {
                    path.dispose();
                });
                this.paths([]);
                this.inherited();
            },
            dispose: function () {
                this.clear();
                var topo = this.topology();
                topo.off('zoomend', this._draw, this);
                topo.unwatch('revisionScale', this._draw, this);
                this.inherited();
            }
        }
    });


})(nx, nx.global);

(function(nx, global) {


    nx.define("nx.graphic.Topology.Nav", nx.ui.Component, {
        properties: {
            topology: {
                get: function() {
                    return this.owner();
                }
            },
            scale: {},
            showIcon: {
                value: false
            },
            visible: {
                get: function() {
                    return this._visible !== undefined ? this._visible : true;
                },
                set: function(value) {
                    this.view().dom().setStyle("display", value ? "" : "none");
                    this.view().dom().setStyle("pointer-events", value ? "all" : "none");
                    this._visible = value;
                }
            }
        },

        view: {
            props: {
                'class': 'n-topology-nav'
            },
            content: [{
                name: 'icons',
                tag: "ul",
                content: [{
                        tag: 'li',
                        content: {
                            name: 'mode',
                            tag: 'ul',
                            props: {
                                'class': 'n-topology-nav-mode'
                            },
                            content: [{
                                name: 'selectionMode',
                                tag: 'li',
                                content: {
                                    props: {
                                        'class': 'n-icon-selectnode',
                                        title: "Select node mode"
                                    },
                                    tag: 'span'
                                },
                                events: {
                                    'mousedown': '{#_switchSelectionMode}',
                                    'touchstart': '{#_switchSelectionMode}'
                                }

                            }, {
                                name: 'moveMode',
                                tag: 'li',
                                props: {
                                    'class': 'n-topology-nav-mode-selected'
                                },
                                content: {
                                    props: {
                                        'class': 'n-icon-movemode',
                                        title: "Move mode"

                                    },
                                    tag: 'span'
                                },
                                events: {
                                    'mousedown': '{#_switchMoveMode}',
                                    'touchstart': '{#_switchMoveMode}'
                                }

                            }]
                        }
                    }, {
                        tag: 'li',
                        props: {
                            'class': 'n-topology-nav-zoom'
                        },
                        content: [{
                                name: 'zoomin',
                                tag: 'li',
                                props: {
                                    'class': 'n-topology-nav-zoom-in n-icon-zoomin-plus',
                                    title: "Zoom out"
                                },
                                events: {
                                    'click': '{#_in}',
                                    'touchend': '{#_in}'
                                }
                            }, {
                                name: 'zoomout',
                                tag: 'li',
                                props: {
                                    'class': 'n-topology-nav-zoom-out n-icon-zoomout-minus',
                                    title: "Zoom in"
                                },
                                events: {
                                    'click': '{#_out}',
                                    'touchend': '{#_out}'
                                }
                            }, {
                                name: 'fit',
                                tag: 'li',
                                props: {
                                    'class': 'n-topology-nav-fit n-icon-fitstage',
                                    title: "Fit stage"
                                },
                                events: {
                                    'click': '{#_fit}',
                                    'touchend': '{#_fit}'
                                }
                            }, {
                                name: 'zoomselection',
                                tag: 'li',
                                props: {
                                    'class': 'n-topology-nav-zoom-selection n-icon-zoombyselection',
                                    title: "Zoom by selection"
                                },
                                events: {
                                    'click': '{#_zoombyselection}',
                                    'touchend': '{#_zoombyselection}'
                                }
                            }
                        ]
                    }
                ]
            }]
        },
        methods: {
            init: function(args) {
                this.inherited(args);
            },
            attach: function(args) {
                this.inherited(args);
                var topo = this.topology();
                topo.watch('scale', function(prop, scale) {
                    var maxScale = topo.maxScale();
                    var minScale = topo.minScale();
                    var navBall = this.view("zoomball").view();
                    var step = 65 / (maxScale - minScale);
                    navBall.setStyles({
                        top: 72 - (scale - minScale) * step + 14
                    });
                }, this);

                topo.watch('currentSceneName', function(prop, currentSceneName) {
                    if (currentSceneName == 'selection') {
                        this.view("selectionMode").dom().addClass("n-topology-nav-mode-selected");
                        this.view("moveMode").dom().removeClass("n-topology-nav-mode-selected");
                    } else {
                        this.view("selectionMode").dom().removeClass("n-topology-nav-mode-selected");
                        this.view("moveMode").dom().addClass("n-topology-nav-mode-selected");
                    }
                }, this);
            },
            _switchSelectionMode: function(sender, event) {
                var topo = this.topology();
                var currentSceneName = topo.currentSceneName();
                if (currentSceneName != 'selection') {
                    topo.activateScene('selection');
                    this._prevSceneName = currentSceneName;
                }
            },
            _switchMoveMode: function(sender, event) {
                var topo = this.topology();
                var currentSceneName = topo.currentSceneName();
                if (currentSceneName == 'selection') {
                    topo.activateScene(this._prevSceneName || 'default');
                    this._prevSceneName = null;
                }
            },
            _fit: function(sender, event) {
                if (!this._fitTimer) {
                    this.topology().fit();
                }
            },
            _zoombyselection: function(sender, event) {
                var icon = sender;
                var topo = this.topology();
                var currentSceneName = topo.currentSceneName();

                if (currentSceneName == 'zoomBySelection') {
                    icon.dom().removeClass('n-topology-nav-zoom-selection-selected');
                    topo.activateScene('default');
                } else {
                    var scene = topo.activateScene('zoomBySelection');
                    scene.upon('finish', function fn(sender, bound) {
                        if (bound) {
                            topo.zoomByBound(topo.getInsideBound(bound));
                        }
                        topo.activateScene(currentSceneName);
                        icon.dom().removeClass('n-topology-nav-zoom-selection-selected');
                        scene.off('finish', fn, this);
                    }, this);
                    icon.dom().addClass('n-topology-nav-zoom-selection-selected');
                }
            },
            _in: function(sender, event) {
                var topo = this.topology();
                topo.stage().zoom(1.2, topo.adjustLayout, topo);
                event.preventDefault();
            },
            _out: function(sender, event) {
                var topo = this.topology();
                topo.stage().zoom(0.8, topo.adjustLayout, topo);
                event.preventDefault();
            },
            _full: function(sender, event) {
                this.toggleFull(event.target);
            },
            _enterSetting: function(event) {
                this.view("setting").addClass("n-topology-nav-setting-open");
            },
            _leaveSetting: function(event) {
                this.view("setting").removeClass("n-topology-nav-setting-open");
            },
            cancelFullScreen: function(el) {
                var requestMethod = el.cancelFullScreen || el.webkitCancelFullScreen || el.mozCancelFullScreen || el.exitFullscreen;
                if (requestMethod) { // cancel full screen.
                    requestMethod.call(el);
                } else if (typeof window.ActiveXObject !== "undefined") { // Older IE.
                    var wscript = new ActiveXObject("WScript.Shell");
                    if (wscript !== null) {
                        wscript.SendKeys("{F11}");
                    }
                }
            },
            requestFullScreen: function(el) {
                document.body.webkitRequestFullscreen.call(document.body);
                return false;
            },
            toggleFull: function(el) {
                var elem = document.body; // Make the body go full screen.
                var isInFullScreen = (document.fullScreenElement && document.fullScreenElement !== null) || (document.mozFullScreen || document.webkitIsFullScreen);

                if (isInFullScreen) {
                    this.cancelFullScreen(document);
                    this.fire("leaveFullScreen");
                } else {
                    this.requestFullScreen(elem);
                    this.fire("enterFullScreen");
                }
                return false;
            },

            _openPopover: function(sender, event) {
                this.view("settingPopover").open({
                    target: sender.dom(),
                    offsetY: 3
                });
                this.view('icon').dom().addClass('n-topology-nav-setting-icon-selected');
            },
            _closePopover: function() {
                this.view("settingPopover").close();
            },
            _closeSettingPanel: function() {
                this.view('icon').dom().removeClass('n-topology-nav-setting-icon-selected');
            },
            _togglePopover: function() {
                var popover = this.view("settingPopover");
                if (popover._closed) {
                    popover.open();
                }else{
                    popover.close();
                }
            },
            _switchTheme: function(sender, event) {
                this.topology().theme(event.target.value);
            },

            _toggleNodeLabel: function(sender, events) {
                var checked = sender.get('checked');
                this.topology().eachNode(function(node) {
                    node.labelVisibility(checked);
                });

                nx.graphic.Topology.NodesLayer.defaultConfig.labelVisibility = checked;
                nx.graphic.Topology.NodeSetLayer.defaultConfig.labelVisibility = checked;
            },
            _agr: function() {
                var topo = this.topology();
                var nodes = topo.selectedNodes().toArray();
                topo.selectedNodes().clear();
                topo.aggregationNodes(nodes);
            }
        }
    });


})(nx, nx.global);
