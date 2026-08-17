package handlers

import (
	"encoding/json"
	"math/rand"
	"net/http"

	"github.com/google/uuid"

	"github.com/BetoDev25/doodle-game/backend/internal/database"
	"github.com/BetoDev25/doodle-game/backend/internal/websocket"
)

func RespondWithError(w http.ResponseWriter, code int, msg string, err error) {
	type errorMsg struct {
		Message string `json:"message"`
		Error   error  `json:"error"`
	}
	resp := errorMsg{
		Message: msg,
		Error:   err,
	}
	w.Header().Set("Content-Type", "application/json")
	dat, err := json.Marshal(resp)
	if err != nil {
		w.WriteHeader(500)
		return
	} else {
		w.WriteHeader(code)
	}
	w.Write(dat)
}

func RespondWithJSON(w http.ResponseWriter, code int, payload interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(code)

	json.NewEncoder(w).Encode(payload)
}

func GetUserIDFromContext(r *http.Request) (uuid.UUID, bool) {
	userID, ok := r.Context().Value("userID").(uuid.UUID)
	return userID, ok
}

func SetupWebSocket(db *database.Queries) *websocket.Hub {
	hub := websocket.NewHub(db)
	go hub.Run()
	return hub
}

func GenerateDefaultAvatar() json.RawMessage {
	colors := []string{"#FF6B6B", "#4ECDC4", "#45B7D1", "#96CEB4", "#FFEAA7", "#DDA0DD", "#98D8C8", "#F7DC6F", "#BB8FCE", "#85C1E9"}
	randomColor := colors[rand.Intn(len(colors))]

	strokes := []map[string]interface{}{
		{
			"points": []map[string]float64{
				{"x": 0, "y": 0},
				{"x": 1, "y": 0},
				{"x": 1, "y": 1},
				{"x": 0, "y": 1},
				{"x": 0, "y": 0},
			},
			"color":  randomColor,
			"size":   100,
			"filled": true,
		},
	}

	data, _ := json.Marshal(strokes)
	return json.RawMessage(data)
}
