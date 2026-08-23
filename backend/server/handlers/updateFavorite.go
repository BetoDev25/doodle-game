package handlers

import (
	"database/sql"
	"net/http"
	"strings"

	"github.com/BetoDev25/doodle-game/backend/internal/cookies"
	"github.com/BetoDev25/doodle-game/backend/internal/database"
	"github.com/google/uuid"
)

func HandlerUpdateFavorite(w http.ResponseWriter, r *http.Request, db *database.Queries) {
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

	// Parse URL: /api/favorites/{isFavorite}/{matchID}
	pathParts := strings.Split(r.URL.Path, "/")
	if len(pathParts) < 5 {
		RespondWithError(w, http.StatusBadRequest, "Invalid URL format. Use /api/favorites/{true|false}/{matchID}", nil)
		return
	}

	isFavorite := pathParts[3] == "true"
	matchIDStr := pathParts[4]

	matchID, err := uuid.Parse(matchIDStr)
	if err != nil {
		RespondWithError(w, http.StatusBadRequest, "Invalid match ID", err)
		return
	}

	if isFavorite {
		// Add favorite
		err = db.AddFavorite(r.Context(), database.AddFavoriteParams{
			UserID: uuid.NullUUID{
				UUID:  user.ID,
				Valid: true,
			},
			MatchID: matchID,
		})
		if err != nil {
			RespondWithError(w, http.StatusInternalServerError, "Could not add favorite", err)
			return
		}

		err = db.UpdateFavoritesCount(r.Context(), database.UpdateFavoritesCountParams{
			FavoritesCount: sql.NullInt32{Int32: 1, Valid: true},
			ID:             matchID,
		})
		if err != nil {
			RespondWithError(w, http.StatusInternalServerError, "Could not update favorite count", err)
			return
		}

		RespondWithJSON(w, http.StatusOK, map[string]string{
			"message": "Favorite added",
		})
	} else {
		// Remove favorite
		err = db.RemoveFavorite(r.Context(), database.RemoveFavoriteParams{
			UserID: uuid.NullUUID{
				UUID:  user.ID,
				Valid: true,
			},
			MatchID: matchID,
		})
		if err != nil {
			RespondWithError(w, http.StatusInternalServerError, "Could not remove favorite", err)
			return
		}

		err = db.UpdateFavoritesCount(r.Context(), database.UpdateFavoritesCountParams{
			FavoritesCount: sql.NullInt32{Int32: -1, Valid: true},
			ID:             matchID,
		})
		if err != nil {
			RespondWithError(w, http.StatusInternalServerError, "Could not update favorite count", err)
			return
		}

		RespondWithJSON(w, http.StatusOK, map[string]string{
			"message": "Favorite removed",
		})
	}
}
