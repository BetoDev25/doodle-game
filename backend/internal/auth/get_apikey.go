package auth

import (
	"net/http"
	"strings"
)

func GetAPIKey(headers http.Header) (string, error) {
	header := headers.Get("Authorization")
	if header == "" || !strings.HasPrefix(header, "ApiKey ") {
		return "", ErrNoAuthHeaderIncluded
	}

	apiKey := strings.TrimPrefix(header, "ApiKey ")
	return strings.TrimSpace(apiKey), nil
}
