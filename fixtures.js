require('with-env')();
var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var fixtures = require('node-mongoose-fixtures');
var articleSchema = require('./schema/articles.js');

mongoose.connect( process.env.MONGO_URL );

mongoose.model( 'articles', articleSchema );

fixtures({
    articles: [{
        title: 'Sample'
    }]
}, function(err, data) {
    if (err) {
        console.log( err );
    }
    console.log( data );
    mongoose.connection.close();
});