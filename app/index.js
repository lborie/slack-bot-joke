'use strict';

require('console-stamp')(console);

var Slack = require('slack-client'),
    token = process.env.SLACK_TOKEN,
    jokeProviders = [
    	require('./jokes/providers/humour-blague-service.js'),
    	require('./jokes/providers/marrez-vous-service.js'),
        require('./jokes/providers/labanane-service.js')
    ],
    chatons = require('./chatons/ditesleavecdeschatons-service.js'),
    catchall = require('./catchall/catchall-service.js'),
    poils = require('./poils/poils-service.js'),
    excusesdedev = require('./excusesdedev/excusesdedev-service.js'),
    savoirinutile = require('./savoirinutile/savoirinutile-service.js'),
    citation = require('./kaakook/kaakook-service');

var slack = new Slack(token, true, true),
    providersOption = {
        maxLength: 600
    };

function getProvider() {
	return jokeProviders[Math.floor(Math.random() * jokeProviders.length)];
}

slack.on('open', function () {
    var channels = Object.keys(slack.channels)
        .map(function (k) { return slack.channels[k]; })
        .filter(function (c) { return c.is_member; })
        .map(function (c) { return c.name; });

    var groups = Object.keys(slack.groups)
        .map(function (k) { return slack.groups[k]; })
        .filter(function (g) { return g.is_open && !g.is_archived; })
        .map(function (g) { return g.name; });

    console.info('Welcome to Slack. You are ' + slack.self.name + ' of ' + slack.team.name);

    if (channels.length > 0) {
        console.info('You are in: ' + channels.join(', '));
    }
    else {
        console.info('You are not in any channels.');
    }

    if (groups.length > 0) {
       console.info('As well as: ' + groups.join(', '));
    }
});

function sendMessages(channel, arrayToSend) {
    setTimeout(function(e) {
        var toSend = arrayToSend.shift();
        if(toSend !== undefined) {
            channel.send(toSend);
        }
        if(arrayToSend.length > 0) {
            sendMessages(channel, arrayToSend);
        }
    }, 50);
}

slack.on('error', function(error) {
    console.error(error);
});

slack.on('message', function(message) {
    var channel = slack.getChannelGroupOrDMByID(message.channel);
    var user = slack.getUserByID(message.user);

    if (message.type === 'message') {
        var futureFound;
        switch(message.text.toLowerCase()) {
            case 'blague':
                futureFound = getProvider().getJoke(providersOption)
                    .then(function(data) {
                        sendMessages(channel, data);
                    });
                break;
            case 'inutile':
            case 'savoir':
                futureFound = savoirinutile.getSavoirInutile()
                    .then(function(data) {
                        channel.send(data);
                    });
                break;
            case 'excuse':
            case 'excuses':
            case 'dev':
            case 'devs':
                futureFound = excusesdedev.getExcuse()
                    .then(function(data) {
                        channel.send(data);
                    });
                break;
            case 'citation':
            case 'film':
                futureFound = citation.getCitation()
                    .then(function(data) {
                        sendMessages(channel, data);
                    });
                break;
            case 'chaton':
                futureFound = chatons.getLink()
                    .then(function(data) {
                        channel.postMessage({
                            as_user: true,
                            attachments: [
                                {
                                    fallback: 'chaton: ' + data,
                                    'image_url': data
                                }
                            ]
                        });
                    });
                break;
            default:
                futureFound = catchall.getImageForWord(message.text.toLowerCase())
                    .then(function(data) {
                        channel.postMessage({
                            as_user: true,
                            attachments: [
                                {
                                    fallback: 'nope: ' + data,
                                    'image_url': data
                                }
                            ]
                        });
                    });
                break;
        }
        futureFound.then(function() {
            // Do nothing
        }, function() {
            poils.getResponse(message.text.toLowerCase())
                .then(function(data) {
                    channel.send(data);
                });
        });
    }
});

slack.login();
