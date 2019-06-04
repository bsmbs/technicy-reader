package main

import (
	"bufio"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
)

type Message struct {
	Lines []string `json:"lines"`
}

func read(path string) ([]Message, error) {
	file, err := os.Open(path)
	if err != nil {
		return nil, err
	}

	defer file.Close()

	var messages []Message
	var this Message

	scanner := bufio.NewScanner(file)
	for scanner.Scan() {
		if len(scanner.Text()) == 0 {
			messages = append(messages, this)
			this.Lines = nil
		} else {
			this.Lines = append(this.Lines, scanner.Text())
		}
	}

	return messages, scanner.Err()
}

func serve(messages []Message) {
	fs := http.FileServer(http.Dir("ui/"))
	http.Handle("/", fs)

	http.HandleFunc("/load", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(messages)
	})

	fmt.Println("http://localhost:6800")
	http.ListenAndServe(":6800", nil)
}

func main() {
	fmt.Println("Loading...")

	var filename string

	if len(os.Args) > 1 {
		filename = os.Args[1]
	} else {
		filename = "hardware.txt"
	}

	messages, err := read(filename)
	if err != nil {
		log.Fatalf("Err: %s", err)
	}

	serve(messages)

}
