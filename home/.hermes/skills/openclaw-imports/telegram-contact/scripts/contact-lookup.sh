#!/bin/bash

# Telegram Contact Lookup Script
# Usage: ./contact-lookup.sh [name|chat_id|username]

set -e

SEARCH_TERM="$1"
SEARCH_TYPE=""

# Determine search type
if [[ -z "$SEARCH_TERM" ]]; then
    echo "Usage: $0 [name|chat_id|username]"
    echo "Examples:"
    echo "  $0 Colin"
    echo "  $0 7081708673"
    echo "  $0 @csmalls5"
    exit 1
fi

# Check if it's a chat ID (numeric)
if [[ "$SEARCH_TERM" =~ ^[0-9]{8,12}$ ]]; then
    SEARCH_TYPE="chat_id"
elif [[ "$SEARCH_TERM" == @* ]]; then
    SEARCH_TYPE="username"
    # Remove @ for searching
    SEARCH_TERM="${SEARCH_TERM:1}"
else
    SEARCH_TYPE="name"
fi

echo "Searching for: $SEARCH_TERM (type: $SEARCH_TYPE)"
echo "=========================================="

# Search locations
SEARCH_PATHS=(
    "/home/moltbot/.openclaw/workspace/skills/team-messaging/references/team-contacts.md"
    "/home/moltbot/.openclaw/workspace/memory/bank/urecruit"
    "/home/moltbot/.openclaw/workspace/contacts"
)

# Function to search in file
search_file() {
    local file="$1"
    local pattern="$2"
    
    if [[ -f "$file" ]]; then
        grep -i -n "$pattern" "$file" | while read -r line; do
            echo "  $file:$line"
        done
    fi
}

# Function to search in directory
search_dir() {
    local dir="$1"
    local pattern="$2"
    
    if [[ -d "$dir" ]]; then
        find "$dir" -type f -name "*.md" -o -name "*.txt" -o -name "*.json" | while read -r file; do
            grep -i -l "$pattern" "$file" | while read -r found_file; do
                echo "  Found in: $found_file"
                # Show context
                grep -i -B2 -A2 "$pattern" "$found_file" | sed 's/^/    /'
            done
        done
    fi
}

# Perform search based on type
case "$SEARCH_TYPE" in
    "chat_id")
        echo "Searching for chat ID: $SEARCH_TERM"
        for path in "${SEARCH_PATHS[@]}"; do
            if [[ -f "$path" ]]; then
                search_file "$path" "$SEARCH_TERM"
            elif [[ -d "$path" ]]; then
                search_dir "$path" "$SEARCH_TERM"
            fi
        done
        ;;
        
    "username")
        echo "Searching for username: @$SEARCH_TERM"
        # Search for @username or just username
        for path in "${SEARCH_PATHS[@]}"; do
            if [[ -f "$path" ]]; then
                search_file "$path" "@$SEARCH_TERM"
                search_file "$path" "$SEARCH_TERM"
            elif [[ -d "$path" ]]; then
                search_dir "$path" "@$SEARCH_TERM"
                search_dir "$path" "$SEARCH_TERM"
            fi
        done
        ;;
        
    "name")
        echo "Searching for name: $SEARCH_TERM"
        for path in "${SEARCH_PATHS[@]}"; do
            if [[ -f "$path" ]]; then
                search_file "$path" "$SEARCH_TERM"
            elif [[ -d "$path" ]]; then
                search_dir "$path" "$SEARCH_TERM"
            fi
        done
        ;;
esac

echo "=========================================="
echo "Search complete."

# Check if we found anything
if [[ $(grep -r -i "$SEARCH_TERM" "${SEARCH_PATHS[@]}" 2>/dev/null | wc -l) -eq 0 ]]; then
    echo "No contacts found matching '$SEARCH_TERM'"
    echo ""
    echo "Suggestions:"
    echo "1. Check the spelling"
    echo "2. Try searching by chat ID instead"
    echo "3. The contact may not be in the system yet"
    echo ""
    echo "To add a new contact, use:"
    echo "  ./add-contact.sh [name] [chat_id] [username]"
fi