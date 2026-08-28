package ratelimiter

import (
	"sync"
	"time"
)

type Counter struct {
	Count int
	Reset time.Time
}

type Limiter struct {
	counters map[string]*Counter // key: "ip:endpoint"
	limits   map[string]int      // endpoint -> max requests
	window   time.Duration
	mu       sync.Mutex
}

func New(limits map[string]int, window time.Duration) *Limiter {
	return &Limiter{
		counters: make(map[string]*Counter),
		limits:   limits,
		window:   window,
	}
}

func (l *Limiter) Allow(identifier, endpoint string) bool {
	l.mu.Lock()
	defer l.mu.Unlock()

	limit, exists := l.limits[endpoint]
	if !exists {
		return true // Endpoint not in config = unlimited
	}

	key := identifier + ":" + endpoint
	counter, exists := l.counters[key]

	if !exists {
		l.counters[key] = &Counter{
			Count: 1,
			Reset: time.Now().Add(l.window),
		}
		return true
	}

	if time.Now().After(counter.Reset) {
		counter.Count = 1
		counter.Reset = time.Now().Add(l.window)
		return true
	}

	if counter.Count < limit {
		counter.Count++
		return true
	}

	// Rate limit exceeded
	return false
}
