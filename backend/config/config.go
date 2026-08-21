package config

import (
	"log"
	"net/http"
	"os"
	"time"

	"github.com/joho/godotenv"
)

type Config struct {
	//Platform       string
	CookieDomain   string
	CookieSecure   bool
	CookieSameSite http.SameSite
	AvatarDir      string
}

func SetupConfig(env string) Config {
	var envFile string
	if env == "production" {
		envFile = ".env.prod"
	} else {
		envFile = ".env.dev"
	}
	log.Printf("Loading env file: %s", envFile)

	err := godotenv.Load(envFile)
	if err != nil {
		log.Printf("Warning: %s file not found, using system environment variables", envFile)
	}

	environment := os.Getenv("ENVIRONMENT")
	if environment == "" {
		environment = "development"
	}

	cookieDomain := os.Getenv("COOKIE_DOMAIN")
	if cookieDomain == "" {
		cookieDomain = "localhost"
	}

	cookieSecure := os.Getenv("COOKIE_SECURE") == "true"

	cookieSameSite := http.SameSiteLaxMode
	if os.Getenv("COOKIE_SAMESITE") == "Strict" {
		cookieSameSite = http.SameSiteStrictMode
	} else if os.Getenv("COOKIE_SAMESITE") == "Lax" {
		cookieSameSite = http.SameSiteLaxMode
	} else {
		cookieSameSite = http.SameSiteNoneMode
	}

	avatarDir := os.Getenv("AVATAR_DIR")
	if avatarDir == "" {
		avatarDir = "./static/avatars/" // Local dev - replace this in the future
	}

	config := &Config{
		CookieDomain:   cookieDomain,
		CookieSecure:   cookieSecure,
		CookieSameSite: cookieSameSite,
		AvatarDir:      avatarDir,
	}

	return *config
}
func SetupServer(env string) (*http.ServeMux, *http.Server) {
	mux := http.NewServeMux()
	server := &http.Server{
		Handler:      mux,
		Addr:         ":8080",
		ReadTimeout:  15 * time.Second, // Max time to read request
		WriteTimeout: 15 * time.Second, // Max time to write response
		IdleTimeout:  60 * time.Second, // Max time to keep idle connections
	}

	return mux, server
}
