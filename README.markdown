#Churros
Hiroyuki Nakamura <hiroyuki@maloninc.com>

Churros is a Javascript library for sycing a local Web SQL Database with your server's database.
It is based on ActiveJS library. You will see more information about ActiveJS at <http://activerecordjs.org/>
This package includes a client software and a server software using Ruby on Rails. You can use Churros in
your own apps by copying churros_active_record.js, churros_web_database.js in public directory.

Churros supports:
- Offline data access
- Detect offline or online mode
- Automatic sync with server when your app is online

You will see a live sample at <http://churros.heroku.com/>

#Installation
You can use the following Javascript library in your apps by copying them into your apps.

- churros_active_record.js
- churros_web_database.js

You need to modify your web server to reply JSON data in particular format.
For more information about ActiveJS, see <http://activerecordjs.org/>

#Getting Started
It is based on ActiveRecord in ActiveJS library, so you need to setup ActiveRecord object.
This automatically make local Web SQL Database.

	var Todo = ActiveRecord.create(
	{
		tableName: 'todos', 
		dbName: 'TodoDB', 
		dbVersion: 1.0,
		dbComment: 'DB for Todo',
		dbSize: 10000000
	},
	{   /* define fields of the record */
		task: {type:'varchar(255)', value:''},
		done: {type:'boolean', value:false}
	}); 

And then you need to define relationship with each RESTful APIs.
After that, Churros will automatically sync local DB and remote DB.

	ActiveRecord.connect('/todos.json', {
		Todo: {
		destroy: ['/todos/:id.xml','DELETE'],
		create:  ['/todos.json','POST'],
		update:  ['/todos/:id','PUT']
		}
	});

For more information about ActiveJS, see <http://activerecordjs.org/>

#License
This package is licensed under BSD License.
