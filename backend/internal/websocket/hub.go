package websocket

import (
	"context"
	"encoding/json"
	"log"
	"sync"
	"time"

	"github.com/google/uuid"

	"github.com/BetoDev25/doodle-game/backend/internal/database"
)

type Hub struct {
	Clients map[*Client]bool

	Rooms map[string][]*Client

	Queue []*Client

	MatchStates map[string]*MatchState // matchID -> state

	Register chan *Client

	Unregister chan *Client

	Mu sync.Mutex

	DB *database.Queries
}

type MatchState struct {
	DoodleComplete map[string]bool
	DoodleStrokes  map[string][]byte
	FinishComplete map[string]bool
	FinishStrokes  map[string][]byte
}

func NewHub(db *database.Queries) *Hub {
	return &Hub{
		Clients:     make(map[*Client]bool),
		Rooms:       make(map[string][]*Client),
		Queue:       []*Client{},
		Register:    make(chan *Client),
		Unregister:  make(chan *Client),
		MatchStates: make(map[string]*MatchState),
		DB:          db,
	}
}

// main loop
func (h *Hub) Run() {
	for {
		select {
		case client := <-h.Register:
			h.Mu.Lock()
			h.Clients[client] = true
			h.Mu.Unlock()
			log.Printf("Client registered: %s (%s)", client.Username, client.UserID)

		case client := <-h.Unregister:
			h.Mu.Lock()
			if _, ok := h.Clients[client]; ok {
				delete(h.Clients, client)
				close(client.Send)

				h.removeFromQueue(client)

				if client.MatchID != "" {
					h.removeFromRoom(client)
				}

				log.Printf("Client unregistered: %s (%s)", client.Username, client.UserID)
			}
			h.Mu.Unlock()
		}
	}
}

func (h *Hub) removeFromQueue(client *Client) {
	for i, c := range h.Queue {
		if c == client {
			h.Queue = append(h.Queue[:i], h.Queue[i+1:]...)
			break
		}
	}
}

func (h *Hub) removeFromRoom(client *Client) {
	if client.MatchID == "" {
		return
	}

	clients, ok := h.Rooms[client.MatchID]
	if !ok {
		return
	}

	for i, c := range clients {
		if c == client {
			h.Rooms[client.MatchID] = append(clients[:i], clients[i+1:]...)
			break
		}
	}

	// Delete room if empty
	if len(h.Rooms[client.MatchID]) == 0 {
		delete(h.Rooms, client.MatchID)
	}

	client.MatchID = ""
}

func (h *Hub) HandleMessage(client *Client, message []byte) {
	var msg Message
	if err := json.Unmarshal(message, &msg); err != nil {
		log.Printf("Error parsing message: %v", err)
		return
	}

	switch msg.Type {
	case "join_queue":
		h.handleJoinQueue(client)
	case "leave_queue":
		h.handleLeaveQueue(client)
	case "doodle_complete":
		h.handleDoodleComplete(client, msg.Data)
	case "finish_drawing":
		h.handleFinishDrawing(client, msg.Data)
	default:
		log.Printf("Unknown message type: %s", msg.Type)
	}
}

func (h *Hub) handleJoinQueue(client *Client) {
	h.Mu.Lock()
	defer h.Mu.Unlock()

	// Don't add if already in queue or in a match
	if client.MatchID != "" {
		return
	}

	// Check if already in queue
	for _, c := range h.Queue {
		if c == client {
			return
		}
	}

	h.Queue = append(h.Queue, client)
	log.Printf("%s joined the queue (%d waiting)", client.Username, len(h.Queue))

	// Try to pair players
	if len(h.Queue) >= 2 {
		log.Printf("Queue has 2 players, creating match...") // DEBUG
		p1 := h.Queue[0]
		p2 := h.Queue[1]
		h.Queue = h.Queue[2:]

		h.createMatch(p1, p2)
	} else {
		log.Printf("Queue has %d players, waiting for more", len(h.Queue)) // DEBUG
	}
}

// handleLeaveQueue removes a client from the queue
func (h *Hub) handleLeaveQueue(client *Client) {
	h.Mu.Lock()
	defer h.Mu.Unlock()
	h.removeFromQueue(client)
	log.Printf("%s left the queue", client.Username)
}

// createMatch pairs two players and starts a match
func (h *Hub) createMatch(p1, p2 *Client) {
	matchID := uuid.New().String()

	h.Rooms[matchID] = []*Client{p1, p2}
	h.MatchStates[matchID] = &MatchState{
		DoodleComplete: make(map[string]bool),
		DoodleStrokes:  make(map[string][]byte),
		FinishComplete: make(map[string]bool),
		FinishStrokes:  make(map[string][]byte),
	}

	p1.MatchID = matchID
	p2.MatchID = matchID

	// Non-blocking sends
	select {
	case p1.Send <- createMatchFoundMessage(matchID, "starter"):
	default:
		log.Printf("p1 Send channel full")
	}
	select {
	case p2.Send <- createMatchFoundMessage(matchID, "starter"):
	default:
		log.Printf("p2 Send channel full")
	}

	log.Printf("Match created: %s", matchID)
}

