# Überapp
## Sommaire
1. [Origine](#origin)
2. [Fonctionnalités](#funcs)  
	2-a. [Deux fonctions pour les gouverner tous](#import)  
	2-b. [**node** pour les feignants](#node)  
	2-c. [**app** pour les travailleurs](#app)

## <a name="origin">1. Origine</a> 
Très inspiré par [Hyperapp](https://hyperapp.dev), j'ai voulu comprendre et ajouté des fonctionnalités en concevant mon propre outil.
Comme je considère mon outil comme meilleur (*l'est-il vraiment ?* 🤔), je l'ai nommé **über**.

## <a name="funcs">2. Fonctionnalités</a>
### <a name="import">2-a. Deux fonctions pour les gouverner tous</a>
Überapp ne possède que deux fonctions:
* node -> créer un élément HTML
* app -> gère tout le côté réactivité de l'application

Pour importer ces fonctions, il faut créer une balise script de type **module**:

```html
<script type="module">
  import { app, node } from "./überapp.js"

  /*
	RESTE DU CODE
  */
</script>
```
ou `<script type="module" src="main.js"></script>` avec `import { app, node } from "./überapp.js"` dans le fichier *main.js*.

Il est possible de renommer la fonction *node* pour quelque chose de plus simple à utiliser:

```js
import { app, node } from "./überapp.js" // NE PAS OUBLIER L'IMPORT
const $ = node; // $() = node()

app({
	node: '#hello',
	data: {
		message: "world!",
	},
	view: (data) => 
		$('div', {}, [
			$('p', {}, `Hello ${data.message}`),
		])
})
```

### <a name="node">2-b. **node** pour les feignants</a>
La fonction *node* est un petit bijou de feignantise, vous permettant de nombreux raccourcies pour en faire le moins:

```js
node(tag, attrs, content);
```

* *tag* correspond à la balise html `node('br')` -> `<br>`, mais l'argument peut également avoir un ou plusieurs des symboles suivants **# . @ : =** suivi de texte, ce qui ajoutera les attributs correspondant:
	* **.class**
		-> `node('.hello')` -> `<div class="hello">`
	* **#id**
		-> `node('#myid')` -> `<div id="myid">`
	* **@name**
		-> `node('input@firstname')` -> `<input name="firstname">`
	* **:type**
		-> `node('input:text')` -> `<input type="text"">`
	* **=value**
		-> `node('input=Raidez')` -> `<input value="Raidez">`
	* il est possible d'utiliser plusieurs raccourcies
		-> `node('input:text@firstname=Raidez')`
		-> `<input type="text" name="firstname" value="Raidez">`

* *attrs* correspond aux attributs et événement de l'élément, par exemple:
	```js
	node('button', { 'data-text': "Hello world", onclick: function() {
			alert(this.getAttribute('data-text'))
		} }, "Click me")
	```
	produira un élément `<button data-text="Hello world">Click me</button>` qui affichera le message *"Hello world"* lors du clic dessus.

	❗❗❗ **Vous verrez souvent une déclaration de fonction de cette manière `(param) => { ... }`, cette déclaration ne permet pas d'utiliser "*this*", dans l'exemple du bouton, j'avais besoin de "*this*" pour accéder à l'élément en lui-même, c'est pour ça que la déclaration de la fonction est classique `fonction(param) { ... }`.**

* *content*, il s'agit du contenu de l'élément:
	- soit directement le texte `node('p', {}, "Lorem Ipsum")` -> `<p>Lorem Ipsum</p>`
	- soit du HTML `node('p', {}, "Lorem<br>Ipsum")` -> `<p>Lorem<br>Ipsum</p>`
	- ou une liste d'éléments enfants `node('p', {}, [ "Lorem", node('br'), "Ipsum" ])` -> `<p> Lorem <br> Ipsum</p>`


### <a name="app">2-c. **app** pour les travailleurs</a>
La fonction *app* est plus compliqué a appréhender.
