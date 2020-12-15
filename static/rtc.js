//화면, 소리 mute
const localVideo = document.getElementById('localVideo');
const videoBtn = document.querySelector('#videoBtn');
const audioBtn = document.querySelector('#audioBtn');

//채팅
const chatText = document.getElementById('chatText');
const chatList = document.getElementById('chatList');
const sendBtn = document.getElementById('sendText');

//이름관리
const myname = document.getElementById('myname');
const changeName = document.getElementById('changeName');
let socketIDforchat = [];

//소켓, stream관리
let socketId;
let localStream;
let peer = [];
let dataChannel = [];
let remoteDataChannel = [];
let clientListforChat = [];

(function start() {
    console.log('start');

    let constraints = {
        video: true,
        audio: true,
    };

    navigator.mediaDevices
        .getUserMedia(constraints)
        .then(getUserMediaSuccess)
        .then(function () {
            socket = io.connect('/', { secure: true });
            socket.on('signal', gotMessageFromServer);

            socket.on('connect', function () {
                socketId = socket.id;

                //유저나감
                socket.on('user-left', function (id) {
                    console.log(id);
                    let video = document.querySelector('[ID="' + id + '"]');
                    let parentDiv = video.parentElement;
                    parentDiv.parentElement.removeChild(parentDiv);
                });

                socket.on('user-joined', function (id, count, clientsList) {
                    clientListforChat = clientsList;
                    //console.log('clientlist',clientsList);
                    clientsList.forEach(function (socketListId) {
                        if (!peer[socketListId]) {
                            peer[socketListId] = new RTCPeerConnection(null);

                            //상대방 ICE candidate 대기
                            peer[socketListId].onicecandidate = function (
                                event
                            ) {
                                if (event.candidate != null) {
                                    console.log('SENDING ICE');
                                    socket.emit(
                                        'signal',
                                        socketListId,
                                        JSON.stringify({ ice: event.candidate })
                                    );
                                }
                            };
                            //상대방 STREAM EVENT
                            peer[socketListId].onaddstream = function (event) {
                                gotRemoteStream(event, socketListId);
                            };
                            //자신의 STREAM 전송
                            peer[socketListId].addStream(localStream);

                            //DATA channel연결
                            dataChannel[socketListId] = peer[
                                socketListId
                            ].createDataChannel('chat', {
                                ordered: false,
                                maxRetransmitTime: 3000,
                            });

                            peer[socketListId].ondatachannel = (event) => {
                                remoteDataChannel[socketListId] = event.channel;
                                remoteDataChannel[
                                    socketListId
                                ].addEventListener('open', (event) => {
                                    //console.log('datachannel 연결 성공', event);
                                });

                                remoteDataChannel[
                                    socketListId
                                ].addEventListener('message', (event) => {
                                    //changeName message
                                    let message = event.data;
                                    if (message.includes('CNprotocol')) {
                                        changePeerName(
                                            message.split('CNprotocol')
                                        );
                                    } else {
                                        //chat message
                                        addChat(message);
                                    }
                                });
                            };
                        }
                    });
                    if (count >= 2) {
                        peer[id].createOffer().then(function (description) {
                            peer[id]
                                .setLocalDescription(description)
                                .then(function () {
                                    // console.log(peer);
                                    socket.emit(
                                        'signal',
                                        id,
                                        JSON.stringify({
                                            sdp: peer[id].localDescription,
                                        })
                                    );
                                })
                                .catch((e) => console.log(e));
                        });
                    }
                });
            });
        });
})();

//이름설정
changeName.onclick = changeMyName;

function changeMyName(event) {
    event.preventDefault();
    let myChangedName = socketId + 'CNprotocol' + myname.value;
    clientListforChat.forEach((client) => {
        if (dataChannel[client].readyState === 'open') {
            dataChannel[client].send(myChangedName);
        }
    });
}

