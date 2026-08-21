package handlers

import (
	"database/sql"
	"io"
	"log"
	"net/http"
	"os"
	"path/filepath"

	"github.com/BetoDev25/doodle-game/backend/config"
	"github.com/BetoDev25/doodle-game/backend/internal/cookies"
	"github.com/BetoDev25/doodle-game/backend/internal/database"
)

func HandlerUpdateAvatar(w http.ResponseWriter, r *http.Request, db *database.Queries, cfg config.Config) {
	/*
		userID, ok := GetUserIDFromContext(r)
		if !ok {
			RespondWithError(w, http.StatusUnauthorized, "Not logged in", nil)
			return
		}
	*/
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

	err = r.ParseMultipartForm(5 << 20)
	if err != nil {
		RespondWithError(w, http.StatusBadRequest, "File too large (max 5MB)", err)
		return
	}

	file, handler, err := r.FormFile("avatar")
	if err != nil {
		RespondWithError(w, http.StatusBadRequest, "No file uploaded", err)
		return
	}
	defer file.Close()

	buffer := make([]byte, 512)
	file.Read(buffer)
	contentType := http.DetectContentType(buffer)
	if contentType != "image/png" && contentType != "image/jpeg" {
		RespondWithError(w, http.StatusBadRequest, "Only PNG or JPEG allowed", nil)
		return
	}
	file.Seek(0, 0)

	ext := filepath.Ext(handler.Filename)
	if ext == "" {
		ext = ".png"
	}
	filename := GenerateAvatarPath() + ext
	filePath := filepath.Join(cfg.AvatarDir, filename)

	// Save to disk
	dst, err := os.Create(filePath)
	if err != nil {
		RespondWithError(w, http.StatusInternalServerError, "Failed to save file", err)
		return
	}
	defer dst.Close()

	_, err = io.Copy(dst, file)
	if err != nil {
		RespondWithError(w, http.StatusInternalServerError, "Failed to save file", err)
		return
	}

	// Delete old file
	if user.AvatarPath.Valid && user.AvatarPath.String != "" {
		oldFilename := filepath.Base(user.AvatarPath.String)
		if oldFilename != "default.png" { // Don't delete default
			oldFilePath := filepath.Join(cfg.AvatarDir, oldFilename)
			if err := os.Remove(oldFilePath); err != nil && !os.IsNotExist(err) {
				log.Printf("Warning: Failed to delete old avatar: %v", err)
			}
		}
	}

	avatarPath := "/avatars/" + filename
	err = db.UpdateAvatar(r.Context(), database.UpdateAvatarParams{
		AvatarPath: sql.NullString{
			String: avatarPath,
			Valid:  true,
		},
		ID: user.ID,
	})
	if err != nil {
		RespondWithError(w, http.StatusInternalServerError, "Failed to update user", err)
		return
	}

	RespondWithJSON(w, http.StatusOK, map[string]string{
		"message": "Avatar uploaded successfully",
		"path":    avatarPath,
	})
}
