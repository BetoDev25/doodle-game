package handlers

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"strings"
	"time"

	"github.com/BetoDev25/doodle-game/backend/config"
	"github.com/BetoDev25/doodle-game/backend/internal/auth"
	"github.com/BetoDev25/doodle-game/backend/internal/cookies"
	"github.com/BetoDev25/doodle-game/backend/internal/database"
)

func HandlerCreateGuest(w http.ResponseWriter, r *http.Request, db *database.Queries, cfg config.Config) {
	var req struct {
		Username string `json:"username"`
	}

	err := json.NewDecoder(r.Body).Decode(&req)
	if err != nil {
		RespondWithError(w, http.StatusBadRequest, "Invalid request body", err)
		return
	}

	username := req.Username
	log.Printf("Creating guest with username: %s", username)

	if username == "" {
		RespondWithError(w, http.StatusBadRequest, "Username is required", nil)
		return
	}

	// Try to create guest, retry with new username if duplicate
	var guest database.CreateGuestRow
	var createErr error

	for attempt := 0; attempt < 3; attempt++ {
		guest, createErr = db.CreateGuest(r.Context(), database.CreateGuestParams{
			Username: username,
			AvatarPath: sql.NullString{
				String: "/avatars/default.png",
				Valid:  true,
			},
		})

		if createErr == nil {
			break
		}

		// Check if it's a duplicate key error
		if strings.Contains(createErr.Error(), "duplicate key") || strings.Contains(createErr.Error(), "23505") {
			// Generate a new unique username
			username = fmt.Sprintf("Guest%d", time.Now().UnixNano()%1000000)
			log.Printf("Username taken, retrying with: %s", username)
			continue
		}

		// Non-duplicate error, break out
		break
	}

	if createErr != nil {
		log.Printf("CreateGuest error after retries: %v", createErr)
		RespondWithError(w, http.StatusInternalServerError, "Couldn't create guest", createErr)
		return
	}

	token := auth.GenerateSessionToken()
	session, err := db.CreateSession(r.Context(), database.CreateSessionParams{
		Token:     token,
		UserID:    guest.ID,
		ExpiresAt: time.Now().Add(24 * time.Hour),
	})
	if err != nil {
		log.Printf("CreateSession error: %v", err)
		RespondWithError(w, http.StatusInternalServerError, "Couldn't create session", err)
		return
	}

	maxAge := int(time.Until(session.ExpiresAt).Seconds())
	if maxAge <= 0 {
		maxAge = 60
	}

	// Set session cookie
	sessionCookie := &http.Cookie{
		Name:     "session_token",
		Value:    token,
		Path:     "/",
		Expires:  session.ExpiresAt,
		MaxAge:   maxAge,
		HttpOnly: true,
		Domain:   cfg.CookieDomain,
		Secure:   cfg.CookieSecure,
		SameSite: cfg.CookieSameSite,
	}
	err = cookies.Write(w, *sessionCookie)
	if err != nil {
		log.Printf("Error setting cookie: %v", err)
		RespondWithError(w, http.StatusInternalServerError, "server error", err)
		return
	}

	RespondWithJSON(w, http.StatusCreated, map[string]interface{}{
		"id":          guest.ID,
		"username":    guest.Username,
		"avatar_path": guest.AvatarPath.String,
		"isGuest":     true,
	})
}
