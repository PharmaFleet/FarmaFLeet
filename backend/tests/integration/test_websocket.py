import pytest


class TestWebSocket:
    """Integration tests for WebSocket connections"""

    @pytest.mark.skip(reason="WebSocket endpoint disabled on Vercel; replaced by HTTP polling")
    def test_websocket_location_updates(self, client):
        """Test WebSocket connection for driver location updates."""
        # Use TestClient's websocket_connect
        with client.websocket_connect(
            "/api/v1/drivers/ws/location-updates"
        ) as websocket:
            # Send a location update
            websocket.send_text('{"lat": 29.3759, "lng": 47.9774}')

            # Receive broadcast
            data = websocket.receive_text()
            assert "Location update:" in data
