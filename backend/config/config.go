package config

import (
	"flag"
	"log"
	"net/http"
	"os"
	"time"

	"github.com/joho/godotenv"
)

type Config struct {
	//Platform       string
	//JWTSecret      string
	CookieDomain   string
	CookieSecure   bool
	CookieSameSite http.SameSite
}

func SetupConfig() Config {
	env := flag.String("env", "production", "Environment: development or production")
	flag.Parse()
	var envFile string
	if *env == "production" {
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

	config := &Config{
		CookieDomain:   cookieDomain,
		CookieSecure:   cookieSecure,
		CookieSameSite: cookieSameSite,
	}

	return *config
}
func SetupServer() (*http.ServeMux, *http.Server) {
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
