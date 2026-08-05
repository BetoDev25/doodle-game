package handlers

import (
	"encoding/json"
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
