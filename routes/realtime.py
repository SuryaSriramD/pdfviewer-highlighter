from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from typing import List

router = APIRouter()
connected_clients: List[WebSocket] = []

@router.websocket("/ws/{pdf_id}")
async def websocket_endpoint(websocket: WebSocket, pdf_id: str):
    await websocket.accept()
    connected_clients.append(websocket)

    try:
        while True:
            data = await websocket.receive_json()
            for client in connected_clients:
                if client != websocket:
                    await client.send_json(data)  # Broadcast highlight update
    except WebSocketDisconnect:
        connected_clients.remove(websocket)
