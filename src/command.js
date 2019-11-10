import UI from 'sketch/ui';
import Sketch from 'sketch/dom';
import BrowserWindow from 'sketch-module-web-view';
import { getWebview } from 'sketch-module-web-view/remote';
import tinycolor from 'tinycolor2';
import { toArray } from 'util';

const webviewIdentifier = 'text-contrast.webview';
var isPanelOpen;
var checker;

export default function () {
  const existingWebview = getWebview(webviewIdentifier);
  if (existingWebview) {
    closePanel();
  } else {
    openPanel();
  }
}

function openPanel() {
  isPanelOpen = true;
  var document = Sketch.getSelectedDocument();
  const options = {
    identifier: webviewIdentifier,
    width: 420,
    height: 150,
    show: false,
    alwaysOnTop: true,
    parent: document,
    titleBarStyle: 'hiddenInset',
    minimizable: false,
    maximizable: false,
    fullscreenable: false,
    transparent: true,
    hasShadow: false,
    frame: false
  }

  const browserWindow = new BrowserWindow(options)

  // only show the window when the page has loaded to avoid a white flash
  browserWindow.once('ready-to-show', () => {
    browserWindow.show();

    var data = {
      foregroundColor: '#fff',
      foregroundColorLabel: ' ',
      backgroundColor: '#fff',
      backgroundColorLabel: ' ',
      ratioValue: getRatioLabel(),
      ratioLabel: '',
      status: getRatioStatus()
    };
    const existingWebview = getWebview(webviewIdentifier);
    displayData(existingWebview, data);
  })

  const webContents = browserWindow.webContents

  browserWindow.webContents.on('nativeLog', function(s) {
    console.log('nativeLog: ', s);
  })

  browserWindow.loadURL(require('../resources/webview.html'));

  checkLayer();
}

function closePanel() {
  isPanelOpen = false;
  const existingWebview = getWebview(webviewIdentifier);
  if (existingWebview) {
    existingWebview.close();
  }
}

// When the plugin is shutdown by Sketch (for example when the user disable the plugin)
// we need to close the webview if it's open
export function onShutdown() {
  closePanel();
}

function getFill(layer) {
  if (layer && layer.style) {
    if (layer.type == 'Text'){
      return layer.style.textColor;
    } else if (layer.type == 'Artboard') {
      return layer.background.color;
    } else {
      var fills = layer.style.fills;
      return fills[0].color;
    }
  }
  return null;
}

function getContrastRatio(foregroundColor, backgroundColor) {
  // (L1 + 0.05) / (L2 + 0.05)
  return tinycolor.readability(foregroundColor, backgroundColor);
}

function getBounds(layer) {
  // frame: { x: 81, y: 87, width: 51, height: 19 },
  if (layer.frame) {
    return {
      top: layer.frame.y,
      left: layer.frame.x,
      right: layer.frame.x + layer.frame.width,
      bottom: layer.frame.y + layer.frame.height
    }
  }
  return null;
}

function intersect(a, b) {
  // a { top: 87, left: 81, right: 132, bottom: 106 }
  // b { top: 32, left: 56, right: 164, bottom: 160 }
  var boundsA = getBounds(a);
  var boundsB = getBounds(b);
  if (boundsA && boundsB) {
    return (boundsA.left <= boundsB.right &&
            boundsB.left <= boundsA.right &&
            boundsA.top <= boundsB.bottom &&
            boundsB.top <= boundsA.bottom);
  }
  return null;
}

function getClosestLayer(layer){
  // access the artboard the layer is in
  var artboard = layer.getParentArtboard();
  if (artboard.layers) {
    var intersectingLayers = [];
    artboard.layers.forEach(item => {
      if (layer.id != item.id) {
        var intersects = intersect(layer, item);
        if (intersects) {
          if (item.index <= layer.index &&
            (item.type == "ShapePath" || item.type == 'Group')) {
            intersectingLayers.push(item);
          }
        }
      }
    });
    // if nothing interesects then return the artboard
    if (intersectingLayers.length == 0 ){
      return artboard;
    }
    // Return the closest one (layer.index)
    var closestIndex = Math.max(...intersectingLayers.map(x => x.index));
    return intersectingLayers.find((item) => item.index == closestIndex);
  }
  return null;
  // artboard.getParentArtboard() === undefined

  // // access the symbol master the layer is in (if any)
  // layer.getParentSymbolMaster()
  // symbolMaster.getParentSymbolMaster() === undefined

  // // access the shape the layer is in (if any)
  // layer.getParentShape()
}

