

var video = document.querySelector("#video");
var singer_video = document.querySelector("#singer_video");
var confirm_playBackVideo = document.querySelector("#confirm_playBackVideo");
var ui_vocal_mute = document.querySelector("#ui_vo_mute");
//var ui_play_only = document.querySelector("#ui_play_only");
//var ui_pause_only = document.querySelector("#ui_pause_only");
var ui_rec_start = document.querySelector("#ui_rec_start");
var ui_rec_stop = document.querySelector("#ui_rec_stop");
var ui_post_video = document.querySelector("#ui_post_video");
var ui_overlay_close = document.querySelector(".post_container .cancel");
var audioContext;
var gain;// AudioContext Gain Node
var cameraReady = false, videoReady = false;
var recorder; // レコーダーを用意、MediaRecorderインスタンス
var cameraStream; // cameraからのローカルストリームデータ
var recordTime = 0; // 録画時間
var recordFlg = false; // 録画を許可
var blob; // blob video

navigator.getUserMedia = ( navigator.getUserMedia ||
                       navigator.webkitGetUserMedia ||
                       navigator.mozGetUserMedia ||
                       navigator.msGetUserMedia);

function getAudioContext () {
	/*Videoの左右のチャンネルを独立して管理して、ボーカルをミュートするための処理*/
	var video_node = audioContext.createMediaElementSource(video);
	gain = audioContext.createGain();
	var splitter = audioContext.createChannelSplitter(2);
	var merger = audioContext.createChannelMerger(2);
	video_node.connect(splitter);
	// 0はoke（左）, 1はVo（右）
	gain.gain.value = 1; // （Chrome）Voの音量はデフォでMax
	gain.value = 1; // （Firefox）Voの音量はデフォでMax
	splitter.connect(gain, 1); // 1ch（つまり右chだけGainにつなぐ）
	gain.connect(merger, 0, 0); // Voを右に振る 
	gain.connect(merger, 0, 1); // Voを左に振る 
	splitter.connect(merger, 0, 0); // okeを左に振る
	splitter.connect(merger, 0, 1); // okeを右に振る
	merger.connect(audioContext.destination);
}

function changeVocalMute () {
	/*ボーカルのミュートボタンが押された処理*/
	$("body").toggleClass("muted_vo");
	if(!$("body").hasClass("muted_vo") && gain) {
		gain.gain.value = gain.value = 1;
	}else{
		gain.gain.value = gain.value = 0;
	}
}
var chunks = [];
function rec_start () {
	recordFlg = true;
	console.log("rec_start")
	/*ui_play_only.disabled = */ui_rec_start.disabled = true;
	recorder = new MediaRecorder(cameraStream);
	var iscompleted = false;
	recorder.ondataavailable = function(evt) {
		//blob = new Blob([evt.data], { type: evt.data.type });
		chunks.push(evt.data);
		if (recorder.state == 'inactive') {
			/*console.log(cameraStream);
			console.log(blob)*/
			blob = new Blob(chunks, { type: evt.data.type });
			confirm_playBackVideo.src = window.URL.createObjectURL(blob);
			ui_post_video.disabled = false;
		}

	}
	video.play();
	video.onended = rec_stop;
	//video.onpause = rec_stop;
	chunks = [];
	recorder.start();
	$("body").addClass("recording")
	recordTime = new Date().getTime();
}

function rec_stop () {
	console.log("rec_stop")
	var currentRecordTime = new Date().getTime();

	if(recordFlg && currentRecordTime - recordTime > 1000) {
		/*ui_play_only.disabled = */ui_rec_start.disabled = false;
		//console.log(recordTime)
		if(recorder && recorder.state != "inactive") {
			//console.log("recorder.stop")
			recorder.stop();
		}
		video.pause();
		video.currentTime = 0;
		$("body").removeClass("recording playing").addClass("playbacking")
		recordFlg = false;
	}
}

function init () {
	audioContext = new AudioContext();
	navigator.getUserMedia({video:true, audio:true}, cameraSuccess, cameraError);
	// UI actions
	ui_vocal_mute.onclick = changeVocalMute;

	video.onplay = function () {
		$("body").addClass("playing");
	}
	video.onpause = function () {
		$("body").removeClass("playing");
	}

	ui_rec_stop.onclick = rec_stop;
	ui_rec_start.onclick = rec_start;
	ui_overlay_close.onclick = function () {
		// 投稿をキャンセル
		blob = null;
		confirm_playBackVideo.src = null;
		$("body").removeClass("playbacking");
	}
	ui_post_video.onclick = postVideo;// サーバーに動画を送信

	video.oncanplay = function () { // Init Video Settings
		videoReady = true;
	}

	var sid = setInterval(function () { // VideoとCameraの準備ができたか確認
		if(videoReady && cameraReady) {
			clearInterval(sid);
			allReady()
		}
	}, 100)
	$(".show_lyrics").on("click", function () {
		$(".lyrics").slideToggle();
	})
}

function postVideo () {
	var formData = new FormData();
    formData.append('filename', 'singer_'+new Date().getTime()+'.webm');
    formData.append('blob', blob);
    formData.append('message', document.getElementById("post_message").value);
    $(".overlay_playback").addClass('sending');
	var request = new XMLHttpRequest();
    request.onreadystatechange = function () {
        if (request.readyState == 4 && request.status == 200 && request.responseText === "Successfully_uploaded") {
        	setTimeout(function () {
        		$(".overlay_playback").removeClass('sending'); // 送信状態を解除
	            $("body").removeClass("playbacking").addClass("sent_completed"); // 完了画面に移行する
        	},1000);
        }
    };
    request.open('POST', 'upload.php');
    request.send(formData);
}

function allReady () { // VideoとCamera準備OK
	getAudioContext() // videoの音のセパレート処理

}

function createAnalyser () {
	var analyser = audioContext.createAnalyser();
	analyser.fftSize = 128;
	var timeDomain = new Float32Array(analyser.frequencyBinCount);
	var frequency = new Uint8Array(analyser.frequencyBinCount);
	audioContext.createMediaStreamSource(cameraStream).connect(analyser);
	var singer_analyser = document.querySelector(".singer_analyser");
	(function soundUpdate() {
		analyser.getFloatTimeDomainData(timeDomain);
		analyser.getByteFrequencyData(frequency);
		singer_analyser.style.transform = "scale("+ (frequency[10]/512+1) + ")";
		//console.log(frequency[50]/128*10)
		var analyseId = requestAnimationFrame(soundUpdate)
	})()
}

function cameraSuccess (data) {
	cameraReady = true;
	cameraStream = data;
	data.getAudioTracks().muted = true;
	singer_video.volume = 0;
	singer_video.src = URL.createObjectURL(data);
	createAnalyser()
}

function cameraError () {
	alert("Webカメラのエラーが起きました、パソコンにカメラがつながっているか確認してください")
}
function checkBrowser () {
	if(typeof AudioContext === "undefined" || typeof navigator.getUserMedia === 'undefined' || typeof MediaRecorder === 'undefined') {
		$("body").addClass("incompatible_brouser");
	}else {
		init();
	}
}


// Activate
window.onload = function () {
	checkBrowser()
}







