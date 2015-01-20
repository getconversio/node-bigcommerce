# node-bigcommerce

[![Code Climate](https://codeclimate.com/repos/54b673f7e30ba0704d01ed1d/badges/1745c700ed531663cc86/gpa.svg)](https://codeclimate.com/repos/54b673f7e30ba0704d01ed1d/feed) [![Test Coverage](https://codeclimate.com/repos/54b673f7e30ba0704d01ed1d/badges/1745c700ed531663cc86/coverage.svg)](https://codeclimate.com/repos/54b673f7e30ba0704d01ed1d/feed)

[ ![Codeship Status for Receiptful/node-bigcommerce](https://codeship.com/projects/8896a5b0-7e22-0132-e07d-6e7a890cdaa4/status?branch=master)](https://codeship.com/projects/56889)

A node module for authentication and use with the BigCommerce v2 API


## Installation

To install the module using NPM:

```
npm install node-bigcommerce
```

## Setup

Include the 'node-bigcommerce' module within your script and instantiate it with a config:

```javascript
var BigCommerce = require('node-bigcommerce');

var bigCommerce = new BigCommerce({
  logLevel: 'info',
  clientId: '128ecf542a35ac5270a87dc740918404',
  secret: 'acbd18db4cc2f85cedef654fccc4a4d8',
  callback: 'https://myapplication.com/auth'  
});
```

##### Instantiating a BigCommerce instance without a config object will result in an error

## Authorisation

Set up your Big Commerce as above and pass the following configuration options in:

```
{
  clientId: 'Your application's client ID',
  secret: 'Your secret',
  callback: 'The location you want the app to return to on success'
}
```

You will be able to get your Client ID and Secret within your application setup. Below is an example using Express' routes:

```javascript
var express = require('express'),
  router = express.Router(),
  BigCommerce = require('node-bigcommerce');

var bigCommerce = new BigCommerce({
  clientId: '128ecf542a35ac5270a87dc740918404',
  secret: 'acbd18db4cc2f85cedef654fccc4a4d8',
  callback: 'https://myapplication.com/auth'  
});

router.get('/auth', function(req, res) {
  bigCommerce.authorise(req.query, function(err, data){
    res.render('integrations/auth', { title: 'Authorised!', data: data });
  })
});
```

The 'authorise' method requires the query parameters from the request to be passed. These are required to request a permanent access token which will be passed back in the data object.

An example data object:

```
{ 
  access_token: '9df3b01c60df20d13843841ff0d4482c',
  scope: 'store_v2_orders_read_only store_v2_products_read_only users_basic_information store_v2_default',
  user: { 
    id: 12345,
    username: 'John Smith',
    email: 'john@success.com' 
  },
  context: 'stores/x43tqo' 
}
```

From this object you can store the 'access_token' for re-use when calling the Big Commerce API.

## Load & Uninstall

The only configuration element required to use the callback method (used for both load and uninstall endpoints) is 'secret'. Below is an example using Express' routes:

```javascript
var express = require('express'),
  router = express.Router(),
  BigCommerce = require('node-bigcommerce');

var bigCommerce = new BigCommerce({
  secret: 'acbd18db4cc2f85cedef654fccc4a4d8'
});

router.get('/load', function(req, res) {
  bigCommerce.callback(req.query['signed_payload'], function(err, data){
    res.render('integrations/welcome', { title: 'Welcome!', data: data });
  })
});
```

The 'callback' method requires the 'signed_payload' query parameter to be passed from the request. This is used to verify that the request has come from Big Commerce. The callback method returns the following object:

```
{ 
  user: { 
    id: 12345, 
    email: 'john@success.com' 
  },
  context: 'stores/x43tqo',
  store_hash: 'x43tqo',
  timestamp: 1421748597.4395974 
}
```

This will allow you to automatically log the user in (if required) when BigCommerce calls the load endpoint or remove/label a user that has uninstalled your application from their Big Commerce account.

## Calling the API

The API can be called once the user has been authorised and has an access token. There is a helper for each type of request available within Big Commerce (GET, POST, PUT, DELETE).

To make an API Request you will need the following minimum configuration:

```
{
  clientId: 'Your application's client ID',
  accessToken: 'Token assigned to the user during authorisation',
  storeHash: 'The short hash for the store'
}
```
Parameters that are added to the url need to be escaped before they are passed as part of the path of any call:

```javascript
var path = '/products?name=' + escape('Plain T-Shirt');
```


### GET

The 'Get' call requires a path and callback: get(path, callback):

```javascript
var BigCommerce = require('node-bigcommerce');

var bigCommerce = new BigCommerce({
  clientId: '128ecf542a35ac5270a87dc740918404'
  accessToken: '9df3b01c60df20d13843841ff0d4482c'
});

bigCommerce.get('/products', function(err, data, response){
  // Catch any errors, or handle the data returned
  // The response object is passed back for convenience
});
```

### POST & PUT

The 'POST' & 'PUT' calls requires a path and callback with optional data to be sent: post(path, data, callback):

```javascript
var BigCommerce = require('node-bigcommerce');

var bigCommerce = new BigCommerce({
  clientId: '128ecf542a35ac5270a87dc740918404'
  accessToken: '9df3b01c60df20d13843841ff0d4482c'
});

var product = {
  name: 'Plain T-Shirt',
  type: 'physical',
  description: 'This timeless fashion staple will never go out of style!',
  price: '29.99',
  categories: [18],
  availability: 'available',
  weight: '0.5'
}

// Replace 'post' with 'put' for a put call
bigCommerce.post('/products', product, function(err, data, response){
  // Catch any errors, or handle the data returned
  // The response object is passed back for convenience
});
```

### DELETE

The 'DELETE' call requires a path and callback with optional data to be sent: delete(path, data, callback). A delete call will not return any data and will return a response status of 204.

```javascript
var BigCommerce = require('node-bigcommerce');

var bigCommerce = new BigCommerce({
  clientId: '128ecf542a35ac5270a87dc740918404',
  accessToken: '9df3b01c60df20d13843841ff0d4482c'
});

// Replace 'post' with 'put' for a put call
bigCommerce.post('/products?name=' + escape('Plain T-Shirt'), null, function(err, data, response){
  // Catch any errors, data will be null
  // The response object is passed back for convenience
});
```

## Logging

There are 2 levels of logging which can be set in the config during instantiation. By default the logging level is set to 'errors'. For more verbose debugging the log level of 'info' can be set:

```javascript
var BigCommerce = require('node-bigcommerce');

var bigCommerce = new BigCommerce({
  logLevel: 'info',
  clientId: '128ecf542a35ac5270a87dc740918404',
  accessToken: '9df3b01c60df20d13843841ff0d4482c'
});

bigCommerce.post('/products?name=' + escape('Plain T-Shirt'), null, function(err, data, response){
  // Catch any errors, data will be null
  // The response object is passed back for convenience
});
``` 

We recommend you only use the log level 'info' on a development build as it logs a lot of information.

## Notes

You can instantiate the BigCommerce object within a script and re-use throughout. The config object within the BigCommerce allows the addition of other elements after the initial instantiation. For example, in a scenario when you have the authorisation and a call to the api, you can do the following:

```javascript
var express = require('express'),
  router = express.Router(),
  BigCommerce = require('node-bigcommerce');

var bigCommerce = new BigCommerce({
  clientId: '128ecf542a35ac5270a87dc740918404',
  secret: 'acbd18db4cc2f85cedef654fccc4a4d8',
  callback: 'https://myapplication.com/auth'  
});

router.get('/auth', function(req, res) {
  bigCommerce.authorise(req.query, function(err, data){
    
    /**
     * Your code to save the access token & 
     * store hash to the current user
     */

    res.render('integrations/auth', { title: 'Authorised!', data: data });
  })
});

router.get('/products', function(req, res) {
  
  /**
   * Your code to get the current users access token & store hash
   * and add it to the variables: var accessToken & var storeHash
   */

  bigCommerce.config.accessToken = accessToken;
  bigCommerce.config.storeHash = storeHash;
  bigCommerce.get('/products?min_id=3&max_id=10', function(err, data){
    res.render('integrations/products', { title: 'Product List Between 3 & 10', data: data });
  })
});
```

## Testing

```
npm test
```

## Contributing

This module was original written to be used with Receiptful and is used in a production environment currently. This will ensure that this module is well maintained, bug free and as up to date as possible.

Receiptful's developers will continue to make updates as often as required to have a consistently bug free platform, but we are happy to review any feature requests or issues and are accepting constructive pull requests.