function getRatioLabel(ratioValue) {
  if (!ratioValue) {
    return 'Select a layer or 2';
  }
  if (ratioValue < 3){
    return 'Fail'
  } else if (ratioValue >= 3 && ratioValue < 4.5) {
    return 'AA Large';
  } else if (ratioValue >= 4.5 && ratioValue < 7) {
    return 'AA';
  }
  return 'AAA';
}

function getRatioStatus(ratioValue) {
  if (!ratioValue) {
    return 'idle';
  }
  if (ratioValue < 3){
    return 'fail'
  } else if (ratioValue >= 3 && ratioValue < 4.5) {
    return 'aa';
  } else if (ratioValue >= 4.5 && ratioValue < 7) {
    return 'aa';
  }
  return 'aaa';
}

function checkLayer() {
  const existingWebview = getWebview(webviewIdentifier);
  var document = Sketch.getSelectedDocument();
  var selection = document.selectedLayers;
  var data;
  if (!selection.isEmpty){
    var color1, color2;
    if (selection.layers.length == 1) {
      selection.forEach(layer => {
        // Get fill of the selected layer
        var selectedLayer = selection.layers[0];
        color1 = getFill(selectedLayer);
        var closestLayer = getClosestLayer(selectedLayer);
        color2 = getFill(closestLayer);
      });
    } else if (selection.layers.length == 2) {
      // Get the fills of the two selected layers and get the constrast ratio
      color1 = getFill(selection.layers[0]);
      color2 = getFill(selection.layers[1]);
    }
    if (color1 && color2) {
      var contrastRatio = getContrastRatio(color1, color2);

      // update webview
      data = {
        foregroundColor: color1,
        foregroundColorLabel: '#'+tinycolor(color1).toHex(),
        backgroundColor: color2,
        backgroundColorLabel: '#'+tinycolor(color2).toHex(),
        ratioValue: Math.round(contrastRatio * 100) / 100,
        ratioLabel: getRatioLabel(contrastRatio),
        status: selection.layers[0].getParentArtboard.background.color // getRatioStatus(contrastRatio)
      };
    }
  }else{
    // update webview empty state
    data = {
      foregroundColor: '#fff',
      foregroundColorLabel: ' ',
      backgroundColor: '#fff',
      backgroundColorLabel: ' ',
      ratioValue: getRatioLabel(),
      ratioLabel: '',
      status:  getRatioStatus()
    };
  }

  if (existingWebview) {
    displayData(existingWebview, data);

    checker = setTimeout(checkLayer, 1000);
  }
  /**
   * id: '3578767F-3DC2-4D55-97AF-87AF92B9EF64',
   * frame: { x: 81, y: 87, width: 51, height: 19 },
   * style: Style {
   *  textColor: '#cc4646ff'
   * }
   */
}

function displayData(webview, data) {
  if (webview && data) {
    webview.webContents
      .executeJavaScript(`displayContrastRatio(${JSON.stringify(data)})`)
      .catch(console.error);
  }
}

export function onSelectionChanged(context) {
  // const action = context.actionContext;

  // // The context information for each action will be different. For the SelectionChanged action,
  // // we are passed three interesting values: which document the selection has changed in,
  // // what the old selection was, what the new selection is (or will be).

  // // For our purposes, we can ignore the old selection, but we need the other two values.

  // // let's wrap the native document
  // const document = Sketch.fromNative(action.document)
  // // and transform the NSArray that is `newSelection` into a proper array
  // const selection = toArray(action.newSelection)

  // //console.log('Selection: ', selection, selection[0], Sketch.fromNative(selection[0]));

  // // Now for the meat of the plugin. What we want it to do is to show a small message at the bottom
  // // of the canvas, showing how many items the user has selected. If there are no items, the message
  // // area should be hidden.

  // // So first let's get the selection count.
  // const count = selection.length
  // if (count === 0) {
  //   //UI.message('No layers selected', document)
  // } else {
  //   // If one or more items are selected, we want to show a message.
  //   // We check for a single item and handle that as a special case so that we can get the wording correct.

  //   const message =
  //     count === 1 ? '1 layer selected' : `${count} layers selected`

  //     console.log(selection.layers[0]);
  // }
}
