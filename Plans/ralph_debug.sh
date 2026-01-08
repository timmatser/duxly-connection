#!/bin/bash

# -----------------------------------------------------------------------------
# Script Name:   ralph.sh (Debug Version)
# -----------------------------------------------------------------------------

# 1. SETUP
# We REMOVED 'set -e' so the script keeps running even if Claude errors out.
# We ADDED 'set -x' so you can see the exact command bash is trying to run.
# set -e  <-- Commented out
# set -x  <-- Uncomment this if you want to see every technical detail, but it's noisy.

if [ -z "$1" ]; then
    echo "❌ Error: Please specify the max number of iterations."
    echo "Usage: ./ralph.sh 10"
    exit 1
fi

MAX_LOOPS=$1
PRD_FILE="prd.json"
PROGRESS_FILE="progress.txt"

# Create progress file if missing
touch "$PROGRESS_FILE"

# 2. THE INSTRUCTION
BASE_INSTRUCTION="
You are an autonomous software engineer.
1. Read the PRD and Progress Log below.
2. Find the *highest priority* feature in the PRD that has 'passes': false.
3. Work ONLY on that single feature.
4. Implement the feature.
5. Verify your work (tests/types).
6. If verified: Update PRD ('passes': true), append to Progress Log, and Git Commit.
7. If ALL items are 'passes': true, output: 'PROMISE_COMPLETE_HERE'.
"

# 3. THE LOOP
echo "🍩 Starting Ralph loop for $MAX_LOOPS iterations..."

for ((i=1; i<=MAX_LOOPS; i++)); do
    echo "---------------------------------------------------"
    echo "🔄 Loop Iteration: $i / $MAX_LOOPS"
    echo "---------------------------------------------------"

    PRD_CONTENT=$(cat "$PRD_FILE")
    PROGRESS_CONTENT=$(cat "$PROGRESS_FILE")
    
    FULL_PROMPT="$BASE_INSTRUCTION

    === CURRENT PRD ===
    $PRD_CONTENT

    === PROGRESS LOG ===
    $PROGRESS_CONTENT"

    # --- EXECUTE AGENT ---
    echo "🤖 Calling Claude... (Please wait)"
    
    # We capture output AND exit status
    OUTPUT=$(claude -p --dangerously-skip-permissions "$FULL_PROMPT" 2>&1)
    EXIT_STATUS=$?

    # --- DEBUGGING OUTPUT ---
    if [ $EXIT_STATUS -ne 0 ]; then
        echo "❌ Claude CLI failed with exit code $EXIT_STATUS."
        echo "👉 Error Message from Claude: $OUTPUT"
        echo "⚠️ Sleeping for 5 seconds and trying next loop..."
        sleep 5
        continue
    else
        echo "✅ Claude finished successfully."
        echo "$OUTPUT"
    fi

    # --- CHECK FOR COMPLETION ---
    if echo "$OUTPUT" | grep -q "PROMISE_COMPLETE_HERE"; then
        echo "🎉 All tasks complete!"
        exit 0
    fi

    sleep 2
done

echo "⚠️ Max iterations reached."