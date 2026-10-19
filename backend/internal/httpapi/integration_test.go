package httpapi

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"os"
	"strings"
	"testing"

	"github.com/jackc/pgx/v5/pgxpool"
	"pulseops/internal/data"
)

// TEST_DATABASE_URL must reference a dedicated disposable database, never a shared database.
func TestPostgresVerticalSlice(t *testing.T) {
	url := os.Getenv("TEST_DATABASE_URL")
	if url == "" {
		t.Skip("TEST_DATABASE_URL not set; dedicated PostgreSQL required")
	}
	ctx := context.Background()
	db, err := pgxpool.New(ctx, url)
	if err != nil {
		t.Fatal(err)
	}
	defer db.Close()
	store := data.Store{DB: db}
	if err = store.Migrate(ctx); err != nil {
		t.Fatal(err)
	}
	if err = store.Migrate(ctx); err != nil {
		t.Fatal(err)
	}
	password := "integration-test-only-password"
	if err = store.Seed(ctx, password); err != nil {
		t.Fatal(err)
	}
	if err = store.Seed(ctx, password); err != nil {
		t.Fatal(err)
	}
	handler := New(store, "https://pulseops.example", true)
	call := func(method, path, body string, cookie *http.Cookie) *httptest.ResponseRecorder {
		r := httptest.NewRequest(method, path, strings.NewReader(body))
		r.Header.Set("Origin", "https://pulseops.example")
		r.Header.Set("Content-Type", "application/json")
		if cookie != nil {
			r.AddCookie(cookie)
		}
		w := httptest.NewRecorder()
		handler.ServeHTTP(w, r)
		return w
	}
	for _, email := range []string{"alex@aurora.example", "sam@harbour.example"} {
		w := call("POST", "/api/auth/login", `{"email":"`+email+`","password":"`+password+`"}`, nil)
		if w.Code != 200 {
			t.Fatalf("login: %d %s", w.Code, w.Body.String())
		}
		cookie := w.Result().Cookies()[0]
		me := call("GET", "/api/auth/me", "", cookie)
		if me.Code != 200 {
			t.Fatal(me.Code)
		}
		var user data.User
		if err = json.Unmarshal(me.Body.Bytes(), &user); err != nil {
			t.Fatal(err)
		}
		events := call("GET", "/api/events?organisationId=other", "", cookie)
		if events.Code != 200 {
			t.Fatal(events.Code)
		}
		var body struct {
			Events []data.Event `json:"events"`
		}
		if err = json.Unmarshal(events.Body.Bytes(), &body); err != nil {
			t.Fatal(err)
		}
		if len(body.Events) != 1 || body.Events[0].ID != user.OrganisationID {
			t.Fatalf("tenant leak: %+v", body)
		}
		var stored string
		if err = db.QueryRow(ctx, `SELECT token_hash FROM sessions WHERE token_hash=$1`, data.Hash(cookie.Value)).Scan(&stored); err != nil || stored == cookie.Value {
			t.Fatal("session hashing failed")
		}
		if w = call("POST", "/api/auth/logout", `{}`, cookie); w.Code != 204 {
			t.Fatal(w.Code)
		}
		if w = call("GET", "/api/auth/me", "", cookie); w.Code != 401 {
			t.Fatal("revoked session accepted")
		}
	}
}
