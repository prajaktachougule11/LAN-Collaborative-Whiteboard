from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pathlib import Path
import time
import uuid

app = FastAPI(title="LAN Collaborative Whiteboard")

BASE_DIR = Path(__file__).resolve().parent.parent
CLIENT_DIR = BASE_DIR / "client"

connected_clients = {}
canvas_operations = []

app.mount("/static", StaticFiles(directory=str(CLIENT_DIR)), name="static")

@app.get("/")
async def home():
    return FileResponse(CLIENT_DIR / "index.html")

async def broadcast(message, exclude=None):
    disconnected = []
    for client_id, websocket in list(connected_clients.items()):
        if client_id == exclude:
            continue
        try:
            await websocket.send_json(message)
        except Exception:
            disconnected.append(client_id)
    for client_id in disconnected:
        connected_clients.pop(client_id, None)

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    client_id = str(uuid.uuid4())[:8]
    connected_clients[client_id] = websocket

    print(f"Client connected: {client_id}")

    await websocket.send_json({
        "type": "SYNC",
        "operations": canvas_operations
    })

    await websocket.send_json({
        "type": "WELCOME",
        "client_id": client_id,
        "users_online": len(connected_clients)
    })

    await broadcast({
        "type": "USER_JOINED",
        "client_id": client_id,
        "users_online": len(connected_clients)
    }, exclude=client_id)

    try:
        while True:
            data = await websocket.receive_json()
            message_type = data.get("type")

            if message_type == "DRAW":
                operation = {
                    "type": "DRAW",
                    "user_id": data.get("user_id"),
                    "x": data.get("x"),
                    "y": data.get("y"),
                    "prev_x": data.get("prev_x"),
                    "prev_y": data.get("prev_y"),
                    "color": data.get("color", "#111111"),
                    "width": data.get("width", 4),
                    "timestamp": time.time()
                }
                canvas_operations.append(operation)
                await broadcast(operation)

            elif message_type == "ERASE":
                operation = {
                    "type": "ERASE",
                    "user_id": data.get("user_id"),
                    "x": data.get("x"),
                    "y": data.get("y"),
                    "prev_x": data.get("prev_x"),
                    "prev_y": data.get("prev_y"),
                    "width": data.get("width", 4),
                    "timestamp": time.time()
                }
                canvas_operations.append(operation)
                await broadcast(operation)

            elif message_type == "CLEAR":
                canvas_operations.clear()
                await broadcast({
                    "type": "CLEAR",
                    "user_id": data.get("user_id"),
                    "timestamp": time.time()
                })

            elif message_type == "PING":
                await websocket.send_json({
                    "type": "PONG",
                    "client_timestamp": data.get("client_timestamp"),
                    "server_timestamp": time.time()
                })

    except WebSocketDisconnect:
        print(f"Client disconnected: {client_id}")
        connected_clients.pop(client_id, None)
        await broadcast({
            "type": "USER_LEFT",
            "client_id": client_id,
            "users_online": len(connected_clients)
        })
    except Exception as error:
        print("Connection error:", error)
        connected_clients.pop(client_id, None)
        await broadcast({
            "type": "USER_LEFT",
            "client_id": client_id,
            "users_online": len(connected_clients)
        })

@app.get("/status")
async def status():
    return {
        "server": "LAN Collaborative Whiteboard",
        "connected_users": len(connected_clients),
        "drawing_operations": len(canvas_operations)
    }
