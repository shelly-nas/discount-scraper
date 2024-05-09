#!/bin/bash

# Usage: ./schedule.sh <config> <schedule>
# Example: ./schedule.sh ah DiscountScraper 2024-05-07 13:33:15

# Validate arguments
if [ "$#" -ne 2 ]; then
    echo "Usage: $0 <config> <schedule>
    configs=[ah, dirk or plus]
    schedule=YYYY-MM-DD HH:mm:ss"
    exit 1
fi

# Read command-line arguments
CONFIG="$1"
SCHEDULE="$2"
REPO_NAME="discount-scraper"
SERVICE_NAME="$REPO_NAME-$CONFIG"

# Path for the systemd service and timer file
TIMER_PATH="/etc/systemd/system/$SERVICE_NAME.timer"

# Disable and remove system service file
sudo systemctl stop $SERVICE_NAME.timer
sudo systemctl disable $SERVICE_NAME.timer
sudo rm $TIMER_PATH

# Create the systemd service scheduler
echo "[Unit]
Description=Discount Scraper Scheduler ($CONFIG)

[Timer]
OnCalendar=$SCHEDULE
Persistent=true

[Install]
WantedBy=timers.target" | sudo tee $TIMER_PATH

# Reload systemd configuration, enable, and start the service
sudo systemctl daemon-reload
sudo systemctl enable $SERVICE_NAME.timer
sudo systemctl start $SERVICE_NAME.timer