// handleDoodleComplete handles the doodle phase completion
func (h *Hub) handleDoodleComplete(client *Client, data []byte) {
	var doodleData DoodleCompleteMessage
	if err := json.Unmarshal(data, &doodleData); err != nil {
		log.Printf("Error parsing doodle data: %v", err)
		return
	}

	h.Mu.Lock()
	defer h.Mu.Unlock()

	// Get match state
	state, ok := h.MatchStates[client.MatchID]
	if !ok {
		log.Printf("Match state not found: %s", client.MatchID)
		return
	}

	// Store this player's doodle
	state.DoodleStrokes[client.UserID] = doodleData.Strokes
	state.DoodleComplete[client.UserID] = true

	// Check if both players have completed doodle
	if len(state.DoodleComplete) == 2 {
		// Parse UUIDs
		matchID, _ := uuid.Parse(client.MatchID)

		var players []*Client
		for _, c := range h.Rooms[client.MatchID] {
			players = append(players, c)
		}

		// Save BOTH doodles to database
		for _, p := range players {
			userID, _ := uuid.Parse(p.UserID)

			// Find the other player's ID for finisher
			var otherID uuid.UUID
			for _, c := range players {
				if c.UserID != p.UserID {
					otherID, _ = uuid.Parse(c.UserID)
					break
				}
			}

			_, err := h.DB.CreateDrawing(context.Background(), database.CreateDrawingParams{
				MatchID:         matchID,
				StarterID:       userID,
				FinisherID:      otherID,
				DoodleStrokes:   state.DoodleStrokes[p.UserID],
				FinishedStrokes: json.RawMessage(`[]`),
			})
			if err != nil {
				log.Printf("Error saving doodle for %s: %v", p.UserID, err)
				continue
			}
		}

		// Send both doodles to both players
		for _, p := range players {
			var otherUserID string
			for userID := range state.DoodleComplete {
				if userID != p.UserID {
					otherUserID = userID
					break
				}
			}
			p.Send <- createReceiveDoodleMessage(state.DoodleStrokes[otherUserID], 60)
		}

		// Clear doodle state
		state.DoodleComplete = make(map[string]bool)
		state.DoodleStrokes = make(map[string][]byte)

		log.Printf("Both doodles saved and sent for match: %s", client.MatchID)
	}
}

// handleFinishDrawing handles the finish phase completion
func (h *Hub) handleFinishDrawing(client *Client, data []byte) {
	var finishData FinishDrawingMessage
	if err := json.Unmarshal(data, &finishData); err != nil {
		log.Printf("Error parsing finish data: %v", err)
		return
	}

	h.Mu.Lock()
	room, ok := h.Rooms[client.MatchID]
	h.Mu.Unlock()
	if !ok {
		log.Printf("Match not found: %s", client.MatchID)
		return
	}

	var starter *Client
	for _, c := range room {
		if c.UserID != client.UserID {
			starter = c
			break
		}
	}
	if starter == nil {
		log.Printf("Starter not found for match: %s", client.MatchID)
		return
	}

	matchID, err := uuid.Parse(client.MatchID)
	if err != nil {
		log.Printf("Error parsing match ID: %v", err)
		return
	}

	err = h.DB.UpdateDrawingFinished(context.Background(), database.UpdateDrawingFinishedParams{
		MatchID:         matchID,
		FinishedStrokes: finishData.Strokes,
	})
	if err != nil {
		log.Printf("Error saving finished drawing: %v", err)
		return
	}

	drawing, err := h.DB.GetDrawingByMatchID(context.Background(), matchID)
	if err != nil {
		log.Printf("Error fetching completed drawing: %v", err)
		return
	}

	starter.Send <- createMatchCompleteMessage(client.MatchID, drawing.DoodleStrokes, drawing.FinishedStrokes, "Match complete!")
	client.Send <- createMatchCompleteMessage(client.MatchID, drawing.DoodleStrokes, drawing.FinishedStrokes, "Match complete!")

	h.Mu.Lock()
	delete(h.Rooms, client.MatchID)
	h.Mu.Unlock()

	log.Printf("Match completed: %s", client.MatchID)
}

// generateMatchID creates a unique match ID
func generateMatchID() string {
	return "match_" + time.Now().Format("20060102150405") + "_" + randomString(6)
}
