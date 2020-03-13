const proxy = require('http-proxy-middleware');
// const RTM_ENDPOINT = process.env.REACT_APP_AGORA_ENDPOINT_URL;
const OPEN_EDU_API = process.env.REACT_APP_AGORA_OPEN_EDU_API;
const APP_ID = process.env.REACT_APP_AGORA_APP_ID;
module.exports = function (app) {
  // RTM_ENDPOINT && app.use(
  //   '/dev/v2/',
  //   proxy({
  //     target: RTM_ENDPOINT,
  //     changeOrigin: true,
  //   })
  // );
  OPEN_EDU_API && app.use(
    '/edu/v1/',
    proxy({
      target: OPEN_EDU_API,
      changeOrigin: true,
    })
  )
  OPEN_EDU_API && app.use(
    '/edu/v2/',
    proxy({
      target: OPEN_EDU_API,
      changeOrigin: true,
    })
  )
}