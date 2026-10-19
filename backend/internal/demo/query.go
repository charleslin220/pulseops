package demo

import (
	"net/http"
	"sort"
	"strings"
)

func serve(w http.ResponseWriter, r *http.Request, d Dataset, f Filters) {
	services := []Service{}
	allowed := map[string]bool{}
	for _, s := range d.Services {
		if (f.Service == "" || s.ID == f.Service) && (f.Region == "" || s.Region == f.Region) {
			services = append(services, s)
			allowed[s.ID] = true
		}
	}
	events := []Event{}
	distribution := map[string]int{"info": 0, "warning": 0, "critical": 0}
	for _, e := range d.Events {
		if !allowed[e.ServiceID] || e.Time.Before(f.From) || e.Time.After(f.To) {
			continue
		}
		if f.Severity != "" && e.Severity != f.Severity {
			continue
		}
		if f.Search != "" && !strings.Contains(strings.ToLower(e.Message+" "+e.Service+" "+e.Correlation+" "+e.Type), f.Search) {
			continue
		}
		events = append(events, e)
		distribution[e.Severity]++
	}
	sort.Slice(events, func(i, j int) bool {
		if events[i].Time.Equal(events[j].Time) {
			return events[i].ID < events[j].ID
		}
		if f.Sort == "oldest" {
			return events[i].Time.Before(events[j].Time)
		}
		return events[i].Time.After(events[j].Time)
	})
	if r.URL.Path == "/api/demo/events" {
		start := (f.Page - 1) * 50
		if start > len(events) {
			start = len(events)
		}
		end := start + 50
		if end > len(events) {
			end = len(events)
		}
		write(w, 200, map[string]any{"events": events[start:end], "total": len(events), "page": f.Page, "pageSize": 50, "services": d.Services, "referenceTime": d.ReferenceTime})
		return
	}
	points := []Point{}
	requests, errors := 0, 0
	latencySum := 0.0
	latest := map[string]Point{}
	for _, p := range d.Points {
		if !allowed[p.ServiceID] || p.Time.Before(f.From) || p.Time.After(f.To) {
			continue
		}
		points = append(points, p)
		requests += p.Requests
		errors += p.Errors
		latencySum += p.Latency * float64(p.Requests)
		if old, ok := latest[p.ServiceID]; !ok || old.Time.Before(p.Time) {
			latest[p.ServiceID] = p
		}
	}
	for i, s := range services {
		p, ok := latest[s.ID]
		status := "unknown"
		if ok {
			status = "healthy"
			if p.Latency > 200 || float64(p.Errors)/float64(p.Requests) > .02 {
				status = "degraded"
			}
		}
		services[i].Status = status
	}
	average := 0.0
	rate := 0.0
	if requests > 0 {
		average = latencySum / float64(requests)
		rate = 100 * float64(errors) / float64(requests)
	}
	recent := events
	if len(recent) > 6 {
		recent = recent[:6]
	}
	write(w, 200, map[string]any{"version": d.Version, "referenceTime": d.ReferenceTime, "services": services, "allServices": d.Services, "points": points, "distribution": distribution, "recent": recent, "summary": map[string]any{"requests": requests, "errorRate": rate, "meanLatency": average, "eventCount": len(events)}})
}
