const pattern_button = /^(input|button):\w+$/;
const pattern_onevent = /^(on)\w+$/;
const pattern_shortcut = /[#\.@:][\w-_]+/;
const pattern_unexpected_selector = /::?[\w_-\d()]+|\[.+\]/;
const pattern_separator_selector = /[ ,>+~]+/;
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

String.prototype.hashCode = function(cut=-1, positiveOnly=false) {
    let hash = 0, i, chr;
    if (this.length === 0) return hash;
    for (i = 0; i < this.length; i++) {
        chr = this.charCodeAt(i);
        hash = ((hash << 5) - hash) + chr;
        hash |= 0;
    }

    hash = (positiveOnly)? Math.abs(hash) : hash;
    hash = (cut > 0)? hash.toString().substring(0, cut) : hash;
    return hash;
};

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
        console.error(`The element can't be create with the tagname "${tag}"`);
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
    
    // make app reactive
    function render() {
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
            config.methods[funcname] = handler.bind(binder);
        }
    }
    
    render();
    
    // https://regex101.com/r/MVKhKS/3
    // REFACTOR THIS SHIT
    if (typeof config.style === 'object') {
        let style = new Style();

        for (let [key, props] of Object.entries(config.style)) {
            let finalSelector = "";
            let hash = "über-" + JSON.stringify(props).hashCode(5, true);
            key.split(pattern_separator_selector).map(selector => {
                let existsHash = "";
                let cleanSelector = selector.replace(pattern_unexpected_selector, '');
                let nodes = root.querySelectorAll(cleanSelector);
                nodes.forEach(node => {
                    if (!node.className.split(' ').some(c => /über-/.test(c))) {
                        node.classList.add(hash);
                    } else {
                        existsHash = node.className.split(' ').filter(c => /über-/.test(c))[0];
                    }
                });

                if (existsHash.length > 0) {
                    finalSelector += " " + selector.replace(cleanSelector, cleanSelector + `.${existsHash}`);
                } else {
                    finalSelector += " " + selector.replace(cleanSelector, cleanSelector + `.${hash}`);
                }
            });

            style.append(finalSelector.trim(), props);
        }

        style.apply();
    }
}

class Style {
    constructor() {
        this.rules = [];
        this.styleTag = document.createElement('style');
        document.head.appendChild(this.styleTag);
        this.sheet = this.styleTag.sheet;
    }

    append(selector, props) {
        this.rules.push({
            "selector": selector,
            "props": props,
        });
    }

    apply() {
        // clean rules
        Array.from(this.sheet.cssRules).map(() => this.sheet.deleteRule(0) );
        
        // insert rules
        this.rules.map((rule) => {
            // parse rules
            let props = rule['props'];
            if (typeof props === 'object') {
                let rulesObject = [];
                for (let [prop, value] of Object.entries(props)) {
                    rulesObject.push(`${prop}: ${value};`);
                }
                props = rulesObject.join('\n');
            }

            // convert CamelCase to kebab-case
            findall(/[A-Z]/, props).map(camel => {
                props = props.replace(camel, `-${camel.toLowerCase()}`)
            });

            this.sheet.insertRule(`${rule['selector']} {${props}}`)
        });
    
    }
}
