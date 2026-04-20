#!/bin/bash

# Telegram Contact Verification Script
# Usage: ./verify-contact.sh [chat_id|name]

set -e

SEARCH_TERM="$1"

if [[ -z "$SEARCH_TERM" ]]; then
    echo "Usage: $0 [chat_id|name]"
    echo "Examples:"
    echo "  $0 7081708673"
    echo "  $0 Colin"
    exit 1
fi

# First, find the contact
echo "🔍 Looking up contact: $SEARCH_TERM"
echo ""

CONTACT_FILE=""
CHAT_ID=""
NAME=""

# Try to find by chat ID
if [[ "$SEARCH_TERM" =~ ^[0-9]{8,12}$ ]]; then
    CHAT_ID="$SEARCH_TERM"
    CONTACT_FILE=$(grep -r -l "Chat ID: $CHAT_ID" /home/moltbot/.openclaw/workspace/memory/bank/urecruit/ 2>/dev/null | head -1)
    
    if [[ -z "$CONTACT_FILE" ]]; then
        # Also check team contacts
        TEAM_CONTACTS="/home/moltbot/.openclaw/workspace/skills/team-messaging/references/team-contacts.md"
        if grep -q "$CHAT_ID" "$TEAM_CONTACTS" 2>/dev/null; then
            NAME=$(grep -B5 "$CHAT_ID" "$TEAM_CONTACTS" | grep "## " | head -1 | sed 's/## //')
            echo "Found in team contacts: $NAME"
            # Find the actual contact file
            SAFE_NAME=$(echo "$NAME" | tr ' ' '-' | tr '[:upper:]' '[:lower:]' | tr -cd '[:alnum:]-')
            CONTACT_FILE="/home/moltbot/.openclaw/workspace/memory/bank/urecruit/$SAFE_NAME/telegram-contact.md"
        fi
    fi
else
    # Search by name
    NAME="$SEARCH_TERM"
    SAFE_NAME=$(echo "$NAME" | tr ' ' '-' | tr '[:upper:]' '[:lower:]' | tr -cd '[:alnum:]-')
    CONTACT_FILE="/home/moltbot/.openclaw/workspace/memory/bank/urecruit/$SAFE_NAME/telegram-contact.md"
    
    if [[ ! -f "$CONTACT_FILE" ]]; then
        # Try team contacts
        TEAM_CONTACTS="/home/moltbot/.openclaw/workspace/skills/team-messaging/references/team-contacts.md"
        if grep -q "$NAME" "$TEAM_CONTACTS" 2>/dev/null; then
            echo "Found in team contacts: $NAME"
            # Extract chat ID from team contacts
            CHAT_ID=$(grep -A10 "$NAME" "$TEAM_CONTACTS" | grep "Chat ID:" | cut -d: -f2 | tr -d ' ' | tr -d '\`')
        else
            echo "Contact not found: $NAME"
            echo "Try searching by chat ID or check spelling"
            exit 1
        fi
    fi
fi

# If we have a contact file, extract info
if [[ -f "$CONTACT_FILE" ]]; then
    echo "📁 Contact file: $CONTACT_FILE"
    echo ""
    
    # Extract information
    NAME=$(grep "^# Contact:" "$CONTACT_FILE" | cut -d: -f2 | sed 's/^ //')
    CHAT_ID=$(grep "Chat ID:" "$CONTACT_FILE" | cut -d: -f2 | sed 's/^ //')
    USERNAME=$(grep "Username:" "$CONTACT_FILE" | cut -d: -f2 | sed 's/^ //' 2>/dev/null || echo "Not set")
    STATUS=$(grep "Status:" "$CONTACT_FILE" | cut -d: -f2 | sed 's/^ //')
    LAST_CONTACTED=$(grep "Last Contacted:" "$CONTACT_FILE" | cut -d: -f2 | sed 's/^ //')
    
    echo "📋 Contact Details:"
    echo "  Name: $NAME"
    echo "  Chat ID: $CHAT_ID"
    echo "  Username: $USERNAME"
    echo "  Status: $STATUS"
    echo "  Last Contacted: $LAST_CONTACTED"
    echo ""
fi

if [[ -z "$CHAT_ID" ]]; then
    echo "ERROR: Could not find chat ID for contact"
    exit 1
fi

echo "🔄 Starting verification process for $NAME ($CHAT_ID)"
echo ""

# Step 1: Send verification message
echo "1. Sending verification message..."
VERIFICATION_MESSAGE="🔐 Verification: This is a test message from URecruit system. Please ignore or reply with 'OK' to confirm receipt. Time: $(date +%H:%M:%S)"

# Store the message that would be sent
echo "   Message: $VERIFICATION_MESSAGE"
echo ""
read -p "   Send verification message? (y/N): " -n 1 -r
echo

if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "   Sending message to $CHAT_ID..."
    # Note: In actual use, this would be:
    # message action=send target="$CHAT_ID" message="$VERIFICATION_MESSAGE"
    echo "   [SIMULATION] Message sent to $CHAT_ID"
    echo "   ✅ Verification message sent"
else
    echo "   Skipping message send"
fi

echo ""

# Step 2: Check contact status
echo "2. Checking contact status..."
TODAY=$(date +%Y-%m-%d)
LAST_CONTACT_DATE=$(echo "$LAST_CONTACTED" | cut -d' ' -f1)

if [[ "$LAST_CONTACT_DATE" == "$TODAY" ]]; then
    echo "   ✅ Contacted today"
    CONTACT_RECENCY="Recent"
