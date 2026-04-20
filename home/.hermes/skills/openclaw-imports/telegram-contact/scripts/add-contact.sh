#!/bin/bash

# Telegram Contact Addition Script
# Usage: ./add-contact.sh [name] [chat_id] [username] [role] [phone]

set -e

NAME="$1"
CHAT_ID="$2"
USERNAME="$3"
ROLE="$4"
PHONE="$5"

# Validate inputs
if [[ -z "$NAME" || -z "$CHAT_ID" ]]; then
    echo "Usage: $0 [name] [chat_id] [username] [role] [phone]"
    echo ""
    echo "Required:"
    echo "  name     - Contact name (e.g., 'John Doe')"
    echo "  chat_id  - Numeric Telegram chat ID (e.g., 1234567890)"
    echo ""
    echo "Optional:"
    echo "  username - Telegram username with @ (e.g., @johndoe)"
    echo "  role     - Professional role (e.g., 'Project Manager')"
    echo "  phone    - Phone number with country code (e.g., +44 79 4770 8341)"
    echo ""
    echo "Examples:"
    echo "  $0 'John Doe' 1234567890"
    echo "  $0 'Jane Smith' 9876543210 @janesmith 'Developer' '+1 555 123 4567'"
    exit 1
fi

# Validate chat ID
if ! [[ "$CHAT_ID" =~ ^[0-9]{8,12}$ ]]; then
    echo "ERROR: Invalid chat ID: $CHAT_ID"
    echo "Chat ID must be numeric and 8-12 digits"
    exit 1
fi

# Validate username format if provided
if [[ -n "$USERNAME" && ! "$USERNAME" == @* ]]; then
    echo "WARNING: Username should start with @ (e.g., @username)"
    echo "Adding @ prefix..."
    USERNAME="@$USERNAME"
fi

# Create safe filename from name
SAFE_NAME=$(echo "$NAME" | tr ' ' '-' | tr '[:upper:]' '[:lower:]' | tr -cd '[:alnum:]-')
CONTACT_DIR="/home/moltbot/.openclaw/workspace/memory/bank/urecruit/$SAFE_NAME"
CONTACT_FILE="$CONTACT_DIR/telegram-contact.md"

echo "Adding contact: $NAME"
echo "Chat ID: $CHAT_ID"
[[ -n "$USERNAME" ]] && echo "Username: $USERNAME"
[[ -n "$ROLE" ]] && echo "Role: $ROLE"
[[ -n "$PHONE" ]] && echo "Phone: $PHONE"
echo ""

# Check if contact already exists
if [[ -f "$CONTACT_FILE" ]]; then
    echo "WARNING: Contact file already exists: $CONTACT_FILE"
    echo "Current content:"
    echo "---"
    head -20 "$CONTACT_FILE"
    echo "---"
    echo ""
    read -p "Overwrite? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Aborted."
        exit 0
    fi
fi

# Check for duplicate chat ID
DUPLICATE=$(grep -r "Chat ID: $CHAT_ID" /home/moltbot/.openclaw/workspace/skills/ /home/moltbot/.openclaw/workspace/memory/ /home/moltbot/.openclaw/workspace/contacts/ 2>/dev/null || true)
if [[ -n "$DUPLICATE" ]]; then
    echo "WARNING: Chat ID $CHAT_ID already exists in:"
    echo "$DUPLICATE" | sed 's/^/  /'
    echo ""
    read -p "Continue anyway? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Aborted."
        exit 0
    fi
fi

# Create directory if needed
mkdir -p "$CONTACT_DIR"

# Create contact file
cat > "$CONTACT_FILE" << EOF
# Contact: $NAME

## Basic Information
- **Chat ID:** $CHAT_ID
$( [[ -n "$USERNAME" ]] && echo "- **Username:** $USERNAME" )
$( [[ -n "$ROLE" ]] && echo "- **Role:** $ROLE" )
$( [[ -n "$PHONE" ]] && echo "- **Phone:** $PHONE" )
- **Status:** Active
- **Added:** $(date +%Y-%m-%d)
- **Last Contacted:** $(date +%Y-%m-%d)

## Communication Preferences
- **Preferred Hours:** 09:00-17:00 UTC
- **Format:** Professional
- **Topics:** Work-related
- **Avoid:** Personal topics

## History
- **$(date +%Y-%m-%d):** Contact added to system

## Notes
- Contact verification pending
EOF

echo "✅ Contact file created: $CONTACT_FILE"
echo ""

