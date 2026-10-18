const canvas = document.getElementById("whiteboard");
const ctx = canvas.getContext("2d");

let drawing = false;
let lastX = 0, lastY = 0;
let userId = null;
let username = "Anonymous";
let currentColor = "#111111";
let currentWidth = 4;
let currentTool = "draw";
let socket = null;
let reconnectTimer = null;

function resizeCanvas() {
    const oldCanvas = document.createElement("canvas");
    oldCanvas.width = canvas.width || canvas.clientWidth;
    oldCanvas.height = canvas.height || canvas.clientHeight;
    const oldContext = oldCanvas.getContext("2d");
    oldContext.drawImage(canvas, 0, 0);

    canvas.width = canvas.clientWidth;
    canvas.height = canvas.clientHeight;

    if (oldCanvas.width && oldCanvas.height) {
        ctx.drawImage(oldCanvas, 0, 0, oldCanvas.width, oldCanvas.height,
                      0, 0, canvas.width, canvas.height);
    }
}

window.addEventListener("resize", resizeCanvas);
resizeCanvas();

function getPosition(event) {
    const rect = canvas.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
}

function drawLine(x1, y1, x2, y2, color, width) {
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.stroke();
}

canvas.addEventListener("pointerdown", event => {
    drawing = true;
    const position = getPosition(event);
    lastX = position.x;
    lastY = position.y;
    canvas.setPointerCapture(event.pointerId);
});

canvas.addEventListener("pointermove", event => {
    if (!drawing) return;

    const position = getPosition(event);
    const x = position.x;
    const y = position.y;

    if (currentTool === "draw") {
        drawLine(lastX, lastY, x, y, currentColor, currentWidth);
        sendDrawOperation(lastX, lastY, x, y);
    } else {
        drawLine(lastX, lastY, x, y, "#ffffff", currentWidth * 4);
        sendEraseOperation(lastX, lastY, x, y);
    }

    lastX = x;
    lastY = y;
});

canvas.addEventListener("pointerup", () => drawing = false);
canvas.addEventListener("pointercancel", () => drawing = false);

function sendDrawOperation(prevX, prevY, x, y) {
    if (!socket || socket.readyState !== WebSocket.OPEN) return;

    socket.send(JSON.stringify({
        type: "DRAW",
        user_id: userId,
        username,
        x, y, prev_x: prevX, prev_y: prevY,
        color: currentColor,
        width: currentWidth
    }));
}

function sendEraseOperation(prevX, prevY, x, y) {
    if (!socket || socket.readyState !== WebSocket.OPEN) return;

    socket.send(JSON.stringify({
        type: "ERASE",
        user_id: userId,
        username,
        x, y, prev_x: prevX, prev_y: prevY,
        width: currentWidth
    }));
}

function connectWebSocket() {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsURL = protocol + "//" + window.location.host + "/ws";

    socket = new WebSocket(wsURL);

    socket.onopen = () => {
        updateConnectionStatus(true);
        showMessage("Connected to whiteboard server");
        if (reconnectTimer) {
            clearTimeout(reconnectTimer);
            reconnectTimer = null;
        }
    };

    socket.onmessage = event => {
        handleServerMessage(JSON.parse(event.data));
    };

    socket.onclose = () => {
        updateConnectionStatus(false);
        showMessage("Connection lost. Reconnecting...");
        reconnectTimer = setTimeout(connectWebSocket, 2000);
    };

    socket.onerror = error => console.error("WebSocket error:", error);
}

function handleServerMessage(message) {
    switch (message.type) {
        case "WELCOME":
            userId = message.client_id;
            updateUsers(message.users_online);
            break;

        case "SYNC":
            clearCanvas();
            message.operations.forEach(applyOperation);
            break;

        case "DRAW":
        case "ERASE":
            applyOperation(message);
            break;

        case "CLEAR":
            clearCanvas();
            showMessage("Canvas cleared");
            break;

        case "USER_JOINED":
            updateUsers(message.users_online);
            showMessage("A user joined the whiteboard");
            break;

        case "USER_LEFT":
            updateUsers(message.users_online);
            showMessage("A user left the whiteboard");
            break;

        case "PONG":
            console.log("Server latency:", Date.now() - message.client_timestamp, "ms");
            break;
    }
}

function applyOperation(operation) {
    if (operation.type === "DRAW") {
        drawLine(operation.prev_x, operation.prev_y, operation.x, operation.y,
                 operation.color, operation.width);
    } else if (operation.type === "ERASE") {
        drawLine(operation.prev_x, operation.prev_y, operation.x, operation.y,
                 "#ffffff", operation.width * 4);
    }
}

function clearCanvas() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
}

document.getElementById("clearButton").addEventListener("click", () => {
    clearCanvas();
    if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({
            type: "CLEAR",
            user_id: userId,
            username
        }));
    }
});

document.getElementById("drawButton").addEventListener("click", function() {
    currentTool = "draw";
    this.classList.add("active");
    document.getElementById("eraseButton").classList.remove("active");
});

document.getElementById("eraseButton").addEventListener("click", function() {
    currentTool = "erase";
    this.classList.add("active");
    document.getElementById("drawButton").classList.remove("active");
});

document.getElementById("colorPicker").addEventListener("input", function() {
    currentColor = this.value;
});

document.getElementById("brushSize").addEventListener("input", function() {
    currentWidth = Number(this.value);
    document.getElementById("sizeValue").textContent = currentWidth;
});

document.getElementById("username").addEventListener("input", function() {
    username = this.value.trim() || "Anonymous";
});

function updateConnectionStatus(online) {
    const status = document.getElementById("connectionStatus");
    const dot = document.getElementById("statusDot");

    status.textContent = online ? "Connected" : "Disconnected";
    dot.classList.toggle("online", online);
    dot.classList.toggle("offline", !online);
}

function updateUsers(count) {
    document.getElementById("usersOnline").textContent = count;
}

function showMessage(message) {
    document.getElementById("messages").textContent = message;
}

connectWebSocket();