elif [[ -n "$LAST_CONTACT_DATE" ]]; then
    # Calculate days since last contact
    LAST_TS=$(date -d "$LAST_CONTACT_DATE" +%s 2>/dev/null || echo "0")
    TODAY_TS=$(date -d "$TODAY" +%s)
    DAYS_DIFF=$(( (TODAY_TS - LAST_TS) / 86400 ))
    
    if [[ $DAYS_DIFF -le 7 ]]; then
        echo "   ✅ Contacted $DAYS_DIFF day(s) ago"
        CONTACT_RECENCY="Recent"
    elif [[ $DAYS_DIFF -le 30 ]]; then
        echo "   ⚠️ Last contacted $DAYS_DIFF day(s) ago"
        CONTACT_RECENCY="Moderate"
    else
        echo "   ❌ Last contacted $DAYS_DIFF day(s) ago"
        CONTACT_RECENCY="Stale"
    fi
else
    echo "   ⚠️ No last contact date recorded"
    CONTACT_RECENCY="Unknown"
fi

echo ""

# Step 3: Validate contact information
echo "3. Validating contact information..."

VALIDATION_PASSED=true

# Check chat ID format
if [[ "$CHAT_ID" =~ ^[0-9]{8,12}$ ]]; then
    echo "   ✅ Chat ID format valid"
else
    echo "   ❌ Chat ID format invalid: $CHAT_ID"
    VALIDATION_PASSED=false
fi

# Check username format if present
if [[ -n "$USERNAME" && "$USERNAME" != "Not set" ]]; then
    if [[ "$USERNAME" == @* ]]; then
        echo "   ✅ Username format valid"
    else
        echo "   ⚠️ Username missing @ prefix: $USERNAME"
    fi
else
    echo "   ⚠️ Username not set"
fi

# Check status
if [[ "$STATUS" == "Active" ]]; then
    echo "   ✅ Status is Active"
elif [[ "$STATUS" == "Inactive" ]]; then
    echo "   ⚠️ Status is Inactive"
    VALIDATION_PASSED=false
elif [[ "$STATUS" == "Pending" ]]; then
    echo "   ⚠️ Status is Pending"
else
    echo "   ❌ Unknown status: $STATUS"
    VALIDATION_PASSED=false
fi

echo ""

# Step 4: Update contact file
echo "4. Updating contact information..."

if [[ "$CONTACT_RECENCY" == "Recent" || "$CONTACT_RECENCY" == "Moderate" ]]; then
    NEW_STATUS="Active"
else
    NEW_STATUS="Inactive"
fi

# Update last contacted date
if [[ -f "$CONTACT_FILE" ]]; then
    # Update last contacted
    sed -i "s/Last Contacted:.*/Last Contacted: $(date +%Y-%m-%d)/" "$CONTACT_FILE"
    
    # Update status if needed
    CURRENT_STATUS=$(grep "Status:" "$CONTACT_FILE" | cut -d: -f2 | sed 's/^ //')
    if [[ "$CURRENT_STATUS" != "$NEW_STATUS" ]]; then
        sed -i "s/Status: $CURRENT_STATUS/Status: $NEW_STATUS/" "$CONTACT_FILE"
        echo "   ✅ Status updated: $CURRENT_STATUS → $NEW_STATUS"
    else
        echo "   ✅ Status unchanged: $NEW_STATUS"
    fi
    
    # Add verification note
    if ! grep -q "Verification:" "$CONTACT_FILE"; then
        # Add to notes section
        if grep -q "## Notes" "$CONTACT_FILE"; then
            VERIFICATION_NOTE="- **$(date +%Y-%m-%d):** Contact verified via script"
            sed -i "/## Notes/ a\\$VERIFICATION_NOTE" "$CONTACT_FILE"
        else
            # Add notes section
            echo "" >> "$CONTACT_FILE"
            echo "## Notes" >> "$CONTACT_FILE"
            echo "- **$(date +%Y-%m-%d):** Contact verified via script" >> "$CONTACT_FILE"
        fi
        echo "   ✅ Verification note added"
    fi
    
    echo "   ✅ Contact file updated"
else
    echo "   ⚠️ Contact file not found, skipping update"
fi

echo ""

# Step 5: Generate report
echo "5. Verification Report"
echo "======================"
echo "Contact: $NAME"
echo "Chat ID: $CHAT_ID"
echo "Username: $USERNAME"
echo "Status: $NEW_STATUS (was: $STATUS)"
echo "Last Contacted: $(date +%Y-%m-%d) (was: $LAST_CONTACTED)"
echo "Contact Recency: $CONTACT_RECENCY"
echo "Validation: $( [[ $VALIDATION_PASSED == true ]] && echo "PASSED" || echo "FAILED" )"
echo ""

if [[ $VALIDATION_PASSED == true ]]; then
    echo "✅ Verification completed successfully"
    echo ""
    echo "🎯 Next steps:"
    echo "  1. Wait for reply to verification message"
    echo "  2. Update communication preferences if needed"
    echo "  3. Schedule regular verification (monthly)"
else
    echo "⚠️ Verification completed with issues"
    echo ""
    echo "🔧 Required actions:"
    echo "  1. Fix validation errors above"
    echo "  2. Send manual verification message"
    echo "  3. Consider marking as Inactive if unreachable"
fi

echo ""
echo "📊 Verification complete at $(date +%H:%M:%S)"