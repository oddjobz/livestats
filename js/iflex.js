//////////////////////////////////////////////////////////////////////////////
//
//  iflex.js
//  (c) Gareth Bult 2017
//  License: GPLv2 or later
//
//  Depends on: jQuery, iflex_spa
//
//  Simple interface to Crossbar.io router instance, hooks "record_page"
//  into the SPA module to send current page details to the router whenever
//  someone switched between pages .. *needs a cleanup!*
//
//////////////////////////////////////////////////////////////////////////////
//
var iflex = iflex||null;
var iflexrts_login = iflexrts_login||null;
var log_data = log_data||[];
var iflex_spa_callbacks = iflex_spa_callbacks || {};
var iFlexObject = iFlexObject||{
    debug_on: true,
    subscriptions: {},
    subs_table: {},
    hooks: {},
    uas: null,
    channel: 'url',
    protocols: {'http:':'ws','https:':'wss'},
    callback: null,
    lost: null,
    retrying: false,
    login: false,
    site_id: window.location.hostname,
    credentials: {
        authmethods : ['wampcra'],
        initial_retry_delay: 1,
        max_retry_delay: 4,
        retry_delay_growth: 1.1,
        max_retries: -1,
        authid : 'guest',
        password : 'guest',
        realm : 'crossbar'
    },
    add_hook: function(hook, action) {
        if(!(hook in this.hooks)) this.hooks[hook] = [];
        this.hooks[hook].push(action);
    },
    run_hooks: function(key, params) {
        if(!(key in this.hooks)) return;
        jQuery.each(this.hooks[key], function() {
            this(params);
        });
    },
    debug: function(msg) {
        if(!this.debug_on) return;
        var stack = new Error().stack.split("\n")[2].split("/").pop().split(":");
        console.log('# {p}:{l} > {m}'.format({p:stack[0],l:stack[1],m:msg}));
    },
    initialize: function() {
        var _this = this, my = document.location, port = '8000';
        if(my.protocol == 'https:') port = '8001';
        params = jQuery.extend({}, my, {port: port, proto: _this.protocols[my.protocol]});
        _this.credentials.url = '{proto}://livestats.iflexrts.uk:{port}/ws'.format(params);
        _this.debug('Initialise: {url}'.format(_this.credentials));
        _this.credentials.onchallenge = function(session, method, extra) {
            return _this.autobahn.auth_cra.sign(_this.credentials.password,extra.challenge);
        };
        _this.connect();
    },
    disconnect: function() {
        var _this = this;
        _this.run_hooks('disconnect');
        _this.login = false;
        this.connection.close('closed');
    },
    connect: function(callback, lost) {
        var _this = this;
        _this.debug('Connecting with ({a}) credentials'.format({a:_this.credentials.authid}));
        var open = function(session, details) {
            _this.session = session;
            if(_this.callback) _this.callback();
            jQuery.each(_this.subs_table, function(topic, action) {
                iflex.subscribe(topic, action);
            });
            _this.run_hooks('connect', {session: session, details: details});
            _this.send({url:window.location.href,title: document.title,uas: navigator.userAgent,ref:document.referrer});
        };
        var close = function(reason, details) {
            _this.session = null;
            switch(reason) {
                case 'closed':
                    _this.debug('Close [no retry] :: {d}'.format({d:details.reason}));
                    if(_this.lost) _this.lost(false);
                    return true;
                case 'unsupported':
                    _this.debug('No websocket transport');
                    if(_this.lost) _this.lost(false);
                    return true;
                case 'lost':            _this.debug('Connection lost - will retry');            break;
                case 'unreachable':     _this.debug('Connection unreachable - will retry');     break;
                default:
                    params = {r:details.reason,m:details.message};
                    _this.debug("Closed - no retry reason ({r}) message ({m})".format(params));
            }
            if(_this.lost) _this.lost(true);
            return false;
        };
        _this.autobahn = autobahn;
        _this.debug('Autobahn version ..' + _this.autobahn.version);
        _this.connection = new _this.autobahn.Connection(_this.credentials);
        _this.connection.onopen = open;
        _this.connection.onclose = close;
        _this.connection.open();
        if(callback) this.callback = callback;
        if(lost) this.lost = lost;
    },
    send: function(msg) {
        var _this = this;
        var clear_backlog = function() {
            if(!log_data.length) {
                _this.retrying = false;
                return;
            }
            _this.retrying = true;
            var msg = log_data.shift();
            var failure = function(err) {
                log_data.unshift(msg);
                setTimeout(function(){clear_backlog();}, 5000);
            };
            var success = function(data) {
                if(data) _this.channel = data.channel;
                //console.log("% cleared backlog to -> ", log_data.length);
                setTimeout(function(){clear_backlog();}, 0);
            }
            if(!_this.session) return failure({err: 'not connected'});
            _this.session.call('pub.log.'+_this.channel,[msg]).then(success,failure);
        };
        var success = function(data) {
            if(data) _this.channel = data.channel;
        }
        var failure = function(err) {
            log_data.push(msg);
            setTimeout(function(){clear_backlog();}, 5000);
        }
        if(!msg) {
            setTimeout(function(){clear_backlog();}, 0);
            return;
        }
        if(iflexrts_login&&!_this.login) {
            msg['login'] = iflexrts_login;
            msg['admin'] = iflexrts_admin;
            msg['name'] = iflexrts_name;
            msg['picture'] = iflexrts_picture;
            _this.login = true;
        }
        log_data.push(msg);
        if(!_this.retrying) setTimeout(function(){clear_backlog();}, 0);
    },    
    call: function(topic, args, success, failure) {
        var _this = this;
        try {
            var _str = JSON.stringify(args);
            _this.debug('Call {f}({a})'.format({f:topic,a:_str}));
            _this.session.call(topic,[args]).then(success,failure);
        }
        catch(err) {
            if(err.error == 'wamp.error.no_such_procedure') {
                console.log("... Looks like the server is down, will retry ...")
                setTimeout(function(){
                    _this.call(topic, args, success, failure);
                },1000);
            } else {
                console.log("Unexpected error: ", err.error);
                console.log("Topic> ", topic, " Args>", args);
                console.log("...args: ", err.args);
                console.log("KW args: ", err.kwargs);
            }
        }
    },
    add_subscription: function(topic, handler) {
        if(!(topic in this.subs_table))
            this.subs_table[topic] = handler;
        if(this.session) this.subscribe(topic, handler);
    },
    subscribe: function(topic, handler) {
        var _this = this;
        topic = topic.toLowerCase();
        function success(subscription) {
            _this.subscriptions[topic] = subscription;
            _this.debug('Subscribed to: '+topic);
        };
        function failure(data) {
            _this.debug('Subscription failed for ({t}} ({e})'.format({t:topic,e:data.error}));
        };
        try {
            _this.session.subscribe(topic, handler).then(success,failure);
        } catch(err) {
            _this.debug(err);
        }
    },
    unsubscribe: function(topic) {
        var _this = this;
        if(!(topic in _this.subscriptions)) {
            console.log("Failed ttempt to unsubscribe: ",topic);
            return
        };
        var subscription = _this.subscriptions[topic];
        console.log("Unsubscribe: ",topic);
        var success = function(args) {
            console.log("Args>",args)
            delete _this.subscriptions[topic];
        };
        var failure = function(args) {
            console.log("Ubsub fail>",args);
        }
        _this.session.unsubscribe(subscription).then(success,failure);
    },
    record_page: function() {
        iflex.send({url: window.location.href, title: document.title});
    }
};
String.prototype.format = function( params )
{return this.replace(/\{(\w+)\}/g,function( a,b ) { return params[ b ]; });};

jQuery(document).ready(function() {
    if(!iflex) {
        iflex = jQuery.extend({}, iFlexObject);
        iflex.initialize();
        iflex_spa_callbacks['livestats'] = iflex.record_page;
    }
});
