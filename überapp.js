const pattern_button = /^(input|button):\w+$/;
const pattern_onevent = /^(on)\w+$/;
const pattern_shortcut = /[#\.@:][\w-_]+/;
const shortcuts_name = {
    ':': "type",
    '.': "class",
    '#': "id",
    '@': "name",
};

function findall(pattern, string) {
    let finds = [];
    while (pattern.test(string)) {
        let found = pattern.exec(string)[0];
        finds.push(found);
        string = string.replace(found, '');
    }
    return finds;
}

function hash(string) {
    var hash = 0, i, chr;
    if (string.length === 0) return hash;
    for (i = 0; i < string.length; i++) {
        chr   = string.charCodeAt(i);
        hash  = ((hash << 5) - hash) + chr;
        hash |= 0; // Convert to 32bit integer
    }
    return hash;
}

class Ruleset {
    constructor(selector, rules) {
        this.selector = selector;

        // parse rules
        if (typeof rules === 'object') {
            let rulesObject = [];
            for (let [prop, value] of Object.entries(rules)) {
                rulesObject.push(`${prop}: ${value};`);
            }
            this.rules = rulesObject.join('\n');
        } else if (typeof rules === 'string') {
            this.rules = rules;
        }
        
        // convert CamelCase to kebab-case
        findall(/[A-Z]/, this.rules).map(camel => {
            this.rules = this.rules.replace(camel, `-${camel.toLowerCase()}`)
        });

        // auto-prefixer

        // hash selector (with :hover)
        this.hashedSelector = ".css-" + hash(this.rules);
    }

    toString() {
        return `${this.hashedSelector} { ${this.rules} }`;
    }
}

class Style {
    constructor(css) {
        this.rules = [];

        this.style = document.createElement('style');
        document.head.appendChild(this.style);
        this.sheet = this.style.sheet;

        for (let [selector, ruleset] of Object.entries(css)) {
            this.rules.push(new Ruleset(selector, ruleset));
        }
    }

    apply() {
        // clean rules
        Array.from(this.sheet.cssRules).map(() => this.sheet.deleteRule(0) );
        // insert rules
        this.rules.map((rule) => this.sheet.insertRule(rule.toString()));
    }

    get(selector) {
        let rules = this.rules.filter(rule => rule.selector == selector);
        if (rules.length > 0) {
            return rules[0].hashedSelector.substring(1);
        }
        console.warn(`The ruleset "${selector}" don't exists !`);
        return selector;
    }

    // add(selector, ruleset) { this.rules.push(new Ruleset(selector, ruleset)) }

    // delete(selector) { this.rules = this.rules.filter(rule => rule.selector != selector) }
}

/**
 * Create new node element
 * @param tag Tagname with shortcut for button (input:submit => <input type="submit" />)
 * @param attrs Attributes and events
 * @param content HTML content or children node
 * @returns HTMLElement
 */
export function node(tag, attrs = {}, content = "") {
    // use shortcut for attributes
    if (pattern_shortcut.test(tag)) {
        let shortcuts = findall(pattern_shortcut, tag);
        shortcuts.map(shortcut => {
            let attrvalue = shortcut.substring(1);
            let attrname = shortcuts_name[shortcut.substring(0, 1)]
            let attrcur = attrs[attrname];
            if (typeof attrcur !== 'undefined' && typeof attrcur === 'string') {
                attrs[attrname] += " " + attrvalue;
            } else if (typeof attrcur !== 'undefined' && Array.isArray(attrcur)) {
                attrcur.push(attrvalue);
            } else {
                attrs[attrname] = attrvalue;
            }
            tag = tag.replace(shortcut, '');
        });
    }

    // try to create element
    let elem = document.createElement(tag);
    if (elem instanceof HTMLUnknownElement && !pattern_button.test(tag)) {
        throw new Error(`The element can't be create with the tagname "${tag}"`);
    }

    // auto-binding element
    if ('bind' in attrs && 'model' in attrs) {
        let state = attrs['bind'];
        let model = attrs['model'];
        let eventname = ('event' in attrs)? attrs['event'] : "change";
        if (pattern_onevent.test(eventname)) eventname = eventname.substring(2);

        elem.value = state[model];
        elem.addEventListener(eventname, function() {
            state[model] = elem.value;
        });
    }

    // attach attribute and event
    for (let [key, value] of Object.entries(attrs)) {
        if (Array.isArray(value)) {
            value = Array.from(new Set(value)).join(' ');
        }

        if (pattern_onevent.test(key)) {
            let eventname = key.substring(2);
            elem.addEventListener(eventname, value);
        } else {
            elem.setAttribute(key, value);
        }
    }

    // insert content
    if (typeof content === 'string') {
        elem.innerHTML = content;
    } else if (Array.isArray(content)) {
        content.map(subcontent => {
            if (typeof subcontent === 'string') {
                elem.innerHTML += subcontent;
            } else if (subcontent instanceof HTMLElement) {
                elem.appendChild(subcontent);
            }
        });
    }

    return elem;
}

/**
 * Create reactive app inside a node selector
 * @param config Inner object which contains:
 * - view Function which contains HTML
 * - node The node selector where view be inserted
 * - data A set of data used by the application
 * - methods A set of methods
 * - style Inner style locked for the application
 */
export function app(config) {
    let root = document.querySelector(config.node);
    if (root == null) {
        throw new Error(`Element "${config.node}" not found in DOM !`)
    }
    
    if (typeof config.style === 'object') {
        config.style = new Style(config.style);
    }

    // make app reactive
    function render() {
        if (config.style instanceof Style) {
            config.style.apply();
        }
        
        /// get focused element of the current state
        let focus = {
            elem: document.activeElement,
            rect: document.activeElement.getBoundingClientRect(),
            caret: [document.activeElement.selectionStart, document.activeElement.selectionEnd],
            value: document.activeElement.value,
        };
        
        let content = config.view(config.data, config.methods, config.style);
        root.innerHTML = "";
        root.appendChild(content);

        /// focus element and caret position from previous state
        if (!(focus.elem instanceof HTMLBodyElement)) {
            let elem_focus = document.elementFromPoint(focus.rect.x, focus.rect.y);
            elem_focus.focus();
            if (typeof focus.caret[0] !== 'undefined' && focus.caret[1] !== 'undefined') {
                elem_focus.selectionStart = focus.caret[0];
                elem_focus.selectionEnd = focus.caret[1];
            }
        }
    }

    // when change, update view
    config.data = new Proxy(config.data, {
        set: (obj, prop, val) => {
            obj[prop] = val;
            render();
            return true;
        }
    });

    // bind data inside methods
    if ('methods' in config) {
        for (let [funcname, handler] of Object.entries(config.methods)) {
            let binder = config.data;
            binder['_methods'] = config.methods;
            binder['_style'] = config._style;
            config.methods[funcname] = handler.bind(binder);
        }
    }

    render();
}
