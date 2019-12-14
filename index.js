import { app, node } from "überapp"

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