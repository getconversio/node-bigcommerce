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

#### Instantiating a BigCommerce instance without a config object will result in an error

## Authorisation

Set up your Big Commerce as above and pass the following configuration options in:

```
{
  clientId: 'Your Client ID',
  secret: 'Your Secret',
  callback: 'The location you want the app to return to on success'
}
```

You will be able to get your Client ID and Secret within your application setup. Below is an example using Express' routes:

```
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

The 'authorise' method retuires the query parameters from the request to be passed. These are required to request a permanent access token which will be passed back in the data object.

An example data object:

```
{ access_token: '9df3b01c60df20d13843841ff0d4482c',
  scope: 'store_v2_orders_read_only store_v2_products_read_only users_basic_information store_v2_default',
  user: 
   { id: 12345,
     username: 'John Smith',
     email: 'john@success.com' },
  context: 'stores/x43tqo' }
```

From this object you can store the 'access_token' for re-use when calling the Big Commerce API.


