package websocket

import (
	"context"
	"encoding/json"
	"log"
	"sync"

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
	Player1ID       string
	Player2ID       string
	Drawing1ID      string
	Drawing2ID      string
	DoodleComplete  map[string]bool
	DoodleStrokes   map[string][]byte
	FinishComplete  map[string]bool
	FinishStrokes   map[string][]byte
	ReadyForResults map[string]bool
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
					matchID := client.MatchID

					h.notifyPartnerDisconnected(matchID, client.UserID)
					h.deleteIncompleteMatch(matchID)
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
		log.Printf("MatchID is empty: %s", client.MatchID)
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
	case "ready_for_results":
		h.handleReadyForResults(client, msg.Data)
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
		p1 := h.Queue[0]
		p2 := h.Queue[1]
		h.Queue = h.Queue[2:]

		h.createMatch(p1, p2)
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
	log.Printf("p1.UserID: %s, p2.UserID: %s", p1.UserID, p2.UserID)

	matchID := uuid.New().String()
	matchUUID, _ := uuid.Parse(matchID)
	p1UUID, _ := uuid.Parse(p1.UserID)
	p2UUID, _ := uuid.Parse(p2.UserID)

	// Create match in Database
	_, err := h.DB.CreateMatch(context.Background(), database.CreateMatchParams{
		ID: matchUUID,
		Player1ID: uuid.NullUUID{
			UUID:  p1UUID,
			Valid: true,
		},
		Player2ID: uuid.NullUUID{
			UUID:  p2UUID,
			Valid: true,
		},
	})
	if err != nil {
		log.Printf("Error creating match in DB: %v", err)
		return
	}

	// Create match in memory
	h.Rooms[matchID] = []*Client{p1, p2}
	h.MatchStates[matchID] = &MatchState{
		Player1ID:       p1.UserID,
		Player2ID:       p2.UserID,
		DoodleComplete:  make(map[string]bool),
		DoodleStrokes:   make(map[string][]byte),
		FinishComplete:  make(map[string]bool),
		FinishStrokes:   make(map[string][]byte),
		ReadyForResults: make(map[string]bool),
	}

	p1.MatchID = matchID
	p2.MatchID = matchID

	// Non-blocking sends
	select {
	case p1.Send <- createMatchFoundMessage(matchID, "player1"):
	default:
		log.Printf("p1 Send channel full")
	}
	select {
	case p2.Send <- createMatchFoundMessage(matchID, "player2"):
	default:
		log.Printf("p2 Send channel full")
	}

	log.Printf("Match created: %s", matchID)
}

func (h *Hub) notifyPartnerDisconnected(matchID string, disconnectedUserID string) {
	room, ok := h.Rooms[matchID]
	if !ok {
		log.Printf("Room %s NOT FOUND in Rooms map!", matchID) // DEBUG
		return
	}

	for _, c := range room {
		if c.UserID != disconnectedUserID {
			c.Send <- createPartnerDisconnectedMessage()
			break
		}
	}
}

