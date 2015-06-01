/**::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::
@license Zoomify Image Viewer, version on line 26 below. Copyright Zoomify, Inc., 1999-2015. All rights reserved. You may 
use this file on private and public websites, for personal and commercial purposes, with or without modifications, so long as this 
notice is included. Redistribution via other means is not permitted without prior permission. Additional terms apply. For complete 
license terms please see the Zoomify License Agreement in this product and on the Zoomify website at www.zoomify.com.
::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::
*/

/*
The functions below are listed in groups in the following order: Initialization, ZoomifyImageViewer,
ZoomifyViewport, ZoomifyToolbar, ZoomifyNavigator, ZoomifyRuler, NetConnector, and Utils.  Within each
group the functions appear in the order in which they are first called.  Each group serves as a
component with its own global variables and functions for sizing, positioning, and interaction.
Shared variables global at the scope of the Zoomify Image Viewer are declared in a single 'Z'
object which provides easy access while preventing naming conflicts with other code sources.
*/


(function () {
	// Declare global-to-page object to contain global-to-viewer elements.
	var global = (function () { return this; } ).call();
	global.Z = {};
})();

// Debug value: Display in browser console or use function Z.Viewer.getVersion(); to get value.
Z.version = '2.3.01 Pro';

// Debug option: For trapping errors in Safari on Windows.
//window.onerror = function (error) { alert(error); };



//::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::
//:::::::::::::::::::::::::::::::::: INIT FUNCTIONS :::::::::::::::::::::::::::::::::
//::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::

Z.showImage = function (containerID, imagePath, optionalParams) {
	if (!Z.showImage.done) {		
		// Ensure full initialization occurs only on first call to showImage.
		Z.showImage.done = true;

		// Ensure needed browser functions exist.
		Z.Utils.addCrossBrowserMethods();
		Z.Utils.addCrossBrowserEvents();

		// Declare all global variables in one global object and get web page parameters.
		Z.Utils.declareGlobals();
		Z.pageContainerID = containerID;
		
		// Setting of callbacks and permission function implemented as function of Viewer for early and global support.
		Z.setCallback = function (callbackEvent, callbackFunction) {
			var index = Z.Utils.arrayIndexOfObjectTwoValues(Z.callbacks, 'callbackEvent', callbackEvent, null, 'callbackFunction', callbackFunction);
			if (index == -1) { index = Z.callbacks.length; }
			Z.callbacks[index] = { callbackEvent:callbackEvent, callbackFunction:callbackFunction };
		}
		
		// Debug options: 
		//Z.setCallback('viewUpdateComplete', function () { console.log('View update complete!'); } );
		//Z.setCallback('labelCreatedGetInternalID', function () { console.log('Label created!'); } );
				
		Z.clearCallback = function (callbackEvent, callbackFunction) {
			var index = Z.Utils.arrayIndexOfObjectTwoValues(Z.callbacks, 'callbackEvent', callbackEvent, null, 'callbackFunction', callbackFunction);
			if (index != -1) {
				Z.callbacks = Z.Utils.arraySplice(Z.callbacks, index, 1);
			}
		}
		
		if (typeof imagePath !== 'undefined' && imagePath !== null) {
			Z.imagePath = Z.Utils.stringRemoveTrailingSlashCharacters(imagePath);
		} else {
			Z.imagePath = null;
		}
		if (typeof optionalParams !== 'undefined') {
			if (typeof optionalParams === 'string') {
				// For optional parameters passed as strings, various escaping alternatives handled here for '&' concatenation delimiter: 
				// \u0026 handled by browser, %26 handled by unescape (deprecated), &#38; and &#038; and &amp; handled by function stringUnescapeAmpersandCharacters.
				var optionalParamsUnescaped = unescape(optionalParams);
				var optionalParamsFullyUnescaped = Z.Utils.stringUnescapeAmpersandCharacters(optionalParamsUnescaped);
				Z.parameters = Z.Utils.parseParameters(optionalParamsFullyUnescaped);
			} else {
				// For optional parameters passed as objects, above escape handling not required.
				Z.parameters = Z.Utils.parseParameters(optionalParams);
			}
			
			// Debug options: 
			// console.log('optionalParamsRaw: ' + optionalParams);
			// console.log('optionalParamsUnescaped: ' + optionalParamsUnescaped);
			// console.log('optionalParamsFullyUnescaped: ' + optionalParamsFullyUnescaped);
			// console.log('Z.parameters: ' + Z.parameters);
		}

		// Initialize on content load rather than full page load if supported by browser.
		// If showImage called by user interaction after page is loaded, call initialize() directly.
		if (document.readyState != 'complete') {
			Z.Utils.addEventListener(document, 'DOMContentLoaded', Z.initialize);
			Z.Utils.addEventListener(window, 'load', Z.initialize);
		} else {
			Z.initialize();
		}
	} else {
		// Re-declare all global variables to clear, and re-get web page parameters.
		Z.Utils.declareGlobals();
		Z.pageContainerID = containerID;
		if (typeof imagePath !== 'undefined' && imagePath !== null) {
			Z.imagePath = Z.Utils.stringRemoveTrailingSlashCharacters(imagePath);
		} else {
			Z.imagePath = null;
		}
		if (typeof optionalParams !== 'undefined') { Z.parameters = Z.Utils.parseParameters(optionalParams); }

		// Re-initialize to apply new parameters.
		Z.initialize();
	}
};

Z.initialize = function () {
	// Ensure showImage called only once during page load.
	Z.Utils.removeEventListener(document, 'DOMContentLoaded', Z.initialize);
	Z.Utils.removeEventListener(window, 'load', Z.initialize);

	// Get browser, parse web page parameters, and create Zoomify Viewer.
	Z.Utils.detectBrowserFeatures();	
	Z.Utils.setParameters(Z.parameters);
	Z.Viewer = new Z.ZoomifyImageViewer();

	// Display copyright text for user confirmation if optional parameter set.
	if (!(Z.Utils.stringValidate(Z.copyrightPath))) {
		Z.Viewer.configureViewer();
	} else {
		Z.Utils.enforceCopyright();
	}

	// If in any debug mode, present basic debugging features (trace panel, globals dialog).
	if (Z.debug > 0) { Z.Utils.trace(Z.Utils.getResource('UI_TRACEDISPLAYDEBUGINFOTEXT'), false, true); }
};



//::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::
//::::::::::::::::::::::::::::::::::::: VIEWER FUNCTIONS ::::::::::::::::::::::::::::::::::
//::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::

Z.ZoomifyImageViewer = function () {
	var self = this;
	var viewerStatus = [];
	
	// Create Viewer display area as application environment for Viewport, Toolbar and Navigator.
	Z.ViewerDisplay = Z.Utils.createContainerElement('div', 'ViewerDisplay', 'inline-block', 'relative', 'hidden', '100%', '100%', '0px', '0px', 'none', '0px', 'transparent none', '0px', '0px', 'normal', 'pointer');
	Z.pageContainer = document.getElementById(Z.pageContainerID);
	var containerS = Z.Utils.getElementStyle(Z.pageContainer);
	
	// Prevent selection of elements within Viewer, not including annotation panel text.
	Z.ViewerDisplay.style['-webkit-touch-callout'] = 'none';
	Z.ViewerDisplay.style['-moz-user-select'] = 'none';
	//Z.ViewerDisplay.style['-moz-user-select'] = '-moz-none'; // Pre Firefox v31
	Z.ViewerDisplay.style['-khtml-user-select'] = 'none';
	Z.ViewerDisplay.style['-webkit-user-select'] = 'none';
	Z.ViewerDisplay.style['-ms-user-select'] = 'none';
	Z.ViewerDisplay.style['-o-user-select'] = 'none';
	Z.ViewerDisplay.style['user-select'] = 'none';
	
	// Get container dimensions. Handle standard size values, percents, non-numerics, and non-standard percents.
	var containerDims = Z.Utils.getContainerSize(Z.pageContainer, Z.ViewerDisplay);
	Z.viewerW = containerDims.x;
	Z.viewerH = containerDims.y;
	
	// Clear container and append Viewer.
	Z.pageContainer.innerHTML = '';
	Z.pageContainer.appendChild(Z.ViewerDisplay);
		
	// Set global value to allow function initializeViewerEventListeners to enable responsive sizing if not disabled by HTML parameter zAutoResize=0 and if enabled by % container dimensions.
	Z.autoResize = (Z.autoResize !== false && Z.Utils.isElementFluid(Z.pageContainer));
	var autoResizeSkipDuration = parseInt(Z.Utils.getResource('DEFAULT_AUTORESIZESKIPDURATION'), 10);
	var autoResizeSkipTimer;
	
	// Set viewer variable for mousewheel support.
	Z.mouseWheelCompleteDuration = parseInt(Z.Utils.getResource('DEFAULT_MOUSEWHEELCOMPLETEDURATION'), 10);
		
	// If viewing imageSet declare variables global to Viewer.
	if (Z.imageSet) { var imageSetObjects = [], imageSetListDP = []; }

	// Create Viewport or load imageSet XML to determine how many Viewports to create.
	this.configureViewer = function () { 
		// Set configuration functions to execute on initialization of only Viewport or last Viewport.
		function initCallbackFunction () {
			Z.clearCallback(initCallback, initCallbackFunction);
			initializeViewerEventListeners();
			self.configureComponents(Z.viewportCurrent);
		}
		var initCallback = (!Z.imageSet) ? 'initializedViewport' : 'initializedViewer';	
		Z.setCallback(initCallback, initCallbackFunction);
		
		// Set message clearing callback to execute on drawing complete of only Viewport or last Viewport.
		function viewerReadyCallbackFunction () {
			Z.clearCallback('readyViewer', viewerReadyCallbackFunction);
			if (Z.Utils.getMessage() == Z.Utils.getResource('ALERT_LOADINGIMAGESET') || Z.Utils.getMessage() == Z.Utils.getResource('ALERT_LOADINGANNOTATIONS')) {
				Z.Utils.hideMessage();
			}
			// Finish precaching of backfile tiles if delayed for faster image set start.
			if (Z.imageSet) { precacheBackfillTilesDelayed(); }
			// Alternative implementation: finish precaching here for slidestacks but in function viewportSelect for animations.
			//if (Z.slidestack) { precacheBackfillTilesDelayed(); }
		}
		Z.setCallback('readyViewer', viewerReadyCallbackFunction);
				
		if (!Z.imageSet) {
			Z.Viewport = new Z.ZoomifyViewport(); // Enable references in all other functions that are modified for ImageSet support 
			Z.viewportCurrent = Z.Viewport;		
			
		} else {
			Z.Utils.showMessage(Z.Utils.getResource('ALERT_LOADINGIMAGESET'), false, null, 'center');
	
			var XMLPath;
			var netConnector = new Z.NetConnector();
			if (Z.imageSetPath.toLowerCase().substring(Z.imageSetPath.length - 4, Z.imageSetPath.length) != ".xml") {
				Z.imageSetPath = Z.imageSetPath + "/" + Z.Utils.getResource("DEFAULT_IMAGESETXMLFILE");
			}		
			XMLPath = Z.Utils.cacheProofPath(Z.imageSetPath);
			netConnector.loadXML(XMLPath);
		}
	}
	
	// Create Toolbar and Navigator
	this.configureComponents = function (viewport) {
		if (Z.toolbarVisible > 0 && !Z.Toolbar) {
			Z.Toolbar = new Z.ZoomifyToolbar(viewport);
		}
		if (Z.navigatorVisible > 0 && !Z.Navigator) {
			Z.Navigator = new Z.ZoomifyNavigator(viewport);
			if (Z.Navigator) { Z.Navigator.validateNavigatorGlobals(); }
		}
		if (Z.rulerVisible > 0 && !Z.Ruler) {
			Z.Ruler = new Z.ZoomifyRuler(viewport);
		}
	}
	
	this.getVersion = function () {
		return Z.version;
	}
	
	this.setSizeAndPosition = function (width, height, left, top, update) {
		Z.viewerW = width;
		Z.viewerH = height;
		Z.ViewerDisplay.style.width = width + 'px';
		Z.ViewerDisplay.style.height = height + 'px';
		if (Z.Viewport && Z.Viewport.getStatus('initialized')) { Z.Viewport.setSizeAndPosition(width, height, left, top); }
		var toolbarTop = (Z.toolbarPosition == 1) ? height - Z.toolbarH : 0;
		if (Z.ToolbarDisplay && Z.Toolbar.getInitialized()) {
			Z.Toolbar.setSizeAndPosition(width, null, null, toolbarTop);
			if (Z.toolbarAutoShowHide) { Z.Toolbar.show(true); }
		}
		if (Z.NavigatorDisplay && Z.Navigator.getInitialized()) {
			Z.Navigator.setSizeAndPosition(null, null, left, top, Z.navigatorFit);
			if (Z.navigatorVisible > 1) { Z.Navigator.setVisibility(true); }
		}
		if (update) { Z.Viewport.updateView(true); }
	}
	
	
	
	//::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::
	//::::::::::::::::::::::::::::::::::::: PATH FUNCTIONS :::::::::::::::::::::::::::::::::::::
	//::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::
	
	this.getImagePath = function () {
		return self.getImage();
	}
	
	this.getImage = function () {
		return Z.imagePath;
	}
	
	// This function included for backward compatibility with version 1.
	this.setImagePath = function (imagePath, imageProperties) {
		if (typeof imageProperties !== 'undefined' && Z.Utils.stringValidate(imageProperties)) {
			Z.imageProperties = imageProperties;
		}
		self.setImage(imagePath);
	}
	
	// Use setImage to set image path as well as any image-specific optional parameters, and any non-image-specific 
	// optional parameter including viewport, toolbar, navigator, tour, slide, hotspot, annotation, or other parameters.
	// Use showImage to force a full viewer reinitialization including all related components: toolbar, navigator, etc.
	this.setImage = function (imagePath, optionalParams, initializingCall) {
		if (Z.Viewport && (Z.Viewport.getStatus('initialized') || initializingCall)) {
			Z.Viewport.zoomAndPanAllStop(true);
			
			var proceed = true;
			if (Z.editing !== null) { proceed = validateExitCustom (); }
			if (proceed) {
			
				// Clear mask and image-specific optional parameters.
				if (Z.maskingSelection) { self.clearLabelMask(); }
				Z.Utils.clearImageParameters();

				// Reset image path.
				Z.imagePath = Z.Utils.stringRemoveTrailingSlashCharacters(imagePath);
				Z.Utils.validateImagePath();
				Z.Viewport.setImagePath(Z.imagePath);
				if (typeof optionalParams !== 'undefined') { Z.parameters = Z.Utils.parseParameters(optionalParams); }

				// If initializing, set parameters, otherwise, handled in function reinitializeViewport.
				if (initializingCall) { Z.Utils.setParameters(Z.parameters); }

				if (Z.tileSource == 'unconverted') {
					Z.Viewport.loadUnconvertedImage(imagePath);
				} else if (!Z.imageProperties) {
					var netConnector = new Z.NetConnector();
					Z.Viewport.loadImageProperties(Z.imagePath, netConnector);
				} else {
					var xmlDoc = Z.Utils.xmlConvertTextToDoc(Z.imageProperties);
					Z.Viewport.parseImageXML(xmlDoc);
				}
			}
		}
	}
	
	this.setImageWithFade = function (imagePath, optionalParams, initializingCall) {
		if (Z.Viewport && (Z.Viewport.getStatus('initialized') || initializingCall)) {
			Z.slideTransitionTimeout = window.setTimeout( function () { Z.Viewport.slideTransitionTimeoutHandler('out', imagePath, optionalParams, initializingCall); }, 50);
		}
	}
	
	this.setTourPath = function (tourPath, noReload) {
		if (Z.Viewport && Z.Viewport.getStatus('initialized')) {
			Z.Viewport.setHotspotPath(tourPath, noReload);
		}
	}

	this.setHotspotPath = function (hotspotPath, noReload) {
		if (Z.Viewport && Z.Viewport.getStatus('initialized')) {
			Z.Viewport.setHotspotPath(hotspotPath, noReload);
		}
	}
	
	this.setAnnotationPath = function (annotationPath, noReload) {	
		if (Z.Viewport && Z.Viewport.getStatus('initialized')) { 
			Z.Viewport.setAnnotationPath(annotationPath, noReload);
		}
	}
	
	this.initializePageExitEventHandler = function () {
		Z.Utils.addEventListener(window, 'beforeunload', validateExitBrowser);
	}


	//::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::
	//:::::::::::::::::::::::::::::::::: GET & SET FUNCTIONS :::::::::::::::::::::::::::::::::
	//::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::

	this.getStatus = function (vState) {
		var index = Z.Utils.arrayIndexOfObjectValue(viewerStatus, 'state', vState);
		var statusVal = (index == -1) ? false : viewerStatus[index].status;
		return statusVal;
	}
	
	this.setStatus = function (vState, vStatus) {
		var notYetSet = false;
		var index = Z.Utils.arrayIndexOfObjectValue(viewerStatus, 'state', vState);
		if (index == -1) {
			notYetSet = vStatus;
			viewerStatus[viewerStatus.length] = { state:vState, status:vStatus };
		} else {
			if (!viewerStatus[index].status && vStatus) { notYetSet = true; }
			viewerStatus[index].status = vStatus;
		}
		if (notYetSet) {
			Z.Utils.validateCallback(vState + 'Viewer');
			self.validateViewerReady(vState);
		}
	}



	//::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::
	//::::::::::::::::::::::::::::::: VALIDATION FUNCTIONS :::::::::::::::::::::::::::::::::::
	//::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::
	
	this.validateViewerStatus = function (vState) {
		var statusVal = true;		
		if (Z.imageSet) {
			for (var i = 0, j = Z.imageSetLength; i < j; i++) {
				var vpTest = Z['Viewport' + i.toString()];
				if (!vpTest.getStatus(vState)) {
					statusVal = false;
					break;
				}
			}
		}
		if (statusVal) { self.setStatus(vState, true); }
	}
	
	this.validateViewerReady = function (vState) {
		var viewportOK = (Z.Viewport && Z.Viewport.getStatus('initialized') && (Z.tileSource == 'unconverted' || (Z.Viewport.getStatus('precacheLoaded') && Z.Viewport.getStatus('backfillLoaded') && Z.Viewport.getStatus('backfillDrawn'))) && Z.Viewport.getStatus('displayLoaded') && Z.Viewport.getStatus('displayDrawn'));
		var hotspotsOK = (!Z.hotspots || Z.Viewport.getStatus('hotspotsLoaded'));
		var annotationsOK = (!Z.annotations || (Z.Viewport.getStatus('annotationsLoaded') && Z.Viewport.getStatus('annotationPanelInitialized')));
		var toolbarOK = (Z.ToolbarVisible == 0 || (Z.Toolbar && Z.Toolbar.getInitialized()));
		var navigatorOK = (!Z.NavigatorVisible || (Z.Navigator && Z.Navigator.getInitialized()));
		var rulerOK = (!Z.RulerVisible || (Z.Ruler && Z.Ruler.getInitialized()));
		var imageSetOK = (!Z.imageSet || (Z.Viewer && Z.Viewer.getStatus('initialized') && (Z.tileSource == 'unconverted' || (Z.Viewer.getStatus('precacheLoaded')  && Z.Viewer.getStatus('backfillLoaded') && Z.Viewer.getStatus('backfillDrawn'))) && Z.Viewer.getStatus('displayLoaded') && Z.Viewer.getStatus('displayDrawn')));
		var imageSetHotspotsOK = (!Z.imageSet || !Z.hotspots || (Z.Viewer && Z.Viewer.getStatus('hotspotsLoaded')));
		var imageSetAnnotationsOK = (!Z.imageSet || !Z.annotations || (Z.Viewer && Z.Viewer.getStatus('annotationsLoaded') && Z.Viewer.getStatus('annotationPanelInitialized')));
		var viewerReady = viewportOK && hotspotsOK && annotationsOK && toolbarOK && navigatorOK && rulerOK && imageSetOK && imageSetHotspotsOK && imageSetAnnotationsOK;
		
		// Debug options: 
		//console.log('In validateViewerReady - state: ' + vState + '   viewerReady: ' + viewerReady + '    values: ' + viewportOK + '  ' + hotspotsOK + '  ' + annotationsOK + '  ' + toolbarOK + '  ' + navigatorOK + '  ' + rulerOK + '  ' + imageSetOK + '  ' + imageSetHotspotsOK + '  ' + imageSetAnnotationsOK);
		//console.log(Z.Viewport.getStatus('backfillLoaded'), Z.Viewport.getStatus('displayLoaded'), Z.Viewport.getStatus('backfillDrawn'), Z.Viewport.getStatus('displayDrawn'));
		
		if (viewerReady) { Z.Viewer.setStatus('ready', true); }
		return viewerReady;
	}
	
	function validateExitBrowser (event) {
		var event = Z.Utils.event(event);
		if (event) {
			var confirmationMessage = null;
			if (Z.editing !== null && Z.Viewport.verifyEditsUnsaved()) { 
				confirmationMessage = Z.Utils.getResource('ALERT_UNSAVEDEDITSEXIST-BROWSER');
				event.returnValue = confirmationMessage;
				return confirmationMessage;
			}
		}
	}
	
	function validateExitCustom () {
		var endEditing = true;
		if (Z.editing !== null && Z.Viewport.verifyEditsUnsaved()) {
			endEditing = confirm(Z.Utils.getResource('ALERT_UNSAVEDEDITSEXIST-CUSTOM'));
		}
		return endEditing;
	}
	
	
	//::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::
	//::::::::::::::::::::::::::::::: IMAGESET FUNCTIONS :::::::::::::::::::::::::::::::::::
	//::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::
	
	// Parse slide stack list.		
	this.parseImageSetXML = function (xmlDoc, imageSetType) {
		// Clear any prior values.
		Z.Utils.arrayClear(imageSetObjects);
		Z.Utils.arrayClear(imageSetListDP);
		
		// Parse display setup information.
		Z.imageSetListPosition = Z.Utils.getResource('DEFAULT_IMAGESETLISTPOSITION');
		var imageSetListSource = Z.Utils.getResource('DEFAULT_IMAGESETLISTSOURCE');
		Z.imageSetListTitle = Z.Utils.getResource('UI_IMAGESETLISTTITLE');
		Z.imageSetStart = parseInt(Z.Utils.getResource('UI_IMAGESETSTART'), 10);
		Z.imageSetLoop = (Z.Utils.getResource('UI_IMAGESETLOOP') == '1');
		Z.sliderImageSetVisible = (Z.Utils.getResource('UI_IMAGESETSLIDER') == '1');
		Z.animationAxis = Z.Utils.getResource('DEFAULT_ANIMATIONAXIS');
		Z.animator = Z.Utils.getResource('DEFAULT_ANIMATOR');
		
		var imageSetSetup = xmlDoc.getElementsByTagName('SETUP')[0];
		if (imageSetSetup) { 
			var listPosition = imageSetSetup.getAttribute('CHOICELIST');
			if (Z.Utils.stringValidate(listPosition)) { Z.imageSetListPosition = listPosition; }
			var listSource = imageSetSetup.getAttribute('LISTSOURCE');
			if (Z.Utils.stringValidate(listSource)) { imageSetListSource = listSource; }
			var listTitle = imageSetSetup.getAttribute('LISTTITLE');
			if (Z.Utils.stringValidate(listTitle)) { Z.imageSetListTitle = listTitle; }
			
			var hotspotPath = imageSetSetup.getAttribute('HOTSPOTPATH');
			if (Z.Utils.stringValidate(hotspotPath)) {
				Z.imageSetHotspotPath = hotspotPath;			
				Z.hotspotFileShared = true;
			}
			var annotationPath = imageSetSetup.getAttribute('ANNOTATIONPATH');
			if (Z.Utils.stringValidate(annotationPath)) {
				Z.imageSetAnnotationPath = annotationPath;
				Z.annotationFileShared = true;
			}
			
			var start = imageSetSetup.getAttribute('START');
			if (Z.Utils.stringValidate(start)) { Z.imageSetStart = parseInt(start, 10) - 1; }
			var loop = imageSetSetup.getAttribute('LOOP');
			if (Z.Utils.stringValidate(loop)) { Z.imageSetLoop = (loop == '1'); }
			var slider = imageSetSetup.getAttribute('SLIDER');
			if (Z.Utils.stringValidate(slider)) { Z.sliderImageSetVisible = (slider == '1'); }
			var animationAxis = imageSetSetup.getAttribute('AXIS');
			if (Z.Utils.stringValidate(animationAxis)) { Z.animationAxis = animationAxis; }
			var animator = imageSetSetup.getAttribute('ANIMATOR');
			if (Z.Utils.stringValidate(animator)) { Z.animator = animator; }
		}
		
		// Parse values for individual images/slides.
		var imageSetNodeName = (imageSetType == 'animation') ? 'IMAGE' : 'SLIDE';
		var imageSetNodes = xmlDoc.getElementsByTagName(imageSetNodeName);
		for (var i = 0, j = imageSetNodes.length; i < j; i++) {
			var imageObj = new ImageSetObject(imageSetNodes[i], i);
			imageSetObjects[imageSetObjects.length] = imageObj;			
			var imageSetListText = (imageSetListSource == 'NAME') ? imageObj.name : imageObj.media.substring(imageObj.media.lastIndexOf("/")+1, imageObj.media.length);
			imageSetListDP[imageSetListDP.length] = { text:imageSetListText, value:imageObj.internalID };
		}
		
		// Set slide count global to Viewer, create image set choice list, create Viewports.
		Z.imageSetLength = imageSetObjects.length;
		createImageSetChoiceList(Z.imageSetListPosition, Z.imageSetListTitle, imageSetListDP);
		configureViewerMultipleViewports(imageSetObjects);
	}
	
	function configureViewerMultipleViewports (imageSetMediaList) {
		Z.imagePath = 'multiple';
		if (Z.tileSourceMultiple) { Z.Utils.validateImagePath(imageSetMediaList[0].media); }
		
		function viewerReadyMultipleViewportsCallbackFunction () {
			Z.clearCallback('readyViewer', viewerReadyMultipleViewportsCallbackFunction);
			Z.viewportCurrent = Z.Viewport0; // Sets prior viewport.
			self.viewportSelect(Z.imageSetStart);
		}
		Z.setCallback('readyViewer', viewerReadyMultipleViewportsCallbackFunction);
		
		for (var i = 0, j = imageSetMediaList.length; i < j; i++) {
			var hotspotPath = (Z.hotspotFileShared) ? Z.imageSetHotspotPath :  imageSetMediaList[i].hotspotPath;
			var annotationPath = (Z.annotationFileShared) ? Z.imageSetAnnotationPath:  imageSetMediaList[i].annotationPath;
			Z['Viewport' + i.toString()] =  new Z.ZoomifyViewport(i, imageSetMediaList[i].media, annotationPath, hotspotPath);
			var isStartVP = (i == Z.imageSetStart);
			if (isStartVP) {
				Z.viewportCurrent = Z['Viewport' + i.toString()];
				self.viewportSelect(Z.imageSetStart);			
			}
			Z['Viewport' + i.toString()].setVisibility(isStartVP);
		}
		
		// Debug option: console.log(imageSetMediaList[i].media + "  " + imageSetMediaList[i].annotationPath);
	}

	precacheBackfillTilesDelayed = function () {
		for (var i = 0, j = Z.imageSetLength; i < j; i++) {
			var vpTest = Z['Viewport' + i.toString()];
			if (!vpTest.getStatus('backfillPrecached')) {
				vpTest.precacheBackfillTiles(true);
			}
		}			
	}
			
	this.viewportChange = function (direction) {
		if (direction != 'stop') {
			if (direction == 'forward') {
				Z.Viewer.viewportNext();
			} else {
				Z.Viewer.viewportPrior();		
			}
		
			// Iterate change if animation, not if slidestack.
			if (Z.animation) {
				Z.viewportChangeTimeout = window.setTimeout( function () { Z.Viewer.viewportChange(direction); }, 10);
			}
			
		} else if (Z.viewportChangeTimeout) {
			window.clearTimeout(Z.viewportChangeTimeout);
			Z.viewportChangeTimeout = null;
		}
	}
	
	this.viewportPrior = function (skipFrames) {
		if (typeof skipFrames === 'undefined' || skipFrames === null) { 
			skipFrames = 0;
		} else {
			skipFrames = Math.round(skipFrames); // Change more than one frame.
		}
		var vpIDMax = Z.imageSetLength - 1;
		var vpIDTest = Z.viewportCurrentID - (1 - skipFrames);
		if (vpIDTest < 0) {
			if (!Z.imageSetLoop) {
				vpIDTest = 0;
			} else {
				if (vpIDTest < -vpIDMax) { vpIDTest = -(-vpIDTest % vpIDMax); }
				if (vpIDTest < 0) { vpIDTest += (vpIDMax + 1); }
			}
		}
		self.viewportSelect(vpIDTest);
	}
	
	this.viewportNext = function (skipFrames) {
		if (typeof skipFrames === 'undefined' || skipFrames === null) { 
			skipFrames = 0;
		} else {
			skipFrames = Math.round(skipFrames); // Change more than one frame.
		}
		var vpIDMax = Z.imageSetLength - 1;
		var vpIDTest = Z.viewportCurrentID + (1 + skipFrames);
		if (vpIDTest > vpIDMax) {
			if (!Z.imageSetLoop) {
				vpIDTest = vpIDMax;
			} else {
				vpIDTest = (vpIDTest % (vpIDMax + 1));
			}
		}
		self.viewportSelect(vpIDTest);
	}
	
	// Sync of imageSet slider is prevented in calls from slider by second parameter to prevent circular calls.
	this.viewportSelect = function (vpID, doNotSyncSlider) {
		var userInteracting = Z.mouseIsDown || Z.buttonIsDown || Z.keyIsDown;
		var initializingCall = (Z.Viewport === null);
		
		// Get new current viewport.
		if (typeof vpID === 'undefined' || vpID === null) { vpID = 0; }
		var vpID = Math.abs(vpID);
		var vpIDStr = vpID.toString();
		var vpTest = Z['Viewport' + vpIDStr];
		var repeatCall = (vpTest == Z.viewportCurrent);
		
		// Set current viewport if target Viewport is valid and is not already current or this is first time setting current.
		if (typeof vpTest !== 'undefined' && (!repeatCall || initializingCall || !userInteracting)) {
		
			// Record prior viewport.
			var vpIDStrPrior = Z.viewportCurrentID.toString();
			var viewportPrior = Z.viewportCurrent;

			// Set new current viewport.
			Z.viewportCurrent = vpTest;
			Z.viewportCurrentID = vpID
			Z.viewportCurrent.setVisibility(true);
			Z.Viewport = Z.viewportCurrent;  // Support references in other functions not modified for ImageSet support.

			if (!repeatCall) {
				// Hide prior viewport if animation. If slidestack, move behind current viewport.
				viewportPrior.setVisibility(false);
			}
					
			// Alternative implementation: finish precaching here for animations but in function viewerReadyCallbackFunction for slidestacks.
			/*if (Z.animation && Z.viewportCurrentID != Z.imageSetStart && !Z.viewportCurrent.getStatus('backfillPrecached')) {
				Z.viewportCurrent.precacheBackfillTiles(true);
			}*/


			// Synchronize new current viewport and viewer components.
			if (Z.viewportCurrent && Z.viewportCurrent.getStatus('initialized')) {
			
				var viewportResized = (Z.viewportCurrent.getViewW() != Z.viewerW || Z.viewportCurrent.getViewH() != Z.viewerH);
				if (viewportResized) {
					Z.viewportCurrent.syncViewportResize(Z.imageX, Z.imageY, Z.imageZ, Z.imageR);
				} else {
					Z.viewportCurrent.updateView(true);
				}
				if (viewportPrior && (Z.hotspotFileShared || Z.annotationFileShared)) {
					var hotsArr = viewportPrior.getHotspots();
					if (hotsArr) { Z.viewportCurrent.setHotspots(hotsArr); }
				}
				if (Z.Navigator && Z.Navigator.getInitialized() && Z.navigatorVisible > 0) { 
					Z.Navigator.setViewport(Z.viewportCurrent);
				}
				if (Z.Toolbar && Z.Toolbar.getInitialized()) {
					if (Z.toolbarVisible > 0) {
						if (typeof doNotSyncSlider === 'undefined' || doNotSyncSlider === null || !doNotSyncSlider) {
							Z.Toolbar.syncSliderToViewportImageSet(Z.viewportCurrentID);
						}
						Z.Toolbar.setViewport(Z.viewportCurrent);
					}
				}
				if (Z.hotspots) {
					setVisibilityHotspotChoiceList(false, vpIDStrPrior);
					setVisibilityHotspotChoiceList(true, vpIDStr);
				}
				if (imageSetList) {
					imageSetList.blur();			
					var indexTitleAdjust = (Z.Utils.stringValidate(Z.imageSetListTitle) && Z.imageSetListTitle != 'none') ? 1 : 0;
					imageSetList.selectedIndex = Z.viewportCurrentID + indexTitleAdjust;
				}
			}
		}
	}
	
	this.setVisibilityHotspotChoiceList = function (visible, vpIDs) {
		setVisibilityHotspotChoiceList(visible, vpIDs);
	}	

	function setVisibilityHotspotChoiceList (visible, vpIDs) {
		if (typeof vpIDs === 'undefined' || vpIDs === null) { vpIDs = '0'; }
		var hotspotList = document.getElementById('HotspotList' + vpIDs);
		if (hotspotList) { 	
			var visValue = (visible) ? 'visible' : 'hidden';
			hotspotList.style.visibility = visValue; 
		}
	}

	function ImageSetObject (imageSetNode, id) {
		this.id = imageSetNode.getAttribute('ID');
		this.name = imageSetNode.getAttribute('NAME');		
		this.internalID = id;
		this.media = imageSetNode.getAttribute('MEDIA'); // This is a path.
		this.annotationPath = imageSetNode.getAttribute("ANNOTATIONPATH");
		this.hotspotPath = imageSetNode.getAttribute("HOTSPOTPATH");
	}
	
	function createImageSetChoiceList (position, title, dataProvider) {
		var visible = (position == '0') ? 'hidden' : 'visible';
		var listW = parseInt(Z.Utils.getResource('DEFAULT_IMAGESETLISTWIDTH'), 10);
		var listCoords = getImageSetListCoords(position, listW, Z.viewerW, Z.viewerH); // Z.viewerW allows for toolbar height if static in viewer display area.
		
		// Create choice list and add to viewer.
		if (typeof imageSetList === 'undefined' || imageSetList === null) {
			imageSetList = new Z.Utils.createSelectElement('imageSetList', title, dataProvider, listW, listCoords.x, listCoords.y, null, visible, imageSetListChangeHandler, 'change');
			Z.ViewerDisplay.appendChild(imageSetList);
			var indexTitleAdjust = (Z.Utils.stringValidate(Z.imageSetListTitle) && Z.imageSetListTitle != 'none') ? 1 : 0;
			imageSetList.selectedIndex = indexTitleAdjust;
		} else {
			Z.Utils.arrayClear(dataProvider);
		}
		
		// Ensure imageSet choicelist is in front of hotspots in viewport.
		var uiElementsBaseZIndex = parseInt(Z.Utils.getResource('DEFAULT_UIELEMENTBASEZINDEX'), 10);
		imageSetList.style.zIndex = (uiElementsBaseZIndex + 4).toString();	
	}

	function getImageSetListCoords (position, listW, viewerW, viewerH) {
		//ImageSet list positioning: 0 hides, 1 top left, 2 top-right, 3 bottom right, 4 bottom left
		var listX, listY;
		var margin = 15;
		switch (position) {
			case '0':
				listX = -1000;
				listY = -1000;
				break;
			case '1':
				listX = margin;
				listY = margin;
				break;
			case '2':
				listX = viewerW - listW - margin + 2;
				listY = margin - 5;
				break;
			case '3':
				listX = viewerW - listW - margin;
				if (toolbar != null) {
					listY = viewerH - margin * 2;
				} else {
					listY = viewerH - margin * 1.5;
				}
				break;
			case '4':
				listX = margin;
				if (toolbar != null) {
					listY = viewerH - margin * 2;
				} else {
					listY = viewerH - margin * 1.5;
				}
				break;
			default:
				listX = viewerW - listW;
				listY = margin;
		}
		return new Z.Utils.Point(listX, listY);
	}
	
	this.sizeAndPositionImageSetList = function () {
		var listW = parseInt(Z.Utils.getResource('DEFAULT_ANNOTATIONPANELWIDTH'), 10) + 2;
		var listCoords = getImageSetListCoords(Z.imageSetListPosition, listW, Z.viewerW, Z.viewerH); // Z.viewerW allows for toolbar height if static in viewer display area.
		imageSetList.style.left = listCoords.x + 'px';
		imageSetList.style.top = listCoords.y + 'px';
	}

	function imageSetListChangeHandler (event) {
		var event = Z.Utils.event(event);
		if (event) {
			var target = Z.Utils.target(event);
			if (target.options[target.selectedIndex].value != 'null') {
				var indexTitleAdjust = (Z.Utils.stringValidate(Z.imageSetListTitle) && Z.imageSetListTitle != 'none') ? 1 : 0;
				self.viewportSelect(target.selectedIndex - indexTitleAdjust);
			}
		}
	}
	
	// Set toolbar imageSet slider button position.
	function syncToolbarImageSetSliderToViewport (imageSetSlide) {
		if (Z.ToolbarDisplay && Z.Toolbar.getInitialized() && Z.sliderImageSetVisible) {
			Z.Toolbar.syncSliderToViewportZoom(imageSetSlide);
		}
	}	

	//::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::
	//::::::::::::::::::::::::::::::::::::: EVENT FUNCTIONS ::::::::::::::::::::::::::::::::::::
	//::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::
	
	// Handle keyboard, mouse, mousewheel, and touch events that are not Viewport-specific.
	// Mousewheel handler added here plus DOMMouseScroll added in addEventListener function.
	function initializeViewerEventListeners () {
		self.initializeViewerKeyEventListeners(true);
		Z.Utils.addEventListener(Z.ViewerDisplay, 'mouseover', viewerEventsHandler);
		Z.Utils.addEventListener(Z.ViewerDisplay, 'mouseout', viewerEventsHandler);
		Z.Utils.addEventListener(Z.ViewerDisplay, 'mousemove', Z.Utils.preventDefault);
		Z.Utils.addEventListener(Z.ViewerDisplay, 'mousewheel', viewerEventsHandler);
		Z.Utils.addEventListener(Z.ViewerDisplay, 'mousewheel', Z.Utils.preventDefault);
		initializeOrientationChangeHandler();
		if (Z.autoResize) { Z.Utils.addEventListener(window, 'resize', viewerEventsHandler); }
	
		// DEV NOTE: the following line prevents click-drag out of Viewer from selecting external text
		// in Safari, however, it disables all lists (hotspot, tour, slide, label). Working on alternative.
		// Z.Utils.addEventListener(Z.ViewerDisplay, 'mousedown', Z.Utils.preventDefault);	
	}
	
	// The following handler assignment approach is necessary for iOS to properly respond. The test for a necessary 
	// delay is required because Safari does not have access to the body tag when JavaScript in the head tag is loading.
	function initializeOrientationChangeHandler () {
		if (document.getElementsByTagName('body')) {
			document.getElementsByTagName('body')[0].onorientationchange = orientationChangeHandler;
		} else {
			var bodyOrientationHandlerTimer = window.setTimeout(initializeOrientationChangeHandler, 100);
		}	
	}
	
	function orientationChangeHandler (event) {
		if (Z.interactivityOff) { return; }
		if (Z.fullView) {
			if (Z.ToolbarDisplay && Z.toolbarAutoShowHide) { Z.Toolbar.show(false); }
			if (Z.NavigatorDisplay && Z.navigatorVisible > 1) { Z.Navigator.setVisibility(false); }
			if (Z.Toolbar && Z.annotations && (Z.annotationPanelVisible == 2 || Z.annotationPanelVisible == 3)) { Z.Toolbar.setVisibilityAnnotationPanel(false); }
			if (Z.Viewport) { 
				Z.Viewport.toggleFullViewMode(false);
				Z.Viewport.toggleFullViewMode(true);
			}
			if (Z.Toolbar && Z.annotations && (Z.annotationPanelVisible == 2 || Z.annotationPanelVisible == 3)) { Z.Toolbar.setVisibilityAnnotationPanel(true); }
			if (Z.NavigatorDisplay && Z.navigatorVisible > 1) { Z.Navigator.setVisibility(true); }
			if (Z.ToolbarDisplay && Z.toolbarAutoShowHide) { Z.Toolbar.show(true); }
		}
	}
	
	this.initializeViewerKeyEventListeners = function (enable) {
		if (enable) {
			Z.Utils.addEventListener(document, 'keydown', keyEventsHandler);
			Z.Utils.addEventListener(document, 'keyup', keyEventsHandler);
		} else {
			Z.Utils.removeEventListener(document, 'keydown', keyEventsHandler);
			Z.Utils.removeEventListener(document, 'keyup', keyEventsHandler);
		}
	}	
	
	function keyEventsHandler (event) {
		// Disallow keyboard control if parameters require or if focus is on text field, in Viewer (annotation panel) or in page.
		if (Z.interactivityOff || !Z.keys || document.activeElement.tagName == 'INPUT' || document.activeElement.tagName == 'TEXTAREA') {
			return;
		}
		
		var event = Z.Utils.event(event);
		
		// Prevent conflicting zoom-and-pan function calls. Must not react to alt key release
		// in order to support alt-click zoom-to-100 and alt-dbl-click zoom-to-zoom-to-fit features.
		if (event.keyCode != 18 && !event.altKey) { 
			Z.viewportCurrent.zoomAndPanAllStop(true, true);
			if (Z.maskingSelection) { Z.viewportCurrent.clearLabelMask(); }
		}
		
		// Handle key events.
		if (event) {				
			var eventType = event.type;
			var kc = event.keyCode;
			if (eventType == 'keydown') {
				Z.keyIsDown = true;
				switch (kc) {
					case 90: // z
						Z.viewportCurrent.zoom('out');
						break;
					case 17: // control
						Z.viewportCurrent.zoom('out');
						break;
					case 65: // a
						Z.viewportCurrent.zoom('in');
						break;
					case 16: // shift
						Z.viewportCurrent.zoom('in');
						break;
					case 37: // left arrow
						if (!Z.animation || Z.viewportCurrent.getZoom() != Z.minZ) {
							Z.viewportCurrent.pan('left');
						} else if (Z.imageSet)  {
							self.viewportPrior();
						}
						break;
					case 38: // up arrow
						if (!Z.animation || Z.viewportCurrent.getZoom() != Z.minZ) {
							Z.viewportCurrent.pan('up');
						} else if (Z.imageSet)  {
							self.viewportNext();
						}
						break;
					case 40: // down arrow
						if (!Z.animation || Z.viewportCurrent.getZoom() != Z.minZ) {
							Z.viewportCurrent.pan('down');
						} else if (Z.imageSet) {
							self.viewportPrior();
						}
						break;
					case 39: // right arrow
						if (!Z.animation || Z.viewportCurrent.getZoom() != Z.minZ) {
							Z.viewportCurrent.pan('right');
						} else if (Z.imageSet) {
							self.viewportNext();
						}
						break;
					case 27: // escape
						if (!Z.fullView) {
							Z.viewportCurrent.reset();
						} else {
							Z.viewportCurrent.toggleFullViewMode(false);
						}
						break;
					case 190: // '>' ('.')
						if (Z.rotationVisible) { Z.viewportCurrent.rotateClockwise(); }
						break;				
					case 188: // '<'  (',')
						if (Z.rotationVisible) { Z.viewportCurrent.rotateCounterwise(); }
						break;
						
					case 33: // page up
						 if (Z.imageSet) { self.viewportNext(); }
						break;
					case 34: // page down
						 if (Z.imageSet) { self.viewportPrior(); }
						break;
				}		
				
				if (Z.imageSet && (kc == 33 || kc == 34)) {
					if (event.preventDefault) {
						event.preventDefault();
					} else {
						event.returnValue = false;
					}
				}
				
			} else if (eventType == 'keyup') {
				Z.keyIsDown = false;
				if (kc == 90 || kc == 17 || kc == 65 || kc == 16) {  // z, ctrl, a, and shift keys
					Z.viewportCurrent.zoom('stop');
				} else if (kc == 37 || kc == 39) {  // left and right arrow keys
					Z.viewportCurrent.pan('horizontalStop');
				} else if (kc == 38 || kc == 40) {  // up and down arrow keys
					Z.viewportCurrent.pan('verticalStop');
					
				} else if (Z.imageSet && (kc == 33 || kc == 34)) { // page up and page down keys.
					if (Z.imageSet) { Z.viewportCurrent.updateView(true); }
					if (event.preventDefault) {
						event.preventDefault(); 
					} else {
						event.returnValue = false;
					}
				}
			}
		}
	}
		
	this.initializeViewerKeyDefaultListeners = function (enable) {
		if (enable) {
			Z.Utils.addEventListener(document, 'keydown', Z.Utils.preventDefault);
			Z.Utils.addEventListener(document, 'keyup', Z.Utils.preventDefault);
		} else {
			Z.Utils.removeEventListener(document, 'keydown', Z.Utils.preventDefault);
			Z.Utils.removeEventListener(document, 'keyup', Z.Utils.preventDefault);
		}
	}

	function viewerEventsHandler (event) {
		// Handle all display events in this central event broker.
		var event = Z.Utils.event(event);
		var eventType = event.type;			
		if (event && eventType) {
			var isRightMouseBtn = Z.Utils.isRightMouseButton(event);
			var isAltKey = event.altKey;
			
			// Prevent unwanted effects: interactivity or mouse-panning if parameters specify, zoom on right-click,
			// and page dragging in touch contexts. DEV NOTE: Timeout in next line is placeholder workaround for hotspot icon and caption anchor failure in IE.
			if ((eventType != 'mouseover' && eventType != 'mouseout' && Z.interactivityOff) 
				|| (eventType == 'mousedown' && (Z.interactivityOff || (Z.coordinatesVisible && isAltKey)))
				|| isRightMouseBtn) { return; }
			if (Z.touchSupport && !Z.clickZoomAndPanBlock && eventType != 'touchmove' && eventType != 'gesturechange') { 
				event.preventDefault();
			}
		
			// Handle event resetting.
			switch(eventType) {
				case 'mouseover' :
					// Prevent page scrolling using arrow keys. Also implemented in text element blur handler.
					if (!Z.fullView && document.activeElement.tagName != 'TEXTAREA') {
						Z.Viewer.initializeViewerKeyDefaultListeners(true);
					}
					break;				
				case 'mouseout' :
					// Disable prevention of page scrolling due to arrow keys. Also occurs in text element focus handler.
					Z.Viewer.initializeViewerKeyDefaultListeners(false);
					// Alternative implementation: disable key interaction if mouse is not over viewer.
					//Z.Viewer.initializeViewerKeyEventListeners(false);
					break;
			}
			
			// Handle event actions.
			viewerEventsManager(event);
			
			if (eventType == 'mousedown' || eventType == 'mousemove') { return false; }
		}
	}
	
	function viewerEventsManager (event) {
		var event = Z.Utils.event(event);
		var eventType = event.type;
		if (event && eventType) {
			
			var touch, target, relatedTarget, mPt;
			target = Z.Utils.target(event);
			relatedTarget = Z.Utils.relatedTarget(event);
			if (eventType != 'resize') { mPt = Z.Utils.getMousePosition(event); }
					
			// Standardize Firefox mouse wheel event.
			if (eventType == 'DOMMouseScroll') { eventType = 'mousewheel'; }
					
			// Implement actions.
			switch(eventType) {
				case 'mouseover' :
					// Block if moving within viewer display or subelements.
					var targetIsInViewer = Z.Utils.nodeIsInViewer(target);
					var relatedTargetIsInViewer = Z.Utils.nodeIsInViewer(relatedTarget);
					if (!(targetIsInViewer && relatedTargetIsInViewer)) {
						// Mouse-over bubbles from navigator or toolbar blocked by stop propagation handlers. Mouse-overs not
						// needed on return from outside viewer as components would be hidden if toolbar mode enables hiding.
						if (Z.viewportCurrent) { Z.viewportCurrent.showLists(true); }
						if (Z.ToolbarDisplay && Z.toolbarAutoShowHide) { Z.Toolbar.show(true); }
						if (Z.NavigatorDisplay && Z.navigatorVisible > 1) { Z.Navigator.setVisibility(true); }
						if (Z.RulerDisplay && Z.rulerVisible > 1) { Z.Ruler.setVisibility(true); }
						if (Z.Toolbar && Z.annotations && (Z.annotationPanelVisible == 2 || Z.annotationPanelVisible == 3)) { Z.Toolbar.setVisibilityAnnotationPanel(true); }
						Z.mouseOutDownPoint = null;
					}				
					break;
					
				case 'mouseout' :
					var targetIsInViewer = Z.Utils.nodeIsInViewer(target);
					var relatedTargetIsInViewer = Z.Utils.nodeIsInViewer(relatedTarget);
					var listNavigation = (target == '[object HTMLSelectElement]' || target == '[object HTMLOptionElement]' || relatedTarget == '[object HTMLSelectElement]' || relatedTarget == '[object HTMLOptionElement]');

					// Block if moving within viewer display or subelements.
					if (!(targetIsInViewer && relatedTargetIsInViewer) && !listNavigation) {

						if (!Z.mouseIsDown) {
							if (Z.viewportCurrent) { Z.viewportCurrent.showLists(false); }
							if (Z.ToolbarDisplay && Z.toolbarAutoShowHide) { Z.Toolbar.show(false); }
							if (Z.NavigatorDisplay && Z.navigatorVisible > 1) { Z.Navigator.setVisibility(false); }
							if (Z.RulerDisplay && Z.rulerVisible > 1) { Z.Ruler.setVisibility(false); }
							if (Z.Toolbar && Z.annotations && (Z.annotationPanelVisible == 2 || Z.annotationPanelVisible == 3)) { Z.Toolbar.setVisibilityAnnotationPanel(false); }
						} else {
							Z.mouseOutDownPoint = new Z.Utils.Point(mPt.x, mPt.y);
						}
					}
					break;
					
				case 'resize' :
					if (!autoResizeSkipTimer) { autoResizeSkipTimer = window.setTimeout(autoResizeSkipTimerHandler, autoResizeSkipDuration); }
					break;
					
				case 'mousewheel' :				
					// Firefox 'DOMMouseScroll' mouse wheel event standardized at beginning of this function to unify handling under this 'mousewheel' case.
					// Convert mouse wheel motion to zoom step in or out, then call mouse wheel handler which will determine which slider has focus and also 
					// create or refresh mousewheel completion timer.
					var delta = Math.max(-1, Math.min(1, (event.wheelDelta || -event.detail)));
					Z.viewportCurrent.mouseWheelHandler(delta);
					break;
			}
		}
	}

	function autoResizeSkipTimerHandler (event) {
		if (autoResizeSkipTimer) {
			window.clearTimeout(autoResizeSkipTimer);
			autoResizeSkipTimer = null;
			autoResizeViewer();
		}
	}
	
	this.autoResizeViewer = function () {
		autoResizeViewer();
	}
	
	function autoResizeViewer () {
		var containerDims = Z.Utils.getContainerSize(Z.pageContainer, Z.ViewerDisplay);
		var newZoom = Z.viewportCurrent.calculateZoomForResize(Z.viewportCurrent.getZoom(), Z.viewerW, Z.viewerH, containerDims.x, containerDims.y);
		self.resizeViewer(containerDims.x, containerDims.y, newZoom);
	}
	
	this.resizeViewer = function (w, h, z) {
		self.setSizeAndPosition(w, h, 0, 0, false);
		Z.viewportCurrent.resizeViewport(Z.imageX, Z.imageY, z, Z.imageR);
	}

	this.mouseWheelCompleteHandler = function (event) {
		Z.mouseWheelIsDown = false;
		if (Z.mouseWheelCompleteTimer) {
			window.clearTimeout(Z.mouseWheelCompleteTimer);
			Z.mouseWheelCompleteTimer = null;
			Z.zooming = 'stop';
			Z.viewportCurrent.updateView(true);
		}
	}
};
	
	

//::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::
//:::::::::::::::::::::::::::::::::: VIEWPORT FUNCTIONS ::::::::::::::::::::::::::::::::::
//::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::

Z.ZoomifyViewport = function (vpID, vpImgPath, vpAnnotPath, vpHotPath) {
	// The following viewer global variables are limited to viewport scope when viewing a imageSet.
	// Z.imagePath, Z.hotspotPath, Z.hotspotFolder, Z.annotationPath, Z.annotationFolder, Z.tileSource, Z.imageW, Z.imageH, Z.imageX, Z.imageY, Z.imageZ, Z.initialX, Z.initialY, Z.initialZ, Z.minZ, Z.maxZ.
	var hotspotPath, hotspotFolder, annotationPath, annotationFolder;
	var imageX = null, imageY = null, imageZ = null;
	
	var viewportID = 0;
	if (typeof vpID !== "undefined" && vpID !== null) { viewportID = vpID; }
	
	var imagePath;
	if (typeof vpImgPath !== "undefined" && vpImgPath !== null) {
		imagePath = vpImgPath;
	} else {
		imagePath = Z.imagePath;
	}
	
	// Z.hotspotPath and Z.hotspotFolder or Z.annotationPath and Z.annotationFolder set here if multiples for imageSet, otherwise set in setParameters.
	if (typeof vpHotPath === "undefined" || vpHotPath === null) {
		hotspotPath = Z.hotspotPath;
		hotspotFolder = Z.hotspotPath;
	} else {
		hotspotPath = vpHotPath;
		hotspotFolder = hotspotPath;
		if (hotspotFolder.toLowerCase().substring(hotspotFolder.length - 4, hotspotFolder.length) == ".xml") {
			hotspotFolder = hotspotFolder.substring(0, hotspotFolder.lastIndexOf("/"));
		}
	}
	
	// Set Viewer globals that cause hotspot/annotation display to be created and annotations.xml file(s) is/are parsed and annotation panel is created.
	if (hotspotPath) {
		Z.hotspots = true;
		Z.annotationPathProvided = true;
		if (Z.imageSet) { Z.hotspotPath = 'multiple'; }
	}

	
	
	//::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::
	//:::::::::::::::::::::::::::::::::::::: INIT FUNCTIONS ::::::::::::::::::::::::::::::::::::::
	//::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::

	// Declare variables for viewport internal self-reference and for initialization completion.
	var self = this;
	var viewportStatus = [];
	
	// Set viewport constants and static variables from value in Zoomify Image Folder 'ImageProperties.xml' file or Zoomify Image File (PFF) header.
	var IMAGE_VERSION = -1;
	var HEADER_SIZE = 0
	var HEADER_SIZE_TOTAL = 0;
	var CHUNK_SIZE = parseInt(Z.Utils.getResource('DEFAULT_CHUNKSIZE'), 10);
	var OFFSET_CHUNK_SIZE_BYTES = CHUNK_SIZE * 8;
	var BC_CHUNK_SIZE_BYTES = CHUNK_SIZE * 4;
	var TILE_COUNT = 0;
	var TILES_PER_FOLDER = 256;
	var TILE_WIDTH = parseInt(Z.Utils.getResource('DEFAULT_TILEW'), 10);
	var TILE_HEIGHT = parseInt(Z.Utils.getResource('DEFAULT_TILEH'), 10);

	// Set other defaults and calculate other constants.
	var TIERS_SCALE_UP_MAX = parseFloat(Z.Utils.getResource('DEFAULT_TIERSMAXSCALEUP'));
	var TIERS_SCALE_DOWN_MAX = TIERS_SCALE_UP_MAX / 2;
	var TILES_CACHE_MAX = parseInt(Z.Utils.getResource('DEFAULT_TILESMAXCACHE'), 10);
	var tlbrOffset = (Z.toolbarVisible == 1) ? Z.toolbarH : 0;

	// Declare variables for viewport displays.
	var oversizeDisplay, oD, oS, oCtx;
	var viewportContainer, cD, cS;
	var viewportBackfillDisplay, bD, bS, bCtx;
	var viewportDisplay, vD, vS, vCtx;
	var transitionCanvas, tC, tS, tCtx;
	var watermarkDisplay, wD, wS;
	var hotspotDisplay, hD, hS, hotD, hotS, annD, annS;
	var drawingDisplay, dD, dS, dCtx;
	var editingDisplay, eD, eS, eCtx;
	var lastPtX, lastPtY;
	var maskCanvas, mC, mS, mCtx;

	// Create backfill, viewport, watermark, and hotspot displays within container that can be
	// dragged. Scaling occurs in display canvases directly or in tiles if in non-canvas browser.
	createDisplays(viewportID);
	
	// Support unconverted image viewing.
	var unconvertedImage;
		
	// Declare variables and lists for viewport tiers and tiles.
	var tierCount = 1, tierCurrent = 0, tierBackfill = 0;
	var tierBackfillDynamic = false, tierBackfillOversize = 0, tierChanged = false;
	var tierScale, tierScalePrior, tierBackfillScale, tierBackfillOversizeScale;
	var tierWs = [], tierHs = [], tierWInTiles = [], tierHInTiles = [],  tierTileCounts = [];
	var tierTileOffsetsStart = []; tierTileOffsetsCount = [];  tierTileOffsetChunks = []; tierTileOffsetLast = [];  // ZIF support.
	var tierTileByteCountsStart = []; tierTileByteCountsCount = []; tierTileByteCountChunks = []; tierTileByteCountLast = [];  // ZIF support.
	var tilesBackfillDisplayingNames = [], tilesBackfillLoadingNames = [], tilesBackfillCached = [], tilesBackfillCachedNames = [];
	var tilesInView = [], tilesInViewNames = [], tilesToLoadTotal = 0, tilesLoadingNamesLength = 0;
	var tilesBackfillToPrecache = 0, tilesBackfillToPrecacheLoaded = 0;
	var tilesBackfillToDisplay = 0, tilesBackfillInCache = 0, tilesBackfillRequested = 0, tilesBackfillLoaded = 0, tilesBackfillDisplayed = 0, tilesBackfillWaiting;
	var tilesToDisplay = 0, tilesInCache = 0, tilesRequested = 0, tilesLoaded = 0, tilesDisplayed = 0, tilesWaiting = 0, tilesTimeElapsed = 0, tileLoadsPerSecond = 0;
	var tilesDisplayingNames = [], tilesLoadingNames = [], tilesCached = [], tilesCachedNames = [], tilesCachedInView = [], tilesCachedInViewNames = [];
	var validateViewTimer = null, validateViewRetryCounter = 0;
	var validateViewRetryLimit = parseInt(Z.Utils.getResource('DEFAULT_VALIDATEVIEWRETRYLIMIT'), 10);
	var validateViewDelay = parseInt(Z.Utils.getResource('DEFAULT_VALIDATEVIEWRETRYDELAY'), 10);
	var tilesRetryNames = [], tilesRetryNamesChunks = [], tilesRetry = [], tilesBackfillRetryNames = []; // Support for Zoomify Image File storage.
	var tileNetConnector = new Z.NetConnector();
	
	// Declare and set backfill threshold variables.
	var backfillTreshold3 = parseInt(Z.Utils.getResource('DEFAULT_BACKFILLTHRESHOLD3'), 10);
	var backfillDynamicAdjust = parseInt(Z.Utils.getResource('DEFAULT_BACKFILLDYNAMICADJUST'), 10);
	var backfillTreshold2 = parseInt(Z.Utils.getResource('DEFAULT_BACKFILLTHRESHOLD2'), 10);
	var backfillChoice2 = parseInt(Z.Utils.getResource('DEFAULT_BACKFILLCHOICE2'), 10);
	var tierBackfillOversize = backfillChoice2;
	var backfillTreshold1 = parseInt(Z.Utils.getResource('DEFAULT_BACKFILLTHRESHOLD1'), 10);
	var backfillChoice1 = parseInt(Z.Utils.getResource('DEFAULT_BACKFILLCHOICE1'), 10);
	var backfillChoice0 = parseInt(Z.Utils.getResource('DEFAULT_BACKFILLCHOICE0'), 10);
	var backfillTresholdCached0 = null, backfillTresholdCached1 = null, backfillTresholdCached2 = null;
	
	// Declare variables for tile caching area and viewport.	
	var panBufferUnconverted = parseFloat(Z.Utils.getResource('DEFAULT_PANBUFFERUNCONVERTED'), 10);
	var panBufferStandard = (Z.panBuffer !== null) ? Z.panBuffer : parseFloat(Z.Utils.getResource('DEFAULT_PANBUFFER'), 10);
	var PAN_BUFFER = (Z.tileSource != 'unconverted') ? panBufferStandard : panBufferUnconverted;
	var BACKFILL_BUFFER = parseFloat(Z.Utils.getResource('DEFAULT_BACKFILLBUFFER'), 10);
	var PAN_BUFFERSIZEMAXBROWSER = parseFloat(Z.Utils.getResource('DEFAULT_PAN_BUFFERSIZEMAXBROWSER'), 10);
	var PAN_BUFFERSIZEMAXFIREFOX = parseFloat(Z.Utils.getResource('DEFAULT_PAN_BUFFERSIZEMAXFIREFOX'), 10);
	var PAN_BUFFERSIZEMAXIMAGESET = parseFloat(Z.Utils.getResource('DEFAULT_PAN_BUFFERSIZEMAXIMAGESET'), 10);
	var viewW, viewH, viewL, viewT;
	var displayW, displayH, displayCtrX, displayCtrY, displayL, displayR, displayT, displayB;
	var backfillW, backfillH, backfillCtrX, backfillCtrY, backfillL, backfillT;
	
	// Set initial values for tile selection and caching areas.
	viewW = Z.viewerW;
	viewH = Z.viewerH;
	viewL = viewT = 0;

	// Reset viewport height and top if toolbar visible and static (no hide/show or show/hide).
	viewH -= tlbrOffset;
	if (Z.toolbarPosition == 0) { viewT += tlbrOffset; }

	// Declare variables for viewport mouse support.
	var clickTimer = null;
	var dragPtStart, dragPtCurrent;

	// Declare variable for gesture support.
	var gestureInterval = null, gestureIntervalPercent = null, wasGesturing = false;
	var GESTURE_TEST_DURATION = parseInt(Z.Utils.getResource('DEFAULT_GESTURETESTDURATION'), 10);

	// Declare viewport variables for continuous zoom-and-pan, smooth pan, and smooth animation functions.
	var panStepDistance = Math.round(parseFloat(Z.Utils.getResource('DEFAULT_PANSTEPDISTANCE')) * Z.panSpeed);
	var panX = 0, panY = 0, smoothAnimationX = null, smoothAnimationY = null;
	var optimalMotionImages = parseInt(Z.Utils.getResource('DEFAULT_ANIMATIONOPTIMALMOTIONIMAGES'), 10);
	var optimalPositionDelta = parseInt(Z.Utils.getResource('DEFAULT_ANIMATIONOPTIMALPOSITIONDELTA'), 10);
	var smoothPanDeltaX = 0, smoothPanDeltaY = 0, smoothPanLastDeltaX = 0, smoothPanLastDeltaY = 0;
	var smoothPanGliding = null, smoothPanGlideX = null, smoothPanGlideY = null;
	var smoothPanInterval = null, smoothPanStartPt = null, smoothPanDisplayStartPt = null, smoothPanMousePt = null;
	var zoomStepDistance = (parseFloat(Z.Utils.getResource('DEFAULT_ZOOMSTEPDISTANCE')) * Z.zoomSpeed);
	if (Z.mobileDevice) { zoomStepDistance /= 2; }
	var zoomVal = 0, zapTimer = null, zapStepCount = 0;
	var zapStepDuration = parseInt(Z.Utils.getResource('DEFAULT_ZAPSTEPDURATION'), 10);
	var zapTierCurrentZoomUnscaledX, zapTierCurrentZoomUnscaledY;
	var fadeInStep = (parseFloat(Z.Utils.getResource('DEFAULT_FADEINSTEP')) * Z.fadeInSpeed);
	var fadeInInterval = null;

	// Declare viewport variables for zoom-and-pan-to-view functions.
	var zaptvDuration = parseFloat(Z.Utils.getResource('DEFAULT_ZAPTVDURATION'));
	var zaptvSteps = parseFloat(Z.Utils.getResource('DEFAULT_ZAPTVSTEPS'));
	if (Z.mobileDevice) { zaptvSteps /= 2; }
	var zaptvTimer = null, zaptvStepCurrent = 0;

	// Declare viewport variables for full view, virtual pointer, crosshairs, and measurement, if needed.
	if (!Z.fullScreenVisible && !Z.fullPageVisible) {
		var fullScreenEntering, fvBodW, fvBodH, fvBodO, fvDocO, fvContBC, fvContW, fvContH, fvContPos, fvContIdx;
		var buttonFullViewExitExternal, buttonFullViewExitExternalVisible;
	}
	if (Z.virtualPointerVisible) {
		var virtualPointerPath = Z.Utils.getResource('DEFAULT_VIRTUALPOINTERPATH');
		var virtualPointer, virtualPointerImage;
	}	
	if (Z.crosshairsVisible) { 
		Z.Utils.drawCrosshairs(Z.ViewerDisplay, viewW, viewH); 
	}	
	if (Z.measureVisible || Z.editMode !== null) {
		var measureLengthText = Z.Utils.getResource('UI_MEASURELENGTH'); 
		var measureLengthTotalText = Z.Utils.getResource('UI_MEASURELENGTHTOTAL'); 
		var measurePerimeterText = Z.Utils.getResource('UI_MEASUREPERIMETER'); 
		var measureAreaText = Z.Utils.getResource('UI_MEASUREAREA');
		var measureSquareText = Z.Utils.getResource('UI_MEASURESQUARE');
		var measureCaptionBackOpacity = parseFloat(Z.Utils.getResource('DEFAULT_MEASURECAPTIONBACKOPACITY'));
		var measureCaptionFontSize = parseInt(Z.Utils.getResource('DEFAULT_MEASURECAPTIONFONTSIZE'), 10);
		var captionW = parseInt(Z.Utils.getResource('DEFAULT_MEASURECAPTIONWIDTH'), 10);
	}

	// Prepare watermark variables and image if optional parameter set.
	if (Z.Utils.stringValidate(Z.watermarkPath)) {
		var watermarkImage, watermarkAlpha;
		var watermarksX = [], watermarksY = [];
	}
	
	// Prepare tour variables if optional parameter set. Hotspot variables below also prepared because hotspotPath set to tourPath.
	// If screensaver, prepare tour variables but use modified in tour functions.
	if (Z.tour) { 
		var destinationCurrent, destinationNextAudio, tourAutoStart, tourAutoLoop;
	}

	// Prepare slideshow variables if optional slide path parameter set using image path parameter.
	if (Z.imagePath !== null && Z.imagePath.indexOf('zSlidePath') != -1) { 
		Z.slidePath = Z.imagePath.substring(11, Z.imagePath.length); 		
		Z.slideshow = true;
	}

	// Prepare image set variables if optional animation or slidestack path parameter set using image path parameter.
	if (Z.imagePath !== null) {
		if (Z.imagePath.indexOf('zAnimationPath') != -1) {
			Z.imageSetPath = Z.imagePath.substring(15, Z.imagePath.length);
			Z.imageSet = true;
			Z.animation = true;
		} else if (Z.imagePath.indexOf('zSlidestackPath') != -1) {
			Z.imageSetPath = Z.imagePath.substring(16, Z.imagePath.length); 
			Z.imageSet = true;
			Z.slidestack = true;
		}
	}

	if (Z.slideshow) {
		var slides = [], slideListDP = [];
		var slideCurrent, slideList, slideListSource, slideListPosition, slideshowAutoStart, slideshowAutoLoop;
		var slideTransitionStep = (parseFloat(Z.Utils.getResource('DEFAULT_SLIDETRANSITIONSTEP')) * Z.slideTransitionSpeed);
		Z.slideTransitionTimeout = null;
		Z.slideOpacity = 0;
	}
	
	// Prepare hotspot and/or annotation variables global to Viewport if optional parameter set.
	if (Z.measureVisible || Z.tour || Z.hotspots || Z.annotations) {
		var mTypeLegacy = false;
		var hotspots = [], hotspotsMedia = [], hotspotsFilterDisplayIDs = [], hotspotsFilterDisplayInternalIDs = [];
		var hotspotCurrent = null, hotspotCurrentID = null, hotspotDragging = null, poiPriorID = null, labelPriorID = null, notePriorID = null;
		var annotationPanelDisplay;
		
		var polygonCurrentPts = null, polygonsRequireCanvasAlertShown = false;
		var polygonComplete = true, controlPointCurrent = null, controlPointDragging = false;
		var hotspotNetConnector = new Z.NetConnector();
		var polygonLineW = Z.Utils.getResource('DEFAULT_POLYGONLINEWIDTH');
		var polygonOpacity = parseFloat(Z.Utils.getResource('DEFAULT_POLYGONOPACITY'));
		var polygonViewBuffer = parseInt(Z.Utils.getResource('DEFAULT_POLYGONVIEWBUFFER'), 10);

		var ctrlPtLineW = Z.Utils.getResource('DEFAULT_CONTROLPOINTLINEWIDTH');
		var ctrlPtStrokeColor = Z.Utils.getResource('DEFAULT_CONTROLPOINTSTROKECOLOR');
		var firstCtrlPtFillColor = Z.Utils.getResource('DEFAULT_FIRSTCONTROLPOINTFILLCOLOR');
		var stdCtrlPtFillColor = Z.Utils.getResource('DEFAULT_STANDARDCONTROLPOINTFILLCOLOR');
		var ctrlPtRadius = parseInt(Z.Utils.getResource('DEFAULT_CONTROLPOINTRADIUS'), 10);
		var polygonLineWFreehand = Z.Utils.getResource('DEFAULT_POLYGONLINEWIDTHFREEHAND');
		
		var captionTextColor = Z.Utils.getResource('DEFAULT_CAPTIONTEXTCOLOR');
		var captionBackColor = Z.Utils.getResource('DEFAULT_CAPTIONBACKCOLOR');
		var defaultFontSize = parseInt(Z.Utils.getResource('DEFAULT_HOTSPOTCAPTIONFONTSIZE'), 10);
		var minFontSize = parseInt(Z.Utils.getResource('DEFAULT_MINHOTSPOTCAPTIONFONTSIZE'), 10);
		var maxFontSize = parseInt(Z.Utils.getResource('DEFAULT_MAXHOTSPOTCAPTIONFONTSIZE'), 10);
		var defaultPadding = parseInt(Z.Utils.getResource('DEFAULT_HOTSPOTCAPTIONPADDING'), 10);
		var minPadding = parseInt(Z.Utils.getResource('DEFAULT_MINHOTSPOTCAPTIONPADDING'), 10);
		var maxPadding = parseInt(Z.Utils.getResource('DEFAULT_MAXHOTSPOTCAPTIONPADDING'), 10);
		if (Z.mobileDevice) { ctrlPtRadius *= 2; }
		if (Z.maskVisible) { 
			var labelNoMaskArr = [];
			var maskFadeStep = (parseFloat(Z.Utils.getResource('DEFAULT_MASKFADESTEP')) * Z.maskFadeSpeed);
			// Alternative implementation: mask sync'ing on view updates. Unnecessary for current implementation which clears on interaction.
			Z.setCallback('viewUpdateComplete', function () {
				if (Z.maskingSelection) { setMask(); } 
			} );
		}
		if (Z.tour || Z.hotspots) {
			var hotspotList, hotspotListSource, hotspotListPosition, hotspotsInitialVisibility;
			var hotspotsMinScale, hotspotsMaxScale, annotationXMLVersion;
			var hotspotListDP = [];
		} else if (Z.measureVisible || Z.annotations) {
			var annotationsXML, annotationsXMLRollback, annotationPanelPosition;
			var poiList, noteList, labelList, labelsMinScale, labelsMaxScale, captionTextElement;
			var poiVisibility, labelVisibility, noteVisibility, commentVisibility, poiVisibilityXML, labelVisibilityXML, noteVisibilityXML, commentVisibilityXML, tooltipSource;
			var poiListDP = [], noteListDP = [], noteListCurrentDP = [];
			var labelListDP = [], labelListCurrentDP = [], labelIconListDP = []; labelCaptionPositionListDP = []; labelTargetListDP = []; 
			var hotspotsRollback = [], poiListDPRollback = [], labelListDPRollback = [], polygonRollback = [], noteListDPRollback = [];
			var scaleVal = 0, scaleTimer = null;
		}
	}
	
	// Load image properties to get image width and height and tile size.  Alert user that local viewing is not
	// supported in certain browsers nor from storage alternatives other than image folders. Image properties
	// are HTML parameters from web page, bytes from image server, ZIF, PFF file, or XML values.
	if (Z.imagePath !== null && Z.imagePath != 'null') {
	
		// Prevent initialization if attempting to view ZIF or PFF file locally.
		if (Z.localUse == true && Z.tileSource == 'ZoomifyImageFile') { 
			Z.Utils.showMessage(Z.Utils.getResource('ERROR_UNSUPPORTEDLOCALVIEWING-FORMAT-ZIF'), true);
			return;
		}
		
		// Warn user if attempting to view Zoomify Image Folder locally in non-supporting browser.
		if (Z.localUse == true && (Z.browser == Z.browsers.CHROME  || Z.browser == Z.browsers.OPERA || (Z.browser == Z.browsers.IE && Z.browserVersion == 11) || (Z.browser == Z.browsers.SAFARI && Z.browserVersion >= 7))) {
			Z.Utils.showMessage(Z.Utils.getResource('ERROR_UNSUPPORTEDLOCALVIEWING-BROWSER'), true);
		}
		
		if (Z.imageW !== null && Z.imageH !== null && Z.sourceMagnification !== null ) {
			// Example image server protocol implementation: image properties provided via HTML parameters.
			// Note that this approach sets width, height, and tile size values directly from parameters during page
			// loading so it sets those values prior to viewer initialization and never during reinitialization.
			// See additional notes in function loadImagePropertiesFromImageServer.
			if (typeof self.getStatus !== 'undefined') {
				initializeViewport(Z.imageW, Z.imageH, TILE_WIDTH, TILE_HEIGHT, null, null, null, null, Z.sourceMagnification, Z.focal, Z.quality);
			} else {
				var viewportInitTimer = window.setTimeout( function () { initializeViewport(Z.imageW, Z.imageH, TILE_WIDTH, TILE_HEIGHT, null, null, null, null, Z.sourceMagnification, Z.focal, Z.quality); }, 100);
			}
			//var netConnector = new Z.NetConnector();
			//loadImageProperties(imagePath, netConnector);
		
		} else if (Z.imageProperties !== null) {
			// Receive image properties as XML text in HTML parameter. Convert to XML doc and parse - skipping XML loading steps. This
			// approach provides workaround for cross-domain image storage and also enables optional support for image server tile fulfillment.
			var xmlDoc = Z.Utils.xmlConvertTextToDoc(Z.imageProperties);
			parseImageXML(xmlDoc);
		
		} else if (Z.tileSource == 'unconverted') {
			// Load unconverted image and use its dimensions to set needed values.
			loadUnconvertedImage(imagePath);
					
		} else if (Z.imagePath.indexOf('zSlidePath') == -1 && Z.imagePath.indexOf('zAnimationPath') == -1) {
			// Load byte range from ZIF or PFF or ImageProperties.xml file from Zoomify Image folder.
			var netConnector = new Z.NetConnector();
 			loadImageProperties(imagePath, netConnector, viewportID);
		}
	}
	
	// Load list of slides in XML file if multiple images are to be presented. If image path parameter not provided and 
	// image properties not loaded above, first values in slides XML file will be used at end of parseSlidesXML function.
	if (Z.slideshow) {
		var netConnector = new Z.NetConnector();
		loadSlidesXML(netConnector);	
	}
	
	function loadSlidesXML (netConnector) {
		var defaultFilename = Z.Utils.getResource('DEFAULT_SLIDESXMLFILE');
		if (Z.slidePath.toLowerCase().substring(Z.slidePath.length - 4, Z.slidePath.length) != '.xml') {
			Z.slidePath = Z.slidePath + '/' + defaultFilename;
		}
		XMLPath = Z.Utils.cacheProofPath(Z.slidePath);		
		if (typeof XMLPath !== 'undefined' && Z.Utils.stringValidate(XMLPath)) {
			var netConnector = new Z.NetConnector();
			netConnector.loadXML(XMLPath);
		}
	}
	
	function initializeViewport (iW, iH, tW, tH, iTileCount, iVersion, iHeaderSize, iHeaderSizeTotal, iMagnification, iFocal, iQuality) {
		createCanvasContexts();
		
		// Set viewport variables to XML or header values.
		Z.imageW = iW;
		Z.imageH = iH;
		Z.imageCenterX = Z.imageW / 2;
		Z.imageCenterY = Z.imageH / 2;
		IMAGE_VERSION = iVersion;
		HEADER_SIZE = iHeaderSize;
		HEADER_SIZE_TOTAL = iHeaderSizeTotal;
		TILE_COUNT = iTileCount;
		TILE_WIDTH = tW;
		TILE_HEIGHT = tH;

		// Record tier dimensions and tile counts for fast access.
		calculateTierValues();

		// Set initial dimensions and location of all viewport displays and ensure zoom and pan
		// initial values and limits do not conflict.
		setSizeAndPosition(viewW, viewH, viewL, viewT);
		self.validateXYZDefaults();

		// Set default scale for oversize backfill canvas or remove it if image size doesn't require it.
		if (tierCount > backfillTreshold3) {
			tierBackfillOversizeScale = convertZoomToTierScale(tierBackfillOversize, Z.initialZ);
			if (oD) { oCtx.scale(tierBackfillOversizeScale, tierBackfillOversizeScale); }
		} else {
			oD = null;
			oS = null;
			oCtx = null;
		}
		
		// Set default scales for other canvases.
		tierBackfillScale = convertZoomToTierScale(tierBackfill, Z.initialZ);
		tierScale = convertZoomToTierScale(tierCurrent, Z.initialZ);
		tierScalePrior = tierScale;
		if (Z.useCanvas) {
			// Trap possible NS_ERROR_FAILURE error if working with large unconverted image.
			// DEV NOTE: add retry or soft fail in catch in future implementation for firefox issue with large canvases.
			try {
				vCtx.scale(tierScale, tierScale);
			} catch (e) {
				Z.Utils.showMessage(Z.Utils.getResource('ERROR_SCALINGCANVASFORUNCONVERTEDIMAGE'));
				console.log('In function initializeViewportContinue scaling canvas:  ' + e);
			}
		}
		
		// Load watermark, hotspots or annotations, virtual pointer, backfill tiles, and set initial view.
		if (wD) { loadWatermark(); }
		if (Z.screensaver) {
			Z.Utils.validateCallback('screensaverStarting');
			Z.Utils.functionCallWithDelay(function () { self.tourStart(); }, 750);
		}
		if (hD) {
			self.setDrawingColor('buttonColor0' + viewportID, true);
			loadHotspotsOrAnnotationsData(viewportID);
		}
		if (Z.virtualPointerVisible) { self.showVirtualPointer(); }
		if (Z.tileSource != 'unconverted') { self.precacheBackfillTiles(); }
		view(Z.initialX, Z.initialY, Z.initialZ, Z.initialR, null, true);

		// Display hotspot coordinates panel if parameter set.
		if (Z.coordinatesVisible) { self.setCoordinatesDisplayVisibility(true); }	
		
		// Set initial display to full screen if parameter true.
		if (Z.initialFullPage) { self.toggleFullViewMode(true); }
	
		// Enable event handlers specific to Viewport and set viewport as initialized.
		initializeViewportEventListeners();
		self.setStatus('initialized', true);
		self.syncViewportRelated();
		
		// Start slideshow if optional parameter set, go to next slide is slideshow playing.
		if (Z.slideshow) {
			var indexTitleAdjust = (Z.Utils.stringValidate(Z.slideListTitle) && Z.slideListTitle != 'none') ? 1 : 0;
			if (typeof slideList !== 'undefined') { slideList.selectedIndex = indexTitleAdjust; }
			if (slideshowAutoStart && !Z.slideshowPlaying) {
				self.slideshowStart();
			} else if (Z.slideshowPlaying) {
				self.nextSlide();
			}
		}
		
		// If viewing imageSet set callback to ensure hotspots/annotations draw correctly.
		if (Z.imagePath == "multiple") {
			var hotspotsRedisplayEvent = (Z.hotspots) ? 'hotspotsLoadedViewer' : (Z.annotations) ? 'annotationsLoadedViewer' : null;
			var hotspotsRedisplay = function () {
				var imageSetHotspotsTimeout = window.setTimeout( function () { 
						Z.viewportCurrent.redisplayHotspots();						
					}, 1500);
				};
			if (hotspotsRedisplayEvent !== null) { Z.setCallback(hotspotsRedisplayEvent, hotspotsRedisplay); }
		}
	}

	// Initialization on callback after XML load after change of image path via setImage function.
	function reinitializeViewport (iW, iH, tW, tH, iTileCount, iVersion, iHeaderSize, iHeaderSizeTotal, iMagnification, iFocal, iQuality) {
		// Clear prior image values.
		self.setStatus('initialized', false);
		clearAll(true, false, true, true);

		// Calculate new image values.
		Z.imageW = iW;
		Z.imageH = iH;
		Z.imageCenterX = Z.imageW / 2;
		Z.imageCenterY = Z.imageH / 2;
		IMAGE_VERSION = iVersion;
		HEADER_SIZE = iHeaderSize;
		HEADER_SIZE_TOTAL = iHeaderSizeTotal;
		TILE_COUNT = iTileCount;
		TILE_WIDTH = tW;
		TILE_HEIGHT = tH;
		
		calculateTierValues();
		Z.Utils.setParameters(Z.parameters);
		createDisplays(); // Create hotspots or annotation display and list or panel if required.
		createCanvasContexts();
		self.validateXYZDefaults();
		
		// Set default scale for oversize backfill canvas or remove it if image size doesn't require it.
		if (tierCount > backfillTreshold3) {
			tierBackfillOversizeScale = convertZoomToTierScale(tierBackfillOversize, Z.initialZ);
			oCtx.restore();
			oCtx.scale(tierBackfillOversizeScale, tierBackfillOversizeScale);
		} else {
			oD = oS = oCtx = null;
		}
		
		// Set default scales for other canvases.
		tierBackfillScale = convertZoomToTierScale(tierBackfill, Z.initialZ);
		tierScale = convertZoomToTierScale(tierCurrent, Z.initialZ);
		tierScalePrior = tierScale;
		if (Z.useCanvas) {
			vCtx.restore();
			vCtx.scale(tierScale, tierScale);
		}

		// Load watermark, hotspots or annotations, virtual pointer, backfill tiles, and set initial view.
		if (wD) { loadWatermark(); }
		if (hD) { 
			self.setDrawingColor('buttonColor0' + viewportID, true);
			loadHotspotsOrAnnotationsData(viewportID);
		}
		if (Z.virtualPointerVisible) { self.showVirtualPointer(); }
		if (Z.tileSource != 'unconverted') { self.precacheBackfillTiles(); }
		self.setSizeAndPosition(viewW, viewH, viewL, viewT);
		view(Z.initialX, Z.initialY, Z.initialZ, Z.initialR, null, true);
		self.setStatus('initialized', true);

		// Reinitialize related components.
		if (Z.Navigator && Z.navigatorVisible > 0) { Z.Navigator.setImage(Z.imagePath); }

		// Go to next slide is slideshow playing.
		if (Z.slideshowPlaying) { self.nextSlide(); }
	}
	
	function clearAll (clearTileVals, clearTierVals, clearDisplayVals, clearDisps) {
		if (clearTileVals) { clearTileValues(); }
		if (clearTierVals) { clearTierValues(); }
		if (clearDisplayVals) { clearDisplayValues(); }
		if (clearDisps) { clearDisplays(); }
	}
		
	function clearTileValues () {
		// Tile support.
		tilesToLoadTotal = 0;
		tilesLoadingNamesLength = 0;
		if (typeof tilesBackfillCached !== 'undefined') {Z.Utils.arrayClear(tilesBackfillCached); }
		if (typeof tilesBackfillCachedNames !== 'undefined') {Z.Utils.arrayClear(tilesBackfillCachedNames); }
		if (typeof tilesBackfillDisplayingNames !== 'undefined') { Z.Utils.arrayClear(tilesBackfillDisplayingNames); }
		if (typeof tilesDisplayingNames !== 'undefined') { Z.Utils.arrayClear(tilesDisplayingNames); }
		if (typeof tilesLoadingNames !== 'undefined') { Z.Utils.arrayClear(tilesLoadingNames); }
		if (typeof tilesCached !== 'undefined') { Z.Utils.arrayClear(tilesCached); }
		if (typeof tilesCachedNames !== 'undefined') { Z.Utils.arrayClear(tilesCachedNames); }
		if (typeof tilesCachedInView !== 'undefined') { Z.Utils.arrayClear(tilesCachedInView); }
		if (typeof tilesCachedInViewNames !== 'undefined') { Z.Utils.arrayClear(tilesCachedInViewNames); }
		if (typeof tilesInView !== 'undefined') { Z.Utils.arrayClear(tilesInView); }	
		if (typeof tilesInViewNames !== 'undefined') { Z.Utils.arrayClear(tilesInViewNames); }	
			
		// ZIF & PFF support.
		if (typeof tilesRetry !== 'undefined') { Z.Utils.arrayClear(tilesRetry); }
		if (typeof tilesRetryNamesChunks !== 'undefined') { Z.Utils.arrayClear(tilesRetryNamesChunks); }
		if (typeof tilesRetryNames !== 'undefined') { Z.Utils.arrayClear(tilesRetryNames); }
		if (typeof tilesBackfillRetryNames !== 'undefined') { Z.Utils.arrayClear(tilesBackfillRetryNames); }
	
	}

	function clearTierValues () {
		tierCount = 1;	
		tierCurrent = 0;
		tierBackfill = 0;
		tierBackfillDynamic = false;
		if (typeof tierWs !== 'undefined') { Z.Utils.arrayClear(tierWs); }
		if (typeof tierHs !== 'undefined') { Z.Utils.arrayClear(tierHs); }
		if (typeof tierWInTiles !== 'undefined') { Z.Utils.arrayClear(tierWInTiles); }
		if (typeof tierHInTiles !== 'undefined') { Z.Utils.arrayClear(tierHInTiles); }
		if (typeof tierTileCounts !== 'undefined') { Z.Utils.arrayClear(tierTileCounts); }

		// ZIF support.
		if (typeof tierTileOffsetsStart !== 'undefined') { Z.Utils.arrayClear(tierTileOffsetsStart); }
		if (typeof tierTileOffsetsCount !== 'undefined') { Z.Utils.arrayClear(tierTileOffsetsCount); }
		if (typeof tierTileOffsetChunks !== 'undefined') { Z.Utils.arrayClear(tierTileOffsetChunks); }
		if (typeof tierTileOffsetLast !== 'undefined') { Z.Utils.arrayClear(tierTileOffsetLast); }
		if (typeof tierTileByteCountsStart !== 'undefined') { Z.Utils.arrayClear(tierTileByteCountsStart); }
		if (typeof tierTileByteCountsCount !== 'undefined') { Z.Utils.arrayClear(tierTileByteCountsCount); }
		if (typeof tierTileByteCountChunks !== 'undefined') { Z.Utils.arrayClear(tierTileByteCountChunks); }
		if (typeof tierTileByteCountLast !== 'undefined') { Z.Utils.arrayClear(tierTileByteCountLast); }
	}
		
	function clearDisplayValues () {
		if (wD) {
			if (typeof watermarksX !== 'undefined') { Z.Utils.arrayClear(watermarksX); }
			if (typeof watermarksY !== 'undefined') { Z.Utils.arrayClear(watermarksY); }
		}
		if (hD) {
			if (typeof hotspots !== 'undefined') { Z.Utils.arrayClear(hotspots); }
			if (typeof hotspotsMedia !== 'undefined') { Z.Utils.arrayClear(hotspotsMedia); }
			if (hotspotList != null) {
				hotspotList.parentNode.removeChild(hotspotList);
				hotspotList = null;
				if (typeof hotspotListDP !== 'undefined') { Z.Utils.arrayClear(hotspotListDP); }
			} else {
				if (poiList != null) {
					poiList.parentNode.removeChild(poiList);
					poiList = null;
					if (typeof poiListDP !== 'undefined') { Z.Utils.arrayClear(poiListDP); }
				}
				if (labelList != null) {
					labelList.parentNode.removeChild(labelList);
					labelList = null;
					if (typeof labelListDP !== 'undefined') { Z.Utils.arrayClear(labelListDP); }
					if (typeof labelListCurrentDP !== 'undefined') { Z.Utils.arrayClear(labelListCurrentDP); }
				}
				if (noteList != null) {
					noteList.parentNode.removeChild(noteList);
					noteList = null;
					if (typeof noteListDP !== 'undefined') { Z.Utils.arrayClear(noteListDP); }
					if (typeof noteListCurrentDP !== 'undefined') { Z.Utils.arrayClear(noteListCurrentDP); }
				}
			}
		}
	}
	
	function clearDisplays () {
		if (oD) { Z.Utils.clearDisplay(oD); }
		if (bD) { Z.Utils.clearDisplay(bD); }
		if (vD) { Z.Utils.clearDisplay(vD); }
		if (tC) { Z.Utils.clearDisplay(tC); }
		if (wD) { Z.Utils.clearDisplay(wD); }
		if (mC) { Z.Utils.clearDisplay(mC); }
		if (hD) {
			Z.Utils.clearDisplay(hD); 
			hD = null;
		}
		if (dD) { Z.Utils.clearDisplay(dD); }
		if (eD) { Z.Utils.clearDisplay(eD); }
	}
	
	function createDisplays (vpID) {
		if (typeof vpID === 'undefined' || vpID === null) { vpID = 0; }
		var vpIDStr = vpID.toString();
		
		// Create non-draggable non-moving, non-resizing deep background display for oversize
		// image temporary low-resolution fill during rapid zoom or pan while backfill and frontfill
		// tiles download. Must draw tiles on-the-fly unlike other displays.
		if (Z.useCanvas) {
			if (!oD) { 
				oversizeDisplay = Z.Utils.createContainerElement('canvas', 'oversizeDisplay' + vpIDStr, 'inline-block', 'absolute', 'visible', '1px', '1px', '0px', '0px', 'none', '0px', 'transparent none', '0px', '0px', 'normal');
				Z.ViewerDisplay.appendChild(oversizeDisplay);
				oD = oversizeDisplay;
				oS = oD.style;
			}
		}
		
		// Create draggable container for backfill, viewport, watermark, and hotspot displays.
		// Scaling occurs in display canvases directly or in tiles if in non-canvas browser.
		// Set position 'absolute' within parent viewerDisplay container that is set 'relative'.
		if (!cD) {
			viewportContainer = Z.Utils.createContainerElement('div', 'viewportContainer' + vpIDStr, 'inline-block', 'absolute', 'visible', '1px', '1px', '0px', '0px', 'none', '0px', 'transparent none', '0px', '0px', 'normal');
			Z.ViewerDisplay.appendChild(viewportContainer);
			cD = viewportContainer;
			cS = cD.style;
		}

		// Create background display to fill gaps between foreground tiles in viewportDisplay.
		// Note that using canvas is practical because backfill tier is low res and thus small and canvas is CSS scaled large, not internally scaled large or drawn large.
		if (!bD) { 
			viewportBackfillDisplay = Z.Utils.createContainerElement(Z.useCanvas ? 'canvas' : 'div', 'viewportBackfillDisplay' + vpIDStr, 'inline-block', 'absolute', 'visible', '1px', '1px', '0px', '0px', 'none', '0px', 'transparent none', '0px', '0px', 'normal');
			viewportContainer.appendChild(viewportBackfillDisplay);
			bD = viewportBackfillDisplay;
			bS = bD.style;
		}

		// Create canvas or div container for image tiles.
		if (!vD) {
			viewportDisplay = Z.Utils.createContainerElement(Z.useCanvas ? 'canvas' : 'div', 'viewportDisplay' + vpIDStr, 'inline-block', 'absolute', 'visible', '1px', '1px', '0px', '0px', 'none', '0px', 'transparent none', '0px', '0px', 'normal');
			viewportContainer.appendChild(viewportDisplay);
			vD = viewportDisplay;
			vS = vD.style;
		}

		// If using canvas browser, create transition canvas for temporary display while display canvas is updated.
		// Also create temporary canvases for unifying tile sets for new views prior to applying convolution filters.
		if (Z.useCanvas) {
			if (!tC) { 
				transitionCanvas = Z.Utils.createContainerElement('canvas', 'transitionCanvas', 'none', 'absolute', 'visible', '1px', '1px', '0px', '0px', 'none', '0px', 'transparent none', '0px', '0px', 'normal');
				viewportContainer.appendChild(transitionCanvas);
				tC = transitionCanvas;
				tS = tC.style;
			}
		}

		// Create canvas or div container for watermarks.
		if (Z.Utils.stringValidate(Z.watermarkPath) && !wD) {
			watermarkDisplay = Z.Utils.createContainerElement('div', 'watermarkDisplay', 'inline-block', 'absolute', 'visible', '1px', '1px', '0px', '0px', 'none', '0px', 'transparent none', '0px', '0px', 'normal');
			viewportContainer.appendChild(watermarkDisplay);
			wD = watermarkDisplay;
			wS = wD.style;
		}
				
		// If hotspot/label selection masking enabled, create masking canvas.
		if (Z.maskVisible && (Z.hotspots || Z.annotations) && !mC) {
			maskCanvas = Z.Utils.createContainerElement('canvas', 'maskCanvas', 'inline-block', 'absolute', 'visible', '1px', '1px', '0px', '0px', 'none', '0px', 'transparent none', '0px', '0px', 'normal');
			viewportContainer.appendChild(maskCanvas);
			mC = maskCanvas;
			mS = mC.style;
			mS.display = 'none';
		}

		// Create canvas or div container for hotspots.
		if (Z.measureVisible || (Z.tour && !Z.screensaver) || Z.hotspots || Z.annotations) {
			// If viewing annotations in a canvas browser create canvas for drawn contents such as polygons.
			if ((Z.annotations || Z.measureVisible) && Z.useCanvas && !dD) {				
				drawingDisplay = Z.Utils.createContainerElement('canvas', 'drawingDisplay', 'inline-block', 'absolute', 'visible', '1px', '1px', '0px', '0px', 'none', '0px', 'transparent none', '0px', '0px', 'normal');
				viewportContainer.appendChild(drawingDisplay);
				dD = drawingDisplay;
				dS = dD.style;

				// If in edit mode in a canvas browser create canvas for editing polygon or other drawn graphics of hotspot currently selected in labels choicelist.
				if (Z.editMode !== null || Z.measureVisible && !eD) {
					editingDisplay = Z.Utils.createContainerElement('canvas', 'editingDisplay', 'inline-block', 'absolute', 'visible', '1px', '1px', '0px', '0px', 'none', '0px', 'transparent none', '0px', '0px', 'normal');
					viewportContainer.appendChild(editingDisplay);
					eD = editingDisplay;
					eS = eD.style;
				}
			}

			if (!hD) {
				hotspotDisplay = Z.Utils.createContainerElement('div', 'hotspotDisplay', 'inline-block', 'absolute', 'visible', '1px', '1px', '0px', '0px', 'none', '0px', 'transparent none', '0px', '0px', 'normal');
				viewportContainer.appendChild(hotspotDisplay);
				hD = hotspotDisplay;
				hS = hD.style;
				Z.Utils.addEventListener(hotspotDisplay, 'mousedown', Z.Utils.preventDefault);
			}
		}
		
		// Clear prior div contents.
		if (!Z.useCanvas) {
			bD.innerHTML = '';
			vD.innerHTML = '';
		}
		if (wD) { wD.innerHTML = ''; }
		if (hD) { hD.innerHTML = ''; }
	}
	
	function createCanvasContexts () {
      	 	if (oD) { oCtx = oD.getContext('2d'); }
		bCtx = bD.getContext('2d');
		vCtx = vD.getContext('2d');
		tCtx = tC.getContext('2d');
		if (dD) { dCtx = dD.getContext('2d'); }
		if (eD) { eCtx = eD.getContext('2d'); }
	}

	// DEV NOTE: dual setSizeAndPosition functions below are workaround for undefined error on load 
	// due to unhoisted function expression vs hoisted function declaration and/or IE8 limitations.
	this.setSizeAndPosition = function (width, height, left, top) {
		setSizeAndPosition(width, height, left, top);
	}
	
	function setSizeAndPosition (width, height, left, top) {
		// Set Viewport size and set base values or subsequent gets and sets will fail.
		if (typeof left === 'undefined' || left === null) { left = 0; }
		if (typeof top === 'undefined' || top === null) { top = 0; }

		Z.viewerW = viewW = width;
		Z.viewerH = viewH = height;		
		displayW = viewW * PAN_BUFFER;
		displayH = viewH * PAN_BUFFER;
		
		// Prevent canvas sizes too large if working with image set, image is unconverted in Firefox, or
		// for lower limits of other browsers. Additional limit for unconverted images to actual image size
		// plus buffer if pan contraint is non-strict. Additional limit on creation of oversize backfill display.
		// Last test ensures canvas at least as large as view are.
		var canvasSizeMax = (Z.imageSet) ? PAN_BUFFERSIZEMAXIMAGESET : (Z.tileSource == 'unconverted' && Z.browser == Z.browsers.FIREFOX) ? PAN_BUFFERSIZEMAXFIREFOX : PAN_BUFFERSIZEMAXBROWSER;
		var imgW = (Z.constrainPanStrict) ? Z.imageW : Z.imageW * 2; // Alternative implementation: limit to Z.imageW if (Z.constrainPanStrict || (Z.imageSet && Z.tileSource == 'unconverted')).
		var imgH = (Z.constrainPanStrict) ? Z.imageH : Z.imageH * 2;  // Alternative implementation: limit to Z.imageH if (Z.constrainPanStrict || (Z.imageSet && Z.tileSource == 'unconverted')).
		if (displayW > canvasSizeMax) { displayW = canvasSizeMax; }
		if (displayH > canvasSizeMax) { displayH = canvasSizeMax; }	
		if (displayW > imgW) { displayW = imgW; }
		if (displayH > imgH) { displayH = imgH; }	
		if (displayW < viewW) { displayW = viewW; }
		if (displayH < viewH) { displayH = viewH; }
		
		// Calculate center and edge values.
		var digits = 4;
		displayCtrX = Z.Utils.roundToFixed(displayW / 2, digits);
		displayCtrY = Z.Utils.roundToFixed(displayH / 2, digits);	
		displayL = Z.Utils.roundToFixed(-((displayW - viewW) / 2) + left, digits);
		displayR = Z.Utils.roundToFixed(((displayW - viewW) / 2) + left, digits);
		displayT = Z.Utils.roundToFixed(-((displayH - viewH) / 2) + top, digits);
		displayB = Z.Utils.roundToFixed(((displayH - viewH) / 2) + top, digits);
		
		if (oD) {
			oD.width = viewW;
			oD.height = viewH;
			oS.width = viewW + 'px';
			oS.height = viewH + 'px';
			oS.left = '0px';
			oS.top = '0px';
		}

		cD.width = displayW;
		cD.height = displayH;
		cS.width = displayW + 'px';
		cS.height = displayH + 'px';

		// Set container position. Viewport, watermark, and hotspot display values are static as
		// they move via the container. Backfill display changes position and size as it scales
		// to support Navigator panning.
		cS.left =  displayL + 'px';
		cS.top =  displayT + 'px';

		// Sync viewport display size.
		vD.width = displayW;
		vD.height = displayH;
		vS.width = displayW + 'px';
		vS.height = displayH + 'px';

		// Sync watermark display size.
		if (wD) {
			wD.width = displayW;
			wD.height = displayH;
			wS.width = displayW + 'px';
			wS.height = displayH + 'px';
		}

		// Sync mask display size.
		if (mC) {
			mC.width = displayW;
			mC.height = displayH;
			mS.width = displayW + 'px';
			mS.height = displayH + 'px';
		}

		// Sync hotspot display size.
		if (hD) {
			hD.width = displayW;
			hD.height = displayH;
			hS.width = displayW + 'px';
			hS.height = displayH + 'px';
			if (hotD) {
				var listW = parseInt(Z.Utils.getResource('DEFAULT_HOTSPOTLISTWIDTH'), 10);
				var listCoords = calculateHotspotListCoords(hotspotListPosition, listW, viewW, viewH); // viewH allows for toolbar height if static in viewer display area.
				hotS.left = listCoords.x + 'px';
				hotS.top = listCoords.y + 'px';
			}
		}

		// Sync drawing display size.
		if (dD) {
			dD.width = displayW;
			dD.height = displayH;
			dS.width = displayW + 'px';
			dS.height = displayH + 'px';
		}

		// Sync editing display size.
		if (eD) {
			eD.width = displayW;
			eD.height = displayH;
			eS.width = displayW + 'px';
			eS.height = displayH + 'px';
		}

		if (Z.imageSet) { Z.Viewer.sizeAndPositionImageSetList(); }
		
		// Set drawing origin coordinates to viewport display center.
		if (Z.useCanvas) {
			if (oD) {
				oCtx.translate(viewW / 2, viewH / 2);
				oCtx.save();
			}
			
			// Trap possible NS_ERROR_FAILURE error especially in firefox especially if working with large unconverted image.
			// DEV NOTE: add retry or soft fail in catch in future implementation for firefox issue with large canvases.
			try {
				vCtx.translate(displayCtrX, displayCtrY);
			} catch (e) {
				Z.Utils.showMessage(Z.Utils.getResource('ERROR_TRANSLATINGCANVASFORUNCONVERTEDIMAGE'));
				console.log('In function setSizeAndPosition translating canvas:  ' + e);
			}
			vCtx.save();
			
			if (mC) {
				mCtx.translate(displayCtrX, displayCtrY);
				mCtx.save();
			}
			if (dD) {
				dCtx.translate(displayCtrX, displayCtrY);
				dCtx.save();
			}
			if (eD) {
				eCtx.translate(displayCtrX, displayCtrY);
				eCtx.save();
			}
		}
		
		// No setSizeAndPosition steps required here for non-canvas browsers because positioning
		// occurs in drawTileInHTML function based on x and y values passed in by displayTile.
	}
	
	this.syncViewportResize = function (imgX, imgY, imgZ, imgR, fullScrnMode, fvCntW, fvCntH) {
		self.setSizeAndPosition(Z.viewerW, Z.viewerH, 0, 0);
		self.resizeViewport(imgX, imgY, imgZ, imgR);
	}
	
	this.resizeViewport = function (imgX, imgY, imgZ, imgR) {
		self.validateXYZDefaults();
		self.setView(imgX, imgY, imgZ, imgR);	
	}
	
	this.loadImageProperties = function (imgPath, netCnnctr, vpID) {
			loadImageProperties(imgPath, netCnnctr, vpID);
	};

	function loadImageProperties (imgPath, netCnnctr, vpID) {
		// Load image properties from Zoomify Image ZIF file header, folder XML file, PFF file header, or other specified tile source.
		if (Z.tileSource == 'ZoomifyImageFile') {
			loadImagePropertiesFromZIF(imgPath, netCnnctr, vpID);
		} else if (Z.tileSource == 'ZoomifyImageFolder') {
			var imageXMLPath = Z.Utils.cacheProofPath(imgPath + '/' + 'ImageProperties.xml');
			netCnnctr.loadXML(imageXMLPath, vpID);
		}
	}

	function loadImagePropertiesFromZIF (imgPath, netCnnctr, vpID) {
		// Define constants. Load enough bytes for TIF IFDs for pyramid between 2,164,260,864 x 2,164,260,864 pixels
		// and 4,294,967,296 x 4,294,967,296 pixels (assuming a tile size of 256 x 256).
		var HEADER_START_BYTE = parseFloat(Z.Utils.getResource('DEFAULT_HEADERSTARTBYTE'));
		var HEADER_END_BYTE = parseFloat(Z.Utils.getResource('DEFAULT_HEADERENDBYTEZIF'));
		netCnnctr.loadByteRange(imgPath, HEADER_START_BYTE, HEADER_END_BYTE, 'header');
	}

	this.parseZIFHeader = function (data) {		
		clearTierValues();
		
		if (data[0] == 0x49 && data[1] == 0x49 && data[2] == 0x2b && data[3] == 0x00 && data[4] == 0x08 &&  data[5] == 0x00 && data[6] == 0x00 && data[7] == 0x00 && data[8] == 0x10 && data[9] == 0x00 && data[10] == 0x00 && data[11] == 0x00 && data[12] == 0x00 && data[13] == 0x00 && data[14] == 0x00 && data[15] == 0x00) {	

			// Set start values.
			var ifdOffset = Z.Utils.longValue(data, 8); // First IFD.
			var tagCounter = Z.Utils.longValue(data, ifdOffset); // First tag.
			var ifdCounter = 1;

			// Set key variables and constants of Zoomify Image.
			var iW = null, iH = null, tW = null, tH = null, iTileCount = null, iByteCountCount = null, iImageCount = null, iVersion = null, iHeaderSize = null, iHeaderSizeTotal = null, iMagnification = null, iFocal = null, iQuality = null;
			iImageCount=1;  // One image per ZIF file in current release.
			iVersion=2.0;  // ZIF designation (PFF latest revision v1.8).
	
			// Parse ZIF header to extract tier and tile values.
			while (ifdOffset != 0) {
				for (var x = 0; x < tagCounter; x++) {
					var itemOffset = ifdOffset + 8 + x * 20;
					var tag = Z.Utils.shortValue(data, itemOffset);

					switch (tag) {
						case 256: // Image width.
							tierWs[ifdCounter - 1] = Z.Utils.intValue(data, itemOffset + 12);
							break;
						case 257: // Image height.
							tierHs[ifdCounter - 1] = Z.Utils.intValue(data, itemOffset + 12);
							break;
						case 322: // Tile width.
							// DEV NOTE: Assume equal across tiers and equal to tile height in current release.
							tW = Z.Utils.intValue(data, itemOffset + 12);
							break;
						case 323: // Tile height.
							// DEV NOTE: Assume equal across tiers and equal to tile width in current release.
							tH = Z.Utils.intValue(data, itemOffset + 12);
							break;
						case 324: // Tile offsets.
							// At itemOffset, get start of tile offsets for tier, or of tile itself if only one.
							var itemCount = tierTileOffsetsCount[ifdCounter - 1] = Z.Utils.longValue(data, itemOffset + 4);
							tierTileOffsetsStart[ifdCounter - 1] = Z.Utils.longValue(data, itemOffset + 12);
							iTileCount +=  itemCount;
							break;
						case 325: // Tile byte counts.
							// At itemOffset, get start of tile byte counts for tier, or byte count itself if only one, or two byte counts if two.
							var itemCount = tierTileByteCountsCount[ifdCounter - 1] = Z.Utils.longValue(data, itemOffset + 4);
							if (itemCount == 1) {
								tierTileByteCountsStart[ifdCounter - 1] = Z.Utils.intValue(data, itemOffset + 12);
							} else if (itemCount == 2) {
								tierTileByteCountsStart[ifdCounter - 1] = Z.Utils.intValue(data, itemOffset + 12) + ',' + Z.Utils.intValue(data, itemOffset + 16);
							} else {
								tierTileByteCountsStart[ifdCounter - 1] = Z.Utils.longValue(data, itemOffset + 12);
							}
							iByteCountCount +=  itemCount;
							break;
					}
				}
				ifdOffset = Z.Utils.longValue(data, ifdOffset + tagCounter * 20 + 8);
				tagCounter = Z.Utils.longValue(data, ifdOffset);
				ifdCounter++;
			}

			iW = tierWs[0];
			iH = tierHs[0];
			tierCount = ifdCounter - 1;

			// Invert array orders so that 0 element is thumbnail tier not source tier.
			tierWs.reverse();
			tierHs.reverse();
			tierTileOffsetsCount.reverse();
			tierTileOffsetsStart.reverse();
			tierTileByteCountsCount.reverse();
			tierTileByteCountsStart.reverse();
			
			// Debug option: Display ZIF header values.
			/* console.log('Width & Height: ' + iW + ' & ' + iH);
			console.log('Tile Count: ' + iTileCount);
			console.log('tierWs: ' + tierWs.toString());
			console.log('tierTileOffsetsCount: ' + tierTileOffsetsCount.toString());
			console.log('tierTileOffsetsStart: ' + tierTileOffsetsStart.toString());
			console.log('tierTileByteCountsCount: ' + tierTileByteCountsCount.toString());
			console.log('tierTileByteCountsStart: ' + tierTileByteCountsStart.toString());
			*/

			// Initialize or reinitialize Viewport.
			if (!isNaN(iW) && iW > 0 && !isNaN(iH) && iH > 0 && !isNaN(tW) && tW > 0 && !isNaN(tH) && tH > 0 && iTileCount > 0) {
				if (typeof self.getStatus !== 'undefined') {
					initializeViewport(iW, iH, tW, tH, iTileCount, iVersion, iHeaderSize, iHeaderSizeTotal, iMagnification, iFocal, iQuality);
				} else {
					reinitializeViewport(iW, iH, tW, tH, iTileCount, iVersion, iHeaderSize, iHeaderSizeTotal, iMagnification, iFocal, iQuality);
				}
			} else {
				if (Z.tileSource == 'ZoomifyImageFolder') {
					Z.Utils.showMessage(Z.Utils.getResource('ERROR_IMAGEPROPERTIESXMLINVALID'));
				} else {
					Z.Utils.showMessage(Z.Utils.getResource('ERROR_IMAGEPROPERTIESINVALID'));
				}
			}
		}
	}

	this.parseZIFOffsetChunk = function (data, chunkID) {
		var index = Z.Utils.arrayIndexOfObjectValue(tierTileOffsetChunks, 'chunkID', chunkID);
		if (index != -1) {
			tierTileOffsetChunks[index].chunk = data;
			selectTilesRetryZIF(chunkID, 'offset');
		}
	}

	this.parseZIFByteCountChunk = function (data, chunkID) {
		var index = Z.Utils.arrayIndexOfObjectValue(tierTileByteCountChunks, 'chunkID', chunkID);
		if (index != -1) {
			tierTileByteCountChunks[index].chunk = data;
			selectTilesRetryZIF(chunkID, 'byteCount');
		}
	}

	this.parseZIFImage = function (data, tile, target) {		
		var src = 'data:image/jpeg;base64,' + Z.Utils.encodeBase64(data);
		var loadHandler;
		if (target == 'image-display') {
			loadHandler = onTileLoad;
		} else if (target == 'image-backfill') {
			loadHandler = onTileBackfillLoad;
		} else if (target == 'navigator') {
			loadHandler = Z.Navigator.initializeNavigator;
		}
		var func = Z.Utils.createCallback(null, loadHandler, tile);
		Z.Utils.createImageElementFromBytes(src, func);
	}

	this.parseImageXML = function (xmlDoc) {
		parseImageXML(xmlDoc);
	}

	function parseImageXML (xmlDoc, callback) {		
		clearTierValues();
		
		if (typeof self.getStatus === 'undefined') {
			var viewportInitTimer = window.setTimeout( function () { parseImageXML(xmlDoc, callback); }, 100);
		} else {
			// Get key properties of Zoomify Image and initialize Viewport.
			var iW = null, iH = null, tW = null, tH = null, iTileCount = null, iImageCount = null, iVersion = null, iHeaderSize = null, iHeaderSizeTotal = null, iMagnification = null, iFocal = null, iQuality = null;

			if (Z.tileSource == 'ZoomifyImageFolder') {
				iW = parseInt(xmlDoc.documentElement.getAttribute('WIDTH'), 10);
				iH = parseInt(xmlDoc.documentElement.getAttribute('HEIGHT'), 10);
				iTileCount = parseInt(xmlDoc.documentElement.getAttribute('NUMTILES'), 10);
				iImageCount = parseInt(xmlDoc.documentElement.getAttribute('NUMIMAGES'), 10);
				iVersion = parseInt(xmlDoc.documentElement.getAttribute('VERSION'), 10);
				tW = tH = parseInt(xmlDoc.documentElement.getAttribute('TILESIZE'), 10);
			}

			// DEV NOTE: optional HTML parameter custom tile dimensions override defaults, XML values, or server provided values.
			if (Z.tileW !== null) { tW = Z.tileW; }
			if (Z.tileH !== null) { tH = Z.tileH; }

			// Allow for minimal cross-domain XML and incorrectly edited image folder XML.
			if (Z.tileSource == 'ZoomifyImageFolder' || Z.tileSource == 'ImageServer') {
				if (tW === null || isNaN(tW)) { tW = TILE_WIDTH; }
				if (tH === null || isNaN(tH)) { tH = TILE_HEIGHT; }
				if (iTileCount === null || isNaN(iTileCount)) { iTileCount = 1; }
			}

			if (!isNaN(iW) && iW > 0 && !isNaN(iH) && iH > 0 && !isNaN(tW) && tW > 0 && !isNaN(tH) && tH > 0 && iTileCount > 0) {
				if (!self.getStatus('initialized')) {
					initializeViewport(iW, iH, tW, tH, iTileCount, iVersion, iHeaderSize, iHeaderSizeTotal, iMagnification, iFocal, iQuality, callback);
				} else {
					reinitializeViewport(iW, iH, tW, tH, iTileCount, iVersion, iHeaderSize, iHeaderSizeTotal, iMagnification, iFocal, iQuality, callback);
				}
			} else {
				if (Z.tileSource == 'ZoomifyImageFolder') {
					Z.Utils.showMessage(Z.Utils.getResource('ERROR_IMAGEPROPERTIESXMLINVALID'));
				} else {
					Z.Utils.showMessage(Z.Utils.getResource('ERROR_IMAGEPROPERTIESINVALID'));
				}
			}
		}
	}

	function calculateTierValues () {
		if (Z.tileSource == 'unconverted') {
			calculateTierValuesUnconvertedMethod();
		} else if (Z.tileSource == 'ZoomifyImageFile') {
			calculateTierValuesZIFMethod();
		} else {
			var tilesCounted = calculateTierValuesSecondMethod();
			if (tilesCounted != TILE_COUNT && (Z.tileSource == 'ZoomifyImageFolder' || Z.tileSource == 'ZoomifyImageFile' || Z.tileSource == 'ZoomifyPFFFile')) {
				tilesCounted = calculateTierValuesFirstMethod();
				if (tilesCounted != TILE_COUNT) {
					Z.Utils.showMessage(Z.Utils.getResource('ERROR_IMAGETILECOUNTINVALID'));
				}
			}
		}
	}
	
	function calculateTierValuesUnconvertedMethod () {
		tierWs[0] = Z.imageW;
		tierHs[0] = Z.imageH;
		tierWInTiles[0] = 1;
		tierHInTiles[0] = 1;
		tierTileCounts[0] = 1;
		tierCount = 1;
	}

	function calculateTierValuesZIFMethod () {		
		// ZIF files contain tier width, height, and tile counts.  Values extracted
		// in function parseZIFHeader.  Minimal additional values derived here.
		for (var t = tierCount - 1; t >= 0; t--) {
			tierWInTiles[t] = Math.ceil(tierWs[t] / TILE_WIDTH);
			tierHInTiles[t] = Math.ceil(tierHs[t] / TILE_HEIGHT);
			tierTileCounts[t] = tierWInTiles[t] * tierHInTiles[t];
		}
	}

	function calculateTierValuesSecondMethod () {
		// Determine the number of tiers.
		var tempW = Z.imageW;
		var tempH = Z.imageH;
		while (tempW > TILE_WIDTH || tempH > TILE_HEIGHT) {
			tempW = tempW / 2;
			tempH = tempH / 2;
			tierCount++;
		}

		// Determine and record dimensions of each image tier.
		tempW = Z.imageW;
		tempH = Z.imageH;
		var tileCounter = 0;
		for (var t = tierCount - 1; t >= 0; t--) {
			tierWs[t] = tempW;
			tierHs[t] = tempH;
			tierWInTiles[t] = Math.ceil(tierWs[t] / TILE_WIDTH);
			tierHInTiles[t] = Math.ceil(tierHs[t] / TILE_HEIGHT);
			tierTileCounts[t] = tierWInTiles[t] * tierHInTiles[t];
			tempW = tempW / 2;
			tempH = tempH / 2;

			tileCounter += tierTileCounts[t];
		}
		
		// Debug option: console.log('New method: ' + tileCounter + '  ' + TILE_COUNT);
		return tileCounter;
	}

	function calculateTierValuesFirstMethod () {
		// Clear values from prior calculation attempt.
		tierWs =  [];
		tierHs =  [];
		tierWInTiles =  [];
		tierHInTiles =  [];
		tierCount = 1;

		// Determine the number of tiers.
		var pyramidType = 'DIV2';
		var tempW = Z.imageW;
		var tempH = Z.imageH;
		var divider = 2;
		while (tempW > TILE_WIDTH || tempH > TILE_HEIGHT) {
			if (pyramidType == 'Div2') {
				tempW = Math.floor(tempW / 2);
				tempH = Math.floor(tempH / 2);
			} else if (pyramidType == 'Plus1Div2') {
				tempW = Math.floor((tempW+1) / 2);
				tempH = Math.floor((tempH+1) / 2);
			} else {
				tempW = Math.floor(Z.imageW / divider)
				tempH = Math.floor(Z.imageH / divider);
				divider *= 2;
				if (tempW % 2) { tempW++; }
				if (tempH % 2) { tempH++; }
			}
			tierCount++;
		}

		// Determine and record dimensions of each image tier.
		tempW = Z.imageW;
		tempH = Z.imageH;
		divider = 2;
		tileCounter = 0;
		for (var t = tierCount - 1; t >= 0; t--) {
			tierWInTiles[t] = Math.floor(tempW / TILE_WIDTH);
			if (tempW % TILE_WIDTH) { tierWInTiles[t]++; }
			tierHInTiles[t] = Math.floor(tempH / TILE_HEIGHT);
			if (tempH % TILE_HEIGHT) { tierHInTiles[t]++; }
			tierTileCounts[t] = tierWInTiles[t] * tierHInTiles[t];

			tileCounter += tierTileCounts[t];

			tierWs[t] = tempW;
			tierHs[t] = tempH;
			if (pyramidType == 'Div2') {
				tempW = Math.floor(tempW / 2);
				tempH = Math.floor(tempH / 2);
			} else if (pyramidType == 'Plus1Div2') {
				tempW = Math.floor((tempW + 1) / 2);
				tempH = Math.floor((tempH + 1) / 2);
			} else {
				tempW = Math.floor(Z.imageW / divider)
				tempH = Math.floor(Z.imageH / divider);
				divider *= 2;
				if (tempW % 2) { tempW++; }
				if (tempH % 2) { tempH++; }
			}
		}

		// Debug option: console.log('Old method: ' + tileCounter + '  ' + TILE_COUNT);
		return tileCounter;
	}

	this.validateXYZDefaults = function (override) {
		if (override) { Z.Utils.resetParametersXYZ(Z.parameters); }

		// Get default values.
		var iX = parseFloat(Z.Utils.getResource('DEFAULT_INITIALX'));
		var iY = parseFloat(Z.Utils.getResource('DEFAULT_INITIALY'));
		var iZ = parseFloat(Z.Utils.getResource('DEFAULT_INITIALZOOM'));
		var iR = parseFloat(Z.Utils.getResource('DEFAULT_INITIALR'));
		var mnZ = parseFloat(Z.Utils.getResource('DEFAULT_MINZOOM'));
		var mxZ = parseFloat(Z.Utils.getResource('DEFAULT_MAXZOOM'));
		var niX = !isNaN(iX) ? iX : null;
		var niY = !isNaN(iY) ? iY : null;
		var niZ = !isNaN(iZ) ? iZ : null;
		var niR = !isNaN(iR) ? iR : null;
		var nmnZ = !isNaN(mnZ) ? mnZ : null;
		var nmxZ = !isNaN(mxZ) ? mxZ : null;

		// Set default values for all or only specific variables, where parameters are not set.
		if (!Z.parameters) {
			Z.initialX = niX;
			Z.initialY = niY;
			Z.initialZ = niZ;
			Z.initialR = niR;
			Z.minZ = nmnZ;
			Z.maxZ = nmxZ;
		} else {
			if (!Z.parameters.zInitialX) {  Z.initialX = niX; }
			if (!Z.parameters.zInitialY) {  Z.initialY = niY; }
			if (!Z.parameters.zInitialZoom) {  Z.initialZ = niZ; }
			if (!Z.parameters.zInitialRotation) {  Z.initialR = niR; }
			if (!Z.parameters.zMinZoom) {  Z.minZ = nmnZ; }
			if (!Z.parameters.zMaxZoom) {  Z.maxZ = nmxZ; }
		}

		// Set pan center point as default if required.
		if (Z.initialX === null) { Z.initialX = Z.imageW / 2; }
		if (Z.initialY === null) { Z.initialY = Z.imageH / 2; }

		// Set defaults if required.
		Z.fitZ = self.calculateZoomToFit(0);
		Z.fillZ = self.calculateZoomToFill(0);
		var currentR = (self.getStatus('initialized')) ? self.getRotation() : Z.initialR;
		var zFitR = self.calculateZoomToFit(currentR);
		var zFillR = self.calculateZoomToFill(currentR);
		
		// Constrain zoom-to-fit and zoom-to-fill to max zoom if set by parameter, or to 1 if viewing unconverted image.
		if (Z.fitZ > 1) {
			if (Z.maxZ !== null) {
				if (Z.fitZ > Z.maxZ) { Z.fitZ = Z.maxZ; }
			} else if (Z.tileSource == 'unconverted') {
				Z.fitZ = 1;
			}
		}
		if (Z.fillZ > 1) {
			if (Z.maxZ !== null) {
				if (Z.fillZ > Z.maxZ) { Z.fillZ = Z.maxZ; }
			} else if (Z.tileSource == 'unconverted') {
				Z.fillZ = 1;
			}
		}
		
		// Set min and max values if not set by parameter.
		if (Z.minZ === null || Z.minZ == -1) { 
			Z.minZ = Z.fitZ;
		} else if (Z.minZ == 0) {
			Z.minZ = Z.fillZ;
		}
		if (Z.maxZ === null || Z.maxZ == -1) { Z.maxZ = 1; }
		
		// Constrain initial zoom within fit or fill, rotated fit or fill, and min and max zoom.
		if (Z.initialZ === null || Z.initialZ == -1) {
			Z.initialZ = zFitR;
		} else if (Z.initialZ == 0) {
			Z.initialZ = zFillR;
		}
		if (Z.initialZ < Z.minZ) { Z.initialZ = Z.minZ; }
		if (Z.initialZ > Z.maxZ) { Z.initialZ = Z.maxZ; }
	}



	//::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::
	//:::::::::::::::::::::::::::::::::: GET & SET FUNCTIONS :::::::::::::::::::::::::::::::::
	//::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::

	this.getViewW = function () {
		return viewW;
	}

	this.getViewH = function () {
		return viewH;
	}
	
	this.getDisplayW = function () {
		return displayW;
	}

	this.getDisplayH = function () {
		return displayH;
	}
	
	// Support imageSet viewing.
	this.getImagePath = function () {
		return imagePath;
	}
	
	// Support non-imageSet viewing.
	this.setImagePath = function (value) {
		imagePath = value;
	}
	
	this.getViewportID = function () {
		return viewportID;
	}

	this.getTierCount = function () {
		return tierCount;
	}

	this.getTileW = function () {
		return TILE_WIDTH;
	}

	this.getTileH = function () {
		return TILE_HEIGHT;
	}

	this.getTierCurrent = function () {
		return tierCurrent;
	}

	this.getTierBackfill = function () {
		return tierBackfill;
	}

	this.getTierBackfillDynamic = function () {
		return tierBackfillDynamic;
	}

	this.getTierBackfillOversize = function () {
		return tierBackfillOversize;
	}
	
	this.getTierScale = function () {
		return tierScale;
	}

	this.getX = function () {
		var deltaX = parseFloat(cS.left) - displayL;
		var currentZ = self.getZoom();
		var currentX = imageX - (deltaX / currentZ);
		return currentX;
	}

	this.getY = function () {
		var deltaY = parseFloat(cS.top) - displayT;
		var currentZ = self.getZoom();
		var currentY = imageY - (deltaY / currentZ);
		return currentY;
	}

	this.getZoom = function () {
		var currentZ = convertTierScaleToZoom(tierCurrent, tierScale);
		return currentZ;
	}

	this.getRotation = function () {
		// DEV NOTE: returning current rather than stored value by processing of CSS tranform matrix is in development.
		return Z.imageR;
	}

	this.getTiersScaleUpMax = function () {
		return TIERS_SCALE_UP_MAX;
	}

	this.getTiersScaleDownMax = function () {
		return TIERS_SCALE_DOWN_MAX;
	}

	this.getTilesCacheMax = function () {
		return TILES_CACHE_MAX;
	}

	this.getTierWs = function () {
		return tierWs.join(',');
	}

	this.getTierHs = function () {
		return tierHs.join(', ');
	}

	this.getTierTileCounts = function () {
		return tierTileCounts.join(', ');
	}
	
	this.getTilesToLoad = function () {
		return tilesToLoadTotal;
	}

	this.getTilesLoadingNames = function () {
		var tilesLoading = (tilesLoadingNames.join(', ') == '') ? 'Current view loading complete' : tilesLoadingNames.join(', ');
		return tilesLoading;
	}
	
	// Progress functions track tiles to display, load, etc. Tiles 'waiting' are loaded but not displayed, therefore, not drawn.
	this.getTilesToDraw = function () {
		return tilesWaiting;
	}

	this.getConstrainPan = function (value) {
		return Z.constrainPan;
	}

	this.setConstrainPan = function (value) {
		Z.constrainPan = (value != 0);
		Z.constrainPanStrict = (value == 2) ? true : false;
		if (Z.constrainPan) {
			self.toggleConstrainPan(true);
		}
	}
			
	this.getSmoothPan = function () {
		return Z.smoothPan;
	}

	this.setSmoothPan = function (value) {
		Z.smoothPan = value;
	}
			
	this.getSmoothPanEasing = function () {
		return Z.smoothPanEasing;
	}

	this.setSmoothPanEasing = function (value) {
		Z.smoothPanEasing = value;
	}
			
	this.getSmoothPanGlide = function () {
		return Z.smoothPanGlide;
	}

	this.setSmoothPanGlide = function (value) {
		Z.smoothPanGlide = value;
	}

	this.setCoordinatesDisplayVisibility = function (visible) {
		if (visible) {
			Z.Utils.addEventListener(document, 'mousemove', displayEventsCoordinatesHandler);
			Z.Utils.addEventListener(document, 'mousedown', displayEventsCoordinatesHandler);
		} else {
			Z.coordinatesVisible = false;
			Z.Utils.removeEventListener(document, 'mousemove', displayEventsCoordinatesHandler);
			Z.Utils.removeEventListener(document, 'mousedown', displayEventsCoordinatesHandler);
		}
	}
	
	this.setTourPath = function (tourPath, noReload) {
		self.setHotspotPath(tourPath, noReload);
	}

	this.setHotspotPath = function (hotspotPath, noReload) {
		if (typeof hotspotPath !== 'undefined' && !Z.Utils.stringValidate(hotspotPath)) { 
			Z.hotspotPath = null;
			Z.hotspotFolder = null;
			self.deleteAllHotspots();
		} else {
			Z.hotspotPath = Z.Utils.stringRemoveTrailingSlashCharacters(hotspotPath);
			Z.hotspotFolder = Z.hotspotPath;
			if (Z.hotspotPath.toLowerCase().substring(Z.hotspotPath.length - 4, Z.hotspotPath.length) == '.xml') {
				Z.hotspotFolder = Z.hotspotFolder.substring(0, Z.hotspotFolder.lastIndexOf('/'));
			}
			if (!noReload) {
				self.deleteAllHotspots();
				loadHotspotsOrAnnotationsData(viewportID);
			}
		}
	}

	this.getHotspots = function () {
		return hotspots;
	}

	this.setHotspots = function (hotsArr) {
		hotspots = hotsArr.slice(0);
	}

	// Support imageSet viewing.
	this.setVisibility = function (visible) {
		visibility(visible);
	}
	
	// Support imageSet viewing.
	function visibility (visible) {
		var dispValue = (visible) ? 'inline-block' : 'none';
		if (oversizeDisplay && !oS) { oS = oversizeDisplay.style; }
		if (oS) { oS.display = dispValue; }
		if (viewportContainer && !cS) { cS = viewportContainer.style; }
		if (cS) { cS.display = dispValue; }
	}
	
	this.showLists = function (visible) {
		var visValue = (visible) ? 'visible' : 'hidden';
		if (Z.hotspots) { Z.Viewer.setVisibilityHotspotChoiceList(visible, viewportID.toString()); }
		if (slideList) { slideList.style.visibility = visValue; }
		if (Z.imageSet && imageSetList) { imageSetList.style.visibility = visValue; }
	}
	
	

	//::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::
	//:::::::::::::::::::::::::::::::: CORE FUNCTIONS :::::::::::::::::::::::::::::::
	//::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::
	
	// Precache backfill tiers to ensure fast low-res background. Delay some precaching to speed image set display.
	this.precacheBackfillTiles = function (delayed) {
		if (!delayed) {
			precacheTierTileNames(backfillChoice0, tilesBackfillCachedNames);
			backfillTresholdCached0 = true;
		}
		if ((!Z.imageSet || vpID == Z.imageSetStart || delayed) && tierCount > backfillTreshold1) {
			precacheTierTileNames(backfillChoice1, tilesBackfillCachedNames);
			backfillTresholdCached1 = true;
			if (tierCount > backfillTreshold2) {
				precacheTierTileNames(backfillChoice2, tilesBackfillCachedNames);
				backfillTresholdCached2 = true;
			}
			self.setStatus('backfillPrecached', true);
		}
		
		tilesBackfillCachedNames.sort();
		tilesBackfillCachedNames = Z.Utils.arrayUnique(tilesBackfillCachedNames);
		tilesBackfillDisplayingNames = tilesBackfillCachedNames.slice(0);
		
		self.traceDebugValues('tilesBackfillToPrecache', null, tilesBackfillDisplayingNames.length);
		loadNewTiles(tilesBackfillCachedNames, onTileBackfillLoad, 'simple', 'image-backfill');
	}

	function precacheTierTileNames (tier, cacheArr) {
		var tierColumnR = tierWInTiles[tier] - 1;
		var tierRowB = tierHInTiles[tier] - 1;
		for (var columnCntr = 0; columnCntr <= tierColumnR; columnCntr++) {
			for (var rowCntr = 0; rowCntr <= tierRowB; rowCntr++) {
				cacheArr[cacheArr.length] = tier + '-' + columnCntr + '-' + rowCntr;
			}
		}
	}

	function updateViewWhilePanning (stepX, stepY) {
		// Streamlined version of updateView code (which is called in full form on pan end).
		// DEV NOTE: Updating tiles while panning disabled. Requires optimization.
	}

	// Main drawing function called after every change of view.  First reposition and rescale backfill, viewport and related 
	// displays to transfer any panning and/or scaling from container and CSS values to canvas or tile image values.
	this.updateView = function (override) {
		if (typeof vpID === 'undefined' || vpID === null) { vpID = 0; }
		
		// Get values to ensure action is needed and for callback validation at completion of function.
		var userInteracting = Z.mouseIsDown || Z.buttonIsDown || Z.keyIsDown || Z.mouseWheelIsDown;
		var viewZoomed = (tierScale != tierScalePrior || self.getZoom() != Z.imageZ || Z.imageZ != Z.priorZ);
		var viewPanned = (parseFloat(cS.left) != displayL || parseFloat(cS.top) != displayT || self.getX() != Z.imageX || self.getY() != Z.imageY);
		var viewFullExiting = Z.fullViewPrior;
		
		if (viewZoomed || viewPanned || viewFullExiting || (typeof override !== 'undefined' && override && (!userInteracting || Z.animation))) {
			
			var changeBuffer = 1; // Update current viewport backfill, and if viewing imageSet, backfill for viewports before and after.
			if (!Z.imageSet || !Z.Viewer.getStatus('ready') || (vpID > Z.viewportCurrentID - changeBuffer && vpID < Z.viewportCurrentID + changeBuffer)) {
				
				// If no rotation prior values not yet set in reset function so set here.
				recordPriorViewCoordinates();

				// Recenter position of container of displays and reset any scaling of canvases or
				// tile image elements. This prepares all objects for new content.
				resetDisplays(override);
				
				// If zooming, change viewport and backfill tiers if necessary.
				var delayClear = false;

				if ((typeof override !== 'undefined' && override) || tierScale != tierScalePrior || self.getZoom() != Z.imageZ || !self.getStatus('initialized')) {
					
					selectTier();
					if (Z.tileSource != 'unconverted') {
						selectBackfillTier();
						redisplayCachedTiles(bD, tierBackfill, tilesBackfillCached, 'simple', false, '2. Updating view: changing tier - backfill');
					}
					if (!override && TILES_CACHE_MAX > 0) { delayClear = true; }
				} else {
					self.traceDebugValues('updateView-noChange');
				}

				// If zooming or panning, refill viewport with cached tiles or load new tiles. However, if no new tiles needed and convolution filter applied then tiles 
				// have been drawn to temp canvas from cache and must now be filtered as one data object and then drawn to viewport display canvas.
				if (Z.tileSource != 'unconverted' && tierBackfillDynamic) { 
					selectTiles(true);
				} else {
					if (oD) { Z.Utils.clearDisplay(oD); }
				}
			}
							
			// Update current viewport frontfill, even if viewing imageSet.
			if (!Z.imageSet || vpID == Z.viewportCurrentID) {
						
				if (Z.tileSource != 'unconverted') {
					selectTiles();
					redisplayCachedTiles(vD, tierCurrent, null, 'centerOut', delayClear, '3. Updating view: prior to loading of any new tiles');

				} else if (typeof unconvertedImage !== 'undefined') {
					var x = -Z.imageX;
					var y = -Z.imageY;
					Z.Utils.clearDisplay(vD);
					vCtx.drawImage(unconvertedImage, x, y);
				}

				if (Z.maskingSelection) { setMask(); }

				if (tilesLoadingNames.length > 0) {
					loadNewTiles(tilesLoadingNames, onTileLoad, 'centerOut', 'image-display');
				}
				
				// Update related displays and components.
				self.syncViewportRelated();
				
			} else {
				// Override default false status for viewports other than starting viewport.
				self.setStatus('displayLoaded', true);
				self.setStatus('displayDrawn', true);
			}
			 
			// Validate all view change callbacks.
			if (viewPanned) { Z.Utils.validateCallback('viewPanned'); }
			if (viewZoomed) { Z.Utils.validateCallback('viewZoomed'); }
			if (viewPanned || viewZoomed) { Z.Utils.validateCallback('viewChanged'); }
		
			// Debug option: console.log(Z.viewportCurrent.getLabelIDsInCurrentView(true, true, true));
		}
	}

	function resetDisplays (override) {
		// If display scaled or panned, reset scale and position to maintain container center
		// point and adjust current tiles to offset change and fill view while new tiles load.
		var redisplayRequired = false;

		// Test for scaling to reset.
		if (override || parseFloat(vS.width) != vD.width) {

			if (Z.useCanvas) {
				// Reset viewport display by returning to start values and reset viewport canvas then transfer CSS scaling to internal canvas scale.
				vS.width = vD.width + 'px';
				vS.height = vD.height + 'px';
				vS.left = '0px';
				vS.top = '0px';
				vCtx.restore();
				vCtx.save();
				
				// Trap possible NS_ERROR_FAILURE error especially in firefox especially if working with large unconverted image.
				// DEV NOTE: add retry or soft fail in catch in future implementation for firefox issue with large canvases.
				try {
					vCtx.scale(tierScale, tierScale);
				} catch (e) {
					Z.Utils.showMessage(Z.Utils.getResource('ERROR_SCALINGCANVASFORUNCONVERTEDIMAGE'));
					console.log('In function resetDisplays scaling canvas:  ' + e);
				}

				// Sync mask canvas.
				if (mC) {
					mS.width = vD.width + 'px';
					mS.height = vD.height + 'px';
					mS.left = '0px';
					mS.top = '0px';
				}

				// Sync drawing canvas.
				if (dD) {
					dS.width = dD.width + 'px';
					dS.height = dD.height + 'px';
					dS.left = '0px';
					dS.top = '0px';
				}

				// Sync editing canvas.
				if (eD) {
					eS.width = eD.width + 'px';
					eS.height = eD.height + 'px';
					eS.left = '0px';
					eS.top = '0px';
				}
				
				// Backfill display resized and rescaled depending on whether display is dynamic and partially filled or static and complete as determined in function selectBackfillTier.
				// Backfill positioning and offsetting occurs below. Scaling occurs in the scaleTierToZoom or redisplayCachedTiles functions depending on whether backfill display is 
				// implemented as a canvas or HTML div. Oversize backfill display, if present, is always implemented as a canvas as redraw must be fast to provide benefit. 
				if (bD) { 
					if (tierBackfillDynamic) {
						// Reset backfill display by returning to start values and reset backfill canvas then transfer CSS scaling to internal canvas scale.
						bS.width = bD.width + 'px';
						bS.height = bD.height + 'px';
						bS.left = backfillL + 'px';
						bS.top = backfillT + 'px';
						bCtx.restore();
						bCtx.save();
						bCtx.scale(tierBackfillScale, tierBackfillScale);
					} else {	
						bS.width = backfillW + 'px';
						bS.height = backfillH + 'px';
						bS.left = backfillL + 'px';
						bS.top = backfillT + 'px';		
					}
				}

			}
			// No 'else' clause here for non-canvas browsers because scaling occurs in the
			// drawTileInHTML function based on tierScale passed in by displayTile. The
			// dimensions of the displays are unimportant as the tiles are drawn to overflow.
			// The positions of the displays are set below where panning changes are reset.

			redisplayRequired = true;
		}

		// Test for panning to reset.  Update imageX and imageY to offset so that
    		// when tiles are redrawn they will be in the same position in the view.
    		if (override || parseFloat(cS.left) != displayL || parseFloat(cS.top) != displayT) {

    			// Calculate pan change in position.
			var deltaX = parseFloat(cS.left) - displayL;
    			var deltaY = parseFloat(cS.top) - displayT;

			// Correct coordinates for mouse-panning.
			if (Z.imageR != 0) {
				var deltaPt = Z.Utils.rotatePoint(deltaX, deltaY, Z.imageR);
				deltaX = deltaPt.x;
				deltaY = deltaPt.y;
			}

    			// Recenter viewport display.
			cS.left = displayL + 'px';
			cS.top = displayT + 'px';

			// Reset backfill tracking variables and reposition backfill display to offset container recentering. Backfill will not 
			// be redrawn in the redisplayRequired clause below. If tierBackfillDynamic, full reset occurs in function selectBackfillTier.
			if (!tierBackfillDynamic) {
				backfillL = (parseFloat(bS.left) + deltaX);
				backfillT = (parseFloat(bS.top) + deltaY);
				bS.left = backfillL + 'px';
				bS.top = backfillT + 'px';
			}
			
			// Update imageX and imageY values to offset.
			var currentZ = self.getZoom();
			Z.imageX = imageX = Z.imageX - (deltaX / currentZ);
    			Z.imageY = imageY = Z.imageY - (deltaY / currentZ);
    			
			redisplayRequired = true;
		}

		if (redisplayRequired) {
			redisplayCachedTiles(vD, tierCurrent, tilesCached, 'centerOut', false, '1a. Updating view: resetting display positions');
			if (Z.maskingSelection && mC) { displayMask(); }
			if (tierBackfillDynamic) { redisplayCachedTiles(bD, tierBackfill, tilesBackfillCached, 'simple', false, '1b. Updating view: resetting backfill positions'); }
		}
    	}

	function selectTier () {
		// If tier has been scaled translate scaling to zoom tracking variable.
		if (tierScale != tierScalePrior) { Z.imageZ = self.getZoom(); }
		
		// Prevent infinite loop on constraint failure in case of JS timing errors.
		if (Z.imageZ < Z.minZ) { Z.imageZ = Z.minZ; }
		if (Z.imageZ > Z.maxZ) { Z.imageZ = Z.maxZ; }

		// Determine best image tier and scale combination for intended zoom.
		var calcZ = TIERS_SCALE_UP_MAX;
		var tierTarget = tierCount;
		while(calcZ / 2 >= Z.imageZ) {
			tierTarget--;
			calcZ /= 2;
		}
		tierTarget = (tierTarget - 1 < 0) ? 0 : tierTarget - 1; // Convert to array base 0.
		var tierScaleTarget = convertZoomToTierScale(tierTarget, Z.imageZ);

		// If zooming, apply new tier and scale calculations.  No steps required here for the
		// drawing canvas as its scale does not change, only the control point coordinates do.
		if (tierTarget != tierCurrent || tierScaleTarget != tierScale) {
			if (Z.useCanvas) {
				vCtx.restore();
				vCtx.save();
				vCtx.scale(tierScaleTarget, tierScaleTarget);
			}
			// No steps required here for non-canvas browsers because scaling occurs
			// in drawTileInHTML function based on tierScale passed in by displayTile.

			// Reset tier and zoom variables.
			if (tierCurrent != tierTarget) { tierChanged = true; }
			tierCurrent = tierTarget;
			tierScale = tierScaleTarget;
		}
		tierScalePrior = tierScale;
	}

	function selectBackfillTier () {
		// Use high backfill tier behind high frontfill tiers to avoid blurry backfill when panning at full zoom. Use 0 backfill tier 
		// behind low frontfill tiers to avoid tiles gaps lining up. Backfill tiles for tiers 0 to 3 are precached (depending on total 
		// image tiers) in precacheBackfillTiles in initializeViewport or reinitializeViewport and then loaded in redisplayCachedTiles
		// in updateView. Deep zoom on large images will force dynamic loading and positioning of backfill tiles.
		tierBackfillDynamic = false;
		if (tierCurrent > backfillTreshold3) {
			tierBackfill = tierCurrent - backfillDynamicAdjust;
			tierBackfillDynamic = true;
		} else {
			tierBackfill = (tierCurrent > backfillTreshold2) ? backfillChoice2 : (tierCurrent > backfillTreshold1) ? backfillChoice1 : backfillChoice0;
		}
		
		tierBackfillScale = convertZoomToTierScale(tierBackfill, Z.imageZ);
		tierBackfillScalePrior = tierBackfillScale;
		
		var tierBackfillW = tierWs[tierBackfill];
		var tierBackfillH = tierHs[tierBackfill];	

		// Convert current pan position from image values to tier values.
		var deltaX = Z.imageX * Z.imageZ;
		var deltaY = Z.imageY * Z.imageZ;
		
		// Set backfill globals for use during fast scaling then set backfill display dimensions and position. If backfill is dynamic, no steps 
		// required for non-canvas browsers because scaling occurs in drawTileInHTML function based on tierScale passed in by displayTile.
		if (tierBackfillDynamic) {
			var buffer = BACKFILL_BUFFER;
			backfillW = displayW * buffer;
			backfillH = displayH * buffer;
			backfillL = -(displayW / buffer);
			backfillT = -(displayH / buffer);
			backfillCtrX = displayCtrX * buffer;
			backfillCtrY = displayCtrY * buffer;
			bD.width = backfillW;
			bD.height = backfillH;		
			bS.width = bD.width + 'px';
			bS.height = bD.height + 'px';
			bS.left = backfillL + 'px';
			bS.top = backfillT + 'px';
			if (Z.useCanvas) {
				if (oD) {
					tierBackfillOversizeScale = convertZoomToTierScale(tierBackfillOversize, Z.imageZ);
					oCtx.restore();
					oCtx.save();
					oCtx.scale(tierBackfillOversizeScale, tierBackfillOversizeScale);
					if (Z.imageR != 0) {
						oCtx.rotate(Z.imageR * Math.PI / 180);
					}
				}
				bCtx.restore();
				bCtx.translate(backfillCtrX, backfillCtrY);
				bCtx.save();
				bCtx.scale(tierBackfillScale, tierBackfillScale);
			}
			
		} else {
			// Set backfill globals for use during fast scaling then set backfill display dimensions and position.
			backfillW = tierBackfillW * tierBackfillScale;
			backfillH = tierBackfillH * tierBackfillScale;
			backfillL = (displayCtrX - deltaX);
			backfillT = (displayCtrY - deltaY);
			bD.width = tierBackfillW;
			bD.height = tierBackfillH;
			if (Z.useCanvas) {
				bS.width = backfillW + 'px';
				bS.height = backfillH + 'px';
			}			
			bS.left = backfillL + 'px';
			bS.top = backfillT + 'px';
		}
	}

	// Calculate tiles at edges of viewport for current view then store names of tiles in view. Identify 
	// required tiles that have not been previously loaded. Identify tiles needed for current view that 
	// have been previously loaded. Remove previously loaded tile names to allow redisplay rather 
	// than reload. Update loading tracking variable and also progress display if enabled. Remove 
	// and re-add previously loaded tile names to promote so as to avoid clearing on cache validation. 
	// Clear collection of tiles in current view before it is refilled in onTileLoad function. First ensure 
	// all tiles' alpha values are set to 1 for drawing in progress and future use from cache. Implement 
	// for backfill only if backfill is partially filled rather than completely precached due to the size of 
	// the total image and the degree of current zoom. 
	function selectTiles (backfill) {
		if (!backfill) {				
			// Clear tracking lists.
			Z.Utils.arrayClear(tilesDisplayingNames);
			Z.Utils.arrayClear(tilesCachedInView);
			Z.Utils.arrayClear(tilesCachedInViewNames);
			Z.Utils.arrayClear(tilesLoadingNames);
			
			// Determine edge tiles of view.
			var bBox = self.getViewportDisplayBoundingBoxInTiles();
			
			// Determine tiles in view.
			for (var columnCntr = bBox.l, tR = bBox.r; columnCntr <= tR; columnCntr++) {
				for (var rowCntr = bBox.t, tB = bBox.b; rowCntr <= tB; rowCntr++) {
					var tileName = tierCurrent + '-' + columnCntr + '-' + rowCntr;
					tilesDisplayingNames[tilesDisplayingNames.length] = tileName;
					tilesLoadingNames[tilesLoadingNames.length] = tileName;
				}
			}
			
			// If current tier matches a precached backfill tier determine cached backfill tiles useful for frontfill and remove from loading list. Backfill tiles also in frontfill will be used in function onTileLoad called by onTileBackfillLoad.
			if (self.getStatus('initialized') && tilesBackfillCached.length > 0 && (tierCurrent == backfillChoice0 || tierCurrent == backfillChoice1 || tierCurrent == backfillChoice2)) {
				for (var i = 0, j = tilesBackfillCached.length; i < j; i++) {
					var tile = tilesBackfillCached[i];
					if (tile && tile.t == tierCurrent && tile.c >= bBox.l && tile.c <= bBox.r && tile.r >= bBox.t && tile.r <= bBox.b) {
						tilesCachedInViewNames[tilesCachedInViewNames.length] = tile.name;					
						tilesCachedInView[tilesCachedInView.length] = tile;
						var index = Z.Utils.arrayIndexOf(tilesLoadingNames, tile.name);
						if (index != -1) { tilesLoadingNames = Z.Utils.arraySplice(tilesLoadingNames, index, 1); }
					}
				}
			}
			
			// Determine cached frontfill tiles in view and remove from loading list. Backfill tiles also in frontfill will be used in function onTileLoad called by onTileBackfillLoad.
			for (var i = 0, j = tilesCached.length; i < j; i++) {
				var tile = tilesCached[i];
				if (tile && tile.t == tierCurrent && tile.c >= bBox.l && tile.c <= bBox.r && tile.r >= bBox.t && tile.r <= bBox.b) {
					var index = Z.Utils.arrayIndexOf(tilesCachedInViewNames, tile.name);
					if (index == -1) {
						tilesCachedInViewNames[tilesCachedInViewNames.length] = tile.name;					
						tilesCachedInView[tilesCachedInView.length] = tile;
					}
					var index2 = Z.Utils.arrayIndexOf(tilesLoadingNames, tile.name);
					if (index2 != -1) { tilesLoadingNames = Z.Utils.arraySplice(tilesLoadingNames, index2, 1); }
				}
			}
			
			// Fully fade-in cached tiles in view and clear lists.
			if (tilesLoadingNamesLength != 0) {
				for (var i = 0, j = tilesInView.length; i < j; i++) {
					var tile = tilesInView[i];
					tile.alpha = 1;
				}
				Z.Utils.arrayClear(tilesInView);
				Z.Utils.arrayClear(tilesInViewNames);
			}
			
			// Track progress.
			tilesToLoadTotal = tilesLoadingNames.length;
			
			// Trace progress.
			self.traceDebugValues('tilesToDisplay', null, tilesDisplayingNames.length, tilesDisplayingNames);
			self.traceDebugValues('tilesInCache', null, tilesCachedInViewNames.length, tilesCachedInViewNames);
			self.traceDebugValues('tilesToLoad', null, tilesLoadingNames.length, tilesLoadingNames);
			
		} else {
			var bBox = self.getViewportDisplayBoundingBoxInTiles(tierBackfill);
			Z.Utils.arrayClear(tilesBackfillCachedNames);
			Z.Utils.arrayClear(tilesBackfillDisplayingNames);
			for (var columnCntr = bBox.l, tR = bBox.r; columnCntr <= tR; columnCntr++) {
				for (var rowCntr = bBox.t, tB = bBox.b; rowCntr <= tB; rowCntr++) {
					var tileName = tierBackfill + '-' + columnCntr + '-' + rowCntr;
					tilesBackfillDisplayingNames[tilesBackfillDisplayingNames.length] = tileName;
					tilesBackfillCachedNames[tilesBackfillCachedNames.length] = tileName;
				}
			}
			
			// Track progress.
			loadNewTiles(tilesBackfillCachedNames, onTileBackfillLoad, 'simple', 'image-backfill');
		}
	}

	function redisplayCachedTiles (display, tier, cacheArray, drawMethod, delayClear, purpose) {
		// If using canvas browser, display content of temporary transition canvas while display canvas
		// is updated. In non-canvas browsers, draw directly to display, optionally using
		// center-out order. Clear tiles previously drawn or wait until all tiles load - per parameter.
		if (!delayClear) { Z.Utils.clearDisplay(display); }
		
		if (drawMethod == 'canvasCopy') {
			Z.Utils.clearDisplay(vD);
			vCtx.restore();
			vCtx.save();
			vCtx.scale(1, 1);
			vCtx.drawImage(tC, -displayCtrX, -displayCtrY);
			vCtx.restore();
			vCtx.save();
			vCtx.scale(tierScale, tierScale);
			
		} else {
			// Calculate tiles at edges of viewport display for current view.
			var bBox = self.getViewportDisplayBoundingBoxInTiles(tier);
			var cacheArrayInView = [];
			
			// Determine cached tiles in view.
			if (cacheArray === null) {
				for (var i = 0, j = tilesCachedInView.length; i < j; i++) {
					cacheArrayInView[i] = tilesCachedInView[i];
				}
			} else if (cacheArray.length > 0) {
				for (var i = 0, j = cacheArray.length; i < j; i++) {
					var tile = cacheArray[i];
					// Filter list to tile in view unless backfill and not tierBackfillDynamic.
					if (tile && tile.t == tier && ((tier == tierBackfill && !tierBackfillDynamic) || (tile.c >= bBox.l && tile.c <= bBox.r && tile.r >= bBox.t && tile.r <= bBox.b))) {
						cacheArrayInView[cacheArrayInView.length] = cacheArray[i];
					}
				}
			}
			
			if (cacheArrayInView.length > 0) {
				self.traceDebugValues('redisplayCachedTiles-' + display.id, null, null, cacheArrayInView);

				if (drawMethod == 'centerOut') {
					// Draw from middle sorted array up & down to approximate drawing from center of view out.
					var arrayMidpoint = Math.floor(cacheArrayInView.length / 2);
					for (var i = arrayMidpoint, j = cacheArrayInView.length; i < j; i++) {
						displayTile(display, tier, cacheArrayInView[i]);						
						if (cacheArrayInView.length-i-1 != i) {
							displayTile(display, tier, cacheArrayInView[cacheArrayInView.length-i-1]);
						}
					}

				} else {				
					// Draw simple, first to last.
					for (var i = 0, j = cacheArrayInView.length; i < j; i++) {					
						displayTile(display, tier, cacheArrayInView[i]);
					}
				}

			} else {
				self.traceDebugValues('No cached tiles in view');
			}

			self.traceDebugValues('blankLine');
		}
	}

	function displayCacheDisplay (tier, cacheArray) {
		// In canvas browsers avoid blink of visible backfill as canvas is fully cleared
		// and redrawn by first drawing cached tiles from prior view to temp canvas.

		// Calculate tiles at edges of viewport display for current view.
		var bBox = self.getViewportDisplayBoundingBoxInTiles();

		// Synchronize transition canvas to collect cached tiles.
		syncTransitionCanvas();

		for (var i = 0, j = cacheArray.length; i < j; i++) {
			var tile = cacheArray[i];
			if (tile && tile.t == tier && (tier == tierBackfill || (tile.c >= bBox.l && tile.c <= bBox.r && tile.r >= bBox.t && tile.r <= bBox.b))) {
				displayTile(tC, tier, tile);
			}
		}
	}
	
	syncTransitionCanvas = function () {
		if (tC && tS && tCtx) {
			tC.width = vD.width;
			tC.height = vD.height;
			tS.width = vS.width;
			tS.height = vS.height;
			tS.left = vS.left;
			tS.top = vS.top;
			tCtx.restore();
			tCtx.save();
			tCtx.translate(displayCtrX, displayCtrY);
			tCtx.scale(tierScale, tierScale);
		}
	}

	//::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::
	//:::::::::::::::: UNCONVERTED IMAGE VIEWING FUNCTIONS :::::::::::::::::::::::::::
	//::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::

	this.loadUnconvertedImage = function (imgPath) {
		loadUnconvertedImage(imgPath);
	}
	
	function loadUnconvertedImage (imgPath) {
		unconvertedImage = null;
		unconvertedImage = new Image();
		unconvertedImage.onload = initializeViewportUnconverted;
		unconvertedImage.onerror = unconvertedImageLoadingFailed;
		unconvertedImage.src = imgPath;		
	}
	
	function initializeViewportUnconverted () {
		if (typeof unconvertedImage !== 'undefined') {
			var testImageContainer = Z.Utils.createContainerElement('div', 'testImageContainer', 'inline-block', 'absolute', 'hidden', viewW + 'px', viewH + 'px', '0px', '0px', 'none', '0px', 'transparent none', '0px', '0px', 'normal', null, true);
			testImageContainer.appendChild(unconvertedImage);
			testImageContainer.removeChild(unconvertedImage);
			testImageContainer = null;
			var tW = unconvertedImage.width;
			var tH = unconvertedImage.height;
			
			self.setStatus('displayLoaded', true);
			self.setStatus('displayDrawn', true);
			
			if (tW != 0 && tH != 0) {
				initializeViewport(tW, tH, tW, tH, null, null, null, null, null, null, null);
			} else {
				var unconvertedImageLoadedTimer = window.setTimeout( function () { initializeViewportUnconverted(); }, 100);
			}
		} else {
			var unconvertedImageLoadedTimer = window.setTimeout( function () { initializeViewportUnconverted(); }, 100);
		}
	}
	
	function unconvertedImageLoadingFailed () {
		Z.Utils.showMessage(Z.Utils.getResource('ERROR_UNCONVERTEDIMAGEPATHINVALID'));
	}
	
	this.getUnconvertedImage = function () {		
		return unconvertedImage;
	}
	
	this.createUnconvertedImageThumbnail = function () {
		if (Z.useCanvas) {
			if (typeof unconvertedImage !== 'undefined') {
				var unconvertedImageThumb = null;
				var thumbScale = 150 / Z.imageW;
				var w = Z.imageW * thumbScale;
				var h = Z.imageH * thumbScale;
				var tempCanvas = Z.Utils.createContainerElement('canvas', 'tempCanvas', 'inline-block', 'absolute', 'visible', w + 'px', h + 'px', '0px', '0px', 'none', '0px', 'transparent none', '0px', '0px', 'normal');
				var tempCtx = tempCanvas.getContext('2d');
				
				// Trap possible NS_ERROR_FAILURE error if working with large unconverted image.
				// DEV NOTE: add retry or soft fail in catch in future implementation for firefox issue with large canvases.
				try {
					tempCtx.scale(thumbScale, thumbScale);
					tempCtx.drawImage(unconvertedImage, 0, 0);
				} catch (e) {
					//Z.Utils.showMessage(Z.Utils.getResource('ERROR_SCALINGCANVASFORUNCONVERTEDIMAGE'));
					console.log('In function initializeViewportContinue scaling canvas:  ' + e);
				}

				unconvertedImageThumb = new Image();
				unconvertedImageThumb.src = tempCanvas.toDataURL('image/jpeg', Z.saveImageCompression);
				return unconvertedImageThumb;
			} else {
				var createUnconvertedImageThumbnailTimer = window.setTimeout( function () { createUnconvertedImageThumbnail(); }, 100);
			}
		}
	}
	
	//::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::
	//:::::::::::::::::::::::::::::::: TILE LOADING FUNCTIONS ::::::::::::::::::::::::::::::::
	//::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::

	function loadNewTiles (tileNamesArray, loadHandler, drawMethod, requester) {
		// For Zoomify Image Files (ZIF or PFF) loading is contingent on offset chunk having loaded.
		var reqValue = (typeof requester !== 'undefined' && requester !== null) ? '-' + requester : '';
				
		if (tileNamesArray.length > 0 ) {
			self.traceDebugValues('loadNewTiles' + reqValue, null, null, tileNamesArray);
			
			var loadStart = new Date().getTime();
			
			if (drawMethod == 'centerOut' && tileNamesArray.length > 4) {
				// Draw from middle of view out by temporarily recentering coordinates over 0,0, then sorting by the 
				// geometric distance from the new origin. Limitations: does not yet allow for non-square display areas.
				var tempTiles = [];
				var tL = 0, tR = 0, tT = 0, tB = 0;
				for (var i = 0; i < tileNamesArray.length; i++) {
					var tileName = tileNamesArray[i];
					if (tileName) {
						var tile = new Tile(tileName, requester);
						tempTiles[tempTiles.length] = tile;
						if (i == 0) {
							tL = tR = tile.c;
							tT = tB = tile.r;
						} else {
							if (tile.c < tL) {
								tL = tile.c;
							} else if (tile.c > tR) {
								tR = tile.c;
							}
							if (tile.r < tT) {
								tT = tile.r;
							} else if (tile.r > tB) {
								tB = tile.r;
							}
						}
					}
				}
				var width = tR - tL, height = tB - tT;
				var adjustX = tL + (width / 2);
				var adjustY = tT + (height / 2);
				for (var i = 0; i < tempTiles.length; i++) {
					tempTiles[i].r -= adjustY;
					tempTiles[i].c -= adjustX;
				}
				tempTiles.sort( function (a, b) {
					var distanceA = (a.r * a.r + a.c * a.c); // Math.sqrt(a.r * a.r + a.c * a.c); // Alternative implementation: sqrt not required.
					var distanceB = (b.r * b.r + b.c * b.c); // Math.sqrt(b.r * b.r + b.c * b.c); // Alternative implementation: sqrt not required.
					var distanceDiff = distanceA - distanceB; 
					return distanceDiff;
				});
				for (var i = 0; i < tempTiles.length; i++) {
					tempTiles[i].r += adjustY;
					tempTiles[i].c += adjustX;
					loadTile(tempTiles[i], loadStart, loadHandler);
					// Debug option: console.log(tempTiles[i].name);
				}

			} else {
				// Draw simple, first to last.
				for (var i = 0, j = tileNamesArray.length; i < j; i++) {
					var tileName = tileNamesArray[i];
					if (tileName) {
						var tile = new Tile(tileName, requester);
						loadTile(tile, loadStart, loadHandler);
					}
				}
			}
			
			self.traceDebugValues('blankLine');
		} else {
			self.traceDebugValues('loadNewTiles' + reqValue, 'No new tiles requested');
		}
	}

	function Tile (name, requester) {
		// Values used by drawTileOnCanvas and drawTileInHTML.
		this.name = name;
		var tileVals = new TileCoords(name);
		this.t = tileVals.t;
		this.c = tileVals.c;
		this.r = tileVals.r;
		this.x = Math.floor(this.c * TILE_WIDTH);
		this.y = Math.floor(this.r * TILE_HEIGHT);
		this.image = null;
		this.alpha = 0;

		this.url = self.formatTilePath(this.t, this.c, this.r, requester);
		this.loadTime = null;

		// Values used only by drawTileInHTML.
		this.elmt = null;
		this.style = null;
	}
	
	function TileCoords (name) {
		this.t = parseInt(name.substring(0, name.indexOf('-')), 10);
		this.c = parseInt(name.substring(name.indexOf('-') + 1, name.lastIndexOf('-')), 10);
		this.r = parseInt(name.substring(name.lastIndexOf('-') + 1), 10);
	}

	this.formatTilePath = function (t, c, r, requester) {
		var tilePath;
		if (Z.tileSource == 'ZoomifyImageFile') {
			tilePath = formatTilePathZIF(t, c, r, requester);
		} else if (Z.tileSource == 'ZoomifyImageFolder') {
			tilePath = formatTilePathImageFolder(t, c, r, requester);
		}
		return tilePath;
	}

	// Tile path is actually image file path plus start and end byte positions in the ZIF file. This is used by
	// function loadImageByteRange to request tile image bytes.  Tile path is set to 'offsetLoading' if new
	// offset chunk must be loaded from ZIF to determine the start and end positions.
	function formatTilePathZIF (t, c, r, requester) {		
		// Set default values to control asynchronous tile, offset, and byte count loading.
		var tilePath = 'offsetLoading', tileOffset = 'loading', tileByteCount = 'loading';
		var index, chunkData;
		
		// Load offset to tile offsets if many or actual tile offset if just one.
		if (tierTileOffsetsCount[t] == 1) {
			tileOffset = tierTileOffsetsStart[t];

		} else {
			// Determine chunkID, chunkStart, chunkEnd, and offsetStartInChunk.
			var offsetValues = new OffsetChunkValues(t, c, r);
			
			// Determine if tile offset must be loaded or already has previously. If must download, minimize round-trips by downloading many at once.
			// Offset values are 64-bit values (eight bytes each). Add 12 only during IFD parsing (for the offset from the start of the IFD entry).
			var offsetTileRetry = offsetValues.chunkID + ',' + t +',' + c +',' + r + ',' + requester + ',' + 'offset';
			index = Z.Utils.arrayIndexOfObjectValue(tierTileOffsetChunks, 'chunkID', offsetValues.chunkID);
			if (index == -1) {
				
				self.traceDebugValues('formatTilePathZIF', offsetValues.chunkID + ',' + t +',' + c +',' + r + ',' + requester);
				
				if (Z.Utils.arrayIndexOf(tilesRetryNamesChunks, offsetTileRetry) == -1) {
					tilesRetryNamesChunks[tilesRetryNamesChunks.length] = offsetTileRetry;
				}
				tierTileOffsetChunks[tierTileOffsetChunks.length] = { chunkID:offsetValues.chunkID, chunk:'loading' };
				var netConnector = new Z.NetConnector();
				netConnector.loadByteRange(imagePath, offsetValues.chunkStart, offsetValues.chunkEnd, 'offset', null, offsetValues.chunkID);

			} else if (tierTileOffsetChunks[index].chunk == 'loading') {
				if (Z.Utils.arrayIndexOf(tilesRetryNamesChunks, offsetTileRetry) == -1) {
					tilesRetryNamesChunks[tilesRetryNamesChunks.length] = offsetTileRetry;
				}
				
			} else if (tierTileOffsetChunks[index].chunk != 'loading') {
				chunkData = tierTileOffsetChunks[index].chunk;
				tileOffset = Z.Utils.longValue(chunkData, offsetValues.offsetStartInChunk);
			}
		}

		// Load bytecount offsets if many, actual byte count if one, or concatenated & delimited byte counts if two.
		var bcChunkNumInTier, bcTileRetry;
		if (tierTileByteCountsCount[t] == 1) {
			tileByteCount = tierTileByteCountsStart[t];

		} else {
			var bcNumInTier = c + r * tierWInTiles[t];
			
			if (tierTileByteCountsCount[t] == 2) {
				var bcConcat = tierTileByteCountsStart[t];
				if (bcNumInTier == 0) {
					tileByteCount = bcConcat.substring(0, bcConcat.indexOf(','));
				} else {
					tileByteCount = bcConcat.substring(bcConcat.indexOf(',') + 1, bcConcat.length);
				}

			} else {
				// Determine chunkID, chunkStart, chunkEnd, and byteCountStartInChunk.
				var byteCountValues = new ByteCountChunkValues(t, c, r);
	
				// Determine if tile byte count must be loaded or already has previously. If must download, minimize round-trips by downloading many at once.
				// Byte counts are 32-bit values (four bytes each). Use Z.Utils.intValue for the byte counts (which only decodes four bytes).  Add 12 only during IFD parsing (for the offset from the start of the IFD entry).
				var bcTileRetry = byteCountValues.chunkID + ',' + t +',' + c +',' + r + ',' + requester + ',' + 'byteCount';
				index = Z.Utils.arrayIndexOfObjectValue(tierTileByteCountChunks, 'chunkID', byteCountValues.chunkID);
				if (index == -1) {
					if (Z.Utils.arrayIndexOf(tilesRetryNamesChunks, bcTileRetry) == -1) {
						tilesRetryNamesChunks[tilesRetryNamesChunks.length] = bcTileRetry;
					}
					tierTileByteCountChunks[tierTileByteCountChunks.length] = { chunkID:byteCountValues.chunkID, chunk:'loading' };
					var netConnector = new Z.NetConnector();
					netConnector.loadByteRange(imagePath, byteCountValues.chunkStart, byteCountValues.chunkEnd, 'byteCount', null, byteCountValues.chunkID);

				} else if (tierTileByteCountChunks[index].chunk == 'loading') {
					if (Z.Utils.arrayIndexOf(tilesRetryNamesChunks, bcTileRetry) == -1) {
						tilesRetryNamesChunks[tilesRetryNamesChunks.length] = bcTileRetry;
					}
					
				} else if (tierTileByteCountChunks[index].chunk != 'loading') {
					chunkData = tierTileByteCountChunks[index].chunk;			
					tileByteCount = Z.Utils.intValue(chunkData, byteCountValues.bcStartInChunk);
					
				}
			}
		}
		
		// Debug option:
		/*if ((tileOffset != 'loading' && isNaN(tileOffset)) || (tileByteCount != 'loading' && isNaN(tileByteCount))) {
			console.log(t + "-" + c + "-" + r + ": " + tileOffset + "  " + tileByteCount);
		}*/		
		
		// Add retry information to retry list. Chunk number can be offset or byte count chunk.
		// Return tile path for loadNewTiles or loadNewTilesRetry to download tiles.
		if (tileOffset != 'loading' && !isNaN(tileOffset) && tileByteCount != 'loading' && !isNaN(tileByteCount) ) {
			tilePath = imagePath + '?' + tileOffset.toString() + ','+ tileByteCount.toString();
		}
		return tilePath;
	}
	
	// Determine offset chunk needed, its size, start, and end, and limit size to number of offsets in tier of tile in request.
	function OffsetChunkValues (t, c, r) {
		var offsetNumInTier = c + r * tierWInTiles[t];
		var offsetStartInTier = offsetNumInTier * 8 + tierTileOffsetsStart[t];
		var offsetChunkNumInTier = Math.floor(offsetNumInTier / CHUNK_SIZE);
		var chunkEndTest = offsetChunkNumInTier * CHUNK_SIZE;
		var chunkPastEndTest = chunkEndTest + CHUNK_SIZE;
		var currentChunkSize = (chunkPastEndTest > tierTileCounts[t]) ? (tierTileCounts[t] - chunkEndTest) * 8 : OFFSET_CHUNK_SIZE_BYTES;

		this.chunkStart = tierTileOffsetsStart[t] + (offsetChunkNumInTier * OFFSET_CHUNK_SIZE_BYTES);
		this.chunkEnd = this.chunkStart + currentChunkSize;
		this.offsetStartInChunk = offsetStartInTier - this.chunkStart;
		this.chunkID = t.toString() + '-' + offsetChunkNumInTier.toString();
	}

	// Determine byteCount chunk needed, its size, start, and end, and limit size to number of byteCounts in tier of tile in request.
	function ByteCountChunkValues (t, c, r) {
		var bcNumInTier = c + r * tierWInTiles[t];
		var bcStartInTier = bcNumInTier * 4 + tierTileByteCountsStart[t];
		var bcChunkNumInTier = Math.floor(bcNumInTier / CHUNK_SIZE);
		var chunkEndTest = bcChunkNumInTier * CHUNK_SIZE;
		var chunkPastEndTest = chunkEndTest + CHUNK_SIZE;
		var currentChunkSize = (chunkPastEndTest > tierTileCounts[t]) ? (tierTileCounts[t] - chunkEndTest) * 4 : BC_CHUNK_SIZE_BYTES;

		this.chunkStart = tierTileByteCountsStart[t] + (bcChunkNumInTier * BC_CHUNK_SIZE_BYTES);
		this.chunkEnd = this.chunkStart + currentChunkSize;
		this.bcStartInChunk = (bcStartInTier - this.chunkStart);
		this.chunkID = t.toString() + '-' + bcChunkNumInTier.toString();
	}

	function formatTilePathImageFolder (t, c, r, requester) {
		// URI for each tile includes image folder path, tile group subfolder name, and tile filename.
		var offset = r * tierWInTiles[t] + c;
		for (var i = 0; i < t; i++) { offset += tierTileCounts[i]; }
		var tileGroupNum = Math.floor(offset / TILES_PER_FOLDER);
		var tilePath = imagePath + '/' + 'TileGroup' + tileGroupNum + '/' + t + '-' + c + '-' + r + "." + Z.tileType;
		
		// DEV NOTE: Must cache-proof tile paths for old IE versions and if tile caching set off by resource change.
		// Implementing for all cases as precaution and monitoring for issue reports.  Implementing in function
		// formatTilePath rather than in call to it because excluding PFF (image file) and third party protocol
		// tile requests to avoid complications with server-side helper app or image server tile fulfillment.
		if ((Z.browser == Z.browsers.IE && Z.browserVersion < 9)|| TILES_CACHE_MAX == 0) {
			tilePath = Z.Utils.cacheProofPath(tilePath);
		}

		return tilePath;
	}

	function selectTilesRetryZIF (chunkID, type) {

		for(var i = 0, j = tilesRetryNamesChunks.length; i < j; i++) {
			var tilesRetryElements = tilesRetryNamesChunks[i].split(',');
			if (tilesRetryElements[0] == chunkID && tilesRetryElements[5] == type) {
				if (tilesRetryElements[4] !== undefined && tilesRetryElements[4] == 'image-display') {
					tilesRetryNames[tilesRetryNames.length] = tilesRetryElements[1] + '-' + tilesRetryElements[2] + '-' + tilesRetryElements[3]; // t,c,r
				} else if (tilesRetryElements[4] == 'image-backfill') {
					tilesBackfillRetryNames[tilesBackfillRetryNames.length] = tilesRetryElements[1] + '-' + tilesRetryElements[2] + '-' + tilesRetryElements[3]; // t,c,r
				}
				tilesRetryNamesChunks = Z.Utils.arraySplice(tilesRetryNamesChunks, i, 1);
				i--;
				j--;
			}
		}

		if (tilesRetryNames.length > 0) {
			tilesRetryNames.sort();
			tilesRetryNames = Z.Utils.arrayUnique(tilesRetryNames);
			self.traceDebugValues('selectTilesRetryZIF', tilesRetryNames);
			var loadHandler = onTileLoad;
			loadNewTilesRetry(tilesRetryNames, loadHandler, 'simple', 'image-display');
		}

		if (tilesBackfillRetryNames.length > 0) {
			tilesBackfillRetryNames.sort();
			tilesBackfillRetryNames = Z.Utils.arrayUnique(tilesBackfillRetryNames);
			var loadHandler = onTileBackfillLoad;
			loadNewTilesRetry(tilesBackfillRetryNames, loadHandler, 'simple', 'image-backfill');
		}
	}

	function loadNewTilesRetry (tileNamesArray, loadHandler, drawMethod, requester) {
		var loadStart = new Date().getTime();

		for (var i = 0, j = tileNamesArray.length; i < j; i++) {
			var tile = null;
			var tileName = tileNamesArray[i];
			if (tileName) {
				tileNamesArray = Z.Utils.arraySplice(tileNamesArray, i, 1);

				i--;
				j--;
				index = Z.Utils.arrayIndexOfObjectValue(tilesRetry, 'name', tileName);
				if (index != -1) {
					tile = tilesRetry[index];
					tilesRetry = Z.Utils.arraySplice(tilesRetry, index, 1);
					tile.url = self.formatTilePath(tile.t, tile.c, tile.r, requester);
				} else {
					tile = new Tile(tileName, requester);
				}

				if (tile != null && tile.url.indexOf('NaN') == -1) {	
					self.traceDebugValues('loadNewTilesRetry', tile.name + '  ' + tile.url);			
					loadTile(tile, loadStart, loadHandler);
					
				} else if (tile.url.indexOf('NaN') == -1) {
					var messageDuration = parseInt(Z.Utils.getResource('ERROR_MESSAGEDURATIONMEDIUM'), 10);
					Z.Utils.showMessage(Z.Utils.getResource('ERROR_TILEPATHINVALID-ZIF') + tile.name + '.jpg', false, messageDuration, 'center', false);
				}
			}
		}
	}

	function skipTile (tile) {
		// Tiles to skip are tiles not captured at a particular position in an image at a particular resolution.  This
		// results from microscopy scanning to create a Zoomify Image File (ZIF) or Zoomify Pyramidal File (PFF) 
		// where only areas of primary interest are scanned at high resolution while in other areas the lower resolution 
		// backfill image tiles are allowed to show through. For these tiles, the PFF offset chunks will have a byte range 
		// for the tile that is 0 bytes in length. This approach results in more efficient storage and bandwidth use. 
		// Skipped tiles are not loaded but are added to tile cache to prevent redundant future loading attempts.

		// Debug option: Use next line to trace tiles not requested due to sparse PFF tile feature.
		// console.log('Tile skipped: ' + tile.name);

		cacheTile(tile);
		
		var tileName = tile.name;
		var index = Z.Utils.arrayIndexOf(tilesLoadingNames, tileName);
		if (index != -1) { tilesLoadingNames = Z.Utils.arraySplice(tilesLoadingNames, index, 1); }
		if (Z.tileSource == 'ZoomifyImageFile' || Z.tileSource == 'ZoomifyPFFFile') {
			var index2 = Z.Utils.arrayIndexOf(tilesRetryNames, tileName);
			if (index2 != -1) { tilesRetryNames = Z.Utils.arraySplice(tilesRetryNames, index2, 1); }
		}
		tilesInView[tilesInView.length] = tile;
		tilesInViewNames[tilesInViewNames.length] = tileName;
	}

	function loadTile (tile, loadTime, loadHandler) {
		// Asynchronously load tile and ensure handler function is called upon loading.
		var tileName = tile.name;
		if (tile.url.substr(0, 8) == 'skipTile') {
			skipTile(tile);
			
		} else if (tile.url == 'offsetLoading') {
			var index = Z.Utils.arrayIndexOfObjectValue(tilesRetry, 'name', tileName);
			if (index == -1) { tilesRetry[tilesRetry.length] = tile; }
			self.traceDebugValues('loadTileDelayForOffset', tileName);
			
		} else if (tile.url != 'offsetLoading') {
			var tileType;
			if (loadHandler == onTileLoad) {
				tileType = 'image-display';
			} else if (loadHandler == onTileBackfillLoad) {
				tileType = 'image-backfill';
			}
			
			// Load tile unless it is for frontfill but already loaded for backfill.
			var tilesCachedForBackfill = ((tile.t == backfillChoice0 && backfillTresholdCached0) || (tile.t == backfillChoice1 && backfillTresholdCached1) || (tile.t == backfillChoice2 && backfillTresholdCached2));
			if (!(tileType == 'image-display' && tilesCachedForBackfill)) {
				tile.loadTime = loadTime;
				self.traceDebugValues('loadTile-' + tileType, tileName);
				tileNetConnector.loadImage(tile.url, Z.Utils.createCallback(null, loadHandler, tile), tileType, tile);

				// DEV NOTE: This value returned by function for possible future storage and use (currently used when loading hotspot media).
				//tile.loading = tileNetConnector.loadImage(tile.url, Z.Utils.createCallback(null, loadHandler, tile), 'tile');
			}
		} 
	}

	function onTileLoad (tile, image) {
		if (tile && image) {
			tile.image = image;
			var tileName = tile.name;
			
			// Verify loading tile is still in loading list and thus still required.  Allows for
			// loading delays due to network latency or PFF header chunk loading.
			var index = Z.Utils.arrayIndexOf(tilesLoadingNames, tileName);
			if (index != -1) {
				tilesLoadingNames = Z.Utils.arraySplice(tilesLoadingNames, index, 1);
				cacheTile(tile);
				
				// Also create current view tile collection for faster zoomAndPanToView function.
				if (Z.Utils.arrayIndexOf(tilesInViewNames, tileName) == -1) {
					tilesInViewNames[tilesInViewNames.length] = tileName;
					tilesInView[tilesInView.length] = tile;
				}

				// Draw tile with fade-in.
				if (!fadeInInterval) { fadeInInterval = window.setInterval(fadeInIntervalHandler, 50); }

				// Determine if all new tiles have loaded.
				tilesLoadingNamesLength = tilesLoadingNames.length;
				if (tilesLoadingNamesLength == 0) {

					// Fully clear and redraw viewport display if canvas in use. If using canvas browser,
					// display temporary transition canvas while display canvas is updated.
					if (Z.useCanvas && (TILES_CACHE_MAX > 0)) {
						if (!tierChanged) {
							redisplayCachedTiles(vD, tierCurrent, tilesCached, 'centerOut', false, '4. Updating view: all new tiles loaded');
						} else {
							displayCacheDisplay(tierCurrent, tilesCached);
							redisplayCachedTiles(vD, tierCurrent, tilesCached, 'canvasCopy', false, '4. Updating view: all new tiles loaded');
							var transitionTimer = window.setTimeout( function () { Z.Utils.clearDisplay(tC); }, 200);
							tierChanged = false;
						}
					}
					
					// Last needed tile loaded and drawn by function drawTileOnCanvas to temp canvas.
					// Verify tiles cached in loaded list are under allowed maximum.
					validateCache();

					// Update value for toolbar progress display.
					tilesToLoadTotal = 0;
				}
							
				// Validate view update progress, and debugging display data.
				self.traceDebugValues('onTileLoad', tile.name, tile.loadTime);
				self.updateProgress(tilesToLoadTotal, tilesLoadingNamesLength); // Update loading tracking variable and also progress display if enabled.
			}
			
			// Validate loading status.
			if (tilesToDisplay == tilesInCache + tilesLoaded) { self.setStatus('displayLoaded', true); }

		} else if (typeof image === 'undefined' || image === null) {
			if (Z.mobileDevice) {
				console.log(Z.Utils.getResource('ERROR_TILEPATHINVALID') + tile.name + '.jpg');
			} else {
				console.log(Z.Utils.getResource('ERROR_TILEPATHINVALID') + tile.name + '.jpg');
			}
		}
	}

	function onTileBackfillLoad (tile, image) {
		
		if (tile && image) {			
			tile.image = image;
			var tileName = tile.name;

			// Cache tile and move tile name from loading list to loaded list.
			tilesBackfillCached[tilesBackfillCached.length] = tile;
			var index = Z.Utils.arrayIndexOf(tilesBackfillCachedNames, tileName);
			if (index != -1) { tilesBackfillCachedNames = Z.Utils.arraySplice(tilesBackfillCachedNames, index, 1); }
			if (Z.tileSource == 'ZoomifyImageFile' || Z.tileSource == 'ZoomifyPFFFile') {
				var index2 = Z.Utils.arrayIndexOf(tilesBackfillRetryNames, tileName);
				if (index2 != -1) { tilesBackfillRetryNames = Z.Utils.arraySplice(tilesBackfillRetryNames, index2, 1); }
			}

			// No backfill fade-in necessary. Tiles precached and load behind main display or outside view area.
			tile.alpha = 1;

			// Draw tile if in current backfill tier, otherwise it will be drawn from cache when needed.
			if (tile.t == tierBackfill ) { displayTile(bD, tierBackfill, tile); }
			
			// Validate loading status, view update, progress, and debugging display data.
			self.traceDebugValues('onTileBackfillPrecache', tile.name);
			if (tilesBackfillToPrecache == tilesBackfillToPrecacheLoaded) { self.setStatus('precacheLoaded', true); }
			self.traceDebugValues('onTileBackfillLoad', tile.name);
			if (tilesBackfillToDisplay <= tilesBackfillInCache + tilesBackfillLoaded) { self.setStatus('backfillLoaded', true); }

			// If tile is also present in frontfill pass to handler for caching, tracking, filtering, and display.
			if (tile.t == tierCurrent) { onTileLoad(tile, image); }

		} else if (typeof image === 'undefined' || image === null) {
			if (Z.mobileDevice) {
				console.log(Z.Utils.getResource('ERROR_TILEPATHINVALID') + tile.name + '.jpg');
			} else {
				Z.Utils.showMessage(Z.Utils.getResource('ERROR_TILEPATHINVALID') + tile.name + '.jpg');
			}
		}
	}

	// DEV NOTE: not currently applied.
	function onTileLoadWhilePanning (tile, image) {
		if (tile && image) {
			tile.image = image;
			var tileName = tile.name;
			displayTile(vD, tierCurrent, tile);
		} else if (typeof image === 'undefined' || image === null) {
			if (Z.mobileDevice) {
				console.log(Z.Utils.getResource('ERROR_TILEPATHINVALID') + tile.name + '.jpg');
			} else {
				Z.Utils.showMessage(Z.Utils.getResource('ERROR_TILEPATHINVALID') + tile.name + '.jpg');
			}
		}
	}
	
	

	//::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::
	//:::::::::::::::::::::::::::::::::: DRAWING FUNCTIONS ::::::::::::::::::::::::::::::::::
	//::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::

	function fadeInIntervalHandler (event) {
		var completeCount = 0;
		for (var i = 0, j = tilesInView.length; i < j; i++) {
			var tile = tilesInView[i];
			if (tile.t == tierCurrent) {
				if (fadeInStep != 0 && tile.alpha + fadeInStep < 1) {
					tile.alpha += fadeInStep;
				} else {
					tile.alpha = 1;
					completeCount++;
				}
				
				// DEV NOTE: Draws tiles in view if any tile new. Allows for loading delays but may draw redundantly on rapid small pans.
				// Debug option: console.log('Fading: ' + tile.name + '  alpha: ' + tile.alpha);
				displayTile(vD, tierCurrent, tile);

				if (completeCount >= j) {
					window.clearInterval(fadeInInterval);
					fadeInInterval = null;
					i = j;
				}
			} else {
				tilesInView = Z.Utils.arraySplice(tilesInView, i, 1);
				tilesInViewNames = Z.Utils.arraySplice(tilesInViewNames, i, 1);
				var index = Z.Utils.arrayIndexOf(tilesLoadingNames, tile.name);
				if (index != -1) { tilesLoadingNames = Z.Utils.arraySplice(tilesLoadingNames, index, 1); }
				j--;
			}
		}
	}

	function displayTile (display, tier, tile) {
		// Draw tile on screen using canvas or image elements as appropriate to browser support.  Apply
		// zoom of current tier to imageX and Y but do not apply scale of current tier as that scaling is function
		// of the context or container object. Do not display tile if tile has been skipped (see skipTile function notes).
		if (tile.url.substr(0, 8) != 'skipTile' && tile.image.width != 0 && tile.image.height != 0) {
			
			var x = tile.x;
			var y = tile.y;
			var tierCurrentZoomUnscaled = convertTierScaleToZoom(tier, 1);
			
			tierBackfillOversizeScale = convertZoomToTierScale(tierBackfillOversize, self.getZoom());
			var override = (tierBackfillOversizeScale > 8); // Slider snap or mousewheel can create need for oversize backfill before selectTier resets tierBackfillDynamic = true.
			if (Z.useCanvas) {				
				if (display == vD || display == tC || (display == bD && tierBackfillDynamic)) {
					x -= (Z.imageX * tierCurrentZoomUnscaled);
					y -= (Z.imageY * tierCurrentZoomUnscaled);
				} else if (display == oD && (tierBackfillDynamic  || override)) {
					var newVPImgCtrPt = self.calculateCurrentCenterCoordinates();
					x -= (newVPImgCtrPt.x * tierCurrentZoomUnscaled);
					y -= (newVPImgCtrPt.y * tierCurrentZoomUnscaled);
				}
				drawTileOnCanvas(display, tile, x, y);
				
			} else {
				var scale;
				if (display == vD) {
					x -= ((Z.imageX * tierCurrentZoomUnscaled) - (displayCtrX / tierScale));
					y -= ((Z.imageY * tierCurrentZoomUnscaled) - (displayCtrY / tierScale));
					scale = tierScale;
				} else {
					scale = tierBackfillScale;
				}
				drawTileInHTML(display, tile, x, y, scale);
			}
			
			// Validate drawing status, view update, progress, and debugging display data.
			if (display == vD) {
				self.traceDebugValues('displayTile', tile.name);
				if (tilesToDisplay == tilesDisplayed) { self.setStatus('displayDrawn', true); }
			} else {
				self.traceDebugValues('displayBackfillTile', tile.name);
				if (tilesBackfillToDisplay <= tilesBackfillDisplayed) { self.setStatus('backfillDrawn', true); }
			}
		}
	}

	function drawTileOnCanvas (container, tile, x, y) {			
		// Debug option: Uncomment next two lines to display tile borders.
		//x += tile.c;
		//y += tile.r;

		var containerCtx = container.getContext('2d');
			
		if (Z.alphaSupported && tile.alpha < 1 && container.id != 'transitionCanvas' && (container.id.indexOf('oversizeDisplay') == -1)) {
			containerCtx.globalAlpha = tile.alpha;
		}
		
		containerCtx.drawImage(tile.image, x, y);
		
		if (Z.alphaSupported && tile.alpha < 1 && container.id != 'transitionCanvas' && container.id != 'oversizeDisplay') {
			containerCtx.globalAlpha = 1;
		}

		// If in debug mode 2, add tile name to tile.
		if (Z.debug == 2) { drawTileNameOnTile(container, tile.name, x, y, tierScale); }
	}

	function drawTileInHTML (container, tile, x, y, scale) {
		if (!tile.elmt) { 
			// Simple conditional above is OK because tile.elmt will not be numeric and thus not 0.
			tile.elmt = Z.Utils.createContainerElement('img');
			tile.elmt.onmousedown = Z.Utils.preventDefault; // Disable individual tile mouse-drag.
			Z.Utils.addEventListener(tile.elmt, 'contextmenu', Z.Utils.preventDefault);
			tile.elmt.src = tile.url;
			tile.style = tile.elmt.style;
			tile.style.position = 'absolute';
			Z.Utils.renderQuality (tile, Z.renderQuality);
			if (Z.cssTransformsSupported) { tile.style[Z.cssTransformProperty + 'Origin'] = '0px 0px'; }
		}
		if (tile.elmt.parentNode != container) { container.appendChild(tile.elmt); }
		var tS = tile.style;

		// Speed redraw by hiding tile to avoid drawing on each change (width, height, left, top).
		tS.display = 'none';

		if (Z.cssTransformsSupported) {
			// Backfill in non-IE browsers.
			tS[Z.cssTransformProperty] = ['matrix(', (tile.image.width / tile.elmt.width * scale).toFixed(8), ',0,0,', (tile.image.height / tile.elmt.height * scale).toFixed(8), ',', (x * scale).toFixed(8), Z.cssTransformNoUnits ? ',' : 'px,', (y * scale).toFixed(8), Z.cssTransformNoUnits ? ')' : 'px)'].join('');
		} else {
			// Backfill and frontfill in IE without canvas support.
			tS.width = (tile.image.width * scale) + 'px';
			tS.height = (tile.image.height * scale) + 'px';
			tS.left = (x * scale) + 'px';
			tS.top = (y * scale) + 'px';
		}

		// Unhide tile.
		tS.display = 'inline-block';

		// Set alpha to fade-in tile if supported.
		Z.Utils.setOpacity(tile, tile.alpha);

		// Debug option: Uncomment next two lines to display tile borders.
		//tile.elmt.style.borderStyle = 'solid';
		//tile.elmt.style.borderWidth = '1px';

		// If in debug mode 2, add tile name to tile.
		if (Z.debug == 2) { drawTileNameOnTile(container, tile.name, x, y, scale); }
	}

	function drawTileNameOnTile (container, tileName, x, y, scale) {
		if (Z.useCanvas) {
			drawTileNameOnCanvas (container, tileName, x, y, scale);
		} else {
			drawTileNameInHTML(container, tileName, x, y, scale);
		}
	}

	function drawTileNameOnCanvas (container, tileName, x, y, scale) {
		// Get font size constraints.
		var defaultFontSize = parseInt(Z.Utils.getResource('DEFAULT_HOTSPOTCAPTIONFONTSIZE'), 10);
		var minFontSize = parseInt(Z.Utils.getResource('DEFAULT_MINHOTSPOTCAPTIONFONTSIZE'), 10);
		var maxFontSize = parseInt(Z.Utils.getResource('DEFAULT_MAXHOTSPOTCAPTIONFONTSIZE'), 10);
		var scaledFontSize = Math.round(defaultFontSize * scale);
		var constrainedFontSize = 2 * (( scaledFontSize < minFontSize) ? minFontSize : (( scaledFontSize > maxFontSize) ? maxFontSize : scaledFontSize));

		// Get canvas context and set font style.
		var vpdCtx = container.getContext('2d');
		vpdCtx.font = constrainedFontSize + 'px verdana';
		vpdCtx.textAlign = 'left';
		vpdCtx.textBaseline = 'top';

		// Calculate tile x and y offsets to center on scaled tile.
		var tileNameOffsetW = TILE_WIDTH * scale / 2;
		var tileNameOffsetH = TILE_HEIGHT * scale / 2;

		// Draw tile name white.
		vpdCtx.fillStyle = '#FFFFFF';
		vpdCtx.fillText(tileName, x + tileNameOffsetW, y + tileNameOffsetH);

		// Draw tile name black.
		vpdCtx.fillStyle = '#000000';
		vpdCtx.fillText(tileName, x + tileNameOffsetW + 1, y + tileNameOffsetH + 1);
	}

	function drawTileNameInHTML (container, tileName, x, y, scale) {
		// Get font size constraints.
		var defaultFontSize = parseInt(Z.Utils.getResource('DEFAULT_HOTSPOTCAPTIONFONTSIZE'), 10);
		var minFontSize = parseInt(Z.Utils.getResource('DEFAULT_MINHOTSPOTCAPTIONFONTSIZE'), 10);
		var maxFontSize = parseInt(Z.Utils.getResource('DEFAULT_MAXHOTSPOTCAPTIONFONTSIZE'), 10);
		var scaledFontSize = Math.round(defaultFontSize * scale);
		var constrainedFontSize = 2 * (( scaledFontSize < minFontSize) ? minFontSize : (( scaledFontSize > maxFontSize) ? maxFontSize : scaledFontSize));

		// Create caption text node and container, and set font style.
		var padding = parseInt(Z.Utils.getResource('DEFAULT_HOTSPOTCAPTIONPADDING'), 10) * scale;

		// Draw tile name white.
		var tileNameTextBox = Z.Utils.createContainerElement('div', 'tileNameTextBox', 'inline-block', 'absolute', 'hidden', 'auto', 'auto', '1px', '1px', 'none', '0px', 'transparent none', '0px', padding + 'px', 'nowrap');
		var tileNameTextNode = document.createTextNode(tileName);
		tileNameTextBox.appendChild(tileNameTextNode);
		container.appendChild(tileNameTextBox);
		Z.Utils.setTextNodeStyle(tileNameTextNode, 'white', 'verdana', constrainedFontSize + 'px', 'none', 'normal', 'normal', 'normal', 'normal', '1em', 'center', 'none');

		// Draw tile name black.
		var tileNameTextBox2 = Z.Utils.createContainerElement('div', 'tileNameTextBox2', 'inline-block', 'absolute', 'hidden', 'auto', 'auto', '1px', '1px', 'none', '0px', 'transparent none', '0px', padding + 'px', 'nowrap');
		var tileNameTextNode2 = document.createTextNode(tileName);
		tileNameTextBox2.appendChild(tileNameTextNode2);
		container.appendChild(tileNameTextBox2);
		Z.Utils.setTextNodeStyle(tileNameTextNode2, 'black', 'verdana', constrainedFontSize + 'px', 'none', 'normal', 'normal', 'normal', 'normal', '1em', 'center', 'none');

		// Position tile name. Must occur after added to display because text container width setting is 'auto'.
		var padding = parseFloat(tileNameTextBox.style.padding);
		var computedW = parseFloat(Z.Utils.getElementStyleProperty(tileNameTextBox, 'width'));
		if (isNaN(computedW)) {
			// Workaround for IE failure to report text container element width if setting is 'auto'.
			var font2Pixels = parseFloat(Z.Utils.getResource('DEFAULT_FONTTOPIXELSCONVERSIONFACTOR'));
			var ratioPixs2Chars = parseFloat(tileNameTextBox.style.fontSize) / font2Pixels;
			computedW = Math.round(parseFloat(tileName.length * ratioPixs2Chars));
		}
		var tileScaledW = TILE_WIDTH * scale / 2;
		var tileScaledH = TILE_HEIGHT * scale / 2;
		tileNameTextBox.style.left = ((x * scale) + ((tileScaledW - (computedW / 2)) - padding)) + 'px';
		tileNameTextBox.style.top = ((y * scale) + tileScaledH) + 'px';
		tileNameTextBox2.style.left = (1 + (x * scale) + ((tileScaledW - (computedW / 2)) - padding)) + 'px';
		tileNameTextBox2.style.top = (1 + (y * scale) + tileScaledH) + 'px';

		// Prevent text selection and context menu.
		Z.Utils.addEventListener(tileNameTextBox, 'contextmenu', Z.Utils.preventDefault);
		Z.Utils.disableTextInteraction(tileNameTextNode);
		Z.Utils.addEventListener(tileNameTextBox2, 'contextmenu', Z.Utils.preventDefault);
		Z.Utils.disableTextInteraction(tileNameTextNode2);
	}



	//::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::
	//::::::::::::::::::: CALCULATION & CONVERSION FUNCTIONS ::::::::::::::::::::::::::::::::
	//::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::

	this.getClickCoordsAtZoom = function (event, zoom) {
		var imageClickPt = this.getClickCoordsInImage(event, zoom);
		var imageX = imageClickPt.x;
		var imageY = imageClickPt.y;
		var zoomedX = imageX * zoom;
		var zoomedY = imageY * zoom;
		var zoomedClickPt = new Z.Utils.Point(zoomedX, zoomedY);
		return zoomedClickPt;
	}
	
	this.getClickCoordsInImage = function (event, zoom, mPt) {
		var event = Z.Utils.event(event);
		var imageClickPt = null;
		if (event) {				
			var eventType = event.type;
			if (typeof mPt === 'undefined' || mPt === null) {
				if (eventType == 'touchstart' || eventType == 'touchend' || eventType == 'touchcancel') {
					touch = Z.Utils.getFirstTouch(event);
					if (typeof touch !== 'undefined') {
						target = touch.target;
						mPt = new Z.Utils.Point(touch.pageX, touch.pageY);
					}
				} else {
					target = Z.Utils.target(event);
					relatedTarget = Z.Utils.relatedTarget(event);
					mPt = Z.Utils.getMousePosition(event);
				}
			}
			if (typeof mPt !== 'undefined' && mPt !== null) {
				var viewportClickPt = convertPageCoordsToViewportCoords(mPt.x, mPt.y);
				imageClickPt = convertViewportCoordsToImageCoords(viewportClickPt.x, viewportClickPt.y, zoom);
			}
		}
		return imageClickPt;
	}
	
	function getClickZoomCoords3DAsString (event) {
		var event = Z.Utils.event(event);
		var zVal = self.getZoom();
		var clickPt = self.getClickCoordsInImage(event, zVal);
		var xString = Math.round(clickPt.x).toString();
		var yString = Math.round(clickPt.y).toString();
		var zString = (Math.round(zVal * 1000)/10).toString();
		var coordsString = 'X="' + xString + '"   Y="' + yString + '"   ZOOM="' + zString + '"';
		
		// Alternative display, simpler view, less useful for pasting to hotspots XML file.
		// var coordsString = 'X ' + xString + ' px   Y ' + yString + ' px   Z ' + zString + ' %';
		
		return coordsString;
	}

	this.getClickZoomCoords3D = function (event, pageClickPt, tCurrent, tScale, dblClick) {
		// Set condition for zooming in or out by more than one tier.
		var tierSkipThreshold = parseFloat(Z.Utils.getResource('DEFAULT_CLICKZOOMTIERSKIPTHRESHOLD'));
		
		// Calculate image coordinates of click and set default target zoom.
		var viewportClickPt = convertPageCoordsToViewportCoords(pageClickPt.x, pageClickPt.y);
		var imageClickPt = convertViewportCoordsToImageCoords(viewportClickPt.x, viewportClickPt.y, Z.imageZ);
		var targetZ = convertTierScaleToZoom(tCurrent, tScale);
		var isAltKey = event.altKey;

 		// Calculate target zoom for next or prior tier. If very close to next tier, skip over it.
		if (!dblClick) {
			// Zoom-in.
			if (!isAltKey) {
				// Zoom-in to next tier.
				if (tScale < 1 - tierSkipThreshold) {
					targetZ = convertTierScaleToZoom(tCurrent, 1);
				} else if (tCurrent < tierCount - 1) {
					targetZ = convertTierScaleToZoom(tCurrent + 1, 1);
				}
				
			} else { 
				// Zoom-in to 100%.
				targetZ = 1;
			}
			
		} else{
			// Zoom-out.
			if (!isAltKey) {
				// Scale current tier to zoom-to-fit, or current tier to 1, or prior tier to 1.
				var zFitScale = convertZoomToTierScale(tCurrent, Z.fitZ); 
				
				if (tScale - zFitScale < tierSkipThreshold) {
					targetZ = Z.fitZ;
				} else if (tScale > 1 + tierSkipThreshold) {
					targetZ = convertTierScaleToZoom(tCurrent, 1);
				} else if (tCurrent > 0) {
					targetZ = convertTierScaleToZoom(tCurrent - 1, 1);
				} else if (Z.tileSource == 'unconverted') {
					targetZ = Z.fitZ;
				}
				
			} else { 
				// Zoom-out to zoom-to-fit.
				targetZ = Z.fitZ;			
			}
		}

		return new Z.Utils.Point3D(imageClickPt.x, imageClickPt.y, targetZ);
	}

	this.calculateCurrentCenterCoordinates = function (viewportPt, z, r) {
		if (typeof viewportPt === 'undefined' || viewportPt === null) {
			var viewportPt = new Z.Utils.Point(parseFloat(cS.left), parseFloat(cS.top));
		}
		if (typeof r === 'undefined' || r === null) { r = Z.imageR; }
		if (r < 0) { r += 360; } // Ensure positive values.
		if (typeof z === 'undefined' || z === null) { z = self.getZoom(); }

		// Calculate change in position.
		var deltaX = viewportPt.x - displayL;
		var deltaY = viewportPt.y - displayT;
		var deltaScaledX = deltaX / z;
		var deltaScaledY = deltaY / z;

		// Adjust for rotation.
		var currentX, currentY;
		switch(r) {
			case 0:
				currentX = Z.imageX - deltaScaledX;
				currentY = Z.imageY - deltaScaledY;
				break;
			case 90:
				currentX = Z.imageX - deltaScaledY;
				currentY = Z.imageY + deltaScaledX;
				break;
			case 180:
				currentX = Z.imageX + deltaScaledX;
				currentY = Z.imageY + deltaScaledY;
				break;
			case 270:
				currentX = Z.imageX + deltaScaledY;
				currentY = Z.imageY - deltaScaledX;
				break;
		}
		return new Z.Utils.Point(currentX, currentY);
	}

	// Get bounding box in image tiles for current view. Use tier parameter to current or backfill tier. 
	// Use viewportOnly parameter to narrow bounds to view area, excluding pan buffer.
	this.getViewportDisplayBoundingBoxInTiles = function (tier, viewportOnly) {
		if (typeof tier === 'undefined' || tier === null) { tier = tierCurrent; }
		if (typeof viewportOnly === 'undefined' || viewportOnly === null) { viewportOnly = false; }
		return new BoundingBoxInTiles(self.getViewportDisplayBoundingBoxInPixels(viewportOnly), tier);
	}

	// Get bounding box coordinates in image pixels for current view plus pan buffer border area.
	this.getViewportDisplayBoundingBoxInPixels = function (viewportOnly) {
		
		// Allow for pan in progress via movement of display.
		var canvasOffsetL = parseFloat(cS.left) - displayL;
		var canvasOffsetT = parseFloat(cS.top) - displayT;

		// Allow for CSS scaling calculations.
		if (Z.useCanvas) {
			var cssScale = parseFloat(cS.width) / cD.width;
			canvasOffsetL /= cssScale;
			canvasOffsetT /= cssScale;
		}

		// Convert offset pixels of any pan in progress to image pixels.
		var currentZ = self.getZoom();
		if (canvasOffsetL != 0) { canvasOffsetL /= currentZ; }
		if (canvasOffsetT != 0) { canvasOffsetT /= currentZ; }

		var ctrX = Z.imageX - canvasOffsetL;
		var ctrY = Z.imageY - canvasOffsetT;
		
		var ctrToLeft, ctrToTop, ctrToRight, ctrToBottom;
		if (viewportOnly) {
			ctrToLeft = -(viewW / 2);
			ctrToTop = viewW / 2;
			ctrToRight = -(viewH / 2);
			ctrToBottom = (viewH / 2);
		} else {
			ctrToLeft = -(displayW / 2);
			ctrToTop = displayW / 2;
			ctrToRight = -(displayH / 2);
			ctrToBottom = displayH / 2;
		}
		
		return new BoundingBoxInPixels(ctrX, ctrY, ctrToLeft, ctrToTop, ctrToRight, ctrToBottom, currentZ);
	}

	function BoundingBoxInTiles (pixelsBoundingBox, tier) {
		// Caculate edges of view in image tiles of the current tier.
		var tierCurrentZoomUnscaled = convertTierScaleToZoom(tier, 1);
		var viewTileL = Math.floor(pixelsBoundingBox.l * tierCurrentZoomUnscaled / TILE_WIDTH);
		var viewTileR = Math.floor(pixelsBoundingBox.r * tierCurrentZoomUnscaled / TILE_WIDTH);
		var viewTileT = Math.floor(pixelsBoundingBox.t * tierCurrentZoomUnscaled / TILE_HEIGHT);
		var viewTileB = Math.floor(pixelsBoundingBox.b * tierCurrentZoomUnscaled / TILE_HEIGHT);

		// Constrain edge tile values to existing columns and rows.
		if (viewTileL < 0) { viewTileL = 0; }
		if (viewTileR > tierWInTiles[tier] - 1) { viewTileR = tierWInTiles[tier] - 1; }
		if (viewTileT < 0) { viewTileT = 0; }
		if (viewTileB > tierHInTiles[tier] - 1) { viewTileB = tierHInTiles[tier] - 1; }

		this.l = viewTileL;
		this.r = viewTileR;
		this.t = viewTileT;
		this.b = viewTileB;
	}

	function BoundingBoxInPixels (x, y, vpPixelsLeft, vpPixelsRight, vpPixelsTop, vpPixelsBottom, zoom) {
		// Convert any bounding box from viewport pixels to image pixels.
		this.l = x + vpPixelsLeft / zoom;
		this.r = x + vpPixelsRight / zoom;
		this.t = y + vpPixelsTop / zoom;
		this.b = y + vpPixelsBottom / zoom;
	}

	// Returns coordinates within visible display area.
	function convertPageCoordsToViewportCoords (pagePixelX, pagePixelY) {
		var vpPixelX = pagePixelX - Z.Utils.getElementPosition(Z.ViewerDisplay).x;
		var vpPixelY = pagePixelY - Z.Utils.getElementPosition(Z.ViewerDisplay).y;
		return new Z.Utils.Point(vpPixelX, vpPixelY);
	}

	// Returns coordinates within viewport display object including visible display area and out of view pan buffer area. 
	function convertPageCoordsToViewportDisplayCoords (pagePixelX, pagePixelY) {
		var viewportClickPt = convertPageCoordsToViewportCoords(pagePixelX, pagePixelY);
		var psPt = Z.Utils.getPageScroll();
		var vpdPixelX = viewportClickPt.x - displayL + psPt.x;
		var vpdPixelY = viewportClickPt.y - displayT + psPt.y;		
		return new Z.Utils.Point(vpdPixelX, vpdPixelY);
	}

	function convertViewerCoordsToImageCoords (displayX, displayY, z, r) {
		if (typeof z === 'undefined' || z === null) { z = Z.imageZ; }
		if (typeof r === 'undefined' || r === null) { r = Z.imageR; }
		if (r < 0) { r += 360; } // Ensure positive values.

		// Adjust for display offset relative to view area.
		var displayDeltaX = displayL - displayX;
		var displayDeltaY = displayT - displayY;

		// Scale delta to convert from viewport to image coordinates.
		var imageDeltaX = displayDeltaX / z;
		var imageDeltaY = displayDeltaY / z;

		// Combine with current image position to get image coordinates.
		var imageX, imageY;
		switch(r) {
			case 0:
				imageX = Z.imageX + imageDeltaX;
				imageY = Z.imageY + imageDeltaY;
				break;
			case 90:
				imageX = Z.imageX + imageDeltaY;
				imageY = Z.imageY - imageDeltaX;
				break;
			case 180:
				imageX = Z.imageX - imageDeltaX;
				imageY = Z.imageY - imageDeltaY;
				break;
			case 270:
				imageX = Z.imageX - imageDeltaY;
				imageY = Z.imageY + imageDeltaX;
				break;
		}
		return new Z.Utils.Point(imageX, imageY);
	}

	function convertImageCoordsToViewerCoords (imageX, imageY, z, r) {
		if (typeof z === 'undefined' || z === null) { z = Z.imageZ; }
		if (typeof r === 'undefined' || r === null) { r = Z.imageR; }
		if (r < 0) { r += 360; } // Ensure positive values.

		// Remove current image position to get viewer coordinates.
		var imageDeltaX, imageDeltaY;
		switch(r) {
			case 0:
				imageDeltaX = imageX - Z.imageX;
				imageDeltaY = imageY - Z.imageY;
				break;
			case 90:
				imageDeltaX = Z.imageY - imageY;
				imageDeltaY = imageX - Z.imageX;
				break;
			case 180:
				imageDeltaX = Z.imageX - imageX;
				imageDeltaY = Z.imageY - imageY;
				break;
			case 270:
				imageDeltaX = imageY - Z.imageY;
				imageDeltaY = Z.imageX - imageX;
				break;
		}

		// Scale delta to convert from viewport to image coordinates.
		var displayDeltaX = imageDeltaX * z;
		var displayDeltaY = imageDeltaY * z;

		// Adjust for display offset relative to view area.
		var displayX = displayL - displayDeltaX;
		var displayY = displayT - displayDeltaY;

		return new Z.Utils.Point(displayX, displayY);
	}

	function convertViewportCoordsToImageCoords (viewportX, viewportY, z, r) {
		if (typeof z === 'undefined' || z === null) { z = Z.imageZ; }
		if (typeof r === 'undefined' || r === null) { r = Z.imageR; }
		if (r < 0) { r += 360; } // Ensure positive values.

		// Calculate current viewport center.
		var viewportCtrX = parseFloat(cS.left) + displayCtrX;
		var viewportCtrY = parseFloat(cS.top) + displayCtrY;

		// Calculate delta of input values from viewport center.
		var viewportDeltaX = viewportX - viewportCtrX;
		var viewportDeltaY = viewportY - viewportCtrY;

		// Correct coordinates for freehand drawing and polygon editing.
		if (Z.imageR != 0) {
			viewportClickPt = Z.Utils.rotatePoint(viewportDeltaX, viewportDeltaY, r);
			viewportDeltaX = viewportClickPt.x;
			viewportDeltaY = viewportClickPt.y;
		}

		// Scale delta to convert from viewport to image coordinates.
		var imageDeltaX = viewportDeltaX / z;
		var imageDeltaY = viewportDeltaY / z;

		// Combine with current image position to get image coordinates.
		var imageX = Z.imageX + imageDeltaX;
		var imageY = Z.imageY + imageDeltaY;

		return new Z.Utils.Point(imageX, imageY);
	}

	function convertImageCoordsToViewportCoords (imageX, imageY, z, r) {
		if (typeof z === 'undefined' || z === null) { z = Z.imageZ; }
		if (typeof r === 'undefined' || r === null) { r = Z.imageR; }
		if (r < 0) { r += 360; } // Ensure positive values.

		// Calculate delta of input values from current image position.
		var imageDeltaX = imageX - Z.imageX;
		var imageDeltaY = imageY - Z.imageY;

		// Scale delta to convert from image to viewport coordinates.
		var viewportDeltaX = imageDeltaX * z;
		var viewportDeltaY = imageDeltaY * z;

		// Correct coordinates for click-zoom, alt-click-zoom, and click-pan.
		if (Z.imageR != 0) {
			viewportClickPt = Z.Utils.rotatePoint(viewportDeltaX, viewportDeltaY, -r);
			viewportDeltaX = viewportClickPt.x;
			viewportDeltaY = viewportClickPt.y;
		}
		
		// Calculate current viewport center.
		var viewportCtrX = parseFloat(cS.left) + displayCtrX;
		var viewportCtrY = parseFloat(cS.top) + displayCtrY;
		
		// Convert display current to viewport target.
		var viewportX = viewportDeltaX + viewportCtrX;
		var viewportY = viewportDeltaY + viewportCtrY;

		return new Z.Utils.Point(viewportX, viewportY);
	}

	function convertImageCoordsToViewportEdgeCoords (imageX, imageY, z, r) {
		if (typeof z === 'undefined' || z === null) { z = Z.imageZ; }
		if (typeof r === 'undefined' || r === null) { r = Z.imageR; }
		if (r < 0) { r += 360; } // Ensure positive values.

		// Calculate delta of input values from current image position.
		var imageDeltaX = Z.imageX - imageX;
		var imageDeltaY = Z.imageY - imageY;

		// Scale delta to convert from image to viewport coordinates.
		var viewportDeltaX = imageDeltaX * z;
		var viewportDeltaY = imageDeltaY * z;

		// Correct coordinates for click-zoom, alt-click-zoom, and click-pan.
		if (Z.imageR != 0) {
			viewportClickPt = Z.Utils.rotatePoint(viewportDeltaX, viewportDeltaY, -r);
			viewportDeltaX = viewportClickPt.x;
			viewportDeltaY = viewportClickPt.y;
		}

		// Convert display current to viewport target.
		var displayTargetL = displayL + viewportDeltaX;
		var displayTargetT = displayT + viewportDeltaY;

		return new Z.Utils.Point(displayTargetL, displayTargetT);
	}
	
	this.calculateZoomToFit = function (targetR) {
		// Determine zoom to fit the entire image in the viewport. This may leave empty space on the sides or on the top and bottom, depending on the aspect ratios of the image and the viewport.
		
		// Alternative creates space around image for annotating.
		//var marginPercent = 1.2;
		//return ((Z.imageW * marginPercent) / (Z.imageH * marginPercent) > viewW / viewH) ? viewW / (Z.imageW * marginPercent) : viewH / (Z.imageH * marginPercent);

		var zoomToFitValue = (Z.imageW / Z.imageH > viewW / viewH) ? viewW / Z.imageW : viewH / Z.imageH;
		if (targetR == 90 || targetR == 270) {
			zoomToFitValue = (Z.imageW / Z.imageH > viewW / viewH) ? viewW / Z.imageH : viewH / Z.imageW;
		}
			
		return zoomToFitValue;
	}
	
	this.calculateZoomToFill = function (targetR) {
		// Determine zoom to fill the viewport and leave no empty space on the sides or top and bottom, regardless of the aspect ratios of the image and the viewport.
		
		var zoomToFillValue = (Z.imageW / Z.imageH > viewW / viewH) ? viewH / Z.imageH : viewW / Z.imageW;
		if (targetR == 90 || targetR == 270) {
			zoomToFillValue = (Z.imageW / Z.imageH > viewW / viewH) ? viewH / Z.imageW : viewW / Z.imageH;
		}
			
		return zoomToFillValue;
	}
	
	this.calculateZoomForResize = function (currZ, priorViewW, priorViewH, newViewW, newViewH) {
		var newZ = currZ;		
		var currImgW = Z.imageW * currZ;
		var currImgH = Z.imageH * currZ;
		var deltaViewW = newViewW / priorViewW;
		var deltaViewH = newViewH / priorViewH;
		if (currImgW < newViewW && currImgH < newViewH) {
			newZ = currZ;
		} else if (currImgW == newViewW && currImgH < newViewH) {
			newZ = -1;
		} else if (currImgW < newViewW && currImgH == newViewH) {
			newZ = -1;
		} else if (currImgW > newViewW && currImgH <= newViewH) {
			newZ = currZ * deltaViewW;
		} else if (currImgW <= newViewW && currImgH > newViewH) {
			newZ = currZ * deltaViewH;
		} else if (currImgW > newViewW && currImgH > newViewH) {
			var deltaView = 1;
			if (deltaViewW >= 1 && deltaViewH >= 1) {
				deltaView = (deltaViewW > deltaViewH) ? deltaViewW : deltaViewH;
			} else if (deltaViewW <= 1 && deltaViewH <= 1) {
				deltaView = (deltaViewW < deltaViewH) ? deltaViewW : deltaViewH;
			}
			newZ = currZ * deltaView;
		}
		
		if (newZ < Z.minZ) { newZ = Z.minZ; }
		if (newZ > Z.maxZ) { newZ = Z.maxZ; }
		
		// Debug option: console.log(priorViewW, newViewW, priorViewH, newViewH, deltaZ, z, newZ);
		
		return newZ;
	}
	
	this.convertTierScaleToZoom = function (tier, scale) {
		var zoom = convertTierScaleToZoom(tier, scale);
		return zoom;
	}

	function convertTierScaleToZoom (tier, scale) {
		var zoom = scale * (tierWs[tier] / Z.imageW);
		return zoom;
	}

	function convertZoomToTierScale (tier, zoom) {
		var scale = zoom / (tierWs[tier] / Z.imageW);
		return scale;
	}



	//::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::
	//:::::::::::::::::::::::::::::: CONSTRAIN & SYNC FUNCTIONS :::::::::::::::::::::::::::
	//::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::

	function constrainPan (x, y, newZ, newR, input) {
		// Limit target pan coordinates (view, setView, zoomAndPanToView) or new
		// display container position (mouse, touch, navigator, key, slider-zoom).

		if (Z.constrainPan) {
			newR = Math.round(newR); // Ensure comparisons below are exact. 
			var targetL = x, targetT = y;

			// Validate input values.
			var z = (typeof newZ !== 'undefined' && newZ !== null) ? newZ : Z.imageZ;
			var r = (typeof newR !== 'undefined' && newR !== null) ? newR : Z.imageR;
			if (r < 0) { r += 360; } // Ensure positive values.
			var offsetPt = Z.Utils.getDisplayPositionRotated(cS, r);
			var iW = Z.imageW;
			var iH = Z.imageH;
			var vW = viewW;
			var vH = viewH;
			var iWz = Math.round(iW * z);
			var iHz = Math.round(iH * z);

			// Convert viewer offsets to image center of view pixels.
			if (input == 'container') {
				var imagePt = convertViewerCoordsToImageCoords(x, y, z, r);
				x = imagePt.x;
				y = imagePt.y;
			}
			
			// Allow image to be panned until trailing edge centers in display area.
			var panFitH = (Z.constrainPanStrict) ? 0 : vW / 2 / z;
			var panFitV = (Z.constrainPanStrict) ? 0 : vH / 2 / z;

			// Calculate center point pan boundaries.
			var boxL = (vW + offsetPt.y) / 2 / z - panFitH;
			var boxR = iW - (vW + offsetPt.y) / 2 / z + panFitH;
			var boxT = (vH + offsetPt.x) / 2 / z - panFitV;
			var boxB = iH - (vH + offsetPt.x) / 2 / z + panFitV;

			// Determine if zoomed in or out.
			var zoomedInHorizontal = (((r == 0 || r == 180) && (iWz > vW)) || ((r == 90 || r == 270) && (iWz > vH)));
			var zoomedInVertical = (((r == 0 || r == 180) && (iHz > vH)) || ((r == 90 || r == 270) && (iHz > vW)));

			// Default pan constraint limits trailing edge of image to center of display. Strict constraint limits trailing 
			// edge of image to far edge of display if zoomed in, and centers image in display if zoomed out.
			if (zoomedInHorizontal || !Z.constrainPanStrict) {
				x = (x <= boxL) ? boxL : (x >= boxR) ? boxR : x;
			} else {
				x = iW / 2;
			}
			if (zoomedInVertical || !Z.constrainPanStrict) {
				y = (y <= boxT) ? boxT : (y >= boxB) ? boxB : y;
			} else {
				y = iH / 2;
			}

			// Convert from image center to display upper left coordinates.
			if (input == 'container') {
				var viewerPt = convertImageCoordsToViewerCoords(x, y, z, r);
				x = viewerPt.x;
				y = viewerPt.y;
			}
			
			// Validate pan constraint callback.
			if (x != targetL || y != targetT) { Z.Utils.validateCallback('panConstrained'); }
		}		

		return new Z.Utils.Point(x, y);
	}

	function constrainZoom (z) {
		// Ensure image is not zoomed beyond specified min and max values.		
		if (z > Z.maxZ) {
			z = Z.maxZ;
			Z.Utils.validateCallback('zoomConstrainedMax');
		} else if (z < Z.minZ) {
			z = Z.minZ;
			Z.Utils.validateCallback('zoomConstrainedMin');
		}				
		return z;
	}

	function constrainRotation (targetR) {
		// Constrain to integer values in increments of 90 or -90 degrees.
		var newR = Math.round(Math.abs(targetR) / 90) * 90 * Z.Utils.getSign(targetR);

		// Constrain to 0 to 359 range. Reset display at constraints to avoid backspin.
		if (newR <= -360) {
			newR += 360;
		} else if (newR >= 360) {
			newR -= 360;
		}

		return newR;
	}

	// Set toolbar slider button position.
	function syncToolbarSliderToViewport () {
		if (Z.ToolbarDisplay && Z.Toolbar.getInitialized()) {
			var currentZ = self.getZoom();
			Z.Toolbar.syncSliderToViewportZoom(currentZ);
		}
		Z.Utils.validateCallback('viewZoomingGetCurrentZoom');
	}

	function syncNavigatorToViewport () {
		// Set navigator rectangle size and position.
		if (Z.Navigator && Z.Navigator.getInitialized()) {
			Z.Navigator.syncToViewport();
		}
	}

	function syncRulerToViewport (reset) {
		// Set ruler scale bar text.
		if (Z.Ruler && Z.Ruler.getInitialized()) {
			Z.Ruler.syncToViewport(reset);
		}
	}

	this.syncViewportToNavigator = function (newVPImgCtrPt) {
		var r = Z.imageR;
		if (r < 0) { r += 360; } // Ensure positive values.
		var constrainedPt = constrainPan(newVPImgCtrPt.x, newVPImgCtrPt.y, Z.imageZ, r, 'image');
		var zX = Z.imageX;
		var zY = Z.imageY;
		var nX = constrainedPt.x;
		var nY = constrainedPt.y;

		// Allow for rotation.
		var rdX = dX = zX - nX;
		var rdY = dY = zY - nY;
		if (r != 0) {
			if (r == 90) {
				rdX = -dY;
				rdY = dX;
			} else if (r == 180) {
				rdX = -dX;
				rdY = -dY;
			} else if (r == 270) {
				rdX = dY;
				rdY = -dX;
			}
		}

		// Allow for prior display scaling and default offset.
		var deltaX = rdX * Z.imageZ;
		var deltaY = rdY * Z.imageZ;
		var newX = deltaX + displayL;
		var newY = deltaY + displayT;

		// Sync viewport display to navigator rectangle.
		cS.left = newX + 'px';
		cS.top = newY + 'px';
		
		if (oD && tierBackfillDynamic && (Z.mobileDevice || (Math.abs(deltaX) > (viewW / 2) || Math.abs(deltaY) > (viewH / 2)))) {
			redisplayCachedTiles(oD, tierBackfillOversize, tilesBackfillCached, 'simple', false, 'Updating backfill oversize display');
		}
	}
	
	
	
	//::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::
	//:::::::::: VALIDATION FUNCTIONS CACHE, STATUS, VIEW, AND PROGRESS ::::::::::::::
	//::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::
	
	// Verify cached tiles less than maximum permitted by resourced constant. Approach assumes cache arrays are filled in sync and never sorted so orders match.
	function validateCache () {
		while (tilesCachedNames.length > TILES_CACHE_MAX && tilesCached.length > TILES_CACHE_MAX) {
			tilesCachedNames = Z.Utils.arraySplice(tilesCachedNames, 0, 1);
			tilesCached = Z.Utils.arraySplice(tilesCached, 0, 1);
		}
	}
	
	// Tiles and tile names added to end of cache arrays or moved to end if already included.
	function cacheTile (tile) {
		if (TILES_CACHE_MAX > 0) {
			var index = Z.Utils.arrayIndexOf(tilesCachedNames, tile.name);
			if (index != -1) {
				tilesCachedNames = Z.Utils.arraySplice(tilesCachedNames, index, 1);
				tilesCached = Z.Utils.arraySplice(tilesCached, index, 1);
			}
			tilesCachedNames[tilesCachedNames.length] = tile.name;
			tilesCached[tilesCached.length] = tile;
		}		
		// Debug option: console.log(tilesCached.length + '  ' + tilesCached[tilesCached.length - 1].name + '  ' + tilesCachedNames.length + '  ' + tilesCachedNames[tilesCachedNames.length - 1]);
	}
	
	this.getStatus = function (vState) {
		var index = Z.Utils.arrayIndexOfObjectValue(viewportStatus, 'state', vState);
		var statusVal = (index == -1) ? false : viewportStatus[index].status;
		return statusVal;
	}
	
	this.setStatus = function (vState, vStatus) {
		var notYetSet = false;
		var index = Z.Utils.arrayIndexOfObjectValue(viewportStatus, 'state', vState);
		if (index == -1) {
			notYetSet = vStatus;
			viewportStatus[viewportStatus.length] = { state:vState, status:vStatus};
		} else {
			if (!viewportStatus[index].status && vStatus) { notYetSet = true; }
			viewportStatus[index].status = vStatus;
		}
		if (notYetSet) {
			Z.Utils.validateCallback(vState + 'Viewport');
			Z.Viewer.validateViewerStatus(vState);
		}
	}
	
	// Display debug information if parameter set. DEV NOTE: modification in progress to use viewportStatus values.
	this.traceDebugValues = function (step, infoTxt, infoNum, dataArr) {
		var infoNumber = (typeof infoNum !== 'undefined' && infoNum !== null) ? infoNum : null;
		var infoText = (infoTxt !== null) ? infoTxt : '';

		// Calculate tracking values.
		switch (step) {
			case 'tilesToDisplay' :
				tilesToDisplay = infoNumber;
				tilesInCache = 0;
				tilesRequested = 0;
				tilesLoaded = 0;
				tilesDisplayed = 0;
				tilesWaiting = infoNumber;
				tilesTimeElapsed = 0;
				tilesTimeStart = new Date().getTime();
				tileLoadsPerSecond = 0;
				window.clearTimeout(validateViewTimer);
				validateViewTimer = null;
				validateViewTimer = window.setTimeout( validateViewTimerHandler, validateViewDelay);
				break;
			case 'tilesInCache' :
				tilesInCache = infoNumber;
				break;
			case 'loadTile-image-display' :
				tilesRequested += 1;
				break;
			case 'onTileLoad' :
				tilesLoaded += 1;
				var timeNow = new Date().getTime();
				tilesTimeElapsed = (timeNow - infoNumber) / 1000; // Seconds.
				tileLoadsPerSecond = tilesLoaded / tilesTimeElapsed;
				break;
			case 'displayTile' :
				// Increment displayed tiles counter and decrement waiting tiles counter and
				// ensure no duplicate counting for redisplays by removing from display list.
				var nameIndex = Z.Utils.arrayIndexOf(tilesDisplayingNames, infoText);
				if (nameIndex != -1) {
					tilesDisplayingNames.splice(nameIndex, 1);
					tilesDisplayed += 1;
					tilesWaiting -= 1;
				}
				break;
			case 'tilesBackfillToPrecache' :
				tilesBackfillToPrecache = infoNumber;
				break;
			case 'onTileBackfillPrecache' :
				tilesBackfillToPrecacheLoaded += 1;
				break;
			case 'tilesBackfillToDisplay' :
				tilesBackfillToDisplay = infoNumber;
				tilesBackfillWaiting = infoNumber;
				break;
			case 'onTileBackfillLoad' :
				tilesBackfillLoaded += 1;
				break;
			case 'displayBackfillTile' :
				// Increment displayed tiles counter and decrement waiting tiles counter and
				// ensure no duplicate counting for redisplays by removing from display list.
				var nameIndex = Z.Utils.arrayIndexOf(tilesBackfillDisplayingNames, infoText);
				if (nameIndex != -1) {
					tilesBackfillDisplayingNames.splice(nameIndex, 1);
					tilesBackfillDisplayed += 1;
					tilesBackfillWaiting -= 1;
				}
				break;
		}
		
		// Display validation values.
		if (Z.debug == 2 || Z.debug == 3) {
			Z.Utils.traceTileStatus(tilesToDisplay, tilesInCache, tilesRequested, tilesLoaded, tilesDisplayed, tilesWaiting);
		}
		
		// Debug options: Use zDebug=2 parameter to display messages below at appropriate steps during view updating.
		if (Z.debug == 2) {
			var dataText = (typeof dataArr !== 'undefined' && dataArr !== null && dataArr.length > 0) ? dataArr.join(', ') : 'none';
			var blankLineBefore = false, blankLineAfter = true;
			var traceText = '';
			switch (step) {
				case 'updateView-noChange' :
					traceText = 'Updating view: no change of tier.';
					break;
				case 'tilesToDisplay' :
					traceText = 'Tiles to display: ' + dataText;
					break;
				case 'tilesInCache' :
					traceText = 'Tiles in cache: ' + dataText;
					break;
				case 'tilesToLoad' :
					traceText = 'Tiles to load: ' + dataText;
					break;
				case 'tilesToLoad-backfill' :
					traceText = 'Tiles to load-backfill: ' + dataText;
					break;
				case 'redisplayCachedTiles-viewportDisplay' :
					var cachedTileNames = [];
					for (var i = 0, j = dataArr.length; i < j; i++) { cachedTileNames[cachedTileNames.length] = dataArr[i].name; }
					traceText = 'Tiles from cache-' + infoText + ': ' + cachedTileNames.join(', ');
					break;
				case 'redisplayCachedTiles-backfillDisplay' :
					var cachedTileNames = [];
					for (var i = 0, j = dataArr.length; i < j; i++) { cachedTileNames[cachedTileNames.length] = dataArr[i].name; }
					traceText = 'Tiles from cache-' + infoText + ': ' + cachedTileNames.join(', ');
					break;
				case 'loadNewTiles-image-display' :
					traceText = 'Tile requests for display: ' + infoText + dataText;
					break;
				case 'loadNewTiles-image-backfill' : 
					traceText = 'Tile requests for backfill: ' + infoText + dataText;
					break;
				case 'imageRequestTimeout' :
					traceText = 'Image request for ' + infoText;
					break;
				case 'loadTile-image-display' :
					traceText = 'Tile request-display: ' + infoText;
					blankLineAfter = false;
					break;
				case 'loadTile-image-backfill' :
					traceText = 'Tile request-backfill: ' + infoText;
					blankLineAfter = false;
					break;
				case 'loadTileDelayForOffset' :
					traceText = 'Tile not yet being loaded - offset chunk loading in progress: ' + infoText;
					break;
				case 'onTileLoad' :
					traceText = 'Tiles received-display: ' + infoText;
					blankLineAfter = false;
					break;
				case 'onTileBackfillLoad' :
					traceText = 'Tiles received-backfill: ' + infoText;
					if (tilesBackfillCachedNames.length == 0) { traceText += '\n\nTile loading complete for backfill: all requested tiles received.'; }
					blankLineAfter = false;
					break;
				case 'formatTilePathZIF' :
					traceText = 'Tile request recorded for after load offset chunk: ' + infoText;
					break;
				case 'selectTilesRetryZIF' :
					traceText = 'Requesting tiles after offset chunk received: ' + dataText;
					break;
				case 'formatTilePathPFF' :
					traceText = 'Tile request recorded for after load offset chunk: ' + infoText;
					blankLineAfter = false;
					break;
				case 'selectTilesRetryPFF' :
					traceText = 'Requesting tiles after offset chunk received: ' + dataText;
					blankLineAfter = false;
					break;
				case 'loadNewTilesRetry' :
					traceText = infoText; 
					break;
				case 'displayTile' :
					traceText = 'Tile displaying: ' + infoText;
					blankLineAfter = false;
					break;
				case 'blankLine' :
					traceText = ' ';
					break;
			}
			
			if (traceText != '') { Z.Utils.trace(traceText, blankLineBefore, blankLineAfter); }
		}
	}

	function validateViewTimerHandler () {
		window.clearTimeout(validateViewTimer);
		validateViewTimer = null;
		
		var timeNow = new Date().getTime();
		tilesTimeElapsed = ((timeNow - tilesTimeStart) / 1000); // Seconds.
		
		var loadsExpected = (tileLoadsPerSecond * tilesTimeElapsed);
		var loadingDelay = (tilesWaiting && (tilesLoaded < loadsExpected));	
		var displayDelay = (tilesWaiting && (tilesLoaded >= tilesRequested));	
		
		// Display validate values.
		if (Z.debug == 2 || Z.debug == 3) {
			Z.Utils.trace('View validation-time elapsed: ' + tilesTimeElapsed);
			if (tilesWaiting > 0) {
				if (loadingDelay) { 
					Z.Utils.trace('Loading delay - re-calling updateView');
				} else if (displayDelay) { 
					Z.Utils.trace('Display delay - re-calling updateView');
				} else {
					Z.Utils.trace('Progress slow, resetting timer');
				}
			}
			Z.Utils.trace('');
			Z.traces.scrollTop = Z.traces.scrollHeight;
			Z.Utils.traceTileSpeed(tilesTimeElapsed, tileLoadsPerSecond); 
		}
		
		// Validate speed values.
		if (tilesWaiting > 0) {
			if (validateViewRetryCounter < validateViewRetryLimit) {
				if (loadingDelay || displayDelay) {
					validateViewRetryCounter += 1;
					self.updateView(true);
				} else {
					validateViewTimer = window.setTimeout( validateViewTimerHandler, validateViewDelay);			
				}
			} else {
				console.log(Z.Utils.getResource('ERROR_VALIDATEVIEW'));
				
				// Alternative implementation: display status in Viewport.
				//var messageDuration = parseInt(Z.Utils.getResource('ERROR_MESSAGEDURATION'), 10);
				//Z.Utils.showMessage(Z.Utils.getResource('ERROR_VALIDATEVIEW'), false, messageDuration, 'center');
			}
		} else {
			validateViewRetryCounter = 0;
			
			// Debug option: console.log('viewUpdateComplete - time elapsed: ' + tilesTimeElapsed);
			Z.Utils.validateCallback('viewUpdateComplete');
			Z.Utils.validateCallback('viewUpdateCompleteGetLabelIDs');
		}
	}
	
	// Update progress indicator in toolbar.
	this.updateProgress = function (total, current) {
		Z.updateViewPercent = calculateProgressPercent(total, current);
		if (Z.ToolbarDisplay && Z.Toolbar.getInitialized()) { Z.Toolbar.updateProgress(total, current); }
	}

	function calculateProgressPercent (total, current) {
		if (total == 0 && current == 0) {
			// Debug option: console.log('loadingTilesComplete');
			Z.Utils.validateCallback('loadingTilesComplete');
			Z.Utils.validateCallback('loadingTilesCompleteGetLabelIDs');
		} else {
			var percentComplete = Math.round(100 - (current / total) * 100);
			return Math.round(percentComplete / 10);
		}
	}
	
	
	
	//::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::
	//:::::::::::::::::::::::::::::::::: VIRTUAL POINTER FUNCTIONS ::::::::::::::::::::::::::
	//::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::
	
	function configureVirtualPointer () {
		virtualPointerImage = new Image();
		virtualPointerImage.url = virtualPointerPath;
		virtualPointerImage.onload = self.showVirtualPointer;
		virtualPointerImage.onerror = virtualPointerLoadingFailed;
		virtualPointerImage.src = virtualPointerPath;		
	}
	
	// DEV NOTE: If implementing drawVirtualPointerOnCanvas alternative, branch here.
	this.showVirtualPointer = function () {
		if (!virtualPointerImage){ 
			configureVirtualPointer(); 
		} else {
			var piW = virtualPointerImage.width;
			var piH = virtualPointerImage.height;
			var piL = Z.viewerW / 2 + 100;
			var piT = Z.viewerH - 200;
			drawVirtualPointerInHTML(piW, piH, piL, piT);
		}
	}
	
	this.hideVirtualPointer = function () {
		if (virtualPointer) {
			virtualPointer.style.display = 'none';
		}
	}
	
	function drawVirtualPointerInHTML (piW, piH, piL, piT) {
		// Draw virtual pointer graphic on screen in HTML not on canvas, to support movement
		//in front of contents of other displays (polygons, watermarks, hotspots, etc.). Clone graphic
		// file to ensure ability to create more than one pointer instance.
		var pImage = virtualPointerImage.cloneNode(false);
		pImage.width = piW;
		pImage.height = piH;
		virtualPointer = Z.Utils.createContainerElement('div', 'piC', 'inline-block', 'absolute', 'hidden', piW + 'px', piH + 'px', piL + 'px', piT + 'px', 'none', '0px', 'transparent none', '0px', '0px', 'normal');
		virtualPointer.appendChild(pImage);
		Z.ViewerDisplay.appendChild(virtualPointer);
		
		// Set tooltip.
		virtualPointer.setAttribute('title', Z.Utils.getResource('TIP_VIRTUALPOINTER'));
		
		// Ensure virtual pointer is in front of everything in viewer.
		var uiElementsBaseZIndex = parseInt(Z.Utils.getResource('DEFAULT_UIELEMENTBASEZINDEX'), 10);
		virtualPointer.style.zIndex = (uiElementsBaseZIndex + 13).toString();
		
		Z.Utils.addEventListener(virtualPointer, 'mousedown', virtualPointerMouseDownHandler);
		Z.Utils.addEventListener(virtualPointer, 'touchstart', virtualPointerTouchStartHandler)
		Z.Utils.addEventListener(virtualPointer, 'touchmove', virtualPointerTouchMoveHandler);
		Z.Utils.addEventListener(virtualPointer, 'touchend', virtualPointerTouchEndHandler);
		Z.Utils.addEventListener(virtualPointer, 'touchcancel', virtualPointerTouchCancelHandler);
		Z.Utils.addEventListener(pImage, 'contextmenu', Z.Utils.preventDefault);
		Z.Utils.addEventListener(pImage, 'mousedown', Z.Utils.preventDefault);
	}

	function virtualPointerLoadingFailed () {
		Z.Utils.showMessage(Z.Utils.getResource('ERROR_VIRTUALPOINTERPATHINVALID') + this.url, true);
	}
	
	function virtualPointerMouseDownHandler (event) {
		var event = Z.Utils.event(event);
		if (event && virtualPointer) {
			Z.Utils.removeEventListener(virtualPointer, 'mousedown', virtualPointerMouseDownHandler);
			Z.Utils.addEventListener(Z.ViewerDisplay, 'mousemove', virtualPointerMouseMoveHandler);
			Z.Utils.addEventListener(Z.ViewerDisplay, 'mouseup', virtualPointerMouseUpHandler);
			var mPt = Z.Utils.getMousePosition(event);
			dragPtStart = new Z.Utils.Point(mPt.x, mPt.y); // Variables for dragging set and cleared separately from mouse position variables.
			var viewportDisplayClickPt = convertPageCoordsToViewportDisplayCoords(event.clientX, event.clientY);
			var dragHotPt = new Z.Utils.Point(parseFloat(virtualPointer.style.left), parseFloat(virtualPointer.style.top));
			var offsetX = viewportDisplayClickPt.x - dragHotPt.x;
			var offsetY = viewportDisplayClickPt.y - dragHotPt.y;
			virtualPointer.mouseXPrior = dragPtStart.x;
			virtualPointer.mouseYPrior = dragPtStart.y;
			virtualPointer.mouseXOffset = offsetX;
			virtualPointer.mouseYOffset = offsetY;
		}
	}
	
	function virtualPointerMouseMoveHandler (event) {
		var event = Z.Utils.event(event);
		if (event && virtualPointer) {
			var mPt = Z.Utils.getMousePosition(event);
			dragPtCurrent = new Z.Utils.Point(mPt.x, mPt.y);
			var mouseDeltaX = dragPtCurrent.x - virtualPointer.mouseXPrior;
			var mouseDeltaY = dragPtCurrent.y - virtualPointer.mouseYPrior;
			virtualPointer.mouseXPrior = dragPtCurrent.x;
			virtualPointer.mouseYPrior = dragPtCurrent.y;
			var vrptS = virtualPointer.style;
			var x = parseFloat(vrptS.left) + mouseDeltaX;
			var y = parseFloat(vrptS.top) + mouseDeltaY;
			vrptS.left = x + 'px';
			vrptS.top = y + 'px';
		}
	}
	
	function virtualPointerMouseUpHandler (event) {
		var event = Z.Utils.event(event);
		if (event && virtualPointer) {
			var mPt = Z.Utils.getMousePosition(event);
			var dragPtEnd;
			if (!Z.mouseOutDownPoint) {
				dragPtEnd = new Z.Utils.Point(mPt.x, mPt.y);
			} else {
				dragPtEnd = Z.mouseOutDownPoint;
			}
			Z.Utils.removeEventListener(Z.ViewerDisplay, 'mousemove', virtualPointerMouseMoveHandler);
			Z.Utils.removeEventListener(Z.ViewerDisplay, 'mouseup', virtualPointerMouseUpHandler);
			Z.Utils.addEventListener(virtualPointer, 'mousedown', virtualPointerMouseDownHandler);
			var mouseDeltaX = dragPtEnd.x - virtualPointer.mouseXPrior;
			var mouseDeltaY = dragPtEnd.y - virtualPointer.mouseYPrior;
			var vrptS = virtualPointer.style;
			var x = parseFloat(vrptS.left) + mouseDeltaX;
			var y = parseFloat(vrptS.top) + mouseDeltaY; 	
			vrptS.left = x + 'px';
			vrptS.top = y + 'px';
		}
	}
	
	function virtualPointerTouchStartHandler (event) {
		var event = Z.Utils.event(event);
		if (event) {
			event.preventDefault(); // Prevent copy selection, delay, and simulated mouse events.
			if (Z.interactivityOff) { return; } // Disallow any interaction.
			
			if (virtualPointer) {
				var touch = Z.Utils.getFirstTouch(event);
				if (touch) {
					var target = touch.target;
					var mPt = new Z.Utils.Point(touch.pageX, touch.pageY);
					dragPtStart = new Z.Utils.Point(mPt.x, mPt.y);
					virtualPointer.mouseXPrior = mPt.x;
					virtualPointer.mouseYPrior = mPt.y;
				}
			}
		}
	}
	
	function virtualPointerTouchMoveHandler (event) {
		var event = Z.Utils.event(event);
		if (event) {
			event.preventDefault(); // Prevent copy selection, delay, and simulated mouse events.
			if (Z.interactivityOff) { return; } // Disallow any interaction.
			if (!Z.mousePan) { return; }  // Disallow mouse panning if parameter false.
			
			if (virtualPointer) {
				var touch = Z.Utils.getFirstTouch(event);
				if (touch) {
					var target = touch.target;
					var mPt = new Z.Utils.Point(touch.pageX, touch.pageY);
					var vpS = virtualPointer.style;
					var x = parseFloat(vpS.left);
					var y = parseFloat(vpS.top);
					vpS.left = x + (mPt.x - virtualPointer.mouseXPrior) + 'px';
					vpS.top = y + (mPt.y - virtualPointer.mouseYPrior) + 'px';
					virtualPointer.mouseXPrior = mPt.x;
					virtualPointer.mouseYPrior = mPt.y;
					return false;
				}
			}
		}
		return false;
	}
	
	function virtualPointerTouchEndHandler (event) {
		var event = Z.Utils.event(event);
		if (event) {
			event.preventDefault(); // Prevent delay and simulated mouse events.
			if (Z.interactivityOff) { return; } // Disallow any interaction.
			
			if (virtualPointer) {
				var touch = Z.Utils.getFirstTouch(event);
				if (touch) {
					var target = touch.target;
					var mPt = new Z.Utils.Point(touch.pageX, touch.pageY);
					var dragPtEnd = new Z.Utils.Point(mPt.x, mPt.y);
					var mouseDeltaX = dragPtEnd.x - virtualPointer.mouseXPrior;
					var mouseDeltaY = dragPtEnd.y - virtualPointer.mouseYPrior;
					var vrptS = virtualPointer.style;
					var x = parseFloat(vrptS.left) + mouseDeltaX;
					var y = parseFloat(vrptS.top) + mouseDeltaY; 	
					vrptS.left = x + 'px';
					vrptS.top = y + 'px';
				}
			}
		}
	}
		
	function virtualPointerTouchCancelHandler (event) {
		var event = Z.Utils.event(event);
		if (event) {
			event.preventDefault(); // Prevent copy selection, delay, and simulated mouse events.
			if (Z.interactivityOff) { return; } // Disallow any interaction.
			
			if (virtualPointer) {
				var touch = Z.Utils.getFirstTouch(event);
				if (touch) {
					var target = touch.target;
					var mPt = new Z.Utils.Point(touch.pageX, touch.pageY);
					var dragPtEnd = new Z.Utils.Point(mPt.x, mPt.y);
					var mouseDeltaX = dragPtEnd.x - virtualPointer.mouseXPrior;
					var mouseDeltaY = dragPtEnd.y - virtualPointer.mouseYPrior;
					var vrptS = virtualPointer.style;
					var x = parseFloat(vrptS.left) + mouseDeltaX;
					var y = parseFloat(vrptS.top) + mouseDeltaY; 	
					vrptS.left = x + 'px';
					vrptS.top = y + 'px';
				}
			}
		}	
	}
	
	

	//::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::
	//:::::::::::::::::::::::::::::::::: WATERMARK FUNCTIONS ::::::::::::::::::::::::::::::::
	//::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::

	function loadWatermark () {
		watermarkImage = new Image();
		watermarkAlpha = parseFloat(Z.Utils.getResource('DEFAULT_WATERMARKALPHA'));
		watermarkImage.url = Z.watermarkPath;
		watermarkImage.onload = displayWatermarks;
		watermarkImage.onerror = watermarkLoadingFailed;
		watermarkImage.src = Z.watermarkPath;
	}

	function displayWatermarks () {
		if (wD) {
			var markMinScale = parseFloat(Z.Utils.getResource('DEFAULT_WATERMARKMINSCALE'));
			var markSpanW = parseFloat(Z.Utils.getResource('DEFAULT_WATERMARKSPANW'));
			var markSpanH = parseFloat(Z.Utils.getResource('DEFAULT_WATERMARKSPANH'));
			var currentZ = self.getZoom();
			var displayOffsetL = ((Z.imageW * currentZ) - wD.width) / 2;
			var displayOffsetT = ((Z.imageH * currentZ) - wD.height) / 2;
			var imageOffsetL = ((Z.imageW / 2) - Z.imageX) * currentZ;
			var imageOffsetT = ((Z.imageH / 2) - Z.imageY) * currentZ;

			var markScale = (currentZ < markMinScale) ? markMinScale : currentZ;
			var marksAcross = Math.round(Z.imageW / markSpanW);
			var marksDown = Math.round(Z.imageH / markSpanH);
			var box = self.getViewportDisplayBoundingBoxInPixels();
			var wiScaledW = watermarkImage.width * markScale;
			var wiScaledH = watermarkImage.height * markScale;
			var wicLPrior = 0, wicTPrior = 0;

			// Create rows and columns of watermarks, without overlap, within current view.
			for (var i = 1; i <= marksAcross; i++) {
				for (var j = 1; j <= marksDown; j++) {
					var x = Math.round(Z.imageW / (marksAcross + 1) * i);
					var y = Math.round(Z.imageH / (marksDown + 1) * j);
					if (x > box.l && x < box.r && y > box.t && y < box.b) {
						var wicL = Math.round((x * currentZ) - (wiScaledW / 2) - displayOffsetL + imageOffsetL);
						var wicT = Math.round((y * currentZ) - (wiScaledH / 2) - displayOffsetT + imageOffsetT);

						// Skip row/column if too close to row/column at left or above.
						if (Z.imageW > 4000) {
							var wicLTarget = wicLPrior + 100;
							var wicTTarget = wicTPrior + 100;
							if (wicL < wicLTarget && wicT < wicTTarget) { continue; }
							wicLPrior = wicL;
							wicTPrior = wicT;
						}

						displayWatermark(wiScaledW, wiScaledH, wicL, wicT);
					}
				}
			}
		}
	}

	function displayWatermark (wiScaledW, wiScaledH, wicL, wicT) {
		// DEV NOTE: If implementing drawWatermarkOnCanvas alternative, branch here.
		drawWatermarkInHTML(wiScaledW, wiScaledH, wicL, wicT);
	}

	function drawWatermarkInHTML (wiScaledW, wiScaledH, wicL, wicT) {
		// Draw watermark graphic on screen in HTML not on canvas, to support clearing
		// and displaying as necessary for rapid and smooth zoom and pan. Clone graphic
		// file to fill all instances of watermark rather than only last instance.
		var wImage = watermarkImage.cloneNode(false);
		Z.Utils.setOpacity(wImage, watermarkAlpha);
		wImage.width = wiScaledW;
		wImage.height = wiScaledH;
		var wiContainer = Z.Utils.createContainerElement('div', 'wiC', 'inline-block', 'absolute', 'hidden', wiScaledW + 'px', wiScaledH + 'px', wicL + 'px', wicT + 'px', 'none', '0px', 'transparent none', '0px', '0px', 'normal');
		wiContainer.appendChild(wImage);
		wD.appendChild(wiContainer);
		Z.Utils.addEventListener(wImage, 'contextmenu', Z.Utils.preventDefault);
		Z.Utils.addEventListener(wImage, 'mousedown', Z.Utils.preventDefault);
	}

	function redisplayWatermarks () {
		if (wD) {
			// First clear watermarks previously drawn.
			Z.Utils.clearDisplay(wD);

			// Redraw watermarks at new scale.
			displayWatermarks();
		}
	}

	function watermarkLoadingFailed () {
		Z.Utils.showMessage(Z.Utils.getResource('ERROR_WATERMARKPATHINVALID') + this.url);
	}	

	function HotspotDimensions (hotspot, hC, clickPt, ignoreZoom) {
		var w, h;
		var currZ = (ignoreZoom) ? 1 : hC.currentZ;
		var hotspotZ = hotspot.z / 100;
		var scale = (currZ / hotspotZ);
		
		// Constrain scale within limits set in XML.
		scale = (scale < hC.constrainedScaleMin) ? hC.constrainedScaleMin : (scale > hC.constrainedScaleMax) ? hC.constrainedScaleMax : scale;
		
		// Calculate dimensions based on type.
		if (hotspot.mediaType == 'text') {
			// Temporarily create and append caption to support size calculation.
			var hC = new HotspotContext();
			var hotspotZ = hotspot.z / 100;
			hCaption = createHotspotCaption(hotspot, hC);
			hD.appendChild(hCaption);	
			var dimensions = new calculateCaptionSize(hCaption, hotspotZ, true);				
			hD.removeChild(hCaption);
			w = dimensions.w;
			h = dimensions.h;
		} else if (hotspot.mediaType == 'icon') {
			w = hotspot.iW;
			h = hotspot.iH;
		} else if (hotspot.mediaType == 'polygon') {
			var polyDimensions = Z.Utils.polygonDimensions(hotspot.polygonPts, clickPt);
			w = polyDimensions.x;
			h = polyDimensions.y;
		}
		
		// Apply hotspot scale values, if any.
		w *= scale * (hotspot.xScale / 100);
		h *= scale * (hotspot.yScale / 100);
		
		this.w = w;
		this.h = h;
	}
	
	

	//::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::
	//::::::::::::::::::::::::::::: HOTSPOT & ANNOTATION FUNCTIONS ::::::::::::::::::::::
	//::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::
	
	function loadHotspotsOrAnnotationsData (vpID) {
		// Load hotspot, tour, or annotation XML to get graphic, placement, and other properties.
		if (Z.Utils.stringValidate(hotspotPath)) {
			if (!Z.simplePath) {
				if (hotspotPath.toLowerCase().substring(hotspotPath.length - 4, hotspotPath.length) != '.xml') {
					var defaultFilename = (Z.tour) ? Z.Utils.getResource('DEFAULT_TOURSXMLFILE') : Z.Utils.getResource('DEFAULT_HOTSPOTSXMLFILE');
					hotspotPath = hotspotPath + '/' + defaultFilename;
				}
				dataPath = Z.Utils.cacheProofPath(hotspotPath);
			} else {
				dataPath = hotspotPath;
			}
			
		}
		
		if (typeof dataPath !== 'undefined' && Z.Utils.stringValidate(dataPath)) {
			vpIDTemp = (Z.imageSet) ? vpID : null;
			var netConnector = new Z.NetConnector();
			if (dataPath.toLowerCase().indexOf('.xml') != -1) {
				netConnector.loadXML(dataPath, vpIDTemp);
			}
			
		}
	}
	
	// DEV NOTE: Hotspot XML handling is simpler than annotation XML handling. Validation is in-line
	// and functions are fewer. These differences ensure the simpler functionality is simple to modify.
	// Perform double-unescaping here, as each attribute value is received. This is after loaded XML is converted to an XMLDocument, 
	// to protect any escaped multiline or other content the DOMParser would remove. Use custom function to clear HTML entities 
	// created with custom function and standard unescape to clear hex codes created by escaping by external functions, if any.
	this.parseHotspotsXML = function (xmlDoc) {
		
		// Clear any prior values.
		Z.Utils.arrayClear(hotspotListDP);
		Z.Utils.arrayClear(hotspotsMedia);
		mTypeLegacy = false;
		self.setStatus('XMLParsed', false);

		// Parse display setup information.
		tourAutoStart = Z.Utils.getResource('DEFAULT_TOURAUTOSTART');
		tourAutoLoop = Z.Utils.getResource('DEFAULT_TOURAUTOLOOP');
		hotspotListPosition = Z.Utils.getResource('DEFAULT_HOTSPOTLISTPOSITION');
		hotspotListSource = Z.Utils.getResource('DEFAULT_HOTSPOTLISTSOURCE');
		hotspotListTitle = (Z.tourPath) ? Z.Utils.getResource('UI_TOURLISTTITLE') : Z.Utils.getResource('UI_HOTSPOTLISTTITLE');	
		hotspotsInitialVisibility = Z.Utils.getResource('DEFAULT_HOTSPOTSINITIALVISIBILITY');
		hotspotsMinScale = parseFloat(Z.Utils.getResource('DEFAULT_HOTSPOTSMINSCALE'));
		hotspotsMaxScale = parseFloat(Z.Utils.getResource('DEFAULT_HOTSPOTSMAXSCALE'));

		// Fallback test for 'HOTSPOTSETUP' for backward compatibility.
		var hotspotSetup = xmlDoc.getElementsByTagName('SETUP')[0];
		if (typeof hotspotSetup === 'undefined' || !Z.Utils.stringValidate(hotspotSetup)) {
			var hotspotSetup = xmlDoc.getElementsByTagName('HOTSPOTSETUP')[0];
			if (typeof hotspotSetup === 'undefined' || !Z.Utils.stringValidate(hotspotSetup)) {
				var xmlSetupText = '<HOTSPOTSETUP />';
				var xmlSetupDoc = Z.Utils.xmlConvertTextToDoc(xmlSetupText);
				hotspotSetup = xmlSetupDoc.getElementsByTagName('HOTSPOTSETUP')[0];
			}
		}
		
		// Parse auto values for tours and other values for tours and hotspots.
		if (hotspotSetup) {
			var autoStart = hotspotSetup.getAttribute('AUTOSTART');
			if (Z.Utils.stringValidate(autoStart)) { tourAutoStart = (autoStart != '0' && autoStart != 'false'); }
			var autoLoop = hotspotSetup.getAttribute('AUTOLOOP');
			if (Z.Utils.stringValidate(autoLoop)) { tourAutoLoop = (autoLoop != '0' && autoLoop != 'false'); }
			var listPosition = hotspotSetup.getAttribute('CHOICELIST');
			if (Z.Utils.stringValidate(listPosition)) { hotspotListPosition = listPosition; }
			var listSource = hotspotSetup.getAttribute('LISTSOURCE');
			if (Z.Utils.stringValidate(listSource)) { hotspotListSource = listSource; }
			var listTitle = Z.Utils.xmlUnescapeMinimal(unescape(hotspotSetup.getAttribute('LISTTITLE')));
			if (Z.Utils.stringValidate(listTitle)) { hotspotListTitle = listTitle; }
			var initialVisibility = hotspotSetup.getAttribute('INITIALVISIBILITY');
			if (Z.Utils.stringValidate(initialVisibility)) { hotspotsInitialVisibility = (initialVisibility == '1' || initialVisibility == 'true'); }
			var minScaleAttrib = parseFloat(hotspotSetup.getAttribute('MINSCALE'));
			if (!isNaN(minScaleAttrib)) { // Legacy 0 values become 0.00001 denoting no limit.
				hotspotsMinScale = (minScaleAttrib != 0) ? minScaleAttrib : 0.00001;
			}
			var maxScaleAttrib = parseFloat(hotspotSetup.getAttribute('MAXSCALE'));
			if (!isNaN(maxScaleAttrib)) { // Legacy 0 values become 10000 denoting no limit.
				hotspotsMaxScale = (maxScaleAttrib != 0) ? maxScaleAttrib : 10000;
			}
		}

		// Set initial visibility.
		hS.visibility = (hotspotsInitialVisibility) ? 'visible' : 'hidden';
				
		// Validate list title: if HTML parameter present, override XML value, otherwise set global to HTML parameter.
		if (Z.Utils.stringValidate(Z.hotspotListTitle)) { 
			hotspotListTitle = Z.hotspotListTitle;
		} else if (Z.Utils.stringValidate(hotspotListTitle)) { 
			Z.hotspotListTitle = hotspotListTitle;
		}
		
		// Create hotpot choice list.
		createHotspotChoiceList(hotspotListPosition, hotspotListTitle, hotspotListDP, vpID);

		// Parse hotspots XML and call create function.
		var hotspotNodes = xmlDoc.getElementsByTagName('HOTSPOT');
		for (var i = 0, j = hotspotNodes.length; i < j; i++) {
			var hotspotNode = hotspotNodes[i];
			hotspotNode = validateAnnotationMedia(hotspotNode);
			self.createHotspotFromXML(hotspotNode, true); // Second parameter forces validation, necessary because hotspots.xml data not validated on load like annotations.xml data.
		}
		
		// Trace one error for Flash library graphic, if tracking variable set during hotspots XML parsing.
		if (Z.debug == 2 && mTypeLegacy) { Z.Utils.trace(Z.Utils.getResource('ERROR_HOTSPOTMEDIAINVALID')); }
		self.setStatus('XMLParsed', true);
		redisplayHotspots();
		
		if (Z.tour) {
			// Set audio mute buttons visible if AUDIO attribute in use.
			self.initializeAudioMuteButtons();
			Z.Utils.validateCallback('tourLoaded');
			if (tourAutoStart && !Z.tourStop) { Z.Utils.functionCallWithDelay(function () { self.tourStart(); }, 750); }
		} else {
			Z.Utils.validateCallback('hotspotsLoaded');
			self.setStatus('hotspotsLoaded', true);
		}
	}
	
	this.createHotspotFromParameters = function (id, name, mediaType, media, audio, x, y, zoom, xScale, yScale, url, urlTarget, rollover, caption, tooltip, textColor, backColor, lineColor, fillColor, textVisible, backVisible, lineVisible, fillVisible, captionPosition, saved, internalID, poiID, captionHTML, tooltipHTML, polyClosed, polygonPts, showFor, transition, changeFor, rotation) {
		var poID = (typeof poiID !== 'undefined' && poiID !== null) ? poiID.toString() : null;
		var hotspotParams = Z.Utils.arrayToArrayOfStrings( [id, name, mediaType, media, audio, x, y, zoom, xScale, yScale, url, urlTarget, rollover, caption, tooltip, textColor, backColor, lineColor, fillColor, textVisible, backVisible, lineVisible, fillVisible, captionPosition, saved, internalID, poiID, captionHTML, tooltipHTML, polyClosed, polygonPts, showFor, transition, changeFor, rotation] );
		var xmlText = '<HOTSPOT ID="' + hotspotParams[0]  + '" NAME="' + hotspotParams[1] + '" MEDIATYPE="' + hotspotParams[2] + '" MEDIA="' + hotspotParams[3] + '" AUDIO="' + hotspotParams[4] + '" X="' + hotspotParams[5] + '" Y="' + hotspotParams[6] + '" ZOOM="' + hotspotParams[7] + '" XSCALE="' + hotspotParams[8] +'" YSCALE="' + hotspotParams[9] + '" CLICKURL="' + hotspotParams[10] + '" URLTARGET="' + hotspotParams[11] + '" ROLLOVER="' + hotspotParams[12] + '" CAPTION="' + hotspotParams[13] + '" TOOLTIP="' + hotspotParams[14] + '" TEXTCOLOR="' + hotspotParams[15] + '" BACKCOLOR="' + hotspotParams[16] + '" LINECOLOR="' + hotspotParams[17] + '" FILLCOLOR="' + hotspotParams[18] + '" TEXTVISIBLE="' + hotspotParams[19] + '" BACKVISIBLE="' + hotspotParams[20] + '" LINEVISIBLE="' + hotspotParams[21] + '" FILLVISIBLE="' + hotspotParams[22] + '" CAPTIONPOSITION="' + hotspotParams[23] + '" SAVED="' + hotspotParams[24] + '" INTERNALID="' + hotspotParams[25]  + '" POIID="' + hotspotParams[26] + '" SHOWFOR="' + hotspotParams[31] + '" TRANSITION="' + hotspotParams[32] + '" CHANGEFOR="' + hotspotParams[33] + '" ROTATION="' + hotspotParams[34] + '"></HOTSPOT>';
		var xmlDoc = Z.Utils.xmlConvertTextToDoc(xmlText);
		var hotspotNode = xmlDoc.getElementsByTagName('HOTSPOT')[0];

		// Ensure unique hotspot internalID for code use.
		if (hotspotNode.getAttribute('INTERNALID') === null) { hotspotNode.setAttribute('INTERNALID', getFreeID('hotspot')); }
		
		// Duplicate complex content, if present, for caption, tooltip, polygon.
		var xmlDocTemp = Z.Utils.xmlConvertTextToDoc('<TEMP></TEMP>');
		if (Z.Utils.stringValidate(hotspotParams[27])) {		
			var tempHTML = Z.Utils.xmlConvertTextToDoc(captionHTML).getElementsByTagName('CAPTION')[0].innerHTML;
			var captionNode = xmlDocTemp.createElement('CAPTION');
			captionNode.innerHTML = tempHTML;
			hotspotNode.appendChild(captionNode);
		}
		if (Z.Utils.stringValidate(hotspotParams[28])) {
			var tempHTML = Z.Utils.xmlConvertTextToDoc(tooltipHTML).getElementsByTagName('TOOLTIP')[0].innerHTML;
			var tooltipNode = xmlDocTemp.createElement('TOOLTIP');
			tooltipNode.innerHTML = tempHTML;
			hotspotNode.appendChild(tooltipNode);
		}
		if (Z.Utils.stringValidate(hotspotParams[30])) {
			var poiPolyTemp = xmlDocTemp.createElement('POLYGON');
			poiPolyTemp.setAttribute('CLOSED', hotspotParams[29]);
			for (var p = 0, q = polygonPts.length; p < q; p++) {
				var poiPointTemp = xmlDocTemp.createElement('POINT');
				poiPointTemp.setAttribute('X', polygonPts[p].x);
				poiPointTemp.setAttribute('Y', polygonPts[p].y);
				poiPolyTemp.appendChild(poiPointTemp);
			}
			hotspotNode.appendChild(poiPolyTemp);
		}	
		self.createHotspotFromXML(hotspotNode, true);

		// Debug option: Example use of createHotspotFromParameters function (apply in button click handler or other function).
		// self.createHotspotFromParameters('200', 'Test', 'icon', 'Assets/Hotspots/hotspotFromJPG.jpg', null, '250', '250', '100', '100','100', 'http://www.zoomify.com', '_self', 'false', 'Test Caption', 'This is a test tooltip.');
	}
	
	this.createHotspotFromXML = function (hotspotNode, validate) {
		if (validate) { hotspotNode = validateAnnotationXMLNode(hotspotNode, 'hotspot'); }
		var hotspot = new Hotspot(hotspotNode);

		// Add hotspot value to choicelist based on optional parameter.
		if (hotspotIsValid(hotspot) || Z.annotations) {
			hotspots[hotspots.length] = hotspot;
			var hotspotListText = (hotspotListSource == 'NAME') ? hotspot.name : (hotspotListSource == 'CAPTION') ? hotspot.caption : hotspot.tooltip;
			if (hotspotList) { addToHotspotChoiceList(hotspotListText, hotspot.internalID); }
		}
		
		// Display hotspot if no image or if image previously loaded, else load new hotspot image content and display will occur on load.
		var hC = new HotspotContext();
		if (!Z.Utils.stringValidate(hotspot.media) || hotspot.mediaType == 'text' || hotspot.media == 'polygon') {
			displayHotspot(hotspot, hC);
		} else {
			addHotspotMedia(hotspot, true);
		}	
		
		if (Z.Viewer.getStatus('ready')) {
			Z.Utils.validateCallback('labelCreated');
			Z.Utils.validateCallback('labelCreatedGetInternalID');
		}
	}
	
	function addHotspotMedia (hotspot, displayNow) {
		var index = Z.Utils.arrayIndexOfObjectValue(hotspotsMedia, 'media', hotspot.media);
		if (index != -1) {
			var tempImg = new Image(); // DEV NOTE: workaround for image sizing issues.
			tempImg.src = hotspot.media;
			var w = tempImg.width;
			var h = tempImg.height;
			tempImg = null;
			if (hotspotsMedia[index].element) {
				hotspot.image = hotspotsMedia[index].element.cloneNode(false);
			}
			hotspot.iW = w;
			hotspot.iH = h;
			if (displayNow) { 
				var hC = new HotspotContext();
				displayHotspot(hotspot, hC); 
			}
		} else {
			hotspotsMedia[hotspotsMedia.length] = { media:hotspot.media, element:null };
			var loadStart = new Date().getTime();
			loadHotspotMedia(hotspot.media, loadStart);
		}
	}
	
	function Hotspot (hotspotNode) {
		var tempS, tempN;
		tempS = hotspotNode.getAttribute('ID');
		this.id = (tempS != '') ? tempS : getFreeID('labelExternal');
		tempS = hotspotNode.getAttribute('INTERNALID');
		this.internalID = (!isNaN(parseInt(tempS))) ? tempS : (hotspotList) ? getFreeID('hotspot') : getFreeID('label');
		this.poiID = hotspotNode.getAttribute('POIID');
		tempS = hotspotNode.getAttribute('NAME'); // Exception to unescaping at creation time.
		this.name = (tempS != '') ? tempS : this.id;

		this.mediaType = hotspotNode.getAttribute('MEDIATYPE'); // Supported values: 'freehand', 'text', 'icon', 'rectangle', 'polygon', 'measure' supported. Legacy values 'url' and 'symbol' converted on import of annotations or hotspots XML.
		this.media = hotspotNode.getAttribute('MEDIA'); // Supported values: URL path, 'polygon', empty string.
		this.image = null; // Media content, added on load.

		this.iW = null; // Media width stored to avoid width of 0 when cloning.
		this.iH = null; // Media height stored to avoid height of 0 when cloning.
		tempN = parseFloat(hotspotNode.getAttribute('X'));
		this.x = isNaN(tempN) ? 0 : tempN;
		tempN = parseFloat(hotspotNode.getAttribute('Y'));
		this.y = isNaN(tempN) ? 0 : tempN;
		tempN = parseFloat(hotspotNode.getAttribute('ZOOM'));
		this.z = isNaN(tempN) ? -1 : tempN;
		tempN = parseFloat(hotspotNode.getAttribute('XSCALE'));
		this.xScale = isNaN(tempN) ? 100 : tempN;
		tempN = parseFloat(hotspotNode.getAttribute('YSCALE'));
		this.yScale = isNaN(tempN) ? 100 : tempN;
		this.clickURL = hotspotNode.getAttribute('CLICKURL');
		this.urlTarget = hotspotNode.getAttribute('URLTARGET');
		tempS = hotspotNode.getAttribute('ROLLOVER');
		this.rollover = ((tempS == '1') || (tempS == 'true'));
		this.caption = hotspotNode.getAttribute('CAPTION');
		this.comment = hotspotNode.getAttribute('COMMENT');
		this.tooltip = hotspotNode.getAttribute('TOOLTIP');
		this.user = hotspotNode.getAttribute('USER');
		this.date = hotspotNode.getAttribute('DATE');		
		this.textColor = hotspotNode.getAttribute('TEXTCOLOR');
		this.backColor = hotspotNode.getAttribute('BACKCOLOR');
		this.lineColor = hotspotNode.getAttribute('LINECOLOR');
		this.fillColor = hotspotNode.getAttribute('FILLCOLOR');
		tempS = hotspotNode.getAttribute('TEXTVISIBLE');
		this.textVisible = (tempS != 'false' && tempS != '0' && Z.captionTextVisible);
		tempS = hotspotNode.getAttribute('BACKVISIBLE');
		this.backVisible = (tempS != 'false' && tempS != '0' && Z.captionBackVisible);
		tempS = hotspotNode.getAttribute('LINEVISIBLE');
		this.lineVisible = (tempS != 'false' && tempS != '0' && Z.polygonLineVisible);
		tempS = hotspotNode.getAttribute('FILLVISIBLE');
		this.fillVisible = (tempS != 'false' && tempS != '0' && Z.polygonFillVisible);

		var capPos = hotspotNode.getAttribute('CAPTIONPOSITION');
		this.captionPosition = Z.Utils.stringValidate(capPos) ? capPos : '8';		

		var savedParam = hotspotNode.getAttribute('SAVED');
		this.saved = (savedParam === null) ? true : savedParam;

		// Create value to be reset by setHotspotVisibility function, not rollover handlers, for reference in drawHotspotInHTML function during redisplay during zoom.
		this.visibility = true;

		// Duplicate complex field content.
		var captionNodes = hotspotNode.getElementsByTagName('CAPTION');
		if (captionNodes.length > 0){
			this.captionHTML = unescape(Z.Utils.xmlConvertDocToText(captionNodes[0]));
		}
		// Tooltips implemented using div title attribute. Alternative supporting HTML TBD.
		var tooltipNodes = hotspotNode.getElementsByTagName('TOOLTIP');
		if (tooltipNodes.length > 0){
			this.tooltipHTML = unescape(Z.Utils.xmlConvertDocToText(tooltipNodes[0]));
		}

		// For mediaType is 'icon', media is external graphic file. For type 'text' media is null. For types 'rectangle', 'polygon', and 'measurment' media is polygon. For legacy type 'symbol' media is Flash library graphic to be substituted during XML parsing.
		if (hotspotNode.getAttribute('MEDIA') == 'freehand' || hotspotNode.getAttribute('MEDIA') == 'rectangle' || hotspotNode.getAttribute('MEDIA') == 'polygon' || hotspotNode.getAttribute('MEDIA') == 'measure') {
			var polyNodes = hotspotNode.getElementsByTagName('POLYGON');
			if (polyNodes.length > 0){
				var polyNode = hotspotNode.getElementsByTagName('POLYGON')[0];
				this.polyClosed = (polyNode.getAttribute('CLOSED') != '0');
				var polyPoints = polyNode.getElementsByTagName('POINT');
				var polyPts = [];
				for (var i = 0, j = polyPoints.length; i < j; i++) {			
					var xPtParam = parseFloat(polyPoints[i].getAttribute('X'));
					var xPt = isNaN(xPtParam) ? 0 : xPtParam;
					var yPtParam = parseFloat(polyPoints[i].getAttribute('Y'));
					var yPt = isNaN(yPtParam) ? 0 : yPtParam;		
					polyPts[polyPts.length] = { x:xPt, y:yPt };
				}
				this.polygonPts = polyPts;
			}
		}

		// Get hotspot attributes relevant to tours and/or slideshows.
		this.audio = hotspotNode.getAttribute('AUDIO');
		if (Z.Utils.stringValidate(this.audio)) { Z.audioContent = true; }
		tempN = parseFloat(hotspotNode.getAttribute('SHOWFOR'));
		this.showFor = isNaN(tempN) ? 0 : tempN;
		this.transition = hotspotNode.getAttribute('TRANSITION');
		tempN = parseFloat(hotspotNode.getAttribute('CHANGEFOR'));
		this.changeFor = isNaN(tempN) ? 0 : tempN;
		var rotationParam = parseFloat(hotspotNode.getAttribute('ROTATION'));
		this.rotation = isNaN(rotationParam) ? 0 : rotationParam;

		this.category = hotspotNode.getAttribute('CATEGORY');

		this.zIndex = hotspots.length.toString();
	}
	
	// Pass id value in first parameter as string. Use last parameter to specify whether
	// value is user id string value or internal Zoomify unique numeric value.
	this.modifyHotspot = function (idValue, property, newVal, delay, useInternalID) {
		var index = -1;
		if (useInternalID) {
			index = Z.Utils.arrayIndexOfObjectValue(hotspots, 'internalID', idValue);
		} else {
			index = Z.Utils.arrayIndexOfObjectValue(hotspots, 'id', idValue.toString());
		}
		if (index != -1) {
			var hotspot = hotspots[index];
			
			// Reposition polygon points if hotspot x or y modified - before updating hotspot x or y.
			if (hotspot.media == 'polygon' && (property == 'x' || property == 'y')) {
				var currX = (property == 'x') ? newVal : hotspot.x;
				var currY = (property == 'y') ? newVal : hotspot.y;
				var hotPtCurrent = new Z.Utils.Point(currX, currY);
				polygonPointsPan(hotspot, hotPtCurrent);
			}
			
			// Test if scaling polygon.
			var scalingPoly = (hotspot.media == 'polygon' && (property == 'xScale' || property == 'yScale'));
			
			// Set new property value - unless setting scale of polygon. In that case, change position of control points.
			if (!scalingPoly) {
				hotspot[property] = newVal;
			} else {
				polygonPointsScale(hotspot, property, newVal / 100);
			}			
			
			// Implement rollover effect on visibility.
			if (property == 'rollover' && newVal == false) { hotspot.visibility = true; }
			
			// Add media if type 'icon'.
			if (property == 'media' && hotspot.mediaType == 'icon') { addHotspotMedia(hotspot, false); }
						
			// Redisplay if delay not specified.
			if (typeof delay === 'undefined' || delay === null || !delay) {
				redisplayHotspots();
			}
		}
	}
		
	// Pass id value in first parameter as string. Use last parameter to specify whether
	// value is user id string value or internal Zoomify unique numeric value.
	this.deleteHotspot = function (idValue, replace, useInternalID) {
		var index = -1;
		if (useInternalID) {
			index = Z.Utils.arrayIndexOfObjectValue(hotspots, 'internalID', idValue);
		} else {
			index = Z.Utils.arrayIndexOfObjectValue(hotspots, 'id', idValue.toString());
			if (index != -1) { idValue = hotspots[index].internalID; }
		}
		if (index != -1) {
			hotspots = Z.Utils.arraySplice(hotspots, index, 1);
			clearHotspotFromHTML(idValue);
			if (!replace) { clearHotspotFromChoiceList(idValue); }
		}
	}

	this.deleteAllHotspots = function () {	
		hotspots = []
		if (hD) { hD.innerHTML = ''; }
		clearAllFromHotspotChoiceList();
	}
					
	this.deleteAllMeasureHotspots = function () {
		var hotLen = hotspots.length;
		if (hotLen > 0 && hD && hD.childNodes.length > 0) {
			for (var i = 0; i < hotLen; i++) {
				if (hotspots[i].mediaType == 'measure') { hotspots = Z.Utils.arraySplice(hotspots, i, 1); }
			}
			redisplayHotspots();
		}
	}

	// Asynchronously load hotspot media and ensure handler function is called upon loading.
	function loadHotspotMedia (media, loadTime) {
		var hotspotLoading = hotspotNetConnector.loadImage(media, Z.Utils.createCallback(null, onHotspotMediaLoad, media, loadTime), 'hotspot');
	}

	// Clone element into hotspot array for more rapid display during zoom.
	function onHotspotMediaLoad (media, loadTime, element) {
		if (media && loadTime && element) {
			var hC = new HotspotContext();
			for (var i = 0, j = hotspots.length; i < j; i++) {
				var hotspot = hotspots[i];
				if (hotspot.media == media) {
					var index = Z.Utils.arrayIndexOfObjectValue(hotspotsMedia, 'media', media);
					if (index != -1) {
						hotspotsMedia[index].element = element;
					} else {
						hotspotsMedia[hotspotsMedia.length] = { media:media, element:element };
					}
					hotspot.image = element.cloneNode(false);
					hotspot.iW = element.width;
					hotspot.iH = element.height;
					displayHotspot(hotspot, hC);
				}
			}
		} else {
			Z.Utils.showMessage(Z.Utils.getResource('ERROR_HOTSPOTPATHINVALID'));
		}
	}
	
	this.redisplayHotspots = function () {
		redisplayHotspots();
	}

	function redisplayHotspots () {
		if (hD && self.getStatus('initialized')) {
			// First clear hotspots previously drawn.
			Z.Utils.clearDisplay(hD);
			if (dD) { Z.Utils.clearDisplay(dD); }
			if (eD) { Z.Utils.clearDisplay(eD); }

			// Redraw hotspots if label display layer not hidden by call to function setHotspotsVisibility.
			if (hS.display == 'inline-block') { 
				displayHotspots();
			}
		}
	}

	function displayHotspotsWithoutMedia () {
		var hC = new HotspotContext();
		for (var i = 0, j = hotspots.length; i < j; i++) {
			if (hotspots[i].media == '' || hotspots[i].media == 'polygon') {
				displayHotspot(hotspots[i], hC);
			}
		}
	}

	this.setLabelsVisibilityByFilter = function (filterBy, filterValue, visible) {
		self.setHotspotsVisibilityByFilter(filterBy, filterValue, visible);
	}
	
	this.setLabelVisibilityByID = function (id, visible, useInternalID) {
		self.setHotspotVisibilityByID(id, visible, useInternalID);
	}
	
	this.setHotspotFilterByDisplayList = function (idList, useInternalID) {		
		// First clear hotspots previously drawn, if parameter true.
		if (hD) { Z.Utils.clearDisplay(hD); }
		if (dD) { Z.Utils.clearDisplay(dD); }
		if (eD) { Z.Utils.clearDisplay(eD); }

		// Set filter list to array, if provided.
		if (typeof idList !== 'undefined' && idList !== null && idList.length > 0) {
			if (useInternalID) { 
				hotspotsFilterDisplayInternalIDs = idList;
			} else {
				hotspotsFilterDisplayIDs = idList;
			}
		}

		// Draw hotspots if label display layer not hidden by call to function setHotspotsVisibility.
		if (hS.display == 'inline-block') {				
			displayHotspots();
		}
	}
	
	this.clearHotspotFilterByDisplayList = function () {
		if (typeof hotspotsFilterDisplayIDs !== 'undefined') { Z.Utils.arrayClear(hotspotsFilterDisplayIDs); }
		if (typeof hotspotsFilterDisplayInternalIDs !== 'undefined') { Z.Utils.arrayClear(hotspotsFilterDisplayInternalIDs); }
		if (hS.display == 'inline-block') {				
			redisplayHotspots();
		}
	}

	function displayHotspots () {
		var hC = new HotspotContext();
		for (var i = 0, j = hotspots.length; i < j; i++) {
			displayHotspot(hotspots[i], hC);
		}

		// DEV NOTE: Workaround for zero contents mousemove problem in some browsers.
		// Ensure at least one item in hotspotsDisplay container or second click-drags will fail.
		if (hD.childNodes.length == 0) {
			var hotspotImmortal = Z.Utils.createContainerElement('div', 'hotspotImmortal', 'inline-block', 'absolute', 'visible', '1px', '1px', '0px', '0px', 'none', '0px', 'transparent none', '0px', '0px', 'normal');
			hD.appendChild(hotspotImmortal);
		}
	}

	// Polygonal hotspot graphics are drawn on canvas for diagonal line support. Draw prior to related hotspot to
	// place under caption and/or graphics. Other hotspot elements are drawn in HTML for simplicity: media, caption, etc.
	function displayHotspot (hotspot, hC) {
		// First filter by ID or internalID if filter set.
		if (hotspotsFilterDisplayIDs.length > 0) {
			var filterIndex = Z.Utils.arrayIndexOf(hotspotsFilterDisplayIDs, hotspot.id);
			if (filterIndex == -1) { return; }
		} else if (hotspotsFilterDisplayInternalIDs.length > 0) {
			var filterIndex = Z.Utils.arrayIndexOf(hotspotsFilterDisplayInternalIDs, hotspot.internalID);
			if (filterIndex == -1) { return; }
		}
		
		// Now draw polygon, if any, and hotspot.
		if (hotspot.media == 'polygon' && (!Z.hotspotsDrawOnlyInView || ((hotspot.x + polygonViewBuffer) > hC.box.l && (hotspot.x - polygonViewBuffer) < hC.box.r && (hotspot.y + polygonViewBuffer) > hC.box.t && (hotspot.y - polygonViewBuffer) < hC.box.b))) {
			drawPolygonOnCanvas(hotspot);
		}
		if (!Z.hotspotsDrawOnlyInView || (hotspot.x > hC.box.l && hotspot.x < hC.box.r && hotspot.y > hC.box.t && hotspot.y < hC.box.b)) {				
			var skipSetVis = (Z.mouseIsDown && hotspot.rollover == 0);
			drawHotspotInHTML(hotspot, hC, null, skipSetVis);
		}
	}

	function drawHotspotInHTML (hotspot, hC, clickPt, skipSetVisibility) {
		// Remove prior instance of hotspot, if any.
		var hotspotCurrentIndex = Z.Utils.arrayIndexOfObjectValue(hotspots, 'internalID', hotspot.internalID);
		if (hotspotCurrentIndex != -1) { clearHotspotFromHTML(hotspot.internalID); }
						
		// Calculate hotspot size if polygon. For images values set in onHotspotMediaLoad.
		if (Z.useCanvas && hotspot.media == 'polygon') {
			var polyPts = hotspot.polygonPts;			
 			if (polyPts) {
				var polyDimensions = Z.Utils.polygonDimensions(hotspot.polygonPts, clickPt);
				hotspot.iW = polyDimensions.x;
				hotspot.iH = polyDimensions.y;
			}
		}
			
		// Avoid mispositioned captions or negative width or height errors in code below by verifying hotspot media is specified and loaded. 
		// Drawing is called on load of media, during view updating, and when setting up annotation panel choice lists - the latter can
		// happen before all media have loaded. Final clause allows for difference between loading process for hotspots.xml and annotation.xml.
		var noMedia = !Z.Utils.stringValidate(hotspot.media);
		var noCaption = (!Z.Utils.stringValidate(hotspot.caption) && !Z.Utils.stringValidate(hotspot.captionHTML) && hotspot.mediaType != 'measure');
		var noDimensions = (hotspot.iW === null || hotspot.iH === null);
		var noPolygon = (hotspot.media != 'polygon');
		if (noMedia && noCaption && (noDimensions && noPolygon)) { return; }
		
		// Calculate scaled dimensions. Do not scale polygon types (freehand, rectangle, polygon) except for their 
		// captions. This allows use for creating graphics encircling or otherwize sized to the details within the image. 
		// Especially important with min zoom less than zoom-to-fit to provide extra area to draw in margins.
		var hotspotZ = (hotspot.media != 'polygon') ? hotspot.z / 100 : 1;
		var scale = (hC.currentZ / hotspotZ);
		
		// For non-polygon types, constrain scaling if min or max scale set. 0 values mean no limit. 
		if (hotspot.media != 'polygon') { 
			if (hC.constrainedScaleMin > 0 && scale < hC.constrainedScaleMin) { scale = hC.constrainedScaleMin; }
			if (hC.constrainedScaleMax > 0 && scale > hC.constrainedScaleMax) { scale = hC.constrainedScaleMax; }
		}
		
		var hiScaledW = hotspot.iW * scale * (hotspot.xScale / 100);
		var hiScaledH = hotspot.iH * scale * (hotspot.yScale / 100);
		
		// Draw hotspot graphic on screen in HTML not on canvas, to support clearing
		// and displaying as necessary for rapid and smooth zoom and pan, as well as
		// to support click and rollover events and other interactive features.
		var hImage;
		if (hotspot.media != 'placeholder' && hotspot.image) {
			hImage = hotspot.image;
			hImage.align = 'top';
			hImage.width = hiScaledW;
			hImage.height = hiScaledH;
		}

		// Calculate hotspot position.
		var hicL = Math.round((hotspot.x * hC.currentZ) - (hiScaledW / 2) - hC.displayOffsetL + hC.imageOffsetL);
		var hicT = Math.round((hotspot.y * hC.currentZ) - (hiScaledH / 2) - hC.displayOffsetT + hC.imageOffsetT);
		
		// Create hotspot caption. Override caption box hiding and drop shadowing for measure captions.
		var hCaption = null, hCaption2 = null;
		if (!noCaption) {
			if (Z.captionBoxes || hotspot.mediaType == 'measure') {
				hCaption = createHotspotCaption(hotspot, hC);
			} else {
				hCaption2 = createHotspotCaption(hotspot, hC, true, true);
				hCaption = createHotspotCaption(hotspot, hC, true, false);
			}
		}
				
		// Create hotspot contents visibility cloak.
		var hCloak = Z.Utils.createContainerElement('div', 'hCloak', 'inline-block', 'absolute', 'visible');
		
		// Create hotspot element in display.
		var elementID = 'hot' + hotspot.internalID.toString();
		var hContainer = Z.Utils.createContainerElement('div', elementID, 'inline-block', 'absolute', 'visible', hiScaledW + 'px', hiScaledH + 'px', hicL + 'px', hicT + 'px', 'none', '0px', 'transparent none', '0px', '0px', 'normal');
		
		// Debug option: Replace line above with line below to display outline of hotspot for comparison with position of contained icon and caption or of associated polygon on canvas.
		//var hContainer = Z.Utils.createContainerElement('div', elementID, 'inline-block', 'absolute', 'visible', hiScaledW + 'px', hiScaledH + 'px', hicL + 'px', hicT + 'px', 'solid', '1px', 'transparent none', '0px', '0px', 'normal');
		
		// Set hotspot tooltip.
		if (tooltipSource == 'TOOLTIP') {
			hContainer.title = (Z.Utils.stringValidate(hotspot.tooltip)) ? hotspot.tooltip : '';
		} else if (tooltipSource == 'COMMENT') {
			hContainer.title = (Z.Utils.stringValidate(hotspot.comment)) ? hotspot.comment : '';
		}
		
		// Implement click effect url using anchor href on image and/or caption, rather than using window.open in mousedown
		// handler. This ensures user interaction and avoids triggering popup blockers if a new window is targeted.
		// Exception: if hotspot.clickURL == 'function', then urlTarget is a function.
		if (!Z.labelClickSelect && Z.Utils.stringValidate(hotspot.clickURL)) {
			 if (Z.editMode !== null) {
				// Replace hotspot click links with developer notification message when in edit mode, to ensure hotspot click-link does not conflict with drag-positioning of hotspots.
				Z.Utils.addEventListener(hCloak, 'mousedown', hotspotEditMouseDownHandler);
				Z.Utils.addEventListener(hCloak, 'touchstart', hotspotEditTouchStartHandler);
				
			} else if (hotspot.clickURL == 'function') {
				Z.Utils.addEventListener(hContainer, 'mousedown', executeExternalFunction);
				Z.Utils.addEventListener(hContainer, 'touchstart', executeExternalFunction);
			
			} else {
				if (hImage) {
					var hiAnchor = document.createElement('a');
					hiAnchor.setAttribute('href', hotspot.clickURL);
					hiAnchor.setAttribute('target', hotspot.urlTarget);
					hiAnchor.setAttribute('outline', 'none');
					hiAnchor.appendChild(hImage);
					hImage.style.cursor = 'help';
					hImage.style.border = 'none';
				}
				if (hCaption) {
					var hcAnchor = document.createElement('a');
					hcAnchor.setAttribute('href', hotspot.clickURL);
					hcAnchor.setAttribute('target', hotspot.urlTarget);
					hcAnchor.setAttribute('outline', 'none');
					if (hCaption2) { 
						hcAnchor.appendChild(hCaption2);
						hCaption2.style.cursor = 'help'; 
					}
					hcAnchor.appendChild(hCaption);
					hCaption.style.cursor = 'help';

					// DEV NOTE: Border sometimes appears regardless of setting in Firefox so leave visible.
					//hCaption.style.border = 'none';
				}
				hCloak.style.border = 'none';				
			}
		
			// Ensure hotspot click-link does not conflict with viewport click-zoom-and-pan.
			if (Z.editMode === null && (Z.clickZoom || Z.clickPan)) {
				Z.Utils.addEventListener(hCloak, 'mousedown', hotspotMouseDownHandler);
				Z.Utils.addEventListener(hCloak, 'touchstart', hotspotTouchStartHandler);
			}
		}

		// Add anchor or image and anchor or caption to cloak.
		if (!Z.labelClickSelect && Z.Utils.stringValidate(hotspot.clickURL) && Z.editMode === null && hotspot.clickURL != 'function') {
			if (hiAnchor) { hCloak.appendChild(hiAnchor); }
			if (hcAnchor) { hCloak.appendChild(hcAnchor); }
		} else {
			if (hImage) { hCloak.appendChild(hImage); }
			if (hCaption2) { hCloak.appendChild(hCaption2); }
			if (hCaption) { hCloak.appendChild(hCaption); }
		}

		// Add cloak to container, and container to display.
		hContainer.appendChild(hCloak);
		hD.appendChild(hContainer);
		
		// Store zIndex in hotspot element for access during dragging.
		hContainer.zIndex = hotspot.zIndex;

		// Set caption background transparency.
		if (!noCaption && (Z.captionBoxes || hotspot.mediaType == 'measure')) {
			var hexStr = hotspot.backColor.toString();
			if (hexStr) {
				var r = Z.Utils.hexToRGB(hexStr).r;
				var g = Z.Utils.hexToRGB(hexStr).g;
				var b = Z.Utils.hexToRGB(hexStr).b;
				var a = measureCaptionBackOpacity;	
				var colorStr = 'rgba(' + r + ',' + g + ',' + b + ',' + a + ')';
				hCaption.style.backgroundColor = colorStr;
			}
		}				
				
		// Set hotspot visibility.
		if (hotspot.rollover) { hCloak.rollover = hotspot.rollover; }
		hContainer.internalID = hotspot.internalID;
		if (!skipSetVisibility) { self.setHotspotVisibility(hContainer, (!hotspot.rollover && hotspot.visibility)); }
			
		// Position hotspot caption. Must occur after added to display because text container width setting is 'auto'.
		if (hCaption2) { positionHotspotCaption(hotspot, hCaption2, hiScaledW, hiScaledH, true); }
		positionHotspotCaption(hotspot, hCaption, hiScaledW, hiScaledH);
		
		// Handle mouseover and out events.
		if (hotspot.rollover) {
			Z.Utils.addEventListener(hContainer, 'mouseover', hotspotMouseOverHandler);
			Z.Utils.addEventListener(hContainer, 'mouseout', hotspotMouseOutHandler);
		}

		// DEV NOTE: Use event handlers below for custom functionality as alternative to use of hiAnchor above.
		// If implementing handlers, also modify or comment out lines above in section 'Implement click effect url as href...'
		// If passing a function name using url attribute in XML, modify lines above in section 'Add anchor or image to cloak.'
		/* if (Z.Utils.stringValidate(hotspot.clickURL)) {
			Z.Utils.addEventListener(hContainer, 'mousedown', hotspotMouseDownHandler);
			Z.Utils.addEventListener(hContainer, "mouseup", hotspotMouseUpHandler);
			Z.Utils.addEventListener(hContainer, 'touchstart', hotspotTouchStartHandler);
			Z.Utils.addEventListener(hContainer, 'touchend', hotspotTouchEndHandler);
			Z.Utils.addEventListener(hContainer, 'touchcancel', hotspotTouchCancelHandler);
		} */

		//  Prevent graphic dragging and disable context menu.
		Z.Utils.addEventListener(hContainer, 'mousedown', Z.Utils.preventDefault);
		Z.Utils.addEventListener(hContainer, 'contextmenu', Z.Utils.preventDefault);
	}
	
	// Call context function outside 'for' loops that display hotspots so that zoom, scale, and position values are only calculated once for all iterations.
	function HotspotContext (viewportOnly) {
		if (hD) {
			this.box = self.getViewportDisplayBoundingBoxInPixels(viewportOnly);
			this.currentZ = self.getZoom();
			this.constrainedScale = (this.currentZ < hotspotsMinScale) ? hotspotsMinScale : ((this.currentZ > hotspotsMaxScale) ? hotspotsMaxScale : this.currentZ); // Constrain scaling per max and min scale setup values in XML.
			this.constrainedScaleMax = hotspotsMaxScale;
			this.constrainedScaleMin = hotspotsMinScale;
			this.displayOffsetL = ((Z.imageW * this.currentZ) - hD.width) / 2;
			this.displayOffsetT = ((Z.imageH * this.currentZ) - hD.height) / 2;
			this.imageOffsetL = ((Z.imageW / 2) - Z.imageX) * this.currentZ;
			this.imageOffsetT = ((Z.imageH / 2) - Z.imageY) * this.currentZ;
		}
	}
	
	this.getHotspotTarget = function (target) {
		return getHotspotTarget(target);
	}
	
	function getHotspotTarget (target) {
		if (typeof target === 'undefined' || target === null) {
			target = document.getElementById('progressTextBox');
		}
		var hotTarget = null;
		if (target.id.indexOf('hot') != -1 && target.id.indexOf('hotspotDisplay') == -1) {
			hotTarget = target;
		} else if (target.parentNode && target.parentNode.id.indexOf('hot') != -1 && target.parentNode.id.indexOf('hotspotDisplay') == -1) {
			hotTarget = target.parentNode;
		}else if (target.parentNode.parentNode && target.parentNode.parentNode.id.indexOf('hot') != -1 && target.parentNode.parentNode.id.indexOf('hotspotDisplay') == -1) { // Image inside click-link anchor.
			hotTarget = target.parentNode.parentNode;
		} else if (target.parentNode.parentNode.parentNode && target.parentNode.parentNode.parentNode.id.indexOf('hot') != -1 && target.parentNode.parentNode.parentNode.id.indexOf('hotspotDisplay') == -1) { // No click-link anchor.
			hotTarget = target.parentNode.parentNode.parentNode;
		}
		return hotTarget;
	}
	
	this.getLabelIDsInCurrentView = function (useInternalID, viewportOnly, includePartials) {
		var labelsInViewIDs = [];
		var hC = new HotspotContext(viewportOnly);
		var z = self.getZoom();
		var boxScaledL = hC.box.l;
		var boxScaledR = hC.box.r;
		var boxScaledT = hC.box.t;
		var boxScaledB = hC.box.b;
		for (var i = 0, j = hotspots.length; i < j; i++) {
			var hotspot = hotspots[i];
			if (includePartials) {
				var hotDims = new HotspotDimensions(hotspot, hC, null, false);
				var halfW = (hotDims.w / 2) / z;
				var halfH = (hotDims.h / 2) / z;
				boxScaledL = hC.box.l - halfW;
				boxScaledR = hC.box.r + halfW;
				boxScaledT = hC.box.t - halfH;
				boxScaledB = hC.box.b + halfH;
			}
			if (hotspot.x > boxScaledL && hotspot.x < boxScaledR && hotspot.y > boxScaledT && hotspot.y < boxScaledB) {				
				var id = (useInternalID) ? hotspot.internalID : hotspot.id;
				labelsInViewIDs[labelsInViewIDs.length] = id;				
			}
		}
		return labelsInViewIDs;
	}
	
	// Transfer change in coordinates of hotspot element to hotspot object.  Offset mouse
	// position for distance mouse clicked hotspot from center of hotspot before convert 
	// viewport display coordinates to image pixel coordinates.
	function updateHotspotPosition (event, hotspotDragging, hotClickPt) {	
		var hotspotInternalID = hotspotDragging.id.substring(3, hotspotDragging.id.length);
		var hotspotCurrentIndex = Z.Utils.arrayIndexOfObjectValue(hotspots, 'internalID', hotspotInternalID);
		if (hotspotCurrentIndex != -1) {
			var hotspot = hotspots[hotspotCurrentIndex];
			if (event.type == 'mouseup' || (event.type == 'mousemove' && hotspot.media == 'polygon')) {
				var offsetX = hotClickPt.x -= hotspotDragging.mouseXOffset - (parseFloat(hotspotDragging.style.width) / 2);
				var offsetY = hotClickPt.y -= hotspotDragging.mouseYOffset - (parseFloat(hotspotDragging.style.height) / 2);
				var offsetPt = new Z.Utils.Point(offsetX, offsetY);				
				var clickPt = self.getClickCoordsInImage(event, self.getZoom(), offsetPt);
				if (hotspot.media == 'polygon') {
					polygonPointsPan(hotspot, clickPt);
					redisplayPolygons();
				}
				hotspot.x = clickPt.x;
				hotspot.y = clickPt.y;
			}
		}
	}
	
	function polygonPointsPan (hotspot, clickPt) {
		var deltaX = clickPt.x - hotspot.x;
		var deltaY = clickPt.y - hotspot.y;
		var tPolyPts = hotspot.polygonPts.slice(0);
		for (var i = 0, j = tPolyPts.length; i < j; i++) {
			tPolyPts[i].x += deltaX;
			tPolyPts[i].y += deltaY;
		}
		hotspot.polygonPts = tPolyPts.slice(0);
	}
		
	function polygonPointsScale (hotspot, property, scaleVal) {
		var tPolyPts = hotspot.polygonPts.slice(0);
		var scaleDim = (property == 'xScale') ? 'x' : 'y';
		var centerOffset = hotspot[scaleDim] - (hotspot[scaleDim] * scaleVal);
		for (var i = 0, j = tPolyPts.length; i < j; i++) {
			tPolyPts[i][scaleDim] = (tPolyPts[i][scaleDim] * scaleVal) + centerOffset;
		}
		hotspot.polygonPts = tPolyPts.slice(0);
	}
	
	function polygonPointsZoom (hotspot, zoom) {
		var centerOffsetX = hotspot.x - (hotspot.x * zoom);
		var centerOffsetY = hotspot.y - (hotspot.y * zoom);
		var tPolyPts = hotspot.polygonPts.slice(0);
		for (var i = 0, j = tPolyPts.length; i < j; i++) {
			tPolyPts[i].x = (tPolyPts[i].x * zoom) + centerOffsetX;
			tPolyPts[i].y = (tPolyPts[i].y * zoom) + centerOffsetY;
		}
		hotspot.polygonPts = tPolyPts.slice(0);
	}
	
	function polygonPointsZoomXML (hotspotNode) {
		// Get hotspot values.
		var hotX = hotspotNode.getAttribute('X');
		var hotY = hotspotNode.getAttribute('Y');
		var hotZ = hotspotNode.getAttribute('ZOOM');
		var scaleFactor = 100 / hotZ;
		var centerOffsetX = hotX - (hotX * scaleFactor);
		var centerOffsetY = hotY - (hotY * scaleFactor);
		
		// Get and modify polygon point values.
		var polyNodes = hotspotNode.getElementsByTagName('POLYGON');
		if (polyNodes.length > 0){
			var polyNode = hotspotNode.getElementsByTagName('POLYGON')[0];
			var polyPoints = polyNode.getElementsByTagName('POINT');
			var polyPts = [];
			for (var i = 0, j = polyPoints.length; i < j; i++) {
			
				var xPtParam = parseFloat(polyPoints[i].getAttribute('X'));
				var xPt = isNaN(xPtParam) ? 0 : xPtParam;
				xPt = (xPt * scaleFactor) + centerOffsetX;
				
				var yPtParam = parseFloat(polyPoints[i].getAttribute('Y'));
				var yPt = isNaN(yPtParam) ? 0 : yPtParam;
				yPt = (yPt * scaleFactor) + centerOffsetY;
				
				polyPts[polyPts.length] = { x:xPt, y:yPt };
			}
		}
		
		// Replace old values with new values in XML. 
		hotspotNode.removeChild(polyNode);
		var xmlDocNew = createAnnotationsXML();
		var labelNew = createAnnotationsXMLNode(xmlDocNew, 'label');	
		if (polyPts != null && polyPts.length > 0) {
			var poiPolyTemp = xmlDocNew.createElement('POLYGON');
			for (var p = 0, q = polyPts.length; p < q; p++) {
				var poiPointTemp = xmlDocNew.createElement('POINT');
				poiPointTemp.setAttribute('X', polyPts[p].x);
				poiPointTemp.setAttribute('Y', polyPts[p].y);
				poiPolyTemp.appendChild(poiPointTemp);
			}
			hotspotNode.appendChild(poiPolyTemp);
		}
		return hotspotNode;
	}
	
	function createHotspotCaption (hotspot, hC, noCaptionBoxes, dropShadow) {
		// Calculate current size values.
		var hotspotZ = hotspot.z / 100;
		var scale = (hC.currentZ / hotspotZ);
		// Constrain scaling if min or max scale set. 0 values mean no limit. Scale caption 
		// regardless of type because polygon captions scale even though their points don't change.
		if (hC.constrainedScaleMin > 0 && scale < hC.constrainedScaleMin) { scale = hC.constrainedScaleMin; }
		if (hC.constrainedScaleMax > 0 && scale > hC.constrainedScaleMax) { scale = hC.constrainedScaleMax; }
		var scaledFontSize = Math.round(defaultFontSize * scale);
		var constrainedFontSize = (hotspot.mediaType == 'text') ? scaledFontSize : ((scaledFontSize < minFontSize) ? minFontSize : (( scaledFontSize > maxFontSize) ? maxFontSize : scaledFontSize));
				
		// Set defaults.
		var padding = defaultPadding * scale;
		var constrainedPadding = ((padding < minPadding) ? minPadding : (( padding > maxPadding) ? maxPadding : padding));
		var borderWidth, background, captionFontWeight;
		
		// Create caption text node and container. Use node.firstChild.nodeValue for text and node.innerHTML for HTML.
		// Default backdrop color setting is not used here as it is in drawCaptionOnCanvas because caption box is container for text node in HTML, not simple 
		// rectangle drawn as backdrop on canvas.  As such it must be 'transparent none' if no box needed. To clarify this it is named 'background' not 'backColor'.
		var textColor = (Z.Utils.stringValidate(hotspot.textColor)) ? hotspot.textColor : captionTextColor;
		if (typeof noCaptionBoxes !== 'undefined' && noCaptionBoxes !== null && noCaptionBoxes) {
			borderWidth = '0px';
			background = 'transparent none';
			captionFontWeight = 'normal'; // Alternative implementation: 'bold';
		} else if (hotspot.backVisible) {
			borderWidth = '1px';
			background = hotspot.backColor;
			captionFontWeight = 'normal';
		} else {
			borderWidth = '1px';
			background = (Z.Utils.stringValidate(hotspot.backColor)) ? hotspot.backColor : captionBackColor;
			captionFontWeight = 'normal';
		}		
		if (typeof dropShadow !== 'undefined' && dropShadow !== null && dropShadow) {
			textColor = hotspot.backColor;
		}
		
		if (!hotspot.textVisible) {
			textColor = 'transparent none';
		}
		
		// Alternative implementation: if caption background boxes enabled by parameter, reverse font and background colors.
		if (Z.captionBoxes && Z.captionsColorsDefault && hotspot.mediaType != 'measure') {
			textColor = hotspot.backColor;
			background = hotspot.textColor;
		}
		
		// Avoid hidden text.
		if (textColor == background) {
			if (textColor == '#ffffff') {
				background = '#000000';
			} else if (textColor == '#000000') {
				background = '#ffffff';
			}
		}
		
		// DEV NOTE: Value 'pre' in whitespace parameter (last) in next line allows use of '%0A' to break lines in caption. '%0D' will not work, 
		// though this does work in tooltip which is simply assigned to 'title' tag of hotspot div and is handled by browsers.
		var captionTextBox = Z.Utils.createContainerElement('div', 'captionTextBox', 'inline-block', 'absolute', 'hidden', 'auto', 'auto', '1px', '1px', 'solid', borderWidth, background, '0px', constrainedPadding + 'px', 'pre');
		if (typeof hotspot.captionHTML !== 'undefined' && Z.Utils.stringValidate(hotspot.captionHTML)) {
			captionTextBox.innerHTML = hotspot.captionHTML;
			Z.Utils.setHTMLTextDefaultCaptionStyle(captionTextBox, hotspot.captionHTML, textColor, 'verdana', constrainedFontSize + 'px', 'none', 'normal', 'normal', 'normal', 'normal', '1em', 'center', 'none');
		} else if (textColor != 'transparent none' && typeof hotspot.caption !== 'undefined' && Z.Utils.stringValidate(hotspot.caption)) {
			var captionTextNode = document.createTextNode(hotspot.caption);
			captionTextBox.appendChild(captionTextNode);
			Z.Utils.setTextNodeStyle(captionTextNode, textColor, 'verdana', constrainedFontSize + 'px', 'none', 'normal', 'normal', 'normal', captionFontWeight, '1em', 'center', 'none');
			Z.Utils.disableTextInteraction(captionTextNode);
		} else if (hotspot.mediaType == 'measure') {
			var hotPt = new Z.Utils.Point(hotspot.x, hotspot.y);
			setHotspotCaptionMeasure(hotspot, hotPt);
		}
		
		// Prevent text selection and context menu.
		Z.Utils.addEventListener(captionTextBox, 'contextmenu', Z.Utils.preventDefault);
		
		return captionTextBox;
	}
	
	function positionHotspotCaption (hotspot, hCaption, hiScaledW, hiScaledH, dropShadow) {
		if (hCaption) {
			var isCurrentHotspotAndPolygon = (hotspotCurrentID == hotspot.internalID && hotspot.media == 'polygon');
			var capPosPt = calculateHotspotCaptionPosition(hCaption, hotspot.captionPosition, hiScaledW, hiScaledH, Z.imageR, isCurrentHotspotAndPolygon);
			if (capPosPt) {	
				var dropShadowOffset = (dropShadow) ? 1 : 0;
				hCaption.style.left = (capPosPt.x + dropShadowOffset) + 'px';
				hCaption.style.top = (capPosPt.y + dropShadowOffset) + 'px';
			}
		}
	}

	// Positions hotspot caption if hotspot is polygon and dragging is in progress. Not accurate when 
	// not dragging polygon as could be resizing polygon which then requires recentering hotspot itself.
	function positionPolygonCaption (hotspot, hC) {
		var hCaption = getHotspotCaptionElement(hotspot);
		var polyDimensions = Z.Utils.polygonDimensions(hotspot.polygonPts);
		
		// Calculate constrained scaled dimensions. Do not constrain freehand, rectangle, or polygon hotspots 
		// to allow use for creating graphics encircling or otherwize sized to the details within the image. 
		// Especially important with min zoom less than zoom-to-fit to provide extra area to draw in margins.
		var hotspotZ = (hotspot.media != 'polygon') ? hotspot.z / 100 : 1;
		var scale = (hC.currentZ / hotspotZ);
		var hiScaledW = polyDimensions.x * scale * (hotspot.xScale / 100);
		var hiScaledH = polyDimensions.y * scale * (hotspot.yScale / 100);
		positionHotspotCaption(hotspot, hCaption, hiScaledW, hiScaledH);
	}

	function calculateHotspotCaptionPosition (hCaption, p, hW, hH, r, isCurrHotAndPoly) {
		// At 0 rotation, left to right: 1,2,3 top, 4,5,6 center, 7, 8, 9 bottom.
		var x, y, temp;
		var hcS = hCaption.style;
		var marginForEditing = (isCurrHotAndPoly && ((Z.editing == 'addLabel' || Z.editing == 'editLabel') || (Z.editMode === null && Z.labelMode == 'measure'))) ? 40 : 0;
		var padding = parseFloat(hcS.padding);

		// Reposition caption to preserve position relative to hotspot while rotated and cast
		// position type numeric to avoid quotes in code.  Ensure rotation value positive.
		var p = adjustCalculationForRotation(p, r);

		// Cast position type numeric to avoid quotes in code.  Ensure rotation value positive.
		var p = parseInt(p, 10);
		if (r < 0) { r += 360; }

		// Calculate caption dimensions.
		var dimensions = new calculateCaptionSize(hCaption);

		// Center caption over icon, then rotate caption to offset display rotation.
		x = (hW - dimensions.w) / 2 - padding;
		y = (hH - dimensions.h) / 2 - padding;
		Z.Utils.rotateElement(hcS, -r);

		// Calculate positioning values. Swap if needed to adjust for rotation.
		var wOffset = hW / 2 + dimensions.w / 2 + padding + marginForEditing;
		var hOffset = hH / 2 + dimensions.h + padding + marginForEditing;
		if (r == 90 || r == 270) {
			temp = wOffset;
			wOffset = hOffset;
			hOffset = temp;
		}

		// Move caption to adjust for position and rotation.
		switch(p) {
			case 1 :
				x -= wOffset;
				y -= hOffset;
				break;
			case 2 :
				y -= hOffset;
				break;
			case 3 :
				x += wOffset;
				y -= hOffset;
				break;
			case 4 :
				x -= wOffset;
				break;
			case 6 :
				x += wOffset;
				break;
			case 7 :
				x -= wOffset;
				y += hOffset;
				break;
			case 8 :
				y += hOffset;
				break;
			case 9 :
				x += wOffset;
				y += hOffset;
				break;
		}
		
		return new Z.Utils.Point(x, y);
	}
		
	function calculateCaptionSize (hCaption, hZoom, onCanvas) {
		if (typeof hZoom === 'undefined' || hZoom === null) { hZoom = 1; }
		var hcS = hCaption.style;
		var currentZ = self.getZoom();
		var computedW = parseFloat(Z.Utils.getElementStyleProperty(hCaption, 'width'));
		if (isNaN(computedW)) {
			// Workaround for IE failure to report text container element width if setting is 'auto'.
			var font2Pixels = parseFloat(Z.Utils.getResource('DEFAULT_FONTTOPIXELSCONVERSIONFACTOR'));
			var ratioPixs2Chars = parseFloat(hcS.fontSize) / font2Pixels;
			computedW = Math.round(parseFloat(hCaption.firstChild.length * ratioPixs2Chars));
		}

		var defaultFontSize = parseInt(Z.Utils.getResource('DEFAULT_HOTSPOTCAPTIONFONTSIZE'), 10);
		var fontRatio = defaultFontSize / parseFloat(hcS.fontSize);		
		var minCapHeightCanvas = 2 * parseFloat(Z.Utils.getResource('DEFAULT_MINHOTSPOTCAPTIONFONTSIZE'));
		var maxCapHeightCanvas = 2 * parseFloat(Z.Utils.getResource('DEFAULT_MAXHOTSPOTCAPTIONFONTSIZE'));
		
		var computedH = defaultFontSize * 1.7 * currentZ / hZoom;
		if (onCanvas) {
			if (computedH < minCapHeightCanvas) {
				computedH = minCapHeightCanvas;
			} else if (computedH > maxCapHeightCanvas) {
				computedH = maxCapHeightCanvas;
			}
		}
		
		this.w = computedW;
		this.h = computedH;
	}

	// Adjust caption position for to keep in intended relative position to hotspot icon.
	function adjustCalculationForRotation (position, r) {

		// Cast position type numeric to avoid quotes in code. Ensure rotation value positive.
		var p = parseInt(position, 10);
		if (r < 0) { r += 360; }
		
		// At 0 rotation, left to right: 1,2,3 top, 4,5,6 center, 7, 8, 9 bottom. Position 5 is center
		// of center row and does not change. Default to 5 during rotation when r != increment of 90.
		switch(p) {
			case 1:
				p = (r == 0) ? p : (r == 90) ? 7 : (r == 180) ? 9 : (r == 270) ? 3 : 5;
				break;
			case 2:
				p = (r == 0) ? p : (r == 90) ? 4 : (r == 180) ? 8 : (r == 270) ? 6 : 5;
				break;
			case 3:
				p = (r == 0) ? p : (r == 90) ? 1 : (r == 180) ? 7 : (r == 270) ? 9 : 5;
				break;
			case 4:
				p = (r == 0) ? p : (r == 90) ? 8 : (r == 180) ? 6 : (r == 270) ? 2 : 5;
				break;
			case 6:
				p = (r == 0) ? p : (r == 90) ? 2 : (r == 180) ? 4 : (r == 270) ? 8 : 5;
				break;
			case 7:
				p = (r == 0) ? p : (r == 90) ? 9 : (r == 180) ? 3 : (r == 270) ? 1 : 5;
				break;
			case 8:
				p = (r == 0) ? p : (r == 90) ? 6 : (r == 180) ? 2 : (r == 270) ? 4 : 5;
				break;
			case 9:
				p = (r == 0) ? p : (r == 90) ? 3 : (r == 180) ? 1 : (r == 270) ? 7 : 5;
				break;
		}

		position = p.toString();
		return position;
	}
	
	function setHotspotCaptionMeasure (hotspot, clickPt) {	
		var polygonClosed = hotspot.polyClosed;
		var polyPts = hotspot.polygonPts.slice(0);
		var pPtsLen = polyPts.length;

		// Set caption title.
		var measureType = '';
		var measurement = 0;
		var measureSq = '';
		var digits = (Z.units == 'pixels') ? 0 : 4;
		var units = (Z.units != 'um') ? Z.units : '\u03BC' + 'm'; // Unicode representation for lowercase mu symbol ('µ').

		if (pPtsLen == 0) {
			measureType = measureLengthText;
			measurement = Z.Utils.polygonPerimeter(polyPts, polygonClosed, clickPt, digits);
			captionText = measureType + measurement.toString() + "  " + units;
			hotspot.caption = captionText;
		} else if (pPtsLen > 0 && !polygonClosed) {
			measureType = measureLengthTotalText;
			measurement = Z.Utils.polygonPerimeter(polyPts, polygonClosed, clickPt, digits);
			captionText = measureType + measurement.toString() + "  " + units;
			hotspot.caption = captionText;
		} else {
			measureType = measurePerimeterText;
			measurement = Z.Utils.polygonPerimeter(polyPts, polygonClosed, clickPt, digits);
			var measureSq = measureSquareText
			captionText = measureType + measurement.toString() + "  " + units;
			measureType = measureAreaText;
			measurement = Z.Utils.polygonArea(polyPts, polygonClosed, clickPt, digits);
			captionText += '\n' + measureType + measurement.toString() + "  " + units + measureSq;
			hotspot.caption = captionText;
		}
		
		// Update annotation panel caption value.
		if (captionTextElement && captionTextElement.firstChild && captionTextElement.firstChild.value) {
			captionTextElement.firstChild.value = hotspotCurrent.caption;
		}
	}
	
	function setHotspotCaption (hCaption, captionContent, isHTML) {
		if (isHTML) {
			hCaption.innerHTML = captionContent;
		} else {
			hCaption.firstChild.nodeValue = captionContent;		
		}
	}
	
	function removeHotspotCaption (hotspot) {
		var hCaption = getHotspotCaptionElement(hotspot);
		if (hCaption) { hCaption.parentNode.removeChild(hCaption); }
	}
	
	// Caption will be placed in container, in cloak, (in anchor), as first or second child.
	// hD hContainer hCloak hiAnchor hImage, hD hContainer hCloak hcAnchor hCaption, hD hContainer hCloak hImage, hD hContainer hCloak hCaption
	function getHotspotCaptionElement (hotspot) {
		var hElement = null, hCaption = null;
		hElement = document.getElementById('hot' + hotspot.id);
		if (hElement) { hCaption = Z.Utils.getChildElementByID(hElement, 'captionTextBox'); }
		return hCaption;
	}

	function createHotspotChoiceList (position, title, dataProvider, vpID) {
		if (typeof vpID === "undefined" || vpID === null) { vpID = viewportID; }
		var vpIDStr = vpID.toString()
		var visible = (position == '0' || Z.imageSet) ? 'hidden' : 'visible';
		var hotListW = parseInt(Z.Utils.getResource('DEFAULT_HOTSPOTLISTWIDTH'), 10);
		var imageSetListW = parseInt(Z.Utils.getResource('DEFAULT_IMAGESETLISTWIDTH'), 10);
		var listW = (Z.imageSet) ? imageSetListW: hotListW;
		var listCoords = calculateHotspotListCoords(position, listW, viewW, viewH); // viewH allows for toolbar height if static in viewer display area.
		
		// Create choice list and add to viewer.
		if (typeof hotspotList === 'undefined' || hotspotList === null) {
			Z['HotspotList' + vpIDStr] = new Z.Utils.createSelectElement('HotspotList' + vpIDStr, title, dataProvider, listW, listCoords.x, listCoords.y, null, visible, hotspotListMouseDownHandler, 'mousedown');
			hotspotList = Z['HotspotList' + vpIDStr];
			hotD = hotspotList;
			hotS = hotD.style;
			if (position != '0') { Z.ViewerDisplay.appendChild(hotspotList); }
			if (Z.tour) { destinationCurrent = 0; }
			var indexTitleAdjust = (Z.Utils.stringValidate(Z.hotspotListTitle) && Z.hotspotListTitle != 'none') ? 1 : 0;
			hotspotList.selectedIndex = indexTitleAdjust;
		} else {
			Z.Utils.arrayClear(dataProvider);
		}	

		// Next line not required as default selection on hotspot list is title value so no initial
		// view adjustment is needed. Also, handler therefore does not call update view so
		// call to displayHotspotsWithoutMedia is needed on initial load.
		//hotspotListMouseDownHandler();
	}

	// Add item to list unless list item exists, then modify current item. Use +1 in list unless data provider includes no title.
	function addToHotspotChoiceList (text, value) {
		if (hotspotList != null) {
			var index = Z.Utils.arrayIndexOfObjectValue(hotspotListDP, 'value', value);
			if (index != -1) {
				var titleAdjust = (Z.hotspotListTitle != 'none' && Z.tourListTitle != 'none') ? 1 : 0;
				hotspotList.options[index + titleAdjust] = new Option(text, value.toString());
				hotspotListDP[index] = { text:text, value:value };
			} else {
				hotspotList.options[hotspotList.options.length] = new Option(text, value.toString());
				hotspotListDP[hotspotListDP.length] = { text:text, value:value };
			}
		}
	}
	
	function clearHotspotFromChoiceList (intID) {
		if (Z.hotspots) { 
			if (hotspotList != null) {
				var index = Z.Utils.arrayIndexOfObjectValue(hotspotListDP, 'value', intID);
				if (index != -1) {
					hotspotListDP = Z.Utils.arraySplice(hotspotListDP, index, 1);
					Z.Utils.updateSelectElement(hotspotList, hotspotListDP);
					var hLen = hotspotList.length;
					if (hLen != 0) { hotspotList.selectedIndex = (index > hLen - 1) ? hLen - 1 : index; }
				}
			}
		}
	}
	
	function clearAllFromHotspotChoiceList () {
		hotspotList.options.length = 0;
	}

	function clearHotspotFromHTML (intID) {
		var hotspotElmt = document.getElementById('hot' + intID);
		if (hotspotElmt !== null) { hotspotElmt.parentNode.removeChild(hotspotElmt); }
	}

	this.getHotspots = function () {
		return hotspots;
	}

	this.getHotspotsVisibility = function () {
		return (hS.display == 'inline-block');
	}

	this.setHotspotsVisibility = function (visible) {
		// Set visibility of all hotspots (function name is plural).
		hS.display = (visible) ?  'inline-block' : 'none';
		redisplayHotspots();
	}

	this.setHotspotVisibility = function (hotspotElement, visible) {
		// This function operates on hotspot element in display, and records data
		// in hotspot object in hotspots array. This function hides hotspot by hiding 
		// internal contents using nested 'cloak' container. This process uses opacity 
		// rather than visibility to ensure mouse events trigger.
		var cloak = hotspotElement.firstChild;
		if (cloak && cloak.style) {
			cloak.style.visibility = 'visible';

			var hVisibility = (visible) ? 'visible' : 'hidden';
			var hBackColor = (visible) ? '' : '#FFFFFF';
			var hOpacity = (visible) ? 1 : 0.01;

			// Set hotspotElement visibility (opacity).
			// DEV NOTE: Alternative non-IE approach. Fails for non-icon label types.
			// if (!(Z.browser == Z.browsers.IE)) { cloak.style.visibility = hVisibility;  } else {...
			cloak.style.backgroundColor = hBackColor;
			Z.Utils.setOpacity(cloak, hOpacity);
			var caption = hotspotElement.firstChild.childNodes[1];
			if (caption && caption.style) { caption.style.visibility = hVisibility; }
			
			// Record state in hotspot object in array, not display, for reference in drawHotspotInHTML function during redisplay during zoom.
			// If hotspot media is polygon redraw on canvas to show or hide hotspot in html and polygon on canvas.
			// DEV NOTE: Custom property 'visibility' named to not conflict with standard 'visible' property.  
			
			// Get hotspot object ID from hotspot element name.
			var hotspotInternalID = hotspotElement.id.substring(3, hotspotElement.id.length);
			var index = Z.Utils.arrayIndexOfObjectValue(hotspots, 'internalID', hotspotInternalID);
			if (index != -1) {
				var hotspot = hotspots[index];
				hotspot.visibility = visible;
				
				// DEV NOTE: Next line necessary to hide rollover polygons. Watch for speed impact on creating new polygons.
				if (hotspot.media == 'polygon') { redisplayPolygons(true); }
			}
		}
	}

	this.setHotspotsVisibilityByFilter = function (filterBy, filterValue, visible) {
		if (hotspots.length > 0) {
			if (hD && hD.childNodes.length > 0) {
				for (var i = 0, j = hotspots.length; i < j; i++) {
					if (hotspots[i][filterBy] == filterValue) {
						var hotspotTargetID = hotspots[i].internalID;
						var hotspotElement = document.getElementById('hot' + hotspotTargetID);
						if (hotspotElement !== null) { self.setHotspotVisibility(hotspotElement, visible); }
					}
				}
			} else {
				var hotspotsVisibilityByFilterTimer = window.setTimeout( function () { setHotspotsVisibilityByFilter(filterBy, filterValue, visible); }, 100);
			}
		}
		return visible;
	}

	this.setHotspotVisibilityByID = function (id, visible, useInternalID) {
		var idField = (useInternalID) ? 'internalID' : 'id';
		if (hotspots.length > 0) {
			if (hD && hD.childNodes.length > 0) {
				var index = Z.Utils.arrayIndexOfObjectValue(hotspots, idField, id);
				if (index != -1) {
					var hotspotTargetID = hotspots[index].internalID;
					var hotspotElement = document.getElementById('hot' + hotspotTargetID);
					if (hotspotElement != null) { self.setHotspotVisibility(hotspotElement, visible); }
				}
			} else {
				var hotspotsVisibilityByIDTimer = window.setTimeout( function () { setHotspotVisibilityByID(id, visible); }, 100);
			}
		}
	}
	
	function calculateHotspotListCoords (position, listW, viewerW, viewerH) {
		//Hotspot list positioning: 0 hides, 1 top left, 2 top-right, 3 bottom right, 4 bottom left
		var listX, listY;
		var margin = (Z.imageSet) ? 13 : 25;
		switch (position) {
			case '0':
				listX = 0;
				listY = 0;
				break;
			case '1':
				listX = margin;
				listY = margin;
				break;
			case '2':
				listX = viewerW - listW - margin;
				listY = (Z.imageSet) ? 32 : 20; // DEV NOTE: add tests and accomodation for image set choicelist position.
				break;
			case '3':
				listX = viewerW - listW - margin;
				if (toolbar != null) {
					listY = viewerH - margin * 2;
				} else {
					listY = viewerH - margin * 1.5;
				}
				break;
			case '4':
				listX = margin;
				if (toolbar != null) {
					listY = viewerH - margin * 2;
				} else {
					listY = viewerH - margin * 1.5;
				}
				break;
			default:
				listX = viewerW - listW;
				listY = margin;
		}
		return new Z.Utils.Point(listX, listY);
	}

	function hotspotIsValid (hotspot) {
		return (Z.Utils.stringValidate(hotspot.media) || Z.Utils.stringValidate(hotspot.caption) || Z.tourPath !== null);
	}

	function hotspotToString (hotspot) {
		var s = '[Hotspot ';
		s += 'id:' + hotspot.id + ', ';
		s += 'internalID:' + hotspot.internalID.toString() + ', ';
		s += 'name:' + hotspot.name + ', ';
		s += 'mediaType:' + hotspot.mediaType + ', ';
		s += 'media:' + hotspot.media + ', ';
		s += 'x:' + hotspot.x.toString() + ', ';
		s += 'y:' + hotspot.y.toString() + ', ';
		s += 'zoom:' + hotspot.z.toString() + ', ';
		s += 'xScale:' + hotspot.xScale.toString() + ', ';
		s += 'yScale:' + hotspot.yScale.toString() + ', ';
		s += 'clickURL:' + hotspot.clickURL + ', ';
		s += 'urlTarget:' + hotspot.urlTarget + ', ';
		s += 'rollover:' + hotspot.rollover + ', ';
		s += 'caption:' + hotspot.caption + ', ';
		s += 'tooltip:' + hotspot.tooltip;
		s += ']';
		return s;
	}

	// Substitute url of external graphic for Flash library graphic and set tracking variable to enable one-time user alert.
	function validateAnnotationMedia (nodeToValidate) {
		var mediaType = nodeToValidate.getAttribute('MEDIATYPE');
		var media = nodeToValidate.getAttribute('MEDIA');
		if (mediaType == 'symbol') {
			switch (media) {
				case 'circle' :
					media = annotationFolder + '/' + 'circle.png';
					break;
				case 'square' :
					media = annotationFolder + '/' + 'square.png';
					break;
				case 'triangle' :
					media = annotationFolder + '/' + 'triangle.png';
					break;
				case 'arrowDown' :
					media = annotationFolder + '/' + 'arrowDown.png';
					break;
				case 'arrowDownLeft' :
					media = annotationFolder + '/' + 'arrowDownLeft.png';
					break;
				case 'arrowLeft' :
					media = annotationFolder + '/' + 'arrowLeft.png';
					break;
				case 'arrowUpLeft' :
					media = annotationFolder + '/' + 'arrowUpLeft.png';
					break;
				case 'arrowUp' :
					media = annotationFolder + '/' + 'arrowUp.png';
					break;
				case 'arrowUpRight' :
					media = annotationFolder + '/' + 'arrowUpRight.png';
					break;
				case 'arrowRight' :
					media = annotationFolder + '/' + 'arrowRight.png';
					break;
				case 'arrowDownRight' :
					media = annotationFolder + '/' + 'arrowDownRight.png';
					break;
				case 'lineHorizontal' :
					media = annotationFolder + '/' + 'lineHorizontal.png';
					break;
				case 'lineVertical' :
					media = annotationFolder + '/' + 'lineVertical.png';
					break;
				default:
					media = annotationFolder + '/' + 'noSubstitutePlaceholder.png';
			}
			nodeToValidate.setAttribute('MEDIATYPE', 'icon');
			nodeToValidate.setAttribute('MEDIA', media);
			mTypeLegacy = true;
		}
		return nodeToValidate;
	}

	function createAnnotationsXML () {
		var xmlText = '<ZAS></ZAS>';
		var xmlDoc = Z.Utils.xmlConvertTextToDoc(xmlText);
		return xmlDoc;
	}
	
	function createAnnotationsXMLNode (xmlDoc, nodeType) {
		var tempNode;
		switch (nodeType) {
			case 'label' :
				tempNode = xmlDoc.createElement('LABEL');
				tempNode.setAttribute('ID','0');
				tempNode.setAttribute('NAME', Z.Utils.getResource('CONTENT_LABELNAME'));
				tempNode.setAttribute('MEDIATYPE', 'text');
				tempNode.setAttribute('MEDIA', '');
				tempNode.setAttribute('X', 'center');
				tempNode.setAttribute('Y', 'center');
				tempNode.setAttribute('ZOOM', '100');
				tempNode.setAttribute('XSCALE', '100');
				tempNode.setAttribute('YSCALE', '100');
				tempNode.setAttribute('CLICKURL', '');
				tempNode.setAttribute('URLTARGET', '');
				tempNode.setAttribute('ROLLOVER', '0');
				// Do not set default caption value: permitted to have no caption.
				//tempNode.setAttribute('CAPTION', Z.Utils.getResource('CONTENT_LABELCAPTION'));
				tempNode.setAttribute('CAPTION', '');
				// Do not set default comment value: permitted to have no comment.
				//tempNode.setAttribute('COMMENT', Z.Utils.getResource('CONTENT_LABELCOMMENT'));
				tempNode.setAttribute('COMMENT', '');
				tempNode.setAttribute('TOOLTIP', '');
				tempNode.setAttribute('USER', Z.Utils.getResource('CONTENT_LABELUSER'));
				tempNode.setAttribute('DATE', Z.Utils.getCurrentUTCDateAsString());
				tempNode.setAttribute('TEXTCOLOR', Z.Utils.getResource('CONTENT_CAPTIONTEXTCOLOR'));
				tempNode.setAttribute('BACKCOLOR', Z.Utils.getResource('CONTENT_CAPTIONBACKCOLOR'));
				tempNode.setAttribute('LINECOLOR', Z.Utils.getResource('CONTENT_POLYGONLINECOLOR'));
				tempNode.setAttribute('FILLCOLOR', Z.Utils.getResource('CONTENT_POLYGONFILLCOLOR'));
				tempNode.setAttribute('TEXTVISIBLE', Z.Utils.getResource('CONTENT_CAPTIONTEXTVISIBLE'));
				tempNode.setAttribute('BACKVISIBLE', Z.Utils.getResource('CONTENT_CAPTIONBACKVISIBLE'));
				tempNode.setAttribute('LINEVISIBLE', Z.Utils.getResource('CONTENT_POLYGONLINEVISIBLE'));
				tempNode.setAttribute('FILLVISIBLE', Z.Utils.getResource('CONTENT_POLYGONFILLVISIBLE'));
				tempNode.setAttribute('CAPTIONPOSITION', Z.Utils.getResource('CONTENT_CAPTIONPOSITION'));
				tempNode.setAttribute('CATEGORY', '');
				break;
		}
		return tempNode;
	}
	
	function createFirstPOI () {
		var name = Z.Utils.getResource('CONTENT_FIRSTPOINAME');
		createPOIFromParameters('0', name, 'center', 'center', '-1', '0');
		poiPriorID = '0';
	}

	function createPOIFromParameters (id, name, x, y, zoom, internalID) {
		// Receive parameters as array rather than using 'argument' local object to include values even if none passed.
		var poiParams = Z.Utils.arrayToArrayOfStrings( [id, name, x, y, zoom, internalID] );
		var xmlText = '<POI ID="' + poiParams[0]  + '" NAME="' + poiParams[1] + '" X="' + poiParams[2] + '" Y="' + poiParams[3] + '" ZOOM="' + poiParams[4] + '" INTERNALID="' + poiParams[5] + '" ></POI>';
		var xmlDoc = Z.Utils.xmlConvertTextToDoc(xmlText);
		var poiNode = xmlDoc.getElementsByTagName('POI')[0];
		createPOIFromXML(poiNode, true);
	}

	function createPOIFromXML (poiNode, validate) {
		if (validate) { poiNode = validateAnnotationXMLNode(poiNode, 'poi'); }
		var index = Z.Utils.arrayIndexOfObjectValue(poiListDP, 'value', poiNode.getAttribute('INTERNALID'));
		if (index == -1) { index = poiListDP.length; }
		poiListDP[index] = { text:poiNode.getAttribute('NAME'), value:poiNode.getAttribute('INTERNALID'), id:poiNode.getAttribute('ID'), x:poiNode.getAttribute('X'), y:poiNode.getAttribute('Y'), z:poiNode.getAttribute('ZOOM'), user:poiNode.getAttribute('USER'), date:poiNode.getAttribute('DATE') };
	}
	
	// Enables creation of hotspots for polygon control points without creation of label for every control point.
	function updateLabelsForHotspot (hotspot, poiID) {
		if (!(Z.measureVisible && Z.editMode === null)) {
			var index = Z.Utils.arrayIndexOfObjectValue(labelListDP, 'value', hotspotCurrentID);
			if (index != -1) {
				labelListDP[index] = { text:hotspot.name, value:hotspotCurrentID, poiID:poiID };
				var index2 = Z.Utils.arrayIndexOfObjectValue(labelListCurrentDP, 'value', hotspotCurrentID);
				if (index2 != -1) {
					labelListCurrentDP[index2] = { text:hotspot.name, value:hotspotCurrentID, poiID:poiID };
					if (self.getStatus('XMLParsed')) { Z.Utils.updateSelectElement(labelList, labelListCurrentDP); }
				}
			} else {	
				labelListDP[labelListDP.length] = { text:hotspot.name, value:hotspotCurrentID, poiID:poiID };
				labelListCurrentDP[labelListCurrentDP.length] = { text:hotspot.name, value:hotspotCurrentID, poiID:poiID };
			}

			if (self.getStatus('XMLParsed') && labelList) {
				var newLabel = labelListDP[labelListDP.length - 1];
				populateLabels(newLabel.poiID, newLabel.value);
			}
		}
	}

	function validateAnnotationXMLNode (xmlNode, nodeType) {
		var idFree, labelMode;
		
		// Ensure xmlNode meets requirements for nodeType.
		switch (nodeType) {
			case 'hotspot' :
				idFree = (hotspotList) ? getFreeID('hotspot') : getFreeID('label');
				labelMode = (Z.Utils.stringValidate(Z.labelMode)) ? Z.labelMode : '';
				if (!Z.Utils.stringValidate(xmlNode.getAttribute('ID'))) { xmlNode.setAttribute('ID', idFree); }
				var defaultName = (hotspotList) ? Z.Utils.getResource('CONTENT_HOTSPOTNAME') : Z.Utils.getResource('CONTENT_LABELNAME');
				if (!Z.Utils.stringValidate(xmlNode.getAttribute('NAME'))) { xmlNode.setAttribute('NAME', defaultName + idFree + ': ' + labelMode); }
				var defaultCaption = (hotspotList) ? Z.Utils.getResource('CONTENT_HOTSPOTCAPTION'): Z.Utils.getResource('CONTENT_LABELCAPTION');
				if (!Z.Utils.stringValidate(xmlNode.getAttribute('CAPTION')) && Z.editMode != 'freehand' && !Z.tourPath && !Z.Utils.stringValidate(xmlNode.getAttribute('MEDIA')) && !(Z.Utils.stringValidate(xmlNode.getAttribute('MEDIA') && xmlNode.getAttribute('MEDIA') == 'polygon'))) { xmlNode.setAttribute('CAPTION', defaultCaption + idFree); }
				
				// Apply custom unescape here for hotspots. Labels handled in function loadAnnotationLabelNode due to more detailed processing on load.
				xmlNode.setAttribute('NAME', Z.Utils.xmlUnescapeMinimal(unescape(xmlNode.getAttribute('NAME'))));
				xmlNode.setAttribute('CAPTION', Z.Utils.xmlUnescapeMinimal(unescape(xmlNode.getAttribute('CAPTION'))));
				
				if (!Z.Utils.stringValidate(xmlNode.getAttribute('X'))) { xmlNode.setAttribute('X', Z.imageX.toString()); }
				if (!Z.Utils.stringValidate(xmlNode.getAttribute('Y'))) { xmlNode.setAttribute('Y', Z.imageY.toString()); }
				if (!Z.Utils.stringValidate(xmlNode.getAttribute('ZOOM'))) { xmlNode.setAttribute('ZOOM', (Z.imageZ * 100).toString()); }
				// Ensure backward compatibility with prior node name, changed to avoid mistaking attribute with MEDIA attribute (a URL depending on label MEDIATYPE).
				if (!Z.Utils.stringValidate(xmlNode.getAttribute('CLICKURL')) && Z.Utils.stringValidate(xmlNode.getAttribute('URL'))) { xmlNode.setAttribute('CLICKURL', xmlNode.getAttribute('URL')); }
				if (isNaN(parseInt(xmlNode.getAttribute('INTERNALID'), 10))) { xmlNode.setAttribute('INTERNALID', idFree); }
				var mediaType = xmlNode.getAttribute('MEDIATYPE');
				if (!(!Z.Utils.stringValidate(xmlNode.getAttribute('TEXTCOLOR')) || !Z.Utils.stringValidate(xmlNode.getAttribute('BACKCOLOR')))) {
					Z.captionsColorsDefault = false;
				}
				if ((Z.captionBoxes || mediaType == 'measure') && Z.captionsColorsDefault) {
					xmlNode.setAttribute('TEXTCOLOR', Z.Utils.getResource('CONTENT_CAPTIONTEXTCOLOR'));
					xmlNode.setAttribute('BACKCOLOR', Z.Utils.getResource('CONTENT_CAPTIONBACKCOLOR'));
				}
				break;
			case 'poi' :
				idFree = getFreeID('poi');
				if (!Z.Utils.stringValidate(xmlNode.getAttribute('ID'))) { xmlNode.setAttribute('ID', idFree); }
				if (!Z.Utils.stringValidate(xmlNode.getAttribute('NAME'))) { xmlNode.setAttribute('NAME', Z.Utils.getResource('CONTENT_POINAME') + idFree); }
				if (!Z.Utils.stringValidate(xmlNode.getAttribute('X'))) { xmlNode.setAttribute('X', Z.imageX.toString()); }
				if (!Z.Utils.stringValidate(xmlNode.getAttribute('Y'))) { xmlNode.setAttribute('Y', Z.imageY.toString()); }
				if (!Z.Utils.stringValidate(xmlNode.getAttribute('ZOOM'))) { xmlNode.setAttribute('ZOOM', (Z.imageZ * 100).toString()); }
				if (isNaN(parseInt(xmlNode.getAttribute('INTERNALID'), 10))) { xmlNode.setAttribute('INTERNALID', idFree); }
				break;
			case 'label' :
				idFree = getFreeID('label');
				labelMode = (Z.Utils.stringValidate(Z.labelMode)) ? Z.labelMode : '';
				if (!Z.Utils.stringValidate(xmlNode.getAttribute('ID'))) { xmlNode.setAttribute('ID', idFree); }
				if (!Z.Utils.stringValidate(xmlNode.getAttribute('NAME'))) { xmlNode.setAttribute('NAME', Z.Utils.getResource('CONTENT_LABELNAME') + idFree + ': ' + labelMode); }
				var mediaType = xmlNode.getAttribute('MEDIATYPE');
				var media = xmlNode.getAttribute('MEDIA');
				if (!Z.Utils.stringValidate(media) && mediaType != 'text') { 
					xmlNode.setAttribute('MEDIA', annotationFolder + '/' + Z.Utils.getResource('DEFAULT_ANNOTATIONMEDIA'));
					xmlNode.setAttribute('MEDIATYPE', Z.Utils.getResource('DEFAULT_ANNOTATIONMEDIATYPE'));
				}
				if (!(!Z.Utils.stringValidate(xmlNode.getAttribute('TEXTCOLOR')) || !Z.Utils.stringValidate(xmlNode.getAttribute('BACKCOLOR')))) {
					Z.captionsColorsDefault = false;
				}
				if ((Z.captionBoxes || mediaType == 'measure') && Z.captionsColorsDefault) {
					xmlNode.setAttribute('TEXTCOLOR', Z.Utils.getResource('CONTENT_CAPTIONTEXTCOLOR'));
					xmlNode.setAttribute('BACKCOLOR', Z.Utils.getResource('CONTENT_CAPTIONBACKCOLOR'));
				}
				if (!Z.Utils.stringValidate(xmlNode.getAttribute('CAPTION'))) { xmlNode.setAttribute('CAPTION', Z.Utils.getResource('CONTENT_LABELCAPTION') + idFree); }
				// Ensure backward compatibility with prior node name, changed to avoid mistaking attribute with MEDIA attribute (a URL depending on label MEDIATYPE).
				if (!Z.Utils.stringValidate(xmlNode.getAttribute('CLICKURL')) && Z.Utils.stringValidate(xmlNode.getAttribute('URL'))) { xmlNode.setAttribute('CLICKURL', xmlNode.getAttribute('URL')); }
				if (!Z.Utils.stringValidate(xmlNode.getAttribute('X'))) { xmlNode.setAttribute('X', Z.imageX.toString()); }
				if (!Z.Utils.stringValidate(xmlNode.getAttribute('Y'))) { xmlNode.setAttribute('Y', Z.imageY.toString()); }
				if (!Z.Utils.stringValidate(xmlNode.getAttribute('ZOOM'))) { xmlNode.setAttribute('ZOOM', (Z.imageZ * 100).toString()); }
				if (isNaN(parseInt(xmlNode.getAttribute('INTERNALID'), 10))) { xmlNode.setAttribute('INTERNALID', idFree); }
				if (isNaN(parseInt(xmlNode.getAttribute('POIID'), 10))) { xmlNode.setAttribute('POIID', poiList.options[poiList.selectedIndex].value); }
				break;
		}
		return xmlNode;
	}

	function sortAnnotationAssocArrayByField (objA, objB) {
		var result = 0;
		var stringA = '', stringB = '';
		if (Z.annotationSort != 'none') {
			switch (Z.annotationSort) {
				case 'id':
					stringA = objA.value.toLowerCase();
					stringB = objB.value.toLowerCase();
					break;
				case 'name':
					stringA = objA.text.toLowerCase();
					stringB = objB.text.toLowerCase();
					break;
			}			
			if (stringA < stringB) {
				result = -1;
			} else if (stringA > stringB) {
				result = 1;
			}
		}
		
		// Debug option:
		//console.log(objA);
		//console.log(objB);
		
		return result;
	}

	function getFreeID (idTarget) {
		// DEV NOTE: Conditions on each case are workaround for Safari issue - unexpected access to irrelevant cases: "TypeError: 'undefined' is not an object (evaluating 'labelListDP.length')".
		var id = 0;
		var idList = []
		switch(idTarget) {
			case 'slide' :
				if (slides) { for (var i = 0, j = slides.length; i < j; i++) { idList[idList.length] = parseInt(slides[i].internalID, 10); } }
				break;
			case 'hotspot' :
				if (hotspots) { for (var i = 0, j = hotspots.length; i < j; i++) { idList[idList.length] = parseInt(hotspots[i].internalID, 10); } }
				break;
			case 'poi' :
				if (poiListDP) { for (var i = 0, j = poiListDP.length; i < j; i++) { idList[idList.length] = parseInt(poiListDP[i].value, 10); } }
				break;
			case 'label' :
				if (labelListDP) { for (var i = 0, j = labelListDP.length; i < j; i++) { idList[idList.length] = parseInt(labelListDP[i].value, 10); } }
				break;
			case 'labelExternal':
				if (hotspots) { for (var i = 0, j = hotspots.length; i < j; i++) { idList[idList.length] = parseInt(hotspots[i].id, 10); } }
				break;
			case 'note' :
				if (noteListDP) { for (var i = 0, j = noteListDP.length; i < j; i++) { idList[idList.length] = parseInt(noteListDP[i].value, 10); } }
				break;
		}
		if (idList.length > 0) { 
			idList = Z.Utils.arraySortNumericAscending(idList);
			id = idList[idList.length - 1] + 1;
		}
		
		// Alternative implementation: use ID values from gaps in sorted ID values.
		/* for (var i = 0, j = idList.length; i < j; i++) {
			if (idList[i] != id) {
				i = j;
			} else {
				id++;
			}
		}*/
		
		return id.toString();
	}



	//::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::
	//::::::::::::::::::::::: HOTSPOT & ANNOTATION EVENT FUNCTIONS ::::::::::::::::::::
	//::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::

	function hotspotMouseOverHandler (event) {
		var event = Z.Utils.event(event);
		if (event) {
			var target = Z.Utils.target(event);
			var relatedTarget = Z.Utils.relatedTarget(event);
			var hotTarget = getHotspotTarget(target);
			
			// Reset visibility if mouse is not: moving from polygon, not from display, into nested caption or from caption into polygon, not into display. 
			if (hotTarget !== null && (relatedTarget !== null && !(relatedTarget.id == 'captionTextBox' && target.id.indexOf('hot') != -1 && target.id.indexOf('hotspotDisplay') == -1) && !(target.id == 'captionTextBox' && relatedTarget.id.indexOf('hot') != -1 && relatedTarget.id.indexOf('hotspotDisplay') == -1))) { 
				self.setHotspotVisibility(hotTarget, true);
			}
		}
	}
	
	// DEV NOTE: This event handler currently assigned to hotspot cloak not hotspot container and only used to 
	// disable click-zoom-and-pan effect to ensure it does not conflict with click url effect.  Alternative to href 
	// click effect implementation. See notes above commented handlers in drawHotspotInHTML function.
	function hotspotMouseDownHandler (event) {
		var event = Z.Utils.event(event);
		if (event) { Z.clickZoomAndPanBlock = true; }
	}

	// DEV NOTE: Alternative to href click effect implementation. See notes above commented handlers in drawHotspotInHTML function.
	// If using mouse down handler may need to track distance and/or time to verify click of hotspot is not click-drag of image.
	//function hotspotMouseUpHandler (event) {
	//}

	function hotspotMouseOutHandler (event) {
		var event = Z.Utils.event(event);
		if (event) {
			var target = Z.Utils.target(event);
			var relatedTarget = Z.Utils.relatedTarget(event);
			var hotTarget = getHotspotTarget(target);
			
			// Reset visibility if mouse is not: moving from polygon, not from display, into nested caption or from caption into polygon, not into display. 
			if (hotTarget !== null && (relatedTarget !== null && !(relatedTarget.id == 'captionTextBox' && target.id.indexOf('hot') != -1 && target.id.indexOf('hotspotDisplay') == -1) && !(target.id == 'captionTextBox' && relatedTarget.id.indexOf('hot') != -1 && relatedTarget.id.indexOf('hotspotDisplay') == -1))) { 
				self.setHotspotVisibility(hotTarget, false);
			}
		}
	}

	// DEV NOTE: This event handler currently assigned to hotspot cloak not hotspot container and only used to 
	// disable click-zoom-and-pan effect to ensure it does not conflict with click url effect.  Alternative to href 
	// click effect implementation. See notes above commented handlers in drawHotspotInHTML function.
	function hotspotTouchStartHandler (event) {
		var event = Z.Utils.event(event);
		if (event) { 
			// DEV NOTE: Next line currently not called. Investigating if needed to prevent delay and simulated mouse events, however it may block hotspot click event for clickURL effect on iOS in Safari.
			//event.preventDefault();
			Z.clickZoomAndPanBlock = true;
		}
	}

	// DEV NOTE: Alternative to href click effect implementation. See notes above commented handlers in drawHotspotInHTML function.
	// If using mouse down handler may need to track distance and/or time to verify click of hotspot is not click-drag of image.
	// Currently not called. Investigating if needed to prevent delay and simulated mouse events, however it may block hotspot click event for clickURL effect on iOS in Safari.
	/*function hotspotTouchEndHandler (event) {
		var event = Z.Utils.event(event);
		if (event) { event.preventDefault(); }
	}*/

	// DEV NOTE: Alternative to href click effect implementation. See notes above commented handlers in drawHotspotInHTML function.
	// If using mouse down handler may need to track distance and/or time to verify click of hotspot is not click-drag of image.
	// Currently not called. Investigating if needed to prevent delay and simulated mouse events, however it may block hotspot click event for clickURL effect on iOS in Safari.
	/*function hotspotTouchCancelHandler (event) {
		var event = Z.Utils.event(event);
		if (event) { event.preventDefault(); }
	}*/
	
	// This event handler assigned to hotspot cloak not hotspot container and is only used to show message regarding disabled click url effect in edit mode.
	function hotspotEditMouseDownHandler (event) {
		var event = Z.Utils.event(event);
		if (event) {
			if (!event.altKey) {
				var target = Z.Utils.target(event);
				var hotTarget = getHotspotTarget(target);
				var hotspotInternalID = hotTarget.id.substring(3, hotTarget.id.length);
				var index = Z.Utils.arrayIndexOfObjectValue(hotspots, 'internalID', hotspotInternalID);
				if (index != -1) { var clickURL = hotspots[index].clickURL; }
				var message = Z.Utils.getResource('ALERT_HOTSPOTCLICKURLDISABLED');
				Z.Utils.showMessage(message, true, null, 'center', true);
			
				// Alternative implementation:
				//var message = Z.Utils.getResource('ALERT_HOTSPOTCLICKURLDISABLED') + clickURL;
				//var messageDuration = parseInt(Z.Utils.getResource('ALERT_HOWTOEDITMESSAGEDURATION'), 10);
				//Z.Utils.showMessage(message, true, messageDuration, 'center');
			}
		}		
	}
	
	// This event handler assigned to hotspot cloak not hotspot container and is only used to show message regarding disabled click url effect in edit mode.
	function hotspotEditTouchStartHandler (event) {
		var event = Z.Utils.event(event);
		if (event) {
			if (!event.altKey) {
				var target = Z.Utils.target(event);
				var hotTarget = getHotspotTarget(target);
				var hotspotInternalID = hotTarget.id.substring(3, hotTarget.id.length);
				var index = Z.Utils.arrayIndexOfObjectValue(hotspots, 'internalID', hotspotInternalID);
				if (index != -1) { var clickURL = hotspots[index].clickURL; }
				var message = Z.Utils.getResource('ALERT_HOTSPOTCLICKURLDISABLED');
				Z.Utils.showMessage(message, true, null, 'center', true);
			}
		}		
	}

	function executeExternalFunction () {
		// Get relevant hotspot HTML click target: for hotspots require this.parentNode, for labels simply this.
		var hotTarget = Z.Viewport.getHotspotTarget(this);
		
		// Get related element in hotspots objects array.
		var hotspotInternalID = hotTarget.id.substring(3, hotTarget.id.length);
		var index = Z.Utils.arrayIndexOfObjectValue(hotspots, 'internalID', hotspotInternalID);
		
		// Get element function value.
		if (index != -1) {
			var externalFunctionString = unescape(hotspots[index].urlTarget);
			var externalFunction = new Function(externalFunctionString);
			var externalFxnCallTimer = window.setTimeout(externalFunction, 200);
		}				
	}

	function hotspotListMouseDownHandler (event) {
		Z.Utils.removeEventListener(hotspotList, 'mousedown', hotspotListMouseDownHandler);
		if (Z.hotspotListTitle && Z.Utils.stringValidate(Z.hotspotListTitle) && Z.hotspotListTitle != 'none') {
			hotspotList.selectedIndex = 0;
		} else {
			// Add placeholder text to avoid blank list first element while selected item is unset to allow reselection of any item.
			var listTitleTemp = Z.Utils.getResource('UI_LISTMOUSEDOWNTEXT');
			if (hotspotList.options[0].text != listTitleTemp) {
				var option = document.createElement("option");
				option.text = listTitleTemp;
				option.value = null;
				hotspotList.add( option, 0);
			}
			hotspotList.selectedIndex = 0;
			
			// Alternative implementation: do not insert placeholder text. First list row blank when list open.
			//hotspotList.selectedIndex = -1;
		}
		Z.Utils.addEventListener(hotspotList, 'change', hotspotListChangeHandler);
	}
	
	function hotspotListChangeHandler (event) {
		var event = Z.Utils.event(event);
		if (event) {
			if (Z.tourPlaying) { self.tourStop(); }
			var target = Z.Utils.target(event);
			var hotspotInternalID = target.options[target.selectedIndex].value;

			if (!isNaN(parseInt(hotspotInternalID), 10)) {
				var index = Z.Utils.arrayIndexOfObjectValue(hotspots, 'internalID', hotspotInternalID);
				if (index != -1 ) { 
					var hotspot = hotspots[index];
					Z.Utils.playAudio(destinationNextAudio, hotspot.audio);
					self.zoomAndPanToView(hotspot.x, hotspot.y, (hotspot.z / 100), hotspot.rotation);
				}
			}
			
			Z.Utils.removeEventListener(hotspotList, 'change', hotspotListChangeHandler);
			var listTimer = window.setTimeout( function () { Z.Utils.addEventListener(hotspotList, 'mousedown', hotspotListMouseDownHandler); }, 10);
			
			//Debug options: Hotspot API features can be tested here, using hotspots choicelist change handler.
			//self.createHotspotFromParameters('200', 'Test', 'icon', 'Assets/Hotspots/hotspotFromJPG.jpg', null, '250', '250', '100', '100','100', 'http://www.zoomify.com', '_self', 'false', 'Test Caption', 'This is a test tooltip.');
			//self.setHotspotsVisibilityByFilter('name', 'Hotspot Without Click Link', false);
			//self.setHotspotVisibilityByID('3', false);
		}
	}
	
	function populatePOIs (poiID, labelID, noteID) {		
		poiListDP.sort(sortAnnotationAssocArrayByField);
		Z.Utils.updateSelectElement(poiList, poiListDP, poiID);
		if (typeof poiID === 'undefined' || poiID === null) {
			if (poiList.options.length == 0) { createFirstPOI(); }
			poiID = '0';
		} else {
			var index = Z.Utils.arrayIndexOfObjectValue(poiListDP, 'value', poiID);
			if (index != -1) { poiID = poiListDP[index].value; }
		}
		populateCurrentPOIDetails(poiID);
		populateLabels(poiID, labelID);
	}
	
	function populateCurrentPOIDetails (poiID) {
		var vpIDStr = viewportID.toString();
		var index = Z.Utils.arrayIndexOfObjectValue(poiListDP, 'value', poiID);
		var poiNameTE = document.getElementById('poiNameTextElement' + vpIDStr);
		if (poiNameTE && index != -1) { poiNameTE.value = poiListDP[index].text; }
	}
	
	function populateLabels (poiID, labelID) {		
		labelListDP.sort(sortAnnotationAssocArrayByField);
		if (Z.editMode == 'markup') {
			labelListCurrentDP = Z.Utils.arrayClone('labels', labelListDP, labelListCurrentDP);
		} else {
			labelListCurrentDP = filterListByPOIID(labelListDP, poiID); 
		}
		Z.Utils.updateSelectElement(labelList, labelListCurrentDP, labelID);
		if (typeof labelID === 'undefined' || labelID === null) {
			labelID = (labelList.options.length > 0) ? labelList.options[0].value : null;
		}
		populateCurrentLabelDetails(labelID);
	}
	
	function populateCurrentLabelDetails (labelID) {
		var vpIDStr = viewportID.toString();
		// Set current hotspot tracking variable for editing use.
		hotspotCurrentID = labelID;
		polygonCurrentPts = null;
		controlPointCurrent = null;			
		polygonComplete = true;
		var index = Z.Utils.arrayIndexOfObjectValue(hotspots, 'internalID', hotspotCurrentID);
		hotspotCurrent = (index != -1) ? hotspots[index] : null;
		
		if (commentVisibility) {
			var commentTE = document.getElementById('commentTextElement' + vpIDStr);
			if (commentTE) {
				commentTE.value = '';
				if (hotspotCurrent !== null) {
					var comVal = hotspotCurrent.comment;
					if (comVal !== null && Z.Utils.stringValidate(comVal)) {
						var comUnesc = comVal;
						commentTE.value = comUnesc;
					}
				}
			}
		}
		
		if (Z.editMode !== null) {
			var labelNameTE = document.getElementById('labelNameTextElement' + vpIDStr);					
			if (labelNameTE) { labelNameTE.value = (hotspotCurrent !== null) ? hotspotCurrent.name : ''; }
			var captionTE = document.getElementById('captionTextElement' + vpIDStr);
			if (captionTE) {
				captionTE.value = '';
				if (hotspotCurrent !== null) {
					var captionHTML = hotspotCurrent.captionHTML;					
					if (typeof captionHTML === 'undefined' || !Z.Utils.stringValidate(captionHTML)) {
						// Unescape text content to support apostrophes, new lines, etc.
						captionTE.value = hotspotCurrent.caption;
					} else { 
						// Do not unescape HTML content to display as HTML in edit field.
						captionTE.value = captionHTML;
					}
				}
			}
			
			if (Z.editMode != 'markup') {
				var iconList = document.getElementById('labelIconList' + vpIDStr);
				var tooltipTE = document.getElementById('tooltipTextElement' + vpIDStr);
				var cuTE = document.getElementById('clickURLTextElement' + vpIDStr);
				var capPosList = document.getElementById('labelCaptionPositionList' + vpIDStr);
				var targetList = document.getElementById('labelTargetList' + vpIDStr);
				var rolloverCB = document.getElementById('checkboxRollover' + vpIDStr);

				if (iconList && tooltipTE && cuTE && capPosList && targetList && rolloverCB) {
					iconList.selectedIndex = 0;
					tooltipTE.value = '';
					cuTE.value = '';
					capPosList.selectedIndex = 0;
					targetList.selectedIndex = 0;
					rolloverCB.checked = false;

					if (hotspotCurrent !== null) {
						// Select icon list item to match label media if label mediaType is icon. In non-markup 
						// mode this presets list to show correct item if icon edit mode button is clicked.
						if (hotspotCurrent.mediaType == 'icon') {
							var iconMedia = hotspotCurrent.media;
							var start = iconMedia.lastIndexOf('/') + 1;
							var end = iconMedia.lastIndexOf('.');
							if (start != -1 && end != -1) {
								var iconType = iconMedia.substring(start, end).toLowerCase();
								var index = Z.Utils.arrayIndexOfObjectValueSubstring(iconList, 'value', iconType, null, true);
								if (index != -1) { iconList.selectedIndex = index; }
							}
						}
							
						// Set caption position list.
						var capPos = hotspotCurrent.captionPosition;
						if (Z.Utils.stringValidate(capPos)) {
							var index = Z.Utils.arrayIndexOfObjectValue(capPosList, 'value', capPos);
							if (index != -1) { capPosList.selectedIndex = index; }
						}

						// Set tooltip, and url text values.
						var tooltipHTML = hotspotCurrent.tooltipHTML;
						if (typeof tooltipHTML === 'undefined' || !Z.Utils.stringValidate(tooltipHTML)) {
							tooltipTE.value = hotspotCurrent.tooltip;
						} else { 
							tooltipTE.value = tooltipHTML;
						}					
						
						// Set click-url.
						var clickURL = hotspotCurrent.clickURL;
						if (Z.Utils.stringValidate(clickURL)) {
							cuTE.value = clickURL;
						}

						// Set click-url target list.
						var urlTarget = hotspotCurrent.urlTarget;
						if (Z.Utils.stringValidate(urlTarget)) {
							var index = Z.Utils.arrayIndexOfObjectValue(targetList, 'value', urlTarget);
							if (index != -1) { targetList.selectedIndex = index; }
						}

						// Set rollover checkbox.
						rolloverCB.checked = (hotspotCurrent.rollover == true);
					}
				}			
			}
		}
		
		if (hotspotCurrentID != labelPriorID) {
			// Debug option: Z.setCallback('currentLabelChangedGetID', function (param1, param2) { alert('id: ' + param1 + ', internalID: ' + param2); } );
			if (Z.Viewer.getStatus('ready')) { Z.Utils.validateCallback('currentLabelChangedGetID'); }
		}
		
		if (!hotspotDragging) {
			redisplayHotspots();
		} else {
			redisplayPolygons();
		}
	}
	
	this.getCurrentLabel = function () {
		return hotspotCurrent;
	}
	
	this.setCurrentLabel = function (labelID, useInternalID) {
		if (useInternalID) {
			var index = Z.Utils.arrayIndexOfObjectValue(hotspots, 'internalID', labelID);
		} else {
			var index = Z.Utils.arrayIndexOfObjectValue(hotspots, 'id', labelID);		
		}
		if (index != -1) {
			hotspotCurrent = hotspots[index];
			hotspotCurrentID = hotspotCurrent.internalID;
			redisplayHotspots();
		}
	}

	function filterListByPOIID (dependentArray, poiID) {
		var outputArray = [];
		for (var i = 0, j = dependentArray.length; i < j; i++) {
			if (dependentArray[i].poiID == poiID) {
				outputArray[outputArray.length] = dependentArray[i];
			}
		}
		return outputArray;
	}



	//::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::
	//:::::::::::::::::::::::::::: HOTSPOT POLYGON FUNCTIONS ::::::::::::::::::::::::::::::
	//::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::

	// Draw polygon on drawing canvas unless is polygon of current hotspot and it is
	// it is currently being edited, in which case, draw on editing canvas.
	function drawPolygonOnCanvas (hotspot, clickPt, rollover, mask, saving, saveAll, counter) {
		if (Z.useCanvas && (hotspot.media == 'polygon' || mask)) {
			if (hotspot.visibility || hotspot.rollover || rollover) {
				var hotspotInternalID = hotspot.internalID;
				
				if ((typeof hotspot.polygonPts !== 'undefined' && hotspot.polygonPts !== null && hotspot.polygonPts.length > 0) || mask) {
					// Select canvas to draw on.
					var targetCtx;
					if (mask) {
						targetCtx = mCtx;	
					} else if ((Z.labelMode == 'view' || hotspotInternalID !== hotspotCurrentID) && !saving) {
						targetCtx = dCtx;
					} else if (saving) {
						targetCtx = sCtx;
					} else {
						targetCtx = eCtx;
					}

					// Record scale and translation state to return to after temporary changes.
					targetCtx.save();

					// Temporarily change center point of canvas. Use stored zoom value to adjust only for panning, not scaling.
					var panOffsetX = (saveAll) ? Z.imageW / 2 : Z.imageX;
					var panOffsetY = (saveAll) ? Z.imageH / 2 : Z.imageY;
					targetCtx.translate((hotspot.x - panOffsetX) * Z.imageZ, (hotspot.y - panOffsetY) * Z.imageZ);
										
					// Temporarily change scale of canvas to implement scaling of polygon set of control points (vertices).
					var scaleDelta = tierScale / tierScalePrior;
					var zVal = self.getZoom();
					var scaleVal = ((hotspot.xScale + hotspot.yScale) / 2) / 100;
					
					// Calculate scaled dimensions. 
					var polyScaleX = (hotspot.xScale / 100) / scaleDelta * zVal;
					var polyScaleY = (hotspot.yScale / 100) / scaleDelta * zVal;
					if (polyScaleX != 1 && polyScaleY != 1) {
						targetCtx.scale(polyScaleX, polyScaleY);
					}
					
					// Temporarily change polygon line style. Scale freehand and other polygon line widths to offset zoom and maintain visibility in large images.
					if (mask) {
						targetCtx.lineWidth = 0.000001;
					} else if (hotspot.mediaType == 'freehand') {
						targetCtx.lineWidth = polygonLineWFreehand / zVal;
					} else {
						targetCtx.lineWidth = (hotspot.lineVisible) ? polygonLineW / zVal / scaleVal : 0;
						targetCtx.fillStyle = hotspot.fillColor;
					}
					targetCtx.strokeStyle = hotspot.lineColor;

					// Draw polygon on canvas or draw circle on mask.
					var x = hotspot.x;
					var y = hotspot.y;
					targetCtx.beginPath();
					
					if (hotspot.polygonPts) {
						var tPolyPts = hotspot.polygonPts.slice(0);
					
						// Add mouse position as additional control point if measuring.
						if (Z.labelMode == 'measure' && !hotspot.polyClosed && !polygonComplete && typeof clickPt !== 'undefined' && clickPt !== null) {
							tPolyPts[tPolyPts.length] = { x:clickPt.x, y:clickPt.y };
						}
					
						// Draw polygon lines.
						var firstPolyPtX = tPolyPts[0].x - x;
						var firstPolyPtY = tPolyPts[0].y - y;
						targetCtx.moveTo(firstPolyPtX, firstPolyPtY);
						for (var i = 1, j = tPolyPts.length; i < j; i++) {
							var polyPtX = tPolyPts[i].x - x;
							var polyPtY = tPolyPts[i].y - y;
							targetCtx.lineTo(polyPtX, polyPtY);
						}

						// Close polygon and draw fill.
						if (hotspot.mediaType != 'freehand' && (hotspot.polyClosed || (Z.mouseIsDown && controlPointCurrent == 0))) {
							if (hotspot.polyClosed) {
								targetCtx.lineTo(firstPolyPtX, firstPolyPtY);
								targetCtx.closePath();
							}
							if (!mask && hotspot.fillVisible && (hotspot.polyClosed || hotspotInternalID != hotspotCurrentID)) {
								targetCtx.globalAlpha = polygonOpacity;
								targetCtx.fill();
							}
							targetCtx.globalAlpha = 1;
						}
						
					} else {
						// Draw circle if masking and hotspot is not of polygon type. Use 0,0 because mask canvas translated above to hotspot coordinates.
						var w = hotspot.iW * (100 / hotspot.z);
						var h = hotspot.iH * (100 / hotspot.z);
						var x = 0;
						var y = (hotspot.media.indexOf('triangle') == -1) ? 0 : (hotspot.iH * 0.23);
						var maskMargin = 1.2;
						var radius = Math.max(w, h) / 2 * maskMargin;
						targetCtx.arc(x, y, radius, 0, 2 * Math.PI); 
					}
					
					targetCtx.stroke();
					
					// Draw polygon control points.
					if (!mask && ((Z.editMode === null && Z.labelMode == 'measure') || Z.editing == 'addLabel' || Z.editing == 'editLabel') && ((Z.labelMode == 'rectangle' && tPolyPts.length == 4) || Z.labelMode == 'polygon' || Z.labelMode == 'measure') && hotspot.internalID == hotspotCurrentID && (typeof hotspot !== 'undefined' && hotspot !== null && hotspot.mediaType != 'freehand')) {
						var scaleOffset = 1 / zVal / scaleVal;
						for (var i = 0, j = tPolyPts.length; i < j; i++) {
							var polyPtX = tPolyPts[i].x - x;
							var polyPtY = tPolyPts[i].y - y;
							drawControlPoint(polyPtX, polyPtY, (!polygonComplete && i == 0), scaleOffset);
						}
					}

					// Undo temporary changes to canvas scale and center point to reset canvas
					// to base scale before scaling & drawing other polygons, tiles, etc.
					targetCtx.restore();
				}
				
				// Draw polygon caption. DEV NOTE: condition enables caption hiding when rollover polygon is hidden on mouseout.
				if (saving) {
					var hC = new HotspotContext();
					drawCaptionOnCanvas(hotspot, hC, clickPt, null, null, true, saveAll);				
				} else if (Z.mouseIsDown && (!(mask && hotspot.media != 'polygon') && hotspotInternalID !== null && typeof clickPt !== 'undefined' && !hotspotDragging)) {
					captionPolygon(hotspotInternalID, clickPt, saving, saveAll);
				}
			}
					
			// Execute callback to save image file if all labels drawn on canvas.
			if (saving) { validateDrawLabelCount(); }
			
		} else {
			if (!polygonsRequireCanvasAlertShown) {
				Z.Utils.showMessage(Z.Utils.getResource('ALERT_POLYGONSREQUIRECANVAS'));
				polygonsRequireCanvasAlertShown = true;
			}
		}
	}

	function drawControlPoint (x, y, firstCtrlPt, scaleOffset) {
		var ctrlPtRadiusUnscaled = ctrlPtRadius * scaleOffset;
		eCtx.lineWidth = ctrlPtLineW * scaleOffset;		
		eCtx.strokeStyle = ctrlPtStrokeColor;
		eCtx.fillStyle = (firstCtrlPt) ? firstCtrlPtFillColor : stdCtrlPtFillColor;
		eCtx.beginPath();
		eCtx.arc(x, y, ctrlPtRadiusUnscaled, 0, Math.PI * 2, false);
		eCtx.closePath();
		eCtx.globalAlpha = 0.5;
		eCtx.fill();
		eCtx.globalAlpha = 1;
		eCtx.stroke();
	}

	function drawPolygonBungeeLine (mPtX, mPtY, clickPt) {
		Z.Utils.clearDisplay(eD);
		var hotspotCurrentIndex = Z.Utils.arrayIndexOfObjectValue(hotspots, 'internalID', hotspotCurrentID);
		if (hotspotCurrentIndex != -1) {
			var hotspot = hotspots[hotspotCurrentIndex];
			drawPolygonOnCanvas(hotspot);
			
			// Draw bungee line.
			var zVal = self.getZoom();
			var polyPts = hotspot.polygonPts;			
 			if (polyPts) {
				var polyPtsLast = polyPts[polyPts.length-1];
				var polyPtX = (polyPtsLast.x - Z.imageX) * zVal;
				var polyPtY = (polyPtsLast.y - Z.imageY) * zVal;
				if (!hotspot.polyClosed) {
					eCtx.lineWidth = polygonLineW;
					eCtx.strokeStyle = lineStrokeColor;
					eCtx.beginPath();
					eCtx.moveTo(polyPtX, polyPtY);
					eCtx.lineTo(mPtX, mPtY);
					eCtx.closePath();
					eCtx.stroke();
				}
			}
					
			if ((Z.labelMode == 'polygon' || Z.labelMode == 'measure') && hotspotCurrentID !== null) {
				captionPolygon(hotspotCurrentID, clickPt);
			}
		}
	}

	function redisplayPolygons (rollover) {
		// First clear polygons previously drawn.
		if (dD) { Z.Utils.clearDisplay(dD); }
		if (eD) { Z.Utils.clearDisplay(eD); }
		
		// Redraw polygons in view if hotspots (label display layer) not hidden by call to function setHotspotsVisibility.
		// Add polygonViewBuffer to ensure polygons partially in view are displayed.
		// If zHotspotsDrawOnlyInView parameter set to false, draw all polygons.
		if (hS.display == 'inline-block') {
			var hC = new HotspotContext();
			for (var i = 0, j = hotspots.length; i < j; i++) {
				var hotspot = hotspots[i];
				if (hotspot.media == 'polygon' && hotspot.visibility) {
					if (rollover || !(Z.labelMode == 'rectangle' || Z.labelMode == 'polygon' || Z.labelMode == 'measure') || typeof hotspotCurrentID === 'undefined' || hotspotCurrentID === null || hotspotCurrentID !== i) {
						var x = hotspot.x, y = hotspot.y;
						if (!Z.hotspotsDrawOnlyInView || ((x + polygonViewBuffer) > hC.box.l && (x - polygonViewBuffer) < hC.box.r && (y + polygonViewBuffer) > hC.box.t && (y - polygonViewBuffer) < hC.box.b)) {
							drawPolygonOnCanvas(hotspot, null, rollover);
						}
					}
				}
			}
		}
	}

	function updatePolygon (hotspotInternalID, ctrlPtIndex, clickPt) {
		controlPointDragging = true;
		Z.Utils.clearDisplay(eD);
		var hotspotCurrentIndex = Z.Utils.arrayIndexOfObjectValue(hotspots, 'internalID', hotspotInternalID);
		if (hotspotCurrentIndex != -1) {
			var hotspot = hotspots[hotspotCurrentIndex];
			hotspot.polygonPts[ctrlPtIndex] = clickPt;
			drawPolygonOnCanvas(hotspot, clickPt);
		}
	}

	function polygonClickHandler (event, clickPt, isDblClick) {															
		var event = Z.Utils.event(event);
		var isRightMouseBtn = (event) ? Z.Utils.isRightMouseButton(event) : null;
		var isAltKey = (event) ? event.altKey : null;
		
		if (typeof hotspotCurrentID === 'undefined' || hotspotCurrentID === null) {
			// Failsafe clause. No current hotspot. No polygon. Clicked off control points. Create hotspot, polygon, and control point.  Make current.
			createControlPoint(null, true, clickPt);
			
		} else {
			var hotspotCurrentIndex = Z.Utils.arrayIndexOfObjectValue(hotspots, 'internalID', hotspotCurrentID);
			if (hotspotCurrentIndex != -1) {
				var hotspot = hotspots[hotspotCurrentIndex];
				polygonCurrentPts = hotspot.polygonPts;
				var polygonClosed = hotspot.polyClosed;
				if (polygonCurrentPts === null) {
					// Current hotspot. No polygon. Clicked off control points (none). Create polygon and control point.
					createControlPoint(hotspotCurrentID, true, clickPt);
					captionPolygon(hotspotCurrentID, clickPt);
					
				} else {
					controlPointCurrent = getClickedControlPoint(event, clickPt);
					if (!polygonClosed) {
						if (controlPointCurrent === null) {
							if (!isAltKey && !isRightMouseBtn && !isDblClick) {
								// Current hotspot. Existing polygon. Unclosed. Clicked off control points. Create control point in current polygon including freehand drawings.
								createControlPoint(hotspotCurrentID, false, clickPt);
								
							} else {
								// Current hotspot. Existing polygon. Unclosed. Clicked off control points. Alt key pressed or right-click. Create control point in current polygon and complete polygon.
								createControlPoint(hotspotCurrentID, false, clickPt);
								completePolygon(hotspotCurrentID, false);
							}
						
						} else {
							if (controlPointCurrent == 0 && polygonCurrentPts.length > 2 && !polygonComplete) {
								// Current hotspot. Existing polygon. Unclosed and not complete. Clicked first control point. Close polygon.
								completePolygon(hotspotCurrentID, true);
							}
						}
						
					} else if (controlPointCurrent === null) {
						// Current hotspot. Existing polygon. Closed. Clicked off control points. Create new hotspot, polygon, and control point.  Make current.
						createControlPoint(null, true, clickPt);
					}
				}
			}
		}
		
		if (!isAltKey || (Z.labelMode == 'measure' && hotspotCurrentID !== null)) {
			captionPolygon(hotspotCurrentID, clickPt);
		}
	}

	function createControlPoint (hotspotInternalID, polygonRedisplay, clickPt) {	
		var hotspot; // Defined outside conditions below to apply to all and be accessible to control point drawing condition below.
		var firstCtrlPt = false;
		var fullRedisplay = false;
		if (typeof hotspotInternalID === 'undefined' || hotspotInternalID === null || ((Z.editing === null || Z.editing == 'addLabel') && polygonComplete && (Z.labelMode == 'polygon' || Z.labelMode == 'measure'))) {
			// If measuring while not in edit mode be sure to delete any hotspot polygons previously created to display a measurement.
			if (Z.editMode === null && Z.labelMode == 'measure' &&  hotspots.length > 0) { self.deleteAllMeasureHotspots(); }
			
			// Create new polygon hotspot and update labels interface.
			var mediaType = (Z.labelMode == 'freehand' || Z.labelMode == 'rectangle' || Z.labelMode == 'polygon' || Z.labelMode == 'measure') ? Z.labelMode : null;
			var capPos = '8'; // Alternative implementation: var capPos = (Z.labelMode == 'measure') ? '5' : '8';
			var polygonPts = [];
			polygonPts[0] = { x:clickPt.x, y:clickPt.y };
			var poiID = (typeof poiList !== 'undefined' && poiList.options.length > 0) ? poiID = poiList.options[poiList.selectedIndex].value : 1;
			
			// DEV NOTE: Hotspot created at current zoom for caption size and zoom-to-view but all polygons drawn at 100% zoom to preserve meaningfulness of polygon point coordinates, simplify polygon point management, and remain consistent with prior versions.
			var zValStr = (self.getZoom() * 100).toString();
			self.createHotspotFromParameters(null, null, mediaType, 'polygon', null, clickPt.x.toString(), clickPt.y.toString(), zValStr, null, null, null, null, null, null, null, captionTextColor, null, lineStrokeColor, null, null, null, null, null, capPos, '0', null, poiID, null, null, '0', polygonPts);
			var hotspot = hotspots[hotspots.length - 1];			
			hotspotCurrentID = hotspot.internalID;
			updateLabelsForHotspot(hotspot, hotspot.poiID);			
			fullRedisplay = true;
			firstCtrlPt = true;
				
		} else {
			var hotspotCurrentIndex = Z.Utils.arrayIndexOfObjectValue(hotspots, 'internalID', hotspotInternalID);
			if (hotspotCurrentIndex != -1) {
				var hotspot = hotspots[hotspotCurrentIndex];
				var polyPts = (hotspot.polygonPts) ? hotspot.polygonPts : [];
				polyPts[polyPts.length] = { x:clickPt.x, y:clickPt.y };
				hotspot.polyClosed = false;
				hotspot.polygonPts = polyPts;
				hotspot.saved = false;
			}
		}
		
		// Drawing control point standard, conditions added.
		if ((Z.labelMode == 'rectangle' || Z.labelMode == 'polygon' || Z.labelMode == 'measure') && (typeof hotspot !== 'undefined' && hotspot !== null && hotspot.mediaType != 'freehand')) {
			var zVal = self.getZoom();	
			var polyPtX = (clickPt.x - Z.imageX) * zVal;
			var polyPtY = (clickPt.y - Z.imageY) * zVal;
			drawControlPoint(polyPtX, polyPtY, firstCtrlPt, 1);
		}
		if (Z.labelMode != 'rectangle' && Z.labelMode != 'freehand') {
			polygonComplete = false;
		}
		
		// Redisplay of hotspots occurs if new hotspot created to contain new polygon.
		// Redisplay of polygons occurs to redraw all polygons and control points in order
		// to reselect current polygon, remove control points from any prior current polygon,
		// and move prior current polygon to drawing canvas from editing canvas, and move
		// new current polygon to editing canvas.
		if (fullRedisplay) {
			redisplayHotspots();
		} else if (polygonRedisplay) {
			redisplayPolygons();
		}
	}
		
	function getClickedControlPoint (event, clickPt) {
		var polygonCtrlPtIndex = null;
		var ctrlPtRadiusScaled = (ctrlPtRadius + 1) / Z.imageZ;
		for (var i = 0, j = hotspots.length; i < j; i++) {
			if (hotspots[i].media == 'polygon' && hotspots[i].internalID == hotspotCurrentID) {
				var polyPts = hotspots[i].polygonPts;
				if (typeof polyPts !== 'undefined' && polyPts !== null) {
					for (var k = 0, m = polyPts.length; k < m; k++) {
						if (Z.Utils.calculatePointsDistance(clickPt.x, clickPt.y, polyPts[k].x, polyPts[k].y) < ctrlPtRadiusScaled) {
							polygonCtrlPtIndex = k;
						}
					}
				}
			}
		}
		return polygonCtrlPtIndex;
	}

	function completePolygon (hotspotInternalID, closePoly) {		
		Z.Utils.clearDisplay(eD);
							
		var hotspotCurrentIndex = Z.Utils.arrayIndexOfObjectValue(hotspots, 'internalID', hotspotInternalID);
		hotspots[hotspotCurrentIndex].polyClosed = closePoly;
		polygonComplete = true;
		
		if (hotspotCurrentIndex != -1) {
			var hotspot = hotspots[hotspotCurrentIndex];
			var polyCenter = Z.Utils.polygonCenter(hotspot.polygonPts, hotspot.polyClosed);
			hotspot.x = polyCenter.x;
			hotspot.y = polyCenter.y;
			
			if (Z.labelMode != 'freehand' && hotspot.caption == '' && typeof hotspot.captionHTML === 'undefined') {
				var placeHolderCaptionPolyText = Z.Utils.getResource('CONTENT_POLYGONCAPTION');
				hotspot.caption = placeHolderCaptionPolyText + hotspotInternalID.toString();
			}
			var hC = new HotspotContext();
			displayHotspot(hotspot, hC);
		}
	}

	function captionPolygon (hotspotInternalID, clickPt, saving, saveAll) {
		var hotspotCurrentIndex = Z.Utils.arrayIndexOfObjectValue(hotspots, 'internalID', hotspotInternalID);
		if (hotspotCurrentIndex != -1) {
			var hotspot = hotspots[hotspotCurrentIndex];
			var captionText = '';
			
			// If currently measuring calculate values and create caption, otherwise use stored caption calculations.
			if (Z.labelMode == 'measure' && hotspot.mediaType == 'measure') {
				setHotspotCaptionMeasure(hotspot, clickPt);
			} else if (Z.labelMode != 'freehand' && hotspot.mediaType != 'freehand' && hotspot.caption == '' && typeof hotspot.captionHTML === 'undefined') {
				var placeHolderCaptionPolyText = Z.Utils.getResource('CONTENT_POLYGONCAPTION');
				hotspot.caption = placeHolderCaptionPolyText + hotspotInternalID.toString();
			}
			
			// Calculate center, dimensions, and position for caption.	
			var polygonClosed = hotspot.polyClosed;
			var polyPts = (hotspot.polygonPts) ? hotspot.polygonPts.slice(0) : [];
			var polyCenter = Z.Utils.polygonCenter(polyPts, polygonClosed, clickPt);			
			var polyDimensions = Z.Utils.polygonDimensions(polyPts, clickPt);
			hotspot.x = polyCenter.x;
			hotspot.y = polyCenter.y;
			hotspot.iW = polyDimensions.x;
			hotspot.iH = polyDimensions.y;
			var hC = new HotspotContext();
			
			drawHotspotInHTML(hotspot, hC, clickPt, true);
		}
	}
	
	
	
	//::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::
	//:::::::::::::::::::::::::::: ANNOTATION EDITING FUNCTIONS ::::::::::::::::::::::::::::::
	//::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::

	this.setEditModeLabel = function (mode, syncUIToLabel, media, hideList) {
		var vpIDStr = viewportID.toString();
		
		var priorMode = Z.labelMode;
		Z.labelMode = mode;
		
		// Remove mouse movement event handlers previously assigned, if any.
		Z.Utils.removeEventListener(document, 'mousemove', viewportEventsHandler);
		Z.Utils.removeEventListener(document, 'touchmove', viewportEventsHandler);
		
		var messageDuration = parseInt(Z.Utils.getResource('ALERT_HOWTOEDITMESSAGEDURATION'), 10);
		if (mode != 'view' || Z.editMode !== null) { 
			Z.Utils.showMessage(Z.Utils.getResource('ALERT_HOWTOEDITMODE' + mode.toUpperCase()), false, messageDuration, 'center', true); // Alternative implementation: + Z.Utils.getResource('ALERT_HOWTOHELPREMINDER'), true, messageDuration, 'center', true);
		}		
		if (Z.overlayMessage) { Z.overlayMessage.parentNode.style.display = 'none'; }
		if (Z.editMode == 'edit' && Z.editing == 'editLabel') {
			self.modifyHotspot(hotspotCurrentID, 'mediaType', mode, true, true);
			if (mode == 'measure') {
				var polyPtsExist = (hotspotCurrent && hotspotCurrent.polygonPts && hotspotCurrent.polygonPts.length > 0);
				if (polyPtsExist && priorMode != 'rectangle' && priorMode != 'polygon' && priorMode != 'measure') { 
					self.modifyHotspot(hotspotCurrentID, 'polygonPts', null, true, true);
				}				
				self.modifyHotspot(hotspotCurrentID, 'image', null, true, true);
				self.modifyHotspot(hotspotCurrentID, 'media', 'polygon', false, true);
				if (polyPtsExist) {
					var clickPt = new Z.Utils.Point(hotspotCurrent.polygonPts[0].x, hotspotCurrent.polygonPts[0].y);
					captionPolygon(hotspotCurrentID, clickPt);
				}
				
			}
		}

		// Select edit button for selected label.
		if (Z.Toolbar && Z.annotationPanelVisible != 0) { 
			if (Z.measureVisible) {
				var bM = document.getElementById('buttonMeasure' + vpIDStr);
				var bME = document.getElementById('buttonMeasureExit' + vpIDStr);
				if (bM && bME) {
					bM.style.display = (Z.labelMode == 'measure') ? 'none' : 'inline-block';
					bME.style.display = (Z.labelMode == 'measure') ? 'inline-block' : 'none';
				}
			}
		}
		
		controlPointCurrent = null;
		polygonCurrentPts = null;
		controlPointDragging = false;
		polygonComplete = true;
		if (!hotspotDragging) {
			redisplayHotspots();
		} else {
			redisplayPolygons();
		}
	}

	this.setDrawingColor = function (buttonName, override) {
		var vp0MIDStr = (Z.annotationFileShared) ? '0' : viewportID.toString();
		var newColor;
		switch(buttonName) {
			case 'buttonColor0' + vp0MIDStr:
				newColor = '#FFFFFF';  // White.
				break;
			case 'buttonColor1' + vp0MIDStr:
				newColor = '#FFFF00';  // Yellow.
				break;
			case 'buttonColor2' + vp0MIDStr:
				newColor = '#00FFFF';  // Aqua.
				break;
			case 'buttonColor3' + vp0MIDStr:
				newColor = '#800080';  // Purple.
				break;
			case 'buttonColor4' + vp0MIDStr:
				newColor = '#008000';  // Green.
				break;
			case 'buttonColor5' + vp0MIDStr:
				newColor = '#FF0000';  // Red.
				break;
			case 'buttonColor6' + vp0MIDStr:
				newColor = '#0000FF';  // Blue.
				break;
			case 'buttonColor7' + vp0MIDStr:
				newColor = '#000000';  // Black,
				break;
		}
		captionTextColor = ctrlPtStrokeColor = lineStrokeColor = newColor;
		var newBackColor = (newColor == '#FFFFFF') ? '#000000' : '#FFFFFF';
				
		// If editing, modify current hotspot's relevant properties.
		if (!override && hotspotCurrentID !== null && Z.editMode == true && (Z.editing == 'addLabel' || Z.editing == 'editLabel')) {
			self.modifyHotspot(hotspotCurrentID, 'textColor', newColor, true, true);
			self.modifyHotspot(hotspotCurrentID, 'backColor', newBackColor, true, true);
			self.modifyHotspot(hotspotCurrentID, 'lineColor', newColor, false, true);
		}					
	}
	
	
	
	//:::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::
	//::::::::::::::::::: SCREENSAVER, TOUR & SLIDESHOW METHODS ::::::::::::::::::::::
	//:::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::

	this.tourStart = function () {
		self.tourStop();
		if (!Z.tourStop) { 
			Z.tourPlaying = true;

			// Swap buttons.
			var bTRS = document.getElementById('buttonTourStop');
			var bTRST = document.getElementById('buttonTourStart');
			if (bTRS && bTRST) {
				bTRS.style.display = 'inline-block';
				bTRST.style.display = 'none';
			}

			if (Z.screensaver) {
				if (!Z.constrainPanStrict) { Z.constrainPanStrict = true; }
			} else {
				Z.Utils.playAudio(destinationNextAudio, hotspots[destinationCurrent].audio);
			}

			// Set destination to next destination in list excluding title and not exceeding end of list.
			// Go to destination to start iteration, with abbreviated delay if starting tour with button.
			var targetIndex = (Z.screensaver) ? 0 : calculateTargetIndex(destinationCurrent, 'next', hotspots.length - 1);
			if (targetIndex !== null) {
				Z.Utils.functionCallWithDelay(function () { self.goToDestination(targetIndex); }, 1500);
			}
		}
	}
	
	this.tourStop = function () {
		Z.tourPlaying = false;
		
		// Swap buttons.
		var bTRS = document.getElementById('buttonTourStop');
		var bTRST = document.getElementById('buttonTourStart');
		if (bTRS && bTRST) {
			bTRS.style.display = 'none';
			bTRST.style.display = 'inline-block';
		}
	}
	
	this.priorDestination = function (override) {
		if (Z.tourPlaying && override) { self.tourStop(); }
		if (Z.screensaver) {
			self.zoomAndPanToView(Z.priorX, Z.priorY, Z.priorZ, Z.priorR);
		} else {
			destinationChange('prior');
		}
	}

	this.nextDestination = function (override) {
		if (Z.tourPlaying && override) { self.tourStop(); }
		destinationChange('next');
	}
	
	destinationChange = function (direction) {
		var targetIndex;
		if (Z.screensaver) {
			var showFor = (Z.screensaverSpeed > 0) ? 8000 / Z.screensaverSpeed : 3000;
			Z.Utils.functionCallWithDelay(function () { self.goToDestination(0); }, showFor);
			
		} else {
			if (typeof hotspotList !== 'undefined' && hotspotList !== null && hotspotList.length > 0) {
				Z.Utils.playAudio(destinationNextAudio, hotspots[destinationCurrent].audio);
				var delay = (Z.tourPlaying) ? hotspots[destinationCurrent].showFor : 0;

				// DEV NOTE: increase delay as workaround for audio pre-loading issues.
				if (Z.Utils.stringValidate(hotspots[destinationCurrent].audio)) { delay += 500; }

				targetIndex = calculateTargetIndex(destinationCurrent, direction, hotspots.length - 1);
				if (targetIndex !== null) {
					if (!Z.screensaver) { Z.Utils.loadAudio(hotspots[targetIndex].audio); }
					Z.Utils.functionCallWithDelay(function () { self.goToDestination(targetIndex); }, delay);
				} else {
					self.tourStop();
				}
			}
		}
	}
	
	this.goToDestination = function (index) {
		if (Z.tourStop) {
			self.tourStop();
			Z.tourStop = false;
		} else {
			var x, y, z, r;
			var callback = (Z.tourPlaying) ? self.nextDestination : null;
			if (Z.screensaver) {
				x = Z.Utils.getRandomInt(1, Z.imageW);
				y = Z.Utils.getRandomInt(1, Z.imageH);
				z = Z.Utils.getRandomInt(Z.minZ * 100, Z.maxZ * 100) / 100;
				// Ensure significant change. Pan and zoom constraints limit values.
				if ((Z.imageX - x) < 500) {
					x += 500;
					if (x > Z.imageW) { x -= 1000; }
				}
				if ((Z.imageY - y) < 500) {
					y += 500;
					if (y > Z.imageH) { y -= 1000; }
				}
				if ((Z.imageZ - z) < 0.3) {
					z += 0.3;
					if (z > Z.maxZ) { z -= 0.6; }
				}
				r = 0; // DEV NOTE: add rotation option in future update.
				var chgFor = (Z.screensaverSpeed > 0) ? 8000 / Z.screensaverSpeed : null;
				if (chgFor !== null) {
					self.zoomAndPanToView(x, y, z, r, chgFor, null, callback);
				} else {
					self.setView(x, y, z, r, callback);
				}
			} else {
				destinationCurrent = index;
				var hotspot = hotspots[index];
				x = hotspot.x;
				y = hotspot.y;
				z = hotspot.z / 100;
				r = hotspot.rotation;
				chgFor = hotspot.changeFor;
				switch (hotspots.transition) {
					case 'ZoomAndPanToView' :
						self.zoomAndPanToView(x, y, z, r, chgFor, null, callback);
						break;
					case 'SetView' :
						self.setView(x, y, z, r, callback);
						break;
					default:
						self.zoomAndPanToView(x, y, z, r, chgFor, null, callback);
						break;
				}
				var destinationCurrentInList = Z.Utils.arrayIndexOfObjectValue(hotspotList.options, 'value', hotspot.internalID.toString());		
				if (destinationCurrentInList != -1) { hotspotList.selectedIndex = destinationCurrentInList; }
			}
		}
	}

	this.parseSlidesXML = function (xmlDoc) {
		// Clear any prior values.
		Z.Utils.arrayClear(slides);
		Z.Utils.arrayClear(slideListDP);

		// Parse display setup information.
		slideshowAutoStart = Z.Utils.getResource('DEFAULT_SLIDESHOWAUTOSTART');
		slideshowAutoLoop = Z.Utils.getResource('DEFAULT_SLIDESHOWAUTOLOOP');
		slideListPosition = Z.Utils.getResource('DEFAULT_SLIDELISTPOSITION');
		slideListSource = Z.Utils.getResource('DEFAULT_SLIDELISTSOURCE');
		Z.slideListTitle = Z.Utils.getResource('UI_SLIDELISTTITLE');		
		var slideshowSetup = xmlDoc.getElementsByTagName('SETUP')[0];
		if (slideshowSetup) {
			var autoStart = slideshowSetup.getAttribute('AUTOSTART');
			if (Z.Utils.stringValidate(autoStart)) { slideshowAutoStart = (autoStart != '0' && autoStart != 'false'); }
			var autoLoop = slideshowSetup.getAttribute('AUTOLOOP');
			if (Z.Utils.stringValidate(autoLoop)) { slideshowAutoLoop = (autoLoop != '0' && autoLoop != 'false'); }
			var listPosition = slideshowSetup.getAttribute('CHOICELIST');
			if (Z.Utils.stringValidate(listPosition)) { slideListPosition = listPosition; }
			var listSource = slideshowSetup.getAttribute('LISTSOURCE');
			if (Z.Utils.stringValidate(listSource)) { slideListSource = listSource; }
			var listTitle = slideshowSetup.getAttribute('LISTTITLE');
			if (Z.Utils.stringValidate(listTitle)) { Z.slideListTitle = listTitle; }
		}	

		// Parse values for individual slides.
		var slideNodes = xmlDoc.getElementsByTagName('SLIDE');
		for (var i = 0, j = slideNodes.length; i < j; i++) {
			var slide = new Slide(slideNodes[i]);
			slides[slides.length] = slide;
			var slideListText = (slideListSource == 'NAME') ? slide.name : slide.media.substring(slide.media.lastIndexOf("/")+1, slide.media.length);
			slideListDP[slideListDP.length] = { text:slideListText, value:slide.internalID };
		}
		
		// Create slide choice list.
		createSlideChoiceList(slideListPosition, Z.slideListTitle, slideListDP);
		
		// Set audio mute buttons visible if AUDIO attribute in use.
		self.initializeAudioMuteButtons();
		
		// If first image path not loaded from image path parameter, use first values in slides XML file.
		// Otherwise start slideshow if auto start parameter set.
		if (Z.imagePath === null || Z.imagePath == 'null' || Z.imagePath.indexOf('zSlidePath') != -1) {
			self.goToSlide(0, true);
		} else if (slideshowAutoStart) {
			self.slideshowStart(); 		
		}
	}

	function Slide (slideNode) {
		var tempN;
		this.id = slideNode.getAttribute('ID');
		this.name = slideNode.getAttribute('NAME');
		
		this.internalID = slideNode.getAttribute('INTERNALID');
		if (isNaN(parseInt(this.internalID, 10))) { this.internalID = getFreeID('slide'); }
		
		this.media = slideNode.getAttribute('MEDIA'); // This is a path.
		this.audio = slideNode.getAttribute('AUDIO'); // This is a path.
		if (Z.Utils.stringValidate(this.audio)) { Z.audioContent = true; }
		
		
		this.initialX = slideNode.getAttribute('INITIALX');
		this.initialY = slideNode.getAttribute('INITIALY');
		this.initialZoom = slideNode.getAttribute('INITIALZOOM');
		this.minZoom = slideNode.getAttribute('MINZOOM');
		this.maxZoom = slideNode.getAttribute('MAXZOOM');
		
		tempN = parseFloat(slideNode.getAttribute('SHOWFOR'));
		this.showFor = isNaN(tempN) ? 0 : tempN;
		this.transition = slideNode.getAttribute('TRANSITION');
		tempN = parseFloat(slideNode.getAttribute('CHANGEFOR'));
		this.changeFor = isNaN(tempN) ? 0 : tempN;
	}
	
	function createSlideChoiceList (position, title, dataProvider) {
		var visible = (position == '0') ? 'hidden' : 'visible';
		var listW = parseInt(Z.Utils.getResource('DEFAULT_SLIDELISTWIDTH'), 10);
		var listCoords = calculateSlideListCoords(position, listW, viewW, viewH); // viewH allows for toolbar height if static in viewer display area.
		
		// Create choice list and add to viewer.
		if (typeof slideList === 'undefined' || slideList === null) {
			slideList = new Z.Utils.createSelectElement('slideList', title, dataProvider, listW, listCoords.x, listCoords.y, null, visible, slideListChangeHandler, 'change');
			Z.ViewerDisplay.appendChild(slideList);
			slideCurrent = 0;
			var indexTitleAdjust = (Z.Utils.stringValidate(Z.slideListTitle) && Z.slideListTitle != 'none') ? 1 : 0;
			slideList.selectedIndex = indexTitleAdjust;
		} else {
			Z.Utils.arrayClear(dataProvider);
		}
	}

	function calculateSlideListCoords (position, listW, viewerW, viewerH) {
		//Slide list positioning: 0 hides, 1 top left, 2 top-right, 3 bottom right, 4 bottom left
		var listX, listY;
		var margin = 25;
		switch (position) {
			case '0':
				listX = 0;
				listY = 0;
				break;
			case '1':
				listX = margin;
				listY = margin;
				break;
			case '2':
				listX = viewerW - listW - margin;
				listY = 20;
				break;
			case '3':
				listX = viewerW - listW - margin;
				if (toolbar != null) {
					listY = viewerH - margin * 2;
				} else {
					listY = viewerH - margin * 1.5;
				}
				break;
			case '4':
				listX = margin;
				if (toolbar != null) {
					listY = viewerH - margin * 2;
				} else {
					listY = viewerH - margin * 1.5;
				}
				break;
			default:
				listX = viewerW - listW;
				listY = margin;
		}
		return new Z.Utils.Point(listX, listY);
	}

	function slideListChangeHandler (event) {
		var event = Z.Utils.event(event);
		if (event) {
			if (Z.slideshowPlaying) { self.slideshowStop(); }
			var target = Z.Utils.target(event);
			if (target.options[target.selectedIndex].value != 'null') {
				var indexTitleAdjust = (Z.Utils.stringValidate(Z.slideListTitle) && Z.slideListTitle != 'none') ? 1 : 0;
				self.goToSlide(target.selectedIndex - indexTitleAdjust, null, true);
			}
		}
	}
	
	this.slideshowStart = function (initialCall) {
		self.slideshowStop();
		Z.slideshowPlaying = true;
		
		// Swap buttons.
		var bSSS = document.getElementById('buttonSlideshowStop');
		var bSSST = document.getElementById('buttonSlideshowStart');
		if (bSSS && bSSST) {
			bSSS.style.display = 'inline-block';
			bSSST.style.display = 'none';
		}
		
		Z.Utils.playAudio(destinationNextAudio, slides[slideCurrent].audio);
				
		// Set slide to next slide in list excluding title and not exceeding end of list.
		// Go to slide to start iteration, with abbreviated delay if starting show with button.
		var delay = (Z.slideshowPlaying) ? slides[slideCurrent].showFor : 0;
		var targetIndex = (initialCall) ? 0 : calculateTargetIndex(slideCurrent, 'next', slides.length - 1);
		if (targetIndex !== null) { 		
			Z.Utils.loadAudio(slides[targetIndex].audio);
			Z.Utils.functionCallWithDelay(function () { self.goToSlide(targetIndex, null, null, true); }, delay);
		}
	}
	
	this.slideshowStop = function () {
		Z.slideshowPlaying = false;
		
		// Swap buttons.
		var bSSS = document.getElementById('buttonSlideshowStop');
		var bSSST = document.getElementById('buttonSlideshowStart');
		if (bSSS && bSSST) {
			bSSS.style.display = 'none';
			bSSST.style.display = 'inline-block';
		}
	}
	
	this.priorSlide = function (override) {
		if (Z.slideshowPlaying && override) { self.slideshowStop(); }
		slideChange('prior');
	}

	this.nextSlide = function (override) {
		if (Z.slideshowPlaying && override) { self.slideshowStop(); }
		slideChange('next');
	}
	
	function slideChange (direction) {
		if (typeof slideList !== 'undefined' && slideList !== null && slideList.length > 0) {
			
			var delay = (Z.slideshowPlaying) ? slides[slideCurrent].showFor : 0;
			// DEV NOTE: increase delay as workaround for audio pre-loading issues.
			if (Z.Utils.stringValidate(slides[slideCurrent].audio)) { delay += 500; }
			var targetIndex = calculateTargetIndex(slideCurrent, direction, slides.length - 1);
			if (targetIndex !== null) { 
				Z.Utils.functionCallWithDelay(function () { self.goToSlide(targetIndex, null, null, true); }, delay);
			} else {
				self.slideshowStop();
			}
		}
	}

	this.goToSlide = function (index, initializingCall, changeHandler, buttonHandler) {
		if (Z.slideshowPlaying || initializingCall || changeHandler || buttonHandler) {
			slideCurrent = index;
			var slide = slides[index];

			var viewerParams = Z.Utils.parametersToDelimitedString(Z.parameters, '&');
			var slideParams = getSlideOptionalParams(slide);
			var concat = (Z.Utils.stringValidate(slideParams)) ? '&' : '';
			var optionalParams = viewerParams + concat + slideParams;

			switch (slide.transition) {
				case 'Fade' :			
					Z.Viewer.setImageWithFade(slide.media, optionalParams, initializingCall);
					break;
				case 'None' :
					Z.Viewer.setImage(slide.media, optionalParams, initializingCall);
					break;
				default:						
					Z.Viewer.setImageWithFade(slide.media, optionalParams, initializingCall);
					break;
			}
			var slideCurrentInList = Z.Utils.arrayIndexOfObjectValue(slideList.options, 'value', slide.internalID.toString());		
			if (slideCurrentInList != -1) { slideList.selectedIndex = slideCurrentInList; }
		}
	}
	
	function getSlideOptionalParams (slide) {
		temp = slide.initialX;
		var initXStr = (Z.Utils.stringValidate(temp)) ? (temp == 'center') ? 'zInitialX=' + (Z.imageW / 2).toString() : (!isNaN(parseFloat(temp))) ? 'zInitialX=' + temp : null : null;
		temp = slide.initialY;
		var initYStr = (Z.Utils.stringValidate(temp)) ? (temp == 'center') ? 'zInitialY=' + (Z.imageH / 2).toString() : (!isNaN(parseFloat(temp))) ? 'zInitialY=' + temp : null : null;
		temp = slide.initialZoom;
		var initZStr = (Z.Utils.stringValidate(temp)) ? (!isNaN(parseFloat(temp))) ? 'zInitialZoom=' + temp : null : null;
		temp = slide.minZoom;
		var minZStr = (Z.Utils.stringValidate(temp)) ? (!isNaN(parseFloat(temp))) ? 'zMinZoom=' + temp : null : null;
		temp = slide.maxZoom;
		var maxZStr = (Z.Utils.stringValidate(temp)) ? (!isNaN(parseFloat(temp))) ? 'zMaxZoom=' + temp : null : null;

		var optParams = (initXStr !== null) ? initXStr : null;
		optParams = (initYStr !== null) ? (optParams !== null) ? optParams + '&' + initYStr : initYStr : null;
		optParams = (initZStr !== null) ? (optParams !== null) ? optParams + '&' + initZStr : initZStr : null;
		optParams = (minZStr !== null) ? (optParams !== null) ? optParams + '&' + minZStr : minZStr : null;
		optParams = (maxZStr !== null) ? (optParams !== null) ? optParams + '&' + maxZStr : maxZStr : null;

		return optParams;
	}
	
	this.slideTransitionTimeoutHandler = function (direction, imagePath, optionalParams, initializingCall) {
		if (initializingCall) {
			Z.Viewer.setImage(imagePath, optionalParams, initializingCall);
			direction = 'in'; 
		}
		window.clearTimeout(Z.slideTransitionTimeout);
		Z.slideTransitionTimeout = null;
		if (direction == 'out') {
			if (Z.slideOpacity >= 0) {
				Z.slideOpacity -= slideTransitionStep;
				direction = 'out';
			} else {
				Z.slideOpacity = 0;
				direction = 'in';
				Z.setCallback('viewUpdateComplete', function () { Z.slideTransitionTimeout = window.setTimeout( function () { Z.Viewport.slideTransitionTimeoutHandler(direction, imagePath, optionalParams); }, 50); });
				Z.Viewer.setImage(imagePath, optionalParams, null);
			}
		} else {
			if (Z.slideOpacity == 0) {
				Z.Utils.playAudio(destinationNextAudio, slides[slideCurrent].audio);
				Z.clearCallback('viewUpdateComplete', function () { Z.slideTransitionTimeout = window.setTimeout( function () { Z.Viewport.slideTransitionTimeoutHandler(direction, imagePath, optionalParams); }, 50); });
			}
			if (Z.slideOpacity <= 1) {
				Z.slideOpacity += slideTransitionStep;
				direction = 'in';
			} else {
				Z.slideOpacity = 1;
				direction = null;
			}	
		}
		
		// Update opacity.
		if (cD) { Z.Utils.setOpacity(cD, Z.slideOpacity); }
		if (Z.NavigatorDisplay) { Z.Utils.setOpacity(Z.NavigatorDisplay, Z.slideOpacity); }

		// Iterate fading transition.
		if (direction !== null && Z.slideOpacity != 0) { 
			Z.slideTransitionTimeout = window.setTimeout( function () { Z.Viewport.slideTransitionTimeoutHandler(direction, imagePath, optionalParams); }, 50);
		}
	}
	
	function calculateTargetIndex (index, direction, max) {
		var loop = (tourAutoLoop || slideshowAutoLoop); // Simple test because won't have both tour and slides.
		var skipTest = 'Skip';
		while (skipTest == 'Skip') {
			if (direction == 'next') { 
				index += 1;
				if (index > max) {
					if (loop) {
						index = 0;
					} else {
						index = null;
					}
				}
			} else {
				index -= 1;
				if (index < 0) {
					if (loop) {
						index = max;
					} else {
						index = null;
					}
				}
			}
			if (hotspots) {
				skipTest = (index !== null) ? hotspots[index].transition : null;
			} else if (slides) {
				skipTest = (index !== null) ? slides[index].transition : null;
			} else {
				skipTest = null;
			}
		}
		return index;
	}
	
	this.initializeAudioMuteButtons = function () {
		if (Z.audioContent) {
			var bAO = document.getElementById('buttonAudioOn');
			if (bAO) { bAO.style.display = 'inline-block'; }
		}
	}
	
	this.audioMute = function (muted) {
		Z.audioMuted = muted;
		
		// Swap buttons.
		var bAM = document.getElementById('buttonAudioMuted');
		var bAO = document.getElementById('buttonAudioOn');
		if (bAM && bAO) {
			if (muted) {
				bAM.style.display = 'inline-block';
				bAO.style.display = 'none';
			} else {
				bAM.style.display = 'none';
				bAO.style.display = 'inline-block';			
			}
		}
		
	}

	

	//::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::
	//:::::::::::::::::::::::::::::::::: INTERACTION FUNCTIONS :::::::::::::::::::::::::::::::
	//::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::

	// DEV NOTES: Variable Z.imageR updated during implementation of rotation rather than
	// once in updateView. This differs from updating of variables Z.imageX/Y/Z. Comparison of 
	// approaches in progress. Variable Z.preventDupCall set to ensure values set by call in reset 
	// function are not overridden by duplicated call in updateView function. Rounding required 
	// because rotation functions currently support exact 90 degree increments only.
	function recordPriorViewCoordinates (called) {
		if (!Z.preventDupCall) {
			Z.priorX = Z.imageX;
			Z.priorY = Z.imageY;
			Z.priorZ = Z.imageZ;
			Z.priorR = Math.round(Z.imageR);
		}
		Z.preventDupCall = (typeof called !== 'undefined' && called !== null);
	}

	this.setView =  function (x, y, z, r, callback, override) {
		view(x, y, z, r, callback, override);
	}
		
	// View assignment function.
	function view (x, y, z, r, callback, override) {
		if (!override) { self.zoomAndPanAllStop(); }
		if (Z.maskingSelection && Z.maskClearOnUserAction) { self.clearMask(); }

		// Validate coordinate values.
		if (typeof x === 'undefined' || x === null) { x = (Z.imageW / 2); }
		if (typeof y === 'undefined' || y === null) { y = (Z.imageH / 2); }
		if (typeof z === 'undefined' || z === null) {
			z = Z.fitZ;
		} else if (z > 1) {
			z = z / 100;
		}
		if (typeof r === 'undefined' || r === null) { r = Z.imageR; }

		// Constrain coordinate values.
		z = constrainZoom(z);
		r = constrainRotation(r);
		var constrainedPt = constrainPan(x, y, z, r, 'image');
		
		// Assign coordinate values.
		Z.imageX = imageX = constrainedPt.x;
		Z.imageY = imageY = constrainedPt.y;
		Z.imageZ = z;

		// Apply coordinate values.
		if (r != Z.imageR) { Z.Utils.rotateElement(cS, r); }
		Z.imageR = r;
		self.updateView(true);
		if (typeof callback === 'function') { callback(); }
	}

	this.zoom =  function (zoomDir) {
		// Avoid redundant calls resulting in redundant updateView calls below.
		if (zoomDir == 'stop' && Z.zooming == 'stop') { return; }
		
		switch(zoomDir) {
			case 'out' :
				if (zoomVal >= 0) { zoomVal -= zoomStepDistance; }
				break;
			case 'in' :
				if (zoomVal <= 0) { zoomVal += zoomStepDistance; }
				break;
			case 'stop' :
				zoomVal = 0;
				break;
		}
		Z.zooming = (zoomVal == 0) ? 'stop' : ((zoomVal > 0) ? 'in' : 'out');

		if (zoomVal !=0) {
			if (!zapTimer) {
				if (((zoomVal < 0) && (Z.imageZ > Z.minZ)) || ((zoomVal > 0) && (Z.imageZ < Z.maxZ))) {
					self.toggleWatermarks(false);
					if (hotspots && hotspots.length > 39) { self.setHotspotsVisibility(false); }
				}
				if (!Z.useCanvas) { Z.Utils.clearDisplay(wD); }
				zapTimer = window.setTimeout(zoomAndPanContinuousStep, zapStepDuration);
			}
		} else {
			zoomAndPanContinuousStop();
			self.updateView();
			self.toggleWatermarks(true);	
			if (hotspots && hotspots.length > 39) { self.setHotspotsVisibility(true); }
		}
	}

	this.pan =  function (panDir) {
		// Avoid redundant calls resulting in redundant updateView calls below.
		if (panDir == 'horizontalStop' && Z.panningX == 'stop') { return; }
		if (panDir == 'verticalStop' && Z.panningY == 'stop') { return; }
		
		// Pan direction refers to the pan of the view - the opposite of the movement of the image.
		switch(panDir) {
			case 'left' :
				if (panX <= 0) { panX += panStepDistance; }
				break;
			case 'up' :
				if (panY <= 0) { panY += panStepDistance; }
				break;
			case 'down' :
				if (panY >= 0) { panY -= panStepDistance; }
				break;
			case 'right' :
				if (panX >= 0) { panX -= panStepDistance; }
				break;
			case 'horizontalStop' :
				panX = 0;
				break;
			case 'verticalStop' :
				panY = 0;
				break;
			case 'stop' :
				panX = 0;
				panY = 0;
				break;
		}
		Z.panningX = (panX == 0) ? 'stop' : ((panX > 0) ? 'left' : 'right');
		Z.panningY = (panY == 0) ? 'stop' : ((panY > 0) ? 'up' : 'down');
		zapTierCurrentZoomUnscaledX = Z.imageX * convertTierScaleToZoom(tierCurrent, 1);
		zapTierCurrentZoomUnscaledY = Z.imageY * convertTierScaleToZoom(tierCurrent, 1);

		if (panX !=0 || panY != 0) {
			if (!zapTimer) {
				// Clear watermarks for faster, smoother zoom.
				self.toggleWatermarks(false);
				if (!Z.useCanvas) { Z.Utils.clearDisplay(wD); }				
				if (hotspots && hotspots.length > 39) { self.setHotspotsVisibility(false); }
				zapTimer = window.setTimeout(zoomAndPanContinuousStep, zapStepDuration);
			}
		} else {
			zoomAndPanContinuousStop();
			self.updateView();
			self.toggleWatermarks(true);	
			if (hotspots && hotspots.length > 39) { self.setHotspotsVisibility(true); }
		}
	}

	function zoomAndPanContinuousStep () {
		if (zapTimer) {
			// If interval, pan, zoom values not cleared, pan and/or zoom one step.
			if (panX != 0 || panY != 0 || zoomVal != 0) {
				zoomAndPan(panX, panY, zoomVal);
				// If pan and zoom variables have not been cleared, recall timer.
				zapTimer = window.setTimeout(zoomAndPanContinuousStep, zapStepDuration);
			}
		}
	}

	function zoomAndPan (stepX, stepY, stepZ) {
		// Pan constraint is applied separately to direct pan and to the indirect pan that
		// occurs when zooming out if image off-center. This enables prevention rather
		// than correction of dissallowed pan and avoids jitter at boundary conditions.
		var viewPanned = false, syncSlider = false, syncNav = false;
		var constrainedZ = self.getZoom();

		if (stepZ != 0) {
			// Calculate change to scale of tier.  For zoom buttons and keys, meter progress by
			// increasing weight of each step as tier scale grows and decreasing as scale shrinks.
			var targetScale = tierScale *  (1 + stepZ);

			// Calculate target zoom for current step based on target scale for current step.
			var targetZoom = convertTierScaleToZoom(tierCurrent, targetScale);

			// Constrain target zoom.
			constrainedZ = constrainZoom(targetZoom);
			if (constrainedZ != Z.imageZ) {
				// Scale the viewport display to implement zoom step.
				syncSlider = syncNav = scaleTierToZoom(constrainedZ);
			}
		}

		if (stepX != 0 || stepY != 0) {
			// Calculate new container position.
			var targetL = parseFloat(cS.left) + stepX;
			var targetT = parseFloat(cS.top) + stepY;

			// Calculate constrained new position and set viewport display to new position.
			var constrainedPt = constrainPan(targetL, targetT, constrainedZ, Z.imageR, 'container');
			
			// DEV NOTE: Rounding addresses Firefox bug that causes assignment of zero value to fail when scrolling up from
			// bottom and value of cS.top to stop incrementing at -50 rather than increasing to appropriate positive constraint.
			cS.left = Math.round(constrainedPt.x) + 'px';
			cS.top = Math.round(constrainedPt.y) + 'px';

			viewPanned = true;
			syncNav = true;		
					
			var deltaX = constrainedPt.x - displayL;
			var deltaY = constrainedPt.y - displayT;
			if (oD && tierBackfillDynamic && (Z.mobileDevice || (Math.abs(deltaX) > (viewW / 2) || Math.abs(deltaY) > (viewH / 2)))) {
				redisplayCachedTiles(oD, tierBackfillOversize, tilesBackfillCached, 'simple', false, 'Updating backfill oversize display');
			}
		}

		// Sync watermarks, hotspots, zoom slider, navigator, ruler, image set slider on every iteration of zoom function
		// unless number of hotspots is large, then skip every other step. Tradeoff is smooth zoom vs smooth scaling of hotspots.
		var hotspotsSkip = (hotspots && hotspots.length > 30);
		if (!hotspotsSkip) {
			self.syncViewportRelated();
		} else if (zapStepCount % 2 == 0) {
			self.syncViewportRelated();
		}
		zapStepCount++;

		// Load new tiles as needed during panning (not zooming).
		/* DEV NOTE: Updating tiles while panning disabled. Requires optimization.
		if (viewPanned) {
			var canvasScale = (Z.useCanvas) ? (parseFloat(vS.width) / vD.width) : 1;
			var maxDim = Math.max(TILE_WIDTH, TILE_HEIGHT);
			var loadThreshold = Math.round(maxDim / panStepDistance * tierScale * canvasScale);
			var loadStep = (zapStepCount % loadThreshold == 0 && zapStepCount != 0);
			if (loadStep) { updateViewWhilePanning(stepX, stepY); }
		}*/
	}

	// Transition smoothly to new view. Image coordinates input, converted to viewport coordinates,
	// then zoom and pan, then updateView to convert changes back to image coordinates.
	this.zoomAndPanToView = function (targetX, targetY, targetZ, targetR, duration, steps, callback) {
		
		//First stop any zoom or pan in progress.
		self.zoomAndPanAllStop();
		
		// Second, if block enabled to prevent conflict with hotspot click-link, 
		//do not implement new zoom-and-pan effect and clear block.
		if (Z.clickZoomAndPanBlock) { 
			Z.clickZoomAndPanBlock = false;
			return; 
		}
		
		// Optional parameters override defaults, if set.
		if (typeof targetX === 'undefined' || targetX === null) { targetX = Z.imageX; }
		if (typeof targetY === 'undefined' || targetY === null) { targetY = Z.imageY; }
		if (typeof targetZ === 'undefined' || targetZ === null) { targetZ = Z.imageZ; }
		if (typeof targetR === 'undefined' || targetR === null) { targetR = Z.imageR; }
		if (typeof duration === 'undefined' || duration === null) { duration = zaptvDuration; }
		if (typeof steps === 'undefined' || steps === null) { steps = zaptvSteps; }

		// Calculate special values.
		if (targetX == 'center' || isNaN(parseFloat(targetX))) { targetX = Z.imageCenterX; }
		if (targetY == 'center' || isNaN(parseFloat(targetY))) { targetY = Z.imageCenterY; }
		if (targetZ == -1 || isNaN(parseFloat(targetZ))) { targetY = Z.fitZ; }
		
		// Next, clear watermarks and hotspots for fast, smooth zoom.
		self.toggleWatermarks(false);
		if (!Z.useCanvas) { Z.Utils.clearDisplay(wD); }
		if (hotspots && hotspots.length > 39) { self.setHotspotsVisibility(false); }

		// If X or Y values are null, assign initial value (typically center point).
		if (typeof targetX === 'undefined' || targetX === null) { targetX = Z.initialX; }
		if (typeof targetY === 'undefined' || targetY === null) { targetY = Z.initialY; }
		if (typeof targetR === 'undefined' || targetR === null) { targetR = Z.imageR; } // Note: current R not initial R. Permits standard use without R parameter.

		// Validate zoom value and convert to 0.01 to 1 range if in 1 to 100 range.
		if (typeof targetZ === 'undefined' || targetZ === null) {
			targetZ = Z.initialZ;
		} else if (targetZ > 1 && targetZ < 2 && targetZ % 1 != 0) {
			targetZ = 1;
		} else if (targetZ > 1) {
			targetZ /= 100;
		} else if (targetZ > 0.99 && targetZ < 1 && ((targetZ * 100) % 1) != 0) {
			targetZ = 1;
		}

		// Constrain target coordinates.
		var constrainedTargetPoint = constrainPan(targetX, targetY, targetZ, targetR, 'image');
		targetX = constrainedTargetPoint.x;
		targetY = constrainedTargetPoint.y;
		targetZ = constrainZoom(targetZ);
		
		// Implement zoom and pan to view, if pan is needed or zoom is needed and it is not outside min and max constraints.
		if (Math.round(targetX) != Math.round(Z.imageX) || Math.round(targetY) != Math.round(Z.imageY) || Math.round(targetZ * 100000) != Math.round(Z.imageZ * 100000) || Math.round(targetR) != Math.round(Z.imageR)) {
			// Disable interactivity if steps include rotation to avoid stopping between 90 degree increments.
			Z.interactivityOff = true;

			// Set step counter.
			zaptvStepCurrent = 0;

			// Debug option: Add horizontal and vertical lines ('cross hairs') to verify 
			// end point accuracy. Can also be set using HTML parameter zCrosshairsVisible=1.
			//Z.Utils.drawCrosshairs(Z.ViewerDisplay, viewW, viewH);

			// Begin steps toward target coordinates.
			zoomAndPanToViewStep(targetX, targetY, targetZ, targetR, duration, steps, callback);
		}
	}

	function zoomAndPanToViewStep (tX, tY, tZ, tR, duration, steps, callback) {
		// Increment step counter and calculate time values.
		zaptvStepCurrent++;
		var stepDuration = duration / steps;
		var currentStepTime = zaptvStepCurrent * stepDuration;

		// Calculate eased step values.
		var newX = Z.Utils.easing(Z.imageX, tX, currentStepTime, duration);
		var newY = Z.Utils.easing(Z.imageY, tY, currentStepTime, duration);
		var newZ = Z.Utils.easing(Z.imageZ, tZ, currentStepTime, duration);
		var newR = Z.Utils.easing(Z.imageR, tR, currentStepTime, duration);
				
		// DEV NOTE: Additional option: adjust pan for zoom. When zooming in, all points move
		// away from center which magnifies pan toward points to right and/or below center and
		// minifies pan toward points to left and above center. Zooming out creates opposite
		// effect. Current implementation mitigates this impact partially and adequately.

		// Convert step image pixel values to viewport values.
		var newPt = convertImageCoordsToViewportEdgeCoords(newX, newY, newZ);
		var newL = newPt.x;
		var newT = newPt.y;
		
		// Apply new x, y, z, r values and set components to sync.
		var syncSlider = false, syncNav = syncOversize = false;
		if (parseFloat(cS.left) != newL || parseFloat(cS.top) != newT) {
			cS.left = newL + 'px';
			cS.top = newT + 'px';
			syncNav = true;
			if (oD && tierBackfillDynamic) {
				syncOversize = true;
			}
		}
		if (newZ != Z.imageZ) {
			scaleTierToZoom(newZ, false);
			syncSlider = syncNav = true;
			if (oD && tierBackfillDynamic) {
				oCtx.restore();
				oCtx.save();
				oCtx.scale(tierBackfillOversizeScale, tierBackfillOversizeScale);
				syncOversize = true;
			}
		}
		if (newR != Z.imageR) {
			Z.Utils.rotateElement(cS, newR);
			if (oD && tierBackfillDynamic) {
				var deltaR = newR - Z.imageR;
				oCtx.rotate(deltaR * Math.PI / 180);
				syncOversize = true;
			}
			Z.imageR = newR;
			syncNav = true;
		}

		// Redraw oversizeDisplay if sync required. Pan, zoom, and rotation set above.
		if (syncOversize) {
			redisplayCachedTiles(oD, tierBackfillOversize, tilesBackfillCached, 'simple', false, 'Updating backfill oversize display');
		}
		
		// Sync overlays every step if visible to ensure smoothly synchronized 
		// scaling. Default hides watermarks during zooming. Sync toolbar slider, 
		// navigator, and ruler every other step if visible and update required.
		var syncHotspots = (hotspots && hotspots.length < 40);
		self.syncViewportRelated(false, syncHotspots, false, false, false);
		if (zaptvStepCurrent % 2 == 0) {
			self.syncViewportRelated(false, false, syncSlider, syncNav, syncSlider);
		}
		
		var blockSteps = (Z.tour && Z.tourStop && Math.round(Z.imageR % 90) == 0)

		// Take additional step toward target or finalize view, depending on step counter.
		if (zaptvStepCurrent < steps+1 && !blockSteps) {
			zaptvTimer = window.setTimeout( function () { zoomAndPanToViewStep(tX, tY, tZ, tR, duration, steps, callback); }, stepDuration);
		
		} else {
			// Update view and reset watermarks to visible if present.
			if (blockSteps) { Z.tourPlaying = false; }
			Z.interactivityOff = false;
			zoomAndPanToViewStop();
			self.updateView();
			self.toggleWatermarks(true);	
			if (hotspots && hotspots.length > 39) { self.setHotspotsVisibility(true); }
			if (typeof callback === 'function') { callback(); }
		}
	}

	this.zoomAndPanAllStop =  function (override, overridePlaying) {		
		if (!Z.interactivityOff) {
			if (zaptvTimer) { 
				zoomAndPanToViewStop();
			}
			if (Z.tourPlaying && overridePlaying) { 
				self.tourStop();
				override = false;
			}
			if (Z.slideshowPlaying && overridePlaying) {
				self.slideshowStop();
				override = false;
			}
			if (Z.smoothPan && smoothPanInterval !== null) {
				if (!Z.mouseIsDown) { smoothPanStop(true); }
				override = true;
			}
			if (!override) { self.updateView(); }
		}
	}

	function zoomAndPanContinuousStop () {
		panX = 0;
		panY = 0;
		zoomVal = 0;
		zapStepCount = 0;
		if (zapTimer) {
			window.clearTimeout(zapTimer);
			zapTimer = null;
		}
	}

	function zoomAndPanToViewStop () {
		// Call when completing zoomAndPanToView steps, when interrupting them, and when
		// beginning user interaction that would conflict with continued zoom and pan steps.
		if (zaptvTimer) {
			window.clearTimeout(zaptvTimer);
			zaptvTimer = null;
		}
	}
	
	// Sync related displays and components.
	this.syncViewportRelated = function (syncWatermarks, syncHotspots, syncSlider, syncNav, syncRuler, syncImageSetSlider) {
		if (typeof syncWatermarks == 'undefined' || syncWatermarks) { redisplayWatermarks(); }
		if (typeof syncHotspots == 'undefined' || syncHotspots) { redisplayHotspots(); }
		if (typeof syncSlider == 'undefined' || syncSlider) { syncToolbarSliderToViewport(); }
		if (typeof syncNav == 'undefined' || syncNav)  { syncNavigatorToViewport(); }
		if (typeof syncRuler == 'undefined' || syncRuler) { syncRulerToViewport(); }
		if (typeof syncImageSetSlider != 'undefined' && syncImageSetSlider) { syncToolbarImageSetSliderToViewport(Z.viewportCurrentID); }
	}

	this.scaleTierToZoom = function (imageZ, syncOversize) {
		var sync = scaleTierToZoom(imageZ, syncOversize);
		if (sync) { self.syncViewportRelated(); }
	}

	function scaleTierToZoom (imageZ, syncOversize) {
		// Main function implementing zoom through current tier scaling.  Used by zoomAndPan
		// function of zoom buttons and keys, sliderSlide and sliderSnap functions of slider, and
		// zoomAndPanToView function of Reset key and mouse-click and alt-click zoom features.
		// Note that it uses CSS scaling in canvas contexts and image element scaling otherwise.

		// Track whether function has scaled values so other components will be updated.
		var sync = false;

		// Calculate target tier scale from zoom input value.
		var targetTierScale = convertZoomToTierScale(tierCurrent, imageZ);

		// If input zoom requires a change in scale, continue.
		if (targetTierScale != tierScale) {

			// Update tracking variables.
			tierScale = targetTierScale;

			// Calculate scale adjusting for current scale previously applied to canvas or tiles.
			var scaleDelta = targetTierScale / tierScalePrior;

			// Calculate new size and position - X and Y from panning are applied when drawing tiles or, for backfill, below.
			var newW = displayW * scaleDelta;
			var newH = displayH * scaleDelta;
			var newL = (displayW - newW) / 2;
			var newT = (displayH - newH) / 2;

			// Constrain pan during zoom-out.
			if (targetTierScale < tierScalePrior) {
				var constrainedPt = constrainPan(parseFloat(cS.left), parseFloat(cS.top), imageZ, Z.imageR, 'container');
				cS.left = constrainedPt.x + 'px';
				cS.top = constrainedPt.y + 'px';
			}

			// Apply new scale to displays.
			if (Z.useCanvas) {				
				// Redraw viewport display using CSS scaling.
				vS.width = newW + 'px';
				vS.height = newH + 'px';
				vS.left = newL + 'px';
				vS.top = newT + 'px';

				// Sync mask display.
				if (mC) {
					mS.width = newW + 'px';
					mS.height = newH + 'px';
					mS.left = newL + 'px';
					mS.top = newT + 'px';
				}

				// Sync drawing display.
				if (dD) {
					dS.width = newW + 'px';
					dS.height = newH + 'px';
					dS.left = newL + 'px';
					dS.top = newT + 'px';
				}

				// Sync editing display.
				if (eD) {
					eS.width = newW + 'px';
					eS.height = newH + 'px';
					eS.left = newL + 'px';
					eS.top = newT + 'px';
				}

				// Sync backfill display and oversize backfill display, if present. Backfill display assigned different size and position because backfill is sized 
				// to content not viewport, to support Navigator panning. Dynamic backfill used where image size prevent caching of a tier of sufficient quality
				// (three tiers less than current tier).  Oversize display used whenever dynamic backfill is used, to provide fast backfill for rapid zoom or pan 
				// using tiles from always precached third tier. Oversize implementation conditional on scale threshold of 10,000 pixels width or height, through
				// actual scaling limit of browser are approximately 10,000, 100,000, and 1M for Chrome, Firefox, and IE/Safari respectively.
				tierBackfillOversizeScale = convertZoomToTierScale(tierBackfillOversize, self.getZoom());
				var override = (tierBackfillOversizeScale > 8); // Slider snap or mousewheel can create need for oversize backfill before selectTier resets tierBackfillDynamic = true.
				if (tierBackfillDynamic || override) {
			
					// Update oversize backfill if conditions apply. Variable syncOversize avoids duplicate redisplays of oversize backfill. Set false by calls from zoomAndPan,
					// zoomAndPanToViewStep (and indirectly, Reset), and set true or unset by sliderSnap, sliderSlide, and handlers for mousewheel, and gestures.
					if (oCtx !== null && typeof syncOversize === 'undefined' || syncOversize === null || syncOversize && oD && (Z.zooming != 'in' || (newW > Z.scaleThreshold || newH > Z.scaleThreshold))) {
						oCtx.restore();
						oCtx.save();
						oCtx.scale(tierBackfillOversizeScale, tierBackfillOversizeScale);
						oCtx.rotate(Z.imageR * Math.PI / 180);
						redisplayCachedTiles(oD, tierBackfillOversize, tilesBackfillCached, 'simple', false, 'Updating backfill oversize display');
					}
			
					var targetBackfillTierScale = convertZoomToTierScale(tierBackfill, imageZ);
					tierBackfillScale = targetBackfillTierScale;
					var scaleBackfillDelta = targetBackfillTierScale / tierBackfillScalePrior;
					var newBackfillW = backfillW * scaleBackfillDelta;
					var newBackfillH = backfillH * scaleBackfillDelta;					
					var newBackfillL = backfillL + ((backfillW - newBackfillW) / 2);
					var newBackfillT = backfillT + ((backfillH - newBackfillH) / 2);					
					bS.width = newBackfillW + 'px';
					bS.height = newBackfillH + 'px';
					bS.left = newBackfillL + 'px';
					bS.top = newBackfillT + 'px';
					
				} else {
					if (oD) { Z.Utils.clearDisplay(oD); } // If use slider to zoom-in then zoom-out without stopping to update view, must clear oversize backfill, if present, or it will show in borders.
				
					newW = backfillW * scaleDelta;
					newH = backfillH * scaleDelta;
					newL = backfillL + ((Z.imageX  * (1 - scaleDelta)) * Z.imageZ);
					newT = backfillT + ((Z.imageY * (1 - scaleDelta)) * Z.imageZ);
					bS.width = newW + 'px';
					bS.height = newH + 'px';
					bS.left = newL + 'px';
					bS.top = newT + 'px';
				}
				
			} else {
				// In non-canvas context, scaling of each tile image is required.
				redisplayCachedTiles(vD, tierCurrent, tilesCached, 'centerOut', false, 'Scaling: non-canvas zoom');

				if (tierBackfillDynamic) {
					var buffer = BACKFILL_BUFFER;
					backfillW = displayW * buffer;
					backfillH = displayH * buffer;
					backfillL = -(displayW / buffer);
					backfillT = -(displayH / buffer);
					backfillCtrX = displayCtrX * buffer;
					backfillCtrY = displayCtrY * buffer;
					bD.width = backfillW;
					bD.height = backfillH;		
					bS.width = bD.width + 'px';
					bS.height = bD.height + 'px';
					bS.left = backfillL + 'px';
					bS.top = backfillT + 'px';
				} else {
					var tierBackfillW = tierWs[tierBackfill];
					var tierBackfillH = tierHs[tierBackfill];
					bD.width = tierBackfillW;
					bD.height = tierBackfillH;
					var deltaX = Z.imageX * imageZ;
					var deltaY = Z.imageY * imageZ;
					backfillL = (displayCtrX - deltaX);
					backfillT = (displayCtrY - deltaY);
					bS.left = backfillL + 'px';
					bS.top = backfillT + 'px';
				}

				// And scaling of each tile is also required for backfill display.
				redisplayCachedTiles(bD, tierBackfill, tilesBackfillCached, 'simple', false, 'Scaling: non-canvas zoom - backfill');
			}
			sync = true;
		}
		return sync;
	}

	this.reset = function (prior) {			
		if (Z.maskingSelection && Z.maskClearOnUserAction) { self.clearMask(); }
		if (!prior) {
			self.zoomAndPanToView(Z.initialX, Z.initialY, Z.initialZ, Z.initialR);
		} else {
			self.zoomAndPanToView(Z.priorX, Z.priorY, Z.priorZ, Z.priorR);
		}
		recordPriorViewCoordinates(true);
	}

	this.toggleWatermarks = function (override) {
		if (wS) {
			var showing = (wS.display == 'inline-block');
			var show = (typeof override !== 'undefined' && override !== null) ? override : !showing;
			wS.display = (show) ? 'inline-block' : 'none';
		}
	}
	
	this.toggleConstrainPan = function (override) {
		Z.constrainPan = (typeof override !== 'undefined' && override !== null) ? override : !Z.constrainPan;
		if (Z.constrainPan) {
			var x = parseFloat(vS.left);
			var y = parseFloat(vS.top);
			var constrainedPt = constrainPan(x, y, Z.imageZ, Z.imageR, 'container');
			cS.left = constrainedPt.x + 'px';
			cS.top = constrainedPt.y + 'px';
			self.updateView();
		}
	}
	
	this.toggleSmoothPan = function () {
		smoothPanStop();
		Z.smoothPan = !Z.smoothPan;
	}

	this.toggleBackfill = function () {
		var bD = document.getElementById('viewportBackfillDisplay' + viewportID.toString());
		if (bD) {
			var bS = bD.style;
			bS.display = (bS.display == 'none') ? 'inline-block' : 'none';
		}
	}

	this.toggleDisplay = function () {
		var vD = document.getElementById('viewportDisplay' + viewportID.toString());
		if (vD) {
			vS = vD.style;
			vS.display = (vS.display == 'none') ? 'inline-block' : 'none';
		}
	}


	//::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::
	//::::::::::::::::::: FULL VIEW, ROTATION, & IMAGE FILTER FUNCTIONS :::::::::::::::
	//::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::

	this.toggleFullViewModeExternal = function () {
		// Assumes call from external toolbar and internal toolbar hidden. Sets tracking variable to cause display
		// Exit button over viewport in full screen mode when external toolbar is hidden under viewport.
		buttonFullViewExitExternalVisible = true;
		self.toggleFullViewMode();
	}
	
	this.toggleFullViewMode =  function (override, escaped) {
		// DEV NOTE: Testing interaction between mode change and zoom-and-pan in progress.
		//self.zoomAndPanAllStop();
		if (Z.maskingSelection && Z.maskClearOnUserAction) { self.clearMask(); }
		
		// Hide toolbar if visible.
		if (Z.ToolbarDisplay) { Z.Toolbar.show(false); }
		
		var width = null;
		var height = null;

		// If override is false (called by Escape key) set false, otherwise, set to opposite of current state.
		Z.fullViewPrior = Z.fullView;
		Z.fullView = (typeof override !== 'undefined' && override !== null) ? override : !Z.fullView;
		
		// Declare and set document references.
		var fvB = document.body;
		var fvbS = fvB.style;
		var fvdS = document.documentElement.style;
		var fvvS = Z.ViewerDisplay.style;
		var fvcS = Z.Utils.getElementStyle(Z.pageContainer);
		var dimensions;			

		if (Z.fullView) {
			// Record non-full-page values.
			fvBodW = fvbS.width;
			fvBodH = fvbS.height;			
			fvBodO = fvbS.overflow;
			fvDocO = fvdS.overflow;
			fvContBC = (Z.Utils.stringValidate(fvcS.backgroundColor) && fvcS.backgroundColor != 'transparent') ? fvcS.backgroundColor : (Z.Utils.stringValidate(fvbS.backgroundColor) && fvbS.backgroundColor != 'transparent') ? fvbS.backgroundColor : Z.Utils.getResource('DEFAULT_FULLVIEWBACKCOLOR');
			fvContPos = fvvS.position;
			fvContIdx = fvvS.zIndex;
			
			// Implement full screen or full page view.
			if (Z.fullScreenSupported && !Z.fullPageVisible) {
				fullScreenEntering = true; // Subverts change event on mode entry.
				Z.Utils.fullScreenView(Z.ViewerDisplay, true);
				dimensions = Z.Utils.getScreenSize();
				
			} else {
				dimensions = Z.Utils.getWindowSize();
				if (!Z.mobileDevice) {
					fvbS.width = '100%';
					fvbS.height = '100%';
				} else {
					fvbS.width = dimensions.x;
					fvbS.height = dimensions.y;
				}
			}
			width = dimensions.x;
			height = dimensions.y;

			// Update related settings.
			fvbS.overflow = 'hidden';
			fvdS.overflow = 'hidden';
			fvvS.backgroundColor = fvContBC;
			fvvS.position = 'fixed';
			fvvS.zIndex = '99999999';

		} else {

			// Reset related settings.
			fvbS.overflow = fvBodO;
			fvdS.overflow = fvDocO;
			fvvS.backgroundColor = fvContBC;
			fvvS.position = 'relative';
			fvvS.zIndex = fvContIdx;

			// Unimplement full screen or full page view.
			if (Z.fullScreenSupported && !Z.fullPageVisible) {
				Z.Utils.fullScreenView(Z.ViewerDisplay, false, escaped);
			}
			
			fvbS.width = fvBodW;
			fvbS.height = fvBodH;
			width = parseFloat(fvcS.width);
			height = parseFloat(fvcS.height);
			if (isNaN(width)) { width = Z.ViewerDisplay.clientWidth; }
			if (isNaN(height)) { height = Z.ViewerDisplay.clientHeight; }
			
			// Hide exit button in case visible due to external full view call.
			buttonFullViewExitExternalVisible = false;
		}

		// If page container is sized with pixel values rather than percentages or ‘vw’ and ‘vh’ auto-resizing will occur and resize must be called.
		if (!Z.autoResize) {
			if (Z.initialFullPage) { self.setSizeAndPosition(width, height); }
			var newZoom = Z.viewportCurrent.calculateZoomForResize(Z.viewportCurrent.getZoom(), Z.viewerW, Z.viewerH, width, height);
			Z.Viewer.resizeViewer(width, height, newZoom);
		}
		
		// Set full view or full view exit button visible based on full view status. If using external toolbar in page, display external exit button over viewport.
		showButtonFullViewExitInternal(Z.fullView);
		showButtonFullViewExitExternal(buttonFullViewExitExternalVisible);
		
		// Clear variable ensuring updateView on exit of full page view.
		Z.fullViewPrior = false;
	}
	
	function showButtonFullViewExitInternal (value) {
		var bFV = document.getElementById('buttonFullView');
		var bFVE = document.getElementById('buttonFullViewExit');
		if (bFV && bFVE) {
			bFV.style.display = (value) ? 'none' : 'inline-block';
			bFVE.style.display = (value) ? 'inline-block' : 'none';
		}
	}

	function showButtonFullViewExitExternal (value) {	
		if (value) {
			if (!buttonFullViewExitExternal) { configureButtonFullViewExitExternal(); }
			buttonFullViewExitExternal.elmt.style.display = 'inline-block';
		} else {
			if (buttonFullViewExitExternal) { buttonFullViewExitExternal.elmt.style.display = 'none'; }
		}
	}

	function configureButtonFullViewExitExternal () {	
		var btnTxt = Z.Utils.getResource('UI_FVCANCELBUTTONTEXT');
		var btnW = 34;
		var btnH = 34;
		var btnMargin = 20;
		var btnL = parseFloat(Z.viewerW) - (btnW + btnMargin);
		var btnT = parseFloat(Z.viewerH) - (btnH + btnMargin);
		var btnColor = Z.Utils.getResource('DEFAULT_FULLVIEWEXITEXTERNALBUTTONCOLOR');
		buttonFullViewExitExternal = new Z.Utils.Button('buttonFullViewExitExternal', btnTxt, null, null, null, null, btnW + 'px', btnH + 'px', btnL + 'px', btnT + 'px', 'mousedown', buttonFullViewExitExternalHandler, 'TIP_TOGGLEFULLVIEWEXITEXTERNAL', 'solid', '1px', btnColor, '0px', '0px');
		Z.ViewerDisplay.appendChild(buttonFullViewExitExternal.elmt);
	}

	function buttonFullViewExitExternalHandler () {
		self.toggleFullViewMode(false);
	}

	this.rotateClockwise =  function () {
		self.rotate(90, true);
	}

	this.rotateCounterwise =  function () {
		self.rotate(-90, true);
	}

	this.rotate =  function (degreesDelta, useZaptv) {
		if (Z.interactivityOff) { return; }
		if (Z.rotationSupported) {
			recordPriorViewCoordinates();
			var rotationValueNew = Z.imageR + degreesDelta;
			var rotationValueConstrained = constrainRotation(rotationValueNew);
			Z.interactivityOff = true;

			// Use zoom and pan function to gradually rotate to new rotation and/or to invoke pan constraint and reset 
			// coordinates, if necessary.  Set Z.imageR to constrained value after new unconstrained value implemented 
			// to avoid backward 270 rotation when rotating from 270 to 360 (0) or from -270 to -360 (0).
			if (useZaptv) {
				self.zoomAndPanToView(Z.imageX, Z.imageY, Z.imageZ, rotationValueNew, 600, 12, function () { Z.imageR = rotationValueConstrained; });			
			} else {
				Z.Utils.rotateElement(cS, rotationValueNew);
				if (Z.imageR != 0) {
					var deltaR = rotationValueNew - Z.imageR;
					oCtx.rotate(deltaR * Math.PI / 180);
				}
				Z.imageR = rotationValueConstrained;
				self.zoomAndPanToView(Z.imageX, Z.imageY, Z.imageZ);
			}
		} else {
			Z.Utils.showMessage(Z.Utils.getResource('ALERT_ROTATIONREQUIRESNEWERBROWSER'));
		}
	}
	
	this.toggleEditModeMeasure =  function (override) {
		self.zoomAndPanAllStop();
		if (Z.maskingSelection && Z.maskClearOnUserAction) { self.clearMask(); }

		// If override is false set false, otherwise, set to opposite of current state.
		if (typeof override !== 'undefined' && !override || Z.labelMode == 'measure') { 
			
			// If measuring while not in edit mode be sure to delete any hotspot polygons previously created to display a measurement.
			if (Z.editMode === null && Z.labelMode == 'measure' && hotspots.length > 0) {
				self.deleteAllMeasureHotspots();
				hotspotCurrentID = null;
			}
			self.setEditModeLabel('view');
			
		} else {
			self.setEditModeLabel('measure');
		}
	}
	


	//::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::
	//::::::::::::::::::::::::::::::::::::: EVENT FUNCTIONS ::::::::::::::::::::::::::::::::::::
	//::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::

	// Handle mouse and touch events that are Viewport-specific. Keyboard events are handled 
	// at the level of the Viewer. Disable right-click / control-click / click-hold menu.
	function initializeViewportEventListeners () {
		Z.Utils.addEventListener(cD, 'mousedown', viewportEventsHandler);
		Z.Utils.addEventListener(cD, 'mousemove', Z.Utils.preventDefault);
		Z.Utils.addEventListener(cD, 'touchstart', viewportEventsHandler);
		Z.Utils.addEventListener(cD, 'touchmove', viewportEventsHandler);
		Z.Utils.addEventListener(cD, 'touchend', viewportEventsHandler);
		Z.Utils.addEventListener(cD, 'touchcancel', viewportEventsHandler);
		Z.Utils.addEventListener(cD, 'gesturestart', viewportEventsHandler);
		Z.Utils.addEventListener(cD, 'gesturechange', viewportEventsHandler);
		Z.Utils.addEventListener(cD, 'gestureend', viewportEventsHandler);
		Z.Utils.addEventListener(bD, 'contextmenu', Z.Utils.preventDefault);
		Z.Utils.addEventListener(vD, 'contextmenu', Z.Utils.preventDefault);
		if (wD) { Z.Utils.addEventListener(wD, 'contextmenu', Z.Utils.preventDefault); }
		if (hD) { Z.Utils.addEventListener(hD, 'contextmenu', Z.Utils.preventDefault); }
	}
	
	function viewportEventsHandler (event) {		
		var event = Z.Utils.event(event);
		var eventType = event.type;			
		if (event && eventType) {
		
			// Debug option: use next line to verify touch events properly preventing default simulation of mouse events.
			//if (eventType == 'mouseover' || eventType == 'mousedown' || eventType == 'mouseup' || eventType == 'mouseout') { alert('mouse event: ' + eventType); }
			
			// Prevent unwanted effects: interactivity or mouse-panning if parameters specify, zoom on right-click,
			// page dragging in touch contexts, and conflicting zoom-and-pan function calls. DEV NOTE: Timeout in 
			// next line is placeholder workaround for hotspot icon and caption anchor failure in IE.
			var openPoly = (!polygonComplete && (Z.labelMode == 'polygon' || Z.labelMode == 'measure'));
			var isRightMouseBtn = Z.Utils.isRightMouseButton(event);
			var isAltKey = event.altKey;
			var blockRightClick = isRightMouseBtn && !openPoly;
			
			if ((eventType != 'mouseover' && eventType != 'mouseout' && Z.interactivityOff) 
				|| (eventType == 'mousedown' && (Z.interactivityOff || (Z.coordinatesVisible && isAltKey)))
				|| blockRightClick) {	
				Z.tourStop = true; // Prevents autostart if not started or next destination.
				return;
			} else if (eventType == 'mousedown' || eventType == 'touchstart' || (Z.tourPlaying && Z.tourStop)) { 
				self.zoomAndPanAllStop();
				self.tourStop(); // Sets Z.tourPlaying = false;
				Z.tourStop = true;
				Z.interactivityOff = false;
			}
			
			if (Z.touchSupport && !Z.clickZoomAndPanBlock && eventType != 'touchmove' && eventType != 'gesturechange') { 
				event.preventDefault(); 
			}
			if (eventType == 'mousedown') {
				var displayMouseDownTimer = window.setTimeout( function () { self.zoomAndPanAllStop(false, true); }, 1);
				if (Z.maskingSelection && Z.maskClearOnUserAction) { self.clearMask(); }
			
			} else if (eventType == 'touchstart' || eventType == 'gesturestart') {
				// DEV NOTE: Next line is necessary to prevent simulated mouse events which can cause duplicate event such as second function call. 
				// However, must not be implemented on standard mouse click of hotspot as will prevent hotspot clickURL effect implemented as anchor href.
				var prevDef = false;
				touch = Z.Utils.getFirstTouch(event);
				if (typeof touch !== 'undefined') {
					target = touch.target;
					var hotspotSelect = getHotspotTarget(target);
					if (hotspotSelect === null) {
						prevDef = true; // Not clicking hotspot.
					} else {
						var hotID = hotspotSelect.id.substring(3, hotspotSelect.id.length);
						var index = Z.Utils.arrayIndexOfObjectValue(hotspots, 'internalID', hotID);
						if (index != -1) {
							var hotspot = hotspots[index];
							if (hotspot !== null && hotspot.clickURL == 'function') {
								prevDef = true; // Click hotspot that has click function.
							}
						}
					}
				}
				if (prevDef) { event.preventDefault(); }
																
				self.zoomAndPanAllStop(false, true);
				if (Z.maskingSelection && Z.maskClearOnUserAction) { self.clearMask(); }
			}
		
			// Handle event resetting.
			switch(eventType) {
				case 'mouseover' :
					// Prevent page scrolling using arrow keys. Also implemented in text element blur handler.
					if (!Z.fullView && document.activeElement.tagName != 'TEXTAREA') {
						Z.Viewer.initializeViewerKeyDefaultListeners(true);
					}
					break;					
				case 'mousedown' :
					// Ensure mouse interaction with viewport re-enables key interaction by removing focus from any text area and adding key listeners.
					if (!Z.fullView && document.activeElement) { document.activeElement.blur(); }
					Z.Viewer.initializeViewerKeyEventListeners(true);			
					
					// Note: handler for mouse down event attached to viewport, mouse up attached to viewer.
					Z.Utils.addEventListener(document, 'mousemove', viewportEventsHandler);
					Z.Utils.addEventListener(document, 'mouseup', viewportEventsHandler);
					break;					
				case 'mouseup' :
					Z.Utils.removeEventListener(document, 'mousemove', viewportEventsHandler);
					Z.Utils.removeEventListener(document, 'mouseup', viewportEventsHandler);
					break;
			}

			// Handle event actions.
			viewportEventsManager(event);
			
			if (eventType == 'mousedown' || eventType == 'mousemove') { return false; }
		}	
	}
	
	function viewportEventsManager (event) {
		var vpIDStr = viewportID.toString();
		
		var event = Z.Utils.event(event);
		var eventType = event.type;
		if (event && eventType) {
			
			var touch, target, relatedTarget, mPt;
			if (eventType == 'touchstart' || eventType == 'touchmove' || eventType == 'touchend' || eventType == 'touchcancel') {
				touch = Z.Utils.getFirstTouch(event);
				if (typeof touch !== 'undefined') {
					target = touch.target;
					mPt = new Z.Utils.Point(touch.pageX, touch.pageY);
				}
			} else {
				target = Z.Utils.target(event);
				relatedTarget = Z.Utils.relatedTarget(event);
				var isRightMouseBtn = Z.Utils.isRightMouseButton(event);
				var isAltKey = event.altKey;
				if (eventType != 'resize') { mPt = Z.Utils.getMousePosition(event); }
				if (Z.smoothPan) { smoothPanMousePt = mPt; }
			}
					
			// Standardize Firefox mouse wheel event.
			if (eventType == 'DOMMouseScroll') { eventType = 'mousewheel'; }
			
			// Calculate zoom and click values.
			var zVal = self.getZoom();	
			var zValStr = (zVal * 100).toString();
			var clickPt;
			if (typeof mPt !== 'undefined' && mPt !== null) {
				clickPt = self.getClickCoordsInImage(event, zVal, mPt);
			}
					
			// Implement actions.
			switch(eventType) {
					
				case 'mousedown' :
					Z.mouseIsDown = true;
					dragPtStart = new Z.Utils.Point(mPt.x, mPt.y); // Variables for dragging set and cleared separately from mouse position variables.
					cD.mouseXPrior = mPt.x;
					cD.mouseYPrior = mPt.y;
					
					if (((Z.labelMode == 'rectangle' || Z.labelMode == 'polygon' || Z.labelMode == 'measure') && hotspotCurrentID !== null) || (Z.labelMode == 'rectangle' && hotspotCurrentID === null)) {
						// Click polygon control point to edit. If click-drag to create rectangle, hotspot ID null until creation on mouse-up.
						controlPointCurrent = getClickedControlPoint(event, clickPt);
					}

					if (!isAltKey && Z.labelMode != 'view' && ((Z.editing == 'addLabel' || Z.editing == 'editLabel') || (Z.editMode === null && Z.labelMode == 'measure'))) {
						// Create or modify freehand or rectangle labels. Text, icon, polygon, and measure modes handled in mouseup event.
						// First clear choicelists and messages and save prior label if freehand or rectangle, but not if polygon and measurements as these can have multiple mouse-up events.
						Z.Utils.hideMessage(); // Hide any tip if first use to avoid need for clicking OK button.
						
						if (Z.editing == 'addLabel' && (Z.labelMode == 'freehand' || (Z.labelMode == 'rectangle' && controlPointCurrent === null))) {
							self.saveEditsLabel(true, false, false);
						}
						
						var createdNewLabel = false;
						if (createdNewLabel && !Z.annotationsAddMultiple) { Z.editing = 'editLabel'; }
						
					} else if (Z.smoothPan && !isAltKey && Z.mousePan) {
						smoothPanStart();
					}					
					break;
					
				case 'mousemove' :
					dragPtCurrent = new Z.Utils.Point(mPt.x, mPt.y);
					var mPtZX = (clickPt.x - Z.imageX) * zVal;
					var mPtZY = (clickPt.y - Z.imageY) * zVal;
					
					// Clear double-click timer if no need to close polygon.
					if (clickTimer) {
						clearTimeout(clickTimer);
						clickTimer = null;
						polygonClickHandler(event, clickPt, isDblClick);
					}
						
					if (!isAltKey && ((Z.editMode === null && Z.labelMode == 'measure') || (Z.labelMode != 'view' && (Z.editing == 'addLabel' || Z.editing == 'editLabel')))) {
						
						// Create or modify labels.
						var hotspotCurrentIndex = Z.Utils.arrayIndexOfObjectValue(hotspots, 'internalID', hotspotCurrentID);
						var polygonClosed = (hotspotCurrentIndex != -1) ? hotspots[hotspotCurrentIndex].polyClosed : false;
							
						if ((Z.labelMode == 'rectangle' || Z.labelMode == 'polygon' || Z.labelMode == 'measure') && controlPointCurrent !== null && Z.mouseIsDown) {
							// Drag existing control point.
							updatePolygon(hotspotCurrentID, controlPointCurrent, clickPt);

						} else if ((Z.labelMode == 'polygon' || Z.labelMode == 'measure') && !polygonClosed && (!Z.mouseIsDown || (Z.mouseIsDown && controlPointCurrent !== null))) {
							// Draw bungee.
							drawPolygonBungeeLine(mPtZX, mPtZY, clickPt);
						}

					} else if (!isAltKey && Z.mousePan) {
							
						// Pan the image.
						if (smoothPanInterval) {
							// In smooth pan mode. Pan occurs in interval handler. Get mouse position.
							smoothPanMousePt = mPt;
							
						} else {							
							// In direct pan mode. Pan image if no image set or zoomed in, otherwise animate by changing Viewport.
							if (!Z.animation || self.getZoom() != Z.minZ) {

								// Calculate change in mouse position.
								var deltaX = mPt.x - cD.mouseXPrior;
								var deltaY = mPt.y - cD.mouseYPrior;
									
								if (!isNaN(deltaX) && !isNaN(deltaY)) {

									// Calculate new position of displays container.
									var newL = parseFloat(cS.left) + deltaX;
									var newT = parseFloat(cS.top) + deltaY;

									// Constrain new position.
									var constrainedPt = constrainPan(newL, newT, Z.imageZ, Z.imageR, 'container');
									cS.left = constrainedPt.x + 'px';
									cS.top = constrainedPt.y + 'px';

									// Update stored page coordinates for next call to this function.
									cD.mouseXPrior = mPt.x;
									cD.mouseYPrior = mPt.y;

									// Implement oversize backfill if required.
									var deltaX = constrainedPt.x - displayL;
									var deltaY = constrainedPt.y - displayT;
									if (oD && tierBackfillDynamic && (Z.mobileDevice || (Math.abs(deltaX) > (viewW / 2) || Math.abs(deltaY) > (viewH / 2)))) {
										redisplayCachedTiles(oD, tierBackfillOversize, tilesBackfillCached, 'simple', false, 'Updating backfill oversize display');
									}

									// Sync navigator rectangle if visible.
									if (Z.Navigator) {
										var currentCenterPt = self.calculateCurrentCenterCoordinates(constrainedPt, Z.imageZ, Z.imageR);
										Z.Navigator.syncNavigatorRectangleToViewport(currentCenterPt);
									}
								}
							} else {
								if (mPt.x > cD.mouseXPrior) {
									Z.Viewer.viewportNext();
								} else if (mPt.x < cD.mouseXPrior) {
									Z.Viewer.viewportPrior();
								}

								// Update stored page coordinates for next call to this function.
								cD.mouseXPrior = mPt.x;
								cD.mouseYPrior = mPt.y;
							}
						}
					}
					break;
					
				case 'mouseup' :
					Z.mouseIsDown = false;
					document.mousemove = null;
					document.mouseup = null;
					var dragPtEnd;
					
					if (!Z.mouseOutDownPoint) {
						dragPtEnd = new Z.Utils.Point(mPt.x, mPt.y);
					} else {
						dragPtEnd = Z.mouseOutDownPoint;
						clickPt = self.getClickCoordsInImage(event, zVal, Z.mouseOutDownPoint);
					}
					
					var dragDist = Z.Utils.calculatePointsDistance(dragPtStart.x, dragPtStart.y, dragPtEnd.x, dragPtEnd.y);
					if (dragDist < 4 || (!isAltKey && (Z.labelMode == 'freehand' || Z.labelMode == 'rectangle'))) {
						
						if (!hotspotDragging && ((Z.editMode === null && Z.labelMode == 'measure') || (Z.labelMode != 'view' && (Z.editing == 'addLabel' || Z.editing == 'editLabel')))) {
							
							// First save any previously edited label not saved on mousedown.
							if (Z.editing == 'addLabel' && !isAltKey && polygonComplete && (Z.labelMode == 'text' || Z.labelMode == 'icon' || Z.labelMode == 'polygon' || Z.labelMode == 'measure')) {
								self.saveEditsLabel(true, false, false);
							}
							
							if ((!(isAltKey && polygonComplete) || isRightMouseBtn) && (Z.labelMode == 'freehand' || Z.labelMode == 'rectangle' || Z.labelMode == 'polygon' || Z.labelMode == 'measure')) {
								// In edit mode, handle click on or off control point with current polygon/rectangle or without. If drawing new polygon reset mouse move event handler to support bungee line drawing.
								// Freehand completion also handled here. First double condition above prevents creation of polygon with one control point by alt-clicking before ever clicking.
								// Alternative implemenation: enable next two lines and disable if/else clause below to disable double-click close option for polygons and only support alt-click and right-click.
								
								if (isAltKey || isRightMouseBtn) {
									polygonClickHandler(event, clickPt);
									if (!polygonComplete) { Z.Utils.addEventListener(document, 'mousemove', viewportEventsHandler); }
								} else {
									Z.Utils.addEventListener(document, 'mousemove', viewportEventsHandler);
									var isDblClick = false;
									if (!clickTimer) { // First click, delay and wait for second click.
										clickTimer = setTimeout(function(event) {
											clickTimer = null;
											polygonClickHandler(event, clickPt, isDblClick);
										}, Z.doubleClickDelay);
										if (Z.labelMode != 'polygon' && Z.labelMode != 'measure') { Z.Utils.removeEventListener(document, 'mousemove', viewportEventsHandler); }
									} else { // Second click.
										isDblClick = true;
										clearTimeout(clickTimer);
										clickTimer = null;
										polygonClickHandler(event, clickPt, isDblClick);
										Z.Utils.removeEventListener(document, 'mousemove', viewportEventsHandler);
									}
								}
													
							} else if (!isAltKey) {
								var poiID = (typeof poiList !== 'undefined' && poiList.options.length > 0) ? poiID = poiList.options[poiList.selectedIndex].value : 0;
								var createdNewLabel = false;
								
								if (createdNewLabel) {
									var newLabel = labelListDP[labelListDP.length - 1];
									populateLabels(newLabel.poiID, newLabel.value);
									
									if (!Z.annotationsAddMultiple) { Z.editing = 'editLabel'; }
								}
							
							}
											
						} else if ((Z.editing === null || Z.labelMode == 'view') && !hotspotDragging) {
						
							// Detect if label clicked.
							var hotspotSelect = null;
							if (Z.labelClickSelect) { hotspotSelect = getHotspotTarget(target); }
							
							if (hotspotSelect !== null) {
								// Select label in panel and zoom and pan to its coordinates.								
								var hotspotInternalID = hotspotSelect.id.substring(3, hotspotSelect.id.length);
								var index = Z.Utils.arrayIndexOfObjectValue(hotspots, 'internalID', hotspotInternalID);
								if (index != -1) {
									var hotspot = hotspots[index];
									populatePOIs(hotspot.poiID, hotspot.internalID);
									self.zoomAndPanToView(hotspot.x, hotspot.y, (hotspot.z / 100), hotspot.rotation);
									
								}
								// If hotspot or tour list, with title, unset current selection and set to title.
								if (hotspotList && (Z.hotspotListTitle || Z.tourListTitle)) { hotspotList.selectedIndex = 0; }
							
							} else {
							
								// Zoom and/or pan.
								if (Z.clickZoom || Z.clickPan) {
									var doubleClick = (clickTimer && Z.doubleClickZoom) ? true : false;
									var clickPtZoom = self.getClickZoomCoords3D(event, dragPtStart, tierCurrent, tierScale, doubleClick);
								}
								if (Z.clickZoom) {	
									if (!Z.doubleClickZoom) {
										// DEV NOTE: Timeout in line below is placeholder workaround for caption anchor failure in Firefox necessary if not implementing single-click delay below.
										var viewerDisplayMouseUpClickZoomTimer = window.setTimeout( function () { self.zoomAndPanToView(clickPtZoom.x, clickPtZoom.y, clickPtZoom.z); }, 1);

									} else {
										if (!clickTimer) { // First click, delay and wait for second click.
											clickTimer = setTimeout(function(event) {
												clickTimer = null;
												self.zoomAndPanToView(clickPtZoom.x, clickPtZoom.y, clickPtZoom.z);										
											}, Z.doubleClickDelay);																			

										} else { // Second click.
											clearTimeout(clickTimer);
											clickTimer = null;
											self.zoomAndPanToView(clickPtZoom.x, clickPtZoom.y, clickPtZoom.z);
										}
									}

								} else if (Z.clickPan) {
									self.zoomAndPanToView(clickPtZoom.x, clickPtZoom.y, Z.imageZ);
								}
							}
						}
						
					} else {
						// Drag control point.
						if ((Z.labelMode == 'rectangle' || Z.labelMode == 'polygon' || Z.labelMode == 'measure') && (controlPointDragging || (controlPointCurrent === null && !polygonComplete))) {
							controlPointCurrent = null;
							controlPointDragging = false;
							var hotspotCurrentIndex = Z.Utils.arrayIndexOfObjectValue(hotspots, 'internalID', hotspotCurrentID);
							if (hotspotCurrentIndex != -1) {
								var hotspot = hotspots[hotspotCurrentIndex];
								var polyCenter = Z.Utils.polygonCenter(hotspot.polygonPts, hotspot.polyClosed);
								hotspot.x = polyCenter.x;
								hotspot.y = polyCenter.y;								
								Z.Utils.clearDisplay(eD);
								var hC = new HotspotContext();
								displayHotspot(hotspot, hC);
								if (!polygonComplete) { Z.Utils.addEventListener(document, 'mousemove', viewportEventsHandler); }
							}
							
						}

						dragPtCurrent = null;
						
						// Test for need for updateView. If in smoothPanGliding this test occurs before smooth pan interval sees that mouse is up.
						if (Z.mousePan && !Z.smoothPan) { self.updateView(); }
					}
					
					
					// If mouse-dragged out of viewer display rather than mousing out, hide components.
					if (Z.mouseOutDownPoint) {
						if (Z.ToolbarDisplay && Z.toolbarAutoShowHide) { Z.Toolbar.show(false); }
						if (Z.NavigatorDisplay && Z.navigatorVisible > 1) { Z.Navigator.setVisibility(false); }
						if (Z.Toolbar && Z.annotations && (Z.annotationPanelVisible == 2 || Z.annotationPanelVisible == 3)) { Z.Toolbar.setVisibilityAnnotationPanel(false); }
					}
					break;
					
				case 'touchstart' :
					if (touch && !gestureInterval) {					
						Z.mouseIsDown = true;
						wasGesturing = false;
						dragPtStart = new Z.Utils.Point(mPt.x, mPt.y);
						cD.mouseXPrior = mPt.x;
						cD.mouseYPrior = mPt.y;

						if (((Z.labelMode == 'rectangle' || Z.labelMode == 'polygon' || Z.labelMode == 'measure') && hotspotCurrentID !== null) || (Z.labelMode == 'rectangle' && hotspotCurrentID === null)) {
							// Click polygon control point to edit. If click-drag to create rectangle, hotspot ID null until creation on mouse-up.
							controlPointCurrent = getClickedControlPoint(event, clickPt);
						}

						if (!isAltKey && Z.labelMode != 'view' && ((Z.editing == 'addLabel' || Z.editing == 'editLabel') || (Z.editMode === null && Z.labelMode == 'measure'))) {
							// Create or modify freehand or rectangle labels. Text, icon, polygon, and measure modes handled in mouseup event.
							// First clear choicelists and messages and save prior label if freehand or rectangle, but not if polygon and measurements as these can have multiple mouse-up events.
							Z.Utils.hideMessage(); // Hide any tip if first use to avoid need for clicking OK button.
							
						}	
						// DEV NOTE: smooth pan disabled for touch events in current implementation because touch interfaces introduce smooth interaction due to response delays. 	
						/*} else if (Z.smoothPan && !isAltKey  && Z.mousePan) {
							smoothPanStart();
						}*/	
					}
					break;
					
				case 'touchmove' :					
					// Touches are prevented when gesturing, as well as when in process of ending gesture
					// by lifting fingers - even when fingers are lifted separately. No bungee drawing between 
					// touches to create control points as no tracking of finger when not touching.
					if (touch && !gestureInterval && !wasGesturing) {	
					
						dragPtCurrent = new Z.Utils.Point(mPt.x, mPt.y);
						var mPtZX = (clickPt.x - Z.imageX) * zVal;
						var mPtZY = (clickPt.y - Z.imageY) * zVal;
					
						// Clear double-click timer if no need to close polygon.
						if (clickTimer) {
							clearTimeout(clickTimer);
							clickTimer = null;
							polygonClickHandler(event, clickPt, isDblClick);
						}

						if (!isAltKey && ((Z.editMode === null && Z.labelMode == 'measure') || (Z.labelMode != 'view' && (Z.editing == 'addLabel' || Z.editing == 'editLabel')))) {
							
							// Create or modify labels.
							var hotspotCurrentIndex = Z.Utils.arrayIndexOfObjectValue(hotspots, 'internalID', hotspotCurrentID);
							var polygonClosed = (hotspotCurrentIndex != -1) ? hotspots[hotspotCurrentIndex].polyClosed : false;

							if ((Z.labelMode == 'rectangle' || Z.labelMode == 'polygon' || Z.labelMode == 'measure') && controlPointCurrent !== null && Z.mouseIsDown) {
								// Drag existing control point.
								updatePolygon(hotspotCurrentID, controlPointCurrent, clickPt);

							} else if ((Z.labelMode == 'polygon' || Z.labelMode == 'measure') && !polygonClosed && (!Z.mouseIsDown || (Z.mouseIsDown && controlPointCurrent !== null))) {
								// Draw bungee.
								drawPolygonBungeeLine(mPtZX, mPtZY, clickPt);
							}

						} else if (!isAltKey && Z.mousePan) { 
						
							// Pan the image. DEV NOTE: smooth pan disabled for touch events in current implementation because touch interfaces introduce smooth interaction due to response delays. 	
							if (smoothPanInterval) { 
								// In smooth pan mode. Pan occurs in interval handler. Get mouse position.
								smoothPanMousePt = mPt;
														
							} else {
								// In direct pan mode. Calculate change in mouse position.
								var deltaX = mPt.x - cD.mouseXPrior;
								var deltaY = mPt.y - cD.mouseYPrior;

								if (!isNaN(deltaX) && !isNaN(deltaY)) {
									// Calculate new position of displays container.
									var newL = parseFloat(cS.left) + deltaX;
									var newT = parseFloat(cS.top) + deltaY;

									// Constrain new position.
									var constrainedPt = constrainPan(newL, newT, Z.imageZ, Z.imageR, 'container');
									cS.left = constrainedPt.x + 'px';
									cS.top = constrainedPt.y + 'px';

									// Update stored page coordinates for next call to this function.
									cD.mouseXPrior = mPt.x;
									cD.mouseYPrior = mPt.y;

									// Implement oversize backfill if required.
									var deltaX = constrainedPt.x - displayL;
									var deltaY = constrainedPt.y - displayT;
									if (oD && tierBackfillDynamic && (Z.mobileDevice || (Math.abs(deltaX) > (viewW / 2) || Math.abs(deltaY) > (viewH / 2)))) {
										redisplayCachedTiles(oD, tierBackfillOversize, tilesBackfillCached, 'simple', false, 'Updating backfill oversize display');
									}

									// Sync navigator rectangle if visible.
									if (Z.Navigator) {
										var currentCenterPt = self.calculateCurrentCenterCoordinates(constrainedPt, Z.imageZ, Z.imageR);
										Z.Navigator.syncNavigatorRectangleToViewport(currentCenterPt);
									}
								}
							}
						}
					}
					break;				
					
				case 'touchend' :								
					if (!gestureInterval && !wasGesturing) {
					
						Z.mouseIsDown = false;
						document.mousemove = null;
						document.mouseup = null;
						var dragPtEnd;
						
						// End event returns touches object as undefined. Use last postion from touchmove
						// or if that has not been set use position from touchstart.
						if (!Z.mouseOutDownPoint) {
							if (typeof mPt !== 'undefined' && mPt !== null) {
								dragPtEnd = new Z.Utils.Point(mPt.x, mPt.y);
							} else if (typeof dragPtCurrent !== 'undefined' && dragPtCurrent !== null) {
								dragPtEnd = dragPtCurrent;
							} else {
								dragPtEnd = dragPtStart;
							}
						} else {
							dragPtEnd = Z.mouseOutDownPoint;
							clickPt = self.getClickCoordsInImage(event, zVal, Z.mouseOutDownPoint);
						}

						var dragDist = Z.Utils.calculatePointsDistance(dragPtStart.x, dragPtStart.y, dragPtEnd.x, dragPtEnd.y);
						if (dragDist < 4 || (!isAltKey && (Z.labelMode == 'rectangle' || Z.labelMode == 'freehand'))) {
				
								if (!hotspotDragging && ((Z.editMode === null && Z.labelMode == 'measure') || (Z.labelMode != 'view' && (Z.editing == 'addLabel' || Z.editing == 'editLabel')))) {

									// First save any previously edited label not saved on mousedown.
									if (Z.editing == 'addLabel' && !isAltKey && polygonComplete && (Z.labelMode == 'text' || Z.labelMode == 'icon' || Z.labelMode == 'polygon' || Z.labelMode == 'measure')) {
										self.saveEditsLabel(true, false, false);
									}

									if (!(isAltKey && polygonComplete) && (Z.labelMode == 'freehand' || Z.labelMode == 'rectangle' || Z.labelMode == 'polygon' || Z.labelMode == 'measure')) {
										// In edit mode, handle click on or off control point with current polygon/rectangle or without. If drawing new polygon reset mouse move event handler to support bungee line drawing.
										// Freehand completion also handled here. First double condition above prevents creation of polygon with one control point by alt-clicking before ever clicking.
										// Alternative implemenation: enable next two lines and disable if/else clause below to disable double-click close option for polygons and only support alt-click and right-click.
										
										if (isAltKey || isRightMouseBtn) {
											polygonClickHandler(event, clickPt);								
											if (!polygonComplete) { Z.Utils.addEventListener(document, 'mousemove', viewerEventsHandler); }

										} else {
											Z.Utils.addEventListener(document, 'touchmove', viewportEventsHandler);
											var isDblClick = false;
											if (!clickTimer) { // First click, delay and wait for second click.
												clickTimer = setTimeout(function(event) {
													clickTimer = null;
													polygonClickHandler(event, clickPt, isDblClick);
												}, Z.doubleClickDelay);
												if (Z.labelMode != 'polygon' && Z.labelMode != 'measure') { Z.Utils.removeEventListener(document, 'touchmove', viewportEventsHandler); }
											} else { // Second click.
												isDblClick = true;
												clearTimeout(clickTimer);
												clickTimer = null;
												polygonClickHandler(event, clickPt, isDblClick);
												Z.Utils.removeEventListener(document, 'touchmove', viewportEventsHandler);
											}
										}
								
								} else if (!isAltKey) {
									var poiID = (typeof poiList !== 'undefined' && poiList.options.length > 0) ? poiID = poiList.options[poiList.selectedIndex].value : 0;
									var createdNewLabel = false;

									if (createdNewLabel) {
										var newLabel = labelListDP[labelListDP.length - 1];
										populateLabels(newLabel.poiID, newLabel.value);
									}

								}

							} else if ((Z.editing === null || Z.labelMode == 'view') && !hotspotDragging) {								
								// Zoom and/or pan.						
								if (Z.clickZoom) {
									var doubleClick = (clickTimer && Z.doubleClickZoom) ? true : false;
									var clickPtZoom = self.getClickZoomCoords3D(event, dragPtStart, tierCurrent, tierScale, doubleClick);
								
									if (!Z.doubleClickZoom) {
										// DEV NOTE: Timeout in line below is placeholder workaround for caption anchor failure in Firefox necessary if not implementing single-click delay below.
										var viewerDisplayMouseUpClickZoomTimer = window.setTimeout( function () { self.zoomAndPanToView(clickPtZoom.x, clickPtZoom.y, clickPtZoom.z); }, 1);
									
									} else {								
										if (!clickTimer) { // First click, delay and wait for second click.
											clickTimer = setTimeout(function(event) {
												clickTimer = null;
												self.zoomAndPanToView(clickPtZoom.x, clickPtZoom.y, clickPtZoom.z);										
											}, Z.doubleClickDelay);																			

										} else { // Second click.
											clearTimeout(clickTimer);
											clickTimer = null;
											self.zoomAndPanToView(clickPtZoom.x, clickPtZoom.y, clickPtZoom.z);
										}
									}
									
								} else if (Z.clickPan) {
									self.zoomAndPanToView(clickPtZoom.x, clickPtZoom.y, Z.imageZ);
								}
							}

						} else {
							// Drag control point.
							if ((Z.labelMode == 'rectangle' || Z.labelMode == 'polygon' || Z.labelMode == 'measure') && (controlPointDragging || (controlPointCurrent === null && !polygonComplete))) {
								controlPointCurrent = null;
								controlPointDragging = false;
								var hotspotCurrentIndex = Z.Utils.arrayIndexOfObjectValue(hotspots, 'internalID', hotspotCurrentID);
								if (hotspotCurrentIndex != -1) {
									var hotspot = hotspots[hotspotCurrentIndex];
									var polyCenter = Z.Utils.polygonCenter(hotspot.polygonPts, hotspot.polyClosed);
									hotspot.x = polyCenter.x;
									hotspot.y = polyCenter.y;								
									Z.Utils.clearDisplay(eD);
									var hC = new HotspotContext();
									displayHotspot(hotspot, hC);
									if (!polygonComplete) { Z.Utils.addEventListener(document, 'touchmove', viewportEventsHandler); }
								}

							}

							dragPtCurrent = null;
						
							// Test for need for updateView. If in smoothPanGliding this test occurs before smooth pan interval sees that mouse is up.
							if (Z.mousePan && !smoothPanInterval) { self.updateView(); }
						}

						// If mouse-dragged out of viewer display rather than mousing out, hide components.
						if (Z.mouseOutDownPoint) {
							if (Z.ToolbarDisplay && Z.toolbarAutoShowHide) { Z.Toolbar.show(false); }
							if (Z.NavigatorDisplay && Z.navigatorVisible > 1) { Z.Navigator.setVisibility(false); }
							if (Z.Toolbar && Z.annotations && (Z.annotationPanelVisible == 2 || Z.annotationPanelVisible == 3)) { Z.Toolbar.setVisibilityAnnotationPanel(false); }
						}		
					}

					break;				
					
				case 'touchcancel' :					
					if (!gestureInterval && !wasGesturing) {
					
						Z.mouseIsDown = false;
						document.mousemove = null;
						document.mouseup = null;
						var dragPtEnd;
						
						// End event returns touches object as undefined. Use last postion from touchmove
						// or if that has not been set use position from touchstart.
						if (!Z.mouseOutDownPoint) {
							if (typeof mPt !== 'undefined' && mPt !== null) {
								dragPtEnd = new Z.Utils.Point(mPt.x, mPt.y);
							} else if (typeof dragPtCurrent !== 'undefined' && dragPtCurrent !== null) {
								dragPtEnd = dragPtCurrent;
							} else {
								dragPtEnd = dragPtStart;
							}
						} else {
							dragPtEnd = Z.mouseOutDownPoint;
							clickPt = self.getClickCoordsInImage(event, zVal, Z.mouseOutDownPoint);
						}

						var dragDist = Z.Utils.calculatePointsDistance(dragPtStart.x, dragPtStart.y, dragPtEnd.x, dragPtEnd.y);
						if (dragDist < 4 || (!isAltKey && (Z.labelMode == 'rectangle' || Z.labelMode == 'freehand'))) {
				
								if (!hotspotDragging && ((Z.editMode === null && Z.labelMode == 'measure') || (Z.labelMode != 'view' && (Z.editing == 'addLabel' || Z.editing == 'editLabel')))) {

									// First save any previously edited label not saved on mousedown.
									if (Z.editing == 'addLabel' && !isAltKey && polygonComplete && (Z.labelMode == 'text' || Z.labelMode == 'icon' || Z.labelMode == 'polygon' || Z.labelMode == 'measure')) {
										self.saveEditsLabel(true, false, false);
									}

									if (!(isAltKey && polygonComplete) && (Z.labelMode == 'freehand' || Z.labelMode == 'rectangle' || Z.labelMode == 'polygon' || Z.labelMode == 'measure')) {
										// In edit mode, handle click on or off control point with current polygon/rectangle or without. If drawing new polygon reset mouse move event handler to support bungee line drawing.
										// Freehand completion also handled here. First double condition above prevents creation of polygon with one control point by alt-clicking before ever clicking.
										// Alternative implemenation: enable next two lines and disable if/else clause below to disable double-click close option for polygons and only support alt-click and right-click.
										
										if (isAltKey || isRightMouseBtn) {
											polygonClickHandler(event, clickPt);								
											if (!polygonComplete) { Z.Utils.addEventListener(document, 'mousemove', viewerEventsHandler); }

										} else {
											Z.Utils.addEventListener(document, 'touchmove', viewportEventsHandler);
											var isDblClick = false;
											if (!clickTimer) { // First click, delay and wait for second click.
												clickTimer = setTimeout(function(event) {
													clickTimer = null;
													polygonClickHandler(event, clickPt, isDblClick);
												}, Z.doubleClickDelay);
												if (Z.labelMode != 'polygon' && Z.labelMode != 'measure') { Z.Utils.removeEventListener(document, 'touchmove', viewportEventsHandler); }
											} else { // Second click.
												isDblClick = true;
												clearTimeout(clickTimer);
												clickTimer = null;
												polygonClickHandler(event, clickPt, isDblClick);
												Z.Utils.removeEventListener(document, 'touchmove', viewportEventsHandler);
											}
										}
								
								} else if (!isAltKey) {
									var poiID = (typeof poiList !== 'undefined' && poiList.options.length > 0) ? poiID = poiList.options[poiList.selectedIndex].value : 0;
									var createdNewLabel = false;

									if (createdNewLabel) {
										var newLabel = labelListDP[labelListDP.length - 1];
										populateLabels(newLabel.poiID, newLabel.value);
									}
								}

							} else if ((Z.editing === null || Z.labelMode == 'view') && !hotspotDragging) {								
								// Zoom and/or pan.						
								if (Z.clickZoom) {
									var doubleClick = (clickTimer && Z.doubleClickZoom) ? true : false;
									var clickPtZoom = self.getClickZoomCoords3D(event, dragPtStart, tierCurrent, tierScale, doubleClick);
								
									if (!Z.doubleClickZoom) {
										// DEV NOTE: Timeout in line below is placeholder workaround for caption anchor failure in Firefox necessary if not implementing single-click delay below.
										var viewerDisplayMouseUpClickZoomTimer = window.setTimeout( function () { self.zoomAndPanToView(clickPtZoom.x, clickPtZoom.y, clickPtZoom.z); }, 1);
									
									} else {								
										if (!clickTimer) { // First click, delay and wait for second click.
											clickTimer = setTimeout(function(event) {
												clickTimer = null;
												self.zoomAndPanToView(clickPtZoom.x, clickPtZoom.y, clickPtZoom.z);										
											}, Z.doubleClickDelay);																			

										} else { // Second click.
											clearTimeout(clickTimer);
											clickTimer = null;
											self.zoomAndPanToView(clickPtZoom.x, clickPtZoom.y, clickPtZoom.z);
										}
									}
									
								} else if (Z.clickPan) {
									self.zoomAndPanToView(clickPtZoom.x, clickPtZoom.y, Z.imageZ);
								}
							}

						} else {
							// Drag control point.
							if ((Z.labelMode == 'rectangle' || Z.labelMode == 'polygon' || Z.labelMode == 'measure') && (controlPointDragging || (controlPointCurrent === null && !polygonComplete))) {
								controlPointCurrent = null;
								controlPointDragging = false;
								var hotspotCurrentIndex = Z.Utils.arrayIndexOfObjectValue(hotspots, 'internalID', hotspotCurrentID);
								if (hotspotCurrentIndex != -1) {
									var hotspot = hotspots[hotspotCurrentIndex];
									var polyCenter = Z.Utils.polygonCenter(hotspot.polygonPts, hotspot.polyClosed);
									hotspot.x = polyCenter.x;
									hotspot.y = polyCenter.y;							
									Z.Utils.clearDisplay(eD);
									var hC = new HotspotContext();
									displayHotspot(hotspot, hC);
									if (!polygonComplete) { Z.Utils.addEventListener(document, 'touchmove', viewportEventsHandler); }
								}

							}

							dragPtCurrent = null;
													
							// Test for need for updateView. If in smoothPanGliding this test occurs before smooth pan interval sees that mouse is up.
							if (Z.mousePan && !smoothPanInterval) { self.updateView(); }
						}

						// If mouse-dragged out of viewer display rather than mousing out, hide components.
						if (Z.mouseOutDownPoint) {
							if (Z.ToolbarDisplay && Z.toolbarAutoShowHide) { Z.Toolbar.show(false); }
							if (Z.NavigatorDisplay && Z.navigatorVisible > 1) { Z.Navigator.setVisibility(false); }
							if (Z.Toolbar && Z.annotations && (Z.annotationPanelVisible == 2 || Z.annotationPanelVisible == 3)) { Z.Toolbar.setVisibilityAnnotationPanel(false); }
						}		
					}

					break;		
					
				case 'gesturestart' :
					viewerDisplayGestureChangeHandler(event); // Run once so values are defined at first movement.
					if (!gestureInterval) { gestureInterval = window.setInterval(zoomGesture, GESTURE_TEST_DURATION); }
					break;
					
				case 'gesturechange' :
					gestureIntervalPercent = Math.round(event.scale * 100) / 100;
					break;
					
				case 'gestureend' :
					if (gestureInterval) {
						window.clearInterval(gestureInterval);
						wasGesturing = true;
						gestureInterval = null;
					}
					if (Z.mousePan) { self.updateView(); }
					break;
			}
		}
	}
	
	function smoothPanStart (newPan) {
	 	if (Z.smoothPanEasing > 1) {
	 		// Stop smooth pan interval already in progress, if any.
			smoothPanStop(newPan);
			
			// Get starting cursor and display positions.
			smoothPanStartPt = dragPtStart;			
			if (smoothPanDisplayStartPt === null) { smoothPanDisplayStartPt = new Z.Utils.Point(parseFloat(cS.left), parseFloat(cS.top)); }
			
			// Start smooth pan interval.
			if (smoothPanInterval === null || newPan) { smoothPanInterval = window.setInterval(smoothPanIntervalHandler, 50); }
		}
	}
	
	function smoothPanStop (clearPan) {
		if (smoothPanInterval !== null && clearPan) {
			window.clearInterval(smoothPanInterval);
			smoothPanInterval = null;
		}
		smoothPanGliding = null;
		smoothPanDisplayStartPt = smoothPanGlideX = smoothPanGlideY = null;
		smoothPanDeltaX = smoothPanDeltaY = smoothPanLastDeltaX = smoothPanLastDeltaY = 0;
	}
		
	// Implement drag-pan or drag-glide if no image set of animation type or if zoomed in. Otherwies animate by changing Viewport.
	function smoothPanIntervalHandler (event) {
		if (!Z.animation || self.getZoom() != Z.minZ) {
			smoothPanStep(event);				
		} else {
			smoothAnimateStep(event);
		}
	}
	
	function smoothPanStep (event) {
		// Get current display position.
		var displayCurrL = parseFloat(cS.left);
		var displayCurrT = parseFloat(cS.top);
			
		if (Z.mouseIsDown || smoothPanGliding) {
	
			// Calculate offsets of mouse and display. Use float endpoint for target if set because mouse is up.
			var targetX = (smoothPanGliding) ? smoothPanGlideX : smoothPanMousePt.x;
			var targetY = (smoothPanGliding) ? smoothPanGlideY : smoothPanMousePt.y;
			var deltaMouseX = targetX - smoothPanStartPt.x;
			var deltaMouseY = targetY - smoothPanStartPt.y;

			// Calculate offsets of display.
			var deltaDisplayX = displayCurrL - smoothPanDisplayStartPt.x;
			var deltaDisplayY = displayCurrT - smoothPanDisplayStartPt.y;

			// Pan the display if mouse offsets do not equal display offsets.
			var smoothPanRequired = ((!isNaN(deltaMouseX) && !isNaN(deltaMouseY) && !isNaN(deltaDisplayX) && !isNaN(deltaDisplayY)) && (deltaMouseX != 0 || deltaMouseY != 0 || deltaDisplayX != 0 || deltaDisplayY != 0));
			if (smoothPanRequired) {

				// Calculate new position of displays container.
				var easingMore = (smoothPanGliding) ? Z.smoothPanGlide : 1;
				var easingEndLess = (smoothPanGliding) ? 1 : 100;
				smoothPanDeltaX = Math.round((((deltaMouseX - deltaDisplayX) / (Z.smoothPanEasing * easingMore)) * easingEndLess) / easingEndLess);
				smoothPanDeltaY = Math.round((((deltaMouseY - deltaDisplayY) / (Z.smoothPanEasing * easingMore)) * easingEndLess) / easingEndLess);

				// If dragging track deltas, if gliding use last tracked deltas to constrain glide deltas.
				if (Z.mouseIsDown) {
					smoothPanLastDeltaX = smoothPanDeltaX;
					smoothPanLastDeltaY = smoothPanDeltaY;
				} else {
					if (Math.abs(smoothPanDeltaX) > Math.abs(smoothPanLastDeltaX)) { smoothPanDeltaX = smoothPanLastDeltaX; }
					if (Math.abs(smoothPanDeltaY) > Math.abs(smoothPanLastDeltaY)) { smoothPanDeltaY = smoothPanLastDeltaY; }
				}

				// Constrain and implement new position and if effect constrained, also apply constraint to delta values.
				var newL = displayCurrL + smoothPanDeltaX;
				var newT = displayCurrT + smoothPanDeltaY;
				var constrainedPt = constrainPan(newL, newT, Z.imageZ, Z.imageR, 'container');
				cS.left = constrainedPt.x + 'px';
				cS.top = constrainedPt.y + 'px';
				smoothPanDeltaX -= (newL - constrainedPt.x);
				smoothPanDeltaY -= (newT - constrainedPt.y);

				// Implement oversize backfill if required.
				var deltaX = constrainedPt.x - displayL;
				var deltaY = constrainedPt.y - displayT;
				if (oD && tierBackfillDynamic && (smoothPanGliding || Z.mobileDevice || (Math.abs(deltaX) > (viewW / 2) || Math.abs(deltaY) > (viewH / 2)))) {
					redisplayCachedTiles(oD, tierBackfillOversize, tilesBackfillCached, 'simple', false, 'Updating backfill oversize display');
				}

				// Set gliding variable false if delta variable reaches zero to finish glide and updateView. Complemented by test in viewportEventsManager in mouseup event.
				if (smoothPanGliding && Math.round(smoothPanDeltaX * easingEndLess) / easingEndLess == 0 && Math.round(smoothPanDeltaY * easingEndLess) / easingEndLess == 0) {
					smoothPanGliding = false; 
				}

				// Sync navigator rectangle if visible.
				if (Z.Navigator) {
					var currentCenterPt = self.calculateCurrentCenterCoordinates(constrainedPt, Z.imageZ, Z.imageR);
					Z.Navigator.syncNavigatorRectangleToViewport(currentCenterPt);
				}
			}

		} else if (!Z.mouseIsDown && smoothPanGliding === null && smoothPanDeltaX != 0 && smoothPanDeltaY != 0) {
			// Calculate and record extended pan endpoint to enable drag-glide.
			var testL = displayCurrL + smoothPanLastDeltaX;
			var testT = displayCurrT + smoothPanLastDeltaY;
			var constrainedPt = constrainPan(testL, testT, Z.imageZ, Z.imageR, 'container');
			smoothPanLastDeltaX = constrainedPt.x - displayCurrL;
			smoothPanLastDeltaY = constrainedPt.y - displayCurrT;
			if (smoothPanLastDeltaX != 0 || smoothPanLastDeltaY != 0) {
				smoothPanGlideX = smoothPanMousePt.x + smoothPanLastDeltaX;
				smoothPanGlideY = smoothPanMousePt.y + smoothPanLastDeltaY;
				smoothPanGliding = true;
			}

		} else {
			// Stop smooth pan by clearing interval.
			smoothPanStop(true);
			self.updateView();
		}
	}
	
	// For simplicity and to support future optimization, the following animation step function is based on the above pan step function.
	// Frame rate based on drag motion or drag position depending on value in animation XML.  Setting 'motion' recommended for spinning 
	// objects, and 'position' recommended for pivoting panoramas. Horizontal and vertical dragging supported by value in animation XML.  
	// To increase animation rate, interval speed is prioritized over frame count (speed over smoothness) by skipping frames rather than 
	// changes in frames. However, skipping frame changes (intervals) is prioritized over skipping frames where changes in frame content 
	// are significant such as with pivoting panoramas ('position' setting used) or when image sets are small in total number of images.	
	function smoothAnimateStep (event) {
		Z.animationCount++;
		
		// Prepare lagging position variable.
		if (smoothAnimationX === null) { smoothAnimationX = parseFloat(cS.left); }
		if (smoothAnimationY === null) { smoothAnimationY = parseFloat(cS.top); }
		var displayCurrL = smoothAnimationX;
		var displayCurrT = smoothAnimationY;
			
		if (Z.mouseIsDown || smoothPanGliding) {			
			// Calculate offsets of mouse and display. Use float endpoint for target if set because mouse is up.
			var targetX = (smoothPanGliding) ? smoothPanGlideX : smoothPanMousePt.x;
			var targetY = (smoothPanGliding) ? smoothPanGlideY : smoothPanMousePt.y;
			var deltaMouseX = targetX - smoothPanStartPt.x;
			var deltaMouseY = targetY - smoothPanStartPt.y;
			
			// Calculate offsets of display.
			var deltaDisplayX = displayCurrL - smoothPanDisplayStartPt.x;
			var deltaDisplayY = displayCurrT - smoothPanDisplayStartPt.y;

			// Pan the display if mouse offsets do not equal display offsets.
			var smoothPanRequired = ((!isNaN(deltaMouseX) && !isNaN(deltaMouseY) && !isNaN(deltaDisplayX) && !isNaN(deltaDisplayY)) && (deltaMouseX != 0 || deltaMouseY != 0 || deltaDisplayX != 0 || deltaDisplayY != 0));
			if (smoothPanRequired) {

				// Calculate new position of displays container.
				var easingMore = (smoothPanGliding) ? Z.smoothPanGlide : 1;
				var easingEndLess = (smoothPanGliding) ? 1 : 100;
				smoothPanDeltaX = Math.round((((deltaMouseX - deltaDisplayX) / (Z.smoothPanEasing * easingMore)) * easingEndLess) / easingEndLess);
				smoothPanDeltaY = Math.round((((deltaMouseY - deltaDisplayY) / (Z.smoothPanEasing * easingMore)) * easingEndLess) / easingEndLess);

				// If dragging track deltas, if gliding use last tracked deltas to constrain glide deltas.
				if (Z.mouseIsDown) {
					smoothPanLastDeltaX = smoothPanDeltaX;
					smoothPanLastDeltaY = smoothPanDeltaY;
				} else {
					if (Math.abs(smoothPanDeltaX) > Math.abs(smoothPanLastDeltaX)) { smoothPanDeltaX = smoothPanLastDeltaX; }
					if (Math.abs(smoothPanDeltaY) > Math.abs(smoothPanLastDeltaY)) { smoothPanDeltaY = smoothPanLastDeltaY; }
				}

				// Constrain and implement new position and if effect constrained, also apply constraint to delta values.
				var newL = displayCurrL + smoothPanDeltaX;
				var newT = displayCurrT + smoothPanDeltaY;
				smoothAnimationX = newL;
				smoothAnimationY = newT;

				// Adjust animation speed by skipping frame changes (intervals) or by skipping frames.
				var deltaAnimationAxis, skipCalls, skipFrames, animationGap;
				if (Z.animator == 'motion') {
					deltaAnimationAxis = (Z.animationAxis == 'horizontal') ? smoothPanDeltaX : smoothPanDeltaY;
					dimensionAxis = (Z.animationAxis == 'horizontal') ? viewW : viewH;
					skipCalls = Math.round(optimalMotionImages / Z.imageSetLength);
					skipFrames = (deltaAnimationAxis / 40);
					animationGap = 0;
				} else if (Z.animator == 'position') {
					deltaAnimationAxis = (Z.animationAxis == 'horizontal') ? deltaDisplayX : deltaDisplayY;
					dimensionAxis = (Z.animationAxis == 'horizontal') ? viewW : viewH;
					skipCalls = Math.max(0, Math.round(((dimensionAxis / 2) - Math.abs(deltaAnimationAxis)) / optimalPositionDelta)); 
					skipFrames = 0;
					animationGap = (Z.animationAxis == 'horizontal') ? viewW / 10 : viewH /10;
				}
				if (skipCalls == 0) { skipCalls++; } // Variable represents number of calls to skip but is used as divisor so base value must be 1.
				
				// Implement frame change.
				if (Z.animationCount % skipCalls == 0) {
					if (deltaAnimationAxis < -animationGap) {
						Z.Viewer.viewportPrior(skipFrames);
					} else if (deltaAnimationAxis > animationGap) {
						Z.Viewer.viewportNext(skipFrames);
					}
				}

				// Set gliding variable false if delta variable reaches zero to finish glide. Complemented by test in viewportEventsManager in mouseup event.
				if (smoothPanGliding && Math.round(smoothPanDeltaX * easingEndLess) / easingEndLess == 0 && Math.round(smoothPanDeltaY * easingEndLess) / easingEndLess == 0) {
					smoothPanGliding = false; 
				}
			}

		} else if (!Z.mouseIsDown && smoothPanGliding === null && smoothPanDeltaX != 0 && smoothPanDeltaY != 0) {
			// Calculate and record extended pan endpoint to enable drag-glide.
			if (smoothPanLastDeltaX != 0 || smoothPanLastDeltaY != 0) {
				smoothPanGlideX = smoothPanMousePt.x + smoothPanLastDeltaX;
				smoothPanGlideY = smoothPanMousePt.y + smoothPanLastDeltaY;
				smoothPanGliding = true;
			}

		} else {
			// Stop smooth animation by clearing interval.
			smoothPanStop(true);
			smoothAnimationX = null;
			smoothAnimationY = null;
		}
	}
	
	function viewerDisplayGestureChangeHandler (event) {
		var event = Z.Utils.event(event);
		event.preventDefault();
		gestureIntervalPercent = Math.round(event.scale * 100) / 100;
	}

	function zoomGesture (event) {
		var sync = false;
		if (!Z.mousePan) { return; }  // Disallow touch panning if parameter false.
		var gestureZoom = calculateGestureZoom(tierCurrent, tierScalePrior, gestureIntervalPercent);
		var gestureZoomConstrained = constrainZoom(gestureZoom);
		if (gestureZoom != Z.imageZ) { sync = self.scaleTierToZoom(gestureZoomConstrained); }
	}

	function calculateGestureZoom (tier, scale, gesturePercent) {
		var newScale = scale * gesturePercent;
		var gestureZ = convertTierScaleToZoom(tier, newScale);
		return gestureZ;
	}
	
	// This is executed on change into and also out of full screen mode, and is needed because 
	// browsers assign their own change event listener that will fire on entry as well as exit.
	this.fullScreenEscapeHandler = function (event) {
		if (fullScreenEntering) {
			fullScreenEntering = false;
		} else {
			self.toggleFullViewMode(false, true);
		}
	}
	
	this.mouseWheelHandler = function (delta) {
		Z.mouseWheelIsDown = true;
		if (Z.mouseWheelCompleteTimer) { window.clearTimeout(Z.mouseWheelCompleteTimer); }
		Z.mouseWheelCompleteTimer = window.setTimeout(Z.Viewer.mouseWheelCompleteHandler, Z.mouseWheelCompleteDuration);
		
		if (Z.sliderFocus == 'zoom') {
			// Calculate current step, then target zoom based on step and target scale for current step.
			// Constrain target zoom and scale viewport display to implement.
			var stepZ = (delta > 0) ? zoomStepDistance : -zoomStepDistance;
			var targetScale = tierScale *  (1 + stepZ);
			var targetZoom = self.convertTierScaleToZoom(tierCurrent, targetScale);
			constrainedZ = constrainZoom(targetZoom);
			if (constrainedZ != Z.imageZ) {
				Z.zooming = (delta > 0) ? 'in' : (delta < 0) ? 'out' : 'stop';
				var sync = self.scaleTierToZoom(constrainedZ);
			}
			// Debug option: console.log('targetScale: ' + targetScale);
			
		} else if (Z.sliderFocus == 'imageSet') {
			// Simple increment or decrement with degree of view updating handled in function updateView.
			if (delta > 0) {
				Z.Viewer.viewportNext();
			} else if (delta < 0) {
				Z.Viewer.viewportPrior();
			}		
		}
	}
	
	function displayEventsCoordinatesHandler (event) {
		var event = Z.Utils.event(event);
		if (event) {
			coordsString = getClickZoomCoords3DAsString(event);
			if (event.type == 'mousemove') {
				Z.Utils.showCoordinates(coordsString);
			} else if (event.type == 'mousedown' && event.altKey) {
				Z.Utils.saveCoordinates(coordsString);
			}
		}
	}
};



//::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::
//::::::::::::::::::::::::::::::::::: TOOLBAR FUNCTIONS ::::::::::::::::::::::::::::::::::
//::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::

Z.ZoomifyToolbar = function (tbViewport) {

	//::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::
	//:::::::::::::::::::::::::::::::::: INIT FUNCTIONS :::::::::::::::::::::::::::::::::
	//::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::

	// Declare variables for toolbar internal self-reference and for initialization completion.
	var self = this;
	var isInitialized = false;
	var tbViewportIDStr = tbViewport.getViewportID().toString();
	
	// Load toolbar skins XML file and determine selection mode setting for optional support of
	// small screen devices with large graphic files. Build names list for needed skin files.
	Z.skinPath = Z.Utils.stringRemoveTrailingSlashCharacters(Z.skinPath);
	var netConnector = new Z.NetConnector();
	netConnector.loadXML(Z.skinPath + '/' + Z.Utils.getResource('DEFAULT_SKINXMLFILE'));

	// Declare variables for Toolbar and slider.
	var tlbrH, tbS, trS, btS;
	var toolbarSkinArray = [], toolbarDimensions = [], toolbarSkinFilePaths = [], toolbarSkinSizes = [];
	var SLIDERTESTDURATION_ZOOM = parseInt(Z.Utils.getResource('DEFAULT_SLIDERTESTDURATIONZOOM'), 10);
	var buttonSliderZoomDown = false;
	var sliderIntervalZoom = null, sliderIntervalMousePtZoom = null;
	var progressInterval = null, progressTextColor = null;
	var overrideSliderZoom, overrideProgress, overrideLogo, overridePan, overrideReset;
	
	// Declare variables for imageSet slider.
	var tbssS, trssS, btssS;
	var SLIDERTESTDURATION_IMAGESET = parseInt(Z.Utils.getResource('DEFAULT_SLIDERTESTDURATIONIMAGESET'), 10);
	var buttonSliderImageSetDown = false;
	var sliderIntervalImageSet = null, sliderIntervalMousePtImageSet = null;
	var overrideSliderImageSet;

	function initializeToolbar (tlbrSknDims, tlbrSknArr) {
		toolbarSkinArray = tlbrSknArr;
		// Create Toolbar display area for Toolbar buttons and set size and position.
		Z.ToolbarDisplay = Z.Utils.createContainerElement('div', 'ToolbarDisplay', 'inline-block', 'absolute', 'visible', '1px', '1px', '0px', '1px', 'none', '0px', 'transparent none', '0px', '0px', 'normal');
		tbS = Z.ToolbarDisplay.style;
		
		// Ensure toolbar is in front of hotspots in viewport.
		var uiElementsBaseZIndex = parseInt(Z.Utils.getResource('DEFAULT_UIELEMENTBASEZINDEX'), 10);
		tbS.zIndex = (uiElementsBaseZIndex + 1).toString();

		var toolbarBackground = new Z.Utils.Graphic('toolbarBackground', Z.skinPath, tlbrSknArr[0], '1px', '1px', '0px', '0px');
		var backAlpha = parseFloat(Z.Utils.getResource('DEFAULT_BACKGROUNDALPHA'));
		var backColorNoAlpha = Z.Utils.getResource('DEFAULT_BACKGROUNDCOLORNOALPHA');
		Z.ToolbarDisplay.appendChild(toolbarBackground.elmt);
		
		// DEV NOTE: Optional transparent toolbar background. No parameter in current release, requires skin file review.
		//Z.Utils.setOpacity(toolbarBackground.elmt, backAlpha, backColorNoAlpha);

		// Create toolbar global array to hold skin sizes from XML but use placeholders here
		// and apply actual sizes in drawLayout function called in setSizeAndPosition function.
		toolbarSkinSizes = tlbrSknDims;

		if (Z.logoVisible) {
			var toolbarLogo;
			if (!(Z.Utils.stringValidate(Z.logoCustomPath))) {
				toolbarLogo = new Z.Utils.Graphic('toolbarLogo', Z.skinPath, tlbrSknArr[7], '1px', '1px', '1px', '1px');
			} else {
				var logoPath = Z.Utils.cacheProofPath(Z.logoCustomPath);
				toolbarLogo = new Z.Utils.Graphic('toolbarLogo', logoPath, null, '1px', '1px', '1px', '1px');
			}			

			if (!Z.Utils.stringValidate(Z.logoLinkURL)) {
				toolbarLogo.elmt.setAttribute('title', Z.Utils.getResource('UI_LOGOLINKDISPLAY'));
				Z.ToolbarDisplay.appendChild(toolbarLogo.elmt);		
			} else {
				var zlogoAnchor = document.createElement('a');
				zlogoAnchor.setAttribute('href', Z.logoLinkURL);
				zlogoAnchor.setAttribute('target', Z.Utils.getResource('UI_LOGOLINKTARGET'));
				zlogoAnchor.setAttribute('title', Z.Utils.getResource('TIP_LOGO'));
				zlogoAnchor.setAttribute('outline', 'none');
				zlogoAnchor.appendChild(toolbarLogo.elmt);
				Z.ToolbarDisplay.appendChild(zlogoAnchor);
			}

			if (Z.toolbarVisible == 0 || Z.toolbarVisible == 1) {
				var logoDivider = new Z.Utils.Graphic('logoDivider', Z.skinPath, tlbrSknArr[8], '1px', '1px', '1px', '1px');
				Z.ToolbarDisplay.appendChild(logoDivider.elmt);
			}
		}

		// Add button container to handle background mouseover events instead of button mouseout events.
		var buttonContainer = Z.Utils.createContainerElement('div', 'buttonContainer', 'inline-block', 'absolute', 'visible', '1px', '1px', '0px', '0px', 'none', '0px', 'transparent none', '0px', '0px', 'normal', 'default');
		Z.ToolbarDisplay.appendChild(buttonContainer);
		Z.Utils.addEventListener(buttonContainer, 'mousedown', Z.Utils.preventDefault);
		Z.Utils.addEventListener(buttonContainer, 'mouseover', self.backgroundEventsHandler);
		Z.Utils.addEventListener(buttonContainer, 'touchstart', Z.Utils.preventDefault);

		// Add background graphic to button container to ensure IE events fire.
		var buttonBackground = new Z.Utils.Graphic('buttonBackground', Z.skinPath, tlbrSknArr[0], '1px', '1px', '0px', '0px');
		buttonContainer.appendChild(buttonBackground.elmt);

		// DEV NOTE: Zero opacity avoids interfering with option to set opacity of of toolbarBackground above.
		Z.Utils.setOpacity(buttonBackground.elmt, '0', '#FBFAFA');

		if (((Z.toolbarVisible != 0 && Z.toolbarVisible != 1) || Z.mobileDevice) && Z.minimizeVisible) {
			var buttonMinimize = new Z.Utils.Button('buttonMinimize', null, Z.skinPath, tlbrSknArr[9], tlbrSknArr[10], tlbrSknArr[11], '1px', '1px', '1px', '1px', 'mouseover', buttonEventsHandler, 'TIP_MINIMIZE');
			Z.ToolbarDisplay.appendChild(buttonMinimize.elmt);
			var buttonExpand = new Z.Utils.Button('buttonExpand', null, Z.skinPath, tlbrSknArr[12], tlbrSknArr[13], tlbrSknArr[14], '1px', '1px', '1px', '1px',  'mouseover', buttonEventsHandler, 'TIP_EXPAND');
			Z.ToolbarDisplay.appendChild(buttonExpand.elmt);
		}

		var buttonZoomOut = new Z.Utils.Button('buttonZoomOut', null, Z.skinPath, tlbrSknArr[1], tlbrSknArr[2], tlbrSknArr[3], '1px', '1px', '1px', '1px',  'mouseover', buttonEventsHandler, 'TIP_ZOOMOUT');
		buttonContainer.appendChild(buttonZoomOut.elmt);

		if (Z.sliderZoomVisible) {
			var trackSliderZoom = new Z.Utils.Graphic('trackSliderZoom', Z.skinPath, tlbrSknArr[15], '1px', '1px', '0px', '0px', 'TIP_SLIDER');
			buttonContainer.appendChild(trackSliderZoom.elmt);
			Z.Utils.addEventListener(trackSliderZoom.elmt, 'mousedown', buttonEventsHandler);
			Z.Utils.addEventListener(trackSliderZoom.elmt, 'touchstart', buttonEventsHandler);
			Z.Utils.addEventListener(trackSliderZoom.elmt, 'mouseover', buttonEventsHandler);
			var buttonSliderZoom = new Z.Utils.Button('buttonSliderZoom', null, Z.skinPath, tlbrSknArr[17], tlbrSknArr[18], tlbrSknArr[19], '1px', '1px', '1px', '1px',  'mouseover', buttonEventsHandler, 'TIP_SLIDER');
			buttonContainer.appendChild(buttonSliderZoom.elmt);
			var trsZ, trszS, btsZ, btszS;
		}

		var buttonZoomIn = new Z.Utils.Button('buttonZoomIn', null, Z.skinPath, tlbrSknArr[4], tlbrSknArr[5], tlbrSknArr[6], '1px', '1px', '1px', '1px',  'mouseover', buttonEventsHandler, 'TIP_ZOOMIN');
		buttonContainer.appendChild(buttonZoomIn.elmt);

		if (Z.panButtonsVisible) {
			var panDivider = new Z.Utils.Graphic('panDivider', Z.skinPath, tlbrSknArr[20], '1px', '1px','1px', '1px');
			buttonContainer.appendChild(panDivider.elmt);
			var buttonPanLeft = new Z.Utils.Button('buttonPanLeft', null, Z.skinPath, tlbrSknArr[21], tlbrSknArr[22], tlbrSknArr[23], '1px', '1px', '1px', '1px', 'mouseover', buttonEventsHandler, 'TIP_PANLEFT');
			buttonContainer.appendChild(buttonPanLeft.elmt);
			var buttonPanUp = new Z.Utils.Button('buttonPanUp', null, Z.skinPath, tlbrSknArr[24], tlbrSknArr[25], tlbrSknArr[26], '1px', '1px', '1px', '1px', 'mouseover', buttonEventsHandler, 'TIP_PANUP');
			buttonContainer.appendChild(buttonPanUp.elmt);
			var buttonPanDown = new Z.Utils.Button('buttonPanDown', null, Z.skinPath, tlbrSknArr[27], tlbrSknArr[28], tlbrSknArr[29], '1px', '1px', '1px', '1px', 'mouseover', buttonEventsHandler, 'TIP_PANDOWN');
			buttonContainer.appendChild(buttonPanDown.elmt);
			var buttonPanRight = new Z.Utils.Button('buttonPanRight', null, Z.skinPath, tlbrSknArr[30], tlbrSknArr[31], tlbrSknArr[32], '1px', '1px', '1px', '1px', 'mouseover', buttonEventsHandler, 'TIP_PANRIGHT');
			buttonContainer.appendChild(buttonPanRight.elmt);
		}
		if (Z.resetVisible) {
			var buttonReset = new Z.Utils.Button('buttonReset', null, Z.skinPath, tlbrSknArr[33], tlbrSknArr[34], tlbrSknArr[35], '1px', '1px', '1px', '1px', 'mouseover', buttonEventsHandler, 'TIP_RESET');
			buttonContainer.appendChild(buttonReset.elmt);
		}
		
		if (Z.fullScreenVisible || Z.fullPageVisible) {
			if (Z.editMode === null) {
				var fullViewDivider = new Z.Utils.Graphic('fullViewDivider', Z.skinPath, tlbrSknArr[36], '1px', '1px', '1px', '1px');
				buttonContainer.appendChild(fullViewDivider.elmt);
			}
			var buttonFullViewExit = new Z.Utils.Button('buttonFullViewExit', null, Z.skinPath, tlbrSknArr[40], tlbrSknArr[41], tlbrSknArr[42], '1px', '1px', '1px', '1px', 'mouseover', buttonEventsHandler, 'TIP_TOGGLEFULLVIEWEXIT');
			buttonContainer.appendChild(buttonFullViewExit.elmt);
			var buttonFullView = new Z.Utils.Button('buttonFullView', null, Z.skinPath, tlbrSknArr[37], tlbrSknArr[38], tlbrSknArr[39], '1px', '1px', '1px', '1px', 'mouseover', buttonEventsHandler, 'TIP_TOGGLEFULLVIEW');
			buttonContainer.appendChild(buttonFullView.elmt);
		}
		
		if (Z.measureVisible && Z.editMode === null) {
			if (!Z.fullScreenVisible && !Z.fullPageVisible) {
				var measureDivider = new Z.Utils.Graphic('measureDivider', Z.skinPath, tlbrSknArr[36], '1px', '1px', '1px', '1px');
				buttonContainer.appendChild(measureDivider.elmt);
			}
			if (Z.editMode === null) {
				var buttonMeasureExit = new Z.Utils.Button('buttonMeasureExit', null, Z.skinPath, tlbrSknArr[49], tlbrSknArr[50], tlbrSknArr[51], '1px', '1px', '1px', '1px', 'mouseover', buttonEventsHandler, 'TIP_TOGGLEMEASURINGEXIT');
				buttonContainer.appendChild(buttonMeasureExit.elmt);
			}
			var buttonMeasure = new Z.Utils.Button('buttonMeasure', null, Z.skinPath, tlbrSknArr[46], tlbrSknArr[47], tlbrSknArr[48], '1px', '1px', '1px', '1px', 'mouseover', buttonEventsHandler, 'TIP_TOGGLEMEASURING');
			buttonContainer.appendChild(buttonMeasure.elmt);
		}

		if (Z.rotationVisible) {
			var rotateDivider = new Z.Utils.Graphic('rotateDivider', Z.skinPath, tlbrSknArr[52], '1px', '1px', '1px', '1px');
			buttonContainer.appendChild(rotateDivider.elmt);
			var buttonRotateCounterwise = new Z.Utils.Button('buttonRotateCounterwise', null, Z.skinPath, tlbrSknArr[53], tlbrSknArr[54], tlbrSknArr[55], '1px', '1px', '1px', '1px', 'mouseover', buttonEventsHandler, 'TIP_ROTATECOUNTERWISE');
			buttonContainer.appendChild(buttonRotateCounterwise.elmt);
			var buttonRotateClockwise = new Z.Utils.Button('buttonRotateClockwise', null, Z.skinPath, tlbrSknArr[56], tlbrSknArr[57], tlbrSknArr[58], '1px', '1px', '1px', '1px', 'mouseover', buttonEventsHandler, 'TIP_ROTATECLOCKWISE');
			buttonContainer.appendChild(buttonRotateClockwise.elmt);
		}
		
		if (Z.tour) {
			var tourDivider = new Z.Utils.Graphic('tourDivider', Z.skinPath, tlbrSknArr[59], '1px', '1px', '1px', '1px');
			buttonContainer.appendChild(tourDivider.elmt);
			var buttonTourPrior = new Z.Utils.Button('buttonTourPrior', null, Z.skinPath, tlbrSknArr[60], tlbrSknArr[61], tlbrSknArr[62], '1px', '1px', '1px', '1px', 'mouseover', buttonEventsHandler, 'TIP_TOURPRIOR');
			buttonContainer.appendChild(buttonTourPrior.elmt);
			var buttonTourNext = new Z.Utils.Button('buttonTourNext', null, Z.skinPath, tlbrSknArr[63], tlbrSknArr[64], tlbrSknArr[65], '1px', '1px', '1px', '1px', 'mouseover', buttonEventsHandler, 'TIP_TOURNEXT');
			buttonContainer.appendChild(buttonTourNext.elmt);
			var buttonTourStart = new Z.Utils.Button('buttonTourStart', null, Z.skinPath, tlbrSknArr[66], tlbrSknArr[67], tlbrSknArr[68], '1px', '1px', '1px', '1px', 'mouseover', buttonEventsHandler, 'TIP_TOURSTART');
			buttonContainer.appendChild(buttonTourStart.elmt);
			var buttonTourStop = new Z.Utils.Button('buttonTourStop', null, Z.skinPath, tlbrSknArr[69], tlbrSknArr[70], tlbrSknArr[71], '1px', '1px', '1px', '1px', 'mouseover', buttonEventsHandler, 'TIP_TOURSTOP');
			buttonContainer.appendChild(buttonTourStop.elmt);
		}
		
		if (Z.slideshow) {
			var slideshowDivider = new Z.Utils.Graphic('slideshowDivider', Z.skinPath, tlbrSknArr[59], '1px', '1px', '1px', '1px');
			buttonContainer.appendChild(slideshowDivider.elmt);
			var buttonSlideshowPrior = new Z.Utils.Button('buttonSlideshowPrior', null, Z.skinPath, tlbrSknArr[60], tlbrSknArr[61], tlbrSknArr[62], '1px', '1px', '1px', '1px', 'mouseover', buttonEventsHandler, 'TIP_SLIDEPRIOR');
			buttonContainer.appendChild(buttonSlideshowPrior.elmt);
			var buttonSlideshowNext = new Z.Utils.Button('buttonSlideshowNext', null, Z.skinPath, tlbrSknArr[63], tlbrSknArr[64], tlbrSknArr[65], '1px', '1px', '1px', '1px', 'mouseover', buttonEventsHandler, 'TIP_SLIDENEXT');
			buttonContainer.appendChild(buttonSlideshowNext.elmt);
			var buttonSlideshowStart = new Z.Utils.Button('buttonSlideshowStart', null, Z.skinPath, tlbrSknArr[66], tlbrSknArr[67], tlbrSknArr[68], '1px', '1px', '1px', '1px', 'mouseover', buttonEventsHandler, 'TIP_SLIDESHOWSTART');
			buttonContainer.appendChild(buttonSlideshowStart.elmt);
			var buttonSlideshowStop = new Z.Utils.Button('buttonSlideshowStop', null, Z.skinPath, tlbrSknArr[69], tlbrSknArr[70], tlbrSknArr[71], '1px', '1px', '1px', '1px', 'mouseover', buttonEventsHandler, 'TIP_SLIDESHOWSTOP');
			buttonContainer.appendChild(buttonSlideshowStop.elmt);	
		}
		
		if (Z.tour || Z.slideshow) {
			var buttonAudioOn = new Z.Utils.Button('buttonAudioOn', null, Z.skinPath, tlbrSknArr[72], tlbrSknArr[73], tlbrSknArr[74], '1px', '1px', '1px', '1px', 'mouseover', buttonEventsHandler, 'TIP_AUDIOMUTE');
			buttonContainer.appendChild(buttonAudioOn.elmt);
			var buttonAudioMuted = new Z.Utils.Button('buttonAudioMuted', null, Z.skinPath, tlbrSknArr[75], tlbrSknArr[76], tlbrSknArr[77], '1px', '1px', '1px', '1px', 'mouseover', buttonEventsHandler, 'TIP_AUDIOON');
			buttonContainer.appendChild(buttonAudioMuted.elmt);
		}
		
		if (Z.imageSet) {
			var imageSetDivider = new Z.Utils.Graphic('imageSetDivider', Z.skinPath, tlbrSknArr[59], '1px', '1px', '1px', '1px');
			buttonContainer.appendChild(imageSetDivider.elmt);
			var buttonImageSetPrior = new Z.Utils.Button('buttonImageSetPrior', null, Z.skinPath, tlbrSknArr[60], tlbrSknArr[61], tlbrSknArr[62], '1px', '1px', '1px', '1px', 'mouseover', buttonEventsHandler, 'TIP_IMAGESETPRIOR');
			buttonContainer.appendChild(buttonImageSetPrior.elmt);
			
			if (Z.sliderImageSetVisible) {
				var trackSliderImageSet = new Z.Utils.Graphic('trackSliderImageSet', Z.skinPath, tlbrSknArr[15], '1px', '1px', '0px', '0px', 'TIP_SLIDER');
				buttonContainer.appendChild(trackSliderImageSet.elmt);
				Z.Utils.addEventListener(trackSliderImageSet.elmt, 'mousedown', buttonEventsHandler);
				Z.Utils.addEventListener(trackSliderImageSet.elmt, 'touchstart', buttonEventsHandler);
				Z.Utils.addEventListener(trackSliderImageSet.elmt, 'mouseover', buttonEventsHandler);
				var buttonSliderImageSet = new Z.Utils.Button('buttonSliderImageSet', null, Z.skinPath, tlbrSknArr[17], tlbrSknArr[18], tlbrSknArr[19], '1px', '1px', '1px', '1px',  'mouseover', buttonEventsHandler, 'TIP_IMAGESETSLIDER');
				buttonContainer.appendChild(buttonSliderImageSet.elmt);
				var trsiS, trsisS, btsiS, btsisS;
			}
			
			var buttonImageSetNext = new Z.Utils.Button('buttonImageSetNext', null, Z.skinPath, tlbrSknArr[63], tlbrSknArr[64], tlbrSknArr[65], '1px', '1px', '1px', '1px', 'mouseover', buttonEventsHandler, 'TIP_IMAGESETNEXT');
			buttonContainer.appendChild(buttonImageSetNext.elmt);
		}
		
		if (Z.helpVisible == 1 || Z.helpVisible == 3) {
			var buttonHelp = new Z.Utils.Button('buttonHelp', null, Z.skinPath, tlbrSknArr[43], tlbrSknArr[44], tlbrSknArr[45], '1px', '1px', '1px', '1px', 'mouseover', buttonEventsHandler, 'TIP_HELP');
			buttonContainer.appendChild(buttonHelp.elmt);
		}

		if (Z.progressVisible) {
			// Create with placeholder size and position until drawLayout.
			var progressTextBox = Z.Utils.createContainerElement('div', 'progressTextBox', 'inline-block', 'absolute', 'hidden', '1px', '1px', '1px', '1px', 'none', '0px', 'transparent none', '0px', '0px', 'normal', null, true);
			var progressFontSize=toolbarSkinSizes[16];
			buttonContainer.appendChild(progressTextBox);
			var progressTextNode = document.createTextNode(Z.Utils.getResource('DEFAULT_PROGRESSTEXT'));
			progressTextBox.appendChild(Z.Utils.createCenteredElement(progressTextNode, 'progressTextBoxCenteredDiv'));
			if (progressTextColor === null) { progressTextColor = Z.Utils.getResource('DEFAULT_PROGRESSTEXTCOLOR'); }
			Z.Utils.setTextNodeStyle(progressTextNode, progressTextColor, 'verdana', progressFontSize + 'px', 'none', 'normal', 'normal', 'normal', 'normal', '1em', 'left', 'none');
			Z.Utils.disableTextInteraction(progressTextNode); // Prevent text selection.
		}

		// Add toolbar to viewer display.
		Z.ViewerDisplay.appendChild(Z.ToolbarDisplay);

		// Set toolbar size, position, and visibility.
		Z.toolbarW = toolbarSkinSizes[0];
		Z.toolbarCurrentW = (Z.toolbarW == -1) ? Z.viewerW : Z.toolbarW;
		Z.toolbarH = tlbrH = toolbarSkinSizes[1];
		var toolbarTop = (Z.toolbarPosition == 1) ? Z.viewerH - tlbrH : 0;
		self.setSizeAndPosition(Z.toolbarCurrentW, Z.toolbarH, 0, toolbarTop);

		if (tbViewport && tbViewport.getStatus('initialized')) {			
			if (Z.toolbarVisible == 1) {
				tbViewport.setSizeAndPosition(Z.viewerW, (Z.viewerH - Z.toolbarH), 0, 0);
				tbViewport.validateXYZDefaults(true);				
				tbViewport.setView(Z.initialX, Z.initialY, Z.initialZ);
			}			
			var currentZ = tbViewport.getZoom();
			syncSliderToViewportZoom(currentZ);
			tbViewport.setDrawingColor('buttonColor0' + tbViewportIDStr, true);
		}

		show(Z.toolbarVisible == 1 || Z.toolbarVisible == 2 || Z.toolbarVisible == 4 || Z.toolbarVisible == 7);

		// Prevent event bubbling.
		Z.Utils.addEventListener(Z.ToolbarDisplay, 'mouseover', Z.Utils.stopPropagation);

		setInitialized(true);
	}



	//::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::
	//:::::::::::::::::::::::::::::::: GET & SET FUNCTIONS :::::::::::::::::::::::::::::::
	//::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::

	this.getInitialized = function () {
		return getInitialized();
	}

	this.getSkinArray = function () {
		return toolbarSkinArray;
	}

	this.getSkinSizes = function () {
		return toolbarSkinSizes;
	}

	this.show = function (value) {
		show(value);
	}

	this.setVisibility = function (visible) {
		visibility(visible);
	}

	this.minimize = function (value) {
		minimize(value);
	}

	this.setVisibilityAnnotationPanel = function (visible, vpIDs) {
		setVisibilityAnnotationPanel(visible, vpIDs);
	}
	
	function setVisibilityAnnotationPanel (visible, vpIDs) {
		if (typeof vpIDs === 'undefined' || vpIDs === null) { 
			vpIDs = (Z.annotationFileShared) ? '0' : tbViewport.getViewportID().toString();
		}
		var annotPanel = document.getElementById('AnnotationPanelDisplay' + vpIDs);
		if (annotPanel) {
			if (visible && !(Z.measureVisible && Z.editMode === null)) {
				annotPanel.style.display = 'inline-block';
				Z.annotationPanelVisibleState = true;
			} else {
				annotPanel.style.display = 'none'; // Debug option: comment out this line to keep visible on mouseout.
				Z.annotationPanelVisibleState = false;
			}
		}
	}

	this.showProgress = function () {
		var ptB = document.getElementById('progressTextBox');
		if (ptB) {
			var ptbS = ptB.style;
			if (ptbS) {
				ptbS.display = 'inline-block';
			}
		}
	}

	this.hideProgress = function () {
		var ptB = document.getElementById('progressTextBox');
		if (ptB) {
			var ptbS = ptB.style;
			if (ptbS) {
				ptbS.display = 'none';
			}
		}
	}

	this.updateProgress = function (total, current) {
		if (Z.progressVisible) {
			if (progressInterval) { window.clearInterval(progressInterval); }
			var percentComplete;
			var ptcD = document.getElementById('progressTextBoxCenteredDiv');
			if (ptcD) {
				var ptn = ptcD.firstChild;
				if (ptn) {
					if (total == 0 || current == 0) {
						ptn.nodeValue = 'llllllllll'
						progressInterval = window.setInterval(clearProgress, parseInt(Z.Utils.getResource('DEFAULT_PROGRESSDURATION')), 10);
					} else {
						percentComplete = Math.round(100 - (current / total) * 100);
						var percCompTrunc = Math.round(percentComplete / 10);
						ptn.nodeValue = Z.Utils.stringMultiply('l', percCompTrunc);
					}
				}
			}
		}
	}

	function clearProgress () {
		window.clearInterval(progressInterval);
		progressInterval = null;
		var ptcD = document.getElementById('progressTextBoxCenteredDiv');
		if (ptcD) {
			var ptn = ptcD.firstChild;
			if (ptn) { ptn.nodeValue = ''; }
		}
	}

	// Support Image Set viewing.
	this.setViewport = function (tbVwprt) {
		tbViewport = tbVwprt;
		tbViewportIDStr = tbViewport.getViewportID().toString();
	}
	
	

	//::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::
	//:::::::::::::::::::::::::::::::::::: CORE FUNCTIONS ::::::::::::::::::::::::::::::::::::::
	//::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::

	function getInitialized () {
		return isInitialized;
	}

	function setInitialized (initialized) {
		if (!isInitialized && initialized) {
			isInitialized = true;
			Z.Utils.validateCallback('toolbarInitialized');
			Z.Viewer.validateViewerReady('toolbarInitialized');
		}
	}

	this.parseSkinXML = function (xmlDoc) {
		// Get selection mode for optional small screen graphics fileset.
		Z.skinMode = xmlDoc.getElementsByTagName('SETUP')[0].attributes.getNamedItem('SKINMODE').nodeValue;
		var skinFolder, skinSizesTag;
		
		// Debug option - forces large skins for mobile device layout testing: 
		//Z.skinMode = 2;
		
		if (Z.skinMode == 1 || (Z.skinMode == 0 && !Z.mobileDevice)) {
			skinFolder = xmlDoc.getElementsByTagName('SETUP')[0].attributes.getNamedItem('FOLDERSTANDARD').nodeValue;
			skinSizesTag = 'SIZESSTANDARD';
		} else {
			skinFolder = xmlDoc.getElementsByTagName('SETUP')[0].attributes.getNamedItem('FOLDERLARGE').nodeValue;
			skinSizesTag = 'SIZESLARGE';
		}
		
		// Get color value for progress display.
		var progressTextColorAtt = xmlDoc.getElementsByTagName('SETUP')[0].attributes.getNamedItem('PROGRESSCOLOR');
		if (typeof progressTextColorAtt !== 'undefined' && progressTextColorAtt !== null) {
			progressTextColor = xmlDoc.getElementsByTagName('SETUP')[0].attributes.getNamedItem('PROGRESSCOLOR').nodeValue;
		}
		
		// Get toolbar element dimensions.
		var toolbarSkinSizes = [];
		toolbarSkinSizes[toolbarSkinSizes.length] = parseFloat(xmlDoc.getElementsByTagName(skinSizesTag)[0].attributes.getNamedItem('TOOLBARW').nodeValue);
		toolbarSkinSizes[toolbarSkinSizes.length] = parseFloat(xmlDoc.getElementsByTagName(skinSizesTag)[0].attributes.getNamedItem('TOOLBARH').nodeValue);
		toolbarSkinSizes[toolbarSkinSizes.length] = parseFloat(xmlDoc.getElementsByTagName(skinSizesTag)[0].attributes.getNamedItem('LOGOW').nodeValue);
		toolbarSkinSizes[toolbarSkinSizes.length] = parseFloat(xmlDoc.getElementsByTagName(skinSizesTag)[0].attributes.getNamedItem('LOGOH').nodeValue);
		toolbarSkinSizes[toolbarSkinSizes.length] = parseFloat(xmlDoc.getElementsByTagName(skinSizesTag)[0].attributes.getNamedItem('DIVIDERW').nodeValue);
		toolbarSkinSizes[toolbarSkinSizes.length] = parseFloat(xmlDoc.getElementsByTagName(skinSizesTag)[0].attributes.getNamedItem('DIVIDERH').nodeValue);
		toolbarSkinSizes[toolbarSkinSizes.length] = parseFloat(xmlDoc.getElementsByTagName(skinSizesTag)[0].attributes.getNamedItem('BUTTONW').nodeValue);
		toolbarSkinSizes[toolbarSkinSizes.length] = parseFloat(xmlDoc.getElementsByTagName(skinSizesTag)[0].attributes.getNamedItem('BUTTONH').nodeValue);
		toolbarSkinSizes[toolbarSkinSizes.length] = parseFloat(xmlDoc.getElementsByTagName(skinSizesTag)[0].attributes.getNamedItem('BUTTONSPAN').nodeValue);
		toolbarSkinSizes[toolbarSkinSizes.length] = parseFloat(xmlDoc.getElementsByTagName(skinSizesTag)[0].attributes.getNamedItem('SLIDERBUTTONW').nodeValue);
		toolbarSkinSizes[toolbarSkinSizes.length] = parseFloat(xmlDoc.getElementsByTagName(skinSizesTag)[0].attributes.getNamedItem('SLIDERBUTTONH').nodeValue);
		toolbarSkinSizes[toolbarSkinSizes.length] = parseFloat(xmlDoc.getElementsByTagName(skinSizesTag)[0].attributes.getNamedItem('SLIDERTRACKW').nodeValue);
		toolbarSkinSizes[toolbarSkinSizes.length] = parseFloat(xmlDoc.getElementsByTagName(skinSizesTag)[0].attributes.getNamedItem('SLIDERTRACKH').nodeValue);
		toolbarSkinSizes[toolbarSkinSizes.length] = parseFloat(xmlDoc.getElementsByTagName(skinSizesTag)[0].attributes.getNamedItem('SLIDERSPAN').nodeValue);
		toolbarSkinSizes[toolbarSkinSizes.length] = parseFloat(xmlDoc.getElementsByTagName(skinSizesTag)[0].attributes.getNamedItem('PROGRESSW').nodeValue);
		toolbarSkinSizes[toolbarSkinSizes.length] = parseFloat(xmlDoc.getElementsByTagName(skinSizesTag)[0].attributes.getNamedItem('PROGRESSH').nodeValue);
		toolbarSkinSizes[toolbarSkinSizes.length] = parseFloat(xmlDoc.getElementsByTagName(skinSizesTag)[0].attributes.getNamedItem('PROGRESSFONTSIZE').nodeValue);

		// Get names of skin files of the Zoomify Toolbar.
		var skinMax, skinFirstAtt, skinFirst, skinLastAtt, skinLast;
		skinMax = (Z.editMode == 'edit') ? 161 : (Z.editMode == 'markup') ? 152 : (Z.imageFiltersVisible) ? 100 : (Z.screensaver || Z.tourPath || Z.slidePath || Z.imageSetPath) ? 77 : (Z.rotationVisible) ? 58 : (Z.measureVisible) ? 51 : (Z.helpVisible > 0) ? 45 : (Z.fullScreenVisible || Z.fullPageVisible) ? 45 : (Z.resetVisible) ? 35 : (Z.panButtonsVisible) ? 32 : (Z.sliderZoomVisible) ? 19 : (Z.minimizeVisible) ? 14 : (Z.logoVisible) ? 8 : 6;
		skinFirstAtt = xmlDoc.getElementsByTagName('FILES')[0].attributes.getNamedItem('SKIN0');
		if (skinFirstAtt !== null) { skinFirst = skinFirstAtt.nodeValue; }
		skinLastAtt = xmlDoc.getElementsByTagName('FILES')[0].attributes.getNamedItem('SKIN' + skinMax.toString());
		if (skinLastAtt !== null) { skinLast = skinLastAtt.nodeValue; }
		if (typeof skinFirst !== 'undefined' && Z.Utils.stringValidate(skinFirst) && typeof skinLast !== 'undefined' && Z.Utils.stringValidate(skinLast)) {
			var xmlMissingNames = false;
			for (var i = 0, j = skinMax + 1; i < j; i++) {
				var skinCounter = xmlDoc.getElementsByTagName('FILES')[0].attributes.getNamedItem('SKIN' + i).nodeValue;
				if (Z.Utils.stringValidate(skinCounter)) {
					toolbarSkinFilePaths[i] = skinFolder + '/' + skinCounter;
				} else {
					toolbarSkinFilePaths[i] = 'null';
					xmlMissingNames = true;
				}
			}
			if (xmlMissingNames) { Z.Utils.showMessage(Z.Utils.getResource('ERROR_SKINXMLMISSINGNAMES')); }
			initializeToolbar(toolbarSkinSizes, toolbarSkinFilePaths);
		} else {
			Z.Utils.showMessage(Z.Utils.getResource('ERROR_SKINXMLINVALID'));
		}
	}

	this.setSizeAndPosition = function (width, height, left, top) {
		if (typeof width === 'undefined' || width === null) {
			width = (Z.toolbarVisible > 0) ? Z.toolbarCurrentW : 0;
		} else {
			Z.toolbarCurrentW = width;
		}
		if (typeof height === 'undefined' || height === null) { height = (Z.toolbarVisible > 0) ? tlbrH : 0; }
		if (typeof left === 'undefined' || left === null) { left = 0; }
		if (typeof top === 'undefined' || top === null) { top = (Z.toolbarPosition == 1) ? Z.viewerH - tlbrH : 0; }

		tbS = Z.ToolbarDisplay.style;
		tbS.width = width + 'px';
		tbS.height = height + 'px';
		tbS.left = left + 'px';
		tbS.top = top + 'px';
		drawLayout(width, height);
	}

	function drawLayout (width, height) {
		// Set toolbar width and height as specified in the call to this function by the
		// setSizeAndPosition function.  That function tests for null assignments and uses
		// preset values from the Skins XML file if appropriate.
		var toolbarW = width;
		var toolbarH = height;

		 // Set remaining values to the values in the Skins XML file.
		var logoW = toolbarSkinSizes[2];
		var logoH = toolbarSkinSizes[3];
		var dvdrW = toolbarSkinSizes[4];
		var dvdrH = toolbarSkinSizes[5];
		var btnW = toolbarSkinSizes[6];
		var btnH = toolbarSkinSizes[7];
		var btnSpan = toolbarSkinSizes[8];
		var sldrBtnW = toolbarSkinSizes[9];
		var sldrBtnH = toolbarSkinSizes[10];
		var sldrTrkW = toolbarSkinSizes[11];
		var sldrTrkH = toolbarSkinSizes[12];
		var sldrSpan = toolbarSkinSizes[13];
		var prgW = toolbarSkinSizes[14];
		var prgH = toolbarSkinSizes[15];

		// Calculate positioning values.
		var dx = 0;
		var logoTOffset = (toolbarH - logoH) / 2 + 1;
		var dvdrTOffset = (toolbarH - dvdrH) / 2;
		var btnTOffset = (toolbarH - btnH) / 2;
		var btnMinExpTOffset = (btnTOffset * 1.3);
		var sldrTrkTOffset = btnTOffset + 4;
		var btnSldrTOffset = btnTOffset + 2;
		var btnMinSpan = (Z.logoVisible == 1) ? 0 : btnSpan / 2;
		var btnExpSpan = (Z.logoVisible == 1) ? 0 : btnSpan / 2;
		var dvdrSpan = btnSpan - (btnW - dvdrW);
		var btnContainerMargin = 20;

		// Calculate width of button area.
		var btnCount = 2;
		var dvdrCount = 0;
		if (Z.panButtonsVisible) {
			btnCount += 4;
			dvdrCount += 1;
		}
		if (Z.resetVisible) {
			btnCount += 1;
		}
		if (Z.fullScreenVisible || Z.fullPageVisible) {
			btnCount += 1;
			dvdrCount += 1;
		}
		if (Z.helpVisible) {
			btnCount += 1;
			if (!Z.fullScreenVisible && !Z.fullPageVisible) {
				dvdrCount += 1;
			}
		}
		if (Z.measureVisible) {
			if (!Z.fullScreenVisible && !Z.fullPageVisible) {
				dvdrCount += 1;
			}
			btnCount += 1;
		}
		if (Z.rotationVisible) {
			btnCount += 2;
			dvdrCount += 1;
		}
		if (Z.tour || Z.slideshow) {
			btnCount += 3;
			dvdrCount += 1;
			if (Z.audioContent) {
				btnCount += 1;	// DEV NOTE: Does not currently allow for timing of toolbar initialization vs viewer initialization and tour/slideshow XML parsing.
			}
		}

		var btnSetW = (btnCount * btnSpan) + (dvdrCount * dvdrSpan);
		if (Z.sliderZoomVisible) { btnSetW += sldrSpan; }

		if (Z.imageSet && Z.sliderImageSetVisible) {
			// Following values separate from standard toolbar slider values for possible separate future use.
			var sldrStackSpan = sldrSpan;
			var imageSetSldrTrkW = sldrTrkW;
			var imageSetSldrTrkH = sldrTrkH;
			btnSetW += sldrStackSpan;
			overrideSliderImageSet = false; 
		}
		
		// Validate toolbar contents fit within toolbar width. If not, implement overrides. First
		// hide slider and recalculate. Next hide, progress display.  Next, hide logo and
		// minimize and maximize buttons. Finally, hide pan buttons.
		overrideSliderZoom = overrideProgress = overrideLogo = overridePan = false;
		var logoOffset = (Z.logoVisible == 1) ? logoW + 2 : 0;				
		var minBtnOffset = (Z.toolbarVisible != 0 && Z.toolbarVisible != 1 && Z.minimizeVisible != 0) ? btnSpan : 0;
		var logoButtonSetW = logoOffset + minBtnOffset;
		var panButtonSetW = (Z.panButtonsVisible == 1) ? (btnSpan * 4) + dvdrSpan : 0;		
		var resetButtonW = (Z.resetVisible == 1) ? btnSpan : 0;
		var toolbarContentsW = logoButtonSetW + btnContainerMargin + btnSetW + btnContainerMargin + prgW;
		
		if (toolbarContentsW > toolbarW) {
			overrideSliderZoom = true;
			if ((toolbarContentsW - sldrSpan) > toolbarW) {
				overrideProgress = true;
				if ((toolbarContentsW - sldrSpan - prgW) > toolbarW) {
					overrideLogo = true;
					if ((toolbarContentsW - sldrSpan - prgW - logoButtonSetW) > toolbarW) {
						overrideReset = true;
						if ((toolbarContentsW - sldrSpan - prgW - logoButtonSetW - resetButtonW) > toolbarW) {
							overridePan = true;
							btnSetW -= panButtonSetW;
						}
						btnSetW -= resetButtonW;
					}
					logoButtonSetW = 0;
				}
				prgW = 0;
			}
			btnSetW -= sldrSpan;
		}

		// Calculate position for main button set centered in toolbar.
		var btnSetL = ((toolbarW - btnSetW) / 2) - btnContainerMargin + 3;
		
		// Set the sizes and positions of the toolbar contents.
		var bG = document.getElementById('toolbarBackground');
		if (bG) {
			bG.style.width = toolbarW + 'px';
			bG.style.height = toolbarH + 'px';
			bG.firstChild.style.width = toolbarW + 'px';
			bG.firstChild.style.height = toolbarH + 'px';
		}

		var bC = document.getElementById('buttonContainer');
		if (bC) {
			bC.style.width = (btnSetW + (btnContainerMargin * 2)) + 'px';
			bC.style.height = toolbarH + 'px';
			bC.style.left = btnSetL + 'px';
		}

		var bB = document.getElementById('buttonBackground');
		if (bB) {
			bB.style.width = toolbarW + 'px';
			Z.Utils.graphicSize(bB, parseFloat(bC.style.width), parseFloat(bC.style.height));
			bB.style.left = '0px';
		}

		var tbL = document.getElementById('toolbarLogo');
		if (tbL) {
			var tblS = tbL.style;
			if (tblS) {
				if (!overrideLogo) {
					tblS.display = 'inline-block';
					Z.Utils.graphicSize(tbL, logoW, logoH);
					tblS.left = dx + 'px';
					tblS.top = logoTOffset + 'px';
					dx += logoW + 2;
					var logoD = document.getElementById('logoDivider');
					if (logoD) {
						Z.Utils.graphicSize(logoD, dvdrW, dvdrH);
						var ldS = logoD.style;
						ldS.left = dx + 'px';
						ldS.top = dvdrTOffset + 'px';
					}
				} else {
					tblS.display = 'none';
				}
			}
		}
					
		if (Z.toolbarVisible != 0 && Z.toolbarVisible != 1) {
			var bM = document.getElementById('buttonMinimize');
			var bE = document.getElementById('buttonExpand');
			if (bM && bE) {
				var bmS = bM.style;
				var beS = bE.style;
				if (bmS && beS) {
					if (!overrideLogo) {
						bmS.display = 'inline-block';
						beS.display = 'inline-block';
						Z.Utils.buttonSize(bM, btnW, btnH);
						Z.Utils.buttonSize(bE, btnW, btnH);
						bmS.left = dx + btnMinSpan + 'px';
						bmS.top = btnMinExpTOffset + 'px';
						beS.left = dx + btnExpSpan + 'px';
						beS.top = btnMinExpTOffset + 'px';
					} else {
						bmS.display = 'none';
						beS.display = 'none';
					}
				}
			}
		}

		dx = btnContainerMargin; // Reset to adjust for placement within buttonContainer which is offset.

		var bZO = document.getElementById('buttonZoomOut');
		if (bZO) {
			Z.Utils.buttonSize(bZO, btnW, btnH);
			var bzoS = bZO.style;
			bzoS.left = dx + 'px';
			bzoS.top = btnTOffset + 'px';
			dx += btnSpan;
		}
		trsZ = document.getElementById('trackSliderZoom');
		btsZ = document.getElementById('buttonSliderZoom');
		if (trsZ && btsZ) {
			trszS = trsZ.style;
			btszS = btsZ.style;
			if (trszS && btszS) {
				if (!overrideSliderZoom) {
					trszS.display = 'inline-block';
					btszS.display = 'inline-block';
					Z.Utils.graphicSize(trsZ, sldrTrkW, sldrTrkH);
					trszS.left = (dx - 2) + 'px';
					trszS.top = sldrTrkTOffset + 'px';
					Z.Utils.buttonSize(btsZ, sldrBtnW, sldrBtnH);
					btszS.left = parseFloat(trszS.left) + 'px';
					btszS.top = btnSldrTOffset + 'px';
					dx += sldrSpan;
				} else {
					trszS.display = 'none';
					btszS.display = 'none';
				}
			}
		}

		var bZI = document.getElementById('buttonZoomIn');
		if (bZI) {
			Z.Utils.buttonSize(bZI, btnW, btnH);
			var bziS = bZI.style;
			bziS.left = dx + 'px';
			bziS.top = btnTOffset + 'px';
			dx += btnSpan + 1;
		}
		if (!overridePan) {
			var pnD = document.getElementById('panDivider');
			if (pnD) {
				Z.Utils.graphicSize(pnD, dvdrW, dvdrH);
				var pndS = pnD.style;
				pndS.left = dx + 'px';
				pndS.top = dvdrTOffset + 'px';
				dx += dvdrSpan;
				var bPL = document.getElementById('buttonPanLeft');
				if (bPL) {
					Z.Utils.buttonSize(bPL, btnW, btnH);
					var bplS = bPL.style;
					bplS.left = dx + 'px';
					bplS.top = btnTOffset + 'px';
					dx += btnSpan;
				}
				var bPU = document.getElementById('buttonPanUp');
				if (bPU) {
					Z.Utils.buttonSize(bPU, btnW, btnH);
					var bpuS = bPU.style;
					bpuS.left = dx + 'px';
					bpuS.top = btnTOffset + 'px';
					dx += btnSpan;
				}
				var bPD = document.getElementById('buttonPanDown');
				if (bPD) {
					Z.Utils.buttonSize(bPD, btnW, btnH);
					var bpdS = bPD.style;
					bpdS.left = dx + 'px';
					bpdS.top = btnTOffset + 'px';
					dx += btnSpan;
				}
				var bPR = document.getElementById('buttonPanRight');
				if (bPR) {
					Z.Utils.buttonSize(bPR, btnW, btnH);
					var bprS = bPR.style;
					bprS.left = dx + 'px';
					bprS.top = btnTOffset + 'px';
					dx += btnSpan;
				}
			}
		}
		if (!overrideReset) {
			var bR = document.getElementById('buttonReset');
			if (bR) {
				Z.Utils.buttonSize(bR, btnW, btnH);
				var brS = bR.style;
				brS.left = dx + 'px';
				brS.top = btnTOffset + 'px';
				dx += btnSpan + 1;
			}
		}

		var fvD = document.getElementById('fullViewDivider');
		if (fvD) {
			Z.Utils.graphicSize(fvD, dvdrW, dvdrH);
			var fvdS = fvD.style;
			fvdS.left = dx + 'px';
			fvdS.top = dvdrTOffset + 'px';
			dx += dvdrSpan;
		}
		var bFVE = document.getElementById('buttonFullViewExit');
		if (bFVE) {
			Z.Utils.buttonSize(bFVE, btnW, btnH);
			var bfveS = bFVE.style;
			bfveS.left = dx + 'px';
			bfveS.top = btnTOffset + 'px';
			
			// Set full view or full view exit button visible based on full view status.
			bfveS.display = (Z.fullView) ? 'inline-block' : 'none';
		}
		var bFV = document.getElementById('buttonFullView');
		if (bFV) {
			Z.Utils.buttonSize(bFV, btnW, btnH);
			var bfvS = bFV.style;
			bfvS.left = dx + 'px';
			bfvS.top = btnTOffset + 'px';			
			dx += btnSpan + 1;
			
			// Set measure or measure exit button visible based on full view status.
			bfvS.display = (Z.fullView) ? 'none' : 'inline-block';
		}

		var mD = document.getElementById('measureDivider');
		if (mD) {
			Z.Utils.graphicSize(mD, dvdrW, dvdrH);
			var mdS = mD.style;
			mdS.left = dx + 'px';
			mdS.top = dvdrTOffset + 'px';
			dx += dvdrSpan;
		}	
		if (Z.editMode === null) {
			var bME = document.getElementById('buttonMeasureExit');
			if (bME) {
				Z.Utils.buttonSize(bME, btnW, btnH);
				var bmeS = bME.style;
				bmeS.left = dx + 'px';
				bmeS.top = btnTOffset + 'px';
			
				// Set measure or measure exit button visible based on measuring status.
				bmeS.display = (Z.labelMode == 'measure') ? 'inline-block' : 'none';
			}
		}
		var bM = document.getElementById('buttonMeasure');
		if (bM) {
			Z.Utils.buttonSize(bM, btnW, btnH);
			var bmS = bM.style;
			bmS.left = dx + 'px';
			bmS.top = btnTOffset + 'px';
			dx += btnSpan + 1;
			
			// Set measure or measure exit button visible based on measuring status.
			bmS.display = (Z.labelMode == 'measure') ? 'none' : 'inline-block';			
		}

		var rD = document.getElementById('rotateDivider');
		if (rD ) {
			Z.Utils.graphicSize(rD, dvdrW, dvdrH);
			var rdS = rD.style;
			rdS.left = dx + 'px';
			rdS.top = dvdrTOffset + 'px';
			dx += dvdrSpan;
			var bRCCW = document.getElementById('buttonRotateCounterwise');
			if (bRCCW) {
				Z.Utils.buttonSize(bRCCW, btnW, btnH);
				var brccwS = bRCCW.style;
				brccwS.left = dx + 'px';
				brccwS.top = btnTOffset + 'px';
				dx += btnSpan;
			}
			var bRCW = document.getElementById('buttonRotateClockwise');
			if (bRCW) {
				Z.Utils.buttonSize(bRCW, btnW, btnH);
				var brcwS = bRCW.style;
				brcwS.left = dx + 'px';
				brcwS.top = btnTOffset + 'px';
				dx += btnSpan + 1;
			}
		}

		// Add either tour or slideshow buttons.
		if (Z.tour) {
			var trD = document.getElementById('tourDivider');
			if (trD) {
				Z.Utils.graphicSize(trD, dvdrW, dvdrH);
				var trdS = trD.style;
				trdS.left = dx + 'px';
				trdS.top = dvdrTOffset + 'px';
				dx += dvdrSpan;
				var bTP = document.getElementById('buttonTourPrior');
				if (bTP) {
					Z.Utils.buttonSize(bTP, btnW, btnH);
					var btpS = bTP.style;
					btpS.left = dx + 'px';
					btpS.top = btnTOffset + 'px';
					dx += btnSpan + 1;
				}
				var bTN = document.getElementById('buttonTourNext');
				if (bTN) {
					Z.Utils.buttonSize(bTN, btnW, btnH);
					var btnS = bTN.style;
					btnS.left = dx + 'px';
					btnS.top = btnTOffset + 'px';
					dx += btnSpan + 1;
				}
				var bTRS = document.getElementById('buttonTourStop');
				if (bTRS) {
					Z.Utils.buttonSize(bTRS, btnW, btnH);
					var btrsS = bTRS.style;
					btrsS.left = dx + 'px';
					btrsS.top = btnTOffset + 'px';
					
					// Set start or stop button visible based on tour playing status.
					btrsS.display = (Z.tourPlaying) ? 'inline-block' : 'none';
				}
				// Do not increment dx so place Show button on Hide button.
				var bTRST = document.getElementById('buttonTourStart');
				if (bTRST) {
					Z.Utils.buttonSize(bTRST, btnW, btnH);
					var btrstS = bTRST.style;
					btrstS.left = dx + 'px';
					btrstS.top = btnTOffset + 'px';
					dx += btnSpan + 1;
					
					// Set start or stop button visible based on tour playing status.
					btrstS.display = (Z.tourPlaying) ? 'none' : 'inline-block';
				}				
			}
		} else if (Z.slideshow) {
			var sSD = document.getElementById('slideshowDivider');
			if (sSD) {
				Z.Utils.graphicSize(sSD, dvdrW, dvdrH);
				var ssdS = sSD.style;
				ssdS.left = dx + 'px';
				ssdS.top = dvdrTOffset + 'px';
				dx += dvdrSpan;
				var bSSP = document.getElementById('buttonSlideshowPrior');
				if (bSSP) {
					Z.Utils.buttonSize(bSSP, btnW, btnH);
					var bsspS = bSSP.style;
					bsspS.left = dx + 'px';
					bsspS.top = btnTOffset + 'px';
					dx += btnSpan + 1;
				}
				var bSSN = document.getElementById('buttonSlideshowNext');
				if (bSSN) {
					Z.Utils.buttonSize(bSSN, btnW, btnH);
					var bssnS = bSSN.style;
					bssnS.left = dx + 'px';
					bssnS.top = btnTOffset + 'px';
					dx += btnSpan + 1;
				}
				var bSSS = document.getElementById('buttonSlideshowStop');
				if (bSSS) {
					Z.Utils.buttonSize(bSSS, btnW, btnH);
					var bsssS = bSSS.style;
					bsssS.left = dx + 'px';
					bsssS.top = btnTOffset + 'px';
					
					// Set start or stop button visible based on slideshow playing status.
					bsssS.display = (Z.slideshowPlaying) ? 'inline-block' : 'none';
				}
				// Do not increment dx so place Show button on Hide button.
				var bSSST = document.getElementById('buttonSlideshowStart');
				if (bSSST) {
					Z.Utils.buttonSize(bSSST, btnW, btnH);
					var bssstS = bSSST.style;
					bssstS.left = dx + 'px';
					bssstS.top = btnTOffset + 'px';
					dx += btnSpan + 1;
					
					// Set start or stop button visible based on slideshow playing status.
					bssstS.display = (Z.slideshowPlaying) ? 'none' : 'inline-block';
				}				
			}
		} else if (Z.imageSetPath !== null) {
			var iSD = document.getElementById('imageSetDivider');
			if (iSD) {
				Z.Utils.graphicSize(iSD, dvdrW, dvdrH);
				var isdS = iSD.style;
				isdS.left = dx + 'px';
				isdS.top = dvdrTOffset + 'px';
				dx += dvdrSpan;
				var bISP = document.getElementById('buttonImageSetPrior');
				if (bISP) {
					Z.Utils.buttonSize(bISP, btnW, btnH);
					var bispS = bISP.style;
					bispS.left = dx + 'px';
					bispS.top = btnTOffset + 'px';
					dx += btnSpan + 1;
				}
				trsiS = document.getElementById('trackSliderImageSet');
				btsiS = document.getElementById('buttonSliderImageSet');
				if (trsiS && btsiS) {
					trsisS = trsiS.style;
					btsisS = btsiS.style;
					if (trsisS && btsisS) {
						if (!overrideSliderImageSet) {
							trsisS.display = 'inline-block';
							btsisS.display = 'inline-block';
							Z.Utils.graphicSize(trsiS, imageSetSldrTrkW, imageSetSldrTrkH);
							trsisS.left = (dx - 2) + 'px';
							trsisS.top = sldrTrkTOffset + 'px';
							Z.Utils.buttonSize(btsiS, sldrBtnW, sldrBtnH);
							btsisS.left = parseFloat(trsisS.left) + 'px';
							btsisS.top = btnSldrTOffset + 'px';
							dx += sldrStackSpan;
						} else {
							trsisS.display = 'none';
							btsisS.display = 'none';
						}
					}
				}
				var bISN = document.getElementById('buttonImageSetNext');
				if (bISN) {
					Z.Utils.buttonSize(bISN, btnW, btnH);
					var bisnS = bISN.style;
					bisnS.left = dx + 'px';
					bisnS.top = btnTOffset + 'px';
					dx += btnSpan + 1;
				}
			}
		}
		
		// Add either audio buttons if adding tour or slideshow buttons, but Hide both buttons 
		// until tour or slideshow XML is parsed and can determine if audio content exists.
		if (Z.tour || Z.slideshow) {
			var bAM = document.getElementById('buttonAudioMuted');
			if (bAM) {
				Z.Utils.buttonSize(bAM, btnW, btnH);
				var bamS = bAM.style;
				bamS.left = dx + 'px';
				bamS.top = btnTOffset + 'px';
				bamS.display = 'none';
			}
			// Do not increment dx so place On button on Mute button.
			var bAO = document.getElementById('buttonAudioOn');
			if (bAO) {
				Z.Utils.buttonSize(bAO, btnW, btnH);
				var baoS = bAO.style;
				baoS.left = dx + 'px';
				baoS.top = btnTOffset + 'px';
				dx += btnSpan + 1;
				baoS.display = 'none';
			}	
			tbViewport.initializeAudioMuteButtons();
		}
		
		if (Z.helpVisible == 1 || Z.helpVisible == 3) {
			var bH = document.getElementById('buttonHelp');
			if (bH) {
				Z.Utils.buttonSize(bH, btnW, btnH);
				var bhS = bH.style;
				bhS.left = dx + 'px';
				bhS.top = btnTOffset + 'px';
			}
		}

		var ptB = document.getElementById('progressTextBox');
		if (ptB) {
			var ptbS = ptB.style;
			if (ptbS) {
				if (!overrideProgress) {
					ptbS.display = 'inline-block';
					ptbS.width = prgW + 'px';
					ptbS.height = prgH + 'px';
					ptbS.left = (toolbarW - parseFloat(bC.style.left) - parseFloat(ptbS.width)) + 'px';
					ptbS.top = ((toolbarH - parseFloat(ptbS.height)) / 2) + 'px';
				} else {
					ptbS.display = 'none';
				}
			}
		}
	}
	
	function show (value) {
		if ((Z.toolbarVisible < 4 && !Z.mobileDevice) || Z.toolbarVisible == 8) {
			visibility(value);
		} else {
			minimize(!value);
		}
	}

	function visibility (visible) {
		if (tbS) {
			if (visible) {
				tbS.display = 'inline-block';
			} else {
				tbS.display = 'none';
			}
		}
	}

	function minimize (value) {
		Z.ToolbarMinimized = value;
		if (tbS) {
			var bC = document.getElementById('buttonContainer');
			var bG = document.getElementById('toolbarBackground');
			var bM = document.getElementById('buttonMinimize');
			var bE = document.getElementById('buttonExpand');
			var logoD = document.getElementById('logoDivider');
			var minW = 0;
			if (bE && !overrideLogo) { minW = parseFloat(bE.style.left) + parseFloat(bE.style.width) + 4; }
			
			var expW = Z.toolbarCurrentW;
			if (value) {
				if (bC) { bC.style.display = 'none'; }
				if (bM && bE && !overrideLogo) {
					if (logoD) { logoD.style.display = 'none'; }
					bM.style.display = 'none';
					bE.style.display = 'inline-block';
				}
				tbS.width = minW + 'px';
				if (bG) { bG.style.width = minW + 'px'; }
			} else {
				if (bC) { bC.style.display = 'inline-block'; }
				if (bM && bE && !overrideLogo) {
					if (logoD) { logoD.style.display = 'inline-block'; }
					bM.style.display = 'inline-block';
					bE.style.display = 'none';
				}
				tbS.width = expW + 'px';
				if (bG) { bG.style.width = expW + 'px'; }
			}
		}
	}

	this.syncSliderToViewportZoom = function (imageZ) {
		syncSliderToViewportZoom(imageZ);
	}

	function syncSliderToViewportZoom (imageZ) {
		if (typeof trszS !== 'undefined' && typeof btszS !== 'undefined') {
			var imageSpan = Z.maxZ - Z.minZ;
			var sliderPercent = (imageZ - Z.minZ) / imageSpan;
			var trackL = parseFloat(trszS.left);
			var trackR = parseFloat(trszS.left) + parseFloat(trszS.width) - parseFloat(btszS.width);
			var trackSpan = trackR - trackL;
			var sliderPosition = (sliderPercent * trackSpan) + trackL;
			btszS.left = sliderPosition + 'px';
		}
	}

	function sliderSnapZoom (event) {
		if (typeof trsZ !== 'undefined' && typeof trszS !== 'undefined') {
			var sliderClick;
			var tszPt = Z.Utils.getElementPosition(trsZ);
			sliderClick = Z.Utils.getMousePosition(event).x - tszPt.x;
		
			var sliderZoom = calculateSliderZoom(sliderClick, 0, parseFloat(trszS.width));
			if (sliderZoom < Z.minZ + 0.1) { sliderZoom = Z.minZ; }
			if (sliderZoom > Z.maxZ - 0.1) { sliderZoom = Z.maxZ; }
			
			var delta = sliderZoom - tbViewport.getZoom();
			Z.zooming = (delta > 0) ? 'in' : (delta < 0) ? 'out' : 'stop';
			tbViewport.scaleTierToZoom(sliderZoom);
			Z.zooming = 'stop';
			
			tbViewport.updateView();
		}
	}

	function sliderSlideStartZoom (event) {
		if (typeof btsZ !== 'undefined') {
			buttonSliderZoomDown = true;
			var mPt = Z.Utils.getMousePosition(event);
			btsZ.mouseXPrior = mPt.x;
			btsZ.mouseYPrior = mPt.y;
		}
	}

	function sliderSlideZoom () {
		if (typeof trszS !== 'undefined' && typeof btsZ !== 'undefined' && typeof btszS !== 'undefined') {
			var trackL = parseFloat(trszS.left);
			var trackR = parseFloat(trszS.left) + parseFloat(trszS.width) - parseFloat(btszS.width);
			var trackPosition = parseFloat(btszS.left) + (sliderIntervalMousePtZoom.x - btsZ.mouseXPrior);
			if (trackPosition < trackL) {
				trackPosition = trackL;
			} else if (trackPosition > trackR) {
				trackPosition = trackR;
			} else {
				btsZ.mouseXPrior = sliderIntervalMousePtZoom.x;
			}
			btszS.left = trackPosition + 'px';
			var sliderZoom = calculateSliderZoom(trackPosition, trackL, trackR);
			
			var delta = sliderZoom - tbViewport.getZoom();
			Z.zooming = (delta > 0) ? 'in' : (delta < 0) ? 'out' : 'stop';
			
			tbViewport.scaleTierToZoom(sliderZoom);
		}
	}

	function sliderSlideEndZoom () {
		buttonSliderZoomDown = false;
		Z.zooming = 'stop';
		tbViewport.updateView();
	}

	function calculateSliderZoom (sliderPosition, trkL, trkR) {
		var trackSpan = trkR - trkL;
		var sliderPercent = (sliderPosition - trkL) / trackSpan;
		var imageSpan = Z.maxZ - Z.minZ;
		var sliderZoom = Z.minZ + (imageSpan * sliderPercent);
		return sliderZoom;
	}



	//::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::
	//::::::::::::::::::::::::::::::: IMAGESET FUNCTIONS :::::::::::::::::::::::::::::::::::
	//::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::
	
	this.syncSliderToViewportImageSet = function (imageSetSlide) {
		syncSliderToViewportImageSet(imageSetSlide);
	}

	function syncSliderToViewportImageSet (imageSetSlide) {
		if (trsisS && btsisS) {
			var imageSetSpan = Z.imageSetLength - 1;
			var sliderPercent = Z.viewportCurrentID / imageSetSpan;
			var trackL = parseFloat(trsisS.left);
			var trackR = parseFloat(trsisS.left) + parseFloat(trsisS.width) - parseFloat(btsisS.width);
			var trackSpan = trackR - trackL;
			var sliderPosition = (sliderPercent * trackSpan) + trackL;
			btsisS.left = sliderPosition + 'px';
		}
	}

	function sliderSnapImageSet (event) {
		if (trsiS && trsisS) {
			var sliderClick;
			var tsisPt = Z.Utils.getElementPosition(trsiS);
			sliderClick = Z.Utils.getMousePosition(event).x - tsisPt.x;
			
			var sliderSlide = calculateSliderImage(sliderClick, 0, parseFloat(trsisS.width));
			if (sliderSlide < 0) { sliderSlide = 0; }
			if (sliderSlide > Z.imageSetLength - 1) { sliderSlide = Z.imageSetLength - 1; }
			
			var changed = (sliderSlide != Z.viewportCurrentID);
			if (changed) { Z.Viewer.viewportSelect(sliderSlide, true) } // Do not allow viewportSelect to call syncSliderToViewportImageSet.
			syncSliderToViewportImageSet(sliderSlide);
		}
	}

	function sliderSlideStartImageSet (event) {
		if (btsiS) {
			buttonSliderImageSetDown = true;
			var mPt = Z.Utils.getMousePosition(event);
			btsiS.mouseXPrior = mPt.x;
			btsiS.mouseYPrior = mPt.y;
		}
	}

	function sliderSlideImageSet () {
		if (trsiS && btsiS && btsiS) {
			var trackL = parseFloat(trsisS.left);
			var trackR = parseFloat(trsisS.left) + parseFloat(trsisS.width) - parseFloat(btsisS.width);
			var trackPosition = parseFloat(btsisS.left) + (sliderIntervalMousePtImageSet.x - btsiS.mouseXPrior);
			if (trackPosition < trackL) {
				trackPosition = trackL;
			} else if (trackPosition > trackR) {
				trackPosition = trackR;
			} else {
				btsiS.mouseXPrior = sliderIntervalMousePtImageSet.x;
			}
			btsisS.left = trackPosition + 'px';
			var sliderSlide = calculateSliderImage(trackPosition, trackL, trackR);
			
			var changed = (sliderSlide != Z.viewportCurrentID);
			if (changed) { Z.Viewer.viewportSelect(sliderSlide, true) }  // Do not allow viewportSelect to call syncSliderToViewportImageSet.
		}
	}

	function sliderSlideEndImageSet () {
		buttonSliderImageSetDown = false;
		Z.Viewer.viewportSelect(Z.viewportCurrentID, true); // Do not allow viewportSelect to call syncSliderToViewportImageSet.
	}

	function calculateSliderImage (trackPosition, trkL, trkR) {
		var trackSpan = trkR - trkL;
		var sliderPercent = (trackPosition - trkL) / trackSpan;
		var imageSetSpan = Z.imageSetLength - 1;
		var sliderSlide = Math.round(imageSetSpan * sliderPercent);
		return sliderSlide;
	}
	
	function sliderMouseMoveHandlerImageSet (event) {
		sliderIntervalMousePtImageSet = new Z.Utils.Point(event.clientX, event.clientY);
	}

	function sliderTouchMoveHandlerImageSet (event) {
		var touch = Z.Utils.getFirstTouch(event);
		if (touch) {
			var target = touch.target;
			sliderIntervalMousePtImageSet = new Z.Utils.Point(touch.pageX, touch.pageY);
		}
	}
	
	

	//::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::
	//:::::::::::::::::::::::::::::::::::::: EVENT FUNCTIONS :::::::::::::::::::::::::::::::::::
	//::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::

	this.buttonEventsHandler = function (event) {
		buttonEventsHandler(event);
	}
	
	// Handle all button events and graphic states by clearing all event handlers on exit
	// and resetting this handler as event broker. Prevent right mouse button use. Note that
	// call to setToolbarDefaults is redundant vs call by background mouseover handler 
	// only if move slowly between buttons, not if move fast or if move directly off toolbar.
	function buttonEventsHandler (event) {		
		// Get needed values.
		var event = Z.Utils.event(event);
		if (event) {				
			var eventType = event.type;
			var eventTarget = Z.Utils.target(event);
			if (eventTarget) {
				var targetBtn = eventTarget.parentNode;
				if (targetBtn) { 
					var targetBtnOrig = targetBtn;
					tbID = targetBtn.id;
				}
			}
			var relatedTarget = Z.Utils.relatedTarget(event);
		}
		
		// Prevent conflicting zoom-and-pan function calls and clear mask, if any.
		if (eventType == 'mousedown' && tbViewport && !(tbID == 'buttonAudioOn' || tbID == 'buttonAudioMuted')) { 
			tbViewport.zoomAndPanAllStop(false, true);
			if (Z.maskingSelection && Z.maskClearOnUserAction) { tbViewport.clearMask(); }
		}

		// Prevent events if optional parameter set, or if due to choicelist navigation, right-click, or copy menu on mobile OS.
		if (Z.interactivityOff && (eventType == 'mousedown' || eventType == 'mouseup') && (tbID != 'buttonRotateClockwise' && tbID != 'buttonRotateCounterwise')) { return; }
		if (relatedTarget && (relatedTarget == '[object HTMLSelectElement]' || relatedTarget == '[object HTMLOptionElement]')) { return; }
		if (Z.Utils.isRightMouseButton(event)) { return; }
		if (Z.touchSupport) { event.preventDefault(); }

		// If event firing on viewport if mouse dragged off slider button, reassign target to slider button to prevent buttonGraphicsUpdate function from setting visibility of viewport elements.
		if (tbID && tbID.indexOf('viewportContainer') != -1 || buttonSliderZoomDown || buttonSliderImageSetDown) {
			if (buttonSliderZoomDown) {
				targetBtn = document.getElementById('buttonSliderZoom'); 
			} else if (buttonSliderImageSetDown) { 
				targetBtn = document.getElementById('buttonSliderImageSet'); 
			}
			if (targetBtn) { tbID = targetBtn.id; }
		}
		
		// Update button graphics.		
		buttonGraphicsUpdate(targetBtn, eventType);	
		
		// Handle events.
		if (tbID && tbID != 'buttonBackground' && eventType) {
		
			switch(eventType) {
				case 'mouseover' :
					if (tbID != 'trackSliderZoom' && tbID != 'trackSliderImageSet') { // Slider track for image set will have mouse over and out event handlers for setting mousewheel focus.
						Z.Utils.removeEventListener(targetBtn.childNodes[0], 'mouseover', buttonEventsHandler);
						Z.Utils.addEventListener(targetBtn.childNodes[1], 'mousedown', buttonEventsHandler);
						Z.Utils.addEventListener(targetBtn.childNodes[1], 'mouseout', buttonEventsHandler);
						if (buttonSliderZoomDown && targetBtnOrig) { Z.Utils.addEventListener(targetBtnOrig.childNodes[0], 'mouseup', buttonEventsHandler); }
						if (buttonSliderImageSetDown && targetBtnOrig) { Z.Utils.addEventListener(targetBtnOrig.childNodes[0], 'mouseup', buttonEventsHandler); }
						if (tbID == 'buttonZoomIn' || tbID == 'buttonSliderZoom' || tbID == 'buttonZoomOut') {
							Z.sliderFocus = 'zoom';
						} else if (tbID == 'buttonImageSetPrior' || tbID == 'buttonSliderImageSet' || tbID == 'buttonImageSetNext') {
							Z.sliderFocus = 'imageSet';
						}
					} else {
						Z.Utils.addEventListener(targetBtn.childNodes[0], 'mouseout', buttonEventsHandler);
						Z.sliderFocus = (tbID == 'trackSliderImageSet') ? 'imageSet' : 'zoom';
					}
					break;
				case 'mousedown' :
					Z.buttonIsDown = true;
					
					if (!Z.fullView && document.activeElement) { document.activeElement.blur(); }
					
					if (tbID != 'trackSliderZoom' && tbID != 'trackSliderImageSet') { // Sliders handled in event manager below.
						Z.Utils.removeEventListener(targetBtn.childNodes[1], 'mousedown', buttonEventsHandler);
						Z.Utils.removeEventListener(targetBtn.childNodes[1], 'mouseout', buttonEventsHandler);
						Z.Utils.addEventListener(targetBtn.childNodes[2], 'mouseup', buttonEventsHandler);
						Z.Utils.addEventListener(targetBtn.childNodes[2], 'mouseout', buttonEventsHandler);
						if (tbID == 'buttonSliderZoom') {
							sliderSlideStartZoom(event);
							sliderMouseMoveHandlerZoom(event); // Run once so values are defined at first movement.
							Z.Utils.addEventListener(document, 'mousemove', sliderMouseMoveHandlerZoom);
							if (!sliderIntervalZoom) { sliderIntervalZoom = window.setInterval(sliderSlideZoom, SLIDERTESTDURATION_ZOOM); }
							Z.Utils.addEventListener(document, 'mouseup', buttonEventsHandler);
						}
						if (tbID == 'buttonSliderImageSet') {
							sliderSlideStartImageSet(event);
							sliderMouseMoveHandlerImageSet(event); // Run once so values are defined at first movement.
							Z.Utils.addEventListener(document, 'mousemove', sliderMouseMoveHandlerImageSet);
							if (!sliderIntervalImageSet) { sliderIntervalImageSet = window.setInterval(sliderSlideImageSet, SLIDERTESTDURATION_IMAGESET); }
							Z.Utils.addEventListener(document, 'mouseup', buttonEventsHandler);
						}
					} else if (Z.slidestack && tbID == 'trackSliderImageSet') {
						Z.Utils.addEventListener(targetBtn, 'mouseup', buttonEventsHandler);
					}
					if (tbViewport) { buttonEventsManager(event, tbID); }
					break;
				case 'mouseup' :
					Z.buttonIsDown = false;
					
					Z.Utils.removeEventListener(targetBtn.childNodes[2], 'mouseup', buttonEventsHandler);
					Z.Utils.removeEventListener(targetBtn.childNodes[2], 'mouseout', buttonEventsHandler);
					Z.Utils.addEventListener(targetBtn.childNodes[1], 'mousedown', buttonEventsHandler);
					Z.Utils.addEventListener(targetBtn.childNodes[1], 'mouseout', buttonEventsHandler);
					if (buttonSliderZoomDown && targetBtnOrig) { Z.Utils.removeEventListener(targetBtnOrig.childNodes[0], 'mouseup', buttonEventsHandler); }
					if (buttonSliderImageSetDown && targetBtnOrig) { Z.Utils.removeEventListener(targetBtnOrig.childNodes[0], 'mouseup', buttonEventsHandler); }
					if (tbViewport) { buttonEventsManager(event, tbID); }
					break;
				case 'mouseout' :
					if (tbID != 'trackSliderZoom' && tbID != 'trackSliderImageSet') { // Slider track for image set will have mouse over and out event handlers for setting mousewheel focus.
						Z.Utils.removeEventListener(targetBtn.childNodes[1], 'mousedown', buttonEventsHandler);
						Z.Utils.removeEventListener(targetBtn.childNodes[1], 'mouseout', buttonEventsHandler);
						Z.Utils.addEventListener(targetBtn.childNodes[0], 'mouseover', buttonEventsHandler);
						if (tbViewport) { buttonEventsManager(event, tbID); }
						if (tbID == 'buttonImageSetPrior' || tbID == 'buttonSliderImageSet' || tbID == 'trackSliderImageSet' || tbID == 'buttonImageSetNext' || tbID == 'buttonZoomIn' || tbID == 'buttonSliderZoom' || tbID == 'buttonZoomOut') {
							Z.sliderFocus = (Z.mouseWheel == 2) ? 'imageSet' : 'zoom';
						}
					} else {
						Z.Utils.removeEventListener(targetBtn.childNodes[0], 'mouseout', buttonEventsHandler);
						Z.sliderFocus = (Z.mouseWheel == 2) ? 'imageSet' : 'zoom';
					}
					break;
				case 'touchstart' :
					if (tbID == 'buttonSliderZoom') {
						sliderSlideStartZoom(event);
						sliderTouchMoveHandler(event); // Run once so values are defined at first movement.
						Z.Utils.addEventListener(document, 'touchmove', sliderTouchMoveHandler);
						if (!sliderIntervalZoom) { sliderIntervalZoom = window.setInterval(sliderSlideZoom, SLIDERTESTDURATION_ZOOM); }
					}
					if (tbID == 'buttonSliderImageSet') {
						sliderSlideStartImageSet(event);
						sliderTouchMoveHandlerImageSet(event); // Run once so values are defined at first movement.
						Z.Utils.addEventListener(document, 'touchmove', sliderTouchMoveHandlerImageSet);
						if (!sliderIntervalImageSet) { sliderIntervalImageSet = window.setInterval(sliderSlideImageSet, SLIDERTESTDURATION_IMAGESET); }
					}
					Z.Utils.addEventListener(targetBtn, 'touchend', buttonEventsHandler);
					Z.Utils.addEventListener(targetBtn, 'touchcancel', buttonEventsHandler);
					if (tbViewport) { buttonEventsManager(event, tbID); }
					break;
				case 'touchend' :
					Z.Utils.addEventListener(targetBtn, 'touchstart', buttonEventsHandler);
					if (tbViewport) { buttonEventsManager(event, tbID); }
					break;
				case 'touchcancel' :
					Z.Utils.addEventListener(targetBtn, 'touchstart', buttonEventsHandler);
					if (tbViewport) { buttonEventsManager(event, tbID); }
					break;
				case 'MSPointerDown' :
					if (tbID == 'buttonSliderZoom') {
						sliderSlideStartZoom(event);
						sliderTouchMoveHandler(event); // Run once so values are defined at first movement.
						Z.Utils.addEventListener(document, 'MSPointerMove', sliderTouchMoveHandler);
						if (!sliderIntervalZoom) { sliderIntervalZoom = window.setInterval(sliderSlideZoom, SLIDERTESTDURATION_ZOOM); }
					}
					if (tbID == 'buttonSliderImageSet') {
						sliderSlideStartImageSet(event);
						sliderTouchMoveHandlerImageSet(event); // Run once so values are defined at first movement.
						Z.Utils.addEventListener(document, 'MSPointerMove', sliderTouchMoveHandlerImageSet);
						if (!sliderIntervalImageSet) { sliderIntervalImageSet = window.setInterval(sliderSlideImageSet, SLIDERTESTDURATION_IMAGESET); }
					}
					Z.Utils.addEventListener(targetBtn, 'MSPointerUp', buttonEventsHandler);
					if (tbViewport) { buttonEventsManager(event, tbID); }
					break;
				case 'MSPointerUp' :
					Z.Utils.addEventListener(targetBtn, 'MSPointerDown', buttonEventsHandler);
					if (tbViewport) { buttonEventsManager(event, tbID); }
					break;
			}
		}
	}
	
	function buttonEventsManager (event, tbID) {
		var eventType = event.type;
			
		// Use vp ID 0 if one panel, or actual ID if many panels.
		var vp0MIDStr = (Z.annotationFileShared) ? '0' : tbViewportIDStr;
		var isAltKey = event.altKey;
			
		if (eventType == 'mousedown' || eventType == 'touchstart') {
			
			// Remove editing cursor from any current text region and position current edit mode indicator.
			textElementRemoveFocus();
			
			switch (tbID) {
				case 'buttonMinimize' :
					if (isAltKey) { 
						tbViewport.setHotspotsVisibility(!tbViewport.getHotspotsVisibility());
					} else {
						self.minimize(true);
						if (Z.Navigator) { Z.Navigator.setVisibility(false); }					
					}
					break;
				case 'buttonExpand' :
					if (isAltKey) { 
						tbViewport.setHotspotsVisibility(!tbViewport.getHotspotsVisibility());
					} else {
						self.minimize(false);
						if (Z.Navigator) { Z.Navigator.setVisibility(true); }					
					}
					break;
				case 'buttonZoomOut' :
					if (!isAltKey) { tbViewport.zoom('out'); }			
					break;
				case 'buttonSliderZoom' :
					// Handled in buttonEventsHandler due to need to set values (buttonSliderZoomDown, mouse position coordinates) prior to handler updating.
					break;
				case 'trackSliderZoom' :
					sliderSnapZoom(event);
					break;
				case 'buttonZoomIn' :
					if (!isAltKey) { tbViewport.zoom('in'); }
					break;
				case 'buttonPanLeft' :
					tbViewport.pan('left');
					break;
				case 'buttonPanUp' :
					tbViewport.pan('up');
					break;
				case 'buttonPanDown' :
					tbViewport.pan('down');
					break;
				case 'buttonPanRight' :
					tbViewport.pan('right');
					break;
				case 'buttonReset' :
					tbViewport.reset(isAltKey);
					break;
					
				case 'buttonFullView' :
					// DEV NOTE: Function called on mouseup to avoid conflict with fullscreen mode change processing.
					//tbViewport.toggleFullViewMode(true);
					break;					
				case 'buttonFullViewExit' :
					// DEV NOTE: Function called on mouseup to avoid conflict with fullscreen mode change processing.
					//tbViewport.toggleFullViewMode(false);
					break;
					
				case 'buttonMeasure' :
					tbViewport.toggleEditModeMeasure(true);
					break;
				case 'buttonMeasureExit' :
					tbViewport.toggleEditModeMeasure(false);
					break;
					
				case 'buttonHelp' :
					// Help is provided in four ways: viewer help for toolbar button, viewer help + annotation viewing help for toolbar button in annotation viewing mode, 
					// markup editing help for markup button in markup editing mode, and annotation editing help for annotation panel button in annotation editing mode.
					if (Z.annotations && Z.editMode === null) {
						// Viewer help + annotation viewing help for toolbar button in annotation viewing mode.
						Z.Utils.showHelp(Z.Utils.getResource('CONTENT_HELPTOOLBAR') + Z.Utils.getResource('CONTENT_HELPCONCATENATOR') + Z.Utils.getResource('CONTENT_HELPANNOTATIONVIEWING'));
					} else {
						// Viewer help for toolbar button.
						Z.Utils.showHelp(Z.Utils.getResource('CONTENT_HELPTOOLBAR'));
					}
					break;
				case 'buttonHelpMarkup' + vp0MIDStr :
					// Markup editing help for markup button in markup editing mode.
					Z.Utils.showHelp(Z.Utils.getResource('CONTENT_HELPMARKUP'));
					break;
				case 'buttonHelpAnnotation' + vp0MIDStr :
					// Annotation editing help for annotation panel button in annotation editing mode.
					Z.Utils.showHelp(Z.Utils.getResource('CONTENT_HELPANNOTATIONEDITING'));
					break;
					
				case 'buttonRotateClockwise' :
					tbViewport.rotateClockwise();
					break;
				case 'buttonRotateCounterwise' :
					tbViewport.rotateCounterwise();
					break;
					
				case 'buttonTourPrior' :
					tbViewport.priorDestination(true);
					break;
				case 'buttonTourNext' :
					tbViewport.nextDestination(true);
					break;
				case 'buttonTourStart' :
					tbViewport.tourStart();
					break;
				case 'buttonTourStop' :
					tbViewport.tourStop();
					break;
					
				case 'buttonSlideshowPrior' :
					tbViewport.priorSlide(true);
					break;
				case 'buttonSlideshowNext' :
					tbViewport.nextSlide(true);
					break;
				case 'buttonSlideshowStart' :
					tbViewport.slideshowStart();
					break;
				case 'buttonSlideshowStop' :
					tbViewport.slideshowStop();
					break;
					
				case 'buttonAudioOn' :
					tbViewport.audioMute(true);
					break;					
				case 'buttonAudioMuted' :
					tbViewport.audioMute(false);
					break;
					
				case 'buttonImageSetPrior' :
					// Handle here if animation, on mouseup if slidestack.
					if (Z.animation) { Z.Viewer.viewportChange('backward'); }
					break;
				case 'buttonSliderImageSet' :
					// Handled in buttonEventsHandler due to need to set values (buttonSliderImageSetDown, mouse position coordinates) prior to handler updating.
					break;
				case 'trackSliderImageSet' :
					// Handle here if animation, on mouseup if slidestack.
					if (Z.animation) { sliderSnapImageSet(event); }
					break;
				case 'buttonImageSetNext' :
					// Handle here if animation, on mouseup if slidestack.
					if (Z.animation) { Z.Viewer.viewportChange('forward'); }
					break;
					
				default :
					if (tbID.substr(0, 11) == 'buttonColor') { 
						tbViewport.setDrawingColor(tbID); 
					}
			}
		} else if (eventType == 'mouseup' || eventType == 'touchend' || eventType == 'touchcancel') {
			if (tbID == 'buttonSliderZoom' || buttonSliderZoomDown) {
				if (sliderIntervalZoom) {
					window.clearInterval(sliderIntervalZoom);
					sliderIntervalZoom = null;
				}
				setToolbarDefaults();
				sliderSlideEndZoom();
			} else if (tbID == 'buttonSliderImageSet' || buttonSliderImageSetDown) {
				if (sliderIntervalImageSet) {
					window.clearInterval(sliderIntervalImageSet);
					sliderIntervalImageSet = null;
				}
				setToolbarDefaults();
				sliderSlideEndImageSet();
			} else if (tbID == 'buttonZoomOut' || tbID == 'buttonZoomIn') {
				tbViewport.zoom('stop');			
				// Optional means to display Viewer global variable values when debug parameter is not set in web page.
				if (Z.debug == 0 && tbID == 'buttonZoomOut' && isAltKey) { Z.Utils.showGlobals(); }
				// Optional means to toggle between edit and view modes.
			} else if (tbID == 'buttonPanLeft' || tbID == 'buttonPanRight') {
				tbViewport.pan('horizontalStop');
				// Optional means to toggle between smooth and normal pan modes.
				if (tbID == 'buttonPanLeft' && isAltKey) { tbViewport.toggleSmoothPan(); }
			} else if (tbID == 'buttonPanUp' || tbID == 'buttonPanDown') {
				tbViewport.pan('verticalStop');
			} else if (tbID == 'buttonFullView') {
				// DEV NOTE: Function called on mouseup to avoid conflict with fullscreen mode change processing.
				tbViewport.toggleFullViewMode(true);
			} else if (tbID == 'buttonFullViewExit') {
				// DEV NOTE: Function called on mouseup to avoid conflict with fullscreen mode change processing.
				tbViewport.toggleFullViewMode(false);
			} else if (tbID == 'trackSliderImageSet') {
				if (Z.slidestack) { sliderSnapImageSet(event); }
			} else if (tbID == 'buttonImageSetPrior' || tbID == 'buttonImageSetNext') {
				if (Z.animation) {
					Z.Viewer.viewportChange('stop');
				} else if (Z.slidestack) { 
					if (tbID == 'buttonImageSetPrior') {
						Z.Viewer.viewportChange('backward');
					} else if (tbID == 'buttonImageSetNext') {
						Z.Viewer.viewportChange('forward');
					}
				}
			}
					
		} else if (eventType == 'mouseout') {
			if (tbID == 'buttonZoomOut' || tbID == 'buttonZoomIn') {
				tbViewport.zoom('stop');
			} else if (tbID == 'buttonPanLeft' || tbID == 'buttonPanRight') {
				tbViewport.pan('horizontalStop');
			} else if (tbID == 'buttonPanUp' || tbID == 'buttonPanDown') {
				tbViewport.pan('verticalStop');
			} else if (tbID == 'buttonImageSetPrior' || tbID == 'buttonImageSetNext') {
				Z.Viewer.viewportChange('stop');
			}
		}
	}	

	this.backgroundEventsHandler = function (event) {
		// Background mouseover event is backup for mouseout of buttons.
		var event = Z.Utils.event(event);
		var relatedTarget = Z.Utils.relatedTarget(event);
		if (relatedTarget) {
			var targetBtn = relatedTarget.parentNode;
			if (targetBtn) {
				var tbID = targetBtn.id;
				if (tbID) {
					if (!buttonSliderZoomDown && !buttonSliderImageSetDown && tbID.indexOf('button') != -1 && tbID.indexOf('buttonContainer') == -1) {
						Z.Utils.setButtonDefaults(relatedTarget.parentNode);
					}
				}
			}
		}
	}
	
	function setToolbarDefaults () {
		if (buttonSliderZoomDown) {
			Z.Utils.removeEventListener(document, 'mousemove', sliderMouseMoveHandlerZoom);
			Z.Utils.removeEventListener(document, 'mouseup', buttonEventsHandler);
			Z.Utils.removeEventListener(document, 'touchmove', sliderTouchMoveHandler);
		}
		if (buttonSliderImageSetDown) {
			Z.Utils.removeEventListener(document, 'mousemove', sliderMouseMoveHandlerImageSet);
			Z.Utils.removeEventListener(document, 'mouseup', buttonEventsHandler);
			Z.Utils.removeEventListener(document, 'touchmove', sliderTouchMoveHandlerImageSet);
		}
		var toolbarChildren = Z.ToolbarDisplay.childNodes;
		for (var i = 0, j = toolbarChildren.length; i < j; i++) {
			var target =  toolbarChildren[i];
			var tID = target.id;
			if (tID && tID.indexOf('button') != -1) {
				if (tID != 'buttonContainer' && tID != 'buttonContainerImageFilter') {
					Z.Utils.setButtonDefaults(target);
				} else {
					var targetChildren = target.childNodes;
					for (var k = 0, m = targetChildren.length; k < m; k++) {
						var targetSub = targetChildren[k];
						var tIDS = targetSub.id;
						if (tIDS && tIDS.indexOf('button') != -1) {
							Z.Utils.setButtonDefaults(targetSub);
						}
					}
				}
			}
		}
	}
	
	function sliderMouseMoveHandlerZoom (event) {
		sliderIntervalMousePtZoom = new Z.Utils.Point(event.clientX, event.clientY);
	}

	function sliderTouchMoveHandler (event) {
		var touch = Z.Utils.getFirstTouch(event);
		if (touch) {
			var target = touch.target;
			sliderIntervalMousePtZoom = new Z.Utils.Point(touch.pageX, touch.pageY);
		}
	}

	function buttonGraphicsUpdate (targetBtn, eT) {
		if (targetBtn.id.indexOf('button') != -1 && targetBtn.id.indexOf('buttonContainer') == -1) {
			var iU = targetBtn.firstChild;
			var iO = targetBtn.childNodes[1];
			var iD = targetBtn.childNodes[2];
			if (iU && iO && iD) {
				var iuS = iU.style;
				var ioS = iO.style;
				var idS = iD.style;
				iuS.visibility = ioS.visibility = idS.visibility = 'hidden';
				// First line assigns priority to slider button mousedown state over mouse out/over/up events of other buttons.
				if (eT == 'mouseover' && targetBtn.id == 'buttonSliderZoom' && buttonSliderZoomDown) {
					idS.visibility = 'visible';
				} else if (eT == 'mouseover' && targetBtn.id == 'buttonSliderImageSet' && buttonSliderImageSetDown) {
					idS.visibility = 'visible';
				} else if (eT == 'mouseover' || eT == 'mouseup') {
					ioS.visibility = 'visible';
				} else if (eT == 'mousedown' || eT == 'mousemove' || eT == 'touchstart' || eT == 'MSPointerDown') {
					idS.visibility = 'visible';
				} else if (eT == 'mouseout' || eT == 'touchend' || eT == 'touchcancel' || eT == 'MSPointerUp') {
					iuS.visibility = 'visible';
				}
			}
		}
	}	
		
	function textElementRemoveFocus () {		
		var elmt = document.activeElement.id;				
		if (Z.Utils.stringValidate(elmt) && (elmt == 'poiNameTextElement' + tbViewportIDStr || elmt == 'labelNameTextElement' + tbViewportIDStr || elmt == 'captionTextElement' || elmt == 'commentTextElement' || elmt == 'tooltipTextElement' || elmt == 'clickURLTextElement' || elmt == 'noteNameTextElement' + tbViewportIDStr || elmt == 'noteTextElement' + tbViewportIDStr)) {
			var currentTextRegion = document.getElementById(elmt);
			currentTextRegion.blur();
		}
	}
};



//::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::
//::::::::::::::::::::::::::::::::::: NAVIGATOR FUNCTIONS :::::::::::::::::::::::::::::::
//::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::

Z.ZoomifyNavigator = function (navViewport) {

	//::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::
	//::::::::::::::::::::::::::::::::::::: INIT FUNCTIONS ::::::::::::::::::::::::::::::::::::
	//::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::

	// Declare variables for navigator internal self-reference and initialization completion.
	var self = this;
	var isInitialized = false;
	var navViewportIDStr = navViewport.getViewportID().toString();
	var validateNavigatorGlobalsInterval;

	// Declare variables for navigator display.
	var nD, ndS, nB, nbS, niC, nicS, nI, nR, nrS;
	var navigatorImage;
	var navigatorImages = [];

	// Declare and set variables local to navigator for size and position.
	var navW = Z.navigatorW;
	var navH = Z.navigatorH;
	var navL = Z.navigatorL;
	var navT = Z.navigatorT;
	var navFit = Z.navigatorFit;
	var navImageW, navImageH = null;

	// Load Zoomify Image thumbnail.
	var navigatorImagePath;

	// Support imageSet viewing.
	if (Z.imagePath != "multiple") {
		loadNavigatorImage(initializeNavigator);
	} else {
		loadNavigatorImagesMultiple(initializeNavigatorMultipleViewports);
	}

	function loadNavigatorImage (successFunction, multiViewport) {
		var oneVP = (typeof multiViewport !== "undefined" && multiViewport !== null) ? false : true;
		var navVP = (oneVP) ? navViewport : multiViewport;
		
		if (Z.tileSource != 'unconverted') {
			
			if (Z.tileSource == 'ZoomifyImageFile') {
				navigatorImagePath = navVP.formatTilePath(0, 0, 0);
			} else if (Z.tileSource == 'ZoomifyImageFolder') {
				navigatorImagePath = Z.Utils.cacheProofPath(navVP.getImagePath() + '/TileGroup0/' + '0-0-0.' + Z.tileType);
			}
			navigatorImage = null;
			navigatorImage = new Image();
			navigatorImage.onload = successFunction;
			navigatorImage.onerror = navigatorImageLoadingFailed;

			if (navigatorImagePath != 'offsetLoading') {
				if (!oneVP) {
					navigatorImages[navigatorImages.length] = { id:multiViewport.getViewportID().toString(), image:navigatorImage };
				}			
				if (Z.tileSource == 'ZoomifyImageFile') {
					var navNetConnector = new Z.NetConnector();
					navNetConnector.loadImage(navigatorImagePath, Z.Utils.createCallback(null, successFunction), 'navigator', null);
				} else {
					navigatorImage.src = navigatorImagePath;
				}
			} else {
				var navigatorImageTimer = window.setTimeout( function () { loadNavigatorImage(successFunction); }, 100);
			}
			
		} else {
			if (typeof unconvertedImage !== 'undefined' && unconvertedImage !== null) {
				// Unconverted image: create navigator thumbnail.
				navigatorImage = navVP.createUnconvertedImageThumbnail(unconvertedImage);

				// Initialize navigator if single viewport. If multiple, store thumbnail for one call to initialize in function loadNavigatorImagesMultiple outside for loop that calls this function loadNavigatorImage.
				if (oneVP && typeof successFunction === 'function') {
					successFunction(); // initializeNavigator(placeholder, image)
				} else {
					if (typeof multiViewport !== 'undefined') {
						navigatorImages[navigatorImages.length] = { id:multiViewport.getViewportID().toString(), image:navigatorImage };
					} else {
						// DEV NOTE: placeholder workaround for browser issue under investigation.
						navigatorImages[navigatorImages.length] = { id:null, image:null };
					}
				}
			} else {
				var loadNavigatorImageTimer = window.setTimeout( function () { loadNavigatorImage(successFunction, multiViewport); }, 100);
			}
		}
	}

	// Support imageSet viewing.
	function loadNavigatorImagesMultiple (successFunction) {
		for (var i = 0, j = Z.imageSetLength; i < j; i++) {
			loadNavigatorImage(null, Z['Viewport' + i.toString()]);
		}
		successFunction(); // initializeNavigatorMultipleViewports
	}

	this.initializeNavigator = function (placeholder, image) {
		initializeNavigator(placeholder, image);
	}

	function initializeNavigator (placeholder, image) {
		// Navigator thumbnail will be received in loadNavigatorImage function via navigator.src assignment, 
		// unless tileSource is ZoomifyImageFile, in which case thumbnail will be received via image parameter 
		// of this function serving as success function for loadNavigatorImage function.
		if (Z.tileSource == 'ZoomifyImageFile') { navigatorImage = image; }
		
		// Verify image load completion.
		var testImageContainer = Z.Utils.createContainerElement('div', 'testImageContainer', 'inline-block', 'absolute', 'hidden', navW + 'px', navH + 'px', '0px', '0px', 'none', '0px', 'transparent none', '0px', '0px', 'normal', null, true);
		testImageContainer.appendChild(navigatorImage);
		testImageContainer.removeChild(navigatorImage);
		testImageContainer = null;
		var tW = navigatorImage.width;
		var tH = navigatorImage.height;		
		if (tW != 0 && tH != 0) {
		
			// Create navigator display to contain background, image, and rectangle.
			Z.NavigatorDisplay = Z.Utils.createContainerElement('div', 'NavigatorDisplay', 'inline-block', 'absolute', 'hidden', navW + 'px', navH + 'px', navL + 'px', navT + 'px', 'solid', '1px', 'transparent none', '0px', '0px', 'normal', null, true);
			nD = Z.NavigatorDisplay;
			ndS = nD.style;
			if (Z.slideshow) { Z.Utils.setOpacity(nD, 0); }
			
			// Ensure navigator is in front of hotspots in viewport.
			var uiElementsBaseZIndex = parseInt(Z.Utils.getResource('DEFAULT_UIELEMENTBASEZINDEX'), 10);
			ndS.zIndex = (uiElementsBaseZIndex + 2).toString();

			// Create background and set transparency.
			var backAlpha = parseFloat(Z.Utils.getResource('DEFAULT_BACKGROUNDALPHA'));
			var backColor = Z.Utils.getResource('DEFAULT_BACKGROUNDCOLOR');
			var backColorNoAlpha = Z.Utils.getResource('DEFAULT_BACKGROUNDCOLORNOALPHA');
			var navigatorBackground = Z.Utils.createContainerElement('div', 'navigatorBackground', 'inline-block', 'absolute', 'hidden', navW + 'px', navH + 'px', '0px', '0px', 'none', '0px', backColor, '0px', '0px', 'normal', null, true);
			Z.Utils.setOpacity(navigatorBackground, backAlpha, backColorNoAlpha);
			Z.NavigatorDisplay.appendChild(navigatorBackground);
			nB = navigatorBackground;
			nbS = nB.style;

			// Add thumbnail image previously loaded.
			var navigatorImageContainer = Z.Utils.createContainerElement('div', 'navigatorImageContainer', 'inline-block', 'absolute', 'hidden', navW + 'px', navH + 'px', '0px', '0px', 'none', '0px', 'transparent none', '0px', '0px', 'normal', null, true);
			navigatorImageContainer.appendChild(navigatorImage);
			navigatorImage.alt = Z.Utils.getResource('UI_NAVIGATORACCESSIBILITYALTATTRIBUTE');
			Z.NavigatorDisplay.appendChild(navigatorImageContainer);
			niC = navigatorImageContainer;
			nicS = niC.style;
			nI = navigatorImage;
			var niW = nI.width;
			var niH = nI.height;
			
			// Create rectangle to indicate position within image of current viewport view.
			var navigatorRectangle = Z.Utils.createContainerElement('div', 'navigatorRectangle', 'inline-block', 'absolute', 'hidden', navW+1 + 'px', navH+1 + 'px', navL + 'px', navT + 'px', 'solid', '1px', 'transparent none', '0px', '0px', 'normal', null, true);
			navigatorRectangle.style.borderColor = Z.Utils.stringValidateColorValue(Z.navigatorRectangleColor);
			Z.NavigatorDisplay.appendChild(navigatorRectangle);
			nR = navigatorRectangle;
			nrS = nR.style;

			// Add navigator to viewer display and set size, position, visibility, and zIndex.
			Z.ViewerDisplay.appendChild(Z.NavigatorDisplay);
			
			// DEV NOTE: Appending line above causes dimensions of nI to be 0 in IE11. Workaround
			// is to save values before line above and pass them into setSizeAndPosition function below.
			setSizeAndPosition(navW, navH, navL, navT, navFit, niW, niH);			
			visibility(Z.navigatorVisible == 1 || Z.navigatorVisible == 2);
						
			// Enable mouse, initialize navigator, sync to viewport.
			// Prevent object dragging and bubbling.
			Z.Utils.addEventListener(nD, 'mouseover', Z.Utils.stopPropagation);
			Z.Utils.addEventListener(nD, 'mousedown', navigatorMouseDownHandler);
			Z.Utils.addEventListener(nD, 'touchstart', navigatorTouchStartHandler);
			Z.Utils.addEventListener(nD, 'touchmove', navigatorTouchMoveHandler);
			Z.Utils.addEventListener(nD, 'touchend', navigatorTouchEndHandler);
			Z.Utils.addEventListener(nD, 'touchcancel', navigatorTouchCancelHandler);
	
			setInitialized(true);
			syncToViewport(); // Method also called in setSizeAndPosition | drawLayout above but that is prior to full initialization of navigator.
		
		} else {
			var navigatorImageLoadedTimer = window.setTimeout( function () { initializeNavigator(placeholder, image); }, 100);
		}
	}

	// Support imageSet viewing.
	function initializeNavigatorMultipleViewports () {
		if (navigatorImages && navigatorImages.length > 0 && navigatorImages[0] !== null && navigatorImages[0].image.width > 0) {
			// Clone thumbnail to protect later reuse.
			var index = Z.Utils.arrayIndexOfObjectValue(navigatorImages, 'id', '0');
			if (index != -1 ) {
				var navigatorImageTemp = navigatorImages[index].image;
				navigatorImage = navigatorImageTemp.cloneNode(false);	
				navigatorImageTemp = null;
				if (typeof placeholder === 'undefined') { var placeholder = null; }
				initializeNavigator(placeholder, navigatorImage);
			} else {
				var navigatorImageMultipleViewportTimer = window.setTimeout( function() { initializeNavigatorMultipleViewports(); }, 100);
			}
		} else {
			var navigatorImageMultipleViewportTimer = window.setTimeout( function() { initializeNavigatorMultipleViewports(); }, 100);
		}
	}

	this.setImage = function (imagePath) {
		if (niC && navigatorImage && niC.childNodes.length > 0) {
			niC.innerHTML = '';
		}		
		if (typeof navigatorImages === 'undefined' || navigatorImages === null || navigatorImages.length == 0) {
			loadNavigatorImage(reinitializeNavigator);
		} else {
			var index = Z.Utils.arrayIndexOfObjectValue(navigatorImages, 'id', navViewportIDStr);
			if (index != -1) {
				navigatorImage = navigatorImages[index].image;
				reinitializeNavigator(navigatorImage);
			}
		}
	}

	function reinitializeNavigator (image) {
		if (Z.NavigatorDisplay) {
			if (Z.slideshow) { Z.Utils.setOpacity(Z.NavigatorDisplay, 0); }
			if (Z.tileSource == 'ZoomifyImageFile') { navigatorImage = image; }
			
			if (niC && navigatorImage && navigatorImage.width > 0 && navigatorImage.height > 0) {
				// DEV NOTE: Appending line above causes dimensions of nI to be 0 in IE11. Workaround is to save values before line above and pass them into setSizeAndPosition function below.
				var niW = navigatorImage.width;
				var niH = navigatorImage.height;
				niC.appendChild(navigatorImage);
				nI = Z.NavigatorDisplay.childNodes[1].firstChild; // Thumbnail.
				setSizeAndPosition(navW, navH, navL, navT, navFit, niW, niH);
				var componentsVisible = ((Z.ToolbarDisplay && Z.ToolbarDisplay.style.display == 'inline-block' && !Z.ToolbarMinimized) || (typeof slideList !== 'undefined' && slideList !== null && slideList.style.visibility == 'visible'));
				visibility((Z.navigatorVisible == 1 || Z.navigatorVisible == 2) && componentsVisible);		
				var uiElementsBaseZIndex = parseInt(Z.Utils.getResource('DEFAULT_UIELEMENTBASEZINDEX'), 10);
				Z.NavigatorDisplay.style.zIndex = (uiElementsBaseZIndex + 2).toString();
				syncToViewport();
			} else {
				var navigatorImageReinitializationTimer = window.setTimeout( function () { reinitializeNavigator(); }, 100);
			}
		}
	}



	//::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::
	//:::::::::::::::::::::::::::::::::: GET & SET FUNCTIONS ::::::::::::::::::::::::::::::::::
	//::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::

	this.getInitialized = function () {
		return getInitialized();
	}

	function getInitialized () {
		return isInitialized;
	}

	function setInitialized (initialized) {
		if (!isInitialized && initialized) {
			isInitialized = true;
			Z.Utils.validateCallback('navigatorInitialized');
			Z.Viewer.validateViewerReady('navigatorInitialized');
		}
	}

	this.setVisibility = function (visible) {
		visibility(visible);
	}

	this.syncToViewport = function () {
		syncToViewport();
	}

	this.syncNavigatorRectangleDimensions = function () {
		syncNavigatorRectangleDimensions();
	}

	this.syncNavigatorRotation = function () {
		syncNavigatorRotation();
	}

	this.syncNavigatorRectangleToViewport = function (currentCenterPt) {
		syncNavigatorRectangleToViewport(currentCenterPt);
	}
	
	// Support imageSet viewing.
	this.setViewport = function (navVwprt) {
		navViewport = navVwprt;
		navViewportIDStr = navViewport.getViewportID().toString();
		self.setImage(navViewport.getImagePath());
	}



	//::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::
	//::::::::::::::::::::::::::::::::::: CORE FUNCTIONS ::::::::::::::::::::::::::::::::::::::
	//::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::

	this.validateNavigatorGlobals = function () {
		if (getInitialized()) {
			validateNavigatorGlobals();
		} else {
			validateNavigatorGlobalsInterval = window.setInterval(validateNavigatorGlobals, 300);
		}
	}

	function validateNavigatorGlobals () {
		// Ensure synchronizing calls to navigator functions from viewport have access to navigator
		// internal global variables.  First clear any interval used to call this function after initialization.
		if (getInitialized()) {
			if (validateNavigatorGlobalsInterval) {
				window.clearInterval(validateNavigatorGlobalsInterval);
				validateNavigatorGlobalsInterval = null;
			}
			if (!nD || !ndS || !nB || !nbS || !niC || !nicS || !nI || !nR || !nrS) {
				nD = Z.NavigatorDisplay;
				ndS = nD.style;
				nB = Z.NavigatorDisplay.firstChild; // Background.
				nbS = nB.style
				niC = Z.NavigatorDisplay.childNodes[1]; // Image container.
				nicS = niC.style
				nI = Z.NavigatorDisplay.childNodes[1].firstChild; // Thumbnail.
				nR = Z.NavigatorDisplay.childNodes[2]; // Navigation rectangle
				nrS = nR.style;
			}
		}
	}

	// DEV NOTE: dual setSizeAndPosition functions below are workaround for undefined error on load 
	// due to unhoisted function expression vs hoisted function declaration and/or IE8 limitations.
	this.setSizeAndPosition = function (width, height, left, top, fit, niW, niH) {
		setSizeAndPosition(width, height, left, top, fit, niW, niH);
	}
	
	function setSizeAndPosition (width, height, left, top, fit, niW, niH) {
		if (!fit) { fit = navFit; }
		if (typeof width === 'undefined' || width === null) { width = Z.navigatorW; }
		if (typeof height === 'undefined' || height === null) { height = Z.navigatorH; }
		if (typeof left === 'undefined' || left === null) { left = 0; }
		if (typeof top === 'undefined' || top === null) { top = 0; }

		if (!nD) { nD = Z.NavigatorDisplay; }
		if (!ndS) { ndS = nD.style; }

		// Set navigator image var explicitly in case image is being reset using setImage function to ensure thumbnail size is reset.
		nI = nD.childNodes[1].firstChild;
		
		// DEV NOTE: Next two lines are workaround for IE11 issue getting correct navigator image dimensions.
		// See comment on this line in calling function initializeNavigator: Z.ViewerDisplay.appendChild(Z.NavigatorDisplay);
		if (nI.width == 0 && niW !== 'undefined' && niW !== null) { nI.width = niW; }
		if (nI.height == 0 && niH !== 'undefined' && niH !== null) { nI.height = niH; }		

		if (nD && ndS && nI) {
			// If fitting navigator to aspect ratio of image or viewer calculate and apply aspect ratio to reset navigator 
			// dimensions while constraining it within width and height parameters as bounding maximum values.
			if (fit) {
				var navAspect = 1;
				var targetAspect = 1;
				if (fit == 0) {
					targetAspect = Z.viewerW / Z.viewerH;
				} else {
					targetAspect = nI.width / nI.height;
				}
				if (navAspect > 1) {
					height = width;
					height /= targetAspect;
				} else {
					width = height;
					width *= targetAspect;
				}
			}

			// Size navigator.
			ndS.width = width + 'px';
			ndS.height = height + 'px';

			// Set navigator position.
			ndS.left = left + 'px';
			ndS.top = top + 'px';

			drawLayout(width, height);
		}
	}

	function drawLayout (width, height) {
		if (!nI) { nI = Z.NavigatorDisplay.childNodes[1].firstChild; } // Thumbnail image.
		if (nI && nI.width != 0 && nI.height != 0) {		
			if (!nbS) { nbS = Z.NavigatorDisplay.firstChild.style; } // Background.
			if (!nicS) { nicS = Z.NavigatorDisplay.childNodes[1].style; } // Image container.
			if (nbS && nicS) {
				nbS.width = width + 'px';
				nbS.height = height + 'px';
				setSizeNavigatorImage(width, height);
				nicS.width = nI.width + 'px';
				nicS.height = nI.height + 'px';
				nicS.left = ((width - nI.width) / 2) + 'px';
				nicS.top = ((height - nI.height) / 2) + 'px';
				syncToViewport();
			}
		} else {
			var drawLayoutTimer = window.setTimeout( function () { drawLayout(width, height); }, 100);
		}
	}

	function setSizeNavigatorImage (navW, navH) {
		if (!nI) { nI = Z.NavigatorDisplay.childNodes[1].firstChild; } // Thumbnail image.
		if (nI) {
			var navImgW = nI.width;
			var navImgH = nI.height;
			var imageAspectRatio = navImgW / navImgH;
			var scaleW = navW / navImgW;
			var scaleH = navH / navImgH;
			if (scaleW <= scaleH) {
				navImgW = navW;
				navImgH = navW / imageAspectRatio;
				navImageT = ((navH - navImgH * (navW / navImgW)) / 2);
			} else if (scaleH < scaleW) {
				navImgH = navH;
				navImgW = navH * imageAspectRatio;
				navImageL = ((navW - navImgW * (navH / navImgH)) / 2);
			}
			nI.width = navImgW;
			nI.height = navImgH;
		}
	}

	function visibility (visible) {
		if (!ndS) { ndS = Z.NavigatorDisplay.style; }
		if (ndS) {
			if (visible) {
				ndS.display = 'inline-block';
			} else {
				ndS.display = 'none';
			}
		}
	}

	function syncToViewport () {
		// Set navigator rectangle size and position.
		if (navViewport && navViewport.getStatus('initialized')) {
			syncNavigatorRotation();
			syncNavigatorRectangleDimensions();
			var currentCenterPt = navViewport.calculateCurrentCenterCoordinates();
			syncNavigatorRectangleToViewport(currentCenterPt);
		}
	}

	function syncNavigatorRectangleDimensions () {
		if (nI && nrS) {
			var scaleW = nI.width / Z.imageW;
			var scaleH = nI.height / Z.imageH;
			var currentZ = navViewport.getZoom();
			var vpScaledW = Z.viewerW * scaleW / currentZ;
			var vpScaledH = Z.viewerH * scaleH / currentZ;
			nrS.width = vpScaledW + 'px';
			nrS.height = vpScaledH + 'px';
		}
	}

	function syncNavigatorRotation () {
		if (!nicS) { nicS = Z.NavigatorDisplay.childNodes[1].style; } // Image container.
		if (nicS) {
			var currentR = navViewport.getRotation();
			Z.Utils.rotateElement(nicS, currentR, true);
		}
	}

	function syncNavigatorRectangleToViewport (vpImgCtrPt) {
		// Convert image pixel coordinates at viewport display center to navigator
		// pixel coordinates to position top left of navigator rectangle.
		if (nI && nrS && nicS) {
			if (typeof vpImgCtrPt === 'undefined' || vpImgCtrPt === null || (vpImgCtrPt.x == 0 && vpImgCtrPt.y == 0)) {
				var vpImgCtrPt = new Z.Utils.Point(Z.imageX, Z.imageY);
			}
			if (typeof z === 'undefined' || z === null) { z = Z.imageZ; }
			var r = Z.imageR;
			if (r < 0) { r += 360; } // Ensure positive values.

			// Convert coordinates from image pixels to thumbnail pixels.
			var tW = parseFloat(nI.width);
			var tH = parseFloat(nI.height);
			var scaleW = tW / Z.imageW;
			var scaleH = tH / Z.imageH;
			var tX = vpImgCtrPt.x * scaleW;
			var tY = vpImgCtrPt.y * scaleH;

			// Translate coordinates to center axis perspective and rotate.
			var tcX = tX - tW / 2;
			var tcY = tY - tH / 2;
			var rcPt = Z.Utils.rotatePoint(tcX, tcY, -r);

			// Adjust new rectangle position for rectangle and navigator offsets.
			var rL = rcPt.x - parseFloat(nrS.width) / 2;
			var rT = rcPt.y - parseFloat(nrS.height) / 2;
			var ncX = parseFloat(ndS.width) / 2;
			var ncY = parseFloat(ndS.height) / 2;
			var rnL = ncX + rL;
			var rnT = ncY + rT - 1;

			// Apply new thumbnail rectangle coordinates to navigator display.
			nrS.left = rnL + 'px';
			nrS.top = rnT + 'px';
		}
	}

	function syncViewportToNavigatorRectangle () {
		// Convert navigator pixel coordinates at top left of navigator rectangle to image
		// pixel coordinates at viewport display center and pass to viewport to position view.
		if (nI && nrS && nicS) {
			if (typeof z === 'undefined' || z === null) { z = Z.imageZ; }
			var r = Z.imageR;
			if (r < 0) { r += 360; } // Ensure positive values.

			// Get new coordinates from navigator rectangle.
			var rnL = parseFloat(nrS.left);
			var rnT = parseFloat(nrS.top);

			// Adjust new rectangle position for rectangle and navigator offsets.
			var ncX = parseFloat(ndS.width) / 2;
			var ncY = parseFloat(ndS.height) / 2;
			var rL = rnL - ncX;
			var rT = rnT - ncY;
			var rcX = rL + parseFloat(nrS.width) / 2;
			var rcY = rT + parseFloat(nrS.height) / 2;

			// Translate coordinates to center axis perspective and rotate.
			var tcPt = Z.Utils.rotatePoint(rcX, rcY, r);
			var tW = parseFloat(nI.width);
			var tH = parseFloat(nI.height);
			var tX = tcPt.x + tW / 2;
			var tY = tcPt.y + tH / 2;

			// Convert coordinates from thumbnail pixels to image pixels.
			var scaleW = tW / Z.imageW;
			var scaleH = tH / Z.imageH;
			var newVPImgCtrX = tX / scaleW;
			var newVPImgCtrY = tY / scaleW;

			// Apply new image pixel coordinates to viewport display.
			var newVPImgCtrPt = new Z.Utils.Point(newVPImgCtrX, newVPImgCtrY);
			navViewport.syncViewportToNavigator(newVPImgCtrPt);
		}
	}

	function navigatorImageLoadingFailed () {
		Z.Utils.showMessage(Z.Utils.getResource('ERROR_NAVIGATORIMAGEPATHINVALID'));
	}



	//:::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::
	//::::::::::::::::::::::::::::::::: EVENT FUNCTIONS ::::::::::::::::::::::::::::::
	//:::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::

	function navigatorMouseDownHandler (event) {
		if (Z.interactivityOff) { return; }
		navViewport.zoomAndPanAllStop(false, true);
		if (Z.maskingSelection && Z.maskClearOnUserAction) { navViewport.clearMask(); }
		if (nD && nR && nrS) {
			var event = Z.Utils.event(event);
			nR.mouseXPrior = event.clientX;
			nR.mouseYPrior = event.clientY;
			dragPtStart = new Z.Utils.Point(event.clientX, event.clientY);
			Z.Utils.addEventListener(nD, 'mousemove', navigatorMouseMoveHandler);
			Z.Utils.addEventListener(nD, 'mouseup', navigatorMouseUpHandler);
			Z.Utils.addEventListener(document, 'mouseup', navigatorMouseUpHandler);
		}
	}

	function navigatorMouseMoveHandler (event) {
		if (Z.interactivityOff) { return; }
		if (nR && nrS) {
			var x = parseFloat(nrS.left);
			var y = parseFloat(nrS.top);
			nrS.left = x + (event.clientX - nR.mouseXPrior) + 'px';
			nrS.top = y + (event.clientY - nR.mouseYPrior) + 'px';
			nR.mouseXPrior = event.clientX;
			nR.mouseYPrior = event.clientY;
			syncViewportToNavigatorRectangle();
			return false;
		}
	}

	function navigatorMouseUpHandler (event) {
		if (Z.interactivityOff) { return; }
		if (nD && nR && nrS) {
			document.mousemove = null;
			document.mouseup = null;
			Z.Utils.removeEventListener(nD, 'mousemove', navigatorMouseMoveHandler);
			Z.Utils.removeEventListener(nD, 'mouseup', navigatorMouseUpHandler);
			Z.Utils.removeEventListener(document, 'mouseup', navigatorMouseUpHandler);
			var event = Z.Utils.event(event);
			var dragPtEnd = new Z.Utils.Point(event.clientX, event.clientY);
			var dragDist = Z.Utils.calculatePointsDistance(dragPtStart.x, dragPtStart.y, dragPtEnd.x, dragPtEnd.y);
			if (dragDist < 4) {
				var navDispOffsets = Z.Utils.getElementPosition(Z.NavigatorDisplay);
				nrS.left = event.clientX - navDispOffsets.x - (parseFloat(nrS.width) / 2) + 'px';
				nrS.top = event.clientY - navDispOffsets.y - (parseFloat(nrS.height) / 2) + 'px';
			}
			syncViewportToNavigatorRectangle();
			navViewport.updateView();
		}
	}

	function navigatorTouchStartHandler (event) {
		if (Z.interactivityOff) { return; }
		event.preventDefault(); // Prevent copy selection.
		if (nD && nR && nrS) {
			var touch = Z.Utils.getFirstTouch(event);
			if (touch) {
				var target = touch.target;
				var mPt = new Z.Utils.Point(touch.pageX, touch.pageY);
				dragPtStart = new Z.Utils.Point(mPt.x, mPt.y);
				nR.mouseXPrior = mPt.x;
				nR.mouseYPrior = mPt.y;
			}
		}
	}

	function navigatorTouchMoveHandler (event) {
		if (Z.interactivityOff) { return; }
		event.preventDefault(); // Prevent page dragging.
		if (!Z.mousePan) { return; }  // Disallow mouse panning if parameter false.

		if (nR && nrS) {
			var touch = Z.Utils.getFirstTouch(event);
			if (touch) {
				var target = touch.target;
				var mPt = new Z.Utils.Point(touch.pageX, touch.pageY);
				var x = parseFloat(nrS.left);
				var y = parseFloat(nrS.top);
				nrS.left = x + (mPt.x - nR.mouseXPrior) + 'px';
				nrS.top = y + (mPt.y - nR.mouseYPrior) + 'px';
				nR.mouseXPrior = mPt.x;
				nR.mouseYPrior = mPt.y;
				syncViewportToNavigatorRectangle();
				return false;
			}
		}

		return false;
	}

	function navigatorTouchEndHandler (event) {
		if (Z.interactivityOff) { return; }
		if (nD && nR && nrS) {
			var touch = Z.Utils.getFirstTouch(event);
			if (touch) {
				var target = touch.target;
				var mPt = new Z.Utils.Point(touch.pageX, touch.pageY);
				var dragPtEnd = new Z.Utils.Point(mPt.x, mPt.y);
				var dragDist = Z.Utils.calculatePointsDistance(dragPtStart.x, dragPtStart.y, dragPtEnd.x, dragPtEnd.y);
				var clickThreshold = (!Z.mobileDevice) ? 3 : 6;
				if (dragDist < clickThreshold) {
					var navDispOffsets = Z.Utils.getElementPosition(Z.NavigatorDisplay);
					nrS.left = mPt.x - navDispOffsets.x - (parseFloat(nrS.width) / 2) + 'px';
					nrS.top = mPt.y - navDispOffsets.y - (parseFloat(nrS.height) / 2) + 'px';
				}
			}
			syncViewportToNavigatorRectangle();
			navViewport.updateView();
		}
	}

	function navigatorTouchCancelHandler (event) {
		if (Z.interactivityOff) { return; }
		if (nD && nR && nrS) {
			var touch = Z.Utils.getFirstTouch(event);
			if (touch) {
				var target = touch.target;
				var mPt = new Z.Utils.Point(touch.pageX, touch.pageY);
				var dragPtEnd = new Z.Utils.Point(mPt.x, mPt.y);
				var dragDist = Z.Utils.calculatePointsDistance(dragPtStart.x, dragPtStart.y, dragPtEnd.x, dragPtEnd.y);
				var clickThreshold = (!Z.mobileDevice) ? 3 : 6;
				if (dragDist < clickThreshold) {
					var navDispOffsets = Z.Utils.getElementPosition(Z.NavigatorDisplay);
					nrS.left = mPt.x - navDispOffsets.x - (parseFloat(nrS.width) / 2) + 'px';
					nrS.top = mPt.y - navDispOffsets.y - (parseFloat(nrS.height) / 2) + 'px';
				}
			}
			syncViewportToNavigatorRectangle();
			navViewport.updateView();
		}
	}
};



//::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::
//::::::::::::::::::::::::::::::::::: RULER FUNCTIONS ::::::::::::::::::::::::::::::::::::::
//::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::

Z.ZoomifyRuler = function (rulerViewport) {

	// ::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::
	// ::::::::::::::::::::::::::::::::: INIT FUNCTIONS :::::::::::::::::::::::::::::::::::::
	// ::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::

	// Declare variables for ruler internal self-reference and initialization completion.
	var self = this;
	var isInitialized = false;

	// Declare and set variables local to ruler for size and position.
	var rD, rdS, rB, rbS, rSB, rsbS, eTB, etbS, sTB, stbS, uTB, utbS, mL, mlS;
	var noParamsText= Z.Utils.getResource('UI_RULERNOPARAMS');
	var minText = Z.Utils.getResource('UI_RULERMIN');
	var maxText = Z.Utils.getResource('UI_RULERMAX');
	var sourceMagnification = Z.sourceMagnification;
	var magnificationList, magnificationListDP;
	var units = Z.units;
	var unitsPerImage = Z.unitsPerImage;
	var pixelsPerUnit = Z.pixelsPerUnit;
	var actualPixelsPerUnit = 1;
	var unitsArray = [];
	var unitsIndex = -1;
	var scaleBarW = 1;

	initializeRuler();

	function initializeRuler () {

		// Create ruler display to contain background, scalebar and magnification list.
		Z.RulerDisplay = Z.Utils.createContainerElement('div', 'RulerDisplay', 'inline-block', 'absolute', 'hidden', '1px', '1px', '0px', '0px', 'solid', '1px', 'transparent none', '0px', '0px', 'normal');
		rD = Z.RulerDisplay;
		rdS = rD.style;

		// Create background and set transparency.
		var backAlpha = parseFloat(Z.Utils.getResource('DEFAULT_BACKGROUNDALPHA'));
		var backColor = Z.Utils.getResource('DEFAULT_BACKGROUNDCOLOR');
		var backColorNoAlpha = Z.Utils.getResource('DEFAULT_BACKGROUNDCOLORNOALPHA');
		var rulerBackground = Z.Utils.createContainerElement('div', 'rulerBackground', 'inline-block', 'absolute', 'hidden', '1px', '1px', '0px', '0px', 'none', '0px', backColor, '0px', '0px', 'normal', null, true);
		Z.Utils.setOpacity(rulerBackground, backAlpha, backColorNoAlpha);
		Z.RulerDisplay.appendChild(rulerBackground);
		rB = rulerBackground;
		rbS = rB.style;

		// Create scale bar.
		var scaleBarColor = Z.Utils.getResource('DEFAULT_SCALEBARCOLOR');
		var rulerScaleBar = Z.Utils.createContainerElement('div', 'rulerScaleBar', 'inline-block', 'absolute', 'hidden', '1px', '1px', '0px', '0px', 'none', '0px', scaleBarColor, '0px', '0px', 'normal', null, true);
		Z.RulerDisplay.appendChild(rulerScaleBar);
		rSB = rulerScaleBar;
		rsbS = rSB.style;
		
		// Ensure ruler is in front of hotspots in viewport.
		var uiElementsBaseZIndex = parseInt(Z.Utils.getResource('DEFAULT_UIELEMENTBASEZINDEX'), 10);
		rsbS.zIndex = (uiElementsBaseZIndex + 3).toString();
		
		var rulerScaleBarNotchL = Z.Utils.createContainerElement('div', 'rulerScaleBarNotchL', 'inline-block', 'absolute', 'hidden', '1px', '1px', '0px', '0px', 'none', '0px', scaleBarColor, '0px', '0px', 'normal', null, true);
		Z.RulerDisplay.appendChild(rulerScaleBarNotchL);
		rSBNL = rulerScaleBarNotchL;
		rsbnlS = rSBNL.style;
		var rulerScaleBarNotchR = Z.Utils.createContainerElement('div', 'rulerScaleBarNotchR', 'inline-block', 'absolute', 'hidden', '1px', '1px', '0px', '0px', 'none', '0px', scaleBarColor, '0px', '0px', 'normal', null, true);
		Z.RulerDisplay.appendChild(rulerScaleBarNotchR);
		rSBNR = rulerScaleBarNotchR;
		rsbnrS = rSBNR.style;

		// Create scale bar text elements.
		var labelFontSize = parseInt(Z.Utils.getResource('DEFAULT_RULERTEXTFONTSIZE'), 10);
		var errorTextBox = Z.Utils.createContainerElement('div', 'errorTextBox', 'inline-block', 'absolute', 'hidden', '1px', '1px', '0px', '0px', 'none', '0px', 'transparent none', '0px', '0px', 'nowrap', null, true);
		var errorTextNode = document.createTextNode('');
		errorTextBox.appendChild(errorTextNode);
		Z.Utils.setTextNodeStyle(errorTextNode, 'black', 'verdana', labelFontSize + 'px', 'none', 'normal', 'normal', 'normal', 'normal', '1em', 'center', 'none');
		Z.RulerDisplay.appendChild(errorTextBox);
		eTB = errorTextBox;
		etbS = eTB.style;
		var scaleTextBox = Z.Utils.createContainerElement('div', 'scaleTextBox', 'inline-block', 'absolute', 'hidden', '1px', '1px', '0px', '0px', 'none', '0px', 'transparent none', '0px', '0px', 'nowrap', null, true);
		var scaleTextNode = document.createTextNode('');
		scaleTextBox.appendChild(scaleTextNode);
		Z.Utils.setTextNodeStyle(scaleTextNode, 'black', 'verdana', labelFontSize + 'px', 'none', 'normal', 'normal', 'normal', 'normal', '1em', 'right', 'none');
		Z.RulerDisplay.appendChild(scaleTextBox);
		sTB = scaleTextBox;
		stbS = sTB.style;
		var unitTextBox = Z.Utils.createContainerElement('div', 'unitTextBox', 'inline-block', 'absolute', 'hidden', '1px', '1px', '0px', '0px', 'none', '0px', 'transparent none', '0px', '0px', 'nowrap', null, true);
		var unitTextNode = document.createTextNode('');
		unitTextBox.appendChild(unitTextNode);
		Z.Utils.setTextNodeStyle(unitTextNode, 'black', 'verdana', labelFontSize + 'px', 'none', 'normal', 'normal', 'normal', 'normal', '1em', 'left', 'none');
		Z.RulerDisplay.appendChild(unitTextBox);
		uTB = unitTextBox;
		utbS = uTB.style;

		// Create magnitude choicelist object from resourced data.
		if (Z.rulerListType != 0) {
			populateMagnificationsArray();
			magnificationList = new Z.Utils.createSelectElement('magnificationList', '', magnificationListDP, 1, 1, 1, null, true, magnificationListChangeHandler, 'change');
			Z.RulerDisplay.appendChild(magnificationList);
			mL = magnificationList;
			mlS = mL.style;
			validateMagnificationList();
		}

		// Create ruler data elements and configure.
		populateUnitsArray();
		drawLayout();

		// Add ruler to viewer display and set size, position, visibility, and zIndex.
		Z.ViewerDisplay.appendChild(Z.RulerDisplay);
		visibility(Z.rulerVisible);

		// Enable mouse, initialize ruler, sync to viewport.
		// Prevent object dragging and bubbling.
		// DEV NOTE: Do note use next line to block panel selection because blocks choicelist use.
		//Z.Utils.addEventListener(rD, 'mousedown', Z.Utils.preventDefault);
		Z.Utils.addEventListener(rD, 'mouseover', Z.Utils.stopPropagation)
				
		setInitialized(true);
		syncToViewport(true);
	}

	function populateUnitsArray () {
		unitsArray = [
			{ magnitude:Math.pow(10,24), symbol:'Ym' },
			{ magnitude:Math.pow(10,21), symbol:'Zm' },
			{ magnitude:Math.pow(10,18), symbol:'Em' },
			{ magnitude:Math.pow(10,15), symbol:'Pm' },
			{ magnitude:Math.pow(10,12), symbol:'Tm' },
			{ magnitude:Math.pow(10,9), symbol:'Gm' },
			{ magnitude:Math.pow(10,6), symbol:'Mm' },
			{ magnitude:Math.pow(10,3), symbol:'km' },
			{ magnitude:Math.pow(10,2), symbol:'hm' },
			{ magnitude:Math.pow(10,1), symbol:'dam' },
			{ magnitude:Math.pow(10,0), symbol:'m' },
			{ magnitude:Math.pow(10,-1), symbol:'dm' },
			{ magnitude:Math.pow(10,-2), symbol:'cm' },
			{ magnitude:Math.pow(10,-3), symbol:'mm' },
			{ magnitude:Math.pow(10,-6), symbol:'um' },
			{ magnitude:Math.pow(10,-9), symbol:'nm' },
			{ magnitude:Math.pow(10,-12), symbol:'pm' },
			{ magnitude:Math.pow(10,-15), symbol:'fm' },
			{ magnitude:Math.pow(10,-18), symbol:'am' },
			{ magnitude:Math.pow(10,-21), symbol:'zm' },
			{ magnitude:Math.pow(10,-24), symbol:'ym' },
			{ magnitude:Math.pow(10,-24), symbol:'pixels' }
		];
	}

	function populateMagnificationsArray () {
		if (Z.rulerListType == 1 && sourceMagnification != 0) {
			magnificationListDP = [
				{ text:'2.5x', value:2.5 },
				{ text:'5x', value:5 },
				{ text:'10x', value:10 },
				{ text:'20x', value:20 },
				{ text:'40x', value:40 },
				{ text:'60x', value:60 },
				{ text:'100x', value:100 }
			];
		} else {
			magnificationListDP = [
				{ text:'10%', value:10 },
				{ text:'20%', value:20 },
				{ text:'30%', value:30 },
				{ text:'40%', value:40 },
				{ text:'50%', value:50 },
				{ text:'60%', value:60 },
				{ text:'70%', value:70 },
				{ text:'80%', value:80 },
				{ text:'90%', value:90 },
				{ text:'100%', value:100 }
			];
		}
	}

	function validateMagnificationList () {
		var minZoom = Z.minZ * 100;
		var maxZoom = Z.maxZ * 100;
		var minZoomRounded = Math.round(minZoom);
		var maxZoomRounded = Math.round(maxZoom);
		var magSymbol = '%';
		var approxSymbol;

		// Remove beginning data array items less than min zoom.
		if (minZoom == -1) { minZoom = Math.round(rulerViewport.calcZoomDecimalToFitDisplay() * 100); }
		if (Z.rulerListType == 1 && sourceMagnification != 0) {
			minZoom = convertPercentToMagZoom(minZoom, sourceMagnification);
			minZoomRounded = Math.round(minZoom);
			magSymbol = 'x';
		}
		while(magnificationListDP[0].value <= minZoomRounded) {
			magnificationListDP = Z.Utils.arraySplice(magnificationListDP, 0, 1);
		}

		// Remove ending data array items greater than max zoom.
		if (maxZoom == -1) { maxZoom = Math.round(rulerViewport.calcZoomDecimalToFitDisplay() * 100); }
		if (Z.rulerListType == 1 && sourceMagnification != 0) {
			maxZoom = convertPercentToMagZoom(maxZoom, sourceMagnification);
			maxZoomRounded = Math.round(maxZoom);
			magSymbol = 'x';
		}
		while(magnificationListDP[magnificationListDP.length - 1].value >= maxZoomRounded) {
			magnificationListDP = Z.Utils.arraySplice(magnificationListDP, magnificationListDP.length - 1, 1);
		}

		// Add beginning data array item with min zoom value, rounded if necessary.
		approxSymbol = (minZoomRounded == minZoom) ? '' : '~';
		magnificationListDP = Z.Utils.arraySplice(magnificationListDP, 0, 0, { text:minZoomRounded.toString() + magSymbol + approxSymbol + minText, value:minZoomRounded } );
		
		// Add ending data array item with max zoom value, rounded if necessary.
		approxSymbol = (maxZoomRounded == maxZoom) ? '' : '~';
		magnificationListDP[magnificationListDP.length] = { text:maxZoomRounded.toString() + magSymbol + approxSymbol + maxText, value:maxZoom };

		// Update choicelist with updated data.
		Z.Utils.updateSelectElement(mL, magnificationListDP);
		mL.selectedIndex = 0;
	}

	function drawLayout () {
		var width = Z.rulerW;
		var height = Z.rulerH;
		var left = (Z.rulerL == -1 && Z.Navigator) ? Z.navigatorL : Z.rulerL;
		var top = (Z.rulerT == -1 && Z.Navigator) ? (Z.navigatorT + Z.navigatorH + 1) : Z.rulerT;
		var listW = 53;
		var listH = 20;
		var scaleBarVisible = (Z.rulerListType != 0);
		scaleBarW = (scaleBarVisible) ? (width - listW - 16) : (width - 10);
		var scaleBarH = 1;
		var scaleBarNotchH = 6;
		var scaleBarL = 5;
		var scaleBarT = (height - scaleBarH + 5) / 2;
		var textW = scaleBarW / 2 - 5;
		var textH = 15;
		var textL = scaleBarL + 10;
		var textT = scaleBarT - 10;
		var pixUnitMod = (Z.units == 'pixels') ? 7 : 0;

		if (rbS && rsbS && rsbnlS && rsbnrS && eTB && etbS && sTB && stbS && uTB && utbS) {
			setSizeAndPosition(width, height, left, top);
	
			rbS.width = width + 'px';
			rbS.height = height + 'px';
			rbS.left = '0px';
			rbS.top = '0px';
			if (mlS) {
				mlS.width = listW + 'px';
				mlS.left = (width - listW -  3) + 'px';
				mlS.top = ((height  - listH) / 2) + 'px';
				mlS.visibility = 'visible';
			}

			rsbS.width = scaleBarW + 'px';
			rsbS.height = scaleBarH + 'px';
			rsbS.left = scaleBarL + 'px'
			rsbS.top = scaleBarT + 3 + 'px';
			rsbnlS.width = 1 + 'px';
			rsbnlS.height = scaleBarNotchH + 'px';
			rsbnlS.left = scaleBarL + 'px'
			rsbnlS.top = scaleBarT + 'px';
			rsbnrS.width = 1 + 'px';
			rsbnrS.height = scaleBarNotchH + 'px';
			rsbnrS.left = scaleBarL + scaleBarW + 'px'
			rsbnrS.top = scaleBarT + 'px';

			etbS.width = scaleBarW + 'px';
			etbS.height = textH + 'px';
			etbS.left = textL - 3 + 'px';
			etbS.top = textT + 'px';
			stbS.width = textW + 'px';
			stbS.height = textH + 'px';
			stbS.left = textL - pixUnitMod + 'px';
			stbS.top = textT + 'px';
			utbS.width = textW + 'px';
			utbS.height = textH + 'px';
			utbS.left = scaleBarW / 2 + 15 - pixUnitMod + 'px';
			utbS.top = textT + 'px';
		}
	}



	//::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::
	//:::::::::::::::::::::::::::::::::: GET & SET FUNCTIONS ::::::::::::::::::::::::::::::::
	//::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::

	this.getInitialized = function () {
		return getInitialized();
	}

	function getInitialized () {
		return isInitialized;
	}

	function setInitialized (initialized) {
		if (!isInitialized && initialized) {
			isInitialized = true;
			Z.Utils.validateCallback('rulerInitialized');
			Z.Viewer.validateViewerReady('rulerInitialized');
		}
	}

	this.setVisibility = function (visible) {
		visibility(visible);
	}
	
	// DEV NOTE: dual setSizeAndPosition functions below are workaround for undefined error on load 
	// due to unhoisted function expression vs hoisted function declaration and/or IE8 limitations.
	this.setSizeAndPosition = function (panel, width, height, left, top) {
		setSizeAndPosition(panel, width, height, left, top);
	}
	
	function setSizeAndPosition (width, height, left, top) {
		if (typeof width === 'undefined' || width === null) { var width = Z.rulerW; }
		if (typeof height === 'undefined' || height !== null) { var height = Z.rulerH; }
		if (typeof left === 'undefined' || left !== null) { left = (Z.rulerL == -1 && Z.Navigator) ? Z.navigatorL : Z.rulerL; }
		if (typeof top === 'undefined' || top !== null) { top = (Z.rulerT == -1 && Z.Navigator) ? (Z.navigatorT + Z.navigatorH + 1) : Z.rulerT; }
		rdS.width = width + 'px';
		rdS.height = height + 'px';
		rdS.left = left + 'px';
		rdS.top = top + 'px';
	}

	this.syncToViewport = function (reset) {
		syncToViewport(reset);
	}


	//:::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::
	//:::::::::::::::::::::::::::::::::: CORE FUNCTIONS :::::::::::::::::::::::::::::::::
	//:::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::

	function visibility (visible) {
		if (!rdS) { rdS = Z.RulerDisplay.style; }
		if (rdS) {
			if (visible) {
				rdS.display = 'inline-block';
			} else {
				rdS.display = 'none';
			}
		}
	}

	// Set ruler scale bar and magnification list.
	function syncToViewport (reset) {
		if (rulerViewport && rulerViewport.getStatus('initialized')) {
			setScaleBar();
			setMagnificationList(reset);
		}
	}

	function setScaleBar () {
		var zoom = rulerViewport.getZoom();
		var digits = (Z.units == 'pixels') ? 0 : 4;

		if (mlS) {
			mlS.visibility = 'visible';
			var magnification;
			if (sourceMagnification !=  0) {
				magnification = sourceMagnification * zoom;
			} else {
				magnification = 100 * zoom;
			}
			if (magnification < 1) {
				magnification = Math.round(magnification * 100) / 100;
			} else {
				magnification = Math.round(magnification);
			}
		}

		for (var i = 0, j = unitsArray.length; i < j; i++) {
			if (unitsArray[i].symbol == Z.units) { unitsIndex = i; }
		}

		if (pixelsPerUnit !== null && pixelsPerUnit != 0) {
			actualPixelsPerUnit = pixelsPerUnit;
		} else if (unitsPerImage !== null && unitsPerImage != 0) {
			actualPixelsPerUnit = Z.imageW / unitsPerImage;
		} else {
			actualPixelsPerUnit = 1;
			// DEV NOTE: Alternative implementation - if no units param show error.
			/* eTB.firstChild.nodeValue = noParamsText;
			stbS.visibility = 'hidden';
			utbS.visibility = 'hidden';
			return; */
		}

		var pixelsPerScaleBar = scaleBarW;
		var unitsPerScaleBar = pixelsPerScaleBar / actualPixelsPerUnit;
		var unitsPerScaleBarAtCurrentZoom = unitsPerScaleBar / zoom;
		var unitsPerScaleBarRounded = Z.Utils.roundToFixed(unitsPerScaleBarAtCurrentZoom, digits);
		sTB.firstChild.nodeValue = unitsPerScaleBarRounded.toString();

		utbS.visibility = 'visible';
		if (unitsArray[unitsIndex].symbol != 'um') {
			uTB.firstChild.nodeValue = unitsArray[unitsIndex].symbol;
		} else {
			uTB.firstChild.nodeValue = '\u03BC' + 'm'; // Unicode representation for lowercase mu symbol ('µ').
		}
	}

	function setMagnificationList (reset) {
		if (mlS) {
			var newMag = Math.round(rulerViewport.getZoom() * 100);
			var newMagRounded = Math.round(newMag);
			var magSymbol = '%';				
			var approxSymbol = (Math.round(rulerViewport.getZoom() * 100) == Math.round(rulerViewport.getZoom() * 1000) / 1000 * 100) ? '' : '~';
			if (Z.rulerListType == 1 && sourceMagnification != 0) {
				newMag = convertPercentToMagZoom(rulerViewport.getZoom() * 100, sourceMagnification);
				newMagRounded = Math.round(newMag);
				magSymbol = 'x';
			}
			var listTitle = newMagRounded.toString() + magSymbol + approxSymbol;
			if (!reset) {
				mL.options[0] = new Option(listTitle, newMagRounded.toString());
				mL.selectedIndex = 0;
			} else {
				var i = insertIndex = 0;
				while(newMagRounded > magnificationListDP[i].value) {
					i++;
					insertIndex = i;
				}
				if (newMagRounded == magnificationListDP[insertIndex].value) {
					Z.Utils.updateSelectElement(mL, magnificationListDP);
				} else {
					var tempArray = Z.Utils.arrayClone('magnifications', magnificationListDP, tempArray);
					tempArray = Z.Utils.arraySplice(tempArray, insertIndex, 0, { text:listTitle, value:newMagRounded.toString() } );
					Z.Utils.updateSelectElement(mL, tempArray);
				}
				mL.selectedIndex = insertIndex;
			}
		}
	}

	function convertPercentToMagZoom (percent, srcMag) {
		var newMagnification = percent * srcMag / 100;
		return newMagnification;
	}



	//:::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::
	//:::::::::::::::::::::::::::::::::::: EVENT HANDLERS ::::::::::::::::::::::::::::::::::
	//:::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::
	
	function magnificationListChangeHandler (event) {
		var selectedMag = 0;
		var event = Z.Utils.event(event);
		if (event) {
			var target = Z.Utils.target(event);
			selectedMag = parseInt(target.options[target.selectedIndex].value, 10);
		
			if (!isNaN(selectedMag)) {
				var newZoom;
				if (Z.rulerListType == 1) {
					newZoom = 100 * selectedMag / sourceMagnification;
				} else {
					newZoom = selectedMag;
				}
				rulerViewport.zoomAndPanToView(rulerViewport.viewX, rulerViewport.viewY, newZoom / 100);
			}
		}
	}
};



//::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::
//::::::::::::::::::::::::::::: NETCONNECTOR FUNCTIONS ::::::::::::::::::::::::::::::::
//::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::

Z.NetConnector = function () {
	var errorDuration = parseInt(Z.Utils.getResource('ERROR_MESSAGEDURATION'), 10);
	var errorDurationMedium = parseInt(Z.Utils.getResource('ERROR_MESSAGEDURATIONMEDIUM'), 10);
	var imagesLoading = 0;
	var IMAGES_LOADING_MAX = parseInt(Z.Utils.getResource('DEFAULT_IMAGESLOADINGMAX'), 10);
	var IMAGE_LOAD_TIMEOUT = parseFloat(Z.Utils.getResource('DEFAULT_IMAGELOADTIMEOUT'));
	var loadImageQueueDelay = Z.Utils.getResource('DEFAULT_IMAGELOADQUEUEDELAY');
	var loadImageQueueInterval;		
	var loadImageQueue = [];
	
	this.loadXML = function (xmlPath, vpID) {
		if (typeof vpID === "undefined" || vpID === null) {
			makeNetRequest(xmlPath, receiveResponse, null);
		} else {
			makeNetRequest(xmlPath, function(xhr) { receiveResponse(xhr, vpID); }, null);
		}
	}
	
	this.loadByteRange = function (filePath, rangeStart, rangeEnd, contentType, tile, chunkID) {
		var rangeData = new Z.Utils.Range(rangeStart, rangeEnd);
		makeNetRequest(filePath, receiveResponse, rangeData, contentType, tile, chunkID);
	}

	function loadImageByteRange (filePath, contentType, tile) {
		var imagePath = filePath.substring(0, filePath.indexOf('?'));
		var rangeStart = parseFloat(filePath.substring(filePath.indexOf('?') + 1, filePath.indexOf(',')));
		var rangeLength = parseFloat(filePath.substring(filePath.indexOf(',') + 1, filePath.length));
		var rangeEnd = rangeStart + rangeLength;
		var rangeData = new Z.Utils.Range(rangeStart, rangeEnd);
		makeNetRequest(imagePath, receiveResponse, rangeData, contentType, tile);
	}	

	function makeNetRequest (url, callback, data, contentType, tile, chunkN) {
		var netRequest = createXMLHttpRequest();
		if (netRequest) {
			var isAsync = (typeof callback === 'function');
			if (isAsync) {
				var actual = callback;
				var callback = function () { window.setTimeout(Z.Utils.createCallback(null, actual, netRequest), 1); };
				netRequest.onreadystatechange = function () {
					if (netRequest.readyState == 4) {
						netRequest.onreadystatechange = new Function ();
						callback();
					}
				};
			}
		
			try {
				if (typeof data === 'undefined' || data === null) {
					netRequest.open('GET', url, isAsync);
					netRequest.send(null);
					
				} else if (typeof contentType !== 'undefined' && contentType !== null) { 
					
					if (Z.tileSource == 'ZoomifyImageFile') {
								
						// Cache proofing applied here on all byterange requests for header and chunks but not tiles. This approach
						// supports consistency and avoids duplicate applications. These are non-XML, non-posting, non-PFF requests.
						// Note that byte range start and end values are in imagePath until function loadImageByteRange parses them
						// and passes them to this function as data parameter, leaving url parameter clean for cache proofing.
						if (contentType != 'tile') { url = Z.Utils.cacheProofPath(url); }
						netRequest.open('GET', url, true);
						netRequest.responseType = 'arraybuffer';
						
						// Include contentType, tile, and chunk number values to be returned in response.
						Z.Utils.defineObjectProperty(netRequest, 'zType', { value : contentType, writable : false, enumerable : false, configurable : false });
						Z.Utils.defineObjectProperty(netRequest, 'zTile', { value : tile, writable : false, enumerable : false, configurable : false });
						Z.Utils.defineObjectProperty(netRequest, 'zChunkNumber', { value : chunkN, writable : false, enumerable : false, configurable : false });
							
						// Prevent Safari byte range request response caching.
						if (Z.browser == Z.browsers.SAFARI) {
							netRequest.setRequestHeader('If-Modified-Since', 'Thu, 01 Dec 1994 16:00:00 GMT');
						}
						
						// Set range header and send request.						
						netRequest.setRequestHeader('Range', 'bytes=' + data.start.toString() + '-' + data.end.toString());
						netRequest.send(null);
					}
				}
				
			} catch (e) {
				netRequestErrorHandler(e, url, contentType);
				netRequest = null;
				console.log(e);
				
				// if (isAsync) { callback(); } // Debug option.
			}
		} else {
			Z.Utils.showMessage(Z.Utils.getResource('ERROR_XMLHTTPREQUESTUNSUPPORTED'));
		}
	}

	function createXMLHttpRequest () {
		var netReq = null;
		switch (Z.xmlHttpRequestSupport) {
			case 'XMLHttpRequest' :
				netReq = new XMLHttpRequest();
				break;
			case 'Msxml2.XMLHTTP.6.0' :
				netReq = new ActiveXObject('Msxml2.XMLHTTP.6.0');
				break;
			case 'Msxml2.XMLHTTP.3.0' :
				netReq = new ActiveXObject('Msxml2.XMLHTTP.3.0');
				break;
			case 'Microsoft.XMLHTTP' :
				netReq = new ActiveXObject('Microsoft.XMLHTTP');
				break;
		}		
		return netReq;
	}
	
	// This error handler is applied within the function makeNetRequest in two ways for two different purposes:
	// first, as an onerror method which handles errors in the response to file requests, and second in the outer
	// try/catch statement, which handles errors in the creation of the netRequest calls themselves. Additional error 
	// handling occurs in the function receiveResponse, where 404 and other server responses are handled.
	function netRequestErrorHandler (e, url, contentType) {
		if (Z.localUse == true && (Z.browser == Z.browsers.CHROME  || Z.browser == Z.browsers.OPERA || (Z.browser == Z.browsers.IE && Z.browserVersion == 11) || (Z.browser == Z.browsers.SAFARI && Z.browserVersion >= 7))) {
			Z.Utils.showMessage(Z.Utils.getResource('ERROR_UNSUPPORTEDLOCALVIEWING-BROWSER'), true);
		} else if (Z.localUse == true && Z.tileSource == 'ZoomifyImageFile') { 
			Z.Utils.showMessage(Z.Utils.getResource('ERROR_UNSUPPORTEDLOCALVIEWING-FORMAT-ZIF'), true);
		} else if (url.toLowerCase().indexOf('.zif') != -1) {
			Z.Utils.showMessage(Z.Utils.getResource('ERROR_MAKINGNETWORKREQUEST-ZIFBYTERANGE') + contentType + '.', false, errorDurationMedium, 'center');
		} else if (url.indexOf('ImageProperties.xml') != -1) {
			Z.Utils.showMessage(Z.Utils.getResource('ERROR_MAKINGNETWORKREQUEST-IMAGEXML'), true, null, 'left');
		} else if (url.toLowerCase().indexOf('reply_data') != -1) {
			Z.Utils.showMessage(Z.Utils.getResource('ERROR_MAKINGNETWORKREQUEST-IMAGEOFFSET'), false, errorDurationMedium, 'center');
		} else if (url.indexOf(Z.Utils.getResource('DEFAULT_SKINXMLFILE')) != -1) {
			Z.Utils.showMessage(Z.Utils.getResource('ERROR_MAKINGNETWORKREQUEST-TOOLBARSKINSXML'), true, null, 'left');
		} else if (url.indexOf(Z.Utils.getResource('DEFAULT_SLIDESXMLFILE')) != -1) {
			Z.Utils.showMessage(Z.Utils.getResource('ERROR_MAKINGNETWORKREQUEST-SLIDESXML'), false, errorDuration, 'center');
		} else if (url.indexOf(Z.Utils.getResource('DEFAULT_HOTSPOTSXMLFILE')) != -1) {
			Z.Utils.showMessage(Z.Utils.getResource('ERROR_MAKINGNETWORKREQUEST-HOTSPOTSXML'), false, errorDuration, 'center');
		} else {
			Z.Utils.showMessage(Z.Utils.getResource('ERROR_MAKINGNETWORKREQUEST'), false, errorDuration, 'center');
		}
	}

	// DEV NOTE: The conditionals in the clause below for the xhr.status values of 200/0/206 are timing dependent and therefore not optimal. They are necessary because
	// the onerror function assigned to the XMLHttpRequest in the function makeNetRequest above will fire on a failure at the network level, not the application level. A 404 
	// file not found error is a valid network response so the test must occur here in the onreadystatechange handler. However, here, the url for the request is not known.  
	// Note that the onerror can fire in Firefox for a local attempt with a 404 response. Note also that debugger consoles will show the requested url with a 404 response due 
	// to privledged access. Future implementation may include a wrapper for the XMLHttpRequest request object that records the url.
	function receiveResponse (xhr, vpID) {
		if (!xhr) {
			Z.Utils.showMessage(Z.Utils.getResource('ERROR_NETWORKSECURITY'), false, errorDuration, 'center');
		} else if (xhr.status !== 200 && xhr.status !== 0 && xhr.status !== 206) {
			var status = xhr.status;
			var statusText = (status == 404) ? 'Not Found' : xhr.statusText;
			if (Z.Toolbar && !Z.Toolbar.getInitialized()) {
				Z.Utils.showMessage(Z.Utils.getResource('ERROR_MAKINGNETWORKREQUEST-TOOLBARSKINSXML'), true, null, 'left');
			} else if (Z.tileSource == 'ZoomifyImageFile') {
				Z.Utils.showMessage(Z.Utils.getResource('ERROR_NETWORKSTATUSRANGEREQUESTS') + status + ' - ' + statusText, true, null, 'left');
			} else {
				Z.Utils.showMessage(Z.Utils.getResource('ERROR_NETWORKSTATUS') + status + ' - ' + statusText, false, errorDuration, 'center');
			}
			
		} else {		
			var doc = null;			
			var annotPathHasJSONExtension = (Z.annotationPath !== null && Z.annotationPath.toLowerCase().substring(Z.annotationPath.length - 5, Z.annotationPath.length) == '.json');
			if (xhr.response && xhr.zType && Z.tileSource == 'ZoomifyImageFile') {
				validateBytes(xhr, vpID);
			} else if (xhr.responseXML && xhr.responseXML.documentElement && !annotPathHasJSONExtension) {
				doc = xhr.responseXML;
				validateXML(doc, vpID);
			} else if (xhr.responseText) {
				var respText = xhr.responseText;
				if (Z.tileSource == 'ZoomifyImageFolder') {
					// Fallback for annotations XML incorrectly sent as Content Type  as text/html rather than  as text/xml.
					doc = Z.Utils.xmlConvertTextToDoc(respText);
					validateXML(doc, vpID);
				} else if (Z.tileSource == 'ZoomifyImageFile') {
					// Fallback for annotations XML incorrectly sent as Content Type  as text/html rather than  as text/xml.
					doc = Z.Utils.xmlConvertTextToDoc(respText);
					validateXML(doc, vpID);		
				}
			}
		}
	}

	function validateBytes (xhr, vpID) {
		if (Z.Viewport) {
			var data = new Z.Utils.createUint8Array(xhr.response, 0);			
			if (xhr.zType == 'header') {
				if (typeof vpID === "undefined" || vpID === null) {
					Z.Viewport.parseZIFHeader(data);
				} else {
					for (var i = 0, j = Z.imageSetLength; i < j; i++) {
						if (vpID == i) { Z['Viewport' + i.toString()].parseZIFHeader(data); }
					}
				}				
			} else if (xhr.zType == 'offset') {
				if (typeof vpID === "undefined" || vpID === null) {
					Z.Viewport.parseZIFOffsetChunk(data, xhr.zChunkNumber);
				} else {
					for (var i = 0, j = Z.imageSetLength; i < j; i++) {
						if (vpID == i) { Z['Viewport' + i.toString()].parseZIFOffsetChunk(data, xhr.zChunkNumber); }
					}
				}
			} else if (xhr.zType == 'byteCount') {
				if (typeof vpID === "undefined" || vpID === null) {
					Z.Viewport.parseZIFByteCountChunk(data, xhr.zChunkNumber);
				} else {
					for (var i = 0, j = Z.imageSetLength; i < j; i++) {
						if (vpID == i) { Z['Viewport' + i.toString()].parseZIFByteCountChunk(data, xhr.zChunkNumber); }
					}
				}
			} else if (xhr.zType.substring(0,5) == 'image') {
				imagesLoading--;
				Z.Viewport.parseZIFImage(data, xhr.zTile, xhr.zType);
			} else if (xhr.zType == 'navigator') {
				if (typeof vpID === "undefined" || vpID === null) {
					Z.viewportCurrent.parseZIFImage(data, xhr.zTile, xhr.zType);
				} else {
					for (var i = 0, j = Z.imageSetLength; i < j; i++) {
						if (vpID == i) { Z['Viewport' + i.toString()].parseZIFImage(data, xhr.zTile, xhr.zType); }
					}
				}
			} else {
				Z.Utils.showMessage(Z.Utils.getResource('ERROR_MAKINGNETWORKREQUEST-ZIFBYTES'), false, errorDurationMedium, 'center');
			}
		}
	}

	function validateXML (xmlDoc, vpID) {
		if (xmlDoc && xmlDoc.documentElement) {
			var rootName = xmlDoc.documentElement.tagName;
			if (rootName == 'COPYRIGHT') {
				// Get text for copyright display.
				var cStatementText = xmlDoc.documentElement.getAttribute('STATEMENTTEXT');
				var cDeclinedText = xmlDoc.documentElement.getAttribute('DECLINEDTEXT');
				if (Z.Utils.stringValidate(cStatementText)) {
					Z.Utils.showCopyright(cStatementText, cDeclinedText);
				} else {
					Z.Utils.showMessage(Z.Utils.getResource('ERROR_IMAGEXMLINVALID'), true);
				}
			} else if ((rootName == 'IMAGE_PROPERTIES') || (rootName == 'ZIFHEADER')) {
				// Pass received image properties XML from file, folder, or other tilesource back to Viewer to reenter image loading process.
				if ((Z.tileSource == 'ZoomifyImageFile') || (Z.tileSource == 'ZoomifyImageFolder')) {
					if (Z.imagePath != "multiple") {
						if (Z.Viewport) { Z.Viewport.parseImageXML(xmlDoc); }
					} else {
						for (var i = 0, j = Z.imageSetLength; i < j; i++) {
							if (vpID == i) { Z['Viewport' + i.toString()].parseImageXML(xmlDoc); }
						}
					}

					// Debug option: Offset a viewport's position relative to others see it more easily.
					//if (vpID == 0) { Z.Viewport0.setSizeAndPosition(900, 550, 150, 0); }
				}
			} else if (rootName == 'SKINDATA') {
				// Pass received chunk offset data back to Viewer to reenter tile loading process.
				if (Z.Toolbar) { Z.Toolbar.parseSkinXML(xmlDoc); }
			} else if (rootName == 'SLIDEDATA') {
				// Pass received slides XML back to Viewer to reenter slide loading process.
				if (Z.Viewport) { Z.Viewport.parseSlidesXML(xmlDoc); }
			} else if (rootName == 'HOTSPOTDATA') {
				// Pass received hotspot XML back to Viewer to reenter hotspot loading process.
				if (typeof vpID === "undefined" || vpID === null) {
					if (Z.Viewport) { Z.Viewport.parseHotspotsXML(xmlDoc); }
				} else {
					for (var i = 0, j = Z.imageSetLength; i < j; i++) {
						if (vpID == i) { Z['Viewport' + i.toString()].parseHotspotsXML(xmlDoc); }
					}
				}
			} else if (rootName == "ANIMATIONDATA") {
				// Pass received image set XML back to Viewer to reenter image set loading process.
				if (Z.Viewer) { Z.Viewer.parseImageSetXML(xmlDoc, 'animation'); }
			} else {
				Z.Utils.showMessage(Z.Utils.getResource('ERROR_XMLINVALID'), true);
			}
		} else {
			Z.Utils.showMessage(Z.Utils.getResource('ERROR_XMLDOCINVALID'), true);
		}
	}

	this.loadImage = function (src, callback, contentType, tile) {
		loadImage(src, callback, contentType, tile);
	}
	
	function loadImage (src, callback, contentType, tile) {
		if (imagesLoading < IMAGES_LOADING_MAX) {
			imagesLoading++;
			if (Z.tileSource == 'ZoomifyImageFile' && ((typeof tile !== 'undefined' && tile !== null) || contentType == 'navigator')) {
				loadImageByteRange(src, contentType, tile);
			} else {
				var func = Z.Utils.createCallback(null, onComplete, callback);
				var imageNetRequest = new ImageNetRequest(src, func, contentType);
				imageNetRequest.start();
			}
			return true;
			
		} else {
			var index = Z.Utils.arrayIndexOfObjectValue(loadImageQueue, 'sc', src);
			if (index == -1) { 
				loadImageQueue[loadImageQueue.length] = { sc:src, cb:callback, ct:contentType, t:tile };
				// Debug option: console.log('Adding to queue: ' + tile.name + '  Queue length: ' + loadImageQueue.length);
				if (!loadImageQueueInterval) {
					loadImageQueueInterval = window.setInterval( function() { loadImagesFromQueue(); }, loadImageQueueDelay);
				}
			}
			return false;
		}
	}
	
	function loadImagesFromQueue () {
		var qNext = loadImageQueue[0];
		var loadingImage = loadImage(qNext.sc, qNext.cb, qNext.ct, qNext.t);
		if (loadingImage) { loadImageQueue = Z.Utils.arraySplice(loadImageQueue, 0, 1); }
		if (loadImageQueue.length == 0 && loadImageQueueInterval) {
			window.clearInterval(loadImageQueueInterval);
			loadImageQueueInterval = null;
		}
	}

	function onComplete (callback, src, img) {
		imagesLoading--;
		if (typeof callback === 'function') {
			try {
				callback(img);
			} catch (e) {
				Z.Utils.showMessage(e.name + Z.Utils.getResource('ERROR_EXECUTINGCALLBACK') + src + ' ' + e.message, true);
			}
		}
	}

	function ImageNetRequest (src, callback, contentType) {
		var image = null;
		var timeout = null;
		this.start = function () {
			image = new Image();
			var successFunction = function () { complete(true); };
			var errorFunction = function () { complete(false); };

			var timeoutFunc = function () {
				// Debug option: Append source data to error message below: + ': ' + src);			
				console.log(Z.Utils.getResource('ERROR_IMAGEREQUESTTIMEDOUT')); // Options for showMessage:, false, errorDurationMedium, 'center');
				complete(false);
				
				Z.Viewport.traceDebugValues('imageRequestTimeout', contentType + ' timeout: ' + src);
			};

			image.onload = successFunction;
			image.onabort = errorFunction;
			image.onerror = errorFunction;
			timeout = window.setTimeout(timeoutFunc, IMAGE_LOAD_TIMEOUT);
			image.src = src;
		};

		function complete (result) {
			image.onload = null;
			image.onabort = null;
			image.onerror = null;
			if (timeout) { window.clearTimeout(timeout); }
			window.setTimeout(function () { callback(src, result ? image : null); }, 1);
		};
	}
};



//::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::
//:::::::::::::::::::::::::::::::::::: UTILITY FUNCTIONS :::::::::::::::::::::::::::::::::::
//::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::

Z.Utils = {

	addCrossBrowserMethods : function () {
		// Meta methods are used to ensure consistent functional support.  Specific browser
		// differences are managed within each event handler.
		if (document.addEventListener) {
			// Methods required for missing W3C DOM functionality

			this.disableTextInteraction = function (tN) {
				if (tN) {
					var tnS = tN.parentNode.style;
					if (tnS) {
						tN.parentNode.unselectable = 'on'; // For IE and Opera
						tnS.userSelect = 'none';
						tnS.MozUserSelect = 'none';
						tnS.webkitUserSelect = 'none';
						tnS.webkitTouchCallout = 'none';
						tnS.webkitTapHighlightColor = 'transparent';
					}
				}
			};

			this.renderQuality = function (image, quality) {
				if (quality) {
					var rndrQuality = (quality == 'high') ? 'optimizeQuality' : 'optimizeSpeed';
					image.style.setProperty ('image-rendering', rndrQuality, null);
				}
			};

			this.setOpacity = function (element, value, altColor) {
				if (Z.alphaSupported) {
					element.style.opacity=value;
				} else if (altColor) {
					element.style.backgroundColor = altColor;
				}
			};

		} else if (document.attachEvent) {
			// Methods required for missing Internet Explore functionality

			this.disableTextInteraction = function (tN) {
				if (tN) {
					tN.parentNode.unselectable = 'on';
					tN.parentNode.onselectstart = function () { return false; };
				}
			};

			this.renderQuality = function (image, quality) {
				if (quality) {
					var rndrQuality = (quality == 'high') ? 'bicubic' : 'nearest-neighbor';
					image.style.msInterpolationMode = rndrQuality;
				}
			};

			this.setOpacity = function (element, value, altColor) {
				if (Z.alphaSupported) {
					value *= 100; // IE uses range of 1 to 100 rather than 0.1 to 1.
					element.style.zoom = 1; // Workaround to enable alpha support for elements not positioned.
					element.style.filter = 'progid:DXImageTransform.Microsoft.Alpha(Opacity=' + value + ')'; // IE8
					element.style.filter = 'alpha(opacity=' + value + ')'; // IE7, 6

					// Next line is workaround for IE problem with overwriting right and bottom borders of div where
					// overflow is set to 'hidden' but content's filter is set to value=100 in the two filter lines above.
					if (value == 100) { element.style.filter = ''; }

				} else if (altColor) {
					element.style.backgroundColor = altColor;
				}
			};
		}
	},

	addCrossBrowserEvents : function () {
		// Meta events model is used only to ensure consistent event listener methods.
		// Specific browser differences are managed within each event handler.
		if (document.addEventListener) {
			// W3C DOM 2 Events model

			this.addEventListener = function (target, eventName, handler) {
				if (target) {
					if (eventName == 'mousewheel') { target.addEventListener('DOMMouseScroll', handler, false); }
					target.addEventListener(eventName, handler, false);
				}
			};

			this.removeEventListener = function (target, eventName, handler) {
				if (target) {
					if (eventName == 'mousewheel') { target.removeEventListener('DOMMouseScroll', handler, false); }
					target.removeEventListener(eventName, handler, false);
				}
			};

			this.event = function (event) {
				return event;
			};

			this.target =  function (event) {
				return event.target;
			};

			this.relatedTarget = function (event) {
				return event.relatedTarget;
			};

			this.isRightMouseButton = function (event) {
				var rightButton = false;
				if (event.which == 2 || event.which == 3) { rightButton = true; }
				return rightButton;
			};

			this.preventDefault = function (event) {
				event.preventDefault();
			};

			this.stopPropagation = function (event) {
				event.stopPropagation();
			};

		} else if (document.attachEvent) {
			// Internet Explorer Events model

			this.addEventListener = function (target, eventName, handler) {
				if (this._findListener(target, eventName, handler) != -1) return; // Prevent redundant listeners (DOM 2).
				var handler2 = function () {
					// IE version-specific listener (method of target, event object global)
					var event = window.event;
					if (Function.prototype.call) {
						handler.call(target, event);
					} else {
						target._currentListener = handler;
						target._currentListener(event)
						target._currentListener = null;
					}
				};
				target.attachEvent('on' + eventName, handler2);
				// Object supports cleanup
				var listenerRecord = {
					target: target,
					eventName: eventName,
					handler: handler,
					handler2: handler2
				};
				var targetDoc = target.document || target; // Get window object reference containing target.
				var targetWin = targetDoc.parentWindow;
				var listenerId = 'l' + this._listenerCounter++; // Create unique ID
				if (!targetWin._allListeners) { targetWin._allListeners = {}; } // Record listener in window object.
				targetWin._allListeners[listenerId] = listenerRecord;
				if (!target._listeners) { target._listeners = [];} // Record listener ID in target.
				target._listeners[target._listeners.length] = listenerId;
				if (!targetWin._unloadListenerAdded) {
					targetWin._unloadListenerAdded = true;
					targetWin.attachEvent('onunload', this._removeAllListeners); // Ensure listener cleanup on unload.
				}
			};

			this.removeEventListener = function (target, eventName, handler) {
				if (target) {
					var listenerIndex = this._findListener(target, eventName, handler); // Verify listener added to target.
					if (listenerIndex == -1) { return; }
					var targetDoc = target.document || target; // Get window object reference containing target.
					var targetWin = targetDoc.parentWindow;
					var listenerId = target._listeners[listenerIndex]; // Get listener in window object.
					var listenerRecord = targetWin._allListeners[listenerId];
					target.detachEvent('on' + eventName, listenerRecord.handler2); // Remove listener. Remove ID from target.
					target._listeners = Z.Utils.arraySplice(target._listeners, listenerIndex, 1);
					delete targetWin._allListeners[listenerId]; // Remove listener record from window object.
				}
			};

			this.event = function (event) {
				return window.event;
			};

			this.target =  function (event) {
				return event.srcElement;
			};

			this.relatedTarget = function (event) {
				var relTarg = null;
				if (event.type == 'mouseover') {
					relTarg = event.fromElement;
				} else if (event.type == 'mouseout') {
					relTarg = event.toElement;
				}
				return relTarg;
			};

			this.isRightMouseButton = function (event) {
				var rightButton = false;
				if (event.button == 2) { rightButton = true; }
				return rightButton;
			};

			this.preventDefault = function (event) {
				if (event) { event.returnValue = false; }
			};

			this.stopPropagation = function (event) {
				event.cancelBubble = true;
			};

			this._findListener = function (target, eventName, handler) {
				var listeners = target._listeners; // Get array of listener IDs added to target.
				if (!listeners) { return -1; }
				var targetDoc = target.document || target; // Get window object reference containing target.
				var targetWin = targetDoc.parentWindow;
				for (var i = listeners.length - 1; i >= 0; i--) {
					// Find listener (backward search for faster onunload).
					var listenerId = listeners[i]; // Get listener's ID from target.
					var listenerRecord = targetWin._allListeners[listenerId]; // Get listener record from window object.
					// Compare eventName and handler with the retrieved record.
					if (listenerRecord && listenerRecord.eventName == eventName && listenerRecord.handler == handler) { return i; }
				}
				return -1;
			};

			this._removeAllListeners = function () {
				var targetWin = this;
				for (id in targetWin._allListeners) {
					var listenerRecord = targetWin._allListeners[id];
					listenerRecord.target.detachEvent('on' + listenerRecord.eventName, listenerRecord.handler2);
					delete targetWin._allListeners[id];
				}
			};

			this._listenerCounter = 0;
		}
	},

	declareGlobals : function () {
		// IMAGE & SKIN
		Z.pageContainerID = null;
		Z.imagePath = null;
		Z.skinPath = null;
		Z.skinMode = null;
		Z.parameters = null;
		Z.cacheProofCounter = 0;
		Z.timerCounter = 0;

		// PAGE & BROWSER
		Z.browsers = null;
		Z.browser = null;
		Z.browserVersion = null;
		Z.scaleThreshold = null;
		Z.canvasSupported = null;
		Z.cssTransformsSupported = null;
		Z.cssTransformProperty = null;
		Z.cssTransformNoUnits = null;
		Z.alphaSupported = null;
		Z.renderQuality = null;
		Z.rotationSupported = null;
		Z.fullScreenSupported = null;
		Z.arrayMapSupported = null;
		Z.arraySpliceSupported = null;
		Z.float32ArraySupported = null;
		Z.uInt8ArraySupported = null
		Z.xmlHttpRequestSupport = null;
		Z.definePropertySupported = null;
		Z.responseArraySupported = null;
		Z.responseArrayPrototyped = false;
		Z.touchSupport = null;
		Z.mobileDevice = null;
		Z.localUse = null;
		Z.zifSupported = null;

		// VIEWER OPTIONS & DEFAULTS
		Z.onReady = null;
		Z.onAnnotationReady = null;
		Z.initialX = null;
		Z.initialY = null;
		Z.initialZ = null;
		Z.initialZoom = null; // Concise version above used internally. This long version prevents error message in function setParameters.
		Z.minZ = null;
		Z.minZoom = null; // Concise version above used internally. This long version prevents error message in function setParameters.
		Z.maxZ = null;
		Z.maxZoom = null; // Concise version above used internally. This long version prevents error message in function setParameters.
		Z.zoomSpeed = null;
		Z.panSpeed = null;
		Z.smoothPan = null;
		Z.smoothPanEasing = null;
		Z.smoothPanGlide = null;
		Z.autoResize = null;
		Z.fadeInSpeed = null;
		Z.toolbarVisible = null;
		Z.toolbarAutoShowHide = null;
		Z.toolbarW = null;
		Z.toolbarH = null;
		Z.toolbarPosition = null;
		Z.navigatorVisible = null;
		Z.navigatorW = null;
		Z.navigatorWidth = null; // Concise version above used internally. This long version prevents error message in function setParameters.
		Z.navigatorH =  null;
		Z.navigatorHeight = null; // Concise version above used internally. This long version prevents error message in function setParameters.
		Z.navigatorL = null;
		Z.navigatorLeft = null; // Concise version above used internally. This long version prevents error message in function setParameters.
		Z.navigatorT = null;
		Z.navigatorTop = null; // Concise version above used internally. This long version prevents error message in function setParameters.
		Z.navigatorFit = null;
		Z.navigatorRectangleColor = null;
		Z.clickZoom = null;
		Z.doubleClickZoom = null;
		Z.doubleClickDelay = null;
		Z.clickPan = null;
		Z.clickZoomAndPanBlock = false;
		Z.mousePan = null;
		Z.keys = null;
		Z.constrainPan = null;
		Z.panBuffer = null;
		Z.constrainPanStrict = null;
		Z.tooltipsVisible = null;
		Z.helpVisible = 0;
		Z.watermarkPath = null;
		Z.copyrightPath = null;
		Z.hotspots = false;
		Z.hotspotPath = null;
		Z.hotspotFolder = null;
		Z.hotspotListTitle = null;
		Z.hotspotsDrawOnlyInView = true;
		Z.captionBoxes = false;
		Z.captionsColorsDefault = true;
		Z.screensaver = false;
		Z.screensaverSpeed = null;
		Z.tour = false;
		Z.tourPath = null;
		Z.tourListTitle = null;
		Z.tourPlaying = null;
		Z.tourStop = false;
		Z.slideshow = false;
		Z.slidePath = null;
		Z.slideListTitle = null;
		Z.slideshowPlaying = null;
		Z.slideTransitionTimeout = null;
		Z.slideTransitionSpeed = null;
		Z.slideOpacity = 0;
		Z.audioContent = false;
		Z.audioMuted = false;
		Z.annotations = false;
		Z.annotationPath = null;
		Z.annotationPanelVisible = null; // Include panel in interface.
		Z.annotationPanelVisibleState = false; // Show or hide panel currently.
		Z.annotationFolder = null;
		Z.annotationXMLText = null;
		Z.annotationJSONObject = null;
		Z.annotationsAddMultiple = null;
		Z.annotationsAutoSave = null;
		Z.saveButtonVisible = null;
		Z.labelClickSelect = null;
		Z.simplePath = false;
		Z.noPost = false;
		Z.noPostDefaults = false;
		Z.unsavedEditsTest = true;
		Z.maskVisible = null;
		Z.maskingSelection = false;
		Z.maskFadeTimeout = null;		
		Z.maskFadeSpeed = null;
		Z.maskOpacity = 0;
		Z.maskClearOnUserAction = null;
		Z.externalEditPermissionFunction = null; // Value must be function to be invoked. Function must return true or false.
		Z.annotationSort = 'none';
		Z.saveHandlerPath = null;
		Z.saveImageHandlerPath = null;
		Z.saveImageFull = null;
		Z.postingXML = false;
		Z.postingImage = false;
		Z.minimizeVisible = null;
		Z.sliderZoomVisible = null;
		Z.sliderVisible = null; // Deprecated. Now Z.sliderZoomVisible. HTML parameter still zSliderVisible. This set here to prevent specific error message in function setParameters.
		Z.panButtonsVisible = null;
		Z.resetVisible = null;
		Z.fullViewVisible = null;
		Z.fullScreenVisible = null;
		Z.fullPageVisible = null;
		Z.initialFullPage = null;
		Z.fullPageInitial = null; // Deprecated. Set here to enable specific error message in function setParameters.
		Z.measureVisible = false;
		Z.captionTextColor = null;
		Z.captionBackColor = null;
		Z.polygonLineColor = null;
		Z.polygonFillColor = null;
		Z.captionTextVisible = true;
		Z.captionBackVisible = true;
		Z.polygonFillVisible = true;
		Z.polygonLineVisible = true;
		Z.rotationVisible = null;
		Z.initialR = null;
		Z.initialRotation = null; // Concise version above used internally. This long version prevents error message in function setParameters.
		Z.virtualPointerVisible = null;
		Z.crosshairsVisible = null;
		Z.rulerVisible = null;
		Z.units = null;
		Z.unitsPerImage = null;
		Z.pixelsPerUnit = null;
		Z.sourceMagnification = null;
		Z.magnification = null; //  Deprecated. Set here to enable specific error message in function setParameters.
		Z.rulerListType = null;
		Z.rulerW = null;
		Z.rulerWidth = null; // Concise version above used internally. This long version prevents error message in function setParameters.
		Z.rulerH = null;
		Z.rulerHeight = null; // Concise version above used internally. This long version prevents error message in function setParameters.
		Z.rulerL = null;
		Z.rulerLeft = null; // Concise version above used internally. This long version prevents error message in function setParameters.
		Z.rulerT = null;
		Z.rulerTop = null; // Concise version above used internally. This long version prevents error message in function setParameters.
		Z.coordinatesVisible = null;
		Z.saveImageFull = null;
		Z.saveImageFilename = null;
		Z.saveImageFormat = null;
		Z.saveImageCompression = null;
		Z.saveImageBackColor = null;
		Z.imageFiltersVisible = null;
		Z.initialImageFilters = null;
		Z.progressVisible = null;
		Z.messagesVisible = null;
		Z.logoVisible = null;
		Z.logoLink = null;
		Z.logoLinkURL = null;
		Z.logoCustomPath = null;
		Z.canvas = null;
		Z.debug = null;
		Z.imageProperties = null;
		Z.serverIP = null;
		Z.serverPort = null;
		Z.tileHandlerPath = null;
		Z.tileHandlerPathFull = null;
		Z.tileW = null;
		Z.tileH = null;
		Z.tileType = 'jpg';
		Z.tilesPNG = null;  // Deprecated.  zTilesPNG now sets Z.tileType above. Set here to enable specific error message in function setParameters.
		Z.freehandVisible = null;
		Z.textVisible = null;
		Z.iconVisible = null;
		Z.rectangleVisible = null;
		Z.polygonVisible = null;
		Z.annotationPathProvided = false;
		Z.saveHandlerProvided = false;
		Z.imageSetPathProvided = false;
		Z.saveImageHandlerProvided = false;
		Z.tileSource = null;
		Z.tileSourceMultiple = null;
		Z.focal = null;
		Z.quality = null;		
		Z.markupMode = null; // Used only to ensure zMarkupMode validity test does not return 'undefined'.
		Z.editMode = null; // Supported values: null, 'edit', 'markup'.
		Z.editing = null; // Supported values: null, 'addPOI', 'editPOI', 'addLabel', 'editLabel', 'addNote', 'editNote'.
		Z.labelMode = 'view'; // Supported values: 'view', 'freehand', 'text', 'icon', 'rectangle', 'polygon', 'measure'.		
		Z.editModePrior = Z.editMode;
		Z.sliderFocus = 'zoom';
		Z.animation = false;
		Z.animationPath = null; // Supports zAnimationPath parameter test.		
		Z.animationCount = 0;
		Z.animationAxis = null;
		Z.animator = null;
		Z.slidestack = false;
		Z.slidestackPath = null; // Supports zSlidestackPath parameter test.
		Z.imageSet = false;
		Z.imageSetPath = null;
		Z.imageSetLength = null;
		Z.imageSetListPosition = null;
		Z.imageSetListTitle = null;
		Z.imageSetStart = null;
		Z.imageSetLoop = null;
		Z.sliderImageSetVisible = null;
		Z.mouseWheelParmeterProvided = null;
		Z.mouseWheel = null;
		Z.imageSetHotspotPath = null;
		Z.hotspotFileShared = false;
		Z.imageSetAnnotationPath = null;
		Z.annotationFileShared = false;
		
		// VIEWER COMPONENTS & STATE VALUES
		Z.Viewer = null;
		Z.ViewerDisplay = null;
		Z.Viewport = null;
		Z.Toolbar = null;
		Z.ToolbarDisplay = null;
		Z.ToolbarMinimized = false;
		Z.TooltipDisplay = null;
		Z.Navigator = null;
		Z.NavigatorDisplay = null;
		Z.MessageDisplay = null;
		Z.messages = null;
		Z.messageDisplayList = [];
		Z.overlayMessage = null;
		Z.CoordinatesDisplay = null;
		Z.coordinates = null;
		Z.coordinatesSave = null;
		Z.CopyrightDisplay = null;
		Z.AnnotationPanelDisplay = null;
		Z.imageW = null;
		Z.imageH = null;
		Z.imageCenterX = null;
		Z.imageCenterY = null;
		Z.imageX = 0;
		Z.imageY = 0;
		Z.imageZ = 0;
		Z.imageR = 0;
		Z.priorX = 0;
		Z.priorY = 0;
		Z.priorZ = 0;
		Z.priorR = 0;
		Z.preventDupCall = false;
		Z.fitZ = null;
		Z.fillZ = null;		
		Z.zooming = 'stop';
		Z.panningX = 'stop';
		Z.panningY = 'stop';
		Z.fullView = false;
		Z.fullViewPrior = false;
		Z.interactivityOff = false;
		Z.useCanvas = true;
		Z.specialStorageEnabled = null;
		Z.callbacks = [];
		Z.updateViewPercent = 0;
		Z.TraceDisplay = null;
		Z.traces = null;
		Z.mouseIsDown = false;
		Z.buttonIsDown = false;
		Z.keyIsDown = false;
		Z.mouseWheelIsDown = false;
		Z.mouseWheelCompleteDuration = null;
		Z.mouseWheelCompleteTimer = null;
		Z.mouseOutDownPoint = null;

		// ImageSet support.
		Z.viewportCurrentID = 0;
		Z.viewportCurrent = null;
		Z.viewportChangeTimeout = null;
	},
	
	detectBrowserFeatures : function () {	
		// Detect browser and version.
		Z.browsers = { UNKNOWN: 0, IE: 1, FIREFOX: 2, SAFARI: 3, CHROME: 4, OPERA: 5 };
		var browser = Z.browsers.UNKNOWN;
		var browserVersion = 0;
		var scaleThreshold = 10000; // Safe value set, actual value may be 1M.
		var app = navigator.appName;
		var ver = navigator.appVersion;
		var msInterpolationMode = false;
		var gwkRenderingMode = false;
		var ua = navigator.userAgent.toLowerCase();

		if (app == 'Microsoft Internet Explorer' && !! window.attachEvent && !! window.ActiveXObject) {
			var ieOffset = ua.indexOf('msie');
			browser = Z.browsers.IE;			
			browserVersion = parseFloat(ua.substring(ieOffset + 5, ua.indexOf(';', ieOffset)));
			msInterpolationMode = (typeof document.documentMode !== 'undefined');
		} else if (app == 'Netscape' && ua.indexOf('trident') != -1) {
			browser = Z.browsers.IE;			
			browserVersion = 11;			
		} else if (app == 'Netscape' && !! window.addEventListener) {
			var idxFF = ua.indexOf('firefox');
			var idxSA = ua.indexOf('safari');
			var idxCH = ua.indexOf('chrome');
			if (idxFF >= 0) {
				browser = Z.browsers.FIREFOX;
				browserVersion = parseFloat(ua.substring(idxFF + 8));
				scaleThreshold = 10000; // Safe value set, actual value may be 100,000.
			} else if (idxSA >= 0) {
				var slash = ua.substring(0, idxSA).lastIndexOf('/');
				browser = (idxCH >= 0) ? Z.browsers.CHROME : Z.browsers.SAFARI;
				browserVersion = parseFloat(ua.substring(slash + 1, idxSA));
				scaleThreshold = 10000;
			}
			var testImage = new Image();
			if (testImage.style.getPropertyValue) { gwkRenderingMode = testImage.style.getPropertyValue ('image-rendering'); }
		} else if (app == 'Opera' && !! window.opera && Object.prototype.toString.call(window.opera) == '[object Opera]') {
			browser = Z.browsers.OPERA;
			browserVersion = parseFloat(ver);
		}

		// Detect network request support
		var xmlHttpRequestSupport;
		if (window.XMLHttpRequest) {
			netReq = new XMLHttpRequest();
			xmlHttpRequestSupport =  'XMLHttpRequest';
		} else if (window.ActiveXObject) {
			var arrActiveX = ['Msxml2.XMLHTTP.6.0', 'Msxml2.XMLHTTP.3.0', 'Microsoft.XMLHTTP'];
			for (var i = 0, j = arrActiveX.length; i < j; i++) {
				try {
					netReq = new ActiveXObject(arrActiveX[i]);
					xmlHttpRequestSupport = arrActiveX[i];
					break;
				} catch (e) {
					continue;
				}
			}
		}
		
		var responseArraySupported = ('response' in XMLHttpRequest.prototype || 'mozResponseArrayBuffer' in XMLHttpRequest.prototype || 'mozResponse' in XMLHttpRequest.prototype || 'responseArrayBuffer' in XMLHttpRequest.prototype);
		
		// Detect Canvas support.
		var elem = document.createElement('canvas');
		var canvasSupportPresent = !!(elem.getContext && elem.getContext('2d'));
		var canvasSuppSubpix = !((browser == Z.browsers.SAFARI && browserVersion < 4) || (browser == Z.browsers.CHROME && browserVersion < 2));
		var canvasSupported = canvasSupportPresent && canvasSuppSubpix;
		var alphaSupported = !(browser == Z.browsers.CHROME && browserVersion < 2);
		var renderQuality = (msInterpolationMode || gwkRenderingMode) ? 'high' : null;

		// Detect transform support - for rotation and non-canvas tile placement.
		var docElmt = document.documentElement || {};
		var docElmtStyle = docElmt.style || {};
		var cssTransformsSupported = false;
		var cssTransformProperties = ['transform', 'WebkitTransform', 'MozTransform', 'OTransform', 'msTransform'];
		var cssTransformProperty;
		var cssTransformNoUnits;
		while (cssTransformProperty = cssTransformProperties.shift()) {
			if (typeof docElmtStyle[cssTransformProperty] !== 'undefined') {
				cssTransformsSupported = true;
				cssTransformNoUnits = /webkit/i.test(cssTransformProperty);
				break;
			}
		}
		var rotationSupported = cssTransformsSupported;

		// Detect fullscreen support - native and vendor.
		var fullScreenSupported = false;
		 if (typeof document.cancelFullScreen !== 'undefined' 
			|| typeof document.webkitCancelFullScreen !== 'undefined'
			|| typeof document.mozCancelFullScreen !== 'undefined'
			|| typeof document.oCancelFullScreen !== 'undefined'
			|| typeof document.msCancelFullScreen !== 'undefined'
			|| typeof document.msExitFullscreen !== 'undefined') {                
			fullScreenSupported = true;
		}

		// Detect array support, type, and property support.
		var arrayMapSupported = Array.prototype.map;
		var arraySpliceSupported = Array.prototype.splice;
		var float32ArraySupported = false;
		try {
			var a = new Float32Array(1);
			float32ArraySupported = true;
		} catch (e) { }

		var uInt8ArraySupported = false;
		try {
			var a = new Uint8Array(1);
			uInt8ArraySupported = true;
		} catch (e) { }
		var definePropertySupported = false;
		if (typeof Object.defineProperty == 'function') {
			try {
				Object.defineProperty({}, 'x', {});
				definePropertySupported = true;
			} catch (e) { }
		}

		// Detect touch event support - enable touch event handlers but do not disable mouse event handlers.
		var touchSupport = (('ontouchstart' in window) || (window.DocumentTouch && document instanceof DocumentTouch) || (navigator.maxTouchPoints > 0) || (navigator.msMaxTouchPoints > 0));

		// Detect mobile device - affects pan buffer size, buttons sizes, zoom step size, label scaling step size, label control point size, and whether some errors are presented as messages in the user display are in the developer console.
		var mobileDevice = (ua.indexOf('android') > -1 || ua.indexOf('iphone') > -1 || ua.indexOf('ipad') > -1 || ua.indexOf('ipod') > -1);

		// Detect local access - alert users of Chrome/Opera/IE11 (folders) and ZIF (all browsers).
		var localUse;
		switch (window.location.protocol) {
			case 'http:':
				localUse = false;
				break;
			case 'https:':
				localUse = false;
				break;
			case 'file:':
				localUse = true;
				break;
			default:
				localUse = null;
				break;
		}

		// Detect browser use not supporting ZIF single file storage. Access not supported on IE <= v8 and Opera <= v12 and most pre-canvas browsers.
		// Numerous browsers with limited adoption not tested and functional failures will present specific errors rather than general ZIF support message.
		var zifSupported = !((Z.browser == Z.browsers.IE && Z.browserVersion < 9) || (Z.browser == Z.browsers.OPERA && Z.browserVersion < 15) || (Z.browser == Z.browsers.CHROME && Z.browserVersion < 25) && (Z.browser == Z.browsers.FIREFOX && Z.browserVersion < 20) && (Z.browser == Z.browsers.SAFARI && Z.browserVersion < 5));

		// Set global variables.
		Z.browser = browser;
		Z.browserVersion = browserVersion;
		Z.scaleThreshold = scaleThreshold;
		Z.xmlHttpRequestSupport = xmlHttpRequestSupport;
		Z.responseArraySupported = responseArraySupported;
		Z.canvasSupported = canvasSupported;
		Z.useCanvas = Z.canvasSupported;  // Can be overridden by false zCanvas parameter.
		Z.imageFiltersVisible = (!Z.useCanvas && Z.imageFiltersVisible) ? false : Z.imageFiltersVisible;
		Z.cssTransformsSupported = cssTransformsSupported;
		Z.cssTransformProperty = cssTransformProperty;
		Z.cssTransformNoUnits = cssTransformNoUnits;
		Z.alphaSupported = alphaSupported;
		Z.renderQuality = renderQuality;
		Z.rotationSupported = rotationSupported;
		Z.fullScreenSupported = fullScreenSupported;
		Z.arrayMapSupported = arrayMapSupported;
		Z.arraySpliceSupported = arraySpliceSupported;		
		Z.float32ArraySupported = float32ArraySupported;
		Z.uInt8ArraySupported = uInt8ArraySupported;
		Z.definePropertySupported = definePropertySupported;
		Z.touchSupport = touchSupport;
		Z.mobileDevice = mobileDevice;
		Z.localUse = localUse;
		Z.zifSupported = zifSupported;
	},
	
	
	
	//::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::
	//:::::::::::::::::::::::::::: COPYRIGHT UTILITY FUNCTIONS :::::::::::::::::::::::::::::
	//::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::
	
	enforceCopyright : function () {
		// Test whether copyright has already been presented, and if not, load and display text and require user OK.
		var copyrightCookieExists = this.readCookie('imageCopyright')
		if (copyrightCookieExists) {
			Z.Viewer.configureViewer();
		} else {
			this.loadCopyrightText();
		}
	},

	readCookie : function (name) {
		var nameEq = name + '=';
		var nameValuePairs = document.cookie.split(';');
		for (var i = 0, j = nameValuePairs.length; i < j; i++) {
			var nvP = nameValuePairs[i];
			while (nvP.charAt(0) == ' ') { nvP = nvP.substring(1,nvP.length); }
			if (nvP.indexOf(nameEq) == 0) { return nvP.substring(nameEq.length,nvP.length); }
		}
		return null;
	},

	loadCopyrightText : function () {
		// Load copyright XML for text to display.
		var netConnector = new Z.NetConnector();
		netConnector.loadXML(Z.copyrightPath);
	},

	showCopyright : function (cStateTxt, cDecTxt) {
		// Display copyright text and, if confirmed, create cookie to prevent re-display during the current browser session.
		var scrnColor = this.getResource('DEFAULT_COPYRIGHTSCREENCOLOR');
		var btnColor = this.getResource('DEFAULT_COPYRIGHTBUTTONCOLOR');

		Z.CopyrightDisplay = this.createContainerElement('div', 'CopyrightDisplay', 'inline-block', 'absolute', 'hidden', (Z.viewerW - 2) + 'px', (Z.viewerH - 2) + 'px', '0px', '0px', 'solid', '1px', scrnColor, '0px', '0px', 'normal', null, true);
		Z.ViewerDisplay.appendChild(Z.CopyrightDisplay);
		
		// Ensure copyright display screen is in front of everything in viewport except virtual pointer.
		var uiElementsBaseZIndex = parseInt(Z.Utils.getResource('DEFAULT_UIELEMENTBASEZINDEX'), 10);
		Z.CopyrightDisplay.style.zIndex = (uiElementsBaseZIndex + 11).toString();

		
		// Create centered container for text.
		var textBoxW = 440;
		var textBoxH = 200;
		var textBoxLeft = (parseFloat(Z.CopyrightDisplay.style.width) / 2) - (textBoxW / 2);
		var textBoxTop = (parseFloat(Z.CopyrightDisplay.style.height) / 2) - (textBoxH / 2);
		var textBox = this.createContainerElement('div', 'textBox', 'inline-block', 'absolute', 'hidden', textBoxW + 'px', textBoxH + 'px', textBoxLeft + 'px', textBoxTop + 'px', 'none', '0px', 'transparent none', '0px', '0px', 'normal', null, true);
		textBox.id='textBox';
		Z.CopyrightDisplay.appendChild(textBox);

		// Create text node and add text from xml file.
		var copyrightTextNode = document.createTextNode(cStateTxt);
		textBox.appendChild(this.createCenteredElement(copyrightTextNode, 'copyrightTextNode'));
		this.setTextNodeStyle(copyrightTextNode, 'black', 'verdana', '16px', 'none', 'normal', 'normal', 'normal', 'normal', '1em', 'justify', 'none');

		// Add hidden text node to store decline text for Exit condition.
		var declinedTextContainer = this.createContainerElement('div', 'declinedTextContainer', 'hidden', 'absolute', 'hidden', '0px', '0px', '0px', '0px', 'none', '0px', 'transparent none', '0px', '0px', 'normal', null, true);
		var declinedTextNode = document.createTextNode(cDecTxt);
		declinedTextContainer.appendChild(declinedTextNode);
		textBox.appendChild(declinedTextContainer);

		var btnW = 80;
		var btnH = 20;
		var dvdrW = 30;
		var dvdrH = 20;

		var btnL = textBoxLeft + (textBoxW / 2) - ((btnW * 2 + dvdrW) / 2);
		var btnT = textBoxTop + textBoxH + dvdrH;
		var btnTxt = this.getResource('UI_COPYRIGHTAGREEBUTTONTEXT');
		var buttonAgree = new Z.Utils.Button('buttonAgree', btnTxt, null, null, null, null, btnW + 'px', btnH + 'px', btnL + 'px', btnT + 'px', 'mousedown', this.copyrightAgreeButtonHandler, 'TIP_COPYRIGHTAGREE', 'solid', '1px', btnColor, '0px', '0px');
		Z.CopyrightDisplay.appendChild(buttonAgree.elmt);

		btnL += btnW + dvdrW;
		btnTxt = this.getResource('UI_COPYRIGHTEXITBUTTONTEXT');
		var buttonExit = new Z.Utils.Button('buttonExit', btnTxt, null, null, null, null, btnW + 'px', btnH + 'px', btnL + 'px', btnT + 'px', 'mousedown', this.copyrightExitButtonHandler, 'TIP_COPYRIGHTEXIT', 'solid', '1px', btnColor, '0px', '0px');
		Z.CopyrightDisplay.appendChild(buttonExit.elmt);
	},

	hideCopyright : function () {
		// Option 1: Change text to remind user they have declined copyright agreement.
		var copyrightTextNode = document.getElementById('copyrightTextNode').firstChild;
		var declinedText = document.getElementById('declinedTextContainer').firstChild.nodeValue;
		copyrightTextNode.nodeValue = declinedText;

		// Option 2: remove text field. Combine this with code to leave page or other custom steps.
		//var textBox = document.getElementById('textBox');
		// Z.CopyrightDisplay.removeChild(textBox);

		var buttonAgree = document.getElementById('buttonAgree');
		Z.Utils.removeEventListener(buttonAgree, 'mousedown', this.copyrightAgreeButtonHandler);
		Z.CopyrightDisplay.removeChild(buttonAgree);

		var buttonExit = document.getElementById('buttonExit');
		Z.Utils.removeEventListener(buttonExit, 'mousedown', this.copyrightExitButtonHandler);
		Z.CopyrightDisplay.removeChild(buttonExit);
	},

	copyrightAgreeButtonHandler : function (event) {
		Z.ViewerDisplay.removeChild(Z.CopyrightDisplay);
		document.cookie = 'imageCopyright=confirmed';
		Z.Viewer.configureViewer();
	},

	copyrightExitButtonHandler : function (event) {
		// DEV NOTE: Insert preferred alternative action here, for example return to site Terms Of Use page or homepage.
		Z.Utils.hideCopyright();
		return;
	},	
	
	
	
	//::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::
	//::::::::::::::::::::: PARAMETER & RESOURCE UTILITY FUNCTIONS ::::::::::::::::::::
	//::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::
	
	parseParameters : function (params) {
		var parsedParams = [];
		if (typeof params === 'object') {
			parsedParams = params;
		} else if (typeof params === 'string') {
			var splitParams = params.split('&');
			for (var i = 0, j = splitParams.length; i < j; i++) {
				var nameValuePair = splitParams[i];
				var sep = nameValuePair.indexOf('=');
				if (sep > 0) {
					var pName = nameValuePair.substring(0, sep)
					var pValue = nameValuePair.substring(sep + 1)
					parsedParams[pName] = pValue;
				}
			}
		}
		return parsedParams;
	},
	
	parametersToDelimitedString : function (params, delimiter) {
		var outputString = '';
		for (var pName in params) {
			outputString += pName + '=' + params[pName].toString() + delimiter;
		}
		outputString = outputString.slice(0, - 1);
		return outputString;
	},

	setParameters : function (params) {
		var unrecognizedParamAlert = this.getResource('ERROR_UNRECOGNIZEDPARAMETERALERT');
		
		var expressParamsEnableTest = this.getResource('DEFAULT_EXPRESSPARAMETERSENABLETEST');
		var expressParamsDisableValue = this.getResource('DEFAULT_EXPRESSPARAMETERSDISABLEVALUE');
		var expressParamsDisabledAlert = this.getResource('DEFAULT_EXPRESSPARAMETERSDISABLEDALERT');
		var expressParamsEnabled = (expressParamsEnableTest != expressParamsDisableValue) ? true : false;
		if (!expressParamsEnabled) { Z.logoLinkURL = Z.Utils.getResource('UI_LOGOLINK'); }

		var proParamsEnableTest = this.getResource('DEFAULT_PROPARAMETERSENABLETEST');
		var proParamsDisableValue = this.getResource('DEFAULT_PROPARAMETERSDISABLEVALUE');
		var proParamsDisabledAlert = this.getResource('DEFAULT_PROPARAMETERSDISABLEDALERT');
		var proParamsEnabled = (proParamsEnableTest != proParamsDisableValue) ? true : false;
		
		var specialStorageEnableTest = this.getResource('DEFAULT_SPECIALSTORAGESUPPORTENABLETEST');
		var specialStorageDisableValue = this.getResource('DEFAULT_SPECIALSTORAGESUPPORTDISABLEVALUE');
		var specialStorageDisabledAlert = this.getResource('DEFAULT_SPECIALSTORAGESUPPORTDISABLEDALERT');
		Z.specialStorageEnabled = (specialStorageEnableTest != specialStorageDisableValue) ? true : false;

		var enterpriseParamsEnableTest = this.getResource('DEFAULT_ENTERPRISEPARAMETERSENABLETEST');
		var enterpriseParamsDisableValue = this.getResource('DEFAULT_ENTERPRISEPARAMETERSDISABLEVALUE');
		var enterpriseParamsDisabledAlert = this.getResource('DEFAULT_ENTERPRISEPARAMETERSDISABLEDALERT');
		var enterpriseParamsEnabled = (enterpriseParamsEnableTest != enterpriseParamsDisableValue) ? true : false;

		Z.skinPath = this.getResource('DEFAULT_SKINXMLPATH');
		Z.skinMode = this.getResource('DEFAULT_SKINMODE');

		if (!isNaN(parseFloat(this.getResource('DEFAULT_INITIALX')))) { Z.initialX = parseFloat(this.getResource('DEFAULT_INITIALX')); }
		if (!isNaN(parseFloat(this.getResource('DEFAULT_INITIALY')))) { Z.initialY = parseFloat(this.getResource('DEFAULT_INITIALY')); }
		if (!isNaN(parseFloat(this.getResource('DEFAULT_INITIALZOOM')))) { Z.initialZ = parseFloat(this.getResource('DEFAULT_INITIALZOOM')); }
		if (!isNaN(parseFloat(this.getResource('DEFAULT_MINZOOM')))) { Z.minZ = parseFloat(this.getResource('DEFAULT_MINZOOM')); }
		if (!isNaN(parseFloat(this.getResource('DEFAULT_MAXZOOM')))) { Z.maxZ = parseFloat(this.getResource('DEFAULT_MAXZOOM')); }
		if (!isNaN(parseFloat(this.getResource('DEFAULT_ZOOMSPEED')))) { Z.zoomSpeed = parseFloat(this.getResource('DEFAULT_ZOOMSPEED')); }
		if (!isNaN(parseFloat(this.getResource('DEFAULT_PANSPEED')))) { Z.panSpeed = parseFloat(this.getResource('DEFAULT_PANSPEED')); }
		if (!isNaN(parseFloat(this.getResource('DEFAULT_FADEINSPEED')))) { Z.fadeInSpeed = parseFloat(this.getResource('DEFAULT_FADEINSPEED')); }

		Z.navigatorVisible = parseInt(this.getResource('DEFAULT_NAVIGATORVISIBLE'), 10);
		Z.navigatorW = parseInt(this.getResource('DEFAULT_NAVIGATORWIDTH'), 10);
		Z.navigatorH = parseInt(this.getResource('DEFAULT_NAVIGATORHEIGHT'), 10);
		Z.navigatorL = parseInt(this.getResource('DEFAULT_NAVIGATORLEFT'), 10);
		Z.navigatorT = parseInt(this.getResource('DEFAULT_NAVIGATORTOP'), 10);
		Z.navigatorFit = this.getResource('DEFAULT_NAVIGATORFIT');
		Z.navigatorRectangleColor = this.getResource('DEFAULT_NAVIGATORRECTANGLECOLOR');

		Z.clickZoom = (this.getResource('DEFAULT_CLICKZOOM') != '0');
		Z.doubleClickZoom = (this.getResource('DEFAULT_DOUBLECLICKZOOM') != '0');
		Z.doubleClickDelay = parseFloat(this.getResource('DEFAULT_DOUBLECLICKDELAY'));
		Z.clickPan = (this.getResource('DEFAULT_CLICKPAN') != '0');
		Z.mousePan = (this.getResource('DEFAULT_MOUSEPAN') != '0');
		Z.constrainPan = (this.getResource('DEFAULT_CONSTRAINPAN') != '0');
		Z.panBuffer = parseFloat(this.getResource('DEFAULT_PANBUFFER'));
		Z.constrainPanStrict = (this.getResource('DEFAULT_CONSTRAINPANSTRICT') != '0');
		Z.smoothPan = (Z.useCanvas && this.getResource('DEFAULT_SMOOTHPAN') != '0');
		Z.smoothPanEasing = parseInt(this.getResource('DEFAULT_SMOOTHPANEASING'), 10);
		Z.smoothPanGlide = parseInt(this.getResource('DEFAULT_SMOOTHPANGLIDE'), 10);
		Z.keys = (this.getResource('DEFAULT_KEYS') != '0');
		Z.canvas = (this.getResource('DEFAULT_CANVAS') != '0');
		Z.debug = parseInt(this.getResource('DEFAULT_DEBUG'), 10);

		Z.toolbarVisible = parseInt(this.getResource('DEFAULT_TOOLBARVISIBLE'), 10);
		Z.toolbarAutoShowHide = (Z.toolbarVisible != 0 && Z.toolbarVisible != 1 && Z.toolbarVisible != 6 && Z.toolbarVisible != 7 && Z.toolbarVisible != 8);
		Z.toolbarPosition = parseFloat(this.getResource('DEFAULT_TOOLBARPOSITION'));
		Z.logoVisible = (this.getResource('DEFAULT_LOGOVISIBLE') != '0');
		Z.logoCustomPath = this.getResource('DEFAULT_LOGOCUSTOMPATH');
		Z.minimizeVisible = (this.getResource('DEFAULT_MINIMIZEVISIBLE') != '0');
		Z.sliderZoomVisible = (this.getResource('DEFAULT_SLIDERZOOMVISIBLE') != '0');
		Z.mouseWheel = parseInt(this.getResource('DEFAULT_MOUSEWHEEL'), 10);
		
		Z.panButtonsVisible = (this.getResource('DEFAULT_PANBUTTONSVISIBLE') != '0');
		Z.resetVisible = (this.getResource('DEFAULT_RESETVISIBLE') != '0');
		Z.tooltipsVisible = (this.getResource('DEFAULT_TOOLTIPSVISIBLE') != '0');
		Z.helpVisible = parseInt(this.getResource('DEFAULT_HELPVISIBLE'), 10);
		Z.progressVisible = (this.getResource('DEFAULT_PROGRESSVISIBLE') != '0');
		Z.messagesVisible = (this.getResource('DEFAULT_MESSAGESVISIBLE') != '0');
		
		Z.fullViewVisible = (this.getResource('DEFAULT_FULLVIEWVISIBLE') != '0');
		Z.fullScreenVisible = (this.getResource('DEFAULT_FULLSCREENVISIBLE') != '0');
		Z.fullPageVisible = (this.getResource('DEFAULT_FULLPAGEVISIBLE') != '0');
		Z.initialFullPage = (this.getResource('DEFAULT_INITIALFULLPAGE') != '0');
		Z.measureVisible = (this.getResource('DEFAULT_MEASUREVISIBLE') != '0');
		Z.rotationVisible = (this.getResource('DEFAULT_ROTATIONVISIBLE') != '0');
		Z.initialR = this.getResource('DEFAULT_INITIALR');
	
		if (!isNaN(parseFloat(this.getResource('DEFAULT_SCREENSAVERSPEED')))) { Z.screensaverSpeed = parseFloat(this.getResource('DEFAULT_SCREENSAVERSPEED')); }

		if (!isNaN(parseFloat(this.getResource('DEFAULT_MASKFADESPEED')))) { Z.maskFadeSpeed = parseFloat(this.getResource('DEFAULT_MASKFADESPEED')); }
		Z.maskClearOnUserAction = (this.getResource('DEFAULT_MASKCLEARONUSERACTION') != '0');
				
		Z.units = this.getResource('DEFAULT_UNITS');
		Z.sourceMagnification = parseInt(this.getResource('DEFAULT_SOURCEMAGNIFICATION'), 10);
		
		Z.virtualPointerVisible = (this.getResource('DEFAULT_VIRTUALPOINTERVISIBLE') != '0');
		Z.crosshairsVisible = (this.getResource('DEFAULT_CROSSHAIRSVISIBLE') != '0');
		
		Z.rulerVisible = parseInt(this.getResource('DEFAULT_RULERVISIBLE'), 10);
		Z.rulerListType = this.getResource('DEFAULT_RULERLISTTYPE');
		Z.rulerW = parseInt(this.getResource('DEFAULT_RULERWIDTH'), 10);
		Z.rulerH = parseInt(this.getResource('DEFAULT_RULERHEIGHT'), 10);
		Z.rulerL = parseInt(this.getResource('DEFAULT_RULERLEFT'), 10);
		Z.rulerT = parseInt(this.getResource('DEFAULT_RULERTOP'), 10);

		if (!isNaN(parseFloat(this.getResource('DEFAULT_SLIDETRANSITIONSPEED')))) { Z.slideTransitionSpeed = parseFloat(this.getResource('DEFAULT_SLIDETRANSITIONSPEED')); }
		
		Z.coordinatesVisible = (this.getResource('DEFAULT_COORDINATESVISIBLE') != '0');
		
		Z.labelClickSelect = (this.getResource('DEFAULT_LABELCLICKSELECT') != '0');
		
		Z.sliderImageSetVisible = (this.getResource('DEFAULT_IMAGESETSLIDERVISIBLE') != '0');
		
		if (typeof params === 'object' && params !== null) {
		
			// Test for hotspot or annotation path and save handler path before allow setting of markup or annotation mode below.
			Z.annotationPathProvided = (params['zHotspotPath'] !== undefined || params['zAnnotationPath'] !== undefined || params['zAnnotationXMLText'] !== undefined || params['zAnnotationJSONObject'] !== undefined);
			Z.saveHandlerProvided = (params['zSaveHandlerPath'] !== undefined || (params['zNoPost'] !== undefined && params['zNoPost'] == '1'));
			Z.imageSetPathProvided = (params['zAnimationPath'] !== undefined || params['zSlidestackPath'] !== undefined);
			Z.saveImageHandlerProvided = (params['zSaveImageHandlerPath'] !== undefined);
			Z.mouseWheelParmeterProvided = (params['zMouseWheel'] !== undefined);
					
			for (var pName in params) {
				
				if (typeof params[pName] === 'function' && pName !== 'zOnAnnotationReady' && pName !== 'zOnReady') {
					// DEV NOTE: The Prototype.js library extends native data type prototypes and causes the for-in used to parse the optional parameters string
					// to fill the params object with extension functions that must be ignored. Exceptions added for Zoomify parameters that are functions.
					continue;
				} else if (typeof Z[Z.Utils.stringLowerCaseFirstLetter(pName.substr(1))] === 'undefined') {
					alert(unrecognizedParamAlert + ' ' +pName);
				} else {

					pValue = params[pName];

					// For limited feature edition, disable Express, Pro, and Enterprise parameters. 
					// Then only one is supported, zNavigatorVisible, and Z logo link is enabled.
					if (!expressParamsEnabled && pName != 'zNavigatorVisible') {
						alert(expressParamsDisabledAlert + ' ' +pName);

					} else {				
						switch (pName) {

							case 'zOnAnnotationReady' : // Callback function option for completion of Annotation Panel initialization.
								if (typeof pValue === 'function') {
									Z.setCallback('annotationPanelInitialized', pValue);
								}
								break;
							case 'zOnReady' : // Callback function option for completion of Viewer initialization.
								if (typeof pValue === 'function') {
									Z.setCallback('readyViewer', pValue);
								}
								break;

							case 'zInitialX' : // Default is null (centered).
								if (!isNaN(parseFloat(pValue))) { Z.initialX = parseFloat(pValue); }
								break;
							case 'zInitialY' : // Default is null (centered).
								if (!isNaN(parseFloat(pValue))) { Z.initialY = parseFloat(pValue); }
								break;
							case 'zInitialZoom' : // '1' to '100' recommended range (internally 0.1 to 1). Special inputs are 'fit' (default, zoom-to-fit in view area) and 'fill' (zoom-to-fill view area). Input value of -1 for zoom-to-fit is deprecated.
								if (pValue == 'fit') { pValue = '-1'; }
								if (pValue == 'fill') { pValue = '0'; }
								if (!isNaN(parseFloat(pValue))) {
									Z.initialZ = parseFloat(pValue);
									if (Z.initialZ && Z.initialZ > 0 && Z.initialZ <= 100) { Z.initialZ /= 100; }
								}
								break;
							case 'zMinZoom' : // '1' to '100' recommended range (internally 0.1 to 1). Special inputs are 'fit' (default, zoom-to-fit in view area) and 'fill' (zoom-to-fill view area). Input value of -1 for zoom-to-fit is deprecated.
								if (pValue == 'fit') { pValue = '-1'; }
								if (pValue == 'fill') { pValue = '0'; }								
								if (!isNaN(parseFloat(pValue))) {
									Z.minZ = parseFloat(pValue);
									if (Z.minZ && Z.minZ > 0 && Z.minZ <= 100) { Z.minZ /= 100; }
								}
								break;
							case 'zMaxZoom' : // '1' to '100' recommended range (internally 0.1 to 1), default is 1 (100%).
								if (!isNaN(parseFloat(pValue))) {
									Z.maxZ = parseFloat(pValue);
									if (Z.maxZ && Z.maxZ != -1) { Z.maxZ /= 100; }
								}
								break;

							case 'zNavigatorVisible' :  // '0'=hide, '1'=show, '2'= initially show then hide on mouse-out (default), '3'=initially hide then show when mouse over.
								Z.navigatorVisible = parseInt(pValue, 10);
								break;

							case 'zToolbarVisible' :  // '0'=hide, '1'=show, '2'= initially show then hide on mouse-out (default), '3'=initially hide then show when mouse over, '4' and '5'=same as '2' and '3' but minimize rather than hiding, '6' and '7'= same as '1' and '2' but minimize buttons still visible (and toolbar overlaps display), '8' hides toolbar and keeps it hidden (supports external toolbar with editing functions fully enabled). On mobile devices behavior is forced from '2' and '3' to '4' and '5'.
								Z.toolbarVisible = parseInt(pValue, 10);
								Z.toolbarAutoShowHide = (Z.toolbarVisible != 0 && Z.toolbarVisible != 1 && Z.toolbarVisible != 6 && Z.toolbarVisible != 7 && Z.toolbarVisible != 8);
								break;
							case 'zLogoVisible' :  // '0'=hide, '1'=show (default).
								if (pValue == '0') { Z.logoVisible = false; }
								break;								
							case 'zMinimizeVisible' :  // '0'=false, '1'=true (default).
								if (pValue == '0') { Z.minimizeVisible = false; }
								break;
							case 'zSliderVisible' :  // '0'=false, '1'=true (default).
								if (pValue == '0') { Z.sliderZoomVisible = false; }
								break;
							case 'zPanButtonsVisible' :  // '0'=false, '1'=true (default).
								if (pValue == '0') { Z.panButtonsVisible = false; }
								break;
							case 'zResetVisible' :  // '0'=false, '1'=true (default).
								if (pValue == '0') { Z.resetVisible = false; }
								break;

							case 'zFullViewVisible' :  // '0'=false, '1'=true (default).
								if (pValue == '1') { 
									Z.fullScreenVisible = true;
									Z.fullPageVisible = false;
								} else if (pValue == '0') {
									Z.fullScreenVisible = false;
									Z.fullPageVisible = false;
								}
								break;
							case 'zFullScreenVisible' :  // '0'=false, '1'=true (default).
								if (pValue == '0') { 
									Z.fullScreenVisible = false;									Z.fullPageVisible = false;
								}
								break;
							case 'zFullPageVisible' :  // '0'=false (default), '1'=true.
								if (pValue == '1') {
									Z.fullScreenVisible = false;
									Z.fullPageVisible = true;
								}
								break;
							case 'zInitialFullPage' :  // '0'=false (default), '1'=true.
								if (pValue == '1') { Z.initialFullPage = true; }
								break;
							case 'zFullPageInitial' :  // Deprecated. Replaced with the above for consistency.
								alert(Z.Utils.getResource('ERROR_PARAMETERDEPRECATED') + ' zFullPageInitial is now zInitialFullPage');
								break;
								
							case 'zProgressVisible' :  // '0'=false, '1'=true (default).
								if (pValue == '0') { Z.progressVisible = false; }
								break;								
							case 'zTooltipsVisible' :  // '0'=hide, '1'=show (default).
								if (pValue == '0') { Z.tooltipsVisible = false; }
								break;
							case 'zHelpVisible' :  // '0'=hide, '1'=show (default), '2'=hide toolbar help, show annotation & markup help, '3'=reverse.
								Z.helpVisible = parseInt(pValue, 10);
								break;
								
							case 'zNavigatorRectangleColor' :  // Valid web color, '#' character permitted but not required.
								Z.navigatorRectangleColor = pValue;
								break;

							case 'zSkinPath' :
								Z.skinPath = pValue;
								break;

							default :
								if (!proParamsEnabled) {
									alert(proParamsDisabledAlert + ' ' +pName);
								} else {
									switch (pName) {
										case 'zZoomSpeed' : // '1'=slow to '10'=fast, default is '5'.
											Z.zoomSpeed = parseInt(pValue, 10);
											break;
										case 'zPanSpeed' :  // '1'=slow to '10'=fast, default is '5'.
											Z.panSpeed = parseInt(pValue, 10);
											break;
										case 'zFadeInSpeed' : // '1'=slow to '10'=fast, default is '5', '0' = no fade-in.
											Z.fadeInSpeed = parseInt(pValue, 10);
											break;

										case 'zClickZoom' :  // '0'=disable, '1'=enable (default).
											if (pValue == '0') { Z.clickZoom = false; }
											break;
										case 'zDoubleClickZoom' :  // '0'=disable, '1'=enable (default).
											if (pValue == '0') { Z.doubleClickZoom = false; }
											break;
										case 'zDoubleClickDelay' : // '600'=slow to '200'=fast, default is '350'.
											Z.doubleClickDelay = parseInt(pValue, 10);
											break;
										case 'zClickPan' :  // '0'=disable, '1'=enable (default).
											if (pValue == '0') { Z.clickPan = false; }
											break;
										case 'zMousePan' :  // '0'=disable, '1'=enable (default).
											if (pValue == '0') { Z.mousePan = false; }
											break;
										case 'zKeys' :  // '0'=disable, '1'=enable (default).
											if (pValue == '0') { Z.keys = false; }
											break;								
										case 'zMessagesVisible' :  // '0'=hide, '1'=show (default).
											Z.messagesVisible = parseInt(pValue, 10);
											break;
										case 'zConstrainPan' :  // '0'=false, '1'=true (default), '2'=strict (constrain trailing edge of image to far edge of display rather than center of display area).
											Z.constrainPan = (pValue == '0') ? false : true;
											Z.constrainPanStrict = (pValue == '2') ? true : false;
											break;	
										case 'zPanBuffer' :  // '1'=none, '1.5' (default), '2'=double, '3'=impractical. Does not affect mobile value (always 1, none). Will not override canvasSizeMax based on limit for image sets, limit for Firefox due to unconverted image use, or general browser limit.
											var panBuffTest = parseFloat(pValue);
											if (!isNaN(panBuffTest)) { Z.panBuffer = panBuffTest; }
											break;
											
										case 'zSmoothPan' :  // '0'=false, '1'=true (default).
											if (pValue == '0') { Z.smoothPan = false; }
											break;
										case 'zSmoothPanEasing' : // '1'=direct, '2'=fluid (default), '3'=gentle, '4'=relaxed, '5'=loose;
											var easingValue = parseInt(pValue, 10);
											if (easingValue >= 1 && easingValue <= 5) { Z.smoothPanEasing = easingValue; }
											break;
										case 'zSmoothPanGlide' : // '1'=none, '2'=fluid (default), '3'=gentle, '4'=relaxed, '5'=loose;
											var glideValue = parseInt(pValue, 10);
											if (glideValue >= 1 && glideValue <= 5) { Z.smoothPanGlide = glideValue; }
											break;
											
										case 'zAutoResize' :  // '0'=false, '1'=true (default).
											if (pValue == '0') { Z.autoResize = false; }
											break;

										case 'zCanvas' :  // '0'=false, '1'=true (default).
											if (pValue == '0') { Z.canvas = false; }
											// Use canvas if supported by browser and not disabled by parameter.
											if (!Z.canvasSupported || !Z.canvas) { Z.useCanvas = false; }
											break;
										case 'zDebug' :  // '0'=disable (default), '1'=enable, '2'=enable with tile name labels and tracing.
											Z.debug = parseInt(pValue, 10);
											break;

										case 'zImageProperties' :
											Z.imageProperties = pValue;
											break;

										case 'zNavigatorWidth' : // Size in pixels, default is 150, useful max is thumbnail width.
											if (!isNaN(parseInt(pValue, 10))) { Z.navigatorW = parseInt(pValue, 10); }
											break;
										case 'zNavigatorHeight' : // Size in pixels, default is 150, useful max is thumbnail height.
											if (!isNaN(parseInt(pValue, 10))) { Z.navigatorH = parseInt(pValue, 10); }
											break;
										case 'zNavigatorLeft' : // Position in pixels, default is 0.
											if (!isNaN(parseInt(pValue, 10))) { Z.navigatorL = parseInt(pValue, 10); }
											break;
										case 'zNavigatorTop' : // Position in pixels, default is 0.
											if (!isNaN(parseInt(pValue, 10))) { Z.navigatorT = parseInt(pValue, 10); }
											break;
										case 'zNavigatorFit' :  // '0'= fit to viewer (default), '1'= fit to image.
											if (!isNaN(parseFloat(pValue))) { Z.navigatorFit = parseInt(pValue, 10); }
											break;

										case 'zToolbarPosition' :  // '0'=top, '1'=bottom (default).
											Z.toolbarPosition = parseInt(pValue, 10);
											break;
										case 'zLogoCustomPath' :
											Z.logoCustomPath = pValue;
											break;

										case 'zRotationVisible' :  // '0'=false (default), '1'=true.
											if (pValue == '1') { Z.rotationVisible = true; }
											break;
										case 'zInitialRotation' : // '90', '180', '270' supported, other values constrained, default is '0'.
											if (!isNaN(parseFloat(pValue))) {
												Z.initialR = parseInt(pValue, 10);
											}
											break;

										case 'zVirtualPointerVisible' :  // '0'=false (default), '1'=true.
											if (pValue == '1') { Z.virtualPointerVisible = true; }
											break;
										case 'zCrosshairsVisible' :  // '0'=false (default), '1'=true.
											if (pValue == '1') { Z.crosshairsVisible = true; }
											break;

										case 'zMeasureVisible' :  // '0'=false (default), '1'=true.
											if (pValue == '1') { 
												Z.measureVisible = true;
											} else {
												Z.measureVisible = false; 
											}
											break;
											
										case 'zCaptionTextColor' :  // Valid web color, '#' character not required but permitted.
											Z.captionTextColor = Z.Utils.stringValidateColorValue(pValue);
											Z.captionsColorsDefault = false;
											break;
										case 'zCaptionBackColor' :  // Valid web color, '#' character not required but permitted.
											Z.captionBackColor = Z.Utils.stringValidateColorValue(pValue);
											Z.captionsColorsDefault = false;
											break;
										case 'zPolygonLineColor' :  // Valid web color, '#' character not required but permitted.
											Z.polygonLineColor = Z.Utils.stringValidateColorValue(pValue);
											break;
										case 'zPolygonFillColor' :  // Valid web color, '#' character not required but permitted.
											Z.polygonFillColor = Z.Utils.stringValidateColorValue(pValue);
											break;											
										case 'zCaptionTextVisible' :  // '0'=false, '1'=true (default).
											if (pValue == '0') { Z.captionTextVisible = false; }
											break;											
										case 'zCaptionBackVisible' :  // '0'=false, '1'=true (default).
											if (pValue == '0') { Z.captionBackVisible = false; }
											break;											
										case 'zPolygonLineVisible' :  // '0'=false, '1'=true (default).
											if (pValue == '0') { Z.polygonLineVisible = false; }
											break;											
										case 'zPolygonFillVisible' :  // '0'=false, '1'=true (default).
											if (pValue == '0') { Z.polygonFillVisible = false; }
											break;

										case 'zRulerVisible' :  // '0'=hide, '1'=show, '2'= initially show then hide on mouse-out (default), '3'=initially hide then show when mouse over.
											Z.rulerVisible = parseInt(pValue, 10);
											break;
										case 'zRulerListType' : // '0'=hide, '1'=magnifications, '2'=percents (default).
											if (this.stringValidate(pValue)) { Z.rulerListType = pValue; }
											break;
										case 'zRulerWidth' : // Size in pixels, default is 150.
											if (!isNaN(parseInt(pValue, 10))) { Z.rulerW = parseInt(pValue, 10); }
											break;
										case 'zRulerHeight' : // Size in pixels, default is 50.
											if (!isNaN(parseInt(pValue, 10))) { Z.rulerH = parseInt(pValue, 10); }
											break;
										case 'zRulerLeft' : // Position in pixels, default is 0.
											if (!isNaN(parseInt(pValue, 10))) { Z.rulerL = parseInt(pValue, 10); }
											break;
										case 'zRulerTop' : // Position in pixels, default is 0.
											if (!isNaN(parseInt(pValue, 10))) { Z.rulerT = parseInt(pValue, 10); }
											break;											
										case 'zUnits' : // Options: 'Ym', 'Zm', 'Em', 'Pm', 'Tm', 'Gm', 'Mm', 'km', 'hm', 'dam', 'm', 'dm', 'cm', 'mm', 'um', 'nm', 'pm', 'fm', 'am', 'zm', 'ym', 'pixels' (default).
											if (this.stringValidate(pValue)) { Z.units = pValue; }
											break;
										case 'zUnitsPerImage' :
											if (!isNaN(parseFloat(pValue))) { Z.unitsPerImage = parseFloat(pValue); }
											break;
										case 'zPixelsPerUnit' :
											if (!isNaN(parseFloat(pValue))) { Z.pixelsPerUnit = parseFloat(pValue); }
											break;
										case 'zSourceMagnification' :
											if (!isNaN(parseInt(pValue, 10))) { Z.sourceMagnification = parseInt(pValue, 10); }
											break;
										case 'zMagnification' :  // Deprecated. Replaced with the above for clarity.
											alert(Z.Utils.getResource('ERROR_PARAMETERDEPRECATED') + ' zMagnification is now zSourceMagnification');
											break;

										case 'zWatermarkPath' :
											Z.watermarkPath = pValue;
											break;
										case 'zCopyrightPath' :
											Z.copyrightPath = pValue;
											break;

										case 'zCoordinatesVisible' :  // '0'=false (default), '1'=true.
											if (pValue == '1') { Z.coordinatesVisible = true; }
											break;

										case 'zHotspotPath' :
											Z.hotspotPath = Z.Utils.stringRemoveTrailingSlashCharacters(pValue);
											Z.hotspotFolder = Z.hotspotPath;
											if (Z.hotspotPath.toLowerCase().substring(Z.hotspotPath.length - 4, Z.hotspotPath.length) == '.xml') {
												Z.hotspotFolder = Z.hotspotFolder.substring(0, Z.hotspotFolder.lastIndexOf('/'));
											}
											Z.hotspots = true;
											break;
										case 'zHotspotListTitle' :
											Z.hotspotListTitle = pValue;
											break;											
										case 'zHotspotsDrawOnlyInView' :  // '0'=false, '1'=true (default).
											if (pValue == '0') { Z.hotspotsDrawOnlyInView = false; }
											break;
										case 'zCaptionBoxes' :  // '0'=false (default), '1'=true.
											if (pValue == '1') { Z.captionBoxes = true; }
											break;

										case 'zScreensaver' :  // '0'=false (default), '1'=true.
											if (pValue == '1') { 
												Z.screensaver = true;
												Z.tour = true;
											}
											break;
										case 'zScreensaverSpeed' : // '1'=slow to '10'=fast, default is '5', '0' = no zoom-and-pan transition.
											Z.screensaverSpeed = parseInt(pValue, 10);
											break;

										case 'zTourPath' :
											Z.tourPath = Z.Utils.stringRemoveTrailingSlashCharacters(pValue);
											Z.hotspotPath = Z.tourPath;
											Z.hotspotFolder = Z.hotspotPath;
											if (Z.hotspotPath.toLowerCase().substring(Z.hotspotPath.length - 4, Z.hotspotPath.length) == '.xml') {
												Z.hotspotFolder = Z.hotspotFolder.substring(0, Z.hotspotFolder.lastIndexOf('/'));
											}
											Z.tour = true;
											break;
										case 'zTourListTitle' :
											Z.tourListTitle = pValue;
											break;

										case 'zSlidePath' :
											Z.slidePath = Z.Utils.stringRemoveTrailingSlashCharacters(pValue);
											Z.slideshow = true;
											break;
										case 'zSlideListTitle' :
											Z.slideListTitle = pValue;
											break;
																								
										case 'zAnimationPath' :
											Z.imageSetPath = Z.Utils.stringRemoveTrailingSlashCharacters(pValue);
											Z.imageSet = true;
											Z.animation = true;
											if (!Z.mouseWheelParmeterProvided) {
												Z.mouseWheel = parseInt(this.getResource('DEFAULT_MOUSEWHEELANIMATION'), 10);
												Z.sliderFocus = (Z.mouseWheel == 2) ? 'imageSet' : 'zoom';
											}
											break;
										case 'zImageSetSliderVisible' :  // '0'=false, '1'=true (default).
											if (pValue == '0') { Z.sliderImageSetVisible = false; }
											break;														
										case 'zMouseWheel' : // '0'=disabled, '1'=zoom priority (default), '2'=image set priority.
											Z.mouseWheel = parseInt(pValue, 10);
											Z.sliderFocus = (Z.mouseWheel == 2) ? 'imageSet' : 'zoom';
											break;

										case 'zTilesPNG' :   // '0'=false (default, jpeg), '1'=true.
											if (pValue == '1') { Z.tileType = 'png'; }
											break;
										case 'zTileW' :
											Z.tileW = parseInt(pValue, 10);
											break;
										case 'zTileH' :
											Z.tileH = parseInt(pValue, 10);
											break;

										default : 
											if (!enterpriseParamsEnabled) {
												alert(enterpriseParamsDisabledAlert + ' ' +pName);											
											} else {
												switch (pName) {

													case 'zLabelClickSelect' :  // '0'=false (default), '1'=true.
														if (pValue == '1') { Z.labelClickSelect = true; }
														break;
														
													case 'zMaskVisible' :  // '0'=false (default), '1'=true.
														if (pValue == '1') { Z.maskVisible = true; }
														break;
													case 'zMaskFadeSpeed' : // '1'=slow to '10'=fast, default is '5', '0' = no fade-in.
														Z.maskFadeSpeed = parseInt(pValue, 10);
														break;
													case 'zMaskClearOnUserAction' : // '0'=false, '1'=true (default).
														if (pValue == '0') { Z.maskClearOnUserAction = false; }
														break;
														
													default :
														if (Z.specialStorageEnabled == specialStorageDisableValue) {
															alert(specialStorageDisabledAlert + ' ' +pName);											
														} else {
															switch (pName) {										

																case 'zServerIP' :
																	Z.serverIP = pValue;
																	break;
																case 'zServerPort' :
																	Z.serverPort = pValue;
																	break;
																case 'zTileHandlerPath' :
																	Z.tileHandlerPath = pValue;
																	break;

																case 'zImageW' :
																	Z.imageW = parseInt(pValue, 10);
																	Z.imageCenterX = Z.imageW / 2;
																	break;
																case 'zImageH' :
																	Z.imageH = parseInt(pValue, 10);
																	Z.imageCenterY = Z.imageH / 2;
																	break;

																// Deprecated: Use zSourceMagnification.
																/*case 'zMagnification' :
																	Z.sourceMagnification = parseInt(pValue, 10);
																	break;*/

																case 'zFocal' :
																	Z.focal = parseInt(pValue, 10);
																	break;
																case 'zQuality' :
																	Z.quality = parseInt(pValue, 10);
																	break;

															}
														}
												}
											}									
									}
								}
								break;
						}
					}
				}
			}
		}
		
		// Process or disallow special paths for annotation features.
		if (Z.Utils.stringValidate(Z.annotationPath) || Z.Utils.stringValidate(Z.saveHandlerPath) || Z.Utils.stringValidate(Z.saveImageHandlerPath)) {
			if (enterpriseParamsEnabled) {
				if (Z.Utils.stringValidate(Z.saveHandlerPath)) {
					// Build full save handler paths.
					var sHPF = Z.saveHandlerPath;
					var sIHPF = Z.saveImageHandlerPath;

					// DEV NOTE: JavaScript cross-domain block conflicts with specifying server IP and port.
					//if (sHPF.substr(0,1) != '/') { sHPF = '/' + sHPF; }
					//if (Z.serverPort != '80') { sHPF = ':' + Z.serverPort + sHPF; }
					//sHPF = Z.serverIP + sHPF;
					//if (sIHPF.substr(0,1) != '/') { sIHPF = '/' + sIHPF; }
					//if (Z.serverPort != '80') { sIHPF = ':' + Z.serverPort + sIHPF; }
					//sIHPF = Z.serverIP + sIHPF;

					Z.saveHandlerPath = sHPF;
					Z.saveImageHandlerPath = sIHPF;
				}
			} else {
				Z.annotationPath = '';
				alert(enterpriseParamsDisabledAlert);
			}
		}
		
		Z.Utils.validateImagePath();
	},
	
	resetParametersXYZ : function (params) {
		if (!isNaN(parseFloat(this.getResource('DEFAULT_INITIALX')))) { Z.initialX = parseFloat(this.getResource('DEFAULT_INITIALX')); }
		if (!isNaN(parseFloat(this.getResource('DEFAULT_INITIALY')))) { Z.initialY = parseFloat(this.getResource('DEFAULT_INITIALY')); }
		if (!isNaN(parseFloat(this.getResource('DEFAULT_INITIALZOOM')))) { Z.initialZ = parseFloat(this.getResource('DEFAULT_INITIALZOOM')); }
		if (!isNaN(parseFloat(this.getResource('DEFAULT_MINZOOM')))) { Z.minZ = parseFloat(this.getResource('DEFAULT_MINZOOM')); }
		if (!isNaN(parseFloat(this.getResource('DEFAULT_MAXZOOM')))) { Z.maxZ = parseFloat(this.getResource('DEFAULT_MAXZOOM')); }
				
		if (this.stringValidate(params)) {
			for (var i = 0, j = params.length; i < j; i++) {
				var nameValuePair = params[i];
				var sep = nameValuePair.indexOf('=');
				if (sep > 0) {
					var pName = nameValuePair.substring(0, sep)
					var pValue = nameValuePair.substring(sep + 1)
					if (this.stringValidate(pValue)) {
						switch (pName) {						
							case 'zInitialX' : // Default is null (centered).
								if (!isNaN(parseFloat(pValue))) { Z.initialX = parseFloat(pValue); }
								break;
							case 'zInitialY' : // Default is null (centered).
								if (!isNaN(parseFloat(pValue))) { Z.initialY = parseFloat(pValue); }
								break;
							case 'zInitialZoom' : // '1' to '100' recommended range (internally 0.1 to 1). Special inputs are 'fit' (default, zoom-to-fit in view area) and 'fill' (zoom-to-fill view area). Input value of -1 for zoom-to-fit is deprecated.
								if (pValue == 'fit') { pValue = '-1'; }
								if (pValue == 'fill') { pValue = '0'; }
								if (!isNaN(parseFloat(pValue))) {
									Z.initialZ = parseFloat(pValue);
									if (Z.initialZ && Z.initialZ > 0 && Z.initialZ <= 100) { Z.initialZ /= 100; }
								}
								break;
							case 'zMinZoom' : // '1' to '100' recommended range (internally 0.1 to 1). Special inputs are 'fit' (default, zoom-to-fit in view area) and 'fill' (zoom-to-fill view area). Input value of -1 for zoom-to-fit is deprecated.
								if (pValue == 'fit') { pValue = '-1'; }
								if (pValue == 'fill') { pValue = '0'; }								
								if (!isNaN(parseFloat(pValue))) {
									Z.minZ = parseFloat(pValue);
									if (Z.minZ && Z.minZ > 0 && Z.minZ <= 100) { Z.minZ /= 100; }
								}
								break;
							case 'zMaxZoom' : // '1' to '100' recommended range (internally 0.1 to 1), default is 1 (100%).
								if (!isNaN(parseFloat(pValue))) {
									Z.maxZ = parseFloat(pValue);
									if (Z.maxZ && Z.maxZ != -1) { Z.maxZ /= 100; }
								}
								break;
						}
					}
				}
			}
		}
	},
	
	// Process or disallow special paths for storage options.
	validateImagePath : function (imageSetPath) {
		var imgPath = (typeof imageSetPath !== 'undefined' && Z.Utils.stringValidate(imageSetPath)) ? imageSetPath : Z.imagePath;
		if (imgPath !== null) {
			var specialStorageDisabledAlert = this.getResource('DEFAULT_SPECIALSTORAGESUPPORTDISABLEDALERT');
			if (imgPath.toLowerCase().indexOf('.zif') != -1) {
				if (Z.zifSupported) {
					Z.tileSource = 'ZoomifyImageFile';
					Z.Utils.validateResponseArrayFunctionality();
				} else {
					alert(this.getResource('ALERT_ZIFREQUIRESNEWERBROWSER'));
				}
			
			} else if (imgPath.toLowerCase().indexOf('.jpg') != -1 || imgPath.toLowerCase().indexOf('.png') != -1) {
				Z.tileSource = 'unconverted';				
				
			} else if (!Z.Utils.stringValidate(Z.tileHandlerPath)) {
				Z.tileSource = 'ZoomifyImageFolder';

			}
			
		} else if (Z.imageSet || Z.slideshow) {
			Z.tileSourceMultiple = true;
		}
	},
	
	clearImageParameters : function () {
		Z.imagePath = null;
		Z.parameters = null;
		Z.initialX = null;
		Z.initialY = null;
		Z.initialZ = null;
		Z.minZ = null;
		Z.maxZ = null;
		Z.hotspots = false;
		Z.hotspotPath = null;
		Z.hotspotFolder = null;
		Z.tour = false;
		Z.tourPath = null;
		Z.tourPlaying = null;
		Z.tourStop = false;
		
		// Resetting image in slideshow must not clear slideshow parameters.
		//Z.slideshow = false;
		//Z.slidePath = null;
		//Z.slideshowPlaying = null;
		
		Z.annotations = false;
		Z.annotationPath = null;
		Z.annotationPanelVisible = null;
		Z.annotationFolder = null;
		Z.annotationJSONObject = null;
		Z.annotationXMLText = null;
		Z.annotationsAddMultiple = null;
		Z.annotationsAutoSave = null;
		Z.postingXML = false;
		Z.postingImage = false;
		Z.initialR = null;
		Z.unitsPerImage = null;
		Z.pixelsPerUnit = null;
		Z.sourceMagnification = null;
		Z.imageProperties = null;
		Z.tileW = null;
		Z.tileH = null;
		Z.tileType = 'jpg';
		Z.annotationPathProvided = false;
		Z.imageSetPathProvided = false;
		Z.tileSource = null;
		Z.tileSourceMultiple = null;
		Z.focal = null;
		Z.quality = null;	
		Z.markupMode = null;
		Z.editMode = null;
		Z.editing = null;
		Z.labelMode = 'view';
		Z.editModePrior = Z.editMode;
		Z.sliderFocus = 'zoom';
		Z.animation = false;
		Z.animationPath = null;
		Z.animationCount = 0;
		Z.animationAxis = null;
		Z.animator = null;
		Z.slidestack = false;
		Z.slidestackPath = null;
		Z.imageSet = false;
		Z.imageSetPath = null;
		Z.imageSetLength = null;
		Z.sliderImageSetVisible = null;
		Z.imageSetSliderVisible = null; // Deprecated. Now Z.sliderImageSetVisible. HTML parameter still zImageSetSliderVisible. This set here to prevent specific error message in function setParameters.
		Z.mouseWheelParmeterProvided = null;
		Z.mouseWheel = null;
		Z.imageSetHotspotPath = null;
		Z.hotspotFileShared = false;
		Z.imageSetAnnotationPath = null;
		Z.annotationFileShared = false;
		Z.imageW = null;
		Z.imageH = null;
		Z.imageCenterX = null;
		Z.imageCenterY = null;
		Z.imageX = 0;
		Z.imageY = 0;
		Z.imageZ = 0;
		Z.imageR = 0;
		Z.priorX = 0;
		Z.priorY = 0;
		Z.priorZ = 0;
		Z.priorR = 0;
		Z.fitZ = null;
		Z.fillZ = null;
		Z.zooming = 'stop';
		Z.panningX = 'stop';
		Z.panningY = 'stop';
		Z.fullView = false;
		Z.fullViewPrior = false;
	},	
	
	getResource : function (resName) {
		// Access default values, constants, and localizable strings (tooltips, messages, errors).
		var resTxt = '';
		switch(resName) {				
			case 'DEFAULT_EXPRESSPARAMETERSENABLETEST' :
				// Use 'Enable Express parameters' to enable Express parameter support and value of DEFAULT_EXPRESSPARAMETERSDISABLEVALUE to disable.
				resTxt = 'Enable Express parameters';
				//resTxt = 'Changing This Violates License Agreement';
				break;
			case 'DEFAULT_EXPRESSPARAMETERSDISABLEVALUE' :
				resTxt = 'Changing This Violates License Agreement';
				break;
			case 'DEFAULT_EXPRESSPARAMETERSDISABLEDALERT' :
				resTxt = 'Support for this parameter is enabled only in the Zoomify Image Viewer included in the Zoomify HTML5 Express, Pro, and Enterprise editions: ';
				break;
				
			case 'DEFAULT_PROPARAMETERSENABLETEST' :
				// Use 'Enable Pro parameters' to enable Pro parameter support and value of DEFAULT_PARAMETERSDISABLEVALUE to disable.
				resTxt = 'Enable Pro parameters';
				//resTxt = 'Changing This Violates License Agreement';
				break;
			case 'DEFAULT_PROPARAMETERSDISABLEVALUE' :
				resTxt = 'Changing This Violates License Agreement';
				break;
			case 'DEFAULT_PROPARAMETERSDISABLEDALERT' :
				resTxt = 'Support for this parameter is enabled only in the Zoomify Image Viewer included in the Zoomify HTML5 Pro and Enterprise editions: ';
				break;

			case 'DEFAULT_SPECIALSTORAGESUPPORTENABLETEST' :
				// Use 'Enable special storage support' to enable Enterprise PFF and other special storage support and value of DEFAULT_SPECIALSTORAGESUPPORTDISABLEVALUE to disable.
				//resTxt = 'Enable special storage support';
				resTxt = 'Changing this violates License Agreement';
				break;
			case 'DEFAULT_SPECIALSTORAGESUPPORTDISABLEVALUE' :
				resTxt = 'Changing this violates License Agreement';
				break;
			case 'DEFAULT_SPECIALSTORAGESUPPORTDISABLEDALERT' :
				resTxt = 'Support for Zoomify Image File (PFF) storage and other special storage options is enabled only in the Zoomify Image Viewer included in the Zoomify HTML5 Enterprise edition.';
				break;

			case 'DEFAULT_ENTERPRISEPARAMETERSENABLETEST' :
				// Use 'Enable Enterprise parameters' to enable Enterprise parameter support and value of DEFAULT_ENTERPRISEPARAMETERSDISABLEVALUE to disable.
				//resTxt = 'Enable Enterprise parameters';
				resTxt = 'Changing this violates License Agreement';
				break;
			case 'DEFAULT_ENTERPRISEPARAMETERSDISABLEVALUE' :
				resTxt = 'Changing this violates License Agreement';
				break;
			case 'DEFAULT_ENTERPRISEPARAMETERSDISABLEDALERT' :
				resTxt = 'Support for this parameter is enabled only in the Zoomify Image Viewer included in the Zoomify HTML5 Enterprise edition: ';
				break;

			case 'DEFAULT_HEADERSTARTBYTE' :
				resTxt = '0';
				break;
			case 'DEFAULT_HEADERENDBYTEZIF' :
				resTxt = '8192';
				break;
			case 'DEFAULT_CHUNKSIZE' :
				// Number of offsets or byte counts to request when one is needed.  Offsets
				// are 8 bytes each while byte counts are 4 bytes each.
				resTxt = '1024';
				break;

			case 'DEFAULT_TILEW' :
				resTxt = '256';
				break;
			case 'DEFAULT_TILEH' :
				resTxt = '256';
				break;
			case 'DEFAULT_IMAGESLOADINGMAX' :
				resTxt = '300';
				break;
			case 'DEFAULT_IMAGELOADTIMEOUT' :
				resTxt = '60000';	// 60 seconds.
				break;
			case 'DEFAULT_IMAGELOADQUEUEDELAY' :
				resTxt = '100';	// 1 tenth of a second.
				break;
			case 'DEFAULT_TIERSMAXSCALEUP' :
				resTxt = '1.15';
				break;
			case 'DEFAULT_TILESMAXCACHE' :
				// Alternative implementation: reduce cache max on mobile devices. Currently not implemented because RAM less limited than bandwidth.
				//if (!Z.mobileDevice) {
					resTxt = '300';	// At average 10K / tile, average 3MB max cache - 30MB if stored uncompressed - plus whatever browser caches by default.
				//} else {
				//	resTxt = '50';	// At average 10K / tile, average 0.5MB max cache - 5MB if stored uncompressed - plus whatever browser caches by default.
				//}
				break;
			case 'DEFAULT_BACKFILLTHRESHOLD3' :
				resTxt = '6';
				break;
			case 'DEFAULT_BACKFILLDYNAMICADJUST' :
				resTxt = '3';
				break;
			case 'DEFAULT_BACKFILLTHRESHOLD2' :
				resTxt = '5';
				break;
			case 'DEFAULT_BACKFILLCHOICE2' :
				resTxt = '3';
				break;
			case 'DEFAULT_BACKFILLTHRESHOLD1' :
				resTxt = '3';
				break;
			case 'DEFAULT_BACKFILLCHOICE1' :
				resTxt = '2';
				break;
			case 'DEFAULT_BACKFILLCHOICE0' :
				resTxt = '0';
				break;
			case 'DEFAULT_PANBUFFER' :
				// Typical display area dimensions of 900 x 550 pixels requires 12 tiles (4 x 3)
				// if pan buffer set to 1 (no buffer), 24 tiles (6 x 4) if set to 1.5, and 40 (8 x 5)
				// if set to 2.  If zoomed between tiers needed tiles can double or triple (rare).
				if (!Z.mobileDevice) {
					resTxt = '1.5';
				} else {
					resTxt = '1';
				}
				// Enlarge tile buffer if rotation enabled.
				if (Z.rotationVisible) { resTxt = '2'; }
				break;
			case 'DEFAULT_PANBUFFERUNCONVERTED' :
				// Larger buffer area used if viewing unconverted image and not on mobile device. Buffer constrained in function 
				// setSizeAndPosition based on Z.imageSet and whether browser is Firefox, general browser limit, and image size.
				if (!Z.mobileDevice) {
					resTxt = '10';
				} else {
					resTxt = (Z.rotationVisible)  ? '2' : '1';
				}
				break;
			case 'DEFAULT_PAN_BUFFERSIZEMAXBROWSER' :
				resTxt = '10000';
				break;
			case 'DEFAULT_PAN_BUFFERSIZEMAXFIREFOX' :
				resTxt = '4000';
				break;
			case 'DEFAULT_PAN_BUFFERSIZEMAXIMAGESET' :
				resTxt = '1000';
				break;		
			case 'DEFAULT_BACKFILLBUFFER' :
				// Implemented for images with 7 or more tiers where tier 3 backfill is insufficient to hide tile gaps and where deep zoom would
				// cause scaling of tier 3 to exceed maximum size supported by browsers. See additional notes in function scaleTierToZoom.
				if (!Z.mobileDevice) {
					resTxt = '2';
				} else {
					resTxt = '1';
				}
				break;
			case 'DEFAULT_CANVAS' :  // '0'=false, '1'=true.
				resTxt = '1';
				break;
			case 'DEFAULT_UIELEMENTBASEZINDEX' :  // Toolbar, Navigator, and Annotation Panel add 1, 2, and 3 to base, respectively.
				resTxt = '2000';
				break;
				
			case 'DEFAULT_VALIDATEVIEWRETRYLIMIT' : 
				resTxt = '2';
				break;
			case 'DEFAULT_VALIDATEVIEWRETRYDELAY' : 
				resTxt = '1000';
				break;

			case 'DEFAULT_DEBUG' :  // '0'=disable, '1'=enable, '2'=enable with tile name labels and tracing, '3'=enable without tile names or tracing but with validate view tile loading values.
				resTxt = '0';
				break;

			case 'DEFAULT_PANSPEED' :
				resTxt = '5'; // '1'=slow to '10'=fast, default is '5'.
				break;
			case 'DEFAULT_PANSTEPDISTANCE' :
				resTxt = '10'; // 5 * 10 = 50 pixel step per 0.1 second interval.
				break;
			case 'DEFAULT_ZOOMSPEED' :
				resTxt = '5'; // '1'=slow to '10'=fast, default is '5'.
				break;
			case 'DEFAULT_ZOOMSTEPDISTANCE' :
				resTxt = '0.02'; // 5 * 0.02 = .1 percent step default.
				break;
			case 'DEFAULT_ZAPSTEPDURATION' :
				resTxt = '30';  // Milliseconds.
				break;
			case 'DEFAULT_ZAPTVSTEPS' :
				resTxt = '20'; // 800 / 20 = 0.04 seconds per step default with variable distance per step.
				break;
			case 'DEFAULT_ZAPTVDURATION' :
				resTxt = '800'; // 800 / 20 = 0.04 seconds per step default with variable distance per step.
				break;
			case 'DEFAULT_CLICKZOOMTIERSKIPTHRESHOLD' :
				resTxt = '0.2';  // % of zoom delta from exact next tier.
				break;
			case 'DEFAULT_GESTURETESTDURATION' :
				resTxt = '10';  // Milliseconds.
				break;
				
			case 'DEFAULT_AUTORESIZESKIPDURATION' :
				resTxt = '10'; // Milliseconds.
				break;
				
			case 'DEFAULT_MOUSEWHEEL' :
				resTxt = '1';  // '0'=disabled, '1'=zoom priority (default), '2'=image set priority.
				break;
			case 'DEFAULT_MOUSEWHEELANIMATION' :
				resTxt = '1';  // '0'=disabled, '1'=zoom priority (default), '2'=image set priority.
				break;
			case 'DEFAULT_MOUSEWHEELSLIDESTACK' :
				resTxt = '1';  // '0'=disabled, '1'=zoom priority (default), '2'=image set priority.
				break;
			case 'DEFAULT_MOUSEWHEELCOMPLETEDURATION' :
				resTxt = '300'; // Milliseconds.
				break;
			case 'DEFAULT_FADEINSPEED' :
				resTxt = '5'; // '1'=slow to '10'=fast, default is '5'.
				break;
			case 'DEFAULT_FADEINSTEP' :
				resTxt = '0.067'; // 0.067 * default fade in speed of 5 = 0.335 x 3 steps to get over 1, at 50 milliseconds per step = 0.2 seconds to fade-in.
				break;

			case 'DEFAULT_KEYS' :
				resTxt = '1'; // '0'=disable, '1'=enable (default).
				break;
			case 'DEFAULT_MOUSEPAN' :
				resTxt = '1'; // '0'=disable, '1'=enable (default).
				break;
			case 'DEFAULT_CLICKPAN' :
				resTxt = '1'; // '0'=disable, '1'=enable (default).
				break;
			case 'DEFAULT_CLICKZOOM' :
				resTxt = '1'; // '0'=disable, '1'=enable (default).
				break;
			case 'DEFAULT_DOUBLECLICKZOOM' :
				resTxt = '1'; // '0'=disable, '1'=enable (default).
				break;
			case 'DEFAULT_DOUBLECLICKDELAY' :
				resTxt = '250'; // Milliseconds.
				break;			
			case 'DEFAULT_CONSTRAINPAN' :
				resTxt = '1'; // '0'=false, '1'=true (default).
				break;
			case 'DEFAULT_CONSTRAINPANSTRICT' :
				resTxt = '0'; // '0'=false (default), '1'=true.
				break;
			case 'DEFAULT_SMOOTHPAN' :
				resTxt = '1'; // '0'=false, '1'=true (default).
				break;
			case 'DEFAULT_SMOOTHPANEASING' :
				resTxt = '2'; // '1'=direct, '2'=fluid (default), '3'=gentle, '4'=relaxed, '5'=loose;
				break;
			case 'DEFAULT_SMOOTHPANGLIDE' :
				resTxt = '2'; // '1'=none, '2'=fluid (default), '3'=gentle, '4'=relaxed, '5'=loose;
				break;
				
			case 'DEFAULT_INITIALX' :
				resTxt = null;
				break;
			case 'DEFAULT_INITIALY' :
				resTxt = null;
				break;
			case 'DEFAULT_INITIALZOOM' :
				resTxt = null; // '0.01' to '0.5' recommended range, default is null (zoom-to-fit view area).
				break;
			case 'DEFAULT_MINZOOM' :
				resTxt = null; // '0.01' to '0.5' recommended range, default is null (zoom-to-fit view area).
				break;
			case 'DEFAULT_MAXZOOM' :
				resTxt = '1'; // '0.5' to '3' recommended range, default is '1' (100%).
				break;

			case 'DEFAULT_BACKGROUNDCOLOR' :
				resTxt = '#FBFAFA';
				break;
			case 'DEFAULT_BACKGROUNDCOLORNOALPHA' :
				resTxt = '#FBFAFA';
				break;
			case 'DEFAULT_BACKGROUNDCOLORLIGHT' :
				resTxt = '#FEFEFE';
				break;
			case 'DEFAULT_BACKGROUNDALPHA' :
				resTxt = '0.75';
				break;
			case 'DEFAULT_BACKGROUNSMALLDALPHA' :
				resTxt = '0.75';
				break;
			case 'DEFAULT_BUTTONBORDERCOLOR' :
				resTxt = '#C0C0C0';
				break;

			case 'DEFAULT_SKINXMLFILE' :
				resTxt = 'skinFiles.xml';
				break;
			case 'DEFAULT_SKINXMLPATH' :
				resTxt = 'Assets/Skins/Default';
				break;
			case 'DEFAULT_SKINMODE' :
				resTxt = '0'; // '0'=autoswitch if mobile device (default), '1'=always standard, '2'= always large.
				break;

			case 'DEFAULT_NAVIGATORVISIBLE' :
				resTxt = '2';  // '0'=hide, '1'=show, '2'=show/hide (default), '3'=hide/show.
				break;
			case 'DEFAULT_NAVIGATORWIDTH' :
				resTxt = '150'; // Pixels.
				break;
			case 'DEFAULT_NAVIGATORHEIGHT' :
				resTxt = '100'; // Pixels.
				break;
			case 'DEFAULT_NAVIGATORLEFT' :
				resTxt = '-1'; // Pixels from left viewport edge.
				break;
			case 'DEFAULT_NAVIGATORTOP' :
				resTxt = '-1'; // Pixels from top viewport edge.
				break;
			case 'DEFAULT_NAVIGATORFIT' :
				resTxt = null;
				break;
			case 'DEFAULT_NAVIGATORRECTANGLECOLOR' :
				resTxt = '#0000FF';
				break;

			case 'DEFAULT_TOOLBARVISIBLE' :
				resTxt = '4';  // '0'=hide, '1'=show, '2'=show/hide (default), '3'=hide/show, '4' & '5'=same as 2 and 3 but minimize rather than hiding. 8 hides toolbar and keeps it hidden (supports external toolbar with editing functions fully enabled). Note: minimize forced if setting is 2 or 3 and browser is on mobile device (no mouse-over).
				break;
			case 'DEFAULT_TOOLBARPOSITION' :
				resTxt = '1'; // '0'=top, '1'=bottom (default).
				break;
			case 'DEFAULT_TOOLTIPSVISIBLE' :
				resTxt = '1'; // '0'=false, '1'=true (default).
				break;
			case 'DEFAULT_HELPVISIBLE' :
				resTxt = '1'; // '0'=hide, '1'=show (default), '2'=hide toolbar help, show annotation & markup help, '3'=reverse.
				break;

			case 'DEFAULT_LOGOVISIBLE' :
				resTxt = '1'; // '0'=false, '1'=true (default).
				break;
			case 'DEFAULT_LOGOCUSTOMPATH' :
				resTxt = null;
				break;
			case 'DEFAULT_MINIMIZEVISIBLE' :
				resTxt = '1'; // '0'=false, '1'=true (default).
				break;
			case 'DEFAULT_SLIDERZOOMVISIBLE' :
				resTxt = '1'; // '0'=false, '1'=true (default).
				break;			
			case 'DEFAULT_SLIDERTESTDURATIONZOOM' :
				resTxt = '10';  // Milliseconds.
				break;
				
			case 'DEFAULT_PANBUTTONSVISIBLE' :
				resTxt = '1'; // '0'=false, '1'=true (default).
				break;
			case 'DEFAULT_RESETVISIBLE' :
				resTxt = '1'; // '0'=false, '1'=true (default).
				break;

			case 'DEFAULT_FULLVIEWVISIBLE' :
				resTxt = '1'; // '0'=false, '1'=true (default).
				break;
			case 'DEFAULT_FULLSCREENVISIBLE' :
				resTxt = '1'; // '0'=false, '1'=true (default).
				break;
			case 'DEFAULT_FULLVIEWBACKCOLOR' :
				resTxt = 'white';
				break;
			case 'DEFAULT_FULLPAGEVISIBLE' :
				resTxt = '0'; // '0'=false (default), '1'=true.
				break;
			case 'DEFAULT_INITIALFULLPAGE' :
				resTxt = '0'; // '0'=false (default), '1'=true.
				break;
				
			case 'DEFAULT_VIRTUALPOINTERPATH' :
				resTxt = 'Assets/VirtualPointer/virtualPointer.png';
				break;
				
			case 'DEFAULT_MEASUREVISIBLE' :
				// '0'=false (default), '1'=true.  False is default unless in markup or edit mode.
				if (typeof Z.parameters !== 'undefined' && Z.parameters !== null 
					&& (typeof Z.parameters.zMeasureVisible === 'undefined' || Z.parameters.zMeasureVisible != '0') 
					&& ((typeof Z.parameters.zMarkupMode !== 'undefined' && Z.parameters.zMarkupMode == '1')
					|| (typeof Z.parameters.zEditMode !== 'undefined' && Z.parameters.zEditMode == '1'))) {
						resTxt = '1';
				} else {
					resTxt = '0';
				}
				break;

			case 'DEFAULT_FULLVIEWEXITEXTERNALBUTTONCOLOR' :
				resTxt = '	#F8F8F8'; // Very light gray.
				break;

			case 'DEFAULT_ROTATIONVISIBLE' :
				resTxt = '0'; // '0'=false (default), '1'=true.
				break;
			case 'DEFAULT_INITIALR' :
				resTxt = '0'; // Degrees
				break;				

			case 'DEFAULT_PROGRESSVISIBLE' :
				resTxt = '1'; // '0'=false, '1'=true (default).
				break;
			case 'DEFAULT_PROGRESSDURATION' :
				resTxt = '500';  // Milliseconds.
				break;
			case 'DEFAULT_PROGRESSTEXT' :
				resTxt = ' ';  // Blank.
				break;
			case 'DEFAULT_PROGRESSTEXTCOLOR' :
				resTxt = '#000000'; // Black.
				break;
			case 'DEFAULT_MESSAGESVISIBLE' :
				resTxt = '1'; // '0'=false, '1'=true (default).
				break;

			case 'DEFAULT_SOURCEMAGNIFICATION' :
				resTxt = '40'; // Options: '2.5', '5', '10', '20', '40' (default), '60', '100'.
				break;
			case 'DEFAULT_UNITS' :
				resTxt = 'pixels'; // Options: 'Ym', 'Zm', 'Em', 'Pm', 'Tm', 'Gm', 'Mm', 'km', 'hm', 'dam', 'm', 'dm', 'cm', 'mm' (default), 'um', 'nm', 'pm', 'fm', 'am', 'zm', 'ym'.
				break;
				
			case 'DEFAULT_VIRTUALPOINTERVISIBLE' :
				resTxt = '0'; // '0'=false (default), '1'=true.
				break;
			case 'DEFAULT_CROSSHAIRSVISIBLE' :
				resTxt = '0'; // '0'=false (default), '1'=true.
				break;
				
			case 'DEFAULT_RULERVISIBLE' :
				resTxt = '0';  // '0'=hide (default), '1'=show, '2'=show/hide, '3'=hide/show.
				break;			
			case 'DEFAULT_RULERLISTTYPE' :
				resTxt = '2'; // '0'=hide, '1'=magnifications, '2'=percents (default).
				break;
			case 'DEFAULT_RULERTEXTFONTSIZE' :
				resTxt = '10';
				break;
			case 'DEFAULT_SCALEBARCOLOR' :
				resTxt = '#696969';
				break;
			case 'DEFAULT_RULERWIDTH' :
				resTxt = '150'; // Pixels.
				break;
			case 'DEFAULT_RULERHEIGHT' :
				resTxt = '30'; // Pixels.
				break;
			case 'DEFAULT_RULERLEFT' :
				resTxt = '-1';  // Pixels from left viewport edge.
				break;
			case 'DEFAULT_RULERTOP' :
				resTxt = '-1';  // Pixels from top viewport edge.
				break;
				
			case 'DEFAULT_COORDINATESVISIBLE' :
				resTxt = '0'; // '0'=false (default), '1'=true.
				break;				

			case 'DEFAULT_WATERMARKALPHA' :
				resTxt = '0.6';
				break;
			case 'DEFAULT_WATERMARKMINSCALE' :
				resTxt = '0.33';
				break;
			case 'DEFAULT_WATERMARKSPANW' :
				resTxt = '512'; // Horizontal image pixels per watermark.
				break;
			case 'DEFAULT_WATERMARKSPANH' :
				resTxt = '384'; // Vertical image pixels per watermark.
				break;
				
			case 'DEFAULT_SCREENSAVERSPEED' :
				resTxt = '5'; // '1'=slow to '10'=fast, default is '5'.
				break;
				
			case 'DEFAULT_MASKFADESPEED' :
				resTxt = '5'; // '1'=slow to '10'=fast, default is '5'.
				break;
			case 'DEFAULT_MASKFADESTEP' :
				resTxt = '0.05'; // 0.05 * default transition speed of 2 = 0.1 x 10 steps to get over 1, at 50 milliseconds per step = 0.5 seconds each to transition in out.
				break;
			case 'DEFAULT_MASKCLEARONUSERACTION' :
				resTxt = '1'; // '0'=false, '1'=true (default).
				break;

			case 'DEFAULT_COPYRIGHTSCREENCOLOR' :
				resTxt = '#D3D3D3';
				break;
			case 'DEFAULT_COPYRIGHTBUTTONCOLOR' :
				resTxt = '#FFFFFF';
				break;

			case 'DEFAULT_TOURSXMLFILE' :
				resTxt = 'destinations.xml';
				break;				
			case 'DEFAULT_TOURAUTOSTART' :
				resTxt = true;
				break;
			case 'DEFAULT_TOURAUTOLOOP' :
				resTxt = true;
				break;
				
			case 'DEFAULT_SLIDESXMLFILE' :
				resTxt = 'slides.xml';
				break;
			case 'DEFAULT_SLIDESHOWAUTOSTART' :
				resTxt = true;
				break;
			case 'DEFAULT_SLIDESHOWAUTOLOOP' :
				resTxt = true;
				break;
			case 'DEFAULT_SLIDELISTSOURCE' :
				resTxt = 'NAME';
				break;
			case 'DEFAULT_SLIDELISTWIDTH' :
				resTxt = '200';
				break;				
			case 'DEFAULT_SLIDELISTPOSITION' :
				resTxt = '2';
				break;
			case 'DEFAULT_SLIDETRANSITIONSPEED' :
				resTxt = '2'; // '1'=slow to '10'=fast, default is '5'.
				break;
			case 'DEFAULT_SLIDETRANSITIONSTEP' :
				resTxt = '0.05'; // 0.05 * default transition speed of 2 = 0.1 x 10 steps to get over 1, at 50 milliseconds per step = 0.5 seconds each to transition in out.
				break;
				
			case 'DEFAULT_MEASURECAPTIONWIDTH' :
				resTxt = '170';
				break;
			case 'DEFAULT_MEASURECAPTIONHEIGHT' :
				resTxt = '12';
				break;
			case 'DEFAULT_MEASURECAPTIONBACKOPACITY' :
				resTxt = '0.3';
				break;
			case 'DEFAULT_MEASURECAPTIONFONTSIZE' :
				resTxt = '11';
				break;
			
			case 'DEFAULT_HOTSPOTSXMLFILE' :
				resTxt = 'hotspots.xml';
				break;
			case 'DEFAULT_HOTSPOTCAPTIONPADDING' :
				resTxt = '6';
				break;
			case 'DEFAULT_HOTSPOTCAPTIONPADDINGCANVAS' :
				resTxt = '12';
				break;
			case 'DEFAULT_MINHOTSPOTCAPTIONPADDING' :
				resTxt = '2';
				break;
			case 'DEFAULT_MAXHOTSPOTCAPTIONPADDING' :
				resTxt = '7';
				break;
			case 'DEFAULT_HOTSPOTCAPTIONFONTSIZE' :
				resTxt = '14';
				break;
			case 'DEFAULT_MINHOTSPOTCAPTIONFONTSIZE' :
				resTxt = '3';
				break;
			case 'DEFAULT_MAXHOTSPOTCAPTIONFONTSIZE' :
				resTxt = '14';
				break;		
			case 'DEFAULT_FONTTOPIXELSCONVERSIONFACTOR' :
				resTxt = '1.8';
				break;
			case 'DEFAULT_HOTSPOTSINITIALVISIBILITY' :
				resTxt = true;
				break;
			case 'DEFAULT_HOTSPOTSMINSCALE' :
				resTxt = '0.2';
				break;				
			case 'DEFAULT_HOTSPOTSMAXSCALE' :
				resTxt = '2';
				break;
			case 'DEFAULT_HOTSPOTLISTSOURCE' :
				resTxt = 'NAME';
				break;
			case 'DEFAULT_HOTSPOTLISTWIDTH' :
				resTxt = '200';
				break;
			case 'DEFAULT_HOTSPOTLISTPOSITION' :
				resTxt = '2';
				break;
			
			case 'DEFAULT_LABELCLICKSELECT' :
				resTxt = '0'; // '0'=false (default), '1'=true.
				break;

			case 'DEFAULT_ANNOTATIONSXMLFILE' :
				resTxt = 'annotations.xml';
				break;
			case 'DEFAULT_ANNOTATIONMEDIA' :
				resTxt = 'circle.png';
				break;
			case 'DEFAULT_ANNOTATIONMEDIATYPE' :
				resTxt = 'icon';
				break;
				
			case 'DEFAULT_POLYGONLINEWIDTH' :
				resTxt = 2;
				break;
			case 'DEFAULT_POLYGONOPACITY' :
				resTxt = 0.3;
				break;
			case 'DEFAULT_POLYGONVIEWBUFFER' :
				resTxt = 300;
				break;
			case 'DEFAULT_CONTROLPOINTLINEWIDTH' :
				resTxt = '1';
				break;
			case 'DEFAULT_CONTROLPOINTSTROKECOLOR' :
				resTxt = '#FFFFFF';
				break;
			case 'DEFAULT_CAPTIONTEXTCOLOR' :
				resTxt = '#FFFFFF';
				break;
			case 'DEFAULT_CAPTIONBACKCOLOR' :
				resTxt = '#000000';
				break;
			case 'DEFAULT_POLYGONLINEWIDTHFREEHAND' :
				resTxt = 2;
				break;
			case 'DEFAULT_FIRSTCONTROLPOINTFILLCOLOR' :
				resTxt = '#FFFFFF';
				break;
			case 'DEFAULT_STANDARDCONTROLPOINTFILLCOLOR' :
				resTxt = '#999999';
				break;
			case 'DEFAULT_CONTROLPOINTRADIUS' :
				resTxt = '10';
				break;
				
			case 'DEFAULT_IMAGESETLISTSOURCE' :
				resTxt = 'NAME';
				break;
			case 'DEFAULT_IMAGESETLISTWIDTH' :
				resTxt = '222';
				break;
			case 'DEFAULT_IMAGESETLISTPOSITION' :
				resTxt = '2';
				break;
			case 'DEFAULT_IMAGESETSLIDERVISIBLE' :
				resTxt = '1'; // '0'=false, '1'=true (default).
				break;
			case 'DEFAULT_SLIDERTESTDURATIONIMAGESET' :
				resTxt = '10';  // Milliseconds.
				break;
				
			case 'DEFAULT_ANIMATIONOPTIMALMOTIONIMAGES' :
				resTxt = '30';
				break;
			case 'DEFAULT_ANIMATIONOPTIMALPOSITIONDELTA' :
				resTxt = '50';
				break;
			case 'DEFAULT_ANIMATIONAXIS' :
				resTxt = 'horizontal';
				break;
			case 'DEFAULT_ANIMATOR' :
				resTxt = 'motion';
				break;

			case 'DEFAULT_HELPSCREENCOLOR' :
				resTxt = 'lightgray';
				break;
			case 'DEFAULT_HELPBUTTONCOLOR' :
				resTxt = 'white';
				break;

			case 'DEFAULT_MESSAGESCREENCOLOR' :
				resTxt = 'lightgray';
				break;
			case 'DEFAULT_MESSAGEBUTTONCOLOR' :
				resTxt = 'white';
				break;
				
			case 'DEFAULT_COORDINATESSCREENCOLOR' :
				resTxt = 'lightgray';
				break;
				
			case 'DEFAULT_TRACEDISPLAYTEXTFONTSIZE' :
				resTxt = '11';
				break;
			case 'DEFAULT_TRACEDISPLAYTEXTPADDINGSMALL' :
				resTxt = '2';
				break;
			case 'DEFAULT_TRACEDISPLAYSCREENCOLOR' :
				resTxt = '#D3D3D3';
				break;
			case 'DEFAULT_TRACEDISPLAYBUTTONCOLOR' :
				resTxt = '#FFFFFF';
				break;
				
			case 'DEFAULT_IMAGESETXMLFILE' :
				resTxt = (Z.animation) ? 'animation.xml' : 'slidestack.xml';
				break;

			case 'ALERT_POLYGONSREQUIRECANVAS' :
				resTxt = 'Displaying or editing polygon hotspots requires a browser that supports the HTML5 canvas feature.';
				break;
			case 'ALERT_ROTATIONREQUIRESNEWERBROWSER' :
				resTxt = 'Rotation requires a newer browser version. Please consider upgrading to the current release of your browser.';
				break;
			case 'ALERT_ZIFREQUIRESNEWERBROWSER' :
				resTxt = 'Viewing Zoomify Images stored in the ZIF format requires a newer browser version. Please consider upgrading to the current release of your browser.';
				break;
				
			case 'ALERT_HOWTOHELPREMINDER' :
				resTxt = '\nClick the \'?\' button for help.';
				break;
				
			case 'ALERT_LOADINGANNOTATIONS' :
				resTxt = '\nLoading annotations...';
				break;
			case 'ALERT_HOWTOEDITMESSAGEDURATION' :
				resTxt = '5000';
				break;	
			case 'ALERT_HOWTOEDITMESSAGEDURATIONSHORT' :
				resTxt = '3000';
				break;
			case 'ALERT_HOWTOEDITMODEVIEW' :
				resTxt = 'Click image to zoom-in.\nAlt-click to zoom-out.\nClick-drag to pan.';
				break;
			case 'ALERT_HOWTOEDITMODEMEASURE' :
				resTxt = 'Click in image to measure length.\nAdditional clicks measure perimeter.\nRe-click starting point to measure area.';
				break;
			case 'ALERT_HOTSPOTCLICKURLDISABLED' :
				resTxt = 'Click links are disabled in edit mode\nto allow hotspot positioning by click-dragging:\n';
				break;
				
			case 'ALERT_LOADINGIMAGESET' :
				resTxt = (Z.animation) ? '\nLoading animation images...' : '\nLoading slidestack slides...';
				break;
				
			case 'ERROR_ERROR' :
				resTxt = 'error';
				break;
		
			case 'ERROR_MESSAGEDURATIONLONG' :
				resTxt = '9000';
				break;
			case 'ERROR_MESSAGEDURATION' :
				resTxt = '3000';
				break;
			case 'ERROR_MESSAGEDURATIONMEDIUM' :
				resTxt = '1500';
				break;	
			case 'ERROR_MESSAGEDURATIONSHORT' :
				resTxt = '750';
				break;			
				
			case 'ERROR_UNRECOGNIZEDPARAMETERALERT' :
				resTxt = 'Parameter unrecognized or deprecated - see the Parameters List documentation: ';
				break;		
			case 'ERROR_PARAMETERDEPRECATED' :
				resTxt = 'Parameter deprecated - please replace: ';
				break;
				
			case 'ERROR_UNSUPPORTEDLOCALVIEWING-BROWSER' :
				resTxt = 'Recent versions of most browsers allow dynamic content loading (such as viewing of Zoomify Images) only from a web server.  Please change your browser settings (see READ ME FIRST file for details) or use FireFox or an earlier version of your browser for local viewing.';
				break;
			case 'ERROR_UNSUPPORTEDLOCALVIEWING-FORMAT-ZIF' :
				resTxt = 'Browsers allow ZIF file viewing only from a web server.  Please use Zoomify Image folders for local viewing.';
				break;
			case 'ERROR_IMAGEPATHINVALID' :
				resTxt = 'Image failed to load: possible invalid path, missing image, or network error.';
				break;
			case 'ERROR_TILEPATHINVALID' :
				resTxt = 'Sorry!  Part of this view is not refreshing.  The network may be slow, or the website may be missing a file:  ';
				break;
			case 'ERROR_VALIDATEVIEW' :
				resTxt = 'Sorry!  Part of this view is not refreshing. The network\nmay be slow, or the website may be missing a file.  ';
				break;
			case 'ERROR_TILEPATHINVALID-ZIF' :
				resTxt = 'Sorry!  Part of this view is not refreshing.  The network may be slow, or the ZIF file may be faulty:  ';
				break;
			case 'ERROR_HOTSPOTORANNOTATIONPATHMISSING' :
				resTxt = 'Attempt to initiate Edit mode without providing path to hotspots or annotations XML data file.';
				break;
			case 'ERROR_HOTSPOTPATHINVALID' :
				resTxt = 'Hotspot media failed to load: possible invalid path, missing file, or legacy hotspot media such as library clip of Flash-based viewer.';
				break;
			case 'ERROR_HOTSPOTMEDIAINVALID' :
				resTxt = "Media of one or more hotspots unsupported: hotspot media of type 'symbol' depend on internal Library of Flash-based viewers."; // Quotes reversed to display quoted single quotes.
				break;
			case 'ERROR_XMLSAVEHANDLERPATHMISSING' :
				resTxt = 'Attempt to initiate Edit mode without providing path to Save Handler - server side script or other resource to post XML data.';
				break;
			case 'ERROR_XMLSAVEHANDLERPATHINVALID' :
				resTxt = 'Annotations cannot be saved: missing or incorrect save\nhandler path parameter, or missing file on server.';
				break;
			case 'ERROR_MAKINGNETWORKREQUEST-ZIFBYTERANGE' :
				resTxt = 'Error loading image: ZIF file data request failed. Request content type: ';
				break;
			case 'ERROR_MAKINGNETWORKREQUEST-ZIFBYTES' :
				resTxt = 'Error loading image: ZIF file invalid.';
				break;
			case 'ERROR_XMLHTTPREQUESTUNSUPPORTED' :
				resTxt = 'Browser does not support XMLHttpRequest.';
				break;
			case 'ERROR_MAKINGNETWORKREQUEST-IMAGEXML' :
				resTxt = 'Error loading image: please make sure image path in web page matches image folder location on webserver.';
				break;
			case 'ERROR_MAKINGNETWORKREQUEST-TOOLBARSKINSXML' :
				resTxt = "Error loading toolbar - skin files not found: please verify that the folders 'Assets/Skins/Default' are in same folder as the web page displaying the Viewer, or add zSkinPath parameter to web page. The zSkinPath parameter may be required if using a content management system such as Drupal, Joomla, or WordPress."; // Quotes reversed to display quoted single quotes.
				break;
			case 'ERROR_MAKINGNETWORKREQUEST-SLIDESXML' :
				resTxt = 'Error loading slides: please make sure slide path in web page matches slides folder location on webserver.';
				break;
			case 'ERROR_MAKINGNETWORKREQUEST-HOTSPOTSXML' :
				resTxt = 'Error loading hotspots: please make sure hotspot path in web page matches hotspots folder location on webserver.';
				break;				
			case 'ERROR_MAKINGNETWORKREQUEST-CREATINGANNOTATIONSXMLFILE' :
				resTxt = 'Error finding annotations XML at location provided.\nCreating new file.';
				break;
			case 'ERROR_MAKINGNETWORKREQUEST-ANNOTATIONSXML' :
				resTxt = 'Error loading annotations: please make sure annotation XML path in web page matches annotation folder location on webserver.';
				break;
			case 'ERROR_MAKINGNETWORKREQUEST' :
				resTxt = 'Error making network request:\npossible invalid path or network error.';
				break;
			case 'ERROR_NETWORKSECURITY' :
				resTxt = 'Error related to network security: ';
				break;
			case 'ERROR_NETWORKSTATUS' :
				resTxt = 'Error related to network status: ';
				break;
			case 'ERROR_NETWORKSTATUSRANGEREQUESTS' :
				resTxt = 'Network error. If using ZIF storage, setting MIME type on web server may be necessary. See READ ME FIRST file in ZIF Storage folder or contact Support: ';
				break;
			case 'ERROR_CONVERTINGXMLTEXTTODOC' :
				resTxt = ' converting XML text to XML doc (DOMParser): ';
				break;
			case 'ERROR_CONVERTINGXMLDOCTOTEXT' :
				resTxt = ' converting XML doc to XML text (DOMParser): ';
				break;
			case 'ERROR_XMLDOMUNSUPPORTED' :
				resTxt = 'Browser does not support XML DOM.';
				break;
			case 'ERROR_XMLDOCINVALID' :
				resTxt =  'XML Doc invalid.';
				break;
			case 'ERROR_XMLINVALID' :
				resTxt =  'XML invalid.';
				break;
			case 'ERROR_IMAGEXMLINVALID' :
				resTxt =  'Image XML invalid.';
				break;
			case 'ERROR_IMAGEPROPERTIESXMLINVALID' :
				resTxt =  'Image properties XML invalid.';
				break;
			case 'ERROR_IMAGEPROPERTIESINVALID' :
				resTxt =  'Image properties invalid.';
				break;				
			case 'ERROR_IMAGEPROPERTIESPARAMETERINVALID' :
				resTxt =  'Image properties parameter invalid.';
				break;
			case 'ERROR_IMAGETILECOUNTINVALID' :
				resTxt =  'Image tile count does not match value in image XML. If the count is invalid display problems can result.';
				break;
			case 'ERROR_EXECUTINGCALLBACK' :
				resTxt = ' while executing callback: ';
				break;
			case 'ERROR_IMAGEREQUESTTIMEDOUT' :
				resTxt = '\nImage tile request not fulfilled within time period expected';
				break;
				
			case 'ERROR_UNCONVERTEDIMAGEPATHINVALID' :
				resTxt = 'Unconverted JPEG or PNG image failed to load: possible invalid path, missing image, or network error.';
				break;
			case 'ERROR_TRANSLATINGCANVASFORUNCONVERTEDIMAGE' :
				resTxt = '\nTranslation of canvas failed';
				break;
			case 'ERROR_SCALINGCANVASFORUNCONVERTEDIMAGE' :
				resTxt = '\nScaling of canvas failed';
				break;
			case 'ERROR_SETTINGTRANSFORMONCANVASFORUNCONVERTEDIMAGE' :
				resTxt = '\nTransform on canvas failed';
				break;
				
			case 'ERROR_NAVIGATORIMAGEPATHINVALID' :
				resTxt = 'Navigator image failed to load: possible invalid path, missing image, or network error.';
				break;
			case 'ERROR_SKINXMLINVALID' :
				resTxt = 'Skin XML invalid.';
				break;
			case 'ERROR_SKINXMLMISSINGNAMES' :
				resTxt = 'The skin XML file has one or more faulty name lines.';
				break;				
			case 'ERROR_VIRTUALPOINTERPATHINVALID' :
				resTxt = 'Virtual pointer graphic failed to load: ';
				break;
			case 'ERROR_WATERMARKPATHINVALID' :
				resTxt = 'Watermark image failed to load: ';
				break;			
			case 'ERROR_UNKNOWNELEMENTSTYLE' :
				resTxt = 'Unknown element style - no known method to identify.';
				break;
			case 'ERROR_UNKNOWNMOUSEPOSITION' :
				resTxt = 'Unknown mouse position - no known method to calculate.';
				break;
			case 'ERROR_UNKNOWNMOUSESCROLL' :
				resTxt = 'Unknown mouse scroll - no known method to calculate.';
				break;
			case 'ERROR_UNKNOWNWINDOWSIZE' :
				resTxt = 'Unknown window size - no known method to calculate.';
				break;

			case 'TIP_LOGO' :
				resTxt = 'Launch Zoomify Website';
				break;
			case 'TIP_MINIMIZE' :
				var toggleText = '';
				if (Z.hotspots) { 
					toggleText = '\nAlt-Click: Toggle Hotspot Visibility';
				} else if (Z.annotations) {
					toggleText = '\nAlt-Click: Toggle Label Visibility';
				}
				resTxt = 'Minimize Toolbar' + toggleText;
				break;
			case 'TIP_EXPAND' :
				var toggleText = '';
				if (Z.hotspots) { 
					toggleText = '\nAlt-Click: Toggle Hotspot Visibility';
				} else if (Z.annotations) {
					toggleText = '\nAlt-Click: Toggle Label Visibility';
				}
				resTxt = 'Expand Toolbar' + toggleText;
				break;
			case 'TIP_ZOOMOUT' :
				resTxt = 'Zoom Out';
				break;
			case 'TIP_SLIDER' :
				resTxt = 'Zoom In And Out';
				break;				
			case 'TIP_ZOOMIN' :
				resTxt = 'Zoom In';
				break;
			case 'TIP_PANLEFT' :
				resTxt = 'Pan Left';
				break;
			case 'TIP_PANUP' :
				resTxt = 'Pan Up';
				break;
			case 'TIP_PANDOWN' :
				resTxt = 'Pan Down';
				break;
			case 'TIP_PANRIGHT' :
				resTxt = 'Pan Right';
				break;
			case 'TIP_RESET' :
				resTxt = 'Reset Initial View\nAlt-Click: Prior View';
				break;
				
			case 'TIP_TOGGLEFULLVIEW' :
				resTxt = 'Enter Full View';
				break;				
			case 'TIP_TOGGLEFULLVIEWEXIT' :
				resTxt = 'Exit Full View';
				break;
			case 'TIP_TOGGLEFULLVIEWEXITEXTERNAL' :
				resTxt = 'Exit Full View';
				break;
				
			case 'TIP_HELP' :
				resTxt = 'Show Help';
				break;
			case 'TIP_HELPMARKUP' :
				resTxt = 'Show Markup Help';
				break;
			case 'TIP_HELPANNOTATION' :
				resTxt = 'Show Annotation Help';
				break;
				
			case 'TIP_ROTATECLOCKWISE' :
				resTxt = 'Rotate Clockwise 90 Degrees';
				break;
			case 'TIP_ROTATECOUNTERWISE' :
				resTxt = 'Rotate Counterwise 90 Degrees';
				break;
				
			case 'TIP_VIRTUALPOINTER' :
				resTxt = 'Click-Drag To Position';
				break;
				
			case 'TIP_TOGGLEMEASURING' :
				resTxt = 'Begin Measuring';
				break;				
			case 'TIP_TOGGLEMEASURINGEXIT' :
				resTxt = 'Stop Measuring';
				break;
				
			case 'TIP_TOURPRIOR' :
				resTxt = 'Prior Destination';
				break;
			case 'TIP_TOURNEXT' :
				resTxt = 'Next Destination';
				break;
			case 'TIP_TOURSTART' :
				resTxt = 'Start Tour';
				break;
			case 'TIP_TOURSTOP' :
				resTxt = 'Stop Tour';
				break;
				
			case 'TIP_SLIDEPRIOR' :
				resTxt = 'Prior Slide';
				break;
			case 'TIP_SLIDENEXT' :
				resTxt = 'Next Slide';
				break;
			case 'TIP_SLIDESHOWSTART' :
				resTxt = 'Start Slideshow';
				break;
			case 'TIP_SLIDESHOWSTOP' :
				resTxt = 'Stop Slideshow';
				break;
				
			case 'TIP_AUDIOMUTE' :
				resTxt = 'Mute Sound';
				break;
			case 'TIP_AUDIOON' :
				resTxt = 'Enable Sound';
				break;
				
			case 'TIP_IMAGESETPRIOR' :
				resTxt = (Z.animation) ? 'Prior Image' : 'Prior Slide';
				break;
			case 'TIP_IMAGESETSLIDER' :
				resTxt = (Z.animation) ? 'Change Image' : 'Change Slide';
				break;
			case 'TIP_IMAGESETNEXT' :
				resTxt = (Z.animation) ? 'Next Image' : 'Next Slide';
				break;
				
			case 'TIP_VIEWMODE' :
				resTxt = 'Image Navigation';
				break;
			case 'TIP_EDITMODECOLORPICKER' :
				resTxt = 'Toggle Color Palette';
				break;	
				
			case 'TIP_EDITMODEMEASURE' :
				resTxt = 'Measurements';
				break;			
				
			case 'TIP_HELPOK' :
				resTxt = 'Close Help Display';
				break;			
				
			case 'TIP_MESSAGEOK' :
				resTxt = 'Accept And Close Message';
				break;
			case 'TIP_MESSAGECANCEL' :
				resTxt = 'Decline And Close Message';
				break;
			case 'TIP_COPYRIGHTAGREE' :
				resTxt = 'Agree To Copyright And View Images';
				break;
			case 'TIP_COPYRIGHTEXIT' :
				resTxt = 'Exit And Do Not View Images';
				break;
			case 'TIP_SHOWGLOBALS' :
				resTxt = 'Toggle Full Page View';
				break;
			case 'TIP_TOGGLEDISPLAY' :
				resTxt = 'Toggle Viewport Display';
				break;
			case 'TIP_TOGGLEBACKFILL' :
				resTxt = 'Toggle Viewport Backfill';
				break;
			case 'TIP_TOGGLECONSTRAINPAN' :
				resTxt = 'Toggle Constrain Pan';
				break;
				
			case 'UI_LOGOLINKDISPLAY' :
				resTxt = 'www.zoomify.com';
				break;
			case 'UI_LOGOLINK' :
				resTxt = 'http://www.zoomify.com';
				break;
			case 'UI_LOGOLINKTARGET' :
				resTxt = '_blank';
				break;

			case 'UI_NAVIGATORACCESSIBILITYALTATTRIBUTE' :
				resTxt = "Navigator Bird's Eye View"; // Quotes reversed to support possessive use.
				break;
			case 'UI_FVCANCELBUTTONTEXT' :
				resTxt = 'X';
				break;
				
			case 'UI_RULERMIN' :
				resTxt = ' min';
				break;
			case 'UI_RULERMAX' :
				resTxt = ' max';
				break;
			case 'UI_RULERNOPARAMS' :
				resTxt = 'units in %s';
				break;
				
			case 'UI_MEASURELENGTH' :
				resTxt = 'Length: ';
				break;
			case 'UI_MEASURELENGTHTOTAL' :
				resTxt = 'Total length: ';
				break;
			case 'UI_MEASUREPERIMETER' :
				resTxt = 'Perimeter: ';
				break;				
			case 'UI_MEASUREAREA' :
				resTxt = 'Area: ';
				break;				
			case 'UI_MEASURESQUARE' :
				resTxt = '\u00B2'; // Unicode representation for squared symbol (superscript 2: '²').
				break;
				
			case 'UI_COPYRIGHTAGREEBUTTONTEXT' :
				resTxt = 'Agree';
				break;
			case 'UI_COPYRIGHTEXITBUTTONTEXT' :
				resTxt = 'Exit';
				break;
				
			case 'UI_LISTMOUSEDOWNTEXT' :
				resTxt = 'Select an item...';
				break;
							
			case 'UI_TOURLISTTITLE' :
				resTxt = 'Tour Destinations';
				break;
			case 'UI_SLIDELISTTITLE' :
				resTxt = 'Slides';
				break;				
			case 'UI_HOTSPOTLISTTITLE' :
				resTxt = 'Hotspots';
				break;
				
			case 'UI_IMAGESETLISTTITLE' :
				resTxt = 'ImageSet Slide List';
				break;
			case 'UI_IMAGESETSTART' :
				resTxt = '0';
				break;
			case 'UI_IMAGESETLOOP' :
				resTxt = '1';
				break;
			case 'UI_IMAGESETSLIDER' :
				resTxt = '1';
				break;
				
			case 'UI_HELPDISPLAYWIDTH' :
				resTxt = '430';
				break;
			case 'UI_HELPDISPLAYHEIGHT' :
				resTxt = '300';
				break;
			case 'UI_HELPOKBUTTONTEXT' :
				resTxt = 'OK';
				break;

			case 'UI_MESSAGEDISPLAYWIDTH' :
				resTxt = '430';
				break;
			case 'UI_MESSAGEDISPLAYHEIGHT' :
				resTxt = '84';
				break;
			case 'UI_MESSAGECANCELBUTTONTEXT' :
				resTxt = 'Cancel';
				break;
			case 'UI_MESSAGEOKBUTTONTEXT' :
				resTxt = 'OK';
				break;
				
			case 'UI_COORDINATESDISPLAYWIDTH' :
				resTxt = '290';
				break;
			case 'UI_COORDINATESDISPLAYHEIGHT' :
				resTxt = '200';
				break;				
			case 'UI_COORDINATESDISPLAYTEXT' :
				resTxt = 'Mouse Coordinates\nAlt-click, select in list, right-click, Copy';
				break;
				
			case 'UI_TRACEDISPLAYTITLE' :
				resTxt = "Trace Values\n\n";
				break;
			case 'UI_TRACEDISPLAYDEBUGINFOTEXT' :
				resTxt = "This panel is enabled using the HTML parameter 'zDebug=1' (basic) or 'zDebug=2' (adds tile tracing). " +
				"It can be called in JavaScript as follows:\n\n   Z.Utils.trace('value to display');  \n\nThe " +
				"buttons below display or modify important state values.  Web designers " +
				"new to JavaScript will also benefit from the console, trace, profiling, and " +
				"other debugging features of leading browsers."; // Quotes reversed to display quoted single quotes.
				break;
			case 'UI_TRACEDISPLAYTILESTATUSTEXT' :
				resTxt = 'Required Cached Requested Loaded Displayed Waiting';
				break;
			case 'UI_TRACEDISPLAYELAPSEDTIMETEXT' :
				resTxt = 'Seconds';
				break;
			case 'UI_TRACEDISPLAYTILESPERSECONDTEXT' :
				resTxt = 'Loads / Second';
				break;			
			case 'UI_TRACEDISPLAYSHOWGLOBALSBUTTONTEXT' :
				resTxt = 'Show Globals';
				break;
			case 'UI_TRACEDISPLAYTOGGLEDISPLAYBUTTONTEXT' :
				resTxt = 'Toggle Display';
				break;
			case 'UI_TRACEDISPLAYTOGGLEBACKFILLBUTTONTEXT' :
				resTxt = 'Toggle Backfill';
				break;
			case 'UI_TRACEDISPLAYTOGGLECONSTRAINPANBUTTONTEXT' :
				resTxt = 'Toggle Constrain Pan';
				break;
				
			case 'CONTENT_HELPTOOLBAR' :
				resTxt = '<p align=%22center%22><font face=%22Arial,Helvetica,sans-serif%22><strong>Viewer Help</strong></font></p>'
				+ '<p align=%22justify%22><font face=%22Arial,Helvetica,sans-serif%22>To explore this image, simply click the image to zoom, double-click to zoom out, or click-drag to pan.'
				+ '<br><br>The Navigator thumbnail overview can also be clicked or click-dragged to pan.'
				+ '<br><br>Use the Toolbar for exact navigation - if using a mouse, hold it over any button to see a helpful tip.'
				+ '</font></p>';
				break;
			case 'CONTENT_HELPMARKUP' :
				resTxt = '<p align=%22center%22><font face=%22Arial,Helvetica,sans-serif%22><strong>Markup Help</strong></font></p>'
				+ '<p align=%22justify%22><font face=%22Arial,Helvetica,sans-serif%22>Markup Mode allows fast, easy addition of labels to a zoomable image.'
				+ '<br><br><strong>Creating A Label</strong>'
				+ '<br><br>Click any of the buttons at the top of the Markup Panel: Freehand, Text, Rectangle, Polygon, or Measure.'
				+ '<br><br>Next, click or click-drag in the image:'
				+ '<ul>'
				+ '<li>Freehand drawings are created by click-dragging.'
				+ '<li>Text labels are created with a simple click in the image.'
				+ '<li>Icons first require the type of icon to be chosen from the icon list. Then the icon is created by clicking the image.'
				+ '<li>Rectangles do not require multiple clicks - just click-drag and all four corners are automatically created and positioned.'
				+ '<li>Polygons require multiple clicks in the image to create corner <i>control points</i>.  Alt-click the image to create a final point, or click the first point to close the polygon.'
				+ '<li>Measurements are just like polygons but the caption dynamically changes to display the current length or area.'
				+ '<li>Control points of rectangles, polygons, and measurments can be click-dragged to modify a polygon.'
				+ '</ul>'
				+ 'Use the Color button to set a color. The color selected affects freehand drawings, text captions, icon captions, and the lines and captions of rectangles, polygons, and measurements.'
				+ '<br><br>Use the View button to return to navigation mode.'
				+ '<br><br><strong>Editing Label Values</strong>'
				+ '<br><br>The Markup Panel also displays the name and caption of the currently selected label for easy editing. Use the TAB key to implement any edits or click in the image.'
				+ '<br><br>Delete a label using the trash can button. The label will be removed from the image and the Markup Panel will display the prior label in the label list.'
				+ '<br><br>Save a label using the button with the disk icon. Or, use the label list to change the selected label - the previously selected label will be automatically saved.'
				+ '<br><br><i><strong>Special Tips:</strong>'
				+ '<ul>'
				+ '<li>Alt-click any label to display its name and caption in the Markup Panel for editing.'
				+ '<li>Alt-click-drag any completed label to reposition it in the image.'
				+ '<li>If using a mouse, hold the cursor over any button at any time to see a helpful reminder.'
				+ '</ul>'
				+ '</i></font></p>';
				break;
			case 'CONTENT_HELPANNOTATIONEDITING' :
				resTxt = '<p align=%22center%22><font face=%22Arial,Helvetica,sans-serif%22><strong>Annotation Editing Help</strong></font></p>'
				+ '<p align=%22justify%22><font face=%22Arial,Helvetica,sans-serif%22>The Annotation Panel provides an intuitive, visual means, to add <i>Points of Interest</i> to a zoomable image, including the option of associated <i>Labels</i> and <i>Notes</i>.'
				+ '<br><br><strong>Point Of Interests</strong>'
				+ '<br><br>A Point Of Interest (POI) is a place in the image that is named and listed so that it can be navigated to easily.'
				+ '<br><br>To create a Point Of Interest, click the <i>Add</i> button beneath the Point Of Interest choice list at the top of the Annotation Panel to create a new Point of Interest.'
				+ ' Or, click the <i>Edit</i> button to modify the current POI. If no Annotations have been created, a placeholder POI will be the only item in the Point Of Interest list.'
				+ '<br><br><i><strong>More Buttons:</strong></i>'
				+ '<br><br>When the Add button is clicked, two different buttons will be displayed: <i>Save</i> and <i>Cancel</i>. If the Edit button is clicked, a third button will also be displayed: <i>Delete</i>.'
				+ '<br><br>Save a Point Of Interest using the button with the disk icon.'
				+ ' Cancel edits to a Point Of Interest using the button with the large X icon.'
				+ '<br><br>Delete a Point Of Interest using the trash can button. The POI will be removed from the list and the prior POI in the list will be displayed.'
				+ '<br><br><i><strong>Important:</strong>'
				+ '<ul>'
				+ '<li>Changing the selected POI in the POI list will automatically save any edits to the current POI.'
				+ '<li>Clicking any of the buttons Save, Cancel, and Delete will leave the Add or Edit mode and return to Annotation Panel to its default display.'
				+ '<li>If using a mouse, hold the cursor over any button to see a helpful reminder.'
				+ '</ul>'
				+ '</i>'
				+ '<strong>Labels</strong>'
				+ '<br><br>To add a new Label to the current Point Of Interest, click the Add button beneath the Label section of the Annotation Panel. Or, click the Edit button to edit the current Label. If no Labels have been created yet, the Label list will be empty.'
				+ '<br><br>If adding a new Label, click any of the buttons at the top of the Label section of the Annotation Panel: Freehand, Text, Rectangle, Polygon, or Measure.'
				+ '<br><br>Now click or click-drag in the image to create a new Label:'
				+ '<ul>'
				+ '<li>Freehand drawings are created by click-dragging.'
				+ '<li>Text labels are created with a simple click in the image.'
				+ '<li>Icons first require the type of icon to be chosen from the icon list. Then the icon is created by clicking the image.'
				+ '<li>Rectangles do not require multiple clicks - just click-drag and all four corners are automatically created and repositioned.'
				+ '<li>Polygons require multiple clicks in the image to create corner <i>control points</i>.  Alt-click the image to create a final point, or click the first point to close the polygon.'
				+ '<li>Measurements are just like polygons except that the caption dynamically changes to display the current length or area.'
				+ '</ul>'
				+ 'Use the Color button to set the color of new freehand drawings, text captions, icon captions, and the lines and captions of rectangles, polygons, and measurements.'
				+ '<br><br>Use the View button to return to navigation mode in the current Label.'
				+ '<br><br><i><strong>Important:</strong>'
				+ '<ul>'
				+ '<li>In Add mode, multiple clicks or click-drags will create multiple Labels - to support rapid annotation authoring.'
				+ '<li>In Edit mode, any clicks or click-drags will simple replace the current Label in the image.'
				+ '<li>Alt-click any label in the image to display its values in the Annotatoin Panel for editing. (Add or Edit mode)'
				+ '<li>Alt-click-drag any completed label in the image to reposition it.  (Add or Edit mode)'
				+ '<li>Control points of rectangles, polygons, and measurments can be click-dragged to modify a polygon.'
				+ '</ul>'
				+ '</i>'				
				+ '<i><strong>More Label Values:</strong></i>'
				+ '<br><br>The Annotation Panel also displays the name, caption, tooltip, and click-URL of of the currently selected label for easy editing. Use the TAB key to implement any edits or click in another text field or in the image. '
				+ '<br><br>Two choice lists are also included: the first allows the caption to be positioned relative to the Label in the image while the second determines whether the click-URL (if any) will open in the current browser window or a new browser window or a specific frame in the web page. '
				+ '<br><br>The Scale buttons allow the Label to be sized in the image.  The Rollover checkbox can be used to hide a Label in the image until the cursor is over it (not supported by mobile devices).'
				+ '<br><br>The Save, Cancel, and Delete buttons for Labels work just as they do with Points of Interest, as described above. And remember, changing the selected Label in the Label list will automatically save any edits to the current Label. Alt-clicking or alt-click-dragging a Label in the image will also change the current Label in the Label list and cause any edits to be saved (see the first two Special Tips below).'
				+ '<br><br><i><strong>Important:</strong>'
				+ '<ul>'
				+ '<li>Changing the selected Label by clicking or click-dragging it in the image will change the selected Point Of Interest if the newly selected Label is associated with a different POI - if editing is in progress the edits will be automatically saved.'
				+ '<li>If using a mouse, hold the cursor over any button to see a helpful reminder.'
				+ '</ul>'
				+ '</i>'
				+ '<strong>Notes</strong>'
				+ '<br><br>To add a new Note to the current Point Of Interest, click the Add button beneath the Note section of the Annotation Panel. Or, click the Edit button to edit the current Note. If no Notes have been created yet, the Note list will be empty.'
				+ '<br><br>Use the name and text fields to easily add or edit the Note values. Notes can hold a virtually unlimited number of characters (spaces included). A vertical scrollbar automatically appears when a note requires more lines than fit in the note area. Notes can contain carriage returns.'
				+ '<br><br>The Save, Cancel, and Delete buttons for Notes work just as they do with Points of Interest, as described above. And remember, changing the selected Note in the Note list will automatically save any edits to the current Note.'
				+ '</font></p>';
				break;
			case 'CONTENT_HELPCONCATENATOR' :
				resTxt = '<p align=%22center%22><font face=%22Arial,Helvetica,sans-serif%22><strong>\\/ \\/ \\/</strong></font></p>'
				break;
			case 'CONTENT_HELPANNOTATIONVIEWING' :
				resTxt = '<p align=%22center%22><font face=%22Arial,Helvetica,sans-serif%22><strong>Annotation Help</strong></font></p>'
				+ '<p align=%22justify%22><font face=%22Arial,Helvetica,sans-serif%22>The Annotation Panel provides an intuitive display of <i>Points of Interest</i> in a zoomable image, along with associated <i>Labels</i> and <i>Notes</i>, if any.'
				+ '<br><br>A Point Of Interest (POI) is a place in the image that is named and listed so that it can be navigated to easily.'
				+ '<br><br>A Label is a visual element in the image: a freehand drawing, text caption, rectangle or other polygon, or a measurement.'
				+ '<br><br>A Note is text associated with a Point Of Interest. Notes can hold a virtually unlimited number of characters (spaces included). A vertical scrollbar automatically appears when a note requires more lines than fit in the note area.'
				+ '</font></p>';
				break;
				
			case 'CONTENT_SKIPUSERNAMENAME' :
				resTxt = 'Anonymous';
				break;
			case 'CONTENT_FIRSTPOINAME' :
				resTxt = 'Whole Image';
				break;
			case 'CONTENT_POINAME' :
				resTxt = 'New Point Of Interest ';
				break;
			case 'CONTENT_POIUSER' :
				resTxt = this.getResource('CONTENT_SKIPUSERNAMENAME');
				break;
			case 'CONTENT_HOTSPOTNAME' :
				resTxt = 'New Hotspot ';
				break;
			case 'CONTENT_HOTSPOTCAPTION' :
				resTxt = 'Caption for hotspot ';
				break;
			case 'CONTENT_LABELNAME' :
				resTxt = 'New Label ';
				break;
			case 'CONTENT_LABELCAPTION' :
				resTxt = 'Caption for label ';
				break;
			case 'CONTENT_LABELCOMMENT' :
				resTxt = 'Comment for label ';
				break;				
			case 'CONTENT_ANNOTATIONPLACEHOLDERCOMMENTTEXT' :
				resTxt = '';
				break;
			case 'CONTENT_POLYGONCAPTION' :
				resTxt = 'Polygon ';
				break;
			case 'CONTENT_LABELTOOLTIP' :
				resTxt = 'Tooltip for label ';
				break;
			case 'CONTENT_LABELCLICKURL' :
				resTxt = '';
				break;
			case 'CONTENT_LABELUSER' :
				resTxt = this.getResource('CONTENT_SKIPUSERNAMENAME');
				break;
				
			case 'CONTENT_CAPTIONTEXTCOLOR' :
				resTxt = (Z.captionTextColor) ? Z.captionTextColor : '#FFFFFF';
				break;
			case 'CONTENT_CAPTIONBACKCOLOR' :
				resTxt = (Z.captionBackColor) ? Z.captionBackColor : '#000000';
				break;
			case 'CONTENT_POLYGONLINECOLOR' :
				resTxt = (Z.polygonLineColor) ? Z.polygonLineColor : '#FFFFFF';
				break;
			case 'CONTENT_POLYGONFILLCOLOR' :
				resTxt = (Z.polygonFillColor) ? Z.polygonFillColor : '#FFFFFF';
				break;
			case 'CONTENT_CAPTIONTEXTVISIBLE' :
				resTxt = (Z.captionTextVisible) ? '1' : '0';
				break;
			case 'CONTENT_CAPTIONBACKVISIBLE' :
				resTxt = (Z.captionBackVisible) ? '1' : '0';
				break;
			case 'CONTENT_POLYGONLINEVISIBLE' :
				resTxt = (Z.polygonLineVisible) ? '1' : '0';
				break;
			case 'CONTENT_POLYGONFILLVISIBLE' :
				resTxt = (Z.polygonFillVisible) ? '1' : '0';
				break;
				
			case 'CONTENT_CAPTIONPOSITION' :
				resTxt = '8';
				break;

			default:
				resTxt = 'Unexpected resource request';
		}
		return resTxt;
	},



	//::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::
	//:::::::::::::::::::::::::: ELEMENT & OBJECT UTILITY FUNCTIONS ::::::::::::::::::::::
	//::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::
		
	clearDisplay : function (display) {
		// Completely clear viewport or other display including prior tiles better than backfill. Subsequent 
		// redraw of new tiles will leave gaps with backfill showing rather than tiles from prior view.
		if (display) {
			if (Z.useCanvas && display.tagName == 'CANVAS') {
				Z.Utils.clearCanvas(display);
			} else {
				while (display.hasChildNodes()) {
				 	display.removeChild(display.lastChild);
				}
			}
		}
	},
	
	clearCanvas : function (canvas) {
		var ctx = canvas.getContext('2d');
		ctx.save();
		// Trap possible NS_ERROR_FAILURE error especially in firefox especially if working with large unconverted image.
		// DEV NOTE: add retry or soft fail in catch in future implementation for firefox issue with large canvases.
		try {
			ctx.setTransform(1,0,0,1,0,0);
		} catch (e) {
			Z.Utils.showMessage(Z.Utils.getResource('ERROR_SETTINGTRANSFORMONCANVASFORUNCONVERTEDIMAGE'));
			console.log('In function clearCanvas setting transform on canvas:  ' + e);
		}
		ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
		ctx.restore();
	},
	
	colorCanvas : function (canvas, color) {
		var ctx = canvas.getContext('2d');
		ctx.save();
		ctx.setTransform(1,0,0,1,0,0);
		ctx.fillStyle = color;
		ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
		ctx.restore();
	},
	
	deleteDiv : function (divID) {
		var targetDiv = document.getElementById(divID);
		while (targetDiv.hasChildNodes()) {
			targetDiv.removeChild(targetDiv.lastChild);
		}
		targetDiv.parentNode.removeChild(targetDiv);
	},
	
	createCallback : function (object, method) {
		var initialArgs = [];
		for (var i = 2, j = arguments.length; i < j; i++) {
			initialArgs[initialArgs.length] = arguments[i];
		}
		return function () {
			var args = initialArgs.concat([]);
			for (var i = 0, j = arguments.length; i < j; i++) {
				args[args.length] = arguments[i];
			}
			return method.apply(object, args);
		};
	},

	// Timer permits completion of callback-related events such as mouseup during updateView.				
	// Passing in array ensures multiple callbacks on same event will not be interfered with by clearCallback calls of any.
	validateCallback : function (callbackEvent) {
		var callbacksTempCopy = Z.callbacks.slice(0);
		Z.Utils.functionCallWithDelay(function () { Z.Utils.validateCallbackDelayed(callbackEvent, callbacksTempCopy); }, 10);
	},
	
	// For loop enables more than one function call to be assigned to a callback event.
	validateCallbackDelayed : function (callbackEvent, callbacksTempArr) {
		for (var i = 0, j = callbacksTempArr.length; i < j; i++) {
			var callback = callbacksTempArr[i];
			
			// DEV NOTE: First condition needed due to asynchronous callbacks array deletions.
			if (callback && callback.callbackEvent == callbackEvent && typeof callback === 'object' && typeof callback.callbackFunction === 'function') {
				
				switch (callbackEvent) {
					case 'viewZoomingGetCurrentZoom' :
						var currentZ = Z.Viewport.getZoom();
						callback.callbackFunction(currentZ);
						break;
					case 'viewUpdateCompleteGetLabelIDs' :
						var labelIDsInView = Z.Viewport.getLabelIDsInCurrentView(false, true, true);
						callback.callbackFunction(labelIDsInView);
						break;
					case 'viewUpdateCompleteGetLabelInternalIDs' :
						var labelInternalIDsInView = Z.Viewport.getLabelIDsInCurrentView(true, true, true);
						callback.callbackFunction(labelInternalIDsInView);
						break;
					default :
						callback.callbackFunction();
				}
			}
		}
		Z.Utils.arrayClear(callbacksTempArr);									
	},

	getContainerSize : function (container, display) {
		var containerS = Z.Utils.getElementStyle(container);
		var containerW = parseFloat(containerS.width);
		var containerH = parseFloat(containerS.height);
		if (Z.Utils.stringValidate(containerS.width) && containerS.width.indexOf('%') != -1) { containerW = parseFloat(Z.Utils.getElementStyleProperty(container, 'width')); } // Win IE only.
		if (Z.Utils.stringValidate(containerS.height) && containerS.height.indexOf('%') != -1) { containerH = parseFloat(Z.Utils.getElementStyleProperty(container, 'height')); } // Win IE only.
		if (isNaN(containerW)) { containerW = display.clientWidth; }
		if (isNaN(containerH)) { containerH = display.clientHeight; }
		if (containerW == 0 || containerH == 0) {
			winDimensions = Z.Utils.getWindowSize();
			if (containerW == 0) {
				container.parentNode.style.width = winDimensions.x + 'px';
				containerW = container.clientWidth;
			}
			if (containerH == 0) {
				container.parentNode.style.height = winDimensions.y + 'px';
				containerH = container.clientHeight;
			}
		}
		return new Z.Utils.Point(containerW, containerH);
	},
	
	createContainerElement : function (tagName, id, display, position, overflow, width, height, left, top, borderStyle, borderWidth, background, margin, padding, whiteSpace, cursor, preventSelect) {
		var emptyContainer = document.createElement(tagName);
		if (this.stringValidate(id)) { emptyContainer.id = id; }
		var ecS = emptyContainer.style;
		ecS.display = (this.stringValidate(display)) ? display : 'inline-block';
 		ecS.position = (this.stringValidate(position)) ? position : 'static';
 		ecS.overflow = (this.stringValidate(overflow)) ? overflow : 'hidden';
 		if (tagName == 'canvas') {
 			if (this.stringValidate(width)) { emptyContainer.setAttribute('width', width); }
 			if (this.stringValidate(height)) { emptyContainer.setAttribute('height', height); }
 		} else {
 			if (this.stringValidate(width)) { ecS.width = width; }
 			if (this.stringValidate(height)) { ecS.height = height; }
 		}
 		if (this.stringValidate(left)) { ecS.left = left; }
 		if (this.stringValidate(top)) { ecS.top = top; }
 		ecS.borderStyle = (this.stringValidate(borderStyle)) ? borderStyle : 'none';
 		ecS.borderWidth = (this.stringValidate(borderWidth)) ? borderWidth : '0px';
 		ecS.borderColor = '#696969';
 		ecS.background = (this.stringValidate(background)) ? background : 'transparent none';
 		ecS.margin = (this.stringValidate(margin)) ? margin : '0px';
 		ecS.padding = (this.stringValidate(padding)) ? padding : '0px';
 		ecS.whiteSpace = (this.stringValidate(whiteSpace)) ? whiteSpace : 'normal';
 		if (this.stringValidate(cursor)) { ecS.cursor = cursor; } // No explicit default assignment.
		if (preventSelect !== 'undefined' && preventSelect) {
			Z.Utils.addEventListener(emptyContainer, 'touchstart', Z.Utils.preventDefault);
			Z.Utils.addEventListener(emptyContainer, 'mousedown', Z.Utils.preventDefault);
			Z.Utils.addEventListener(emptyContainer, 'contextmenu', Z.Utils.preventDefault);
		}
		return emptyContainer;
	},

	createCenteredElement : function (elmt, id) {
		// Note that id is assigned to inner centered container not to embedded text node. To access use
		// firstChild, for example: var textNode = document.getElementById('myTextNode').firstChild;
		var div = this.createContainerElement('div');
		var html = [];
		html[html.length] = '<div style="#position:relative; display:table; height:100%; width:100%; border:none; margin:0px; padding:0px; overflow:hidden; text-align:left;">';
		html[html.length] = '<div style="#position:absolute; display:table-cell; #top:50%; width:100%; border:none; margin:0px; padding:0px; vertical-align:middle;">';
		html[html.length] = '<div id="' + id + '"; style="#position:relative; width:100%; #top:-50%; border:none; margin:0px; padding:0px; text-align:center;"></div></div></div>';

		// Debug option: console.log(html.toString());
		div.innerHTML = html.join('');
		div = div.firstChild;
		var innerDiv = div;
		var innerDivs = div.getElementsByTagName('div');
		while (innerDivs.length > 0) {
			innerDiv = innerDivs[0];
			innerDivs = innerDiv.getElementsByTagName('div');
		}
		innerDiv.appendChild(elmt);
		return div;
	},

	createTextElement : function (id, value, width, height, left, top, padding, border, borderWidth, readOnly, fontFamily, fontSize, resize, columns, rows, overflowX, overflowY, wrap) {
		var textBox = Z.Utils.createContainerElement('div', 'textBoxFor-' + id, 'inline-block', 'absolute', 'hidden', width, height, left, top, border, borderWidth, 'white', '0px', padding, 'normal');
		var textArea = document.createElement('textarea');
		textBox.appendChild(textArea);
		var ntA = textArea;
		var ntaS = ntA.style;
		ntA.id = id;
		ntA.value = value;
		ntA.readOnly = readOnly;
		ntaS.width = '100%';
		ntaS.height = '100%';
		ntaS.margin = '0';
		ntaS.border = '0';
		if (this.stringValidate(fontFamily)) { ntaS.fontFamily = fontFamily; }
		if (this.stringValidate(fontSize)) { ntaS.fontSize = fontSize; }
		if (this.stringValidate(resize)) { ntaS.resize = resize; }
		if (this.stringValidate(columns)) { ntA.columns = columns; }
		
		// Support single-line, non-wrapping, no scrollbar textarea (use createTextNode for labels).
		if (this.stringValidate(rows)) { ntA.rows = rows; }
		if (this.stringValidate(overflowX)) { ntaS.overflowX = overflowX; }
		if (this.stringValidate(overflowY)) { ntaS.overflowY = overflowY; }
		if (this.stringValidate(wrap)) {
			ntA.wrap = wrap;
			// DEV NOTE: Alternative implementation - may require overlow='auto' and/or whiteSpace='pre'.  
			if (wrap == 'off') { ntaS.whiteSpace = 'nowrap'; }
		}
		
		return textBox;
	},

	createSelectElement : function (listID, listTitle, dataProvider, listW, listX, listY, fontSize, visible, handler, handlerType) {
		// Create list.
		var sList = document.createElement('select');
		sList.id = listID;
		if (Z.Utils.stringValidate(listTitle) && listTitle != 'none') { sList.options[0] = new Option(listTitle, null); } // First option, set without value.
		for (var i = 0, j = dataProvider.length; i < j; i++) {
			sList.options[sList.options.length] = new Option(dataProvider[i].text, dataProvider[i].value);
		}
		
		// Assigning handler to mousedown event allows handler to set selected element to null and then assign change handler which
		// enables reselection of current element in list which would otherwise not trigger a change event. Alternative is to assign handler 
		// to onchange event. Additional note: if no need to remove handler, direct assignment is possible as follows: sList.onchange = handler;
		var hType = (typeof handlerType !== 'undefined' && handlerType !== null) ? handlerType : 'change';
		Z.Utils.addEventListener(sList, hType, handler);
		
		// Set list position and visibilty.
		var slS = sList.style;	
		slS.width = listW + 'px';
		slS.position = 'absolute';
		slS.left = listX + 'px';
		slS.top = listY + 'px';
		slS.fontSize = (fontSize == null) ? '11px' : fontSize + 'px';
		slS.fontFamily = 'verdana';
		slS.visibility = visible;

		return sList;
	},

	updateSelectElement : function (listObject, dataProvider, selID) {
		if (listObject) {
			var index = (listObject.selectedIndex != -1) ? listObject.selectedIndex : 0;
			listObject.innerHTML = '';
			for (var i = 0, j = dataProvider.length; i < j; i++) {
				listObject.options[listObject.options.length] = new Option(dataProvider[i].text, dataProvider[i].value.toString());
			}
			if (typeof selID !== 'undefined' && selID !== null) {
				var indexID = parseInt(Z.Utils.arrayIndexOfObjectValue(dataProvider, 'value', selID), 10);
				if (indexID != -1) { index = indexID; }
			}
			var indexLast = listObject.options.length - 1;
			listObject.selectedIndex = (index <= indexLast) ? index : indexLast;
		}
	},
	
	getChildElementByID : function (container, id) {
		var targetElmt = null;
		for (var i = 0, j = container.childNodes.length; i < j; i++) {
			var currNode = container.childNodes[i];
			if (currNode.id == id) {
				targetElmt = currNode;
				return targetElmt;
			} else {
				targetElmt = Z.Utils.getChildElementByID(currNode, id);
				if (targetElmt !== null) { return targetElmt; }
			}				
		}
		return targetElmt;
	},
	
	getElementPosition : function (elmt) {
		var left = 0;
		var top = 0;
		var isFixed = this.getElementStyle(elmt).position == 'fixed';
		var offsetParent = this.getOffsetParent(elmt, isFixed);
		while (offsetParent) {
			left += elmt.offsetLeft;
			top += elmt.offsetTop;
			if (isFixed) {
				var psPt = this.getPageScroll();
				left += psPt.x;
				top += psPt.y;
			}
			elmt = offsetParent;
			isFixed = this.getElementStyle(elmt).position == 'fixed';
			offsetParent = this.getOffsetParent(elmt, isFixed);
		}
		return new this.Point(left, top);
	},

	getOffsetParent : function (elmt, isFixed) {
		if (isFixed && elmt != document.body) {
			return document.body;
		} else {
			return elmt.offsetParent;
		}
	},

	getElementSize : function (elmt) {
		return new this.Point(elmt.clientWidth, elmt.clientHeight);
	},

	getElementStyle : function (elmt) {
		if (elmt.currentStyle) {
			return elmt.currentStyle;
		} else if (window.getComputedStyle) {
			return window.getComputedStyle(elmt, '');
		} else {
			this.showMessage(this.getResource('ERROR_UNKNOWNELEMENTSTYLE'));
		}
	},

	getElementStyleProperty : function (elmt, styleProp) {
		if (window.getComputedStyle) {
			return window.getComputedStyle(elmt, null).getPropertyValue(styleProp);
		} else if (elmt.currentStyle) {
			return elmt.currentStyle[styleProp];
		} else {
			this.showMessage(this.getResource('ERROR_UNKNOWNELEMENTSTYLE'));
		}
	},

	isElementFluid : function (element) {
		var testContainer, offsetW, offsetH, percent1, percent2;
		var clone = element.cloneNode(false);
		var wFluid = false, hFluid = false;
		
		// First test width.
		if (window.getComputedStyle) {
			value = window.getComputedStyle(clone,null).width;
		} else if (clone.currentStyle) {
			value = clone.currentStyle.width;
		}		
		if (typeof value !== 'undefined' && value !== null && value !== '') {
			wFluid = (value.toString().indexOf('%') != -1 || value == 'auto'); // Test for 'auto' for IE.
		} else {
			clone.style.margin = '0';
			clone.style.padding = '0';
			clone.style.maxWidth = 'none';
			clone.style.minWidth = 'none';
			testContainer = document.createElement('testContainer');
			testContainer.style.display = 'block';
			testContainer.style.width = '800px';
			testContainer.style.padding = '0';
			testContainer.style.margin = '0';
			testContainer.appendChild(clone);
			element.parentNode.insertBefore(testContainer, element);
			offsetW = clone.offsetWidth;
			testContainer.style.width = '900px';
			if ( clone.offsetWidth == offsetW ){
				element.parentNode.removeChild(testContainer);
				wFluid = false;
			} else {
				percent1 = Math.floor(100 / 800 * offsetW);
				percent2 = Math.floor(100 / 900 * clone.offsetWidth);
				element.parentNode.removeChild(testContainer);
				wFluid = (percent1 == percent2) ? true : false;
				// Debug option: console.log(Math.round(percent1) + '%');
			}
		}
		
		// If width not fluid, test height.
		if (hFluid == false) {
			if (window.getComputedStyle) {
				value = window.getComputedStyle(clone,null).height;
			} else if (clone.currentStyle) {
				value = clone.currentStyle.height;
			}
			if (typeof value !== 'undefined' && value !== null && value != '') {
				hFluid = (value.toString().indexOf('%') != -1 || value == 'auto'); // Test for 'auto' for IE.
			} else {
				clone.style.margin = '0';
				clone.style.padding = '0';
				clone.style.maxHeight = 'none';
				clone.style.minHeight = 'none';
				testContainer = document.createElement('testContainer');
				testContainer.style.display = 'block';
				testContainer.style.height = '800px';
				testContainer.style.padding = '0';
				testContainer.style.margin = '0';
				testContainer.appendChild(clone);
				element.parentNode.insertBefore(testContainer, element);
				offsetH = clone.offsetHeight;
				testContainer.style.height = '900px';
				if ( clone.offsetHeight == offsetH ){
					element.parentNode.removeChild(testContainer);
					hFluid = false;
				} else {
					percent1 = Math.floor(100 / 800 * offsetH);
					percent2 = Math.floor(100 / 900 * clone.offsetHeight);
					element.parentNode.removeChild(testContainer);
					hFluid = (percent1 == percent2) ? true : false;
					// Debug option: console.log(Math.round(percent1) + '%');
				}
			}
		}
		
		return (wFluid || hFluid);
	},

	getEventTargetCoords : function (event) {
		return getElementPosition(Z.Utils.target(event));
	},

	getFirstTouch : function (event) {
		var firstTouch = null;
		var touches = event.touches;
		var changed = event.changedTouches;
		if (typeof touches !== 'undefined') {
			firstTouch = touches[0];
		} else if (typeof changed !== 'undefined') {
			firstTouch = changed[0];
		}
		return firstTouch;
	},

	getMousePosition : function (event) {
		var x = 0;
		var y = 0;
		if (event.type == 'DOMMouseScroll' && Z.browser == Z.browsers.FIREFOX && Z.browserVersion < 3) {
			x = event.screenX;
			y = event.screenY;
		} else if (typeof event.pageX === 'number') {
			x = event.pageX;
			y = event.pageY;
		} else if (typeof event.clientX === 'number') {
			x = event.clientX + document.body.scrollLeft + document.documentElement.scrollLeft;
			y = event.clientY + document.body.scrollTop + document.documentElement.scrollTop;
		} else {
			this.showMessage(this.getResource('ERROR_UNKNOWNMOUSEPOSITION'));
		}
		return new this.Point(x, y);
	},

	getMouseScroll : function (event) {
		var delta = 0;
		if (typeof event.wheelDelta === 'number') {
			delta = event.wheelDelta;
		} else if (typeof event.detail === 'number') {
			delta = event.detail * -1;
		} else {
			this.showMessage(this.getResource('ERROR_UNKNOWNMOUSESCROLL'));
		}
		return delta ? delta / Math.abs(delta) : 0;
	},

	getPageScroll : function () {
		var x = 0;
		var y = 0;
		var docElmt = document.documentElement || {};
		var body = document.body || {};
		if (typeof window.pageXOffset === 'number') {
			x = window.pageXOffset;
			y = window.pageYOffset;
		} else if (body.scrollLeft || body.scrollTop) {
			x = body.scrollLeft;
			y = body.scrollTop;
		} else if (docElmt.scrollLeft || docElmt.scrollTop) {
			x = docElmt.scrollLeft;
			y = docElmt.scrollTop;
		}
		return new this.Point(x, y);
	},

	getScreenSize : function () {
		var x = screen.width;
		var y = screen.height;
		return new this.Point(x, y);		
	},

	getWindowSize : function () {
		var x = 0;
		var y = 0;
		var docElmt = document.documentElement || {};
		var body = document.body || {};
		if (typeof window.innerWidth === 'number') {
			x = window.innerWidth;
			y = window.innerHeight;
		} else if (docElmt.clientWidth || docElmt.clientHeight) {
			x = docElmt.clientWidth;
			y = docElmt.clientHeight;
		} else if (body.clientWidth || body.clientHeight) {
			x = body.clientWidth;
			y = body.clientHeight;
		} else {
			this.showMessage(this.getResource('ERROR_UNKNOWNWINDOWSIZE'));
		}
		return new this.Point(x, y);
	},

	Button : function (id, label, graphicPath, graphicUp, graphicOver, graphicDown, w, h, x, y, btnEvnt, btnEvntHndlr, tooltipResource, borderStyle, borderWidth, background, margin, padding, whiteSpace, cursor) {
		// Create button element.
		var button = Z.Utils.createContainerElement('span', id, 'inline-block', 'absolute', 'hidden', w, h, x, y, borderStyle, borderWidth, background, margin, padding, whiteSpace, cursor);

		if (!(Z.Utils.stringValidate(label))) {
			// Load images for each button state.
			graphicPath = Z.Utils.stringRemoveTrailingSlashCharacters(graphicPath);
			var imgUp = Z.Utils.createGraphicElement(graphicPath + '/' + graphicUp);
			var imgOver = Z.Utils.createGraphicElement(graphicPath + '/' + graphicOver);
			var imgDown = Z.Utils.createGraphicElement(graphicPath + '/' + graphicDown);
						
			// Set size and position of button images.			
			imgUp.style.width = imgOver.style.width = imgDown.style.width =  w;
			imgUp.style.height = imgOver.style.height = imgDown.style.height = h;
			imgUp.style.position = imgOver.style.position = imgDown.style.position = 'absolute';
			if (Z.browser == Z.browsers.FIREFOX && Z.browserVersion < 3) { imgUp.style.top = imgOver.style.top = imgDown.style.top = ''; }
			
			// Set size and position of button images. Do not explicitly set 'up' graphic visible
			// because this leads to button showing even if in CSS layer that is initially hidden.
			imgOver.style.visibility = imgDown.style.visibility = 'hidden';

			// Set image alt attribute for accessibility compliance.
			imgUp.alt = imgOver.alt = imgDown.alt = '';
			if (typeof tooltipResource !== 'undefined' && Z.Utils.stringValidate(tooltipResource)) {
				imgUp.alt = Z.Utils.getResource(tooltipResource);
			}

			// Add images to button.
			button.appendChild(imgUp);
			button.appendChild(imgOver);
			button.appendChild(imgDown);
			
		} else {
			var textNode = document.createTextNode(label);
			button.appendChild(Z.Utils.createCenteredElement(textNode));
			Z.Utils.setTextNodeStyle(textNode, 'black', 'verdana', '13px', 'none', 'normal', 'normal', 'normal', 'normal', '1em', 'center', 'none');
		}
		
		// Prevent graphic dragging, event bubbling, menu display, label text selection.
		Z.Utils.addEventListener(button, 'mousedown', Z.Utils.preventDefault);
		Z.Utils.addEventListener(button, 'mouseover', Z.Utils.stopPropagation);
		Z.Utils.addEventListener(button, 'mousedown', Z.Utils.stopPropagation);
		Z.Utils.addEventListener(button, 'mouseup', Z.Utils.stopPropagation);
		Z.Utils.addEventListener(button, 'mouseout', Z.Utils.stopPropagation);
		if (typeof imageUp !== 'undefined') {
			Z.Utils.addEventListener(imgUp, 'contextmenu', Z.Utils.preventDefault);
			Z.Utils.addEventListener(imgOver, 'contextmenu', Z.Utils.preventDefault);
			Z.Utils.addEventListener(imgDown, 'contextmenu', Z.Utils.preventDefault);
			//imgUp.oncontextmenu = Z.Utils.preventDefault; // DEV NOTE: Ineffective on IE.
		}
		Z.Utils.addEventListener(button, "touchstart", Z.Utils.preventDefault);
		Z.Utils.addEventListener(button, "touchend", Z.Utils.preventDefault);
		Z.Utils.addEventListener(button, "touchcancel", Z.Utils.preventDefault);
		if (!(Z.Utils.stringValidate(label))) {
			Z.Utils.disableTextInteraction(textNode);
			Z.Utils.addEventListener(button, 'contextmenu', Z.Utils.preventDefault);
		}
			
		// Set tooltip visibility per optional parameter.
		if (Z.tooltipsVisible && Z.Utils.stringValidate(tooltipResource)) { button.title = Z.Utils.getResource(tooltipResource); }

		// Return button with event handler enabled. 
		Z.Utils.setButtonHandler(button, btnEvnt, btnEvntHndlr);
		this.elmt = button;
	},

	buttonSize : function (targetBtn, w, h) {
		var btnS = targetBtn.style;			
		btnS.width = w + 'px';
		btnS.height = h + 'px';		
		var iU = targetBtn.firstChild;
		var iO = targetBtn.childNodes[1];
		var iD = targetBtn.childNodes[2];
		if (iU && iO && iD) {
			iU.style.width = iO.style.width = iD.style.width = w + 'px';
			iU.style.height = iO.style.height = iD.style.height = w + 'px';
		}
	},
	
	setButtonDefaults : function (targetBtn) {
		Z.Utils.clearButtonSettings(targetBtn);
		Z.Utils.setButtonState(targetBtn, 'up');
		Z.Utils.setButtonHandler(targetBtn, 'mouseover', Z.Toolbar.buttonEventsHandler);
	},
		
	clearButtonSettings : function (targetBtn) {
		var iU = targetBtn.firstChild;
		var iO = targetBtn.childNodes[1];
		var iD = targetBtn.childNodes[2];
		if (iU && iO && iD) {
			iU.style.visibility = iO.style.visibility = iD.style.visibility = 'hidden';
			Z.Utils.removeEventListener(iU, 'mouseover', Z.Toolbar.buttonEventsHandler);
			Z.Utils.removeEventListener(iO, 'mousedown', Z.Toolbar.buttonEventsHandler);
			Z.Utils.removeEventListener(iO, 'mouseout', Z.Toolbar.buttonEventsHandler);
			Z.Utils.removeEventListener(iD, 'mouseup', Z.Toolbar.buttonEventsHandler);
			Z.Utils.removeEventListener(targetBtn, 'touchstart', Z.Toolbar.buttonEventsHandler);
			Z.Utils.removeEventListener(targetBtn, 'touchend', Z.Toolbar.buttonEventsHandler);
			Z.Utils.removeEventListener(targetBtn, 'touchcancel', Z.Toolbar.buttonEventsHandler);
		}	
		Z.Utils.removeEventListener(targetBtn, 'mouseover', Z.Toolbar.buttonEventsHandler);
		Z.Utils.removeEventListener(targetBtn, 'mousedown', Z.Toolbar.buttonEventsHandler);
		Z.Utils.removeEventListener(targetBtn, 'mouseout', Z.Toolbar.buttonEventsHandler);
		Z.Utils.removeEventListener(targetBtn, 'mouseup', Z.Toolbar.buttonEventsHandler);
	},
	
	setButtonState : function (targetBtn, state) {
		var graphic = (state == 'up') ? targetBtn.firstChild : (state == 'down') ? targetBtn.childNodes[1] : targetBtn.childNodes[2];
		if (graphic) { graphic.style.visibility = 'visible'; }
	},
	
	setButtonHandler : function (target, btnEvnt, btnEvntHndlr) {
		// Allow for button with graphics or label, context as pc or mobile device, and event up, over, or down state relevant.
		
		var targetEventHandler = (btnEvntHndlr !== 'undefined') ? btnEvntHndlr : Z.Toolbar.buttonEventsHandler;
		var mouseEvent = (btnEvnt !== 'undefined') ? btnEvnt : 'mouseover';
		var touchEvent = (btnEvnt == 'mousedown') ? 'touchstart' : 'touchend';
		var pointerEvent = (btnEvnt == 'mousedown') ? 'MSPointerDown' : 'MSPointerUp';
		
		// MSPointer event support to follow.
		//targetEvent = (window.navigator.msPointerEnabled) ? pointerEvent : (Z.touchSupport) ? touchEvent : mouseEvent;
		
		// Support touch and mouse events and prevent touch events from simulating mouse events and creating duplicate function calls.
		//targetEvent = (Z.touchSupport) ? touchEvent : mouseEvent;
		
		var target = target;
		if (btnEvnt == 'mouseover' && typeof target.firstChild !== 'undefined') {
			target = target.firstChild;
		} else if (btnEvnt == 'mousedown' && typeof target.childNodes[1] !== 'undefined') {
			//target = target.childNodes[1];
		} else if (btnEvnt == 'mouseup' && typeof target.childNodes[2] !== 'undefined') {
			target = target.childNodes[2];
		} else if (btnEvnt == 'mouseout' && typeof target.childNodes[1] !== 'undefined') {
			target = target.childNodes[1];
		}
		
		// Support touch and mouse events and prevent touch events from simulating mouse events and creating duplicate function calls.
		//Z.Utils.addEventListener(target, targetEvent, targetEventHandler);
		Z.Utils.addEventListener(target, touchEvent, targetEventHandler);
		Z.Utils.addEventListener(target, mouseEvent, targetEventHandler);
	},
	
	Checkbox : function (id, value, w, h, x, y, checkEvnt, checkEvntHndlr, tooltipResource) {
		// Container serves as workaround for checkbox and form sizing and positioning problems.
		var containerBox = Z.Utils.createContainerElement('div', 'containerFor-' + id, 'inline-block', 'absolute', 'hidden', w, h, x, y, 'none', '0px', 'transparent none', '0px', '0px', 'normal');
		var checkBox = document.createElement('input');
		containerBox.appendChild(checkBox);
		checkBox.type = 'checkbox';
		checkBox.id = id;
		checkBox.value = value;
		checkBox.width = w;
		checkBox.height = h;
		var cS = containerBox.style;
		cS.width = w + 'px';
		cS.height = h + 'px';
		cS.left = x + 'px';
		cS.top = y + 'px';
		
		// Set event handler and element reference - the handler must support mouse and touch contexts.
		Z.Utils.addEventListener(checkBox, checkEvnt, checkEvntHndlr);
		Z.Utils.addEventListener(checkBox, 'touchstart', checkEvntHndlr);

		// Set tooltip visibility per optional parameter.
		if (Z.tooltipsVisible && Z.Utils.stringValidate(tooltipResource)) { checkBox.title = Z.Utils.getResource(tooltipResource); }

		return containerBox;
	},

	Graphic : function (id, graphicPath, graphic, w, h, x, y, altResource) {
		// Load image for graphic.
		graphicPath = Z.Utils.stringRemoveTrailingSlashCharacters(graphicPath);
		var graphicPathFull = (graphic) ? graphicPath + '/' + graphic : graphicPath;
		var img = Z.Utils.createGraphicElement(graphicPathFull);
		var igS = img.style;
		igS.width = w;
		igS.height = h;

		// Set image alt attribute for accessibility compliance.
		if (typeof altResource !== 'undefined' && Z.Utils.stringValidate(altResource)) {
			img.alt = Z.Utils.getResource(altResource);
		} else {
			img.alt = '';
		}

		// Create graphic element and add image to it.
		var graphic = Z.Utils.createContainerElement('span', id, 'inline-block', 'absolute', 'hidden', w, h, x, y, 'none', '0px', 'transparent none', '0px', '0px', 'normal');
		graphic.appendChild(img);
		this.elmt = graphic;

		// Prevent graphic dragging and disable context menu.
		Z.Utils.addEventListener(img, 'mousedown', Z.Utils.preventDefault);
		Z.Utils.addEventListener(img, 'touchstart', Z.Utils.preventDefault);
		Z.Utils.addEventListener(img, 'contextmenu', Z.Utils.preventDefault);
	},

	createGraphicElement : function (imageSrc) {			
		var gImg = this.createContainerElement('img');
		var gElmt = null;
		if (Z.browser == Z.browsers.IE && Z.browserVersion < 7) {
			gElmt = this.createContainerElement('span', null, 'inline-block');
			gImg.onload = function () {
				gElmt.style.width = gElmt.style.width || gImg.width + 'px';
				gElmt.style.height = gElmt.style.height || gImg.height + 'px';
				gImg.onload = null;
				gImg = null;
			};
			gElmt.style.filter = 'progid:DXImageTransform.Microsoft.AlphaImageLoader(src="' + imageSrc + '", sizingMethod="scale")';
		} else {
			gElmt = gImg;
			gElmt.src = imageSrc;
		}
		return gElmt;
	},

	graphicSize : function (targetGphc, w, h) {
			var gS = targetGphc.style;
			gS.width = w + 'px';
			gS.height = h + 'px';
			var img = targetGphc.firstChild;
			var imgS = img.style;
			imgS.width = w + 'px';
			imgS.height = h + 'px';
	},

	Point : function (x, y) {
		this.x = typeof x === 'number' ? x : 0;
		this.y = typeof y === 'number' ? y : 0;
	},

	Point3D : function (x, y, z) {
		this.x = typeof x === 'number' ? x : 0;
		this.y = typeof y === 'number' ? y : 0;
		this.z = typeof z === 'number' ? z : 0;
	},

	Trio : function (a, b, c) {
		this.a = a;
		this.b = b;
		this.c = c;
	},

	Range : function (start, end) {
		this.start = typeof start === 'number' ? start : 0;
		this.end = typeof end === 'number' ? end : 0;
	},
		
	swapZIndices : function (element1, element2) {
		var zIndex1 = Z.Utils.getElementStyleProperty(element1, 'z-index');
		var zIndex2 = Z.Utils.getElementStyleProperty(element2, 'z-index');
		element1.style.zIndex = zIndex2;
		element2.style.zIndex = zIndex1;
	},
	
	//::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::
	//::::::::::::::::: COLOR, STRING, TEXT STYLE UTILITY FUNCTIONS :::::::::::::::::::::
	//::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::
	
	stringValidate : function (value) {
		return (typeof value !== 'undefined' && value !== null && value !== '' && value !== 'null'); // Final check for 'null' string value added for XML uses.
	},
	
	// Replace spaces to make escaped XML easier to read. Not currently required due to minimal escaping by function xmlEscapeMinimal.
	stringReadable : function (stringToModify) {
		var stringToReplace;
		var regularExpression;
		var stringToInsert;
		var modifiedString;

		// DEV NOTE: replace single quotes (apostrophes).
		stringToReplace = "%20";
		regularExpression = new RegExp(stringToReplace, "g"); 
		stringToInsert = " ";
		modifiedString = stringToModify.replace(regularExpression, stringToInsert);

		// DEV NOTE: to replace other characters, replicate four preceeding code lines here:

		return modifiedString;
	},
	
	stringLowerCaseFirstLetter : function (string) {
	    return string.charAt(0).toLowerCase() + string.slice(1);
	},

	stringUpperCaseFirstLetter : function (string) {
	    return string.charAt(0).toUpperCase() + string.slice(1);
	},
	
	stringMultiply : function (str, num) {
		var i = Math.ceil(Math.log(num) / Math.LN2);
		var result = str;
		do {
			result += result;
		} while (0 < --i);
		return result.slice(0, str.length * num);
	},

	stringRemoveTrailingSlashCharacters : function (stringToClean) {
		var stringCleaned = (stringToClean.slice(-1, stringToClean.length) == '/') ? stringToClean.slice(0, stringToClean.length-1) : stringToClean;
		// Next line removed to allow for leading slash signifying root context.
		//stringCleaned = (stringToClean.slice(0, 1) == '/') ? stringToClean.slice(1, stringToClean.length) : stringToClean;
		return stringCleaned;
	},

	stringRemoveTabAndLineWrapCharacters : function (stringToClean) {
		var stringCleaned = stringToClean.replace(/\n/g, '');
		stringCleaned = stringCleaned.replace(/\r/g, '');
		stringCleaned = stringCleaned.replace(/\t/g, '');
		return stringCleaned;
	},

	stringUnescapeAmpersandCharacters : function (stringToClean) {
		var stringCleaned = stringToClean.replace(/\n/g, '');
		stringCleaned = stringCleaned.replace(/&#38;/g, '&');
		stringCleaned = stringCleaned.replace(/&#038;/g, '&');
		stringCleaned = stringCleaned.replace(/&amp;/g, '&');
		return stringCleaned;
	},
	
	setHTMLTextDefaultCaptionStyle : function (htmlTextNode, HTML, color, fontFamily, fontSize, fontSizeAdjust, fontStyle, fontStretch, fontVariant, fontWeight, lineHeight, textAlign, textDecoration) {
		var htmlTextStyle = htmlTextNode.style;
		if (HTML.indexOf('color=') == -1) { htmlTextStyle.color = color; }
		if (HTML.indexOf('font-family=') == -1) { htmlTextStyle.fontFamily = fontFamily; }
		if (HTML.indexOf('font-size=') == -1) { htmlTextStyle.fontSize = fontSize; }
		if (HTML.indexOf('font-size-adjust=') == -1) { htmlTextStyle.fontSizeAdjust = fontSizeAdjust; }
		if (HTML.indexOf('font-style=') == -1) { htmlTextStyle.fontStyle = fontStyle; }
		if (HTML.indexOf('font-stretch=') == -1) { htmlTextStyle.fontStretch = fontStretch; }
		if (HTML.indexOf('font-variant=') == -1) { htmlTextStyle.fontVariant = fontVariant; }
		if (HTML.indexOf('font-weight=') == -1) { htmlTextStyle.fontWeight = fontWeight; }
		if (HTML.indexOf('line-height=') == -1) { htmlTextStyle.lineHeight = lineHeight; }
		if (HTML.indexOf('text-align=') == -1) { htmlTextStyle.textAlign = textAlign; }
		if (HTML.indexOf('text-decoration=') == -1) { htmlTextStyle.textDecoration = textDecoration; }
	},
	
	setHTMLTextStyle : function (htmlTextNode, color, fontFamily, fontSize, fontSizeAdjust, fontStyle, fontStretch, fontVariant, fontWeight, lineHeight, textAlign, textDecoration) {
		var htmlTextStyle = htmlTextNode.style;
		htmlTextStyle.color = color;
		htmlTextStyle.fontFamily = fontFamily;
		htmlTextStyle.fontSize = fontSize;
		htmlTextStyle.fontSizeAdjust = fontSizeAdjust;
		htmlTextStyle.fontStyle = fontStyle;
		htmlTextStyle.fontStretch = fontStretch;
		htmlTextStyle.fontVariant = fontVariant;
		htmlTextStyle.fontWeight = fontWeight;
		htmlTextStyle.lineHeight = lineHeight;
		htmlTextStyle.textAlign = textAlign;
		htmlTextStyle.textDecoration = textDecoration;
	},
	
	setTextAreaStyle : function (textBox, color, fontFamily, fontSize, fontSizeAdjust, fontStyle, fontStretch, fontVariant, fontWeight, lineHeight, textAlign, textDecoration, padding) {
		var tStyle = textBox.firstChild.style;
		tStyle.color = color;
		tStyle.fontFamily = fontFamily;
		tStyle.fontSize = fontSize;
		tStyle.fontSizeAdjust = fontSizeAdjust;
		tStyle.fontStyle = fontStyle;
		tStyle.fontStretch = fontStretch;
		tStyle.fontVariant = fontVariant;
		tStyle.fontWeight = fontWeight;
		tStyle.lineHeight = lineHeight;
		tStyle.textAlign = textAlign;
		tStyle.textDecoration = textDecoration;
		tStyle.padding = padding;
	},
	
	setTextNodeStyle : function (textNode, color, fontFamily, fontSize, fontSizeAdjust, fontStyle, fontStretch, fontVariant, fontWeight, lineHeight, textAlign, textDecoration) {
		var tStyle = textNode.parentNode.style;
		tStyle.color = color;
		tStyle.fontFamily = fontFamily;
		tStyle.fontSize = fontSize;
		tStyle.fontSizeAdjust = fontSizeAdjust;
		tStyle.fontStyle = fontStyle;
		tStyle.fontStretch = fontStretch;
		tStyle.fontVariant = fontVariant;
		tStyle.fontWeight = fontWeight;
		tStyle.lineHeight = lineHeight;
		tStyle.textAlign = textAlign;
		tStyle.textDecoration = textDecoration;
	},
	
	stringValidateColorValue : function (value) {
		if (!Z.Utils.stringValidate(value)) { value = '#000000'; }
		if (value.indexOf('#') != 0) { value = '#' + value; }
		return value;
	},
		
	hexToRGB : function (hexStr) {
		// Expand shorthand to full form.
		var shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
		hexStr = hexStr.replace(shorthandRegex, function(m, r, g, b) {
			return r + r + g + g + b + b;
		});

		var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hexStr);
		return result ? {
			r: parseInt(result[1], 16),
			g: parseInt(result[2], 16),
			b: parseInt(result[3], 16)
		} : null;
	},



	//::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::
	//:::::::::::::::::::::::::::::::: XML & JSON UTILITY FUNCTIONS ::::::::::::::::::::::::::::::::::
	//::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::

	xmlConvertTextToDoc : function (xmlText) {
		var xmlDoc = null;
		if (window.ActiveXObject) {
			try {
				xmlDoc = new ActiveXObject('Microsoft.XMLDOM');
				xmlDoc.async = false;
				xmlDoc.loadXML(xmlText);
			} catch (e) {
				this.showMessage(e.name + this.getResource('ERROR_CONVERTINGXMLTEXTTODOC') + e.message);
			}
		} else if (window.DOMParser) {
			try {
				var parser = new DOMParser();
				xmlDoc = parser.parseFromString(xmlText, 'text/xml');
			} catch (e) {
				this.showMessage(e.name + this.getResource('ERROR_CONVERTINGXMLTEXTTODOC') + e.message);
			}
		} else {
			this.showMessage(this.getResource('ERROR_XMLDOMUNSUPPORTED'));
		}
		return xmlDoc;
	},

	xmlConvertDocToText : function (xmlDoc) {
		var xmlText = null;
		if (window.ActiveXObject) {
			try {
				xmlText = xmlDoc.xml;
			} catch (e) {
				this.showMessage(e.name + this.getResource('ERROR_CONVERTINGXMLDOCTOTEXT') + e.message);
			}
		} else if (window.DOMParser) {
			try {
				xmlText = (new XMLSerializer()).serializeToString(xmlDoc);
			} catch (e) {
				this.showMessage(e.name + this.getResource('ERROR_CONVERTINGXMLDOCTOTEXT') + e.message);
			}
		} else {
			this.showMessage(this.getResource('ERROR_XMLDOMUNSUPPORTED'));
		}
		return xmlText;
	},
	
	xmlEscapeMinimal : function (content) {
		var repCont = null;
		if (typeof content !== 'undefined' && content !== null) {
			repCont = content.replace(/&/g, '&amp;')
				.replace(/</g, '&lt;')
				.replace(/>/g, '&gt;')
				.replace(/"/g, '&quot;')
				.replace(/'/g, '&apos;')
				.replace(/\r?\n/g, '%0A');
		}
		return repCont;
	},
	
	xmlUnescapeMinimal : function (content) {
		var repCont = null;
		if (typeof content !== 'undefined' && content !== null) {
			repCont = content.replace(/%0A/g, '\n')
				.replace(/&apos;/g, "'")
				.replace(/&quot;/g, '"')
				.replace(/&gt;/g, '>')
				.replace(/&lt;/g, '<')
				.replace(/&amp;/g, "&");
		}
		return repCont;
	},

	// This is a not a generic JSON to XML conversion function.  It is tailored to the objects in this application (CDATA not currently supported).
	jsonConvertObjectToXMLText : function (jsonObject) {	
		var convertToXML = function (pValue, pName) {
			var xmlNew = '';
			if (pValue instanceof Array) {
				for (var i = 0, j = pValue.length; i < j; i++) {
					xmlNew += convertToXML(pValue[i], pName) + '\n';
				}
			} else if (typeof pValue === 'object') {
				var hasChild = false;
				xmlNew += '<' + pName;
				for (var propName in pValue) {
					if (typeof pValue[propName] !== 'object') {
						xmlNew += ' ' + propName + '=\"' + pValue[propName].toString() + '\"';
					} else {
						hasChild = true;
					}
				}
				// DEV NOTE: workaround for 'object' test causing redundant close.
				xmlNew += '>'; //xmlNew += hasChild ? '>' : '/>';
				if (hasChild) {
					for (var propName in pValue) {
						if (propName == '#text') {
							xmlNew += pValue[propName];
						} else if (typeof pValue[propName] === 'object') {
							xmlNew += convertToXML(pValue[propName], propName);
						}
					}
				}
				xmlNew += '</' + pName + '>';
			} else {
				xmlNew += '<' + pName + '>' + pValue.toString() +  '</' + pName + '>';
			}
			return xmlNew;
		}, xmlNew='';
																		
		for (var propName in jsonObject) {
			xmlNew += convertToXML(jsonObject[propName], propName);
		}
		
		var xmlOut = xmlNew.replace(/\t|\n/g, '');

		// Debug option: Compare values loaded and converted.
		//console.log('JSON object in: ' + JSON.stringify(jsonObject, null, ' '));
		//console.log('XML out: ' + xmlOut);
		
		return xmlOut;
	},
	
	// This is a not a generic XML to JSON conversion function.  It is tailored to the objects in this application (CDATA not currently supported).
	jsonConvertXMLTextToJSONText : function (xmlIn) {
	
		var Converter = {
		
			convertToObject : function (xml) {
				var cvrtObj = {};
				if (xml.nodeType == 1) {
					if (xml.attributes.length) {
						for (var i = 0, j = xml.attributes.length; i < j; i++) {
							cvrtObj[xml.attributes[i].nodeName] = (xml.attributes[i].nodeValue||'').toString();
						}
					}
					if (xml.firstChild) {
						var textChild = 0, hasElementChild = false;
						for (var n = xml.firstChild; n; n = n.nextSibling) {
							if (n.nodeType == 1) {
								hasElementChild = true;
							} else if (n.nodeType == 3 && n.nodeValue.match(/[^ \f\n\r\t\v]/)) {
								textChild++;
							}
						}
						if (hasElementChild) {
							if (textChild < 2) {
								Converter.reduceWhitespace(xml);
								for (var n = xml.firstChild; n; n = n.nextSibling) {
									if (n.nodeType == 3) {
										cvrtObj['#text'] = Converter.escapeMinimal(n.nodeValue);
									} else if (cvrtObj[n.nodeName]) {
										if (cvrtObj[n.nodeName] instanceof Array) {
											cvrtObj[n.nodeName][cvrtObj[n.nodeName].length] = Converter.convertToObject(n);
										} else {
											cvrtObj[n.nodeName] = [cvrtObj[n.nodeName], Converter.convertToObject(n)];
										}
									} else {
										cvrtObj[n.nodeName] = Converter.convertToObject(n);
									}
								}
							} else {
								if (!xml.attributes.length) {
									cvrtObj = Converter.escapeMinimal(Converter.innerXML(xml));
								} else {
									cvrtObj['#text'] = Converter.escapeMinimal(Converter.innerXML(xml));
								}
							}
						} else if (textChild) {
							if (!xml.attributes.length) {
								cvrtObj = Converter.escapeMinimal(Converter.innerXML(xml));
							} else {
								cvrtObj['#text'] = Converter.escapeMinimal(Converter.innerXML(xml));
							}
						}
					}
					if (!xml.attributes.length && !xml.firstChild) {
						cvrtObj = null;
					}
				} else if (xml.nodeType == 9) {
					cvrtObj = Converter.convertToObject(xml.documentElement);
				} else {
					alert('This node type not supported : ' + xml.nodeType);
				}
				return cvrtObj;
			},

			convertToJSONText : function (cvrtObj, name) {
				var jsonTxt = name ? ('\"' + name + '\"') : '';
				if (cvrtObj instanceof Array) {
					for (var i = 0, n = cvrtObj.length; i < n; i++) {
						cvrtObj[i] = Converter.convertToJSONText(cvrtObj[i], '', '\t');
					}
					jsonTxt += (name ? ':[' : '[') + (cvrtObj.length > 1 ? ('\n' + '\t' + cvrtObj.join(',\n' + '\t') + '\n') : cvrtObj.join('')) + ']';
				} else if (cvrtObj == null) {
					jsonTxt += (name && ':') + 'null';
				} else if (typeof(cvrtObj) === 'object') {
					var arrJTxt = [];
					for (var m in cvrtObj) {
						arrJTxt[arrJTxt.length] = Converter.convertToJSONText(cvrtObj[m], m, '\t');
					}
					jsonTxt += (name ? ':{' : '{') + (arrJTxt.length > 1 ? ('\n' + '\t' + arrJTxt.join(',\n' + '\t') + '\n') : arrJTxt.join('')) + '}';
				} else if (typeof(cvrtObj) == 'string') {
					jsonTxt += (name && ':') + '\"' + cvrtObj.toString() + '\"';
				} else {
					jsonTxt += (name && ':') + cvrtObj.toString();
				}
				return jsonTxt;
			},
		      
			reduceWhitespace : function (xmlToReduce) {
				xmlToReduce.normalize();
				for (var n = xmlToReduce.firstChild; n; ) {
					if (n.nodeType == 3) {
						if (!n.nodeValue.match(/[^ \f\n\r\t\v]/)) {
							var nxt = n.nextSibling;
							xmlToReduce.removeChild(n);
							n = nxt;
						} else {
							n = n.nextSibling;
						}
					} else if (n.nodeType == 1) {
						Converter.reduceWhitespace(n);
						n = n.nextSibling;
					} else {
						n = n.nextSibling;
					}
				}
				return xmlToReduce;
			},

			escapeMinimal : function (content) {
				return content.replace(/[\\]/g, '\\\\')
					.replace(/[\"]/g, '\\"')
					.replace(/[\n]/g, '\\n')
					.replace(/[\r]/g, '\\r');
			},

			innerXML : function (node) {
				var toXML = '';
				if ('innerHTML' in node) {
					toXML = node.innerHTML;
				} else {
					var asXML = function (n) {
						var toXML = '';
						if (n.nodeType == 1) {
							toXML += '<' + n.nodeName;
							for (var i = 0, j = n.attributes.length; i < j; i++) {
								toXML += ' ' + n.attributes[i].nodeName + '=\'' + (n.attributes[i].nodeValue||'').toString() + '\'';
							}
							if (n.firstChild) {
								toXML += '>';
								for (var childNode = n.firstChild; childNode; childNode = childNode.nextSibling) {
									toXML += asXML(childNode);
								}
								toXML += '</' + n.nodeName + '>';
							} else {
								toXML += '/>';
							}
						} else if (n.nodeType == 3) {
							toXML += n.nodeValue;
						}
						return toXML;
					};
					for (var childNode = node.firstChild; childNode; childNode = childNode.nextSibling) {
						toXML += asXML(childNode);
					}
				}
				return toXML;
			}
		};
		   
		if (xmlIn.nodeType == 9) {
			xml = xml.documentElement;
		}
		
		var jsonText = Converter.convertToJSONText(Converter.convertToObject(Converter.reduceWhitespace(xmlIn)), xmlIn.nodeName, '\t');
		jsonTextOut = '{\n' + '  ' + ('  ' ? jsonText.replace(/\t/g, '  ') : jsonText.replace(/\t|\n/g, '')) + '\n}';
	
		// Debug option: Compare values loaded and converted.
		//console.log('XML text in: \n' + Z.Utils.xmlConvertDocToText(xmlIn));
		//console.log('JSON text out: \n' + jsonTextOut);

		return jsonTextOut;
	},
	
	

	//::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::
	//::::::::::::::::::::::::::::::::: ARRAY UTILITY FUNCTIONS ::::::::::::::::::::::::::::::
	//::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::

	// Deletes all elements. Note that arr = []; creates new empty array and leaves any referenced original 
	// array unchanged. Also note that this approach performs up to 10x faster than arr.length = 0;
	arrayClear : function (arr) {
		if (arr) {
			while(arr.length > 0) {
			    arr.pop();
			}
		}
	},
	
	// This is a not a generic deep object copy function.  It is a three-level copy function for specific objects in this application.
	arrayClone : function (arrName, arrFrom, arrTo) {
		arrTo = [];
		switch (arrName) {
			case 'pois' :
				for (var i = 0, j = arrFrom.length; i < j; i++) {
					arrTo[arrTo.length] = { text:arrFrom[i].text, value:arrFrom[i].value, id:arrFrom[i].id, x:arrFrom[i].x, y:arrFrom[i].y, z:arrFrom[i].z };
				}
				break;
			case 'labels' :
				for (var i = 0, j = arrFrom.length; i < j; i++) {
					arrTo[arrTo.length] = { text:arrFrom[i].text, value:arrFrom[i].value, poiID:arrFrom[i].poiID, id:arrFrom[i].id };
				}
				break;
			case 'hotspots' :
				for (var i = 0, j = arrFrom.length; i < j; i++) {
					arrTo[arrTo.length] = {
						id: arrFrom[i].id,
						internalID: arrFrom[i].internalID,
						poiID: arrFrom[i].poiID,						
						name: arrFrom[i].name,
						mediaType: arrFrom[i].mediaType,
						media: arrFrom[i].media,
						audio: arrFrom[i].audio,
						image: arrFrom[i].image,
						iW: arrFrom[i].iW,
						iH: arrFrom[i].iH,
						x: arrFrom[i].x,
						y: arrFrom[i].y,
						z: arrFrom[i].z,
						xScale: arrFrom[i].xScale,
						yScale: arrFrom[i].yScale,
						clickURL: arrFrom[i].clickURL,
						urlTarget: arrFrom[i].urlTarget,
						rollover: arrFrom[i].rollover,
						caption: arrFrom[i].caption,
						tooltip: arrFrom[i].tooltip,
						user: arrFrom[i].user,
						date: arrFrom[i].date,
						textColor: arrFrom[i].textColor,
						backColor: arrFrom[i].backColor,
						lineColor: arrFrom[i].lineColor,
						fillColor: arrFrom[i].fillColor,
						textVisible: arrFrom[i].textVisible,
						backVisible: arrFrom[i].backVisible,
						lineVisible: arrFrom[i].lineVisible,
						fillVisible: arrFrom[i].fillVisible,
						captionPosition: arrFrom[i].captionPosition,
						saved: arrFrom[i].saved,
						visibility: arrFrom[i].visibility,						
						captionHTML: arrFrom[i].captionHTML,
						tooltipHTML: arrFrom[i].tooltipHTML,					
						polyClosed: arrFrom[i].polyClosed,
						polygonPts: arrFrom[i].polygonPts,				
						showFor: arrFrom[i].showFor,
						transition: arrFrom[i].transition,
						changeFor: arrFrom[i].changeFor,
						rotation: arrFrom[i].rotation
					 };
				}
				break;
			case 'polygon' :
				for (var i = 0, j = arrFrom.length; i < j; i++) {
					arrTo[arrTo.length] = { x:arrFrom[i].x, y:arrFrom[i].y };
				}
				break;
			case 'notes' :
				for (var i = 0, j = arrFrom.length; i < j; i++) {
					arrTo[arrTo.length] = { text:arrFrom[i].text, value:arrFrom[i].value, noteText:arrFrom[i].noteText, poiID:arrFrom[i].poiID, id:arrFrom[i].id };
				}
				break;
			case 'magnifications' :
				for (var i = 0, j = arrFrom.length; i < j; i++) {
					arrTo[arrTo.length] = { text:arrFrom[i].text, value:arrFrom[i].value };
				}
				break;
		}
		return arrTo;
	},

	arrayIndexOf : function (arr, obj, fromIndex) {
		if (!fromIndex) {
			fromIndex = 0;
		} else if (fromIndex < 0) {
			fromIndex = Math.max(0, arr.length + fromIndex);
		}
		for (var i = fromIndex, j = arr.length; i < j; i++) {
			if (arr[i] === obj) { return i; }
		}
		return -1;
	},

	arrayIndexOfObjectValue : function (arr, subobj, obj, fromIndex) {		
		if (typeof arr !== 'undefined') {
			if (!fromIndex) {
				fromIndex = 0;
			} else if (fromIndex < 0) {
				fromIndex = Math.max(0, arr.length + fromIndex);
			}
			for (var i = fromIndex, j = arr.length; i < j; i++) {
				if (arr[i][subobj] === obj) { return i; }
			}
		}
		return -1;
	},

	arrayIndexOfObjectTwoValues : function (arr, subobj, obj, fromIndex, subobj2, obj2) {
		if (typeof arr !== 'undefined') {
			if (!fromIndex) {
				fromIndex = 0;
			} else if (fromIndex < 0) {
				fromIndex = Math.max(0, arr.length + fromIndex);
			}
			for (var i = fromIndex, j = arr.length; i < j; i++) {				
				if (arr[i][subobj] === obj) { // Find first match.				
					if (arr[i][subobj2].toString() === obj2.toString()) { // Find second match. // DEV NOTE .toString MAY CONFICT WITH SOME USES.
						return i;
					}
				}
			}
		}
		return -1;
	},

	arrayIndexOfObjectValueSubstring : function (arr, subobj, obj, fromIndex, caseInsensitive) {
		if (!fromIndex) {
			fromIndex = 0;
		} else if (fromIndex < 0) {
			fromIndex = Math.max(0, arr.length + fromIndex);
		}
		for (var i = fromIndex, j = arr.length; i < j; i++) {
			if (caseInsensitive) {
				if (arr[i][subobj].toLowerCase().indexOf(obj) != -1) { return i; }
			} else {
				if (arr[i][subobj].indexOf(obj) != -1) { return i; }
			}
		}
		return -1;
	},

	arraySplice : function (arr, iStart, iLength) {
		if (Z.arraySpliceSupported) {
			if (arguments.length > 3) {
				for (var i = 3, j = arguments.length; i < j; i++) {
					arr.splice(iStart, iLength, arguments[i]);
				}
			} else {
				arr.splice(iStart, iLength);
			}
		} else {
			if (iLength < 0) { iLength = 0; }
			var aInsert = [];
			if (arguments.length > 3) {
				for (var i = 3, j = arguments.length; i < j; i++) { aInsert[aInsert.length] = arguments[i]; }
			}
			var aHead = Z.Utils.arraySubarray(arr, 0, iStart);
			var aDelete = Z.Utils.arraySubarrayLen(arr, iStart, iLength);
			var aTail = Z.Utils.arraySubarray(arr, iStart + iLength);
			var aNew = aHead.concat(aInsert, aTail);
			arr.length = 0;
			for (var i = 0, j = aNew.length; i < j; i++) { arr[arr.length] = aNew[i]; }
			arr = aDelete;
		}
		return arr;
	},

	arraySubarraySimple : function (start, end) {
		return this.slice(start, end);
	},

	arraySortNumericAscending : function (arr, a, b) {
		arr.sort( function (a,b) { return a-b; } );
		return arr; // Fail-safe for empty arr.
	},

	arraySubarray : function (arr, iIndexA, iIndexB ) {
		if (iIndexA < 0) { iIndexA = 0; }
		if (!iIndexB || iIndexB > arr.length) { iIndexB = arr.length; }
		if (iIndexA == iIndexB) { return []; }
		var aReturn = [];
		for (var i = iIndexA; i < iIndexB; i++) {
			aReturn[aReturn.length] = arr[i];
		}
		return aReturn;
	},

	arraySubarrayLen : function (arr, iStart, iLength) {
		if (iStart >= arr.length || (iLength && iLength <= 0)) {
			return [];
		} else if (iStart < 0) {
			if (Math.abs(iStart) > arr.length) iStart = 0;
			else iStart = arr.length + iStart;
		}
		if (!iLength || iLength + iStart > arr.length) { iLength = arr.length - iStart; }
		var aReturn = [];
		for (var i = iStart; i < iStart + iLength; i++) {
			aReturn[aReturn.length] = arr[i];
		}
		return aReturn;
	},
	
	arrayToArrayOfStrings : function (inputArr) {
		var outputArr = [];
		for (var i = 0, j = inputArr.length; i < j; i++) {
			outputArr[i] = !(typeof inputArr[i] === 'undefined' || inputArr[i] == 'undefined' || inputArr[i] === null) ? inputArr[i].toString() : '';
		}
		return outputArr;
	},

	// This function requires a sorted array.
	arrayUnique : function (arr) {
		for (var i = 1;i < arr.length;) {
			if (arr[i-1] == arr[i]) {
				arr = Z.Utils.arraySplice(arr, i, 1);
			} else{
				i++;
			}
		}
		return arr;
	},

	// This function requires a sorted array.
	arrayUniqueByObjectValue : function (arr, subobj) {
		if (typeof arr !== 'undefined') {
			for (var i = 1;i < arr.length;) {
				if (arr[i-1][subobj] == arr[i][subobj]) {
					arr = Z.Utils.arraySplice(arr, i, 1);
				} else{
					i++;
				}
			}
		}
		return arr;
	},



	//::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::
	//:::::::::::::::::::::::::::::::: AUDIO UTILITY FUNCTIONS ::::::::::::::::::::::::::::::
	//::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::
		
	// Play audio: first parameter is preloaded audio object in viewer global, second parameter is fallback source path to load now.
	playAudio : function (destinationNextAudio, destinationCurrentAudioSrc) {
		if (!Z.audioMuted) {
			if (typeof destinationNextAudio !== 'undefined' && destinationNextAudio !== null) {
				destinationNextAudio.play();
			} else {
				if (Z.Utils.stringValidate(destinationCurrentAudioSrc)) {
					var destinationCurrentAudio = new Audio(destinationCurrentAudioSrc);
					destinationCurrentAudio.play();
				}
			}
		}
	},

	loadAudio : function (destinationNextAudioSrc) {
		if (Z.Utils.stringValidate(destinationNextAudioSrc)) {
			var destinationNextAudio = new Audio(destinationNextAudioSrc);
			destinationNextAudio.load();
		}
	},
	

	//::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::
	//::::::::::::::::::::::::::::: MEASURING UTILITY FUNCTIONS :::::::::::::::::::::::::::
	//::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::
		
	calculatePointsDistance : function (x1, y1, x2, y2) {
		return Math.sqrt((x1 -= x2) * x1 + (y1 -= y2) * y1);

		// DEV NOTE: Alternative implementation:
		//return Math.sqrt(Math.pow(x1 - x2, 2) + Math.pow(y1 - y2, 2));
	},
	
	convertPixelsToUnits : function (pixels, pixelsPerUnit, unitsPerImage) {
		var actualPixelsPerUnit = 1;
		if (typeof pixelsPerUnit !== 'undefined' && pixelsPerUnit !== null && pixelsPerUnit != 0) {
			actualPixelsPerUnit = pixelsPerUnit;
		} else if (typeof unitsPerImage !== 'undefined' && unitsPerImage !== null && unitsPerImage != 0) {
			actualPixelsPerUnit = Z.imageW / unitsPerImage;
		}
		var units = pixels / actualPixelsPerUnit;
		return units;
	},
	
	polygonArea : function (polyPts, polyClosed, clickPt, digits) {
		if (typeof digits === 'undefined' || digits === null) { digits = 4; }
		var tPolyPts = polyPts.slice(0);

		// Use first control point or mouse position as last control point.
		if (polyClosed) {
			tPolyPts[tPolyPts.length] = { x:tPolyPts[0].x, y:tPolyPts[0].y };
		} else if (typeof clickPt !== 'undefined' && clickPt !== null) {
			tPolyPts[tPolyPts.length] = { x:clickPt.x, y:clickPt.y };
		}
		
		var sum1 = 0;
		var sum2 = 0;
		for (var i = 0, j = tPolyPts.length - 1; i < j; i++) {
			sum1 += tPolyPts[i].x * tPolyPts[i + 1].y;
			sum2 += tPolyPts[i].y * tPolyPts[i + 1].x;
		}
		
		var area = (sum1 - sum2) / 2;
		area = Z.Utils.convertPixelsToUnits(area, Z.pixelsPerUnit, Z.unitsPerImage);
		area = Z.Utils.convertPixelsToUnits(area, Z.pixelsPerUnit, Z.unitsPerImage); // Scale in both dimensions.
		area = Z.Utils.roundToFixed(Math.abs(area), digits);
					
		return area;
	},

	polygonCenter : function (polyPts, polyClosed, clickPt) {
		var ctrX = 0, ctrY = 0;
		if (typeof polyPts !== 'undefined' && polyPts !== null && polyPts.length > 0) {
			var tPolyPts = polyPts.slice(0);

			// Use first control point or mouse position as last control point.
			if (polyClosed) {
				tPolyPts[tPolyPts.length] = { x:tPolyPts[0].x, y:tPolyPts[0].y };
			} else if (typeof clickPt !== 'undefined' && clickPt !== null) {
				tPolyPts[tPolyPts.length] = { x:clickPt.x, y:clickPt.y };
			}

			var tPolyPt = tPolyPts[0];
			var smallestX = tPolyPt.x;
			var smallestY = tPolyPt.y;
			var largestX = tPolyPt.x;
			var largestY = tPolyPt.y;
			for (var i = 1, j = tPolyPts.length; i < j; i++) {
				tPolyPt = tPolyPts[i];
				smallestX = Math.min(smallestX, tPolyPt.x);
				smallestY = Math.min(smallestY, tPolyPt.y);
				largestX = Math.max(largestX, tPolyPt.x);
				largestY = Math.max(largestY, tPolyPt.y);
			}
			ctrX = smallestX + ((largestX - smallestX) / 2);
			ctrY = smallestY + ((largestY - smallestY) / 2);
		}
		return new Z.Utils.Point(ctrX, ctrY);
	},

	polygonDimensions : function (polyPts, clickPt) {
		var w = 0, h = 0;		
		if (typeof polyPts !== 'undefined' && polyPts !== null && polyPts.length > 0) {
			var tPolyPts = polyPts.slice(0);

			// Optional second parameter enables use of mouse position as last control point. Reduce span 
			// so container is not under mouse, to avoid conflict between alt-click-drag and alt-click complete.
			if (typeof clickPt !== 'undefined' && clickPt !== null) { 
				var adjX = (tPolyPts[tPolyPts.length - 1].x - clickPt.x) * 0.1;
				var adjY = (tPolyPts[tPolyPts.length - 1].y - clickPt.y) * 0.1;
				tPolyPts[tPolyPts.length] = { x:clickPt.x + adjX, y:clickPt.y + adjY };
			}

			var smallestX = tPolyPts[0].x;
			var smallestY = tPolyPts[0].y;
			var largestX = tPolyPts[0].x;
			var largestY = tPolyPts[0].y;
			for (var i = 1, j = tPolyPts.length; i < j; i++) {
				if (tPolyPts[i].x < smallestX) { smallestX = tPolyPts[i].x; }
				if (tPolyPts[i].x > largestX) { largestX = tPolyPts[i].x; }
				if (tPolyPts[i].y < smallestY) { smallestY = tPolyPts[i].y; }
				if (tPolyPts[i].y > largestY) { largestY = tPolyPts[i].y; }
			}
			w = largestX - smallestX;
			h = largestY - smallestY;
		}

		return new Z.Utils.Point(w, h);
	},

	polygonPerimeter : function (polyPts, polyClosed, clickPt, digits) {
		if (typeof digits === 'undefined' || digits === null) { digits = 5; }
		var tPolyPts = polyPts.slice(0);

		// Use first control point or mouse position as last control point.
		if (polyClosed) {
			tPolyPts[tPolyPts.length] = { x:tPolyPts[0].x, y:tPolyPts[0].y };
		} else if (typeof clickPt !== 'undefined' && clickPt !== null) {
			tPolyPts[tPolyPts.length] = { x:clickPt.x, y:clickPt.y };
		}
		
		var perimeter = 0;
		for (var i = 0, j = tPolyPts.length - 1; i < j; i++ ) {
			perimeter += Z.Utils.calculatePointsDistance(tPolyPts[i].x, tPolyPts[i].y, tPolyPts[i + 1].x, tPolyPts[i + 1].y);
		}		
		perimeter = Z.Utils.convertPixelsToUnits(perimeter, Z.pixelsPerUnit, Z.unitsPerImage);
		perimeter = Z.Utils.roundToFixed(Math.abs(perimeter), digits);
				
		return perimeter;
	},
	
	
	
	//::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::
	//:::::::::: SCREEN MODE, ROTATION, & TRANSLATION UTILITY FUNCTIONS ::::::::::
	//::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::
	
	fullScreenView : function (element, fullScreen, escaped) {
		// DEV NOTE: Watch for capitalization changes in specification and implementation: 'Fullscreen' vs 'FullScreen'.
		if (typeof escaped === 'undefined' || escaped === null) { var escaped = false; }
		
		if (fullScreen) {
			var docElm = document.documentElement;
			if (docElm.requestFullScreen) {
				element.requestFullScreen();
				Z.Utils.addEventListener(document, 'fullscreenchange', Z.Viewport.fullScreenEscapeHandler);
			} else if (docElm.mozRequestFullScreen) {
				element.mozRequestFullScreen();
				Z.Utils.addEventListener(document, 'mozfullscreenchange', Z.Viewport.fullScreenEscapeHandler);
			} else if (docElm.webkitRequestFullScreen) {
				// DEV NOTE: Element.ALLOW_KEYBOARD_INPUT parameter blocks fullscreen mode 
				// in some versions of Chrome and Safari. Testing for failed mode change allows second 
				// call without parameter in Safari but this workaround is not effective in Chrome.
				element.webkitRequestFullScreen();
				Z.Utils.addEventListener(document, 'webkitfullscreenchange', Z.Viewport.fullScreenEscapeHandler);
			} else if (docElm.msRequestFullscreen) {				
				element.msRequestFullscreen();	
				Z.Utils.addEventListener(document, 'MSFullscreenChange', Z.Viewport.fullScreenEscapeHandler);
			}
			
		} else {
			if (document.cancelFullScreen) {
				if (!escaped) { document.cancelFullScreen(); }
				Z.Utils.removeEventListener(document, 'fullscreenchange', Z.Viewport.fullScreenEscapeHandler);
			} else if (document.msExitFullscreen) {
				if (!escaped) { document.msExitFullscreen(); }
				Z.Utils.removeEventListener(document, 'MSFullscreenChange', Z.Viewport.fullScreenEscapeHandler);
			} else if (document.mozCancelFullScreen) {
				if (!escaped) { document.mozCancelFullScreen(); }
				Z.Utils.removeEventListener(document, 'mozfullscreenchange', Z.Viewport.fullScreenEscapeHandler);
			} else if (document.webkitCancelFullScreen) {
				if (!escaped) { document.webkitCancelFullScreen(); }
				Z.Utils.removeEventListener(document, 'webkitfullscreenchange', Z.Viewport.fullScreenEscapeHandler);
			}
		}
	},
	
	rotatePoint : function (x, y, rotDegs) {
		var degToRad = Math.PI / 180;
		var rotRads = -rotDegs * degToRad;
		var newX = x * Math.cos(rotRads) - y * Math.sin(rotRads);
		var newY = x * Math.sin(rotRads) + y * Math.cos(rotRads);
		return new Z.Utils.Point(newX, newY);
	},

	rotateElement : function (displayS, r, override) {
		// DEV NOTE: Condition below is workaround for Safari mispositioning of hotspot captions after application of this method. This workaround only addresses unrotated displays.
		// Override ensures first condition does not block rotation of Navigator image as its r will equal Z.imageR because it is always catching up to main display.
		if (r != Z.imageR || override) {			
			var tranString = 'rotate(' + r.toString() + 'deg)';
			displayS.transform = tranString; // Standard.
			displayS.msTransform = tranString; // IE9.
			displayS.mozTransform = tranString; // Firefox.
			displayS.webkitTransform = tranString; // Chrome & Safari.
			displayS.oTransform = tranString; // Opera.
		}
	},

	getDisplayPositionRotated : function (displayS, r) {
		// Need corner coordinates for upper left (0), bottom left (90), bottom right (180) or top right (270).
		if (typeof r === 'undefined' || r === null) { r = Z.imageR; }
		if (r < 0) { r += 360; } // Ensure positive values.

		var wH = parseFloat(displayS.width) / 2;
		var hH = parseFloat(displayS.height) / 2;
		var rotate = Z.Utils.rotatePoint;

		var newPt = new Z.Utils.Point(0, 0);
		if (r != 0) {
			if (r == 90) {
				newPt = rotate(-wH, hH, -r);
			} else if (r == 180) {
				newPt = rotate(wH, hH, -r);
			} else if (r == 270) {
				newPt = rotate(wH, -hH, -r);
			}
			newPt.x += wH;
			newPt.y += hH;
		}

		return new Z.Utils.Point(newPt.x, newPt.y);
	},

	translateElement : function (displayS, x, y) {
		var tranString = 'translate(' + x.toString() + 'px,' + y.toString() +'px)';
		displayS.transform = tranString; // Standard.
		displayS.msTransform = tranString; // IE9.
		displayS.mozTransform = tranString; // Firefox.
		displayS.webkitTransform = tranString; // Chrome & Safari.
		displayS.oTransform = tranString; // Opera.
	},
	
	

	//::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::
	//::::::::::::::::::::::::::::::::: ZIF UTILITY FUNCTIONS :::::::::::::::::::::::::::::::::
	//::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::

	intValue : function (array, offset) {
		return (array[offset] + (array[offset + 1] << 8) | (array[offset + 2] << 16)) + (array[offset + 3] * 16777216);
	},

	longValue : function (array, offset) {
		var value = (array[offset] + (array[offset + 1] << 8) | (array[offset + 2] << 16)) + (array[offset + 3] * 16777216);
		if (array[offset + 4] != 0) { value = value + array[offset + 4] * 4294967296; }
		return value;
	},

	shortValue : function (array, offset) {
		return array[offset] + (array[offset + 1] << 8);
	},

	createUint8Array : function (array, offset) {
		if (Z.uInt8ArraySupported) {
			return new Uint8Array(array, offset);
		} else {
			return new Z.Utils.TypedArray(array, offset);
		}
	},

	TypedArray : function (arg1) {
		var result;
		if (typeof arg1 === 'number') {
			result = new Array(arg1);
			for (var i = 0; i < arg1; ++i) {
				result[i] = 0;
			}
		} else {
			result = arg1.slice(0);
		}
		result.subarray = Z.Utils.arraySubarraySimple;
		result.buffer = result;
		result.byteLength = result.length;
		result.set = Z.Utils.setSimple;
		if (typeof arg1 === 'object' && arg1.buffer) {
			result.buffer = arg1.buffer;
		}
		return result;
	},

	setSimple : function (array, offset) {
		if (arguments.length < 2) { offset = 0; }
		for (var i = 0, n = array.length; i < n; ++i, ++offset) {
			this[offset] = array[i] & 0xFF;
		}
	},

	encodeBase64 : function (data) {
		var b64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
		var o1, o2, o3, h1, h2, h3, h4, bits, i = 0, ac = 0, enc = '', tmp_arr = [];
		if (!data) { return data; }

		do { // Pack three octets into four hexets.
		    o1 = data[i++];
		    o2 = data[i++];
		    o3 = data[i++];
		    bits = o1 << 16 | o2 << 8 | o3;
		    h1 = bits >> 18 & 0x3f;
		    h2 = bits >> 12 & 0x3f;
		    h3 = bits >> 6 & 0x3f;
		    h4 = bits & 0x3f;

		    // Use hexets to index into b64, and append result to encoded string.
		    tmp_arr[ac++] = b64.charAt(h1) + b64.charAt(h2) + b64.charAt(h3) + b64.charAt(h4);
		} while (i < data.length);

		enc = tmp_arr.join('');
		var r = data.length % 3;
		return (r ? enc.slice(0, r - 3) : enc) + '==='.slice(r || 3);
	},

	// Prototyping and property modifications are used only to ensure legacy browser support for needed 
	// functionality and is otherwise avoided to limit potential conflicts during code integration or customization. 
	// One instance is currently implemented: adding response array support to net requests if not present.
	validateResponseArrayFunctionality : function () {
		if (Z.tileSource == 'ZoomifyImageFile' && !Z.responseArraySupported && !Z.responseArrayPrototyped) {
			Z.Utils.defineObjectProperty(XMLHttpRequest.prototype, 'response', {
				get : function () { return new VBArray(this.responseBody).toArray(); }
			});
			Z.responseArrayPrototyped = true;
		}
	},
	
	defineObjectProperty : function (obj, name, def) {
		if (Z.definePropertySupported) {
			Object.defineProperty(obj, name, def);			
		} else {
			// DEV NOTE: verify value of optional implementation.
			delete obj[name];
			if ('get' in def) { obj.__defineGetter__(name, def['get']); }
			if ('set' in def) { obj.__defineSetter__(name, def['set']); }
			if ('value' in def) {
				obj.__defineSetter__(name, function objectDefinePropertySetter(value) {
					this.__defineGetter__(name, function objectDefinePropertyGetter() {
						return value;
					});
					return value;
				});
				obj[name] = def.value;
			}
		}
	},
	
	createImageElementFromBytes : function (src, callback) {
		var image = new Image();
		var timeout = null;
		var IMAGE_LOAD_TIMEOUT = parseFloat(this.getResource('DEFAULT_IMAGELOADTIMEOUT'));

		var timeoutFunc = function () {
			console.log(Z.Utils.getResource('ERROR_IMAGEREQUESTTIMEDOUT'));
			complete(false);
			
			// Debug option: Append source data to error message above: + ": " + src);
		};

		function complete (result) {
			image.onload = null;
			image.onabort = null;
			image.onerror = null;
			if (timeout) { window.clearTimeout(timeout); }
			window.setTimeout(function () { callback(image); }, 1);
		};

		var successFunction = function () { complete(true); };
		var errorFunction = function () { complete(false); };
		image.onload = successFunction;
		image.onabort = errorFunction;
		image.onerror = errorFunction;
		timeout = window.setTimeout(timeoutFunc, IMAGE_LOAD_TIMEOUT);
		image.src = src;
	},
	
	

	//::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::
	//:::::::::::::::::::::::::::: MISCELLANEOUS UTILITY FUNCTIONS :::::::::::::::::::::::
	//::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::

	getCurrentUTCDateAsString : function () {
		var date = new Date();
		var month = ((date.getUTCMonth() + 1 < 10) ? '0' : '') + (date.getUTCMonth() + 1);
		var day = ((date.getUTCDate() < 10) ? '0' : '') + date.getUTCDate();
		var hour = ((date.getUTCHours() < 10) ? '0' : '') + date.getUTCHours();
		var minute = ((date.getUTCMinutes() < 10) ? '0' : '') + date.getUTCMinutes();
		var second = ((date.getUTCSeconds() < 10) ? '0' : '') + date.getUTCSeconds();
		return date.getUTCFullYear() + month + day + hour + minute + second;
	},
	
	cacheProofPath : function (url) {
		// Uses time stamp plus counter to guarantee uniqueness. Implementation with only time stamp fails to produce unique value on some versions of some browsers, and appending Math.random() slower. 
		// Apply to support setImage feature, non-caching implementations, and to avoid IE problem leading to correct image with wrong dimensions. (DEV NOTE: Formerly limited to Z.browser == Z.browsers.IE)
		// Note: currently applied to most XML calls prior to loadXML(), to image folder tile requests in function formatTilePathImageFolder.  NOT applied directly in loadXML function in Z.NetConnector because not 
		// applied to all XML paths. Not applied to annotation XML where Z.simplePath used to prevent modifications to provided path. Also not applied to JSON paths. Not applied in PFF requests due to server 
		// parsing requirements. Applied to all ZIF byterange requests directly in Z.NetConnector. Further consolidation and broader application anticipated in future releases.
		url += '?t' + new Date().getTime().toString() + 'n' + Z.cacheProofCounter.toString();
		Z.cacheProofCounter += 1;
		return url;
	},

	easing : function (b, t, c, d) {
		// Key: b=start position, t=target position, c=current time or position, d=duration or distance total, calculated s = span (~ in/out quintic)
		var s = t - b;
		if ((c /= d / 2) < 1) {
			return s / 2 * c * c * c * c * c + b;
		} else {
			return s / 2 * ((c -= 2) * c * c * c * c + 2) + b;
		}
	},
	
	functionCallWithDelay : function (functionToCall, delay) {
		var timer = window.setTimeout( functionToCall, delay);
	},
	
	nodeIsInViewer : function (nodeToTest) {
		var isInViewer = false;
		var ancestor = nodeToTest;
		while (isInViewer == false) {
			if (ancestor) {
				if (ancestor.id) {
					if (ancestor.id == 'ViewerDisplay') {
						isInViewer = true;
					} else {
						ancestor = ancestor.parentNode;
					}
				} else {
					ancestor = ancestor.parentNode;
				}
			} else {
				break;
			}
		}
		return isInViewer;
	},
	
	// Limit total digits, not just decimal places like JavaScript toFixed function, but do not convert to string.
	roundToFixed : function (value, digits) {
		var digitsBeforeDec = Math.round(value).toString().length;
		var digitsAfterDec = digits - digitsBeforeDec;
		var targetDigits = (digitsAfterDec < 0) ? 0 : digitsAfterDec;
		var roundFactor = Math.pow(10, targetDigits); 
		value = Math.round(value * roundFactor) / roundFactor;
		return value;
	},
	
	// Returns pseudo-random integer between min and max.
	getRandomInt : function (min, max) {
		return Math.floor(Math.random() * (max - min + 1)) + min;
	},
	
	getSign : function (x) {
		return x ? x < 0 ? -1 : 1 : 0;
	},
	
	

	//::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::
	//::::::::::::::::::::::::::::: DEBUGGING UTILITY FUNCTIONS :::::::::::::::::::::::::::
	//::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::

	drawCrosshairs : function (display, w, h) {
		var viewportCenterLineVertical = Z.Utils.createContainerElement('div', 'viewportCenterLineVertical', 'inline-block', 'absolute', 'visible', '1px', h + 'px', (w / 2) + 'px', '0px', 'solid', '1px', 'transparent none', '0px', '0px', 'normal', null, true);
		var viewportCenterLineHorizontal = Z.Utils.createContainerElement('div', 'viewportCenterLineHorizontal', 'inline-block', 'absolute', 'visible', w + 'px', '1px', '0px', (h / 2) + 'px', 'solid', '1px', 'transparent none', '0px', '0px', 'normal', null, true);
		display.appendChild(viewportCenterLineHorizontal);
		display.appendChild(viewportCenterLineVertical);
	},
	
	configureHelpDisplay : function () {
		// Calculate help display dimensions, position, and presentation.
		var marginW = 80, marginH = 80;
		var mdW = parseInt(this.getResource('UI_HELPDISPLAYWIDTH'), 10);
		var mdH = parseInt(this.getResource('UI_HELPDISPLAYHEIGHT'), 10);
		if (mdW >= Z.viewerW) { 
			mdW = Z.viewerW - marginW; 
			marginW -= 40;
		}
		if (mdH >= Z.viewerH) { 
			mdH = Z.viewerH - marginH;
			marginH -= 40;
		}
		var mdL = Z.viewerW - mdW - marginW;
		var mdT = Z.viewerH - mdH - marginH;
		var scrnColor = this.getResource('DEFAULT_HELPSCREENCOLOR');
		var btnColor = this.getResource('DEFAULT_HELPBUTTONCOLOR');

		// Create help display.
		Z.HelpDisplay = this.createContainerElement('div', 'HelpDisplay', 'inline-block', 'absolute', 'hidden', mdW + 'px', mdH + 'px', mdL + 'px', mdT + 'px', 'solid', '1px', scrnColor, '0px', '0px', 'normal', null, true);
		Z.ViewerDisplay.appendChild(Z.HelpDisplay);
		var helpTextBox = Z.Utils.createContainerElement('div', 'helpTextBox', 'inline-block', 'absolute', null, (mdW - 50) + 'px', (mdH - 74) + 'px', '4px', '4px', 'solid', '1px', 'white', '0px', '20px', null);
		helpTextBox.style.overflowY = 'auto';
		// Alternative implementation: text rather than HTML content.
		//var helpTextBox = Z.Utils.createTextElement('helpTextBox', '', (mdW - 18) + 'px', (mdH - 40) + 'px', '4px', '4px', '4px', 'solid', '1px', true, 'verdana', '12px', 'none', null, 1, 'auto', 'auto', null);		
		Z.HelpDisplay.appendChild(helpTextBox);
		Z.help = document.getElementById('helpTextBox');

		// Ensure help display is in front of hotspots in viewport.
		var uiElementsBaseZIndex = parseInt(Z.Utils.getResource('DEFAULT_UIELEMENTBASEZINDEX'), 10);
		Z.HelpDisplay.style.zIndex = (uiElementsBaseZIndex + 9).toString();

		// Configure and add display buttons.
		var btnW = 56;
		var btnH = 18;
		var dvdrW = 10;
		var dvdrH = 5;
		var btnL = mdW;
		var btnT = mdH - btnH - dvdrH;
		var btnTxt;

		btnL -= (btnW + dvdrW);
		btnTxt = this.getResource('UI_HELPOKBUTTONTEXT');
		var buttonHelpOk = new Z.Utils.Button('buttonHelpOk', btnTxt, null, null, null, null, btnW + 'px', btnH + 'px', btnL + 'px', btnT + 'px', 'mousedown', this.helpOkButtonHandler, 'TIP_HELPOK', 'solid', '1px', btnColor, '0px', '0px');
		Z.HelpDisplay.appendChild(buttonHelpOk.elmt);
	},

	helpOkButtonHandler : function (event) {
		Z.Utils.hideHelp();
		return true;
	},
	
	showHelp : function (helpContent) {
		// Create help display on first use.
		if (!Z.HelpDisplay) { Z.Utils.configureHelpDisplay(); }
		if (Z.help) {
			Z.help.innerHTML = unescape(helpContent);
			Z.HelpDisplay.style.display = 'inline-block';
			
			var buttonHelpOk = document.getElementById('buttonHelpOk');
			buttonHelpOk.style.display = 'inline-block';

			// Alternative implementation: text rather than HTML content.
			//Z.help.value = helpContent; 
			//var mTB = document.getElementById('textBoxFor-helpBox');
			//if (mTB) { mTB.firstChild.style.textAlign = 'left'; }
		}		
	},

	hideHelp : function () {
		Z.HelpDisplay.style.display = 'none';
	},
	
	configureMessageDisplay : function () {
		// Calculate message display dimensions, position, and presentation.
		var mdW = parseInt(this.getResource('UI_MESSAGEDISPLAYWIDTH'), 10);
		var mdH = parseInt(this.getResource('UI_MESSAGEDISPLAYHEIGHT'), 10);
		var mdL = 40;
		var mdT = Z.viewerH - mdH - 40;
		// Alternative implementation: lower right of viewer.
		//var mdL = Z.viewerW - mdW - 80;
		//var mdT = Z.viewerH - mdH - 80;
		var scrnColor = this.getResource('DEFAULT_MESSAGESCREENCOLOR');
		var btnColor = this.getResource('DEFAULT_MESSAGEBUTTONCOLOR');

		// Create message display.
		Z.MessageDisplay = this.createContainerElement('div', 'MessageDisplay', 'inline-block', 'absolute', 'hidden', mdW + 'px', mdH + 'px', mdL + 'px', mdT + 'px', 'solid', '1px', scrnColor, '0px', '0px', 'normal', null, true);
		Z.ViewerDisplay.appendChild(Z.MessageDisplay);
		
		// Ensure message display is in front of hotspots in viewport.
		var uiElementsBaseZIndex = parseInt(Z.Utils.getResource('DEFAULT_UIELEMENTBASEZINDEX'), 10);
		Z.MessageDisplay.style.zIndex = (uiElementsBaseZIndex + 10).toString();

		var messageBox = Z.Utils.createTextElement('messageBox', '', (mdW - 18) + 'px', (mdH - 40) + 'px', '4px', '4px', '4px', 'solid', '1px', true, 'verdana', '12px', 'none', null, 1, 'auto', 'auto', null);
		Z.MessageDisplay.appendChild(messageBox);
		Z.messages = document.getElementById('messageBox');

		// Configure and add display buttons.
		var btnW = 56;
		var btnH = 18;
		var dvdrW = 10;
		var dvdrH = 5;
		var btnL = mdW;
		var btnT = mdH - btnH - dvdrH;
		var btnTxt;

		// DEV NOTE: Cancel option not required for current feature set.
		/* btnL -= (btnW + dvdrW);
		btnTxt = this.getResource('UI_MESSAGECANCELBUTTONTEXT');
		var buttonMessageCancel = new Z.Utils.Button('buttonMessageCancel', btnTxt, null, null, null, null, btnW + 'px', btnH + 'px', btnL + 'px', btnT + 'px', 'mousedown', this.messageCancelButtonHandler, 'TIP_MESSAGECANCEL', 'solid', '1px', btnColor, '0px', '0px');
		Z.MessageDisplay.appendChild(buttonMessageCancel.elmt);
		*/

		btnL -= (btnW + dvdrW);
		btnTxt = this.getResource('UI_MESSAGEOKBUTTONTEXT');
		var buttonMessageOk = new Z.Utils.Button('buttonMessageOk', btnTxt, null, null, null, null, btnW + 'px', btnH + 'px', btnL + 'px', btnT + 'px', 'mousedown', this.messageOkButtonHandler, 'TIP_MESSAGEOK', 'solid', '1px', btnColor, '0px', '0px');
		Z.MessageDisplay.appendChild(buttonMessageOk.elmt);
	},

	messageOkButtonHandler : function (event) {
		Z.Utils.hideMessage();
		if (Z.Viewport && Z.coordinatesVisible) { Z.Viewport.setCoordinatesDisplayVisibility(false); }
		return true;
	},

	messageCancelButtonHandler : function (event) {
		// DEV NOTE: Cancel option not required by current feature set.
		Z.Utils.hideMessage();
		return false;
	},

	showMessage : function (messageText, button, displayTime, textAlign, once) {
		
		// Parameter zMessagesVisible permits disabling display.
		if (Z.messagesVisible) {
			
			// Create message display on first use and clear any pending message timers prior to new use.
			if (!Z.MessageDisplay) { Z.Utils.configureMessageDisplay(); }
		
			if (Z.MessageDisplay.messageTimer) { window.clearTimeout(MessageDisplay.messageTimer); }

			// Record and check prior displays if message to be displayed only once.
			var displayOK = true;
			if (once) {
				if (Z.Utils.arrayIndexOf(Z.messageDisplayList, messageText) != -1) {
					displayOK = false;
				} else {
					Z.messageDisplayList[Z.messageDisplayList.length] = messageText;
				}
			}
			if (displayOK) {
				// Show message display.
				if (Z.messages) { Z.messages.value = messageText; }
				Z.MessageDisplay.style.display = 'inline-block';
				if (typeof textAlign !== 'undefined' && textAlign !== null) {
					var mTB = document.getElementById('textBoxFor-messageBox');
					if (mTB) { mTB.firstChild.style.textAlign = textAlign; }
				}

				// Add buttons if specified.
				var buttonMessageOk = document.getElementById('buttonMessageOk');
				var mdH = parseInt(this.getResource('UI_MESSAGEDISPLAYHEIGHT'), 10);
				if (typeof button !== 'undefined' && button !== null && button) {
					buttonMessageOk.style.display = 'inline-block';
					Z.MessageDisplay.style.height = mdH + 'px';
				} else {
					buttonMessageOk.style.display = 'none';
					Z.MessageDisplay.style.height = (mdH - 22) + 'px';
				}

				// Automatically hide message if display time specified.			
				if (typeof displayTime !== 'undefined' && displayTime !== null && !isNaN(displayTime)) { 
					if (typeof Z.MessageDisplay.messageTimer !== 'undefined' && Z.MessageDisplay.messageTimer !== null) { window.clearTimeout(Z.MessageDisplay.messageTimer); }
					if (typeof displayTime === 'undefined' || displayTime === null) { displayTime = 3000; }
					Z.MessageDisplay.messageTimer = window.setTimeout(Z.Utils.hideMessageTimerHandler, displayTime);
				}
			}
		}
	},

	getMessage : function () {
		var messageText = '';
		if (Z.messages && Z.Utils.stringValidate(Z.messages.value)) {
			messageText = Z.messages.value;
		}
		return messageText;
	},

	hideMessage : function () {
		if (Z.MessageDisplay) {
			Z.MessageDisplay.style.display = 'none';
		}
	},

	hideMessageTimerHandler : function () {
		if (Z.MessageDisplay.messageTimer) {
			window.clearTimeout(Z.MessageDisplay.messageTimer);
			Z.MessageDisplay.messageTimer = null;
		}
		Z.Utils.hideMessage();
	},

	uploadProgress : function (event) {
		var messageText = Z.saveImageMessage;
		if (event.lengthComputable) {
			var percentComplete = Math.round(event.loaded * 100 / event.total);
			messageText += percentComplete.toString() + '%';
		} else {
			messageText += Z.Utils.getResource('ALERT_IMAGESAVEUNABLETOCOMPUTEPROGRESS');
		}
		Z.Utils.showMessage(messageText, false, 'none', 'center');
	},
	
	configureCoordinatesDisplay : function () {
		// Calculate message display dimensions, position, and presentation.
		var mdW = parseInt(this.getResource('UI_COORDINATESDISPLAYWIDTH'), 10);
		var mdH = parseInt(this.getResource('UI_COORDINATESDISPLAYHEIGHT'), 10);
		var mdL = Z.viewerW - mdW - 20;
		var mdT = Z.viewerH - mdH - 30;
		var scrnColor = this.getResource('DEFAULT_COORDINATESSCREENCOLOR');

		// Create message display.
		Z.CoordinatesDisplay = this.createContainerElement('div', 'CoordinatesDisplay', 'inline-block', 'absolute', 'hidden', mdW + 'px', mdH + 'px', mdL + 'px', mdT + 'px', 'solid', '1px', scrnColor, '0px', '0px', 'normal');
		Z.ViewerDisplay.appendChild(Z.CoordinatesDisplay);
		
		// Ensure coordinates panel is in front of hotspots in viewport.
		var uiElementsBaseZIndex = parseInt(Z.Utils.getResource('DEFAULT_UIELEMENTBASEZINDEX'), 10);
		Z.CoordinatesDisplay.style.zIndex = (uiElementsBaseZIndex + 8).toString();

		var labelText = Z.Utils.getResource('UI_COORDINATESDISPLAYTEXT')
		var coordsLabelBox = Z.Utils.createTextElement('coordsLabelBox', labelText, (mdW - 18) + 'px', '28px', '4px', '4px', '4px', 'solid', '1px', true, 'verdana', '12px', 'none', null, 1, 'auto', 'auto', null);
		Z.CoordinatesDisplay.appendChild(coordsLabelBox);
		var clTB = document.getElementById('textBoxFor-coordsLabelBox');
		if (clTB) { clTB.firstChild.style.textAlign = 'center'; }
		
		var coordsDisplayBox = Z.Utils.createTextElement('coordsDisplayBox', '', (mdW - 18) + 'px', '18px', '4px', '46px', '4px', 'solid', '1px', true, 'verdana', '12px', 'none', null, 1, 'auto', 'auto', null);
		Z.CoordinatesDisplay.appendChild(coordsDisplayBox);
		Z.coordinates = document.getElementById('coordsDisplayBox');		
		var cdTB = document.getElementById('textBoxFor-coordsDisplayBox');
		if (cdTB) { cdTB.firstChild.style.textAlign = 'center'; }
		
		var coordsSaveBox = Z.Utils.createTextElement('coordsSaveBox', '', (mdW - 18) + 'px', (mdH - 92) + 'px', '4px', '78px', '4px', 'solid', '1px', true, 'verdana', '12px', 'none', null, 1, 'auto', 'auto', null);
		Z.CoordinatesDisplay.appendChild(coordsSaveBox);
		Z.coordinatesSave = document.getElementById('coordsSaveBox');		
		var csTB = document.getElementById('textBoxFor-coordsSaveBox');
		if (csTB) { csTB.firstChild.style.textAlign = 'center'; }
	},

	showCoordinates : function (coordsText) {
		// Create message display on first use.
		if (!Z.CoordinatesDisplay) { Z.Utils.configureCoordinatesDisplay(); }
		if (Z.coordinates) { Z.coordinates.value = coordsText; }
	},
	
	saveCoordinates : function (coordsText) {
		// Create message display on first use.
		if (!Z.CoordinatesDisplay) { Z.Utils.configureCoordinatesDisplay(); }
		if (Z.coordinatesSave) { Z.coordinatesSave.value += coordsText + '\n'; }
	},

	configureTraceDisplay : function () {
		if (typeof Z.Viewport !== "undefined" && Z.Viewport !== null) {
			var tdW = 280;
			var tdH = 280;
			var tdL = 10;
			var tdT = Z.viewerH - 330;
			var traceHOffset = 125;
			var scrnColor = this.getResource('DEFAULT_TRACEDISPLAYSCREENCOLOR');

			Z.TraceDisplay = this.createContainerElement('div', 'TraceDisplay', 'inline-block', 'absolute', 'hidden', tdW + 'px', tdH+ 'px', tdL + 'px', tdT + 'px', 'solid', '1px', scrnColor, '0px', '10px', 'normal');
			Z.ViewerDisplay.appendChild(Z.TraceDisplay);

			// Ensure trace panel is in front of hotspots in viewport.
			var uiElementsBaseZIndex = parseInt(Z.Utils.getResource('DEFAULT_UIELEMENTBASEZINDEX'), 10);
			Z.TraceDisplay.style.zIndex = (uiElementsBaseZIndex + 12).toString();

			var placeHolderTraceText = Z.Utils.getResource('UI_TRACEDISPLAYTITLE');
			var tracesBox = Z.Utils.createTextElement('debugTraces', placeHolderTraceText, (tdW - 15) + 'px', (tdH - traceHOffset) + 'px', '10px', '10px', '5px', 'solid', '1px', true, 'verdana', '12px', 'none', null, 1, 'auto', 'auto', null);
			Z.TraceDisplay.appendChild(tracesBox);
			Z.traces = document.getElementById('debugTraces');

			// Set dimensions for tile loading and tile speed status bars.
			var textFontSize = parseInt(Z.Utils.getResource('DEFAULT_TRACEDISPLAYTEXTFONTSIZE'), 10);
			var textPaddingSmall= parseInt(Z.Utils.getResource('DEFAULT_TRACEDISPLAYTEXTPADDINGSMALL'), 10);
			var textW = 37;
			var textSpan = textW + 8;
			var labelW = tdW - 5, labelH = textH = 16, margin = 10;
			var labelFontSize = textFontSize - 2;
			var labelsOffset = 97, elementsOffset = 82;
			var margin2 = 15, labelWSingle = 85, textW2 = 50, labelsOffset2 = 56, elementsOffset2 = 60;

			// Configure tile loading status bar.
			var labelTileStatusTextBox = Z.Utils.createContainerElement('div', 'labelTileStatusTextBox', 'inline-block', 'absolute', 'hidden', '1px', '1px', '0px', '0px', 'none', '0px', 'transparent none', '0px', '0px', 'nowrap', null, true);
			var labelTileStatusTextNode = document.createTextNode(Z.Utils.getResource('UI_TRACEDISPLAYTILESTATUSTEXT'));
			labelTileStatusTextBox.appendChild(labelTileStatusTextNode);
			Z.TraceDisplay.appendChild(labelTileStatusTextBox);
			var lTSTB = document.getElementById('labelTileStatusTextBox');
			if (lTSTB) {
				var ltstbS = lTSTB.style;
				ltstbS.width = labelW + 'px';
				ltstbS.height = labelH + 'px';
				ltstbS.left = margin + 'px';
				ltstbS.top = (tdH - labelsOffset)  + 'px';
				Z.Utils.setTextNodeStyle(lTSTB, 'black', 'verdana', labelFontSize + 'px', 'none', 'normal', 'normal', 'normal', 'normal', '1em', 'center', 'none');
			}

			var dx = margin + 7;
			var tilesRequiredTextElement = Z.Utils.createTextElement('tilesRequiredTextElement', '', '1px', '1px', '1px', '1px', '0px', 'solid', '1px', false, 'verdana', '1px', 'none', null, 1, 'hidden', 'hidden', 'off');
			Z.TraceDisplay.appendChild(tilesRequiredTextElement);
			var trTS = document.getElementById('textBoxFor-tilesRequiredTextElement');
			if (trTS) {
				var trtsS = trTS.style;							
				trtsS.width = textW + 'px';
				trtsS.height = textH + 'px';
				trtsS.left = dx + 'px';
				trtsS.top = (tdH - elementsOffset)  + 'px';
				Z.Utils.setTextAreaStyle(trTS, 'black', 'verdana', textFontSize + 'px', 'none', 'normal', 'normal', 'normal', 'normal', '1em', 'center', 'none', textPaddingSmall + 'px');
				dx += textSpan;
			}	

			var tilesCachedTextElement = Z.Utils.createTextElement('tilesCachedTextElement', '', '1px', '1px', '1px', '1px', '0px', 'solid', '1px', false, 'verdana', '1px', 'none', null, 1, 'hidden', 'hidden', 'off');
			Z.TraceDisplay.appendChild(tilesCachedTextElement);
			var tcTS = document.getElementById('textBoxFor-tilesCachedTextElement');
			if (tcTS) {
				var tctsS = tcTS.style;							
				tctsS.width = textW + 'px';
				tctsS.height = textH + 'px';
				tctsS.left = dx + 'px';
				tctsS.top = (tdH - elementsOffset)  + 'px';
				Z.Utils.setTextAreaStyle(tcTS, 'black', 'verdana', textFontSize + 'px', 'none', 'normal', 'normal', 'normal', 'normal', '1em', 'center', 'none', textPaddingSmall + 'px');
				dx += textSpan;
			}

			var tilesRequestedTextElement = Z.Utils.createTextElement('tilesRequestedTextElement', '', '1px', '1px', '1px', '1px', '0px', 'solid', '1px', false, 'verdana', '1px', 'none', null, 1, 'hidden', 'hidden', 'off');
			Z.TraceDisplay.appendChild(tilesRequestedTextElement);
			var trqTS = document.getElementById('textBoxFor-tilesRequestedTextElement');
			if (trqTS) {
				var trqtsS = trqTS.style;							
				trqtsS.width = textW + 'px';
				trqtsS.height = textH + 'px';
				trqtsS.left = dx + 'px';
				trqtsS.top = (tdH - elementsOffset)  + 'px';
				Z.Utils.setTextAreaStyle(trqTS, 'black', 'verdana', textFontSize + 'px', 'none', 'normal', 'normal', 'normal', 'normal', '1em', 'center', 'none', textPaddingSmall + 'px');
				dx += textSpan;
			}	

			var tilesLoadedTextElement = Z.Utils.createTextElement('tilesLoadedTextElement', '', '1px', '1px', '1px', '1px', '0px', 'solid', '1px', false, 'verdana', '1px', 'none', null, 1, 'hidden', 'hidden', 'off');
			Z.TraceDisplay.appendChild(tilesLoadedTextElement);
			var tlTS = document.getElementById('textBoxFor-tilesLoadedTextElement');
			if (tlTS) {
				var tltsS = tlTS.style;							
				tltsS.width = textW + 'px';
				tltsS.height = textH + 'px';
				tltsS.left = dx + 'px';
				tltsS.top = (tdH - elementsOffset)  + 'px';
				Z.Utils.setTextAreaStyle(tlTS, 'black', 'verdana', textFontSize + 'px', 'none', 'normal', 'normal', 'normal', 'normal', '1em', 'center', 'none', textPaddingSmall + 'px');
				dx += textSpan;
			}	

			var tilesDisplayedTextElement = Z.Utils.createTextElement('tilesDisplayedTextElement', '', '1px', '1px', '1px', '1px', '0px', 'solid', '1px', false, 'verdana', '1px', 'none', null, 1, 'hidden', 'hidden', 'off');
			Z.TraceDisplay.appendChild(tilesDisplayedTextElement);
			var tdTS = document.getElementById('textBoxFor-tilesDisplayedTextElement');
			if (tdTS) {
				var tdtsS = tdTS.style;							
				tdtsS.width = textW + 'px';
				tdtsS.height = textH + 'px';
				tdtsS.left = dx + 'px';
				tdtsS.top = (tdH - elementsOffset)  + 'px';
				Z.Utils.setTextAreaStyle(tdTS, 'black', 'verdana', textFontSize + 'px', 'none', 'normal', 'normal', 'normal', 'normal', '1em', 'center', 'none', textPaddingSmall + 'px');
				dx += textSpan;
			}

			var tilesWaitingTextElement = Z.Utils.createTextElement('tilesWaitingTextElement', '', '1px', '1px', '1px', '1px', '0px', 'solid', '1px', false, 'verdana', '1px', 'none', null, 1, 'hidden', 'hidden', 'off');
			Z.TraceDisplay.appendChild(tilesWaitingTextElement);
			var twTS = document.getElementById('textBoxFor-tilesWaitingTextElement');
			if (twTS) {
				var twtsS = twTS.style;							
				twtsS.width = textW + 'px';
				twtsS.height = textH + 'px';
				twtsS.left = dx + 'px';
				twtsS.top = (tdH - elementsOffset)  + 'px';
				Z.Utils.setTextAreaStyle(twTS, 'black', 'verdana', textFontSize + 'px', 'none', 'normal', 'normal', 'normal', 'normal', '1em', 'center', 'none', textPaddingSmall + 'px');
			}

			// Configure loading speed status bar.
			var labelElapsedTimeTextBox = Z.Utils.createContainerElement('div', 'labelElapsedTimeTextBox', 'inline-block', 'absolute', 'hidden', '1px', '1px', '0px', '0px', 'none', '0px', 'transparent none', '0px', '0px', 'nowrap', null, true);
			var labelElapsedTimeTextNode = document.createTextNode(Z.Utils.getResource('UI_TRACEDISPLAYELAPSEDTIMETEXT'));
			labelElapsedTimeTextBox.appendChild(labelElapsedTimeTextNode);
			Z.TraceDisplay.appendChild(labelElapsedTimeTextBox);
			var lETTB = document.getElementById('labelElapsedTimeTextBox');
			if (lETTB) {
				var lettbS = lETTB.style;
				lettbS.width =labelWSingle + 'px';
				lettbS.height = labelH + 'px';
				lettbS.left = margin2 + 'px';
				lettbS.top = (tdH - labelsOffset2)  + 'px';
				Z.Utils.setTextNodeStyle(lETTB, 'black', 'verdana', labelFontSize + 'px', 'none', 'normal', 'normal', 'normal', 'normal', '1em', 'left', 'none');
			}

			var tilesTimeElapsedTextElement = Z.Utils.createTextElement('tilesTimeElapsedTextElement', '', '1px', '1px', '1px', '1px', '0px', 'solid', '1px', false, 'verdana', '1px', 'none', null, 1, 'hidden', 'hidden', 'off');
			Z.TraceDisplay.appendChild(tilesTimeElapsedTextElement);
			var tteTS = document.getElementById('textBoxFor-tilesTimeElapsedTextElement');
			if (tteTS) {
				var ttetsS = tteTS.style;							
				ttetsS.width = textW2 + 'px';
				ttetsS.height = textH + 'px';
				ttetsS.left = (margin2 + labelWSingle / 2 + 10) + 'px';
				ttetsS.top = (tdH - elementsOffset2)  + 'px';
				Z.Utils.setTextAreaStyle(tteTS, 'black', 'verdana', textFontSize + 'px', 'none', 'normal', 'normal', 'normal', 'normal', '1em', 'center', 'none', textPaddingSmall + 'px');
			}	

			var labelTilesPerSecondTextBox = Z.Utils.createContainerElement('div', 'labelTilesPerSecondTextBox', 'inline-block', 'absolute', 'hidden', '1px', '1px', '0px', '0px', 'none', '0px', 'transparent none', '0px', '0px', 'nowrap', null, true);
			var labelTilesPerSecondTextNode = document.createTextNode(Z.Utils.getResource('UI_TRACEDISPLAYTILESPERSECONDTEXT'));
			labelTilesPerSecondTextBox.appendChild(labelTilesPerSecondTextNode);
			Z.TraceDisplay.appendChild(labelTilesPerSecondTextBox);
			var lTPSTB = document.getElementById('labelTilesPerSecondTextBox');
			if (lTPSTB) {
				var ltpstbS = lTPSTB.style;
				ltpstbS.width = labelWSingle + 'px';
				ltpstbS.height = labelH + 'px';
				ltpstbS.left = (margin2 + labelWSingle + textW2 - 20) + 'px';
				ltpstbS.top = (tdH - labelsOffset2)  + 'px';
				Z.Utils.setTextNodeStyle(lTPSTB, 'black', 'verdana', labelFontSize + 'px', 'none', 'normal', 'normal', 'normal', 'normal', '1em', 'left', 'none');
			}

			var tilesPerSecondTextElement = Z.Utils.createTextElement('tilesPerSecondTextElement', '', '1px', '1px', '1px', '1px', '0px', 'solid', '1px', false, 'verdana', '1px', 'none', null, 1, 'hidden', 'hidden', 'off');
			Z.TraceDisplay.appendChild(tilesPerSecondTextElement);
			var tpsTS = document.getElementById('textBoxFor-tilesPerSecondTextElement');
			if (tpsTS) {
				var tpstsS = tpsTS.style;							
				tpstsS.width = textW2 + 'px';
				tpstsS.height = textH + 'px';
				tpstsS.left = (margin2 + labelWSingle * 2 + textW2 - 20) + 'px';
				tpstsS.top = (tdH - elementsOffset2)  + 'px';
				Z.Utils.setTextAreaStyle(tpsTS, 'black', 'verdana', textFontSize + 'px', 'none', 'normal', 'normal', 'normal', 'normal', '1em', 'center', 'none', textPaddingSmall + 'px');
			}

			// Configure debug panel buttons.
			var btnW = 58;
			var btnH = 42;
			var btnL = 10;
			var btnT = tdH - (btnH / 2) - 10;
			var btnSpan = 10;
			var btnColor = this.getResource('DEFAULT_TRACEDISPLAYBUTTONCOLOR');
			var btnTxt = this.getResource('UI_TRACEDISPLAYSHOWGLOBALSBUTTONTEXT');
			var buttonShowGlobals = new this.Button('buttonShowGlobals', btnTxt, null, null, null, null, btnW + 'px', btnH + 'px', btnL + 'px', btnT + 'px', 'mousedown', this.showGlobals, 'TIP_SHOWGLOBALS', 'solid', '1px', btnColor, '0px', '0px');
			Z.TraceDisplay.appendChild(buttonShowGlobals.elmt);

			btnL += btnW + btnSpan;
			var btnTxt = this.getResource('UI_TRACEDISPLAYTOGGLEDISPLAYBUTTONTEXT');
			var buttonToggleDisplay = new this.Button('buttonToggleDisplay', btnTxt, null, null, null, null, btnW + 'px', btnH + 'px', btnL + 'px', btnT + 'px', 'mousedown', Z.Viewport.toggleDisplay, 'TIP_TOGGLEDISPLAY', 'solid', '1px', btnColor, '0px', '0px');
			Z.TraceDisplay.appendChild(buttonToggleDisplay.elmt);

			btnL += btnW + btnSpan;
			var btnTxt = this.getResource('UI_TRACEDISPLAYTOGGLEBACKFILLBUTTONTEXT');
			var buttonToggleBackfill = new this.Button('buttonToggleBackfill', btnTxt, null, null, null, null, btnW + 'px', btnH + 'px', btnL + 'px', btnT + 'px', 'mousedown', Z.Viewport.toggleBackfill, 'TIP_TOGGLEBACKFILL', 'solid', '1px', btnColor, '0px', '0px');
			Z.TraceDisplay.appendChild(buttonToggleBackfill.elmt);

			btnL += btnW + btnSpan;
			btnW += 12;
			var btnTxt = this.getResource('UI_TRACEDISPLAYTOGGLECONSTRAINPANBUTTONTEXT');
			var buttonToggleConstrainPan = new this.Button('buttonToggleConstrainPan', btnTxt, null, null, null, null, btnW + 'px', btnH + 'px', btnL + 'px', btnT + 'px', 'mousedown', Z.Viewport.toggleConstrainPan, 'TIP_TOGGLECONSTRAINPAN', 'solid', '1px', btnColor, '0px', '0px');
			Z.TraceDisplay.appendChild(buttonToggleConstrainPan.elmt);
		} else {
			var configureTraceDisplayTimer = window.setTimeout( function() { Z.Utils.configureTraceDisplay(); }, 100);
		}
	},

	showTraces : function () {
		// Debug option: Displays cummulative list of trace values.
		if (!Z.TraceDisplay) {
			Z.Utils.configureTraceDisplay();
		} else {
			Z.TraceDisplay.style.display = 'inline-block';
		}
	},

	hideTraces : function () {
		Z.TraceDisplay.style.display = 'none';
	},

	trace : function (text, blankLineBefore, blankLineAfter) {
		var preLines = (blankLineBefore) ? '\n' : '';
		var postLines = (blankLineAfter) ? '\n\n' : '\n';
		if (!Z.TraceDisplay) { Z.Utils.configureTraceDisplay(); }
		if (Z.traces) {
			Z.traces.value += preLines + text + postLines; 
			if (Z.debug == 2) { Z.traces.scrollTop = Z.traces.scrollHeight; }
		}
	},
	
	traceTileStatus : function (required, cached, requested, loaded, displayed, waiting) {
		if (!(trTS && tcTS && trqTS && tlTS && tdTS && twTS)) {
			var trTS = document.getElementById('tilesRequiredTextElement');
			var tcTS = document.getElementById('tilesCachedTextElement');
			var trqTS = document.getElementById('tilesRequestedTextElement');
			var tlTS = document.getElementById('tilesLoadedTextElement');
			var tdTS = document.getElementById('tilesDisplayedTextElement');
			var twTS = document.getElementById('tilesWaitingTextElement');
		}
		if (trTS && tcTS && trqTS && tlTS && tdTS && twTS) {
			if (typeof required !== 'undefined' && required !== null) {
				trTS.value = required.toString();
			}
			if (typeof cached !== 'undefined' && cached !== null) {
				tcTS.value = cached.toString();
			}
			if (typeof requested !== 'undefined' && requested !== null) {
				trqTS.value = requested.toString();
			}
			if (typeof loaded !== 'undefined' && loaded !== null) {
				tlTS.value = loaded.toString();
			}
			if (typeof displayed !== 'undefined' && displayed !== null) {
				tdTS.value = displayed.toString();
			}
			if (typeof waiting !== 'undefined' && waiting !== null) {
				twTS.value = waiting.toString();
			}
		}
	},
	
	traceTileSpeed : function (tmElpsd, loadsPerSec) {
		if (!(tteTS && tpsTS)) {
			var tteTS = document.getElementById('tilesTimeElapsedTextElement');
			var tpsTS = document.getElementById('tilesPerSecondTextElement');
		}
		if (tteTS && tpsTS) {
			if (typeof tmElpsd !== 'undefined' && tmElpsd !== null) {
				tteTS.value = tmElpsd.toString();
			}
			if (typeof loadsPerSec !== 'undefined' && loadsPerSec !== null) {
				tpsTS.value = Math.round(loadsPerSec).toString();
			}
		}
	},

	showGlobals : function () {
		// Debug option: Combines global variables as a single string and displays their current values.
		var gVs = '';
		gVs += '\n';
		gVs += '                            ZOOMIFY IMAGE VIEWER - CURRENT VALUES' + '\n';
		gVs += '\n';
		gVs += 'VIEW' + ':    ';
		gVs += 'Z.imageX=' + Z.imageX + ',   ';
		gVs += 'Z.imageY=' + Z.imageY + ',   ';
		gVs += 'Z.imageZ=' + Z.imageZ + ',   ';
		gVs += 'Z.imageR=' + Z.imageR + ',   ';
		gVs += 'Z.priorX=' + Z.priorX + ',   ';
		gVs += 'Z.priorY=' + Z.priorY + ',   ';
		gVs += 'Z.priorZ=' + Z.priorZ + ',   ';
		gVs += 'Z.priorR=' + Z.priorR + ',   ';
		gVs += '\n';
		gVs += 'IMAGE & SKIN' + ':    ';
		gVs += 'Z.imagePath=' + Z.imagePath + ',   ';
		gVs += 'Z.skinPath=' + Z.skinPath + ',   ';
		gVs += 'Z.skinMode=' + Z.skinMode + ',   ';
		gVs += 'Z.imageW=' + Z.imageW + ',   ';
		gVs += 'Z.imageH=' + Z.imageH + ',   ';
		gVs += 'tierCount=' + Z.Viewport.getTierCount() + ',   ';
		gVs += 'TILE_WIDTH=' + Z.Viewport.getTileW() + ',   ';
		gVs += 'TILE_HEIGHT=' + Z.Viewport.getTileH() + '\n';
		gVs += '\n';
		gVs += 'PAGE & BROWSER' + ':    ';
		gVs += 'Z.pageContainer=' + Z.pageContainer + ',   ';
		gVs += 'Z.browser=' + Z.browser + ',   ';
		gVs += 'Z.browserVersion=' + Z.browserVersion + ',   ';
		gVs += 'Z.canvasSupported=' + Z.canvasSupported + ',   ';
		gVs += 'Z.cssTransformsSupported=' + Z.cssTransformsSupported + ',   ';
		gVs += 'Z.cssTransformProperty=' + Z.cssTransformProperty + ',   ';
		gVs += 'Z.cssTransformNoUnits=' + Z.cssTransformNoUnits + ',   ';
		gVs += 'Z.alphaSupported=' + Z.alphaSupported + ',   ';
		gVs += 'Z.renderQuality=' + Z.renderQuality + ',   ';
		gVs += 'Z.rotationSupported=' + Z.rotationSupported + ',   ';
		gVs += 'Z.fullScreenSupported=' + Z.fullScreenSupported + ',   ';		
		gVs += 'Z.float32ArraySupported=' + Z.float32ArraySupported + ',   ';
		gVs += 'Z.uInt8ArraySupported=' + Z.uInt8ArraySupported + ',   ';
		gVs += 'Z.xmlHttpRequestSupport=' + Z.xmlHttpRequestSupport + ',   ';
		gVs += 'Z.definePropertySupported=' + Z.definePropertySupported + ',   ';
		gVs += 'Z.responseArraySupported=' + Z.responseArraySupported + ',   ';
		gVs += 'Z.responseArrayPrototyped=' + Z.responseArrayPrototyped + ',   ';		
		gVs += 'Z.mobileDevice=' + Z.mobileDevice + ',   ';		
		gVs += 'Z.zifSupported=' + Z.zifSupported + ',   ';
		gVs += 'Z.localUse=' + Z.localUse + '\n';		
		gVs += '\n';
		gVs += 'VIEWER OPTIONS & DEFAULTS' + ':    ';
		gVs += 'Z.initialX=' + Z.initialX + ',   ';
		gVs += 'Z.initialY=' + Z.initialY + ',   ';
		gVs += 'Z.initialZ=' + Z.initialZ + ',   ';
		gVs += 'Z.minZ=' + Z.minZ + ',   ';
		gVs += 'Z.maxZ=' + Z.maxZ + ',   ';
		gVs += 'Z.fitZ=' + Z.fitZ + ',   ';
		gVs += 'Z.zoomSpeed=' + Z.zoomSpeed + ',   ';
		gVs += 'Z.panSpeed=' + Z.panSpeed + ',   ';
		gVs += 'Z.fadeInSpeed=' + Z.fadeInSpeed + ',   ';
		gVs += 'Z.toolbarVisible=' + Z.toolbarVisible + ',   ';
		gVs += 'Z.toolbarW=' + Z.toolbarW + ',   ';
		gVs += 'Z.toolbarCurrentW=' + Z.toolbarCurrentW + ',   ';
		gVs += 'Z.toolbarH=' + Z.toolbarH + ',   ';
		gVs += 'Z.toolbarPosition=' + Z.toolbarPosition + ',   ';
		gVs += 'Z.tooltipsVisible=' + Z.tooltipsVisible + ',   ';
		gVs += 'Z.helpVisible=' + Z.helpVisible + ',   ';
		gVs += 'Z.navigatorVisible=' + Z.navigatorVisible + ',   ';
		gVs += 'Z.navigatorW=' + Z.navigatorW + ',   ';
		gVs += 'Z.navigatorH=' + Z.navigatorH + ',   ';
		gVs += 'Z.navigatorL=' + Z.navigatorL + ',   ';
		gVs += 'Z.navigatorT=' + Z.navigatorT + ',   ';
		gVs += 'Z.navigatorFit=' + Z.navigatorFit + ',   ';
		gVs += 'Z.clickZoom=' + Z.clickZoom + ',   ';
		gVs += 'Z.clickPan=' + Z.clickPan + ',   ';
		gVs += 'Z.mousePan=' + Z.mousePan + ',   ';
		gVs += 'Z.keys=' + Z.keys + ',   ';
		gVs += 'Z.constrainPan=' + Z.constrainPan + ',   ';
		gVs += 'Z.constrainPanStrict=' + Z.constrainPanStrict + ',   ';
		gVs += 'Z.smoothPan=' + Z.smoothPan + ',   ';
		gVs += 'Z.smoothPanEasing=' + Z.smoothPanEasing + ',   ';
		gVs += 'Watermark alpha = ' + Z.Utils.getResource('DEFAULT_WATERMARKALPHA') + ',   ';
		gVs += 'Z.watermarkPath=' + Z.watermarkPath + ',   ';
		gVs += 'Z.copyrightPath=' + Z.copyrightPath + ',   ';
		gVs += 'Z.hotspotPath=' + Z.hotspotPath + ',   ';
		gVs += 'Z.tourPath=' + Z.tourPath + ',   ';
		gVs += 'Z.slidePath=' + Z.slidePath + ',   ';
		gVs += 'Z.slideTransitionSpeed=' + Z.slideTransitionSpeed + ',   ';
		gVs += 'Z.audioContent=' + Z.audioContent + ',   ';
		gVs += 'Z.audioMuted=' + Z.audioMuted + ',   ';		
		gVs += 'Z.annotationPath=' + Z.annotationPath + ',   ';
		gVs += 'Z.saveHandlerPath=' + Z.saveHandlerPath + ',   ';
		gVs += 'Z.minimizeVisible=' + Z.minimizeVisible + ',   ';
		gVs += 'Z.sliderZoomVisible=' + Z.sliderZoomVisible + ',   ';
		gVs += 'Z.panButtonsVisible=' + Z.panButtonsVisible + ',   ';
		gVs += 'Z.resetVisible=' + Z.resetVisible + ',   ';		
		gVs += 'Z.fullScreenVisible=' + Z.fullScreenVisible + ',   ';
		gVs += 'Z.fullPageVisible=' + Z.fullPageVisible + ',   ';
		gVs += 'Z.initialFullPage=' + Z.initialFullPage + ',   ';
		gVs += 'Z.measureVisible=' + Z.measureVisible + ',   ';
		gVs += 'Z.captionTextColor=' + Z.captionTextColor + ',   ';
		gVs += 'Z.captionBackColor=' + Z.captionBackColor + ',   ';
		gVs += 'Z.polygonLineColor=' + Z.polygonLineColor + ',   ';
		gVs += 'Z.polygonFillColor=' + Z.polygonFillColor + ',   ';
		gVs += 'Z.captionTextVisible=' + Z.captionTextVisible + ',   ';
		gVs += 'Z.captionBackVisible=' + Z.captionBackVisible + ',   ';
		gVs += 'Z.polygonFillVisible=' + Z.polygonFillVisible + ',   ';
		gVs += 'Z.polygonLineVisible=' + Z.polygonLineVisible + ',   ';
		gVs += 'Z.rotationVisible=' + Z.rotationVisible + ',   ';
		gVs += 'Z.initialRotation=' + Z.initialRotation + ',   ';
		gVs += 'Z.virtualPointerVisible=' + Z.virtualPointerVisible + ',   ';
		gVs += 'Z.crosshairsVisible=' + Z.crosshairsVisible + ',   ';
		gVs += 'Z.rulerVisible=' + Z.rulerVisible + ',   ';
		gVs += 'Z.units=' + Z.units + ',   ';
		gVs += 'Z.unitsPerImage=' + Z.unitsPerImage + ',   ';
		gVs += 'Z.pixelsPerUnit=' + Z.pixelsPerUnit + ',   ';
		gVs += 'Z.sourceMagnification=' + Z.sourceMagnification + ',   ';
		gVs += 'Z.rulerListType=' + Z.rulerListType + ',   ';
		gVs += 'Z.rulerW=' + Z.rulerW + ',   ';
		gVs += 'Z.rulerH=' + Z.rulerH + ',   ';
		gVs += 'Z.rulerL=' + Z.rulerL + ',   ';
		gVs += 'Z.rulerT=' + Z.rulerT + ',   ';
		gVs += 'Z.coordinatesVisible=' + Z.coordinatesVisible + ',   ';
		gVs += 'Z.progressVisible=' + Z.progressVisible + ',   ';
		gVs += 'Z.logoVisible=' + Z.logoVisible + ',   ';
		gVs += 'Z.logoLinkURL=' + Z.logoLinkURL + ',   ';		
		gVs += 'Z.logoCustomPath=' + Z.logoCustomPath + ',   ';
		gVs += 'Z.canvas=' + Z.canvas + ',   ';
		gVs += 'Z.debug=' + Z.debug + ',   ';
		gVs += 'Z.imageProperties=' + Z.imageProperties + ',   ';
		gVs += 'Z.serverIP=' + Z.serverIP + ',   ';
		gVs += 'Z.serverPort=' + Z.serverPort + ',   ';
		gVs += 'Z.tileSource=' + Z.tileSource + ',   ';
		gVs += 'Z.tileType=' + Z.tileType + ',   ';
		gVs += '\n';
		gVs += 'INTERNAL VALUES' + ':    ';
		gVs += '\n';
		gVs += 'displayW=' + Z.Viewport.getDisplayW() + ',   ';
		gVs += 'displayH=' + Z.Viewport.getDisplayH() + ',   ';
		gVs += 'tierCurrent=' + Z.Viewport.getTierCurrent() + ',   ';
		gVs += 'tierBackfill=' + Z.Viewport.getTierBackfill() + ',   ';
		gVs += 'tierBackfillDynamic=' + Z.Viewport.getTierBackfillDynamic() + ',   ';
		gVs += 'tierBackfillOversize=' + Z.Viewport.getTierBackfillOversize() + ',   ';
		gVs += 'tierScale=' + Z.Viewport.getTierScale() + ',   ';
		gVs += 'TIERS_SCALE_UP_MAX=' + Z.Viewport.getTiersScaleUpMax() + ',   ';
		gVs += 'TIERS_SCALE_DOWN_MAX=' + Z.Viewport.getTiersScaleDownMax() + ',   ';
		gVs += 'TILES_CACHE_MAX=' + Z.Viewport.getTilesCacheMax() + ',   ';
		gVs += 'Z.useCanvas=' + Z.useCanvas + '\n';
		gVs += 'Z.editMode=' + Z.editMode + '\n';
		gVs += 'Z.labelMode=' + Z.labelMode + '\n';
		gVs += 'Z.editing=' + Z.editing + '\n';
		gVs += '\n';
		gVs += 'INTERNAL LISTS' + ':    ';
		gVs += 'tierWs=' + Z.Viewport.getTierWs() + ',   ';
		gVs += 'tierHs=' + Z.Viewport.getTierHs() + ',   ';
		gVs += 'tierTileCounts=' + Z.Viewport.getTierTileCounts() + ',   ';
		gVs += 'tilesLoadingNames=' + Z.Viewport.getTilesLoadingNames() + '\n';
		gVs += '\n';
		alert(gVs);
	}
};