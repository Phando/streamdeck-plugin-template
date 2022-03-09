
/// <reference path="constants.js" />

/**
 * @class Context
 * A structure to hold action instance specific data intended to act as a persistent action scope.
 */
class Context {
    clickCount  = 0;
    downtimer   = null;
    isLongPress = false;
    stateName   = STATE_DEFAULT;
    action      = "";
    context     = "";
    coordinates = "";
    settings    = "";

    constructor(data) {
        this.update(data);
    }

    update(data){
        const {action, context, coordinates, settings} = data;
        this.action = action;
        this.coordinates = coordinates;
    }
}