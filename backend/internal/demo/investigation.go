package demo

import (
	"net/http"
	"sort"
	"strings"
	"time"
)

type WindowSummary struct {
	From        time.Time `json:"from"`
	To          time.Time `json:"to"`
	Requests    int       `json:"requests"`
	Errors      int       `json:"errors"`
	ErrorRate   float64   `json:"errorRate"`
	MeanLatency float64   `json:"meanLatency"`
	Samples     int       `json:"samples"`
	Complete    bool      `json:"complete"`
}

// Windows are (from, to]: a sample belongs to exactly one comparison window.
func summarize(points []Point, from, to time.Time) WindowSummary {
	s := WindowSummary{From: from, To: to, Complete: !from.Before(End.Add(-24*time.Hour)) && !to.After(End)}
	weighted := 0.0
	for _, p := range points {
		if !p.Time.After(from) || p.Time.After(to) {
			continue
		}
		s.Requests += p.Requests
		s.Errors += p.Errors
		s.Samples++
		weighted += p.Latency * float64(p.Requests)
	}
	if s.Requests > 0 {
		s.ErrorRate = 100 * float64(s.Errors) / float64(s.Requests)
		s.MeanLatency = weighted / float64(s.Requests)
	}
	return s
}

func serveService(w http.ResponseWriter, r *http.Request, d Dataset, f Filters) {
	for key := range r.URL.Query() {
		if key != "from" && key != "to" {
			write(w, 400, map[string]string{"error": "Service views accept only from and to"})
			return
		}
	}
	id := strings.TrimPrefix(r.URL.Path, "/api/demo/services/")
	var service *Service
	for _, s := range d.Services {
		if s.ID == id {
			copy := s
			service = &copy
			break
		}
	}
	if service == nil {
		write(w, 404, map[string]string{"error": "Service not found"})
		return
	}
	duration := f.To.Sub(f.From)
	if f.From.Unix()%300 != 0 || f.To.Unix()%300 != 0 || f.From.Nanosecond() != 0 || f.To.Nanosecond() != 0 {
		write(w, 400, map[string]string{"error": "Choose five-minute boundaries for comparable windows"})
		return
	}
	if duration < 5*time.Minute || duration > 24*time.Hour || f.From.Before(End.Add(-24*time.Hour)) || f.To.After(End) {
		write(w, 400, map[string]string{"error": "Choose a range of 5 minutes to 24 hours within the demo snapshot"})
		return
	}
	points := []Point{}
	timeline := []Event{}
	for _, p := range d.Points {
		if p.ServiceID == id {
			points = append(points, p)
		}
	}
	for _, e := range d.Events {
		if e.ServiceID == id && e.Type != "health_check" && e.Time.After(f.From) && !e.Time.After(f.To) {
			timeline = append(timeline, e)
		}
	}
	sort.Slice(points, func(i, j int) bool { return points[i].Time.Before(points[j].Time) })
	sort.Slice(timeline, func(i, j int) bool { return timeline[i].Time.Before(timeline[j].Time) })
	current := summarize(points, f.From, f.To)
	previous := summarize(points, f.From.Add(-duration), f.From)
	service.Status = "unknown"
	for i := len(points) - 1; i >= 0; i-- {
		p := points[i]
		if p.Time.After(f.From) && !p.Time.After(f.To) {
			service.Status = "healthy"
			if p.Latency > 200 || (p.Requests > 0 && float64(p.Errors)/float64(p.Requests) > .02) {
				service.Status = "degraded"
			}
			break
		}
	}
	total := len(timeline)
	if len(timeline) > 100 {
		timeline = timeline[:100]
	}
	var baseline *WindowSummary
	if previous.Complete && previous.Samples > 0 {
		baseline = &previous
	}
	write(w, 200, map[string]any{"version": d.Version, "referenceTime": d.ReferenceTime, "service": service, "points": points, "current": current, "previous": baseline, "timeline": timeline, "timelineTotal": total})
}
