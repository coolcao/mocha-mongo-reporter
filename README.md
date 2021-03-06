#mongoreporter
##Description
A reporter for mocha that stores results directly to a mongo db

##Usage
```sh
$ npm install mongoreporter
...
$ MONGOURL=mongodb://dbuser:dbpassword@dbhost:dbport/dbname mocha -R mongoreporter test/one.js
```
programmatically:
```sh
var mocha = new Mocha({
    ui: 'bdd',
    reporter: "mongoreporter",
    reporterOption: {
    	url: "mongodb://dbuser:dbpassword@dbhost:dbport/dbname"
	}
});
mocha.addFile("test/one.js");
mocha.run(...);
```

I like to use this with mocha-multi reporter, using spec to print test results, something like this
```sh
$ npm install mocha-multi
...
$ npm install mongoreporter
...
$ MONGOURL="mongodb://localhost:27017/testruns" multi="spec=- mongoreporter=/dev/null" mocha -R mocha-multi
```