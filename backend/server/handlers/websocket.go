package handlers

import (
	"encoding/base64"
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
		// get session token
		cookie, err := r.Cookie("session_token")
		if err != nil || cookie.Value == "" {
			log.Println("No session cookie found")
			http.Error(w, "Unauthorized", http.StatusUnauthorized)
			return
		}

		// Decode base64 cookie
		decoded, err := base64.URLEncoding.DecodeString(cookie.Value)
		if err != nil {
			log.Printf("Failed to decode session token: %v", err)
			http.Error(w, "Unauthorized", http.StatusUnauthorized)
			return
		}
		token := string(decoded)

		// get user from database
		user, err := db.GetUserByCookie(r.Context(), token)
		if err != nil {
			log.Printf("Invalid session: %v", err)
			http.Error(w, "Unauthorized", http.StatusUnauthorized)
			return
		}

		// upgrade to websocket
		conn, err := upgrader.Upgrade(w, r, nil)
		if err != nil {
			log.Println("WebSocket upgrade error:", err)
			return
		}

		// create client
		client := &websocket.Client{
			Hub:      hub,
			Conn:     conn,
			Send:     make(chan []byte, 256),
			Username: user.ID.String(), // user.ID is UUID,
			UserID:   user.Username,
			MatchID:  "",
		}

		hub.Register <- client

		// Start read/write pumps
		go client.WritePump()
		go client.ReadPump()
	}
}
