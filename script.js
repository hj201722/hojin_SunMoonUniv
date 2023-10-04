const URL = "https://teachablemachine.withgoogle.com/models/dbWL0eDE-/";
let model, webcam, ctx, labelContainer, maxPredictions, gameCtx, gameBlock, score = 0;
let feedbackTimeout;

function createGameBlock() {
    const positions = ['Left','Center','Right'];
    const randomPosition = positions[Math.floor(Math.random() * positions.length)];
    gameBlock = {position: randomPosition, height: 0};
}

function updateGameBlock() {
    if (!gameBlock) {
        createGameBlock();
    }
    gameBlock.height += 5;
    if (gameBlock.height > 200) {
        gameBlock = null;
    }
}

function showFeedback(text) {
    clearTimeout(feedbackTimeout);
    const animationContainer = document.getElementById("animation-container");
    if (text ==="Good!") {
        animationContainer.style.color = "blue";
    }else if(text ==="Bad!") {
        animationContainer.style.color = "red";
    }
    animationContainer.innerText = text;
    feedbackTimeout = setTimeout(() => {
        animationContainer.innerText = "";
    }, 1000);
}

async function init() {
    const modelURL = URL + "model.json";
    const metadataURL = URL + "metadata.json";
    model = await tmPose.load(modelURL, metadataURL);
    maxPredictions = model.getTotalClasses();

    const size = 200;
    const flip = true;
    webcam = new tmPose.Webcam(size, size, flip);
    await webcam.setup();
    await webcam.play();
    window.requestAnimationFrame(loop);

    const canvas = document.getElementById("canvas");
    canvas.width = size; canvas.height = size;
    ctx = canvas.getContext("2d");

    const gameCanvas = document.getElementById("game-canvas");
    gameCanvas.width = size; gameCanvas.height = size;
    gameCtx = gameCanvas.getContext("2d");

    labelContainer = document.getElementById("label-container");
    for (let i = 0; i < maxPredictions; i++) {
        labelContainer.appendChild(document.createElement("div"));
    }
}

async function loop(timestamp) {
    webcam.update();
    await predict();
    updateGameBlock();
    document.getElementById("score-container").innerText = "Score: " + score;

    gameCtx.clearRect(0, 0, gameCtx.canvas.width, gameCtx.canvas.height);  // 이전 블록 지우기

// 타이밍을 맞춰야 하는 지점에 선 그리기
    gameCtx.strokeStyle = "#00FF00";  // 선의 색상을 녹색으로 설정
    gameCtx.lineWidth = 2;  // 선의 너비 설정
    gameCtx.shadowBlur = 5;  // 그림자의 블러 정도
    gameCtx.shadowColor = "black";  // 그림자 색상

    gameCtx.beginPath();
    gameCtx.moveTo(0, 150);  // 선의 시작점 설정
    gameCtx.lineTo(200, 150);  // 선의 끝점 설정
    gameCtx.stroke();
    gameCtx.shadowBlur = 0;  // 그림자 블러를 원래대로 되돌림


    // 구역을 나누는 선 그리기
    gameCtx.strokeStyle = "#000000";
    gameCtx.beginPath();
    gameCtx.moveTo(66, 0);
    gameCtx.lineTo(66, 200);
    gameCtx.moveTo(133, 0);
    gameCtx.lineTo(133, 200);
    gameCtx.stroke();

    // "왼손", "양손", "오른손" 텍스트 그리기
    gameCtx.fillStyle = "#000";  // 텍스트 색상 설정
    gameCtx.font = "bold 16px Arial";  // 텍스트 폰트와 크기 설정
    gameCtx.shadowColor = "#666";  // 텍스트 그림자 색상
    gameCtx.shadowBlur = 3;  // 텍스트 그림자 블러
    gameCtx.fillText("Left", 18, 190);
    gameCtx.fillText("Both", 80, 190);
    gameCtx.fillText("Right", 147, 190);
    gameCtx.shadowBlur = 0;  // 그림자 블러를 원래대로 되돌림

    if (gameBlock) {
        let x;
        if (gameBlock.position === 'Left') x = 20;
        else if (gameBlock.position === 'Center') x = 90;
        else if (gameBlock.position === 'Right') x = 160;

        gameCtx.fillStyle = "#FF0000";  // 블록 색상 설정
        gameCtx.shadowColor = "rgba(0,0,0,0.5)";  // 블록 그림자 색상
        gameCtx.shadowBlur = 5;  // 블록 그림자 블러
        gameCtx.fillRect(x, gameBlock.height, 20, 20);  // 블록 그리기

        // 블록 테두리 그리기
        gameCtx.strokeStyle = "#333";  // 테두리 색상 설정
        gameCtx.lineWidth = 2;  // 테두리 라인 너비 설정
        gameCtx.strokeRect(x, gameBlock.height, 20, 20);  // 테두리 그리기
}

    window.requestAnimationFrame(loop);
}

async function predict() {
    const { pose, posenetOutput } = await model.estimatePose(webcam.canvas);
    const prediction = await model.predict(posenetOutput);

    for (let i = 0; i < maxPredictions; i++) {
        const classPrediction = prediction[i].className + ": " + prediction[i].probability.toFixed(2);
        labelContainer.childNodes[i].innerHTML = classPrediction;
    }

    // 손 동작과 게임 블록 매칭
    if (gameBlock && gameBlock.height === 160) {
        const highestPrediction = prediction.reduce((prev, curr) => {
            return prev.probability > curr.probability ? prev : curr;
        }, {probability: 0});

        if (gameBlock.position === 'Left' && highestPrediction.className === 'Left') {
            score++;
            gameBlock = null;
            showFeedback("Good!");
        } else if (gameBlock.position === 'Right' && highestPrediction.className === 'Right') {
            score++;
            gameBlock = null;
            showFeedback("Good!");
        } else if (gameBlock.position === 'Center' && highestPrediction.className === 'Both') {
            score++;
            gameBlock = null;
            showFeedback("Good!");
        } else {
            showFeedback("Bad!");
        }
    }

    if (webcam.canvas) {
        ctx.drawImage(webcam.canvas, 0, 0);
        if (pose) {
            const minPartConfidence = 0.5;
            tmPose.drawKeypoints(pose.keypoints, minPartConfidence, ctx);
            tmPose.drawSkeleton(pose.keypoints, minPartConfidence, ctx);
        }
    }
}