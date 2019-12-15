import { app, node } from "./überapp.js"
const $ = node;

app({
    node: '#app',
    data: {
    },
    methods: {
    },
    view: (state, ctrl) =>
        $('div', {}, [])
})

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
    methods: {
        addtask: function(taskname) {
            this.tasks = [...this.tasks, taskname];
        },
        deltask: function(taskid) {
            this.tasks = this.tasks.filter((task, id) => id != taskid);
        },
        handleSubmit: function(event) {
            event.preventDefault();
            let taskname = new FormData(event.target).get('taskname');
            if (!taskname) return;
            this._methods.addtask(taskname);
            event.target.reset();
        },
    },
    lockStyle: true,
    style: {
        '.btn-del': {
            visibility: 'hidden',
            color: 'red',
            border: 'none',
            backgroundColor: 'transparent',
            fontWeight: 'bold',
        },
        'li:hover .btn-del':  {
            visibility: 'visible',
            cursor: 'pointer',
        }
    },
    view: (data, methods, style) =>
        $('div', {}, [
            $('h1', {}, "Todolist"),
            $('ul', {}, data.tasks.map((taskname, taskid) => $('li', { class: style.get('li:hover .btn-del') }, [
                taskname,
                $('button', { class: style.get('.btn-del'), onclick: () => methods.deltask(taskid) }, "&times;"),
            ]))),
            $('form', { onsubmit: () => methods.handleSubmit(event) }, [
                $('input:text@taskname'),
                $('input:submit'),
            ]),
        ])
})
