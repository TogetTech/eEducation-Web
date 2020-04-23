const {ipcRenderer: ipc} = require('electron');
const fs = require('fs');

const AgoraRtcEngine = require('agora-electron-sdk').default;

window.ipc = ipc;

window.fs = fs;

const rtcEngine = new AgoraRtcEngine();

window.rtcEngine = rtcEngine;