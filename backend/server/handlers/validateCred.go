package handlers

import (
	"fmt"
	"strings"
	"unicode"
)

/*
Username should be 4-20 characters long
Contain no whitespace or invalid character

Password should be 8-40 characters long
Contain no whitespace or invalid character
Contain at least 1 number
*/
func ValidateUsername(username string) (bool, error) {
	if len(username) < 4 {
		return false, fmt.Errorf("username must be at least 4 characters long")
	} else if len(username) > 20 {
		return false, fmt.Errorf("username cannot exceed 20 characters")
	}

	return isValidString(username)
}

func ValidatePassword(password string) (bool, error) {
	if len(password) < 8 {
		return false, fmt.Errorf("password must be at least 8 characters long")
	} else if len(password) > 40 {
		return false, fmt.Errorf("password cannot exceed 40 characters")
		//TO-DO delete password length limit, only minimum required
	}

	numCount := 0
	for _, r := range password {
		if unicode.IsDigit(r) {
			numCount += 1
		}
	}
	if numCount == 0 {
		return false, fmt.Errorf("password must contain at least 1 number")
	}

	return isValidString(password)
}

func isValidString(word string) (bool, error) {
	for _, r := range word {
		if unicode.IsSpace(r) {
			return false, fmt.Errorf("invalid whitespace in username or password")
		}
		if !isValidRune(r) {
			return false, fmt.Errorf("invalid character in username or password")
		}
	}
	return true, nil
}

func isValidRune(r rune) bool {
	allowed := "!#$%&'*+-.^_`|~"

	if ('A' <= r && r <= 'Z') || ('a' <= r && r <= 'z') || ('0' <= r && r <= '9') || strings.ContainsRune(allowed, r) {
		return true
	}
	return false
}
