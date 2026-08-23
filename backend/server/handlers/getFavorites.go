package handlers

import (
	"net/http"

	"github.com/BetoDev25/doodle-game/backend/internal/cookies"
	"github.com/BetoDev25/doodle-game/backend/internal/database"
	"github.com/google/uuid"
)

func HandlerGetFavorites(w http.ResponseWriter, r *http.Request, db *database.Queries) {
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

	favorites, err := db.GetUserFavoritesMatchIDs(r.Context(), uuid.NullUUID{
		UUID:  user.ID,
		Valid: true,
	})
	if err != nil {
		RespondWithError(w, http.StatusInternalServerError, "Could not get favorites", err)
		return
	}

	RespondWithJSON(w, http.StatusOK, map[string]interface{}{
		"favorites": favorites,
	})
}
