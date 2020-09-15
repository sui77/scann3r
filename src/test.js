const PiCamera = require('pi-camera');
const myCamera = new PiCamera({
  mode: 'photo',
  width: 640,
  height: 480,
  nopreview: true,
  timeout: 1,
    output: 'testi.jpg'
});

/*
myCamera.snap()
  .then((result) => {
    // Your picture was captured
      console.log(result);
  })
  .catch((error) => {
     // Handle your error
      console.log(error);
  });
*/
myCamera.snapDataUrl()
  .then((result) => {
    // Your picture was captured
    console.log(`<img src="${result}">`);
  })
  .catch((error) => {
     // Handle your error
  });
