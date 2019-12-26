const pattern_button = /^(input|button):\w+$/;
const pattern_onevent = /^(on)\w+$/;
const pattern_shortcut = /[#\.@:=][\w-_]+/;
const pattern_unexpected_selector = /::?[\w_-\d()]+|\[.+\]/;
const pattern_separator_selector = /[ ,>+~]+/;
const shortcuts_name = {
	':': "type",
	'.': "class",
	'#': "id",
	'@': "name",
	'=': "value",
};

/**
 * Find all occurence in string
 * @param pattern The pattern
 * @param string The string
 * @returns <String>
 */
RegExp.prototype.findall = function(string) {
	let finds = [];
	while (this.test(string)) {
		let found = this.exec(string)[0];
		finds.push(found);
		string = string.replace(found, '');
	}
	return finds;
}

/**
 * Convert Map to Object
 * @returns Object
 */
Map.prototype.toObject = function() {
	return Array.from(this).reduce((obj, [key, value]) => (
		Object.assign(obj, { [key]: value })
	), {});
};

/**
 * Generate id
 * @param id_length 
 * @param alphabet 
 * @param start_with_letter 
 */
function hash(id_length=8, alphabet="0123456789abcdefghijklmnopqrstuvwxyz", start_with_letter=true) {
	let id = "";
	for (let i = 0; i < id_length; i++) {
		let char = alphabet.charAt(Math.floor(Math.random() * alphabet.length));
		while(i == 0 && start_with_letter && !/^[a-zA-Z]/.test(char)) {
			char = alphabet.charAt(Math.floor(Math.random() * alphabet.length));
		}
		id += char;
	}
	return id;
}

/**
 * Style class utilities
 */
class Style {
	constructor(id=null) {
		id = (id)? id : "css-" + hash(4);
		this.rules = new Map();
		this.styleTag = document.querySelector('style#' + id);
		if (document.querySelector('style#' + id) == null) {
			this.styleTag = document.createElement('style');
			this.styleTag.id = id;
			document.head.appendChild(this.styleTag);
		}
		this.sheet = this.styleTag.sheet;
	}

	_kebabCase(prop) {
		// convert CamelCase to kebab-case
		/[A-Z]/.findall(prop).map(camel => {
			prop = prop.replace(camel, `-${camel.toLowerCase()}`)
		});
		return prop;
	}

	static from(style={}) {
		let s = new this();
		for (let [selector, props] of Object.entries(style)) {
			for (let [prop, value] of Object.entries(props)) {
				s.put(selector, prop, value);
			}
		}
		return s;
	}

	get(selector, prop=null) {
		prop = this._kebabCase(prop);
		return (prop)? this.rules.get(selector).get(prop) : Object.freeze(this.rules.get(selector).toObject());
	}

	put(selector, prop, value) {
		prop = this._kebabCase(prop);
		if (!this.rules.has(selector)) {
			this.rules.set(selector, new Map([ [prop, value] ]));
		} else {
			this.rules.get(selector).set(prop, value);
		}
	}

	del(selector, prop=null) {
		prop = this._kebabCase(prop);
		(prop)? this.rules.get(selector).delete(prop) : this.rules.delete(selector)
	}

	reset(style) {
		this.rules.clear();
		for (let [selector, props] of Object.entries(style)) {
			for (let [prop, value] of Object.entries(props)) {
				this.put(selector, prop, value);
			}
		}
	}

	apply(root=document.body) {
		// clean rules
		Array.from(this.sheet.cssRules).map(() => this.sheet.deleteRule(0) );

		this.rules.forEach((props, initial_selector) => {
			// lock selector
			let selector = initial_selector;
			initial_selector.split(pattern_separator_selector).map(node_selector => {
				let nodeId = "über-" + hash(6);
				
				/// clean selector to only select element target
				let cleanSelector = node_selector.replace(pattern_unexpected_selector, '');
				let nodes = root.querySelectorAll(cleanSelector);
                nodes.forEach(node => {
					if (node.className.split(' ').some(c => /über-/.test(c))) {
						nodeId = node.className.split(' ').filter(c => /über-/.test(c))[0];
					} else {
						node.classList.add(nodeId);
					}
				});

				selector = selector.replace(node_selector, `${node_selector}.${nodeId}`);
			});

			// insert rules
			let rule = `${selector} {\n`;
			props.forEach((value, prop) => {
				rule += `\t${prop}: ${value};\n`;
			});
			rule += "}";
			this.sheet.insertRule(rule);
		});
	}
}

//////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * Create new node element
 * @param tag Tagname with shortcut like css selector (#id, .class, :button_type, @name_attribute)
 * @param attrs Attributes and events
 * @param content HTML content or children node
 * @returns HTMLElement
 */
export function node(tag, attrs = {}, content = "") {
	// use shortcut for attributes
	if (pattern_shortcut.test(tag)) {
		pattern_shortcut.findall(tag).map(shortcut => {
			let attrvalue = shortcut.substring(1);
			let attrname = shortcuts_name[shortcut.substring(0, 1)]
			let attrcur = attrs[attrname];

			/// if attribute already exists, push information inside
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
	tag = (tag.length == 0)? "div" : tag;
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

		/// remove useless attributes
		delete attrs['bind'];
		delete attrs['model'];
		delete attrs['event'];
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
 * - view Function which contains HTML (receive data, methods, style and inner render function to re-render)
 * - node The node selector where view be inserted
 * - data A set of data used by the application
 * - methods A set of methods
 * - style Inner style locked for the application
 */
export function app(config) {
	// initiate options
	config.data = (config.data)? config.data : {};
	config.methods = (config.methods)? config.methods : {};
	config.style = (config.style)? config.style : {};
	config.styleObject = (Object.entries(config.style).length > 0)? Style.from(config.style) : new Style();

	// find root element
	let root = document.querySelector(config.node);
	if (root == null) {
		throw new Error(`Element "${config.node}" not found in DOM !`)
	}
	
	function render() {
		/// get focused element of the current state
		let focus = {
			elem: document.activeElement,
			rect: document.activeElement.getBoundingClientRect(),
			caret: [document.activeElement.selectionStart, document.activeElement.selectionEnd],
			value: document.activeElement.value,
		};
		
		/// re-render content
		let content = config.view(config.data, config.methods);
		root.innerHTML = "";
		root.appendChild(content);
		config.styleObject.apply(root);
		
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
	
	// when change on data or style, update view
	config.data = new Proxy(config.data, {
		set: (target, prop, val) => {
			target[prop] = val;
			render();
			return true;
		}
	});
	config.styleObject.put = new Proxy(config.styleObject.put, {
		apply: (fn, that, args) => {
			fn.apply(that, args);
			render();
			return true;
		}
	});
	config.styleObject.del = new Proxy(config.styleObject.del, {
		apply: (fn, that, args) => {
			fn.apply(that, args);
			render();
			return true;
		}
	});
	config.styleObject.reset = new Proxy(config.styleObject.reset, {
		apply: (fn, that, args) => {
			fn.apply(that, args);
			render();
			return true;
		}
	});
	
	// bind data inside methods
	for (let [funcname, handler] of Object.entries(config.methods)) {
		let binder = config.data;
		binder['_methods'] = config.methods;
		binder['_style'] = config.styleObject;
		binder['__style'] = Object.freeze(config.style);
		binder['_render'] = render;
		config.methods[funcname] = handler.bind(binder);
	}
	
	render();
}
