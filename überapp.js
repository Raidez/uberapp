const pattern_button = /^(input|button):\w+$/;
const pattern_onevent = /^(on)\w+$/;
const pattern_shortcut = /[#\.@:][\w-_]+/;

function findall(pattern, string) {
    let finds = [];
    while (pattern.test(string)) {
        let found = pattern.exec(string)[0];
        finds.push(found);
        string = string.replace(found, '');
    }
    return finds;
}

/**
 * Create new node element
 * @param tag Tagname with shortcut for button (input:submit => <input type="submit" />)
 * @param attrs Attributes and events
 * @param content HTML content or children node
 * @returns HTMLElement
 */
export function node(tag, attrs = {}, content = "") {
    if (pattern_shortcut.test(tag)) {
        console.log(findall(pattern_shortcut, tag));
    }

    // try to create element
    let elem = document.createElement(tag);
    while(elem instanceof HTMLUnknownElement) {
        if (elem instanceof HTMLUnknownElement && !pattern_button.test(tag)) {
            throw new Error(`The element can't be create with the tagname "${tag}"`);
        } else if (pattern_button.test(tag)) {
            elem = document.createElement(tag.substring(0, tag.indexOf(':')));
            attrs['type'] = tag.substring(tag.indexOf(':')+1);
        }
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

    render();

    if ('methods' in config && config.methods.length > 0) {
        for (let [funcname, handler] of Object.entries(config.methods)) {
            config.methods[funcname] = handler.bind(config.data);
        }
    }
}
