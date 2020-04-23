const {ipcRenderer: ipc} = require('electron');
const fs = require('fs');
const zlib = require('zlib');
const { pipeline } = require('stream');
const { promisify } = require('util')

const AgoraRtcEngine = require('agora-electron-sdk').default;

window.ipc = ipc;

window.fs = fs;

window.zlib = zlib;

window.pipePromise = promisify(pipeline)

window.readFilePromise = promisify(fs.readFile)

const rtcEngine = new AgoraRtcEngine();

window.rtcEngine = rtcEngine;