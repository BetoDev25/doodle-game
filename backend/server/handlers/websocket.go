package handlers

import (
	"log"
	"net/http"

	"github.com/BetoDev25/doodle-game/backend/internal/database"
	"github.com/BetoDev25/doodle-game/backend/internal/websocket"
	gorilla "github.com/gorilla/websocket"
)

var upgrader = gorilla.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	CheckOrigin: func(r *http.Request) bool {
		return true // Allow all origins for development
	},
}

func ServeWebSocket(hub *websocket.Hub, db *database.Queries) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		// Get username from query param or cookie
		username := r.URL.Query().Get("username")
		if username == "" {
			// Try to get from context (set by middleware)
			if u, ok := r.Context().Value("username").(string); ok {
				username = u
			} else {
				username = "guest"
			}
		}

		conn, err := upgrader.Upgrade(w, r, nil)
		if err != nil {
			log.Println("WebSocket upgrade error:", err)
			return
		}

		userID, ok := r.Context().Value("user_id").(string) // from Middleware
		if !ok {
			log.Println("User ID not found in context")
			http.Error(w, "Unauthorized", http.StatusUnauthorized)
			return
		}

		client := &websocket.Client{
			Hub:      hub,
			Conn:     conn,
			Send:     make(chan []byte, 256),
			Username: username,
			UserID:   userID,
		}

		hub.Register <- client

		// Start read/write pumps
		go client.WritePump()
		go client.ReadPump()
	}
}
