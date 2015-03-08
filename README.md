# Credit-backend
Javascript backend for the Credit app

## Usage
npm install jsparber/Credit-backend
```js
var loadUserData = require('Credit-backend');
loadUserData({user: "myuser", password: "mypassword"}, callback);

function callback(error, data){
	if(error)
		throw error;
	console.log(data);
}
```