# Update team contacts if it's a URecruit team member
if [[ "$NAME" =~ ^(Colin|Paul|Harry|colin|paul|harry) ]]; then
    TEAM_CONTACTS="/home/moltbot/.openclaw/workspace/skills/team-messaging/references/team-contacts.md"
    
    if [[ -f "$TEAM_CONTACTS" ]]; then
        echo "Updating team contacts file..."
        
        # Check if already in team contacts
        if grep -q "$NAME" "$TEAM_CONTACTS"; then
            echo "Contact already in team contacts, updating..."
            
            # Update chat ID if different
            CURRENT_CHAT_ID=$(grep -A5 "$NAME" "$TEAM_CONTACTS" | grep "Chat ID:" | cut -d: -f2 | tr -d ' ' | tr -d '\`')
            if [[ "$CURRENT_CHAT_ID" != "$CHAT_ID" ]]; then
                sed -i "s/Chat ID: \`$CURRENT_CHAT_ID\`/Chat ID: \`$CHAT_ID\`/" "$TEAM_CONTACTS"
                echo "Updated chat ID from $CURRENT_CHAT_ID to $CHAT_ID"
            fi
            
            # Update username if provided
            if [[ -n "$USERNAME" ]]; then
                if grep -q "Username:" "$TEAM_CONTACTS" | grep -A5 "$NAME"; then
                    sed -i "/$NAME/,/^---/s/Username:.*/Username: $USERNAME/" "$TEAM_CONTACTS"
                else
                    # Add username line
                    sed -i "/$NAME/,/^---/s/\(Chat ID:.*\)/\1\n- **Username:** $USERNAME/" "$TEAM_CONTACTS"
                fi
            fi
        else
            echo "Adding to team contacts..."
            
            # Create new entry before the Notes section
            NEW_ENTRY="\n\n## $NAME\n\n- **Role:** ${ROLE:-Team Member}\n- **Telegram Chat ID:** \`$CHAT_ID\`\n$( [[ -n "$USERNAME" ]] && echo "- **Telegram Username:** $USERNAME" )\n$( [[ -n "$PHONE" ]] && echo "- **Phone:** $PHONE" )\n- **Status:** Active\n- **Full Profile:** \`memory/bank/urecruit/$SAFE_NAME/\`"
            
            # Insert before Notes section
            sed -i "/^## Notes/ i\\$NEW_ENTRY" "$TEAM_CONTACTS"
        fi
        
        echo "✅ Team contacts updated"
    else
        echo "⚠️ Team contacts file not found: $TEAM_CONTACTS"
    fi
fi

# Create workspace contacts entry
WORKSPACE_CONTACTS="/home/moltbot/.openclaw/workspace/contacts/telegram-contacts.md"
mkdir -p "/home/moltbot/.openclaw/workspace/contacts"

if [[ ! -f "$WORKSPACE_CONTACTS" ]]; then
    cat > "$WORKSPACE_CONTACTS" << EOF
# Telegram Contacts

**Last Updated:** $(date +%Y-%m-%d)
**Total Contacts:** 1

---

EOF
fi

# Add to workspace contacts
cat >> "$WORKSPACE_CONTACTS" << EOF
## $NAME

- **Chat ID:** $CHAT_ID
$( [[ -n "$USERNAME" ]] && echo "- **Username:** $USERNAME" )
$( [[ -n "$ROLE" ]] && echo "- **Role:** $ROLE" )
$( [[ -n "$PHONE" ]] && echo "- **Phone:** $PHONE" )
- **Status:** Active
- **Added:** $(date +%Y-%m-%d)
- **Profile:** \`memory/bank/urecruit/$SAFE_NAME/\`

---

EOF

echo "✅ Added to workspace contacts: $WORKSPACE_CONTACTS"
echo ""

# Update contact count in workspace file
CONTACT_COUNT=$(grep -c "## " "$WORKSPACE_CONTACTS")
sed -i "s/Total Contacts:.*/Total Contacts: $CONTACT_COUNT/" "$WORKSPACE_CONTACTS"
sed -i "s/Last Updated:.*/Last Updated: $(date +%Y-%m-%d)/" "$WORKSPACE_CONTACTS"

echo "📊 Summary:"
echo "  - Contact file: $CONTACT_FILE"
echo "  - Team contacts: Updated" 
echo "  - Workspace contacts: Updated ($CONTACT_COUNT total)"
echo "  - Status: Active"
echo ""

# Suggest next steps
echo "🎯 Next steps:"
echo "  1. Verify contact: ./verify-contact.sh $CHAT_ID"
echo "  2. Send test message: message action=send target=$CHAT_ID message='Hello from URecruit!'"
echo "  3. Update preferences: edit $CONTACT_FILE"

echo ""
echo "✅ Contact '$NAME' added successfully!"