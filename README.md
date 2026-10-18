# LAN-Based Collaborative Whiteboard

A real-time collaborative whiteboard for computers connected to the same LAN/Wi-Fi network.

## Technology

- Python
- FastAPI
- Uvicorn
- WebSocket
- HTML5 Canvas
- JavaScript
- CSS

## Run on the server laptop

### macOS/Linux

```bash
cd server
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8000
```

### Windows

```cmd
cd server
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8000
```

## Open locally

```text
http://localhost:8000
```

## Find server IP

macOS:

```bash
ipconfig getifaddr en0
```

Windows:

```cmd
ipconfig
```

Find the IPv4 address, for example:

```text
192.168.1.5
```

## Connect other laptops

Make sure all laptops are on the same Wi-Fi.

Open on each client:

```text
http://192.168.1.5:8000
```

Replace the IP with the server laptop's IP.

## Features

- Real-time drawing
- Multiple clients
- Eraser
- Color picker
- Brush size
- Clear canvas
- Join/leave detection
- Canvas synchronization for new clients
- Automatic WebSocket reconnection
- Server status endpoint

## Status endpoint

```text
http://SERVER_IP:8000/status
```

## WebSocket protocol

DRAW:
```json
{
  "type": "DRAW",
  "user_id": "USER_ID",
  "x": 100,
  "y": 100,
  "prev_x": 90,
  "prev_y": 90,
  "color": "#111111",
  "width": 4
}
```

ERASE:
```json
{
  "type": "ERASE",
  "user_id": "USER_ID",
  "x": 100,
  "y": 100,
  "prev_x": 90,
  "prev_y": 90,
  "width": 4
}
```

CLEAR:
```json
{
  "type": "CLEAR",
  "user_id": "USER_ID"
}
```

## Project demonstration

1. Start the server.
2. Open the server URL on 2–4 laptops.
3. Enter different usernames.
4. Draw on one laptop.
5. Verify the drawing appears on all laptops.
6. Disconnect one client.
7. Reconnect it and verify synchronization.
8. Use Wireshark to inspect TCP/WebSocket traffic.
