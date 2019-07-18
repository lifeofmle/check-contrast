// // disable the context menu (eg. the right click menu) to have a more native feel
// document.addEventListener('contextmenu', (e) => {
//   e.preventDefault()
// })

window.displayContrastRatio = (data) => {
  var foregroundDot = document.getElementById('foreground-disc');
  var foregroundLabel = document.getElementById('foreground-color');
  var backgroundDot = document.getElementById('background-disc');
  var backgroundLabel = document.getElementById('background-color');
  var ratioValue = document.getElementById('ratio-value');
  var ratioLabel = document.getElementById('ratio-label');
  var ratioDisc = document.getElementById('ratio-disc');

  // reset status css class
  foregroundDot.style.backgroundColor = data.foregroundColor;
  foregroundLabel.innerText = data.foregroundColorLabel;
  backgroundDot.style.backgroundColor = data.backgroundColor;
  backgroundLabel.innerText = data.backgroundColorLabel;
  ratioValue.innerText = data.ratioValue;
  ratioLabel.innerText = data.ratioLabel;

  ratioDisc.classList.remove("idle","aa","aaa","fail");
  ratioDisc.classList.add(data.status);
}