function changePeerName(message) {
    console.log(message);
    let video = document.querySelector('[ID="' + message[0] + '"]');
    //console.log(video.parentElement.firstChild);
    //console.log(video.parentElement.firstChild.nextSibling);
    video.parentElement.firstChild.nextSibling.innerHTML = message[1] + ' ';
}

//채팅구현
chatText.onchange = sendText;
sendBtn.onclick = sendText;

function sendText(event) {
    event.preventDefault();
    //console.log('clientList',clientListforChat);

    let message = myname.value + ' : ' + chatText.value;
    clientListforChat.forEach((client) => {
        if (dataChannel[client].readyState === 'open') {
            dataChannel[client].send(message);
        }
    });
    if (myname.value === '익명') {
        message = '본인 : ' + chatText.value;
    }

    addChat(message);
    chatText.value = '';
}
function addChat(message) {
    let li = document.createElement('li');
    //li.innerHTML = '<span>'+text+'</span>';
    li.innerHTML = '<span>' + message + '</span>';
    chatList.appendChild(li);
}

function getUserMediaSuccess(stream) {
    localStream = stream;
    localVideo.srcObject = stream;
}

function gotRemoteStream(event, id) {
    let videos = document.querySelector('.videos');
    let video = document.createElement('video');
    let div = document.createElement('div');
    let span = document.createElement('span');

    video.setAttribute('ID', id);
    div.setAttribute('class', 'video_cell');
    span.setAttribute('class', 'name');
    span.innerHTML = '익명';

    video.srcObject = event.stream;
    video.autoplay = true;
    video.playsinline = true;
    video.width = 320;

    div.appendChild(video);
    div.appendChild(span);
    videos.appendChild(div);
}

function gotMessageFromServer(remoteSocketID, message) {
    let signal = JSON.parse(message);

    if (remoteSocketID != socketId) {
        if (signal.sdp) {
            console.log('signal.sdp : ', signal.sdp);
            peer[remoteSocketID]
                .setRemoteDescription(new RTCSessionDescription(signal.sdp))
                .then(function () {
                    if (signal.sdp.type == 'offer') {
                        //console.log('sdt signal');
                        peer[remoteSocketID]
                            .createAnswer()
                            .then(function (description) {
                                console.log('Description : ', signal);
                                peer[remoteSocketID]
                                    .setLocalDescription(description)
                                    .then(function () {
                                        socket.emit(
                                            'signal',
                                            remoteSocketID,
                                            JSON.stringify({
                                                sdp:
                                                    peer[remoteSocketID]
                                                        .localDescription,
                                            })
                                        );
                                    })
                                    .catch((e) => console.log(e));
                            })
                            .catch((e) => console.log(e));
                    }
                })
                .catch((e) => console.log(e));
        }

        if (signal.ice) {
            console.log('ice signal : ', signal.ice);
            peer[remoteSocketID]
                .addIceCandidate(new RTCIceCandidate(signal.ice))
                .catch((e) => console.log(e));
        }
    }
}

videoBtn.addEventListener('click', (event) => {
    let tracks = localStream.getTracks();
    let type;
    tracks.forEach((track, idx) => {
        //console.log(track);
        if (track.kind === 'video') {
            type = idx;
        }
    });
    const newState = !localStream.getTracks()[type].enabled;
    videoBtn.innerHTML = newState ? 'VIDEO OFF' :'VIDEO ON';
    localStream.getTracks()[type].enabled = newState;
    //console.log("Video turn");
});

audioBtn.addEventListener('click', (event) => {
    let tracks = localStream.getTracks();
    let type;
    tracks.forEach((track, idx) => {
        //console.log(track);
        if (track.kind === 'audio') {
            type = idx;
        }
    });
    const newState = !localStream.getTracks()[type].enabled;
    audioBtn.innerHTML = newState ?  'AUDIO OFF':'AUDIO ON' ;
    localStream.getTracks()[type].enabled = newState;
    // console.log("Audio turn");
});
