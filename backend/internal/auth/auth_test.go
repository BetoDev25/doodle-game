package auth
package auth

import (
	"testing"
	"time"

	"github.com/google/uuid"
)

func TestMakeJWT(t *testing.T) {
	testsMake := []struct {
		Name        string
		UserID      uuid.UUID
		tokenSecret string
		expiresIn   time.Duration
		wantToken   string
		wantErr     bool
	}{
		{
			Name:   "Make test 1",
			UserID: uuid.New(),
			tokenSecret: "applepie",
			expiresIn: time.Hour,
			wantToken: "",
			wantErr: false,
		},
		{
			Name:   "Make test 2",
			UserID: uuid.New(),
			tokenSecret: "mayonnaise",
			expiresIn: time.Second,
			wantToken: "",
			wantErr: false,
		},
	}
	for _, tt := range testsMake {
		t.Run(tt.Name, func(t *testing.T) {
			actualToken, err := MakeJWT(tt.UserID, tt.tokenSecret, tt.expiresIn)
			if (err != nil) != tt.wantErr {
				t.Errorf("MakeJWT() error = %v, wantErr %v", err, tt.wantErr)
				return
			}
			if !tt.wantErr {
				if len(actualToken) == 0 {
					t.Errorf("MakeJWT() returned an empty token, wanted a non-empty token")
				}
			}
		})
	}
}

func TestValidateJWT(t *testing.T) {
	testUserID := uuid.New()
	testSecret := "myrandompie"
	validTokenString, err := MakeJWT(testUserID, testSecret, time.Hour)
	if err != nil {
		t.Fatalf("Failed to make a valid JWT for testing: %v", err)
	}

	testsValidate := []struct {
		Name        string
		tokenString string
		tokenSecret string
		wantUserID  uuid.UUID
		wantErr     bool
	}{
		{
			Name: "Validate test 1",
			tokenString: validTokenString,
			tokenSecret: testSecret,
			wantUserID:  testUserID,
			wantErr:     false,
		},
	}
	for _, tt := range testsValidate {
		actualID, err := ValidateJWT(tt.tokenString, tt.tokenSecret)
		if (err != nil) != tt.wantErr {
			t.Errorf("ValidateJWT error = %v, wantErr %v", err, tt.wantErr)
			return
		}
		if !tt.wantErr {
			if actualID != tt.wantUserID {
				t.Errorf("ValidateJWT() returned the wrong userID")
				return
			}
		}
	}
}
