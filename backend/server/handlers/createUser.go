package handlers

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"net/http"

	"github.com/BetoDev25/doodle-game/backend/internal/auth"
	"github.com/BetoDev25/doodle-game/backend/internal/database"
	"github.com/sqlc-dev/pqtype"
)

func HandlerCreateUser(w http.ResponseWriter, r *http.Request, db *database.Queries) {
	type params struct {
		Username string `json:"username"`
		Password string `json:"password"`
		//Email    string `json:"email"`
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

	defaultAvatar := GenerateDefaultAvatar()
	avatar := pqtype.NullRawMessage{
		RawMessage: defaultAvatar,
		Valid:      true,
	}

	user, err := db.CreateUser(r.Context(), database.CreateUserParams{
		Username: input.Username,
		//Email:        input.Email, // To be implented in the future; temporarily "pending@gmail.com"
		PasswordHash: sql.NullString{
			String: hashedPassword,
			Valid:  true,
		},
		ProfileStrokes: avatar,
	})
	if err != nil {
		fmt.Println("CreateUser error:", err)
		RespondWithError(w, http.StatusInternalServerError, "Couldn't create user", err)
		return
	}

	RespondWithJSON(w, http.StatusCreated, database.User{
		ID:        user.ID,
		Username:  user.Username,
		CreatedAt: user.CreatedAt,
		Email:     user.Email,
	})
}