func (h *Hub) deleteIncompleteMatch(matchID string) {
	matchUUID, err := uuid.Parse(matchID)
	if err != nil {
		log.Printf("Error parsing match ID for deletion: %v", err)
		return
	}

	err = h.DB.DeleteDrawingByMatchID(context.Background(), matchUUID)
	if err != nil {
		log.Printf("Error deleting incomplete drawing: %v", err)
	}

	err = h.DB.DeleteMatchByID(context.Background(), matchUUID)
	if err != nil {
		log.Printf("Error deleting incomplete match: %v", err)
	}
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

	state, ok := h.MatchStates[client.MatchID]
	if !ok {
		log.Printf("Match state not found: %s", client.MatchID)
		return
	}

	// Store in memory
	state.DoodleStrokes[client.UserID] = doodleData.Strokes
	state.DoodleComplete[client.UserID] = true

	if len(state.DoodleComplete) == 2 {
		matchID, _ := uuid.Parse(client.MatchID)
		var drawing1ID, drawing2ID string

		// Save both doodles to database
		for userID, strokes := range state.DoodleStrokes {
			userUUID, _ := uuid.Parse(userID)
			drawing, err := h.DB.CreateDrawing(context.Background(), database.CreateDrawingParams{
				MatchID: matchID,
				UserID: uuid.NullUUID{
					UUID:  userUUID,
					Valid: true,
				},
				DoodleStrokes:   strokes,
				FinishedStrokes: json.RawMessage(`[]`), // Finished drawing is empty for now
			})
			if err != nil {
				log.Printf("Error saving doodle for %s: %v", userID, err)
				continue
			}

			// Store which drawing belongs to which player
			if userID == state.Player1ID {
				drawing1ID = drawing.ID.String()
			} else if userID == state.Player2ID {
				drawing2ID = drawing.ID.String()
			}
		}

		// Update match with drawing IDs
		err := h.DB.UpdateMatch(context.Background(), database.UpdateMatchParams{
			Drawing1ID: uuid.NullUUID{UUID: uuid.MustParse(drawing1ID), Valid: true},
			Drawing2ID: uuid.NullUUID{UUID: uuid.MustParse(drawing2ID), Valid: true},
			ID:         matchID,
		})
		if err != nil {
			log.Printf("Error updating match with drawing IDs: %v", err)
		}

		// Send both doodles to both players
		var players []*Client
		for _, c := range h.Rooms[client.MatchID] {
			players = append(players, c)
		}

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
	defer h.Mu.Unlock()

	state, ok := h.MatchStates[client.MatchID]
	if !ok {
		log.Printf("Match state not found: %s", client.MatchID)
		return
	}

	// Store in memory
	state.FinishStrokes[client.UserID] = finishData.Strokes
	state.FinishComplete[client.UserID] = true

	if len(state.FinishComplete) == 2 {
		matchID, _ := uuid.Parse(client.MatchID)

		// Update both finished drawings in database
		for userID, strokes := range state.FinishStrokes {
			userUUID, _ := uuid.Parse(userID)
			err := h.DB.UpdateDrawingFinished(context.Background(), database.UpdateDrawingFinishedParams{
				MatchID: matchID,
				UserID: uuid.NullUUID{
					UUID:  userUUID,
					Valid: true,
				},
				FinishedStrokes: strokes,
			})
			if err != nil {
				log.Printf("Error updating finished drawing for %s: %v", userID, err)
				continue
			}
		}

		// Send match complete to both players
		var players []*Client
		for _, c := range h.Rooms[client.MatchID] {
			players = append(players, c)
		}

		for _, p := range players {
			var yourDrawing, theirDrawing []byte

			// This player's finished drawing
			yourDrawing = state.FinishStrokes[p.UserID]

			// Other player's finished drawing
			for userID, strokes := range state.FinishStrokes {
				if userID != p.UserID {
					theirDrawing = strokes
					break
				}
			}

			p.Send <- createMatchCompleteMessage(
				client.MatchID,
				yourDrawing,
				theirDrawing,
				"Match complete!",
			)
		}

		// Clean up
		for _, p := range players {
			p.MatchID = "" // ← Reset match ID for both players
		}

		delete(h.Rooms, client.MatchID)
		delete(h.MatchStates, client.MatchID)

		log.Printf("Match completed: %s", client.MatchID)
	}
}

func (h *Hub) handleReadyForResults(client *Client, data []byte) {
	var readyData ReadyForResultsMessage
	if err := json.Unmarshal(data, &readyData); err != nil {
		log.Printf("Error parsing ready data: %v", err)
		return
	}

	h.Mu.Lock()
	defer h.Mu.Unlock()

	state, ok := h.MatchStates[client.MatchID]
	if !ok {
		log.Printf("Match state not found: %s", client.MatchID)
		return
	}

	state.ReadyForResults[client.UserID] = readyData.Ready

	// Check if both ready and both finished
	if len(state.ReadyForResults) == 2 && len(state.FinishComplete) == 2 {
		allReady := true
		for _, ready := range state.ReadyForResults {
			if !ready {
				allReady = false
				break
			}
		}
		if allReady {
			// Send results to both players (same code as handleFinishDrawing)
			var players []*Client
			for _, c := range h.Rooms[client.MatchID] {
				players = append(players, c)
			}

			for _, p := range players {
				var yourDrawing, theirDrawing []byte
				yourDrawing = state.FinishStrokes[p.UserID]
				for userID, strokes := range state.FinishStrokes {
					if userID != p.UserID {
						theirDrawing = strokes
						break
					}
				}
				p.Send <- createMatchCompleteMessage(
					client.MatchID,
					yourDrawing,
					theirDrawing,
					"Match complete!",
				)
			}

			// Clean up
			for _, p := range players {
				p.MatchID = ""
			}
			delete(h.Rooms, client.MatchID)
			delete(h.MatchStates, client.MatchID)
			log.Printf("Match completed (ready button): %s", client.MatchID)
		}
	}
}
