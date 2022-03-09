class SampleAction3 extends Action {
    
    constructor(UUID) {
        super(UUID)
        this.registerKeyUp(this.handleKeyUp)
    }

    handleKeyUp({ action, context, device, event, payload }){
       //StreamDeck.openUrl('https://developer.elgato.com/documentation/stream-deck/sdk/overview/');
		console.log(this);
        //console.log('Click', this.UUID);
	    //StreamDeck.showOk(context);
	} 

    // templateAction.registerKeyUp(({ action, context, device, event, payload }) => {
	// 	StreamDeck.openUrl('https://developer.elgato.com/documentation/stream-deck/sdk/overview/');
	// 	console.log('Your code goes here!');
	// 	StreamDeck.showOk(context);
	// });

    // onConnected(jsn) {
    //     $SD.on(this.type + '.willAppear', (jsonObj) => this.onWillAppear(jsonObj))
    //     $SD.on(this.type + '.didReceiveSettings', (jsonObj) => this.onDidReceiveSettings(jsonObj))
    //     $SD.on(this.type + '.keyDown', (jsonObj) => this.onKeyDown(jsonObj))
    //     $SD.on(this.type + '.keyUp', (jsonObj) => this.onKeyUp(jsonObj))
    //     $SD.on(this.type + '.longPress', (jsonObj) => this.onLongPress(jsonObj))
    //     $SD.on(this.type + '.sendToPlugin', (jsonObj) => this.onSendToPlugin(jsonObj))
    //     $SD.on(this.type + '.propertyInspectorDidAppear', (jsonObj) => this.onPropertyInspectorDidAppear(jsonObj))
    //     $SD.on(this.type + '.propertyInspectorDidDisappear', (jsonObj) => console.log("propertyInspectorDidDisappear"))
    // }

}
