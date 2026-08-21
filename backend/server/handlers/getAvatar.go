package handlers

import (
	"net/http"
	"path/filepath"

	"github.com/BetoDev25/doodle-game/backend/config"
	"github.com/BetoDev25/doodle-game/backend/internal/cookies"
	"github.com/BetoDev25/doodle-game/backend/internal/database"
)

func HandlerGetAvatar(w http.ResponseWriter, r *http.Request, db *database.Queries, cfg config.Config) {
	sessionToken, err := cookies.Read(r, "session_token")
	if err != nil {
		RespondWithError(w, http.StatusUnauthorized, "Not authenticated", err)
		return
	}

	user, err := db.GetUserByCookie(r.Context(), sessionToken)
	if err != nil {
		RespondWithError(w, http.StatusUnauthorized, "Invalid or expired session", err)
		return
	}

	if !user.AvatarPath.Valid || user.AvatarPath.String == "" {
		http.ServeFile(w, r, filepath.Join(cfg.AvatarDir, "default.png"))
		return
	}

	filename := filepath.Base(user.AvatarPath.String)
	filePath := filepath.Join(cfg.AvatarDir, filename)
	http.ServeFile(w, r, filePath)
}
