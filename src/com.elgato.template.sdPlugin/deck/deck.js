/* global $SD, $localizedStrings */
/* exported, $localizedStrings */
/* eslint no-undef: "error",
  curly: 0,
  no-caller: 0,
  wrap-iife: 0,
  one-var: 0,
  no-var: 0,
  vars-on-top: 0
*/

// don't change this to let or const, because we rely on var's hoisting
// eslint-disable-next-line no-use-before-define, no-var
var $localizedStrings = $localizedStrings || {},
    REMOTESETTINGS = REMOTESETTINGS || {},
    DestinationEnum = Object.freeze({
        HARDWARE_AND_SOFTWARE: 0,
        HARDWARE_ONLY: 1,
        SOFTWARE_ONLY: 2
    }),
    // eslint-disable-next-line no-unused-vars
    isQT = navigator.appVersion.includes('QtWebEngine'),
    debug = debug || false,
    debugLog = function () {},
    MIMAGECACHE = MIMAGECACHE || {};

const setDebugOutput = (debug) => (debug === true) ? console.log.bind(window.console) : function () {};
debugLog = setDebugOutput(debug);

// Create a wrapper to allow passing JSON to the socket
WebSocket.prototype.sendJSON = function (jsn, log) {
    if (log) {
        console.log('SendJSON', this, jsn);
    }
    // if (this.readyState) {
    this.send(JSON.stringify(jsn));
    // }
};

/* eslint no-extend-native: ["error", { "exceptions": ["String"] }] */
String.prototype.lox = function () {
    var a = String(this);
    try {
        a = $localizedStrings[a] || a;
    } catch (b) {}
    return a;
};

const loadLocalization = (lang, pathPrefix, cb) => {
    Utils.readJson(`${pathPrefix}${lang}.json`, function (jsn) {
        const manifest = Utils.parseJson(jsn);
        $localizedStrings = manifest && manifest.hasOwnProperty('Localization') ? manifest['Localization'] : {};
        debugLog($localizedStrings);
        if (cb && typeof cb === 'function') cb();
    });
}

