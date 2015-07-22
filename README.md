# gulp-incremental

Compiler from [ejs](http://www.embeddedjs.com/)/[underscore templates](http://underscorejs.org/#template) or simply HTML to [incremental-DOM by Google](http://google.github.io/incremental-dom/) JavaScript function; implemented as a plugin to **gulp**.

Now you can speed up and optimize your application, which once used standard templates, with incremental DOM. You may read more about it [here](https://medium.com/google-developers/introducing-incremental-dom-e98f79ce2c5f).

##Example
Here is the original:

```ejs
<h2>
    <%- data.listTitle %>
</h2>

<ul>
    <% _.each( data.listItems, function(listItem, i){ %>
    <li class="row <%=(i % 2 == 1 ? ' even' : '')%>">
        <%- listItem.name %>
        <% if (listItem.hasOlympicGold){ %>
        <em>*</em>
        <% } %>
    </li>
    <% }); %>
</ul>

<% var showFootnote = _.any(
_.pluck( data.listItems, "hasOlympicGold" )
); %>

<% if ( showFootnote ){ %>
<p style="font-size: 12px ;">
    <em>* Olympic gold medalist</em>
</p>
<% } %>
```
And here is the render function after compiling the template:
 
```javascript
function template(data){
	elementOpen('h2');
		text( data.listTitle );
	elementClose('h2');
	elementOpen('ul');
		_.each( data.listItems, function(listItem, i){     
		elementOpen('li', null, null, 'class', 'row '+(i % 2 == 1 ? ' even' : ''));
			text( listItem.name );
			if (listItem.hasOlympicGold){         
			elementOpen('em');
				text('*');
			elementClose('em');
			}     
		elementClose('li');     
		}); 
	elementClose('ul');  
	var showFootnote = _.any( _.pluck( data.listItems, "hasOlympicGold" ) );  
	if ( showFootnote ){ 
	elementOpen('p', null, null, 'style', 'font-size: 12px ;');
		elementOpen('em');
			text('* Olympic gold medalist');
		elementClose('em');
	elementClose('p');
	}
}
```
##Installation

```bash
npm install gulp-incremental --save-dev
```
##Compilation
The following script finds all template files with the `.ejs` extension in the project, then converts them to render functions with the same title as the filename, and glues them together as one JavaScript file:

```javascript
var gulp = require('gulp');
var concat = require('gulp-concat');
var toIDOM = require('gulp-incremental');

gulp.task('default', function() {
    gulp.src(['*/*.ejs'])
        .pipe(toIDOM())
        .pipe(concat('templates.js'))
        .pipe(gulp.dest('bin/'));
});
```

> You should be careful and consider the following issues:
>
* The function title is the same as the name of the template file.
* You should be careful with the `'` symbol in templates; if it's mentioned in the text, it should be screened as `\'`. This will be fixed in further versions.
* The data is transferred to the template as one object; so if you don't want to transfer data via closure in templates, you should work with one object that will be transferred as a [**parameter**](#parameterName) to `path`.

###Options
You may transfer an object with options to the plugin:

* **parameterName**<a name="parameterName"></a> - name of the data object, which is transferred to the render function.
* **template** (*interpolate*, *escape*, *evaluate*) - regular expression of your templates; you may change them, so that the compiler will process your template syntax. 
> Take note that compilation is carried out in the following order: *interpolate*, *escape*, *evaluate*. In further versions we plan to provide an opportunity of changing the sequence of template processing.

* **escape**, **MAP** - regular expression and MAP for processing the *escape* template in the following way:
* 
```javascript
function escapeHTML(s) {
    return s.replace(options.escape, function (c){
        return options.MAP[c];
    });
}
```
* **format** - `true` or `false`, format or not source code.
* **helpers** (*open*, *close*) - service lines for processing *interpolate*, *escape* templates; it's better not to modify them.


By default the options have the following values:

```javascript
{
    parameterName: "data",
    template: {
        evaluate: /<%([\s\S]+?)%>/g,
        interpolate: /<%=([\s\S]+?)%>/g,
        escape: /<%-([\s\S]+?)%>/g
    },
    escape: /[&<>]/g,
    MAP: {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    },
    format: true
    helpers: {
        open: "{%",
        close: "%}"
    }
}
```
You may modify any option.



##Use
After the compilation of your templates you get a set of render functions for the library [incremental-dom](https://github.com/google/incremental-dom), whic you can [use directly](http://google.github.io/incremental-dom/#api/patch) in your code, for example:

```javascript
    var patch = IncrementalDOM.patch,
        elementOpen = IncrementalDOM.elementOpen,
        elementClose = IncrementalDOM.elementClose,
        text = IncrementalDOM.text;

    var templateData = {
        listTitle: "Olympic Volleyball Players",
        listItems: [
            {
                name: "Misty May-Treanor",
                hasOlympicGold: true
            },
            {
                name: "Kerri Walsh Jennings",
                hasOlympicGold: true
            },
            {
                name: "Jennifer Kessy",
                hasOlympicGold: false
            },
            {
                name: "April Ross",
                hasOlympicGold: false
            }
        ]
    };

    patch(document.querySelector('.template'), template, templateData);
``` 
You may also concatenate the render functions that you receive after the compilation with an auxiliary file, where `elementOpen`, `elementClose` and `text` are defined for further minification and obfuscation of your code.