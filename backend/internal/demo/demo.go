// Package demo serves only the isolated, synthetic, read-only portfolio dataset.
package demo

import (
	"context"
	"encoding/json"
	"fmt"
	"github.com/jackc/pgx/v5/pgxpool"
	"math"
	"net/http"
	"strconv"
	"strings"
	"time"
)

const Version = "aurora-v2"

var End = time.Date(2026, 10, 19, 12, 0, 0, 0, time.UTC)

type Service struct {
	ID          string `json:"id"`
	Name        string `json:"name"`
	Region      string `json:"region"`
	Status      string `json:"status"`
	Description string `json:"description"`
}
type Point struct {
	Time      time.Time `json:"time"`
	ServiceID string    `json:"serviceId"`
	Requests  int       `json:"requests"`
	Errors    int       `json:"errors"`
	Latency   float64   `json:"latency"`
}
type Event struct {
	ID          string    `json:"id"`
	ServiceID   string    `json:"serviceId"`
	Service     string    `json:"service"`
	Region      string    `json:"region"`
	Severity    string    `json:"severity"`
	Type        string    `json:"type"`
	Message     string    `json:"message"`
	Time        time.Time `json:"time"`
	Correlation string    `json:"correlation"`
}
type Dataset struct {
	Version       string    `json:"version"`
	ReferenceTime time.Time `json:"referenceTime"`
	Services      []Service `json:"services"`
	Points        []Point   `json:"points"`
	Events        []Event   `json:"events"`
}

func Generate() Dataset {
	d := Dataset{Version: Version, ReferenceTime: End, Services: []Service{
		{"gateway", "API Gateway", "eu-west", "healthy", "Routes incoming requests to platform services."},
		{"checkout", "Checkout API", "eu-west", "degraded", "Validates baskets and coordinates checkout."},
		{"payments", "Payment Adapter", "eu-west", "healthy", "Synthetic payment-provider integration."},
		{"workers", "Job Workers", "eu-west", "degraded", "Processes asynchronous background jobs."},
		{"identity", "Identity Service", "us-east", "healthy", "Validates application identities."},
		{"notifications", "Notifications", "us-east", "healthy", "Delivers synthetic notification jobs."},
	}}
	for i, s := range d.Services {
		for bucket := 0; bucket < 288; bucket++ {
			at := End.Add(time.Duration(bucket-287) * 5 * time.Minute)
			requests := int(1400 + 600*math.Sin(float64(bucket)/23) + float64(i*137))
			latency := float64(35+i*19) + 12*math.Sin(float64(bucket)/11)
			errors := requests / 500
			severity, kind, message := "info", "health_check", "Scheduled service check passed"
			correlation := fmt.Sprintf("trace-%s-%03d", s.ID, bucket/4)
			if s.Region == "us-east" && bucket >= 120 && bucket <= 132 {
				correlation = "scenario-us-east-outage"
				if bucket < 132 {
					latency += 320
					errors = requests / 6
					severity, kind, message = "critical", "regional_connectivity", "US East connectivity disruption increased upstream failures"
				} else {
					kind, message = "recovery", "US East connectivity restored; error rate returned to baseline"
				}
			}
			if s.ID == "checkout" && ((bucket >= 190 && bucket <= 210) || bucket >= 278) {
				latency += 260
				errors = requests / 18
				severity = "critical"
				kind = "latency_threshold"
				message = "Checkout latency exceeded the 250 ms threshold"
			}
			if s.ID == "workers" && bucket >= 265 {
				latency += 170
				errors = requests / 45
				severity = "warning"
				kind = "queue_backlog"
				message = "Background job processing is falling behind incoming volume"
			}
			if bucket == 188 && s.ID == "checkout" {
				kind = "deployment"
				message = "Checkout release 2.8.0 rolled out to eu-west"
			}
			if bucket == 211 && s.ID == "checkout" {
				kind = "recovery"
				message = "Checkout latency returned to the expected range"
			}
			d.Points = append(d.Points, Point{at, s.ID, requests, errors, math.Round(latency*10) / 10})
			d.Events = append(d.Events, Event{fmt.Sprintf("evt-%s-%03d", s.ID, bucket), s.ID, s.Name, s.Region, severity, kind, message, at, correlation})
		}
	}
	return d
}

