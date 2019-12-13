function node(tag, attrs, content) {
    let elem = document.createElement(tag);

    Object.keys(attrs).map(key => {
        let val = attrs[key];
        if (!key.startsWith('on')) {
            elem.setAttribute(key, val)
        } else {
            let event = key.substring(2);
            elem.addEventListener(event, val);
        }
    })

    if (Array.isArray(content)) {
        content.map(child => {
            elem.appendChild(child)
        })
    } else if (typeof content === 'string') {
        elem.innerHTML = content;
    }

    return elem;
}

function app(config) {
    let root = document.querySelector(config.node);
    if (root == null) {
        throw new Error(`Element ${config.node} not found in DOM !`)
    }

    // Object.keys(config.methods).map(key => {
    //     config.methods[key] = function() { config.methods[key].call(config.data) };
    // })

    // make app reactive
    var render = function() {
        let content = config.view(config.data, config.methods, config.style);
        root.innerHTML = "";
        root.appendChild(content);
    }

    // when change, update view
    config.data = new Proxy(config.data, {
        set: (obj, prop, val) => {
            obj[prop] = val;
            render();
        }
    });

    render();
}

const $ = node;
app({
    node: '#counter',
    data: {
        counter: 0,
    },
    view: (data) => 
        $('div', {}, [
            $('h1', {}, "Counter: "+ data.counter),
            $('button', { onclick: () => data.counter += 1 }, "+"),
            $('button', { onclick: () => data.counter -= 1 }, "-"),
        ])
})

app({
    node: '#todolist',
    data: {
        tasks: ["Make an app with Hyperapp"],
    },
    view: (data, methods, style) => {
        $('div', {}, [
            $('h1', {}, "Todolist"),
            $('ul', {}, data.tasks.map((taskname, taskid) => $('li', {}, taskname))),
            // $('ul', {}, data.tasks.map((taskname, taskid) => $('li', {}, [
                // taskname,
                // $('button', {}, "&times;"),
            // ]))),
        ])
    },
})
