import { app, node } from "./überapp.js"
const $ = node;

app({
	node: '#hello',
	data: {
		message: "world!",
	},
	methods: {
		handleChange: function(message) {
			this.message = message;
		}
	},
	view: (state, controller) => 
		$('div', {}, [
			$('p', {}, `Hello ${state.message}`),
			$('input:text', { bind: state, model: 'message', event: 'onkeyup' }),
			$('input:text', { value: state.message, onchange: () => state.message = event.target.value }),
			$('input:text', { value: state.message, onchange: function() { state.message = this.value } }),
			$('input:text', { value: state.message, onchange: () => controller.handleChange(event.target.value) }),
		])
})

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
    style: `.btn-del {
        visibility: hidden;
        color: red;
        border: none;
        background-color: transparent;
        font-weight: bold;
    }
    
    li:hover .btn-del {
        visibility: visible;
        cursor: pointer;
    }
    `,
    view: (data, methods, style) =>
        $('div', {}, [
            $('h1', {}, "Todolist"),
            $('ul', {}, data.tasks.map((taskname, taskid) => $('li', {}, taskname))),
            $('ul', {}, data.tasks.map((taskname, taskid) => $('li', {}, [
                taskname,
                $('button:button.btn-del', {}, "&times;"),
            ]))),
        ])
})