// The immutable fixture lives in its own table, never in an authenticated tenant.
func Seed(ctx context.Context, db *pgxpool.Pool) error {
	tx, err := db.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)
	if _, err = tx.Exec(ctx, `CREATE TABLE IF NOT EXISTS demo_datasets(version text PRIMARY KEY, payload jsonb NOT NULL)`); err != nil {
		return err
	}
	payload, err := json.Marshal(Generate())
	if err != nil {
		return err
	}
	if _, err = tx.Exec(ctx, `INSERT INTO demo_datasets(version,payload) VALUES($1,$2) ON CONFLICT(version) DO NOTHING`, Version, payload); err != nil {
		return err
	}
	return tx.Commit(ctx)
}

type Filters struct {
	Search, Service, Region, Severity, Sort, Correlation string
	From, To                                             time.Time
	Page                                                 int
}

func Parse(r *http.Request) (Filters, error) {
	q := r.URL.Query()
	f := Filters{Search: strings.ToLower(strings.TrimSpace(q.Get("q"))), Service: q.Get("service"), Region: q.Get("region"), Severity: q.Get("severity"), Sort: q.Get("sort"), From: End.Add(-24 * time.Hour), To: End, Page: 1}
	f.Correlation = q.Get("correlation")
	if len(f.Correlation) > 120 {
		return f, fmt.Errorf("correlation is too long")
	}
	for key := range q {
		if len(q[key]) != 1 {
			return f, fmt.Errorf("duplicate filter")
		}
		switch key {
		case "q", "service", "region", "severity", "sort", "from", "to", "page", "correlation":
		default:
			return f, fmt.Errorf("unsupported filter")
		}
	}
	if len(f.Search) > 120 {
		return f, fmt.Errorf("search is too long")
	}
	if f.Sort != "" && f.Sort != "oldest" && f.Sort != "newest" {
		return f, fmt.Errorf("invalid sort")
	}
	if f.Severity != "" && f.Severity != "info" && f.Severity != "warning" && f.Severity != "critical" {
		return f, fmt.Errorf("invalid severity")
	}
	for key, dest := range map[string]*time.Time{"from": &f.From, "to": &f.To} {
		if q.Get(key) != "" {
			v, err := time.Parse(time.RFC3339, q.Get(key))
			if err != nil {
				return f, fmt.Errorf("invalid date")
			}
			*dest = v
		}
	}
	if f.From.After(f.To) || f.To.Sub(f.From) > 7*24*time.Hour {
		return f, fmt.Errorf("invalid time range")
	}
	if q.Get("page") != "" {
		v, err := strconv.Atoi(q.Get("page"))
		if err != nil || v < 1 || v > 10000 {
			return f, fmt.Errorf("invalid page")
		}
		f.Page = v
	}
	return f, nil
}
func write(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Cache-Control", "no-store")
	w.Header().Set("X-Content-Type-Options", "nosniff")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(v)
}
func Handler(db *pgxpool.Pool) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet {
			w.Header().Set("Allow", "GET")
			write(w, 405, map[string]string{"error": "The public demo is read only"})
			return
		}
		servicePath := strings.HasPrefix(r.URL.Path, "/api/demo/services/")
		if r.URL.Path != "/api/demo/dashboard" && r.URL.Path != "/api/demo/events" && !servicePath {
			write(w, 404, map[string]string{"error": "Not found"})
			return
		}
		f, err := Parse(r)
		if err != nil {
			write(w, 400, map[string]string{"error": err.Error()})
			return
		}
		ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
		defer cancel()
		var payload []byte
		if err = db.QueryRow(ctx, `SELECT payload FROM demo_datasets WHERE version=$1`, Version).Scan(&payload); err != nil {
			write(w, 503, map[string]string{"error": "Demo data is temporarily unavailable"})
			return
		}
		var d Dataset
		if json.Unmarshal(payload, &d) != nil {
			write(w, 503, map[string]string{"error": "Demo data is temporarily unavailable"})
			return
		}
		if servicePath {
			serveService(w, r, d, f)
			return
		}
		serve(w, r, d, f)
	})
}