var Utils = {};
// TODOZ remove this
Utils.isCanvas = (value) => {
    return value instanceof HTMLCanvasElement;
};
Utils.setDebugOutput = (debug) => {
    return (debug === true) ? console.log.bind(window.console) : function () {};
};
Utils.randomString = function (len = 8) {
    return Array.apply(0, Array(len))
        .map(function () {
            return (function (charset) {
                return charset.charAt(
                    Math.floor(Math.random() * charset.length)
                );
            })(
                'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
            );
        })
        .join('');
};
Utils.measureText = (text, font) => {
    const canvas = Utils.measureText.canvas || (Utils.measureText.canvas = document.createElement("canvas"));
    const ctx = canvas.getContext("2d");
    ctx.font = font || 'bold 10pt system-ui';
    return ctx.measureText(text).width;
};
Utils.hexToRgb = function (hex) {
    const match = hex.replace(/#/, '').match(/.{1,2}/g);
    return {
        r: parseInt(match[0], 16),
        g: parseInt(match[1], 16),
        b: parseInt(match[2], 16)
    };
};
Utils.rgbToHex = (r, g, b) => '#' + [r, g, b].map(x => {
    return x.toString(16).padStart(2,0)
}).join('')
Utils.nscolorToRgb = function (rP, gP, bP) {
    return {
        r : Math.round(rP * 255),
        g : Math.round(gP * 255),
        b : Math.round(bP * 255)
    }
};
Utils.readJson = function (file, callback) {
    var req = new XMLHttpRequest();
    req.onerror = function (e) {
        // Utils.log(`[Utils][readJson] Error while trying to read  ${file}`, e);
    };
    req.overrideMimeType('application/json');
    req.open('GET', file, true);
    req.onreadystatechange = function () {
        if (req.readyState === 4) {
            // && req.status == "200") {
            if (callback) callback(req.responseText);
        }
    };
    req.send(null);
};
Utils.parseJson = function (jsonString) {
    if (typeof jsonString === 'object') return jsonString;
    try {
        const o = JSON.parse(jsonString);

        // Handle non-exception-throwing cases:
        // Neither JSON.parse(false) or JSON.parse(1234) throw errors, hence the type-checking,
        // but... JSON.parse(null) returns null, and typeof null === "object",
        // so we must check for that, too. Thankfully, null is falsey, so this suffices:
        if (o && typeof o === 'object') {
            return o;
        }
    } catch (e) {}

    return false;
};

window['_'] = Utils;

/*
 * connectElgatoStreamDeckSocket
 * This is the first function StreamDeck Software calls, when
 * establishing the connection to the plugin or the Property Inspector
 * @param {string} inPort - The socket's port to communicate with StreamDeck software.
 * @param {string} inUUID - A unique identifier, which StreamDeck uses to communicate with the plugin
 * @param {string} inMessageType - Identifies, if the event is meant for the property inspector or the plugin.
 * @param {string} inApplicationInfo - Information about the host (StreamDeck) application
 * @param {string} inActionInfo - Context is an internal identifier used to communicate to the host application.
 */


// eslint-disable-next-line no-unused-vars
function connectElgatoStreamDeckSocket (
    inPort,
    inUUID,
    inMessageType,
    inApplicationInfo,
    inActionInfo
) {
    const appInfo = JSON.parse(inApplicationInfo);
    console.log({inPort, inUUID, inMessageType, appInfo, inActionInfo, arguments})
    StreamDeck.getInstance().connect(arguments);
    window.$SD.api = Object.assign({ send: SDApi.send }, SDApi.common, SDApi[inMessageType]);
}
const connectSocket = connectElgatoStreamDeckSocket;
/**
 * StreamDeck object containing all required code to establish
 * communication with SD-Software and the Property Inspector
 */

const StreamDeck = (function () {
    // Hello it's me
    var instance;
    /*
      Populate and initialize internally used properties
    */

    function init () {
        // *** PRIVATE ***

        var inPort,
            inUUID,
            inMessageType,
            inApplicationInfo,
            inActionInfo,
            websocket = null;

        var events = ELGEvents.eventEmitter();
        var logger = SDDebug.logger();

        function showVars () {
            debugLog('---- showVars');
            debugLog('- port', inPort);
            debugLog('- uuid', inUUID);
            debugLog('- messagetype', inMessageType);
            debugLog('- info', inApplicationInfo);
            debugLog('- inActionInfo', inActionInfo);
            debugLog('----< showVars');
        }

        function connect (args) {
            inPort = args[0];
            inUUID = args[1];
            inMessageType = args[2];
            inApplicationInfo = Utils.parseJson(args[3]);
            inActionInfo = args[4] !== 'undefined' ? Utils.parseJson(args[4]) : args[4];

            /** Debug variables */
            if (debug) {
                showVars();
            }

            const lang = inApplicationInfo?.application?.language ?? false;
            if (lang) {
                loadLocalization(lang, inMessageType === 'registerPropertyInspector' ? '../localization/' : './', function() {
                    events.emit('localizationLoaded', {language:lang});
                });
            };

            /** restrict the API to what's possible
             * within Plugin or Property Inspector
             * <unused for now>
             */
            // $SD.api = SDApi[inMessageType];

            if (websocket) {
                websocket.close();
                websocket = null;
            };

            websocket = new WebSocket('ws://127.0.0.1:' + inPort);

            websocket.onopen = function () {
                var json = {
                    event: inMessageType,
                    uuid: inUUID
                };

                // console.log('***************', inMessageType + "  websocket:onopen", inUUID, json);

                websocket.sendJSON(json);
                $SD.uuid = inUUID;
                $SD.actionInfo = inActionInfo;
                $SD.applicationInfo = inApplicationInfo;
                $SD.messageType = inMessageType;
                $SD.connection = websocket;

                instance.emit('connected', {
                    connection: websocket,
                    port: inPort,
                    uuid: inUUID,
                    actionInfo: inActionInfo,
                    applicationInfo: inApplicationInfo,
                    messageType: inMessageType
                });
            };

            websocket.onerror = function (evt) {
                console.warn('WEBOCKET ERROR', evt, evt.data);
            };

            websocket.onclose = function (evt) {
                // Websocket is closed
                var reason = WEBSOCKETERROR(evt);
                console.warn(
                    '[STREAMDECK]***** WEBOCKET CLOSED **** reason:',
                    reason
                );
            };

            websocket.onmessage = function (evt) {
                var jsonObj = Utils.parseJson(evt.data),
                    m;

                // console.log('[STREAMDECK] websocket.onmessage ... ', jsonObj.event, jsonObj);

                if (!jsonObj.hasOwnProperty('action')) {
                    m = jsonObj.event;
                    // console.log('%c%s', 'color: white; background: red; font-size: 12px;', '[deck.js]onmessage:', m);
                } else {
                    switch (inMessageType) {
                    case 'registerPlugin':
                        m = jsonObj['action'] + '.' + jsonObj['event'];
                        break;
                    case 'registerPropertyInspector':
                        m = 'sendToPropertyInspector';
                        break;
                    default:
                        console.log('%c%s', 'color: white; background: red; font-size: 12px;', '[STREAMDECK] websocket.onmessage +++++++++  PROBLEM ++++++++');
                        console.warn('UNREGISTERED MESSAGETYPE:', inMessageType);
                    }
                }

                if (m && m !== '')
                    events.emit(m, jsonObj);
            };

            instance.connection = websocket;
        }

        return {
            // *** PUBLIC ***

            uuid: inUUID,
            on: events.on,
            emit: events.emit,
            connection: websocket,
            connect: connect,
            api: null,
            logger: logger
        };
    }

    return {
        getInstance: function () {
            if (!instance) {
                instance = init();
            }
            return instance;
        }
    };
})();

// eslint-disable-next-line no-unused-vars
function initializeControlCenterClient () {
    const settings = Object.assign(REMOTESETTINGS || {}, { debug: false });
    var $CC = new ControlCenterClient(settings);
    window['$CC'] = $CC;
    return $CC;
}

/** ELGEvents
 * Publish/Subscribe pattern to quickly signal events to
 * the plugin, property inspector and data.
 */

const ELGEvents = {
    eventEmitter: function (name, fn) {
        const eventList = new Map();

        const on = (name, fn) => {
            if (!eventList.has(name)) eventList.set(name, ELGEvents.pubSub());

            return eventList.get(name).sub(fn);
        };

        const has = (name) =>
            eventList.has(name);

        const emit = (name, data) =>
            eventList.has(name) && eventList.get(name).pub(data);

        return Object.freeze({ on, has, emit, eventList });
    },

    pubSub: function pubSub () {
        const subscribers = new Set();

        const sub = fn => {
            subscribers.add(fn);
            return () => {
                subscribers.delete(fn);
            };
        };

        const pub = data => subscribers.forEach(fn => fn(data));
        return Object.freeze({ pub, sub });
    }
};

/** SDApi
 * This ist the main API to communicate between plugin, property inspector and
 * application host.
 * Internal functions:
 * - setContext: sets the context of the current plugin
 * - exec: prepare the correct JSON structure and send
 *
 * Methods exposed in the $SD.api alias
 * Messages send from the plugin
 * -----------------------------
 * - showAlert
 * - showOK
 * - setSettings
 * - setTitle
 * - setImage
 * - sendToPropertyInspector
 *
 * Messages send from Property Inspector
 * -------------------------------------
 * - sendToPlugin
 *
 * Messages received in the plugin
 * -------------------------------
 * willAppear
 * willDisappear
 * keyDown
 * keyUp
 */

const SDApi = {
    send: function (context, fn, payload, debug) {
        /** Combine the passed JSON with the name of the event and it's context
         * If the payload contains 'event' or 'context' keys, it will overwrite existing 'event' or 'context'.
         * This function is non-mutating and thereby creates a new object containing
         * all keys of the original JSON objects.
         */
        const pl = Object.assign({}, { event: fn, context: context }, payload);

        /** Check, if we have a connection, and if, send the JSON payload */
        if (debug) {
            console.log('-----SDApi.send-----');
            console.log('context', context);
            console.log(pl);
            console.log(payload.payload);
            console.log(JSON.stringify(payload.payload));
            console.log('-------');
        }
        $SD.connection && $SD.connection.sendJSON(pl);

        /**
         * DEBUG-Utility to quickly show the current payload in the Property Inspector.
         */

        if (
            $SD.connection &&
            [
                'sendToPropertyInspector',
                'showOK',
                'showAlert',
                'setSettings'
            ].indexOf(fn) === -1
        ) {
            // console.log("send.sendToPropertyInspector", payload);
            // this.sendToPropertyInspector(context, typeof payload.payload==='object' ? JSON.stringify(payload.payload) : JSON.stringify({'payload':payload.payload}), pl['action']);
        }
    },

    registerPlugin: {

        /** Messages send from the plugin */
        showAlert: function (context) {
            SDApi.send(context, 'showAlert', {});
        },

        showOk: function (context) {
            SDApi.send(context, 'showOk', {});
        },


        setState: function (context, payload) {
            SDApi.send(context, 'setState', {
                payload: {
                    'state': 1 - Number(payload === 0)
                }
            });
        },

        setTitle: function (context, title, target) {
            SDApi.send(context, 'setTitle', {
                payload: {
                    title: '' + title || '',
                    target: target || DestinationEnum.HARDWARE_AND_SOFTWARE
                }
            });
        },

        setImage: function (context, img, target) {
            SDApi.send(context, 'setImage', {
                payload: {
                    image: img || '',
                    target: target || DestinationEnum.HARDWARE_AND_SOFTWARE
                }
            });
        },

        sendToPropertyInspector: function (context, payload, action) {
            SDApi.send(context, 'sendToPropertyInspector', {
                action: action,
                payload: payload
            });
        },

        showUrl2: function (context, urlToOpen) {
            SDApi.send(context, 'openUrl', {
                payload: {
                    url: urlToOpen
                }
            });
        }
    },

    /** Messages send from Property Inspector */

    registerPropertyInspector: {

        sendToPlugin: function (piUUID, action, payload) {
            SDApi.send(
                piUUID,
                'sendToPlugin',
                {
                    action: action,
                    payload: payload || {}
                },
                false
            );
        }
    },

    /** COMMON */

    common: {

        getSettings: function (context, payload) {
            SDApi.send(context, 'getSettings', {});
        },

        setSettings: function (context, payload) {
            SDApi.send(context, 'setSettings', {
                payload: payload
            });
        },

        getGlobalSettings: function (context, payload) {
            SDApi.send(context, 'getGlobalSettings', {});
        },

        setGlobalSettings: function (context, payload) {
            SDApi.send(context, 'setGlobalSettings', {
                payload: payload
            });
        },

        logMessage: function () {
           /**
            * for logMessage we don't need a context, so we allow both
            * logMessage(unneededContext, 'message')
            * and
            * logMessage('message')
            */

            let payload = (arguments.length > 1) ? arguments[1] : arguments[0];

            SDApi.send(null, 'logMessage', {
                payload: {
                    message: payload
                }
            });
        },

        openUrl: function (context, urlToOpen) {
            SDApi.send(context, 'openUrl', {
                payload: {
                    url: urlToOpen
                }
            });
        },

        test: function () {
            console.log(this);
            console.log(SDApi);
        },

        debugPrint: function (context, inString) {
            // console.log("------------ DEBUGPRINT");
            // console.log([].slice.apply(arguments).join());
            // console.log("------------ DEBUGPRINT");
            SDApi.send(context, 'debugPrint', {
                payload: [].slice.apply(arguments).join('.') || ''
            });
        },

        dbgSend: function (fn, context) {
            /** lookup if an appropriate function exists */
            if ($SD.connection && this[fn] && typeof this[fn] === 'function') {
                /** verify if type of payload is an object/json */
                const payload = this[fn]();
                if (typeof payload === 'object') {
                    Object.assign({ event: fn, context: context }, payload);
                    $SD.connection && $SD.connection.sendJSON(payload);
                }
            }
            console.log(this, fn, typeof this[fn], this[fn]());
        }

    }
};

/** SDDebug
 * Utility to log the JSON structure of an incoming object
 */

const SDDebug = {
    logger: function (name, fn) {
        const logEvent = jsn => {
            console.log('____SDDebug.logger.logEvent');
            console.log(jsn);
            debugLog('-->> Received Obj:', jsn);
            debugLog('jsonObj', jsn);
            debugLog('event', jsn['event']);
            debugLog('actionType', jsn['actionType']);
            debugLog('settings', jsn['settings']);
            debugLog('coordinates', jsn['coordinates']);
            debugLog('---');
        };

        const logSomething = jsn =>
            console.log('____SDDebug.logger.logSomething');

        return { logEvent, logSomething };
    }
};

/**
 * This is the instance of the StreamDeck object.
 * There's only one StreamDeck object, which carries
 * connection parameters and handles communication
 * to/from the software's PluginManager.
 */

window.$SD = StreamDeck.getInstance();
window.$SD.api = SDApi;

function WEBSOCKETERROR (evt) {
    // Websocket is closed
    var reason = '';
    if (evt.code === 1000) {
        reason = 'Normal Closure. The purpose for which the connection was established has been fulfilled.';
    } else if (evt.code === 1001) {
        reason = 'Going Away. An endpoint is "going away", such as a server going down or a browser having navigated away from a page.';
    } else if (evt.code === 1002) {
        reason = 'Protocol error. An endpoint is terminating the connection due to a protocol error';
    } else if (evt.code === 1003) {
        reason = "Unsupported Data. An endpoint received a type of data it doesn't support.";
    } else if (evt.code === 1004) {
        reason = '--Reserved--. The specific meaning might be defined in the future.';
    } else if (evt.code === 1005) {
        reason = 'No Status. No status code was actually present.';
    } else if (evt.code === 1006) {
        reason = 'Abnormal Closure. The connection was closed abnormally, e.g., without sending or receiving a Close control frame';
    } else if (evt.code === 1007) {
        reason = 'Invalid frame payload data. The connection was closed, because the received data was not consistent with the type of the message (e.g., non-UTF-8 [http://tools.ietf.org/html/rfc3629]).';
    } else if (evt.code === 1008) {
        reason = 'Policy Violation. The connection was closed, because current message data "violates its policy". This reason is given either if there is no other suitable reason, or if there is a need to hide specific details about the policy.';
    } else if (evt.code === 1009) {
        reason = 'Message Too Big. Connection closed because the message is too big for it to process.';
    } else if (evt.code === 1010) { // Note that this status code is not used by the server, because it can fail the WebSocket handshake instead.
        reason = "Mandatory Ext. Connection is terminated the connection because the server didn't negotiate one or more extensions in the WebSocket handshake. <br /> Mandatory extensions were: " + evt.reason;
    } else if (evt.code === 1011) {
        reason = 'Internl Server Error. Connection closed because it encountered an unexpected condition that prevented it from fulfilling the request.';
    } else if (evt.code === 1015) {
        reason = "TLS Handshake. The connection was closed due to a failure to perform a TLS handshake (e.g., the server certificate can't be verified).";
    } else {
        reason = 'Unknown reason';
    }

    return reason;
}

const SOCKETERRORS = {
    '0': 'The connection has not yet been established',
    '1': 'The connection is established and communication is possible',
    '2': 'The connection is going through the closing handshake',
    '3': 'The connection has been closed or could not be opened'
};
