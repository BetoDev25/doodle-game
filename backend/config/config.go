package config

import (
	"encoding/json"
	"log"
	"net/http"
	"os"
	"time"

	"github.com/BetoDev25/doodle-game/backend/ratelimiter"
	"github.com/joho/godotenv"
)

type Config struct {
	//Platform       string
	CookieDomain   string
	CookieSecure   bool
	CookieSameSite http.SameSite
	AvatarDir      string
	RateLimit      RateLimitConfig
	RateLimiter    *ratelimiter.Limiter
}

type RateLimitConfig struct {
	Window    string         `json:"window"`
	Endpoints map[string]int `json:"endpoints"`
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

	rateLimitConfig := loadRateLimitConfig()

	window, err := time.ParseDuration(rateLimitConfig.Window)
	if err != nil {
		log.Printf("Invalid window duration '%s', using default 60s", rateLimitConfig.Window)
		window = 60 * time.Second
	}
	limiter := ratelimiter.New(rateLimitConfig.Endpoints, window)
	limiter.StartCleanup(10*time.Minute, 1*time.Hour)

	config := &Config{
		CookieDomain:   cookieDomain,
		CookieSecure:   cookieSecure,
		CookieSameSite: cookieSameSite,
		AvatarDir:      avatarDir,
		RateLimit:      rateLimitConfig,
		RateLimiter:    limiter,
	}

	return *config
}

func loadRateLimitConfig() RateLimitConfig {
	// Check if a custom path is set via environment variable
	configPath := os.Getenv("RATE_LIMIT_CONFIG")
	if configPath == "" {
		configPath = "backend/ratelimiter/ratelimit.json"
	}

	data, err := os.ReadFile(configPath)
	if err != nil {
		log.Printf("Warning: Rate limit config not found at %s, using defaults", configPath)
		return getDefaultRateLimitConfig()
	}

	var config RateLimitConfig
	if err := json.Unmarshal(data, &config); err != nil {
		log.Printf("Error parsing rate limit config: %v, using defaults", err)
		return getDefaultRateLimitConfig()
	}

	// Validate window format
	if _, err := time.ParseDuration(config.Window); err != nil {
		log.Printf("Invalid window duration '%s': %v, using default", config.Window, err)
		config.Window = "60s"
	}

	log.Printf("Loaded rate limit config with %d endpoints", len(config.Endpoints))
	return config
}

func getDefaultRateLimitConfig() RateLimitConfig {
	return RateLimitConfig{
		Window: "60s",
		Endpoints: map[string]int{
			"/api/login":                 5,
			"/api/users":                 3,
			"/api/guests":                10,
			"/api/avatar/update":         10,
			"/api/favorites/":            100,
			"/api/favorites":             60,
			"/api/drawings":              30,
			"/api/me":                    60,
			"/api/avatar":                60,
			"/api/logout":                10,
			"/api/profile/*/matches/*":   20,
			"/api/profile/*/favorites/*": 20,
		},
	}
}

func (c *Config) ParseWindow() (time.Duration, error) {
	return time.ParseDuration(c.RateLimit.Window)
}

// GetEndpointLimit returns the limit for a specific endpoint
func (c *Config) GetEndpointLimit(endpoint string) (int, bool) {
	limit, exists := c.RateLimit.Endpoints[endpoint]
	return limit, exists
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
