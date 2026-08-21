package handlers

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"net/http"

	"github.com/BetoDev25/doodle-game/backend/internal/auth"
	"github.com/BetoDev25/doodle-game/backend/internal/database"
)

func HandlerCreateUser(w http.ResponseWriter, r *http.Request, db *database.Queries) {
	type params struct {
		Username string `json:"username"`
		Password string `json:"password"`
	}

	decoder := json.NewDecoder(r.Body)
	input := params{}
	err := decoder.Decode(&input)
	if err != nil {
		RespondWithError(w, http.StatusInternalServerError, "Couldn't decode input", err)
		return
	}

	hashedPassword, err := auth.HashPassword(input.Password)
	if err != nil {
		RespondWithError(w, http.StatusInternalServerError, "could not hash password", err)
		return
	}

	user, err := db.CreateUser(r.Context(), database.CreateUserParams{
		Username: input.Username,
		PasswordHash: sql.NullString{
			String: hashedPassword,
			Valid:  true,
		},
		AvatarPath: sql.NullString{
			String: "/avatars/default.png",
			Valid:  true,
		},
	})
	if err != nil {
		fmt.Println("CreateUser error:", err)
		RespondWithError(w, http.StatusInternalServerError, "Couldn't create user", err)
		return
	}

	RespondWithJSON(w, http.StatusCreated, map[string]interface{}{
		"id":          user.ID,
		"username":    user.Username,
		"created_at":  user.CreatedAt,
		"avatar_path": user.AvatarPath.String,
	})
}
