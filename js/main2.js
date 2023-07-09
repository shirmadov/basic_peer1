'use strict';

const startButton = document.getElementById('startButton');
const callButton = document.getElementById('callButton');
const hangupButton = document.getElementById('hangupButton');
callButton.disabled = true;
hangupButton.disabled = true;
startButton.addEventListener('click', start);
callButton.addEventListener('click', call);
hangupButton.addEventListener('click', hangup);

const localVideo = document.getElementById('localVideo');
const remoteVideo = document.getElementById('remoteVideo');


let localStream;
let pc1;
let pc2;
const offerOptions = {
    offerToReceiveAudio: 1,
    offerToReceiveVideo: 1
};

function getName(pc) {
    return (pc === pc1) ? 'pc1' : 'pc2';
}

function getOtherPc(pc) {
    return (pc === pc1) ? pc2 : pc1;
}

async function start() {
    startButton.disabled = true;
    try {
        const stream = await navigator.mediaDevices.getUserMedia({audio: true, video: true});
        localVideo.srcObject = stream;
        localStream = stream;
        callButton.disabled = false;
    } catch (e) {
        alert(`getUserMedia() error: ${e.name}`);
    }
}

async function call() {
    callButton.disabled = true;
    hangupButton.disabled = false;

    const configuration = {};
    pc1 = new RTCPeerConnection(configuration);
    pc1.addEventListener('icecandidate', e => onIceCandidate(pc1, e));

    pc2 = new RTCPeerConnection(configuration);
    pc2.addEventListener('icecandidate', e => onIceCandidate(pc2, e));

    pc2.addEventListener('track', gotRemoteStream);

    localStream.getTracks().forEach(track => pc1.addTrack(track, localStream));

    try {
        const offer = await pc1.createOffer(offerOptions);
        await onCreateOfferSuccess(offer);
    } catch (e) {
        onCreateSessionDescriptionError(e);
    }
}

async function onIceCandidate(pc, event) {
    try {
        await (getOtherPc(pc).addIceCandidate(event.candidate));
    } catch (e) {
        onAddIceCandidateError(pc, e);
    }
}

function onAddIceCandidateError(pc, error) {
    console.log(`${getName(pc)} failed to add ICE Candidate: ${error.toString()}`);
}

function gotRemoteStream(e) {
    if (remoteVideo.srcObject !== e.streams[0]) {
        remoteVideo.srcObject = e.streams[0];
    }
}

async function onCreateOfferSuccess(desc) {
    try {
        await pc1.setLocalDescription(desc);
    } catch (e) {
        onSetSessionDescriptionError();
    }

    try {
        await pc2.setRemoteDescription(desc);
    } catch (e) {
        onSetSessionDescriptionError();
    }

    try {
        const answer = await pc2.createAnswer();
        await onCreateAnswerSuccess(answer);
    } catch (e) {
        onCreateSessionDescriptionError(e);
    }
}

async function onCreateAnswerSuccess(desc) {
    try {
        await pc2.setLocalDescription(desc);
    } catch (e) {
        onSetSessionDescriptionError(e);
    }
    try {
        await pc1.setRemoteDescription(desc);
    } catch (e) {
        onSetSessionDescriptionError(e);
    }
}

function onCreateSessionDescriptionError(error) {
    console.log(`Failed to create session description: ${error.toString()}`);
}

function onSetSessionDescriptionError(error) {
    console.log(`Failed to set session description: ${error.toString()}`);
}

function hangup() {
    console.log('Ending call');
    pc1.close();
    pc2.close();
    pc1 = null;
    pc2 = null;
    hangupButton.disabled = true;
    callButton.disabled = false;
}