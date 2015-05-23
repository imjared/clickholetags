require('with-env')();

var request     = require('request');
var parseString = require('xml2js').parseString;
var cheerio     = require('cheerio');
var _           = require('lodash');
var Twitter     = require('twitter');
var async       = require('async');

var mongoose      = require('mongoose');
var Schema        = mongoose.Schema;
var articleSchema = require('./schema/articles.js');

mongoose.connect( process.env.MONGO_URL );
mongoose.model( 'articles', articleSchema );

var Articles = mongoose.model( 'articles' );

var url = "http://www.clickhole.com/feeds/rss";

var client = new Twitter({
  consumer_key: process.env.TW_CONSUMER_KEY,
  consumer_secret: process.env.TW_CONSUMER_SECRET,
  access_token_key: process.env.TW_ACCESS_TOKEN_KEY,
  access_token_secret: process.env.TW_ACCESS_TOKEN_SECRET
});

request( url, function(error, response, body) {
    if (!error && response.statusCode == 200) {
        var xml = body;
        parseString(xml, function (err, result) {
            
            var entries = result.rss.channel[0].item;

            async.eachSeries( entries, function( entry, callback ) {
                
                var article = entry;
                var title = article.title[0];
                var articleURL = article.link[0];

                Articles.find({
                    title: title
                }, function( err, article ) {
                    if ( err ) {
                        console.log( err );
                    } else {
                        if ( article.length === 0 ) {
                            
                            Articles.create({
                                title: title,
                                url: articleURL
                            }).then( function( createdArticle ) {
                                articleRequester( articleURL, callback );
                            });

                        } else {
                            
                            console.log( 'Already exists' );
                            callback();

                        }
                    }
                });

            }, function( err ) {
                if ( err ) {
                    console.log( err );
                }
                mongoose.connection.close();


            });


        });
    }
})

var articleRequester = function( url, callback ) {
    var tags = [];
    request( url, function( error, response, body ) {
        if (!error && response.statusCode == 200) {
            $ = cheerio.load( body );
            $('#tags').find('a').each(function() {
                tags.push( $(this).text() );
            });
            constructTweet( url, tags, callback );
        }
    });
};

var constructTweet = function( url, tags, callback ) {
    var tweet = '';
    _.forEach( tags, function( tag ) {
        tweet += '"' + tag + '", ';
    });
    formattedTweet = tweet.substring(0, tweet.lastIndexOf(', ')) + ' ';
    formattedTweet += url;

    if ( tags.length === 0 ) {
        callback();
    } else {

        client.post('statuses/update', {
            status: formattedTweet
        }, function(error, tweet, response) {
            if ( error ) {
                // error is probably going to be regarding tweet length
                // remove a tag and try again
                // if it's something else, the app will break. ¯\_(ツ)_/¯
                tags.pop();
                constructTweet( url, tags, callback );
            } else {
                console.log( 'twatted' );
                callback();
            }
        });
        
    }

};