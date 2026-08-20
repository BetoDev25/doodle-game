package websocket

import (
	"encoding/json"
	"math/rand"
)

type Message struct {
	Type string          `json:"type"`
	Data json.RawMessage `json:"data"`
}

// Client -> Server
type JoinQueueMessage struct {
	MatchType string `json:"match_type"`
}

// Server -> Client
type MatchFoundMessage struct {
	MatchID string `json:"match_id"`
	Role    string `json:"role"` // "starter" or "finisher"
}

// Server -> Client
type ReceiveDoodleMessage struct {
	Strokes  json.RawMessage `json:"strokes"`   // The doodle strokes to display
	TimeLeft int             `json:"time_left"` // 60 seconds
}

type MatchCompleteMessage struct {
	MatchID      string          `json:"match_id"`
	YourDrawing  json.RawMessage `json:"your_drawing"`  // Your strokes
	TheirDrawing json.RawMessage `json:"their_drawing"` // Their strokes
	Message      string          `json:"message"`
}

// Client -> Server
type DoodleCompleteMessage struct {
	MatchID string          `json:"match_id"`
	Strokes json.RawMessage `json:"strokes"`
}

// Client -> Server
type FinishDrawingMessage struct {
	MatchID string          `json:"match_id"`
	Strokes json.RawMessage `json:"strokes"`
}

// Client -> Server
type ReadyForResultsMessage struct {
	MatchID string `json:"match_id"`
	Ready   bool   `json:"ready"`
}

// Server -> Client
type PartnerDisconnectedMessage struct {
	Message string `json:"message"`
}

func createMatchFoundMessage(matchID, role string) []byte {
	msg := Message{
		Type: "match_found",
	}
	msg.Data, _ = json.Marshal(MatchFoundMessage{
		MatchID: matchID,
		Role:    role,
	})
	result, _ := json.Marshal(msg)
	return result
}

func createReceiveDoodleMessage(strokes json.RawMessage, timeLeft int) []byte {
	msg := Message{
		Type: "receive_doodle",
	}
	msg.Data, _ = json.Marshal(ReceiveDoodleMessage{
		Strokes:  strokes,
		TimeLeft: timeLeft,
	})
	result, _ := json.Marshal(msg)
	return result
}

func createMatchCompleteMessage(matchID string, yourDrawing, theirDrawing json.RawMessage, message string) []byte {
	msg := Message{
		Type: "match_complete",
	}
	msg.Data, _ = json.Marshal(MatchCompleteMessage{
		MatchID:      matchID,
		YourDrawing:  yourDrawing,
		TheirDrawing: theirDrawing,
		Message:      message,
	})
	result, _ := json.Marshal(msg)
	return result
}

func createPartnerDisconnectedMessage() []byte {
	msg := Message{
		Type: "partner_disconnected",
	}
	msg.Data, _ = json.Marshal(PartnerDisconnectedMessage{
		Message: "Your partner has disconnected",
	})
	result, _ := json.Marshal(msg)
	return result
}

func randomString(n int) string {
	const letters = "abcdefghijklmnopqrstuvwxyz0123456789"
	b := make([]byte, n)
	for i := range b {
		b[i] = letters[rand.Intn(len(letters))]
	}
	return string(b)
}
