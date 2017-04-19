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
var audioContext = new AudioContext();
var gain;// AudioContext Gain Node
var cameraReady = false, videoReady = false;
var recorder; // レコーダーを用意、MediaRecorderインスタンス
var cameraStream; // cameraからのローカルストリームデータ
var recordTime = 0; // 録画時間
var recordFlg = false; // 録画を許可
var blob; // blob video

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

function rec_start () {
	recordFlg = true;
	/*ui_play_only.disabled = */ui_rec_start.disabled = true;
	recorder = new MediaRecorder(cameraStream);
	recorder.ondataavailable = function(evt) {
		console.log(cameraStream);
		blob = new Blob([evt.data], { type: evt.data.type });
		confirm_playBackVideo.src = window.URL.createObjectURL(blob);
		ui_post_video.disabled = false;

	}
	video.play();
	video.onended = rec_stop;
	//video.onpause = rec_stop;
	recorder.start();
	$("body").addClass("recording")
	recordTime = new Date().getTime();
}

function rec_stop () {
	console.log("onpuase")
	var currentRecordTime = new Date().getTime();

	if(recordFlg && currentRecordTime - recordTime > 5000) {
		/*ui_play_only.disabled = */ui_rec_start.disabled = false;
		//console.log(recordTime)
		if(recorder && recorder.state != "inactive") {
			recorder.stop();
		}
		video.pause();
		video.currentTime = 0;
		$("body").removeClass("recording playing").addClass("playbacking")
		recordFlg = false;
	}
}

function init () {
	navigator.getUserMedia({video:true, audio:true}, cameraSuccess, cameraError);
	// UI actions
	ui_vocal_mute.onclick = changeVocalMute;

// TODO: onplayイベントを実装する

	/*ui_play_only.onclick = function () {
		this.disabled = true;
		video.play();
		$("body").addClass("playing");
	}*/
	video.onplay = function () {
		$("body").addClass("playing");
	}
	video.onpause = function () {
		$("body").removeClass("playing");
	}
	/*ui_pause_only.onclick = function () {
		video.pause();
		video.currentTime = 0;
		//ui_play_only.disabled = false;
		$("body").removeClass("playing");
	};*/
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
}

function postVideo () {
	var formData = new FormData();
    formData.append('filename', 'singer_'+new Date().getTime()+'.webm');
    formData.append('blob', blob);
    formData.append('message', document.getElementById("post_message").value);

	var request = new XMLHttpRequest();
    request.onreadystatechange = function () {
        if (request.readyState == 4 && request.status == 200) {
            console.log(request.responseText);
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

// Activate
window.onload = init;







